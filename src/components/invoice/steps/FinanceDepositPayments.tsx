import React, { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function FinanceDepositPayments({ formData, updateFormData }: Props) {
  const { isDarkMode } = useTheme()
  
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  // Calculate deposit amounts automatically - Matching Gravity Forms logic
  useEffect(() => {
    // Only calculate if this is a finance company invoice
    if (formData.invoiceTo !== 'Finance Company') {
      return
    }
    
    // Compulsory Sale Deposit (Finance) - input_59 (Calculated)
    // Formula: Post Discount Warranty + Post Discount Enhanced Warranty + Post Discount Delivery + All Customer Add-ons (static + dynamic)
    // ALWAYS use post-discount if available, then fallback to original price, then 0
    const warrantyPrice = formData.warrantyPricePostDiscount ?? formData.warrantyPrice ?? 0
    const enhancedWarrantyPrice = formData.enhancedWarrantyPricePostDiscount ?? formData.enhancedWarrantyPrice ?? 0
    const deliveryPrice = formData.deliveryPricePostDiscount ?? formData.deliveryCost ?? 0
    
    // Static customer add-ons (use post-discount values when available, ?? preserves 0 values)
    const customerAddon1Cost = formData.customerAddon1PricePostDiscount ?? formData.customerAddon1Cost ?? 0
    const customerAddon2Cost = formData.customerAddon2PricePostDiscount ?? formData.customerAddon2Cost ?? 0
    
    // Dynamic customer add-ons (Enhanced feature beyond Gravity Forms)
    // Use post-discount values from customerAddonsDiscountArray when available, fallback to original cost
    const dynamicCustomerAddons = (formData.customerAddonsArray || []).reduce((sum, addon, index) => {
      // Check if there's a discount entry for this addon
      const discountEntry = (formData.customerAddonsDiscountArray || [])[index]
      const addonCost = discountEntry?.pricePostDiscount ?? addon.cost ?? 0
      return sum + addonCost
    }, 0)
    
    // Total customer add-ons (static + dynamic, all post-discount)
    const totalCustomerAddons = customerAddon1Cost + customerAddon2Cost + dynamicCustomerAddons
    
    const compulsorySaleDepositFinance = warrantyPrice + enhancedWarrantyPrice + deliveryPrice + totalCustomerAddons
    
    // Calculate total finance deposit paid (dealer deposit paid + finance deposit paid)
    const dealerDepositPaidCustomer = formData.dealerDepositPaidCustomer ?? 0
    const amountPaidDepositFinance = formData.amountPaidDepositFinance ?? 0
    const totalFinanceDepositPaid = dealerDepositPaidCustomer + amountPaidDepositFinance
    
    // Outstanding Deposit Amount (F) - input_76 (Calculated)
    // NOW USES COMBINED TOTAL
    const outstandingDepositAmountFinance = Math.max(0, compulsorySaleDepositFinance - totalFinanceDepositPaid)
    
    // Overpayments (F) - input_81 (Calculated) - Gravity Forms logic
    // NOW USES COMBINED TOTAL
    const overpaymentsFinance = Math.max(0, totalFinanceDepositPaid - compulsorySaleDepositFinance)

    // Only update if any of the calculated values are different
    const needsUpdate = 
      formData.compulsorySaleDepositFinance !== compulsorySaleDepositFinance ||
      formData.totalFinanceDepositPaid !== totalFinanceDepositPaid ||
      formData.outstandingDepositAmountFinance !== outstandingDepositAmountFinance ||
      formData.overpaymentsFinance !== overpaymentsFinance

    if (needsUpdate) {
      updateFormData({
        compulsorySaleDepositFinance,
        totalFinanceDepositPaid,
        outstandingDepositAmountFinance,
        overpaymentsFinance
      })
    }
    // Note: Calculated output values (compulsorySaleDepositFinance, totalFinanceDepositPaid, 
    // outstandingDepositAmountFinance, overpaymentsFinance) are intentionally excluded from 
    // dependencies to prevent circular updates. They are outputs of this calculation, not inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.invoiceTo,
    formData.warrantyPrice,
    formData.warrantyPricePostDiscount,
    formData.enhancedWarrantyPrice,
    formData.enhancedWarrantyPricePostDiscount,
    formData.deliveryCost,
    formData.deliveryPricePostDiscount,
    formData.customerAddon1Cost,
    formData.customerAddon1PricePostDiscount,
    formData.customerAddon2Cost,
    formData.customerAddon2PricePostDiscount,
    formData.customerAddonsArray,
    formData.customerAddonsDiscountArray,
    formData.dealerDepositPaidCustomer,
    formData.amountPaidDepositFinance,
    updateFormData
  ])

  // This component is only shown when invoiceTo === 'Finance Company'
  if (formData.invoiceTo !== 'Finance Company') {
    return null
  }

  return (
    <div className="space-y-6">

      {/* Compulsory Sale Deposit (Finance) - input_59 (Calculated) */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Compulsory Sale Deposit (Finance)
        </label>
        <input
          type="number"
          value={formData.compulsorySaleDepositFinance || ''}
          readOnly
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-700 text-slate-300' 
              : 'border-gray-200 bg-gray-100 text-gray-600'
          }`}
        />
      </div>

      {/* Deposit Payment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount Paid in Deposit - input_72 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Amount Paid in Deposit
          </label>
          <input
            type="number"
            value={formData.amountPaidDepositFinance || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleInputChange('amountPaidDepositFinance', value === '' ? 0 : parseFloat(value) || 0);
            }}
            placeholder="0.00"
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>

        {/* Deposit Date - input_75 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Deposit Date
          </label>
          <input
            type="date"
            value={formData.depositDateFinance}
            onChange={(e) => handleInputChange('depositDateFinance', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Total Finance Deposit Paid - READ ONLY (Combined total) */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Total Finance Deposit Paid (Combined)
        </label>
        <input
          type="number"
          value={formData.totalFinanceDepositPaid || ''}
          readOnly
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-700 text-slate-300' 
              : 'border-gray-200 bg-gray-100 text-gray-600'
          }`}
        />
        <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
          Sum of Dealer Deposit Paid (£{(formData.dealerDepositPaidCustomer || 0).toFixed(2)}) + 
          Amount Paid in Deposit (£{(formData.amountPaidDepositFinance || 0).toFixed(2)})
        </p>
      </div>

      {/* Calculated Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outstanding Deposit Amount - input_76 (Calculated) */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Outstanding Deposit Amount
          </label>
          <input
            type="number"
            value={Math.max(0, (formData.compulsorySaleDepositFinance ?? 0) - (formData.totalFinanceDepositPaid ?? 0))}
            readOnly
            placeholder="£0.00"
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-700 text-slate-300' 
                : 'border-gray-200 bg-gray-100 text-gray-600'
            }`}
          />
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            Compulsory Deposit (£{(formData.compulsorySaleDepositFinance || 0).toFixed(2)}) minus Total Paid (£{(formData.totalFinanceDepositPaid || 0).toFixed(2)})
          </p>
        </div>

        {/* Overpayments - input_81 (Calculated) */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Overpayments
          </label>
          <input
            type="number"
            value={formData.overpaymentsFinance || ''}
            readOnly
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-700 text-slate-300' 
                : 'border-gray-200 bg-gray-100 text-gray-600'
            }`}
          />
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            Amount beyond deposit to be deducted from Finance Balance
          </p>
        </div>
      </div>

      {/* Finance Deposit Summary */}
      <div className={`rounded-lg p-4 border-2 ${
        isDarkMode 
          ? 'bg-slate-800/50 border-slate-600' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`text-sm font-medium mb-3 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Finance Deposit Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Required Deposit:</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                £{(formData.compulsorySaleDepositFinance || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Dealer Deposit Paid:</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                £{(formData.dealerDepositPaidCustomer || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Finance Deposit Paid:</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                £{(formData.amountPaidDepositFinance || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>Total Paid:</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                £{(formData.totalFinanceDepositPaid || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Payment Date:</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {formData.depositDateFinance || 'Not set'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Outstanding:</span>
              <span className={`font-medium ${
                (Math.max(0, (formData.compulsorySaleDepositFinance ?? 0) - (formData.totalFinanceDepositPaid ?? 0))) > 0 
                  ? 'text-red-500' 
                  : isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                £{(Math.max(0, (formData.compulsorySaleDepositFinance ?? 0) - (formData.totalFinanceDepositPaid ?? 0))).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Overpayment:</span>
              <span className={`font-medium ${
                (Math.max(0, (formData.totalFinanceDepositPaid ?? 0) - (formData.compulsorySaleDepositFinance ?? 0))) > 0 
                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                  : isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                £{(Math.max(0, (formData.totalFinanceDepositPaid ?? 0) - (formData.compulsorySaleDepositFinance ?? 0))).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>Status:</span>
              <span className={`${
                (Math.max(0, (formData.compulsorySaleDepositFinance ?? 0) - (formData.totalFinanceDepositPaid ?? 0))) > 0 
                  ? 'text-red-500' 
                  : (Math.max(0, (formData.totalFinanceDepositPaid ?? 0) - (formData.compulsorySaleDepositFinance ?? 0))) > 0
                    ? isDarkMode ? 'text-green-400' : 'text-green-600'
                    : isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                {(Math.max(0, (formData.compulsorySaleDepositFinance ?? 0) - (formData.totalFinanceDepositPaid ?? 0))) > 0 
                  ? 'Outstanding' 
                  : (Math.max(0, (formData.totalFinanceDepositPaid ?? 0) - (formData.compulsorySaleDepositFinance ?? 0))) > 0
                    ? 'Overpaid'
                    : 'Paid in Full'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className={`rounded-lg p-4 border-2 ${
        isDarkMode 
          ? 'bg-yellow-900/20 border-yellow-700/50' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              isDarkMode ? 'text-yellow-400' : 'text-yellow-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
            }`}>
              Finance Deposit Information
            </h3>
            <div className={`mt-2 text-sm ${
              isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
            }`}>
              <p>
                Finance deposits are calculated based on the sale price. Any overpayments will be 
                automatically deducted from the finance balance. Ensure all deposit payments are 
                recorded accurately with the correct dates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}