'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, ChevronDown, TrendingUp, FileText, Info } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { FundTransaction, FundSource } from '@/db/schema'

interface FundTransactionDialogProps {
  isOpen: boolean
  onClose: () => void
  transaction?: FundTransaction
  fundSources: FundSource[]
  selectedFundSourceId?: string
  onSubmit: (data: FundTransactionFormData) => Promise<void>
  isLoading?: boolean
}

export interface FundTransactionFormData {
  fundSourceId: string
  transactionType: 'usage' | 'repayment' | 'interest_payment'
  amount: string
  description?: string
  referenceNumber?: string
  vehicleStockId?: string
  transactionDate: string
  dueDate?: string
  status: 'completed' | 'pending' | 'cancelled'
  notes?: string
}

export function FundTransactionDialog({ 
  isOpen,
  onClose,
  transaction, 
  fundSources, 
  selectedFundSourceId,
  onSubmit, 
  isLoading 
}: FundTransactionDialogProps) {
  const { isDarkMode } = useTheme()

  const [formData, setFormData] = useState<FundTransactionFormData>({
    fundSourceId: transaction?.fundSourceId || selectedFundSourceId || '',
    transactionType: (transaction?.transactionType as 'usage' | 'repayment' | 'interest_payment') || 'usage',
    amount: transaction?.amount || '',
    description: transaction?.description || '',
    referenceNumber: transaction?.referenceNumber || '',
    vehicleStockId: transaction?.vehicleStockId || '',
    transactionDate: transaction?.transactionDate 
      ? new Date(transaction.transactionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    dueDate: transaction?.dueDate 
      ? new Date(transaction.dueDate).toISOString().split('T')[0]
      : '',
    status: (transaction?.status as 'completed' | 'pending' | 'cancelled') || 'completed',
    notes: transaction?.notes || '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FundTransactionFormData, string>>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    details: false,
    additional: false,
  })

  // Update form data when transaction changes
  useEffect(() => {
    if (transaction) {
      console.log('🔍 FundTransactionDialog - Received transaction data:', transaction)
      
      const newFormData = {
        fundSourceId: transaction.fundSourceId || '',
        transactionType: (transaction.transactionType as 'usage' | 'repayment' | 'interest_payment') || 'usage',
        amount: transaction.amount || '',
        description: transaction.description || '',
        referenceNumber: transaction.referenceNumber || '',
        vehicleStockId: transaction.vehicleStockId || '',
        transactionDate: transaction.transactionDate 
          ? new Date(transaction.transactionDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        dueDate: transaction.dueDate 
          ? new Date(transaction.dueDate).toISOString().split('T')[0]
          : '',
        status: (transaction.status as 'completed' | 'pending' | 'cancelled') || 'completed',
        notes: transaction.notes || '',
      }
      
      console.log('📝 FundTransactionDialog - Setting form data:', newFormData)
      setFormData(newFormData)
    }
  }, [transaction])

  // Update fundSourceId when selectedFundSourceId changes (for new transactions)
  useEffect(() => {
    if (selectedFundSourceId && !transaction) {
      setFormData(prev => ({ ...prev, fundSourceId: selectedFundSourceId }))
    }
  }, [selectedFundSourceId, transaction])

  // Auto-expand sections when there's relevant data
  useEffect(() => {
    if (transaction) {
      const newExpandedSections: Record<string, boolean> = {
        details: false,
        additional: false,
      }

      // Expand details section if there's reference number, vehicle stock ID, or due date
      if (transaction.referenceNumber || transaction.vehicleStockId || transaction.dueDate) {
        newExpandedSections.details = true
      }

      // Expand additional section if there are notes
      if (transaction.notes) {
        newExpandedSections.additional = true
      }

      setExpandedSections(newExpandedSections)
    } else if (isOpen && !transaction) {
      // Reset sections when opening for new transaction
      setExpandedSections({
        details: false,
        additional: false,
      })
    }
  }, [transaction, isOpen])

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({})
    }
  }, [isOpen])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FundTransactionFormData, string>> = {}

    if (!formData.fundSourceId) {
      newErrors.fundSourceId = 'Fund source is required'
    }

    if (!formData.transactionType) {
      newErrors.transactionType = 'Transaction type is required'
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required'
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number'
    }

    if (!formData.transactionDate) {
      newErrors.transactionDate = 'Transaction date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    await onSubmit(formData)
  }

  const handleInputChange = (field: keyof FundTransactionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'usage':
        return 'Fund Usage'
      case 'repayment':
        return 'Repayment'
      case 'interest_payment':
        return 'Interest Payment'
      default:
        return type
    }
  }

  const getTransactionTypeDescription = (type: string) => {
    switch (type) {
      case 'usage':
        return 'Money withdrawn from the fund for vehicle purchases or other expenses'
      case 'repayment':
        return 'Money paid back to the fund source'
      case 'interest_payment':
        return 'Interest payment made to the fund source'
      default:
        return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`w-full max-w-2xl max-h-[95vh] rounded-2xl shadow-2xl border overflow-hidden ${
        isDarkMode 
          ? 'bg-slate-900/95 border-slate-700/50 backdrop-blur-xl' 
          : 'bg-white/95 border-slate-200/50 backdrop-blur-xl'
      }`}>
        
        {/* Header */}
        <div className={`relative overflow-hidden ${
          isDarkMode ? 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-700' : 'bg-gradient-to-r from-slate-50 via-white to-slate-50'
        }`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-blue-600/20 to-blue-500/20 animate-pulse"></div>
          </div>
          
          <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-slate-200/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {transaction ? 'Edit Transaction' : 'Add Transaction'}
                </h2>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  {transaction ? 'Update transaction details' : 'Record a new fund transaction'}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className={`rounded-full p-2 ${
                isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Transaction Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fundSourceId">
                    Fund Source <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.fundSourceId}
                    onValueChange={(value) => handleInputChange('fundSourceId', value)}
                  >
                    <SelectTrigger className={errors.fundSourceId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select fund source" />
                    </SelectTrigger>
                    <SelectContent>
                      {fundSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.fundName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fundSourceId && (
                    <p className="text-sm text-red-500">{errors.fundSourceId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionType">
                    Transaction Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.transactionType}
                    onValueChange={(value: 'usage' | 'repayment' | 'interest_payment') => 
                      handleInputChange('transactionType', value)
                    }
                  >
                    <SelectTrigger className={errors.transactionType ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usage">Fund Usage</SelectItem>
                      <SelectItem value="repayment">Repayment</SelectItem>
                      <SelectItem value="interest_payment">Interest Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.transactionType && (
                    <p className="text-sm text-red-500">{errors.transactionType}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {getTransactionTypeDescription(formData.transactionType)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    className={errors.amount ? 'border-red-500' : ''}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500">{errors.amount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionDate">
                    Transaction Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="transactionDate"
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => handleInputChange('transactionDate', e.target.value)}
                    className={errors.transactionDate ? 'border-red-500' : ''}
                  />
                  {errors.transactionDate && (
                    <p className="text-sm text-red-500">{errors.transactionDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'completed' | 'pending' | 'cancelled') => 
                      handleInputChange('status', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter transaction description"
                  rows={2}
                />
              </div>
            </div>

            {/* Transaction Details - Expandable */}
            <div className={`border rounded-lg ${
              isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <button
                type="button"
                onClick={() => toggleSection('details')}
                className={`w-full flex items-center justify-between p-4 text-left hover:bg-opacity-50 transition-colors ${
                  isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Reference Details
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      Optional reference information
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${
                  expandedSections.details ? 'rotate-180' : ''
                } ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
              </button>

              {expandedSections.details && (
                <div className={`px-4 pb-4 border-t ${
                  isDarkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <div className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="referenceNumber">Reference Number</Label>
                        <Input
                          id="referenceNumber"
                          value={formData.referenceNumber}
                          onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                          placeholder="Enter reference number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => handleInputChange('dueDate', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          For repayments and interest payments
                        </p>
                      </div>
                    </div>

                    {formData.transactionType === 'usage' && (
                      <div className="space-y-2">
                        <Label htmlFor="vehicleStockId">
                          Vehicle Stock ID
                          {formData.vehicleStockId && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
                              🚗 Linked
                            </span>
                          )}
                        </Label>
                        <Input
                          id="vehicleStockId"
                          value={formData.vehicleStockId}
                          onChange={(e) => handleInputChange('vehicleStockId', e.target.value)}
                          placeholder="Enter vehicle stock ID if applicable"
                          className={formData.vehicleStockId ? 'border-blue-300 bg-blue-50/50' : ''}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.vehicleStockId 
                            ? 'This transaction is linked to a vehicle purchase'
                            : 'Link this transaction to a specific vehicle purchase'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Information - Expandable */}
            <div className={`border rounded-lg ${
              isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <button
                type="button"
                onClick={() => toggleSection('additional')}
                className={`w-full flex items-center justify-between p-4 text-left hover:bg-opacity-50 transition-colors ${
                  isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                  }`}>
                    <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Additional Notes
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      Optional notes and comments
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${
                  expandedSections.additional ? 'rotate-180' : ''
                } ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
              </button>

              {expandedSections.additional && (
                <div className={`px-4 pb-4 border-t ${
                  isDarkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <div className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Enter additional notes"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Saving...' : (transaction ? 'Update Transaction' : 'Create Transaction')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
