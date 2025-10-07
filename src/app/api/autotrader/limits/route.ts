import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

export async function GET() {
  try {
    console.log('🔍 AutoTrader Limits API: Starting request');
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ AutoTrader Limits API: No user ID found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    console.log('✅ AutoTrader Limits API: User authenticated:', userId);

    // Get user email from Clerk
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error('❌ AutoTrader Limits API: CLERK_SECRET_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const user = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
      },
    });

    if (!user.ok) {
      console.error('❌ AutoTrader Limits API: Failed to fetch user from Clerk:', user.status);
      return NextResponse.json(
        { success: false, error: 'Failed to get user information' },
        { status: 500 }
      );
    }

    const userData = await user.json();
    const userEmail = userData.email_addresses?.[0]?.email_address;

    if (!userEmail) {
      console.error('❌ AutoTrader Limits API: No email found for user');
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 400 }
      );
    }

    console.log('✅ AutoTrader Limits API: User email found:', userEmail);

    // Get AutoTrader token for API calls
    console.log('🔑 AutoTrader Limits API: Getting AutoTrader token...');
    const authResult = await getAutoTraderToken(userEmail);
    if (!authResult.success) {
      console.error('❌ AutoTrader Limits API: AutoTrader authentication failed:', authResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to authenticate with AutoTrader - Please check your API credentials' },
        { status: 401 }
      );
    }

    console.log('✅ AutoTrader Limits API: AutoTrader token obtained');

    // Get store configuration to get advertiser ID
    console.log('🏪 AutoTrader Limits API: Getting store configuration...');
    const storeConfigResult = await db
      .select({
        advertisementId: storeConfig.advertisementId,
        additionalAdvertisementIds: storeConfig.additionalAdvertisementIds
      })
      .from(storeConfig)
      .where(eq(storeConfig.email, userEmail))
      .limit(1);

    if (storeConfigResult.length === 0) {
      console.error('❌ AutoTrader Limits API: No store configuration found for email:', userEmail);
      return NextResponse.json(
        { success: false, error: 'Store configuration not found - Please contact support' },
        { status: 404 }
      );
    }

    let advertiserId = storeConfigResult[0].advertisementId;
    if (!advertiserId) {
      console.error('❌ AutoTrader Limits API: No advertiser ID configured');
      return NextResponse.json(
        { success: false, error: 'Advertiser ID not configured - Please contact support' },
        { status: 400 }
      );
    }

    // Handle case where advertiserId might be stored as JSON array
    if (typeof advertiserId === 'string' && advertiserId.startsWith('[')) {
      try {
        const parsed = JSON.parse(advertiserId);
        if (Array.isArray(parsed) && parsed.length > 0) {
          advertiserId = parsed[0];
          console.log('🔄 AutoTrader Limits API: Parsed advertiser ID from array:', advertiserId);
        }
      } catch (e) {
        console.warn('⚠️ AutoTrader Limits API: Failed to parse advertiser ID as JSON, using as-is' , e);
      }
    }

    console.log('✅ AutoTrader Limits API: Final advertiser ID:', advertiserId);

    // Fetch advertiser data with allowances from AutoTrader API
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const advertiserUrl = `${baseUrl}/advertisers?autotraderAdvertAllowances=true`;

    console.log('📡 AutoTrader Limits API: Fetching advertiser data from:', advertiserUrl);

    const response = await fetch(advertiserUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ AutoTrader Limits API: Failed to fetch advertiser data:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: `Failed to fetch advertiser data from AutoTrader (${response.status})` },
        { status: response.status }
      );
    }

    const advertiserData = await response.json();
    console.log('✅ AutoTrader Limits API: Advertiser data received');
    
    // Find the specific advertiser and calculate limits
    let totalLimit = 0;
    let allowancesData = null;

    console.log('🔍 AutoTrader Limits API: Processing advertiser data...');

    if (advertiserData.results && Array.isArray(advertiserData.results)) {
      console.log('📊 AutoTrader Limits API: Found', advertiserData.results.length, 'advertisers');
      
      // Debug: Log all advertiser IDs to see what's available
      const availableAdvertiserIds = advertiserData.results.map((adv: { advertiserId: string }) => adv.advertiserId);
      console.log('🔍 AutoTrader Limits API: Available advertiser IDs:', availableAdvertiserIds);
      console.log('🎯 AutoTrader Limits API: Looking for advertiser ID:', advertiserId);
      
      const advertiser = advertiserData.results.find((adv: { 
        advertiserId: string;
        autotraderAdvertAllowances?: Array<{
          type?: string;
          vehicleTypes?: string[];
          capacity?: string | number;
        }>;
      }) => adv.advertiserId === advertiserId);
      
      if (advertiser) {
        console.log('✅ AutoTrader Limits API: Found matching advertiser');
        
        if (advertiser.autotraderAdvertAllowances) {
          allowancesData = advertiser.autotraderAdvertAllowances;
          console.log('📋 AutoTrader Limits API: Processing', allowancesData.length, 'allowances');
          
          // Calculate total limit based on Standard and Bargain allowances for Car and Van
          advertiser.autotraderAdvertAllowances.forEach((allowance: {
            type?: string;
            vehicleTypes?: string[];
            capacity?: string | number;
          }, index: number) => {
            console.log(`🔍 AutoTrader Limits API: Allowance ${index + 1}:`, {
              type: allowance.type,
              vehicleTypes: allowance.vehicleTypes,
              capacity: allowance.capacity
            });
            
            if (
              allowance.type && 
              (allowance.type === 'Standard' || allowance.type === 'Bargain') &&
              allowance.vehicleTypes && 
              Array.isArray(allowance.vehicleTypes) &&
              allowance.vehicleTypes.includes('Car') &&
              allowance.vehicleTypes.includes('Van') &&
              allowance.capacity
            ) {
              const capacity = parseInt(String(allowance.capacity)) || 0;
              totalLimit += capacity;
              console.log(`✅ AutoTrader Limits API: Added ${capacity} to total limit (${allowance.type})`);
            } else {
              console.log(`❌ AutoTrader Limits API: Allowance ${index + 1} doesn't meet criteria`);
            }
          });
        } else {
          console.warn('⚠️ AutoTrader Limits API: No allowances found for advertiser');
        }
      } else {
        console.error('❌ AutoTrader Limits API: Advertiser not found in results');
      }
    } else {
      console.error('❌ AutoTrader Limits API: Invalid advertiser data structure');
    }

    console.log('📊 AutoTrader Limits API: Final calculated limit:', totalLimit);

    return NextResponse.json({
      success: true,
      data: {
        advertiserId,
        listingCount: totalLimit,
        allowances: allowancesData,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching AutoTrader limits:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
