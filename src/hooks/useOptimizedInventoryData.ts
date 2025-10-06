"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';
import type { InventoryItem, InventoryAPIResponse } from './useInventoryDataQuery';

// Enhanced loading states for better UX
export type InventoryLoadingState = 'initial' | 'cached' | 'refreshing' | 'error' | 'complete';

export interface OptimizedInventoryData {
  data: InventoryItem[];
  loading: boolean;
  error: string | null;
  loadingState: InventoryLoadingState;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
  invalidateCache: () => void;
}

interface InventoryQueryOptions {
  dealerId: string;
  disabled?: boolean;
}

// Query key factory for consistent cache keys
export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryQueryKeys.all, 'list'] as const,
  list: (dealerId: string) => {
    if (!dealerId) {
      return [...inventoryQueryKeys.lists(), 'no-dealer-pending'] as const;
    }
    return [...inventoryQueryKeys.lists(), `dealer_${dealerId}`] as const;
  },
};

// Enhanced fetch function for inventory data
async function fetchInventoryData(dealerId: string): Promise<InventoryItem[]> {
  console.log('\n🚀 ===== OPTIMIZED INVENTORY FETCH =====');
  console.log('📡 Request URL:', `/api/inventory?dealerId=${dealerId}`);
  
  const response = await fetch(`/api/inventory?dealerId=${dealerId}`, {
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
    throw new Error('NO_INVENTORY_DATA_AVAILABLE');
  }

  let result: InventoryAPIResponse;
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    throw new Error(`Invalid JSON response from inventory API`);
  }
  
  console.log('\n📦 ===== OPTIMIZED INVENTORY RESPONSE =====');
  console.log('✅ Response success:', result.success);
  console.log('📊 Inventory items count:', result.data?.length || 0);

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch inventory data');
  }

  return result.data;
}

// Hook for optimized inventory data with instant cache display
export function useOptimizedInventoryData(options: InventoryQueryOptions): OptimizedInventoryData {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  const [loadingState, setLoadingState] = useState<InventoryLoadingState>('initial');
  
  const { dealerId, disabled } = options;
  const shouldExecuteQuery = isLoaded && !!dealerId && !disabled;

  // Get existing cached data immediately
  const existingData = queryClient.getQueryData(
    shouldExecuteQuery ? inventoryQueryKeys.list(dealerId) : ['inventory', 'disabled']
  ) as InventoryItem[] | undefined;

  const query = useQuery({
    queryKey: shouldExecuteQuery 
      ? inventoryQueryKeys.list(dealerId)
      : ['inventory', 'disabled'] as const,
    queryFn: () => fetchInventoryData(dealerId),
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

  // Helper function to invalidate inventory cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
  }, [queryClient]);

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
