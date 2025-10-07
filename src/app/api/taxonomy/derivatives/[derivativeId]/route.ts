import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { parseAutoTraderError, createErrorResponse, createSuccessResponse, createInternalErrorResponse, ErrorType } from '@/lib/errorHandler';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ derivativeId: string }> }
) {
  console.log('📊 API Route: Taxonomy Derivative Details request received');

  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'taxonomy derivative details'
      };
      return NextResponse.json(createErrorResponse(authError), { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'User must have a valid email address',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'taxonomy derivative details'
      };
      return NextResponse.json(createErrorResponse(authError), { status: 401 });
    }

    const { derivativeId } = await params;

    // Get advertiserId from store config or environment variables
    const storeConfigResult = await db.select().from(storeConfig).where(eq(storeConfig.clerkUserId, user.id)).limit(1);
    let advertiserId: string;
    if (storeConfigResult.length > 0 && storeConfigResult[0].primaryAdvertisementId) {
      advertiserId = storeConfigResult[0].primaryAdvertisementId;
    } else {
      advertiserId = process.env.ADVERTISER_ID || process.env.NEXT_PUBLIC_ADVERTISER_ID || '10028737';
    }

    console.log('📋 Taxonomy Derivative Details parameters:', {
      derivativeId,
      advertiserId,
    });

    if (!derivativeId) {
      const error = {
        type: ErrorType.VALIDATION,
        message: 'derivativeId parameter is required',
        details: 'derivativeId must be provided for taxonomy derivative details',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'taxonomy derivative details'
      };
      return NextResponse.json(createErrorResponse(error), { status: 400 });
    }

    // Get authentication token (cached or fresh)
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      return NextResponse.json(authResult.error, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;

    // Build derivative details URL
    console.log('🔍 Step 2: Fetching taxonomy derivative details...');
    const derivativeParams = new URLSearchParams();
    derivativeParams.append('advertiserId', advertiserId);

    const derivativeUrl = `${baseUrl}/taxonomy/derivatives/${derivativeId}?${derivativeParams.toString()}`;
    console.log('📡 Making taxonomy derivative details request to:', derivativeUrl);

    const derivativeResponse = await fetch(derivativeUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token!}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📨 Taxonomy Derivative Details API response status:', derivativeResponse.status);

    if (!derivativeResponse.ok) {
      const error = await parseAutoTraderError(derivativeResponse, 'taxonomy derivative details');
      console.error('❌ Taxonomy Derivative Details request failed:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const derivativeData = await derivativeResponse.json();
    console.log('✅ Taxonomy Derivative Details request successful');
    
    // Extract derivative details from the response
    const extractedData = derivativeData.derivative || derivativeData.data || derivativeData || {};
    
    console.log('📄 Derivative details loaded');
    console.log('📄 Sample data:', {
      make: extractedData.make,
      model: extractedData.model,
      derivative: extractedData.derivative || extractedData.name,
      engineCapacityCC: extractedData.engineCapacityCC,
      fuelType: extractedData.fuelType
    });

    return NextResponse.json(
      createSuccessResponse(extractedData, 'taxonomy derivative details')
    );

  } catch (error) {
    console.error('❌ API Route taxonomy derivative details error:', error);
    const internalError = createInternalErrorResponse(error, 'taxonomy derivative details');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}