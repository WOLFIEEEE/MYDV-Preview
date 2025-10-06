"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import LicensePlate from "@/components/ui/license-plate";
import EditInventoryForm from "@/components/stock/tabs/actions/EditInventoryForm";
import { useInventoryDataQuery, type InventoryItem } from "@/hooks/useInventoryDataQuery";
import { createOrGetDealer } from "@/lib/database";
import { Package, Calendar, PoundSterling, Search, Filter, Download, RefreshCw, Edit, Trash2, X, Plus } from "lucide-react";

interface InventoryDetail {
  id: number;
  stockId: string;
  registration: string;
  dateOfPurchase: string;
  costOfPurchase: string;
  fundingAmount: string;
  businessAmount: string;
  fundingSourceName: string;
  createdAt: string;
  updatedAt: string;
}

export default function PurchaseInfoPage() {
  const { user } = useUser();
  const { isDarkMode } = useTheme();
  const [dealerId, setDealerId] = useState<string>('');
  const [inventoryDetails, setInventoryDetails] = useState<InventoryDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "has-data" | "no-data">("all");
  const [sortBy, setSortBy] = useState<"dateOfPurchase" | "costOfPurchase" | "stockId">("dateOfPurchase");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<InventoryItem | null>(null);
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

  // Get dealer ID (same pattern as checklist page)
  useEffect(() => {
    const getDealerId = async () => {
      if (!user?.id || dealerId) return;
      
      try {
        const userEmail = user.emailAddresses[0]?.emailAddress || '';
        
        const teamMemberResponse = await fetch('/api/check-team-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
        
        if (teamMemberResponse.ok) {
          const teamMemberResult = await teamMemberResponse.json();
          
          if (teamMemberResult.isTeamMember && teamMemberResult.storeOwnerId) {
            setDealerId(teamMemberResult.storeOwnerId);
          } else {
            const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail || 'Unknown User';
            const dealer = await createOrGetDealer(user.id, userName, userEmail);
            setDealerId(dealer.id);
          }
        } else {
          const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail || 'Unknown User';
          const dealer = await createOrGetDealer(user.id, userName, userEmail);
          setDealerId(dealer.id);
        }
      } catch (error) {
        console.error('❌ Error getting dealer ID:', error);
      }
    };

    if (user?.id && !dealerId) {
      getDealerId();
    }
  }, [user?.id, user?.emailAddresses, user?.firstName, user?.fullName, user?.lastName, dealerId]);

  // Fetch purchase info data for existing vehicles
  const fetchInventoryDetails = useCallback(async () => {
    if (!dealerId) return;
    
    try {
      const response = await fetch('/api/stock-actions/inventory-details/all');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setInventoryDetails(result.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching inventory details:', err);
    }
  }, [dealerId]);

  useEffect(() => {
    fetchInventoryDetails();
  }, [fetchInventoryDetails]);

  // Merge inventory data with purchase info data
  const mergedVehicleData = (inventoryData || []).map(vehicle => {
    const purchaseData = inventoryDetails.find(detail => detail.stockId === vehicle.stockId);
    
    return {
      ...vehicle,
      purchaseData,
      hasPurchaseData: !!purchaseData,
      dateOfPurchase: purchaseData?.dateOfPurchase || '',
      costOfPurchase: purchaseData?.costOfPurchase || '0',
      fundingAmount: purchaseData?.fundingAmount || '0',
      businessAmount: purchaseData?.businessAmount || '0',
      fundingSourceName: purchaseData?.fundingSourceName || '',
      lastUpdated: purchaseData?.updatedAt || null,
    };
  });

  // Filter and sort merged data
  const filteredAndSortedData = mergedVehicleData
    .filter(item => {
      const matchesSearch = item.stockId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.registration.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterBy === "all" || 
        (filterBy === "has-data" && item.hasPurchaseData) ||
        (filterBy === "no-data" && !item.hasPurchaseData);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortBy === 'costOfPurchase') {
        aValue = parseFloat(a.costOfPurchase) || 0;
        bValue = parseFloat(b.costOfPurchase) || 0;
      } else if (sortBy === 'dateOfPurchase') {
        aValue = a.dateOfPurchase ? new Date(a.dateOfPurchase).getTime() : 0;
        bValue = b.dateOfPurchase ? new Date(b.dateOfPurchase).getTime() : 0;
      } else {
        aValue = a.stockId;
        bValue = b.stockId;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Calculate pagination
  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBy, sortBy, sortOrder]);

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '£0.00' : `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.trim() === '') {
      return 'Not set';
    }
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEdit = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setEditDialogOpen(true);
  };

  const handleAdd = (vehicle: InventoryItem) => {
    setSelectedVehicle(vehicle);
    setAddDialogOpen(true);
  };

  const handleDelete = async (vehicle: any) => {
    if (!vehicle.purchaseData) return;
    
    if (window.confirm(`Are you sure you want to delete the purchase info for ${vehicle.registration}?`)) {
      try {
        setDeletingId(vehicle.purchaseData.id);

        const response = await fetch(`/api/stock-actions/inventory-details/${vehicle.purchaseData.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete purchase info');
        }

        const result = await response.json();
        
        if (result.success) {
          setInventoryDetails(prev => prev.filter(detail => detail.id !== vehicle.purchaseData.id));
          refetch();
          console.log('✅ Purchase info deleted successfully');
        } else {
          throw new Error(result.error || 'Failed to delete purchase info');
        }
      } catch (err) {
        console.error('❌ Error deleting purchase info:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Stock ID', 'Registration', 'Purchase Date', 'Purchase Cost', 'Funding Amount', 'Business Amount', 'Funding Source', 'Last Updated'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedData.map(item => [
        item.stockId,
        item.registration,
        formatDate(item.dateOfPurchase),
        item.costOfPurchase,
        item.fundingAmount || '0.00',
        item.businessAmount || '0.00',
        item.fundingSourceName || 'N/A',
        item.lastUpdated ? formatDate(item.lastUpdated) : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-info-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };


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
              isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}>
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Purchase Information
              </h1>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                View all vehicle purchase details and inventory information
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
                placeholder="Search by Stock ID or Registration..."
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
                  <option value="has-data">Has Purchase Info</option>
                  <option value="no-data">No Purchase Info</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "dateOfPurchase" | "costOfPurchase" | "stockId")}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="dateOfPurchase">Purchase Date</option>
                  <option value="costOfPurchase">Purchase Cost</option>
                  <option value="stockId">Stock ID</option>
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
                    fetchInventoryDetails();
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
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
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
                  {filteredAndSortedData.length}
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
                  {filteredAndSortedData.filter(v => v.hasPurchaseData).length}
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  With Purchase Info
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                  {formatCurrency(
                    filteredAndSortedData
                      .filter(v => v.hasPurchaseData)
                      .reduce((sum, item) => sum + (parseFloat(item.costOfPurchase) || 0), 0)
                      .toString()
                  )}
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Total Investment
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  isDarkMode ? 'text-orange-400' : 'text-orange-600'
                }`}>
                  {(() => {
                    const vehiclesWithData = filteredAndSortedData.filter(v => v.hasPurchaseData);
                    return formatCurrency(
                      vehiclesWithData.length > 0 
                        ? (vehiclesWithData.reduce((sum, item) => sum + (parseFloat(item.costOfPurchase) || 0), 0) / vehiclesWithData.length).toString()
                        : '0'
                    );
                  })()}
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Average Cost
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
                Loading purchase information...
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
                    fetchInventoryDetails();
                  }}
                  className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
                    isDarkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className={`h-12 w-12 mx-auto mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-400'
                }`} />
                <div className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  No purchase information found
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  {searchTerm ? 'Try adjusting your search criteria' : 'No purchase data has been entered yet'}
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
                      Purchase Date
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Purchase Cost
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Funding 
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                       Dealership Funding
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      Funding Source
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
                  {paginatedData.map((vehicle) => (
                    <tr 
                      key={vehicle.stockId}
                      className={`transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-slate-700/30' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`sticky left-0 z-10 px-3 py-4 whitespace-nowrap ${
                        isDarkMode ? 'text-white bg-slate-800' : 'text-slate-900 bg-white'
                      }`}>
                        <div className="flex items-center justify-center">
                          <LicensePlate 
                            registration={vehicle.registration || 'N/A'} 
                            size="md" 
                          />
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-green-500" />
                          <span>{formatDate(vehicle.dateOfPurchase)}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <PoundSterling className="h-4 w-4" />
                          <span>{formatCurrency(vehicle.costOfPurchase)}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <PoundSterling className="h-4 w-4" />
                          <span>{formatCurrency(vehicle.fundingAmount || '0')}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isDarkMode ? 'text-purple-400' : 'text-purple-600'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <PoundSterling className="h-4 w-4" />
                          <span>{formatCurrency(vehicle.businessAmount || '0')}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            vehicle.fundingSourceName ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span>{vehicle.fundingSourceName || 'No Funding Source'}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`}>
                        {vehicle.lastUpdated ? formatDate(vehicle.lastUpdated) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {vehicle.hasPurchaseData ? (
                            <>
                              <button
                                onClick={() => handleEdit(vehicle)}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                  isDarkMode 
                                    ? 'text-blue-400 hover:bg-blue-600/20 hover:text-blue-300' 
                                    : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                                title="Edit Purchase Info"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(vehicle)}
                                disabled={deletingId === vehicle.purchaseData?.id}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                  deletingId === vehicle.purchaseData?.id
                                    ? 'opacity-50 cursor-not-allowed'
                                    : isDarkMode 
                                      ? 'text-red-400 hover:bg-red-600/20 hover:text-red-300' 
                                      : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                                }`}
                                title={deletingId === vehicle.purchaseData?.id ? "Deleting..." : "Delete Purchase Info"}
                              >
                                {deletingId === vehicle.purchaseData?.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleAdd(vehicle)}
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                isDarkMode 
                                  ? 'text-green-400 hover:bg-green-600/20 hover:text-green-300' 
                                  : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                              }`}
                              title="Add Purchase Info"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border text-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                  }`}
                >
                  First
                </button>
                
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded border text-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                  }`}
                >
                  Previous
                </button>

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
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-8 h-8 rounded border text-sm transition-all duration-300 ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                            : isDarkMode 
                              ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400' 
                              : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border text-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                  }`}
                >
                  Next
                </button>
                
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded border text-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-slate-500 bg-slate-700/30 text-slate-200 hover:bg-slate-600/50 hover:text-white hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                  }`}
                >
                  Last
                </button>
              </div>

              <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="mt-4 text-center">
          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
            Showing {paginatedData.length} of {totalItems} filtered vehicles ({inventoryData?.length || 0} total vehicles)
          </p>
        </div>
      </main>
      <Footer />

      {/* Edit Dialog */}
      {editDialogOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-emerald-50/95 via-teal-50/90 to-cyan-50/95 border border-teal-200/50'
          } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              isDarkMode ? 'border-slate-700/50' : 'border-teal-200/50'
            }`}>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Edit Purchase Info
              </h2>
              <button
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedVehicle(null);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white' 
                    : 'hover:bg-teal-100/50 text-slate-500 hover:text-slate-700'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <EditInventoryForm
                stockData={{
                  metadata: { stockId: selectedVehicle.stockId },
                  vehicle: { registration: selectedVehicle.registration }
                }}
                onSuccess={() => {
                  setEditDialogOpen(false);
                  setSelectedVehicle(null);
                  fetchInventoryDetails(); // Refresh the data
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      {addDialogOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-green-50/95 via-emerald-50/90 to-teal-50/95 border border-green-200/50'
          } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              isDarkMode ? 'border-slate-700/50' : 'border-green-200/50'
            }`}>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Add Purchase Information - {selectedVehicle.registration}
              </h2>
              <button
                onClick={() => {
                  setAddDialogOpen(false);
                  setSelectedVehicle(null);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white' 
                    : 'hover:bg-green-100/50 text-slate-500 hover:text-slate-700'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <EditInventoryForm
                stockData={{
                  metadata: { stockId: selectedVehicle.stockId },
                  vehicle: { registration: selectedVehicle.registration }
                }}
                onSuccess={() => {
                  setAddDialogOpen(false);
                  setSelectedVehicle(null);
                  fetchInventoryDetails();
                  refetch();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
