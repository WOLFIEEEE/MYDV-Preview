import React, { useEffect, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'
import SignatureCapture from '@/components/shared/SignatureCapture'
import { useUser } from '@clerk/nextjs'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function BalanceSummary({ formData, updateFormData, errors }: Props) {
  const { isDarkMode } = useTheme()
  const { user } = useUser()
  const [tradeTerms, setTradeTerms] = useState<string>('')
  const [isLoadingTerms, setIsLoadingTerms] = useState(false)
  
  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    updateFormData({ [field]: value })
  }

  const isFinanceInvoice = formData.invoiceTo === 'Finance Company'
  const isCustomerInvoice = formData.invoiceTo === 'Customer'
  const isCommercialSale = formData.saleType === 'Commercial'
  const isTradeSale = formData.saleType === 'Trade'
  const isInHouseWarranty = formData.inHouse === 'Yes'
  const isSignatureAvailable = formData.customerAvailableSignature === 'Yes'


  // Fetch trade terms from database when it's a trade sale
  useEffect(() => {
    const fetchTradeTerms = async () => {
      if (!isTradeSale || !user?.id) return
      
      setIsLoadingTerms(true)
      try {
        // First get the dealer ID from the current user
        const dealerResponse = await fetch('/api/current-dealer')
        if (!dealerResponse.ok) {
          throw new Error('Failed to get dealer information')
        }
        
        const dealerResult = await dealerResponse.json()
        if (!dealerResult.success || !dealerResult.data?.dealerId) {
          throw new Error('No dealer ID found for current user')
        }
        
        const dealerId = dealerResult.data.dealerId
        console.log('🔍 Fetching trade terms for dealer ID:', dealerId)
        
        // Now fetch the custom terms using the correct dealer ID
        const response = await fetch(`/api/custom-terms?dealerId=${dealerId}`)
        if (response.ok) {
          const result = await response.json()
          console.log('📋 Custom terms API response:', result)
          
          if (result.success && result.data?.tradeTerms) {
            console.log('✅ Found trade terms in database, length:', result.data.tradeTerms.length)
            setTradeTerms(result.data.tradeTerms)
          } else {
            console.log('⚠️ No trade terms found in database, using default')
            // Set default trade terms if none exist in database
            setTradeTerms(`## Declaration

I confirm that, when purchasing the above vehicle, I have been advised that this purchase is a Trade-Sale and outside of the scope of the Consumer Protection provisions. Therefore, no warranty or post-sale liabilities will apply.

By purchasing this vehicle, I am confirming my understanding of the above, that all of the details listed are correct and providing my consent for these conditions to be applied.

For any queries or issues, please contact us at urue@gmail.com`)
          }
        } else {
          throw new Error(`Custom terms API returned ${response.status}`)
        }
      } catch (error) {
        console.error('❌ Error fetching trade terms:', error)
        // Set default terms on error
        setTradeTerms(`## Declaration

I confirm that, when purchasing the above vehicle, I have been advised that this purchase is a Trade-Sale and outside of the scope of the Consumer Protection provisions. Therefore, no warranty or post-sale liabilities will apply.

By purchasing this vehicle, I am confirming my understanding of the above, that all of the details listed are correct and providing my consent for these conditions to be applied.

For any queries or issues, please contact us at urue@gmail.com`)
      } finally {
        setIsLoadingTerms(false)
      }
    }

    fetchTradeTerms()
  }, [isTradeSale, user?.id])

  // Calculate all balance summary fields automatically - Matching Gravity Forms exactly
  useEffect(() => {
    // Calculate sale type flags inside useEffect to avoid dependency issues
    const currentIsTradeSale = formData.saleType === 'Trade'
    
    // Calculate subtotals and balances - ALL USING POST-DISCOUNT VALUES
    // ALWAYS use post-discount if available, then fallback to original price, then 0
    const salePrice = formData.salePricePostDiscount ?? formData.salePrice ?? 0
    const warrantyPrice = formData.warrantyPricePostDiscount ?? formData.warrantyPrice ?? 0
    const enhancedWarrantyPrice = formData.enhancedWarrantyPricePostDiscount ?? formData.enhancedWarrantyPrice ?? 0
    const deliveryPrice = formData.deliveryPricePostDiscount ?? formData.deliveryCost ?? 0
    
    // Calculate dynamic add-ons totals (Enhanced feature beyond Gravity Forms) - using POST-DISCOUNT values
    const dynamicFinanceAddons = (formData.financeAddonsArray || []).reduce((sum, addon, index) => {
      // Check if there's a discount entry for this addon
      const discountEntry = (formData.financeAddonsDiscountArray || [])[index]
      const addonCost = discountEntry?.pricePostDiscount ?? addon.cost ?? 0
      return sum + addonCost
    }, 0)
    
    const dynamicCustomerAddons = (formData.customerAddonsArray || []).reduce((sum, addon, index) => {
      // Check if there's a discount entry for this addon
      const discountEntry = (formData.customerAddonsDiscountArray || [])[index]
      const addonCost = discountEntry?.pricePostDiscount ?? addon.cost ?? 0
      return sum + addonCost
    }, 0)
    
    // FIXED: Use POST-DISCOUNT values for static addons (using ?? to preserve 0 values)
    const financeAddon1Cost = formData.financeAddon1PricePostDiscount ?? formData.financeAddon1Cost ?? 0
    const financeAddon2Cost = formData.financeAddon2PricePostDiscount ?? formData.financeAddon2Cost ?? 0
    const customerAddon1Cost = formData.customerAddon1PricePostDiscount ?? formData.customerAddon1Cost ?? 0
    const customerAddon2Cost = formData.customerAddon2PricePostDiscount ?? formData.customerAddon2Cost ?? 0
    
    const financeAddons = financeAddon1Cost + financeAddon2Cost + dynamicFinanceAddons
    const customerAddons = customerAddon1Cost + customerAddon2Cost + dynamicCustomerAddons
    
    // CORRECTED: Finance Company Subtotal calculation
    // Formula: (Sale Price - Discount) + (Warranty Price - Discount) + (Enhanced Warranty - Discount) + Customer add-ons + Delivery + Finance add-ons
    const subtotalFinance = salePrice + warrantyPrice + enhancedWarrantyPrice + deliveryPrice + customerAddons + financeAddons
    
    // CORRECTED: Customer subtotal - does NOT include finance addons (only for finance company invoices)
    const subtotalCustomer = salePrice + warrantyPrice + enhancedWarrantyPrice + deliveryPrice + customerAddons
    
    // Calculate compulsory deposits - Matching Gravity Forms logic
    // Field 59: Compulsory Sale Deposit (Finance) = Post Discount Warranty + Post Discount Enhanced Warranty + Post Discount Delivery + All Customer Add-ons
    const compulsorySaleDepositFinance = isFinanceInvoice ? 
      (formData.warrantyPricePostDiscount ?? formData.warrantyPrice ?? 0) + 
      (formData.enhancedWarrantyPricePostDiscount ?? formData.enhancedWarrantyPrice ?? 0) + 
      (formData.deliveryPricePostDiscount ?? formData.deliveryCost ?? 0) + 
      customerAddons : 0
    
    // Field 61: Compulsory Sale Deposit (Non-Finance) = Dealer Deposit
    const compulsorySaleDepositCustomer = isCustomerInvoice ? (formData.dealerDeposit ?? 0) : 0
    
    // Total payments made (Enhanced: multiple payments support)
    // Calculate totals from multiple payment arrays
    const totalCardPayments = (formData.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)
    const totalBacsPayments = (formData.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)
    const totalCashPayments = (formData.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)
    
    // Formula: Amount Paid in Part Exchange + All Cash + All Card + All BACS payments
    const totalDirectPayments = (formData.amountPaidPartExchange || 0) +
                               totalCashPayments +
                               totalCardPayments +
                               totalBacsPayments
    
    // For finance invoices, use combined total; for customer invoices, use customer deposit
    const totalDepositPayments = isFinanceInvoice 
      ? (formData.totalFinanceDepositPaid || 0)
      : (formData.amountPaidDepositCustomer || 0)
    
    // CORRECTED: Customer Amount Paid calculation
    // For Customer invoices: Amount Paid in Deposit (C) + All Card + All BACS + All Cash + Part Exchange
    const customerAmountPaid = isCustomerInvoice ? 
      (formData.amountPaidDepositCustomer || 0) +
      totalCardPayments +
      totalBacsPayments +
      totalCashPayments +
      (formData.amountPaidPartExchange || 0) :
      totalDirectPayments + totalDepositPayments

    // Prepare all calculated values
    let calculatedValues: Partial<FormData> = {
      compulsorySaleDepositFinance,
      compulsorySaleDepositCustomer
    }

    // Finance Company calculations (Gravity Forms: input_136, input_98, input_99, input_97)
    if (isFinanceInvoice) {
      // subtotalFinance already calculated above // input_136
      
      // CORRECTED: Balance to Finance calculation - MATCH PaymentsAgainstBalance logic
      // Formula: (Sale Price Post-Discount) + Settlement Amount + Finance Add-ons - Overpayments (F) - All Direct Payments (Card + BACS + Cash + Part Exchange)
      // Note: totalCardPayments, totalBacsPayments, totalCashPayments already calculated above (lines 148-150)
      
      // Use post-discount sale price (same as PaymentsAgainstBalance)
      const postDiscountSalePrice = formData.salePricePostDiscount || salePrice
      
      // Total direct payments including Part Exchange (same as PaymentsAgainstBalance)
      const totalDirectPayments = totalCardPayments + 
                                 totalBacsPayments + 
                                 totalCashPayments + 
                                 (formData.amountPaidPartExchange || 0)
      
      // Static finance add-ons (use post-discount values when available) - MATCH PaymentsAgainstBalance exactly
      const postFinanceAddon1 = formData.financeAddon1PricePostDiscount || formData.financeAddon1Cost || 0
      const postFinanceAddon2 = formData.financeAddon2PricePostDiscount || formData.financeAddon2Cost || 0
      
      // Dynamic finance add-ons (use post-discount values when available)
      const postDynamicFinanceAddons = (formData.financeAddonsArray || []).reduce((sum, addon, index) => {
        const discountEntry = (formData.financeAddonsDiscountArray || [])[index]
        const addonCost = discountEntry?.pricePostDiscount ?? addon.cost ?? 0
        return sum + addonCost
      }, 0)
      
      const totalFinanceAddons = postFinanceAddon1 + postFinanceAddon2 + postDynamicFinanceAddons
      
      const balanceToFinanceCompany = Math.max(0,
        postDiscountSalePrice + 
        (formData.settlementAmount || 0) + 
        totalFinanceAddons - 
        (formData.overpaymentsFinance || 0) - 
        totalDirectPayments
      )
      
      // CORRECTED: Balance to Customer = Post Warranty + Post Enhanced Warranty + Post Delivery + Post Customer Add-ons - Finance Deposit Paid - Customer Deposit Paid
      // This matches the Compulsory Sale Deposit (F) calculation minus all deposits paid
      const postWarrantyPrice = formData.warrantyPricePostDiscount ?? formData.warrantyPrice ?? 0
      const postEnhancedWarrantyPrice = formData.enhancedWarrantyPricePostDiscount ?? formData.enhancedWarrantyPrice ?? 0
      const postDeliveryPrice = formData.deliveryPricePostDiscount ?? formData.deliveryCost ?? 0
      
      // Static customer add-ons (use post-discount values when available)
      const postCustomerAddon1 = formData.customerAddon1PricePostDiscount || formData.customerAddon1Cost || 0
      const postCustomerAddon2 = formData.customerAddon2PricePostDiscount || formData.customerAddon2Cost || 0
      
      // Dynamic customer add-ons (use post-discount values when available)
      const postDynamicCustomerAddons = (formData.customerAddonsArray || []).reduce((sum, addon, index) => {
        const discountEntry = (formData.customerAddonsDiscountArray || [])[index]
        const addonCost = discountEntry?.pricePostDiscount ?? addon.cost ?? 0
        return sum + addonCost
      }, 0)
      
      const totalCustomerItems = postWarrantyPrice + postEnhancedWarrantyPrice + postDeliveryPrice + 
                                postCustomerAddon1 + postCustomerAddon2 + postDynamicCustomerAddons
      
      // Use combined total finance deposit paid
      const totalFinanceDepositPaid = formData.totalFinanceDepositPaid || 0
      const outstandingDepositAmountFinance = totalCustomerItems - totalFinanceDepositPaid
      const balanceToCustomer = outstandingDepositAmountFinance > 0 ? outstandingDepositAmountFinance : 0 // input_98
      // CORRECTED: Customer Balance Due = Outstanding Deposit Amount (F) - only show if < 0.01
      const customerBalanceDue = outstandingDepositAmountFinance < 0.01 ? Math.abs(outstandingDepositAmountFinance) : 0 // input_99

      calculatedValues = {
        ...calculatedValues,
        subtotalFinance,
        balanceToCustomer,
        customerBalanceDue,
        balanceToFinanceCompany
      }
    }

    // Customer calculations (Gravity Forms: input_123, input_125, input_126)
    // subtotalCustomer already calculated above // input_123
    const amountPaid = customerAmountPaid // input_125
    const remainingBalance = Math.max(0, subtotalCustomer - amountPaid) // input_126

    // Trade Sale Balance Due calculation - subtract all payments from subtotal
    const tradeBalanceDue = currentIsTradeSale ? Math.max(0, subtotalCustomer - customerAmountPaid) : 0

    // VAT calculations - Used cars are VAT-exempt regardless of sale type
    const vatCommercial = 0 // Used cars are VAT-exempt (0% VAT)
    const remainingBalanceIncVat = remainingBalance + vatCommercial // input_133

    calculatedValues = {
      ...calculatedValues,
      subtotalCustomer,
      amountPaid,
      remainingBalance,
      tradeBalanceDue,
      vatCommercial,
      remainingBalanceIncVat
    }

    // Only update if any of the calculated values are different
    const needsUpdate = Object.entries(calculatedValues).some(([key, value]) => 
      formData[key as keyof FormData] !== value
    )

    if (needsUpdate) {
      updateFormData(calculatedValues)
    }
  }, [
    formData,
    isFinanceInvoice, 
    isCustomerInvoice, 
    isCommercialSale,
    updateFormData
  ])

  return (
    <div className="space-y-6">
      {/* Trade Sale - Only show Balance Due (after payments) */}
      {isTradeSale && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Balance Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* Balance Due for Trade Sales (Subtotal - All Payments) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Balance Due
              </label>
              <input
                type="number"
                value={formData.tradeBalanceDue || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                Subtotal minus all payments made (deposits, cash, card, BACS, part exchange)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Finance Company Balance Summary - Only show Balance to Finance */}
      {isFinanceInvoice && !isTradeSale && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Finance Company Balance Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Balance to Finance - input_97 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Balance to Finance
              </label>
              <input
                type="number"
                value={formData.balanceToFinanceCompany || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                Amount due to finance company
              </p>
            </div>
            
            {/* Balance to Customer - input_98 (Outstanding Deposit from Finance) - Only show if > 0 */}
            {(formData.balanceToCustomer || 0) > 0 && (
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Balance to Customer
                </label>
                <input
                  type="number"
                  value={formData.balanceToCustomer || ''}
                  readOnly
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-700 text-slate-300' 
                      : 'border-gray-200 bg-gray-100 text-gray-600'
                  }`}
                />
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                  Outstanding deposit amount due from customer
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Balance Summary - Only shown when Invoice To = Customer AND not Trade Sale */}
      {isCustomerInvoice && !isTradeSale && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Balance Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subtotal - input_123 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Subtotal
              </label>
              <input
                type="number"
                value={formData.subtotalCustomer || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
            </div>

            {/* Amount Paid - input_125 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Amount Paid
              </label>
              <input
                type="number"
                value={formData.amountPaid || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                All payments + Deposit payment
              </p>
            </div>

            {/* Remaining Balance - input_126 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Remaining Balance
              </label>
              <input
                type="number"
                value={formData.remainingBalance || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
            </div>
          </div>
        </div>
      )}


      {/* VAT Calculations for Commercial Sales */}
      {isCommercialSale && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            VAT Calculations (Commercial)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VAT Commercial - input_132 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                VAT Commercial
              </label>
              <input
                type="number"
                value={formData.vatCommercial || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                Commercial readiness
              </p>
            </div>

            {/* Remaining Balance INC VAT - input_133 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Remaining Balance INC VAT
              </label>
              <input
                type="number"
                value={formData.remainingBalanceIncVat || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                Commercial readiness - calc below
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional Information - input_114 */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Additional Information
        </label>
        <textarea
          value={formData.additionalInformation}
          onChange={(e) => handleInputChange('additionalInformation', e.target.value)}
          rows={10}
          cols={50}
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
              : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
          }`}
        />
      </div>

      {/* Terms of Service - In House Warranty */}
      {isInHouseWarranty && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Terms of Service
          </h3>
          
          <div className={`p-4 border-2 rounded-lg max-h-48 overflow-y-auto ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-800' 
              : 'border-gray-200 bg-white'
          }`}>
            <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              <p className="mb-2">
                I confirm that when purchasing the above vehicle, I have been offered the standard warranty cover but have chosen to opt for the minimum cover available instead.
              </p>
              <p>
                I am confirming my understanding of the above and that all the details listed are correct
              </p>
            </div>
          </div>
          
          {/* Terms of Service Checkbox - input_115.1 */}
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.termsOfServiceInHouse}
                onChange={(e) => handleInputChange('termsOfServiceInHouse', e.target.checked)}
                className={`w-4 h-4 text-blue-600 border-2 rounded focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                }`}
              />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                I agree to the in house warranty terms
              </span>
            </label>
            <p className={`text-xs ml-7 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Confirmation of In House Warranty Terms
            </p>
          </div>
        </div>
      )}

      {/* Terms of Service - Trade Sale */}
      {isTradeSale && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Terms of Service
          </h3>
          
          <div className={`p-4 border-2 rounded-lg max-h-48 overflow-y-auto ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-800' 
              : 'border-gray-200 bg-white'
          }`}>
            {isLoadingTerms ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-transparent border-t-blue-600"></div>
                <span className={`ml-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Loading terms...
                </span>
              </div>
            ) : (
              <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'} whitespace-pre-wrap`}>
                {tradeTerms || 'No trade terms available. Please contact your administrator to set up custom terms.'}
              </div>
            )}
          </div>
          
          {/* Trade Sale Terms Checkbox - input_127.1 */}
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.termsOfServiceTrade}
                onChange={(e) => handleInputChange('termsOfServiceTrade', e.target.checked)}
                className={`w-4 h-4 text-blue-600 border-2 rounded focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                }`}
              />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                I agree to the Trade Sale terms
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Customer has accepted the IDD - input_134 - Only for Finance Company Retail */}
      {!isTradeSale && isFinanceInvoice && (
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Customer has accepted the IDD
          </label>
          <select
            value={formData.customerAcceptedIdd}
            onChange={(e) => handleInputChange('customerAcceptedIdd', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          >
            <option value="N/A">N/A</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="On Collection">On Collection</option>
            <option value="Customer Decided Against Finance">Customer Decided Against Finance</option>
          </select>
        </div>
      )}

      {/* Customer Available for Signature - input_116 */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Customer Available for Signature
        </label>
        <select
          value={formData.customerAvailableSignature}
          onChange={(e) => handleInputChange('customerAvailableSignature', e.target.value)}
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

      {/* Customer Signature - input_117 */}
      {isSignatureAvailable && (
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Customer Signature
          </label>
          <SignatureCapture
            value={formData.customerSignature}
            onChange={(signature) => handleInputChange('customerSignature', signature)}
            width={400}
            height={200}
          />
          {errors.customerSignature && (
            <p className="text-xs text-red-500">{errors.customerSignature}</p>
          )}
        </div>
      )}

      {/* Date of Signature - input_128 */}
      {isSignatureAvailable && (
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Date of Signature
          </label>
          <input
            type="date"
            value={formData.dateOfSignature}
            onChange={(e) => handleInputChange('dateOfSignature', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>
      )}
    </div>
  )
}