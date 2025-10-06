// Performance Monitoring Service
// Tracks API performance, success rates, and provides insights

interface PerformanceMetric {
  endpoint: string;
  duration: number;
  success: boolean;
  timestamp: number;
  cacheHit?: boolean;
  errorType?: string;
  retryCount?: number;
}

interface EndpointStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  cacheHitRate: number;
  lastError?: string;
  lastErrorTime?: number;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  endpoints: Record<string, EndpointStats>;
  cacheStats: {
    hitRate: number;
    size: number;
  };
  circuitBreakerStats: {
    openCircuits: number;
    totalCircuits: number;
  };
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 10000; // Keep last 10k metrics
  private static readonly HEALTH_THRESHOLD = {
    SUCCESS_RATE: 0.95, // 95% success rate
    RESPONSE_TIME: 5000, // 5 seconds
    ERROR_RATE: 0.05 // 5% error rate
  };

  /**
   * Record a performance metric
   */
  static recordMetric(
    endpoint: string,
    duration: number,
    success: boolean,
    options: {
      cacheHit?: boolean;
      errorType?: string;
      retryCount?: number;
    } = {}
  ) {
    const metric: PerformanceMetric = {
      endpoint,
      duration,
      success,
      timestamp: Date.now(),
      ...options
    };

    this.metrics.push(metric);

    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log performance in real-time
    this.logMetric(metric);
  }

  /**
   * Get statistics for a specific endpoint
   */
  static getEndpointStats(endpoint: string, timeWindowMs: number = 3600000): EndpointStats {
    const cutoffTime = Date.now() - timeWindowMs;
    const endpointMetrics = this.metrics.filter(
      m => m.endpoint === endpoint && m.timestamp > cutoffTime
    );

    if (endpointMetrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        successRate: 0,
        cacheHitRate: 0
      };
    }

    const successfulRequests = endpointMetrics.filter(m => m.success).length;
    const failedRequests = endpointMetrics.length - successfulRequests;
    const cacheHits = endpointMetrics.filter(m => m.cacheHit).length;
    const responseTimes = endpointMetrics.map(m => m.duration);
    const lastFailure = endpointMetrics
      .filter(m => !m.success)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
      totalRequests: endpointMetrics.length,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      successRate: successfulRequests / endpointMetrics.length,
      cacheHitRate: cacheHits / endpointMetrics.length,
      lastError: lastFailure?.errorType,
      lastErrorTime: lastFailure?.timestamp
    };
  }

  /**
   * Get overall system health
   */
  static getSystemHealth(timeWindowMs: number = 3600000): SystemHealth {
    const cutoffTime = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        overall: 'healthy',
        endpoints: {},
        cacheStats: { hitRate: 0, size: 0 },
        circuitBreakerStats: { openCircuits: 0, totalCircuits: 0 }
      };
    }

    // Get unique endpoints
    const endpoints = [...new Set(recentMetrics.map(m => m.endpoint))];
    const endpointStats: Record<string, EndpointStats> = {};

    let overallHealthy = true;

    // Calculate stats for each endpoint
    for (const endpoint of endpoints) {
      const stats = this.getEndpointStats(endpoint, timeWindowMs);
      endpointStats[endpoint] = stats;

      // Check if endpoint is healthy
      if (
        stats.successRate < this.HEALTH_THRESHOLD.SUCCESS_RATE ||
        stats.averageResponseTime > this.HEALTH_THRESHOLD.RESPONSE_TIME
      ) {
        overallHealthy = false;
      }
    }

    // Calculate cache stats
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = recentMetrics.length > 0 ? cacheHits / recentMetrics.length : 0;

    // Determine overall health
    const overallSuccessRate = recentMetrics.filter(m => m.success).length / recentMetrics.length;
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (overallSuccessRate < 0.8) {
      overall = 'unhealthy';
    } else if (overallSuccessRate < this.HEALTH_THRESHOLD.SUCCESS_RATE || !overallHealthy) {
      overall = 'degraded';
    }

    return {
      overall,
      endpoints: endpointStats,
      cacheStats: {
        hitRate: cacheHitRate,
        size: this.metrics.length
      },
      circuitBreakerStats: {
        openCircuits: 0, // This would be populated by circuit breaker service
        totalCircuits: endpoints.length
      }
    };
  }

  /**
   * Get performance trends over time
   */
  static getPerformanceTrends(
    endpoint?: string,
    timeWindowMs: number = 86400000, // 24 hours
    bucketSizeMs: number = 3600000 // 1 hour buckets
  ) {
    const cutoffTime = Date.now() - timeWindowMs;
    let relevantMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    if (endpoint) {
      relevantMetrics = relevantMetrics.filter(m => m.endpoint === endpoint);
    }

    const buckets: Record<number, PerformanceMetric[]> = {};
    
    // Group metrics into time buckets
    for (const metric of relevantMetrics) {
      const bucketKey = Math.floor(metric.timestamp / bucketSizeMs) * bucketSizeMs;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = [];
      }
      buckets[bucketKey].push(metric);
    }

    // Calculate stats for each bucket
    return Object.entries(buckets)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([timestamp, metrics]) => {
        const successful = metrics.filter(m => m.success).length;
        const total = metrics.length;
        const avgResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / total;
        const cacheHits = metrics.filter(m => m.cacheHit).length;

        return {
          timestamp: parseInt(timestamp),
          totalRequests: total,
          successRate: successful / total,
          averageResponseTime: avgResponseTime,
          cacheHitRate: cacheHits / total
        };
      });
  }

  /**
   * Get slowest endpoints
   */
  static getSlowestEndpoints(limit: number = 10, timeWindowMs: number = 3600000) {
    const cutoffTime = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    const endpointAvgs: Record<string, { total: number; count: number }> = {};
    
    for (const metric of recentMetrics) {
      if (!endpointAvgs[metric.endpoint]) {
        endpointAvgs[metric.endpoint] = { total: 0, count: 0 };
      }
      endpointAvgs[metric.endpoint].total += metric.duration;
      endpointAvgs[metric.endpoint].count += 1;
    }

    return Object.entries(endpointAvgs)
      .map(([endpoint, { total, count }]) => ({
        endpoint,
        averageResponseTime: total / count,
        requestCount: count
      }))
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);
  }

  /**
   * Clear old metrics
   */
  static clearOldMetrics(olderThanMs: number = 86400000) { // 24 hours
    const cutoffTime = Date.now() - olderThanMs;
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleared ${removedCount} old performance metrics`);
    }
  }

  /**
   * Export metrics for external analysis
   */
  static exportMetrics(timeWindowMs?: number) {
    let metricsToExport = this.metrics;
    
    if (timeWindowMs) {
      const cutoffTime = Date.now() - timeWindowMs;
      metricsToExport = this.metrics.filter(m => m.timestamp > cutoffTime);
    }

    return {
      exportTime: new Date().toISOString(),
      totalMetrics: metricsToExport.length,
      timeRange: {
        start: metricsToExport.length > 0 ? new Date(Math.min(...metricsToExport.map(m => m.timestamp))).toISOString() : null,
        end: metricsToExport.length > 0 ? new Date(Math.max(...metricsToExport.map(m => m.timestamp))).toISOString() : null
      },
      metrics: metricsToExport
    };
  }

  /**
   * Log performance metric
   */
  private static logMetric(metric: PerformanceMetric) {
    const status = metric.success ? '✅' : '❌';
    const cache = metric.cacheHit ? '🎯' : '📡';
    const retry = metric.retryCount ? `(retry ${metric.retryCount})` : '';
    
    console.log(`${status} ${cache} ${metric.endpoint}: ${metric.duration}ms ${retry}`);

    // Alert on slow responses
    if (metric.duration > this.HEALTH_THRESHOLD.RESPONSE_TIME) {
      console.warn(`⚠️ Slow response detected: ${metric.endpoint} took ${metric.duration}ms`);
    }

    // Alert on failures
    if (!metric.success) {
      console.error(`❌ Request failed: ${metric.endpoint} - ${metric.errorType || 'Unknown error'}`);
    }
  }

  /**
   * Start automatic cleanup of old metrics
   */
  static startAutoCleanup(intervalMs: number = 3600000) { // 1 hour
    setInterval(() => {
      this.clearOldMetrics();
    }, intervalMs);
    
    console.log('🧹 Started automatic performance metrics cleanup');
  }
}
