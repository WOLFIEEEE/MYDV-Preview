"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useStockDataQuery, usePrefetchStockDetail } from "@/hooks/useStockDataQuery";
import { crossPageSyncService } from "@/lib/crossPageSyncService";
import { useOptimizedStockData } from "@/hooks/useOptimizedStockData";
import type { StockItem, ViewMode, VehicleInfo, MetadataInfo } from "@/types/stock";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Car, 
  RefreshCw, 
  Fuel, 
  Gauge, 
  Grid3X3, 
  List, 
  Calendar, 
  PoundSterling, 
  Settings,
  Search,
  AlertCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  LogIn,
  UserCheck,
  Filter,
  ChevronUp,
  ChevronDown,
  X,
  Edit3,
  MoreVertical,
  Trash2,
  CheckCircle,
  ShoppingCart,
  FileSearch,
  Archive,
  Globe,
  Share2,
  Store,
  Plus,
  MapPin,
  Download
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import StockSettingsDialog from "@/components/stock/StockSettingsDialog";
import EnhancedInventorySettingsDialog from "@/components/stock/EnhancedInventorySettingsDialog";
import LicensePlate from "@/components/ui/license-plate";
import { ErrorBoundary, useErrorHandler } from "@/components/shared/ErrorBoundary";
import TestDriveEntryForm from "@/components/shared/TestDriveEntryForm";
import StockDataError from "@/components/shared/StockDataError";
import StockSkeleton from "@/components/shared/StockSkeleton";
import ProgressiveLoader from "@/components/shared/ProgressiveLoader";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStatusLabel, getStatusColor, getStatusOptions, getStatusCounts } from "@/lib/statusMapping";



function MyStockContent() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();
  const { reportError } = useErrorHandler();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMake, setFilterMake] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterFuelType, setFilterFuelType] = useState("");
  const [filterBodyType, setFilterBodyType] = useState("");
  const [filterLifecycleState, setFilterLifecycleState] = useState<string[]>([]);
  const [filterChannelStatus, setFilterChannelStatus] = useState<string[]>([]);
  const [hideSoldVehicles, setHideSoldVehicles] = useState(true);
  const [showSmartFilters, setShowSmartFilters] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [yearRange, setYearRange] = useState({ min: "", max: "" });
  const [mileageRange, setMileageRange] = useState({ min: "", max: "" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showTestDriveForm, setShowTestDriveForm] = useState(false);
  const { isDarkMode } = useTheme();
  
  // Frontend pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  // Dual scrollbar state and refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(2500);
  
  // Custom scrollbar state
  const [isDragging, setIsDragging] = useState(false);

  // Settings dialog state
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [isInventorySettingsOpen, setIsInventorySettingsOpen] = useState(false);
  
  // AutoTrader limits state
  const [autoTraderLimit, setAutoTraderLimit] = useState<{
    current: number;
    maximum: number;
    capped: number;
    available: number;
  } | null>(null);
  const [selectedInventoryStock, setSelectedInventoryStock] = useState<StockItem | null>(null);

  // Loading states for stock actions (kept for backward compatibility)
  const [loadingStockActions, setLoadingStockActions] = useState<{[key: string]: 'sold' | 'delete' | null}>({});
  
  // Modal states for stock actions
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'sold' | 'delete' | null;
    status: 'loading' | 'success' | 'error' | null;
    message: string;
    vehicleName: string;
    stockId: string;
    step: 'confirming' | 'fetching-config' | 'updating-stock' | 'completed';
  }>({
    isOpen: false,
    type: null,
    status: null,
    message: '',
    vehicleName: '',
    stockId: '',
    step: 'confirming'
  });

  // Helper functions to safely access nested properties
  const getVehicleProperty = (item: StockItem, property: keyof VehicleInfo): string | number | undefined => {
    return (item.vehicle?.[property] ?? item[property as keyof StockItem]) as string | number | undefined;
  };

  const getPriceProperty = (item: StockItem, property: 'totalPrice' | 'suppliedPrice' | 'forecourtPrice'): number => {
    let price: unknown;
    
    if (property === 'totalPrice') {
      price = item.adverts?.retailAdverts?.totalPrice?.amountGBP ?? item.totalPrice;
    } else if (property === 'suppliedPrice') {
      price = item.adverts?.retailAdverts?.suppliedPrice?.amountGBP ?? item.suppliedPrice;
    } else if (property === 'forecourtPrice') {
      price = item.adverts?.forecourtPrice?.amountGBP ?? item.forecourtPrice;
    }
    
    // Ensure we always return a number
    if (typeof price === 'number' && !isNaN(price)) {
      return price;
    }
    
    // If price is an object with amountGBP property
    if (typeof price === 'object' && price && 'amountGBP' in price) {
      const amount = (price as { amountGBP: unknown }).amountGBP;
      return typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    }
    
    // Try to parse as number if it's a string
    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      return !isNaN(parsed) ? parsed : 0;
    }
    
    return 0;
  };

  const getMetadataProperty = (item: StockItem, property: keyof MetadataInfo): string | number | undefined => {
    return (item.metadata?.[property] ?? item[property as keyof StockItem]) as string | number | undefined;
  };

  // Scroll synchronization handlers
  const handleScrollbarScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    
    // Sync with content
    if (contentRef.current && contentRef.current.scrollLeft !== scrollLeft) {
      contentRef.current.scrollLeft = scrollLeft;
    }
    
    // Sync other scrollbars
    if (topScrollRef.current && e.currentTarget !== topScrollRef.current) {
      topScrollRef.current.scrollLeft = scrollLeft;
    }
    if (bottomScrollRef.current && e.currentTarget !== bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  const handleContentScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    
    // Sync both scrollbars
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = scrollLeft;
    }
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = scrollLeft;
    }
  }, []);
  
  // Custom scrollbar drag handlers (removed unused functions)
  
  useEffect(() => {
    let animationFrameId: number;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !contentRef.current) return;
      
      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Use RAF for smooth updates
      animationFrameId = requestAnimationFrame(() => {
        if (!contentRef.current) return;
        
        const container = contentRef.current.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
        
        const maxScroll = contentRef.current.scrollWidth - contentRef.current.clientWidth;
        const newScrollLeft = (percentage / 100) * maxScroll;
        contentRef.current.scrollLeft = newScrollLeft;
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDragging]);

  // Only fetch data if user is signed in AND user object is fully loaded
  // RACE CONDITION FIX: Also check user?.id to ensure Clerk is FULLY initialized
  // This prevents API calls before the user object is ready
  const shouldFetchData = isLoaded && isSignedIn && !!user?.id;
  
  // Debug: Log auth state changes to detect race conditions
  useEffect(() => {
    console.log('🔐 Auth State Change:', {
      isLoaded,
      isSignedIn,
      hasUserId: !!user?.id,
      userId: user?.id?.substring(0, 12) + '...',
      shouldFetch: shouldFetchData,
      timestamp: Date.now()
    });
  }, [isLoaded, isSignedIn, user?.id, shouldFetchData]);
  
  // Stable query options to prevent unnecessary refetches
  const queryOptions = useMemo(() => {
    if (!shouldFetchData) {
      return { disabled: true };
    }
    return { 
      pageSize: 100 // Large page size to get all data
    };
  }, [shouldFetchData]);
  
  // Fetch ALL data from API using Optimized React Query (instant cache display!)
  const { 
    data: allStockData, 
    loading, 
    error, 
    loadingState,
    pagination: apiPagination, 
    cacheStatus,
    refetch,
    isFetching,
    isStale,
    invalidateStockCache
  } = useOptimizedStockData(queryOptions);

  // Enhanced error handling
  useEffect(() => {
    if (error) {
      console.error('🚨 Stock data fetch error:', error);
      reportError(new Error(`Stock data fetch failed: ${error}`), 'MyStock-DataFetch');
    }
  }, [error, reportError]);

  // Hook for prefetching stock details on hover
  const prefetchStockDetail = usePrefetchStockDetail();

  // Comprehensive frontend filtering logic - handle all filters in real-time
  const filteredStock = allStockData.filter((item: StockItem) => {
    if (!item) return false;
    
    // Search term filter (searches across multiple fields)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      item.vehicle?.make?.toLowerCase().includes(searchLower) ||
      item.vehicle?.model?.toLowerCase().includes(searchLower) ||
      item.vehicle?.derivative?.toLowerCase().includes(searchLower) ||
      item.vehicle?.registration?.toLowerCase().includes(searchLower) ||
      item.stockId?.toLowerCase().includes(searchLower) ||
      (item.vehicle?.vin && String(item.vehicle.vin).toLowerCase().includes(searchLower));
    
    // Status/Lifecycle filter
    const matchesStatus = filterStatus === "all" ||
      item.metadata?.lifecycleState?.toLowerCase() === filterStatus.toLowerCase();
    
    // Make filter
    const matchesMake = !filterMake ||
      item.vehicle?.make?.toLowerCase() === filterMake.toLowerCase();
    
    // Model filter
    const matchesModel = !filterModel ||
      item.vehicle?.model?.toLowerCase() === filterModel.toLowerCase();
    
    // Fuel type filter
    const matchesFuelType = !filterFuelType ||
      item.vehicle?.fuelType?.toLowerCase() === filterFuelType.toLowerCase();
    
    // Body type filter
    const matchesBodyType = !filterBodyType ||
      item.vehicle?.bodyType?.toLowerCase() === filterBodyType.toLowerCase();
    
    // Hide sold vehicles by default (unless user explicitly wants to see them)
    const isSoldVehicle = item.metadata?.lifecycleState?.toLowerCase() === 'sold';
    const matchesHideSoldFilter = !hideSoldVehicles || !isSoldVehicle;

    // Multiple lifecycle state filter
    const matchesLifecycleState = filterLifecycleState.length === 0 ||
      filterLifecycleState.some(state => 
        item.metadata?.lifecycleState?.toLowerCase() === state.toLowerCase()
      );

    // Multiple channel status filter
    const matchesChannelStatus = filterChannelStatus.length === 0 || 
      filterChannelStatus.some(channelKey => {
        const adverts = item.adverts?.retailAdverts;
        switch (channelKey) {
          case 'autotraderAdvert':
            return adverts?.autotraderAdvert?.status?.toLowerCase() === 'published';
          case 'notAdvertisedAnywhere':
            // Check if vehicle is not advertised on any channel
            return (
              adverts?.autotraderAdvert?.status?.toLowerCase() !== 'published' &&
              adverts?.advertiserAdvert?.status?.toLowerCase() !== 'published' &&
              adverts?.locatorAdvert?.status?.toLowerCase() !== 'published' &&
              adverts?.profileAdvert?.status?.toLowerCase() !== 'published' &&
              (adverts as Record<string, { status?: string }>)?.exportAdvert?.status?.toLowerCase() !== 'published'
            );
          case 'advertiserAdvert':
            return adverts?.advertiserAdvert?.status?.toLowerCase() === 'published';
          case 'locatorAdvert':
            return adverts?.locatorAdvert?.status?.toLowerCase() === 'published';
          case 'profileAdvert':
            return adverts?.profileAdvert?.status?.toLowerCase() === 'published';
          case 'exportAdvert':
            return (adverts as Record<string, { status?: string }>)?.exportAdvert?.status?.toLowerCase() === 'published';
          default:
            return true;
        }
      });
    
    // Price range filter
    const itemPrice = item.adverts?.retailAdverts?.totalPrice?.amountGBP || 
                     item.adverts?.retailAdverts?.suppliedPrice?.amountGBP || 
                     item.adverts?.forecourtPrice?.amountGBP || 0;
    const matchesPriceRange = (!priceRange.min || itemPrice >= parseInt(priceRange.min)) &&
                              (!priceRange.max || itemPrice <= parseInt(priceRange.max));
    
    // Year range filter
    const itemYear = parseInt(item.vehicle?.yearOfManufacture || '0') || 0;
    const matchesYearRange = (!yearRange.min || itemYear >= parseInt(yearRange.min)) &&
                             (!yearRange.max || itemYear <= parseInt(yearRange.max));
    
    // Mileage range filter
    const itemMileage = item.vehicle?.odometerReadingMiles || 0;
    const matchesMileageRange = (!mileageRange.min || itemMileage >= parseInt(mileageRange.min)) &&
                                (!mileageRange.max || itemMileage <= parseInt(mileageRange.max));
    
        return matchesSearch && matchesStatus && matchesMake && matchesModel && 
           matchesFuelType && matchesBodyType && matchesHideSoldFilter && 
           matchesLifecycleState && matchesChannelStatus && matchesPriceRange && 
           matchesYearRange && matchesMileageRange;
  });

  // Frontend pagination
  const totalItems = filteredStock.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStock = filteredStock.slice(startIndex, endIndex);

  // Calculate scrollbar width based on table content
  useEffect(() => {
    const updateScrollbarWidth = () => {
      if (contentRef.current) {
        const table = contentRef.current.querySelector('table');
        if (table) {
          setScrollbarWidth(table.scrollWidth);
        }
      }
    };

    // Update width when data changes or window resizes
    updateScrollbarWidth();
    
    const resizeObserver = new ResizeObserver(updateScrollbarWidth);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [paginatedStock]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterMake, filterModel, filterFuelType, filterBodyType, filterLifecycleState, priceRange, yearRange, mileageRange]);

  // Extract unique values for filter dropdowns from all data
  const getUniqueValues = (field: string) => {
    return [...new Set(allStockData.map((item: StockItem) => {
      // Use helper functions for nested properties
      if (field === 'make' || field === 'model' || field === 'fuelType' || field === 'bodyType') {
        return getVehicleProperty(item, field as keyof VehicleInfo);
      }
      if (field === 'lifecycleState') {
        return getMetadataProperty(item, field as keyof MetadataInfo);
      }
      return (item as unknown as Record<string, unknown>)[field];
    }).filter(Boolean))].sort();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    console.log('🔄 MyStock: Starting optimized refresh - immediate UI update with background sync');
    
    try {
      // Step 1: Force refresh from AutoTrader API and update cache
      console.log('📡 Calling stock refresh API to fetch fresh data from AutoTrader...');
      const refreshResponse = await fetch('/api/stock/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageSize: 100 // Fetch all data
        })
      });

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed: ${refreshResponse.status}`);
      }

      const refreshData = await refreshResponse.json();
      console.log('✅ Fresh data fetched from AutoTrader:', {
        totalResults: refreshData.data?.pagination?.totalResults,
        refreshedAt: refreshData.data?.cache?.refreshedAt,
        forceRefresh: refreshData.data?.cache?.forceRefresh
      });

      // Step 2: Trigger cross-page synchronization
      console.log('🔄 Triggering cross-page sync to update all stock-related pages...');
      if (user?.id) {
        await crossPageSyncService.triggerStockRefresh(user.id, 'mystock-refresh');
      }
      
      console.log('✅ Refresh completed successfully - all pages will update automatically');
      
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      // Still try to refetch in case of partial success
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatPrice = (price?: number | unknown) => {
    // Handle various input types
    let numericPrice: number;
    
    if (typeof price === 'number' && !isNaN(price)) {
      numericPrice = price;
    } else if (typeof price === 'object' && price && 'amountGBP' in price) {
      numericPrice = (price as { amountGBP: number }).amountGBP;
    } else if (typeof price === 'string') {
      numericPrice = parseFloat(price);
    } else {
      return "Not Added";
    }
    
    // Check if we have a valid number
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return "Not Added";
    }
    
    return `£${numericPrice.toLocaleString()}`;
  };

  const formatMileage = (mileage?: number) => {
    if (!mileage) return "N/A";
    return `${mileage.toLocaleString()} mi`;
  };



  const calculateDaysInStock = (item: StockItem) => {
    const dateOnForecourt = item.metadata?.dateOnForecourt;
    if (!dateOnForecourt) return 0;
    const forecourtDate = new Date(dateOnForecourt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - forecourtDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getMainPrice = (item: StockItem) => {
    return getPriceProperty(item, 'totalPrice') || 
           getPriceProperty(item, 'suppliedPrice') || 
           getPriceProperty(item, 'forecourtPrice') ||
           0;
  };

  // Filter calculation functions
  const calculateLifecycleStats = useMemo(() => {
    if (!allStockData || allStockData.length === 0) {
      return getStatusCounts([]);
    }

    return getStatusCounts(allStockData);
  }, [allStockData]);

  const calculateChannelStats = useMemo(() => {
    if (!allStockData || allStockData.length === 0) {
      return {
        autotrader: { published: 0, total: 0 },
        advertiser: { published: 0, total: 0 },
        locator: { published: 0, total: 0 },
        profile: { published: 0, total: 0 },
        export: { published: 0, total: 0 },
        notAdvertisedAnywhere: 0
      };
    }

    // Filter data based on hideSoldVehicles setting
    const dataToCount = hideSoldVehicles 
      ? allStockData.filter(item => item.metadata?.lifecycleState?.toLowerCase() !== 'sold')
      : allStockData;

    const stats = {
      autotrader: { published: 0, total: dataToCount.length },
      advertiser: { published: 0, total: dataToCount.length },
      locator: { published: 0, total: dataToCount.length },
      profile: { published: 0, total: dataToCount.length },
      export: { published: 0, total: dataToCount.length },
      notAdvertisedAnywhere: 0
    };

    dataToCount.forEach((item: StockItem) => {
      const adverts = item.adverts?.retailAdverts;
      
      // AutoTrader stats
      const autotraderStatus = adverts?.autotraderAdvert?.status?.toLowerCase();
      if (autotraderStatus === 'published') {
        stats.autotrader.published++;
      }

      // Other channels
      if (adverts?.advertiserAdvert?.status?.toLowerCase() === 'published') {
        stats.advertiser.published++;
      }
      if (adverts?.locatorAdvert?.status?.toLowerCase() === 'published') {
        stats.locator.published++;
      }
      if (adverts?.profileAdvert?.status?.toLowerCase() === 'published') {
        stats.profile.published++;
      }
      const exportStatus = (adverts as Record<string, { status?: string }>)?.exportAdvert?.status?.toLowerCase();
      if (exportStatus === 'published') {
        stats.export.published++;
      }

      // Calculate "Not Advertised Anywhere" - vehicles not published on any channel
      const isNotAdvertisedAnywhere = (
        autotraderStatus !== 'published' &&
        adverts?.advertiserAdvert?.status?.toLowerCase() !== 'published' &&
        adverts?.locatorAdvert?.status?.toLowerCase() !== 'published' &&
        adverts?.profileAdvert?.status?.toLowerCase() !== 'published' &&
        exportStatus !== 'published'
      );
      
      if (isNotAdvertisedAnywhere) {
        stats.notAdvertisedAnywhere++;
      }
    });

    return stats;
  }, [allStockData, hideSoldVehicles]);

  // Calculate AutoTrader limits
  const calculateAutoTraderLimits = useCallback(async (vehicles: StockItem[], activeCount: number) => {
    try {
      // Fetch AutoTrader limit from API
      const response = await fetch('/api/autotrader/limits', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const maxLimit = result.data.listingCount || 0;
        
        // Count CAPPED vehicles (vehicles that couldn't be published due to limits)
        const cappedCount = vehicles.filter(vehicle => {
          const adverts = vehicle.adverts?.retailAdverts;
          return adverts?.autotraderAdvert?.status === 'CAPPED';
        }).length;
        
        setAutoTraderLimit({
          current: activeCount,
          maximum: maxLimit,
          capped: cappedCount,
          available: Math.max(0, maxLimit - activeCount)
        });
        
        console.log('AutoTrader limits updated:', {
          current: activeCount,
          maximum: maxLimit,
          capped: cappedCount,
          available: Math.max(0, maxLimit - activeCount)
        });
      } else {
        console.warn('AutoTrader limits API returned unsuccessful result:', result);
        throw new Error(result.error || 'Failed to get limits data');
      }
    } catch (error) {
      console.error('Failed to fetch AutoTrader limits:', error);
      // Fallback to basic calculation without API limits
      setAutoTraderLimit({
        current: activeCount,
        maximum: 0, // Unknown limit
        capped: 0,
        available: 0
      });
    }
  }, []);

  // Calculate AutoTrader limits when data changes
  useEffect(() => {
    if (allStockData && allStockData.length > 0 && calculateChannelStats && isSignedIn) {
      calculateAutoTraderLimits(allStockData, calculateChannelStats.autotrader.published);
    }
  }, [allStockData, calculateChannelStats, calculateAutoTraderLimits, isSignedIn]);

  // Stock action handlers
  const handleDeleteStock = async (item: StockItem) => {
    const vehicleName = `${getVehicleProperty(item, 'make')} ${getVehicleProperty(item, 'model')}`;
    const stockId = item.stockId;

    // Open modal with confirmation
    setActionModal({
      isOpen: true,
      type: 'delete',
      status: 'loading',
      message: `Are you sure you want to delete "${vehicleName}"? This action cannot be undone.`,
      vehicleName,
      stockId,
      step: 'confirming'
    });

    // Wait for user confirmation (we'll handle this in the modal)
  };

  const executeDeleteStock = async (stockId: string, vehicleName: string) => {
    try {
      // Step 1: Fetching configuration
      setActionModal(prev => ({
        ...prev,
        step: 'fetching-config',
        message: 'Fetching store configuration...'
      }));

      if (!stockId) {
        throw new Error('Missing stock ID');
      }

      // Get advertiserId from user's store configuration
      let advertiserId: string | null = null;
      const configResponse = await fetch('/api/store-config');
      if (configResponse.ok) {
        const configResult = await configResponse.json();
        if (configResult.success && configResult.data) {
          advertiserId = configResult.data.primaryAdvertisementId || configResult.data.advertisementId;
        }
      }

      if (!advertiserId) {
        throw new Error('Advertiser ID not found in store configuration. Please contact support.');
      }

      // Step 2: Updating stock
      setActionModal(prev => ({
        ...prev,
        step: 'updating-stock',
        message: `Deleting ${vehicleName} and unpublishing from all channels...`
      }));

      setLoadingStockActions(prev => ({ ...prev, [stockId]: 'delete' }));

      const response = await fetch(`/api/stock/${stockId}?advertiserId=${advertiserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            lifecycleState: 'DELETED'
          },
          adverts: {
            retailAdverts: {
              autotraderAdvert: { status: 'NOT_PUBLISHED' },
              advertiserAdvert: { status: 'NOT_PUBLISHED' },
              locatorAdvert: { status: 'NOT_PUBLISHED' },
              exportAdvert: { status: 'NOT_PUBLISHED' },
              profileAdvert: { status: 'NOT_PUBLISHED' }
            }
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Step 3: Success
        setActionModal(prev => ({
          ...prev,
          step: 'completed',
          status: 'success',
          message: `${vehicleName} has been successfully deleted and unpublished from all channels.`
        }));
        
        // Note: No cache invalidation needed as AutoTrader takes 15-20 minutes to process changes
      } else {
        // Parse error details with better AutoTrader error handling
        let errorMessage = 'Failed to delete stock';
        
        // Check for specific AutoTrader error messages
        if (result.error?.details) {
          errorMessage = result.error.details;
        } else if (result.error?.message) {
          errorMessage = result.error.message;
        } else if (result.message) {
          errorMessage = result.message;
        }
        
        // Make error messages more user-friendly
        if (errorMessage.includes('DELETED can not have active adverts')) {
          errorMessage = 'Cannot delete stock: This vehicle has active advertisements that must be unpublished first. Please try again or contact support if the issue persists.';
        } else if (errorMessage.includes('SOLD can not have active adverts')) {
          errorMessage = 'Cannot mark as sold: This vehicle has active advertisements that must be unpublished first. Please try again or contact support if the issue persists.';
        } else if (errorMessage.includes('Bad Request') || errorMessage.includes('400')) {
          errorMessage = 'Invalid request: Please check the vehicle status and try again. If the problem continues, contact support.';
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      setActionModal(prev => ({
        ...prev,
        step: 'completed',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete stock'
      }));
    } finally {
      setLoadingStockActions(prev => ({ ...prev, [stockId]: null }));
    }
  };

  const handleMarkAsSold = async (item: StockItem) => {
    const vehicleName = `${getVehicleProperty(item, 'make')} ${getVehicleProperty(item, 'model')}`;
    const stockId = item.stockId;

    // Open modal with confirmation
    setActionModal({
      isOpen: true,
      type: 'sold',
      status: 'loading',
      message: `Mark "${vehicleName}" as sold?`,
      vehicleName,
      stockId,
      step: 'confirming'
    });

    // Wait for user confirmation (we'll handle this in the modal)
  };

  const executeMarkAsSold = async (stockId: string, vehicleName: string) => {
    try {
      // Step 1: Fetching configuration
      setActionModal(prev => ({
        ...prev,
        step: 'fetching-config',
        message: 'Fetching store configuration...'
      }));

      if (!stockId) {
        throw new Error('Missing stock ID');
      }

      // Get advertiserId from user's store configuration
      let advertiserId: string | null = null;
      const configResponse = await fetch('/api/store-config');
      if (configResponse.ok) {
        const configResult = await configResponse.json();
        if (configResult.success && configResult.data) {
          advertiserId = configResult.data.primaryAdvertisementId || configResult.data.advertisementId;
        }
      }

      if (!advertiserId) {
        throw new Error('Advertiser ID not found in store configuration. Please contact support.');
      }

      // Step 2: Updating stock
      setActionModal(prev => ({
        ...prev,
        step: 'updating-stock',
        message: `Marking ${vehicleName} as sold and unpublishing from all channels...`
      }));

      setLoadingStockActions(prev => ({ ...prev, [stockId]: 'sold' }));

      // Get current date for soldDate
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      const response = await fetch(`/api/stock/${stockId}?advertiserId=${advertiserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            lifecycleState: 'SOLD'
          },
          adverts: {
            soldDate: currentDate,
            retailAdverts: {
              autotraderAdvert: { status: 'NOT_PUBLISHED' },
              advertiserAdvert: { status: 'NOT_PUBLISHED' },
              locatorAdvert: { status: 'NOT_PUBLISHED' },
              exportAdvert: { status: 'NOT_PUBLISHED' },
              profileAdvert: { status: 'NOT_PUBLISHED' }
            }
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Step 3: Success
        setActionModal(prev => ({
          ...prev,
          step: 'completed',
          status: 'success',
          message: `${vehicleName} has been successfully marked as sold and unpublished from all channels.`
        }));
        
        // Note: No cache invalidation needed as AutoTrader takes 15-20 minutes to process changes
      } else {
        // Parse error details with better AutoTrader error handling
        let errorMessage = 'Failed to mark stock as sold';
        
        // Check for specific AutoTrader error messages
        if (result.error?.details) {
          errorMessage = result.error.details;
        } else if (result.error?.message) {
          errorMessage = result.error.message;
        } else if (result.message) {
          errorMessage = result.message;
        }
        
        // Make error messages more user-friendly
        if (errorMessage.includes('SOLD can not have active adverts')) {
          errorMessage = 'Cannot mark as sold: This vehicle has active advertisements that must be unpublished first. Please try again or contact support if the issue persists.';
        } else if (errorMessage.includes('DELETED can not have active adverts')) {
          errorMessage = 'Cannot delete stock: This vehicle has active advertisements that must be unpublished first. Please try again or contact support if the issue persists.';
        } else if (errorMessage.includes('Bad Request') || errorMessage.includes('400')) {
          errorMessage = 'Invalid request: Please check the vehicle status and try again. If the problem continues, contact support.';
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error marking stock as sold:', error);
      setActionModal(prev => ({
        ...prev,
        step: 'completed',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to mark stock as sold'
      }));
    } finally {
      setLoadingStockActions(prev => ({ ...prev, [stockId]: null }));
    }
  };

  const handleRetailCheck = (item?: StockItem) => {
    // Navigate to retail check page with vehicle data
    const params = new URLSearchParams();
    
    if (item) {
      // Use stock item data
      if (item.stockId) {
        params.append('stockId', item.stockId);
      }
      
      const registration = getVehicleProperty(item, 'registration');
      if (registration) {
        params.append('registration', String(registration));
      }
      
      const mileage = getVehicleProperty(item, 'odometerReadingMiles');
      if (mileage) {
        params.append('mileage', String(mileage));
      }
    }
    
    const url = `/mystock/retail-check${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
  };

  const handleVehicleCheck = (item: StockItem) => {
    const registration = getVehicleProperty(item, 'registration');
    if (registration) {
      // Navigate to vehicle history check page with registration
      router.push(`/mystock/vehicle-history-check?registration=${encodeURIComponent(registration)}`);
    } else {
      alert('No registration number found for this vehicle');
    }
  };

  const handleInventorySettings = (item: StockItem) => {
    setSelectedInventoryStock(item);
    setIsInventorySettingsOpen(true);
  };

  // Handle test drive functionality
  const handleScheduleTestDrive = () => {
    setShowTestDriveForm(true);
  };

  const handleTestDriveFormClose = () => {
    setShowTestDriveForm(false);
  };

  const handleExportData = () => {
    // Define CSV headers matching the required fields
    const headers = [
      'Vehicle_ID',
      'Title', 
      'Registration',
      'RegistrationDate',
      'Make',
      'Model',
      'Variant',
      'Category',
      'Year',
      'FuelType',
      'Colour',
      'Mileage',
      'Transmission',
      'P.Owners',
      'Price',
      'VatStatus',
      'Status',
      'DaysInStock',
      'StockNumber'
    ];

    // Convert stock data to CSV rows
    const csvRows = filteredStock.map((item: StockItem, index: number) => {
      const vehicle = item.vehicle || {};
      const metadata = item.metadata || {};
      const adverts = item.adverts || {};
      
      // Calculate days in stock
      const dateOnForecourt = metadata.dateOnForecourt || item.dateOnForecourt;
      const daysInStock = dateOnForecourt 
        ? Math.ceil((new Date().getTime() - new Date(dateOnForecourt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return [
        index + 1, // Serial number starting from 1
        `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.derivative || ''}`.trim() || '',
        vehicle.registration || item.registration || '',
        vehicle.firstRegistrationDate || '',
        vehicle.make || item.make || '',
        vehicle.model || item.model || '',
        vehicle.derivative || item.derivative || '',
        vehicle.bodyType || item.bodyType || '',
        vehicle.yearOfManufacture || item.yearOfManufacture || '',
        vehicle.fuelType || item.fuelType || '',
        vehicle.colour || item.colour || '',
        vehicle.odometerReadingMiles || item.odometerReadingMiles || 0,
        vehicle.transmissionType || item.transmissionType || '',
        vehicle.previousOwners || item.previousOwners || 0,
        (getMainPrice(item) || 0) === 0 ? '-' : getMainPrice(item) || 0,
        adverts.retailAdverts?.vatStatus || '', // VAT Status from adverts data
        metadata.lifecycleState || item.lifecycleState || '',
        daysInStock,
        item.stockId || ''
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if vehicle has registration for conditional menu items
  const hasRegistration = (item: StockItem) => {
    const registration = getVehicleProperty(item, 'registration');
    return registration && String(registration).trim() !== '';
  };

  // Show loading state while Clerk is loading
  if (!isLoaded) {
  return (
    <>
        <Header />
        <div className={`min-h-screen pt-16 flex items-center justify-center ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <Card className={`w-96 p-8 text-center ${
            isDarkMode 
              ? 'bg-slate-800/80 border-slate-700' 
              : 'bg-white/80 border-slate-200'
          }`}>
            <div className="flex flex-col items-center space-y-4">
              <RefreshCw className="w-12 h-12 animate-spin text-blue-500" />
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Loading...
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                Checking authentication...
              </p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <>
        <Header />
        <div className={`min-h-screen pt-16 flex items-center justify-center ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <Card className={`w-96 p-8 text-center ${
            isDarkMode 
              ? 'bg-slate-800/80 border-slate-700' 
              : 'bg-white/80 border-slate-200'
          }`}>
            <div className="flex flex-col items-center space-y-4">
              <LogIn className="w-12 h-12 text-blue-500" />
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Sign In Required
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                Please sign in to access your stock inventory
              </p>
              <Link href="/sign-in">
                <Button className="mt-4">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // Show skeleton loading for initial load only (when no cached data exists)
  if (loading && loadingState === 'initial') {
    return (
      <>
        <Header />
        <div className={`min-h-screen transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <div className="pt-16">
            <section className="relative py-12 px-2">
              <div className="max-w-[2140px] mx-auto">
                <StockSkeleton viewMode={viewMode} count={12} />
              </div>
            </section>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className={`min-h-screen pt-16 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <StockDataError 
            error={error} 
            onRetry={handleRefresh}
            isRetrying={isFetching}
          />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className={`min-h-screen transition-all duration-500 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
          : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
      }`}>
        <Header />
        
        <div className="pt-16">
          <ProgressiveLoader
            loadingState={loadingState}
            hasData={allStockData.length > 0}
            fallback={
              <section className="relative py-12 px-2">
                <div className="max-w-[2140px] mx-auto">
                  <StockSkeleton viewMode={viewMode} count={12} />
                </div>
              </section>
            }
          >
            {/* Enhanced Header Section */}
            <section className="relative py-12 px-2">
              <div className="max-w-[2140px] mx-auto">

              {/* Enhanced Stats Cards - Cool Modern Layout */}
              <div className="relative mb-8">
                {/* Background Gradient */}
                <div className={`absolute inset-0 rounded-2xl ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50' 
                    : 'bg-gradient-to-r from-blue-50/50 via-white/80 to-blue-50/50'
                } backdrop-blur-sm`} />
                
                <div className="relative flex items-center justify-between gap-4 p-6 rounded-2xl border border-white/20 shadow-lg">
                  {/* Stats Cards in Single Row */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Total Stock Card */}
                    <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-xl min-w-[160px] ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 hover:border-blue-500/50' 
                        : 'bg-gradient-to-br from-white/90 to-slate-50/90 border-slate-200/60 hover:border-blue-400/60'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isDarkMode 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            <Car className="h-5 w-5" />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              Total Stock
                            </div>
                            <div className={`text-2xl font-bold ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {apiPagination?.totalResults || filteredStock.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Active Listings Card */}
                    <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-xl min-w-[160px] ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 hover:border-emerald-500/50' 
                        : 'bg-gradient-to-br from-white/90 to-slate-50/90 border-slate-200/60 hover:border-emerald-400/60'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isDarkMode 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              Active
                            </div>
                            <div className={`text-2xl font-bold ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {filteredStock.filter((item: StockItem) => {
                                const state = getMetadataProperty(item, 'lifecycleState')?.toString().toLowerCase();
                                return state === 'forecourt' || state === 'listed';
                              }).length}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Average Price Card */}
                    <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-xl min-w-[160px] ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 hover:border-amber-500/50' 
                        : 'bg-gradient-to-br from-white/90 to-slate-50/90 border-slate-200/60 hover:border-amber-400/60'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isDarkMode 
                              ? 'bg-amber-500/20 text-amber-400' 
                              : 'bg-amber-100 text-amber-600'
                          }`}>
                            <PoundSterling className="h-5 w-5" />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              Avg. Price
                            </div>
                            <div className={`text-2xl font-bold ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {formatPrice(
                                filteredStock.reduce((sum: number, item: StockItem) => sum + getMainPrice(item), 0) / 
                                (filteredStock.length || 1)
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* Total Value Card */}
                    <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-xl min-w-[160px] ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 hover:border-green-500/50' 
                        : 'bg-gradient-to-br from-white/90 to-slate-50/90 border-slate-200/60 hover:border-green-400/60'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isDarkMode 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            <PoundSterling className="h-5 w-5" />
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              Total Value
                            </div>
                            <div className={`text-xl font-bold ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {(() => {
                                const totalValue = filteredStock.reduce((sum: number, item: StockItem) => {
                                  const itemPrice = getMainPrice(item);
                                  console.log(`Item ${item.stockId}: price = ${itemPrice} (type: ${typeof itemPrice})`);
                                  return sum + itemPrice;
                                }, 0);
                                console.log(`Total calculated value: ${totalValue} (type: ${typeof totalValue})`);
                                return formatPrice(totalValue);
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>




                  </div>

                  {/* Enhanced Refresh Button */}
                  <div className="flex-shrink-0 ml-3">
                    <Button 
                      onClick={handleRefresh}
                      disabled={isRefreshing || isFetching}
                      className={`group relative overflow-hidden px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                        isDarkMode 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 shadow-blue-500/25' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 shadow-blue-500/25'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 transition-transform duration-300 ${
                          isRefreshing || isFetching ? 'animate-spin' : 'group-hover:rotate-180'
                        }`} />
                        <span className="whitespace-nowrap">
                        {isRefreshing || isFetching ? 'Refreshing...' : 'Refresh'}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="ml-1 text-xs opacity-75">
                            {isStale ? '(stale)' : '(fresh)'}
                          </span>
                        )}
                      </span>
                      </div>
                    </Button>
                  </div>

                  {/* Schedule Test Drive Button */}
                  <div className="flex-shrink-0 ml-3">
                    <Button 
                      onClick={handleScheduleTestDrive}
                      className={`group relative overflow-hidden px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                        isDarkMode 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 shadow-blue-500/25' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 shadow-blue-500/25'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center gap-2">
                        <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                        <span className="whitespace-nowrap">Schedule Test Drive</span>
                      </div>
                    </Button>
                  </div>

                  {/* Export Data Button */}
                  <div className="flex-shrink-0 ml-3">
                    <Button 
                      onClick={handleExportData}
                      className={`group relative overflow-hidden px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                        isDarkMode 
                          ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border-0 shadow-green-500/25' 
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border-0 shadow-green-500/25'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center gap-2">
                        <Download className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                        <span className="whitespace-nowrap">Export Data</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Enhanced Smart Filters Section */}
              <div className={`mb-8 rounded-3xl transition-all duration-300 overflow-hidden ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/30' 
                  : 'bg-gradient-to-br from-white/80 via-slate-50/60 to-white/80 backdrop-blur-xl border border-slate-200/40'
              } shadow-2xl shadow-slate-900/10 hover:shadow-3xl hover:shadow-slate-900/20 group`}>
                
                {/* Clickable Section Header with Title */}
                <button
                  onClick={() => setShowSmartFilters(!showSmartFilters)}
                  className={`w-full px-6 py-4 border-b transition-all duration-300 hover:scale-[1.005] ${
                    isDarkMode 
                      ? 'border-slate-700/30 bg-slate-800/20 hover:bg-slate-800/40 text-white' 
                      : 'border-slate-200/40 bg-slate-50/30 hover:bg-slate-100/50 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`relative p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                        isDarkMode 
                          ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-lg shadow-indigo-500/10' 
                          : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 shadow-lg shadow-indigo-500/5'
                      }`}>
                        <Filter className={`w-6 h-6 ${
                          isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                        }`} />
                      </div>
                      <div className="text-left">
                        <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-3 ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Vehicle Status and Publishing Overview
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            showSmartFilters 
                              ? isDarkMode 
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : isDarkMode 
                                ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {showSmartFilters ? 'Expanded' : 'Collapsed'}
                          </span>
                        </h2>
                        <p className={`text-sm font-medium mt-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}>
                          Filter and organize your vehicle inventory by status and listing channels
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Filter Stats Badge */}
                      <div className={`px-4 py-2 rounded-xl ${
                        isDarkMode 
                          ? 'bg-slate-700/50 border border-slate-600/30' 
                          : 'bg-white/60 border border-slate-200/50'
                      } shadow-sm`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500'
                          } animate-pulse`}></div>
                          <span className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            {filteredStock.length} of {allStockData.length} vehicles
                          </span>
                        </div>
                      </div>
                      
                      {/* Collapse/Expand Icon */}
                      <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                        isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100/50'
                      }`}>
                        <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${
                          showSmartFilters ? 'rotate-180' : ''
                        } ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                    </div>
                  </div>
                </button>
                
                {/* Collapsible Filter Content */}
                {showSmartFilters && (
                  <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    {/* Consolidated Filters Section */}
                    <div className={`p-6 rounded-2xl ${
                      isDarkMode 
                        ? 'bg-slate-900/30 border border-slate-700/50' 
                        : 'bg-slate-50/50 border border-slate-200/60'
                    } shadow-inner`}>
                      
                      {/* Hide Sold Vehicles Toggle */}
                      <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setHideSoldVehicles(!hideSoldVehicles)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                              hideSoldVehicles
                                ? isDarkMode 
                                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
                                  : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                : isDarkMode 
                                  ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50' 
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              hideSoldVehicles 
                                ? 'bg-white border-white' 
                                : isDarkMode ? 'border-slate-400' : 'border-slate-400'
                            }`}>
                              {hideSoldVehicles && (
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                              )}
                            </div>
                            <span className="text-sm font-medium">Hide Sold Vehicles</span>
                          </button>
                          <span className={`text-xs ${
                            isDarkMode ? 'text-white' : 'text-slate-500'
                          }`}>
                            (Default: Hidden)
                          </span>
                        </div>
                      </div>

                      {/* Vehicle Status Filters */}
                      <div className="mb-6">
                        <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Vehicle Status
                        </h4>
                      
                      <div className="flex flex-wrap gap-2.5">
                        {getStatusOptions().map(({ value, label }) => {
                          const key = value.toUpperCase();
                          const count = calculateLifecycleStats[value] || 0;
                          const isActive = filterLifecycleState.includes(key);

                          // Enhanced status config with cleaner colors
                          const statusConfig = {
                            'DUE_IN': { 
                              icon: ShoppingCart, 
                              gradient: 'from-sky-500 to-blue-600', 
                              shadow: 'shadow-sky-500/20',
                              bg: isDarkMode ? 'bg-sky-500/10' : 'bg-white',
                              border: isDarkMode ? 'border-sky-500/20' : 'border-gray-300',
                              text: isDarkMode ? 'text-sky-300' : 'text-gray-700',
                              iconBg: isDarkMode ? 'bg-gradient-to-r from-sky-500 to-blue-600' : 'bg-gray-400'
                            },
                            'FORECOURT': { 
                              icon: CheckCircle, 
                              gradient: 'from-emerald-500 to-green-600', 
                              shadow: 'shadow-emerald-500/20',
                              bg: isDarkMode ? 'bg-emerald-500/10' : 'bg-white',
                              border: isDarkMode ? 'border-emerald-500/20' : 'border-gray-300',
                              text: isDarkMode ? 'text-emerald-300' : 'text-gray-700',
                              iconBg: isDarkMode ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gray-400'
                            },
                            'SALE_IN_PROGRESS': { 
                              icon: PoundSterling, 
                              gradient: 'from-orange-500 to-amber-600', 
                              shadow: 'shadow-orange-500/20',
                              bg: isDarkMode ? 'bg-orange-500/10' : 'bg-white',
                              border: isDarkMode ? 'border-orange-500/20' : 'border-gray-300',
                              text: isDarkMode ? 'text-orange-300' : 'text-gray-700',
                              iconBg: isDarkMode ? 'bg-gradient-to-r from-orange-500 to-amber-600' : 'bg-gray-400'
                            },
                            'SOLD': { 
                              icon: CheckCircle, 
                              gradient: 'from-purple-500 to-violet-600', 
                              shadow: 'shadow-purple-500/20',
                              bg: isDarkMode ? 'bg-purple-500/10' : 'bg-white',
                              border: isDarkMode ? 'border-purple-500/20' : 'border-gray-300',
                              text: isDarkMode ? 'text-purple-300' : 'text-gray-700',
                              iconBg: isDarkMode ? 'bg-gradient-to-r from-purple-500 to-violet-600' : 'bg-gray-400'
                            },
                            'WASTEBIN': { 
                              icon: Trash2, 
                              gradient: 'from-red-500 to-rose-600', 
                              shadow: 'shadow-red-500/20',
                              bg: isDarkMode ? 'bg-red-500/10' : 'bg-white',
                              border: isDarkMode ? 'border-red-500/20' : 'border-gray-300',
                              text: isDarkMode ? 'text-red-300' : 'text-gray-700',
                              iconBg: isDarkMode ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gray-400'
                            },
                            'ARCHIVED': { 
                              icon: Archive, 
                              gradient: 'from-gray-500 to-slate-600', 
                              shadow: 'shadow-gray-500/20',
                              bg: isDarkMode ? 'bg-gray-500/10' : 'bg-white',
                              border: isDarkMode ? 'border-gray-500/20' : 'border-gray-300',
                              text: isDarkMode ? 'text-white' : 'text-gray-700',
                              iconBg: isDarkMode ? 'bg-gradient-to-r from-gray-500 to-slate-600' : 'bg-gray-400'
                            }
                          }[key] || { 
                            icon: Car, 
                            gradient: 'from-slate-500 to-slate-600', 
                            shadow: 'shadow-slate-500/20',
                            bg: isDarkMode ? 'bg-slate-500/10' : 'bg-white',
                            border: isDarkMode ? 'border-slate-500/20' : 'border-gray-300',
                            text: isDarkMode ? 'text-white' : 'text-gray-700',
                            iconBg: isDarkMode ? 'bg-gradient-to-r from-slate-500 to-slate-600' : 'bg-gray-400'
                          };

                          const IconComponent = statusConfig.icon;

                          return (
                            <button
                              key={key}
                              onClick={() => {
                                if (isActive) {
                                  setFilterLifecycleState(filterLifecycleState.filter(state => state !== key));
                                } else {
                                  setFilterLifecycleState([...filterLifecycleState, key]);
                                }
                              }}
                              className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 hover:scale-105 border ${
                                isActive 
                                  ? isDarkMode 
                                    ? `bg-gradient-to-r ${statusConfig.gradient} text-white shadow-lg ${statusConfig.shadow} scale-105 border-transparent`
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/20 scale-105 border-transparent'
                                  : `${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} hover:shadow-md hover:border-opacity-60 shadow-sm`
                              }`}
                            >
                              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                                isActive 
                                  ? isDarkMode 
                                    ? 'bg-white/20'
                                    : 'bg-white/20'
                                  : isDarkMode 
                                    ? `bg-gradient-to-r ${statusConfig.gradient} shadow-sm`
                                    : `${statusConfig.iconBg} shadow-sm`
                              }`}>
                                <IconComponent className={`w-3.5 h-3.5 ${
                                  isActive ? 'text-white' : 'text-white'
                                }`} />
                              </div>
                              <span className="text-sm font-semibold tracking-wide">{label}</span>
                              <div className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-300 ${
                                isActive 
                                  ? 'bg-white/20 text-white' 
                                  : isDarkMode 
                                    ? `bg-gradient-to-r ${statusConfig.gradient} text-white shadow-sm`
                                    : 'bg-gray-400 text-white shadow-sm'
                              }`}>
                                {count}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      </div>

                      {/* Publishing Channel Filters */}
                      <div className="mb-6">
                        <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Publishing Channels
                        </h4>
                        <div className="flex flex-wrap gap-2.5">
                          {[
                            { 
                              key: 'autotraderAdvert', 
                              label: 'AT Search & Find', 
                              count: autoTraderLimit ? `${autoTraderLimit.current}/${autoTraderLimit.maximum}` : `${calculateChannelStats.autotrader.published}/${calculateChannelStats.autotrader.total}`,
                              icon: Car,
                              hasLimit: true,
                              limitInfo: autoTraderLimit
                            },
                            { 
                              key: 'profileAdvert', 
                              label: 'AT Dealer Page', 
                              count: calculateChannelStats.profile.published,
                              icon: Store
                            },
                            { 
                              key: 'advertiserAdvert', 
                              label: 'Dealer Website', 
                              count: calculateChannelStats.advertiser.published,
                              icon: Globe
                            },
                            { 
                              key: 'exportAdvert', 
                              label: 'AT Linked Advertisers', 
                              count: calculateChannelStats.export.published,
                              icon: Share2
                            },
                            { 
                              key: 'locatorAdvert', 
                              label: 'Manufacturer Website / Used Vehicle Locators', 
                              count: calculateChannelStats.locator.published,
                              icon: MapPin
                            },
                            { 
                              key: 'notAdvertisedAnywhere', 
                              label: 'Not Advertised Anywhere', 
                              count: calculateChannelStats.notAdvertisedAnywhere || 0,
                              icon: X
                            },
                          ].map(({ key, label, count, icon: IconComponent, hasLimit, limitInfo }) => {
                            const isActive = filterChannelStatus.includes(key);
                            
                            // Special handling for AutoTrader with limits
                            if (hasLimit && limitInfo && key === 'autotraderAdvert') {
                              const limitPercentage = limitInfo.maximum > 0 ? Math.round((limitInfo.current / limitInfo.maximum) * 100) : 0;
                              const isNearLimit = limitPercentage >= 90;
                              const isAtLimit = limitInfo.current >= limitInfo.maximum;
                              
                              return (
                                <button
                                  key={key}
                                  onClick={() => {
                                    if (isActive) {
                                      setFilterChannelStatus(filterChannelStatus.filter(channel => channel !== key));
                                    } else {
                                      setFilterChannelStatus([...filterChannelStatus, key]);
                                    }
                                  }}
                                  className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 hover:scale-105 border ${
                                    isActive 
                                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/20 scale-105 border-transparent' 
                                      : isDarkMode
                                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:shadow-md hover:border-slate-600 shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-700 hover:shadow-md hover:border-gray-300 shadow-sm'
                                  } ${isAtLimit ? 'ring-2 ring-red-500/50' : isNearLimit ? 'ring-2 ring-yellow-500/50' : ''}`}
                                >
                                  <div className={`p-1.5 rounded-xl transition-all duration-300 flex-shrink-0 ${
                                    isActive 
                                      ? 'bg-white/20' 
                                      : isDarkMode
                                        ? 'bg-slate-700'
                                        : 'bg-gray-100'
                                  }`}>
                                    <IconComponent className={`w-3.5 h-3.5 ${
                                      isActive ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-600'
                                    }`} />
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold tracking-wide whitespace-nowrap">{label}</span>
                                    <div className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-300 ${
                                      isActive 
                                        ? 'bg-white/20 text-white' 
                                        : isDarkMode
                                          ? 'bg-slate-700 text-slate-200'
                                          : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {count}
                                    </div>
                                    {limitInfo.available > 0 && (
                                      <span className={`text-xs px-2 py-0.5 rounded-md ${
                                        isActive 
                                          ? 'bg-white/10 text-white/80' 
                                          : isDarkMode 
                                            ? 'bg-slate-700 text-slate-300' 
                                            : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        Available: {limitInfo.available}
                                      </span>
                                    )}
                                    {limitInfo.capped > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-medium">
                                        Capped: {limitInfo.capped}
                                      </span>
                                    )}
                                    {isAtLimit && (
                                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-md font-medium">
                                        LIMIT REACHED
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            }
                            
                            // Regular channel display
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  if (isActive) {
                                    setFilterChannelStatus(filterChannelStatus.filter(channel => channel !== key));
                                  } else {
                                    setFilterChannelStatus([...filterChannelStatus, key]);
                                  }
                                }}
                                className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 hover:scale-105 border ${
                                  isActive 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/20 scale-105 border-transparent' 
                                    : isDarkMode
                                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:shadow-md hover:border-slate-600 shadow-sm'
                                      : 'bg-white border-gray-200 text-gray-700 hover:shadow-md hover:border-gray-300 shadow-sm'
                                }`}
                              >
                                <div className={`p-1.5 rounded-xl transition-all duration-300 flex-shrink-0 ${
                                  isActive 
                                    ? 'bg-white/20' 
                                    : isDarkMode
                                      ? 'bg-slate-700'
                                      : 'bg-gray-100'
                                }`}>
                                  <IconComponent className={`w-3.5 h-3.5 ${
                                    isActive ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-600'
                                  }`} />
                                </div>
                                <span className="text-sm font-semibold tracking-wide whitespace-nowrap">{label}</span>
                                <div className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-300 ${
                                  isActive 
                                    ? 'bg-white/20 text-white' 
                                    : isDarkMode
                                      ? 'bg-slate-700 text-slate-200'
                                      : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {count}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Enhanced Controls - Clean Single Row Layout */}
              <div className="space-y-4 mb-8">
                {/* Main Filters Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 flex-1">
                    {/* Search */}
                    <div className="flex-1 min-w-64 max-w-md">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search vehicles..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>

                    {/* Basic Filters */}
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={`px-4 py-2 rounded-lg border min-w-[120px] ${
                        isDarkMode 
                          ? 'bg-slate-800 border-slate-600 text-white' 
                          : 'bg-white border-slate-300 text-slate-900'
                      } focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="forecourt">Forecourt</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>

                    <select
                      value={filterMake}
                      onChange={(e) => setFilterMake(e.target.value)}
                      className={`px-4 py-2 rounded-lg border min-w-[120px] ${
                        isDarkMode 
                          ? 'bg-slate-800 border-slate-600 text-white' 
                          : 'bg-white border-slate-300 text-slate-900'
                      } focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="">All Makes</option>
                      {getUniqueValues('make').map((make: unknown) => (
                        <option key={make as string} value={make as string}>{make as string}</option>
                      ))}
                    </select>
                  </div>

                  {/* Right Side Controls */}
                  <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                      {[
                        { mode: "cards", icon: Grid3X3, label: "Cards" },
                        { mode: "table", icon: List, label: "Table" },
                      ].map(({ mode, icon: Icon, label }) => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode as 'table' | 'grid' | 'cards')}
                          className={`px-3 py-2 flex items-center gap-2 text-sm ${
                            viewMode === mode
                              ? isDarkMode 
                                ? 'bg-slate-700 text-white' 
                                : 'bg-blue-500 text-white'
                              : isDarkMode 
                                ? 'bg-slate-800 text-slate-400 hover:text-white' 
                                : 'bg-white text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Advanced Filters Toggle */}
                    <Button
                      variant="outline"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`flex items-center gap-2 ${
                        isDarkMode 
                          ? 'border-slate-600 text-slate-200 hover:bg-slate-700' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters Panel */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  showAdvancedFilters 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className={`p-4 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700' 
                      : 'bg-slate-50/50 border-slate-200'
                  }`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Model Filter */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          Model
                        </label>
                        <select
                          value={filterModel}
                          onChange={(e) => setFilterModel(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-slate-800 border-slate-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-900'
                          } focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value="">All Models</option>
                          {getUniqueValues('model').map((model: unknown) => (
                            <option key={model as string} value={model as string}>{model as string}</option>
                          ))}
                        </select>
                      </div>

                      {/* Fuel Type Filter */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          Fuel Type
                        </label>
                        <select
                          value={filterFuelType}
                          onChange={(e) => setFilterFuelType(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-slate-800 border-slate-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-900'
                          } focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value="">All Fuel Types</option>
                          {getUniqueValues('fuelType').map((fuel: unknown) => (
                            <option key={fuel as string} value={fuel as string}>{fuel as string}</option>
                          ))}
                        </select>
                  </div>

                      {/* Body Type Filter */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          Body Type
                        </label>
                        <select
                          value={filterBodyType}
                          onChange={(e) => setFilterBodyType(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode 
                              ? 'bg-slate-800 border-slate-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-900'
                          } focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value="">All Body Types</option>
                          {getUniqueValues('bodyType').map((body: unknown) => (
                            <option key={body as string} value={body as string}>{body as string}</option>
                          ))}
                        </select>
                      </div>

                      {/* Lifecycle State Filter */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          Lifecycle State
                        </label>
                        <select
                          value={filterLifecycleState.length === 1 ? filterLifecycleState[0] : ''}
                          onChange={(e) => setFilterLifecycleState(e.target.value ? [e.target.value] : [])}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-slate-800 border-slate-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-900'
                          } focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value="">All States</option>
                          {getUniqueValues('lifecycleState').map((state: unknown) => (
                            <option key={state as string} value={state as string}>{state as string}</option>
                          ))}
                        </select>
                  </div>

                      {/* Price Range */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          Price Range (£)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={priceRange.min}
                            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                            className={`w-full px-2 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-600 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            } focus:ring-1 focus:ring-blue-500`}
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={priceRange.max}
                            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                            className={`w-full px-2 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-600 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            } focus:ring-1 focus:ring-blue-500`}
                          />
              </div>
            </div>

                      {/* Year Range */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          Year Range
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="From"
                            value={yearRange.min}
                            onChange={(e) => setYearRange(prev => ({ ...prev, min: e.target.value }))}
                            className={`w-full px-2 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-600 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            } focus:ring-1 focus:ring-blue-500`}
                          />
                          <input
                            type="number"
                            placeholder="To"
                            value={yearRange.max}
                            onChange={(e) => setYearRange(prev => ({ ...prev, max: e.target.value }))}
                            className={`w-full px-2 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-600 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            } focus:ring-1 focus:ring-blue-500`}
                          />
                </div>
              </div>

                      {/* Mileage Range */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? 'text-white' : 'text-slate-700'
                        }`}>
                          Mileage Range
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={mileageRange.min}
                            onChange={(e) => setMileageRange(prev => ({ ...prev, min: e.target.value }))}
                            className={`w-full px-2 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-600 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            } focus:ring-1 focus:ring-blue-500`}
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={mileageRange.max}
                            onChange={(e) => setMileageRange(prev => ({ ...prev, max: e.target.value }))}
                            className={`w-full px-2 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-600 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            } focus:ring-1 focus:ring-blue-500`}
                          />
                        </div>
                      </div>
                      
                      {/* Clear Filters Button */}
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFilterModel("");
                            setFilterFuelType("");
                            setFilterBodyType("");
                            setFilterLifecycleState([]);
                            setFilterChannelStatus([]);
                            setPriceRange({ min: "", max: "" });
                            setYearRange({ min: "", max: "" });
                            setMileageRange({ min: "", max: "" });
                            setFilterMake("");
                            setFilterStatus("all");
                            setSearchTerm("");
                          }}
                          className={`w-full ${
                            isDarkMode 
                              ? 'border-slate-600 text-slate-200 hover:bg-slate-700' 
                              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </div>
                      </div>
                      
                </div>
                    
              {/* Enhanced Content Display */}
                              {viewMode === "cards" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedStock.map((item: StockItem) => (
                    <Card key={item.stockId} className={`group transition-all duration-300 hover:shadow-xl ${
                          isDarkMode 
                        ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}>
                      {/* Image */}
                      <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                        {item.media?.images && item.media.images.length > 0 ? (
                          <Image
                            src={item.media.images[0].href}
                            alt={`${getVehicleProperty(item, 'make')} ${getVehicleProperty(item, 'model')}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-16 h-16 text-slate-400" />
                        </div>
                        )}
                      
                      {/* Status Badge */}
                        <div className="absolute top-3 left-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(getMetadataProperty(item, 'lifecycleState')?.toString(), isDarkMode)}`}>
                            {getStatusLabel(getMetadataProperty(item, 'lifecycleState')?.toString())}
                        </span>
                      </div>
                      
                        {/* Image Count */}
                        {item.media?.images && item.media.images.length > 1 && (
                          <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs">
                            <ImageIcon className="w-3 h-3 inline mr-1" />
                            {item.media.images.length}
                          </div>
                        )}
                          </div>
                      
                      <CardContent className="p-4">
                        {/* Vehicle Info */}
                        <div className="mb-3">
                          <h3 className={`font-bold text-lg truncate ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {getVehicleProperty(item, 'make')} {getVehicleProperty(item, 'model')}
                        </h3>
                          <Link href={`/mystock/${item.stockId}`}>
                            <p className={`text-sm truncate cursor-pointer hover:underline transition-colors duration-200 ${
                              isDarkMode ? 'text-white hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'
                            }`}>
                              {getVehicleProperty(item, 'derivative') || getVehicleProperty(item, 'trim') || 'Standard'}
                            </p>
                          </Link>
                        </div>
                      
                        {/* Key Details */}
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                          <div className={`flex items-center gap-1 ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {getVehicleProperty(item, 'yearOfManufacture') || 'N/A'}
                          </div>
                          <div className={`flex items-center gap-1 ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            <Gauge className="w-3 h-3" />
                            {formatMileage(getVehicleProperty(item, 'odometerReadingMiles') as number)}
                          </div>
                          <div className={`flex items-center gap-1 ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            <Fuel className="w-3 h-3" />
                            {getVehicleProperty(item, 'fuelType') || 'N/A'}
                        </div>
                          <div className={`flex items-center gap-1 ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            <Settings className="w-3 h-3" />
                            {getVehicleProperty(item, 'transmissionType') || 'N/A'}
                        </div>
                      </div>
                      
                        {/* Price */}
                        <div className="mb-3">
                          <div className={`text-2xl font-bold ${
                            isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                          }`}>
                            {formatPrice(getMainPrice(item))}
                        </div>
                          {item.adverts?.retailAdverts?.priceIndicatorRating && (
                            <div className="text-xs text-amber-500">
                              Price Rating: {item.adverts.retailAdverts.priceIndicatorRating}
                        </div>
                          )}
                      </div>
                      
                        {/* Features Preview */}
                        {item.features && item.features.length > 0 && (
                          <div className="mb-3">
                            <div className={`text-xs font-medium mb-1 ${
                              isDarkMode ? 'text-white' : 'text-slate-700'
                            }`}>
                              Key Features:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.features.slice(0, 3).map((feature: { name: string }, idx: number) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-1 rounded text-xs ${
                                    isDarkMode 
                                      ? 'bg-slate-700 text-slate-300' 
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {feature.name}
                          </span>
                        ))}
                              {item.features.length > 3 && (
                                <span className={`px-2 py-1 rounded text-xs ${
                            isDarkMode 
                                    ? 'bg-slate-600 text-slate-400' 
                                    : 'bg-slate-200 text-slate-500'
                          }`}>
                                  +{item.features.length - 3} more
                          </span>
                        )}
                      </div>
                          </div>
                        )}
                      
                        {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/mystock/edit/${item.stockId}`} className="flex-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full"
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-3"
                          onClick={() => handleInventorySettings(item)}
                          title="Stock Actions"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="px-3"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeleteStock(item)}>
                              <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                              Delete Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkAsSold(item)}>
                              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                              Mark as Sold
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRetailCheck(item)}>
                              <ShoppingCart className="w-4 h-4 text-blue-500 mr-2" />
                              Retail Check
                            </DropdownMenuItem>
                            {hasRegistration(item) && (
                              <DropdownMenuItem onClick={() => handleVehicleCheck(item)}>
                                <FileSearch className="w-4 h-4 text-purple-500 mr-2" />
                                Vehicle Check
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setSelectedStock(item);
                              setIsSettingsDialogOpen(true);
                            }}>
                              <Settings className="w-4 h-4 text-gray-500 mr-2" />
                              Settings
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      </CardContent>
                </Card>
              ))}
            </div>
              ) : (
                /* Enhanced Multi-Column Table View - Based on Old Pattern */
              <Card className={`w-full shadow-2xl border-2 rounded-2xl ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/90 shadow-slate-900/40 border-slate-700/50' 
                  : 'bg-gradient-to-br from-white to-slate-50/80 shadow-slate-300/30 border-slate-300/30'
              } p-0 m-0`}>
                                <div className="overflow-x-auto overflow-y-visible">
                    {/* Top Scrollbar */}
                    <div 
                      ref={topScrollRef}
                      className={`h-5 mb-2 ${
                        isDarkMode ? 'bg-slate-700/20' : 'bg-slate-200/30'
                      } rounded-lg always-visible-scrollbar`}
                      onScroll={handleScrollbarScroll}
                      style={{
                        minHeight: '20px',
                        display: 'block'
                      }}
                    >
                      <div style={{ width: `${Math.max(scrollbarWidth, 2500)}px`, height: '16px' }} />
                    </div>

                    {/* Unified Table Container */}
                  <div className={`flex border-t-0 w-full ${
                    isDarkMode ? 'border-slate-700/50' : 'border-slate-300/30'
                  }`}>
                    {/* Fixed Columns Section */}
                      <div className={`relative ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-slate-800/90 to-slate-800/70' 
                        : 'bg-gradient-to-r from-slate-50/90 to-white/70'
                    } shadow-lg z-20`}>
                                          <table className="border-spacing-0" style={{tableLayout: 'fixed', width: '224px'}}>
                      <thead className={`sticky top-0 ${
                        isDarkMode ? 'bg-slate-900/95 border-slate-700/50' : 'bg-slate-100/95 border-slate-300/50'
                      } border-b-2 backdrop-blur-md m-0`} style={{height: '48px'}}>
                          <tr>
                            <th className={`text-left p-2 font-bold text-xs uppercase tracking-wider border-r ${
                              isDarkMode ? 'text-white border-slate-700/50' : 'text-slate-700 border-slate-300/50'
                            }`} style={{width: '96px'}}>
                              Actions
                            </th>
                            <th className={`text-left p-2 font-bold text-xs uppercase tracking-wider border-r ${
                              isDarkMode ? 'text-white border-slate-700/50' : 'text-slate-700 border-slate-300/50'
                            }`} style={{width: '64px'}}>
                              Image
                            </th>
                            <th className={`text-left p-2 font-bold text-xs uppercase tracking-wider ${
                              isDarkMode ? 'text-white' : 'text-slate-700'
                            }`} style={{width: '168px'}}>
                              Registration
                            </th>
                          </tr>
                        </thead>
                        <tbody className="overflow-y-auto">
                            {paginatedStock.map((item: StockItem) => (
                              <tr 
                                key={item.stockId} 
                                className={`group transition-all duration-300 border-b ${
                                  isDarkMode 
                                    ? 'border-slate-700/30 hover:bg-slate-700/20 hover:shadow-lg' 
                                    : 'border-slate-200/40 hover:bg-blue-50/30 hover:shadow-md'
                                }`}
                                style={{height: '64px'}}
                                onMouseEnter={() => prefetchStockDetail(item.stockId)}
                              >
                              {/* Actions */}
                              <td className={`px-2 py-1 border-r align-middle ${isDarkMode ? 'border-slate-700/20' : 'border-slate-200/30'}`} style={{width: '96px'}}>
                                <div className="flex items-center gap-1">
                                  <Link href={`/mystock/edit/${item.stockId}`}>
                                    <Button size="sm" variant="outline" className={`w-6 h-6 p-0 rounded-md transition-all duration-200 ${
                                      isDarkMode 
                                        ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:scale-110' 
                                        : 'border-slate-300/60 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:scale-110'
                                    }`} title="Edit Stock">
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                  </Link>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className={`w-6 h-6 p-0 rounded-md transition-all duration-200 ${
                                      isDarkMode 
                                        ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-green-600 hover:text-white hover:border-green-500 hover:scale-110' 
                                        : 'border-slate-300/60 text-slate-600 hover:bg-green-600 hover:text-white hover:border-green-500 hover:scale-110'
                                    }`} 
                                    title="Stock Actions"
                                    onClick={() => handleInventorySettings(item)}
                                  >
                                    <Settings className="w-3 h-3" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className={`w-6 h-6 p-0 rounded-md transition-all duration-200 ${
                                          isDarkMode 
                                            ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600 hover:text-white hover:border-slate-400' 
                                            : 'border-slate-300/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400'
                                        }`} 
                                        title="More Actions"
                                      >
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleDeleteStock(item)}>
                                        <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                                        Delete Stock
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleMarkAsSold(item)}>
                                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                        Mark as Sold
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleRetailCheck(item)}>
                                        <ShoppingCart className="w-4 h-4 text-blue-500 mr-2" />
                                        Retail Check
                                      </DropdownMenuItem>
                                      {hasRegistration(item) && (
                                        <DropdownMenuItem onClick={() => handleVehicleCheck(item)}>
                                          <FileSearch className="w-4 h-4 text-purple-500 mr-2" />
                                          Vehicle Check
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedStock(item);
                                        setIsSettingsDialogOpen(true);
                                      }}>
                                        <Settings className="w-4 h-4 text-gray-500 mr-2" />
                                        Settings
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                              {/* Image */}
                              <td className={`px-2 py-1 border-r align-middle ${isDarkMode ? 'border-slate-700/20' : 'border-slate-200/30'}`} style={{width: '64px'}}>
                                <Link href={`/mystock/${item.stockId}`}>
                                  <div className="relative cursor-pointer">
                                    {item.media?.images && item.media.images.length > 0 ? (
                                      <div className="relative w-12 h-8 rounded-md overflow-hidden shadow-sm ring-1 ring-white/20 hover:ring-blue-400/50 transition-all duration-300 hover:scale-105">
                                        <Image 
                                          src={item.media.images[0].href} 
                                          alt={`${getVehicleProperty(item, 'make')} ${getVehicleProperty(item, 'model')}`}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-8 bg-slate-200 rounded-md flex items-center justify-center hover:bg-slate-300 transition-colors duration-300">
                                        <ImageIcon className="w-4 h-4 text-slate-400" />
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              </td>
                              {/* Registration */}
                              <td className="px-2 py-1 align-middle" style={{width: '168px'}}>
                                <Link href={`/mystock/${item.stockId}`}>
                                  <div className="cursor-pointer transition-all duration-200 hover:scale-105">
                                    <LicensePlate 
                                      registration={item.registration || 'N/A'} 
                                      size="md" 
                                    />
                                  </div>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Scrollable Columns Section */}
                      <div 
                        ref={contentRef}
                        className={`flex-1 border-r-2 min-w-0 hide-scrollbar ${
                        isDarkMode ? 'border-slate-700/50' : 'border-slate-300/30'
                        }`}
                        onScroll={handleContentScroll}
                      >
                      <table className="w-full min-w-full border-spacing-0">
                        <thead className={`sticky top-0 ${
                          isDarkMode ? 'bg-slate-900/95 border-slate-700/50' : 'bg-slate-100/95 border-slate-300/50'
                        } border-b-2 backdrop-blur-md m-0`} style={{height: '48px'}}>
                          <tr>
                            {[
                                // Vehicle Info (moved from sticky)
                              { key: 'vehicle', label: 'Vehicle', width: 'min-w-[200px]' },
                              { key: 'price', label: 'Price', width: 'min-w-[100px]' },
                              { key: 'priceIndicator', label: 'Price Rating', width: 'min-w-[90px]' },
                              { key: 'mileage', label: 'Miles', width: 'min-w-[80px]' },
                              { key: 'lifecycleState', label: 'Status', width: 'min-w-[100px]' },
                              { key: 'daysInStock', label: 'Days', width: 'min-w-[60px]' },
                                // Basic Vehicle Info
                              { key: 'make', label: 'Make', width: 'min-w-[80px]' },
                                { key: 'model', label: 'Model', width: 'min-w-[100px]' },
                              
                                { key: 'derivative', label: 'Derivative', width: 'min-w-[180px]' },
                                { key: 'generation', label: 'Gen', width: 'min-w-[70px]' },
                                { key: 'trim', label: 'Trim', width: 'min-w-[80px]' },
                                { key: 'vehicleType', label: 'Type', width: 'min-w-[70px]' },
                                { key: 'bodyType', label: 'Body', width: 'min-w-[80px]' },
                                { key: 'year', label: 'Year', width: 'min-w-[60px]' },
                                { key: 'colour', label: 'Color', width: 'min-w-[80px]' },
                                { key: 'style', label: 'Style', width: 'min-w-[80px]' },
                                
                                // Engine & Performance
                                { key: 'fuelType', label: 'Fuel', width: 'min-w-[70px]' },
                                { key: 'transmissionType', label: 'Trans', width: 'min-w-[80px]' },
                                { key: 'drivetrain', label: 'Drive', width: 'min-w-[100px]' },
                                { key: 'engineCapacity', label: 'Engine CC', width: 'min-w-[80px]' },
                                { key: 'engineSize', label: 'Engine L', width: 'min-w-[70px]' },
                                { key: 'enginePowerBHP', label: 'BHP', width: 'min-w-[60px]' },
                                { key: 'enginePowerPS', label: 'PS', width: 'min-w-[60px]' },
                                { key: 'cylinders', label: 'Cyl', width: 'min-w-[50px]' },
                                { key: 'topSpeedMPH', label: 'Top Speed', width: 'min-w-[80px]' },
                                { key: 'zeroToSixty', label: '0-60', width: 'min-w-[60px]' },
                                { key: 'zeroToHundred', label: '0-100km', width: 'min-w-[70px]' },
                                
                                // Fuel Economy & Emissions
                              { key: 'co2Emissions', label: 'CO2', width: 'min-w-[60px]' },
                                { key: 'emissionClass', label: 'Euro', width: 'min-w-[70px]' },
                                { key: 'fuelCapacity', label: 'Tank L', width: 'min-w-[70px]' },
                                { key: 'fuelEconomyUrban', label: 'Urban MPG', width: 'min-w-[80px]' },
                                { key: 'fuelEconomyExtra', label: 'Extra MPG', width: 'min-w-[80px]' },
                                { key: 'fuelEconomyCombined', label: 'Comb MPG', width: 'min-w-[80px]' },
                                
                                // Physical Dimensions
                                { key: 'doors', label: 'Doors', width: 'min-w-[60px]' },
                                { key: 'seats', label: 'Seats', width: 'min-w-[60px]' },
                                { key: 'lengthMM', label: 'Length', width: 'min-w-[70px]' },
                                { key: 'widthMM', label: 'Width', width: 'min-w-[70px]' },
                                { key: 'heightMM', label: 'Height', width: 'min-w-[70px]' },
                                { key: 'kerbWeight', label: 'Weight', width: 'min-w-[70px]' },
                                { key: 'bootSpace', label: 'Boot L', width: 'min-w-[70px]' },
                                { key: 'bootSpaceDown', label: 'Boot Down', width: 'min-w-[80px]' },
                                
                                // Ownership & History
                                { key: 'ownershipCondition', label: 'Condition', width: 'min-w-[80px]' },
                                { key: 'owners', label: 'Owners', width: 'min-w-[60px]' },
                                { key: 'previousOwners', label: 'Prev Own', width: 'min-w-[70px]' },
                               
                                { key: 'hoursUsed', label: 'Hours', width: 'min-w-[60px]' },
                                { key: 'firstReg', label: 'First Reg', width: 'min-w-[90px]' },
                                { key: 'motExpiry', label: 'MOT', width: 'min-w-[90px]' },
                                { key: 'lastService', label: 'Service', width: 'min-w-[90px]' },
                                { key: 'serviceHistory', label: 'Svc History', width: 'min-w-[90px]' },
                                
                                // Insurance & Safety
                                { key: 'insuranceGroup', label: 'Ins Group', width: 'min-w-[70px]' },
                                { key: 'insuranceCode', label: 'Ins Code', width: 'min-w-[70px]' },
                                { key: 'wheelchairAccess', label: 'W/Chair', width: 'min-w-[70px]' },
                                
                                // Pricing & Finance
                                { key: 'suppliedPrice', label: 'Supplied £', width: 'min-w-[90px]' },
                              { key: 'totalPrice', label: 'Total £', width: 'min-w-[90px]' },
                                { key: 'adminFee', label: 'Admin £', width: 'min-w-[70px]' },
                               
                                { key: 'attentionGrabber', label: 'Attention', width: 'min-w-[120px]' },
                                
                                // Status & Metadata
                              
                                { key: 'reservationStatus', label: 'Reserved', width: 'min-w-[80px]' },
                                { key: 'advertStatus', label: 'Advert', width: 'min-w-[80px]' },
                                { key: 'dateOnForecourt', label: 'Forecourt', width: 'min-w-[90px]' },
                                { key: 'lastUpdated', label: 'Updated', width: 'min-w-[90px]' },
                             
                                
                                // Check & History Flags
                                { key: 'scrapped', label: 'Scrapped', width: 'min-w-[70px]' },
                                { key: 'stolen', label: 'Stolen', width: 'min-w-[70px]' },
                                { key: 'imported', label: 'Imported', width: 'min-w-[70px]' },
                                { key: 'exported', label: 'Exported', width: 'min-w-[70px]' },
                                { key: 'writeoffCat', label: 'Write-off', width: 'min-w-[80px]' },
                                { key: 'finance', label: 'Finance', width: 'min-w-[70px]' },
                                { key: 'highRisk', label: 'High Risk', width: 'min-w-[70px]' },
                                { key: 'mileageDiscrepancy', label: 'Mile Disc', width: 'min-w-[80px]' },
                                
                                // Media
                                { key: 'images', label: 'Images', width: 'min-w-[60px]' },
                                { key: 'video', label: 'Video', width: 'min-w-[60px]' },
                                { key: 'spin', label: '360°', width: 'min-w-[60px]' }
                            ].map((col, idx) => (
                              <th key={col.key} className={`${col.width} text-left p-2 font-bold text-xs uppercase tracking-wider ${
                                  idx < 65 ? `border-r ${isDarkMode ? 'border-slate-700/30' : 'border-slate-200/40'}` : ''
                              } ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="overflow-y-auto">
                            {paginatedStock.map((item: StockItem, index: number) => {
                              const apiItem = item as StockItem; // Cast to access full AutoTrader API properties
                              
                              // Add comprehensive logging for the first item to debug data mapping
                              if (index === 0) {
                                console.log('\n🔍 ===== FRONTEND DATA MAPPING DEBUG =====');
                                console.log('📋 Raw item received in frontend:', item);
                                console.log('🏗️ Available top-level keys:', Object.keys(item));
                                
                                console.log('\n🚗 VEHICLE DATA MAPPING:');
                                console.log('- item.vehicle?.make:', item.vehicle?.make);
                                console.log('- apiItem.vehicle?.make:', apiItem.vehicle?.make);
                                console.log('- item.vehicle?.model:', item.vehicle?.model);
                                console.log('- apiItem.vehicle?.model:', apiItem.vehicle?.model);
                                console.log('- item.vehicle?.derivative:', item.vehicle?.derivative);
                                console.log('- apiItem.vehicle?.derivative:', apiItem.vehicle?.derivative);
                                console.log('- item.vehicle?.registration:', item.vehicle?.registration);
                                console.log('- apiItem.vehicle?.registration:', apiItem.vehicle?.registration);
                                console.log('- item.vehicle?.yearOfManufacture:', item.vehicle?.yearOfManufacture);
                                console.log('- apiItem.vehicle?.yearOfManufacture:', apiItem.vehicle?.yearOfManufacture);
                                console.log('- item.vehicle?.fuelType:', item.vehicle?.fuelType);
                                console.log('- apiItem.vehicle?.fuelType:', apiItem.vehicle?.fuelType);
                                console.log('- item.vehicle?.transmissionType:', item.vehicle?.transmissionType);
                                console.log('- apiItem.vehicle?.transmissionType:', apiItem.vehicle?.transmissionType);
                                console.log('- item.vehicle?.bodyType:', item.vehicle?.bodyType);
                                console.log('- apiItem.vehicle?.bodyType:', apiItem.vehicle?.bodyType);
                                console.log('- item.vehicle?.doors:', item.vehicle?.doors);
                                console.log('- apiItem.vehicle?.doors:', apiItem.vehicle?.doors);
                                console.log('- item.vehicle?.enginePowerBHP:', item.vehicle?.enginePowerBHP);
                                console.log('- apiItem.vehicle?.enginePowerBHP:', apiItem.vehicle?.enginePowerBHP);
                                console.log('- item.vehicle?.odometerReadingMiles:', item.vehicle?.odometerReadingMiles);
                                console.log('- apiItem.vehicle?.odometerReadingMiles:', apiItem.vehicle?.odometerReadingMiles);
                                console.log('- item.vehicle?.colour:', item.vehicle?.colour);
                                console.log('- apiItem.vehicle?.colour:', apiItem.vehicle?.colour);
                                
                                console.log('\n💰 PRICING DATA MAPPING:');
                                console.log('- item.adverts?.retailAdverts?.totalPrice?.amountGBP:', item.adverts?.retailAdverts?.totalPrice?.amountGBP);
                                console.log('- apiItem.adverts?.retailAdverts?.totalPrice?.amountGBP:', apiItem.adverts?.retailAdverts?.totalPrice?.amountGBP);
                                console.log('- item.adverts?.retailAdverts?.suppliedPrice?.amountGBP:', item.adverts?.retailAdverts?.suppliedPrice?.amountGBP);
                                console.log('- apiItem.adverts?.retailAdverts?.suppliedPrice?.amountGBP:', apiItem.adverts?.retailAdverts?.suppliedPrice?.amountGBP);
                                console.log('- item.adverts?.retailAdverts?.priceIndicatorRating:', item.adverts?.retailAdverts?.priceIndicatorRating);
                                console.log('- apiItem.adverts?.retailAdverts?.priceIndicatorRating:', apiItem.adverts?.retailAdverts?.priceIndicatorRating);
                                
                                console.log('\n📊 METADATA MAPPING:');
                                console.log('- item.metadata?.lifecycleState:', item.metadata?.lifecycleState);
                                console.log('- apiItem.metadata?.lifecycleState:', apiItem.metadata?.lifecycleState);
                                console.log('- item.metadata?.dateOnForecourt:', item.metadata?.dateOnForecourt);
                                console.log('- apiItem.metadata?.dateOnForecourt:', apiItem.metadata?.dateOnForecourt);
                                console.log('- item.metadata?.lastUpdated:', item.metadata?.lastUpdated);
                                console.log('- apiItem.metadata?.lastUpdated:', apiItem.metadata?.lastUpdated);
                                console.log('- item.metadata?.stockId:', item.metadata?.stockId);
                                console.log('- apiItem.metadata?.stockId:', apiItem.metadata?.stockId);
                                console.log('- item.stockId:', item.stockId);
                                console.log('- apiItem.stockId:', apiItem.stockId);
                                
                                console.log('\n📸 MEDIA MAPPING:');
                                console.log('- item.media?.images?.length:', item.media?.images?.length);
                                console.log('- apiItem.media?.images?.length:', apiItem.media?.images?.length);
                                console.log('- item.media?.video?.href:', item.media?.video?.href);
                                console.log('- apiItem.media?.video?.href:', apiItem.media?.video?.href);
                                console.log('- item.media?.spin?.href:', item.media?.spin?.href);
                                console.log('- apiItem.media?.spin?.href:', apiItem.media?.spin?.href);
                                
                                console.log('\n🔍 CHECK/HISTORY MAPPING:');
                                console.log('- item.check?.scrapped:', item.check?.scrapped);
                                console.log('- apiItem.check?.scrapped:', apiItem.check?.scrapped);
                                console.log('- item.history?.scrapped:', item.history?.scrapped);
                                console.log('- apiItem.history?.scrapped:', apiItem.history?.scrapped);
                                
                                console.log('\n🎯 WHAT WILL BE DISPLAYED:');
                                console.log('- Make will show:', apiItem.make || 'N/A');
                                console.log('- Model will show:', apiItem.model || 'N/A');
                                console.log('- Price will show:', formatPrice(getPriceProperty(apiItem, 'totalPrice') || getPriceProperty(apiItem, 'suppliedPrice') || getPriceProperty(apiItem, 'forecourtPrice')));
                                console.log('- Lifecycle will show:', apiItem.lifecycleState || 'Unknown');
                                console.log('- Images will show:', apiItem.media?.images?.length || 0);
                                console.log('🔍 ===== END FRONTEND DEBUG =====\n');
                              }
                              
                              return (
                                <tr 
                                  key={`${item.stockId}-details`} 
                                  className={`group transition-all duration-300 border-b ${
                                    isDarkMode 
                                      ? 'border-slate-700/30 hover:bg-slate-700/20 hover:shadow-lg' 
                                      : 'border-slate-200/40 hover:bg-blue-50/30 hover:shadow-md'
                                  }`}
                                  style={{height: '64px'}}
                                  onMouseEnter={() => prefetchStockDetail(item.stockId)}
                                >
                                  {/* Vehicle (moved from sticky) */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    <Link href={`/mystock/${apiItem.stockId}`}>
                                      <div className={`min-w-0 cursor-pointer transition-colors duration-200 ${
                                        isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-600'
                                      }`}>
                                        <div className={`font-bold text-xs truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {apiItem.vehicle?.make || apiItem.make} {apiItem.vehicle?.model || apiItem.model}
                                        </div>
                                        <div className={`text-xs truncate ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                            {apiItem.vehicle?.yearOfManufacture || apiItem.yearOfManufacture} • {apiItem.vehicle?.derivative || apiItem.derivative || 'Standard'}
                                        </div>
                                      </div>
                                    </Link>
                                  </td>
                                  {/* Price (moved from sticky) */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                      <div className="flex flex-col items-start">
                                        <div className={`text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                          {formatPrice(getMainPrice(apiItem))}
                                      </div>
                                        {/* {apiItem.priceIndicatorRating && (
                                          <div className="text-xs text-amber-500">
                                            {apiItem.priceIndicatorRating}
                                          </div>
                                        )} */}
                                    </div>
                                  </td>

                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                      apiItem.priceIndicatorRating === 'GREAT' ? 'bg-green-500/20 text-green-400' :
                                      apiItem.priceIndicatorRating === 'GOOD' ? 'bg-blue-500/20 text-blue-400' :
                                      apiItem.priceIndicatorRating === 'FAIR' ? 'bg-amber-500/20 text-amber-400' :
                                      'bg-slate-500/20 text-slate-400'
                                    }`}>
                                      {apiItem.priceIndicatorRating || 'N/A'}
                                    </span>
                                </td>
                                <td className={`p-2 text-xs align-middle border-r font-semibold ${isDarkMode ? 'text-white border-slate-700/20' : 'text-slate-900 border-slate-200/30'}`}>
                                    {formatMileage(apiItem.vehicle?.odometerReadingMiles || apiItem.odometerReadingMiles)}
                                  </td>

                                <td className={`px-2 py-1 border-r align-middle text-center ${isDarkMode ? 'border-slate-700/20' : 'border-slate-200/30'}`}>
                                  <div className="flex flex-col gap-1 items-center justify-center">
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border text-center ${getStatusColor(apiItem.metadata?.lifecycleState || apiItem.lifecycleState, isDarkMode)}`}>
                                      {getStatusLabel(apiItem.metadata?.lifecycleState || apiItem.lifecycleState)}
                                    </span>
                                    {/* Show capped status if vehicle is capped */}
                                    {apiItem.adverts?.retailAdverts?.autotraderAdvert?.status === 'CAPPED' && (
                                      <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 text-center">
                                        AT Capped
                                      </span>
                                    )}
                                  </div>
                              </td>

                              <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {calculateDaysInStock(apiItem)}
                                  </td>
                                  {/* Basic Vehicle Info */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.make || apiItem.make || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.model || apiItem.model || 'N/A'}
                                  </td>
                                 
                                  <td className={`p-2 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'} truncate max-w-[180px]`}>
                                    <Link href={`/mystock/${apiItem.stockId}`}>
                                      <span className={`cursor-pointer hover:underline transition-colors duration-200 ${
                                        isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-600'
                                      }`}>
                                        {apiItem.vehicle?.derivative || apiItem.derivative || 'Standard'}
                                      </span>
                                    </Link>
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.generation || apiItem.generation || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.trim || apiItem.trim || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.vehicleType || apiItem.vehicleType || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.bodyType || apiItem.bodyType || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.yearOfManufacture || apiItem.yearOfManufacture || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.colour || apiItem.colour || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.style || apiItem.style || 'N/A'}
                                  </td>
                                  
                                  {/* Engine & Performance */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.fuelType || apiItem.fuelType || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.transmissionType || apiItem.transmissionType || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.drivetrain || apiItem.drivetrain || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const capacity = getVehicleProperty(apiItem, 'engineCapacityCC') as number;
                                      return capacity ? `${capacity.toLocaleString()}cc` : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const size = getVehicleProperty(apiItem, 'badgeEngineSizeLitres') as number;
                                      return size ? `${size}L` : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`p-2 text-xs align-middle border-r font-semibold ${isDarkMode ? 'text-emerald-400 border-slate-700/20' : 'text-emerald-600 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.enginePowerBHP || apiItem.enginePowerBHP) ? `${(apiItem.vehicle?.enginePowerBHP || apiItem.enginePowerBHP)}hp` : 'N/A'}
                                  </td>
                                  <td className={`p-2 text-xs align-middle border-r font-semibold ${isDarkMode ? 'text-blue-400 border-slate-700/20' : 'text-blue-600 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.enginePowerPS || apiItem.enginePowerPS) ? `${(apiItem.vehicle?.enginePowerPS || apiItem.enginePowerPS)}ps` : 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.cylinders || apiItem.cylinders || 'N/A'}
                                  </td>
                                  <td className={`p-2 text-xs align-middle border-r font-semibold ${isDarkMode ? 'text-purple-400 border-slate-700/20' : 'text-purple-600 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.topSpeedMPH || apiItem.topSpeedMPH) ? `${(apiItem.vehicle?.topSpeedMPH || apiItem.topSpeedMPH)}mph` : 'N/A'}
                                  </td>
                                  <td className={`p-2 text-xs align-middle border-r font-semibold ${isDarkMode ? 'text-amber-400 border-slate-700/20' : 'text-amber-600 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.zeroToSixtyMPHSeconds || apiItem.zeroToSixtyMPHSeconds) ? `${(apiItem.vehicle?.zeroToSixtyMPHSeconds || apiItem.zeroToSixtyMPHSeconds)}s` : 'N/A'}
                                  </td>
                                  <td className={`p-2 text-xs align-middle border-r font-semibold ${isDarkMode ? 'text-amber-400 border-slate-700/20' : 'text-amber-600 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.zeroToOneHundredKMPHSeconds || apiItem.zeroToOneHundredKMPHSeconds) ? `${(apiItem.vehicle?.zeroToOneHundredKMPHSeconds || apiItem.zeroToOneHundredKMPHSeconds)}s` : 'N/A'}
                                  </td>
                                  
                                  {/* Fuel Economy & Emissions */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.co2EmissionGPKM || apiItem.co2EmissionGPKM) ? `${(apiItem.vehicle?.co2EmissionGPKM || apiItem.co2EmissionGPKM)}g/km` : 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.emissionClass || apiItem.emissionClass || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.fuelCapacityLitres || apiItem.fuelCapacityLitres) ? `${(apiItem.vehicle?.fuelCapacityLitres || apiItem.fuelCapacityLitres)}L` : 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.fuelEconomyNEDCUrbanMPG || apiItem.fuelEconomyNEDCUrbanMPG) ? `${(apiItem.vehicle?.fuelEconomyNEDCUrbanMPG || apiItem.fuelEconomyNEDCUrbanMPG)}mpg` : 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.fuelEconomyNEDCExtraUrbanMPG || apiItem.fuelEconomyNEDCExtraUrbanMPG) ? `${(apiItem.vehicle?.fuelEconomyNEDCExtraUrbanMPG || apiItem.fuelEconomyNEDCExtraUrbanMPG)}mpg` : 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.fuelEconomyNEDCCombinedMPG || apiItem.fuelEconomyNEDCCombinedMPG) ? `${(apiItem.vehicle?.fuelEconomyNEDCCombinedMPG || apiItem.fuelEconomyNEDCCombinedMPG)}mpg` : 'N/A'}
                                  </td>
                                  
                                  {/* Physical Dimensions */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.doors || apiItem.doors || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.seats || apiItem.seats || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const length = getVehicleProperty(apiItem, 'lengthMM') as number;
                                      return length ? `${length.toLocaleString()}mm` : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const width = getVehicleProperty(apiItem, 'widthMM') as number;
                                      return width ? `${width.toLocaleString()}mm` : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const height = getVehicleProperty(apiItem, 'heightMM') as number;
                                      return height ? `${height.toLocaleString()}mm` : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const weight = getVehicleProperty(apiItem, 'minimumKerbWeightKG') as number;
                                      return weight ? `${weight.toLocaleString()}kg` : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.bootSpaceSeatsUpLitres || apiItem.bootSpaceSeatsUpLitres) ? `${(apiItem.vehicle?.bootSpaceSeatsUpLitres || apiItem.bootSpaceSeatsUpLitres)}L` : 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(apiItem.vehicle?.bootSpaceSeatsDownLitres || apiItem.bootSpaceSeatsDownLitres) ? `${(apiItem.vehicle?.bootSpaceSeatsDownLitres || apiItem.bootSpaceSeatsDownLitres)}L` : 'N/A'}
                                  </td>
                                  
                                  {/* Ownership & History */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.ownershipCondition || apiItem.ownershipCondition || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.owners || apiItem.owners || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.previousOwners || apiItem.previousOwners || apiItem.history?.previousOwners || 'N/A'}
                                  </td>
                                
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.hoursUsed || apiItem.hoursUsed || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const date = getVehicleProperty(apiItem, 'firstRegistrationDate');
                                      return date ? new Date(date as string).toLocaleDateString() : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const date = getVehicleProperty(apiItem, 'motExpiryDate');
                                      return date ? new Date(date as string).toLocaleDateString() : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {(() => {
                                      const date = getVehicleProperty(apiItem, 'lastServiceDate');
                                      return date ? new Date(date as string).toLocaleDateString() : 'N/A';
                                    })()}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.vehicle?.serviceHistory || apiItem.serviceHistory || 'N/A'}
                                  </td>
                                  
                                  {/* Insurance & Safety */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.insuranceGroup || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.insuranceSecurityCode || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.wheelchairAccessible ? 'Yes' : 'No'}
                                  </td>
                                  
                                  {/* Pricing & Finance */}
                                  <td className={`p-2 text-xs align-middle border-r font-semibold ${isDarkMode ? 'text-blue-400 border-slate-700/20' : 'text-blue-600 border-slate-200/30'}`}>
                                    {formatPrice(getPriceProperty(apiItem, 'suppliedPrice') || getPriceProperty(apiItem, 'forecourtPrice'))}
                                  </td>
                                  <td className={`p-2 text-xs align-middle border-r font-semibold ${isDarkMode ? 'text-emerald-400 border-slate-700/20' : 'text-emerald-600 border-slate-200/30'}`}>
                                    {formatPrice(getPriceProperty(apiItem, 'totalPrice') || getPriceProperty(apiItem, 'suppliedPrice') || getPriceProperty(apiItem, 'forecourtPrice'))}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {formatPrice(apiItem.adverts?.retailAdverts?.adminFee?.amountGBP || 0)}
                                  </td>
                                  
                                  <td className={`p-2 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'} truncate max-w-[120px]`}>
                                    {apiItem.attentionGrabber || 'N/A'}
                                  </td>
                              
                                  {/* Status & Metadata */}
                              
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.reservationStatus || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.advertiserAdvertStatus || apiItem.advertStatus || 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.dateOnForecourt ? new Date(apiItem.dateOnForecourt).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.lastUpdated ? new Date(apiItem.lastUpdated).toLocaleDateString() : 'N/A'}
                                  </td>
                                 
                                  
                                  {/* Check & History Flags */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    <span className={`${apiItem.scrapped ? 'text-red-400' : 'text-green-400'}`}>
                                      {apiItem.scrapped ? 'Yes' : 'No'}
                                </span>
                              </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    <span className={`${apiItem.stolen ? 'text-red-400' : 'text-green-400'}`}>
                                      {apiItem.stolen ? 'Yes' : 'No'}
                                    </span>
                              </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    <span className={`${apiItem.imported ? 'text-amber-400' : 'text-green-400'}`}>
                                      {apiItem.imported ? 'Yes' : 'No'}
                                </span>
                              </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    <span className={`${apiItem.exported ? 'text-amber-400' : 'text-green-400'}`}>
                                      {apiItem.exported ? 'Yes' : 'No'}
                                    </span>
                              </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.insuranceWriteoffCategory || 'None'}
                              </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.privateFinance || apiItem.tradeFinance ? 'Yes' : 'No'}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    <span className={`${apiItem.highRisk ? 'text-red-400' : 'text-green-400'}`}>
                                      {apiItem.highRisk ? 'Yes' : 'No'}
                                    </span>
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    <span className={`${apiItem.mileageDiscrepancy ? 'text-red-400' : 'text-green-400'}`}>
                                      {apiItem.mileageDiscrepancy ? 'Yes' : 'No'}
                                    </span>
                                  </td>
                                  
                                  {/* Media */}
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.media?.images?.length || 0}
                                  </td>
                                  <td className={`px-2 py-1 text-xs align-middle border-r ${isDarkMode ? 'text-slate-300 border-slate-700/20' : 'text-slate-700 border-slate-200/30'}`}>
                                    {apiItem.media?.video?.href ? 'Yes' : 'No'}
                              </td>
                              <td className={`p-2 text-xs align-middle ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                    {apiItem.media?.spin?.href ? 'Yes' : 'No'}
                              </td>
                            </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                    {/* Bottom Scrollbar */}
                    <div 
                      ref={bottomScrollRef}
                      className={`h-5 mt-2 ${
                        isDarkMode ? 'bg-slate-700/20' : 'bg-slate-200/30'
                      } rounded-lg always-visible-scrollbar`}
                      onScroll={handleScrollbarScroll}
                      style={{
                        minHeight: '20px',
                        display: 'block'
                      }}
                    >
                      <div style={{ width: `${Math.max(scrollbarWidth, 2500)}px`, height: '16px' }} />
                    </div>
                </div>
              </Card>
              )}

              {/* Frontend Pagination Controls */}
              {totalPages > 1 && (
                <div className={`mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-slate-800/50 border-slate-700/50' 
                    : 'bg-white/80 border-slate-200/50'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} vehicles
                    </span>
                    <div className="flex items-center gap-2">
                      <label className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                        Per page:
                      </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className={`px-2 py-1 rounded border text-sm ${
                        isDarkMode 
                          ? 'bg-slate-700 border-slate-600 text-slate-200' 
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                        <option value={96}>96</option>
                    </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`transition-all duration-300 ${
                        isDarkMode 
                          ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                      }`}
                    >
                      First
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`transition-all duration-300 ${
                        isDarkMode 
                          ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`w-8 h-8 p-0 transition-all duration-300 ${
                              currentPage === pageNumber
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                : isDarkMode 
                                  ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400' 
                                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`transition-all duration-300 ${
                        isDarkMode 
                          ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`transition-all duration-300 ${
                        isDarkMode 
                          ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                      }`}
                    >
                      Last
                    </Button>
                  </div>

                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
              </div>
            </section>
          </ProgressiveLoader>
        </div>
        <Footer />


        {/* Stock Settings Dialog */}
        <StockSettingsDialog
          isOpen={isSettingsDialogOpen}
          onClose={() => {
            setIsSettingsDialogOpen(false);
            setSelectedStock(null);
          }}
          stockId={selectedStock?.stockId || ''}
          stockData={selectedStock}
        />

        {/* Enhanced Inventory Settings Dialog */}
        {selectedInventoryStock && (
          <EnhancedInventorySettingsDialog
            isOpen={isInventorySettingsOpen}
            onClose={() => {
              setIsInventorySettingsOpen(false);
              setSelectedInventoryStock(null);
            }}
            stockData={selectedInventoryStock}
          />
        )}

        {/* Stock Action Modal */}
        {actionModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-xl shadow-2xl border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  {actionModal.type === 'sold' ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div>
                    <h3 className={`font-semibold text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {actionModal.type === 'sold' ? 'Mark as Sold' : 'Delete Stock'}
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-500'
                    }`}>
                      {actionModal.vehicleName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                {/* Progress Bar */}
                {actionModal.step !== 'confirming' && (
                  <div className="mb-6">
                    <div className="relative">
                      <div className={`w-full h-2 rounded-full ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ease-out ${
                            actionModal.step === 'completed'
                              ? actionModal.status === 'success'
                                ? 'bg-green-500'
                                : 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: actionModal.step === 'fetching-config' ? '33%' :
                                   actionModal.step === 'updating-stock' ? '66%' :
                                   actionModal.step === 'completed' ? '100%' : '0%'
                          }}
                        />
                      </div>
                      {/* Progress dots */}
                      <div className="absolute top-0 left-0 w-full h-2 flex justify-between items-center">
                        <div className={`w-3 h-3 rounded-full border-2 -mt-0.5 ${
                          ['fetching-config', 'updating-stock', 'completed'].includes(actionModal.step)
                            ? 'bg-blue-500 border-blue-500'
                            : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                        }`} />
                        <div className={`w-3 h-3 rounded-full border-2 -mt-0.5 ${
                          ['updating-stock', 'completed'].includes(actionModal.step)
                            ? 'bg-blue-500 border-blue-500'
                            : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                        }`} />
                        <div className={`w-3 h-3 rounded-full border-2 -mt-0.5 ${
                          actionModal.step === 'completed'
                            ? actionModal.status === 'success'
                              ? 'bg-green-500 border-green-500'
                              : 'bg-red-500 border-red-500'
                            : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                        }`} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="mb-6">
                  <div className="flex items-start gap-3">
                    {actionModal.step !== 'confirming' && actionModal.step !== 'completed' && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <p className={`text-sm leading-relaxed ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      {actionModal.message}
                    </p>
                  </div>
                </div>

                {/* AutoTrader Disclaimer (only show on success) */}
                {actionModal.status === 'success' && (
                  <div className={`p-4 rounded-lg border-l-4 border-blue-500 mb-6 ${
                    isDarkMode ? 'bg-blue-900/20 border-blue-400' : 'bg-blue-50'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className={`text-xs leading-relaxed ${
                        isDarkMode ? 'text-blue-200' : 'text-blue-800'
                      }`}>
                        Changes won&apos;t reflect on your dashboard immediately. AutoTrader typically takes 15-20 minutes to process updates. To maintain accuracy, we display the exact data received from AutoTrader. Updated information will appear once AutoTrader processes and confirms your changes on their end.
                      </p>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  {actionModal.step === 'confirming' ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (actionModal.type === 'sold') {
                            executeMarkAsSold(actionModal.stockId, actionModal.vehicleName);
                          } else {
                            executeDeleteStock(actionModal.stockId, actionModal.vehicleName);
                          }
                        }}
                        className={`flex-1 ${
                          actionModal.type === 'sold'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        } text-white`}
                      >
                        {actionModal.type === 'sold' ? 'Mark as Sold' : 'Delete Stock'}
                      </Button>
                    </>
                  ) : actionModal.step === 'completed' ? (
                    <Button
                      onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                      className="w-full"
                      variant={actionModal.status === 'success' ? 'default' : 'outline'}
                    >
                      {actionModal.status === 'success' ? 'Done' : 'Close'}
                    </Button>
                  ) : (
                    <div className="w-full text-center">
                      <p className={`text-xs ${
                        isDarkMode ? 'text-white' : 'text-gray-400'
                      }`}>
                        Please wait while we process your request...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Drive Form Modal */}
        {showTestDriveForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className={`w-full max-w-7xl my-8 rounded-2xl shadow-2xl ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            } border`}>
              <TestDriveEntryForm
                onSuccess={handleTestDriveFormClose}
                onClose={handleTestDriveFormClose}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Main component with Error Boundary
export default function EnhancedMyStock() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('🚨 MyStock Error Boundary:', { error, errorInfo });
        // In production, send to error tracking service
      }}
    >
      <MyStockContent />
    </ErrorBoundary>
  );
} 