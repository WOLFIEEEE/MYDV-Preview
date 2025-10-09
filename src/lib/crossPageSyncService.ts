// Cross-Page Synchronization Service
// Ensures data consistency between stock and listing pages

import { QueryClient } from '@tanstack/react-query';
import { stockQueryKeys } from '@/hooks/useStockDataQuery';

interface SyncEvent {
  type: 'stock_refresh' | 'cache_invalidation' | 'data_update';
  timestamp: number;
  userId?: string;
  source?: string;
  metadata?: any;
}

class CrossPageSyncService {
  private static instance: CrossPageSyncService;
  private queryClient: QueryClient | null = null;
  private syncListeners: Map<string, (event: SyncEvent) => void> = new Map();
  private lastSyncTime: number = 0;
  private syncDebounceTime: number = 1000; // 1 second debounce

  static getInstance(): CrossPageSyncService {
    if (!CrossPageSyncService.instance) {
      CrossPageSyncService.instance = new CrossPageSyncService();
    }
    return CrossPageSyncService.instance;
  }

  /**
   * Initialize the service with QueryClient
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;
    console.log('🔄 CrossPageSyncService initialized');
  }

  /**
   * Register a listener for sync events
   */
  addSyncListener(id: string, callback: (event: SyncEvent) => void): void {
    this.syncListeners.set(id, callback);
    console.log(`📡 Sync listener registered: ${id}`);
  }

  /**
   * Remove a sync listener
   */
  removeSyncListener(id: string): void {
    this.syncListeners.delete(id);
    console.log(`📡 Sync listener removed: ${id}`);
  }

  /**
   * Trigger stock refresh across all pages
   */
  async triggerStockRefresh(userId: string, source: string = 'unknown'): Promise<void> {
    const now = Date.now();
    
    // Debounce rapid refresh calls
    if (now - this.lastSyncTime < this.syncDebounceTime) {
      console.log('🚫 Stock refresh debounced - too frequent');
      return;
    }

    this.lastSyncTime = now;
    
    console.log('🚀 Triggering cross-page stock refresh:', { userId, source });

    const syncEvent: SyncEvent = {
      type: 'stock_refresh',
      timestamp: now,
      userId,
      source,
      metadata: { reason: 'stock_data_updated' }
    };

    // Invalidate all stock-related caches
    await this.invalidateStockCaches(userId);

    // Notify all listeners
    this.notifyListeners(syncEvent);
  }

  /**
   * Invalidate all stock-related caches for a user
   */
  async invalidateStockCaches(userId: string): Promise<void> {
    if (!this.queryClient) {
      console.error('❌ QueryClient not initialized');
      return;
    }

    console.log('🗑️ Invalidating all stock caches for user:', userId);

    try {
      // Invalidate all stock queries for this user
      await this.queryClient.invalidateQueries({ 
        queryKey: stockQueryKeys.all,
        exact: false // This will invalidate all queries that start with ['stock']
      });

      // Force refetch of active queries
      await this.queryClient.refetchQueries({
        queryKey: stockQueryKeys.all,
        type: 'active'
      });

      console.log('✅ Stock caches invalidated successfully');
    } catch (error) {
      console.error('❌ Error invalidating stock caches:', error);
    }
  }

  /**
   * Trigger cache invalidation event
   */
  async triggerCacheInvalidation(userId: string, source: string = 'unknown'): Promise<void> {
    console.log('🗑️ Triggering cross-page cache invalidation:', { userId, source });

    const syncEvent: SyncEvent = {
      type: 'cache_invalidation',
      timestamp: Date.now(),
      userId,
      source,
      metadata: { reason: 'manual_invalidation' }
    };

    await this.invalidateStockCaches(userId);
    this.notifyListeners(syncEvent);
  }

  /**
   * Trigger data update event (for real-time updates)
   */
  triggerDataUpdate(userId: string, updateType: string, data?: any): void {
    console.log('📊 Triggering cross-page data update:', { userId, updateType });

    const syncEvent: SyncEvent = {
      type: 'data_update',
      timestamp: Date.now(),
      userId,
      source: 'data_update',
      metadata: { updateType, data }
    };

    this.notifyListeners(syncEvent);
  }

  /**
   * Notify all registered listeners
   */
  private notifyListeners(event: SyncEvent): void {
    console.log(`📢 Notifying ${this.syncListeners.size} sync listeners:`, event.type);
    
    this.syncListeners.forEach((callback, id) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`❌ Error in sync listener ${id}:`, error);
      }
    });
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    listenerCount: number;
    lastSyncTime: number;
    isInitialized: boolean;
  } {
    return {
      listenerCount: this.syncListeners.size,
      lastSyncTime: this.lastSyncTime,
      isInitialized: !!this.queryClient
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.syncListeners.clear();
    this.queryClient = null;
    console.log('🧹 CrossPageSyncService cleaned up');
  }
}

// Export singleton instance
export const crossPageSyncService = CrossPageSyncService.getInstance();

// Export types
export type { SyncEvent };
