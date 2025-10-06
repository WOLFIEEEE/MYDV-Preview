"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';

// Enhanced loading states for better UX
export type GenericLoadingState = 'initial' | 'cached' | 'refreshing' | 'error' | 'complete';

export interface OptimizedGenericData<T = any> {
  data: T[];
  loading: boolean;
  error: string | null;
  loadingState: GenericLoadingState;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
  invalidateCache: () => void;
}

interface GenericQueryOptions {
  endpoint: string;
  queryKey: string;
  dealerId?: string;
  disabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

// Query key factory for consistent cache keys
export const createGenericQueryKeys = (baseKey: string) => ({
  all: [baseKey] as const,
  lists: () => [baseKey, 'list'] as const,
  list: (dealerId?: string, params?: Record<string, any>) => {
    const key = [baseKey, 'list'];
    if (dealerId) key.push(`dealer_${dealerId}`);
    if (params) key.push(JSON.stringify(params));
    return key;
  },
});

// Enhanced fetch function for generic data
async function fetchGenericData<T = any>(endpoint: string, dealerId?: string): Promise<T[]> {
  console.log(`\n🚀 ===== OPTIMIZED ${endpoint.toUpperCase()} FETCH =====`);
  
  const url = dealerId ? `${endpoint}?dealerId=${dealerId}` : endpoint;
  console.log('📡 Request URL:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    throw new Error(`NO_${endpoint.replace('/api/', '').toUpperCase()}_DATA_AVAILABLE`);
  }

  let result: any;
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    throw new Error(`Invalid JSON response from ${endpoint} API`);
  }
  
  console.log(`\n📦 ===== OPTIMIZED ${endpoint.toUpperCase()} RESPONSE =====`);
  console.log('✅ Response success:', result.success);
  console.log('📊 Items count:', result.data?.length || 0);

  if (!result.success) {
    throw new Error(result.error || `Failed to fetch ${endpoint} data`);
  }

  return result.data || [];
}

// Hook for optimized generic data with instant cache display
export function useOptimizedGenericData<T = any>(options: GenericQueryOptions): OptimizedGenericData<T> {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  const [loadingState, setLoadingState] = useState<GenericLoadingState>('initial');
  
  const { 
    endpoint, 
    queryKey, 
    dealerId, 
    disabled = false,
    staleTime = 0,
    gcTime = 48 * 60 * 60 * 1000 // 48 hours default
  } = options;
  
  const shouldExecuteQuery: boolean = Boolean(isLoaded && !disabled && (dealerId || !endpoint.includes('dealerId')));

  // Create query keys
  const queryKeys = createGenericQueryKeys(queryKey);
  const cacheKey = shouldExecuteQuery 
    ? queryKeys.list(dealerId)
    : [queryKey, 'disabled'] as const;

  // Get existing cached data immediately
  const existingData = queryClient.getQueryData(cacheKey) as T[] | undefined;

  const query = useQuery({
    queryKey: cacheKey as any,
    queryFn: () => fetchGenericData<T>(endpoint, dealerId),
    enabled: shouldExecuteQuery,
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount - use cache first
    refetchOnReconnect: true,
    // Use existing data as placeholder while fetching fresh data
    placeholderData: existingData,
    retry: (failureCount, error) => {
      const errorMessage = error?.message || '';
      
      // Don't retry configuration errors
      if (errorMessage.includes('Invalid dealer') ||
          errorMessage.includes('Authentication failed') ||
          errorMessage.includes('401') || errorMessage.includes('403') || 
          errorMessage.includes('404') || errorMessage.includes('400')) {
        return false;
      }
      
      // Retry up to 2 times on network errors
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

  // Helper function to invalidate cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.all });
  }, [queryClient, queryKeys.all]);

  // Determine the data to show (prefer fresh data, fallback to cached)
  const displayData = query.data || existingData;
  const hasData = !!displayData && displayData.length > 0;

  return {
    data: displayData || [],
    loading: loadingState === 'initial' && !hasData,
    error: query.error?.message || null,
    loadingState,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
    invalidateCache,
  };
}
