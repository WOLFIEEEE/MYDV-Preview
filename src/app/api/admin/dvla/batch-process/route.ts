import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { processDVLABatch, getDVLAStats, processSingleVehicleDVLA } from '@/lib/services/dvlaService';

// Admin-only endpoint for processing ALL vehicles across all dealers
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

    // Check admin access
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
    const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
    
    const isUserAdmin = adminEmails.includes(userEmail);
    
    if (!isUserAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      action = 'batch', 
      stockId, 
      forceRefresh = false, 
      batchSize = 5 
    } = body;

    console.log(`🚀 Admin DVLA ${action} processing request from: ${userEmail}`);

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
      // Process batch of vehicles across ALL dealers (admin mode)
      const result = await processDVLABatch({
        dealerId: undefined, // No dealer filter - process ALL vehicles
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
    console.error('❌ Admin DVLA batch process error:', error);
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

    // Check admin access
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
    const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
    
    const isUserAdmin = adminEmails.includes(userEmail);
    
    if (!isUserAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Get DVLA statistics for ALL dealers (no dealer filter)
    const stats = await getDVLAStats(); // No dealerId parameter = all dealers

    return NextResponse.json({
      success: true,
      data: {
        stats,
        lastUpdated: new Date().toISOString(),
        scope: 'all_dealers'
      }
    });

  } catch (error) {
    console.error('❌ Admin DVLA stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
