import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createSuccessResponse, createErrorResponse, createInternalErrorResponse, ErrorType } from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Enhanced Vehicle Metrics Request Types
interface VehicleData {
  derivativeId: string;
  firstRegistrationDate: string;
  odometerReadingMiles: number;
}

interface LocationByAdvertiser {
  advertiserId: string;
}

interface LocationByCoordinates {
  latitude: string;
  longitude: string;
}

interface SaleTarget {
  daysInStock?: number;
  targetDaysToSell: Array<{ days: number }>;
}

interface VehicleFeature {
  name: string;
}

interface AdvertsData {
  retailAdverts: {
    price: {
      amountGBP: number;
    };
  };
}

// AutoTrader API Payload Interface
interface AutoTraderVehicleMetricsPayload {
  vehicle: VehicleData;
  locations?: Array<LocationByAdvertiser | LocationByCoordinates>;
  saleTarget?: SaleTarget;
  features?: VehicleFeature[];
  adverts?: AdvertsData;
}

interface EnhancedVehicleMetricsRequest {
  vehicle: VehicleData;
  locations?: Array<LocationByAdvertiser | LocationByCoordinates>;
  saleTarget?: SaleTarget;
  features?: VehicleFeature[];
  adverts?: AdvertsData;
  analysisType: 'basic' | 'location' | 'confidence' | 'price-adjusted';
}

// Response Types
interface VehicleMetricsResponse {
  vehicleMetrics: {
    retail: {
      supply: { value: number };
      demand: { value: number };
      marketCondition: { value: number };
      rating: { value: number };
      daysToSell: { value: number };
      locations?: Array<{
        advertiserId?: string;
        latitude?: number;
        longitude?: number;
        rating: { value: number };
        daysToSell: { value: number };
      }>;
      confidenceOfSale?: Array<{
        days: number;
        confidenceRating: 'MISSED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'NO_ANALYSIS';
      }>;
    };
  };
}

// POST method for enhanced vehicle metrics analysis
export async function POST(request: NextRequest) {
  console.log('📊 API Route: Enhanced vehicle metrics request received');

  try {
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access enhanced vehicle metrics',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'enhanced-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const body: EnhancedVehicleMetricsRequest = await request.json();
    console.log('📊 Enhanced metrics request:', {
      analysisType: body.analysisType,
      derivativeId: body.vehicle?.derivativeId,
      hasLocations: !!body.locations?.length,
      hasSaleTarget: !!body.saleTarget,
      hasFeatures: !!body.features?.length
    });

    // Validate required fields
    if (!body.vehicle || !body.vehicle.derivativeId || !body.analysisType) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Missing required fields',
        details: 'Vehicle data with derivativeId and analysisType are required',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'enhanced-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get user email for authentication
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'No email address found for the authenticated user',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'enhanced-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    // Get AutoTrader access token
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success || !authResult.access_token) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'AutoTrader authentication failed',
        details: 'Unable to obtain access token for vehicle metrics',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'enhanced-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Perform enhanced vehicle metrics analysis
    const metricsData = await performEnhancedVehicleMetrics(
      body,
      authResult.access_token
    );

    console.log('✅ Enhanced vehicle metrics analysis completed');

    return NextResponse.json(
      createSuccessResponse(metricsData, 'enhanced-vehicle-metrics')
    );

  } catch (error) {
    console.error('❌ Enhanced vehicle metrics error:', error);
    const internalError = createInternalErrorResponse(error, 'enhanced-vehicle-metrics');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// Main enhanced vehicle metrics analysis function
async function performEnhancedVehicleMetrics(
  request: EnhancedVehicleMetricsRequest,
  accessToken: string
): Promise<VehicleMetricsResponse> {
  const { vehicle, locations, saleTarget, features, adverts, analysisType } = request;

  console.log('🔍 Starting enhanced vehicle metrics analysis:', analysisType);

  const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
  const endpoint = `${baseUrl}/vehicle-metrics`;

  // Build request payload based on analysis type
  const basePayload: AutoTraderVehicleMetricsPayload = {
    vehicle: {
      derivativeId: vehicle.derivativeId,
      firstRegistrationDate: vehicle.firstRegistrationDate,
      odometerReadingMiles: vehicle.odometerReadingMiles
    }
  };

  // Add specific fields based on analysis type
  const payload: AutoTraderVehicleMetricsPayload = (() => {
    switch (analysisType) {
      case 'location':
        return {
          ...basePayload,
          ...(locations && locations.length > 0 && { locations })
        };
      
      case 'confidence':
        return {
          ...basePayload,
          ...(saleTarget && { saleTarget })
        };
      
      case 'price-adjusted':
        return {
          ...basePayload,
          ...(features && features.length > 0 && { features }),
          ...(adverts && { adverts })
        };
      
      case 'basic':
      default:
        // Basic analysis - no additional fields needed
        return basePayload;
    }
  })();

  console.log('📊 Sending request to AutoTrader:', {
    endpoint,
    analysisType,
    payloadKeys: Object.keys(payload)
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Vehicle metrics API failed with status ${response.status}:`, errorText);
      throw new Error(`Vehicle metrics API failed: ${response.status}`);
    }

    const data: VehicleMetricsResponse = await response.json();
    console.log('✅ Enhanced vehicle metrics data received:', {
      hasRating: !!data.vehicleMetrics?.retail?.rating,
      hasDaysToSell: !!data.vehicleMetrics?.retail?.daysToSell,
      hasLocations: !!data.vehicleMetrics?.retail?.locations?.length,
      hasConfidenceOfSale: !!data.vehicleMetrics?.retail?.confidenceOfSale?.length
    });

    return data;

  } catch (error) {
    console.error('❌ Enhanced vehicle metrics fetch error:', error);
    throw error;
  }
}


// GET method for enhanced vehicle metrics info
export async function GET() {
  console.log('📋 API Route: Enhanced vehicle metrics info request received');

  try {
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'enhanced-vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Return information about enhanced vehicle metrics
    const enhancedMetricsInfo = {
      analysis_types: {
        basic: {
          description: 'Basic vehicle metrics with rating and days to sell',
          required_fields: ['vehicle.derivativeId', 'vehicle.firstRegistrationDate', 'vehicle.odometerReadingMiles']
        },
        location: {
          description: 'Location-specific metrics by advertiser ID or coordinates',
          required_fields: ['vehicle', 'locations'],
          location_types: ['advertiserId', 'latitude/longitude']
        },
        confidence: {
          description: 'Confidence of sale analysis with target days',
          required_fields: ['vehicle', 'saleTarget.targetDaysToSell'],
          optional_fields: ['saleTarget.daysInStock']
        },
        'price-adjusted': {
          description: 'Price-adjusted metrics with features and pricing',
          required_fields: ['vehicle'],
          optional_fields: ['features', 'adverts.retailAdverts.price']
        }
      },
      response_structure: {
        vehicleMetrics: {
          retail: {
            supply: 'Market supply indicator',
            demand: 'Market demand indicator',
            marketCondition: 'Overall market condition',
            rating: 'Vehicle rating score',
            daysToSell: 'Estimated days to sell',
            locations: 'Location-specific metrics (when applicable)',
            confidenceOfSale: 'Confidence ratings for target days (when applicable)'
          }
        }
      },
      confidence_ratings: ['MISSED', 'LOW', 'MEDIUM', 'HIGH', 'NO_ANALYSIS']
    };

    return NextResponse.json(
      createSuccessResponse(enhancedMetricsInfo, 'enhanced-vehicle-metrics-info')
    );

  } catch (error) {
    console.error('❌ Enhanced vehicle metrics info error:', error);
    const internalError = createInternalErrorResponse(error, 'enhanced-vehicle-metrics-info');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
