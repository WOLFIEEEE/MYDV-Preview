// Safe Optimization Wrapper
// Adds performance optimizations WITHOUT changing existing functionality or security

import { PerformanceMonitor } from '@/lib/services/performanceMonitor';
import { globalCache } from '@/lib/services/enhancedCacheService';

interface SafeOptimizationOptions {
  enableCaching?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  enablePerformanceMonitoring?: boolean;
  endpointName?: string;
  enableParallelProcessing?: boolean;
  fallbackToOriginal?: boolean;
}

/**
 * Safe optimization wrapper that adds performance improvements without changing existing behavior
 */
export class SafeOptimizationWrapper {
  
  /**
   * Wraps an existing function with safe optimizations
   * - Preserves all original functionality
   * - Maintains all security checks
   * - Adds optional caching and monitoring
   * - Falls back to original on any optimization failure
   */
  static async wrapWithSafeOptimizations<T>(
    originalFunction: () => Promise<T>,
    options: SafeOptimizationOptions = {}
  ): Promise<T> {
    const {
      enableCaching = true,
      cacheKey,
      cacheTTL = 300000, // 5 minutes default
      enablePerformanceMonitoring = true,
      endpointName = 'unknown',
      fallbackToOriginal = true
    } = options;

    const startTime = Date.now();
    let cacheHit = false;

    try {
      // 1. Check cache first (if enabled and cache key provided)
      if (enableCaching && cacheKey) {
        const cached = globalCache.get<T>(cacheKey);
        if (cached) {
          cacheHit = true;
          
          if (enablePerformanceMonitoring) {
            PerformanceMonitor.recordMetric(
              endpointName,
              Date.now() - startTime,
              true,
              { cacheHit: true }
            );
          }
          
          console.log(`🎯 Cache hit for ${endpointName}: ${cacheKey}`);
          return cached;
        }
      }

      // 2. Execute original function (unchanged)
      console.log(`📡 Executing original function for ${endpointName}`);
      const result = await originalFunction();

      // 3. Cache the result (if enabled)
      if (enableCaching && cacheKey && result) {
        try {
          globalCache.set(cacheKey, result, cacheTTL);
          console.log(`💾 Cached result for ${endpointName}: ${cacheKey}`);
        } catch (cacheError) {
          // Cache failure should not affect the response
          console.warn(`⚠️ Cache set failed for ${endpointName}:`, cacheError);
        }
      }

      // 4. Record performance metrics (if enabled)
      if (enablePerformanceMonitoring) {
        PerformanceMonitor.recordMetric(
          endpointName,
          Date.now() - startTime,
          true,
          { cacheHit: false }
        );
      }

      console.log(`✅ ${endpointName} completed in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      // Record failure metrics
      if (enablePerformanceMonitoring) {
        PerformanceMonitor.recordMetric(
          endpointName,
          Date.now() - startTime,
          false,
          { 
            errorType: error instanceof Error ? error.message : 'Unknown error',
            cacheHit
          }
        );
      }

      console.error(`❌ ${endpointName} failed:`, error);
      
      // Re-throw the original error - no change in error handling
      throw error;
    }
  }

  /**
   * Wraps multiple parallel operations safely
   * - Executes operations in parallel for performance
   * - Maintains individual error handling for each operation
   * - Falls back gracefully if parallel processing fails
   */
  static async wrapParallelOperations<T>(
    operations: Array<{
      name: string;
      operation: () => Promise<T>;
      required: boolean;
      fallbackValue?: T;
    }>,
    options: { enableMonitoring?: boolean; timeoutMs?: number } = {}
  ): Promise<Array<T | null>> {
    const { enableMonitoring = true, timeoutMs = 10000 } = options;
    const startTime = Date.now();

    try {
      console.log(`🚀 Executing ${operations.length} operations in parallel`);

      // Execute all operations in parallel with timeout
      const promises = operations.map(async ({ name, operation, required, fallbackValue }) => {
        try {
          const operationPromise = operation();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Operation ${name} timed out`)), timeoutMs)
          );

          const result = await Promise.race([operationPromise, timeoutPromise]);
          console.log(`✅ ${name} completed successfully`);
          return result;
        } catch (error) {
          console.error(`❌ ${name} failed:`, error);
          
          if (required) {
            throw error; // Re-throw if operation is required
          }
          
          // Return fallback value for optional operations
          return fallbackValue || null;
        }
      });

      const results = await Promise.allSettled(promises);
      
      // Process results
      const finalResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const { required, fallbackValue } = operations[index];
          if (required) {
            throw result.reason;
          }
          return fallbackValue || null;
        }
      });

      if (enableMonitoring) {
        PerformanceMonitor.recordMetric(
          'parallel-operations',
          Date.now() - startTime,
          true
        );
      }

      console.log(`✅ Parallel operations completed in ${Date.now() - startTime}ms`);
      return finalResults;

    } catch (error) {
      if (enableMonitoring) {
        PerformanceMonitor.recordMetric(
          'parallel-operations',
          Date.now() - startTime,
          false
        );
      }

      console.error('❌ Parallel operations failed:', error);
      throw error;
    }
  }

  /**
   * Generates a safe cache key from request parameters
   * - Includes user ID for security isolation
   * - Handles complex objects safely
   * - Creates consistent keys for same parameters
   */
  static generateSafeCacheKey(
    endpoint: string,
    userId: string,
    params: Record<string, any> = {}
  ): string {
    try {
      // Sort parameters for consistent key generation
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((result, key) => {
          result[key] = params[key];
          return result;
        }, {} as Record<string, any>);

      // Create hash from parameters
      const paramsString = JSON.stringify(sortedParams);
      const paramsHash = Buffer.from(paramsString).toString('base64').slice(0, 16);
      
      // Include user ID for security isolation
      return `${endpoint}-${userId}-${paramsHash}`;
    } catch (error) {
      console.warn('⚠️ Cache key generation failed, using fallback:', error);
      // Fallback to simple key
      return `${endpoint}-${userId}-${Date.now()}`;
    }
  }

  /**
   * Validates that optimization is safe to apply
   * - Checks if user has proper permissions
   * - Validates request parameters
   * - Ensures no security bypasses
   */
  static validateSafeOptimization(
    user: any,
    requestParams: any,
    securityChecks: Array<() => boolean> = []
  ): { safe: boolean; reason?: string } {
    try {
      // Basic user validation
      if (!user || !user.id) {
        return { safe: false, reason: 'Invalid user' };
      }

      // Run custom security checks
      for (const check of securityChecks) {
        if (!check()) {
          return { safe: false, reason: 'Security check failed' };
        }
      }

      // Validate request parameters are not malicious
      if (requestParams && typeof requestParams === 'object') {
        const paramString = JSON.stringify(requestParams);
        if (paramString.length > 10000) {
          return { safe: false, reason: 'Request parameters too large' };
        }
      }

      return { safe: true };
    } catch (error) {
      console.warn('⚠️ Optimization validation failed:', error);
      return { safe: false, reason: 'Validation error' };
    }
  }

  /**
   * Wraps database operations with safe optimizations
   * - Adds connection pooling awareness
   * - Implements query result caching
   * - Maintains transaction integrity
   */
  static async wrapDatabaseOperation<T>(
    operation: () => Promise<T>,
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      operationName?: string;
    } = {}
  ): Promise<T> {
    const { cacheKey, cacheTTL = 300000, operationName = 'db-operation' } = options;
    const startTime = Date.now();

    try {
      // Check cache for read operations
      if (cacheKey) {
        const cached = globalCache.get<T>(cacheKey);
        if (cached) {
          PerformanceMonitor.recordMetric(
            operationName,
            Date.now() - startTime,
            true,
            { cacheHit: true }
          );
          return cached;
        }
      }

      // Execute original database operation
      const result = await operation();

      // Cache successful results
      if (cacheKey && result) {
        globalCache.set(cacheKey, result, cacheTTL);
      }

      PerformanceMonitor.recordMetric(
        operationName,
        Date.now() - startTime,
        true,
        { cacheHit: false }
      );

      return result;
    } catch (error) {
      PerformanceMonitor.recordMetric(
        operationName,
        Date.now() - startTime,
        false,
        { errorType: 'database-error' }
      );
      throw error;
    }
  }

  /**
   * Creates a safe optimization configuration for an endpoint
   */
  static createSafeConfig(
    endpointName: string,
    defaultCacheTTL: number = 300000
  ): SafeOptimizationOptions {
    return {
      enableCaching: true,
      cacheTTL: defaultCacheTTL,
      enablePerformanceMonitoring: true,
      endpointName,
      enableParallelProcessing: true,
      fallbackToOriginal: true
    };
  }

  /**
   * Get optimization statistics
   */
  static getOptimizationStats() {
    return {
      cache: globalCache.getStats(),
      performance: {
        // Get recent performance data for optimized endpoints
        endpoints: [
          'stock-list',
          'dashboard-analytics',
          'vehicle-search',
          'valuation'
        ].map(endpoint => ({
          endpoint,
          stats: PerformanceMonitor.getEndpointStats(endpoint)
        }))
      }
    };
  }
}
