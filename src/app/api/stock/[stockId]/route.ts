import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { StockCacheService } from '@/lib/stockCacheService';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Force dynamic rendering - prevent static optimization and caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET handler to fetch individual stock item details from database only
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  console.log('📖 API Route: Get stock details request received (database-only)');

  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('❌ User not authenticated');
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication required',
          details: 'Please sign in to access stock data',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
        }),
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Await the params to get stockId
    const resolvedParams = await params;
    const { stockId } = resolvedParams;

    if (!stockId) {
      console.log('❌ Stock ID not provided');
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Stock ID required',
          details: 'Stock ID parameter is missing from the request',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    console.log('🔍 Looking up stock:', stockId);

    // Get stock data from cache (database-only approach)
    const stockData = await StockCacheService.getStockById(stockId, user.id);

    if (!stockData) {
      console.log('❌ Stock not found in cache:', stockId);
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.NOT_FOUND,
          message: 'Stock not found',
          details: `Stock with ID ${stockId} was not found. It may have been removed or you may not have access to it. Try refreshing your stock list first.`,
          httpStatus: 404,
          timestamp: new Date().toISOString(),
        }),
        { status: 404 }
      );
    }

    console.log('✅ Successfully retrieved stock from cache:', stockId);
    console.log('📊 Cache metadata:', {
      lastFetched: stockData._cacheMetadata?.lastFetched,
      isStale: stockData._cacheMetadata?.isStale,
      cacheAge: `${stockData._cacheMetadata?.cacheAge} hours`,
    });

    // Remove cache metadata from response to client
    const { _cacheMetadata, ...responseData } = stockData;

    // Add cache info to response headers for debugging
    const response = NextResponse.json(
      createSuccessResponse(responseData, 'stock/details')
    );

    if (_cacheMetadata) {
      response.headers.set('X-Cache-Age', _cacheMetadata.cacheAge.toString());
      response.headers.set('X-Cache-Stale', _cacheMetadata.isStale.toString());
      response.headers.set('X-Cache-Last-Fetched', _cacheMetadata.lastFetched.toISOString());
    }

    // CRITICAL SECURITY FIX: Use private caching to prevent cross-user data leakage
    // Stock details are user-specific and must NOT be cached publicly at CDN/proxy level
    // Using 'private' allows browser caching but prevents CDN from serving to other users
    response.headers.set('Cache-Control', 'private, max-age=60, must-revalidate'); // 1 minute browser cache only
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('❌ API Route get stock details error:', error);
    const internalError = createInternalErrorResponse(error, 'stock/details');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// DELETE handler for stock deletion (can remain the same as original)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  console.log('🗑️ API Route: Delete stock request received');

  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('❌ User not authenticated');
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication required',
          details: 'Please sign in to delete stock',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
        }),
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { stockId } = resolvedParams;

    if (!stockId) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Stock ID required',
          details: 'Stock ID parameter is missing from the request',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting stock:', stockId);

    // For now, return a simulated success response
    // In a real implementation, you would:
    // 1. Verify the user has permission to delete this stock
    // 2. Call AutoTrader API to delete the stock
    // 3. Remove from cache if deletion succeeds
    
    return NextResponse.json(
      createSuccessResponse(
        { 
          stockId,
          message: 'Stock deletion request processed',
          note: 'Stock deletion will be implemented with AutoTrader API integration'
        }, 
        'stock/delete'
      )
    );

  } catch (error) {
    console.error('❌ API Route delete stock error:', error);
    const internalError = createInternalErrorResponse(error, 'stock/delete');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// PATCH handler for stock lifecycle state changes (SOLD, DELETED, SALE_IN_PROGRESS)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  console.log('🔄 API Route: Update stock lifecycle state request received');

  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('❌ User not authenticated');
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication required',
          details: 'Please sign in to update stock',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
        }),
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { stockId } = resolvedParams;

    if (!stockId) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Stock ID required',
          details: 'Stock ID parameter is missing from the request',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    console.log('📝 Update request body:', JSON.stringify(requestBody, null, 2));

    // Validate request body structure
    const validationResult = validateStockUpdateRequest(requestBody);
    if (!validationResult.isValid) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid request body',
          details: validationResult.error,
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    console.log('🔍 Updating stock:', stockId);

    // Get user email for AutoTrader authentication
    const userEmail = user.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'User email not found',
          details: 'Unable to retrieve user email for API authentication',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // Get AutoTrader access token
    const tokenResult = await getAutoTraderToken(userEmail);
    if (!tokenResult.success || !tokenResult.access_token) {
      console.error('❌ AutoTrader authentication failed:', tokenResult.error);
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'AutoTrader authentication failed',
          details: 'Unable to authenticate with AutoTrader API. Please check your API credentials.',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
        }),
        { status: 401 }
      );
    }

    // Get advertiserId from query parameters (required for stock updates)
    const { searchParams } = new URL(request.url);
    const advertiserId = searchParams.get('advertiserId');

    if (!advertiserId) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Advertiser ID required',
          details: 'advertiserId query parameter is required for stock updates',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // Make PATCH request to AutoTrader API
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const autoTraderUrl = `${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`;

    console.log('📡 Making PATCH request to AutoTrader:', autoTraderUrl);
    console.log('📝 Request payload:', JSON.stringify(requestBody, null, 2));

    const autoTraderResponse = await fetch(autoTraderUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenResult.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📨 AutoTrader response status:', autoTraderResponse.status);

    if (!autoTraderResponse.ok) {
      const errorText = await autoTraderResponse.text();
      console.error('❌ AutoTrader API error:', errorText);
      
      let errorMessage = 'Failed to update stock in AutoTrader';
      let errorDetails = `AutoTrader API returned ${autoTraderResponse.status}: ${autoTraderResponse.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        
        // Handle AutoTrader's specific error format with warnings array
        if (errorJson.warnings && Array.isArray(errorJson.warnings) && errorJson.warnings.length > 0) {
          const errorWarnings = errorJson.warnings.filter((w: any) => w.type === 'ERROR');
          if (errorWarnings.length > 0) {
            // Use the first error message as the main message
            errorMessage = errorWarnings[0].message || errorMessage;
            
            // If there are multiple errors, combine them
            if (errorWarnings.length > 1) {
              const allMessages = errorWarnings.map((w: any) => w.message).filter(Boolean);
              errorDetails = allMessages.join('; ');
            } else {
              errorDetails = errorWarnings[0].message || errorDetails;
            }
          }
        }
        // Handle other error formats
        else if (errorJson.message) {
          errorMessage = errorJson.message;
          errorDetails = errorJson.details || errorJson.error || errorJson.message;
        }
        else if (errorJson.error) {
          errorMessage = typeof errorJson.error === 'string' ? errorJson.error : 'AutoTrader API error';
          errorDetails = typeof errorJson.error === 'object' ? JSON.stringify(errorJson.error) : errorJson.error;
        }
        else if (errorJson.details) {
          errorDetails = errorJson.details;
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse AutoTrader error response as JSON:', parseError);
        // If error response is not JSON, use the text as details
        if (errorText) {
          errorDetails = errorText;
        }
      }

      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.SERVER_ERROR,
          message: errorMessage,
          details: errorDetails,
          httpStatus: autoTraderResponse.status,
          timestamp: new Date().toISOString(),
        }),
        { status: autoTraderResponse.status }
      );
    }

    const autoTraderResponseData = await autoTraderResponse.json();
    console.log('✅ AutoTrader update successful');

    // Update local cache if the stock exists in cache
    try {
      const cachedStock = await StockCacheService.getStockById(stockId, user.id);
      if (cachedStock) {
        console.log('🔄 Refreshing cached stock data after update...');
        // The cache service will need to be extended to handle individual stock updates
        // For now, we'll log that an update occurred
        console.log('📝 Stock update completed, cache may need refresh on next access');
      }
    } catch (cacheError) {
      console.warn('⚠️ Failed to update cache, but AutoTrader update succeeded:', cacheError);
      // Don't fail the request if cache update fails
    }

    // Determine the action taken based on update type
    let actionMessage = 'Stock updated successfully';
    let updateType = 'general';
    const lifecycleState = requestBody.metadata?.lifecycleState;
    const mediaImages = requestBody.media?.images;
    
    if (mediaImages && Array.isArray(mediaImages)) {
      actionMessage = `Stock images updated successfully (${mediaImages.length} images)`;
      updateType = 'media';
    } else if (lifecycleState) {
      updateType = 'lifecycle';
      switch (lifecycleState) {
        case 'SOLD':
          actionMessage = 'Stock marked as sold and unpublished from all channels';
          break;
        case 'DELETED':
          actionMessage = 'Stock marked as deleted and unpublished from all channels';
          break;
        case 'SALE_IN_PROGRESS':
          actionMessage = 'Stock marked as reserved (sale in progress)';
          break;
        default:
          actionMessage = 'Stock lifecycle state updated successfully';
      }
    }

    return NextResponse.json(
      createSuccessResponse(
        { 
          stockId,
          advertiserId,
          updateType,
          lifecycleState: lifecycleState || null,
          imageCount: mediaImages ? mediaImages.length : null,
          message: actionMessage,
          autoTraderResponse: autoTraderResponseData,
          timestamp: new Date().toISOString()
        }, 
        'stock/update'
      )
    );

  } catch (error) {
    console.error('❌ API Route update stock error:', error);
    const internalError = createInternalErrorResponse(error, 'stock/update');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// Validation function for stock update requests
function validateStockUpdateRequest(body: unknown): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object' || body === null) {
    return { isValid: false, error: 'Request body must be an object' };
  }

  const bodyObj = body as Record<string, unknown>;

  // Check if this is a media/images update or lifecycle state update
  const isMediaUpdate = bodyObj.media && typeof bodyObj.media === 'object' && bodyObj.media !== null;
  const isLifecycleUpdate = bodyObj.metadata && typeof bodyObj.metadata === 'object' && bodyObj.metadata !== null;

  if (!isMediaUpdate && !isLifecycleUpdate) {
    return { isValid: false, error: 'Either metadata (for lifecycle updates) or media (for image updates) object is required' };
  }

  // Validate media updates
  if (isMediaUpdate) {
    const media = bodyObj.media as Record<string, unknown>;
    
    if (!media.images || !Array.isArray(media.images)) {
      return { isValid: false, error: 'media.images must be an array' };
    }

    const images = media.images as unknown[];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (!image || typeof image !== 'object' || image === null) {
        return { isValid: false, error: `media.images[${i}] must be an object` };
      }
      
      const imageObj = image as Record<string, unknown>;
      if (!imageObj.imageId || typeof imageObj.imageId !== 'string') {
        return { isValid: false, error: `media.images[${i}].imageId is required and must be a string` };
      }
    }

    // For media updates, we don't need to validate lifecycle state
    return { isValid: true };
  }

  // Validate lifecycle updates (existing logic)
  if (isLifecycleUpdate) {
    const metadata = bodyObj.metadata as Record<string, unknown>;

    if (!metadata.lifecycleState || typeof metadata.lifecycleState !== 'string') {
      return { isValid: false, error: 'metadata.lifecycleState is required and must be a string' };
    }

    const validLifecycleStates = ['SOLD', 'DELETED', 'SALE_IN_PROGRESS', 'AVAILABLE', 'DUE_IN'];
    if (!validLifecycleStates.includes(metadata.lifecycleState)) {
      return { 
        isValid: false, 
        error: `Invalid lifecycleState. Must be one of: ${validLifecycleStates.join(', ')}` 
      };
    }

    // Validate structure based on lifecycle state
    const lifecycleState = metadata.lifecycleState;

    if (lifecycleState === 'SOLD' || lifecycleState === 'DELETED') {
      // For SOLD and DELETED, expect adverts.retailAdverts with status NOT_PUBLISHED
      if (!bodyObj.adverts || typeof bodyObj.adverts !== 'object' || bodyObj.adverts === null) {
        return { isValid: false, error: `adverts object is required for ${lifecycleState} state` };
      }

      const adverts = bodyObj.adverts as Record<string, unknown>;
      
      // For SOLD, check if soldDate is provided
      if (lifecycleState === 'SOLD') {
        if (!adverts.soldDate || typeof adverts.soldDate !== 'string') {
          return { isValid: false, error: 'adverts.soldDate is required for SOLD state and must be a string (YYYY-MM-DD format)' };
        }
      }

      if (!adverts.retailAdverts || typeof adverts.retailAdverts !== 'object' || adverts.retailAdverts === null) {
        return { isValid: false, error: `adverts.retailAdverts object is required for ${lifecycleState} state` };
      }

      const retailAdverts = adverts.retailAdverts as Record<string, unknown>;
      const requiredAdverts = ['autotraderAdvert', 'advertiserAdvert', 'locatorAdvert', 'exportAdvert', 'profileAdvert'];
      
      for (const advertType of requiredAdverts) {
        if (!retailAdverts[advertType] || typeof retailAdverts[advertType] !== 'object' || retailAdverts[advertType] === null) {
          return { isValid: false, error: `adverts.retailAdverts.${advertType} is required for ${lifecycleState} state` };
        }
        
        const advert = retailAdverts[advertType] as Record<string, unknown>;
        if (advert.status !== 'NOT_PUBLISHED') {
          return { isValid: false, error: `adverts.retailAdverts.${advertType}.status must be 'NOT_PUBLISHED' for ${lifecycleState} state` };
        }
      }
    } else if (lifecycleState === 'SALE_IN_PROGRESS') {
      // For SALE_IN_PROGRESS, expect adverts with reservationStatus
      if (!bodyObj.adverts || typeof bodyObj.adverts !== 'object' || bodyObj.adverts === null) {
        return { isValid: false, error: 'adverts object is required for SALE_IN_PROGRESS state' };
      }

      const adverts = bodyObj.adverts as Record<string, unknown>;
      if (!adverts.reservationStatus || adverts.reservationStatus !== 'Reserved') {
        return { isValid: false, error: 'adverts.reservationStatus must be "Reserved" for SALE_IN_PROGRESS state' };
      }
    }

    return { isValid: true };
  }

  return { isValid: true };
}

