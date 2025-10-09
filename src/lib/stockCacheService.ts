import { db } from '@/lib/db';
import { stockCache, stockCacheSyncLog, dealers, storeConfig, teamMembers, inventoryDetails, saleDetails } from '@/db/schema';
import { eq, and, gte, lte, inArray, or, desc, asc, sql } from 'drizzle-orm';
import type { NewStockCache, StockCache, NewStockCacheSyncLog } from '@/db/schema';
import { getAutoTraderToken, clearTokenCache, invalidateTokenByEmail } from '@/lib/autoTraderAuth';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Memory monitoring utility
class MemoryMonitor {
  static checkMemoryUsage(): { usage: number; isHigh: boolean; isCritical: boolean } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const usageMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const memoryPercentage = (usageMB / heapTotalMB) * 100;
      
      return {
        usage: usageMB,
        isHigh: usageMB > CACHE_CONFIG.MEMORY_THRESHOLD_MB,
        isCritical: memoryPercentage > 90 // Only critical if over 90% of heap
      };
    }
    return { usage: 0, isHigh: false, isCritical: false };
  }

  static async waitForMemoryRelease(): Promise<void> {
    const { isCritical, usage } = this.checkMemoryUsage();
    
    // Only wait if memory is critically high (>90% of heap)
    if (!isCritical) {
      return; // No need to wait for normal high memory
    }
    
    console.warn(`🧠 Critical memory usage detected: ${usage.toFixed(2)}MB`);
    
    let attempts = 0;
    const maxAttempts = 3; // Reduced from 10 to 3
    
    while (attempts < maxAttempts) {
      const memCheck = this.checkMemoryUsage();
      if (!memCheck.isCritical) break;
      
      console.warn(`🧠 Waiting for memory release... (attempt ${attempts + 1}/${maxAttempts})`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Shorter wait time: 500ms instead of 1000ms
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    // Log final memory state
    const finalCheck = this.checkMemoryUsage();
    console.log(`🧠 Memory after wait: ${finalCheck.usage.toFixed(2)}MB (critical: ${finalCheck.isCritical})`);
  }
}

// Enhanced Circuit Breaker with AutoTrader API specific logic
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private rateLimitResetTime = 0;
  
  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check for rate limiting
    if (this.rateLimitResetTime > Date.now()) {
      const waitTime = this.rateLimitResetTime - Date.now();
      console.warn(`🚦 AutoTrader API rate limited, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - AutoTrader API temporarily unavailable');
      }
    }
    
    // Check memory before executing
    await MemoryMonitor.waitForMemoryRelease();
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      // Handle rate limiting specifically
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('🚦 AutoTrader API rate limit hit');
        this.rateLimitResetTime = Date.now() + (60 * 1000); // Wait 1 minute
        throw new Error('AutoTrader API rate limit exceeded. Please wait a moment and try again.');
      }

      // Don't count configuration errors as failures for circuit breaker
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('401') || message.includes('403') || message.includes('409') ||
            message.includes('invalid credentials') || message.includes('authentication failed') ||
            message.includes('advertiser id') || message.includes('conflict') ||
            message.includes('foreign key') || message.includes('constraint')) {
          // These are configuration issues, not API failures - don't trigger circuit breaker
          throw error;
        }
      }
      
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.log(`🚨 Circuit breaker OPEN after ${this.failures} failures`);
    }
  }
  
  getState() {
    return this.state;
  }
}

// Enhanced fetch with timeout and retry logic
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 Attempt ${attempt}/${maxRetries}: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Success or client error (don't retry 4xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error - retry with exponential backoff
      if (attempt === maxRetries) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s delay
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Don't retry on abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout after 30 seconds');
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`⏳ Error on attempt ${attempt}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Cache configuration - CACHE-FIRST STRATEGY
const CACHE_CONFIG = {
  STALE_AFTER_HOURS: 24 * 7, // 7 days - cache is considered "stale" but still usable
  MAX_CACHE_AGE_HOURS: 24 * 30, // 30 days - cache is kept this long before cleanup
  BACKGROUND_REFRESH_THRESHOLD: 24, // 24 hours - trigger background refresh after this time
  BATCH_SIZE: 50, // Reduced batch size for database inserts to avoid timeouts
  MAX_RETRIES: 3,
  DB_CONNECTION_TIMEOUT: 15000, // 15 seconds for database operations
  MAX_CONCURRENT_REQUESTS: 5, // Limit concurrent requests per user
  MEMORY_THRESHOLD_MB: 512, // Memory usage threshold (increased from 100MB to 512MB for large datasets)
} as const;

// Connection pool monitoring
class DatabaseConnectionMonitor {
  private static activeConnections = 0;
  private static readonly MAX_CONNECTIONS = 20;
  private static waitingQueue: Array<() => void> = [];

  static async acquireConnection<T>(operation: () => Promise<T>): Promise<T> {
    if (this.activeConnections >= this.MAX_CONNECTIONS) {
      console.warn('🚨 Database connection pool near limit, queuing request...');
      await new Promise<void>(resolve => {
        this.waitingQueue.push(resolve);
      });
    }

    this.activeConnections++;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Database operation timeout')), CACHE_CONFIG.DB_CONNECTION_TIMEOUT)
        )
      ]);
    } finally {
      this.activeConnections--;
      const next = this.waitingQueue.shift();
      if (next) next();
    }
  }

  static getStats() {
    return {
      activeConnections: this.activeConnections,
      queueLength: this.waitingQueue.length,
      maxConnections: this.MAX_CONNECTIONS
    };
  }
}

// Utility functions for cache timing
export function isCacheStale(lastFetched: Date | string): boolean {
  const now = new Date();
  const fetchDate = typeof lastFetched === 'string' ? new Date(lastFetched) : lastFetched;
  const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastFetch >= CACHE_CONFIG.STALE_AFTER_HOURS;
}

export function needsForceRefresh(lastFetched: Date | string): boolean {
  const now = new Date();
  const fetchDate = typeof lastFetched === 'string' ? new Date(lastFetched) : lastFetched;
  const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastFetch >= CACHE_CONFIG.MAX_CACHE_AGE_HOURS;
}

// New: Check if background refresh should be triggered (more aggressive than stale)
export function shouldBackgroundRefresh(lastFetched: Date | string): boolean {
  const now = new Date();
  const fetchDate = typeof lastFetched === 'string' ? new Date(lastFetched) : lastFetched;
  const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastFetch >= CACHE_CONFIG.BACKGROUND_REFRESH_THRESHOLD;
}

// Interface for stock query options
export interface StockQueryOptions {
  dealerId: string; // This is the Clerk user ID, we'll resolve to actual dealer UUID internally
  advertiserId: string;
  page?: number;
  pageSize?: number;
  make?: string;
  model?: string;
  lifecycleState?: string;
  ownershipCondition?: string;
  priceFrom?: number;
  priceTo?: number;
  yearFrom?: number;
  yearTo?: number;
  mileageFrom?: number;
  mileageTo?: number;
  sortBy?: 'make' | 'model' | 'price' | 'year' | 'mileage' | 'updated';
  sortOrder?: 'asc' | 'desc';
}

// Interface for cached stock response
export interface CachedStockResponse {
  results: any[];
  totalResults: number;
  totalPages: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  cacheStatus: {
    fromCache: boolean;
    lastRefresh: Date | null;
    staleCacheUsed: boolean;
  };
}

// Main stock cache service class
export class StockCacheService {
  // Mutex for background refresh operations to prevent race conditions
  private static refreshMutex = new Map<string, Promise<void>>();
  
  // Circuit breaker for AutoTrader API calls
  private static circuitBreaker = new Map<string, CircuitBreaker>();
  
  /**
   * Resolve Clerk user ID to actual dealer UUID (supports both store owners and team members)
   */
  static async resolveDealerUuid(clerkUserId: string): Promise<string | null> {
    return await DatabaseConnectionMonitor.acquireConnection(async () => {
      try {
        // First check if user is a team member
        const teamMemberResult = await db
          .select({ storeOwnerId: teamMembers.storeOwnerId })
          .from(teamMembers)
          .where(eq(teamMembers.clerkUserId, clerkUserId))
          .limit(1);
      
      if (teamMemberResult.length > 0) {
        // User is a team member - return their store owner's dealer ID
        console.log('👥 User is team member, using store owner dealer ID:', teamMemberResult[0].storeOwnerId);
        return teamMemberResult[0].storeOwnerId;
      }
      
      // User is not a team member - check if they have their own dealer record
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, clerkUserId))
        .limit(1);
      
      if (dealerResult.length > 0) {
        console.log('🏢 User is store owner, using own dealer ID:', dealerResult[0].id);
        return dealerResult[0].id;
      }
      
        console.log('❌ No dealer record found for user:', clerkUserId);
        return null;
      } catch (error) {
        this.logError('Error resolving dealer UUID', error);
        return null;
      }
    });
  }
  
  /**
   * Force refresh stock data from AutoTrader (bypass cache)
   * This method always fetches fresh data from AutoTrader and updates the cache
   */
  static async forceRefreshStockData(options: StockQueryOptions): Promise<CachedStockResponse> {
    console.log('🔄 StockCacheService: Force refreshing stock data from AutoTrader...');
    return await this.refreshAndGetStockData(options);
  }

  /**
   * Force refresh with progress tracking for background operations
   */
  static async forceRefreshStockDataWithProgress(
    options: StockQueryOptions,
    progressCallback?: (current: number, total: number, estimatedTime?: number) => void
  ): Promise<CachedStockResponse> {
    console.log('🔄 StockCacheService: Force refreshing with progress tracking...');
    return await this.refreshAndGetStockDataWithProgress(options, progressCallback);
  }

  /**
   * Get stock data with intelligent caching
   * Priority: Fresh cache > Stale cache > AutoTrader API > Any cached data for user
   * 
   * OPTIMIZED: Will always try to return cached data for user before showing "no data" error
   */
  static async getStockData(options: StockQueryOptions): Promise<CachedStockResponse> {
    console.log('🗄️ StockCacheService: Getting stock data with options:', options);
    
    const { dealerId: clerkUserId, advertiserId, page = 1, pageSize = 10 } = options;
    
    // Add request tracking to detect race conditions
    const requestId = `${clerkUserId}-${advertiserId}-${Date.now()}`;
    console.log('🔍 Request ID:', requestId);
    
    // Resolve Clerk user ID to dealer UUID
    const dealerId = await this.resolveDealerUuid(clerkUserId);
    if (!dealerId) {
      console.log(`❌ DEALER_NOT_FOUND: No dealer record for Clerk user ID: ${clerkUserId}`);
      console.log('🔍 Possible causes: 1) Registration incomplete, 2) Not a team member, 3) Database issue');
      
      // Double-check with a small delay to handle potential race conditions during registration
      console.log('🔄 Retrying dealer resolution after 1 second (handles race conditions)...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const retryDealerId = await this.resolveDealerUuid(clerkUserId);
      if (!retryDealerId) {
        console.log(`❌ Dealer record still not found after retry for: ${clerkUserId}`);
        
        // EMERGENCY FALLBACK: Try to find ANY cached data for this clerk user ID
        console.log('🆘 Emergency fallback: Searching for any cached data by Clerk user ID...');
        try {
          const emergencyData = await this.getAnyCachedDataForClerkUser(clerkUserId, { ...options, page, pageSize });
          if (emergencyData && emergencyData.results.length > 0) {
            console.log('✅ Emergency fallback successful - found cached data for user!');
            console.warn('⚠️ WARNING: Using cached data without proper dealer record. User should complete registration.');
            return emergencyData;
          }
        } catch (emergencyError) {
          console.error('❌ Emergency fallback failed:', emergencyError);
        }
        
        // NO DATA FOUND - Throw proper error instead of returning empty results
        console.error('🚨 CRITICAL: No dealer record and no cached data - cannot proceed');
        throw new Error(
          'DEALER_NOT_FOUND: Your account registration is incomplete. ' +
          'Please complete your dealer registration or contact support if you believe this is an error. ' +
          `(User ID: ${clerkUserId.substring(0, 8)}...)`
        );
      }
      
      console.log('✅ Dealer found on retry:', retryDealerId);
      // Continue with the retry result
      return await this.getStockData({ ...options, dealerId: retryDealerId });
    }
    
    console.log(`🔍 Resolved dealer UUID: ${dealerId} for Clerk user: ${clerkUserId}`);
    
    // Check if we have any cached data for this dealer/advertiser
    const cacheStatus = await this.getCacheStatus(dealerId, advertiserId);
    console.log('📊 Cache status:', cacheStatus);
    
    // ========================================
    // CACHE-FIRST STRATEGY: NEVER call AutoTrader on page load
    // ========================================
    // Priority:
    // 1. Return cached data if it exists (even if stale)
    // 2. Refresh in background if needed
    // 3. Only fetch from AutoTrader if NO cache exists at all
    // ========================================
    
    // CASE 1: We have cached data (fresh or stale) - RETURN IT IMMEDIATELY
    if (cacheStatus.hasAnyCache) {
      console.log('✅ Cache exists - returning cached data immediately (cache-first)');
      console.log(`📊 Cache age: ${cacheStatus.isStale ? 'STALE' : 'FRESH'}, Last fetched: ${cacheStatus.lastFetched}`);
      
      // Optionally refresh in background if cache is old enough (but don't wait for it)
      const shouldRefresh = cacheStatus.lastFetched ? shouldBackgroundRefresh(cacheStatus.lastFetched) : false;
      if (shouldRefresh) {
        const cacheAgeHours = cacheStatus.lastFetched 
          ? Math.round((Date.now() - new Date(cacheStatus.lastFetched).getTime()) / (1000 * 60 * 60))
          : 0;
        console.log(`🔄 Cache is ${cacheAgeHours}h old - scheduling background refresh (non-blocking)`);
        
        const mutexKey = `${dealerId}-${advertiserId}`;
        
        // Check if refresh is already in progress
        if (!this.refreshMutex.has(mutexKey)) {
          console.log('🔄 Starting background refresh (user will see cached data)...');
          const refreshPromise = this.refreshStockDataBackground(dealerId, advertiserId)
            .catch(error => {
              console.error('❌ Background refresh failed (user not affected):', error);
              // Don't throw - user is already seeing cached data
            })
            .finally(() => {
              this.refreshMutex.delete(mutexKey);
              console.log('🔓 Background refresh completed/failed');
            });
          
          this.refreshMutex.set(mutexKey, refreshPromise);
        } else {
          console.log('⏳ Background refresh already in progress');
        }
      } else {
        const cacheAgeHours = cacheStatus.lastFetched 
          ? Math.round((Date.now() - new Date(cacheStatus.lastFetched).getTime()) / (1000 * 60 * 60))
          : 0;
        console.log(`✅ Cache is ${cacheAgeHours}h old - still fresh enough (no refresh needed)`);
      }
      
      // Return cached data immediately (don't wait for background refresh)
      console.log('💾 Returning cached data (page load is fast!)...');
      return await this.getCachedStockData({ ...options, dealerId }, cacheStatus.isStale);
    }
    
    // CASE 2: NO cached data exists at all - Must fetch from AutoTrader
    console.log('⚠️ No cached data found - must fetch from AutoTrader (first time setup)');
    console.log('🔄 This should only happen on first use or after cache cleared');
    
    try {
      console.log('📡 Fetching from AutoTrader (blocking - no cache exists)...');
      return await this.refreshAndGetStockData(options);
    } catch (refreshError) {
      console.error('❌ AutoTrader fetch failed and no cache exists:', refreshError);
      
      // LAST RESORT: Try to find ANY cached data for this dealer (different advertiser ID?)
      console.log('🆘 Emergency fallback: Searching for ANY cached data...');
      try {
        const fallbackData = await this.getAnyCachedDataForDealer(dealerId, { ...options, page, pageSize });
        if (fallbackData && fallbackData.results.length > 0) {
          console.log('✅ Emergency fallback successful - found cached data from different advertiser ID');
          return {
            ...fallbackData,
            cacheStatus: {
              ...fallbackData.cacheStatus,
              staleCacheUsed: true,
              lastRefresh: fallbackData.cacheStatus.lastRefresh || null,
            }
          };
        }
      } catch (fallbackError) {
        console.error('❌ Emergency fallback also failed');
      }
      
      // Only throw if we truly have no data to show
      console.error('🚨 No data available - first fetch failed and no cache exists');
      throw refreshError;
    }
  }
  
  /**
   * Get single stock item by stockId - database only approach
   */
  static async getStockById(stockId: string, clerkUserId: string): Promise<any | null> {
    console.log('🔍 StockCacheService: Getting stock by ID:', stockId);
    
    // Resolve Clerk user ID to dealer UUID
    const dealerId = await this.resolveDealerUuid(clerkUserId);
    if (!dealerId) {
      console.log(`⚠️  Dealer record not found for Clerk user ID: ${clerkUserId}`);
      console.log('This might indicate the user needs to complete their dealer registration.');
      return null;
    }
    
    try {
      const cached = await db
        .select()
        .from(stockCache)
        .where(and(
          eq(stockCache.stockId, stockId),
          eq(stockCache.dealerId, dealerId),
          eq(stockCache.isStale, false) // Only return active (non-stale) stock
        ))
        .limit(1);
      
      if (cached.length === 0) {
        console.log('❌ Stock not found in cache:', stockId);
        return null;
      }
      
      const stockData = cached[0];
      
      // Reconstruct the stock object from cached data in the format frontend expects
      const vehicleData = stockData.vehicleData || {};
      
      // Fetch inventory details for this stock item
      let inventoryDetailsData = null;
      try {
        const inventoryResult = await db
          .select()
          .from(inventoryDetails)
          .where(and(
            eq(inventoryDetails.stockId, stockId),
            eq(inventoryDetails.dealerId, dealerId)
          ))
          .limit(1);
        
        if (inventoryResult.length > 0) {
          inventoryDetailsData = inventoryResult[0];
        }
      } catch (inventoryError) {
        console.warn('⚠️ Failed to fetch inventory details for stock:', stockId, inventoryError);
      }

      // Fetch sale details for this stock item
      let saleDetailsData = null;
      try {
        const saleResult = await db
          .select()
          .from(saleDetails)
          .where(and(
            eq(saleDetails.stockId, stockId),
            eq(saleDetails.dealerId, dealerId)
          ))
          .limit(1);
        
        if (saleResult.length > 0) {
          saleDetailsData = saleResult[0];
        }
      } catch (saleError) {
        console.warn('⚠️ Failed to fetch sale details for stock:', stockId, saleError);
      }

      const result = {
        stockId: stockData.stockId,
        
        // Vehicle details - frontend expects these in vehicle object
        vehicle: {
          ...vehicleData,
          // Override with our indexed fields for consistency
          registration: stockData.registration || (vehicleData as any).registration,
          vin: stockData.vin || (vehicleData as any).vin,
          make: stockData.make || (vehicleData as any).make,
          model: stockData.model || (vehicleData as any).model,
          derivative: stockData.derivative || (vehicleData as any).derivative,
          yearOfManufacture: stockData.yearOfManufacture || (vehicleData as any).yearOfManufacture,
          odometerReadingMiles: stockData.odometerReadingMiles || (vehicleData as any).odometerReadingMiles,
          fuelType: stockData.fuelType || (vehicleData as any).fuelType,
          bodyType: stockData.bodyType || (vehicleData as any).bodyType,
          ownershipCondition: stockData.ownershipCondition || (vehicleData as any).ownershipCondition,
          engineCapacityCC: (vehicleData as any).engineCapacityCC,
          engineNumber: (vehicleData as any).engineNumber,
          firstRegistrationDate: (vehicleData as any).firstRegistrationDate,
        },
        
        // Include inventory details if available
        inventoryDetails: inventoryDetailsData,
        
        // Include sale details if available
        saleDetails: saleDetailsData,
        
        // Top-level fields that frontend expects
        make: stockData.make,
        model: stockData.model,
        derivative: stockData.derivative,
        registration: stockData.registration,
        yearOfManufacture: stockData.yearOfManufacture?.toString(),
        fuelType: stockData.fuelType,
        transmissionType: (vehicleData as any).transmissionType,
        bodyType: stockData.bodyType,
        doors: (vehicleData as any).doors,
        seats: (vehicleData as any).seats,
        enginePowerBHP: (vehicleData as any).enginePowerBHP,
        odometerReadingMiles: stockData.odometerReadingMiles,
        colour: (vehicleData as any).colour,
        lifecycleState: stockData.lifecycleState,
        dateOnForecourt: (stockData.metadataRaw as any)?.dateOnForecourt,
        lastUpdated: (stockData.metadataRaw as any)?.lastUpdated,
        
        // Metadata
        metadata: {
          ...(stockData.metadataRaw || {}),
          lifecycleState: stockData.lifecycleState,
          stockId: stockData.stockId,
          dateOnForecourt: (stockData.metadataRaw as any)?.dateOnForecourt,
          lastUpdated: (stockData.metadataRaw as any)?.lastUpdated,
        },
        
        // Pricing - frontend expects both formats
        totalPrice: stockData.totalPriceGBP ? { amountGBP: Number(stockData.totalPriceGBP) } : undefined,
        suppliedPrice: (stockData.advertsData as any)?.retailAdverts?.suppliedPrice,
        forecourtPrice: stockData.forecourtPriceGBP ? { amountGBP: Number(stockData.forecourtPriceGBP) } : undefined,
        priceIndicatorRating: (stockData.advertsData as any)?.retailAdverts?.priceIndicatorRating,
        
        // Extended data objects
        advertiser: stockData.advertiserData,
        adverts: stockData.advertsData,
        features: stockData.featuresData,
        media: stockData.mediaData,
        history: stockData.historyData,
        check: stockData.checkData,
        highlights: stockData.highlightsData,
        valuations: stockData.valuationsData,
        responseMetrics: stockData.responseMetricsData,
        
        // Cache metadata
        _cacheMetadata: {
          lastFetched: stockData.lastFetchedFromAutoTrader,
          isStale: isCacheStale(stockData.lastFetchedFromAutoTrader),
          cacheAge: Math.round((Date.now() - stockData.lastFetchedFromAutoTrader.getTime()) / (1000 * 60 * 60))
        }
      };
      
      console.log('✅ Found stock in cache:', stockId);
      return result;
      
    } catch (error) {
      this.logError('Error getting stock by ID', error);
      throw error;
    }
  }
  
  /**
   * Get cache status for dealer/advertiser
   */
  static async getCacheStatus(dealerId: string, advertiserId: string) {
    try {
      const result = await db
        .select({
          count: sql<number>`count(*)`,
          lastFetched: sql<Date>`max(last_fetched_from_autotrader)`,
          oldestRecord: sql<Date>`min(last_fetched_from_autotrader)`,
        })
        .from(stockCache)
        .where(and(
          eq(stockCache.dealerId, dealerId),
          eq(stockCache.advertiserId, advertiserId)
        ));
      
      const stats = result[0];
      const hasAnyCache = stats.count > 0;
      const lastFetched = stats.lastFetched;
      
      return {
        hasAnyCache,
        lastFetched,
        isStale: lastFetched ? isCacheStale(lastFetched) : true,
        needsForceRefresh: lastFetched ? needsForceRefresh(lastFetched) : true,
        totalCachedRecords: stats.count,
        oldestRecord: stats.oldestRecord,
      };
    } catch (error) {
      this.logError('Error checking cache status', error);
      return {
        hasAnyCache: false,
        lastFetched: null,
        isStale: true,
        needsForceRefresh: true,
        totalCachedRecords: 0,
        oldestRecord: null,
      };
    }
  }
  
  /**
   * Get cached stock data with filtering and pagination
   */
  private static async getCachedStockData(options: StockQueryOptions, staleCacheUsed: boolean): Promise<CachedStockResponse> {
    const { dealerId, advertiserId, page = 1, pageSize = 10, sortBy = 'updated', sortOrder = 'desc' } = options;
    
    console.log('\n💾 ===== getCachedStockData: FETCHING FROM CACHE =====');
    console.log('🆔 Dealer ID:', dealerId);
    console.log('🏢 Advertiser ID:', advertiserId);
    console.log('📄 Page:', page, 'Size:', pageSize);
    console.log('📊 Filters:', {
      make: options.make,
      model: options.model,
      lifecycleState: options.lifecycleState,
      ownershipCondition: options.ownershipCondition
    });
    
    try {
      // Build WHERE conditions
      const conditions = [
        eq(stockCache.dealerId, dealerId),
        eq(stockCache.advertiserId, advertiserId),
        eq(stockCache.isStale, false) // Only return active (non-stale) stock
      ];
      
      console.log('🔍 Base conditions: dealerId, advertiserId, isStale=false');
      
      if (options.make) {
        conditions.push(eq(stockCache.make, options.make));
      }
      if (options.model) {
        conditions.push(eq(stockCache.model, options.model));
      }
      if (options.lifecycleState) {
        conditions.push(eq(stockCache.lifecycleState, options.lifecycleState));
      }
      if (options.ownershipCondition) {
        conditions.push(eq(stockCache.ownershipCondition, options.ownershipCondition));
      }
      if (options.priceFrom && options.priceTo) {
        const priceCondition = and(
          gte(stockCache.forecourtPriceGBP, options.priceFrom.toString()),
          lte(stockCache.forecourtPriceGBP, options.priceTo.toString())
        )
        if (priceCondition) {
          conditions.push(priceCondition)
        };
      } else if (options.priceFrom) {
        conditions.push(gte(stockCache.forecourtPriceGBP, options.priceFrom.toString()));
      } else if (options.priceTo) {
        conditions.push(lte(stockCache.forecourtPriceGBP, options.priceTo.toString()));
      }
      if (options.yearFrom && options.yearTo) {
        const yearCondition = and(
          gte(stockCache.yearOfManufacture, options.yearFrom),
          lte(stockCache.yearOfManufacture, options.yearTo)
        )
        if (yearCondition) {
          conditions.push(yearCondition)
        };
      } else if (options.yearFrom) {
        conditions.push(gte(stockCache.yearOfManufacture, options.yearFrom));
      } else if (options.yearTo) {
        conditions.push(lte(stockCache.yearOfManufacture, options.yearTo));
      }
      if (options.mileageFrom && options.mileageTo) {
        const mileageCondition = and(
          gte(stockCache.odometerReadingMiles, options.mileageFrom),
          lte(stockCache.odometerReadingMiles, options.mileageTo)
        )
        if (mileageCondition) {
          conditions.push(mileageCondition)
        };
      } else if (options.mileageFrom) {
        conditions.push(gte(stockCache.odometerReadingMiles, options.mileageFrom));
      } else if (options.mileageTo) {
        conditions.push(lte(stockCache.odometerReadingMiles, options.mileageTo));
      }
      
      // Build ORDER BY
      let orderByClause;
      const direction = sortOrder === 'asc' ? asc : desc;
      
      switch (sortBy) {
        case 'make':
          orderByClause = direction(stockCache.make);
          break;
        case 'model':
          orderByClause = direction(stockCache.model);
          break;
        case 'price':
          orderByClause = direction(stockCache.forecourtPriceGBP);
          break;
        case 'year':
          orderByClause = direction(stockCache.yearOfManufacture);
          break;
        case 'mileage':
          orderByClause = direction(stockCache.odometerReadingMiles);
          break;
        default:
          orderByClause = direction(stockCache.updatedAt);
      }
      
      // Get total count
      console.log('🔢 Executing count query...');
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockCache)
        .where(and(...conditions));
      
      const totalResults = totalResult[0].count;
      console.log('✅ Total results found in cache:', totalResults);
      
      if (totalResults === 0) {
        console.warn('\n⚠️ ===== NO CACHE DATA FOUND =====');
        console.warn('📭 Count query returned 0 results');
        console.warn('🔍 This means:');
        console.warn('   - No data in stock_cache for this dealer + advertiser');
        console.warn('   - OR lifecycle/filter conditions too restrictive');
        console.warn('   - OR isStale flag is true for all records');
        console.warn('🆔 Queried dealer ID:', dealerId);
        console.warn('🏢 Queried advertiser ID:', advertiserId);
        
        // Show applied filters
        if (options.lifecycleState) {
          console.warn('🔍 Lifecycle state filter:', options.lifecycleState);
        }
        if (options.make) console.warn('🔍 Make filter:', options.make);
        if (options.model) console.warn('🔍 Model filter:', options.model);
        
        // Try to find ANY data for this dealer (ignore all filters except dealer)
        console.log('\n🔍 Checking if ANY data exists for this dealer (ignoring filters)...');
        const anyDataResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(stockCache)
          .where(and(
            eq(stockCache.dealerId, dealerId),
            eq(stockCache.isStale, false)
          ));
        
        const anyDataCount = anyDataResult[0].count;
        console.log('📊 Total records for dealer (ignoring advertiser & filters):', anyDataCount);
        
        if (anyDataCount > 0) {
          console.warn('⚠️ Data exists but filters are too restrictive!');
          
          // Show what advertiser IDs exist
          const advertiserIds = await db
            .selectDistinct({ advertiserId: stockCache.advertiserId })
            .from(stockCache)
            .where(and(
              eq(stockCache.dealerId, dealerId),
              eq(stockCache.isStale, false)
            ));
          
          console.warn('📋 Advertiser IDs in cache:', advertiserIds.map(a => a.advertiserId));
          
          // If filtering by lifecycle state, show what states exist
          if (options.lifecycleState) {
            console.warn('\n🔍 Checking available lifecycle states...');
            const lifecycleStates = await db
              .select({ 
                lifecycleState: stockCache.lifecycleState,
                count: sql<number>`count(*)`.as('count')
              })
              .from(stockCache)
              .where(and(
                eq(stockCache.dealerId, dealerId),
                eq(stockCache.advertiserId, advertiserId),
                eq(stockCache.isStale, false)
              ))
              .groupBy(stockCache.lifecycleState);
            
            if (lifecycleStates.length > 0) {
              console.warn('📊 Available lifecycle states for this dealer+advertiser:');
              lifecycleStates.forEach(ls => {
                console.warn(`   - ${ls.lifecycleState}: ${ls.count} vehicles`);
              });
              console.warn(`⚠️ You filtered for "${options.lifecycleState}" but only the above states exist!`);
            } else {
              console.warn('⚠️ No data for this advertiser ID, but data exists for other advertisers');
            }
          }
        } else {
          console.warn('❌ No data in cache for this dealer at all!');
          console.warn('⚠️ Need to fetch from AutoTrader or check dealer setup');
        }
      }
      
      const totalPages = Math.ceil(totalResults / pageSize);
      const offset = (page - 1) * pageSize;
      
      // Get paginated results
      console.log('📄 Fetching paginated results:', { page, pageSize, offset, totalPages });
      const results = await db
        .select()
        .from(stockCache)
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset);
      
      console.log('✅ Retrieved', results.length, 'records from cache');
      
      // Transform to expected format (frontend expects most data in vehicle object)
      const transformedResults = results.map(cached => {
        // Merge cached top-level fields with the stored vehicle data to ensure frontend compatibility
        const vehicleData = cached.vehicleData || {};
        
        return {
          stockId: cached.stockId,
          
          // Vehicle details - frontend expects these in vehicle object
          vehicle: {
            ...vehicleData, // Start with stored vehicle data
            // Override with our indexed fields to ensure consistency
            registration: cached.registration || (vehicleData as any).registration,
            vin: cached.vin || (vehicleData as any).vin,
            make: cached.make || (vehicleData as any).make,
            model: cached.model || (vehicleData as any).model,
            derivative: cached.derivative || (vehicleData as any).derivative,
            yearOfManufacture: cached.yearOfManufacture || (vehicleData as any).yearOfManufacture,
            odometerReadingMiles: cached.odometerReadingMiles || (vehicleData as any).odometerReadingMiles,
            fuelType: cached.fuelType || (vehicleData as any).fuelType,
            bodyType: cached.bodyType || (vehicleData as any).bodyType,
            ownershipCondition: cached.ownershipCondition || (vehicleData as any).ownershipCondition,
          },
          
          // Top-level fields that frontend expects
          make: cached.make,
          model: cached.model,
          derivative: cached.derivative,
          registration: cached.registration,
          yearOfManufacture: cached.yearOfManufacture?.toString(),
          fuelType: cached.fuelType,
                  transmissionType: (vehicleData as any).transmissionType,
        bodyType: cached.bodyType,
        doors: (vehicleData as any).doors,
        seats: (vehicleData as any).seats,
        enginePowerBHP: (vehicleData as any).enginePowerBHP,
        odometerReadingMiles: cached.odometerReadingMiles,
        colour: (vehicleData as any).colour,
          lifecycleState: cached.lifecycleState,
          dateOnForecourt: (cached.metadataRaw as any)?.dateOnForecourt,
          lastUpdated: (cached.metadataRaw as any)?.lastUpdated,
          
          // Metadata
          metadata: {
            ...(cached.metadataRaw || {}),
            lifecycleState: cached.lifecycleState,
            stockId: cached.stockId,
            dateOnForecourt: (cached.metadataRaw as any)?.dateOnForecourt,
            lastUpdated: (cached.metadataRaw as any)?.lastUpdated,
          },
          
          // Pricing - frontend expects both formats
          totalPrice: cached.totalPriceGBP ? { amountGBP: Number(cached.totalPriceGBP) } : undefined,
          suppliedPrice: (cached.advertsData as any)?.retailAdverts?.suppliedPrice,
          forecourtPrice: cached.forecourtPriceGBP ? { amountGBP: Number(cached.forecourtPriceGBP) } : undefined,
          priceIndicatorRating: (cached.advertsData as any)?.retailAdverts?.priceIndicatorRating,
          
          // Extended data objects
          advertiser: cached.advertiserData,
          adverts: cached.advertsData,
          features: cached.featuresData,
          media: cached.mediaData,
          history: cached.historyData,
          check: cached.checkData,
          highlights: cached.highlightsData,
          valuations: cached.valuationsData,
          responseMetrics: cached.responseMetricsData,
        };
      });
      
      const lastRefresh = results.length > 0 ? results[0].lastFetchedFromAutoTrader : null;
      
      return {
        results: transformedResults,
        totalResults,
        totalPages,
        page,
        pageSize,
        hasNextPage: page < totalPages,
        cacheStatus: {
          fromCache: true,
          lastRefresh,
          staleCacheUsed,
        },
      };
      
    } catch (error) {
      this.logError('Error getting cached stock data', error);
      throw error;
    }
  }
  
  /**
   * EMERGENCY FALLBACK: Get any cached data for a dealer UUID (ignores advertiser ID)
   * This is used when advertiser ID validation fails but we want to show cached data
   * USER ISOLATION: Only returns data for the specified dealer UUID
   */
  private static async getAnyCachedDataForDealer(dealerId: string, options: { page: number; pageSize: number; make?: string; model?: string; lifecycleState?: string }): Promise<CachedStockResponse | null> {
    console.log('🆘 Emergency: Getting any cached data for dealer:', dealerId);
    
    try {
      const { page = 1, pageSize = 10 } = options;
      
      // Build WHERE conditions - ONLY filter by dealer ID for user isolation
      const conditions = [
        eq(stockCache.dealerId, dealerId),
        eq(stockCache.isStale, false) // Only return active (non-stale) stock
      ];
      
      // Apply additional filters if provided
      if (options.make) {
        conditions.push(eq(stockCache.make, options.make));
      }
      if (options.model) {
        conditions.push(eq(stockCache.model, options.model));
      }
      if (options.lifecycleState) {
        conditions.push(eq(stockCache.lifecycleState, options.lifecycleState));
      }
      
      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockCache)
        .where(and(...conditions));
      
      const totalResults = totalResult[0].count;
      
      if (totalResults === 0) {
        console.log('❌ No cached data found for dealer:', dealerId);
        return null;
      }
      
      const totalPages = Math.ceil(totalResults / pageSize);
      const offset = (page - 1) * pageSize;
      
      // Get paginated results
      const results = await db
        .select()
        .from(stockCache)
        .where(and(...conditions))
        .orderBy(desc(stockCache.lastFetchedFromAutoTrader))
        .limit(pageSize)
        .offset(offset);
      
      // Transform to expected format (same as getCachedStockData)
      const transformedResults = results.map(cached => {
        const vehicleData = cached.vehicleData || {};
        
        return {
          stockId: cached.stockId,
          vehicle: {
            ...vehicleData,
            registration: cached.registration || (vehicleData as any).registration,
            vin: cached.vin || (vehicleData as any).vin,
            make: cached.make || (vehicleData as any).make,
            model: cached.model || (vehicleData as any).model,
            derivative: cached.derivative || (vehicleData as any).derivative,
            yearOfManufacture: cached.yearOfManufacture || (vehicleData as any).yearOfManufacture,
            odometerReadingMiles: cached.odometerReadingMiles || (vehicleData as any).odometerReadingMiles,
            fuelType: cached.fuelType || (vehicleData as any).fuelType,
            bodyType: cached.bodyType || (vehicleData as any).bodyType,
            ownershipCondition: cached.ownershipCondition || (vehicleData as any).ownershipCondition,
          },
          make: cached.make,
          model: cached.model,
          derivative: cached.derivative,
          registration: cached.registration,
          yearOfManufacture: cached.yearOfManufacture?.toString(),
          fuelType: cached.fuelType,
          transmissionType: (vehicleData as any).transmissionType,
          bodyType: cached.bodyType,
          doors: (vehicleData as any).doors,
          seats: (vehicleData as any).seats,
          enginePowerBHP: (vehicleData as any).enginePowerBHP,
          odometerReadingMiles: cached.odometerReadingMiles,
          colour: (vehicleData as any).colour,
          lifecycleState: cached.lifecycleState,
          dateOnForecourt: (cached.metadataRaw as any)?.dateOnForecourt,
          lastUpdated: (cached.metadataRaw as any)?.lastUpdated,
          metadata: {
            ...(cached.metadataRaw || {}),
            lifecycleState: cached.lifecycleState,
            stockId: cached.stockId,
            dateOnForecourt: (cached.metadataRaw as any)?.dateOnForecourt,
            lastUpdated: (cached.metadataRaw as any)?.lastUpdated,
          },
          totalPrice: cached.totalPriceGBP ? { amountGBP: Number(cached.totalPriceGBP) } : undefined,
          suppliedPrice: (cached.advertsData as any)?.retailAdverts?.suppliedPrice,
          forecourtPrice: cached.forecourtPriceGBP ? { amountGBP: Number(cached.forecourtPriceGBP) } : undefined,
          priceIndicatorRating: (cached.advertsData as any)?.retailAdverts?.priceIndicatorRating,
          advertiser: cached.advertiserData,
          adverts: cached.advertsData,
          features: cached.featuresData,
          media: cached.mediaData,
          history: cached.historyData,
          check: cached.checkData,
          highlights: cached.highlightsData,
          valuations: cached.valuationsData,
          responseMetrics: cached.responseMetricsData,
        };
      });
      
      const lastRefresh = results.length > 0 ? results[0].lastFetchedFromAutoTrader : null;
      
      console.log(`✅ Emergency fallback found ${transformedResults.length} cached items for dealer`);
      
      return {
        results: transformedResults,
        totalResults,
        totalPages,
        page,
        pageSize,
        hasNextPage: page < totalPages,
        cacheStatus: {
          fromCache: true,
          lastRefresh,
          staleCacheUsed: true, // Mark as stale since we're using emergency fallback
        },
      };
      
    } catch (error) {
      console.error('❌ Emergency fallback error:', error);
      return null;
    }
  }
  
  /**
   * EMERGENCY FALLBACK: Get cached data by Clerk user ID directly
   * Used when dealer UUID resolution fails but we still want to try showing data
   * USER ISOLATION: Joins with dealers table to ensure user can only see their own data
   */
  private static async getAnyCachedDataForClerkUser(clerkUserId: string, options: { page: number; pageSize: number }): Promise<CachedStockResponse | null> {
    console.log('🆘 Ultimate emergency: Getting cached data by Clerk user ID:', clerkUserId);
    
    try {
      const { page = 1, pageSize = 10 } = options;
      
      // First, try to find dealer UUID via direct query with JOIN
      // This ensures USER ISOLATION - only returns data linked to this clerk user
      const dealerResult = await db
        .select({ dealerId: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, clerkUserId))
        .limit(1);
      
      if (dealerResult.length === 0) {
        console.log('❌ No dealer record found for Clerk user in emergency fallback');
        return null;
      }
      
      const dealerId = dealerResult[0].dealerId;
      console.log('✅ Found dealer UUID via emergency lookup:', dealerId);
      
      // Now use the standard emergency fallback with the found dealer ID
      return await this.getAnyCachedDataForDealer(dealerId, options);
      
    } catch (error) {
      console.error('❌ Ultimate emergency fallback error:', error);
      return null;
    }
  }
  
  /**
   * Refresh stock data from AutoTrader and cache it with progress tracking
   */
  private static async refreshAndGetStockDataWithProgress(
    options: StockQueryOptions,
    progressCallback?: (current: number, total: number, estimatedTime?: number) => void
  ): Promise<CachedStockResponse> {
    console.log('🔄 Refreshing stock data from AutoTrader with progress tracking...');
    
    // Resolve Clerk user ID to dealer UUID
    const dealerId = await this.resolveDealerUuid(options.dealerId);
    if (!dealerId) {
      throw new Error(`Dealer not found for Clerk user ID: ${options.dealerId}`);
    }
    
    const syncLogId = await this.startSyncLog(dealerId, options.advertiserId, 'full_sync');
    
    try {
      // Get user email (same logic as original)
      const userEmail = await this.getUserEmail(options.dealerId);
      
      // Get AutoTrader token
      const tokenResult = await getAutoTraderToken(userEmail);
      if (!tokenResult.success || !tokenResult.access_token) {
        throw new Error('Failed to authenticate with AutoTrader');
      }
      
      // Fetch all stock data with parallel processing and progress tracking
      const stockData = await this.fetchAllStockFromAutoTraderParallel(
        tokenResult.access_token,
        options.advertiserId,
        userEmail,
        progressCallback
      );
      
      // Update cache with fresh data
      await this.updateCacheOptimized(dealerId, options.advertiserId, stockData);
      
      await this.completeSyncLog(syncLogId, stockData.length, stockData.length, 0, 0);
      
      // Return filtered and paginated data from cache
      return await this.getCachedStockData({ ...options, dealerId }, false);
      
    } catch (error) {
      const errorMessage = this.logError('Error refreshing stock data', error);
      await this.failSyncLog(syncLogId, errorMessage);
      throw error;
    }
  }

  /**
   * Refresh stock data from AutoTrader and cache it
   */
  private static async refreshAndGetStockData(options: StockQueryOptions): Promise<CachedStockResponse> {
    console.log('🔄 Refreshing stock data from AutoTrader...');
    
    // Resolve Clerk user ID to dealer UUID
    const dealerId = await this.resolveDealerUuid(options.dealerId);
    if (!dealerId) {
      throw new Error(`Dealer not found for Clerk user ID: ${options.dealerId}`);
    }
    
    const syncLogId = await this.startSyncLog(dealerId, options.advertiserId, 'full_sync');
    
    try {
      // Get store owner's email for AutoTrader auth (works for both store owners and team members)
      let userEmail: string;
      
      // Check if user is a team member first
      const teamMemberResult = await db
        .select({ storeOwnerId: teamMembers.storeOwnerId })
        .from(teamMembers)
        .where(eq(teamMembers.clerkUserId, options.dealerId))
        .limit(1);
      
      if (teamMemberResult.length > 0) {
        // User is team member - get store owner's email
        const storeOwnerResult = await db
          .select({ email: dealers.email })
          .from(dealers)
          .where(eq(dealers.id, teamMemberResult[0].storeOwnerId))
          .limit(1);
        
        if (storeOwnerResult.length === 0) {
          throw new Error('Store owner not found for team member');
        }
        
        userEmail = storeOwnerResult[0].email;
        console.log('👥 Using store owner email for AutoTrader auth:', userEmail);
      } else {
        // User is store owner - get their own email from store config
        const dealerResult = await db
          .select({ email: storeConfig.email })
          .from(storeConfig)
          .where(eq(storeConfig.clerkUserId, options.dealerId))
          .limit(1);
        
        if (dealerResult.length === 0) {
          throw new Error('Store configuration not found');
        }
        
        userEmail = dealerResult[0].email;
        console.log('🏢 Using store owner email for AutoTrader auth:', userEmail);
      }
      
      // Get AutoTrader token
      const tokenResult = await getAutoTraderToken(userEmail);
      if (!tokenResult.success || !tokenResult.access_token) {
        throw new Error('Failed to authenticate with AutoTrader');
      }
      
      // Fetch all stock data from AutoTrader with automatic retry on token expiration
      const stockData = await this.fetchAllStockFromAutoTraderWithRetry(
        tokenResult.access_token,
        options.advertiserId,
        userEmail
      );
      
      // Update cache with fresh data
      await this.updateCache(dealerId, options.advertiserId, stockData);
      
      await this.completeSyncLog(syncLogId, stockData.length, stockData.length, 0, 0);
      
      // Now return the filtered and paginated data from cache
      return await this.getCachedStockData({ ...options, dealerId }, false);
      
    } catch (error) {
      const errorMessage = this.logError('Error refreshing stock data', error);
      await this.failSyncLog(syncLogId, errorMessage);
      
      // Don't retry database constraint errors - these indicate configuration issues
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Duplicate stock ID errors - critical data integrity issue
        if (message.includes('duplicate stock id detected')) {
          throw error; // Pass through the detailed error message
        }
        
        // Handle general database errors - don't transform them
        if (message.includes('database query execution failed') ||
            message.includes('database insert failed') ||
            message.includes('database connection error')) {
          console.log('🛑 Database error detected, not retrying:', message);
          throw error; // Re-throw as-is, don't transform
        }
        
        // Database constraint violations indicate invalid advertiser ID or configuration
        if (message.includes('foreign key constraint') || 
            message.includes('violates foreign key') ||
            message.includes('invalid advertiser') ||
            message.includes('advertiser not found') ||
            message.includes('constraint violation')) {
          throw new Error('Invalid advertiser ID configuration. Please verify your advertiser ID is correct and properly configured.');
        }
        
        // AutoTrader authentication/permission errors - don't retry
        if (message.includes('401') || message.includes('unauthorized') ||
            message.includes('403') || message.includes('forbidden') ||
            message.includes('invalid credentials') ||
            message.includes('AutoTrader authentication failed')) {
          throw new Error('AutoTrader authentication failed. Please verify your API credentials are correct.');
        }
        
        // AutoTrader conflict errors - don't retry
        if (message.includes('409') || message.includes('conflict') ||
            message.includes('already in use') ||
            message.includes('advertiser id') && message.includes('conflict')) {
          throw new Error('Advertiser ID conflict. This advertiser ID is already being used by another account.');
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Background refresh of stock data
   */
  private static async refreshStockDataBackground(dealerUuid: string, advertiserId: string): Promise<void> {
    console.log('🔄 Background refresh started...');
    
    const syncLogId = await this.startSyncLog(dealerUuid, advertiserId, 'partial_sync');
    
    try {
      // Get the Clerk user ID from dealer UUID to get the email
      const dealerClerkResult = await db
        .select({ clerkUserId: dealers.clerkUserId })
        .from(dealers)
        .where(eq(dealers.id, dealerUuid))
        .limit(1);
      
      if (dealerClerkResult.length === 0) {
        throw new Error('Dealer not found for UUID: ' + dealerUuid);
      }
      
      const clerkUserId = dealerClerkResult[0].clerkUserId;
      
      // Get dealer email for AutoTrader auth
      const dealerResult = await db
        .select({ email: storeConfig.email })
        .from(storeConfig)
        .where(eq(storeConfig.clerkUserId, clerkUserId))
        .limit(1);
      
      if (dealerResult.length === 0) {
        throw new Error('Dealer configuration not found');
      }
      
      const userEmail = dealerResult[0].email;
      
      // Get AutoTrader token
      const tokenResult = await getAutoTraderToken(userEmail);
      if (!tokenResult.success || !tokenResult.access_token) {
        throw new Error('Failed to authenticate with AutoTrader');
      }
      
      // Fetch stock data from AutoTrader
      const stockData = await this.fetchAllStockFromAutoTrader(
        tokenResult.access_token,
        advertiserId
      );
      
      // Update cache
      await this.updateCache(dealerUuid, advertiserId, stockData);
      
      await this.completeSyncLog(syncLogId, stockData.length, stockData.length, 0, 0);
      
      console.log('✅ Background refresh completed');
      
    } catch (error) {
      const errorMessage = this.logError('Background refresh failed', error);
      await this.failSyncLog(syncLogId, errorMessage);
    }
  }
  
  /**
   * Wrapper for fetchAllStockFromAutoTrader with automatic token refresh on 401 errors
   * This ensures that if a token expires mid-request, we automatically get a fresh one and retry
   */
  private static async fetchAllStockFromAutoTraderWithRetry(
    accessToken: string, 
    advertiserId: string,
    userEmail: string,
    retryCount = 0
  ): Promise<any[]> {
    const MAX_TOKEN_RETRIES = 2; // Maximum retries for token expiration
    
    try {
      return await this.fetchAllStockFromAutoTrader(accessToken, advertiserId);
    } catch (error) {
      // Check if this is a 401 authentication error
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        const is401Error = message.includes('401') || 
                          message.includes('unauthorized') ||
                          message.includes('authentication');
        
        if (is401Error && retryCount < MAX_TOKEN_RETRIES) {
          console.warn(`⚠️ Token expired (attempt ${retryCount + 1}/${MAX_TOKEN_RETRIES}), fetching fresh token...`);
          
          // Invalidate only the specific user's token instead of clearing all tokens
          await invalidateTokenByEmail(userEmail);
          
          // Get a fresh token
          const newTokenResult = await getAutoTraderToken(userEmail);
          if (!newTokenResult.success || !newTokenResult.access_token) {
            throw new Error('Failed to refresh AutoTrader token after expiration');
          }
          
          console.log('✅ Fresh token obtained, retrying stock fetch...');
          
          // Retry with the new token
          return await this.fetchAllStockFromAutoTraderWithRetry(
            newTokenResult.access_token,
            advertiserId,
            userEmail,
            retryCount + 1
          );
        }
      }
      
      // If not a 401 error or max retries exceeded, throw the original error
      throw error;
    }
  }

  /**
   * Fetch all stock data from AutoTrader API with circuit breaker and retry logic
   * Uses chunked processing to reduce memory footprint
   */
  private static async fetchAllStockFromAutoTrader(accessToken: string, advertiserId: string): Promise<any[]> {
    console.log('📡 Fetching all stock from AutoTrader API...');
    
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    let allResults: any[] = [];
    let currentPage = 1;
    let totalPages = 1;
    let hasResults = true;
    const pageSize = 100;
    const maxPages = 100;
    const CHUNK_PROCESS_SIZE = 2; // Process 2 pages at a time to reduce memory
    
    // Get or create circuit breaker for this advertiser
    const circuitBreakerKey = `autotrader-${advertiserId}`;
    if (!this.circuitBreaker.has(circuitBreakerKey)) {
      this.circuitBreaker.set(circuitBreakerKey, new CircuitBreaker(5, 60000));
    }
    const breaker = this.circuitBreaker.get(circuitBreakerKey)!;
    
    do {
      const stockParams = new URLSearchParams();
      stockParams.append('advertiserId', advertiserId);
      stockParams.append('page', currentPage.toString());
      stockParams.append('pageSize', pageSize.toString());
      stockParams.append('includeHistory', 'true');
      stockParams.append('includeCheck', 'true');
      stockParams.append('includeFeatures', 'true');
      stockParams.append('includeHighlights', 'true');
      stockParams.append('includeMedia', 'true');
      
      const stockUrl = `${baseUrl}/stock?${stockParams.toString()}`;
      console.log(`📡 Fetching page ${currentPage}: ${stockUrl}`);
      
      // Use circuit breaker and enhanced fetch
      const response = await breaker.execute(async () => {
        return await fetchWithRetry(stockUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
      });
      
      if (!response.ok) {
        let errorMessage = `AutoTrader API error: ${response.status} ${response.statusText}`;
        let errorDetails = null;
        try {
          const responseText = await response.text();
          try {
            errorDetails = JSON.parse(responseText);
            if (errorDetails.message || errorDetails.error) {
              errorMessage += ` - ${errorDetails.message || errorDetails.error}`;
            }
            console.error('🔍 API Error Details:', errorDetails);
          } catch (jsonError) {
            console.error('🔍 API Error Response (non-JSON):', responseText);
            errorMessage += ` - ${responseText}`;
          }
        } catch (e) {
          console.error('🔍 Could not read error response');
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (currentPage === 1) {
        console.log('📊 API Pagination Info:', {
          totalResults: data.totalResults,
          totalPages: data.totalPages,
          page: data.page,
          pageSize: data.pageSize,
          resultsCount: data.results?.length || 0,
          hasNext: data.next || data.hasNext || data.has_next,
          links: data.links || data._links
        });
        
        totalPages = data.totalPages || data.total_pages || Math.ceil((data.totalResults || data.total_results || 0) / pageSize) || 1;
        
        if (data.totalResults && data.totalResults > pageSize && totalPages === 1) {
          totalPages = Math.ceil(data.totalResults / pageSize);
          console.log(`📐 Calculated total pages: ${totalPages} (${data.totalResults} results / ${pageSize} per page)`);
        }
      }
      
      const pageResults = data.results || [];
      allResults = allResults.concat(pageResults);
      
      console.log(`📄 Fetched page ${currentPage} of ${totalPages}, total results so far: ${allResults.length}`);
      
      // Memory optimization: Process in chunks and trigger GC if available
      if (currentPage % CHUNK_PROCESS_SIZE === 0 && global.gc) {
        console.log('🧹 Triggering garbage collection after chunk...');
        global.gc();
      }
      
      currentPage++;
      hasResults = pageResults.length > 0;
      
      if (!hasResults && currentPage > 1) {
        console.log('📭 No more results returned, stopping pagination');
        break;
      }
      
    } while ((currentPage <= totalPages || hasResults) && currentPage <= maxPages);
    
    if (currentPage > maxPages) {
      console.warn(`⚠️ Reached maximum page limit (${maxPages}). There may be more results.`);
    }
    
    console.log(`✅ Fetched ${allResults.length} stock items from AutoTrader across ${currentPage - 1} pages`);
    return allResults;
  }

  /**
   * Parallel fetch implementation - fetches multiple pages simultaneously
   */
  private static async fetchAllStockFromAutoTraderParallel(
    accessToken: string, 
    advertiserId: string,
    userEmail: string,
    progressCallback?: (current: number, total: number, estimatedTime?: number) => void
  ): Promise<any[]> {
    console.log('🚀 Fetching stock from AutoTrader with parallel processing...');
    
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const pageSize = 100;
    const maxConcurrent = 3; // Fetch 3 pages simultaneously
    const startTime = Date.now();
    
    // Get circuit breaker
    const circuitBreakerKey = `autotrader-${advertiserId}`;
    if (!this.circuitBreaker.has(circuitBreakerKey)) {
      this.circuitBreaker.set(circuitBreakerKey, new CircuitBreaker(5, 60000));
    }
    const breaker = this.circuitBreaker.get(circuitBreakerKey)!;
    
    // First, fetch page 1 to get total pages
    const firstPageData = await this.fetchSinglePage(baseUrl!, accessToken, advertiserId, 1, pageSize, breaker);
    const totalPages = firstPageData.totalPages || Math.ceil((firstPageData.totalResults || 0) / pageSize) || 1;
    
    console.log(`📊 Total pages to fetch: ${totalPages}`);
    progressCallback?.(1, totalPages);
    
    let allResults = firstPageData.results || [];
    
    if (totalPages <= 1) {
      return allResults;
    }
    
    // Fetch remaining pages in parallel batches
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    
    for (let i = 0; i < remainingPages.length; i += maxConcurrent) {
      const batch = remainingPages.slice(i, i + maxConcurrent);
      const batchStartTime = Date.now();
      
      console.log(`🔄 Fetching batch: pages ${batch.join(', ')}`);
      
      const batchPromises = batch.map(page => 
        this.fetchSinglePage(baseUrl!, accessToken, advertiserId, page, pageSize, breaker)
      );
      
      try {
        const batchResults = await Promise.all(batchPromises);
        
        for (const pageData of batchResults) {
          if (pageData.results) {
            allResults = allResults.concat(pageData.results);
          }
        }
        
        const currentPage = i + maxConcurrent + 1;
        const elapsed = Date.now() - startTime;
        const avgTimePerBatch = elapsed / Math.ceil((currentPage) / maxConcurrent);
        const remainingBatches = Math.ceil((totalPages - currentPage) / maxConcurrent);
        const estimatedTimeRemaining = avgTimePerBatch * remainingBatches;
        
        progressCallback?.(currentPage, totalPages, estimatedTimeRemaining);
        
        console.log(`✅ Batch completed in ${Date.now() - batchStartTime}ms. Total items: ${allResults.length}`);
        
      } catch (error) {
        console.error(`❌ Batch failed for pages ${batch.join(', ')}:`, error);
        // Continue with other batches - don't fail entire refresh
      }
      
      // Small delay between batches to be respectful to the API
      if (i + maxConcurrent < remainingPages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`🚀 Parallel fetch completed: ${allResults.length} items in ${Date.now() - startTime}ms`);
    return allResults;
  }

  /**
   * Fetch a single page of stock data
   */
  private static async fetchSinglePage(
    baseUrl: string,
    accessToken: string,
    advertiserId: string,
    page: number,
    pageSize: number,
    breaker: CircuitBreaker
  ): Promise<any> {
    const stockParams = new URLSearchParams();
    stockParams.append('advertiserId', advertiserId);
    stockParams.append('page', page.toString());
    stockParams.append('pageSize', pageSize.toString());
    stockParams.append('includeHistory', 'true');
    stockParams.append('includeCheck', 'true');
    stockParams.append('includeFeatures', 'true');
    stockParams.append('includeHighlights', 'true');
    stockParams.append('includeMedia', 'true');
    
    const stockUrl = `${baseUrl}/stock?${stockParams.toString()}`;
    
    const response = await breaker.execute(async () => {
      return await fetchWithRetry(stockUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    });
    
    if (!response.ok) {
      throw new Error(`AutoTrader API error for page ${page}: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Update cache with fresh stock data - handles foreign key constraints
   */
  private static async updateCache(dealerId: string, advertiserId: string, stockData: any[]): Promise<void> {
    console.log(`💾 Updating cache with ${stockData.length} stock items...`);
    
    try {
      if (stockData.length === 0) {
        console.log('📦 No stock data to cache');
        // Mark all existing entries as stale instead of deleting
        await db
          .update(stockCache)
          .set({ 
            isStale: true, 
            updatedAt: new Date() 
          })
          .where(and(
            eq(stockCache.dealerId, dealerId),
            eq(stockCache.advertiserId, advertiserId)
          ));
        return;
      }

      // Get existing stock IDs for this dealer/advertiser
      const existingStockIds = await db
        .select({ stockId: stockCache.stockId })
        .from(stockCache)
        .where(and(
          eq(stockCache.dealerId, dealerId),
          eq(stockCache.advertiserId, advertiserId)
        ));
      
      const existingIds = new Set(existingStockIds.map(row => row.stockId));
      const newStockIds = new Set(stockData.map(item => item.metadata?.stockId || '').filter(Boolean));
      
      console.log(`📊 Existing: ${existingIds.size}, New: ${newStockIds.size} stock items`);
      
      // Mark stale entries (exist in DB but not in new data)
      const staleIds = Array.from(existingIds).filter(id => !newStockIds.has(id));
      if (staleIds.length > 0) {
        console.log(`🗑️ Marking ${staleIds.length} items as stale`);
        await db
          .update(stockCache)
          .set({ 
            isStale: true, 
            updatedAt: new Date() 
          })
          .where(and(
            eq(stockCache.dealerId, dealerId),
            eq(stockCache.advertiserId, advertiserId),
            inArray(stockCache.stockId, staleIds)
          ));
      }
      
      // Prepare new cache entries
      const cacheEntries: NewStockCache[] = stockData.map(item => {
        const vehicle = item.vehicle || {};
        const metadata = item.metadata || {};
        const adverts = item.adverts || {};
        
        // Extract pricing information
        let forecourtPriceGBP: string | null = null;
        let totalPriceGBP: string | null = null;
        
        if (adverts.forecourtPrice?.amountGBP) {
          forecourtPriceGBP = adverts.forecourtPrice.amountGBP.toString();
        }
        if (adverts.retailAdverts?.totalPrice?.amountGBP) {
          totalPriceGBP = adverts.retailAdverts.totalPrice.amountGBP.toString();
        }
        
        return {
          stockId: metadata.stockId || '',
          dealerId,
          advertiserId,
          
          // Core searchable fields
          make: vehicle.make || '',
          model: vehicle.model || '',
          derivative: vehicle.derivative,
          registration: vehicle.registration,
          vin: vehicle.vin,
          yearOfManufacture: vehicle.yearOfManufacture,
          odometerReadingMiles: vehicle.odometerReadingMiles,
          fuelType: vehicle.fuelType,
          bodyType: vehicle.bodyType,
          forecourtPriceGBP,
          totalPriceGBP,
          lifecycleState: metadata.lifecycleState,
          ownershipCondition: vehicle.ownershipCondition,
          
          // Cache management
          lastFetchedFromAutoTrader: new Date(),
          isStale: false,
          autoTraderVersionNumber: metadata.versionNumber,
          
          // JSON fields with complete data
          vehicleData: item.vehicle,
          advertiserData: item.advertiser,
          advertsData: item.adverts,
          metadataRaw: item.metadata,
          featuresData: item.features,
          mediaData: item.media,
          historyData: item.history,
          checkData: item.check,
          highlightsData: item.highlights,
          valuationsData: item.valuations,
          responseMetricsData: item.responseMetrics,
          
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      
      // Separate entries into updates and inserts
      const toUpdate: NewStockCache[] = [];
      const toInsert: NewStockCache[] = [];
      
      for (const entry of cacheEntries) {
        if (existingIds.has(entry.stockId)) {
          toUpdate.push(entry);
        } else {
          toInsert.push(entry);
        }
      }
      
      console.log(`🔄 Updating ${toUpdate.length} existing items, inserting ${toInsert.length} new items`);
      
      let successfulUpdates = 0;
      let successfulInserts = 0;
      
      // Update existing entries
      for (const entry of toUpdate) {
        try {
          await db
            .update(stockCache)
            .set({
              // Update all fields except stockId, dealerId, advertiserId
              make: entry.make,
              model: entry.model,
              derivative: entry.derivative,
              registration: entry.registration,
              vin: entry.vin,
              yearOfManufacture: entry.yearOfManufacture,
              odometerReadingMiles: entry.odometerReadingMiles,
              fuelType: entry.fuelType,
              bodyType: entry.bodyType,
              forecourtPriceGBP: entry.forecourtPriceGBP,
              totalPriceGBP: entry.totalPriceGBP,
              lifecycleState: entry.lifecycleState,
              ownershipCondition: entry.ownershipCondition,
              lastFetchedFromAutoTrader: entry.lastFetchedFromAutoTrader,
              isStale: false, // Mark as fresh
              autoTraderVersionNumber: entry.autoTraderVersionNumber,
              vehicleData: entry.vehicleData,
              advertiserData: entry.advertiserData,
              advertsData: entry.advertsData,
              metadataRaw: entry.metadataRaw,
              featuresData: entry.featuresData,
              mediaData: entry.mediaData,
              historyData: entry.historyData,
              checkData: entry.checkData,
              highlightsData: entry.highlightsData,
              valuationsData: entry.valuationsData,
              responseMetricsData: entry.responseMetricsData,
              updatedAt: new Date(),
            })
            .where(and(
              eq(stockCache.stockId, entry.stockId),
              eq(stockCache.dealerId, dealerId),
              eq(stockCache.advertiserId, advertiserId)
            ));
          successfulUpdates++;
        } catch (updateError) {
          console.error(`❌ Failed to update stock item ${entry.stockId}:`, {
            error: updateError instanceof Error ? updateError.message : String(updateError),
            stockId: entry.stockId,
            make: entry.make,
            model: entry.model
          });
        }
      }
      
      // Insert new entries in batches
      if (toInsert.length > 0) {
        const batchSize = CACHE_CONFIG.BATCH_SIZE;
        
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          
          try {
            await db.insert(stockCache).values(batch);
            successfulInserts += batch.length;
            console.log(`💾 Inserted batch ${Math.floor(i / batchSize) + 1}, items ${i + 1}-${Math.min(i + batchSize, toInsert.length)}`);
          } catch (batchError) {
            console.error('🔍 Batch insert error details:', {
              error: batchError instanceof Error ? batchError.message : String(batchError),
              batchSize: batch.length,
              batchNumber: Math.floor(i / batchSize) + 1
            });
            
            // Try individual inserts for this batch
            for (const entry of batch) {
              try {
                await db.insert(stockCache).values([entry]);
                successfulInserts++;
              } catch (individualError) {
                console.error(`❌ Failed to insert stock item ${entry.stockId}:`, {
                  error: individualError instanceof Error ? individualError.message : String(individualError),
                  stockId: entry.stockId,
                  make: entry.make,
                  model: entry.model
                });
              }
            }
          }
        }
      }
      
      console.log(`✅ Cache update completed: ${successfulUpdates} updated, ${successfulInserts} inserted, ${staleIds.length} marked stale`);
      
      // Automatically cleanup stale entries that aren't referenced (run in background)
      if (staleIds.length > 0) {
        console.log('🧹 Starting automatic cleanup of unreferenced stale entries...');
        this.cleanupStaleEntries(dealerId, 0) // 0 hours = immediate cleanup of stale entries
          .then(() => console.log('✅ Automatic stale cleanup completed'))
          .catch(error => console.error('❌ Automatic stale cleanup failed:', error));
      }
      
    } catch (error) {
      this.logError('Error updating cache', error);
      throw error;
    }
  }
  
  /**
   * Log error with clean message and detailed debugging info
   */
  private static logError(context: string, error: unknown): string {
    const cleanMessage = this.extractErrorMessage(error);
    console.error(`❌ ${context}:`, cleanMessage);
    
    // Always log debugging details (but truncate massive SQL queries)
    if (error instanceof Error) {
      console.error('🔍 Debug details:', {
        name: error.name,
        message: error.message.length > 500 ? error.message.substring(0, 500) + '... (truncated)' : error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack trace
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('🔍 Debug details:', { 
        error: error, 
        type: typeof error,
        timestamp: new Date().toISOString()
      });
    }
    
    return cleanMessage;
  }

  /**
   * Extract meaningful error message from database errors
   */
  private static extractErrorMessage(error: unknown): string {
    if (!error) return 'Unknown error';
    
    if (error instanceof Error) {
      const message = error.message;
      
      // Handle database constraint violations
      if (message.includes('duplicate key value violates unique constraint') || 
          message.includes('duplicate key')) {
        return 'Duplicate stock ID detected in feed data';
      }
      
      if (message.includes('violates foreign key constraint')) {
        return 'Foreign key constraint violation - referenced record not found';
      }
      
      if (message.includes('violates not-null constraint')) {
        return 'Not-null constraint violation - required field is missing';
      }
      
      if (message.includes('violates check constraint')) {
        return 'Check constraint violation - invalid data format';
      }
      
      // Handle connection errors
      if (message.includes('connection') || message.includes('timeout')) {
        return 'Database connection error';
      }
      
      // Handle permission errors
      if (message.includes('permission denied') || message.includes('access denied')) {
        return 'Database permission denied';
      }
      
      // For SQL query errors, extract just the constraint/error type without the full query
      if (message.includes('Failed query:')) {
        const parts = message.split('Failed query:');
        if (parts.length > 1) {
          // Look for constraint violations or specific error types in the query part
          const queryPart = parts[1];
          if (queryPart.includes('duplicate key')) {
            return 'Duplicate stock ID detected in feed data';
          }
          if (queryPart.includes('foreign key')) {
            return 'Database insert failed: Foreign key constraint violation';
          }
          if (queryPart.includes('not-null')) {
            return 'Database insert failed: Required field missing';
          }
          if (queryPart.includes('check constraint')) {
            return 'Database insert failed: Data validation error';
          }
          // Generic database query failure
          return 'Database query execution failed';
        }
      }
      
      // Return the original message if it's not too long
      if (message.length <= 200) {
        return message;
      }
      
      // Truncate very long messages
      return message.substring(0, 200) + '... (truncated)';
    }
    
    // Handle non-Error objects
    if (typeof error === 'string') {
      return error.length <= 200 ? error : error.substring(0, 200) + '... (truncated)';
    }
    
    return 'Unknown error type';
  }

  /**
   * Clean up stale stock cache entries that are no longer referenced
   * This method safely removes stale entries that don't have foreign key references
   * Also provides immediate cleanup for recently stale entries that aren't referenced
   */
  public static async cleanupStaleEntries(dealerId: string, maxAgeHours: number = 24): Promise<void> {
    console.log(`🧹 Starting cleanup of stale stock cache entries older than ${maxAgeHours} hours...`);
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);
      
      // First, find stale entries that are old enough to be cleaned up
      const staleEntries = await db
        .select({ stockId: stockCache.stockId })
        .from(stockCache)
        .where(and(
          eq(stockCache.dealerId, dealerId),
          eq(stockCache.isStale, true),
          lte(stockCache.updatedAt, cutoffDate)
        ));
      
      if (staleEntries.length === 0) {
        console.log('✨ No stale entries found to clean up');
        return;
      }
      
      console.log(`🗑️ Found ${staleEntries.length} stale entries to potentially clean up`);
      
      // Check which ones are safe to delete (not referenced by vehicle_job_cards)
      const stockIds = staleEntries.map(entry => entry.stockId);
      
      // Find stock IDs that are still referenced by vehicle job cards
      const referencedStockIds = await db
        .selectDistinct({ stockId: sql`${stockCache.stockId}` })
        .from(stockCache)
        .innerJoin(sql`vehicle_job_cards`, sql`vehicle_job_cards.stock_id = stock_cache.stock_id`)
        .where(and(
          eq(stockCache.dealerId, dealerId),
          inArray(stockCache.stockId, stockIds)
        ));
      
      const referencedIds = new Set(referencedStockIds.map(row => row.stockId as string));
      const safeToDeleteIds = stockIds.filter(id => !referencedIds.has(id));
      
      console.log(`🔒 ${referencedIds.size} entries are still referenced and will be kept`);
      console.log(`✅ ${safeToDeleteIds.length} entries are safe to delete`);
      
      if (safeToDeleteIds.length > 0) {
        // Delete entries that are safe to remove
        await db
          .delete(stockCache)
          .where(and(
            eq(stockCache.dealerId, dealerId),
            inArray(stockCache.stockId, safeToDeleteIds)
          ));
        
        console.log(`🗑️ Successfully cleaned up ${safeToDeleteIds.length} stale stock cache entries`);
      }
      
      // Log summary
      console.log(`✅ Cleanup completed: ${safeToDeleteIds.length} deleted, ${referencedIds.size} preserved (still referenced)`);
      
    } catch (error) {
      console.error('❌ Error during stale entry cleanup:', error);
      throw error;
    }
  }

  /**
   * Sync log management methods
   */
  private static async startSyncLog(dealerId: string, advertiserId: string, syncType: string): Promise<number> {
    try {
      const result = await db
        .insert(stockCacheSyncLog)
        .values({
          dealerId,
          advertiserId,
          syncType,
          status: 'in_progress',
          recordsProcessed: 0,
          recordsUpdated: 0,
          recordsCreated: 0,
          recordsDeleted: 0,
          autoTraderApiCalls: 0,
        })
        .returning({ id: stockCacheSyncLog.id });
      
      return result[0].id;
    } catch (error) {
      this.logError('Error starting sync log', error);
      throw error;
    }
  }
  
  private static async completeSyncLog(
    syncLogId: number,
    recordsProcessed: number,
    recordsCreated: number,
    recordsUpdated: number,
    recordsDeleted: number
  ): Promise<void> {
    try {
      await db
        .update(stockCacheSyncLog)
        .set({
          status: 'completed',
          endTime: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsDeleted,
        })
        .where(eq(stockCacheSyncLog.id, syncLogId));
    } catch (error) {
      this.logError('Error completing sync log', error);
    }
  }
  
  private static async failSyncLog(syncLogId: number, errorMessage: string): Promise<void> {
    try {
      await db
        .update(stockCacheSyncLog)
        .set({
          status: 'failed',
          endTime: new Date(),
          errorMessage,
        })
        .where(eq(stockCacheSyncLog.id, syncLogId));
    } catch (error) {
      this.logError('Error failing sync log', error);
    }
  }
  
  /**
   * Update specific stock cache entry
   */
  static async updateStockCache(stockId: string, updates: Partial<StockCache>): Promise<void> {
    try {
      await db
        .update(stockCache)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(stockCache.stockId, stockId));
      
      console.log(`✅ Updated stock cache for stockId: ${stockId}`);
    } catch (error) {
      this.logError('Error updating stock cache', error);
      throw error;
    }
  }

  /**
   * Clear stale cache entries (cleanup utility)
   */
  static async clearStaleCache(maxAgeHours: number = CACHE_CONFIG.MAX_CACHE_AGE_HOURS): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      
      const result = await db
        .delete(stockCache)
        .where(lte(stockCache.lastFetchedFromAutoTrader, cutoffDate))
        .returning({ stockId: stockCache.stockId });
      
      console.log(`🗑️ Cleared ${result.length} stale cache entries older than ${maxAgeHours} hours`);
      return result.length;
    } catch (error) {
      this.logError('Error clearing stale cache', error);
      throw error;
    }
  }
  
  /**
   * Get cache statistics
   */
  static async getCacheStats(dealerId?: string): Promise<any> {
    try {
      const conditions = dealerId ? [eq(stockCache.dealerId, dealerId)] : [];
      
      const stats = await db
        .select({
          totalEntries: sql<number>`count(*)`,
          staleEntries: sql<number>`count(*) filter (where is_stale = true)`,
          avgAge: sql<number>`avg(extract(epoch from (now() - last_fetched_from_autotrader)) / 3600)`,
          oldestEntry: sql<Date>`min(last_fetched_from_autotrader)`,
          newestEntry: sql<Date>`max(last_fetched_from_autotrader)`,
        })
        .from(stockCache)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      return stats[0];
    } catch (error) {
      this.logError('Error getting cache stats', error);
      throw error;
    }
  }

  /**
   * Optimized cache update with bulk operations
   */
  private static async updateCacheOptimized(dealerId: string, advertiserId: string, stockData: any[]): Promise<void> {
    console.log(`💾 Optimized cache update with ${stockData.length} stock items...`);
    
    try {
      if (stockData.length === 0) {
        console.log('📦 No stock data to cache');
        await db
          .update(stockCache)
          .set({ isStale: true, updatedAt: new Date() })
          .where(and(
            eq(stockCache.dealerId, dealerId),
            eq(stockCache.advertiserId, advertiserId)
          ));
        return;
      }

      // Get existing stock IDs
      const existingStockIds = await db
        .select({ stockId: stockCache.stockId })
        .from(stockCache)
        .where(and(
          eq(stockCache.dealerId, dealerId),
          eq(stockCache.advertiserId, advertiserId)
        ));
      
      const existingIds = new Set(existingStockIds.map(row => row.stockId));
      const newStockIds = new Set(stockData.map(item => item.metadata?.stockId || '').filter(Boolean));
      
      console.log(`📊 Existing: ${existingIds.size}, New: ${newStockIds.size} stock items`);
      
      // Mark stale entries in bulk
      const staleIds = Array.from(existingIds).filter(id => !newStockIds.has(id));
      if (staleIds.length > 0) {
        console.log(`🗑️ Marking ${staleIds.length} items as stale`);
        await db
          .update(stockCache)
          .set({ isStale: true, updatedAt: new Date() })
          .where(and(
            eq(stockCache.dealerId, dealerId),
            eq(stockCache.advertiserId, advertiserId),
            inArray(stockCache.stockId, staleIds)
          ));
      }
      
      // Prepare cache entries
      const cacheEntries = stockData.map(item => this.prepareCacheEntry(item, dealerId, advertiserId));
      
      // Separate into updates and inserts
      const toUpdate = cacheEntries.filter(entry => existingIds.has(entry.stockId));
      const toInsert = cacheEntries.filter(entry => !existingIds.has(entry.stockId));
      
      console.log(`🔄 Bulk operations: ${toUpdate.length} updates, ${toInsert.length} inserts`);
      
      // Bulk insert new entries
      if (toInsert.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          
          try {
            await db.insert(stockCache).values(batch);
            console.log(`💾 Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toInsert.length / batchSize)}`);
          } catch (batchError) {
            console.error('❌ Batch insert failed, trying individual inserts:', batchError);
            // Fallback to individual inserts
            for (const entry of batch) {
              try {
                await db.insert(stockCache).values([entry]);
              } catch (individualError) {
                console.error(`❌ Failed to insert ${entry.stockId}:`, individualError);
              }
            }
          }
        }
      }

      // Bulk update existing entries
      if (toUpdate.length > 0) {
        const batchSize = 25;
        for (let i = 0; i < toUpdate.length; i += batchSize) {
          const batch = toUpdate.slice(i, i + batchSize);
          
          for (const entry of batch) {
            try {
              await db
                .update(stockCache)
                .set({
                  make: entry.make,
                  model: entry.model,
                  derivative: entry.derivative,
                  registration: entry.registration,
                  vin: entry.vin,
                  yearOfManufacture: entry.yearOfManufacture,
                  odometerReadingMiles: entry.odometerReadingMiles,
                  fuelType: entry.fuelType,
                  bodyType: entry.bodyType,
                  forecourtPriceGBP: entry.forecourtPriceGBP,
                  totalPriceGBP: entry.totalPriceGBP,
                  lifecycleState: entry.lifecycleState,
                  ownershipCondition: entry.ownershipCondition,
                  lastFetchedFromAutoTrader: entry.lastFetchedFromAutoTrader,
                  isStale: entry.isStale,
                  autoTraderVersionNumber: entry.autoTraderVersionNumber,
                  vehicleData: entry.vehicleData,
                  advertiserData: entry.advertiserData,
                  advertsData: entry.advertsData,
                  metadataRaw: entry.metadataRaw,
                  featuresData: entry.featuresData,
                  mediaData: entry.mediaData,
                  historyData: entry.historyData,
                  checkData: entry.checkData,
                  highlightsData: entry.highlightsData,
                  valuationsData: entry.valuationsData,
                  responseMetricsData: entry.responseMetricsData,
                  updatedAt: entry.updatedAt
                })
                .where(and(
                  eq(stockCache.stockId, entry.stockId),
                  eq(stockCache.dealerId, dealerId),
                  eq(stockCache.advertiserId, advertiserId)
                ));
            } catch (updateError) {
              console.error(`❌ Failed to update ${entry.stockId}:`, updateError);
            }
          }
          
          console.log(`💾 Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toUpdate.length / batchSize)}`);
        }
      }
      
      console.log(`✅ Optimized cache update completed: ${toUpdate.length} updated, ${toInsert.length} inserted, ${staleIds.length} marked stale`);
      
    } catch (error) {
      const errorMessage = this.logError('Error in optimized cache update', error);
      throw new Error(`Optimized cache update failed: ${errorMessage}`);
    }
  }

  /**
   * Helper method to extract user email
   */
  private static async getUserEmail(clerkUserId: string): Promise<string> {
    // Check if user is a team member first
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, clerkUserId))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      // User is team member - get store owner's email
      const storeOwnerResult = await db
        .select({ email: dealers.email })
        .from(dealers)
        .where(eq(dealers.id, teamMemberResult[0].storeOwnerId))
        .limit(1);
      
      if (storeOwnerResult.length === 0) {
        throw new Error('Store owner not found for team member');
      }
      
      return storeOwnerResult[0].email;
    } else {
      // User is store owner - get their own email from store config
      const dealerResult = await db
        .select({ email: storeConfig.email })
        .from(storeConfig)
        .where(eq(storeConfig.clerkUserId, clerkUserId))
        .limit(1);
      
      if (dealerResult.length === 0) {
        throw new Error('Store configuration not found');
      }
      
      return dealerResult[0].email;
    }
  }

  /**
   * Helper method to prepare cache entry
   */
  private static prepareCacheEntry(item: any, dealerId: string, advertiserId: string): any {
    const vehicle = item.vehicle || {};
    const metadata = item.metadata || {};
    const adverts = item.adverts || {};
    
    // Extract pricing information
    let forecourtPriceGBP: string | null = null;
    let totalPriceGBP: string | null = null;
    
    if (adverts.forecourtPrice?.amountGBP) {
      forecourtPriceGBP = adverts.forecourtPrice.amountGBP.toString();
    }
    if (adverts.retailAdverts?.totalPrice?.amountGBP) {
      totalPriceGBP = adverts.retailAdverts.totalPrice.amountGBP.toString();
    }
    
    return {
      stockId: metadata.stockId || '',
      dealerId,
      advertiserId,
      
      // Core searchable fields
      make: vehicle.make || '',
      model: vehicle.model || '',
      derivative: vehicle.derivative,
      registration: vehicle.registration,
      vin: vehicle.vin,
      yearOfManufacture: vehicle.yearOfManufacture,
      odometerReadingMiles: vehicle.odometerReadingMiles,
      fuelType: vehicle.fuelType,
      bodyType: vehicle.bodyType,
      forecourtPriceGBP,
      totalPriceGBP,
      lifecycleState: metadata.lifecycleState,
      ownershipCondition: vehicle.ownershipCondition,
      
      // Cache management
      lastFetchedFromAutoTrader: new Date(),
      isStale: false,
      autoTraderVersionNumber: metadata.versionNumber,
      
      // JSON fields with complete data
      vehicleData: item.vehicle,
      advertiserData: item.advertiser,
      advertsData: item.adverts,
      metadataRaw: item.metadata,
      featuresData: item.features,
      mediaData: item.media,
      historyData: item.history,
      checkData: item.check,
      highlightsData: item.highlights,
      valuationsData: item.valuations,
      responseMetricsData: item.responseMetrics,
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}