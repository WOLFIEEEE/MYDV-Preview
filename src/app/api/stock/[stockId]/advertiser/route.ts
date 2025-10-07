import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createErrorResponse, createInternalErrorResponse, ErrorType, parseAutoTraderError } from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { StockCacheService } from '@/lib/stockCacheService';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

interface AdvertiserUpdateRequest {
  advertiser: {
    name?: string;
    segment?: string;
    website?: string;
    phone?: string;
    location?: {
      addressLineOne?: string;
      town?: string;
      county?: string;
      region?: string;
      postCode?: string;
      latitude?: number;
      longitude?: number;
    };
    advertStrapline?: string;
  };
}

function validateAdvertiserUpdateRequest(body: unknown): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body is required' };
  }

  const bodyObj = body as Record<string, unknown>;

  if (!bodyObj.advertiser || typeof bodyObj.advertiser !== 'object') {
    return { isValid: false, error: 'Advertiser data is required and must be an object' };
  }

  const advertiser = bodyObj.advertiser as Record<string, unknown>;

  // Validate location if provided
  if (advertiser.location && typeof advertiser.location !== 'object') {
    return { isValid: false, error: 'Location must be an object' };
  }

  // Validate latitude and longitude if provided
  if (advertiser.location) {
    const location = advertiser.location as Record<string, unknown>;
    if (location.latitude !== undefined && typeof location.latitude !== 'number') {
      return { isValid: false, error: 'Latitude must be a number' };
    }
    if (location.longitude !== undefined && typeof location.longitude !== 'number') {
      return { isValid: false, error: 'Longitude must be a number' };
    }
  }

  return { isValid: true };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
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
    let requestBody: AdvertiserUpdateRequest;
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

    const validationResult = validateAdvertiserUpdateRequest(requestBody);
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

    // Parse original advertiser data
    const originalAdvertiserData = originalStock.advertiserData || originalStock.advertiser || {};

    // Build advertiser data payload with sanitized values
    const advertiserData: Record<string, unknown> = {};

    // Process basic fields
    if (requestBody.advertiser.name !== undefined) {
      const sanitizedName = String(requestBody.advertiser.name).trim();
      if (sanitizedName !== (originalAdvertiserData.name || '')) {
        advertiserData.name = sanitizedName;
      }
    }

    if (requestBody.advertiser.segment !== undefined) {
      const sanitizedSegment = String(requestBody.advertiser.segment).trim();
      if (sanitizedSegment !== (originalAdvertiserData.segment || '')) {
        advertiserData.segment = sanitizedSegment;
      }
    }

    if (requestBody.advertiser.website !== undefined) {
      const website = String(requestBody.advertiser.website).trim();
      // Validate URL format if not empty
      if (website && !isValidUrl(website)) {
        return NextResponse.json(createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid website URL format',
          httpStatus: 400,
          timestamp: new Date().toISOString()
        }), { status: 400 });
      }
      if (website !== (originalAdvertiserData.website || '')) {
        advertiserData.website = website;
      }
    }

    if (requestBody.advertiser.phone !== undefined) {
      const sanitizedPhone = String(requestBody.advertiser.phone).trim();
      if (sanitizedPhone !== (originalAdvertiserData.phone || '')) {
        advertiserData.phone = sanitizedPhone;
      }
    }

    if (requestBody.advertiser.advertStrapline !== undefined) {
      const sanitizedStrapline = String(requestBody.advertiser.advertStrapline).trim();
      if (sanitizedStrapline !== (originalAdvertiserData.advertStrapline || '')) {
        advertiserData.advertStrapline = sanitizedStrapline;
      }
    }

    // Process location data
    if (requestBody.advertiser.location) {
      const locationChanges: Record<string, unknown> = {};
      const originalLocation = originalAdvertiserData.location || {};

      const locationFields = [
        'addressLineOne', 'town', 'county', 'region', 'postCode'
      ];

      for (const field of locationFields) {
        if (requestBody.advertiser.location[field as keyof typeof requestBody.advertiser.location] !== undefined) {
          const newValue = String(requestBody.advertiser.location[field as keyof typeof requestBody.advertiser.location]).trim();
          const originalValue = originalLocation[field] || '';
          if (newValue !== originalValue) {
            locationChanges[field] = newValue;
          }
        }
      }

      // Handle latitude and longitude
      if (requestBody.advertiser.location.latitude !== undefined) {
        const newValue = Number(requestBody.advertiser.location.latitude);
        const originalValue = Number(originalLocation.latitude || 0);
        if (newValue !== originalValue) {
          locationChanges.latitude = newValue;
        }
      }

      if (requestBody.advertiser.location.longitude !== undefined) {
        const newValue = Number(requestBody.advertiser.location.longitude);
        const originalValue = Number(originalLocation.longitude || 0);
        if (newValue !== originalValue) {
          locationChanges.longitude = newValue;
        }
      }

      if (Object.keys(locationChanges).length > 0) {
        advertiserData.location = { ...originalLocation, ...locationChanges };
      }
    }

    // Check if there are any changes
    if (Object.keys(advertiserData).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No changes detected in advertiser data'
      }, { status: 400 });
    }

    // Prepare payload for AutoTrader API
    const payload = {
      advertiser: advertiserData
    };

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
        advertiserData: { ...originalAdvertiserData, ...advertiserData },
        updatedAt: new Date()
      });
    } catch (cacheError) {
      console.warn('Failed to update stock cache:', cacheError);
      // Don't fail the request if cache update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Advertiser data updated successfully',
      data: {
        stockId,
        advertiserId,
        updatedFields: Object.keys(advertiserData),
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Advertiser update error (caught in main try-catch):', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const errorResponse = createInternalErrorResponse('An unexpected error occurred while updating advertiser data');
    console.log('📤 Returning error response due to exception');
    return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
  }
}

