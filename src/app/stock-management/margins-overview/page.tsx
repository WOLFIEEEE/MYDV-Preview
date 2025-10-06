"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  Download, 
  Filter, 
  Search, 
  Calendar,
  TrendingUp,
  TrendingDown,
  PoundSterling,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { 
  formatCurrency, 
  formatPercentage, 
  type DetailedMarginCalculations 
} from '@/lib/marginCalculations';

interface MarginOverviewData extends DetailedMarginCalculations {
  // Additional fields for overview display
  make?: string;
  model?: string;
  derivative?: string;
  lifecycleState?: string;
}

interface FilterState {
  searchTerm: string;
  purchaseDateFrom: string;
  purchaseDateTo: string;
  saleDateFrom: string;
  saleDateTo: string;
  profitCategory: string;
  lifecycleState: string;
}

export default function MarginsOverviewPage() {
  const { user, isLoaded } = useUser();
  const { isDarkMode } = useTheme();
  
  const [marginsData, setMarginsData] = useState<MarginOverviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    purchaseDateFrom: '',
    purchaseDateTo: '',
    saleDateFrom: '',
    saleDateTo: '',
    profitCategory: '',
    lifecycleState: ''
  });

  // Check if user is dealer admin
  const isDealerAdmin = user?.publicMetadata?.role === 'dealer' || user?.publicMetadata?.userType === 'dealer';

  // Load margins data
  useEffect(() => {
    if (!isLoaded || !isDealerAdmin) return;
    
    loadMarginsData();
  }, [isLoaded, isDealerAdmin]);

  const loadMarginsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stock-management/margins-overview');
      const result = await response.json();
      
      if (result.success) {
        setMarginsData(result.data || []);
      } else {
        setError(result.error || 'Failed to load margins data');
      }
    } catch (error) {
      console.error('❌ Error loading margins overview:', error);
      setError('Failed to load margins data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search logic
  const filteredData = useMemo(() => {
    return marginsData.filter(item => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          item.registration?.toLowerCase().includes(searchLower) ||
          item.stockId?.toLowerCase().includes(searchLower) ||
          item.make?.toLowerCase().includes(searchLower) ||
          item.model?.toLowerCase().includes(searchLower) ||
          item.derivative?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Date filters
      if (filters.purchaseDateFrom) {
        const purchaseDate = new Date(item.purchaseDate);
        const filterDate = new Date(filters.purchaseDateFrom);
        if (purchaseDate < filterDate) return false;
      }

      if (filters.purchaseDateTo) {
        const purchaseDate = new Date(item.purchaseDate);
        const filterDate = new Date(filters.purchaseDateTo);
        if (purchaseDate > filterDate) return false;
      }

      if (filters.saleDateFrom && item.saleDate) {
        const saleDate = new Date(item.saleDate);
        const filterDate = new Date(filters.saleDateFrom);
        if (saleDate < filterDate) return false;
      }

      if (filters.saleDateTo && item.saleDate) {
        const saleDate = new Date(item.saleDate);
        const filterDate = new Date(filters.saleDateTo);
        if (saleDate > filterDate) return false;
      }

      // Profit category filter
      if (filters.profitCategory && item.profitCategory !== filters.profitCategory) {
        return false;
      }

      // Lifecycle state filter
      if (filters.lifecycleState && item.lifecycleState !== filters.lifecycleState) {
        return false;
      }

      return true;
    });
  }, [marginsData, filters]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalVehicles: 0,
        totalGrossProfit: 0,
        totalNetProfit: 0,
        averageMargin: 0,
        totalVatToPay: 0
      };
    }

    const totalGrossProfit = filteredData.reduce((sum, item) => sum + item.grossProfit, 0);
    const totalNetProfit = filteredData.reduce((sum, item) => sum + item.netProfit, 0);
    const totalVatToPay = filteredData.reduce((sum, item) => sum + item.vatToPay, 0);
    const averageMargin = filteredData.reduce((sum, item) => sum + item.netMarginPercent, 0) / filteredData.length;

    return {
      totalVehicles: filteredData.length,
      totalGrossProfit,
      totalNetProfit,
      averageMargin,
      totalVatToPay
    };
  }, [filteredData]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    // Create CSV content
    const headers = [
      'Registration',
      'Stock ID',
      'Make',
      'Model',
      'Purchase Price',
      'Sale Price',
      'Purchase Date',
      'Sale Date',
      'Purchase Month',
      'Purchase Quarter',
      'Sale Month',
      'Sale Quarter',
      'Gross Profit',
      'Net Profit',
      'VAT to Pay',
      'Gross Margin %',
      'Net Margin %',
      'Profit Category',
      'Days in Stock',
      'Profit per Day'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.registration || '',
        item.stockId || '',
        item.make || '',
        item.model || '',
        item.purchasePrice,
        item.salePrice,
        item.purchaseDate.toISOString().split('T')[0],
        item.saleDate?.toISOString().split('T')[0] || '',
        item.purchaseMonth || '',
        item.purchaseQuarter || '',
        item.saleMonth || '',
        item.saleQuarter || '',
        item.grossProfit,
        item.netProfit,
        item.vatToPay,
        item.grossMarginPercent.toFixed(2),
        item.netMarginPercent.toFixed(2),
        item.profitCategory,
        item.daysInStock,
        item.profitPerDay
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `margins-overview-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isDealerAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
          <p className="text-slate-600">This page is only accessible to dealer administrators.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Detailed Margins Overview
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Comprehensive margin analysis for all vehicles
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={loadMarginsData}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            disabled={filteredData.length === 0}
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Total Vehicles
              </p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {summaryStats.totalVehicles}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Total Gross Profit
              </p>
              <p className={`text-2xl font-bold ${
                summaryStats.totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summaryStats.totalGrossProfit)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Total Net Profit
              </p>
              <p className={`text-2xl font-bold ${
                summaryStats.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summaryStats.totalNetProfit)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-teal-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Average Margin
              </p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatPercentage(summaryStats.averageMargin)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Total VAT to Pay
              </p>
              <p className={`text-2xl font-bold ${
                summaryStats.totalVatToPay >= 0 ? isDarkMode ? 'text-white' : 'text-slate-900' : 'text-red-600'
              }`}>
                {formatCurrency(summaryStats.totalVatToPay)}
              </p>
            </div>
            <PoundSterling className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 mr-2 text-blue-500" />
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Filters
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Registration, Stock ID, Make..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
              Purchase Date From
            </label>
            <Input
              type="date"
              value={filters.purchaseDateFrom}
              onChange={(e) => handleFilterChange('purchaseDateFrom', e.target.value)}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
              Purchase Date To
            </label>
            <Input
              type="date"
              value={filters.purchaseDateTo}
              onChange={(e) => handleFilterChange('purchaseDateTo', e.target.value)}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
              Profit Category
            </label>
            <select
              value={filters.profitCategory}
              onChange={(e) => handleFilterChange('profitCategory', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white' 
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="">All Categories</option>
              <option value="HIGH">HIGH (20%+)</option>
              <option value="MEDIUM">MEDIUM (10-20%)</option>
              <option value="LOW">LOW (0-10%)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Vehicle Margins ({filteredData.length} vehicles)
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3">Loading margins data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="ml-3 text-red-600">{error}</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12">
            <p className={`text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              No margin data available
            </p>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Ensure vehicles have purchase info, costs, and sale details filled
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Vehicle
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Purchase
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Sale
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Gross Profit
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Net Profit
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    VAT to Pay
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Category
                  </th>
                  <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Days
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr 
                    key={item.stockId} 
                    className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} hover:bg-slate-50 dark:hover:bg-slate-800/50`}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {item.registration}
                        </div>
                        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.make} {item.model}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          {item.stockId}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(item.purchasePrice)}
                        </div>
                        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.purchaseMonth}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(item.salePrice)}
                        </div>
                        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.saleMonth || 'Not sold'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`font-medium ${
                        item.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(item.grossProfit)}
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatPercentage(item.grossMarginPercent)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`font-medium ${
                        item.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(item.netProfit)}
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatPercentage(item.netMarginPercent)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`font-medium ${
                        item.vatToPay >= 0 
                          ? isDarkMode ? 'text-white' : 'text-slate-900'
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(item.vatToPay)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.profitCategory === 'HIGH' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : item.profitCategory === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {item.profitCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {item.daysInStock}
                        </div>
                        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {formatCurrency(item.profitPerDay)}/day
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
