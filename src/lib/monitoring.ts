// Production monitoring and performance tracking
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface ErrorMetric {
  error: string;
  stack?: string;
  context?: string;
  timestamp: number;
  userId?: string;
  url?: string;
}

class MonitoringService {
  private static instance: MonitoringService;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory
  private maxErrors = 100; // Keep last 100 errors in memory

  private constructor() {
    // Initialize performance observer if available
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initPerformanceObserver();
    }
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private initPerformanceObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.trackMetric('page_load_time', entry.duration, {
              type: 'navigation',
              url: window.location.pathname,
            });
          } else if (entry.entryType === 'measure') {
            this.trackMetric(entry.name, entry.duration, {
              type: 'custom_measure',
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'measure'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  // Track performance metrics
  trackMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log significant metrics
    if (value > 5000) { // > 5 seconds
      console.warn(`⚠️ Slow operation detected: ${name} took ${value}ms`, tags);
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendMetricToService(metric);
    }
  }

  // Track errors
  trackError(error: string, context?: string, stack?: string, userId?: string) {
    const errorMetric: ErrorMetric = {
      error,
      stack,
      context: context || undefined,
      timestamp: Date.now(),
      userId: userId || undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    this.errors.push(errorMetric);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    console.error('🚨 Error tracked:', errorMetric);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToService(errorMetric);
    }
  }

  // Track API call performance
  trackApiCall(endpoint: string, duration: number, status: number, method = 'GET') {
    this.trackMetric('api_call_duration', duration, {
      endpoint,
      status: status.toString(),
      method,
    });

    // Track error rates
    if (status >= 400) {
      this.trackMetric('api_error_count', 1, {
        endpoint,
        status: status.toString(),
        method,
      });
    }
  }

  // Track cache hit/miss rates
  trackCacheEvent(type: 'hit' | 'miss' | 'stale', source: string) {
    this.trackMetric('cache_event', 1, {
      type,
      source,
    });
  }

  // Track user actions
  trackUserAction(action: string, context?: string, userId?: string) {
    const tags: Record<string, string> = { action };
    if (context) tags.context = context;
    if (userId) tags.userId = userId;
    
    this.trackMetric('user_action', 1, tags);
  }

  // Get performance summary
  getPerformanceSummary(timeWindow = 300000): { // 5 minutes default
    avgApiTime: number;
    errorRate: number;
    cacheHitRate: number;
    totalRequests: number;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    const apiCalls = recentMetrics.filter(m => m.name === 'api_call_duration');
    const apiErrors = recentMetrics.filter(m => m.name === 'api_error_count');
    const cacheHits = recentMetrics.filter(m => m.name === 'cache_event' && m.tags?.type === 'hit');
    const cacheMisses = recentMetrics.filter(m => m.name === 'cache_event' && m.tags?.type === 'miss');

    const avgApiTime = apiCalls.length > 0 
      ? apiCalls.reduce((sum, m) => sum + m.value, 0) / apiCalls.length 
      : 0;

    const errorRate = apiCalls.length > 0 
      ? (apiErrors.length / apiCalls.length) * 100 
      : 0;

    const totalCacheEvents = cacheHits.length + cacheMisses.length;
    const cacheHitRate = totalCacheEvents > 0 
      ? (cacheHits.length / totalCacheEvents) * 100 
      : 0;

    return {
      avgApiTime,
      errorRate,
      cacheHitRate,
      totalRequests: apiCalls.length,
    };
  }

  private sendMetricToService(metric: PerformanceMetric) {
    // In production, send to your monitoring service (e.g., DataDog, New Relic, etc.)
    // Example:
    // fetch('/api/metrics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(metric)
    // }).catch(console.error);
  }

  private sendErrorToService(error: ErrorMetric) {
    // In production, send to your error tracking service (e.g., Sentry, Rollbar, etc.)
    // Example:
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(error)
    // }).catch(console.error);
  }

  // Clear old data (call periodically)
  cleanup() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
  }
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance();

// Utility functions for common tracking scenarios
export function trackApiCall<T>(
  promise: Promise<T>,
  endpoint: string,
  method = 'GET'
): Promise<T> {
  const start = Date.now();
  
  return promise
    .then((result) => {
      const duration = Date.now() - start;
      monitoring.trackApiCall(endpoint, duration, 200, method);
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - start;
      const status = error?.status || 500;
      monitoring.trackApiCall(endpoint, duration, status, method);
      monitoring.trackError(
        `API call failed: ${endpoint}`,
        `${method} ${endpoint}`,
        error?.stack
      );
      throw error;
    });
}

export function measurePerformance<T>(
  fn: () => T,
  name: string,
  tags?: Record<string, string>
): T {
  const start = Date.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result
        .then((value) => {
          monitoring.trackMetric(name, Date.now() - start, tags);
          return value;
        })
        .catch((error) => {
          monitoring.trackMetric(name, Date.now() - start, { ...tags, error: 'true' });
          throw error;
        }) as T;
    } else {
      monitoring.trackMetric(name, Date.now() - start, tags);
      return result;
    }
  } catch (error) {
    monitoring.trackMetric(name, Date.now() - start, { ...tags, error: 'true' });
    throw error;
  }
}

// React hook for tracking component performance
export function usePerformanceTracking(componentName: string) {
  const trackRender = () => {
    monitoring.trackMetric('component_render', 1, { component: componentName });
  };

  const trackUserAction = (action: string) => {
    monitoring.trackUserAction(action, componentName);
  };

  return { trackRender, trackUserAction };
}
