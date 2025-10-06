// Optimized Retail Check Service
// Implements parallel processing, caching, and consolidated API calls

import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { getAdvertiserId } from '@/lib/advertiserIdResolver';
import { db } from '@/lib/db';
import { storeConfig, stockCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { VehicleInfo, RetailCheckData, Valuations } from '@/types/retail-check';
import { EnhancedErrorHandler } from '@/lib/enhancedErrorHandler';
import { PerformanceMonitor } from '@/lib/services/performanceMonitor';
import { TrendedValuationsService } from '@/lib/services/trendedValuationsService';
import { globalCache, vehicleCache, valuationCache, authCache } from '@/lib/services/enhancedCacheService';
import { AUTOTRADER_CONFIG } from '@/lib/autoTraderConfig';

// Circuit Breaker Implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 30000,
    private resetTimeout = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
        )
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
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
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Using enhanced cache service - no need for local implementation

// Request Deduplication
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async deduplicate<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return this.pendingRequests.get(key) as Promise<T>;
    }
    
    const promise = operation().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
}

export class OptimizedRetailCheckService {
  private static circuitBreaker = new CircuitBreaker();
  private static deduplicator = new RequestDeduplicator();
  private static readonly BASE_URL = AUTOTRADER_CONFIG.BASE_URL;

  /**
   * Main retail check method with optimizations
   */
  static async performOptimizedRetailCheck(
    vehicleInfo: VehicleInfo,
    email: string,
    includeVehicleCheck = false,
    includeTrendedValuations = false
  ): Promise<RetailCheckData> {
    console.log('🚀 Starting optimized retail check for:', vehicleInfo.registration);
    
    const startTime = Date.now();
    const operationId = `retail-check-${vehicleInfo.registration || vehicleInfo.derivativeId}`;
    
    try {
      // Get authentication and config in parallel
      const [authResult, storeConfigResult] = await Promise.allSettled([
        this.getAuthToken(email),
        this.getStoreConfig(email)
      ]);

      if (authResult.status === 'rejected' || !authResult.value.success) {
        throw new Error('Authentication failed');
      }

      if (storeConfigResult.status === 'rejected') {
        throw new Error('Store configuration not found');
      }

      const token = authResult.value.access_token!;
      const advertiserId = getAdvertiserId(storeConfigResult.value);

      if (!advertiserId) {
        throw new Error('Advertiser ID not found in store configuration');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(vehicleInfo, includeVehicleCheck, includeTrendedValuations);
      const cachedData = globalCache.get<RetailCheckData>(cacheKey);
      
      if (cachedData) {
        console.log('✅ Returning cached retail check data');
        return cachedData;
      }

      // Parallel API calls for maximum efficiency
      const apiCalls = this.buildParallelApiCalls(
        vehicleInfo,
        token,
        advertiserId,
        includeVehicleCheck,
        includeTrendedValuations
      );

      console.log(`📡 Executing ${apiCalls.length} parallel API calls`);
      const results = await Promise.allSettled(apiCalls);

      // Process results and build response
      const retailCheckData = await this.processApiResults(
        results,
        vehicleInfo,
        includeVehicleCheck,
        includeTrendedValuations
      );

      // Cache the result
      globalCache.set(cacheKey, retailCheckData, 900000); // 15 minutes

      const duration = Date.now() - startTime;
      console.log(`✅ Optimized retail check completed in ${duration}ms`);

      // Record performance metric
      PerformanceMonitor.recordMetric(
        'retail-check-optimized',
        duration,
        true,
        { cacheHit: !!cachedData }
      );

      return retailCheckData;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Optimized retail check failed:', error);
      
      // Record failure metric
      PerformanceMonitor.recordMetric(
        'retail-check-optimized',
        duration,
        false,
        { errorType: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      throw error;
    }
  }

  /**
   * Build parallel API calls based on requirements
   */
  private static buildParallelApiCalls(
    vehicleInfo: VehicleInfo,
    token: string,
    advertiserId: string,
    includeVehicleCheck: boolean,
    includeTrendedValuations: boolean
  ): Array<Promise<any>> {
    const calls: Array<Promise<any>> = [];

    // 1. Main vehicle data with all features (single comprehensive call)
    if (vehicleInfo.registration) {
      const vehicleParams = new URLSearchParams({
        'advertiserId': advertiserId,
        'registration': vehicleInfo.registration,
        'odometerReadingMiles': vehicleInfo.mileage.toString(),
        'features': 'true',
        'vehicleMetrics': 'true',
        'valuations': 'true',
        'history': 'true',
        'competitors': 'true'
      });

      if (includeVehicleCheck) {
        vehicleParams.append('check', 'true');
        vehicleParams.append('fullVehicleCheck', 'true');
      }

      calls.push(
        this.deduplicator.deduplicate(
          `vehicle-${vehicleInfo.registration}-${vehicleInfo.mileage}`,
          () => EnhancedErrorHandler.executeWithRetry(
            async () => {
              const response = await fetch(`${this.BASE_URL}/vehicles?${vehicleParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (!response.ok) {
                const error = await EnhancedErrorHandler.parseAutoTraderError(response, 'vehicles');
                throw new Error(`Vehicle API Error: ${error.message}`);
              }
              
              return response.json();
            },
            { maxRetries: 2, baseDelay: 1000 },
            `vehicle-lookup-${vehicleInfo.registration}`
          )
        )
      );
    }

    // 2. Trended valuations (if requested and we have derivativeId)
    if (includeTrendedValuations && vehicleInfo.derivativeId && vehicleInfo.firstRegistrationDate) {
      const trendedParams = new URLSearchParams({
        'derivativeId': vehicleInfo.derivativeId,
        'firstRegistrationDate': vehicleInfo.firstRegistrationDate,
        'odometerReadingMiles': vehicleInfo.mileage.toString()
      });

      calls.push(
        this.deduplicator.deduplicate(
          `trended-${vehicleInfo.derivativeId}-${vehicleInfo.mileage}`,
          () => EnhancedErrorHandler.executeWithRetry(
            async () => {
              const response = await fetch(`${this.BASE_URL}/valuations/trended?${trendedParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (!response.ok) {
                // Trended valuations are optional, so we return null instead of throwing
                console.log(`ℹ️ Trended valuations not available: ${response.status}`);
                return null;
              }
              
              return response.json();
            },
            { maxRetries: 1, baseDelay: 500 }, // Fewer retries for optional data
            `trended-valuations-${vehicleInfo.derivativeId}`
          ).catch(() => null) // Graceful failure - return null if all retries fail
        )
      );
    }

    // 3. Location-adjusted metrics (if we have derivativeId)
    if (vehicleInfo.derivativeId && vehicleInfo.firstRegistrationDate) {
      const metricsPayload = {
        vehicle: {
          derivativeId: vehicleInfo.derivativeId,
          firstRegistrationDate: vehicleInfo.firstRegistrationDate,
          odometerReadingMiles: vehicleInfo.mileage
        }
      };

      calls.push(
        this.deduplicator.deduplicate(
          `metrics-${vehicleInfo.derivativeId}-${advertiserId}`,
          () => EnhancedErrorHandler.executeWithRetry(
            async () => {
              const response = await fetch(`${this.BASE_URL}/vehicle-metrics?advertiserId=${advertiserId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(metricsPayload)
              });
              
              if (!response.ok) {
                // Vehicle metrics are optional, log and return null
                console.log(`ℹ️ Vehicle metrics not available: ${response.status}`);
                return null;
              }
              
              return response.json();
            },
            { maxRetries: 1, baseDelay: 500 }, // Fewer retries for optional data
            `vehicle-metrics-${vehicleInfo.derivativeId}`
          ).catch(() => null) // Graceful failure - return null if all retries fail
        )
      );
    }

    return calls;
  }

  /**
   * Process API results and build comprehensive response
   */
  private static async processApiResults(
    results: PromiseSettledResult<any>[],
    vehicleInfo: VehicleInfo,
    includeVehicleCheck: boolean,
    includeTrendedValuations: boolean
  ): Promise<RetailCheckData> {
    // Map results by type instead of assuming fixed order
    let vehicleResult: PromiseSettledResult<any> | undefined;
    let trendedResult: PromiseSettledResult<any> | undefined;
    let metricsResult: PromiseSettledResult<any> | undefined;
    
    // Assign results based on what was actually requested
    let resultIndex = 0;
    
    // First result is always vehicle data if registration exists
    if (vehicleInfo.registration) {
      vehicleResult = results[resultIndex++];
    }
    
    // Second result is trended valuations if requested and derivativeId exists
    if (includeTrendedValuations && vehicleInfo.derivativeId && vehicleInfo.firstRegistrationDate) {
      trendedResult = results[resultIndex++];
    }
    
    // Third result is metrics if derivativeId exists
    if (vehicleInfo.derivativeId && vehicleInfo.firstRegistrationDate) {
      metricsResult = results[resultIndex++];
    }

    // Process main vehicle data
    let processedVehicleInfo = vehicleInfo;
    let valuations: Valuations | null = null;
    let vehicleCheck = undefined;
    let competitorsUrl = undefined;

    if (vehicleResult?.status === 'fulfilled' && vehicleResult.value) {
      const vehicleData = vehicleResult.value;
      
      // Extract enhanced vehicle info
      if (vehicleData.vehicle) {
        processedVehicleInfo = {
          ...vehicleInfo,
          ...vehicleData.vehicle,
          apiResponse: vehicleData
        };
      }

      // Extract valuations
      if (vehicleData.valuations) {
        valuations = {
          retailValue: vehicleData.valuations.retail?.amountGBP || 0,
          partExValue: vehicleData.valuations.partExchange?.amountGBP || 0,
          tradeValue: vehicleData.valuations.trade?.amountGBP || 0,
          forecourtPrice: vehicleData.valuations.private?.amountGBP
        };
      }

      // Extract vehicle check data
      if (includeVehicleCheck && vehicleData.history) {
        const history = vehicleData.history;
        vehicleCheck = {
          status: (!history.stolen && !history.scrapped && !history.exported) ? 'passed' as const : 'warning' as const,
          stolen: history.stolen || false,
          scrapped: history.scrapped || false,
          writeOff: history.scrapped ? 'Vehicle has been scrapped' : 'No write-off recorded',
          finance: 'No finance information available',
          highRisk: history.stolen || history.scrapped || history.exported || false,
          imported: history.imported || false,
          exported: history.exported || false,
          previousOwners: history.previousOwners || 0,
          keeperChanges: history.keeperChanges || [],
          yearOfManufacture: history.yearOfManufacture
        };
      }

      // Extract competitors URL
      competitorsUrl = vehicleData.links?.competitors?.href;
    }

    // Process trended valuations
    let trendedValuations = undefined;
    if (includeTrendedValuations && trendedResult?.status === 'fulfilled' && trendedResult.value) {
      trendedValuations = trendedResult.value;
    }

    // Process location-adjusted metrics
    let adjustedMetrics = undefined;
    if (metricsResult?.status === 'fulfilled' && metricsResult.value) {
      adjustedMetrics = metricsResult.value;
    }

    // Fetch competition data if we have the URL
    let competitionData = undefined;
    if (competitorsUrl) {
      try {
        const competitionResult = await this.circuitBreaker.execute(() =>
          fetch(competitorsUrl, {
            headers: { 'Authorization': `Bearer ${processedVehicleInfo.apiResponse?.token}` }
          }).then(res => res.ok ? res.json() : null)
        );
        competitionData = competitionResult;
      } catch (error) {
        console.log('Competition data fetch failed, continuing without it');
      }
    }

    // Get enhanced trended valuations if requested
    let enhancedTrendedValuations = undefined;
    if (includeTrendedValuations && processedVehicleInfo.derivativeId && processedVehicleInfo.firstRegistrationDate) {
      try {
        enhancedTrendedValuations = await TrendedValuationsService.getTrendedValuations(
          processedVehicleInfo.derivativeId,
          processedVehicleInfo.firstRegistrationDate,
          processedVehicleInfo.mileage,
          'system', // We'll need to pass email through
          valuations ? {
            retailValue: valuations.retailValue,
            tradeValue: valuations.tradeValue,
            partExchangeValue: valuations.partExValue
          } : undefined
        );
      } catch (error) {
        console.log('Enhanced trended valuations failed, using basic data');
      }
    }

    return {
      vehicleInfo: processedVehicleInfo,
      valuations,
      vehicleCheck,
      trendedValuations: enhancedTrendedValuations || trendedValuations,
      adjustedMetrics,
      competitionData,
      timestamp: new Date().toISOString(),
      source: 'autotrader-optimized'
    };
  }

  /**
   * Get authentication token with caching
   */
  private static async getAuthToken(email: string) {
    const cacheKey = `auth-${email}`;
    
    return await authCache.getOrSet(cacheKey, async () => {
      const result = await getAutoTraderToken(email);
      if (!result.success) {
        throw new Error('Authentication failed');
      }
      return result;
    }, 600000); // Cache for 10 minutes (tokens are valid for 15)
  }

  /**
   * Get store config with caching
   */
  private static async getStoreConfig(email: string) {
    const cacheKey = `config-${email}`;
    
    return await globalCache.getOrSet(cacheKey, async () => {
      const result = await db
        .select({
          advertisementId: storeConfig.advertisementId,
          primaryAdvertisementId: storeConfig.primaryAdvertisementId,
          storeName: storeConfig.storeName
        })
        .from(storeConfig)
        .where(eq(storeConfig.email, email))
        .limit(1);

      if (result.length === 0) {
        throw new Error(`No store configuration found for email: ${email}`);
      }

      return result[0];
    }, 3600000); // Cache for 1 hour
  }

  /**
   * Generate cache key for retail check data
   */
  private static generateCacheKey(
    vehicleInfo: VehicleInfo,
    includeVehicleCheck: boolean,
    includeTrendedValuations: boolean
  ): string {
    const key = `retail-check-${vehicleInfo.registration || vehicleInfo.derivativeId}-${vehicleInfo.mileage}-${includeVehicleCheck}-${includeTrendedValuations}`;
    return key;
  }

  /**
   * Clear all caches (useful for testing or manual refresh)
   */
  static clearCache() {
    globalCache.clear();
    vehicleCache.clear();
    valuationCache.clear();
    authCache.clear();
    TrendedValuationsService.clearCache();
    console.log('🧹 All caches cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      globalCache: globalCache.getStats(),
      vehicleCache: vehicleCache.getStats(),
      valuationCache: valuationCache.getStats(),
      authCache: authCache.getStats(),
      trendedValuationsCache: TrendedValuationsService.getCacheStats(),
      circuitBreakerState: this.circuitBreaker['state'],
      pendingRequests: this.deduplicator['pendingRequests'].size
    };
  }
}
