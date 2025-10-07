import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAutoTraderToken, invalidateTokenByEmail } from '@/lib/autoTraderAuth';
import { BrowserCompatibilityManager } from '@/lib/browserCompatibility';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// Define the AutoTrader update payload structure
interface AutoTraderUpdatePayload {
  adverts: {
    forecourtPrice?: {
      amountGBP: number;
    };
    retailAdverts?: {
      autotraderAdvert?: {
        status: 'PUBLISHED' | 'NOT_PUBLISHED';
      };
      advertiserAdvert?: {
        status: 'PUBLISHED' | 'NOT_PUBLISHED';
      };
      locatorAdvert?: {
        status: 'PUBLISHED' | 'NOT_PUBLISHED';
      };
      profileAdvert?: {
        status: 'PUBLISHED' | 'NOT_PUBLISHED';
      };
    };
  };
}

interface UpdateRowRequest {
  stockId: string;
  price?: number;
  channels?: { [channelId: string]: boolean };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-row'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const body: UpdateRowRequest = await request.json();
    const { stockId, price, channels } = body;

    if (!stockId) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Missing required field: stockId',
        details: 'stockId is required to update listing',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-row'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get user email (already have user from currentUser())
    const userEmail = user.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'No email address found for the authenticated user',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-row'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    // Get store configuration to get advertiser ID
    const configResult = await getStoreConfigForUser(user.id, userEmail);
    
    if (!configResult.success) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Store configuration not found',
        details: configResult.error || 'Please contact support to set up your store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-row'
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
        endpoint: 'listings/update-row'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    // Get AutoTrader token for API calls
    const authResult = await getAutoTraderToken(userEmail);
    if (!authResult.success) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Failed to authenticate with AutoTrader',
        details: authResult.error ? String(authResult.error) : 'AutoTrader authentication failed',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-row'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Prepare AutoTrader update payload
    const autotraderPayload: AutoTraderUpdatePayload = {
      adverts: {}
    };

    // Add price update if provided
    if (price !== undefined && price > 0) {
      autotraderPayload.adverts.forecourtPrice = {
        amountGBP: price
      };
    }

    // Add channel status updates if provided
    if (channels) {
      const channelMapping: { [key: string]: keyof NonNullable<AutoTraderUpdatePayload['adverts']['retailAdverts']> } = {
        'autotrader': 'autotraderAdvert',
        'advertiser': 'advertiserAdvert', 
        'locator': 'locatorAdvert',
        'profile': 'profileAdvert'
      };

      autotraderPayload.adverts.retailAdverts = {};

      for (const [channelId, status] of Object.entries(channels)) {
        const advertType = channelMapping[channelId];
        if (advertType) {
          const newStatus = status ? 'PUBLISHED' : 'NOT_PUBLISHED';
          autotraderPayload.adverts.retailAdverts[advertType] = {
            status: newStatus
          };
        }
      }
    }

    // Send update to AutoTrader API (only update AutoTrader, not local database)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
      
      console.log('📡 Sending update to AutoTrader:', {
        stockId,
        advertiserId,
        payload: autotraderPayload
      });

      // Use browser-aware fetch with enhanced error handling
      const updateResponse = await BrowserCompatibilityManager.enhancedFetch(`${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authResult.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(autotraderPayload),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ AutoTrader update failed:', {
          status: updateResponse.status,
          statusText: updateResponse.statusText,
          error: errorText
        });
        
        // Handle authentication errors specifically
        if (updateResponse.status === 401) {
          console.warn('🔑 Token expired during listing update, invalidating cache');
          await invalidateTokenByEmail(userEmail);
          
          const authError = {
            type: ErrorType.AUTHENTICATION,
            message: 'Authentication expired',
            details: 'Your session has expired. Please refresh the page and try again.',
            httpStatus: 401,
            timestamp: new Date().toISOString(),
            endpoint: 'listings/update-row'
          };
          return NextResponse.json(
            createErrorResponse(authError),
            { status: 401 }
          );
        }
        
        // Handle rate limiting
        if (updateResponse.status === 429) {
          const rateLimitError = {
            type: ErrorType.RATE_LIMIT,
            message: 'AutoTrader API rate limit exceeded',
            details: 'Too many requests to AutoTrader. Please wait a moment and try again.',
            httpStatus: 429,
            timestamp: new Date().toISOString(),
            endpoint: 'listings/update-row'
          };
          return NextResponse.json(
            createErrorResponse(rateLimitError),
            { status: 429 }
          );
        }
        
        const autotraderError = {
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to update listing on AutoTrader',
          details: `AutoTrader API returned ${updateResponse.status}: ${errorText}`,
          httpStatus: 502,
          timestamp: new Date().toISOString(),
          endpoint: 'listings/update-row'
        };
        return NextResponse.json(
          createErrorResponse(autotraderError),
          { status: 502 }
        );
      }

      const autotraderResponse = await updateResponse.json();
      console.log('✅ AutoTrader update successful:', autotraderResponse);

    } catch (error) {
      console.error('❌ AutoTrader API error:', error);
      const networkError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network error while updating AutoTrader',
        details: error instanceof Error ? error.message : 'Unknown network error',
        httpStatus: 503,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-row'
      };
      return NextResponse.json(
        createErrorResponse(networkError),
        { status: 503 }
      );
    }

    // Return success response (AutoTrader has been updated)
    const responseData = {
      stockId,
      price: price || null,
      channels: channels || null,
      autotraderPayload,
      message: 'Listing successfully updated on AutoTrader',
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(
      createSuccessResponse(responseData, 'listings/update-row')
    );

  } catch (error) {
    console.error('Error updating row:', error);
    const internalError = createInternalErrorResponse(error, 'listings/update-row');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
