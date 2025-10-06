import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { PerformanceMonitor } from '@/lib/services/performanceMonitor';
import { 
  createErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

export async function GET(request: NextRequest) {
  try {
    // Authentication check (admin only for performance data)
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'performance-monitor'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';
    const endpoint = searchParams.get('endpoint');
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // 1 hour default

    switch (action) {
      case 'health':
        const systemHealth = PerformanceMonitor.getSystemHealth(timeWindow);
        return NextResponse.json(
          createSuccessResponse(systemHealth, 'performance-monitor/health')
        );

      case 'endpoint-stats':
        if (!endpoint) {
          const validationError = {
            type: ErrorType.VALIDATION,
            message: 'Endpoint parameter required',
            details: 'Please provide an endpoint parameter for endpoint stats',
            httpStatus: 400,
            timestamp: new Date().toISOString(),
            endpoint: 'performance-monitor'
          };
          return NextResponse.json(
            createErrorResponse(validationError),
            { status: 400 }
          );
        }
        
        const endpointStats = PerformanceMonitor.getEndpointStats(endpoint, timeWindow);
        return NextResponse.json(
          createSuccessResponse(endpointStats, 'performance-monitor/endpoint-stats')
        );

      case 'trends':
        const trends = PerformanceMonitor.getPerformanceTrends(
          endpoint || undefined,
          timeWindow,
          parseInt(searchParams.get('bucketSize') || '3600000') // 1 hour buckets
        );
        return NextResponse.json(
          createSuccessResponse(trends, 'performance-monitor/trends')
        );

      case 'slowest':
        const limit = parseInt(searchParams.get('limit') || '10');
        const slowest = PerformanceMonitor.getSlowestEndpoints(limit, timeWindow);
        return NextResponse.json(
          createSuccessResponse(slowest, 'performance-monitor/slowest')
        );

      case 'export':
        const exportData = PerformanceMonitor.exportMetrics(timeWindow);
        return NextResponse.json(
          createSuccessResponse(exportData, 'performance-monitor/export')
        );

      case 'clear-old':
        const olderThan = parseInt(searchParams.get('olderThan') || '86400000'); // 24 hours
        PerformanceMonitor.clearOldMetrics(olderThan);
        return NextResponse.json(
          createSuccessResponse(
            { message: 'Old metrics cleared', olderThan }, 
            'performance-monitor/clear-old'
          )
        );

      default:
        const validationError = {
          type: ErrorType.VALIDATION,
          message: 'Invalid action',
          details: 'Valid actions: health, endpoint-stats, trends, slowest, export, clear-old',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'performance-monitor'
        };
        return NextResponse.json(
          createErrorResponse(validationError),
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Performance monitor API error:', error);
    const serverError = {
      type: ErrorType.SERVER_ERROR,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      httpStatus: 500,
      timestamp: new Date().toISOString(),
      endpoint: 'performance-monitor'
    };

    return NextResponse.json(
      createErrorResponse(serverError),
      { status: 500 }
    );
  }
}

// POST endpoint for manual metric recording (for testing)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'performance-monitor'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { endpoint, duration, success, cacheHit, errorType, retryCount } = body;

    if (!endpoint || duration === undefined || success === undefined) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Missing required parameters',
        details: 'Required: endpoint, duration, success',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'performance-monitor'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    PerformanceMonitor.recordMetric(endpoint, duration, success, {
      cacheHit,
      errorType,
      retryCount
    });

    return NextResponse.json(
      createSuccessResponse(
        { message: 'Metric recorded successfully' },
        'performance-monitor/record'
      )
    );

  } catch (error) {
    console.error('❌ Performance monitor record error:', error);
    const serverError = {
      type: ErrorType.SERVER_ERROR,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      httpStatus: 500,
      timestamp: new Date().toISOString(),
      endpoint: 'performance-monitor'
    };

    return NextResponse.json(
      createErrorResponse(serverError),
      { status: 500 }
    );
  }
}
