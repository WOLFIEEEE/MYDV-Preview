import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  parseAutoTraderError, 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Helper function for parameter validation errors
function createParameterValidationError(parameter: string, description: string) {
  return {
    type: ErrorType.VALIDATION,
    message: `${parameter} is required for ${description}`,
    details: `Missing required parameter: ${parameter}`,
    httpStatus: 400,
    timestamp: new Date().toISOString(),
    endpoint: 'taxonomy'
  };
}

export async function GET(request: NextRequest) {
  console.log('📊 API Route: Taxonomy request received');

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
        endpoint: 'taxonomy'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'No email address found for the authenticated user',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'taxonomy'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    // Get the correct email to use (store owner's email for team members)
    const configResult = await getStoreConfigForUser(user.id, userEmail);
    let email: string;
    
    if (configResult.success && configResult.storeOwnerEmail) {
      email = configResult.storeOwnerEmail;
      console.log('👥 Using store owner email for taxonomy:', email);
    } else {
      email = userEmail;
      console.log('🏢 Using own email for taxonomy:', email);
    }

    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const type = searchParams.get('type'); // makes, models, derivatives, bodyTypes, fuelTypes, etc.
    const makeId = searchParams.get('makeId');
    const modelId = searchParams.get('modelId');
    const vehicleType = searchParams.get('vehicleType') || 'Car';

    console.log('📋 Taxonomy parameters:', {
      type,
      makeId,
      modelId,
      vehicleType,
    });

    if (!type) {
      return NextResponse.json(
        { error: 'Taxonomy type must be provided (vehicleTypes, makes, models, derivatives, bodyTypes, fuelTypes, transmissionTypes)' },
        { status: 400 }
      );
    }

    // Get user's store configuration for advertiser ID
    const storeConfigResult = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, email))
      .limit(1);

    let advertiserId: string;
    if (storeConfigResult.length > 0 && storeConfigResult[0].primaryAdvertisementId) {
      advertiserId = storeConfigResult[0].primaryAdvertisementId;
    } else {
      // Fallback to environment variables
      advertiserId = process.env.ADVERTISER_ID || 
                   process.env.NEXT_PUBLIC_ADVERTISER_ID || 
                   '10028737'; // Default fallback
    }

    // Get authentication token
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Failed to authenticate with AutoTrader',
        details: typeof authResult.error === 'string' ? authResult.error : 'Authentication failed',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'taxonomy'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const baseUrl = getAutoTraderBaseUrlForServer();

    // Build taxonomy URL based on type
    console.log('🔍 Fetching taxonomy data...');

    let taxonomyPath = '';
    const taxonomyParams = new URLSearchParams();

    switch (type) {
      case 'vehicleTypes':
        taxonomyPath = '/taxonomy/vehicleTypes';
        taxonomyParams.append('advertiserId', advertiserId);
        break;
      case 'makes':
        taxonomyPath = '/taxonomy/makes';
        taxonomyParams.append('advertiserId', advertiserId);
        if (vehicleType) taxonomyParams.append('vehicleType', vehicleType);
        break;
      case 'models':
        if (!makeId) {
          const error = createParameterValidationError('makeId', 'models');
          return NextResponse.json(createErrorResponse(error), { status: 400 });
        }
        taxonomyPath = '/taxonomy/models';
        taxonomyParams.append('advertiserId', advertiserId);
        taxonomyParams.append('makeId', makeId);
        if (vehicleType) taxonomyParams.append('vehicleType', vehicleType);
        break;
      case 'generations':
        if (!modelId) {
          const error = createParameterValidationError('modelId', 'generations');
          return NextResponse.json(createErrorResponse(error), { status: 400 });
        }
        taxonomyPath = '/taxonomy/generations';
        taxonomyParams.append('advertiserId', advertiserId);
        taxonomyParams.append('modelId', modelId);
        break;
      case 'derivatives':
        const generationId = searchParams.get('generationId');
        if (!generationId) {
          const error = createParameterValidationError('generationId', 'derivatives');
          return NextResponse.json(createErrorResponse(error), { status: 400 });
        }
        taxonomyPath = '/taxonomy/derivatives';
        taxonomyParams.append('advertiserId', advertiserId);
        taxonomyParams.append('generationId', generationId);
        
        // Add facet filters
        const facetParams = ['trim', 'badgeEngineSize', 'fuelType', 'transmission', 'doors', 'drivetrain', 'bodyType'];
        facetParams.forEach(param => {
          const value = searchParams.get(param);
          if (value && value !== 'any') {
            taxonomyParams.append(param, value);
          }
        });
        break;
      case 'trims':
        const trimGenerationId = searchParams.get('generationId');
        if (!trimGenerationId) {
          return NextResponse.json({ error: 'generationId is required for trims' }, { status: 400 });
        }
        taxonomyPath = '/taxonomy/trims';
        taxonomyParams.append('advertiserId', advertiserId);
        taxonomyParams.append('generationId', trimGenerationId);
        break;
      case 'badgeEngineSizes':
        const engineGenerationId = searchParams.get('generationId');
        if (!engineGenerationId) {
          return NextResponse.json({ error: 'generationId is required for badgeEngineSizes' }, { status: 400 });
        }
        taxonomyPath = '/taxonomy/badgeEngineSizes';
        taxonomyParams.append('advertiserId', advertiserId);
        taxonomyParams.append('generationId', engineGenerationId);
        break;
      case 'doors':
        const doorGenerationId = searchParams.get('generationId');
        if (!doorGenerationId) {
          return NextResponse.json({ error: 'generationId is required for doors' }, { status: 400 });
        }
        taxonomyPath = '/taxonomy/doors';
        taxonomyParams.append('advertiserId', advertiserId);
        taxonomyParams.append('generationId', doorGenerationId);
        break;
      case 'drivetrains':
        const drivetrainGenerationId = searchParams.get('generationId');
        if (!drivetrainGenerationId) {
          return NextResponse.json({ error: 'generationId is required for drivetrains' }, { status: 400 });
        }
        taxonomyPath = '/taxonomy/drivetrains';
        taxonomyParams.append('advertiserId', advertiserId);
        taxonomyParams.append('generationId', drivetrainGenerationId);
        break;
      case 'bodyTypes':
        taxonomyPath = '/taxonomy/bodyTypes';
        taxonomyParams.append('advertiserId', advertiserId);
        if (vehicleType) taxonomyParams.append('vehicleType', vehicleType);
        break;
      case 'fuelTypes':
        taxonomyPath = '/taxonomy/fuelTypes';
        taxonomyParams.append('advertiserId', advertiserId);
        if (vehicleType) taxonomyParams.append('vehicleType', vehicleType);
        break;
      case 'transmissionTypes':
        taxonomyPath = '/taxonomy/transmissionTypes';
        taxonomyParams.append('advertiserId', advertiserId);
        if (vehicleType) taxonomyParams.append('vehicleType', vehicleType);
        break;
      default:
        const validationError = {
          type: ErrorType.VALIDATION,
          message: 'Invalid taxonomy type',
          details: `Supported types: vehicleTypes, makes, models, generations, derivatives, trims, badgeEngineSizes, doors, drivetrains, bodyTypes, fuelTypes, transmissionTypes`,
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'taxonomy'
        };
        return NextResponse.json(
          createErrorResponse(validationError),
          { status: 400 }
        );
    }

    const taxonomyUrl = `${baseUrl}${taxonomyPath}?${taxonomyParams.toString()}`;
    console.log('📡 Making taxonomy request to:', taxonomyUrl);

    const taxonomyResponse = await fetch(taxonomyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token!}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📨 Taxonomy API response status:', taxonomyResponse.status);

    if (!taxonomyResponse.ok) {
      const error = await parseAutoTraderError(taxonomyResponse, 'taxonomy');
      console.error('❌ Taxonomy request failed:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const taxonomyData = await taxonomyResponse.json();
    console.log('✅ Taxonomy request successful');
    
    // Extract the correct property from the response based on the type
    let extractedData;
    switch (type) {
      case 'vehicleTypes':
        extractedData = taxonomyData.vehicleTypes || [];
        break;
      case 'makes':
        extractedData = taxonomyData.makes || [];
        break;
      case 'models':
        extractedData = taxonomyData.models || [];
        break;
      case 'generations':
        extractedData = taxonomyData.generations || [];
        break;
      case 'derivatives':
        extractedData = taxonomyData.derivatives || [];
        break;
      case 'trims':
        extractedData = taxonomyData.trims || [];
        break;
      case 'badgeEngineSizes':
        extractedData = taxonomyData.badgeEngineSizes || [];
        break;
      case 'doors':
        extractedData = taxonomyData.doors || [];
        break;
      case 'drivetrains':
        extractedData = taxonomyData.drivetrains || [];
        break;
      case 'bodyTypes':
        extractedData = taxonomyData.bodyTypes || [];
        break;
      case 'fuelTypes':
        extractedData = taxonomyData.fuelTypes || [];
        break;
      case 'transmissionTypes':
        extractedData = taxonomyData.transmissionTypes || [];
        break;
      default:
        extractedData = [];
    }
    
    console.log('📄 Found', Array.isArray(extractedData) ? extractedData.length : 'unknown', 'items');
    console.log('📄 Sample data:', extractedData.slice(0, 2));

    return NextResponse.json(
      createSuccessResponse(extractedData, 'taxonomy')
    );

  } catch (error) {
    console.error('❌ API Route taxonomy error:', error);
    const internalError = createInternalErrorResponse(error, 'taxonomy');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
