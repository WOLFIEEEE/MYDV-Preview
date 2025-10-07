"use client";

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

interface AutoTraderLimit {
  current: number;
  maximum: number;
  capped: number;
  available: number;
}

interface AutoTraderLimitsResponse {
  success: boolean;
  data: {
    advertiserId: string;
    listingCount: number;
    allowances: any[];
    lastUpdated: string;
  };
  fromCache?: boolean;
  cachedAt?: string;
  error?: string;
}

/**
 * Custom hook to fetch AutoTrader limits with intelligent caching
 * 
 * Features:
 * - Client-side React Query caching (5 minutes stale time)
 * - Server-side caching (5 minutes TTL)
 * - Request deduplication
 * - Automatic retry on failure
 * - Error handling
 * 
 * @param activeCount - Current count of active autotrader listings
 * @param enabled - Whether the query should run (default: true)
 * @returns Query result with autoTraderLimit data
 */
export function useAutoTraderLimits(activeCount: number = 0, enabled: boolean = true) {
  const { isSignedIn, isLoaded } = useUser();
  
  const query = useQuery<AutoTraderLimit | null>({
    queryKey: ['autotrader-limits', activeCount],
    queryFn: async () => {
      console.log('🔄 Fetching AutoTrader limits...');
      
      const response = await fetch('/api/autotrader/limits', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch limits: ${response.status}`);
      }
      
      const result: AutoTraderLimitsResponse = await response.json();
      
      if (!result.success) {
        console.error('❌ AutoTrader limits API error:', result.error);
        throw new Error(result.error || 'Failed to get limits data');
      }
      
      const maxLimit = result.data?.listingCount || 0;
      
      const limitData: AutoTraderLimit = {
        current: activeCount,
        maximum: maxLimit,
        capped: 0, // Will be calculated from stock data separately
        available: Math.max(0, maxLimit - activeCount)
      };
      
      console.log('✅ AutoTrader limits fetched:', {
        ...limitData,
        fromCache: result.fromCache,
        cachedAt: result.cachedAt
      });
      
      return limitData;
    },
    enabled: enabled && isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches server cache
    gcTime: 10 * 60 * 1000,   // 10 minutes - keep in memory longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false,       // Use cached data on mount
    retry: 1,                    // Only retry once on failure
    retryDelay: 1000,            // Wait 1 second before retry
  });
  
  return {
    autoTraderLimit: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message || null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Hook variant that calculates capped count from stock data
 * 
 * @param activeCount - Current count of active autotrader listings
 * @param stockData - Array of stock items to check for CAPPED status
 * @param enabled - Whether the query should run
 */
export function useAutoTraderLimitsWithCapped(
  activeCount: number = 0,
  stockData: any[] = [],
  enabled: boolean = true
) {
  const result = useAutoTraderLimits(activeCount, enabled);
  
  // Calculate capped count from stock data
  const cappedCount = stockData.filter(vehicle => {
    const adverts = vehicle.adverts?.retailAdverts;
    return adverts?.autotraderAdvert?.status === 'CAPPED';
  }).length;
  
  // Merge capped count into the result
  const autoTraderLimitWithCapped = result.autoTraderLimit ? {
    ...result.autoTraderLimit,
    capped: cappedCount
  } : null;
  
  return {
    ...result,
    autoTraderLimit: autoTraderLimitWithCapped,
  };
}
