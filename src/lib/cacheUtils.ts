/**
 * Cache Utilities for User-Specific Data Isolation
 * 
 * This module provides utilities to manage React Query cache with proper user isolation
 * to prevent cross-user data leakage.
 */

import { QueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys } from '@/hooks/useDashboardAnalytics';
import { authTestQueryKeys } from '@/hooks/useAuthTest';
import { kanbanQueryKeys } from '@/hooks/useKanbanQuery';
import { stockQueryKeys } from '@/hooks/useStockDataQuery';
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery';

/**
 * Clear all cached data for a specific user
 * This should be called when a user signs out to prevent data leakage
 */
export function clearUserCache(queryClient: QueryClient, userId: string) {
  console.log('🧹 Clearing cache for user:', userId);
  
  // Clear dashboard analytics cache
  queryClient.removeQueries({ queryKey: dashboardQueryKeys.analytics(userId) });
  
  // Clear auth test cache
  queryClient.removeQueries({ queryKey: authTestQueryKeys.test(userId) });
  
  // Clear kanban cache
  queryClient.removeQueries({ queryKey: kanbanQueryKeys.boards(userId) });
  queryClient.removeQueries({ queryKey: kanbanQueryKeys.tasks(userId) });
  
  // Clear user-specific stock and inventory queries
  // These now include user identification in their cache keys
  queryClient.removeQueries({ 
    queryKey: stockQueryKeys.all,
    predicate: (query) => {
      const keyString = JSON.stringify(query.queryKey);
      return keyString.includes(`user_${userId}`);
    }
  });
  queryClient.removeQueries({ 
    queryKey: inventoryQueryKeys.all,
    predicate: (query) => {
      const keyString = JSON.stringify(query.queryKey);
      return keyString.includes(`user_${userId}`);
    }
  });
  
  console.log('✅ User cache cleared successfully');
}

/**
 * Clear all cached data (useful for complete cache reset)
 */
export function clearAllCache(queryClient: QueryClient) {
  console.log('🧹 Clearing all cache data');
  queryClient.clear();
  console.log('✅ All cache cleared successfully');
}

/**
 * Invalidate user-specific queries to force refetch
 */
export function invalidateUserQueries(queryClient: QueryClient, userId: string) {
  console.log('🔄 Invalidating queries for user:', userId);
  
  // Invalidate dashboard analytics
  queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.analytics(userId) });
  
  // Invalidate auth test
  queryClient.invalidateQueries({ queryKey: authTestQueryKeys.test(userId) });
  
  // Invalidate kanban queries
  queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.boards(userId) });
  queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.tasks(userId) });
  
  console.log('✅ User queries invalidated successfully');
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  const stats = {
    totalQueries: queries.length,
    byQueryKey: {} as Record<string, number>,
    userSpecificQueries: 0,
    genericQueries: 0,
  };
  
  queries.forEach(query => {
    const keyString = JSON.stringify(query.queryKey);
    stats.byQueryKey[keyString] = (stats.byQueryKey[keyString] || 0) + 1;
    
    // Check if query key contains user ID (indicates user-specific query)
    if (query.queryKey.some(key => typeof key === 'string' && key.startsWith('user_'))) {
      stats.userSpecificQueries++;
    } else {
      stats.genericQueries++;
    }
  });
  
  return stats;
}
