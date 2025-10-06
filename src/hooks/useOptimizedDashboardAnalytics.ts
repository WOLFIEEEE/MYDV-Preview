import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { DashboardAnalytics, dashboardQueryKeys } from './useDashboardAnalytics';

export type LoadingState = 'initial' | 'cached' | 'refreshing' | 'error';

interface CacheStatus {
  fromCache: boolean;
  lastRefresh: Date | null;
  staleCacheUsed: boolean;
  isRefreshing: boolean;
}

interface UseOptimizedDashboardAnalyticsOptions {
  disabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

// Fetch function for dashboard analytics
async function fetchDashboardAnalytics(userId?: string): Promise<DashboardAnalytics> {
  console.log('\n🔄 ===== OPTIMIZED DASHBOARD ANALYTICS FETCH =====');
  console.log('📡 Request URL:', '/api/dashboard/analytics');
  console.log('👤 User ID:', userId);
  console.log('🚀 Using optimized instant cache display pattern');
  
  const response = await fetch('/api/dashboard/analytics', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  
  console.log('\n📊 ===== OPTIMIZED DASHBOARD RESPONSE =====');
  console.log('✅ Response success:', result.success);
  console.log('📈 Analytics data received');
  console.log('📊 Has inventory:', result.data?.summary?.hasInventory);
  console.log('📋 Data completion rate:', result.data?.summary?.dataCompletionRate?.toFixed(1) + '%');
  console.log('🎯 Data cached for instant display on next load');

  if (!response.ok || !result.success) {
    console.log('❌ OPTIMIZED DASHBOARD: Fetch failed:', result.error || 'Unknown error');
    throw new Error(result.error || 'Failed to fetch dashboard analytics');
  }

  if (!result.data) {
    console.log('⚠️ No data received from dashboard analytics API - returning empty analytics');
    // Return default empty analytics instead of throwing error
    return {
      inventory: {
        overview: {
          totalVehicles: 0,
          totalValue: 0,
          averagePrice: 0,
          averageDaysInStock: 0,
          averageYear: 0,
          priceRange: { min: 0, max: 0 }
        },
        byStatus: [],
        byMake: [],
        byFuelType: [],
        byBodyType: []
      },
      dataCompleteness: {
        overview: {
          totalStock: 0,
          missingChecklist: 0,
          missingSaleDetails: 0,
          missingCosts: 0,
          missingMargins: 0,
          missingInventoryDetails: 0,
          missingInvoices: 0
        },
        byDataType: [],
        stockDetails: []
      },
      summary: {
        hasInventory: false,
        dataCompletionRate: 0,
        mostMissingDataType: 'No data available'
      }
    };
  }

  return result.data;
}

// Get cached data synchronously for instant display
function getCachedDashboardData(userId?: string): DashboardAnalytics | undefined {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const queryClient = (window as any).__REACT_QUERY_CLIENT__;
    if (!queryClient) return undefined;
    
    const cacheKey = dashboardQueryKeys.analytics(userId);
    return queryClient.getQueryData(cacheKey);
  } catch (error) {
    console.log('📋 No cached dashboard data available');
    return undefined;
  }
}

export function useOptimizedDashboardAnalytics(options: UseOptimizedDashboardAnalyticsOptions = {}) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const userId = user?.id;
  
  const {
    disabled = false,
    staleTime = 0, // Always consider data stale to trigger background refresh
    gcTime = 2 * 60 * 60 * 1000, // 2 hours cache retention
  } = options;

  // Store query client globally for sync access
  if (typeof window !== 'undefined') {
    (window as any).__REACT_QUERY_CLIENT__ = queryClient;
  }

  const shouldExecuteQuery = !!userId && !disabled;
  const cacheKey = shouldExecuteQuery 
    ? dashboardQueryKeys.analytics(userId)
    : ['dashboard', 'disabled'] as const;

  const query = useQuery({
    queryKey: cacheKey,
    queryFn: () => fetchDashboardAnalytics(userId),
    enabled: shouldExecuteQuery,
    staleTime, // Always consider data stale to trigger background refresh
    gcTime, // Keep cache for 2 hours
    refetchOnMount: false, // Don't refetch on mount - use cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (no dealer record) to prevent infinite loops
      if (error?.message?.includes('404') || error?.message?.includes('Dealer record not found')) {
        console.log('🚫 Not retrying dashboard analytics fetch - dealer record not found');
        return false;
      }
      // Only retry up to 1 time for other errors
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
    initialData: () => {
      // Try to get cached data immediately
      return getCachedDashboardData(userId);
    },
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  });

  // Get existing cached data for comparison
  const existingData = getCachedDashboardData(userId);
  const hasData = !!(query.data || existingData);

  // Determine loading state
  let loadingState: LoadingState = 'initial';
  if (query.error) {
    loadingState = 'error';
  } else if (hasData && query.isFetching) {
    loadingState = 'refreshing';
  } else if (hasData) {
    loadingState = 'cached';
  } else if (query.isLoading) {
    loadingState = 'initial';
  }

  // Cache invalidation function
  const invalidateDashboardCache = () => {
    console.log('🗑️ Invalidating dashboard analytics cache');
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  };

  console.log('📊 Dashboard Analytics State:', {
    hasData,
    loadingState,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isStale: query.isStale,
    error: query.error?.message
  });

  return {
    data: query.data || existingData || {
      inventory: {
        overview: {
          totalVehicles: 0,
          totalValue: 0,
          averagePrice: 0,
          averageDaysInStock: 0,
          averageYear: 0,
          priceRange: { min: 0, max: 0 }
        },
        byStatus: [],
        byMake: [],
        byFuelType: [],
        byBodyType: []
      },
      dataCompleteness: {
        overview: {
          totalStock: 0,
          missingChecklist: 0,
          missingSaleDetails: 0,
          missingCosts: 0,
          missingMargins: 0,
          missingInventoryDetails: 0,
          missingInvoices: 0
        },
        byDataType: [],
        stockDetails: []
      },
      summary: {
        hasInventory: false,
        dataCompletionRate: 0,
        mostMissingDataType: 'No data available'
      }
    },
    loading: query.isLoading,
    error: query.error?.message || null,
    loadingState,
    cacheStatus: {
      fromCache: !!existingData && !query.data,
      lastRefresh: null, // Dashboard API doesn't provide this
      staleCacheUsed: !!existingData && query.isStale,
      isRefreshing: query.isFetching && hasData,
    } as CacheStatus,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
    invalidateDashboardCache,
  };
}
