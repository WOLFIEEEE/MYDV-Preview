/**
 * Rate Limiter Utility
 * 
 * Implements IP-based and token-based rate limiting for API endpoints
 * with configurable time windows and request limits.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request should be allowed based on rate limiting
   * @param identifier - Unique identifier (e.g., IP address, token, user ID)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status, remaining requests, and reset time
   */
  check(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60 * 60 * 1000 // 1 hour default
  ): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter: number;
  } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // If no entry exists or the window has expired, create a new one
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + windowMs;
      this.requests.set(identifier, {
        count: 1,
        resetAt
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
        retryAfter: 0
      };
    }

    // Check if limit is exceeded
    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      };
    }

    // Increment count and allow request
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
      retryAfter: 0
    };
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - The identifier to reset
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Get current status for an identifier without incrementing
   * @param identifier - The identifier to check
   * @param limit - Maximum number of requests allowed
   */
  getStatus(
    identifier: string,
    limit: number = 10
  ): {
    remaining: number;
    resetAt: number | null;
    count: number;
  } {
    const entry = this.requests.get(identifier);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      return {
        remaining: limit,
        resetAt: null,
        count: 0
      };
    }

    return {
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
      count: entry.count
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.requests.forEach((entry, key) => {
      if (now >= entry.resetAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.requests.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`🧹 Rate limiter: Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Get current cache size (for monitoring)
   */
  getCacheSize(): number {
    return this.requests.size;
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.requests.clear();
  }

  /**
   * Cleanup and stop the interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export class for testing or multiple instances
export { RateLimiter };

/**
 * Helper function to get client identifier from request
 * Tries to get the real IP address from various headers
 */
export function getClientIdentifier(request: Request): string {
  const headers = request.headers;
  
  // Try various headers in order of preference
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the list (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback to a generic identifier
  return 'unknown-client';
}

