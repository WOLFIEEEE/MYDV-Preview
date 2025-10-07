import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createErrorResponse, createInternalErrorResponse, ErrorType, parseAutoTraderError } from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { StockCacheService } from '@/lib/stockCacheService';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

interface VehicleUpdateRequest {
  vehicle?: {
    registration?: string;
    colour?: string;
    odometerReadingMiles?: number;
    plate?: string;
    yearOfRegistration?: string;
    firstRegistrationDate?: string;
  };
  features?: Array<{
    name: string;
    type?: string;
    standardName?: string;
    category?: string;
    rarityRating?: number | null;
    valueRating?: number | null;
  }>;
  highlights?: Array<{
    name: string;
  }>;
}

function validateVehicleUpdateRequest(body: unknown): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body is required' };
  }

  const bodyObj = body as Record<string, unknown>;

  // At least one section must be provided
  if (!bodyObj.vehicle && !bodyObj.features && !bodyObj.highlights) {
    return { isValid: false, error: 'At least one of vehicle, features, or highlights must be provided' };
  }

  // Validate vehicle section if provided
  if (bodyObj.vehicle && typeof bodyObj.vehicle !== 'object') {
    return { isValid: false, error: 'Vehicle data must be an object' };
  }

  // Validate features section if provided
  if (bodyObj.features) {
    if (!Array.isArray(bodyObj.features)) {
      return { isValid: false, error: 'Features must be an array' };
    }

    for (const feature of bodyObj.features) {
      if (!feature || typeof feature !== 'object') {
        return { isValid: false, error: 'Each feature must be an object' };
      }
      const featureObj = feature as Record<string, unknown>;
      if (!featureObj.name || typeof featureObj.name !== 'string') {
        return { isValid: false, error: 'Each feature must have a name' };
      }
    }
  }

  // Validate highlights section if provided
  if (bodyObj.highlights) {
    if (!Array.isArray(bodyObj.highlights)) {
      return { isValid: false, error: 'Highlights must be an array' };
    }

    for (const highlight of bodyObj.highlights) {
      if (!highlight || typeof highlight !== 'object') {
        return { isValid: false, error: 'Each highlight must be an object' };
      }
      const highlightObj = highlight as Record<string, unknown>;
      if (!highlightObj.name || typeof highlightObj.name !== 'string') {
        return { isValid: false, error: 'Each highlight must have a name' };
      }
    }
  }

  return { isValid: true };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  console.log('🚀 Vehicle PATCH route started');
  
  try {
    // Authentication
    console.log('🔐 Checking authentication...');
    const user = await currentUser();
    if (!user) {
      console.log('❌ Authentication failed - no user found');
      return NextResponse.json(createErrorResponse({
        type: ErrorType.AUTHENTICATION,
        message: 'Authentication required',
        details: 'Please sign in to access this endpoint',
        httpStatus: 401,
        timestamp: new Date().toISOString()
      }), { status: 401 });
    }
    console.log('✅ User authenticated:', { userId: user.id, email: user.emailAddresses?.[0]?.emailAddress });

    // Extract parameters
    console.log('📋 Extracting parameters...');
    const { stockId } = await params;
    const { searchParams } = new URL(request.url);
    const advertiserId = searchParams.get('advertiserId');
    
    console.log('📊 Request parameters:', { stockId, advertiserId, url: request.url });

    if (!advertiserId) {
      console.log('❌ Missing advertiserId parameter');
      return NextResponse.json(createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'advertiserId is required as a query parameter',
        httpStatus: 400,
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }

    // Parse and validate request body
    console.log('📝 Parsing request body...');
    let requestBody: VehicleUpdateRequest;
    try {
      requestBody = await request.json();
      console.log('✅ Request body parsed:', JSON.stringify(requestBody, null, 2));
    } catch (error) {
      console.log('❌ Failed to parse request body:', error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid JSON in request body',
        httpStatus: 400,
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }

    console.log('🔍 Validating request body...');
    const validationResult = validateVehicleUpdateRequest(requestBody);
    if (!validationResult.isValid) {
      console.log('❌ Request body validation failed:', validationResult.error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.VALIDATION,
        message: validationResult.error || 'Invalid request body',
        httpStatus: 400,
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }
    console.log('✅ Request body validation passed');

    // Get original stock data for comparison
    console.log('🗄️ Fetching original stock data from cache...');
    let originalStock;
    try {
      originalStock = await StockCacheService.getStockById(stockId, user.id);
      console.log('✅ Stock data fetched successfully:', originalStock ? 'Found' : 'Not found');
      if (originalStock) {
        console.log('📋 Original stock summary:', {
          stockId: originalStock.stockId,
          make: originalStock.make,
          model: originalStock.model,
          registration: originalStock.registration,
          hasVehicleData: !!originalStock.vehicleData,
          hasFeaturesData: !!originalStock.featuresData,
          hasHighlightsData: !!originalStock.highlightsData
        });
      }
    } catch (error) {
      console.error('❌ Error fetching stock from cache:', error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.SERVER_ERROR,
        message: 'Failed to fetch stock data',
        details: error instanceof Error ? error.message : 'Unknown error',
        httpStatus: 500,
        timestamp: new Date().toISOString()
      }), { status: 500 });
    }

    if (!originalStock) {
      console.log('❌ Stock not found in cache');
      return NextResponse.json(createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Stock not found',
        httpStatus: 404,
        timestamp: new Date().toISOString()
      }), { status: 404 });
    }

    // Parse original data
    console.log('🔄 Parsing original data...');
    const originalVehicleData = originalStock.vehicleData || originalStock.vehicle || {};
    const originalFeaturesData = originalStock.featuresData || originalStock.features || [];
    const originalHighlightsData = originalStock.highlightsData || originalStock.highlights || [];
    
    console.log('📊 Original data summary:', {
      vehicleDataKeys: Object.keys(originalVehicleData),
      featuresCount: Array.isArray(originalFeaturesData) ? originalFeaturesData.length : 0,
      highlightsCount: Array.isArray(originalHighlightsData) ? originalHighlightsData.length : 0
    });

    // Build payload with only changed values
    console.log('🔨 Building payload with changed values...');
    const payload: Record<string, unknown> = {};

    // Process vehicle data changes
    if (requestBody.vehicle) {
      const vehicleChanges: Record<string, unknown> = {};
      const editableFields = ['registration', 'colour', 'odometerReadingMiles', 'plate', 'yearOfRegistration'];

      for (const [key, value] of Object.entries(requestBody.vehicle)) {
        if (value === '' || value === null || value === undefined || !editableFields.includes(key)) {
          continue;
        }

        let originalValue = originalVehicleData[key];
        let newValue = value;

        // Handle special cases
        if (key === 'odometerReadingMiles') {
          newValue = parseInt(value as string, 10);
        } else if (key === 'yearOfRegistration') {
          // Extract original registration date to retain month/day if possible
          const originalDate = originalVehicleData['firstRegistrationDate'] || '2000-01-01';
          const monthDay = originalDate.substring(4); // Get -MM-DD part
          const newDate = `${value}${monthDay}`;
          originalValue = originalVehicleData['firstRegistrationDate'] || '';
          newValue = newDate;
          
          if (originalValue !== newValue) {
            vehicleChanges['firstRegistrationDate'] = newValue;
          }
          continue; // Skip the normal processing for this field
        } else {
          newValue = String(value).trim();
        }

        // Only add to payload if value has changed
        if (originalValue !== newValue) {
          vehicleChanges[key] = newValue;
        }
      }

      if (Object.keys(vehicleChanges).length > 0) {
        payload.vehicle = vehicleChanges;
      }
    }

    // Process features changes
    if (requestBody.features) {
      const originalFeatureNames = originalFeaturesData.map((f: { name: string }) => f.name).sort();
      const newFeatureNames = requestBody.features.map(f => f.name).sort();

      if (JSON.stringify(originalFeatureNames) !== JSON.stringify(newFeatureNames)) {
        payload.features = requestBody.features.map(feature => ({
          name: feature.name,
          type: feature.type || 'Optional',
          standardName: feature.standardName || feature.name,
          category: feature.category || 'Custom Features',
          rarityRating: feature.rarityRating || null,
          valueRating: feature.valueRating || null
        }));
      }
    }

    // Process highlights changes
    if (requestBody.highlights) {
      const originalHighlightNames = originalHighlightsData.map((h: { name: string }) => h.name).sort();
      const newHighlightNames = requestBody.highlights.map(h => h.name).sort();

      if (JSON.stringify(originalHighlightNames) !== JSON.stringify(newHighlightNames)) {
        payload.highlights = requestBody.highlights;
      }
    }

    // Check if there are any changes
    console.log('🔍 Checking for changes...');
    console.log('📦 Final payload:', JSON.stringify(payload, null, 2));
    
    if (Object.keys(payload).length === 0) {
      console.log('⚠️ No changes detected in payload');
      return NextResponse.json({
        success: false,
        message: 'No changes detected'
      }, { status: 400 });
    }
    
    console.log('✅ Changes detected, proceeding with AutoTrader API call');

    // Get AutoTrader authentication
    console.log('🔑 Getting AutoTrader authentication token...');
    const userEmail = user.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      console.log('❌ No email address found for user');
      const errorResponse = createInternalErrorResponse('User email address not found');
      return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
    }
    
    const tokenResult = await getAutoTraderToken(userEmail);
    if (!tokenResult.success) {
      console.log('❌ Failed to get AutoTrader token:', tokenResult);
      const errorResponse = createInternalErrorResponse('Failed to authenticate with AutoTrader API');
      return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
    }
    console.log('✅ AutoTrader token obtained successfully');

    // Make API call to AutoTrader
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const autoTraderUrl = `${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`;
    
    console.log('🌐 AutoTrader API call details:', {
      method: 'PATCH',
      url: autoTraderUrl,
      baseUrl,
      stockId,
      advertiserId,
      payloadSize: JSON.stringify(payload).length,
      hasToken: !!tokenResult.access_token
    });
    
    console.log('📤 Sending payload to AutoTrader:', JSON.stringify(payload, null, 2));

    console.log('⏳ Making AutoTrader API request...');
    const autoTraderResponse = await fetch(autoTraderUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenResult.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 AutoTrader API response received:', {
      status: autoTraderResponse.status,
      statusText: autoTraderResponse.statusText,
      ok: autoTraderResponse.ok,
      headers: Object.fromEntries(autoTraderResponse.headers.entries())
    });

    if (!autoTraderResponse.ok) {
      const errorText = await autoTraderResponse.text();
      console.error('❌ AutoTrader API Error:', {
        status: autoTraderResponse.status,
        statusText: autoTraderResponse.statusText,
        body: errorText,
        url: autoTraderUrl,
        payload: JSON.stringify(payload)
      });

      const errorResponse = await parseAutoTraderError(autoTraderResponse, autoTraderUrl);
      return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
    }
    
    console.log('✅ AutoTrader API call successful');

    // Update cache if successful
    console.log('💾 Updating stock cache...');
    try {
      const cacheUpdates: Record<string, unknown> = {
        updatedAt: new Date()
      };

      if (payload.vehicle) {
        cacheUpdates.vehicleData = { ...originalVehicleData, ...payload.vehicle };
        console.log('🔄 Updating vehicle data in cache');
      }
      if (payload.features) {
        cacheUpdates.featuresData = payload.features;
        console.log('🔄 Updating features data in cache');
      }
      if (payload.highlights) {
        cacheUpdates.highlightsData = payload.highlights;
        console.log('🔄 Updating highlights data in cache');
      }

      console.log('💾 Cache updates to apply:', Object.keys(cacheUpdates));
      await StockCacheService.updateStockCache(stockId, cacheUpdates);
      console.log('✅ Stock cache updated successfully');
    } catch (cacheError) {
      console.warn('⚠️ Failed to update stock cache:', cacheError);
      // Don't fail the request if cache update fails - continue with success response
    }

    console.log('🎉 Vehicle update completed successfully');
    const successResponse = NextResponse.json({
      success: true,
      message: 'Vehicle details updated successfully',
      data: {
        stockId,
        advertiserId,
        updatedSections: Object.keys(payload),
        updatedAt: new Date().toISOString()
      }
    });
    
    console.log('📤 Returning success response:', {
      success: true,
      updatedSections: Object.keys(payload),
      stockId,
      advertiserId
    });
    
    return successResponse;

  } catch (error) {
    console.error('❌ Vehicle update error (caught in main try-catch):', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const errorResponse = createInternalErrorResponse('An unexpected error occurred while updating vehicle details');
    console.log('📤 Returning error response due to exception');
    return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
  }
}

