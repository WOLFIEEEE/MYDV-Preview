'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Car, 
  RefreshCw, 
  Search, 
  Filter,
  PoundSterling,
  Banknote,
  Calculator,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ArrowUpDown,
  Calendar,
  ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import { useTheme } from '@/contexts/ThemeContext'
import Image from 'next/image'

interface VehicleFundData {
  stockId: string
  registration: string | null
  make: string | null
  model: string | null
  derivative: string | null
  year: number | null
  mileage: number | null
  fuelType: string | null
  bodyType: string | null
  forecourtPrice: string | null
  totalPrice: string | null
  costOfPurchase: string | null
  fundingAmount: string | null
  fundingSourceId: string | null
  businessAmount: string | null
  fundSourceName: string | null
  mediaData: {
    images?: Array<{ href: string }>
    video?: { href: string }
    spin?: { href: string }
  } | null
  lifecycleState: string | null
  ownershipCondition: string | null
  createdAt: string
  updatedAt: string
  totalRepaid: number
  hasRepayments: boolean
  remainingDebt: number
  isFullyRepaid: boolean
}

export default function VehicleFundsPage() {
  const { isDarkMode } = useTheme()
  const [vehicles, setVehicles] = useState<VehicleFundData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRepayment, setFilterRepayment] = useState<string>('all')
  const [showOnlyFunded, setShowOnlyFunded] = useState(true) // Default to showing only funded vehicles
  const [sortBy, setSortBy] = useState<'registration' | 'make' | 'fundingAmount' | 'remainingDebt'>('registration')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // Confirmation dialog state
  const [showPaybackDialog, setShowPaybackDialog] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleFundData | null>(null)
  const [isProcessingPayback, setIsProcessingPayback] = useState(false)

  // Fetch vehicle funding data
  const fetchVehicleFunds = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/vehicle-funds')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch vehicle funding data')
      }

      const result = await response.json()
      if (result.success) {
        setVehicles(result.data)
      }
    } catch (error) {
      console.error('Error fetching vehicle funding data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch vehicle funding data')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle opening payback confirmation dialog
  const handlePaybackClick = (vehicle: VehicleFundData) => {
    setSelectedVehicle(vehicle)
    setShowPaybackDialog(true)
  }

  // Handle confirmed repayment
  const handleConfirmedPayback = async () => {
    if (!selectedVehicle || !selectedVehicle.fundingSourceId || !selectedVehicle.remainingDebt) {
      return
    }

    try {
      setIsProcessingPayback(true)
      
      // Create repayment transaction
      const repaymentData = {
        fundSourceId: selectedVehicle.fundingSourceId,
        transactionType: 'repayment',
        amount: selectedVehicle.remainingDebt.toString(),
        description: `Full repayment for vehicle ${selectedVehicle.registration || 'Unknown'} (${selectedVehicle.make || 'Unknown'} ${selectedVehicle.model || 'Model'})`,
        vehicleStockId: selectedVehicle.stockId,
        transactionDate: new Date().toISOString().split('T')[0],
        status: 'completed',
        notes: 'Auto-generated repayment from vehicle funds page'
      }

      const response = await fetch('/api/fund-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(repaymentData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create repayment transaction')
      }

      const result = await response.json()
      if (result.success) {
        // Close dialog first
        setShowPaybackDialog(false)
        setSelectedVehicle(null)
        
        // Show success message
        toast.success(
          `✅ Repayment Successful!\n💰 Amount: £${selectedVehicle.remainingDebt.toFixed(2)}\n🚗 Vehicle: ${selectedVehicle.registration || 'Unknown'}`,
          {
            duration: 5000,
          }
        )
        
        // Refresh data
        await fetchVehicleFunds()
      }
    } catch (error) {
      console.error('Error creating repayment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to record repayment')
    } finally {
      setIsProcessingPayback(false)
    }
  }

  // Handle dialog close
  const handleDialogClose = () => {
    if (!isProcessingPayback) {
      setShowPaybackDialog(false)
      setSelectedVehicle(null)
    }
  }

  useEffect(() => {
    fetchVehicleFunds()
  }, []) // Fetch once on mount

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterRepayment, showOnlyFunded, sortBy, sortOrder])

  // Filter vehicles based on all criteria
  const filteredVehicles = vehicles
    .filter(vehicle => {
      // Funded/All toggle filter - INSTANT CLIENT-SIDE FILTERING
      const matchesFundingFilter = !showOnlyFunded || 
        (vehicle.fundingAmount && parseFloat(vehicle.fundingAmount) > 0)
      
      const searchLower = searchTerm.toLowerCase().trim()
      const matchesSearch = !searchLower || 
        (vehicle.registration && vehicle.registration.toLowerCase().includes(searchLower)) ||
        (vehicle.make && vehicle.make.toLowerCase().includes(searchLower)) ||
        (vehicle.model && vehicle.model.toLowerCase().includes(searchLower)) ||
        (vehicle.derivative && vehicle.derivative.toLowerCase().includes(searchLower))

      const matchesStatus = filterStatus === 'all' || vehicle.lifecycleState === filterStatus

      const matchesRepayment = 
        filterRepayment === 'all' ||
        (filterRepayment === 'repaid' && vehicle.isFullyRepaid) ||
        (filterRepayment === 'pending' && !vehicle.isFullyRepaid && vehicle.fundingAmount) ||
        (filterRepayment === 'no_funding' && !vehicle.fundingAmount)

      return matchesFundingFilter && matchesSearch && matchesStatus && matchesRepayment
    })
    .sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'registration':
          aValue = a.registration || ''
          bValue = b.registration || ''
          break
        case 'make':
          aValue = `${a.make || ''} ${a.model || ''}`.trim()
          bValue = `${b.make || ''} ${b.model || ''}`.trim()
          break
        case 'fundingAmount':
          aValue = parseFloat(a.fundingAmount || '0')
          bValue = parseFloat(b.fundingAmount || '0')
          break
        case 'remainingDebt':
          aValue = a.remainingDebt
          bValue = b.remainingDebt
          break
        default:
          aValue = a.registration || ''
          bValue = b.registration || ''
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

  // Pagination calculations
  const totalItems = filteredVehicles.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex)

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '£0.00'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(num)
  }

  // Calculate your investment: Purchase Price - Funding Amount (zero if no funding)
  const calculateInvestment = (vehicle: VehicleFundData) => {
    const purchasePrice = vehicle.costOfPurchase ? parseFloat(vehicle.costOfPurchase) : 0
    const fundingAmount = vehicle.fundingAmount ? parseFloat(vehicle.fundingAmount) : 0
    
    // If no funding amount, investment is zero (fully funded)
    if (!vehicle.fundingAmount || fundingAmount === 0) {
      return 0
    }
    
    // Investment = Purchase Price - Funding Amount
    return Math.max(0, purchasePrice - fundingAmount)
  }

  const getRepaymentStatusColor = (vehicle: VehicleFundData) => {
    if (!vehicle.fundingAmount) return 'bg-gray-100 text-gray-800'
    if (vehicle.isFullyRepaid) return 'bg-green-100 text-green-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const getRepaymentStatusText = (vehicle: VehicleFundData) => {
    if (!vehicle.fundingAmount) return 'No Funding'
    if (vehicle.isFullyRepaid) return 'Fully Repaid'
    return 'Pending Repayment'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header />
      
      <div className="pt-16">
        {/* Professional Vehicle Funds Header - Matching Funds Management */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700/50">
          <div className="container mx-auto max-w-7xl px-4 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <Car className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      Vehicle Funds Overview
                    </h1>
                    <p className="text-slate-300 text-lg">
                      Track funding and repayments across your vehicle inventory
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span>{vehicles.length} Total Vehicle{vehicles.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    <span>{vehicles.filter(v => v.fundingAmount && parseFloat(v.fundingAmount) > 0).length} With Funding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{vehicles.filter(v => v.isFullyRepaid).length} Fully Repaid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Last updated: Today</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchVehicleFunds}
                  disabled={isLoading}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="w-full px-6 py-8">
          {/* Filters and Search */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Vehicle Type Toggle */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-lg">
                        {showOnlyFunded ? 'Showing Funded Vehicles' : 'Showing All Vehicles'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {showOnlyFunded 
                        ? 'Only displaying vehicles with funding information' 
                        : 'Displaying all vehicles in inventory'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${!showOnlyFunded ? 'text-muted-foreground' : 'text-blue-600'}`}>
                      Funded Only
                    </span>
                    <Switch
                      checked={showOnlyFunded}
                      onCheckedChange={setShowOnlyFunded}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by registration, make, model..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Repayment Status</label>
                  <Select value={filterRepayment} onValueChange={setFilterRepayment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending Repayment</SelectItem>
                      <SelectItem value="repaid">Fully Repaid</SelectItem>
                      <SelectItem value="no_funding">No Funding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="make">Make & Model</SelectItem>
                      <SelectItem value="fundingAmount">Funding Amount</SelectItem>
                      <SelectItem value="remainingDebt">Remaining Debt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Funds Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Vehicle Funding Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading vehicle funding data...</span>
                </div>
              ) : paginatedVehicles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {vehicles.length === 0 
                    ? 'No vehicles with funding information found.'
                    : 'No vehicles match your current filters.'
                  }
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left">
                        <th className="text-left p-4 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Vehicle Image</th>
                        <th className="text-left p-4 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Registration & Details</th>
                        <th className="text-left p-4 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Listing Price</th>
                        <th className="text-left p-4 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Purchase Price</th>
                        <th className="text-left p-4 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Funded Amount</th>
                        <th className="text-left p-4 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Your Investment</th>
                        <th className="text-left p-4 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Repayment Status</th>
                        <th className="text-left p-4 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedVehicles.map((vehicle) => (
                        <tr key={vehicle.stockId} className="border-b hover:bg-muted/20 transition-all duration-200 hover:shadow-sm">
                          {/* Vehicle Image */}
                          <td className="p-4">
                            <div className="relative cursor-pointer">
                              {vehicle.mediaData?.images && vehicle.mediaData.images.length > 0 ? (
                                <div className="relative w-24 h-18 rounded-lg overflow-hidden shadow-sm ring-1 ring-white/20 hover:ring-blue-400/50 transition-all duration-300 hover:scale-105 border">
                                  <Image 
                                    src={vehicle.mediaData.images[0].href} 
                                    alt={`${vehicle.make || 'Vehicle'} ${vehicle.model || ''}`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-24 h-18 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-colors duration-300 border">
                                  <ImageIcon className="w-8 h-8 text-slate-400" />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Registration & Details */}
                          <td className="p-4">
                            <div className="space-y-2">
                              <div className="font-semibold text-lg">{vehicle.registration || 'No Registration'}</div>
                              <div className="text-sm text-muted-foreground">
                                {vehicle.year || 'N/A'} {vehicle.make || 'Unknown'} {vehicle.model || 'Model'}
                              </div>
                              {vehicle.derivative && (
                                <div className="text-xs text-muted-foreground">
                                  {vehicle.derivative}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {vehicle.lifecycleState || 'Unknown'}
                                </Badge>
                                {vehicle.fundSourceName && (
                                  <Badge variant="secondary" className="text-xs">
                                    {vehicle.fundSourceName}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Listing Price */}
                          <td className="p-4">
                            <div className="text-center">
                              {vehicle.forecourtPrice ? (
                                <div className="font-semibold text-lg text-green-600">
                                  {formatCurrency(vehicle.forecourtPrice)}
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-sm">
                                  Not Listed
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Purchase Price */}
                          <td className="p-4">
                            <div className="text-center">
                              {vehicle.costOfPurchase ? (
                                <div className="font-semibold text-lg">
                                  {formatCurrency(vehicle.costOfPurchase)}
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-sm">
                                  N/A
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Funded Amount */}
                          <td className="p-4">
                            <div className="text-center">
                              {vehicle.fundingAmount && parseFloat(vehicle.fundingAmount) > 0 ? (
                                <div className="font-semibold text-lg text-blue-600">
                                  {formatCurrency(vehicle.fundingAmount)}
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-sm">
                                  No Funding
                                </div>
                              )}
                              {vehicle.totalRepaid > 0 && (
                                <div className="text-xs text-green-600 mt-1">
                                  Repaid: {formatCurrency(vehicle.totalRepaid)}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Your Investment (Purchase Price - Funding Amount) */}
                          <td className="p-4">
                            <div className="text-center">
                              {(() => {
                                const investment = calculateInvestment(vehicle)
                                return investment > 0 ? (
                                  <div className="font-semibold text-lg text-purple-600">
                                    {formatCurrency(investment)}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-sm">
                                    £0.00
                                  </div>
                                )
                              })()}
                            </div>
                          </td>

                          {/* Repayment Status */}
                          <td className="p-4">
                            <div className="text-center space-y-2">
                              <Badge className={getRepaymentStatusColor(vehicle)}>
                                {getRepaymentStatusText(vehicle)}
                              </Badge>
                              
                              {vehicle.fundingAmount && !vehicle.isFullyRepaid && (
                                <div className="text-sm font-medium text-red-600">
                                  Remaining: {formatCurrency(vehicle.remainingDebt)}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-4">
                            <div className="text-center">
                              {vehicle.fundingAmount && !vehicle.isFullyRepaid && vehicle.remainingDebt > 0 ? (
                                <Button
                                  size="sm"
                                  onClick={() => handlePaybackClick(vehicle)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Pay Back
                                </Button>
                              ) : vehicle.isFullyRepaid ? (
                                <div className="flex items-center justify-center text-green-600 text-sm">
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Paid
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
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
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
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
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
      
      {/* Payback Confirmation Dialog */}
      <Dialog open={showPaybackDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-green-600" />
              Confirm Repayment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to record a full repayment for this vehicle?
            </DialogDescription>
          </DialogHeader>
          
          {selectedVehicle && (
            <div className="space-y-4 py-4">
              {/* Vehicle Details */}
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{selectedVehicle.registration || 'No Registration'}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.derivative && `- ${selectedVehicle.derivative}`}
                </div>
              </div>
              
              {/* Repayment Details */}
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Repayment Amount:</span>
                  <span className="text-lg font-bold text-green-600">
                    £{selectedVehicle.remainingDebt?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fund Source:</span>
                  <span className="font-medium">{selectedVehicle.fundSourceName || 'Unknown'}</span>
                </div>
              </div>
              
              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  This action will mark the vehicle as fully repaid and cannot be undone.
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDialogClose}
              disabled={isProcessingPayback}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedPayback}
              disabled={isProcessingPayback}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessingPayback ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Repayment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  )
}
