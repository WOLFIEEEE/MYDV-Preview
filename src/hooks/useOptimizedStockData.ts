"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { stockQueryKeys } from './useStockDataQuery';
import type { StockAPIResponse, StockItem, UseStockDataOptions } from './useStockData';

// Enhanced loading states for better UX
export type LoadingState = 'initial' | 'cached' | 'refreshing' | 'error' | 'complete';

export interface OptimizedStockData {
  data: StockItem[];
  loading: boolean;
  error: string | null;
  loadingState: LoadingState;
  pagination: {
    page: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  availableFilters: any;
  cacheStatus: {
    fromCache: boolean;
    lastRefresh: Date | null;
    staleCacheUsed: boolean;
    isRefreshing: boolean;
  };
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
  invalidateStockCache: () => void;
  updateStockInCache: (stockId: string, updatedData: Partial<StockItem>) => void;
}

// Enhanced fetch function with better error handling
async function fetchStockListOptimized(options: UseStockDataOptions = {}): Promise<StockAPIResponse['data']> {
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

  console.log('\n🚀 ===== OPTIMIZED STOCK FETCH =====');
  console.log('📡 Request URL:', `/api/stock?${params.toString()}`);
  
  const response = await fetch(`/api/stock?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Enhanced error handling
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // Use the raw text if JSON parsing fails
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    throw new Error('NO_STOCK_DATA_AVAILABLE');
  }

  let result: StockAPIResponse;
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    throw new Error(`Invalid JSON response from stock API`);
  }
  
  console.log('\n📦 ===== OPTIMIZED STOCK RESPONSE =====');
  console.log('✅ Response success:', result.success);
  console.log('📊 Stock items count:', result.data?.stock?.length || 0);

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'Failed to fetch stock data');
  }

  return result.data;
}

// Hook for optimized stock data with instant cache display
export function useOptimizedStockData(options: UseStockDataOptions = {}): OptimizedStockData {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  
  // Generate user-specific cache ID
  const userCacheId = user?.id && isLoaded ? `user_${user.id}` : null;
  const shouldExecuteQuery = isLoaded && !!userCacheId && !options.disabled;

  // Get existing cached data immediately
  const existingData = queryClient.getQueryData(
    shouldExecuteQuery ? stockQueryKeys.list(options, userCacheId) : ['stock', 'disabled']
  ) as StockAPIResponse['data'] | undefined;

  const query = useQuery({
    queryKey: shouldExecuteQuery 
      ? stockQueryKeys.list(options, userCacheId)
      : ['stock', 'disabled'] as const,
    queryFn: () => fetchStockListOptimized(options),
    enabled: shouldExecuteQuery,
    staleTime: 0, // Always consider data potentially stale to enable background refresh
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache retention
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount - use cache first
    refetchOnReconnect: true,
    // Use existing data as placeholder while fetching fresh data
    placeholderData: existingData,
    retry: (failureCount, error) => {
      const errorMessage = error?.message || '';
      
      // Don't retry configuration errors or data integrity issues
      if (errorMessage.includes('Duplicate stock ID detected') ||
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('Data Integrity Issue') ||
          errorMessage.includes('Invalid Advertiser Configuration') ||
          errorMessage.includes('AutoTrader Authentication Failed') ||
          errorMessage.includes('Advertiser ID Conflict')) {
        return false;
      }
      
      // Don't retry on client errors (4xx)
      if (errorMessage.includes('401') || errorMessage.includes('403') || 
          errorMessage.includes('404') || errorMessage.includes('400') || 
          errorMessage.includes('409') || errorMessage.includes('422')) {
        return false;
      }
      
      // Retry up to 2 times on network errors or temporary failures
      return failureCount < 2;
    },
    retryDelay: attemptIndex => {
      const baseDelay = Math.min(1000 * Math.pow(2, attemptIndex), 3000);
      const jitter = Math.random() * 500;
      return baseDelay + jitter;
    },
    networkMode: 'online',
    throwOnError: false,
  });

  // Update loading state based on query status and data availability
  useEffect(() => {
    if (!shouldExecuteQuery) {
      setLoadingState('initial');
      return;
    }

    if (query.error) {
      setLoadingState('error');
    } else if (query.data || existingData) {
      if (query.isFetching) {
        setLoadingState('refreshing');
      } else {
        setLoadingState('complete');
      }
    } else if (query.isLoading) {
      setLoadingState('initial');
    } else {
      setLoadingState('cached');
    }
  }, [query.isLoading, query.isFetching, query.error, query.data, existingData, shouldExecuteQuery]);

  // Helper function to invalidate stock cache
  const invalidateStockCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: stockQueryKeys.all });
  }, [queryClient]);

  // Helper function to update cache after stock changes
  const updateStockInCache = useCallback((stockId: string, updatedData: Partial<StockItem>) => {
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
  }, [queryClient, shouldExecuteQuery, userCacheId]);

  // Determine the data to show (prefer fresh data, fallback to cached)
  const displayData = query.data || existingData;
  const hasData = !!displayData?.stock;

  return {
    data: displayData?.stock || [],
    loading: loadingState === 'initial' && !hasData,
    error: query.error?.message || null,
    loadingState,
    pagination: displayData?.pagination || {
      page: 1,
      pageSize: 10,
      totalResults: 0,
      totalPages: 0,
      hasNextPage: false
    },
    availableFilters: displayData?.availableFilters || null,
    cacheStatus: {
      fromCache: !!existingData && !query.data,
      lastRefresh: displayData?.cache?.lastRefresh || null,
      staleCacheUsed: !!existingData && query.isStale,
      isRefreshing: query.isFetching && hasData,
    },
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
    invalidateStockCache,
    updateStockInCache,
  };
}
