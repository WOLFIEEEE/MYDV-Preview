/**
 * Cache Security Validator
 * 
 * Validates React Query cache keys to ensure proper user isolation
 * and prevent cross-user data leakage
 */

import { QueryClient } from '@tanstack/react-query';

export interface CacheSecurityReport {
  totalQueries: number;
  userSpecificQueries: number;
  genericQueries: number;
  potentialLeakageRisks: string[];
  recommendations: string[];
  isSecure: boolean;
}

/**
 * Validate cache security for a specific user
 */
export function validateCacheSecurity(
  queryClient: QueryClient, 
  currentUserId: string
): CacheSecurityReport {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  const report: CacheSecurityReport = {
    totalQueries: queries.length,
    userSpecificQueries: 0,
    genericQueries: 0,
    potentialLeakageRisks: [],
    recommendations: [],
    isSecure: true,
  };

  queries.forEach((query, index) => {
    const keyString = JSON.stringify(query.queryKey);
    const hasUserIdentification = 
      keyString.includes(`user_${currentUserId}`) ||
      keyString.includes(`email_`) ||
      keyString.includes(`dealer_`) ||
      keyString.includes(currentUserId);

    if (hasUserIdentification) {
      report.userSpecificQueries++;
      
      // Check if query contains other user IDs (potential leakage)
      const userIdMatches = keyString.match(/user_([a-zA-Z0-9_-]+)/g);
      if (userIdMatches && userIdMatches.length > 1) {
        report.potentialLeakageRisks.push(
          `Query ${index} contains multiple user IDs: ${keyString}`
        );
        report.isSecure = false;
      }
      
      // Check if current user ID is not the one in the cache key
      if (userIdMatches) {
        const extractedUserId = userIdMatches[0].replace('user_', '');
        if (extractedUserId !== currentUserId) {
          report.potentialLeakageRisks.push(
            `Query ${index} belongs to different user (${extractedUserId}): ${keyString}`
          );
          report.isSecure = false;
        }
      }
    } else {
      report.genericQueries++;
      
      // Check if this is a data query that should have user identification
      const isDataQuery = 
        keyString.includes('stock') ||
        keyString.includes('inventory') ||
        keyString.includes('dashboard') ||
        keyString.includes('kanban') ||
        keyString.includes('analytics');
      
      if (isDataQuery) {
        report.potentialLeakageRisks.push(
          `Data query ${index} lacks user identification: ${keyString}`
        );
        report.isSecure = false;
      }
    }
  });

  // Generate recommendations
  if (report.genericQueries > report.userSpecificQueries) {
    report.recommendations.push(
      'Too many generic queries detected. Consider adding user identification to data queries.'
    );
  }

  if (report.potentialLeakageRisks.length > 0) {
    report.recommendations.push(
      'Clear all cache and ensure all data queries include proper user identification.'
    );
  }

  if (report.totalQueries > 100) {
    report.recommendations.push(
      'Large number of cached queries detected. Consider implementing cache cleanup strategies.'
    );
  }

  return report;
}

/**
 * Clean up potentially insecure cache entries
 */
export function cleanupInsecureCache(
  queryClient: QueryClient, 
  currentUserId: string
): void {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  let removedCount = 0;

  queries.forEach((query) => {
    const keyString = JSON.stringify(query.queryKey);
    
    // Remove queries that belong to other users
    const userIdMatches = keyString.match(/user_([a-zA-Z0-9_-]+)/g);
    if (userIdMatches) {
      const extractedUserId = userIdMatches[0].replace('user_', '');
      if (extractedUserId !== currentUserId) {
        queryClient.removeQueries({ queryKey: query.queryKey });
        removedCount++;
        console.log(`🗑️ Removed cache entry for different user: ${keyString}`);
      }
    }
    
    // Remove generic data queries that should have user identification
    const isDataQuery = 
      keyString.includes('stock') ||
      keyString.includes('inventory') ||
      keyString.includes('dashboard') ||
      keyString.includes('kanban') ||
      keyString.includes('analytics');
    
    const hasUserIdentification = 
      keyString.includes(`user_${currentUserId}`) ||
      keyString.includes(`email_`) ||
      keyString.includes(`dealer_`) ||
      keyString.includes(currentUserId);
    
    if (isDataQuery && !hasUserIdentification) {
      queryClient.removeQueries({ queryKey: query.queryKey });
      removedCount++;
      console.log(`🗑️ Removed insecure data query: ${keyString}`);
    }
  });

  console.log(`✅ Cache cleanup complete. Removed ${removedCount} potentially insecure entries.`);
}

/**
 * Monitor cache security in real-time
 */
export function startCacheSecurityMonitoring(
  queryClient: QueryClient,
  currentUserId: string,
  intervalMs: number = 30000 // 30 seconds
): () => void {
  console.log('🔒 Starting cache security monitoring...');
  
  const intervalId = setInterval(() => {
    const report = validateCacheSecurity(queryClient, currentUserId);
    
    if (!report.isSecure) {
      console.warn('⚠️ Cache security issues detected:', report);
      
      // Automatically clean up insecure entries
      cleanupInsecureCache(queryClient, currentUserId);
    } else {
      console.log('✅ Cache security validation passed');
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('🔒 Cache security monitoring stopped');
  };
}
