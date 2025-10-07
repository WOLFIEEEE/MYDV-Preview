import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { stockDataMonitor } from '@/lib/stockDataMonitor';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { getAdvertiserId } from '@/lib/advertiserIdResolver';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stock/diagnostics
 * 
 * Provides diagnostic information for troubleshooting stock data issues
 * This endpoint helps identify root causes of "No Stock Data Available" errors
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.emailAddresses[0]?.emailAddress || '';

    // Get diagnostic information from monitor
    const diagnostics = stockDataMonitor.getDiagnostics(`user_${userId}`);
    const isExperiencingIssues = stockDataMonitor.isUserExperiencingIssues(`user_${userId}`);
    const suggestedActions = stockDataMonitor.getSuggestedActions(`user_${userId}`);
    const diagnosticReport = stockDataMonitor.generateDiagnosticReport(`user_${userId}`);

    // Check store configuration
    let storeConfigStatus = 'unknown';
    let advertiserIdStatus = 'unknown';
    let storeConfigError = null;

    try {
      const configResult = await getStoreConfigForUser(userId, userEmail);
      if (configResult.success && configResult.storeConfig) {
        storeConfigStatus = 'found';
        const advertiserId = getAdvertiserId(configResult.storeConfig);
        advertiserIdStatus = advertiserId ? 'configured' : 'missing';
      } else {
        storeConfigStatus = 'missing';
        storeConfigError = configResult.error;
      }
    } catch (error) {
      storeConfigStatus = 'error';
      storeConfigError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Compile comprehensive diagnostic data
    const diagnosticData = {
      userId,
      userEmail,
      timestamp: new Date().toISOString(),
      
      // Monitor data
      monitorDiagnostics: diagnostics,
      isExperiencingIssues,
      suggestedActions,
      
      // Configuration status
      storeConfigStatus,
      advertiserIdStatus,
      storeConfigError,
      
      // System status
      systemInfo: {
        nodeEnv: process.env.NODE_ENV,
        hasAutoTraderCredentials: !!(process.env.AUTOTRADER_API_KEY && process.env.AUTOTRADER_SECRET),
        timestamp: new Date().toISOString()
      },
      
      // Full diagnostic report
      fullReport: diagnosticReport
    };

    return NextResponse.json({
      success: true,
      data: diagnosticData
    });

  } catch (error) {
    console.error('❌ Diagnostics API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/stock/diagnostics
 * 
 * Record a diagnostic event manually (for testing or manual reporting)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, details } = body;

    if (!eventType) {
      return NextResponse.json({
        success: false,
        error: 'eventType is required'
      }, { status: 400 });
    }

    // Record the event
    stockDataMonitor.recordEvent(`user_${user.id}`, eventType, details || {});

    return NextResponse.json({
      success: true,
      message: 'Event recorded successfully'
    });

  } catch (error) {
    console.error('❌ Diagnostics POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record diagnostic event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
