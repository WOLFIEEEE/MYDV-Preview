import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { parseAutoTraderError, createErrorResponse, createSuccessResponse, createInternalErrorResponse, ErrorType } from '@/lib/errorHandler';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

export async function GET(request: NextRequest) {
  console.log('📊 API Route: Taxonomy Features request received');

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
        endpoint: 'taxonomy features'
      };
      return NextResponse.json(createErrorResponse(authError), { status: 401 });
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'User must have a valid email address',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'taxonomy features'
      };
      return NextResponse.json(createErrorResponse(authError), { status: 401 });
    }

    // Get the correct email to use (store owner's email for team members)
    const configResult = await getStoreConfigForUser(user.id, userEmail);
    let email: string;
    
    if (configResult.success && configResult.storeOwnerEmail) {
      email = configResult.storeOwnerEmail;
      console.log('👥 Using store owner email for taxonomy features:', email);
    } else {
      email = userEmail;
      console.log('🏢 Using own email for taxonomy features:', email);
    }

    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const derivativeId = searchParams.get('derivativeId');
    const effectiveDate = searchParams.get('effectiveDate');

    // Get advertiserId from store config or environment variables
    const storeConfigResult = await db.select().from(storeConfig).where(eq(storeConfig.email, email)).limit(1);
    let advertiserId: string;
    if (storeConfigResult.length > 0 && storeConfigResult[0].primaryAdvertisementId) {
      advertiserId = storeConfigResult[0].primaryAdvertisementId;
    } else {
      advertiserId = process.env.ADVERTISER_ID || process.env.NEXT_PUBLIC_ADVERTISER_ID || '10028737';
    }

    console.log('📋 Taxonomy Features parameters:', {
      derivativeId,
      effectiveDate,
      advertiserId,
    });

    if (!derivativeId) {
      const error = {
        type: ErrorType.VALIDATION,
        message: 'derivativeId parameter is required',
        details: 'derivativeId must be provided for taxonomy features',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'taxonomy features'
      };
      return NextResponse.json(createErrorResponse(error), { status: 400 });
    }

    // Get authentication token (cached or fresh)
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      return NextResponse.json(authResult.error, { status: 401 });
    }

    const baseUrl = getAutoTraderBaseUrlForServer();

    // Build features URL
    console.log('🔍 Step 2: Fetching taxonomy features...');
    const featuresParams = new URLSearchParams();
    featuresParams.append('advertiserId', advertiserId);
    featuresParams.append('derivativeId', derivativeId);
    
    // Add effectiveDate - use provided date or current date as fallback
    const dateToUse = effectiveDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    featuresParams.append('effectiveDate', dateToUse);
    console.log('📅 Using effectiveDate:', dateToUse);

    const featuresUrl = `${baseUrl}/taxonomy/features?${featuresParams.toString()}`;
    console.log('📡 Making taxonomy features request to:', featuresUrl);

    const featuresResponse = await fetch(featuresUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token!}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📨 Taxonomy Features API response status:', featuresResponse.status);

    if (!featuresResponse.ok) {
      const error = await parseAutoTraderError(featuresResponse, 'taxonomy features');
      console.error('❌ Taxonomy Features request failed:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const featuresData = await featuresResponse.json();
    console.log('✅ Taxonomy Features request successful');
    
    // Extract features from the response
    const extractedFeatures = featuresData.features || featuresData.data || featuresData || [];
    
    console.log('📄 Found', Array.isArray(extractedFeatures) ? extractedFeatures.length : 'unknown', 'features');
    console.log('📄 Sample features:', extractedFeatures.slice(0, 2));

    return NextResponse.json(
      createSuccessResponse(extractedFeatures, 'taxonomy features')
    );

  } catch (error) {
    console.error('❌ API Route taxonomy features error:', error);
    const internalError = createInternalErrorResponse(error, 'taxonomy features');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}