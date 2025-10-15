"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LicensePlate from "@/components/ui/license-plate";
import { 
  BarChart3,
  Download,
  RefreshCw,
  Car,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { createOrGetDealer } from "@/lib/database";

interface FilterState {
  registration: string;
  status: string;
  customerName: string;
  salePriceFrom: string;
  salePriceTo: string;
  purchasePriceFrom: string;
  purchasePriceTo: string;
  purchaseDateFrom: string;
  purchaseDateTo: string;
  saleDateFrom: string;
  saleDateTo: string;
  combinedDateFrom: string;
  combinedDateTo: string;
  daysInStockFrom: string;
  daysInStockTo: string;
  profitMarginFrom: string;
  profitMarginTo: string;
}

export default function VehicleInventoryPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  
  const [storeOwnerId, setStoreOwnerId] = useState<string>("");
  const [vehicleInventoryData, setVehicleInventoryData] = useState<any[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    registration: '',
    status: '',
    customerName: '',
    salePriceFrom: '',
    salePriceTo: '',
    purchasePriceFrom: '',
    purchasePriceTo: '',
    purchaseDateFrom: '',
    purchaseDateTo: '',
    saleDateFrom: '',
    saleDateTo: '',
    combinedDateFrom: '',
    combinedDateTo: '',
    daysInStockFrom: '',
    daysInStockTo: '',
    profitMarginFrom: '',
    profitMarginTo: ''
  });
  
  // Refs for scroll synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  // Check authentication and get dealer ID
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
    
    const initializeData = async () => {
      try {
        if (!user?.id) return;
        
        let dealerIdToUse: string;
        const userRole = user?.publicMetadata?.role as string;
        const userType = user?.publicMetadata?.userType as string;
        
        if (userRole === 'store_owner_admin' && userType === 'team_member') {
          const storeOwnerIdFromMetadata = user.publicMetadata?.storeOwnerId as string;
          
          if (storeOwnerIdFromMetadata) {
            dealerIdToUse = storeOwnerIdFromMetadata;
          } else {
            const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User';
            const userEmail = user.emailAddresses[0]?.emailAddress || '';
            const dealer = await createOrGetDealer(user.id, userName, userEmail);
            dealerIdToUse = dealer.id;
          }
        } else {
          const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User';
          const userEmail = user.emailAddresses[0]?.emailAddress || '';
          const dealer = await createOrGetDealer(user.id, userName, userEmail);
          dealerIdToUse = dealer.id;
        }
        
        setStoreOwnerId(dealerIdToUse);
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };
    
    initializeData();
  }, [isLoaded, isSignedIn, user, router]);

  // Load vehicle inventory data
  const loadVehicleInventory = useCallback(async () => {
    if (!storeOwnerId) return;

    try {
      setIsLoadingInventory(true);
      const response = await fetch(`/api/vehicle-inventory-report?dealerId=${storeOwnerId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setVehicleInventoryData(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading vehicle inventory:', error);
    } finally {
      setIsLoadingInventory(false);
    }
  }, [storeOwnerId]);

  useEffect(() => {
    if (storeOwnerId) {
      loadVehicleInventory();
    }
  }, [storeOwnerId, loadVehicleInventory]);

  // Filter data with improved validation
  const filteredData = useMemo(() => {
    return vehicleInventoryData.filter(item => {
      // Registration filter (case-insensitive partial match)
      if (filters.registration && !item.vehicleRegistration?.toLowerCase().includes(filters.registration.toLowerCase().trim())) {
        return false;
      }
      
      // Status filter (exact match)
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      
      // Customer name filter (case-insensitive, searches both first and last name)
      if (filters.customerName) {
        const searchTerm = filters.customerName.toLowerCase().trim();
        const fullName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
        const firstName = (item.firstName || '').toLowerCase();
        const lastName = (item.lastName || '').toLowerCase();
        
        if (!fullName.includes(searchTerm) && !firstName.includes(searchTerm) && !lastName.includes(searchTerm)) {
          return false;
        }
      }
      
      // Sale price range filter
      if (filters.salePriceFrom) {
        const minPrice = parseFloat(filters.salePriceFrom);
        if (!isNaN(minPrice) && (item.listPrice < minPrice)) {
          return false;
        }
      }
      if (filters.salePriceTo) {
        const maxPrice = parseFloat(filters.salePriceTo);
        if (!isNaN(maxPrice) && (item.listPrice > maxPrice)) {
          return false;
        }
      }
      
      // Purchase price range filter
      if (filters.purchasePriceFrom) {
        const minPrice = parseFloat(filters.purchasePriceFrom);
        if (!isNaN(minPrice) && (item.costOfPurchase < minPrice)) {
          return false;
        }
      }
      if (filters.purchasePriceTo) {
        const maxPrice = parseFloat(filters.purchasePriceTo);
        if (!isNaN(maxPrice) && (item.costOfPurchase > maxPrice)) {
          return false;
        }
      }
      
      // Helper function to convert DD/MM/YYYY to Date object
      const parseDate = (dateString: string): Date | null => {
        if (!dateString) return null;
        try {
          const dateParts = dateString.split('/');
          if (dateParts.length === 3) {
            return new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
          }
        } catch (error) {
          // Invalid date format
        }
        return null;
      };
      
      // Purchase date range filter
      if (filters.purchaseDateFrom && item.dateOfPurchase) {
        const itemDate = parseDate(item.dateOfPurchase);
        const filterDate = new Date(filters.purchaseDateFrom);
        if (itemDate && itemDate < filterDate) {
          return false;
        }
      }
      if (filters.purchaseDateTo && item.dateOfPurchase) {
        const itemDate = parseDate(item.dateOfPurchase);
        const filterDate = new Date(filters.purchaseDateTo);
        if (itemDate && itemDate > filterDate) {
          return false;
        }
      }
      
      // Sales date range filter
      if (filters.saleDateFrom && item.dateOfSale) {
        const itemDate = parseDate(item.dateOfSale);
        const filterDate = new Date(filters.saleDateFrom);
        if (itemDate && itemDate < filterDate) {
          return false;
        }
      }
      if (filters.saleDateTo && item.dateOfSale) {
        const itemDate = parseDate(item.dateOfSale);
        const filterDate = new Date(filters.saleDateTo);
        if (itemDate && itemDate > filterDate) {
          return false;
        }
      }
      
      // Combined date range filter (purchase to sales lifecycle span)
      if (filters.combinedDateFrom || filters.combinedDateTo) {
        const purchaseDate = parseDate(item.dateOfPurchase);
        const saleDate = parseDate(item.dateOfSale);
        
        // For combined filter, we need BOTH purchase and sale dates to exist
        // This filters vehicles that went through complete lifecycle within the range
        if (!purchaseDate || !saleDate) {
          // Skip vehicles without both purchase AND sale dates
          return false;
        }
        
        if (filters.combinedDateFrom) {
          const filterDate = new Date(filters.combinedDateFrom);
          // Purchase date should be >= filter start date
          if (purchaseDate < filterDate) {
            return false;
          }
        }
        
        if (filters.combinedDateTo) {
          const filterDate = new Date(filters.combinedDateTo);
          // Sale date should be <= filter end date
          if (saleDate > filterDate) {
            return false;
          }
        }
      }
      
      // Days in stock range filter
      if (filters.daysInStockFrom) {
        const minDays = parseInt(filters.daysInStockFrom);
        if (!isNaN(minDays) && (!item.daysInStock || item.daysInStock < minDays)) {
          return false;
        }
      }
      if (filters.daysInStockTo) {
        const maxDays = parseInt(filters.daysInStockTo);
        if (!isNaN(maxDays) && (!item.daysInStock || item.daysInStock > maxDays)) {
          return false;
        }
      }
      
      // Profit margin range filter (using profit margin post VAT)
      if (filters.profitMarginFrom) {
        const minMargin = parseFloat(filters.profitMarginFrom);
        if (!isNaN(minMargin) && (item.profitMarginPostVat < minMargin)) {
          return false;
        }
      }
      if (filters.profitMarginTo) {
        const maxMargin = parseFloat(filters.profitMarginTo);
        if (!isNaN(maxMargin) && (item.profitMarginPostVat > maxMargin)) {
          return false;
        }
      }
      
      return true;
    });
  }, [vehicleInventoryData, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Calculate scrollbar width
  useEffect(() => {
    if (contentRef.current && paginatedData.length > 0) {
      setTimeout(() => {
        if (contentRef.current) {
          setScrollbarWidth(contentRef.current.scrollWidth);
        }
      }, 100);
    }
  }, [paginatedData]);

  // Scroll synchronization
  const handleTopScrollbarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (contentRef.current) {
      contentRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleBottomScrollbarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (contentRef.current) {
      contentRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      registration: '',
      status: '',
      customerName: '',
      salePriceFrom: '',
      salePriceTo: '',
      purchasePriceFrom: '',
      purchasePriceTo: '',
      purchaseDateFrom: '',
      purchaseDateTo: '',
      saleDateFrom: '',
      saleDateTo: '',
      combinedDateFrom: '',
      combinedDateTo: '',
      daysInStockFrom: '',
      daysInStockTo: '',
      profitMarginFrom: '',
      profitMarginTo: ''
    });
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  // Export to CSV (only filtered data)
  const exportToCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    // Headers matching the required column order
    const headers = [
      'ID', 'Purchase date', 'VRM', 'Make', 'Model', 'Variant', 'Year', 'Status', 
      'Purchased from', 'Purchase price',
      // Keep existing comprehensive columns
      'Month of Purchase', 'Quarter (purchase)', 'Vatable Purchase?', 'List Price',
      'Deposit Amount', 'Deposit Date', 'Email Address', 'Contact Number', 'First Name', 'Last Name', 'Date of Collection / Delivery',
      'Warranty Price Post Discount', 'Delivery Price', 'Total Finance Add-On', 'Total Customer Add-On', 'Date of Sale', 'Month of Sale', 'Quarter (sale)',
      'Amount Paid by Finance', 'Amount Paid by BACS / Card', 'Amount Paid in Cash',
      'Amount Paid in Part Exchange', 'Amount Paid in Total', 'Vehicle Sale Price', 'Days in Stock', 'Transport In',
      'Transport Out', 'MOT', 'Service VATABLE', 'Parts VATABLE', 'Repairs VATABLE',
      'Dents VATABLE', 'Bodyshop VATABLE', 'Service NON-VATABLE', 'Parts NON-VATABLE',
      'Repairs NON-VATABLE', 'Dents NON-VATABLE', 'Bodyshop NON-VATABLE', 'Outlay on Vehicle',
      'VAT on Spend', 'VAT on Purchase', 'VAT on Sale Price', 'VAT to Pay',
      'Profit Margin Pre-Costs', 'Profit Margin Post-Costs', 'Profit Margin Pre-VAT',
      'Profit Margin Post VAT'
    ];

    const formatCurrency = (value: number) => `£${value.toFixed(2)}`;

    const rows = filteredData.map((item, index) => [
      // ID field as first column
      (index + 1).toString(), // Sequential ID starting from 1
      // Required order columns
      item.dateOfPurchase, item.vehicleRegistration, item.make || '', item.model || '',
      item.variant || '', item.yearOfManufacture || '', item.status,
      item.purchaseFrom || '', formatCurrency(item.costOfPurchase),
      // Keep existing comprehensive data
      item.monthOfPurchase,
      item.quarterPurchase, item.vatablePurchase, formatCurrency(item.listPrice),
      formatCurrency(item.depositAmount), item.depositDate,
      item.emailAddress, item.contactNumber, item.firstName, item.lastName,
      item.dateOfCollectionDelivery, formatCurrency(item.warrantyPricePostDiscount),
      formatCurrency(item.deliveryPrice || 0), formatCurrency(item.totalFinanceAddOn || 0), formatCurrency(item.totalCustomerAddOn || 0),
      item.dateOfSale, item.monthOfSale, item.quarterSale,
      formatCurrency(item.amountPaidByFinance), formatCurrency(item.amountPaidByBACSCard),
      formatCurrency(item.amountPaidInCash), formatCurrency(item.amountPaidInPartExchange),
      formatCurrency(item.amountPaidInTotal), formatCurrency(item.salePrice || 0), item.daysInStock || '',
      formatCurrency(item.transportIn), formatCurrency(item.transportOut), formatCurrency(item.mot),
      formatCurrency(item.serviceVatable), formatCurrency(item.partsVatable),
      formatCurrency(item.repairsVatable), formatCurrency(item.dentsVatable),
      formatCurrency(item.bodyshopVatable), formatCurrency(item.serviceNonVatable),
      formatCurrency(item.partsNonVatable), formatCurrency(item.repairsNonVatable),
      formatCurrency(item.dentsNonVatable), formatCurrency(item.bodyshopNonVatable),
      formatCurrency(item.outlayOnVehicle), formatCurrency(item.vatOnSpend),
      formatCurrency(item.vatOnPurchase), formatCurrency(item.vatOnSalePrice),
      formatCurrency(item.vatToPay), formatCurrency(item.profitMarginPreCosts),
      formatCurrency(item.profitMarginPostCosts), formatCurrency(item.profitMarginPreVat),
      formatCurrency(item.profitMarginPostVat)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoaded) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-16 w-16 border-2 mx-auto mb-6 ${
            isDarkMode ? 'border-slate-700 border-t-cyan-500' : 'border-slate-300 border-t-cyan-600'
          }`}></div>
          <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
            Loading Vehicle Inventory
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'} flex flex-col`}>
      <Header />
      
      <div className="flex-1 pt-16 flex flex-col">
        {/* Header */}
        <section className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b`}>
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Vehicle Inventory Report
                  </h1>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {filteredData.length} of {vehicleInventoryData.length} vehicles • Page {currentPage} of {totalPages || 1}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  size="sm"
                  className={`relative ${isDarkMode ? 'border-slate-600' : 'border-slate-300'}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <Button
                  onClick={exportToCSV}
                  disabled={isLoadingInventory || filteredData.length === 0}
                  size="sm"
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Panel */}
        {showFilters && (
          <section className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'} border-b`}>
            <div className="w-full px-6 py-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Filter Inventory Report
                </h3>
                <button
                  onClick={clearFilters}
                  className={`text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                    isDarkMode 
                      ? 'text-cyan-400 hover:text-cyan-300 hover:bg-slate-700/50' 
                      : 'text-cyan-600 hover:text-cyan-700 hover:bg-white/50'
                  }`}
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </button>
              </div>

              <div className="space-y-6">
                {/* Vehicle Information Section */}
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Vehicle Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Registration Number
                      </label>
                      <Input
                        placeholder="e.g., AE65 WDS"
                        value={filters.registration}
                        onChange={(e) => setFilters(prev => ({ ...prev, registration: e.target.value }))}
                        className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Vehicle Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className={`text-sm h-9 w-full rounded-md border px-3 ${
                          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      >
                        <option value="">All Status</option>
                        <option value="Listed">Listed</option>
                        <option value="Sold">Sold</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Preparation">In Preparation</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Customer Name
                      </label>
                      <Input
                        placeholder="First or Last Name"
                        value={filters.customerName}
                        onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
                        className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Price Ranges Section */}
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Price Ranges
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Sale Price Range (£)
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            From
                          </label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={filters.salePriceFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, salePriceFrom: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            To
                          </label>
                          <Input
                            type="number"
                            placeholder="50000"
                            value={filters.salePriceTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, salePriceTo: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Purchase Price Range (£)
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            From
                          </label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={filters.purchasePriceFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, purchasePriceFrom: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            To
                          </label>
                          <Input
                            type="number"
                            placeholder="30000"
                            value={filters.purchasePriceTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, purchasePriceTo: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date and Time Ranges Section */}
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Date and Time Ranges
                  </h4>
                  <div className="space-y-4">
                    {/* Purchase Date Range */}
                    <div>
                      <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Purchase Date Range
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            From
                          </label>
                          <Input
                            type="date"
                            value={filters.purchaseDateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, purchaseDateFrom: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            To
                          </label>
                          <Input
                            type="date"
                            value={filters.purchaseDateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, purchaseDateTo: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sales Date Range */}
                    <div>
                      <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Sales Date Range
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            From
                          </label>
                          <Input
                            type="date"
                            value={filters.saleDateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, saleDateFrom: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            To
                          </label>
                          <Input
                            type="date"
                            value={filters.saleDateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, saleDateTo: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Combined Date Range (Purchase to Sales Lifecycle Span) */}
                    <div>
                      <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Purchase-to-Sale Lifecycle Filter
                        <span className={`block text-xs font-normal mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          Shows vehicles purchased after 'From' date AND sold before 'To' date
                        </span>
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            Purchase From
                          </label>
                          <Input
                            type="date"
                            value={filters.combinedDateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, combinedDateFrom: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            Sale To
                          </label>
                          <Input
                            type="date"
                            value={filters.combinedDateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, combinedDateTo: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Days in Stock Range */}
                    <div>
                      <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Days in Stock Range
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            From (days)
                          </label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={filters.daysInStockFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, daysInStockFrom: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            To (days)
                          </label>
                          <Input
                            type="number"
                            placeholder="365"
                            value={filters.daysInStockTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, daysInStockTo: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics Section */}
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Performance Metrics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Profit Margin Range (£)
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            From
                          </label>
                          <Input
                            type="number"
                            placeholder="-1000"
                            value={filters.profitMarginFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, profitMarginFrom: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            To
                          </label>
                          <Input
                            type="number"
                            placeholder="5000"
                            value={filters.profitMarginTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, profitMarginTo: e.target.value }))}
                            className={`text-sm h-9 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Summary */}
                {activeFilterCount > 0 && (
                  <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <strong>{activeFilterCount}</strong> filter{activeFilterCount !== 1 ? 's' : ''} active • 
                        Showing <strong>{filteredData.length}</strong> of <strong>{vehicleInventoryData.length}</strong> vehicles
                      </span>
                      <button
                        onClick={clearFilters}
                        className={`text-xs px-2 py-1 rounded ${
                          isDarkMode 
                            ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' 
                            : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                        } transition-colors`}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Content */}
        <section className="flex-1 p-6 overflow-hidden flex flex-col">
          <Card className={`flex-1 flex flex-col ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg overflow-hidden`}>
            {isLoadingInventory ? (
              <div className="flex items-center justify-center flex-1">
                <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin" />
                <span className={`ml-3 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Loading...</span>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1">
                <Car className={`w-16 h-16 mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  No Vehicles Found
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Add vehicles to see inventory data'}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Top Scrollbar */}
                <div 
                  ref={topScrollRef}
                  className={`h-3 mb-2 ${isDarkMode ? 'bg-slate-700/20' : 'bg-slate-200/30'} rounded always-visible-scrollbar overflow-x-scroll overflow-y-hidden`}
                  onScroll={handleTopScrollbarScroll}
                >
                  <div style={{ width: `${scrollbarWidth}px`, height: '8px' }} />
                </div>

                {/* Table */}
                <div 
                  ref={contentRef}
                  className={`flex-1 overflow-auto hide-scrollbar ${isDarkMode ? 'border border-slate-700' : 'border border-slate-200'} rounded-lg`}
                  onScroll={handleContentScroll}
                >
                  <table className="w-full text-xs border-collapse">
                    <thead className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} sticky top-0 z-10`}>
                      <tr>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap sticky left-0 z-20 ${
                          isDarkMode ? 'bg-slate-700 border-r border-slate-600' : 'bg-slate-100 border-r border-slate-300'
                        }`} style={{ minWidth: '180px' }}>Registration</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Status</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Date of Purchase</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Month of Purchase</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Quarter (purchase)</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Vatable Purchase?</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Cost of Purchase</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>List Price</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Deposit Amount</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Deposit Date</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Email Address</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Contact Number</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>First Name</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Last Name</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Date of Collection / Delivery</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Warranty Price Post Discount</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Delivery Price</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Total Finance Add-On</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Total Customer Add-On</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Date of Sale</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Month of Sale</th>
                        <th className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Quarter (sale)</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Amount Paid by Finance</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Amount Paid by BACS / Card</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Amount Paid in Cash</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Amount Paid in Part Exchange</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Amount Paid in Total</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Vehicle Sale Price</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Days in Stock</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Transport In</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Transport Out</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>MOT</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Service VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Parts VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Repairs VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Dents VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Bodyshop VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Service NON-VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Parts NON-VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Repairs NON-VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Dents NON-VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Bodyshop NON-VATABLE</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Outlay on Vehicle</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>VAT on Spend</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>VAT on Purchase</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>VAT on Sale Price</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>VAT to Pay</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Profit Margin Pre-Costs</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Profit Margin Post-Costs</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Profit Margin Pre-VAT</th>
                        <th className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Profit Margin Post VAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => (
                        <tr
                          key={index}
                          className={`${
                            isDarkMode 
                              ? index % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800/30' 
                              : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                          } hover:${isDarkMode ? 'bg-slate-700/40' : 'bg-slate-100'} transition-colors border-b ${
                            isDarkMode ? 'border-slate-700/30' : 'border-slate-200'
                          }`}
                        >
                          <td className={`px-3 py-2 whitespace-nowrap sticky left-0 z-10 ${
                            isDarkMode 
                              ? index % 2 === 0 ? 'bg-slate-800/50 border-r border-slate-700/50' : 'bg-slate-800/30 border-r border-slate-700/50' 
                              : index % 2 === 0 ? 'bg-white border-r border-slate-300' : 'bg-slate-50 border-r border-slate-300'
                          }`}>
                            <LicensePlate registration={item.vehicleRegistration || 'N/A'} size="sm" />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              item.status === 'Listed' 
                                ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                : isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.dateOfPurchase}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.monthOfPurchase}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.quarterPurchase}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.vatablePurchase}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>£{item.costOfPurchase.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>£{item.listPrice.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.depositAmount.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.depositDate}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.emailAddress}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.contactNumber}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.firstName}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.lastName}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.dateOfCollectionDelivery}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.warrantyPricePostDiscount.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{(item.deliveryPrice || 0).toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{(item.totalFinanceAddOn || 0).toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{(item.totalCustomerAddOn || 0).toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.dateOfSale}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.monthOfSale}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.quarterSale}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.amountPaidByFinance.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.amountPaidByBACSCard.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.amountPaidInCash.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.amountPaidInPartExchange.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>£{item.amountPaidInTotal.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>£{(item.salePrice || 0).toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.daysInStock || '-'}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.transportIn.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.transportOut.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.mot.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.serviceVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.partsVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.repairsVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.dentsVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.bodyshopVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.serviceNonVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.partsNonVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.repairsNonVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.dentsNonVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.bodyshopNonVatable.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.outlayOnVehicle.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.vatOnSpend.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.vatOnPurchase.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.vatOnSalePrice.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>£{item.vatToPay.toFixed(2)}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right font-medium ${
                            item.profitMarginPreCosts >= 0 
                              ? isDarkMode ? 'text-green-400' : 'text-green-600'
                              : isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {item.profitMarginPreCosts >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                            £{item.profitMarginPreCosts.toFixed(2)}
                          </td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right font-medium ${
                            item.profitMarginPostCosts >= 0 
                              ? isDarkMode ? 'text-green-400' : 'text-green-600'
                              : isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {item.profitMarginPostCosts >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                            £{item.profitMarginPostCosts.toFixed(2)}
                          </td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right font-medium ${
                            item.profitMarginPreVat >= 0 
                              ? isDarkMode ? 'text-green-400' : 'text-green-600'
                              : isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {item.profitMarginPreVat >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                            £{item.profitMarginPreVat.toFixed(2)}
                          </td>
                          <td className={`px-3 py-2 whitespace-nowrap text-right font-medium ${
                            item.profitMarginPostVat >= 0 
                              ? isDarkMode ? 'text-green-400' : 'text-green-600'
                              : isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {item.profitMarginPostVat >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                            £{item.profitMarginPostVat.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Scrollbar */}
                <div 
                  ref={bottomScrollRef}
                  className={`h-3 mt-2 ${isDarkMode ? 'bg-slate-700/20' : 'bg-slate-200/30'} rounded always-visible-scrollbar overflow-x-scroll overflow-y-hidden`}
                  onScroll={handleBottomScrollbarScroll}
                >
                  <div style={{ width: `${scrollbarWidth}px`, height: '8px' }} />
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={`flex items-center justify-between mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                        className={isDarkMode ? 'border-slate-600' : ''}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className={`text-xs px-3 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                        className={isDarkMode ? 'border-slate-600' : ''}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>
      </div>

      <Footer />
    </div>
  );
}
