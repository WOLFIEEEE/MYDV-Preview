/**
 * Enhanced Cache Management Hook
 * 
 * Automatically manages React Query cache to prevent cross-user data leakage
 * with comprehensive user isolation and security measures
 */

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { clearUserCache, clearAllCache, getCacheStats } from '@/lib/cacheUtils';

export function useCacheManagement() {
  const { user, isSignedIn, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't do anything until Clerk is loaded
    if (!isLoaded) return;

    // Clear all cache when user signs out
    if (!isSignedIn) {
      console.log('🔒 User signed out - clearing all cache to prevent data leakage');
      clearAllCache(queryClient);
      previousUserIdRef.current = null;
      return;
    }

    // Handle user changes (different user signs in)
    if (user?.id) {
      const currentUserId = user.id;
      const previousUserId = previousUserIdRef.current;
      
      if (previousUserId && previousUserId !== currentUserId) {
        console.log('🔄 User changed - clearing previous user cache');
        console.log('Previous user:', previousUserId);
        console.log('Current user:', currentUserId);
        
        // Clear previous user's cache
        clearUserCache(queryClient, previousUserId);
        
        // Also clear any non-user-specific cache that might contain mixed data
        clearAllCache(queryClient);
      }
      
      previousUserIdRef.current = currentUserId;
      console.log('👤 User session active:', currentUserId);
      
      // Log cache statistics for debugging
      const stats = getCacheStats(queryClient);
      console.log('📊 Cache statistics:', {
        totalQueries: stats.totalQueries,
        userSpecificQueries: stats.userSpecificQueries,
        genericQueries: stats.genericQueries
      });
      
      // Warn if there are too many generic queries (potential security risk)
      if (stats.genericQueries > stats.userSpecificQueries) {
        console.warn('⚠️ More generic queries than user-specific queries detected - potential cache leakage risk');
      }
    }
  }, [isLoaded, isSignedIn, user?.id, queryClient]);

  // Clear cache when component unmounts (cleanup)
  useEffect(() => {
    return () => {
      if (user?.id) {
        console.log('🧹 Component unmounting - clearing user cache');
        clearUserCache(queryClient, user.id);
      }
    };
  }, [user?.id, queryClient]);

  return {
    clearUserCache: (userId: string) => clearUserCache(queryClient, userId),
    clearAllCache: () => clearAllCache(queryClient),
    getCacheStats: () => getCacheStats(queryClient),
    currentUserId: user?.id || null,
  };
}
