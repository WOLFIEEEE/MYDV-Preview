/**
 * Logo Cache Utility
 * 
 * This utility provides intelligent caching for user logos with:
 * - localStorage persistence
 * - Background refresh capabilities
 * - Automatic cache invalidation
 * - Event-based cache updates
 */

export interface LogoCacheData {
  logo: string | null;
  storeName: string | null;
  source?: string;
}

interface CacheEntry {
  data: LogoCacheData;
  timestamp: number;
  userId: string;
}

// Cache configuration
const CACHE_KEY = 'mydv_logo_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (increased for stability)
const BACKGROUND_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes for background check (much less frequent)

// Custom event for cache invalidation
export const LOGO_CACHE_INVALIDATE_EVENT = 'logo-cache-invalidate';

/**
 * Get cached logo data
 */
export function getCachedLogo(userId: string): LogoCacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    
    // Validate cache is for current user
    if (entry.userId !== userId) {
      clearLogoCache();
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (age > CACHE_DURATION) {
      console.log('🔄 Logo cache expired, needs refresh');
      return null;
    }

    console.log('✅ Using cached logo (age:', Math.round(age / 1000), 'seconds)');
    return entry.data;
  } catch (error) {
    console.error('Error reading logo cache:', error);
    clearLogoCache();
    return null;
  }
}

/**
 * Set cached logo data
 */
export function setCachedLogo(userId: string, data: LogoCacheData): void {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      userId
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    console.log('💾 Logo cached successfully');
  } catch (error) {
    console.error('Error setting logo cache:', error);
  }
}

/**
 * Clear logo cache
 */
export function clearLogoCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Logo cache cleared');
  } catch (error) {
    console.error('Error clearing logo cache:', error);
  }
}

/**
 * Check if cache needs background refresh
 */
export function shouldBackgroundRefresh(userId: string): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const entry: CacheEntry = JSON.parse(cached);
    
    // Only refresh for current user
    if (entry.userId !== userId) return false;

    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Trigger background refresh if cache is older than refresh interval
    // but still valid (not expired)
    return age > BACKGROUND_REFRESH_INTERVAL && age < CACHE_DURATION;
  } catch {
    return false;
  }
}

/**
 * Fetch logo from API
 */
export async function fetchLogoFromAPI(): Promise<LogoCacheData | null> {
  try {
    const response = await fetch('/api/user-logo');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching logo from API:', error);
    return null;
  }
}

/**
 * Get logo with caching strategy
 * Returns cached version immediately if available,
 * and optionally triggers background refresh
 */
export async function getLogoWithCache(
  userId: string,
  options: {
    forceRefresh?: boolean;
    onBackgroundUpdate?: (data: LogoCacheData) => void;
  } = {}
): Promise<LogoCacheData | null> {
  const { forceRefresh = false, onBackgroundUpdate } = options;

  // If force refresh, skip cache
  if (forceRefresh) {
    const data = await fetchLogoFromAPI();
    if (data) {
      setCachedLogo(userId, data);
    }
    return data;
  }

  // Try to get from cache first
  const cached = getCachedLogo(userId);
  
  // If cache exists and valid, return it
  if (cached) {
    // Check if we should do a background refresh
    if (shouldBackgroundRefresh(userId) && onBackgroundUpdate) {
      console.log('🔄 Triggering background logo refresh...');
      // Background refresh (non-blocking) with better error handling
      fetchLogoFromAPI().then((data) => {
        if (data && JSON.stringify(data) !== JSON.stringify(cached)) {
          // Only update if data actually changed
          setCachedLogo(userId, data);
          onBackgroundUpdate(data);
          console.log('✅ Background logo refresh completed with new data');
        } else {
          console.log('📋 Background refresh completed - no changes');
        }
      }).catch((error) => {
        console.error('Background refresh failed:', error);
        // Don't call onBackgroundUpdate on error to prevent UI flicker
      });
    }
    
    return cached;
  }

  // No cache, fetch from API
  console.log('📡 Fetching logo from API (no cache)...');
  const data = await fetchLogoFromAPI();
  if (data) {
    setCachedLogo(userId, data);
  }
  return data;
}

/**
 * Invalidate cache when logo is updated
 * Call this after logo upload/update
 */
export function invalidateLogoCache(): void {
  clearLogoCache();
  
  // Dispatch custom event for components to react with debouncing
  if (typeof window !== 'undefined') {
    // Clear any existing timeout to prevent rapid successive invalidations
    const globalWindow = window as Window & { __logoInvalidateTimeout?: NodeJS.Timeout };
    if (globalWindow.__logoInvalidateTimeout) {
      clearTimeout(globalWindow.__logoInvalidateTimeout);
    }
    
    // Debounce the invalidation event
    globalWindow.__logoInvalidateTimeout = setTimeout(() => {
      window.dispatchEvent(new CustomEvent(LOGO_CACHE_INVALIDATE_EVENT));
      delete globalWindow.__logoInvalidateTimeout;
    }, 200); // 200ms debounce
  }
}

/**
 * Setup cache invalidation listener
 * Use this in components that display the logo
 */
export function setupCacheInvalidationListener(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    console.log('🔔 Logo cache invalidated, refreshing...');
    callback();
  };

  window.addEventListener(LOGO_CACHE_INVALIDATE_EVENT, handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener(LOGO_CACHE_INVALIDATE_EVENT, handler);
  };
}

