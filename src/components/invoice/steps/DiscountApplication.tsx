import React, { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

interface AddonForDiscount {
  name: string
  cost: number
  isFixed: boolean
  fixedIndex?: number
  dynamicIndex?: number
}

export default function DiscountApplication({ formData, updateFormData }: Props) {
  const { isDarkMode } = useTheme()
  
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  // Helper function to handle dynamic discount updates
  const handleDynamicDiscountChange = (
    arrayType: 'customer' | 'finance',
    index: number,
    discountAmount: number
  ) => {
    const currentArray = arrayType === 'customer' 
      ? formData.customerAddonsDiscountArray || []
      : formData.financeAddonsDiscountArray || []
    
    const updatedArray = [...currentArray]
    updatedArray[index] = {
      ...updatedArray[index],
      discountAmount
    }
    
    const fieldName = arrayType === 'customer' 
      ? 'customerAddonsDiscountArray' 
      : 'financeAddonsDiscountArray'
    
    updateFormData({ [fieldName]: updatedArray })
  }

  // Helper function to handle combined customer add-on discount changes
  const handleCombinedCustomerDiscountChange = (addon: AddonForDiscount, discountAmount: number) => {
    if (addon.isFixed) {
      // Handle fixed add-on discounts
      const fieldName = addon.fixedIndex === 1 ? 'discountOnCustomerAddon1Price' : 'discountOnCustomerAddon2Price'
      handleInputChange(fieldName, discountAmount)
    } else {
      // Handle dynamic add-on discounts
      if (addon.dynamicIndex !== undefined) {
        handleDynamicDiscountChange('customer', addon.dynamicIndex, discountAmount)
      }
    }
  }

  // Helper function to get discount amount for combined customer add-ons
  const getCustomerDiscountAmount = (addon: AddonForDiscount) => {
    if (addon.isFixed) {
      return addon.fixedIndex === 1 
        ? formData.discountOnCustomerAddon1Price || 0
        : formData.discountOnCustomerAddon2Price || 0
    } else {
      if (addon.dynamicIndex !== undefined) {
        const discountData = (formData.customerAddonsDiscountArray || [])[addon.dynamicIndex] || {}
        return discountData.discountAmount || 0
      }
      return 0
    }
  }

  // Helper function to handle combined finance add-on discount changes
  const handleCombinedFinanceDiscountChange = (addon: AddonForDiscount, discountAmount: number) => {
    if (addon.isFixed) {
      // Handle fixed add-on discounts
      const fieldName = addon.fixedIndex === 1 ? 'discountOnFinanceAddon1Price' : 'discountOnFinanceAddon2Price'
      handleInputChange(fieldName, discountAmount)
    } else {
      // Handle dynamic add-on discounts
      if (addon.dynamicIndex !== undefined) {
        handleDynamicDiscountChange('finance', addon.dynamicIndex, discountAmount)
      }
    }
  }

  // Helper function to get discount amount for combined finance add-ons
  const getFinanceDiscountAmount = (addon: AddonForDiscount) => {
    if (addon.isFixed) {
      return addon.fixedIndex === 1 
        ? formData.discountOnFinanceAddon1Price || 0
        : formData.discountOnFinanceAddon2Price || 0
    } else {
      if (addon.dynamicIndex !== undefined) {
        const discountData = (formData.financeAddonsDiscountArray || [])[addon.dynamicIndex] || {}
        return discountData.discountAmount || 0
      }
      return 0
    }
  }

  // Combined Customer Add-ons (Fixed + Dynamic) for Discounts
  const allCustomerAddons: AddonForDiscount[] = []
  
  // Add fixed customer add-ons if they exist
  if (formData.customerAddon1 && formData.customerAddon1.trim()) {
    allCustomerAddons.push({
      name: formData.customerAddon1,
      cost: formData.customerAddon1Cost || 0,
      isFixed: true,
      fixedIndex: 1
    })
  }
  if (formData.customerAddon2 && formData.customerAddon2.trim()) {
    allCustomerAddons.push({
      name: formData.customerAddon2,
      cost: formData.customerAddon2Cost || 0,
      isFixed: true,
      fixedIndex: 2
    })
  }
  
  // Add dynamic customer add-ons
  ;(formData.customerAddonsArray || []).forEach((addon, index) => {
    if (addon.name && addon.name.trim()) {
      allCustomerAddons.push({
        name: addon.name,
        cost: addon.cost || 0,
        isFixed: false,
        dynamicIndex: index
      })
    }
  })

  // Combined Finance Add-ons (Fixed + Dynamic) for Discounts
  const allFinanceAddons: AddonForDiscount[] = []
  
  // Add fixed finance add-ons if they exist
  if (formData.financeAddon1 && formData.financeAddon1.trim()) {
    allFinanceAddons.push({
      name: formData.financeAddon1,
      cost: formData.financeAddon1Cost || 0,
      isFixed: true,
      fixedIndex: 1
    })
  }
  if (formData.financeAddon2 && formData.financeAddon2.trim()) {
    allFinanceAddons.push({
      name: formData.financeAddon2,
      cost: formData.financeAddon2Cost || 0,
      isFixed: true,
      fixedIndex: 2
    })
  }
  
  // Add dynamic finance add-ons
  ;(formData.financeAddonsArray || []).forEach((addon, index) => {
    if (addon.name && addon.name.trim()) {
      allFinanceAddons.push({
        name: addon.name,
        cost: addon.cost || 0,
        isFixed: false,
        dynamicIndex: index
      })
    }
  })

  // Calculate pre-discount values and post-discount values automatically
  useEffect(() => {
    // Only calculate if discounts are applied
    if (formData.applyDiscounts !== 'Yes') {
      return
    }
    // Sale Price Pre-Discount - input_67 (Calculated)
    const salePricePreDiscount = formData.salePrice || 0
    
    // Sale Price Post-Discount - input_68 (Calculated)
    const discountOnSalePrice = formData.discountOnSalePrice || 0
    const salePricePostDiscount = Math.max(0, salePricePreDiscount - discountOnSalePrice)
    
    // Warranty Price Pre-Discount - input_69 (Calculated)
    const warrantyPricePreDiscount = formData.warrantyPrice || 0
    
    // Warranty Price Post Discount - input_70 (Calculated)
    const discountOnWarrantyPrice = formData.discountOnWarrantyPrice || 0
    const warrantyPricePostDiscount = Math.max(0, warrantyPricePreDiscount - discountOnWarrantyPrice)
    
    // Delivery Price Pre-Discount - input_137 (Calculated)
    const deliveryPricePreDiscount = formData.deliveryCost || 0
    
    // Delivery Price Post Discount - input_139 (Calculated)
    const discountOnDeliveryPrice = formData.discountOnDeliveryPrice || 0
    const deliveryPricePostDiscount = Math.max(0, deliveryPricePreDiscount - discountOnDeliveryPrice)

    // Enhanced Warranty Price Pre-Discount (Calculated)
    const enhancedWarrantyPricePreDiscount = formData.enhancedWarrantyPrice || 0
    
    // Enhanced Warranty Price Post Discount (Calculated)
    const discountOnEnhancedWarrantyPrice = formData.discountOnEnhancedWarrantyPrice || 0
    const enhancedWarrantyPricePostDiscount = Math.max(0, enhancedWarrantyPricePreDiscount - discountOnEnhancedWarrantyPrice)

    // Dynamic Customer Add-ons Discounts (Calculated) - for dynamic array only
    const customerAddonsDiscountArray = (formData.customerAddonsArray || []).map((addon, index) => {
      const existingDiscount = (formData.customerAddonsDiscountArray || [])[index] || {}
      const pricePreDiscount = addon.cost || 0
      const discountAmount = existingDiscount.discountAmount || 0
      const pricePostDiscount = Math.max(0, pricePreDiscount - discountAmount)
      
      return {
        name: addon.name,
        pricePreDiscount,
        discountAmount,
        pricePostDiscount
      }
    })

    // Dynamic Finance Add-ons Discounts (Calculated) - for dynamic array only
    const financeAddonsDiscountArray = (formData.financeAddonsArray || []).map((addon, index) => {
      const existingDiscount = (formData.financeAddonsDiscountArray || [])[index] || {}
      const pricePreDiscount = addon.cost || 0
      const discountAmount = existingDiscount.discountAmount || 0
      const pricePostDiscount = Math.max(0, pricePreDiscount - discountAmount)
      
      return {
        name: addon.name,
        pricePreDiscount,
        discountAmount,
        pricePostDiscount
      }
    })

    // Customer Add-on 1 Price Pre-Discount (Calculated) - Keep for backward compatibility
    const customerAddon1PricePreDiscount = formData.customerAddon1Cost || 0
    
    // Customer Add-on 1 Price Post Discount (Calculated)
    const discountOnCustomerAddon1Price = formData.discountOnCustomerAddon1Price || 0
    const customerAddon1PricePostDiscount = Math.max(0, customerAddon1PricePreDiscount - discountOnCustomerAddon1Price)

    // Customer Add-on 2 Price Pre-Discount (Calculated)
    const customerAddon2PricePreDiscount = formData.customerAddon2Cost || 0
    
    // Customer Add-on 2 Price Post Discount (Calculated)
    const discountOnCustomerAddon2Price = formData.discountOnCustomerAddon2Price || 0
    const customerAddon2PricePostDiscount = Math.max(0, customerAddon2PricePreDiscount - discountOnCustomerAddon2Price)

    // Finance Add-on 1 Price Pre-Discount (Calculated)
    const financeAddon1PricePreDiscount = formData.financeAddon1Cost || 0
    
    // Finance Add-on 1 Price Post Discount (Calculated)
    const discountOnFinanceAddon1Price = formData.discountOnFinanceAddon1Price || 0
    const financeAddon1PricePostDiscount = Math.max(0, financeAddon1PricePreDiscount - discountOnFinanceAddon1Price)

    // Finance Add-on 2 Price Pre-Discount (Calculated)
    const financeAddon2PricePreDiscount = formData.financeAddon2Cost || 0
    
    // Finance Add-on 2 Price Post Discount (Calculated)
    const discountOnFinanceAddon2Price = formData.discountOnFinanceAddon2Price || 0
    const financeAddon2PricePostDiscount = Math.max(0, financeAddon2PricePreDiscount - discountOnFinanceAddon2Price)

    // Check if dynamic arrays have changed
    const customerArraysChanged = JSON.stringify(formData.customerAddonsDiscountArray || []) !== JSON.stringify(customerAddonsDiscountArray)
    const financeArraysChanged = JSON.stringify(formData.financeAddonsDiscountArray || []) !== JSON.stringify(financeAddonsDiscountArray)

    // Only update if any of the calculated values are different
    const needsUpdate = 
      formData.salePricePreDiscount !== salePricePreDiscount ||
      formData.salePricePostDiscount !== salePricePostDiscount ||
      formData.warrantyPricePreDiscount !== warrantyPricePreDiscount ||
      formData.warrantyPricePostDiscount !== warrantyPricePostDiscount ||
      formData.deliveryPricePreDiscount !== deliveryPricePreDiscount ||
      formData.deliveryPricePostDiscount !== deliveryPricePostDiscount ||
      formData.enhancedWarrantyPricePreDiscount !== enhancedWarrantyPricePreDiscount ||
      formData.enhancedWarrantyPricePostDiscount !== enhancedWarrantyPricePostDiscount ||
      formData.customerAddon1PricePreDiscount !== customerAddon1PricePreDiscount ||
      formData.customerAddon1PricePostDiscount !== customerAddon1PricePostDiscount ||
      formData.customerAddon2PricePreDiscount !== customerAddon2PricePreDiscount ||
      formData.customerAddon2PricePostDiscount !== customerAddon2PricePostDiscount ||
      formData.financeAddon1PricePreDiscount !== financeAddon1PricePreDiscount ||
      formData.financeAddon1PricePostDiscount !== financeAddon1PricePostDiscount ||
      formData.financeAddon2PricePreDiscount !== financeAddon2PricePreDiscount ||
      formData.financeAddon2PricePostDiscount !== financeAddon2PricePostDiscount ||
      customerArraysChanged ||
      financeArraysChanged

    if (needsUpdate) {
      updateFormData({
        salePricePreDiscount,
        salePricePostDiscount,
        warrantyPricePreDiscount,
        warrantyPricePostDiscount,
        deliveryPricePreDiscount,
        deliveryPricePostDiscount,
        enhancedWarrantyPricePreDiscount,
        enhancedWarrantyPricePostDiscount,
        customerAddon1PricePreDiscount,
        customerAddon1PricePostDiscount,
        customerAddon2PricePreDiscount,
        customerAddon2PricePostDiscount,
        financeAddon1PricePreDiscount,
        financeAddon1PricePostDiscount,
        financeAddon2PricePreDiscount,
        financeAddon2PricePostDiscount,
        customerAddonsDiscountArray,
        financeAddonsDiscountArray
      })
    }
  }, [
    formData.applyDiscounts,
    formData.salePrice, formData.discountOnSalePrice,
    formData.warrantyPrice, formData.discountOnWarrantyPrice,
    formData.deliveryCost, formData.discountOnDeliveryPrice,
    formData.enhancedWarrantyPrice, formData.discountOnEnhancedWarrantyPrice,
    formData.customerAddon1Cost, formData.discountOnCustomerAddon1Price,
    formData.customerAddon2Cost, formData.discountOnCustomerAddon2Price,
    formData.financeAddon1Cost, formData.discountOnFinanceAddon1Price,
    formData.financeAddon2Cost, formData.discountOnFinanceAddon2Price,
    formData.customerAddonsArray, formData.customerAddonsDiscountArray,
    formData.financeAddonsArray, formData.financeAddonsDiscountArray,
    formData.salePricePreDiscount, formData.salePricePostDiscount,
    formData.warrantyPricePreDiscount, formData.warrantyPricePostDiscount,
    formData.deliveryPricePreDiscount, formData.deliveryPricePostDiscount,
    formData.enhancedWarrantyPricePreDiscount, formData.enhancedWarrantyPricePostDiscount,
    formData.customerAddon1PricePreDiscount, formData.customerAddon1PricePostDiscount,
    formData.customerAddon2PricePreDiscount, formData.customerAddon2PricePostDiscount,
    formData.financeAddon1PricePreDiscount, formData.financeAddon1PricePostDiscount,
    formData.financeAddon2PricePreDiscount, formData.financeAddon2PricePostDiscount,
    updateFormData
  ])

  // This component is only shown when applyDiscounts === 'Yes'
  if (formData.applyDiscounts !== 'Yes') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Information Notice */}
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
              Discount Application
            </h3>
            <div className={`mt-2 text-sm ${
              isDarkMode ? 'text-green-200' : 'text-green-700'
            }`}>
              <p>
                This section is only shown when &ldquo;Apply Discounts&rdquo; is set to &ldquo;Yes&rdquo;.
                Enter discount amounts to be applied to sale price, warranty, and delivery costs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Price Discounts */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Sale Price Discounts
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sale Price Pre-Discount - input_67 (Calculated) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Sale Price Pre-Discount
            </label>
            <input
              type="number"
              value={formData.salePricePreDiscount || ''}
              readOnly
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-700 text-slate-300' 
                  : 'border-gray-200 bg-gray-100 text-gray-600'
              }`}
            />
          </div>

          {/* Discount on Sale Price - input_64 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Discount on Sale Price
            </label>
            <input
              type="number"
              value={formData.discountOnSalePrice || ''}
              onChange={(e) => handleInputChange('discountOnSalePrice', parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* Sale Price Post-Discount - input_68 (Calculated) */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`} title="Formula: Sale Price Pre-Discount - Discount Amount">
            Sale Price Post-Discount
          </label>
            <input
              type="number"
              value={formData.salePricePostDiscount ?? ''}
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

      {/* Warranty Price Discounts */}
      {formData.saleType !== 'Trade' && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Warranty Price Discounts
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Warranty Price Pre-Discount - input_69 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Warranty Price Pre-Discount
              </label>
              <input
                type="number"
                value={formData.warrantyPricePreDiscount || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
            </div>

            {/* Discount on Warranty Price - input_65 */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Discount on Warranty Price
              </label>
              <input
                type="number"
                value={formData.discountOnWarrantyPrice || ''}
                onChange={(e) => handleInputChange('discountOnWarrantyPrice', parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>

            {/* Warranty Price Post Discount - input_70 (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Warranty Price Post Discount
              </label>
              <input
                type="number"
                value={formData.warrantyPricePostDiscount ?? ''}
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

      {/* Delivery Price Discounts */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Delivery Price Discounts
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Delivery Price Pre-Discount - input_137 (Calculated) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Delivery Price Pre-Discount
            </label>
            <input
              type="number"
              value={formData.deliveryPricePreDiscount || ''}
              readOnly
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-700 text-slate-300' 
                  : 'border-gray-200 bg-gray-100 text-gray-600'
              }`}
            />
          </div>

          {/* Discount on Delivery Price - input_138 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Discount on Delivery Price
            </label>
            <input
              type="number"
              value={formData.discountOnDeliveryPrice || ''}
              onChange={(e) => handleInputChange('discountOnDeliveryPrice', parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* Delivery Price Post Discount - input_139 (Calculated) */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Delivery Price Post Discount
            </label>
            <input
              type="number"
              value={formData.deliveryPricePostDiscount ?? ''}
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

      {/* Enhanced Warranty Price Discounts - Only show when enhanced warranty is enabled and not Trade */}
      {formData.saleType !== 'Trade' && formData.enhancedWarranty === 'Yes' && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Enhanced Warranty Price Discounts
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Enhanced Warranty Price Pre-Discount (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Enhanced Warranty Price Pre-Discount
              </label>
              <input
                type="number"
                value={formData.enhancedWarrantyPricePreDiscount || ''}
                readOnly
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-700 text-slate-300' 
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}
              />
            </div>

            {/* Discount on Enhanced Warranty Price */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Discount on Enhanced Warranty Price
              </label>
              <input
                type="number"
                value={formData.discountOnEnhancedWarrantyPrice || ''}
                onChange={(e) => handleInputChange('discountOnEnhancedWarrantyPrice', parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>

            {/* Enhanced Warranty Price Post Discount (Calculated) */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Enhanced Warranty Price Post Discount
              </label>
              <input
                type="number"
                value={formData.enhancedWarrantyPricePostDiscount ?? ''}
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

      {/* Customer Add-ons Price Discounts - Combined (Fixed + Dynamic) - Only show when customer addons are enabled */}
      {formData.customerAddons === 'Yes' && allCustomerAddons.length > 0 && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Customer Add-ons Price Discounts
          </h3>
          
          {/* Combined Customer Add-ons Discounts (Fixed + Dynamic) */}
          {allCustomerAddons.map((addon) => {
            const discountAmount = getCustomerDiscountAmount(addon)
            const postDiscountPrice = Math.max(0, addon.cost - discountAmount)
            
            return (
              <div key={`customer-addon-${addon.isFixed ? `fixed-${addon.fixedIndex}` : `dynamic-${addon.dynamicIndex}`}`} className="space-y-2">
                <h4 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  {addon.name} Discounts
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Price Pre-Discount (Calculated) */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Price Pre-Discount
                    </label>
                    <input
                      type="number"
                      value={addon.cost || ''}
                      readOnly
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-700 text-slate-300' 
                          : 'border-gray-200 bg-gray-100 text-gray-600'
                      }`}
                    />
                  </div>

                  {/* Discount Amount */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Discount Amount
                    </label>
                    <input
                      type="number"
                      value={discountAmount || ''}
                      onChange={(e) => handleCombinedCustomerDiscountChange(addon, parseFloat(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>

                  {/* Price Post Discount (Calculated) */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Price Post Discount
                    </label>
                    <input
                      type="number"
                      value={postDiscountPrice}
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
            )
          })}
        </div>
      )}

      {/* Finance Add-ons Price Discounts - Combined (Fixed + Dynamic) - Only show when invoice is to Finance Company and finance addons are enabled */}
      {formData.invoiceTo === 'Finance Company' && formData.addonsToFinance === 'Yes' && allFinanceAddons.length > 0 && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Finance Add-ons Price Discounts
          </h3>
          
          {/* Combined Finance Add-ons Discounts (Fixed + Dynamic) */}
          {allFinanceAddons.map((addon) => {
            const discountAmount = getFinanceDiscountAmount(addon)
            const postDiscountPrice = Math.max(0, addon.cost - discountAmount)
            
            return (
              <div key={`finance-addon-${addon.isFixed ? `fixed-${addon.fixedIndex}` : `dynamic-${addon.dynamicIndex}`}`} className="space-y-2">
                <h4 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  {addon.name} Discounts
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Price Pre-Discount (Calculated) */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Price Pre-Discount
                    </label>
                    <input
                      type="number"
                      value={addon.cost || ''}
                      readOnly
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-700 text-slate-300' 
                          : 'border-gray-200 bg-gray-100 text-gray-600'
                      }`}
                    />
                  </div>

                  {/* Discount Amount */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Discount Amount
                    </label>
                    <input
                      type="number"
                      value={discountAmount || ''}
                      onChange={(e) => handleCombinedFinanceDiscountChange(addon, parseFloat(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>

                  {/* Price Post Discount (Calculated) */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Price Post Discount
                    </label>
                    <input
                      type="number"
                      value={postDiscountPrice}
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
            )
          })}
        </div>
      )}

    </div>
  )
}