import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { updateDealerStoreConfig } from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    console.log('📥 Update dealer config API called');
    
    // Get current user
    const user = await currentUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Parse request body
    const body = await req.json();
    const { 
      dealerId,
      advertisementId,
      additionalAdvertisementIds,
      autotraderIntegrationId,
      companyName,
      companyLogoUrl
    } = body;
    
    console.log('📋 Update request data:', {
      dealerId,
      advertisementId,
      additionalAdvertisementIds,
      autotraderIntegrationId,
      companyName,
      companyLogoUrl
    });
    
    // Validate required fields
    if (!dealerId) {
      console.error('❌ Missing dealer ID');
      return NextResponse.json({
        success: false,
        error: 'Dealer ID is required'
      }, { status: 400 });
    }
    
    // Call the database function to update store config
    console.log('🔄 Calling updateDealerStoreConfig...');
    const result = await updateDealerStoreConfig(dealerId, {
      advertisementId,
      additionalAdvertisementIds,
      autotraderIntegrationId,
      companyName,
      companyLogoUrl
    });
    
    console.log('📋 Update result:', result);
    
    if (!result.success) {
      console.error('❌ Failed to update dealer config:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
    
    console.log('✅ Dealer config updated successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Dealer configuration updated successfully',
      data: result.data
    });
    
  } catch (error) {
    console.error('❌ Error in update dealer config API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to update dealer configuration: ' + errorMessage
    }, { status: 500 });
  }
}
