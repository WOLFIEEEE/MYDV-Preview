// Test utility for enhanced assignment functionality
// This can be called from the admin dashboard to verify everything works

import { EnhancedAssignmentData, createOrUpdateEnhancedStoreConfig, getEnhancedAssignmentData } from './database';

export interface TestAssignmentData {
  submissionId: number;
  adminClerkId: string;
  testData: EnhancedAssignmentData;
}

export async function testEnhancedAssignmentWorkflow(params: TestAssignmentData) {
  console.log('🧪 Starting enhanced assignment test...');
  console.log('📋 Test parameters:', params);
  
  try {
    // Step 1: Create/Update enhanced assignment
    console.log('🔄 Step 1: Creating/updating enhanced assignment...');
    const createResult = await createOrUpdateEnhancedStoreConfig(
      params.submissionId,
      params.adminClerkId,
      params.testData
    );

    if (!createResult.success) {
      console.error('❌ Step 1 failed:', createResult.error);
      return {
        success: false,
        error: `Step 1 failed: ${createResult.error}`,
        step: 'create'
      };
    }

    console.log('✅ Step 1 completed successfully');
    console.log('📄 Created/updated data:', createResult.data);

    // Step 2: Retrieve the enhanced assignment data
    console.log('🔄 Step 2: Retrieving enhanced assignment data...');
    const retrieveResult = await getEnhancedAssignmentData(params.submissionId);

    if (!retrieveResult.success) {
      console.error('❌ Step 2 failed:', retrieveResult.error);
      return {
        success: false,
        error: `Step 2 failed: ${retrieveResult.error}`,
        step: 'retrieve'
      };
    }

    console.log('✅ Step 2 completed successfully');
    console.log('📄 Retrieved data:', retrieveResult.data);

    // Step 3: Verify the data integrity
    console.log('🔄 Step 3: Verifying data integrity...');
    const storedData = retrieveResult.data;
    
    const verificationResults = {
      advertisementId: storedData?.advertisementId === params.testData.advertisementId,
      additionalAdvertisementIds: JSON.stringify(storedData?.additionalAdvertisementIdsParsed) === JSON.stringify(params.testData.additionalAdvertisementIds || []),
      companyLogoUrl: storedData?.companyLogoUrl === params.testData.companyLogoUrl,
      dvlaApiKey: storedData?.dvlaApiKey === params.testData.dvlaApiKey,
      autotraderKey: storedData?.autotraderKey === params.testData.autotraderKey,
      autotraderSecret: storedData?.autotraderSecret === params.testData.autotraderSecret,
      autotraderIntegrationId: storedData?.autotraderIntegrationId === params.testData.autotraderIntegrationId,
      companyName: storedData?.companyName === params.testData.companyName,
      assignedAt: storedData?.assignedAt !== null,
    };

    console.log('🧪 Verification results:', verificationResults);

    const allVerificationsPassed = Object.values(verificationResults).every(result => result === true);

    if (!allVerificationsPassed) {
      console.error('❌ Step 3 failed: Data verification failed');
      return {
        success: false,
        error: 'Data verification failed',
        step: 'verify',
        verificationResults,
        storedData,
        expectedData: params.testData
      };
    }

    console.log('✅ Step 3 completed successfully - All data verified!');

    // Step 4: Test API endpoint
    console.log('🔄 Step 4: Testing API endpoint...');
    try {
      const apiUrl = `/api/admin/create-enhanced-assignment?submissionId=${params.submissionId}`;
      console.log('🌐 Testing GET endpoint:', apiUrl);
      
      // Note: This would need to be called from a client-side context with proper authentication
      console.log('ℹ️ API endpoint test skipped - requires client-side authentication');
      
    } catch (apiError) {
      console.warn('⚠️ API test skipped due to server-side context');
    }

    console.log('🎉 All tests completed successfully!');
    return {
      success: true,
      message: 'Enhanced assignment workflow test completed successfully',
      data: {
        created: createResult.data,
        retrieved: retrieveResult.data,
        verificationResults,
        allVerificationsPassed
      }
    };

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'unknown'
    };
  }
}

// Example test data generator
export function generateTestAssignmentData(submissionId: number, adminClerkId: string): TestAssignmentData {
  return {
    submissionId,
    adminClerkId,
    testData: {
      // Legacy columns
      advertisementIds: ['AD123', 'AD456', 'AD789'],
      primaryAdvertisementId: 'AD123',
      autotraderKey: 'test_autotrader_key_' + Date.now(),
      autotraderSecret: 'test_autotrader_secret_' + Date.now(),
      dvlaApiKey: 'test_dvla_key_' + Date.now(),
      autotraderIntegrationId: 'test_integration_' + Date.now(),
      companyName: 'Test Motors Ltd',
      companyLogo: 'data:image/png;base64,test_logo_data',
      
      // New enhanced columns
      advertisementId: 'ENHANCED_AD_' + Date.now(),
      additionalAdvertisementIds: ['EXTRA_AD_1', 'EXTRA_AD_2', 'EXTRA_AD_3'],
      companyLogoUrl: 'https://example.com/test-logo.png',
    }
  };
}

// Quick test function for debugging
export async function quickTestEnhancedAssignment() {
  console.log('🚀 Running quick enhanced assignment test...');
  
  // Note: You'll need to provide real submissionId and adminClerkId for actual testing
  const testParams = generateTestAssignmentData(
    1, // Replace with actual submission ID
    'user_test_admin' // Replace with actual admin Clerk ID
  );
  
  const result = await testEnhancedAssignmentWorkflow(testParams);
  
  if (result.success) {
    console.log('🎉 Quick test PASSED!');
  } else {
    console.log('❌ Quick test FAILED:', result.error);
  }
  
  return result;
} 