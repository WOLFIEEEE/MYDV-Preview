import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function DealerDepositDelivery({ formData, updateFormData, errors }: Props) {
  const { isDarkMode } = useTheme()
  
  const handleInputChange = (field: keyof FormData, value: any) => {
    updateFormData({ [field]: value })
  }

  const isDeliverySelected = formData.deliveryOptions === 'Delivery'
  const isCollectionSelected = formData.deliveryOptions === 'Collection'

  return (
    <div className="space-y-6">
      {/* Dealer Deposit - input_33 */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Dealer Deposit
        </label>
        <input
          type="number"
          value={formData.dealerDeposit || ''}
          onChange={(e) => handleInputChange('dealerDeposit', parseFloat(e.target.value) || 0)}
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
              : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
          }`}
        />
        <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
          Deposit Imposed by Dealer
        </p>
      </div>

      {/* Delivery Options Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Delivery Options - input_34 (Radio buttons) */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Delivery Options
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="deliveryOptions"
                value="Collection"
                checked={formData.deliveryOptions === 'Collection'}
                onChange={(e) => handleInputChange('deliveryOptions', e.target.value)}
                className={`w-4 h-4 text-blue-600 border-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                }`}
              />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Collection
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="deliveryOptions"
                value="Delivery"
                checked={formData.deliveryOptions === 'Delivery'}
                onChange={(e) => handleInputChange('deliveryOptions', e.target.value)}
                className={`w-4 h-4 text-blue-600 border-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                }`}
              />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Delivery
              </span>
            </label>
          </div>
        </div>

        {/* Collection - input_32 (readonly "FREE") - Only shown when Collection is selected */}
        {isCollectionSelected && (
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Collection
            </label>
            <input
              type="text"
              value={formData.collection}
              readOnly
              placeholder="FREE"
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-700 text-slate-300' 
                  : 'border-gray-200 bg-gray-100 text-gray-600'
              }`}
            />
          </div>
        )}

        {/* Delivery Cost - input_35 - Only shown when Delivery is selected */}
        {isDeliverySelected && (
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Delivery Cost
            </label>
            <input
              type="number"
              value={formData.deliveryCost || ''}
              onChange={(e) => handleInputChange('deliveryCost', parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>
        )}
      </div>

      {/* Date of Collection / Delivery - input_129 */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Date of Collection / Delivery
        </label>
        <input
          type="date"
          value={formData.dateOfCollectionDelivery}
          onChange={(e) => handleInputChange('dateOfCollectionDelivery', e.target.value)}
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
              : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
          }`}
        />
      </div>

      {/* Dealer Deposit Payment - Only show for Finance Company invoices */}
      {formData.saleType === 'Retail' && formData.invoiceTo === 'Finance Company' && (
        <div className="space-y-4">
          <div className={`border-t-2 pt-4 ${
            isDarkMode ? 'border-slate-600' : 'border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Dealer Deposit Payment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dealer Deposit Paid (Customer) */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Dealer Deposit Paid (Customer)
                </label>
                <input
                  type="number"
                  value={formData.dealerDepositPaidCustomer || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('dealerDepositPaidCustomer', value === '' ? 0 : parseFloat(value) || 0);
                  }}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                  Amount of dealer deposit paid by customer
                </p>
              </div>

              {/* Payment Date (Customer) */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Payment Date (Customer)
                </label>
                <input
                  type="date"
                  value={formData.dealerDepositPaymentDateCustomer || ''}
                  onChange={(e) => handleInputChange('dealerDepositPaymentDateCustomer', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                  Date when dealer deposit was paid by customer
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Note */}
      <div className={`rounded-lg p-4 border-2 ${
        isDarkMode 
          ? 'bg-blue-900/20 border-blue-700/50' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              isDarkMode ? 'text-blue-300' : 'text-blue-800'
            }`}>
              Dealer Deposit and Delivery Information
            </h3>
            <div className={`mt-2 text-sm ${
              isDarkMode ? 'text-blue-200' : 'text-blue-700'
            }`}>
              <p>
                Set any dealer-imposed deposit and choose delivery method. Collection is always free, 
                while delivery may incur additional costs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}