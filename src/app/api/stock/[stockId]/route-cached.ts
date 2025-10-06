import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { StockCacheService } from '@/lib/stockCacheService';

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

