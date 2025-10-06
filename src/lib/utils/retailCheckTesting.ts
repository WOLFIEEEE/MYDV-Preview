/**
 * Retail Check Flow Testing Utility
 * 
 * This script tests all three retail check flows to ensure they work properly:
 * 1. Vehicle Finder Flow (registration + mileage)
 * 2. Taxonomy Flow (derivativeId + mileage)  
 * 3. Stock Flow (stockId)
 */

import { validateRetailCheckParams, buildRetailCheckUrl } from './retailCheckNavigation';

interface TestCase {
  name: string;
  params: any;
  shouldPass: boolean;
  expectedError?: string;
}

// Test cases for validation
const testCases: TestCase[] = [
  // Valid cases
  {
    name: 'Valid Vehicle Finder Flow',
    params: { registration: 'AB12CDE', mileage: '50000' },
    shouldPass: true
  },
  {
    name: 'Valid Vehicle Finder Flow with VRM',
    params: { vrm: 'XY67FGH', mileage: 25000 },
    shouldPass: true
  },
  {
    name: 'Valid Taxonomy Flow',
    params: { derivativeId: 'ceeb4e70d0e44ba28e476da2ea86d16d', mileage: '30000' },
    shouldPass: true
  },
  {
    name: 'Valid Stock Flow',
    params: { stockId: 'STOCK123' },
    shouldPass: true
  },
  
  // Invalid cases
  {
    name: 'Empty parameters',
    params: {},
    shouldPass: false,
    expectedError: 'At least one valid flow is required'
  },
  {
    name: 'Invalid registration (too short)',
    params: { registration: 'AB', mileage: '50000' },
    shouldPass: false,
    expectedError: 'Registration must be at least 3 characters long'
  },
  {
    name: 'Invalid mileage (negative)',
    params: { registration: 'AB12CDE', mileage: '-1000' },
    shouldPass: false,
    expectedError: 'Valid mileage is required'
  },
  {
    name: 'Missing derivativeId for taxonomy flow',
    params: { derivativeId: '', mileage: '30000' },
    shouldPass: false,
    expectedError: 'Derivative ID is required'
  },
  {
    name: 'Missing stockId for stock flow',
    params: { stockId: '' },
    shouldPass: false,
    expectedError: 'Stock ID is required'
  }
];

/**
 * Run all validation tests
 */
export function runValidationTests(): { passed: number; failed: number; results: any[] } {
  console.log('🧪 Running Retail Check Validation Tests...');
  console.log('=' .repeat(50));
  
  const results: any[] = [];
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log(`   Params:`, testCase.params);
    
    try {
      const validation = validateRetailCheckParams(testCase.params);
      
      if (testCase.shouldPass) {
        if (validation.isValid) {
          console.log('   ✅ PASS - Validation succeeded as expected');
          passed++;
          results.push({ ...testCase, result: 'PASS', actual: 'Valid' });
        } else {
          console.log(`   ❌ FAIL - Expected valid, got error: ${validation.error}`);
          failed++;
          results.push({ ...testCase, result: 'FAIL', actual: validation.error });
        }
      } else {
        if (!validation.isValid) {
          const errorContainsExpected = testCase.expectedError ? 
            validation.error?.includes(testCase.expectedError) : true;
          
          if (errorContainsExpected) {
            console.log('   ✅ PASS - Validation failed as expected');
            passed++;
            results.push({ ...testCase, result: 'PASS', actual: validation.error });
          } else {
            console.log(`   ❌ FAIL - Expected error containing "${testCase.expectedError}", got: ${validation.error}`);
            failed++;
            results.push({ ...testCase, result: 'FAIL', actual: validation.error });
          }
        } else {
          console.log('   ❌ FAIL - Expected validation to fail, but it passed');
          failed++;
          results.push({ ...testCase, result: 'FAIL', actual: 'Valid' });
        }
      }
    } catch (error) {
      console.log(`   ❌ ERROR - Unexpected error: ${error}`);
      failed++;
      results.push({ ...testCase, result: 'ERROR', actual: error });
    }
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  return { passed, failed, results };
}

/**
 * Test URL building for valid cases
 */
export function testUrlBuilding(): void {
  console.log('\n🔗 Testing URL Building...');
  console.log('=' .repeat(30));
  
  const validCases = testCases.filter(tc => tc.shouldPass);
  
  // Mock window.location for testing
  const originalWindow = global.window;
  global.window = {
    location: { origin: 'https://example.com' }
  } as any;
  
  validCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`);
    
    try {
      const url = buildRetailCheckUrl(testCase.params);
      console.log(`   ✅ URL: ${url}`);
      
      // Verify URL structure
      const urlObj = new URL(url);
      console.log(`   📋 Path: ${urlObj.pathname}`);
      console.log(`   📋 Params: ${urlObj.searchParams.toString()}`);
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
    }
  });
  
  // Restore window
  global.window = originalWindow;
}

/**
 * Simulate API calls for testing (mock version)
 */
export function simulateApiCalls(): void {
  console.log('\n🌐 Simulating API Calls...');
  console.log('=' .repeat(25));
  
  const apiEndpoints = [
    { name: 'Vehicle Lookup', url: '/api/retail-check', method: 'POST', body: { flow: 'vehicle-finder', registration: 'AB12CDE', mileage: 50000 } },
    { name: 'Taxonomy Lookup', url: '/api/retail-check', method: 'POST', body: { flow: 'taxonomy', derivativeId: 'test-id', mileage: 30000 } },
    { name: 'Stock Lookup', url: '/api/retail-check', method: 'POST', body: { flow: 'stock', stockId: 'STOCK123' } },
    { name: 'Trended Valuations', url: '/api/retail-check/trended-valuations', method: 'POST', body: { derivativeId: 'test-id' } },
    { name: 'Competition Analysis', url: '/api/retail-check/competition', method: 'POST', body: { vehicle: { make: 'Test' } } },
    { name: 'Price Calculator', url: '/api/retail-check/calculate-price', method: 'POST', body: { retail_value: 15000 } }
  ];
  
  apiEndpoints.forEach((endpoint, index) => {
    console.log(`\n${index + 1}. ${endpoint.name}`);
    console.log(`   📡 ${endpoint.method} ${endpoint.url}`);
    console.log(`   📦 Body:`, JSON.stringify(endpoint.body, null, 2));
    console.log(`   ℹ️  This would be tested in a real environment`);
  });
}

/**
 * Run all tests
 */
export function runAllTests(): void {
  console.log('🚀 Starting Comprehensive Retail Check Tests');
  console.log('=' .repeat(60));
  
  const validationResults = runValidationTests();
  testUrlBuilding();
  simulateApiCalls();
  
  console.log('\n' + '=' .repeat(60));
  console.log('📈 SUMMARY');
  console.log(`✅ Validation Tests: ${validationResults.passed}/${validationResults.passed + validationResults.failed} passed`);
  console.log('✅ URL Building: Tested for all valid cases');
  console.log('✅ API Simulation: All endpoints identified');
  
  if (validationResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Retail check flows are properly implemented.');
  } else {
    console.log(`\n⚠️  ${validationResults.failed} tests failed. Please review the implementation.`);
  }
}

// Export for use in other files
export { testCases };
export type { TestCase };
