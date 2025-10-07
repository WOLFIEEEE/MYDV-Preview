import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createErrorResponse, createInternalErrorResponse, ErrorType, parseAutoTraderError } from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { StockCacheService } from '@/lib/stockCacheService';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

interface Feature {
  name: string;
  type?: string;
  standardName?: string;
  category?: string;
  rarityRating?: number | null;
  valueRating?: number | null;
}

interface FeaturesUpdateRequest {
  features: Feature[];
  customFeatures?: string[];
}

function validateFeaturesUpdateRequest(body: unknown): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body is required' };
  }

  const bodyObj = body as Record<string, unknown>;

  if (!bodyObj.features || !Array.isArray(bodyObj.features)) {
    return { isValid: false, error: 'Features array is required' };
  }

  // Validate each feature
  for (const feature of bodyObj.features) {
    if (!feature || typeof feature !== 'object') {
      return { isValid: false, error: 'Each feature must be an object' };
    }

    const featureObj = feature as Record<string, unknown>;
    if (!featureObj.name || typeof featureObj.name !== 'string') {
      return { isValid: false, error: 'Each feature must have a name' };
    }
  }

  return { isValid: true };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    // Authentication
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

    // Extract parameters
    const { stockId } = await params;
    const { searchParams } = new URL(request.url);
    const advertiserId = searchParams.get('advertiserId');

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
    let requestBody: FeaturesUpdateRequest;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.log('❌ Failed to parse request body:', error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid JSON in request body',
        httpStatus: 400,
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }

    const validationResult = validateFeaturesUpdateRequest(requestBody);
    if (!validationResult.isValid) {
      console.log('❌ Request body validation failed:', validationResult.error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.VALIDATION,
        message: validationResult.error || 'Invalid request body',
        httpStatus: 400,
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }

    // Get original stock data for comparison
    let originalStock;
    try {
      originalStock = await StockCacheService.getStockById(stockId, user.id);
    } catch (error) {
      console.error('Error fetching stock from cache:', error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.SERVER_ERROR,
        message: 'Failed to fetch stock data',
        details: error instanceof Error ? error.message : 'Unknown error',
        httpStatus: 500,
        timestamp: new Date().toISOString()
      }), { status: 500 });
    }

    if (!originalStock) {
      return NextResponse.json(createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Stock not found',
        httpStatus: 404,
        timestamp: new Date().toISOString()
      }), { status: 404 });
    }

    // Compare features to detect changes
    const originalFeatures = originalStock.featuresData || originalStock.features || [];
    const originalFeatureNames = originalFeatures.map((f: Feature) => f.name).sort();
    const newFeatureNames = requestBody.features.map(f => f.name).sort();

    // Check if features have changed
    const featuresChanged = JSON.stringify(originalFeatureNames) !== JSON.stringify(newFeatureNames);

    if (!featuresChanged) {
      return NextResponse.json({
        success: false,
        message: 'No changes detected in features'
      }, { status: 400 });
    }

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

    // Prepare payload for AutoTrader API
    const payload = {
      features: requestBody.features
    };

    // Make API call to AutoTrader
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const autoTraderUrl = `${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`;

    const autoTraderResponse = await fetch(autoTraderUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenResult.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!autoTraderResponse.ok) {
      const errorText = await autoTraderResponse.text();
      console.error('AutoTrader API Error:', {
        status: autoTraderResponse.status,
        statusText: autoTraderResponse.statusText,
        body: errorText,
        url: autoTraderUrl,
        payload: JSON.stringify(payload)
      });

      const errorResponse = await parseAutoTraderError(autoTraderResponse, autoTraderUrl);
      return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
    }

    // Update cache if successful
    try {
      await StockCacheService.updateStockCache(stockId, {
        featuresData: requestBody.features,
        updatedAt: new Date()
      });
    } catch (cacheError) {
      console.warn('Failed to update stock cache:', cacheError);
      // Don't fail the request if cache update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Features updated successfully',
      data: {
        stockId,
        advertiserId,
        featuresCount: requestBody.features.length,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Features update error (caught in main try-catch):', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const errorResponse = createInternalErrorResponse('An unexpected error occurred while updating features');
    console.log('📤 Returning error response due to exception');
    return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
  }
}

