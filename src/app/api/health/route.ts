import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockCache } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    autotrader: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      error?: string;
    };
    cache: {
      status: 'up' | 'down';
      totalRecords?: number;
      lastUpdate?: string;
      error?: string;
    };
  };
  uptime: number;
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: { status: 'down' },
      autotrader: { status: 'down' },
      cache: { status: 'down' },
    },
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check Database Health
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbResponseTime = Date.now() - dbStart;
    
    healthCheck.services.database = {
      status: 'up',
      responseTime: dbResponseTime,
    };

    if (dbResponseTime > 1000) {
      overallStatus = 'degraded';
    }
  } catch (error) {
    healthCheck.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
    overallStatus = 'unhealthy';
  }

  // Check Cache Health
  try {
    const cacheStart = Date.now();
    const cacheStats = await db
      .select({
        count: sql<number>`count(*)`,
        lastUpdate: sql<string>`max(updated_at)`,
      })
      .from(stockCache)
      .limit(1);

    const cacheResponseTime = Date.now() - cacheStart;
    
    healthCheck.services.cache = {
      status: 'up',
      totalRecords: cacheStats[0]?.count || 0,
      lastUpdate: cacheStats[0]?.lastUpdate || undefined,
    };

    // Check if cache is stale (no updates in last 48 hours)
    if (cacheStats[0]?.lastUpdate) {
      const lastUpdateTime = new Date(cacheStats[0].lastUpdate).getTime();
      const hoursSinceUpdate = (Date.now() - lastUpdateTime) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > 48) {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
      }
    }
  } catch (error) {
    healthCheck.services.cache = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown cache error',
    };
    overallStatus = 'unhealthy';
  }

  // Check AutoTrader API Health (lightweight check)
  try {
    const autotraderStart = Date.now();
    const baseUrl = getAutoTraderBaseUrlForServer();
    
    // Simple connectivity check (don't authenticate)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const autotraderResponseTime = Date.now() - autotraderStart;
    
    if (response.status === 404) {
      // 404 is expected for /health endpoint, means API is reachable
      healthCheck.services.autotrader = {
        status: 'up',
        responseTime: autotraderResponseTime,
      };
    } else if (response.ok) {
      healthCheck.services.autotrader = {
        status: 'up',
        responseTime: autotraderResponseTime,
      };
    } else {
      healthCheck.services.autotrader = {
        status: 'degraded',
        responseTime: autotraderResponseTime,
      };
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }

    if (autotraderResponseTime > 3000) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }
  } catch (error) {
    healthCheck.services.autotrader = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown AutoTrader error',
    };
    
    // Don't mark as unhealthy for AutoTrader issues alone
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }

  healthCheck.status = overallStatus;

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(healthCheck, { status: httpStatus });
}

// Add a simple ping endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
