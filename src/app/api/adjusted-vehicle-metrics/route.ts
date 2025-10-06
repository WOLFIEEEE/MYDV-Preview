import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { 
  AdjustedVehicleMetricsService, 
  AdjustedVehicleMetricsRequest 
} from '@/lib/services/adjustedVehicleMetricsService';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

export async function POST(request: NextRequest) {
  try {
    console.log('📍 API Route: Adjusted vehicle metrics request received');

    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'adjusted-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const {
      derivativeId,
      firstRegistrationDate,
      odometerReadingMiles
    }: {
      derivativeId: string;
      firstRegistrationDate: string;
      odometerReadingMiles: number;
    } = body;

    console.log('📋 Request parameters:', {
      derivativeId,
      firstRegistrationDate,
      odometerReadingMiles,
      userId: user.id
    });

    // Get store configuration (handles both store owners and team members)
    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    const configResult = await getStoreConfigForUser(user.id, userEmail);
    
    if (!configResult.success) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Store configuration not found',
        details: configResult.error || 'Please contact support to set up your store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'adjusted-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    const userStoreConfig = configResult.storeConfig;
    let advertiserId = userStoreConfig.primaryAdvertisementId;

    // Handle new advertisement ID format
    if (!advertiserId && userStoreConfig.advertisementId) {
      advertiserId = userStoreConfig.advertisementId;
    }

    if (!advertiserId) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Advertisement ID not configured',
        details: 'No advertisement ID found in store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'adjusted-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    // Prepare request
    const metricsRequest: AdjustedVehicleMetricsRequest = {
      derivativeId,
      firstRegistrationDate,
      odometerReadingMiles,
      advertiserId,
      userEmail: configResult.storeOwnerEmail || userEmail
    };

    // Validate request
    const validationErrors = AdjustedVehicleMetricsService.validateRequest(metricsRequest);
    if (validationErrors.length > 0) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Validation failed',
        details: validationErrors.join(', '),
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'adjusted-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get adjusted vehicle metrics
    const metricsResponse = await AdjustedVehicleMetricsService.getAdjustedMetrics(metricsRequest);

    console.log('✅ Adjusted vehicle metrics retrieved:', {
      source: metricsResponse.source,
      hasLocationAdjustments: !!metricsResponse.locationAdjustments
    });

    return NextResponse.json(
      createSuccessResponse(metricsResponse, 'adjusted-vehicle-metrics')
    );

  } catch (error) {
    console.error('❌ Error in adjusted vehicle metrics API:', error);
    const internalError = createInternalErrorResponse(error, 'adjusted-vehicle-metrics');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📍 API Route: Adjusted vehicle metrics GET request received');

    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'adjusted-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const derivativeId = searchParams.get('derivativeId');
    const firstRegistrationDate = searchParams.get('firstRegistrationDate');
    const odometerReadingMiles = searchParams.get('odometerReadingMiles');

    if (!derivativeId || !firstRegistrationDate || !odometerReadingMiles) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Missing required parameters',
        details: 'Required: derivativeId, firstRegistrationDate, odometerReadingMiles',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'adjusted-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    console.log('📋 Query parameters:', {
      derivativeId,
      firstRegistrationDate,
      odometerReadingMiles: parseInt(odometerReadingMiles),
      userId: user.id
    });

    // Get store configuration
    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    const configResult = await getStoreConfigForUser(user.id, userEmail);
    
    if (!configResult.success) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Store configuration not found',
        details: configResult.error || 'Please contact support to set up your store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'adjusted-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    const userStoreConfig = configResult.storeConfig;
    let advertiserId = userStoreConfig.primaryAdvertisementId;

    // Handle new advertisement ID format
    if (!advertiserId && userStoreConfig.advertisementId) {
      advertiserId = userStoreConfig.advertisementId;
    }

    if (!advertiserId) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Advertisement ID not configured',
        details: 'No advertisement ID found in store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'adjusted-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    // Prepare request
    const metricsRequest: AdjustedVehicleMetricsRequest = {
      derivativeId,
      firstRegistrationDate,
      odometerReadingMiles: parseInt(odometerReadingMiles),
      advertiserId,
      userEmail: configResult.storeOwnerEmail || userEmail
    };

    // Get adjusted vehicle metrics
    const metricsResponse = await AdjustedVehicleMetricsService.getAdjustedMetrics(metricsRequest);

    console.log('✅ Adjusted vehicle metrics retrieved via GET:', {
      source: metricsResponse.source,
      hasLocationAdjustments: !!metricsResponse.locationAdjustments
    });

    return NextResponse.json(
      createSuccessResponse(metricsResponse, 'adjusted-vehicle-metrics')
    );

  } catch (error) {
    console.error('❌ Error in adjusted vehicle metrics GET API:', error);
    const internalError = createInternalErrorResponse(error, 'adjusted-vehicle-metrics');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
