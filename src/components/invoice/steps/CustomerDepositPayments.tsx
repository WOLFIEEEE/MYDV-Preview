import React, { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function CustomerDepositPayments({ formData, updateFormData }: Props) {
  const { isDarkMode } = useTheme()
  
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  // Calculate deposit amounts automatically based on dealer deposit
  useEffect(() => {
    // Always use dealer deposit as the required deposit amount
    const compulsorySaleDepositCustomer = formData.dealerDeposit || 0
    
    // Outstanding Deposit Amount (C) - input_80 (Calculated)
    const amountPaidDepositCustomer = formData.amountPaidDepositCustomer || 0
    const outstandingDepositAmountCustomer = Math.max(0, compulsorySaleDepositCustomer - amountPaidDepositCustomer)
    
    // Overpayments (C) - input_77 (Calculated)
    const overpaymentsCustomer = Math.max(0, amountPaidDepositCustomer - compulsorySaleDepositCustomer)

    // Only update if any of the calculated values are different
    const needsUpdate = 
      formData.compulsorySaleDepositCustomer !== compulsorySaleDepositCustomer ||
      formData.outstandingDepositAmountCustomer !== outstandingDepositAmountCustomer ||
      formData.overpaymentsCustomer !== overpaymentsCustomer

    if (needsUpdate) {
      updateFormData({
        compulsorySaleDepositCustomer,
        outstandingDepositAmountCustomer,
        overpaymentsCustomer
      })
    }
  }, [
    formData.dealerDeposit,
    formData.amountPaidDepositCustomer,
    formData.compulsorySaleDepositCustomer,
    formData.outstandingDepositAmountCustomer,
    formData.overpaymentsCustomer,
    updateFormData
  ])

  return (
    <div className="space-y-6">
      {/* Information Notice */}
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
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              isDarkMode ? 'text-blue-300' : 'text-blue-800'
            }`}>
              Deposit Payments
            </h3>
            <div className={`mt-2 text-sm ${
              isDarkMode ? 'text-blue-200' : 'text-blue-700'
            }`}>
              <p>
                Manage deposit payments and track outstanding amounts for this sale.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compulsory Sale Deposit (Non-Finance) - input_61 */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Required Deposit Amount
        </label>
        <input
          type="number"
          value={formData.dealerDeposit || ''}
          readOnly={true}
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-700 text-slate-300' 
              : 'border-gray-200 bg-gray-100 text-gray-600'
          }`}
        />
        <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
          Automatically calculated from dealer deposit amount (read-only)
        </p>
      </div>

      {/* Deposit Payment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount Paid in Deposit - input_78 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Amount Paid in Deposit
          </label>
          <input
            type="number"
            value={formData.amountPaidDepositCustomer || ''}
            onChange={(e) => handleInputChange('amountPaidDepositCustomer', parseFloat(e.target.value) || 0)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>

        {/* Deposit Date - input_79 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Deposit Date
          </label>
          <input
            type="date"
            value={formData.depositDateCustomer}
            onChange={(e) => handleInputChange('depositDateCustomer', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Calculated Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outstanding Deposit Amount - input_80 (Calculated) */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Outstanding Deposit Amount
          </label>
          <input
            type="number"
            value={formData.outstandingDepositAmountCustomer || ''}
            readOnly
            placeholder="£0.00"
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-700 text-slate-300' 
                : 'border-gray-200 bg-gray-100 text-gray-600'
            }`}
          />
        </div>

        {/* Overpayments - input_77 (Calculated) */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Overpayments
          </label>
          <input
            type="number"
            value={formData.overpaymentsCustomer || ''}
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


      {/* Payment Instructions */}
      <div className={`rounded-lg p-4 border-2 ${
        isDarkMode 
          ? 'bg-green-900/20 border-green-700/50' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              isDarkMode ? 'text-green-400' : 'text-green-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              isDarkMode ? 'text-green-300' : 'text-green-800'
            }`}>
              Deposit Information
            </h3>
            <div className={`mt-2 text-sm ${
              isDarkMode ? 'text-green-200' : 'text-green-700'
            }`}>
              <p>
                Deposits help secure the vehicle and manage the transaction. Any overpayments will be credited towards the final balance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}