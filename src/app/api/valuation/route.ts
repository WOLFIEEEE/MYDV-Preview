import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { parseAutoTraderError, createErrorResponse, createSuccessResponse, createInternalErrorResponse, ErrorType } from '@/lib/errorHandler';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

interface ValuationRequest {
  vehicle: {
    derivativeId: string;
    firstRegistrationDate: string; // ISO date format
    odometerReadingMiles: number;
  };
  features?: Array<{ name: string }>;
  conditionRating?: 'EXCELLENT' | 'GREAT' | 'GOOD' | 'FAIR' | 'POOR';
}

interface ValuationResponse {
  valuations: {
    retailValue: number;
    privateValue: number;
    partExchangeValue: number;
    tradeValue: number;
  };
  vehicle: {
    make: string;
    model: string;
    derivative: string;
    year: number;
    mileage: number;
  };
  condition?: string;
  features?: Array<{ name: string; type: string }>;
}

export async function POST(request: NextRequest) {
  console.log('💰 API Route: Valuation request received');

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
        endpoint: 'valuation'
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
        endpoint: 'valuation'
      };
      return NextResponse.json(createErrorResponse(authError), { status: 401 });
    }

    // Parse request body
    const body: ValuationRequest = await request.json();
    console.log('📋 Valuation request data:', {
      derivativeId: body.vehicle?.derivativeId,
      firstRegistrationDate: body.vehicle?.firstRegistrationDate,
      odometerReadingMiles: body.vehicle?.odometerReadingMiles,
      featuresCount: body.features?.length || 0,
      conditionRating: body.conditionRating
    });

    // Validate required fields
    if (!body.vehicle?.derivativeId) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'derivativeId is required',
        details: 'vehicle.derivativeId must be provided for valuation',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'valuation'
      };
      return NextResponse.json(createErrorResponse(validationError), { status: 400 });
    }

    if (!body.vehicle?.firstRegistrationDate) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'firstRegistrationDate is required',
        details: 'vehicle.firstRegistrationDate must be provided for valuation',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'valuation'
      };
      return NextResponse.json(createErrorResponse(validationError), { status: 400 });
    }

    if (typeof body.vehicle?.odometerReadingMiles !== 'number' || body.vehicle.odometerReadingMiles < 0) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'odometerReadingMiles is required and must be a positive number',
        details: 'vehicle.odometerReadingMiles must be provided as a positive number for valuation',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'valuation'
      };
      return NextResponse.json(createErrorResponse(validationError), { status: 400 });
    }

    // Get advertiser ID from store config or environment variables
    const storeConfigResult = await db.select().from(storeConfig).where(eq(storeConfig.clerkUserId, user.id)).limit(1);
    let advertiserId: string;
    
    if (storeConfigResult.length > 0 && storeConfigResult[0].primaryAdvertisementId) {
      advertiserId = storeConfigResult[0].primaryAdvertisementId;
      console.log('🏪 Using advertiser ID from store config:', advertiserId);
    } else {
      advertiserId = process.env.ADVERTISER_ID || process.env.NEXT_PUBLIC_ADVERTISER_ID || '10028737';
      console.log('🔧 Using default advertiser ID:', advertiserId);
    }

    // Get authentication token
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      return NextResponse.json(authResult.error, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;

    // Prepare valuation request payload
    const valuationPayload: ValuationRequest = {
      vehicle: {
        derivativeId: body.vehicle.derivativeId,
        firstRegistrationDate: body.vehicle.firstRegistrationDate,
        odometerReadingMiles: body.vehicle.odometerReadingMiles
      }
    };

    // Add features if provided
    if (body.features && body.features.length > 0) {
      valuationPayload.features = body.features;
    }

    // Add condition rating if provided (for recalculation)
    if (body.conditionRating) {
      valuationPayload.conditionRating = body.conditionRating;
    }

    console.log('💰 Making valuation request with payload:', valuationPayload);

    // Make valuation request to AutoTrader
    const valuationUrl = `${baseUrl}/valuations?advertiserId=${advertiserId}`;
    console.log('📡 Making valuation request to:', valuationUrl);

    const valuationResponse = await fetch(valuationUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authResult.access_token!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(valuationPayload)
    });

    console.log('📨 Valuation API response status:', valuationResponse.status);

    if (!valuationResponse.ok) {
      const error = await parseAutoTraderError(valuationResponse, 'valuation');
      console.error('❌ Valuation request failed:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const valuationData = await valuationResponse.json();
    console.log('✅ Valuation request successful');
    console.log('💰 Valuation data received:', {
      hasValuations: !!valuationData.valuations,
      retailValue: valuationData.valuations?.retail?.amountGBP,
      privateValue: valuationData.valuations?.private?.amountGBP,
      partExchangeValue: valuationData.valuations?.partExchange?.amountGBP,
      tradeValue: valuationData.valuations?.trade?.amountGBP
    });

    // Structure the response data using actual AutoTrader response format
    const responseData: ValuationResponse = {
      valuations: {
        retailValue: valuationData.valuations?.retail?.amountGBP || 0,
        privateValue: valuationData.valuations?.private?.amountGBP || 0,
        partExchangeValue: valuationData.valuations?.partExchange?.amountGBP || 0,
        tradeValue: valuationData.valuations?.trade?.amountGBP || 0
      },
      vehicle: {
        make: '', // Will be populated from derivative details if needed
        model: '',
        derivative: '',
        year: new Date(body.vehicle.firstRegistrationDate).getFullYear(),
        mileage: body.vehicle.odometerReadingMiles
      }
    };

    // Add condition if provided
    if (body.conditionRating) {
      responseData.condition = body.conditionRating;
    }

    // Add features if provided
    if (body.features) {
      responseData.features = body.features.map(f => ({
        name: f.name,
        type: 'Selected' // We'll determine type from the features API later
      }));
    }

    return NextResponse.json(
      createSuccessResponse(responseData, 'valuation')
    );

  } catch (error) {
    console.error('❌ API Route valuation error:', error);
    const internalError = createInternalErrorResponse(error, 'valuation');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
