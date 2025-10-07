"use client";

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { StockAPIResponse, StockItem, UseStockDataOptions } from './useStockData';
import { stockDataMonitor } from '@/lib/stockDataMonitor';
import { BrowserCompatibilityManager } from '@/lib/browserCompatibility';
import { userConcurrencyManager } from '@/lib/userConcurrencyManager';

// Query key factory for consistent cache keys with better deduplication and USER ISOLATION
export const stockQueryKeys = {
  all: ['stock'] as const,
  lists: () => [...stockQueryKeys.all, 'list'] as const,
  list: (filters: UseStockDataOptions, userCacheId?: string | null) => {
    // CRITICAL: Include user identification to prevent cross-user data leakage
    if (!userCacheId) {
      console.warn('⚠️ Stock query key missing user identification - potential cache leakage risk');
      // Return a temporary key that will never be used for actual caching
      return [...stockQueryKeys.lists(), 'no-user-auth-pending'] as const;
    }
    
    // Normalize filters to prevent unnecessary cache misses and improve deduplication
    const normalizedFilters = {
      // Only include non-empty/non-default values, sorted for consistency
      ...(filters.page && filters.page !== 1 && { page: filters.page }),
      ...(filters.pageSize && filters.pageSize !== 10 && { pageSize: filters.pageSize }),
      ...(filters.lifecycleState && { lifecycleState: filters.lifecycleState }),
      ...(filters.ownershipCondition && { ownershipCondition: filters.ownershipCondition }),
      ...(filters.make && { make: filters.make }),
      ...(filters.model && { model: filters.model }),
      ...(filters.sortBy && filters.sortBy !== 'updated' && { sortBy: filters.sortBy }),
      ...(filters.sortOrder && filters.sortOrder !== 'desc' && { sortOrder: filters.sortOrder }),
    };
    
    // Sort keys for consistent cache key generation
    const sortedFilters = Object.keys(normalizedFilters)
      .sort()
      .reduce((result, key) => {
        const typedKey = key as keyof typeof normalizedFilters;
        if (normalizedFilters[typedKey] !== undefined) {
          (result as any)[key] = normalizedFilters[typedKey];
        }
        return result;
      }, {} as typeof normalizedFilters);
    
    // Include user cache ID for proper isolation
    const cacheKey = [...stockQueryKeys.lists(), userCacheId, sortedFilters];
    return cacheKey as readonly unknown[];
  },
  details: () => [...stockQueryKeys.all, 'detail'] as const,
  detail: (stockId: string, userCacheId?: string | null) => {
    // CRITICAL: Include user identification for stock details
    if (!userCacheId) {
      // Return a temporary key that will never be used for actual caching
      return [...stockQueryKeys.details(), 'no-user-auth-pending', stockId] as const;
    }
    const cacheKey = [...stockQueryKeys.details(), userCacheId, stockId];
    return cacheKey as readonly unknown[];
  },
};

// Enhanced fetch with timeout and retry for React Query
async function fetchWithRetryRQ(url: string, options: RequestInit = {}, maxRetries = 2): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for UI requests
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Don't retry on 4xx errors (client errors) or specific data integrity errors
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Check if this is a duplicate key error and don't retry
      if (response.status === 422) {
        const errorData = await response.clone().json();
        if (errorData.error?.message?.includes('Duplicate stock ID detected') ||
            errorData.error?.message?.includes('duplicate key')) {
          console.log('❌ Not retrying duplicate key error');
          return response;
        }
      }
      
      // Retry on 5xx errors
      if (attempt === maxRetries) {
        return response; // Let React Query handle the error
      }
      
      const delay = Math.min(1000 * attempt, 3000); // Max 3s delay for UI
      console.log(`⏳ UI Request retry ${attempt}/${maxRetries} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout after 25 seconds');
      }
      
      const delay = Math.min(1000 * attempt, 3000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Fetch function for stock list with enhanced error handling and concurrency control
async function fetchStockList(options: UseStockDataOptions = {}, userId?: string): Promise<StockAPIResponse['data']> {
  // If userId is provided, use concurrency control
  if (userId) {
    return await userConcurrencyManager.executeRequest(
      userId,
      'stock_fetch',
      () => fetchStockListInternal(options),
      'medium'
    );
  }
  
  return await fetchStockListInternal(options);
}

// Internal fetch function
async function fetchStockListInternal(options: UseStockDataOptions = {}): Promise<StockAPIResponse['data']> {
  const params = new URLSearchParams();
  
  // Add query parameters
  if (options.page) params.append('page', options.page.toString());
  if (options.pageSize) params.append('pageSize', options.pageSize.toString());
  if (options.lifecycleState) params.append('lifecycleState', options.lifecycleState);
  if (options.ownershipCondition) params.append('ownershipCondition', options.ownershipCondition);
  if (options.make) params.append('make', options.make);
  if (options.model) params.append('model', options.model);
  
  // Include all data points
  params.append('includeHistory', 'true');
  params.append('includeCheck', 'true');
  params.append('includeFeatures', 'true');
  params.append('includeHighlights', 'true');
  params.append('includeMedia', 'true');

  console.log('\n🔄 ===== REACT QUERY: FETCHING STOCK DATA =====');
  console.log('📡 Request URL:', `/api/stock?${params.toString()}`);
  console.log('⚠️  This should only appear on cache misses or first loads!');
  
  // Use browser-aware fetch for better compatibility
  const response = await BrowserCompatibilityManager.enhancedFetch(`/api/stock?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Check if response has content before trying to parse JSON
  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    console.error('❌ Empty response from stock API');
    console.error('📡 Request URL:', `/api/stock?${params.toString()}`);
    console.error('🔍 This usually indicates an issue with advertiser ID configuration or no stock data available');
    
    // Retry once more after a short delay for transient issues
    console.log('🔄 Retrying empty response after 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const retryResponse = await BrowserCompatibilityManager.enhancedFetch(`/api/stock?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const retryText = await retryResponse.text();
    if (!retryText || retryText.trim() === '') {
      throw new Error('NO_STOCK_DATA_AVAILABLE');
    }
    
    // Use retry response if it has content
    const retryResult = JSON.parse(retryText);
    if (!retryResponse.ok) {
      let errorMessage = `HTTP ${retryResponse.status}: ${retryResponse.statusText}`;
      if (retryResult.error?.message) {
        errorMessage = retryResult.error.message;
      }
      throw new Error(errorMessage);
    }
    
    if (!retryResult.data) {
      throw new Error('No data received from API after retry');
    }
    
    return retryResult.data;
  }

  let result: StockAPIResponse;
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    console.error('📄 Response Text:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
    throw new Error(`Invalid JSON response from stock API: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
  }
  
  console.log('\n📦 ===== REACT QUERY: RECEIVED API RESPONSE =====');
  console.log('✅ Response success:', result.success);
  console.log('📊 Stock items count:', result.data?.stock?.length || 0);
  console.log('📄 Pagination:', result.data?.pagination);
  console.log('🗄️ Cache status:', result.data?.cache);
  
  // Log first item analysis for debugging
  if (result.data?.stock && result.data.stock.length > 0) {
    console.log('\n🚗 ===== REACT QUERY: FIRST ITEM ANALYSIS =====');
    const firstItem = result.data.stock[0];
    console.log('🆔 Stock ID:', firstItem.stockId);
    console.log('🚗 Make:', firstItem.make);
    console.log('🚗 Model:', firstItem.model);
    console.log('📋 Registration:', firstItem.registration);
    console.log('📊 Lifecycle state:', firstItem.lifecycleState);
    console.log('💰 Price:', firstItem.forecourtPrice || firstItem.totalPrice || firstItem.adverts?.retailAdverts?.forecourtPrice?.amountGBP || firstItem.adverts?.retailAdverts?.totalPrice?.amountGBP);
    console.log('📢 Advert status:', firstItem.advertStatus);
    console.log('🏗️ Top-level keys:', Object.keys(firstItem));
    
    // Check for missing critical data
    const missingData = [];
    if (!firstItem.make) missingData.push('make');
    if (!firstItem.model) missingData.push('model');
    if (!firstItem.registration) missingData.push('registration');
    if (!firstItem.forecourtPrice && !firstItem.totalPrice && !firstItem.adverts?.retailAdverts?.forecourtPrice?.amountGBP && !firstItem.adverts?.retailAdverts?.totalPrice?.amountGBP) missingData.push('price');
    
    if (missingData.length > 0) {
      console.warn('⚠️ REACT QUERY: Missing critical data in first item:', missingData);
    }
  }

  if (!response.ok || !result.success) {
    console.log('❌ REACT QUERY: Fetch failed:', result.error?.message || 'Unknown error');
    
    // Create user-friendly error messages based on status codes
    let errorMessage = result.error?.message || 'Failed to fetch stock data';
    
    if (response.status === 422) {
      // Unprocessable Entity - data integrity issues
      if (result.error?.message?.includes('Duplicate stock ID detected')) {
        errorMessage = 'Data Integrity Issue: ' + (result.error?.details || 'Duplicate stock IDs found in your feed. Please contact support to resolve this critical issue.');
      } else {
        errorMessage = 'Data integrity issue detected. Please contact support.';
      }
    } else if (response.status === 400) {
      // Bad request - configuration errors
      if (result.error?.message?.includes('Invalid Advertiser Configuration') ||
          result.error?.message?.includes('advertiser ID')) {
        errorMessage = 'Invalid Advertiser ID: Your advertiser ID configuration is incorrect. Please check your account settings and verify your advertiser ID.';
      } else {
        errorMessage = 'Configuration error. Please check your account settings.';
      }
    } else if (response.status === 409) {
      // Conflict - advertiser ID already in use
      errorMessage = 'Advertiser ID Conflict: This advertiser ID is already being used by another account. Please contact support to resolve this issue.';
    } else if (response.status === 206) {
      // Partial content - some data loaded but with issues
      errorMessage = 'Stock data partially loaded. Some items may be missing. Please try refreshing.';
    } else if (response.status === 503) {
      // Service unavailable
      errorMessage = 'Stock service is temporarily unavailable. Please try again in a moment.';
    } else if (response.status === 502) {
      // Bad gateway - external service error
      errorMessage = 'Unable to fetch stock data from AutoTrader. Please try again later.';
    } else if (response.status >= 500) {
      // Server errors
      errorMessage = 'Server error occurred while loading stock data. Please try again.';
    } else if (response.status === 404) {
      // Not found
      errorMessage = 'Stock configuration not found. Please contact support.';
    } else if (response.status === 401) {
      // Unauthorized
      errorMessage = 'Please sign in to view stock data.';
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).originalError = result.error;
    throw error;
  }

  if (!result.data) {
    throw new Error('No data received from API');
  }

  return result.data;
}

// Hook for fetching stock list with caching and USER ISOLATION
export function useStockDataQuery(options: UseStockDataOptions = {}) {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  
  // Generate user-specific cache ID - only when user is loaded and authenticated
  const userCacheId = user?.id && isLoaded ? `user_${user.id}` : null;
  
  // Early return with disabled state if user is not loaded or authenticated
  const shouldExecuteQuery = isLoaded && !!userCacheId && !options.disabled;
  
  // Add retry delay state to prevent rapid retries
  const [lastRetryTime, setLastRetryTime] = React.useState<number>(0);
  const MIN_RETRY_INTERVAL = 5000; // 5 seconds minimum between retries

  // Monitor authentication state changes and browser compatibility
  React.useEffect(() => {
    if (userCacheId && isLoaded) {
      const browserInfo = BrowserCompatibilityManager.getDiagnosticInfo();
      stockDataMonitor.recordEvent(userCacheId, 'auth_change', { 
        isAuthenticated: !!user,
        isLoaded,
        userId: user?.id,
        browserInfo
      });

      // Check for browser limitations that could cause issues
      const limitations = BrowserCompatibilityManager.checkBrowserLimitations();
      if (limitations.hasLimitations) {
        console.warn('⚠️ Browser limitations detected:', limitations.issues);
        stockDataMonitor.recordEvent(userCacheId, 'fetch_error', {
          error: 'Browser compatibility issues detected',
          details: limitations
        });
      }
    }
  }, [user?.id, isLoaded, userCacheId]);

  const query = useQuery({
    queryKey: shouldExecuteQuery 
      ? stockQueryKeys.list(options, userCacheId)
      : ['stock', 'disabled'] as const, // Safe fallback key when disabled
    queryFn: async () => {
      console.log('\n📡 ===== useStockDataQuery: FETCH INITIATED =====');
      console.log('⏰ Time:', new Date().toISOString());
      console.log('👤 User:', user?.id);
      console.log('📝 Options:', options);
      
      try {
        // Record fetch start
        if (userCacheId) {
          stockDataMonitor.recordEvent(userCacheId, 'fetch_start', { options });
        }
        
        console.log('🔄 Calling fetchStockList (will use backend cache-first)...');
        const result = await fetchStockList(options, user?.id);
        
        console.log('\n✅ ===== useStockDataQuery: FETCH SUCCESS =====');
        console.log('📊 Stock items:', result.stock?.length || 0);
        console.log('📊 Total results:', result.pagination?.totalResults || 0);
        console.log('🗄️ From cache:', result.cache?.fromCache);
        console.log('⏰ Time:', new Date().toISOString());
        
        setLastRetryTime(0); // Reset on success
        
        // Record success
        if (userCacheId && result) {
          stockDataMonitor.recordEvent(userCacheId, 'fetch_success', { 
            resultCount: result.stock?.length || 0,
            totalResults: result.pagination?.totalResults || 0
          });
        }
        
        // Log if we got empty results (not an error, just informational)
        if (result.stock?.length === 0) {
          console.warn('\n⚠️ ===== EMPTY STOCK DATA =====');
          console.warn('📭 No stock items in response');
          console.warn('🔍 Check: Dealer record exists? Advertiser ID configured?');
          console.warn('⏰ Time:', new Date().toISOString());
        }
        
        return result;
      } catch (error) {
        const now = Date.now();
        setLastRetryTime(now);
        
        console.error('\n❌ ===== useStockDataQuery: FETCH FAILED =====');
        console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown');
        console.error('⏰ Time:', new Date().toISOString());
        
        // Record error
        if (userCacheId) {
          stockDataMonitor.recordEvent(userCacheId, 'fetch_error', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            options
          });
        }
        
        throw error;
      }
    },
    enabled: shouldExecuteQuery, // Only enable when all conditions are met
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - match backend cache duration
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache retention - match MAX_CACHE_AGE_HOURS
    refetchOnWindowFocus: false, // Prevent excessive refetching on focus
    refetchOnMount: false, // Use cached data on mount for better performance
    refetchOnReconnect: true, // Refetch when network reconnects
    retry: (failureCount, error) => {
      const errorMessage = error?.message || '';
      
      // Don't retry rate limiting
      if (errorMessage.includes('Rate limited')) {
        console.log('🚫 Not retrying rate limited request');
        return false;
      }
      
      // Don't retry configuration errors or data integrity issues - these need manual fixing
      if (errorMessage.includes('Duplicate stock ID detected') ||
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('Data Integrity Issue') ||
          errorMessage.includes('Database Error') ||
          errorMessage.includes('Database query execution failed') ||
          errorMessage.includes('Database insert failed') ||
          errorMessage.includes('Invalid Advertiser Configuration') ||
          errorMessage.includes('advertiser ID is correct') ||
          errorMessage.includes('AutoTrader Authentication Failed') ||
          errorMessage.includes('Advertiser ID Conflict') ||
          errorMessage.includes('foreign key constraint') ||
          errorMessage.includes('constraint violation')) {
        console.log('❌ Not retrying configuration/integrity/database error:', errorMessage);
        return false;
      }
      
      // Don't retry on client errors (4xx) or database errors (500)
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('404') || 
          errorMessage.includes('400') || errorMessage.includes('409') || errorMessage.includes('422')) {
        console.log('❌ Not retrying client error:', errorMessage);
        return false;
      }
      
      // Don't retry on 500 errors that are database related
      const errorStatus = (error as any)?.status;
      if (errorStatus === 500) {
        console.log('❌ Not retrying server error (500):', errorMessage);
        return false;
      }
      
      // Retry up to 3 times on network errors or temporary failures only
      return failureCount < 3;
    },
    retryDelay: attemptIndex => {
      // Exponential backoff with jitter: 1s, 2s, 4s (max)
      const baseDelay = Math.min(1000 * Math.pow(2, attemptIndex), 4000);
      const jitter = Math.random() * 500; // Add up to 500ms jitter
      return baseDelay + jitter;
    },
    networkMode: 'online', // Changed from 'offlineFirst' for better reliability
    // Add error boundary
    throwOnError: false, // Let the component handle errors gracefully
  });

  // Helper function to invalidate stock cache
  const invalidateStockCache = () => {
    queryClient.invalidateQueries({ queryKey: stockQueryKeys.all });
  };

  // Helper function to update cache after stock changes
  const updateStockInCache = (stockId: string, updatedData: Partial<StockItem>) => {
    // Only update cache if we have a valid user context
    if (!shouldExecuteQuery || !userCacheId) return;
    
    // Update all stock list queries that might contain this item
    queryClient.setQueriesData(
      { queryKey: stockQueryKeys.lists() },
      (oldData: any) => {
        if (!oldData?.stock) return oldData;
        
        return {
          ...oldData,
          stock: oldData.stock.map((item: StockItem) =>
            item.stockId === stockId ? { ...item, ...updatedData } : item
          ),
        };
      }
    );

    // Also update the individual stock detail cache if it exists
    queryClient.setQueryData(
      stockQueryKeys.detail(stockId, userCacheId),
      (oldData: any) => oldData ? { ...oldData, ...updatedData } : undefined
    );
  };

  return {
    data: query.data?.stock || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    pagination: query.data?.pagination || {
      page: 1,
      pageSize: 10,
      totalResults: 0,
      totalPages: 0,
      hasNextPage: false
    },
    availableFilters: query.data?.availableFilters || null,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
    // Cache management helpers
    invalidateStockCache,
    updateStockInCache,
  };
}

// Fetch function for individual stock detail
async function fetchStockDetail(stockId: string): Promise<any> {
  console.log('\n🔄 ===== REACT QUERY: FETCHING STOCK DETAIL =====');
  console.log('📡 Request URL:', `/api/stock/${stockId}`);

  const response = await fetch(`/api/stock/${stockId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stock details: ${response.status}`);
  }

  const data = await response.json();
  
  console.log('\n📦 ===== REACT QUERY: RECEIVED STOCK DETAIL =====');
  console.log('✅ Response success:', data.success);

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to load stock details');
  }

  return data.data;
}

// Hook for fetching individual stock detail with caching and USER ISOLATION
export function useStockDetailQuery(stockId: string, enabled: boolean = true) {
  const { user, isLoaded } = useUser();
  
  // Generate user-specific cache ID - only when user is loaded and authenticated
  const userCacheId = user?.id && isLoaded ? `user_${user.id}` : null;
  
  // Early return with disabled state if user is not loaded or authenticated
  const shouldExecuteQuery = enabled && !!stockId && isLoaded && !!userCacheId;
  
  const query = useQuery({
    queryKey: shouldExecuteQuery
      ? stockQueryKeys.detail(stockId, userCacheId)
      : ['stock', 'detail', 'disabled'] as const, // Safe fallback key when disabled
    queryFn: () => fetchStockDetail(stockId),
    enabled: shouldExecuteQuery, // Only enable when all conditions are met
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - match backend cache duration
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache retention
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}

// Helper hook to prefetch stock detail
export function usePrefetchStockDetail() {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  
  // Generate user-specific cache ID - only when user is loaded and authenticated
  const userCacheId = user?.id && isLoaded ? `user_${user.id}` : null;

  return (stockId: string) => {
    if (!userCacheId || !isLoaded) {
      console.warn('⚠️ Cannot prefetch stock detail without user identification');
      return;
    }
    
    queryClient.prefetchQuery({
      queryKey: stockQueryKeys.detail(stockId, userCacheId),
      queryFn: () => fetchStockDetail(stockId),
      staleTime: 24 * 60 * 60 * 1000, // 24 hours - match backend cache duration
    });
  };
}