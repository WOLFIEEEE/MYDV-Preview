"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type InventoryItem } from "@/hooks/useInventoryDataQuery";
import { useOptimizedInventoryData } from "@/hooks/useOptimizedInventoryData";
import { 
  RefreshCw, 
  Search,
  Package,
  Car,
  AlertTriangle,
  PoundSterling,
  BarChart3,
  Filter,
  Eye,
  FileText,
  Settings,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@clerk/nextjs";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { createOrGetDealer } from "@/lib/database";
import LicensePlate from "@/components/ui/license-plate";
import EnhancedInventorySettingsDialog from "@/components/stock/EnhancedInventorySettingsDialog";
import StockDataError from "@/components/shared/StockDataError";
import InventorySkeleton from "@/components/shared/InventorySkeleton";
import ProgressiveLoader from "@/components/shared/ProgressiveLoader";

export default function VehicleStockManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [makeFilter, setMakeFilter] = useState("all");
  const [priceRangeFilter, setPriceRangeFilter] = useState("all");
  const [checklistFilter, setChecklistFilter] = useState("all");
  const [salesDetailsFilter, setSalesDetailsFilter] = useState("all");
  const [dealerId, setDealerId] = useState<string>('');
  
  // Frontend pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  
  // Settings dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedStockData, setSelectedStockData] = useState<Record<string, unknown> | null>(null);
  
  // Dual scrollbar state and refs (same as MyStock)
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(2500);
  
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const router = useRouter();

  // Use Optimized React Query for cached inventory data with instant display
  const {
    data: inventoryData,
    loading: isLoading,
    error: inventoryError,
    loadingState,
    refetch,
    isFetching: isRefreshing,
  } = useOptimizedInventoryData({
    dealerId,
    disabled: !dealerId, // Don't fetch until we have a dealer ID
  });

  // Scroll synchronization handlers (same as MyStock)
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, makeFilter, priceRangeFilter, checklistFilter, salesDetailsFilter]);

  // Get dealer ID (supports team member credential delegation)
  useEffect(() => {
    const getDealerId = async () => {
      if (!user?.id || dealerId) return; // Prevent multiple calls if dealerId already exists
      
      try {
        const userEmail = user.emailAddresses[0]?.emailAddress || '';
        
        // Check if user is a team member via API call (server-side)
        const teamMemberResponse = await fetch('/api/check-team-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
        
        if (teamMemberResponse.ok) {
          const teamMemberResult = await teamMemberResponse.json();
          
          if (teamMemberResult.isTeamMember && teamMemberResult.storeOwnerId) {
            // User is a team member - use store owner's dealer ID directly
            console.log('👥 Team member detected - using store owner dealer ID:', teamMemberResult.storeOwnerId);
            setDealerId(teamMemberResult.storeOwnerId);
            console.log('✅ Dealer ID set for inventory (team member using store owner):', teamMemberResult.storeOwnerId);
          } else {
            // User is store owner or regular user - use their own dealer record
            const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail || 'Unknown User';
            const dealer = await createOrGetDealer(user.id, userName, userEmail);
            setDealerId(dealer.id);
            console.log('✅ Dealer ID set for inventory (store owner):', dealer.id);
          }
        } else {
          // Fallback: create dealer record with user's own email
          const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail || 'Unknown User';
          const dealer = await createOrGetDealer(user.id, userName, userEmail);
          setDealerId(dealer.id);
          console.log('✅ Dealer ID set for inventory (fallback):', dealer.id);
        }
      } catch (error) {
        console.error('❌ Error getting dealer ID:', error);
        // Fallback to hardcoded ID
        setDealerId('278d2698-4686-4a51-80fb-ab9ce16e05d0');
      }
    };

    if (user?.id && !dealerId) { // Only call if we don't have dealerId yet
      getDealerId();
    }
  }, [user?.id, user?.emailAddresses, user?.firstName, user?.fullName, user?.lastName, dealerId]); // Add dealerId to dependencies to prevent re-runs


  // Get unique makes for filter dropdown
  const uniqueMakes = Array.from(new Set(inventoryData.map(item => item.make))).sort();

  // Calculate days in stock
  const calculateDaysInStock = (item: InventoryItem) => {
    const dateOnForecourt = item.dateOnForecourt;
    if (!dateOnForecourt) return 0;
    const forecourtDate = new Date(dateOnForecourt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - forecourtDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Advanced filtering logic
  const filteredInventory = inventoryData.filter((item) => {
    const matchesSearch = item.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.stockId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.makeModel.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (item.lifecycleState && item.lifecycleState.toLowerCase().includes(statusFilter.toLowerCase()));
    
    const matchesMake = makeFilter === "all" || item.make === makeFilter;
    
    const matchesPriceRange = priceRangeFilter === "all" || 
      (priceRangeFilter === "under-5k" && item.forecourtPriceGBP < 5000) ||
      (priceRangeFilter === "5k-10k" && item.forecourtPriceGBP >= 5000 && item.forecourtPriceGBP < 10000) ||
      (priceRangeFilter === "10k-20k" && item.forecourtPriceGBP >= 10000 && item.forecourtPriceGBP < 20000) ||
      (priceRangeFilter === "over-20k" && item.forecourtPriceGBP >= 20000);
    
    const matchesChecklist = checklistFilter === "all" ||
      (checklistFilter === "added" && item.checklistStatus === "Added") ||
      (checklistFilter === "some-missing" && item.checklistStatus === "Some Missing") ||
      (checklistFilter === "not-added" && item.checklistStatus === "Not Added");

    const matchesSalesDetails = salesDetailsFilter === "all" ||
      (salesDetailsFilter === "added" && item.salesDetailsStatus === "Added") ||
      (salesDetailsFilter === "not-added" && item.salesDetailsStatus === "Not Added");
      
    return matchesSearch && matchesStatus && matchesMake && matchesPriceRange && matchesChecklist && matchesSalesDetails;
  });

  // Frontend pagination
  const totalItems = filteredInventory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

  // Calculate scrollbar width based on actual table content
  useEffect(() => {
    const updateScrollbarWidth = () => {
      if (contentRef.current) {
        const table = contentRef.current.querySelector('table');
        if (table) {
          // Get the actual table scroll width
          const tableScrollWidth = table.scrollWidth;
          // Get the container width
          const containerWidth = contentRef.current.clientWidth;
          // Set scrollbar width to match the table scroll width
          setScrollbarWidth(Math.max(tableScrollWidth, containerWidth));
        }
      }
    };

    // Use a small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(updateScrollbarWidth, 100);
    
    window.addEventListener('resize', updateScrollbarWidth);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateScrollbarWidth);
    };
  }, [paginatedInventory, isDarkMode]);

  // Calculate summary statistics
  const totalInventory = inventoryData.length;
  const totalInvestment = inventoryData.reduce((sum, item) => sum + (parseFloat(item.totalCost.toString()) || 0), 0);
  const totalValue = inventoryData.reduce((sum, item) => sum + (parseFloat(item.forecourtPriceGBP.toString()) || 0), 0);
  const totalSales = inventoryData.reduce((sum, item) => sum + (parseFloat(item.salesPrice.toString()) || 0), 0);
  const incompleteChecklistCount = inventoryData.filter(item => item.checklistStatus !== 'Added').length;

  const handleRefresh = async () => {
    if (!dealerId) return;
    
    console.log('🔄 Refreshing inventory data...');
    try {
      await refetch();
      console.log('✅ Inventory data refreshed via React Query cache');
    } catch (error) {
      console.error('❌ Error refreshing inventory data:', error);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMakeFilter("all");
    setPriceRangeFilter("all");
    setChecklistFilter("all");
    setSalesDetailsFilter("all");
  };

  const handleSettingsClick = (item: InventoryItem) => {
    setSelectedStockData({
      metadata: {
        stockId: item.stockId
      },
      vehicle: {
        registration: item.registration,
        make: item.make,
        model: item.makeModel,
        mileage: item.mileage
      },
      // Add any other relevant data from the inventory item
      ...item
    });
    setSettingsDialogOpen(true);
  };

  // Show error state if there's an error
  if (inventoryError) {
    return (
      <>
        <Header />
        <div className={`min-h-screen pt-16 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <StockDataError 
            error={inventoryError} 
            onRetry={handleRefresh}
            isRetrying={isRefreshing}
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
          hasData={inventoryData.length > 0}
          fallback={
            <section className="py-8 sm:py-12">
              <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
                <InventorySkeleton count={12} />
              </div>
            </section>
          }
        >
          {/* Page Header */}
          <section className="py-8 sm:py-12">
            <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg ${
                  isDarkMode ? 'shadow-blue-500/20' : 'shadow-blue-500/30'
                }`}>
                  <Package className="w-6 h-6 text-white" />
          </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className={`text-3xl sm:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Stock Management
                    </h1>
                    {isRefreshing && (
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                        isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'
                      }`}>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Updating...
                      </div>
                    )}
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'} mt-1`}>
                    Comprehensive stock management with advanced filtering and data analysis
                  </p>
            </div>
          </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline" 
                  className={`transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700 hover:text-white' 
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                
              </div>
            </div>

            {/* Enhanced Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              {isLoading ? (
                // Skeleton loading for summary cards
                Array.from({ length: 5 }).map((_, index) => (
                  <Card key={`skeleton-card-${index}`} className={`${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700/50' 
                      : 'bg-white border-slate-200/50'
                  } hover:shadow-lg transition-all duration-300 animate-pulse`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${
                          isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                        }`} />
                        <div className="flex-1">
                          <div className={`h-6 w-16 rounded mb-1 ${
                            isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                          }`} />
                          <div className={`h-3 w-20 rounded ${
                            isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                          }`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                [
                  { 
                    label: "Total Vehicles", 
                    value: totalInventory.toString(), 
                    icon: Package,
                    color: "blue"
                  },
                  { 
                    label: "Total Investment", 
                    value: `£${totalInvestment.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
                    icon: PoundSterling, 
                    color: "blue"
                  },
                  { 
                    label: "Total Value", 
                    value: `£${totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
                    icon: BarChart3, 
                    color: "emerald"
                  },
                  { 
                    label: "Total Sales", 
                    value: `£${totalSales.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
                    icon: BarChart3, 
                    color: "green"
                  },
                  { 
                    label: "Incomplete Checklists", 
                    value: incompleteChecklistCount.toString(), 
                    icon: AlertTriangle, 
                    color: "red"
                  }
                ].map((stat, index) => (
                  <Card key={index} className={`${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700/50' 
                      : 'bg-white border-slate-200/50'
                  } hover:shadow-lg transition-all duration-300`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          stat.color === 'blue' 
                            ? 'bg-blue-500/10 text-blue-500' 
                            : stat.color === 'emerald'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : stat.color === 'green'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          <stat.icon className="w-4 h-4" />
                          </div>
                          <div>
                          <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {stat.value}
                            </div>
                          <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
          </div>

          {/* Enhanced Filters and Search */}
          <Card className={`mb-6 ${
            isDarkMode 
              ? 'bg-slate-800/50 border-slate-700/50' 
              : 'bg-white border-slate-200/50'
          }`}>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    <Search className="w-4 h-4 inline mr-2" />
                    Search:
                  </label>
                <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                      isDarkMode ? 'text-white' : 'text-gray-400'
                    }`} />
                  <input
                    type="text"
                      placeholder="Registration, Stock ID, Make, Model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDarkMode 
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    <Car className="w-4 h-4 inline mr-2" />
                    Status:
                  </label>
                    <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                        isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="all">All Status</option>
                    <option value="stock">Stock</option>
                    <option value="listed">Listed</option>
                      <option value="sold">Sold</option>
                    <option value="deposit">Deposit Taken</option>
                    </select>
                  </div>

                {/* Make Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    <Settings className="w-4 h-4 inline mr-2" />
                    Make:
                  </label>
                  <select
                    value={makeFilter}
                    onChange={(e) => setMakeFilter(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Makes</option>
                    {uniqueMakes.map(make => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Price Range Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    <PoundSterling className="w-4 h-4 inline mr-2" />
                    Price Range:
                  </label>
                  <select
                    value={priceRangeFilter}
                    onChange={(e) => setPriceRangeFilter(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Prices</option>
                    <option value="under-5k">Under £5,000</option>
                    <option value="5k-10k">£5,000 - £10,000</option>
                    <option value="10k-20k">£10,000 - £20,000</option>
                    <option value="over-20k">Over £20,000</option>
                  </select>
                </div>

                {/* Checklist Status Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    <FileText className="w-4 h-4 inline mr-2" />
                    Checklist Status:
                  </label>
                  <select
                    value={checklistFilter}
                    onChange={(e) => setChecklistFilter(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Checklists</option>
                    <option value="added">Added</option>
                    <option value="some-missing">Some Missing</option>
                    <option value="not-added">Not Added</option>
                  </select>
                </div>

                {/* Sales Details Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    <FileText className="w-4 h-4 inline mr-2" />
                    Sales Details:
                  </label>
                  <select
                    value={salesDetailsFilter}
                    onChange={(e) => setSalesDetailsFilter(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Sales Details</option>
                    <option value="added">Added</option>
                    <option value="not-added">Not Added</option>
                  </select>
                </div>
              </div>
                  
              {/* Clear Filters */}
              <div className="flex justify-end">
                        <Button
                      variant="outline"
                    onClick={clearAllFilters}
                    className={`${
                        isDarkMode 
                        ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                    Clear All Filters
                    </Button>
                </div>
            </CardContent>
          </Card>

                                {/* Inventory Management Table with Fixed Columns */}
          <Card className={`w-full overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-800/50 border-slate-700/50' 
              : 'bg-white border-slate-200/50'
          } p-0 m-0`}>
            
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
              <div style={{ width: `${scrollbarWidth}px`, height: '16px' }} />
            </div>

            {/* Single Table Container with Sticky Columns */}
            <div 
              ref={contentRef}
              className={`w-full overflow-x-auto hide-scrollbar ${
                isDarkMode ? 'border-slate-700/50' : 'border-slate-300/30'
              }`}
              onScroll={handleContentScroll}
            >
              <table className="w-full min-w-full border-spacing-0 relative">
                <thead className={`sticky top-0 h-12 ${
                  isDarkMode ? 'bg-slate-900/95 border-slate-700/50' : 'bg-slate-100/95 border-slate-300/50'
                } border-b-2 backdrop-blur-md m-0`}>
                  <tr>
                    {/* Actions Column - First Sticky */}
                    <th className={`sticky left-0 z-30 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider w-[100px] ${
                      isDarkMode 
                        ? 'bg-slate-900 text-slate-300 border-slate-700' 
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    } border-r-2 shadow-lg`}>Actions</th>
                    {/* Registration Column - Second Sticky */}
                    <th className={`sticky left-[72px] z-30 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider w-[120px] ${
                      isDarkMode 
                        ? 'bg-slate-900 text-slate-300 border-slate-700' 
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    } border-r-2 shadow-lg`}>Registration</th>
                    {/* Scrollable Columns */}
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] hidden ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Stock ID</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Make/Model</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[80px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Days in Stock</th>
                  
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Purchase Price</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Purchase Date</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Total Costs</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Total Vatable</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[130px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Total Non-Vatable</th>
              
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Sale Price</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[100px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Sale Date</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Checklist Status</th>
                    <th className={`px-2 py-2 text-left text-sm font-semibold uppercase tracking-wider min-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Sales Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50">
                  {isLoading ? (
                    // Skeleton loading rows
                    Array.from({ length: 8 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        {/* Actions Column - First Sticky */}
                        <td className={`sticky left-0 z-20 px-2 align-middle w-[100px] ${
                          isDarkMode 
                            ? 'bg-slate-800 border-slate-700' 
                            : 'bg-white border-slate-300'
                        } border-r-2 shadow-lg`} style={{ height: '60px' }}>
                          <div className="flex items-center gap-1">
                            <div className={`w-6 h-6 rounded ${
                              isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                            }`} />
                            <div className={`w-6 h-6 rounded ${
                              isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                            }`} />
                          </div>
                        </td>
                        {/* Registration Column - Second Sticky */}
                        <td className={`sticky left-[72px] z-20 px-2 align-middle w-[120px] ${
                          isDarkMode 
                            ? 'bg-slate-800 border-slate-700' 
                            : 'bg-white border-slate-300'
                        } border-r-2 shadow-lg`} style={{ height: '60px' }}>
                          <div className={`h-8 w-20 rounded ${
                            isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                          }`} />
                        </td>
                        {/* Scrollable Columns */}
                        {Array.from({ length: 12 }).map((_, colIndex) => (
                          <td key={colIndex} className="px-2 align-middle" style={{ height: '60px' }}>
                            <div className={`h-4 w-full rounded ${
                              isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                            }`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginatedInventory.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-8 h-8 text-gray-400" />
                          <span className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                            No inventory data found
                          </span>
                          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                            Try adjusting your filters or add some vehicles to your stock
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedInventory.map((item, index) => (
                      <tr key={item.stockId + '-' + index} className={`hover:${
                        isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50'
                      } transition-colors duration-200`} style={{ height: '60px' }}>
                        {/* Actions Column - First Sticky */}
                        <td className={`sticky left-0 z-20 px-2 align-middle w-[100px] ${
                          isDarkMode 
                            ? 'bg-slate-800 border-slate-700' 
                            : 'bg-white border-slate-300'
                        } border-r-2 shadow-lg`} style={{ height: '60px' }}>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/inventory/${item.stockId}`)}
                              className={`w-6 h-6 p-0 ${
                                isDarkMode 
                                  ? 'border-slate-600 text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500' 
                                  : 'border-slate-300 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-500'
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSettingsClick(item)}
                              className={`w-6 h-6 p-0 ${
                                isDarkMode 
                                  ? 'border-slate-600 text-slate-300 hover:bg-purple-600 hover:text-white hover:border-purple-500' 
                                  : 'border-slate-300 text-slate-600 hover:bg-purple-600 hover:text-white hover:border-purple-500'
                              }`}
                            >
                              <Settings className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                        {/* Registration Column - Second Sticky */}
                        <td className={`sticky left-[72px] z-20 px-2 align-middle w-[120px] ${
                          isDarkMode 
                            ? 'bg-slate-800 border-slate-700' 
                            : 'bg-white border-slate-300'
                        } border-r-2 shadow-lg`} style={{ height: '60px' }}>
                          <LicensePlate 
                            registration={item.registration} 
                            size="md"
                            onClick={() => router.push(`/inventory/${item.stockId}`)}
                          />
                        </td>
                        
                        {/* Scrollable Columns */}
                        {/* Stock ID */}
                        <td className={`px-2 align-middle text-sm hidden ${isDarkMode ? 'text-white' : 'text-slate-600'}`} style={{ height: '60px' }}>
                          {item.stockId}
                        </td>
                        
                        {/* Make/Model */}
                        <td className={`px-2 align-middle text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`} style={{ height: '60px' }}>
                          {item.makeModel}
                        </td>
                        
                        {/* Days in Stock */}
                        <td className={`px-2 align-middle text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`} style={{ height: '60px' }}>
                          {calculateDaysInStock(item)} days
                        </td>
                        
                     
                        
                        {/* Purchase Price */}
                        <td className={`px-2 align-middle text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`} style={{ height: '60px' }}>
                          £{item.purchasePrice ? parseFloat(item.purchasePrice.toString()).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                        </td>
                        
                        {/* Purchase Date */}
                        <td className={`px-2 align-middle text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`} style={{ height: '60px' }}>
                          {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-GB') : 'N/A'}
                        </td>

                           {/* Total Costs */}
                           <td className={`px-2 align-middle text-sm font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} style={{ height: '60px' }}>
                          £{parseFloat(item.totalCost.toString()).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                        {/* Total Vatable */}
                        <td className={`px-2 align-middle text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`} style={{ height: '60px' }}>
                          £{parseFloat(item.totalVatable.toString()).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                        {/* Total Non-Vatable */}
                        <td className={`px-2 align-middle text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`} style={{ height: '60px' }}>
                          £{parseFloat(item.totalNonVatable.toString()).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                      
                        
                        {/* Sale Price */}
                        <td className={`px-2 align-middle text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} style={{ height: '60px' }}>
                          £{parseFloat(item.salesPrice.toString()).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                          {/* Sale Date */}
                          <td className={`px-2 align-middle text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`} style={{ height: '60px' }}>
                          {item.salesDate || 'Not Sold'}
                        </td>
                        
                        {/* Checklist Status */}
                        <td className={`px-2 align-middle text-sm`} style={{ height: '60px' }}>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                            item.checklistStatus === 'Added' 
                            ? isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'
                              : item.checklistStatus === 'Some Missing'
                              ? isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                              : isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                        }`}>
                            {item.checklistStatus}
                          </span>
                        </td>
                        
                        {/* Sales Details Status */}
                        <td className={`px-2 align-middle text-sm`} style={{ height: '60px' }}>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                            item.salesDetailsStatus === 'Added' 
                            ? isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'
                              : isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                        }`}>
                            {item.salesDetailsStatus}
                          </span>
                        </td>
                        
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
              <div style={{ width: `${scrollbarWidth}px`, height: '16px' }} />
            </div>
            </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={`mt-6 p-4 rounded-lg border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-slate-800/50 border-slate-700/50' 
                : 'bg-white/80 border-slate-200/50'
            }`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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
                    Previous
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
                    Next
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
            </div>
          )}
          
          {/* Enhanced Results Summary */}
          <div className="mt-4 text-center">
            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
              Showing {paginatedInventory.length} of {totalItems} filtered vehicles ({totalInventory} total in stock management data)
            </p>
            {incompleteChecklistCount > 0 && (
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {incompleteChecklistCount} vehicles have incomplete checklists
              </p>
            )}
              </div>
            </div>
          </section>
        </ProgressiveLoader>
      </div>

      <Footer />
    </div>


    {/* Enhanced Settings Dialog */}
    {selectedStockData && (
      <EnhancedInventorySettingsDialog
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        stockData={selectedStockData}
      />
    )}
  </>
  );
} 