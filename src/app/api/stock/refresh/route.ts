import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { getAdvertiserId, logAdvertiserIdResolution } from '@/lib/advertiserIdResolver';
import { StockCacheService } from '@/lib/stockCacheService';
import type { StockQueryOptions } from '@/lib/stockCacheService';
import { OptimizedRefreshService } from '@/lib/optimizedRefreshService';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Force dynamic rendering - prevent static optimization
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST method to force refresh stock data from AutoTrader
export async function POST(request: NextRequest) {
  console.log('🔄 API Route: Force refresh stock data from AutoTrader');
  
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to refresh stock data',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/refresh'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Get store configuration (works for both store owners and team members)
    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    const configResult = await getStoreConfigForUser(user.id, userEmail);

    if (!configResult.success) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Store configuration not found',
        details: configResult.error || 'Please contact support to set up your store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/refresh'
      };
      console.log('❌ Store config not found for user:', user.id, 'Error:', configResult.error);
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    const userStoreConfig = configResult.storeConfig;
    console.log('✅ Store config found for refresh, using store owner email:', configResult.storeOwnerEmail);
    
    // Use standardized advertiser ID resolution
    const advertiserId = getAdvertiserId(userStoreConfig);
    logAdvertiserIdResolution(userStoreConfig, 'stock/refresh');

    if (!advertiserId) {
      const advertiserError = {
        type: ErrorType.VALIDATION,
        message: 'No advertiser ID configured',
        details: 'Please configure your AutoTrader advertiser ID in settings',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/refresh'
      };
      console.log('❌ No advertiser ID found for user:', user.id);
      return NextResponse.json(
        createErrorResponse(advertiserError),
        { status: 400 }
      );
    }

    console.log('🏪 Resolved advertiser ID:', advertiserId);

    // Parse request body for any additional options
    const body = await request.json().catch(() => ({}));
    const { pageSize = 100 } = body;

    // Build options for forced refresh
    const options: StockQueryOptions = {
      dealerId: user.id,
      advertiserId: advertiserId,
      page: 1,
      pageSize: pageSize,
    };

    console.log('🔄 Forcing fresh data fetch from AutoTrader...');
    console.log('📋 Refresh options:', options);

    // Use optimized background refresh for better performance
    const refreshResult = await OptimizedRefreshService.startBackgroundRefresh(options);
    const stockResponse = refreshResult.immediate;

    console.log('✅ Stock data refreshed successfully from AutoTrader:', {
      totalResults: stockResponse.totalResults,
      page: stockResponse.page,
      fromCache: stockResponse.cacheStatus.fromCache,
      staleCacheUsed: stockResponse.cacheStatus.staleCacheUsed,
    });

    // Prepare response data
    const responseData = {
      stock: stockResponse.results,
      pagination: {
        page: stockResponse.page,
        pageSize: stockResponse.pageSize,
        totalResults: stockResponse.totalResults,
        totalPages: stockResponse.totalPages,
        hasNextPage: stockResponse.hasNextPage,
      },
      cache: {
        ...stockResponse.cacheStatus,
        refreshedAt: new Date().toISOString(),
        forceRefresh: true
      },
      message: `Successfully refreshed ${stockResponse.totalResults} vehicles from AutoTrader`
    };

    const response = NextResponse.json(
      createSuccessResponse(responseData, 'stock-refresh')
    );

    // FIXED: Never cache refresh responses - they should always be fresh
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('❌ Error during stock refresh:', error);
    
    const internalError = {
      type: ErrorType.SERVER_ERROR,
      message: 'Failed to refresh stock data',
      details: error instanceof Error ? error.message : 'An unexpected error occurred during stock refresh',
      httpStatus: 500,
      timestamp: new Date().toISOString(),
      endpoint: 'stock/refresh'
    };

    return NextResponse.json(
      createInternalErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// GET method to check refresh status
export async function GET() {
  console.log('📊 API Route: Check stock refresh status');
  
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'User not authenticated',
          details: 'Please sign in to check refresh status',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/refresh'
        }),
        { status: 401 }
      );
    }

    // Get user's store configuration to get advertiser ID
    const storeConfigResult = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clerkUserId, user.id))
      .limit(1);

    if (storeConfigResult.length === 0) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.NOT_FOUND,
          message: 'Store configuration not found',
          details: 'Please configure your store settings',
          httpStatus: 404,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/refresh'
        }),
        { status: 404 }
      );
    }

    const userStoreConfig = storeConfigResult[0];
    let advertiserId = userStoreConfig.primaryAdvertisementId;

    if (!advertiserId && userStoreConfig.additionalAdvertisementIds && userStoreConfig.additionalAdvertisementIds.length > 0) {
      advertiserId = userStoreConfig.additionalAdvertisementIds[0];
    }

    if (!advertiserId) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'No advertiser ID configured',
          details: 'Please configure your AutoTrader advertiser ID',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/refresh'
        }),
        { status: 400 }
      );
    }

    // Resolve dealer UUID
    const dealerId = await StockCacheService.resolveDealerUuid(user.id);
    if (!dealerId) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.NOT_FOUND,
          message: 'Dealer record not found',
          details: 'Please complete your dealer registration',
          httpStatus: 404,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/refresh'
        }),
        { status: 404 }
      );
    }

    // Get cache status
    const cacheStatus = await StockCacheService.getCacheStatus(dealerId, advertiserId);
    
    const response = NextResponse.json(
      createSuccessResponse({
        cacheStatus,
        canRefresh: true,
        lastRefresh: cacheStatus.lastFetched,
        isStale: cacheStatus.isStale,
        needsForceRefresh: cacheStatus.needsForceRefresh
      }, 'refresh-status')
    );

    // FIXED: Never cache refresh status - should always check current state
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('❌ Error checking refresh status:', error);
    
    return NextResponse.json(
      createInternalErrorResponse({
        type: ErrorType.SERVER_ERROR,
        message: 'Failed to check refresh status',
        details: error instanceof Error ? error.message : 'Unknown error',
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/refresh'
      }),
      { status: 500 }
    );
  }
}
