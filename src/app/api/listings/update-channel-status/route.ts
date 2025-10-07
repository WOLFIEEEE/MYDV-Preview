import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stockCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAutoTraderToken, invalidateTokenByEmail } from '@/lib/autoTraderAuth';
import { BrowserCompatibilityManager } from '@/lib/browserCompatibility';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// Define proper types for adverts data
interface AdvertData {
  status?: string;
  [key: string]: unknown;
}

interface RetailAdverts {
  autotraderAdvert?: AdvertData;
  advertiserAdvert?: AdvertData;
  locatorAdvert?: AdvertData;
  exportAdvert?: AdvertData;
  profileAdvert?: AdvertData;
  [key: string]: unknown;
}

interface AdvertsData {
  retailAdverts?: RetailAdverts;
  [key: string]: unknown;
}

interface UpdateChannelStatusRequest {
  stockId: string;
  channelId: string;
  status: boolean; // true = published, false = not published
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
        endpoint: 'listings/update-channel-status'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const body: UpdateChannelStatusRequest = await request.json();
    const { stockId, channelId, status } = body;

    if (!stockId || !channelId || typeof status !== 'boolean') {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Missing required fields',
        details: 'stockId, channelId, and status (boolean) are required',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-channel-status'
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
        endpoint: 'listings/update-channel-status'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
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
        endpoint: 'listings/update-channel-status'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Get current stock data
    const stockRecord = await db
      .select()
      .from(stockCache)
      .where(eq(stockCache.stockId, stockId))
      .limit(1);

    if (stockRecord.length === 0) {
      const notFoundError = {
        type: ErrorType.NOT_FOUND,
        message: 'Stock item not found',
        details: `No stock item found with ID: ${stockId}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-channel-status'
      };
      return NextResponse.json(
        createErrorResponse(notFoundError),
        { status: 404 }
      );
    }

    const currentStock = stockRecord[0];
    const advertsData = (currentStock.advertsData as AdvertsData) || {};
    const retailAdverts = advertsData.retailAdverts || {};

    // Map channel IDs to AutoTrader advert types
    const channelMapping: { [key: string]: string } = {
      'autotrader': 'autotraderAdvert',
      'advertiser': 'advertiserAdvert', 
      'locator': 'locatorAdvert',
      'export': 'exportAdvert',
      'profile': 'profileAdvert'
    };

    const advertType = channelMapping[channelId];
    if (!advertType) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Invalid channel ID',
        details: `Channel ID '${channelId}' is not supported. Valid channels: ${Object.keys(channelMapping).join(', ')}`,
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'listings/update-channel-status'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Update the advert status
    const newStatus = status ? 'PUBLISHED' : 'NOT_PUBLISHED';
    
    // Update local data structure with proper typing
    const currentAdvert = (retailAdverts as Record<string, AdvertData>)[advertType] || {};
    const updatedRetailAdverts: RetailAdverts = {
      ...retailAdverts,
      [advertType]: {
        ...currentAdvert,
        status: newStatus
      }
    };

    const updatedAdvertsData: AdvertsData = {
      ...advertsData,
      retailAdverts: updatedRetailAdverts
    };

    // For AutoTrader channel, we need to make API calls to actually publish/unpublish
    if (channelId === 'autotrader' && authResult.access_token) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
        
        if (status) {
          // Publish to AutoTrader
          const publishResponse = await BrowserCompatibilityManager.enhancedFetch(`${baseUrl}/stock/${stockId}/adverts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authResult.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              advertType: 'autotrader',
              status: 'PUBLISHED'
            }),
          });

          if (!publishResponse.ok) {
            console.error('Failed to publish to AutoTrader:', await publishResponse.text());
            // Don't fail the entire request, just log the error
          }
        } else {
          // Unpublish from AutoTrader
          const unpublishResponse = await BrowserCompatibilityManager.enhancedFetch(`${baseUrl}/stock/${stockId}/adverts/autotrader`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${authResult.access_token}`,
            },
          });

          if (!unpublishResponse.ok) {
            console.error('Failed to unpublish from AutoTrader:', await unpublishResponse.text());
            // Don't fail the entire request, just log the error
          }
        }
      } catch (error) {
        console.error('AutoTrader API error:', error);
        // Continue with local update even if AutoTrader API fails
      }
    }

    // Update the database with new advert status
    await db
      .update(stockCache)
      .set({
        advertsData: updatedAdvertsData,
        updatedAt: new Date(),
      })
      .where(eq(stockCache.stockId, stockId));

    const responseData = {
      stockId,
      channelId,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(
      createSuccessResponse(responseData, 'listings/update-channel-status')
    );

  } catch (error) {
    console.error('Error updating channel status:', error);
    const internalError = createInternalErrorResponse(error, 'listings/update-channel-status');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
