import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { OptimizedRefreshService } from '@/lib/optimizedRefreshService';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorType 
} from '@/lib/errorHandler';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET method to check refresh status
export async function GET(request: NextRequest) {
  console.log('📊 API Route: Check refresh status');
  
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
          endpoint: 'stock/refresh-status'
        }),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const refreshId = searchParams.get('refreshId');

    if (!refreshId) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Refresh ID required',
          details: 'Please provide a refresh ID to check status',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/refresh-status'
        }),
        { status: 400 }
      );
    }

    const status = OptimizedRefreshService.getRefreshStatus(refreshId);
    
    const response = NextResponse.json(
      createSuccessResponse({
        refreshId,
        status: status || {
          isRefreshing: false,
          progress: 100,
          lastUpdated: new Date().toISOString()
        }
      }, 'refresh-status')
    );

    // Never cache status responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('❌ Error checking refresh status:', error);
    
    return NextResponse.json(
      createErrorResponse({
        type: ErrorType.SERVER_ERROR,
        message: 'Failed to check refresh status',
        details: error instanceof Error ? error.message : 'Unknown error',
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/refresh-status'
      }),
      { status: 500 }
    );
  }
}
