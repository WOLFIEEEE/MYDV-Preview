"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  RefreshCw, 
  Search, 
  Settings,
  Eye,
  Edit3,
  Save,
  X,
  AlertCircle,
  Car,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  Check
} from "lucide-react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import LicensePlate from "@/components/ui/license-plate";
import Image from "next/image";
import Link from "next/link";
import { useStockDataQuery } from "@/hooks/useStockDataQuery";
import type { StockItem } from "@/types/stock";
import ChannelManagement from "@/components/listings/ChannelManagement";
import { ListingsDebugPanel } from "@/components/shared/ListingsDebugPanel";
import { useAutoTraderLimitsWithCapped } from "@/hooks/useAutoTraderLimits";

// Define advertising channels with their properties
const ADVERTISING_CHANNELS = [
  {
    id: 'autotrader',
    name: 'AT Search & Find',
    shortName: 'AT',
    color: 'bg-blue-500',
    description: 'Your main advert shown on AutoTrader\'s website.',
    status: 'Published or Hidden'
  },
  {
    id: 'profile',
    name: 'AT Dealer Page',
    shortName: 'PRF',
    color: 'bg-orange-500',
    description: 'Advert shown on your dealership\'s profile page within AutoTrader.',
    status: 'Published or Hidden'
  },
  {
    id: 'advertiser',
    name: 'Dealer Website',
    shortName: 'WEB',
    color: 'bg-green-500',
    description: 'Advert shown on your own dealer website (if set up with AutoTrader).',
    status: 'Published or Hidden'
  },
  {
    id: 'export',
    name: 'AT Linked Advertisers',
    shortName: 'EXP',
    color: 'bg-yellow-500',
    description: 'Advert sent to third-party sites or partners linked with AutoTrader.',
    status: 'Published or Hidden'
  },
  {
    id: 'locator',
    name: 'Manufacturer Website / Used Vehicle Locators',
    shortName: 'LOC',
    color: 'bg-purple-500',
    description: 'Advert shown in AutoTrader\'s dealer search tool where buyers find dealers near them.',
    status: 'Published or Hidden'
  }
];

interface ChannelStatus {
  [vehicleId: string]: {
    [channelId: string]: boolean;
  };
}

interface RowEditState {
  vehicleId: string;
  price: string;
  channels: { [channelId: string]: boolean };
}

function ListingsManagementContent() {
  const { isSignedIn, isLoaded } = useUser();
  const { isDarkMode } = useTheme();
  const searchParams = useSearchParams();
  const isDebugMode = searchParams.get('debug') === 'true';
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isChannelManagementOpen, setIsChannelManagementOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<RowEditState | null>(null);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{
    loading: boolean;
    success: boolean;
    error: boolean;
    message: string;
    details?: string;
  }>({ loading: false, success: false, error: false, message: '' });
  
  // Filter and pagination state
  const [filterMake, setFilterMake] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [selectedChannelFilters, setSelectedChannelFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Handle channel filter toggle
  const handleChannelFilterToggle = (channelId: string) => {
    setSelectedChannelFilters(prev => {
      if (prev.includes(channelId)) {
        // Remove filter if already selected
        return prev.filter(id => id !== channelId);
      } else {
        // Add filter if not selected
        return [...prev, channelId];
      }
    });
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  // Fetch stock data - ensure query enables when auth completes
  const queryOptions = useMemo(() => {
    const shouldFetch = isLoaded && isSignedIn;
    
    console.log('\n🔍 ===== LISTINGS: QUERY OPTIONS =====');
    console.log('👤 isLoaded:', isLoaded);
    console.log('👤 isSignedIn:', isSignedIn);
    console.log('✅ shouldFetch:', shouldFetch);
    console.log('⏰ Time:', new Date().toISOString());
    
    if (!shouldFetch) {
      console.log('🚫 LISTINGS: Query disabled - waiting for auth');
      return { disabled: true };
    }
    
    // IMPORTANT: Only show FORECOURT vehicles on listings page
    const options = { 
      pageSize: 100, // Large page size to get all data
      lifecycleState: 'FORECOURT', // Only show vehicles on forecourt
      disabled: false // Explicitly enable when conditions are met
    };
    
    console.log('✅ LISTINGS: Query ENABLED');
    console.log('📝 Query options:', options);
    console.log('⚠️ NOTE: Filtering for FORECOURT vehicles only');
    console.log('⚠️ If no results, check console logs to see available lifecycle states');
    
    return options;
  }, [isSignedIn, isLoaded]);
  
  const {
    data: stockData,
    loading,
    error,
    refetch
  } = useStockDataQuery(queryOptions);

  // 🔍 DEBUG: Log stock data whenever it changes
  useEffect(() => {
    console.log('\n📦 ===== LISTINGS: STOCK DATA RECEIVED =====');
    console.log('📊 Total items:', stockData?.length || 0);
    console.log('⏳ Loading:', loading);
    console.log('❌ Error:', error);
    console.log('⏰ Time:', new Date().toISOString());
    
    if (stockData && stockData.length > 0) {
      console.log('\n✅ ===== STOCK DATA ANALYSIS =====');
      
      // Analyze lifecycle states
      const lifecycleStates = new Map<string, number>();
      const withAdverts = stockData.filter(v => v.adverts).length;
      const withMedia = stockData.filter(v => v.media).length;
      const withMake = stockData.filter(v => v.vehicle?.make || v.make).length;
      
      stockData.forEach(v => {
        const state = v.metadata?.lifecycleState || v.lifecycleState || 'UNKNOWN';
        lifecycleStates.set(state, (lifecycleStates.get(state) || 0) + 1);
      });
      
      console.log('📊 Lifecycle States:');
      lifecycleStates.forEach((count, state) => {
        console.log(`   ${state}: ${count} vehicles`);
      });
      
      console.log('📊 With Adverts:', withAdverts);
      console.log('📊 With Media:', withMedia);
      console.log('📊 With Make:', withMake);
      
      // Log first vehicle sample
      const firstVehicle = stockData[0];
      console.log('\n🚗 ===== FIRST VEHICLE SAMPLE =====');
      console.log('🆔 Stock ID:', firstVehicle.stockId);
      console.log('🚗 Make:', firstVehicle.vehicle?.make || firstVehicle.make);
      console.log('🚗 Model:', firstVehicle.vehicle?.model || firstVehicle.model);
      console.log('📋 Registration:', firstVehicle.vehicle?.registration || firstVehicle.registration);
      console.log('📊 Lifecycle State:', firstVehicle.metadata?.lifecycleState || firstVehicle.lifecycleState);
      console.log('💰 Price:', firstVehicle.adverts?.retailAdverts?.forecourtPrice?.amountGBP || 'N/A');
      console.log('📢 Has Adverts:', !!firstVehicle.adverts);
      console.log('🏗️ Top-level keys:', Object.keys(firstVehicle));
    } else if (stockData?.length === 0) {
      console.warn('\n⚠️ ===== NO FORECOURT VEHICLES FOUND =====');
      console.warn('📭 Stock data array is empty (filtering for FORECOURT only)');
      console.warn('🔍 Possible causes:');
      console.warn('   1. No vehicles with lifecycleState = "FORECOURT" in database');
      console.warn('   2. All vehicles have different lifecycle states (ACTIVE, RESERVED, SOLD, etc.)');
      console.warn('   3. No dealer record for this user');
      console.warn('   4. Wrong advertiser ID');
      console.warn('   5. Team member not linked to store owner');
      console.warn('');
      console.warn('💡 SOLUTION:');
      console.warn('   - Check backend logs for "NO CACHE DATA FOUND" message');
      console.warn('   - Look for "Total records for dealer (any advertiser)" count');
      console.warn('   - If count > 0, vehicles exist but might not be FORECOURT state');
      console.warn('   - Check what lifecycle states exist in your data');
      console.warn('⏰ Time:', new Date().toISOString());
    }
  }, [stockData, loading, error]);

  // Helper functions - MUST be defined before useMemo/useEffect
  const getVehicleProperty = useCallback((vehicle: StockItem, property: string): string => {
    // Try nested structure first, then flattened
    const nestedValue = vehicle.vehicle?.[property as keyof typeof vehicle.vehicle];
    const flatValue = vehicle[property as keyof StockItem];
    
    // Convert to string and return
    const value = nestedValue || flatValue;
    return typeof value === 'string' ? value : String(value || '');
  }, []);

  const getPrice = useCallback((vehicle: StockItem) => {
    return vehicle.adverts?.retailAdverts?.forecourtPrice?.amountGBP || 
           vehicle.adverts?.retailAdverts?.totalPrice?.amountGBP ||
           vehicle.forecourtPrice || 
           vehicle.totalPrice || 
           0;
  }, []);

  const getVehicleImage = useCallback((vehicle: StockItem) => {
    const media = vehicle.media;
    if (media?.images && media.images.length > 0) {
      return media.images[0].href;
    }
    return null;
  }, []);

  // Initialize channel status from stock data - OPTIMIZED with useMemo
  const channelStatus = useMemo(() => {
    console.log('\n🎯 ===== LISTINGS: INITIALIZING CHANNEL STATUS =====');
    console.log('📊 Stock data length:', stockData?.length || 0);
    
    if (!stockData || stockData.length === 0) {
      console.log('⚠️ No stock data available for channel status initialization');
      return {};
    }
    
    const initialStatus: ChannelStatus = {};
    
    stockData.forEach((vehicle: StockItem, index: number) => {
      const vehicleId = vehicle.stockId;
      initialStatus[vehicleId] = {};
      
      // Map existing advert status to our channels - check both nested and flattened properties
      const adverts = vehicle.adverts?.retailAdverts;
      
      // AutoTrader channel
      const autotraderStatus = adverts?.autotraderAdvert?.status === 'PUBLISHED' ||
        vehicle.advertStatus === 'PUBLISHED';
      initialStatus[vehicleId]['autotrader'] = autotraderStatus;
      
      // Advertiser channel  
      const advertiserStatus = adverts?.advertiserAdvert?.status === 'PUBLISHED' ||
        vehicle.advertiserAdvertStatus === 'PUBLISHED';
      initialStatus[vehicleId]['advertiser'] = advertiserStatus;
        
      // Locator channel
      const locatorStatus = adverts?.locatorAdvert?.status === 'PUBLISHED';
      initialStatus[vehicleId]['locator'] = locatorStatus;
        
      // Export channel (Partner Sites)
      const exportStatus = adverts?.exportAdvert?.status === 'PUBLISHED';
      initialStatus[vehicleId]['export'] = exportStatus;
        
      // Profile channel
      const profileStatus = adverts?.profileAdvert?.status === 'PUBLISHED';
      initialStatus[vehicleId]['profile'] = profileStatus;
      
      // Log channel status for first few vehicles
      if (index < 3) {
        console.log(`🎯 Vehicle ${vehicleId} channel status:`, {
          autotrader: autotraderStatus,
          advertiser: advertiserStatus,
          locator: locatorStatus,
          export: exportStatus,
          profile: profileStatus,
          advertStatus: vehicle.advertStatus,
          advertiserAdvertStatus: vehicle.advertiserAdvertStatus
        });
      }
    });
    
    console.log('✅ Channel status initialized for', Object.keys(initialStatus).length, 'vehicles');
    return initialStatus;
  }, [stockData]);

  // Enhanced logging for production debugging
  useEffect(() => {
    console.log('\n🔍 ===== LISTINGS PAGE DATA STATE =====');
    console.log('👤 User signed in:', isSignedIn);
    console.log('📊 Loading state:', loading);
    console.log('❌ Error state:', error);
    console.log('📦 Stock data received:', !!stockData);
    console.log('📊 Stock data length:', stockData?.length || 0);
    
    if (stockData && stockData.length > 0) {
      console.log('\n🚗 ===== LISTINGS: FIRST VEHICLE ANALYSIS =====');
      const firstVehicle = stockData[0];
      console.log('🏗️ Vehicle keys:', Object.keys(firstVehicle));
      console.log('🆔 Stock ID:', firstVehicle.stockId);
      console.log('🚗 Vehicle make:', getVehicleProperty(firstVehicle, 'make'));
      console.log('🚗 Vehicle model:', getVehicleProperty(firstVehicle, 'model'));
      console.log('📋 Registration:', getVehicleProperty(firstVehicle, 'registration'));
      console.log('💰 Price:', getPrice(firstVehicle));
      console.log('📊 Lifecycle state:', firstVehicle.lifecycleState || firstVehicle.metadata?.lifecycleState);
      console.log('📢 Advert status:', firstVehicle.advertStatus);
      console.log('🎯 Channel status for this vehicle:', channelStatus[firstVehicle.stockId]);
      
      // Check for missing critical data
      const missingData = [];
      if (!getVehicleProperty(firstVehicle, 'make')) missingData.push('make');
      if (!getVehicleProperty(firstVehicle, 'model')) missingData.push('model');
      if (!getVehicleProperty(firstVehicle, 'registration')) missingData.push('registration');
      if (getPrice(firstVehicle) === 0) missingData.push('price');
      
      if (missingData.length > 0) {
        console.warn('⚠️ LISTINGS: Missing critical data in first vehicle:', missingData);
      }
    } else if (stockData && stockData.length === 0) {
      console.warn('⚠️ LISTINGS: Stock data is empty array - no vehicles found');
    } else if (!stockData) {
      console.warn('⚠️ LISTINGS: Stock data is null/undefined');
    }
    
    if (error) {
      console.error('❌ LISTINGS: Error details:', error);
    }
  }, [stockData, loading, error, isSignedIn, channelStatus, getVehicleProperty, getPrice]);

  // Filter and paginate stock data
  const filteredAndPaginatedData = useMemo(() => {
    console.log('\n🔍 ===== LISTINGS: FILTERING DATA =====');
    console.log('📊 Input stock data length:', stockData?.length || 0);
    
    if (!stockData || stockData.length === 0) {
      console.log('⚠️ LISTINGS: No stock data to filter');
      return { filteredStock: [], paginatedStock: [], totalPages: 0, totalItems: 0 };
    }

    // Apply filters
    const filtered = stockData.filter((vehicle: StockItem) => {
      // Lifecycle status filter - only show FORECOURT vehicles (exclude sold, etc.)
      const lifecycleState = vehicle.lifecycleState || vehicle.metadata?.lifecycleState;
      console.log(`🔍 Vehicle ${vehicle.stockId}: lifecycle state = "${lifecycleState}"`);
      
      if (lifecycleState?.toLowerCase() !== 'forecourt') {
        console.log(`❌ Vehicle ${vehicle.stockId}: filtered out due to lifecycle state "${lifecycleState}"`);
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const make = getVehicleProperty(vehicle, 'make')?.toLowerCase() || '';
        const model = getVehicleProperty(vehicle, 'model')?.toLowerCase() || '';
        const registration = getVehicleProperty(vehicle, 'registration')?.toLowerCase() || '';
        const derivative = getVehicleProperty(vehicle, 'derivative')?.toLowerCase() || '';
        
        if (!make.includes(searchLower) && 
            !model.includes(searchLower) && 
            !registration.includes(searchLower) && 
            !derivative.includes(searchLower)) {
          return false;
        }
      }

      // Make filter
      if (filterMake && getVehicleProperty(vehicle, 'make') !== filterMake) {
        return false;
      }

      // Model filter
      if (filterModel && getVehicleProperty(vehicle, 'model') !== filterModel) {
        return false;
      }

      // Channel filter
      if (selectedChannelFilters.length > 0) {
        if (selectedChannelFilters.includes('not-advertised')) {
          // Check if vehicle is not advertised anywhere
          const isNotAdvertised = !ADVERTISING_CHANNELS.some(channel => 
            channelStatus[vehicle.stockId]?.[channel.id] === true
          );
          if (!isNotAdvertised) {
            return false;
          }
        } else {
          // Check for specific channel matches
          const hasMatchingChannel = selectedChannelFilters.some(channelId => {
            return channelStatus[vehicle.stockId]?.[channelId] === true;
          });
          if (!hasMatchingChannel) {
            return false;
          }
        }
      }

      return true;
    });

    // Calculate pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStock = filtered.slice(startIndex, endIndex);

    console.log('\n📊 ===== LISTINGS: FILTERING RESULTS =====');
    console.log('✅ Vehicles passing filters:', totalItems);
    console.log('📄 Current page:', currentPage);
    console.log('📄 Total pages:', totalPages);
    console.log('📄 Items per page:', itemsPerPage);
    console.log('📄 Showing items:', startIndex + 1, 'to', Math.min(endIndex, totalItems));
    console.log('📄 Paginated stock length:', paginatedStock.length);

    return { filteredStock: filtered, paginatedStock, totalPages, totalItems };
  }, [stockData, searchTerm, filterMake, filterModel, selectedChannelFilters, channelStatus, currentPage, itemsPerPage, getVehicleProperty]);

  // Calculate channel tallies - OPTIMIZED with useMemo (no state needed)
  const channelTallies = useMemo(() => {
    if (!stockData || stockData.length === 0 || Object.keys(channelStatus).length === 0) {
      return {};
    }
    
    const tallies: {[key: string]: {active: number, total: number}} = {};
    
    ADVERTISING_CHANNELS.forEach(channel => {
      tallies[channel.id] = { active: 0, total: stockData.length };
      
      stockData.forEach((vehicle: StockItem) => {
        if (channelStatus[vehicle.stockId]?.[channel.id]) {
          tallies[channel.id].active++;
        }
      });
    });
    
    return tallies;
  }, [stockData, channelStatus]);
  
  // Use the optimized hook for AutoTrader limits with caching
  const { autoTraderLimit } = useAutoTraderLimitsWithCapped(
    channelTallies.autotrader?.active || 0,
    stockData || [],
    isSignedIn && (channelTallies.autotrader?.active || 0) > 0
  );

  // Get unique makes and models for filter options
  const availableMakes = useMemo(() => {
    if (!stockData) return [];
    const makes = new Set<string>();
    stockData.forEach((vehicle: StockItem) => {
      const make = getVehicleProperty(vehicle, 'make');
      if (make) makes.add(make);
    });
    return Array.from(makes).sort();
  }, [stockData, getVehicleProperty]);

  const availableModels = useMemo(() => {
    if (!stockData) return [];
    const models = new Set<string>();
    stockData.forEach((vehicle: StockItem) => {
      const vehicleMake = getVehicleProperty(vehicle, 'make');
      const model = getVehicleProperty(vehicle, 'model');
      // If a make is selected, only show models for that make
      if (filterMake && vehicleMake !== filterMake) return;
      if (model) models.add(model);
    });
    return Array.from(models).sort();
  }, [stockData, filterMake, getVehicleProperty]);

  // Filter vehicles based on search term and filters
  const filteredVehicles = useMemo(() => {
    if (!stockData) return [];
    
    return stockData.filter((vehicle: StockItem) => {
      const vehicleMake = getVehicleProperty(vehicle, 'make');
      const vehicleModel = getVehicleProperty(vehicle, 'model');
      const vehicleRegistration = getVehicleProperty(vehicle, 'registration');
      const vehicleDerivative = getVehicleProperty(vehicle, 'derivative');
      
      // Make filter
      if (filterMake && vehicleMake !== filterMake) return false;
      
      // Model filter
      if (filterModel && vehicleModel !== filterModel) return false;
      
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchableText = [
          vehicleRegistration,
          vehicleMake,
          vehicleModel,
          vehicleDerivative
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) return false;
      }
      
      return true;
    });
  }, [stockData, searchTerm, filterMake, filterModel, getVehicleProperty]);


  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMake, filterModel]);





  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Row editing functions
  const handleRowEdit = useCallback((vehicle: StockItem) => {
    const price = getPrice(vehicle);
    const channels: { [channelId: string]: boolean } = {};
    
    ADVERTISING_CHANNELS.forEach(channel => {
      channels[channel.id] = channelStatus[vehicle.stockId]?.[channel.id] || false;
    });

    setEditingRow({
      vehicleId: vehicle.stockId,
      price: price.toString(),
      channels
    });
  }, [channelStatus, getPrice]);

  const handleRowSave = useCallback(async (vehicleId: string) => {
    if (!editingRow || editingRow.vehicleId !== vehicleId) return;

    setSavingRow(vehicleId);
    setUpdateStatus({ loading: true, success: false, error: false, message: 'Updating AutoTrader listing...', details: 'Please wait while we sync your changes' });
    
    try {
      const originalVehicle = stockData?.find(v => v.stockId === vehicleId);
      if (!originalVehicle) throw new Error('Vehicle not found');

      const originalPrice = getPrice(originalVehicle);
      const newPrice = parseFloat(editingRow.price);
      
      if (isNaN(newPrice) || newPrice <= 0) {
        alert('Please enter a valid price');
        return;
      }

      // Prepare update data with proper typing
      interface UpdateData {
        stockId: string;
        price?: number;
        channels?: { [channelId: string]: boolean };
      }
      
      const updateData: UpdateData = {
        stockId: vehicleId
      };

      // Add price if changed
      if (newPrice !== originalPrice) {
        updateData.price = newPrice;
      }

      // Add channels if any changed
      const originalChannels: { [channelId: string]: boolean } = {};
      ADVERTISING_CHANNELS.forEach(channel => {
        originalChannels[channel.id] = channelStatus?.[vehicleId]?.[channel.id] || false;
      });

      const changedChannels: { [channelId: string]: boolean } = {};
      let hasChannelChanges = false;

      Object.keys(editingRow.channels).forEach(channelId => {
        if (editingRow.channels[channelId] !== originalChannels[channelId]) {
          changedChannels[channelId] = editingRow.channels[channelId];
          hasChannelChanges = true;
        }
      });

      if (hasChannelChanges) {
        updateData.channels = changedChannels;
      }

      // Only make API call if there are changes
      if (updateData.price !== undefined || updateData.channels !== undefined) {
        const response = await fetch('/api/listings/update-row', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update listing on AutoTrader');
        }

        // Note: Channel status will be recalculated from stock data after refetch
        // No need to update local state manually

        // Show success message in the loading dialog
        const updatedPrice = result.data?.price;
        const updatedChannels = result.data?.channels;
        const successMsg = 'AutoTrader listing updated successfully!';
        
        // Add details about what was updated
        const updates = [];
        if (updatedPrice) updates.push(`Price: £${updatedPrice.toLocaleString()}`);
        if (updatedChannels) {
          const channelNames = Object.entries(updatedChannels)
            .filter(([, status]) => status)
            .map(([channel]) => channel.charAt(0).toUpperCase() + channel.slice(1))
            .join(', ');
          if (channelNames) updates.push(`Published on: ${channelNames}`);
        }
        
        const details = updates.length > 0 ? updates.join(' • ') : 'All changes have been synced';
        
        setUpdateStatus({ loading: false, success: true, error: false, message: successMsg, details });
        
        // Auto-dismiss success after 3 seconds
        setTimeout(() => {
          setUpdateStatus({ loading: false, success: false, error: false, message: '' });
        }, 3000);
        
        console.log(`Successfully updated row for ${vehicleId}:`, result.data);
        
        // Refresh the data to show updated values
        await refetch();
      }
      
      setEditingRow(null);
      
    } catch (error) {
      console.error('Failed to update row:', error);
      
      // Parse error message for better user feedback
      let errorMsg = 'Failed to update listing';
      let errorDetails = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        // Make error messages more user-friendly
        if (error.message.includes('AutoTrader API returned')) {
          errorMsg = 'AutoTrader Update Failed';
          errorDetails = 'AutoTrader rejected the update. Please check your listing details and try again.';
        } else if (error.message.includes('Network error')) {
          errorMsg = 'Connection Problem';
          errorDetails = 'Unable to connect to AutoTrader. Please check your internet connection.';
        } else if (error.message.includes('Authentication')) {
          errorMsg = 'Authentication Error';
          errorDetails = 'Session expired. Please refresh the page and try again.';
        } else {
          errorDetails = error.message;
        }
      }
      
      setUpdateStatus({ loading: false, success: false, error: true, message: errorMsg, details: errorDetails });
      
      // Auto-dismiss error after 5 seconds
      setTimeout(() => {
        setUpdateStatus({ loading: false, success: false, error: false, message: '' });
      }, 5000);
    } finally {
      setSavingRow(null);
      setEditingRow(null); // Clear editing state on completion
    }
  }, [editingRow, stockData, channelStatus, refetch, getPrice]);

  const handleRowCancel = useCallback(() => {
    setEditingRow(null);
  }, []);

  const handleRowChannelToggle = useCallback((channelId: string, newStatus: boolean) => {
    if (!editingRow) return;
    
    setEditingRow(prev => prev ? {
      ...prev,
      channels: {
        ...prev.channels,
        [channelId]: newStatus
      }
    } : null);
  }, [editingRow]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-4">You need to be signed in to access the listings management.</p>
          <Link href="/sign-in">
            <Button>Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      <main className="w-full px-6 py-8 pt-24">

        {/* Debug Panel - Only show when debug=true parameter is present */}
        {isDebugMode && (
          <ListingsDebugPanel
            stockData={stockData}
            loading={loading}
            error={error}
            isSignedIn={isSignedIn}
            isLoaded={isLoaded}
            channelStatus={channelStatus}
          />
        )}

        {/* Modern Header Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-blue-600/20' : 'bg-blue-50'}`}>
                  <Car className={`h-8 w-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-4xl font-bold bg-gradient-to-r ${
                    isDarkMode 
                      ? 'from-white to-gray-300 bg-clip-text text-transparent' 
                      : 'from-gray-900 to-gray-600 bg-clip-text text-transparent'
                  }`}>
                    Listings Management
                  </h1>
                  <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Manage your vehicle listings across all advertising channels
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsChannelManagementOpen(true)}
                variant="outline"
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-800' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-4 w-4" />
                Manage Channels
              </Button>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } shadow-lg hover:shadow-xl`}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Channel Tallies - Modern Header */}
        <div className={`p-4 mb-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
        } shadow-xl backdrop-blur-md`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
              {ADVERTISING_CHANNELS.map(channel => {
                const tally = channelTallies[channel.id] || { active: 0, total: 0 };
                
                // Special handling for AutoTrader with limits
                if (channel.id === 'autotrader' && autoTraderLimit) {
                  const limitPercentage = autoTraderLimit.maximum > 0 ? Math.round((autoTraderLimit.current / autoTraderLimit.maximum) * 100) : 0;
                  const isNearLimit = limitPercentage >= 90;
                  const isAtLimit = autoTraderLimit.current >= autoTraderLimit.maximum;
                  
                  const isSelected = selectedChannelFilters.includes(channel.id);
                  
                  return (
                    <div 
                      key={channel.id} 
                      onClick={() => handleChannelFilterToggle(channel.id)}
                      className={`relative p-4 rounded-lg border transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                        isDarkMode ? 'bg-gray-800/50 border-gray-700/30 hover:bg-gray-800/70' : 'bg-gray-50/50 border-gray-200/30 hover:bg-gray-100/70'
                      } ${isAtLimit ? 'ring-2 ring-red-500/50' : isNearLimit ? 'ring-2 ring-yellow-500/50' : ''} ${
                        isSelected ? 'ring-2 ring-blue-500/50 bg-blue-50/20' : ''
                      } min-h-[80px] flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-semibold text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            {channel.name}
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className={`w-4 h-4 cursor-help ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`} />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-sm">{channel.description}</p>
                                <p className="text-xs mt-1 opacity-75">Status: {channel.status}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {isSelected && (
                            <div className="ml-auto">
                              <Check className="w-5 h-5 text-blue-500" />
                            </div>
                          )}
                          {isAtLimit && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                              LIMIT REACHED
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {autoTraderLimit.current}
                          </span>
                          <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                            / {autoTraderLimit.maximum}
                          </span>
                          <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
                            limitPercentage >= 100 ? 'bg-red-100 text-red-700' :
                            limitPercentage >= 90 ? 'bg-yellow-100 text-yellow-700' :
                            limitPercentage >= 75 ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {limitPercentage}%
                          </span>
                        </div>
                        
                        {/* Additional AutoTrader info */}
                        {autoTraderLimit.available > 0 && (
                          <div className="flex justify-between text-xs mb-2">
                            <span className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                              Available: {autoTraderLimit.available}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Progress bar */}
                      <div className={`h-2 rounded-full overflow-hidden ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <div 
                          className={`h-full transition-all duration-500 ${
                            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : channel.color
                          }`}
                          style={{ width: `${Math.min(limitPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }
                
                // Regular channel display for non-AutoTrader channels
                const percentage = tally.total > 0 ? Math.round((tally.active / tally.total) * 100) : 0;
                const isSelected = selectedChannelFilters.includes(channel.id);
                
                return (
                  <div 
                    key={channel.id} 
                    onClick={() => handleChannelFilterToggle(channel.id)}
                    className={`relative p-4 rounded-lg border transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                      isDarkMode ? 'bg-gray-800/50 border-gray-700/30 hover:bg-gray-800/70' : 'bg-gray-50/50 border-gray-200/30 hover:bg-gray-100/70'
                    } ${isSelected ? 'ring-2 ring-blue-500/50 bg-blue-50/20' : ''} min-h-[80px] flex flex-col justify-between`}>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-semibold text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                          {channel.name}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className={`w-4 h-4 cursor-help ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-sm">{channel.description}</p>
                              <p className="text-xs mt-1 opacity-75">Status: {channel.status}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {isSelected && (
                          <div className="ml-auto">
                            <Check className="w-5 h-5 text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {tally.active}
                        </span>
                        <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                          / {tally.total}
                        </span>
                        <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
                          percentage > 75 ? 'bg-green-100 text-green-700' :
                          percentage > 50 ? 'bg-yellow-100 text-yellow-700' :
                          percentage > 25 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className={`h-2 rounded-full overflow-hidden ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-full transition-all duration-500 ${channel.color}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 border rounded-md w-64 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Make Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={filterMake}
                  onChange={(e) => {
                    setFilterMake(e.target.value);
                    setFilterModel(''); // Reset model when make changes
                  }}
                  className={`pl-10 pr-8 py-2 border rounded-md w-48 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">All Makes</option>
                  {availableMakes.map((make) => (
                    <option key={make} value={make}>
                      {make}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Filter */}
              <div className="relative">
                <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value)}
                  disabled={!filterMake}
                  className={`pl-10 pr-8 py-2 border rounded-md w-48 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white disabled:opacity-50'
                      : 'bg-white border-gray-300 text-gray-900 disabled:opacity-50'
                  }`}
                >
                  <option value="">All Models</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {(filterMake || filterModel || searchTerm || selectedChannelFilters.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterMake('');
                    setFilterModel('');
                    setSelectedChannelFilters([]);
                  }}
                  className={`${
                    isDarkMode
                      ? 'border-gray-600 hover:bg-gray-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Not Advertised Anywhere Filter */}
        <div className={`mb-6 p-4 rounded-xl border ${
          isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/50 border-gray-200/50'
        } shadow-lg backdrop-blur-sm`}>
          <div className="flex items-center gap-3">
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105 ${
              selectedChannelFilters.includes('not-advertised')
                ? 'bg-red-500 text-white border-transparent shadow-md'
                : isDarkMode
                  ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={selectedChannelFilters.includes('not-advertised')}
                onChange={() => handleChannelFilterToggle('not-advertised')}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                selectedChannelFilters.includes('not-advertised')
                  ? 'bg-white border-white'
                  : isDarkMode
                    ? 'border-gray-400'
                    : 'border-gray-300'
              }`}>
                {selectedChannelFilters.includes('not-advertised') && (
                  <Check className="w-3 h-3 text-gray-800" />
                )}
              </div>
              <span className="text-sm font-medium">
                Not Advertised Anywhere
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                selectedChannelFilters.includes('not-advertised')
                  ? 'bg-white/20 text-white'
                  : isDarkMode
                    ? 'bg-gray-600 text-gray-300'
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {stockData ? stockData.filter((vehicle: StockItem) => {
                  const lifecycleState = vehicle.lifecycleState || vehicle.metadata?.lifecycleState;
                  if (lifecycleState?.toLowerCase() !== 'forecourt') return false;
                  
                  return !ADVERTISING_CHANNELS.some(channel => 
                    channelStatus[vehicle.stockId]?.[channel.id] === true
                  );
                }).length : 0}
              </span>
            </label>
          </div>
        </div>

        {/* Filter Summary */}
        {(searchTerm || filterMake || filterModel || selectedChannelFilters.length > 0) && (
          <div className={`mb-6 p-4 rounded-xl border ${
            isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-blue-50/50 border-blue-200/50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Active filters:
                </span>
                {searchTerm && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>
                    Search: &quot;{searchTerm}&quot;
                  </span>
                )}
                {filterMake && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-700'
                  }`}>
                    Make: {filterMake}
                  </span>
                )}
                {filterModel && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isDarkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                  }`}>
                    Model: {filterModel}
                  </span>
                )}
                {selectedChannelFilters.map(channelId => {
                  if (channelId === 'not-advertised') {
                    return (
                      <span key={channelId} className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isDarkMode ? 'bg-red-600/20 text-red-400' : 'bg-red-100 text-red-700'
                      }`}>
                        Not Advertised Anywhere
                      </span>
                    );
                  }
                  const channel = ADVERTISING_CHANNELS.find(ch => ch.id === channelId);
                  return channel ? (
                    <span key={channelId} className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isDarkMode ? 'bg-orange-600/20 text-orange-400' : 'bg-orange-100 text-orange-700'
                    }`}>
                      Channel: {channel.name}
                    </span>
                  ) : null;
                })}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                {filteredAndPaginatedData.totalItems} vehicle{filteredAndPaginatedData.totalItems !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        )}

        {/* Listings Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Listings</h3>
            <p className="text-gray-600 mb-4">Failed to load vehicle listings. Please try again.</p>
            <Button onClick={handleRefresh}>Retry</Button>
          </Card>
                 ) : (
           <Card className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/50 border-gray-200/50'} backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden`}>
             <CardContent className="p-0">
               {/* Important Notice Section */}
               <div className={`px-6 py-4 border-b ${
                 isDarkMode 
                   ? 'bg-blue-900/20 border-blue-800/30 text-blue-300' 
                   : 'bg-blue-50 border-blue-200 text-blue-800'
               }`}>
                 <div className="flex items-start gap-3">
                   <div className="flex-shrink-0 mt-0.5">
                     <svg className={`h-5 w-5 ${
                       isDarkMode ? 'text-blue-400' : 'text-blue-600'
                     }`} fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                     </svg>
                   </div>
                   <div className="flex-1">
                     <h4 className="text-sm font-semibold mb-1">Please Note</h4>
                     <p className="text-sm leading-relaxed">
                                             Changes won&apos;t reflect on your dashboard immediately. To maintain accuracy, we display the exact data received from AutoTrader. 
                      Updated information will appear once AutoTrader processes and confirms your changes on their end.
                     </p>
                   </div>
                 </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead className={`${isDarkMode ? 'bg-gray-800/80' : 'bg-gray-100/80'} backdrop-blur-sm`}>
                     <tr>
                      <th className={`px-6 py-2 text-left text-sm font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>
                        Vehicle Details
                      </th>
                      <th className={`px-6 py-2 text-left text-sm font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>
                        Registration
                      </th>
                      <th className={`px-6 py-2 text-left text-sm font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>
                        Price
                      </th>
                      {ADVERTISING_CHANNELS.map(channel => (
                        <th key={channel.id} className={`px-6 py-2 text-center text-sm font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-700'
                        }`}>
                          <div className="flex items-center justify-center">
                            {channel.name}
                          </div>
                        </th>
                      ))}
                      <th className={`px-6 py-2 text-center text-sm font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>
                        Actions
                      </th>
                     </tr>
                   </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredAndPaginatedData.paginatedStock.map((vehicle: StockItem) => {
                      const vehicleImage = getVehicleImage(vehicle);
                      const price = getPrice(vehicle);
                      
                      const isUpdating = savingRow === vehicle.stockId;
                      
                      return (
                        <tr key={vehicle.stockId} className={`relative transition-all duration-200 hover:${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50/50'} hover:shadow-lg group ${
                          isUpdating ? 'opacity-75' : ''
                        }`}>
                          {/* Vehicle Info */}
                          <td className="px-6 py-1">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-[40px] rounded-md overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                                {vehicleImage ? (
                                  <Image
                                    src={vehicleImage}
                                    alt={`${vehicle.make} ${vehicle.model}`}
                                    width={56}
                                    height={40}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <div className={`font-medium text-sm leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {getVehicleProperty(vehicle, 'make')} {getVehicleProperty(vehicle, 'model')}
                                </div>
                                <div className={`text-xs leading-tight ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                                  {getVehicleProperty(vehicle, 'derivative')}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Registration */}
                          <td className="px-6 py-1">
                            <LicensePlate 
                              registration={getVehicleProperty(vehicle, 'registration') || 'N/A'} 
                              size="sm"
                            />
                          </td>
                          
                          {/* Price */}
                          <td className="px-6 py-1">
                            {editingRow?.vehicleId === vehicle.stockId ? (
                              <input
                                type="number"
                                value={editingRow.price}
                                onChange={(e) => setEditingRow(prev => prev ? {...prev, price: e.target.value} : null)}
                                className={`w-20 px-2 py-1 border rounded text-sm ${
                                  isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                autoFocus
                              />
                            ) : (
                              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                £{price.toLocaleString()}
                              </span>
                            )}
                          </td>
                          
                          {/* Channel Toggles */}
                          {ADVERTISING_CHANNELS.map(channel => {
                            const isEditingThisRow = editingRow?.vehicleId === vehicle.stockId;
                            const isActive = isEditingThisRow 
                              ? editingRow.channels[channel.id] 
                              : channelStatus[vehicle.stockId]?.[channel.id] || false;
                            
                            // Check for CAPPED status on AutoTrader
                            const isCapped = channel.id === 'autotrader' && 
                              vehicle.adverts?.retailAdverts?.autotraderAdvert?.status === 'CAPPED';
                            
                            return (
                              <td key={channel.id} className="px-6 py-1 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {isEditingThisRow ? (
                                    <button
                                      onClick={() => handleRowChannelToggle(channel.id, !isActive)}
                                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 group-hover:scale-110 ${
                                        isActive 
                                          ? `${channel.color} shadow-lg focus:ring-blue-500` 
                                          : isDarkMode ? 'bg-gray-600 focus:ring-gray-400' : 'bg-gray-300 focus:ring-gray-300'
                                      } ring-2 ring-blue-400`}
                                      title={`${isActive ? 'Disable' : 'Enable'} ${channel.name}`}
                                    >
                                      <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md ${
                                          isActive ? 'translate-x-6 shadow-lg' : 'translate-x-1'
                                        }`}
                                      />
                                      {isActive && (
                                        <div className="absolute inset-0 rounded-full animate-pulse bg-white/20"></div>
                                      )}
                                    </button>
                                  ) : (
                                    <div
                                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 cursor-not-allowed opacity-60 ${
                                        isCapped
                                          ? 'bg-red-500'
                                          : isActive 
                                            ? `${channel.color}` 
                                            : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                                      }`}
                                      title={
                                        isCapped
                                          ? `CAPPED: ${channel.name} limit reached - will advertise when slot available`
                                          : `Use Edit mode to change ${channel.name} status`
                                      }
                                    >
                                      <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md ${
                                          isActive || isCapped ? 'translate-x-6 shadow-lg' : 'translate-x-1'
                                        }`}
                                      />
                                      {isCapped && (
                                        <div className="absolute inset-0 rounded-full animate-pulse bg-red-300/30"></div>
                                      )}
                                    </div>
                                  )}
                                  <span className={`text-xs font-medium ${
                                    isCapped && !isEditingThisRow
                                      ? 'text-red-600 font-bold'
                                      : isActive 
                                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                        : isDarkMode ? 'text-white' : 'text-gray-400'
                                  }`}>
                                    {isCapped && !isEditingThisRow ? 'CAPPED' : isActive ? 'ON' : 'OFF'}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                          
                          {/* Actions */}
                          <td className="px-6 py-1 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                              {editingRow?.vehicleId === vehicle.stockId ? (
                                // Edit mode actions
                                <>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleRowSave(vehicle.stockId)}
                                    disabled={updateStatus.loading}
                                    className={`h-7 px-2 rounded-lg transition-all duration-300 hover:scale-110 ${
                                      isDarkMode 
                                        ? 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50' 
                                        : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
                                    }`}
                                    title="Save changes to AutoTrader"
                                  >
                                    <Save className="h-3 w-3" />
                                    <span className="ml-1 text-xs">Save</span>
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={handleRowCancel}
                                    disabled={updateStatus.loading}
                                    className={`h-7 w-7 p-0 rounded-lg transition-all duration-300 hover:scale-110 ${
                                      isDarkMode 
                                        ? 'border-gray-600 hover:border-red-500 hover:bg-red-500/20 hover:text-red-400' 
                                        : 'border-gray-300 hover:border-red-500 hover:bg-red-50 hover:text-red-600'
                                    }`}
                                    title="Cancel Edit"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                // Normal mode actions
                                <>
                                  <Link href={`/mystock/${vehicle.stockId}`}>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className={`h-7 w-7 p-0 rounded-lg transition-all duration-300 hover:scale-110 ${
                                        isDarkMode 
                                          ? 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/20 hover:text-blue-400' 
                                          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600'
                                      }`}
                                      title="View Details"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleRowEdit(vehicle)}
                                    disabled={editingRow !== null}
                                    className={`h-7 w-7 p-0 rounded-lg transition-all duration-300 hover:scale-110 ${
                                      isDarkMode 
                                        ? 'border-gray-600 hover:border-yellow-500 hover:bg-yellow-500/20 hover:text-yellow-400' 
                                        : 'border-gray-300 hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600'
                                    } ${editingRow !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Edit Row"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {filteredVehicles.length === 0 && (
                  <div className="text-center py-12">
                    <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      No vehicles found
                    </h3>
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                      {searchTerm || filterMake || filterModel 
                        ? 'Try adjusting your search terms or filters.' 
                        : 'No vehicles available in your inventory.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredAndPaginatedData.totalItems > 0 && (
                <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                  <div className="flex items-center gap-4">
                    <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndPaginatedData.totalItems)} of {filteredAndPaginatedData.totalItems} vehicles
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        Per page:
                      </span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className={`px-2 py-1 border rounded text-sm ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`${
                        isDarkMode
                          ? 'border-gray-600 hover:bg-gray-700 disabled:opacity-50'
                          : 'border-gray-300 hover:bg-gray-50 disabled:opacity-50'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, filteredAndPaginatedData.totalPages) }, (_, i) => {
                        let pageNum;
                        if (filteredAndPaginatedData.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= filteredAndPaginatedData.totalPages - 2) {
                          pageNum = filteredAndPaginatedData.totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 p-0 ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : isDarkMode
                                  ? 'border-gray-600 hover:bg-gray-700'
                                  : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(filteredAndPaginatedData.totalPages, currentPage + 1))}
                      disabled={currentPage === filteredAndPaginatedData.totalPages}
                      className={`${
                        isDarkMode
                          ? 'border-gray-600 hover:bg-gray-700 disabled:opacity-50'
                          : 'border-gray-300 hover:bg-gray-50 disabled:opacity-50'
                      }`}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      
      <Footer />
      
      {/* Channel Management Modal */}
      <ChannelManagement 
        isOpen={isChannelManagementOpen}
        onClose={() => setIsChannelManagementOpen(false)}
      />
      
      {/* Full-Page Loading/Status Overlay */}
      {(updateStatus.loading || updateStatus.success || updateStatus.error) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`mx-4 p-8 rounded-2xl shadow-2xl max-w-md w-full ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            {updateStatus.loading && (
              <div className="text-center">
                <div className="mb-6">
                  <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{updateStatus.message}</h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-gray-600'
                }`}>{updateStatus.details}</p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-blue-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
            
            {updateStatus.success && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-green-600">{updateStatus.message}</h3>
                <p className={`text-sm mb-3 ${
                  isDarkMode ? 'text-white' : 'text-gray-600'
                }`}>{updateStatus.details}</p>
                <div className={`text-xs p-3 rounded-lg mb-4 ${
                  isDarkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'
                }`}>
                  <strong>Note:</strong> Changes may take a few moments to reflect in your dashboard as we sync with AutoTrader&apos;s latest data.
                </div>
                <Button 
                  onClick={() => setUpdateStatus({ loading: false, success: false, error: false, message: '' })}
                  className="mt-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  Continue
                </Button>
              </div>
            )}
            
            {updateStatus.error && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-red-600">{updateStatus.message}</h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-gray-600'
                }`}>{updateStatus.details}</p>
                <div className="mt-6 flex gap-3 justify-center">
                  <Button 
                    onClick={() => setUpdateStatus({ loading: false, success: false, error: false, message: '' })}
                    variant="outline"
                    className={`${
                      isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Dismiss
                  </Button>
                  <Button 
                    onClick={() => {
                      setUpdateStatus({ loading: false, success: false, error: false, message: '' });
                      // Could add retry logic here if needed
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListingsManagement() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ListingsManagementContent />
    </Suspense>
  );
}
