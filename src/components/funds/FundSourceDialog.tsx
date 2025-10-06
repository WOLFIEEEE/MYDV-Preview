'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, ChevronDown, Banknote, User, Info } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { FundSource } from '@/db/schema'

interface FundSourceDialogProps {
  isOpen: boolean
  onClose: () => void
  fundSource?: FundSource
  onSubmit: (data: FundSourceFormData) => Promise<void>
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

export function FundSourceDialog({ 
  isOpen, 
  onClose, 
  fundSource, 
  onSubmit, 
  isLoading 
}: FundSourceDialogProps) {
  const { isDarkMode } = useTheme()

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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contact: false,
    additional: false,
  })

  // Update form data when fundSource prop changes
  useEffect(() => {
    if (fundSource) {
      setFormData({
        fundName: fundSource.fundName || '',
        amount: fundSource.amount || '',
        address: fundSource.address || '',
        contactPersonName: fundSource.contactPersonName || '',
        mobileNumber: fundSource.mobileNumber || '',
        contactEmail: fundSource.contactEmail || '',
        description: fundSource.description || '',
        interestRate: fundSource.interestRate || '',
        repaymentTerms: fundSource.repaymentTerms || '',
        status: (fundSource.status as 'active' | 'inactive' | 'closed') || 'active',
      })
    } else {
      // Reset form when no fundSource (creating new)
      setFormData({
        fundName: '',
        amount: '',
        address: '',
        contactPersonName: '',
        mobileNumber: '',
        contactEmail: '',
        description: '',
        interestRate: '',
        repaymentTerms: '',
        status: 'active',
      })
    }
    // Clear any previous errors
    setErrors({})
  }, [fundSource])

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({})
      setExpandedSections({
        contact: false,
        additional: false,
      })
    }
  }, [isOpen])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

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
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-emerald-600/20 to-emerald-500/20 animate-pulse"></div>
          </div>
          
          <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-slate-200/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {fundSource ? 'Edit Fund Source' : 'Add Fund Source'}
                </h2>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  {fundSource ? 'Update funding source details' : 'Add a new financing source'}
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
            {/* Required Fields */}
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Basic Information
              </h3>
              
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

            {/* Contact Information - Expandable */}
            <div className={`border rounded-lg ${
              isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <button
                type="button"
                onClick={() => toggleSection('contact')}
                className={`w-full flex items-center justify-between p-4 text-left hover:bg-opacity-50 transition-colors ${
                  isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}>
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Contact Information
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      Optional contact details
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${
                  expandedSections.contact ? 'rotate-180' : ''
                } ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
              </button>

              {expandedSections.contact && (
                <div className={`px-4 pb-4 border-t ${
                  isDarkMode ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <div className="pt-4 space-y-4">
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
                      Additional Information
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      Optional details and terms
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
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Enter description"
                        rows={3}
                      />
                    </div>

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
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading ? 'Saving...' : (fundSource ? 'Update Fund Source' : 'Create Fund Source')}
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
