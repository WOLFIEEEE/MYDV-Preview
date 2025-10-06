"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import LicensePlate from "@/components/ui/license-plate";
import SaleDetailsForm from "@/components/stock/tabs/actions/SaleDetailsForm";
import { useInventoryDataQuery, type InventoryItem } from "@/hooks/useInventoryDataQuery";
import { createOrGetDealer } from "@/lib/database";
import { Handshake, Search, Filter, Download, RefreshCw, Calendar, User, CreditCard, CheckCircle, XCircle, Edit, Trash2, X, Plus, FileText, ExternalLink } from "lucide-react";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  marketingConsent: boolean;
  gdprConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SaleDetail {
  id: number;
  stockId: string;
  customerId?: string;
  registration: string;
  saleDate: string;
  monthOfSale: string;
  quarterOfSale: string;
  salePrice: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  contactNumber: string;
  addressFirstLine: string;
  addressPostCode: string;
  paymentMethod: string;
  cashAmount: string;
  bacsAmount: string;
  financeAmount: string;
  depositAmount: string;
  partExAmount: string;
  warrantyType: string;
  deliveryDate: string;
  deliveryAddress: string;
  documentationComplete: boolean;
  keyHandedOver: boolean;
  customerSatisfied: boolean;
  vulnerabilityMarker: boolean;
  depositPaid: boolean;
  vehiclePurchased: boolean;
  enquiry: boolean;
  gdprConsent: boolean;
  salesMarketingConsent: boolean;
  requiresAdditionalSupport: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  customer?: Customer;
}

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  vehicleRegistration: string;
  customerName: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

export default function SaleDetailsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [dealerId, setDealerId] = useState<string>('');
  const [saleDetails, setSaleDetails] = useState<SaleDetail[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Record<string, RecentInvoice>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "has-data" | "no-data">("all");
  const [sortBy, setSortBy] = useState<"saleDate" | "salePrice" | "stockId" | "updatedAt">("saleDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<SaleDetail | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);

  // Use inventory data query to get all vehicles
  const {
    data: inventoryData,
    loading: isLoading,
    error: inventoryError,
    refetch,
    isFetching: isRefreshing,
  } = useInventoryDataQuery({
    dealerId,
    disabled: !dealerId,
  });

  // Get dealer ID (same pattern as other stock-actions pages)
  useEffect(() => {
    const getDealerId = async () => {
      if (!user?.id || dealerId) return;
      
      try {
        const userEmail = user.emailAddresses[0]?.emailAddress || '';
        const dealer = await createOrGetDealer(user.id, userEmail, '');
        setDealerId(dealer.id);
      } catch (error) {
        console.error('Error getting dealer ID:', error);
      }
    };

    getDealerId();
  }, [user?.id, dealerId]);


  const fetchSaleDetails = useCallback(async () => {
    if (!dealerId) return;
    
    try {
      const response = await fetch('/api/stock-actions/sale-details/all');
      if (!response.ok) {
        throw new Error('Failed to fetch sale details data');
      }
      
      const result = await response.json();
      if (result.success) {
        setSaleDetails(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching sale details:', err);
    }
  }, [dealerId]);

  const fetchRecentInvoices = useCallback(async () => {
    if (!dealerId) return;
    
    try {
      const response = await fetch('/api/stock-actions/sale-details/recent-invoices');
      if (!response.ok) {
        throw new Error('Failed to fetch recent invoices data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setRecentInvoices(result.data || {});
        console.log(`✅ Loaded ${result.count} recent invoices`);
      } else {
        throw new Error(result.error || 'Failed to fetch invoices');
      }
    } catch (err) {
      console.error('❌ Error fetching recent invoices:', err);
    }
  }, [dealerId]);

  useEffect(() => {
    fetchSaleDetails();
    fetchRecentInvoices();
  }, [fetchSaleDetails, fetchRecentInvoices]);

  // Create a map of all sales records by stockId for quick lookup
  const salesByStockId = new Map(
    saleDetails.map(sale => [sale.stockId, sale])
  );

  // Merge inventory data with sales data - show ALL vehicles from stockCache
  const combinedData = (inventoryData || []).map(vehicle => {
    const saleDetail = salesByStockId.get(vehicle.stockId);
    return {
      vehicle,
      saleDetail,
      hasData: !!saleDetail,
    };
  });

  // Debug: Log matching for troubleshooting
  if (Object.keys(recentInvoices).length > 0) {
    console.log(`🔍 Invoice matching: ${Object.keys(recentInvoices).length} invoices available for ${combinedData.length} vehicles`);
  }

  // Filter and sort combined data
  const filteredAndSortedData = combinedData
    .filter(item => {
      const matchesSearch = item.vehicle.stockId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vehicle.makeModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.saleDetail && `${item.saleDetail.firstName} ${item.saleDetail.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterBy === "all" || 
        (filterBy === "has-data" && item.hasData) ||
        (filterBy === "no-data" && !item.hasData);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortBy === 'stockId') {
        aValue = a.vehicle.stockId;
        bValue = b.vehicle.stockId;
      } else if (sortBy === 'salePrice') {
        aValue = a.saleDetail ? parseFloat(a.saleDetail.salePrice) || 0 : 0;
        bValue = b.saleDetail ? parseFloat(b.saleDetail.salePrice) || 0 : 0;
      } else if (sortBy === 'saleDate') {
        aValue = a.saleDetail ? new Date(a.saleDetail.saleDate).getTime() : 0;
        bValue = b.saleDetail ? new Date(b.saleDetail.saleDate).getTime() : 0;
      } else if (sortBy === 'updatedAt') {
        aValue = a.saleDetail ? new Date(a.saleDetail.updatedAt).getTime() : 0;
        bValue = b.saleDetail ? new Date(b.saleDetail.updatedAt).getTime() : 0;
      } else {
        aValue = a.vehicle.stockId;
        bValue = b.vehicle.stockId;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Pagination
  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '£0.00' : `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Open invoice in editor (similar to invoices page)
  const openInvoice = (invoice: RecentInvoice) => {
    // Create temporary storage for the invoice ID
    const tempId = `invoice_${invoice.id}_${Date.now()}`;
    sessionStorage.setItem(tempId, invoice.id);
    
    // Navigate to dynamic editor with the temp ID
    router.push(`/dynamic-invoice-editor?tempId=${tempId}&invoiceId=${invoice.id}`);
  };

  const exportToCSV = () => {
    const headers = [
      'Stock ID', 'Registration', 'Make Model', 'Vehicle Status', 'Sale Date', 'Sale Price', 'Customer Name', 'Email', 'Phone', 
      'Documentation Complete', 'Keys Handed Over', 'Customer Satisfied', 'Has Sales Data', 'Recent Invoice', 'Last Updated'
    ];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedData.map(item => [
        item.vehicle.stockId,
        item.vehicle.registration,
        item.vehicle.makeModel,
        item.vehicle.lifecycleState || 'Unknown',
        item.saleDetail ? formatDate(item.saleDetail.saleDate) : 'N/A',
        item.saleDetail ? item.saleDetail.salePrice : 'N/A',
        item.saleDetail ? `${item.saleDetail.firstName} ${item.saleDetail.lastName}` : 'N/A',
        item.saleDetail?.emailAddress || 'N/A',
        item.saleDetail?.contactNumber || 'N/A',
        item.saleDetail?.documentationComplete ? 'Yes' : 'No',
        item.saleDetail?.keyHandedOver ? 'Yes' : 'No',
        item.saleDetail?.customerSatisfied ? 'Yes' : 'No',
        item.hasData ? 'Yes' : 'No',
        recentInvoices[item.vehicle.stockId] ? recentInvoices[item.vehicle.stockId].invoiceNumber : 'N/A',
        item.saleDetail ? formatDate(item.saleDetail.updatedAt) : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-sales-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAdd = (vehicle: InventoryItem) => {
    setSelectedVehicle(vehicle);
    setAddDialogOpen(true);
  };

  const handleEdit = (item: { vehicle: InventoryItem; saleDetail: SaleDetail | undefined; hasData: boolean }) => {
    if (item.saleDetail) {
      setSelectedItem(item.saleDetail);
      setSelectedVehicle(item.vehicle);
      setEditDialogOpen(true);
    }
  };

  const handleDelete = async (item: { vehicle: InventoryItem; saleDetail: SaleDetail | undefined; hasData: boolean }) => {
    if (!item.saleDetail) return;
    if (window.confirm(`Are you sure you want to delete the sale details for Stock ID: ${item.vehicle.stockId}?`)) {
      try {
        setDeletingId(item.saleDetail.id);

        const response = await fetch(`/api/stock-actions/sale-details/${item.saleDetail.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete sale details');
        }

        const result = await response.json();
        
        if (result.success) {
          // Remove the item from the local state
          setSaleDetails(prev => prev.filter(sale => sale.id !== item.saleDetail!.id));
          console.log('✅ Sale details deleted successfully:', result.data);
        } else {
          throw new Error(result.error || 'Failed to delete sale details');
        }
      } catch (err) {
        console.error('❌ Error deleting sale details:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Calculate stats based on combined data (following the inventory sync pattern)
  const totalVehicles = combinedData.length; // All vehicles from inventory
  const vehiclesWithSalesData = combinedData.filter(item => item.hasData).length;
  const vehiclesWithoutSalesData = totalVehicles - vehiclesWithSalesData; // Vehicles that need sales data
  const totalSalesValue = combinedData
    .filter(item => item.saleDetail)
    .reduce((sum, item) => sum + (parseFloat(item.saleDetail!.salePrice) || 0), 0);
  const averageSalePrice = vehiclesWithSalesData > 0 ? totalSalesValue / vehiclesWithSalesData : 0;

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
    }`}>
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-3 rounded-xl ${
              isDarkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-600'
            }`}>
              <Handshake className="h-6 w-6" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Sale Details
              </h1>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                View all vehicles and manage sales data from inventory
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={`rounded-2xl p-6 mb-8 ${
          isDarkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                isDarkMode ? 'text-white' : 'text-slate-500'
              }`} />
              <input
                type="text"
                placeholder="Search by Registration, Stock ID, Make/Model, or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className={`h-4 w-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`} />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as "all" | "has-data" | "no-data")}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Vehicles</option>
                  <option value="has-data">With Sales Data</option>
                  <option value="no-data">No Sales Data</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "saleDate" | "salePrice" | "stockId" | "updatedAt")}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="saleDate">Sale Date</option>
                  <option value="salePrice">Sale Price</option>
                  <option value="stockId">Stock ID</option>
                  <option value="updatedAt">Last Updated</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' 
                      : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    refetch();
                    fetchSaleDetails();
                    fetchRecentInvoices();
                  }}
                  disabled={isLoading || isRefreshing}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-50'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                
                <button
                  onClick={exportToCSV}
                  disabled={filteredAndSortedData.length === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
                      : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {totalVehicles}
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Total Vehicles
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  {vehiclesWithSalesData}
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Vehicles with Sales Data
                </div>
              </div>
              <div className={`text-center ${vehiclesWithoutSalesData > 0 ? 'cursor-help' : ''}`} 
                   title={vehiclesWithoutSalesData > 0 ? `${vehiclesWithoutSalesData} vehicles need sales data entry` : ''}>
                <div className={`text-2xl font-bold ${
                  vehiclesWithoutSalesData > 0 
                    ? (isDarkMode ? 'text-yellow-400' : 'text-yellow-600')
                    : (isDarkMode ? 'text-green-400' : 'text-green-600')
                }`}>
                  {vehiclesWithoutSalesData}
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Pending Sales Data
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                }`}>
                  {formatCurrency(averageSalePrice.toString())}
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Average Sale Price
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`rounded-2xl overflow-hidden ${
          isDarkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200'
        }`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className={`h-8 w-8 animate-spin ${
                isDarkMode ? 'text-white' : 'text-slate-500'
              }`} />
              <span className={`ml-3 text-lg ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Loading vehicles and sale details...
              </span>
            </div>
          ) : inventoryError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  Error loading data
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  {inventoryError}
                </div>
                <button
                  onClick={() => {
                    refetch();
                    fetchSaleDetails();
                    fetchRecentInvoices();
                  }}
                  className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
                    isDarkMode
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Handshake className={`h-12 w-12 mx-auto mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-400'
                }`} />
                <div className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  No records found
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  {searchTerm ? 'Try adjusting your search criteria' : 'No vehicles found'}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${
                    isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                  }`}>
                    <th className={`sticky left-0 z-10 px-3 py-4 text-center text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-slate-300 bg-slate-700/50' : 'text-slate-500 bg-slate-50'
                    }`}>
                      Registration
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Sale Price
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider w-48 ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Customer
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Sale Checks
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Recent Invoice
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Last Updated
                    </th>
                    <th className={`px-6 py-4 text-center text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isDarkMode ? 'divide-slate-700' : 'divide-slate-200'
                }`}>
                  {paginatedData.map((item, index) => {
                    // Check if sale date and sale price are filled
                    const isCompleted = item.saleDetail && 
                      item.saleDetail.saleDate && item.saleDetail.saleDate.trim() !== '' &&
                      item.saleDetail.salePrice && parseFloat(item.saleDetail.salePrice) > 0;
                    
                    return (
                      <tr 
                        key={`${item.vehicle.stockId}-${index}`}
                        className={`transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-slate-700/30' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className={`sticky left-0 z-10 px-3 py-4 whitespace-nowrap ${
                          isDarkMode ? 'text-white bg-slate-800' : 'text-slate-900 bg-white'
                        }`}>
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <div>
                              <LicensePlate 
                                registration={item.vehicle.registration || 'N/A'} 
                                size="md" 
                              />
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}>
                          {item.saleDetail ? (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-green-500" />
                              <div>
                                <div className="text-sm font-medium">{formatCurrency(item.saleDetail.salePrice)}</div>
                                <div className="text-xs">{formatDate(item.saleDetail.saleDate)}</div>
                              </div>
                            </div>
                          ) : (
                            <div className={`text-sm ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              No sales data
                            </div>
                          )}
                        </td>
                        <td className={`px-6 py-4 w-48 ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}>
                          {item.saleDetail ? (
                            <div className="flex items-start space-x-2">
                              <User className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium break-words">{`${item.saleDetail.firstName} ${item.saleDetail.lastName}`}</div>
                                <div className="text-xs break-all text-ellipsis overflow-hidden">{item.saleDetail.emailAddress || 'N/A'}</div>
                              </div>
                            </div>
                          ) : (
                            <div className={`text-sm ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              No customer data
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {item.hasData ? (
                              isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-orange-500" />
                              )
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <div className={`text-sm font-medium ${
                                !item.hasData
                                  ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                                  : isCompleted 
                                    ? (isDarkMode ? 'text-green-400' : 'text-green-600')
                                    : (isDarkMode ? 'text-orange-400' : 'text-orange-600')
                              }`}>
                                {!item.hasData ? 'No Data' : isCompleted ? 'Complete' : 'Pending'}
                              </div>
                              <div className={`text-xs ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                                {item.saleDetail ? [
                                  item.saleDetail.saleDate && item.saleDetail.saleDate.trim() !== '' && 'Date',
                                  item.saleDetail.salePrice && parseFloat(item.saleDetail.salePrice) > 0 && 'Price'
                                ].filter(Boolean).join(', ') || 'Missing required fields' : 'Missing sales data'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}>
                          {recentInvoices[item.vehicle.stockId] ? (
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <div>
                                <button
                                  onClick={() => openInvoice(recentInvoices[item.vehicle.stockId])}
                                  className={`text-sm font-medium hover:underline transition-colors ${
                                    isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                                  }`}
                                >
                                  {recentInvoices[item.vehicle.stockId].invoiceNumber}
                                </button>
                                <div className="text-xs flex items-center">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  {formatDate(recentInvoices[item.vehicle.stockId].createdAt)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={`text-sm ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              No invoice
                            </div>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          {item.saleDetail ? formatDate(item.saleDetail.updatedAt) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {item.hasData ? (
                              <>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className={`p-2 rounded-lg transition-all duration-200 ${
                                    isDarkMode 
                                      ? 'text-blue-400 hover:bg-blue-600/20 hover:text-blue-300' 
                                      : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                                  }`}
                                  title="Edit Sales Details"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  disabled={deletingId === item.saleDetail?.id}
                                  className={`p-2 rounded-lg transition-all duration-200 ${
                                    deletingId === item.saleDetail?.id
                                      ? 'opacity-50 cursor-not-allowed'
                                      : isDarkMode 
                                        ? 'text-red-400 hover:bg-red-600/20 hover:text-red-300' 
                                        : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                                  }`}
                                  title={deletingId === item.saleDetail?.id ? "Deleting..." : "Delete Sales Details"}
                                >
                                  {deletingId === item.saleDetail?.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleAdd(item.vehicle)}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                  isDarkMode 
                                    ? 'text-green-400 hover:bg-green-600/20 hover:text-green-300' 
                                    : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                                }`}
                                title="Add Sales Details"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`mt-6 flex items-center justify-between px-6 py-4 rounded-2xl ${
            isDarkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200'
          }`}>
            <div className={`text-sm ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} vehicles
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-slate-700 text-white hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pageNum === currentPage
                          ? isDarkMode
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-600 text-white'
                          : isDarkMode
                            ? 'bg-slate-700 text-white hover:bg-slate-600'
                            : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-slate-700 text-white hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                Next
              </button>
            </div>
            
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-lg border text-sm ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-slate-300 text-slate-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
            >
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={48}>48 per page</option>
              <option value={96}>96 per page</option>
            </select>
          </div>
        )}
      </main>
      <Footer />

      {/* Add Dialog */}
      {addDialogOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-indigo-50/95 via-purple-50/90 to-violet-50/95 border border-indigo-200/50'
          } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              isDarkMode ? 'border-slate-700/50' : 'border-indigo-200/50'
            }`}>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Add Sale Details
              </h2>
              <button
                onClick={() => {
                  setAddDialogOpen(false);
                  setSelectedVehicle(null);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white' 
                    : 'hover:bg-indigo-100/50 text-slate-500 hover:text-slate-700'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <SaleDetailsForm
                stockData={{
                  metadata: { stockId: selectedVehicle.stockId },
                  vehicle: { registration: selectedVehicle.registration }
                }}
                onSuccess={() => {
                  setAddDialogOpen(false);
                  setSelectedVehicle(null);
                  fetchSaleDetails(); // Refresh the data
                  fetchRecentInvoices(); // Refresh invoices in case they were affected
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editDialogOpen && selectedItem && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-indigo-50/95 via-purple-50/90 to-violet-50/95 border border-indigo-200/50'
          } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              isDarkMode ? 'border-slate-700/50' : 'border-indigo-200/50'
            }`}>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Edit Sale Details
              </h2>
              <button
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedItem(null);
                  setSelectedVehicle(null);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white' 
                    : 'hover:bg-indigo-100/50 text-slate-500 hover:text-slate-700'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <SaleDetailsForm
                stockData={{
                  metadata: { stockId: selectedVehicle.stockId },
                  vehicle: { registration: selectedVehicle.registration }
                }}
                onSuccess={() => {
                  setEditDialogOpen(false);
                  setSelectedItem(null);
                  setSelectedVehicle(null);
                  fetchSaleDetails(); // Refresh the data
                  fetchRecentInvoices(); // Refresh invoices in case they were affected
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
