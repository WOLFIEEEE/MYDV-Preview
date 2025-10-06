import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { StockCacheService } from '@/lib/stockCacheService';

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get dealer ID from current user
    const response = await fetch(`${request.nextUrl.origin}/api/current-dealer`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to get dealer information' },
        { status: 400 }
      );
    }

    const dealerResult = await response.json();
    if (!dealerResult.success || !dealerResult.data?.dealerId) {
      return NextResponse.json(
        { success: false, error: 'Dealer ID not found' },
        { status: 400 }
      );
    }

    const dealerId = dealerResult.data.dealerId;
    const maxAgeHours = parseInt(request.nextUrl.searchParams.get('maxAgeHours') || '72');

    console.log(`🧹 Manual cleanup requested for dealer ${dealerId}, maxAge: ${maxAgeHours} hours`);

    // Perform cleanup
    await StockCacheService.cleanupStaleEntries(dealerId, maxAgeHours);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed for dealer ${dealerId}`,
      maxAgeHours,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in stock cleanup API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup stale stock entries',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET method for testing/info
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Stock Cache Cleanup API',
    endpoint: '/api/stock/cleanup',
    methods: ['POST'],
    description: 'Clean up stale stock cache entries that are no longer referenced',
    parameters: {
      maxAgeHours: 'Optional: Maximum age in hours for entries to be cleaned up (default: 72)'
    },
    timestamp: new Date().toISOString()
  });
}
