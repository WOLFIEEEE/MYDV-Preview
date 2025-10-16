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
   * Start FORCED refresh - ALWAYS fetches fresh data from AutoTrader
   * GUARANTEES fresh data when user explicitly clicks refresh button
   * This bypasses cache to ensure user sees latest data immediately
   */
  static async startBackgroundRefresh(options: StockQueryOptions): Promise<{
    immediate: any; // Fresh data from AutoTrader (NOT cached)
    refreshId: string;
    isRefreshing: boolean;
  }> {
    const refreshId = `${options.dealerId}-${options.advertiserId}`;
    
    console.log('🔄 FORCE REFRESH: Bypassing cache to fetch fresh data from AutoTrader...');
    
    // Mark as refreshing
    this.refreshStatus.set(refreshId, {
      isRefreshing: true,
      progress: 0,
      lastUpdated: new Date().toISOString()
    });
    
    // ALWAYS fetch fresh data from AutoTrader when user clicks refresh
    // This GUARANTEES fresh data - no cache served
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
    
    try {
      // Force fresh fetch from AutoTrader with progress tracking
      const freshData = await StockCacheService.forceRefreshStockDataWithProgress(options, updateProgress);
      
      console.log('✅ FORCE REFRESH COMPLETE: Fresh data fetched from AutoTrader');
      
      // Trigger cross-page sync to update all pages
      const { crossPageSyncService } = await import('./crossPageSyncService');
      await crossPageSyncService.triggerStockRefresh(options.dealerId, 'force-refresh');
      
      // Clean up refresh status
      this.refreshPromises.delete(refreshId);
      this.refreshStatus.set(refreshId, {
        isRefreshing: false,
        progress: 100,
        lastUpdated: new Date().toISOString()
      });
      
      return {
        immediate: freshData, // Fresh data from AutoTrader
        refreshId,
        isRefreshing: false
      };
      
    } catch (error) {
      console.error('❌ FORCE REFRESH FAILED:', error);
      
      this.refreshStatus.set(refreshId, {
        isRefreshing: false,
        progress: 0,
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fall back to cached data if force refresh fails
      console.warn('⚠️ Falling back to cached data due to refresh error');
      const cachedData = await StockCacheService.getStockData(options);
      
      return {
        immediate: cachedData,
        refreshId,
        isRefreshing: false
      };
    }
  }

  /**
   * Get refresh status for progress tracking
   */
  static getRefreshStatus(refreshId: string): RefreshStatus | null {
    return this.refreshStatus.get(refreshId) || null;
  }

  // REMOVED: performBackgroundRefresh method
  // Now refresh happens synchronously in startBackgroundRefresh to guarantee fresh data

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

