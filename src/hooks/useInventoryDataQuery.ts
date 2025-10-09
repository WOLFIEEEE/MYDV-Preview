"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

// Define the inventory item interface
export interface InventoryItem {
  // From MyStock table (stockCache)
  registration: string;
  stockId: string;
  makeModel: string;
  mileage: number;
  
  // From Cost table (vehicleCosts)
  totalCost: number;
  totalVatable: number;
  totalNonVatable: number;
  
  // From Purchase Info table (inventoryDetails)
  purchasePrice?: number;
  purchaseDate?: string;
  
  // From Sales table (saleDetails)
  salesDate: string | null;
  salesPrice: number;
  
  // From Checklist table (vehicleChecklist)
  checklistStatus: 'Added' | 'Some Missing' | 'Not Added';
  
  // Sales Details Status
  salesDetailsStatus: 'Added' | 'Not Added';
  
  // From Return Cost table (returnCosts)
  returnCostVatable: number;
  returnCostNonVatable: number;
  
  // Additional useful data
  make: string;
  model: string;
  derivative?: string; // Add derivative field for variant export
  yearOfManufacture?: number;
  fuelType?: string;
  bodyType?: string;
  lifecycleState?: string;
  forecourtPriceGBP: number;
  dateOnForecourt?: string;
  
  // Published status data from stock cache
  advertsData?: any; // Contains the published status information
}

export interface InventoryAPIResponse {
  success: boolean;
  data: InventoryItem[];
  error?: string;
}

export interface UseInventoryDataOptions {
  dealerId: string;
  disabled?: boolean;
}

// Query key factory for consistent cache keys with USER ISOLATION
export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryQueryKeys.all, 'list'] as const,
  list: (dealerId: string, userCacheId?: string | null) => {
    // CRITICAL: Include user identification to prevent cross-user data leakage
    if (!userCacheId) {
      console.warn('⚠️ Inventory query key missing user identification - potential cache leakage risk');
      // Return a temporary key that will never be used for actual caching
      return [...inventoryQueryKeys.lists(), 'no-user-auth-pending'] as const;
    }
    
    // Create dealer-user specific cache key
    const dealerUserKey = `${dealerId}_user_${userCacheId}`;
    return [...inventoryQueryKeys.lists(), dealerUserKey] as const;
  },
};

// Fetch function for inventory list
async function fetchInventoryList(dealerId: string): Promise<InventoryItem[]> {
  console.log('\n🔄 ===== REACT QUERY: FETCHING INVENTORY DATA =====');
  console.log('📡 Request URL:', `/api/inventory?dealerId=${dealerId}`);
  console.log('⚠️  This should only appear on cache misses or first loads!');
  
  const response = await fetch(`/api/inventory?dealerId=${dealerId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Check if response has content before trying to parse JSON
  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    console.error('❌ Empty response from inventory API');
    console.error('📡 Request URL:', `/api/inventory?dealerId=${dealerId}`);
    console.error('🔍 This usually indicates an issue with dealer ID configuration or no inventory data available');
    throw new Error('NO_INVENTORY_DATA_AVAILABLE');
  }

  let result: InventoryAPIResponse;
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ Inventory JSON Parse Error:', parseError);
    console.error('📄 Response Text:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
    throw new Error(`Invalid JSON response from inventory API: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
  }
  
  console.log('\n📦 ===== REACT QUERY: RECEIVED INVENTORY RESPONSE =====');
  console.log('✅ Response success:', result.success);
  console.log('📊 Inventory items count:', result.data?.length || 0);
  console.log('🎯 Data will be cached for 10 minutes (stale) and 30 minutes (garbage collection)');

  if (!response.ok || !result.success) {
    console.log('❌ REACT QUERY: Fetch failed:', result.error || 'Unknown error');
    throw new Error(result.error || 'Failed to fetch inventory data');
  }

  if (!result.data) {
    throw new Error('No data received from inventory API');
  }

  return result.data;
}

// Hook for fetching inventory list with caching and USER ISOLATION
export function useInventoryDataQuery(options: UseInventoryDataOptions) {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  
  // Generate user-specific cache ID - only when user is loaded and authenticated
  const userCacheId = user?.id && isLoaded ? `user_${user.id}` : null;
  
  // Early return with disabled state if user is not loaded or authenticated
  const shouldExecuteQuery = isLoaded && !!userCacheId && !!options.dealerId && !options.disabled;
  
  const query = useQuery({
    queryKey: shouldExecuteQuery 
      ? inventoryQueryKeys.list(options.dealerId, userCacheId)
      : ['inventory', 'disabled'] as const, // Safe fallback key when disabled
    queryFn: () => fetchInventoryList(options.dealerId),
    enabled: shouldExecuteQuery, // Only enable when all conditions are met
    staleTime: 10 * 60 * 1000, // 10 minutes - inventory changes frequently
    gcTime: 30 * 60 * 1000, // 30 minutes cache time - shorter for dynamic inventory data
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    refetchOnMount: false, // Don't refetch if data is still fresh
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: 2, // Increased retry attempts
    // Add networkMode to handle offline scenarios better
    networkMode: 'offlineFirst',
  });

  // Helper function to invalidate inventory cache
  const invalidateInventoryCache = () => {
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
  };

  // Helper function to update cache after inventory changes
  const updateInventoryInCache = (stockId: string, updatedData: Partial<InventoryItem>) => {
    // Only update cache if we have a valid user context
    if (!shouldExecuteQuery || !userCacheId) return;
    
    queryClient.setQueryData(
      inventoryQueryKeys.list(options.dealerId, userCacheId),
      (oldData: InventoryItem[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map((item: InventoryItem) =>
          item.stockId === stockId ? { ...item, ...updatedData } : item
        );
      }
    );
  };

  // Helper function to add new inventory item to cache
  const addInventoryToCache = (newItem: InventoryItem) => {
    // Only update cache if we have a valid user context
    if (!shouldExecuteQuery || !userCacheId) return;
    
    queryClient.setQueryData(
      inventoryQueryKeys.list(options.dealerId, userCacheId),
      (oldData: InventoryItem[] | undefined) => {
        if (!oldData) return [newItem];
        return [newItem, ...oldData];
      }
    );
  };

  // Helper function to remove inventory item from cache
  const removeInventoryFromCache = (stockId: string) => {
    // Only update cache if we have a valid user context
    if (!shouldExecuteQuery || !userCacheId) return;
    
    queryClient.setQueryData(
      inventoryQueryKeys.list(options.dealerId, userCacheId),
      (oldData: InventoryItem[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((item: InventoryItem) => item.stockId !== stockId);
      }
    );
  };

  return {
    data: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
    // Cache management helpers
    invalidateInventoryCache,
    updateInventoryInCache,
    addInventoryToCache,
    removeInventoryFromCache,
  };
}
