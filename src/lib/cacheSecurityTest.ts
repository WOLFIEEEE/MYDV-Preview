/**
 * Quick Cache Security Test
 * 
 * Run this in the browser console to test cache isolation
 */

import { QueryClient } from '@tanstack/react-query';

export function quickCacheSecurityTest(queryClient: QueryClient, currentUserId: string) {
  console.log('🧪 Running Quick Cache Security Test...');
  
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  console.log(`📊 Total queries in cache: ${queries.length}`);
  
  let userSpecificQueries = 0;
  let genericQueries = 0;
  let securityIssues: string[] = [];
  
  queries.forEach((query, index) => {
    const keyString = JSON.stringify(query.queryKey);
    
    // Check if query has user identification
    const hasUserIdentification = 
      keyString.includes(`user_${currentUserId}`) ||
      keyString.includes('email_') ||
      keyString.includes('dealer_');
    
    // Check if this is a data query
    const isDataQuery = 
      keyString.includes('stock') ||
      keyString.includes('inventory') ||
      keyString.includes('dashboard') ||
      keyString.includes('kanban') ||
      keyString.includes('analytics');
    
    if (hasUserIdentification) {
      userSpecificQueries++;
      
      // Check for other user IDs in the same query (security issue)
      const userIdMatches = keyString.match(/user_([a-zA-Z0-9_-]+)/g);
      if (userIdMatches && userIdMatches.length > 1) {
        securityIssues.push(`Query ${index} contains multiple user IDs: ${keyString}`);
      }
      
      // Check if the user ID matches current user
      if (userIdMatches) {
        const extractedUserId = userIdMatches[0].replace('user_', '');
        if (extractedUserId !== currentUserId) {
          securityIssues.push(`Query ${index} belongs to different user (${extractedUserId}): ${keyString}`);
        }
      }
    } else if (isDataQuery) {
      genericQueries++;
      securityIssues.push(`Data query ${index} lacks user identification: ${keyString}`);
    }
  });
  
  console.log(`✅ User-specific queries: ${userSpecificQueries}`);
  console.log(`⚠️  Generic data queries: ${genericQueries}`);
  console.log(`🚨 Security issues found: ${securityIssues.length}`);
  
  if (securityIssues.length > 0) {
    console.log('🔍 Security Issues:');
    securityIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }
  
  const isSecure = securityIssues.length === 0;
  
  console.log(`\n🎯 Overall Security Status: ${isSecure ? '✅ SECURE' : '❌ INSECURE'}`);
  
  if (!isSecure) {
    console.log('\n💡 Recommendations:');
    console.log('  1. Clear all cache and refresh the page');
    console.log('  2. Ensure all data queries include user identification');
    console.log('  3. Check that cache keys are properly generated');
  }
  
  return {
    totalQueries: queries.length,
    userSpecificQueries,
    genericQueries,
    securityIssues,
    isSecure
  };
}

// Helper function to run the test from browser console
(window as any).testCacheSecurity = function(currentUserId?: string) {
  const queryClient = (window as any).__REACT_QUERY_CLIENT__;
  if (!queryClient) {
    console.error('❌ React Query client not found. Make sure you are on a page that uses React Query.');
    return;
  }
  
  if (!currentUserId) {
    console.error('❌ Please provide current user ID: testCacheSecurity("your-user-id")');
    return;
  }
  
  return quickCacheSecurityTest(queryClient, currentUserId);
};

console.log('🔒 Cache Security Test loaded. Run testCacheSecurity("your-user-id") in console to test.');
