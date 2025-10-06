// Enhanced Cache Service
// Advanced in-memory caching with TTL, LRU eviction, and statistics

interface CacheItem<T> {
  data: T;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  created: number;
}

interface CacheStats {
  totalItems: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestItem?: number;
  newestItem?: number;
}

export class EnhancedCacheService {
  private cache = new Map<string, CacheItem<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0
  };
  
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSize: number = 1000, defaultTTL: number = 900000) { // 15 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.startCleanupTimer();
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    return item.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || this.defaultTTL);

    // Check if we need to evict items
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const item: CacheItem<T> = {
      data,
      expiry,
      accessCount: 1,
      lastAccessed: now,
      created: now
    };

    this.cache.set(key, item);
    this.stats.sets++;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from cache
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let oldestItem: number | undefined;
    let newestItem: number | undefined;
    let memoryUsage = 0;

    for (const [key, item] of this.cache) {
      // Estimate memory usage (rough approximation)
      memoryUsage += key.length * 2; // UTF-16 string
      memoryUsage += JSON.stringify(item.data).length * 2;
      memoryUsage += 64; // Overhead for item object

      if (!oldestItem || item.created < oldestItem) {
        oldestItem = item.created;
      }
      if (!newestItem || item.created > newestItem) {
        newestItem = item.created;
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalItems: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      memoryUsage,
      oldestItem,
      newestItem
    };
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch new data
    const data = await fetcher();
    
    // Store in cache
    this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Batch get multiple keys
   */
  mget<T>(keys: string[]): Array<T | null> {
    return keys.map(key => this.get<T>(key));
  }

  /**
   * Batch set multiple key-value pairs
   */
  mset<T>(items: Array<{ key: string; data: T; ttl?: number }>): void {
    items.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  /**
   * Get keys matching a pattern
   */
  keys(pattern?: string): string[] {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Get items that will expire within the specified time
   */
  getExpiringItems(withinMs: number): string[] {
    const cutoff = Date.now() + withinMs;
    const expiring: string[] = [];

    for (const [key, item] of this.cache) {
      if (item.expiry <= cutoff) {
        expiring.push(key);
      }
    }

    return expiring;
  }

  /**
   * Refresh TTL for a key
   */
  touch(key: string, ttl?: number): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    item.expiry = Date.now() + (ttl || this.defaultTTL);
    item.lastAccessed = Date.now();
    
    return true;
  }

  /**
   * Get most accessed items
   */
  getMostAccessed(limit: number = 10): Array<{ key: string; accessCount: number }> {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, accessCount: item.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return items;
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired items
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache) {
      if (now > item.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired items`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 300000);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Export cache data for backup/analysis
   */
  exportData(): any {
    const data: any = {};
    
    for (const [key, item] of this.cache) {
      data[key] = {
        data: item.data,
        expiry: item.expiry,
        accessCount: item.accessCount,
        lastAccessed: item.lastAccessed,
        created: item.created
      };
    }

    return {
      cache: data,
      stats: this.stats,
      exportTime: new Date().toISOString()
    };
  }

  /**
   * Import cache data from backup
   */
  importData(exportedData: any): void {
    this.clear();
    
    if (exportedData.cache) {
      for (const [key, item] of Object.entries(exportedData.cache as any)) {
        // Only import non-expired items
        const cacheItem = item as any;
        if (cacheItem.expiry > Date.now()) {
          this.cache.set(key, cacheItem);
        }
      }
    }

    if (exportedData.stats) {
      this.stats = { ...exportedData.stats };
    }

    console.log(`📥 Imported ${this.cache.size} cache items`);
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

// Global cache instance
export const globalCache = new EnhancedCacheService(2000, 900000); // 2000 items, 15 min TTL

// Specialized caches for different data types
export const vehicleCache = new EnhancedCacheService(500, 1800000); // 30 min TTL for vehicle data
export const valuationCache = new EnhancedCacheService(1000, 900000); // 15 min TTL for valuations
export const authCache = new EnhancedCacheService(100, 600000); // 10 min TTL for auth tokens
