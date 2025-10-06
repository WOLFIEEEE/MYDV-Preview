// Token caching system for AutoTrader API authentication
// Stores tokens in memory and automatically handles expiry

interface CachedToken {
  access_token: string;
  expires_at: string;
  cached_at: number; // Unix timestamp when cached
}

class TokenCache {
  private static instance: TokenCache;
  private cache: Map<string, CachedToken> = new Map();

  private constructor() {}

  static getInstance(): TokenCache {
    if (!TokenCache.instance) {
      TokenCache.instance = new TokenCache();
    }
    return TokenCache.instance;
  }

  /**
   * Generate cache key from API credentials
   */
  private getCacheKey(key: string, secret: string, baseUrl: string): string {
    // Create a hash-like key from credentials (don't store actual credentials)
    const combined = `${key.slice(0, 8)}:${secret.slice(0, 8)}:${baseUrl}`;
    return Buffer.from(combined).toString('base64').slice(0, 16);
  }

  /**
   * Check if a token is still valid (with 5-minute buffer)
   */
  private isTokenValid(cachedToken: CachedToken): boolean {
    const now = Date.now();
    const expiryTime = new Date(cachedToken.expires_at).getTime();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    // Token is valid if it expires more than 5 minutes from now
    return expiryTime > (now + bufferTime);
  }

  /**
   * Get cached token if valid, otherwise return null
   */
  getCachedToken(key: string, secret: string, baseUrl: string): CachedToken | null {
    const cacheKey = this.getCacheKey(key, secret, baseUrl);
    const cachedToken = this.cache.get(cacheKey);

    if (!cachedToken) {
      console.log('🔍 No cached token found');
      return null;
    }

    if (!this.isTokenValid(cachedToken)) {
      console.log('⏰ Cached token expired, removing from cache');
      this.cache.delete(cacheKey);
      return null;
    }

    const remainingTime = Math.round((new Date(cachedToken.expires_at).getTime() - Date.now()) / 1000 / 60);
    console.log(`✅ Using cached token (expires in ${remainingTime} minutes)`);
    return cachedToken;
  }

  /**
   * Store a new token in cache
   */
  setCachedToken(key: string, secret: string, baseUrl: string, tokenData: { access_token: string; expires_at: string }): void {
    const cacheKey = this.getCacheKey(key, secret, baseUrl);
    const cachedToken: CachedToken = {
      access_token: tokenData.access_token,
      expires_at: tokenData.expires_at,
      cached_at: Date.now()
    };

    this.cache.set(cacheKey, cachedToken);
    
    const remainingTime = Math.round((new Date(tokenData.expires_at).getTime() - Date.now()) / 1000 / 60);
    console.log(`💾 Token cached successfully (expires in ${remainingTime} minutes)`);
  }

  /**
   * Invalidate a specific token (used when receiving 401 errors)
   */
  invalidateToken(key: string, secret: string, baseUrl: string): void {
    const cacheKey = this.getCacheKey(key, secret, baseUrl);
    const existed = this.cache.has(cacheKey);
    this.cache.delete(cacheKey);
    if (existed) {
      console.log('🗑️ Token invalidated from cache due to authentication failure');
    }
  }

  /**
   * Clear all cached tokens (useful for testing or credential changes)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Token cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalTokens: number; validTokens: number } {
    const totalTokens = this.cache.size;
    let validTokens = 0;

    for (const token of this.cache.values()) {
      if (this.isTokenValid(token)) {
        validTokens++;
      }
    }

    return { totalTokens, validTokens };
  }

  /**
   * Clean up expired tokens from cache
   */
  cleanupExpiredTokens(): void {
    let removedCount = 0;
    
    for (const [key, token] of this.cache.entries()) {
      if (!this.isTokenValid(token)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired tokens`);
    }
  }
}

export default TokenCache.getInstance(); 