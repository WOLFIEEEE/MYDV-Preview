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
import { getAdvertiserId, logAdvertiserIdResolution } from '@/lib/advertiserIdResolver';
import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

export async function GET(request: NextRequest) {
  console.log('🚗 API Route: Vehicle lookup request received');

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
        endpoint: 'vehicles'
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
        endpoint: 'vehicles'
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
      console.log('👥 Using store owner email for vehicle lookup:', email);
    } else {
      email = userEmail;
      console.log('🏢 Using own email for vehicle lookup:', email);
    }

    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const registration = searchParams.get('registration');
    const vin = searchParams.get('vin');
    const odometerReadingMiles = searchParams.get('odometerReadingMiles');
    const motTests = searchParams.get('motTests') === 'true';
    const features = searchParams.get('features') === 'true';
    const history = searchParams.get('history') === 'true';
    const chargeTimes = searchParams.get('chargeTimes') === 'true';
    const fullVehicleCheck = searchParams.get('fullVehicleCheck') === 'true';
    const vehicleMetrics = searchParams.get('vehicleMetrics') === 'true';
    const valuations = searchParams.get('valuations') === 'true';

    console.log('📋 Vehicle lookup parameters:', {
      email,
      registration,
      vin,
      odometerReadingMiles,
      motTests,
      features,
      history,
      chargeTimes,
      fullVehicleCheck,
      vehicleMetrics,
      valuations,
    });

    if (!registration && !vin) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Either registration or VIN must be provided',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicles'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get authentication token and store config (cached or fresh)
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      return NextResponse.json(authResult.error, { status: 401 });
    }

    // Get store configuration from database for advertiser ID
    console.log('🔍 Looking up store config for advertiser ID...');
    const storeConfigResult = await db
      .select({
        advertisementId: storeConfig.advertisementId,
        primaryAdvertisementId: storeConfig.primaryAdvertisementId,
        storeName: storeConfig.storeName
      })
      .from(storeConfig)
      .where(eq(storeConfig.email, email))
      .limit(1);

    if (storeConfigResult.length === 0) {
      const configError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Store configuration not found',
        details: `No store configuration found for email: ${email}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicles'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    const userStoreConfig = storeConfigResult[0];
    
    // Use standardized advertiser ID resolution
    const advertiserId = getAdvertiserId(userStoreConfig);
    logAdvertiserIdResolution(userStoreConfig, 'vehicles/route');
    
    if (!advertiserId) {
      const configError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Missing advertiser ID in store configuration',
        details: `No advertisement ID configured for store: ${userStoreConfig.storeName}`,
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicles'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 401 }
      );
    }

    // Get base URL from environment variables
    const baseUrl = getAutoTraderBaseUrlForServer();
    console.log('🔍 Using base URL:', baseUrl);
    console.log('🏪 Store config found for:', userStoreConfig.storeName);
    console.log('📢 Using advertiser ID:', advertiserId);

    // Build vehicle lookup request
    console.log('🚗 Making vehicle lookup request...');

    const vehicleParams = new URLSearchParams();
    vehicleParams.append('advertiserId', advertiserId);

    if (registration) vehicleParams.append('registration', registration);
    if (vin) vehicleParams.append('vin', vin);
    if (odometerReadingMiles) vehicleParams.append('odometerReadingMiles', odometerReadingMiles);
    if (motTests) vehicleParams.append('motTests', 'true');
    if (features) vehicleParams.append('features', 'true');
    if (history) vehicleParams.append('history', 'true');
    if (chargeTimes) vehicleParams.append('chargeTimes', 'true');
    if (fullVehicleCheck) vehicleParams.append('fullVehicleCheck', 'true');
    if (vehicleMetrics) vehicleParams.append('vehicleMetrics', 'true');
    if (valuations) vehicleParams.append('valuations', 'true');
    vehicleParams.append('competitors', 'true'); // ✅ FIXED: Added competitors parameter
    vehicleParams.append('vehicleMetrics', 'true'); // ✅ NEW: Always include vehicle metrics

    const vehicleUrl = `${baseUrl}/vehicles?${vehicleParams.toString()}`;
    console.log('📡 Making vehicle request to:', vehicleUrl);
    console.log('🔍 Features parameter included:', features);
    console.log('📋 All parameters:', Object.fromEntries(vehicleParams.entries()));

    const vehicleResponse = await fetch(vehicleUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📨 Vehicle API response status:', vehicleResponse.status);

    if (!vehicleResponse.ok) {
      const error = await parseAutoTraderError(vehicleResponse, 'vehicles');
      console.error('❌ Vehicle lookup failed:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const vehicleData = await vehicleResponse.json();
    console.log('✅ Vehicle lookup successful');
    
    // Debug: Check complete AutoTrader response structure
    console.log('🔍 AutoTrader Response Structure:', {
      hasVehicle: !!vehicleData.vehicle,
      hasValuations: !!vehicleData.valuations,
      hasVehicleMetrics: !!vehicleData.vehicleMetrics,
      topLevelKeys: Object.keys(vehicleData),
      vehicleKeys: vehicleData.vehicle ? Object.keys(vehicleData.vehicle) : []
    });
    
    // Debug: Log valuation data specifically
    if (vehicleData.valuations) {
      console.log('💰 AutoTrader Valuations Found:', {
        retailValue: vehicleData.valuations.retail?.amountGBP,
        privateValue: vehicleData.valuations.private?.amountGBP,
        partExchangeValue: vehicleData.valuations.partExchange?.amountGBP,
        tradeValue: vehicleData.valuations.trade?.amountGBP,
        rawValuations: vehicleData.valuations
      });
    } else {
      console.log('❌ No valuations in AutoTrader response');
    }
    
    if (vehicleData.vehicle) {
      console.log('🚗 Vehicle found:', {
        registration: vehicleData.vehicle.registration,
        make: vehicleData.vehicle.make,
        model: vehicleData.vehicle.model,
      });
      
      // Debug: Check features in AutoTrader response
      console.log('🎯 AutoTrader Response - Features Analysis:', {
        hasFeatures: !!vehicleData.vehicle.features,
        featuresType: typeof vehicleData.vehicle.features,
        featuresLength: vehicleData.vehicle.features?.length || 0,
        featuresIsArray: Array.isArray(vehicleData.vehicle.features),
        vehicleKeys: Object.keys(vehicleData.vehicle)
      });
      
      if (vehicleData.vehicle.features && vehicleData.vehicle.features.length > 0) {
        console.log('📋 AutoTrader Features Sample:', vehicleData.vehicle.features.slice(0, 2));
      } else {
        console.log('❌ No features in AutoTrader response');
      }
    }

    // Return success response with standardized format
    return NextResponse.json(
      createSuccessResponse(vehicleData, 'vehicles')
    );

  } catch (error) {
    console.error('❌ API Route vehicle error:', error);
    const internalError = createInternalErrorResponse(error, 'vehicles');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
} 