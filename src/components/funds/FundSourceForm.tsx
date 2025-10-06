'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FundSource } from '@/db/schema'

interface FundSourceFormProps {
  fundSource?: FundSource
  onSubmit: (data: FundSourceFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export interface FundSourceFormData {
  fundName: string
  amount: string
  address?: string
  contactPersonName?: string
  mobileNumber?: string
  contactEmail?: string
  description?: string
  interestRate?: string
  repaymentTerms?: string
  status: 'active' | 'inactive' | 'closed'
}

export function FundSourceForm({ fundSource, onSubmit, onCancel, isLoading }: FundSourceFormProps) {
  const [formData, setFormData] = useState<FundSourceFormData>({
    fundName: fundSource?.fundName || '',
    amount: fundSource?.amount || '',
    address: fundSource?.address || '',
    contactPersonName: fundSource?.contactPersonName || '',
    mobileNumber: fundSource?.mobileNumber || '',
    contactEmail: fundSource?.contactEmail || '',
    description: fundSource?.description || '',
    interestRate: fundSource?.interestRate || '',
    repaymentTerms: fundSource?.repaymentTerms || '',
    status: (fundSource?.status as 'active' | 'inactive' | 'closed') || 'active',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FundSourceFormData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FundSourceFormData, string>> = {}

    if (!formData.fundName.trim()) {
      newErrors.fundName = 'Fund name is required'
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required'
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number'
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format'
    }

    if (formData.interestRate && (isNaN(Number(formData.interestRate)) || Number(formData.interestRate) < 0)) {
      newErrors.interestRate = 'Interest rate must be a non-negative number'
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

  const handleInputChange = (field: keyof FundSourceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {fundSource ? 'Edit Fund Source' : 'Add New Fund Source'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundName">
                Fund Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fundName"
                value={formData.fundName}
                onChange={(e) => handleInputChange('fundName', e.target.value)}
                placeholder="Enter fund name"
                className={errors.fundName ? 'border-red-500' : ''}
              />
              {errors.fundName && (
                <p className="text-sm text-red-500">{errors.fundName}</p>
              )}
            </div>

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
          </div>

          {/* Optional Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPersonName">Contact Person Name</Label>
                <Input
                  id="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input
                  id="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                  placeholder="Enter mobile number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="Enter contact email"
                className={errors.contactEmail ? 'border-red-500' : ''}
              />
              {errors.contactEmail && (
                <p className="text-sm text-red-500">{errors.contactEmail}</p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Information (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange('interestRate', e.target.value)}
                  placeholder="0.00"
                  className={errors.interestRate ? 'border-red-500' : ''}
                />
                {errors.interestRate && (
                  <p className="text-sm text-red-500">{errors.interestRate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive' | 'closed') => 
                    handleInputChange('status', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repaymentTerms">Repayment Terms</Label>
              <Textarea
                id="repaymentTerms"
                value={formData.repaymentTerms}
                onChange={(e) => handleInputChange('repaymentTerms', e.target.value)}
                placeholder="Enter repayment terms"
                rows={3}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : (fundSource ? 'Update Fund Source' : 'Create Fund Source')}
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
