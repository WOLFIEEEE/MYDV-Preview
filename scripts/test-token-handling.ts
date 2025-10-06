/**
 * Test script for validating AutoTrader token management
 * 
 * This script tests the token handling improvements including:
 * - Token expiration calculation
 * - Cache validation
 * - 401 error retry logic
 * 
 * Usage:
 *   npx tsx scripts/test-token-handling.ts
 */

import { getAutoTraderToken, clearTokenCache, getTokenCacheStats } from '@/lib/autoTraderAuth';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
  console.log(`\n🧪 Running test: ${name}`);
  const startTime = Date.now();
  
  try {
    const passed = await testFn();
    const duration = Date.now() - startTime;
    
    results.push({
      name,
      passed,
      message: passed ? '✅ PASSED' : '❌ FAILED',
      duration
    });
    
    console.log(`${passed ? '✅' : '❌'} ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      passed: false,
      message: `❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration
    });
    
    console.log(`❌ ${name} - ERROR: ${error}`);
  }
}

/**
 * Test 1: Token can be obtained successfully
 */
async function testTokenAcquisition(): Promise<boolean> {
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const result = await getAutoTraderToken(testEmail);
  
  if (!result.success) {
    console.log('   ⚠️  Token acquisition failed:', result.error);
    return false;
  }
  
  if (!result.access_token) {
    console.log('   ⚠️  No access token in result');
    return false;
  }
  
  if (!result.expires_at) {
    console.log('   ⚠️  No expiration time in result');
    return false;
  }
  
  // Validate token expiration is in the future
  const expiresAt = new Date(result.expires_at);
  const now = new Date();
  const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
  
  console.log(`   📅 Token expires in ${Math.round(minutesUntilExpiry)} minutes`);
  
  // Token should expire in 10-15 minutes (15 min - 5 min buffer)
  if (minutesUntilExpiry < 5 || minutesUntilExpiry > 20) {
    console.log('   ⚠️  Token expiration time seems incorrect');
    return false;
  }
  
  return true;
}

/**
 * Test 2: Token is cached after first request
 */
async function testTokenCaching(): Promise<boolean> {
  clearTokenCache();
  
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  
  // First request - should hit API
  console.log('   📡 First request (should hit API)...');
  const startTime1 = Date.now();
  const result1 = await getAutoTraderToken(testEmail);
  const duration1 = Date.now() - startTime1;
  
  if (!result1.success) {
    return false;
  }
  
  // Check cache stats
  const stats1 = getTokenCacheStats();
  console.log(`   📊 Cache stats after first request:`, stats1);
  
  // Second request - should use cache
  console.log('   💾 Second request (should use cache)...');
  const startTime2 = Date.now();
  const result2 = await getAutoTraderToken(testEmail);
  const duration2 = Date.now() - startTime2;
  
  console.log(`   ⏱️  First request: ${duration1}ms, Second request: ${duration2}ms`);
  
  // Second request should be significantly faster (cached)
  if (duration2 >= duration1) {
    console.log('   ⚠️  Cache doesn\'t seem to be working (second request not faster)');
    return false;
  }
  
  // Both should return the same token
  if (result1.access_token !== result2.access_token) {
    console.log('   ⚠️  Tokens don\'t match');
    return false;
  }
  
  return true;
}

/**
 * Test 3: Cache statistics are accurate
 */
async function testCacheStatistics(): Promise<boolean> {
  clearTokenCache();
  
  const stats1 = getTokenCacheStats();
  if (stats1.totalTokens !== 0 || stats1.validTokens !== 0) {
    console.log('   ⚠️  Cache not properly cleared');
    return false;
  }
  
  // Get a token
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  await getAutoTraderToken(testEmail);
  
  const stats2 = getTokenCacheStats();
  if (stats2.totalTokens !== 1 || stats2.validTokens !== 1) {
    console.log('   ⚠️  Cache stats incorrect after token acquisition');
    console.log('   Expected: { totalTokens: 1, validTokens: 1 }');
    console.log('   Got:', stats2);
    return false;
  }
  
  console.log('   📊 Cache stats:', stats2);
  return true;
}

/**
 * Test 4: Token expiration buffer works correctly
 */
async function testExpirationBuffer(): Promise<boolean> {
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const result = await getAutoTraderToken(testEmail);
  
  if (!result.success || !result.expires_at) {
    return false;
  }
  
  const expiresAt = new Date(result.expires_at);
  const now = new Date();
  const actualExpiryMinutes = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
  
  // Token cache has 5-minute buffer, so:
  // - API returns 15-minute token (900 seconds)
  // - Cache considers it valid for only 10 minutes (15 - 5 buffer)
  console.log(`   ⏰ Token will be refreshed in ~${Math.round(actualExpiryMinutes - 5)} minutes`);
  console.log(`   ⏰ Token technically expires in ~${Math.round(actualExpiryMinutes)} minutes`);
  
  // Verify the buffer is working (token should be considered valid for 10-11 minutes)
  const effectiveValidityMinutes = actualExpiryMinutes - 5; // 5 min buffer
  if (effectiveValidityMinutes < 8 || effectiveValidityMinutes > 12) {
    console.log('   ⚠️  Expiration buffer might not be working correctly');
    return false;
  }
  
  return true;
}

/**
 * Test 5: Multiple concurrent requests use mutex correctly
 */
async function testConcurrentRequests(): Promise<boolean> {
  clearTokenCache();
  
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  
  console.log('   🔄 Making 5 concurrent token requests...');
  const startTime = Date.now();
  
  // Make 5 concurrent requests
  const promises = Array(5).fill(null).map(() => getAutoTraderToken(testEmail));
  const results = await Promise.all(promises);
  
  const duration = Date.now() - startTime;
  console.log(`   ⏱️  All requests completed in ${duration}ms`);
  
  // All should succeed
  if (results.some(r => !r.success)) {
    console.log('   ⚠️  Some requests failed');
    return false;
  }
  
  // All should have the same token (mutex prevented duplicate API calls)
  const tokens = results.map(r => r.access_token);
  if (new Set(tokens).size !== 1) {
    console.log('   ⚠️  Different tokens returned (mutex might not be working)');
    return false;
  }
  
  // Check cache - should only have 1 token
  const stats = getTokenCacheStats();
  if (stats.totalTokens !== 1) {
    console.log('   ⚠️  Cache has multiple tokens (expected 1)');
    return false;
  }
  
  console.log('   ✅ Mutex correctly prevented duplicate API calls');
  return true;
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 AutoTrader Token Management Test Suite');
  console.log('═══════════════════════════════════════════════════════');
  
  // Check for required environment variables
  if (!process.env.AUTOTRADER_API_KEY || !process.env.AUTOTRADER_SECRET) {
    console.error('\n❌ ERROR: Missing required environment variables');
    console.error('   Please set AUTOTRADER_API_KEY and AUTOTRADER_SECRET');
    process.exit(1);
  }
  
  // Run all tests
  await runTest('Token Acquisition', testTokenAcquisition);
  await runTest('Token Caching', testTokenCaching);
  await runTest('Cache Statistics', testCacheStatistics);
  await runTest('Expiration Buffer', testExpirationBuffer);
  await runTest('Concurrent Requests', testConcurrentRequests);
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.message} ${result.name} (${result.duration}ms)`);
  });
  
  console.log('\n───────────────────────────────────────────────────────');
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('───────────────────────────────────────────────────────');
  
  if (failed === 0) {
    console.log('\n✅ All tests passed! Token management is production ready.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('\n💥 Fatal error running tests:', error);
    process.exit(1);
  });
}

export { runAllTests, results };

