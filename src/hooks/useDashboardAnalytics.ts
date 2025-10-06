import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

export interface DashboardAnalytics {
  inventory: {
    overview: {
      totalVehicles: number;
      totalValue: number;
      averagePrice: number;
      averageDaysInStock: number;
      averageYear: number;
      priceRange: {
        min: number;
        max: number;
      };
    };
    byStatus: Array<{
      status: string;
      count: number;
      value: number;
    }>;
    byMake: Array<{
      make: string;
      count: number;
      avgPrice: number;
      totalValue: number;
    }>;
    byFuelType: Array<{
      fuelType: string;
      count: number;
      avgPrice: number;
    }>;
    byBodyType: Array<{
      bodyType: string;
      count: number;
      avgPrice: number;
    }>;
  };
  dataCompleteness: {
    overview: {
      totalStock: number;
      missingChecklist: number;
      missingSaleDetails: number;
      missingCosts: number;
      missingMargins: number;
      missingInventoryDetails: number;
      missingInvoices: number;
    };
    byDataType: Array<{
      type: string;
      missing: number;
      complete: number;
      percentage: number;
      description: string;
    }>;
    stockDetails: Array<{
      stockId: string;
      registration: string;
      make: string;
      model: string;
      lifecycleState: string;
      missingData: {
        checklist: boolean;
        saleDetails: boolean;
        costs: boolean;
        margins: boolean;
        inventoryDetails: boolean;
        invoices: boolean;
      };
      completionScore: number;
    }>;
  };
  summary: {
    hasInventory: boolean;
    dataCompletionRate: number;
    mostMissingDataType: string;
  };
}

interface DashboardAnalyticsResponse {
  success: boolean;
  data?: DashboardAnalytics;
  error?: string;
}

// Query keys for React Query - USER-SPECIFIC to prevent cross-user data leakage
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  analytics: (userId?: string) => [...dashboardQueryKeys.all, 'analytics', userId].filter(Boolean),
};

// Fetch function for dashboard analytics
async function fetchDashboardAnalytics(userId?: string): Promise<DashboardAnalytics> {
  console.log('\n🔄 ===== REACT QUERY: FETCHING DASHBOARD ANALYTICS =====');
  console.log('📡 Request URL:', '/api/dashboard/analytics');
  console.log('👤 User ID:', userId);
  console.log('🔑 Cache Key:', JSON.stringify(dashboardQueryKeys.analytics(userId)));
  console.log('⚠️  This should only appear on cache misses or first loads!');
  
  const response = await fetch('/api/dashboard/analytics', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result: DashboardAnalyticsResponse = await response.json();
  
      console.log('\n📊 ===== REACT QUERY: RECEIVED DASHBOARD RESPONSE =====');
    console.log('✅ Response success:', result.success);
    console.log('📈 Analytics data received');
    console.log('📊 Has inventory:', result.data?.summary?.hasInventory);
    console.log('📋 Data completion rate:', result.data?.summary?.dataCompletionRate?.toFixed(1) + '%');
    console.log('⚠️ Most missing data type:', result.data?.summary?.mostMissingDataType);
    console.log('🎯 Data will be cached for 5 minutes (stale) and 15 minutes (garbage collection)');

  if (!response.ok || !result.success) {
    console.log('❌ REACT QUERY: Fetch failed:', result.error || 'Unknown error');
    throw new Error(result.error || 'Failed to fetch dashboard analytics');
  }

  if (!result.data) {
    console.log('⚠️ No data received from dashboard analytics API - returning empty analytics');
    // FIXED: Don't throw error for empty data, return default empty analytics instead
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

// Hook for fetching dashboard analytics with caching
export function useDashboardAnalytics() {
  const { user } = useUser();
  const userId = user?.id;

  return useQuery({
    queryKey: dashboardQueryKeys.analytics(userId),
    queryFn: () => fetchDashboardAnalytics(userId),
    enabled: !!userId, // Only run query when user is available
    staleTime: 30 * 60 * 1000, // 30 minutes - analytics can be cached shorter than stock data
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - shorter retention for computed analytics
    retry: (failureCount, error: any) => {
      // FIXED: Don't retry on 404 errors (no dealer record) to prevent infinite loops
      if (error?.message?.includes('404') || error?.message?.includes('Dealer record not found')) {
        console.log('🚫 Not retrying analytics fetch - dealer record not found');
        return false;
      }
      // Only retry up to 1 time for other errors
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000), // Slower retry
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: false, // Use cached data on mount
    refetchOnReconnect: true, // Only refetch on network reconnect
    refetchInterval: false, // No auto-refresh - rely on manual refresh or cache expiry
    refetchIntervalInBackground: false, // Don't refetch when tab is inactive
  });
}
