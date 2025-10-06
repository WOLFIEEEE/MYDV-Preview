'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FundTransaction, FundSource } from '@/db/schema'

interface FundTransactionFormProps {
  transaction?: FundTransaction
  fundSources: FundSource[]
  selectedFundSourceId?: string
  onSubmit: (data: FundTransactionFormData) => Promise<void>
  onCancel: () => void
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

export function FundTransactionForm({ 
  transaction, 
  fundSources, 
  selectedFundSourceId,
  onSubmit, 
  onCancel, 
  isLoading 
}: FundTransactionFormProps) {
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

  // Update fundSourceId when selectedFundSourceId changes
  useEffect(() => {
    if (selectedFundSourceId && !transaction) {
      setFormData(prev => ({ ...prev, fundSourceId: selectedFundSourceId }))
    }
  }, [selectedFundSourceId, transaction])

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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {transaction ? 'Edit Transaction' : 'Add New Transaction'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fund Source and Transaction Type */}
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

          {/* Amount and Dates */}
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
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
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

          {/* Reference and Status */}
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

          {/* Vehicle Stock ID (for usage transactions) */}
          {formData.transactionType === 'usage' && (
            <div className="space-y-2">
              <Label htmlFor="vehicleStockId">Vehicle Stock ID (Optional)</Label>
              <Input
                id="vehicleStockId"
                value={formData.vehicleStockId}
                onChange={(e) => handleInputChange('vehicleStockId', e.target.value)}
                placeholder="Enter vehicle stock ID if applicable"
              />
              <p className="text-xs text-muted-foreground">
                Link this transaction to a specific vehicle purchase
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter transaction description"
              rows={3}
            />
          </div>

          {/* Notes */}
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

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : (transaction ? 'Update Transaction' : 'Create Transaction')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
