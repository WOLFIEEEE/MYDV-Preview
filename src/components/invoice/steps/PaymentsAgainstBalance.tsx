import React, { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function PaymentsAgainstBalance({ formData, updateFormData, errors }: Props) {
  const { isDarkMode } = useTheme()
  
  const handleInputChange = (field: keyof FormData, value: any) => {
    updateFormData({ [field]: value })
  }

  // Helper functions for managing multiple payments
  const addPayment = (type: 'card' | 'bacs' | 'cash') => {
    const fieldName = `${type}Payments` as keyof FormData
    const currentPayments = formData[fieldName] as Array<{ amount: number; date: string }>
    const newPayments = [...currentPayments, { amount: 0, date: '' }]
    updateFormData({ [fieldName]: newPayments })
  }

  const removePayment = (type: 'card' | 'bacs' | 'cash', index: number) => {
    const fieldName = `${type}Payments` as keyof FormData
    const currentPayments = formData[fieldName] as Array<{ amount: number; date: string }>
    if (currentPayments.length > 1) {
      const newPayments = currentPayments.filter((_, i) => i !== index)
      updateFormData({ [fieldName]: newPayments })
    }
  }

  const updatePayment = (type: 'card' | 'bacs' | 'cash', index: number, field: 'amount' | 'date', value: number | string) => {
    const fieldName = `${type}Payments` as keyof FormData
    const currentPayments = formData[fieldName] as Array<{ amount: number; date: string }>
    const newPayments = [...currentPayments]
    if (newPayments[index]) {
      newPayments[index] = { ...newPayments[index], [field]: value }
      updateFormData({ [fieldName]: newPayments })
    }
  }

  // Calculate amount paid in part exchange (PX Value - Settlement Amount)
  useEffect(() => {
    if (formData.partExIncluded === 'Yes') {
      const pxValue = formData.valueOfPxVehicle || 0
      const settlement = formData.settlementAmount || 0
      const netPxValue = Math.max(0, pxValue - settlement)
      
      // Only update if the calculated value is different
      if (formData.amountPaidPartExchange !== netPxValue) {
        updateFormData({ amountPaidPartExchange: netPxValue })
      }
    } else {
      // Only update if the current value is not 0
      if (formData.amountPaidPartExchange !== 0) {
        updateFormData({ amountPaidPartExchange: 0 })
      }
    }
  }, [formData.valueOfPxVehicle, formData.settlementAmount, formData.partExIncluded, formData.amountPaidPartExchange, updateFormData])

  // Calculate balance to finance and paid from balance - Enhanced for separate Card/BACS
  useEffect(() => {
    // Calculate dynamic Finance add-ons total (using POST-DISCOUNT values)
    const dynamicFinanceAddons = (formData.financeAddonsArray || []).reduce((sum, addon, index) => {
      // Check if there's a discount entry for this addon
      const discountEntry = (formData.financeAddonsDiscountArray || [])[index]
      const addonCost = discountEntry?.pricePostDiscount ?? addon.cost ?? 0
      return sum + addonCost
    }, 0)

    // Enhanced: Include multiple payment entries
    const totalCardPayments = (formData.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)
    const totalBacsPayments = (formData.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)
    const totalCashPayments = (formData.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)
    
    const totalDirectPayments = totalCardPayments +
                               totalBacsPayments +
                               totalCashPayments + 
                               (formData.amountPaidPartExchange || 0)

    // Static finance add-ons (use post-discount values when available, ?? preserves 0 values)
    const postFinanceAddon1 = formData.financeAddon1PricePostDiscount ?? formData.financeAddon1Cost ?? 0
    const postFinanceAddon2 = formData.financeAddon2PricePostDiscount ?? formData.financeAddon2Cost ?? 0
    
    // Gravity Forms calculation logic
    // Field 135: Balance to Finance = (Sale Price - Discount) + Settlement + Finance Add-ons (POST-DISCOUNT) - Overpayments - Direct Payments
    const balanceToFinance = Math.max(0, 
      (formData.salePricePostDiscount ?? formData.salePrice ?? 0) +
      (formData.settlementAmount || 0) +
      postFinanceAddon1 +
      postFinanceAddon2 +
      dynamicFinanceAddons -
      (formData.overpaymentsFinance || 0) -
      totalDirectPayments
    ) // input_135
    
    // Field 95: Paid from Balance = Sum of all direct payments
    const paidFromBalance = totalDirectPayments // input_95

    // Only update if the calculated values are different
    if (formData.balanceToFinance !== balanceToFinance || formData.paidFromBalance !== paidFromBalance) {
      updateFormData({ 
        balanceToFinance,
        paidFromBalance 
      })
    }
  }, [
    formData.salePricePostDiscount, formData.salePrice,
    formData.warrantyPricePostDiscount, formData.warrantyPrice,
    formData.deliveryPricePostDiscount, formData.deliveryCost,
    formData.financeAddon1Cost, formData.financeAddon2Cost,
    formData.financeAddon1PricePostDiscount, formData.financeAddon2PricePostDiscount, // Post-discount finance add-ons
    formData.financeAddonsArray, // Dynamic finance add-ons
    formData.financeAddonsDiscountArray, // Dynamic finance add-on discounts
    formData.cardPayments, formData.bacsPayments, formData.cashPayments, // Multiple payment tracking
    formData.amountPaidPartExchange,
    formData.settlementAmount, formData.overpaymentsFinance, // Added missing dependencies
    formData.balanceToFinance, formData.paidFromBalance,
    updateFormData
  ])

  const isPartExIncluded = formData.partExIncluded === 'Yes'

  return (
    <div className="space-y-6">
      {/* Part Exchange Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Part Ex Included? - input_85 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Part Ex Included?
            </label>
            <select
              value={formData.partExIncluded}
              onChange={(e) => handleInputChange('partExIncluded', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            >
              <option value="">-</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* PX Vehicle Registration - input_86 - Only shown when Part Ex is included */}
          {isPartExIncluded && (
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                PX Vehicle Registration
              </label>
              <input
                type="text"
                value={formData.pxVehicleRegistration}
                onChange={(e) => handleInputChange('pxVehicleRegistration', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>
          )}

          {/* PX Make and Model - input_87 - Only shown when Part Ex is included */}
          {isPartExIncluded && (
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                PX Make and Model
              </label>
              <input
                type="text"
                value={formData.pxMakeModel}
                onChange={(e) => handleInputChange('pxMakeModel', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>
          )}
        </div>

        {/* PX Details - Only shown when Part Ex is included */}
        {isPartExIncluded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PX Mileage - input_88 */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                PX Mileage
              </label>
              <input
                type="number"
                value={formData.pxMileage || ''}
                onChange={(e) => handleInputChange('pxMileage', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>

            {/* Value of PX Vehicle - input_89 */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Value of PX Vehicle
              </label>
              <input
                type="number"
                value={formData.valueOfPxVehicle || ''}
                onChange={(e) => handleInputChange('valueOfPxVehicle', parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                Amount paid for PX Vehicle to be deducted from amounts due
              </p>
            </div>

            {/* Settlement Amount - input_96 */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Settlement Amount
              </label>
              <input
                type="number"
                value={formData.settlementAmount || ''}
                onChange={(e) => handleInputChange('settlementAmount', parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section Dividers - Matching Gravity Forms structure */}
      <div className={`border-t-2 pt-6 ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Direct Payments
        </h3>

        {/* Card/BACS Payments */}
        <div className="space-y-6">

          {/* Separate Card and BACS Payments */}
          <div className="space-y-4">
            <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Separate Payment Methods
            </h4>
            
            {/* Card Payments - Multiple Entries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Card Payments
                </h5>
                <button
                  type="button"
                  onClick={() => addPayment('card')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Add Card Payment
                </button>
              </div>
              
              {formData.cardPayments.map((payment, index) => (
                <div key={index} className="p-4 border-2 border-dashed rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>
                        Card Amount {index + 1}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={payment.amount || ''}
                        onChange={(e) => updatePayment('card', index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                          isDarkMode 
                            ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                            : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>
                        Card Payment Date {index + 1}
                      </label>
                      <input
                        type="date"
                        value={payment.date}
                        onChange={(e) => updatePayment('card', index, 'date', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                          isDarkMode 
                            ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                            : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                  
                  {formData.cardPayments.length > 1 && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removePayment('card', index)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isDarkMode 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* BACS Payments - Multiple Entries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  BACS Payments
                </h5>
                <button
                  type="button"
                  onClick={() => addPayment('bacs')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Add BACS Payment
                </button>
              </div>
              
              {formData.bacsPayments.map((payment, index) => (
                <div key={index} className="p-4 border-2 border-dashed rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>
                        BACS Amount {index + 1}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={payment.amount || ''}
                        onChange={(e) => updatePayment('bacs', index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                          isDarkMode 
                            ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                            : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>
                        BACS Payment Date {index + 1}
                      </label>
                      <input
                        type="date"
                        value={payment.date}
                        onChange={(e) => updatePayment('bacs', index, 'date', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                          isDarkMode 
                            ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                            : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                  
                  {formData.bacsPayments.length > 1 && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removePayment('bacs', index)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isDarkMode 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <div className={`border-t pt-6 mt-6 ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
          {/* Cash Payments - Multiple Entries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Cash Payments
              </h5>
              <button
                type="button"
                onClick={() => addPayment('cash')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Plus className="h-4 w-4" />
                Add Cash Payment
              </button>
            </div>
            
            {formData.cashPayments.map((payment, index) => (
              <div key={index} className="p-4 border-2 border-dashed rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Cash Amount {index + 1}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={payment.amount || ''}
                      onChange={(e) => updatePayment('cash', index, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Cash Payment Date {index + 1}
                    </label>
                    <input
                      type="date"
                      value={payment.date}
                      onChange={(e) => updatePayment('cash', index, 'date', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>
                </div>
                
                {formData.cashPayments.length > 1 && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removePayment('cash', index)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDarkMode 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section Divider */}
        <div className={`border-t pt-6 mt-6 ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
          {/* Part Exchange Payment Calculation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount Paid in Part Exchange - input_90 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Amount Paid in Part Exchange
              </label>
              <input
                type="number"
                value={formData.amountPaidPartExchange || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                  this is taken off customers deposit and if goes over, gets &apos;included&apos; as overpayment in calculations
              </p>
            </div>

            {/* Date of PX - input_93 */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Date of PX
              </label>
              <input
                type="date"
                value={formData.dateOfPx}
                onChange={(e) => handleInputChange('dateOfPx', e.target.value)}
                disabled={!isPartExIncluded}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  !isPartExIncluded 
                    ? isDarkMode 
                      ? 'border-slate-600 bg-slate-700 text-slate-400 cursor-not-allowed' 
                      : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Balance Calculations */}
        <div className={`border-t pt-6 mt-6 ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
          

          {/* Paid from Balance - input_95 (Calculated) */}
          <div className={`${formData.saleType === 'Retail' && formData.invoiceTo === 'Finance Company' ? 'border-t pt-6 mt-6' : ''} ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Paid from Balance
              </label>
              <input
                type="number"
                value={formData.paidFromBalance || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Excludes Deposit- calc below (shown here to give overview - is on next page, too)
              </p>
            </div>
          </div>

          {/* Balance to Finance - input_135 (Calculated) - Only show for Finance Company invoices */}
          {formData.saleType === 'Retail' && formData.invoiceTo === 'Finance Company' && (
            <div className="space-y-2 pt-6">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Balance to Finance
              </label>
              <input
                type="number"
                value={formData.balanceToFinance || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                calc below
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}