/**
 * Cache Testing Utilities
 * 
 * Utilities for testing cache isolation and preventing cross-user data leakage
 */

import { QueryClient } from '@tanstack/react-query';
import { validateCacheSecurity, cleanupInsecureCache } from './cacheSecurityValidator';

export interface CacheTestResult {
  testName: string;
  passed: boolean;
  details: string;
  recommendations?: string[];
}

export interface CacheTestSuite {
  testResults: CacheTestResult[];
  overallPassed: boolean;
  summary: string;
}

/**
 * Test cache isolation between different users
 */
export function testCacheIsolation(
  queryClient: QueryClient,
  user1Id: string,
  user2Id: string
): CacheTestSuite {
  const testResults: CacheTestResult[] = [];

  // Test 1: Verify no cross-user cache entries
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  let crossUserEntries = 0;
  queries.forEach((query) => {
    const keyString = JSON.stringify(query.queryKey);
    const user1InKey = keyString.includes(`user_${user1Id}`);
    const user2InKey = keyString.includes(`user_${user2Id}`);
    
    if (user1InKey && user2InKey) {
      crossUserEntries++;
    }
  });

  testResults.push({
    testName: 'Cross-User Cache Entry Test',
    passed: crossUserEntries === 0,
    details: `Found ${crossUserEntries} cache entries containing both user IDs`,
    recommendations: crossUserEntries > 0 ? ['Clear all cache and ensure proper user isolation'] : undefined
  });

  // Test 2: Verify user-specific cache keys
  let userSpecificQueries = 0;
  let genericDataQueries = 0;
  
  queries.forEach((query) => {
    const keyString = JSON.stringify(query.queryKey);
    const hasUserIdentification = 
      keyString.includes(`user_${user1Id}`) ||
      keyString.includes(`user_${user2Id}`) ||
      keyString.includes('email_') ||
      keyString.includes('dealer_');
    
    const isDataQuery = 
      keyString.includes('stock') ||
      keyString.includes('inventory') ||
      keyString.includes('dashboard') ||
      keyString.includes('kanban') ||
      keyString.includes('analytics');
    
    if (hasUserIdentification) {
      userSpecificQueries++;
    } else if (isDataQuery) {
      genericDataQueries++;
    }
  });

  testResults.push({
    testName: 'User-Specific Cache Keys Test',
    passed: genericDataQueries === 0,
    details: `Found ${userSpecificQueries} user-specific queries and ${genericDataQueries} generic data queries`,
    recommendations: genericDataQueries > 0 ? ['Add user identification to all data queries'] : undefined
  });

  // Test 3: Validate current user cache security
  const user1Report = validateCacheSecurity(queryClient, user1Id);
  const user2Report = validateCacheSecurity(queryClient, user2Id);

  testResults.push({
    testName: 'User 1 Cache Security Test',
    passed: user1Report.isSecure,
    details: `Security issues: ${user1Report.potentialLeakageRisks.length}`,
    recommendations: user1Report.recommendations
  });

  testResults.push({
    testName: 'User 2 Cache Security Test',
    passed: user2Report.isSecure,
    details: `Security issues: ${user2Report.potentialLeakageRisks.length}`,
    recommendations: user2Report.recommendations
  });

  // Overall assessment
  const overallPassed = testResults.every(test => test.passed);
  const failedTests = testResults.filter(test => !test.passed);

  return {
    testResults,
    overallPassed,
    summary: overallPassed 
      ? 'All cache isolation tests passed ✅'
      : `${failedTests.length} out of ${testResults.length} tests failed ❌`
  };
}

/**
 * Simulate user switching and test cache behavior
 */
export function simulateUserSwitching(
  queryClient: QueryClient,
  users: Array<{ id: string; email: string }>
): CacheTestResult[] {
  const testResults: CacheTestResult[] = [];

  // Simulate each user having some cached data
  users.forEach((user, index) => {
    // Simulate adding user-specific cache entries
    queryClient.setQueryData(
      ['stock', 'list', `user_${user.id}`, { page: 1 }],
      { data: [`mock-stock-data-for-${user.id}`] }
    );
    
    queryClient.setQueryData(
      ['inventory', 'list', `dealer_123_user_${user.id}`],
      { data: [`mock-inventory-data-for-${user.id}`] }
    );
    
    queryClient.setQueryData(
      ['dashboard', 'analytics', `user_${user.id}`],
      { data: { userId: user.id, analytics: 'mock-data' } }
    );
  });

  // Test that each user only sees their own data
  users.forEach((user) => {
    const userQueries = queryClient.getQueryCache().getAll().filter((query) => {
      const keyString = JSON.stringify(query.queryKey);
      return keyString.includes(`user_${user.id}`);
    });

    const otherUserData = userQueries.some((query) => {
      const keyString = JSON.stringify(query.queryKey);
      return users.some(otherUser => 
        otherUser.id !== user.id && keyString.includes(`user_${otherUser.id}`)
      );
    });

    testResults.push({
      testName: `User ${user.id} Data Isolation Test`,
      passed: !otherUserData,
      details: `User has ${userQueries.length} cache entries, contains other user data: ${otherUserData}`,
      recommendations: otherUserData ? ['Implement proper cache clearing on user switch'] : undefined
    });
  });

  return testResults;
}

/**
 * Run comprehensive cache security tests
 */
export function runCacheSecurityTests(
  queryClient: QueryClient,
  currentUserId: string
): CacheTestSuite {
  console.log('🧪 Running comprehensive cache security tests...');
  
  const testResults: CacheTestResult[] = [];

  // Test 1: Basic cache security validation
  const securityReport = validateCacheSecurity(queryClient, currentUserId);
  testResults.push({
    testName: 'Basic Cache Security Validation',
    passed: securityReport.isSecure,
    details: `Total queries: ${securityReport.totalQueries}, Risks: ${securityReport.potentialLeakageRisks.length}`,
    recommendations: securityReport.recommendations
  });

  // Test 2: Check for proper user identification in cache keys
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  let properlyIdentifiedQueries = 0;
  let improperlyCachedQueries: string[] = [];

  queries.forEach((query) => {
    const keyString = JSON.stringify(query.queryKey);
    const hasUserIdentification = 
      keyString.includes(`user_${currentUserId}`) ||
      keyString.includes('email_') ||
      keyString.includes('dealer_');
    
    const isDataQuery = 
      keyString.includes('stock') ||
      keyString.includes('inventory') ||
      keyString.includes('dashboard') ||
      keyString.includes('kanban') ||
      keyString.includes('analytics');

    if (isDataQuery) {
      if (hasUserIdentification) {
        properlyIdentifiedQueries++;
      } else {
        improperlyCachedQueries.push(keyString);
      }
    }
  });

  testResults.push({
    testName: 'Cache Key User Identification Test',
    passed: improperlyCachedQueries.length === 0,
    details: `${properlyIdentifiedQueries} properly identified, ${improperlyCachedQueries.length} missing user identification`,
    recommendations: improperlyCachedQueries.length > 0 ? 
      ['Add user identification to all data queries', 'Clear improperly cached queries'] : undefined
  });

  // Test 3: Memory usage and cache size
  const cacheSize = queries.length;
  const isReasonableSize = cacheSize < 200; // Arbitrary threshold

  testResults.push({
    testName: 'Cache Size Management Test',
    passed: isReasonableSize,
    details: `Cache contains ${cacheSize} queries`,
    recommendations: !isReasonableSize ? ['Implement cache cleanup strategies', 'Consider reducing cache retention times'] : undefined
  });

  const overallPassed = testResults.every(test => test.passed);
  const failedTests = testResults.filter(test => !test.passed);

  console.log('🧪 Cache security tests completed');
  
  return {
    testResults,
    overallPassed,
    summary: overallPassed 
      ? `All ${testResults.length} cache security tests passed ✅`
      : `${failedTests.length} out of ${testResults.length} tests failed ❌`
  };
}

/**
 * Auto-fix common cache security issues
 */
export function autoFixCacheSecurityIssues(
  queryClient: QueryClient,
  currentUserId: string
): { fixed: number; issues: string[] } {
  console.log('🔧 Auto-fixing cache security issues...');
  
  let fixedCount = 0;
  const issues: string[] = [];

  // Clean up insecure cache entries
  try {
    cleanupInsecureCache(queryClient, currentUserId);
    fixedCount++;
  } catch (error) {
    issues.push(`Failed to cleanup insecure cache: ${error}`);
  }

  // Remove queries with no user identification that should have it
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  queries.forEach((query) => {
    const keyString = JSON.stringify(query.queryKey);
    const hasUserIdentification = 
      keyString.includes(`user_${currentUserId}`) ||
      keyString.includes('email_') ||
      keyString.includes('dealer_');
    
    const isDataQuery = 
      keyString.includes('stock') ||
      keyString.includes('inventory') ||
      keyString.includes('dashboard') ||
      keyString.includes('kanban') ||
      keyString.includes('analytics');

    if (isDataQuery && !hasUserIdentification) {
      try {
        queryClient.removeQueries({ queryKey: query.queryKey });
        fixedCount++;
      } catch (error) {
        issues.push(`Failed to remove insecure query: ${keyString}`);
      }
    }
  });

  console.log(`🔧 Auto-fix completed. Fixed ${fixedCount} issues.`);
  
  return { fixed: fixedCount, issues };
}
