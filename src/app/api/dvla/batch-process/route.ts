import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { processDVLABatch, getDVLAStats, processSingleVehicleDVLA } from '@/lib/services/dvlaService';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get dealer ID
    const dealerResult = await getDealerIdForUser(user);
    if (!dealerResult.success || !dealerResult.dealerId) {
      return NextResponse.json({
        success: false,
        error: 'Dealer not found'
      }, { status: 400 });
    }

    const dealerId = dealerResult.dealerId;

    // Parse request body
    const body = await request.json();
    const { 
      action = 'batch', 
      stockId, 
      forceRefresh = false, 
      batchSize = 10 
    } = body;

    console.log(`🚀 DVLA ${action} processing request from dealer: ${dealerId}`);

    if (action === 'single' && stockId) {
      // Process single vehicle
      const result = await processSingleVehicleDVLA(stockId);
      return NextResponse.json({
        success: result.success,
        data: result.success ? {
          stockId,
          motStatus: result.motStatus,
          motExpiryDate: result.motExpiryDate
        } : undefined,
        error: result.error
      });
    } else if (action === 'batch') {
      // Process batch of vehicles
      const result = await processDVLABatch({
        dealerId,
        forceRefresh,
        batchSize
      });

      return NextResponse.json({
        success: result.success,
        data: {
          processed: result.processed,
          updated: result.updated,
          errors: result.errors,
          details: result.details
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use "batch" or "single"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ DVLA batch process error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get dealer ID
    const dealerResult = await getDealerIdForUser(user);
    if (!dealerResult.success || !dealerResult.dealerId) {
      return NextResponse.json({
        success: false,
        error: 'Dealer not found'
      }, { status: 400 });
    }

    const dealerId = dealerResult.dealerId;

    // Get DVLA statistics
    const stats = await getDVLAStats(dealerId);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ DVLA stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
