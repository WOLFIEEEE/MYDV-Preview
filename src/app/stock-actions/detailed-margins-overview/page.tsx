'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import { useTheme } from '@/contexts/ThemeContext'
import LicensePlate from '@/components/ui/license-plate'
import { 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  PoundSterling,
  Percent,
  BarChart3,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface DetailedMarginOverviewItem {
  stockId: string
  registration: string
  purchasePrice: number
  salePrice: number
  totalCosts: number
  purchaseDate: Date
  saleDate?: Date
  
  // Calculated values
  grossProfit: number
  netProfit: number
  netMarginPercent: number
  profitCategory: 'LOW' | 'MEDIUM' | 'HIGH'
  daysInStock: number
  profitPerDay: number
  
  // Status
  hasCompleteData: boolean
  missingDataReasons: string[]
}

interface MarginsOverviewData {
  items: DetailedMarginOverviewItem[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  summary: {
    totalVehicles: number
    completeDataItems: number
    pendingDataItems: number
    totalNetProfit: number
    averageNetMargin: number
    averageDaysInStock: number
  }
}

export default function DetailedMarginsOverview() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { isDarkMode } = useTheme()

  // Check user role for access control
  const userRole = user?.publicMetadata?.role as string;
  const userType = user?.publicMetadata?.userType as string;
  const isTeamMember = userType === 'team_member' && userRole !== 'store_owner_admin';

  // Redirect team members (except store_owner_admin) away from detailed margins
  useEffect(() => {
    if (isLoaded && user && isTeamMember) {
      console.log('🚫 Access denied: Team member trying to access detailed margins page');
      router.push('/store-owner/dashboard');
      return;
    }
  }, [isLoaded, user, isTeamMember, router]);
  
  // State
  const [data, setData] = useState<MarginsOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewFilter, setViewFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  

  // Check access permissions
  useEffect(() => {
    if (!isLoaded) return
    
    if (!user) {
      router.push('/sign-in')
      return
    }

    // Check if user is store owner (not team member)
    const userRole = user.publicMetadata?.role as string
    const userType = user.publicMetadata?.userType as string
    const isTeamMember = userType === 'team_member' && userRole !== 'store_owner_admin'
    
    if (isTeamMember) {
      router.push('/store-owner/dashboard')
      return
    }
  }, [user, isLoaded, router])

  // Fetch data with comprehensive error handling
  const fetchData = async (page = 1) => {
    try {
      console.log('🔄 Fetching all margins overview data:', { page })
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '1000' // Fetch all data for client-side filtering
      })
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      try {
        const response = await fetch(`/api/stock-actions/detailed-margins-overview?${params}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`
          
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
            console.error('❌ API Error Response:', errorData)
          } catch (parseError) {
            console.error('❌ Failed to parse error response:', parseError)
          }
          
          throw new Error(errorMessage)
        }
        
        const result = await response.json()
        console.log('✅ API Response received:', { 
          success: result.success, 
          itemCount: result.data?.items?.length,
          totalItems: result.data?.summary?.totalVehicles 
        })
        
        if (result.success && result.data) {
          // Validate the response structure
          if (!result.data.items || !Array.isArray(result.data.items)) {
            throw new Error('Invalid response format: missing or invalid items array')
          }
          
          if (!result.data.pagination || !result.data.summary) {
            console.warn('⚠️ Response missing pagination or summary data')
          }
          
          setData(result.data)
          setCurrentPage(page)
          console.log('✅ Data updated successfully')
        } else {
          throw new Error(result.error || result.message || 'API returned unsuccessful response')
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.')
        }
        
        throw fetchError
      }
    } catch (err) {
      console.error('❌ Error fetching margins overview:', err)
      
      let errorMessage = 'Failed to fetch data'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      // Provide more specific error messages based on common issues
      if (errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
        errorMessage = 'Request timed out. The server may be busy, please try again.'
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = 'Access denied. This feature is only available to store owners.'
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Authentication required. Please sign in and try again.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load - fetch all data once
  useEffect(() => {
    if (user) {
      fetchData(1) // Always fetch complete data initially
    }
  }, [user])


  // Handle filter change with instant client-side filtering
  const handleFilterChange = (filter: 'all' | 'completed' | 'pending') => {
    try {
      console.log('🔄 Filter changed (instant filter):', { filter })
      setViewFilter(filter)
      setCurrentPage(1) // Reset to first page when filtering
    } catch (err) {
      console.error('❌ Error handling filter change:', err)
      setError('Failed to update view. Please try again.')
    }
  }

  // Handle refresh with error handling
  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing data...')
      setRefreshing(true)
      await fetchData(1) // Always fetch from page 1 since we get all data
    } catch (err) {
      console.error('❌ Error during refresh:', err)
      setError('Failed to refresh data. Please try again.')
      setRefreshing(false)
    }
  }

  // Handle page change with client-side pagination
  const handlePageChange = (page: number) => {
    try {
      console.log('📄 Changing to page:', page)
      setCurrentPage(page) // Just update the current page for client-side pagination
    } catch (err) {
      console.error('❌ Error handling page change:', err)
      setError('Failed to change page. Please try again.')
    }
  }


  // Format currency with error handling
  const formatCurrency = (value: number | null | undefined) => {
    try {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue)
    } catch (err) {
      console.warn('⚠️ Error formatting currency:', err, value)
      return '£0'
    }
  }

  // Format percentage with error handling
  const formatPercentage = (value: number | null | undefined) => {
    try {
      const numValue = typeof value === 'number' && !isNaN(value) ? value : 0
      return `${numValue.toFixed(1)}%`
    } catch (err) {
      console.warn('⚠️ Error formatting percentage:', err, value)
      return '0.0%'
    }
  }

  // Get profit category color with fallback
  const getProfitCategoryColor = (category: string | null | undefined) => {
    try {
      switch (category) {
        case 'HIGH': return 'text-green-600 bg-green-100'
        case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
        case 'LOW': return 'text-red-600 bg-red-100'
        default: return 'text-gray-600 bg-gray-100'
      }
    } catch (err) {
      console.warn('⚠️ Error getting profit category color:', err, category)
      return 'text-gray-600 bg-gray-100'
    }
  }

  // Filter and paginate items client-side
  const { filteredItems, paginationInfo } = (() => {
    try {
      if (!data?.items || !Array.isArray(data.items)) {
        return { filteredItems: [], paginationInfo: { totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }
      }

      let items = data.items

      // Apply view filter
      if (viewFilter === 'completed') {
        items = items.filter(item => item && item.hasCompleteData)
      } else if (viewFilter === 'pending') {
        items = items.filter(item => item && !item.hasCompleteData)
      }
      // For 'all', we keep all items but sort them

      // Sort items: completed first, then pending
      items = items.sort((a, b) => {
        // Completed items come first (hasCompleteData = true comes before false)
        if (a.hasCompleteData && !b.hasCompleteData) return -1
        if (!a.hasCompleteData && b.hasCompleteData) return 1
        return 0 // Keep original order for items with same completion status
      })

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        items = items.filter(item => {
          try {
            if (!item) return false
            
            const registration = (item.registration || '').toLowerCase()
            const stockId = (item.stockId || '').toLowerCase()
            
            return registration.includes(query) || stockId.includes(query)
          } catch (filterErr) {
            console.warn('⚠️ Error filtering item:', filterErr, item)
            return false
          }
        })
      }

      // Client-side pagination
      const itemsPerPage = 20
      const totalItems = items.length
      const totalPages = Math.ceil(totalItems / itemsPerPage)
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedItems = items.slice(startIndex, endIndex)

      return {
        filteredItems: paginatedItems,
        paginationInfo: {
          totalItems,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1
        }
      }
    } catch (err) {
      console.error('❌ Error filtering items:', err)
      return { filteredItems: [], paginationInfo: { totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }
    }
  })()

  if (!isLoaded || loading || isTeamMember) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <main className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-12">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className={`ml-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {isTeamMember ? 'Access restricted. Redirecting...' : 'Loading detailed margins overview...'}
            </span>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <main className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-12">
            <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border`}>
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
                  Error Loading Data
                </h3>
              </div>
              <p className={`mt-2 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                {error}
              </p>
              <button
                onClick={() => fetchData()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
        </main>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      <main className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-12">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Detailed Margins Overview
                </h1>
                <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Complete margin analysis for all inventory items
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50`}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Summary Cards - Dynamic based on current filter */}
          {data?.items && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {viewFilter === 'all' ? 'All Items' : viewFilter === 'completed' ? 'Complete Items' : 'Pending Items'}
                    </p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {paginationInfo.totalItems}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Total Complete
                    </p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {data.items.filter(item => item?.hasCompleteData).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Total Pending
                    </p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {data.items.filter(item => item && !item.hasCompleteData).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PoundSterling className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Total Net Profit
                    </p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(
                        data.items
                          .filter(item => item?.hasCompleteData)
                          .reduce((sum, item) => sum + (item?.netProfit || 0), 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className={`rounded-lg p-6 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Filter Toggles */}
              <div className="flex items-center space-x-4">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  View:
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      viewFilter === 'all'
                        ? isDarkMode
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Vehicles
                  </button>
                  <button
                    onClick={() => handleFilterChange('completed')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      viewFilter === 'completed'
                        ? isDarkMode
                          ? 'bg-green-600 text-white'
                          : 'bg-green-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Show Only Completed
                  </button>
                  <button
                    onClick={() => handleFilterChange('pending')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      viewFilter === 'pending'
                        ? isDarkMode
                          ? 'bg-yellow-600 text-white'
                          : 'bg-yellow-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Show Only Pending
                  </button>
                </div>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {viewFilter === 'all' ? 'Showing all vehicles (completed first)' : 
                   viewFilter === 'completed' ? 'Showing vehicles with complete margin calculations' : 
                   'Showing vehicles with incomplete data'}
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Search by registration or stock ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className={`rounded-lg shadow-sm overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Vehicle
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Gross Profit
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Net Profit
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Margin Pre-VAT
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Margin Post-VAT
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Net Margin %
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Days in Stock
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Profit/Day
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredItems.map((item, index) => {
                    // Defensive programming for each item
                    if (!item) {
                      console.warn('⚠️ Null item in filtered items at index:', index)
                      return null
                    }

                    const safeItem = {
                      stockId: item.stockId || `unknown-${index}`,
                      registration: item.registration || 'Unknown',
                      grossProfit: item.grossProfit || 0,
                      netProfit: item.netProfit || 0,
                      netMarginPercent: item.netMarginPercent || 0,
                      profitPerDay: item.profitPerDay || 0,
                      profitCategory: item.profitCategory || 'LOW',
                      daysInStock: item.daysInStock || 0,
                      hasCompleteData: item.hasCompleteData || false,
                      missingDataReasons: item.missingDataReasons || ['Unknown status']
                    }

                    return (
                      <React.Fragment key={safeItem.stockId}>
                        <tr className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex justify-center">
                            <Link href={`/inventory/${safeItem.stockId}`}>
                              <LicensePlate 
                                registration={safeItem.registration} 
                                size="md"
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className={`text-sm font-medium ${
                            safeItem.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(safeItem.grossProfit)}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            before vat and costs
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className={`text-sm font-medium ${
                            safeItem.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(safeItem.netProfit)}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Including all costs and VAT
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className={`text-sm font-medium ${
                            safeItem.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(safeItem.grossProfit)}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Including Costs
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className={`text-sm font-medium ${
                            safeItem.netMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {safeItem.netMarginPercent.toFixed(1)}%
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Net Margin %
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className={`text-sm font-medium ${
                            safeItem.netMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(safeItem.netMarginPercent)}
                          </div>
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getProfitCategoryColor(safeItem.profitCategory)}`}>
                              {safeItem.profitCategory}
                            </span>
                          </div>
                        </td>
                        <td className={`px-4 py-4 whitespace-nowrap text-center text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          <div className="text-sm font-medium">
                            {safeItem.daysInStock}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            days
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className={`text-sm font-medium ${
                            safeItem.profitPerDay >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(safeItem.profitPerDay)}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            per day
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {safeItem.hasCompleteData ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <Link
                            href={`/inventory/${safeItem.stockId}`}
                            className="inline-flex items-center justify-center p-2 rounded-full text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                      </React.Fragment>
                    )
                  }).filter(Boolean)}
                </tbody>
              </table>
            </div>

            {/* Client-side Pagination */}
            {paginationInfo.totalPages > 1 && (
              <div className={`px-6 py-3 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Showing page {currentPage} of {paginationInfo.totalPages} 
                    ({paginationInfo.totalItems} total items)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!paginationInfo.hasPreviousPage}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        paginationInfo.hasPreviousPage
                          ? isDarkMode 
                            ? 'bg-gray-700 text-white hover:bg-gray-600' 
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className={`px-3 py-1 text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      {currentPage}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!paginationInfo.hasNextPage}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        paginationInfo.hasNextPage
                          ? isDarkMode 
                            ? 'bg-gray-700 text-white hover:bg-gray-600' 
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <PiggyBank className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <h3 className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {viewFilter === 'pending' ? 'No pending items found' : 'No items with complete data found'}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {viewFilter === 'pending'
                    ? 'All vehicles have complete margin data.' 
                    : 'Complete purchase info, costs, and sale details to see margin calculations.'
                  }
                </p>
              </div>
            )}
          </div>
      </main>
    </div>
  )
}
