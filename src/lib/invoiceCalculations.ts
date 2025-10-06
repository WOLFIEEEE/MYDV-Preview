import { FormData } from '@/components/invoice/InvoiceForm'

/**
 * Comprehensive invoice calculation utilities matching Gravity Forms logic
 * All calculations are based on the exact field mappings from the Gravity Forms structure
 */

export interface CalculationResult {
  // Date calculations
  monthOfSale: string
  quarterOfSale: number
  daysInStock: number

  // Discount calculations
  salePricePreDiscount: number
  salePricePostDiscount: number
  warrantyPricePreDiscount: number
  warrantyPricePostDiscount: number
  deliveryPricePreDiscount: number
  deliveryPricePostDiscount: number

  // Part exchange calculations
  amountPaidPartExchange: number

  // Finance deposit calculations
  compulsorySaleDepositFinance: number
  outstandingDepositAmountFinance: number
  overpaymentsFinance: number

  // Customer deposit calculations
  compulsorySaleDepositCustomer: number
  outstandingDepositAmountCustomer: number
  overpaymentsCustomer: number

  // Balance calculations
  balanceToFinance: number
  paidFromBalance: number
  subtotalFinance: number
  balanceToCustomer: number
  customerBalanceDue: number
  balanceToFinanceCompany: number
  subtotalCustomer: number
  amountPaid: number
  remainingBalance: number
  vatCommercial: number
  remainingBalanceIncVat: number
}

/**
 * Calculate month and quarter from date of sale
 */
export function calculateDateFields(dateOfSale: string): { monthOfSale: string; quarterOfSale: number } {
  if (!dateOfSale) {
    return { monthOfSale: '', quarterOfSale: 0 }
  }

  const date = new Date(dateOfSale)
  const month = date.toLocaleString('default', { month: 'long' })
  const quarter = Math.ceil((date.getMonth() + 1) / 3)

  return { monthOfSale: month, quarterOfSale: quarter }
}

/**
 * Calculate days in stock (date of sale - date of purchase)
 */
export function calculateDaysInStock(dateOfSale: string, dateOfPurchase: string): number {
  if (!dateOfSale || !dateOfPurchase) {
    return 0
  }

  const saleDate = new Date(dateOfSale)
  const purchaseDate = new Date(dateOfPurchase)
  const diffTime = Math.abs(saleDate.getTime() - purchaseDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Calculate discount-related fields
 */
export function calculateDiscounts(formData: FormData): {
  salePricePreDiscount: number
  salePricePostDiscount: number
  warrantyPricePreDiscount: number
  warrantyPricePostDiscount: number
  deliveryPricePreDiscount: number
  deliveryPricePostDiscount: number
} {
  // Sale Price calculations
  const salePricePreDiscount = formData.salePrice || 0
  const discountOnSalePrice = formData.discountOnSalePrice || 0
  const salePricePostDiscount = Math.max(0, salePricePreDiscount - discountOnSalePrice)

  // Warranty Price calculations
  const warrantyPricePreDiscount = formData.warrantyPrice || 0
  const discountOnWarrantyPrice = formData.discountOnWarrantyPrice || 0
  const warrantyPricePostDiscount = Math.max(0, warrantyPricePreDiscount - discountOnWarrantyPrice)

  // Delivery Price calculations
  const deliveryPricePreDiscount = formData.deliveryCost || 0
  const discountOnDeliveryPrice = formData.discountOnDeliveryPrice || 0
  const deliveryPricePostDiscount = Math.max(0, deliveryPricePreDiscount - discountOnDeliveryPrice)

  return {
    salePricePreDiscount,
    salePricePostDiscount,
    warrantyPricePreDiscount,
    warrantyPricePostDiscount,
    deliveryPricePreDiscount,
    deliveryPricePostDiscount
  }
}

/**
 * Calculate part exchange amount (PX Value - Settlement Amount)
 */
export function calculatePartExchange(formData: FormData): number {
  if (formData.partExIncluded !== 'Yes') {
    return 0
  }

  const pxValue = formData.valueOfPxVehicle || 0
  const settlement = formData.settlementAmount || 0
  return Math.max(0, pxValue - settlement)
}

/**
 * Calculate finance deposit amounts
 */
export function calculateFinanceDeposits(formData: FormData): {
  compulsorySaleDepositFinance: number
  outstandingDepositAmountFinance: number
  overpaymentsFinance: number
} {
  if (formData.invoiceTo !== 'Finance Company') {
    return {
      compulsorySaleDepositFinance: 0,
      outstandingDepositAmountFinance: 0,
      overpaymentsFinance: 0
    }
  }

  // Calculate compulsory deposit - Formula: Warranty + Delivery + Customer Add-ons - Warranty Discount
  const warrantyPrice = formData.warrantyPricePostDiscount ?? formData.warrantyPrice ?? 0
  const deliveryPrice = formData.deliveryPricePostDiscount ?? formData.deliveryCost ?? 0
  const customerAddon1Cost = formData.customerAddon1Cost || 0
  const customerAddon2Cost = formData.customerAddon2Cost || 0
  const discountOnWarranty = formData.discountOnWarrantyPrice || 0
  
  const compulsorySaleDepositFinance = warrantyPrice + deliveryPrice + customerAddon1Cost + customerAddon2Cost - discountOnWarranty

  // Use combined total finance deposit paid (dealer deposit paid + finance deposit paid)
  const totalFinanceDepositPaid = (formData.dealerDepositPaidCustomer || 0) + (formData.amountPaidDepositFinance || 0)
  const outstandingDepositAmountFinance = Math.max(0, compulsorySaleDepositFinance - totalFinanceDepositPaid)
  const overpaymentsFinance = Math.max(0, totalFinanceDepositPaid - compulsorySaleDepositFinance)

  return {
    compulsorySaleDepositFinance,
    outstandingDepositAmountFinance,
    overpaymentsFinance
  }
}

/**
 * Calculate customer deposit amounts
 */
export function calculateCustomerDeposits(formData: FormData): {
  compulsorySaleDepositCustomer: number
  outstandingDepositAmountCustomer: number
  overpaymentsCustomer: number
} {
  if (formData.invoiceTo !== 'Customer') {
    return {
      compulsorySaleDepositCustomer: 0,
      outstandingDepositAmountCustomer: 0,
      overpaymentsCustomer: 0
    }
  }

  // For customer invoices, only dealer-imposed deposit is required
  const compulsorySaleDepositCustomer = formData.dealerDeposit || 0
  const amountPaidDepositCustomer = formData.amountPaidDepositCustomer || 0
  const outstandingDepositAmountCustomer = Math.max(0, compulsorySaleDepositCustomer - amountPaidDepositCustomer)
  const overpaymentsCustomer = Math.max(0, amountPaidDepositCustomer - compulsorySaleDepositCustomer)

  return {
    compulsorySaleDepositCustomer,
    outstandingDepositAmountCustomer,
    overpaymentsCustomer
  }
}

/**
 * Calculate balance and payment totals
 */
export function calculateBalances(formData: FormData): {
  balanceToFinance: number
  paidFromBalance: number
  subtotalFinance: number
  balanceToCustomer: number
  customerBalanceDue: number
  balanceToFinanceCompany: number
  subtotalCustomer: number
  amountPaid: number
  remainingBalance: number
  vatCommercial: number
  remainingBalanceIncVat: number
} {
  // Calculate total sale amount
  const salePrice = formData.salePricePostDiscount || formData.salePrice || 0
  const warrantyPrice = formData.warrantyPricePostDiscount ?? formData.warrantyPrice ?? 0
  const deliveryPrice = formData.deliveryPricePostDiscount ?? formData.deliveryCost ?? 0
  const financeAddons = (formData.financeAddon1Cost || 0) + (formData.financeAddon2Cost || 0)
  const customerAddons = (formData.customerAddon1Cost || 0) + (formData.customerAddon2Cost || 0)
  
  const totalSaleAmount = salePrice + warrantyPrice + deliveryPrice + financeAddons + customerAddons

  // Calculate total direct payments
  const totalDirectPayments = (formData.amountPaidCard || 0) + 
                             (formData.amountPaidBacs || 0) + 
                             (formData.amountPaidCash || 0) + 
                             (formData.amountPaidPartExchange || 0)

  // Calculate total deposit payments
  const totalDepositPayments = (formData.amountPaidDepositFinance || 0) + 
                              (formData.amountPaidDepositCustomer || 0)

  // Calculate balance to finance - Formula: Sale Price + Settlement + Finance Add-ons - Overpayments - Direct Payments
  const settlementAmount = formData.settlementAmount || 0
  const overpaymentsFinance = formData.overpaymentsFinance || 0
  const balanceToFinance = Math.max(0, 
    salePrice + 
    settlementAmount + 
    financeAddons - 
    overpaymentsFinance - 
    totalDirectPayments - 
    totalDepositPayments
  )
  const paidFromBalance = totalDirectPayments

  // Finance company calculations
  const subtotalFinance = totalSaleAmount
  const balanceToCustomer = Math.max(0, totalSaleAmount - balanceToFinance)
  const customerBalanceDue = Math.max(0, balanceToCustomer - (totalDirectPayments + totalDepositPayments))
  const balanceToFinanceCompany = balanceToFinance

  // Customer calculations
  const subtotalCustomer = totalSaleAmount
  const amountPaid = totalDirectPayments + totalDepositPayments
  const remainingBalance = Math.max(0, subtotalCustomer - amountPaid)

  // VAT calculations - Used cars are VAT-exempt regardless of sale type
  const vatCommercial = 0 // Used cars are VAT-exempt (0% VAT)
  const remainingBalanceIncVat = remainingBalance + vatCommercial

  return {
    balanceToFinance,
    paidFromBalance,
    subtotalFinance,
    balanceToCustomer,
    customerBalanceDue,
    balanceToFinanceCompany,
    subtotalCustomer,
    amountPaid,
    remainingBalance,
    vatCommercial,
    remainingBalanceIncVat
  }
}

/**
 * Main calculation function that performs all calculations
 */
export function calculateAllFields(formData: FormData): CalculationResult {
  // Date calculations
  const { monthOfSale, quarterOfSale } = calculateDateFields(formData.dateOfSale)
  const daysInStock = calculateDaysInStock(formData.dateOfSale, formData.dateOfPurchase)

  // Discount calculations
  const discountResults = calculateDiscounts(formData)

  // Part exchange calculation
  const amountPaidPartExchange = calculatePartExchange(formData)

  // Deposit calculations
  const financeDeposits = calculateFinanceDeposits(formData)
  const customerDeposits = calculateCustomerDeposits(formData)

  // Balance calculations
  const balanceResults = calculateBalances({
    ...formData,
    amountPaidPartExchange, // Include calculated PX amount
    ...discountResults, // Include calculated discount amounts
    ...financeDeposits, // Include calculated finance deposits
    ...customerDeposits // Include calculated customer deposits
  })

  return {
    monthOfSale,
    quarterOfSale,
    daysInStock,
    ...discountResults,
    amountPaidPartExchange,
    ...financeDeposits,
    ...customerDeposits,
    ...balanceResults
  }
}

/**
 * Utility function to update form data with calculated values
 */
export function updateFormDataWithCalculations(
  formData: FormData, 
  updateFormData: (updates: Partial<FormData>) => void
): void {
  const calculations = calculateAllFields(formData)
  updateFormData(calculations)
}

/**
 * Validation function to check if all required calculations are present
 */
export function validateCalculations(formData: FormData): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = []

  // Check required date calculations
  if (formData.dateOfSale && !formData.monthOfSale) {
    missingFields.push('monthOfSale')
  }
  if (formData.dateOfSale && !formData.quarterOfSale) {
    missingFields.push('quarterOfSale')
  }

  // Check discount calculations if discounts are applied
  if (formData.applyDiscounts === 'Yes') {
    if (!formData.salePricePreDiscount) missingFields.push('salePricePreDiscount')
    if (!formData.salePricePostDiscount) missingFields.push('salePricePostDiscount')
  }

  // Check deposit calculations based on invoice type
  if (formData.invoiceTo === 'Finance Company') {
    if (!formData.compulsorySaleDepositFinance) missingFields.push('compulsorySaleDepositFinance')
  }
  if (formData.invoiceTo === 'Customer') {
    if (!formData.compulsorySaleDepositCustomer) missingFields.push('compulsorySaleDepositCustomer')
  }

  // Check balance calculations
  if (!formData.subtotalCustomer) missingFields.push('subtotalCustomer')
  if (!formData.remainingBalance) missingFields.push('remainingBalance')

  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}
