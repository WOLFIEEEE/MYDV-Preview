import React, { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function VehicleSaleInformation({ formData, updateFormData, errors }: Props) {
  const { isDarkMode } = useTheme()
  
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  // Note: Additional vehicle information fields are now hidden from all users

  // Calculate month and quarter when date of sale changes
  useEffect(() => {
    if (formData.dateOfSale) {
      const date = new Date(formData.dateOfSale)
      const month = date.toLocaleString('default', { month: 'long' })
      const quarter = Math.ceil((date.getMonth() + 1) / 3)
      
      // Only update if the values have actually changed
      if (formData.monthOfSale !== month || formData.quarterOfSale !== quarter) {
        updateFormData({
          monthOfSale: month,
          quarterOfSale: quarter
        })
      }
    }
  }, [formData.dateOfSale, formData.monthOfSale, formData.quarterOfSale, updateFormData])

  // Calculate days in stock when both dates are available
  useEffect(() => {
    if (formData.dateOfSale && formData.dateOfPurchase) {
      const saleDate = new Date(formData.dateOfSale)
      const purchaseDate = new Date(formData.dateOfPurchase)
      const diffTime = Math.abs(saleDate.getTime() - purchaseDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      // Only update if the calculated days is different from current value
      if (formData.daysInStock !== diffDays) {
        updateFormData({ daysInStock: diffDays })
      }
    }
  }, [formData.dateOfSale, formData.dateOfPurchase, formData.daysInStock, updateFormData])

  // Handle sale type changes - set default invoiceTo for non-Retail sales
  useEffect(() => {
    if (formData.saleType && formData.saleType !== 'Retail') {
      // For Trade and Commercial sales, default to Customer
      if (formData.invoiceTo !== 'Customer') {
        updateFormData({ invoiceTo: 'Customer' })
      }
    } else if (formData.saleType === 'Retail') {
      // For Retail sales, clear invoiceTo if it was auto-set
      // Let user choose between Customer and Finance Company
    }
  }, [formData.saleType, formData.invoiceTo, updateFormData])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sale Type - input_1 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Sale Type
            <span className={`text-xs px-2 py-1 rounded ${
              isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
            }`}>Required</span>
          </label>
          <select
            value={formData.saleType}
            onChange={(e) => handleInputChange('saleType', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm font-medium transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          >
            <option value="">-</option>
            <option value="Retail">Retail</option>
            <option value="Trade">Trade</option>
            <option value="Commercial">Commercial</option>
          </select>
          <p className={`text-xs flex items-center gap-1 ${
            isDarkMode ? 'text-white' : 'text-gray-500'
          }`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Defines some of the later logic ie some fields hidden if Trade
          </p>
          {errors.saleType && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.saleType}
            </p>
          )}
        </div>

        {/* Invoice Number - input_3 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Invoice Number
          </label>
          <input
            type="text"
            value={formData.invoiceNumber}
            onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
            placeholder="-"
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            can be a number they will choose, or, a vehicle registration
          </p>
        </div>
      </div>

      {/* Invoice To - input_5 - Only shown for Retail sales */}
      {formData.saleType === 'Retail' && (
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Invoice To
          </label>
          <select
            value={formData.invoiceTo}
            onChange={(e) => handleInputChange('invoiceTo', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          >
            <option value="">-</option>
            <option value="Customer">Customer</option>
            <option value="Finance Company">Finance Company</option>
          </select>
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            drives the finance variables
          </p>
        </div>
      )}

      {/* Vehicle Registration - input_4 */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Vehicle Registration
        </label>
        <input
          type="text"
          value={formData.vehicleRegistration}
          onChange={(e) => handleInputChange('vehicleRegistration', e.target.value)}
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
              : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
          }`}
        />
      </div>

      {/* Vehicle Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Make - input_25 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Make
          </label>
          <input
            type="text"
            value={formData.make}
            onChange={(e) => handleInputChange('make', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>

        {/* Model - input_26 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Model
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>

        {/* Colour - input_30 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Colour
          </label>
          <input
            type="text"
            value={formData.colour}
            onChange={(e) => handleInputChange('colour', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Sale Price and Date Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sale Price - input_6 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Sale Price
          </label>
          <input
            type="number"
            value={formData.salePrice || ''}
            onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            Sale Price Before any Discount
          </p>
        </div>

        {/* Date of Sale - input_7 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Date of Sale
          </label>
          <input
            type="date"
            value={formData.dateOfSale}
            onChange={(e) => handleInputChange('dateOfSale', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>

        {/* Month of Sale - input_37 (Hidden/Calculated) - HIDDEN FROM USER */}
        <div className="hidden">
          <input
            type="text"
            value={formData.monthOfSale}
            readOnly
          />
        </div>

        {/* Quarter of Sale - input_38 (Hidden/Calculated) - HIDDEN FROM USER */}
        <div className="hidden">
          <input
            type="number"
            value={formData.quarterOfSale || ''}
            readOnly
          />
        </div>
      </div>

      {/* Hidden Fields Row - These are hidden from users but kept for data storage */}
      <div className="hidden">
        {/* Additional Vehicle Information - HIDDEN FROM USER */}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Cost of Purchase - input_21 (Hidden) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Cost of Purchase
            </label>
            <input
              type="number"
              value={formData.costOfPurchase || ''}
              onChange={(e) => handleInputChange('costOfPurchase', parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* Date of Purchase - input_130 (Hidden) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Date of Purchase
            </label>
            <input
              type="date"
              value={formData.dateOfPurchase}
              onChange={(e) => handleInputChange('dateOfPurchase', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* VIN - input_22 (Hidden) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              VIN
            </label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => handleInputChange('vin', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* Derivative - input_23 (Hidden) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Derivative
            </label>
            <input
              type="text"
              value={formData.derivative}
              onChange={(e) => handleInputChange('derivative', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Fuel Type - input_24 (Hidden) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Fuel Type
            </label>
            <input
              type="text"
              value={formData.fuelType}
              onChange={(e) => handleInputChange('fuelType', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* Engine Number - input_27 (Hidden) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Engine Number
            </label>
            <input
              type="text"
              value={formData.engineNumber}
              onChange={(e) => handleInputChange('engineNumber', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* Engine Capacity - input_28 (Hidden) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Engine Capacity
            </label>
            <input
              type="text"
              value={formData.engineCapacity}
              onChange={(e) => handleInputChange('engineCapacity', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* First Reg Date - input_29 (Hidden) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              First Reg Date
            </label>
            <input
              type="date"
              value={formData.firstRegDate}
              onChange={(e) => handleInputChange('firstRegDate', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>
        </div>
        </div>

      {/* Days in Stock - input_131 (Calculated) - Always visible */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Days in Stock
        </label>
        <input
          type="number"
          value={formData.daysInStock || ''}
          readOnly
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-700 text-slate-300' 
              : 'border-gray-200 bg-gray-100 text-gray-600'
          }`}
        />
        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          days on forecourt (auto-calculated)
        </p>
      </div>
    </div>
  )
}