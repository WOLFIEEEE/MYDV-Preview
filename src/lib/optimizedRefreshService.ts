// Optimized Refresh Service - Provides instant UI feedback with background processing
import { StockCacheService } from '@/lib/stockCacheService';
import type { StockQueryOptions } from '@/lib/stockCacheService';

interface RefreshStatus {
  isRefreshing: boolean;
  progress: number;
  totalPages?: number;
  currentPage?: number;
  estimatedTimeRemaining?: number;
  lastUpdated: string;
  error?: string;
}

class OptimizedRefreshService {
  private static refreshStatus = new Map<string, RefreshStatus>();
  private static refreshPromises = new Map<string, Promise<void>>();

  /**
   * Start background refresh - returns immediately with cached data
   * UI gets instant feedback while refresh happens in background
   */
  static async startBackgroundRefresh(options: StockQueryOptions): Promise<{
    immediate: any; // Cached data returned instantly
    refreshId: string;
    isRefreshing: boolean;
  }> {
    const refreshId = `${options.dealerId}-${options.advertiserId}`;
    
    // Return cached data immediately
    const cachedData = await StockCacheService.getStockData(options);
    
    // Start background refresh if not already running
    if (!this.refreshPromises.has(refreshId)) {
      console.log('🚀 Starting background refresh for:', refreshId);
      
      this.refreshStatus.set(refreshId, {
        isRefreshing: true,
        progress: 0,
        lastUpdated: new Date().toISOString()
      });

      const refreshPromise = this.performBackgroundRefresh(options, refreshId);
      this.refreshPromises.set(refreshId, refreshPromise);
      
      // Clean up when done
      refreshPromise.finally(() => {
        this.refreshPromises.delete(refreshId);
        this.refreshStatus.delete(refreshId);
      });
    }

    return {
      immediate: cachedData,
      refreshId,
      isRefreshing: this.refreshStatus.get(refreshId)?.isRefreshing || false
    };
  }

  /**
   * Get refresh status for progress tracking
   */
  static getRefreshStatus(refreshId: string): RefreshStatus | null {
    return this.refreshStatus.get(refreshId) || null;
  }

  /**
   * Perform the actual refresh in background with progress updates
   */
  private static async performBackgroundRefresh(
    options: StockQueryOptions, 
    refreshId: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update status with progress tracking
      const updateProgress = (current: number, total: number, estimatedTime?: number) => {
        this.refreshStatus.set(refreshId, {
          isRefreshing: true,
          progress: Math.round((current / total) * 100),
          currentPage: current,
          totalPages: total,
          estimatedTimeRemaining: estimatedTime,
          lastUpdated: new Date().toISOString()
        });
      };

      // Perform the actual refresh with progress callbacks
      const refreshResult = await StockCacheService.forceRefreshStockDataWithProgress(options, updateProgress);
      
      console.log(`✅ Background refresh completed in ${Date.now() - startTime}ms`);
      
      // Verify database was properly updated
      await this.verifyDatabaseUpdate(options, refreshResult);
      
      // Trigger cross-page sync after successful database update
      const { crossPageSyncService } = await import('./crossPageSyncService');
      await crossPageSyncService.triggerStockRefresh(options.dealerId, 'background-refresh');
      
    } catch (error) {
      console.error('❌ Background refresh failed:', error);
      this.refreshStatus.set(refreshId, {
        isRefreshing: false,
        progress: 0,
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify database was properly updated with fresh data
   */
  private static async verifyDatabaseUpdate(options: StockQueryOptions, refreshResult: any): Promise<void> {
    console.log('🔍 Verifying database update...');
    
    try {
      // Wait a moment for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get fresh data from database to verify update
      const verificationResult = await StockCacheService.getStockData({
        ...options,
        page: 1,
        pageSize: 10 // Small sample to verify
      });
      
      const dbTimestamp = verificationResult.cacheStatus?.lastRefresh;
      const refreshTimestamp = refreshResult.cacheStatus?.lastRefresh;
      
      if (dbTimestamp && refreshTimestamp) {
        const dbTime = new Date(dbTimestamp).getTime();
        const refreshTime = new Date(refreshTimestamp).getTime();
        
        if (Math.abs(dbTime - refreshTime) < 60000) { // Within 1 minute
          console.log('✅ Database update verified - data is fresh');
        } else {
          console.warn('⚠️ Database update verification failed - timestamps mismatch');
        }
      } else {
        console.log('ℹ️ Database update verification skipped - missing timestamps');
      }
      
      // Log data consistency check
      const stockCount = verificationResult.results?.length || 0;
      console.log(`📊 Database verification: ${stockCount} stock items available`);
      
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      // Don't throw - this is just verification, not critical
    }
  }

  /**
   * Cancel ongoing refresh
   */
  static cancelRefresh(refreshId: string): boolean {
    const promise = this.refreshPromises.get(refreshId);
    if (promise) {
      this.refreshPromises.delete(refreshId);
      this.refreshStatus.delete(refreshId);
      return true;
    }
    return false;
  }
}

export { OptimizedRefreshService, type RefreshStatus };
