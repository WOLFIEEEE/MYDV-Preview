'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LoadingOverlay } from '@/components/ui/loading-spinner'
import { ChevronLeft, ChevronRight, FileText, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery'

// Step components
import VehicleSaleInformation from './steps/VehicleSaleInformation'
import CustomerDetails from './steps/CustomerDetails'
import FinanceCompanyDetails from './steps/FinanceCompanyDetails'
import WarrantyAddons from './steps/WarrantyAddons'
import DealerDepositDelivery from './steps/DealerDepositDelivery'
import DiscountApplication from './steps/DiscountApplication'
import FinanceDepositPayments from './steps/FinanceDepositPayments'
import CustomerDepositPayments from './steps/CustomerDepositPayments'
import PaymentsAgainstBalance from './steps/PaymentsAgainstBalance'
import BalanceSummary from './steps/BalanceSummary'
import ChecklistValidation from './steps/ChecklistValidation'

// Types
export interface FormData {
  // Step 1: Vehicle & Sale Information
  saleType: string
  invoiceNumber: string
  invoiceTo: string
  vehicleRegistration: string
  make: string
  model: string
  colour: string
  salePrice: number
  dateOfSale: string
  monthOfSale: string
  quarterOfSale: number
  costOfPurchase: number
  dateOfPurchase: string
  vin: string
  derivative: string
  fuelType: string
  engineNumber: string
  engineCapacity: string
  firstRegDate: string
  daysInStock: number

  // Step 2: Customer Details
  title: string
  firstName: string
  middleName: string
  surname: string
  address: {
    street: string
    address2: string
    city: string
    county: string
    postCode: string
    country: string
  }
  contactNumber: string
  emailAddress: string

  // Step 3: Finance Company Details
  financeCompany: string
  financeCompanyName: string
  financeStreetAddress: string
  financeCountyPostCode: string

  // Step 4: Warranty and Add-ons
  warrantyLevel: string
  warrantyName: string
  inHouse: string
  warrantyPrice: number
  warrantyDetails: string
  // Enhanced/Upgraded Warranty
  enhancedWarranty: string // 'Yes' | 'No' | ''
  enhancedWarrantyLevel: string
  enhancedWarrantyName: string
  enhancedWarrantyPrice: number
  enhancedWarrantyDetails: string
  addonsToFinance: string
  financeAddon1: string
  financeAddon1Cost: number
  financeAddon2: string
  financeAddon2Cost: number
  // Dynamic finance add-ons array
  financeAddonsArray: Array<{
    name: string
    cost: number
  }>
  customerAddons: string
  customerAddon1: string
  customerAddon1Cost: number
  customerAddon2: string
  customerAddon2Cost: number
  // Dynamic customer add-ons array
  customerAddonsArray: Array<{
    name: string
    cost: number
  }>
  // Dynamic customer add-ons discount arrays
  customerAddonsDiscountArray: Array<{
    name: string
    pricePreDiscount: number
    discountAmount: number
    pricePostDiscount: number
  }>
  // Dynamic finance add-ons discount arrays
  financeAddonsDiscountArray: Array<{
    name: string
    pricePreDiscount: number
    discountAmount: number
    pricePostDiscount: number
  }>
  applyDiscounts: string

  // Step 5: Dealer Deposit and Delivery
  dealerDeposit: number // input_33 - Dealer Deposit
  deliveryOptions: string // input_34 - Delivery Options (Collection/Delivery radio)
  collection: string // input_32 - Collection (readonly "FREE")
  deliveryCost: number // input_35 - Delivery Cost
  dateOfCollectionDelivery: string // input_129 - Date of Collection / Delivery
  // Dealer Deposit Payment (for Finance Company invoices only)
  dealerDepositPaidCustomer: number // Dealer Deposit Paid (Customer)
  dealerDepositPaymentDateCustomer: string // Payment Date (Customer)

  // Step 6: Discount Application
  salePricePreDiscount: number
  discountOnSalePrice: number
  salePricePostDiscount: number
  warrantyPricePreDiscount: number
  discountOnWarrantyPrice: number
  warrantyPricePostDiscount: number
  deliveryPricePreDiscount: number
  discountOnDeliveryPrice: number
  deliveryPricePostDiscount: number
  // Enhanced Warranty Discounts
  enhancedWarrantyPricePreDiscount: number
  discountOnEnhancedWarrantyPrice: number
  enhancedWarrantyPricePostDiscount: number
  // Customer Add-ons Discounts
  customerAddon1PricePreDiscount: number
  discountOnCustomerAddon1Price: number
  customerAddon1PricePostDiscount: number
  customerAddon2PricePreDiscount: number
  discountOnCustomerAddon2Price: number
  customerAddon2PricePostDiscount: number
  // Finance Add-ons Discounts (when invoice to Finance Company)
  financeAddon1PricePreDiscount: number
  discountOnFinanceAddon1Price: number
  financeAddon1PricePostDiscount: number
  financeAddon2PricePreDiscount: number
  discountOnFinanceAddon2Price: number
  financeAddon2PricePostDiscount: number

  // Step 7: Finance Deposit Payments
  compulsorySaleDepositFinance: number
  amountPaidDepositFinance: number
  totalFinanceDepositPaid: number // Combined: dealerDepositPaidCustomer + amountPaidDepositFinance
  depositDateFinance: string
  outstandingDepositAmountFinance: number
  overpaymentsFinance: number

  // Step 8: Customer Deposit Payments
  compulsorySaleDepositCustomer: number
  amountPaidDepositCustomer: number
  depositDateCustomer: string
  outstandingDepositAmountCustomer: number
  overpaymentsCustomer: number

  // Step 9: Payments Against Balance
  partExIncluded: string
  pxVehicleRegistration: string
  pxMakeModel: string
  pxMileage: number
  valueOfPxVehicle: number
  settlementAmount: number
  // Multiple Payment Entries
  cardPayments: Array<{ amount: number; date: string }>
  bacsPayments: Array<{ amount: number; date: string }>
  cashPayments: Array<{ amount: number; date: string }>
  // Legacy single payment fields (for backward compatibility)
  amountPaidCard: number
  dateOfCard: string
  amountPaidBacs: number
  dateOfBacs: string
  amountPaidCash: number
  dateOfCash: string
  amountPaidPartExchange: number
  dateOfPx: string
  balanceToFinance: number
  paidFromBalance: number

  // Step 10: Balance Summary
  subtotalFinance: number
  balanceToCustomer: number
  customerBalanceDue: number
  balanceToFinanceCompany: number
  subtotalCustomer: number
  amountPaid: number
  remainingBalance: number
  tradeBalanceDue: number
  vatCommercial: number
  remainingBalanceIncVat: number
  additionalInformation: string
  termsOfServiceInHouse: boolean
  termsOfServiceTrade: boolean
  customerAcceptedIdd: string
  customerAvailableSignature: string
  customerSignature: string
  dateOfSignature: string

  // Step 11: Checklist Validation
  stockId?: string // For loading checklist data
  mileage: number
  cambeltChainConfirmation: string
  fuelTypeChecklist: string
  numberOfKeys: string
  serviceHistoryRecord: string
  userManual: string
  wheelLockingNut: string
  dealerPreSaleCheck: string
  vehicleInspectionTestDrive: string
}

interface StepConfig {
  id: string
  title: string
  component: React.ComponentType<StepProps>
  isVisible: (formData: FormData) => boolean
}

interface StepProps {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

const STEPS: StepConfig[] = [
  {
    id: 'vehicle-sale',
    title: 'Vehicle & Sale Information',
    component: VehicleSaleInformation,
    isVisible: () => true
  },
  {
    id: 'customer-details',
    title: 'Customer Details',
    component: CustomerDetails,
    isVisible: () => true
  },
  {
    id: 'finance-company',
    title: 'Finance Company Details',
    component: FinanceCompanyDetails,
    isVisible: (formData) => formData.saleType === 'Retail' && formData.invoiceTo === 'Finance Company'
  },
  {
    id: 'warranty-addons',
    title: 'Warranty and Add-ons',
    component: WarrantyAddons,
    isVisible: () => true
  },
  {
    id: 'dealer-deposit',
    title: 'Dealer Deposit and Delivery',
    component: DealerDepositDelivery,
    isVisible: () => true
  },
  {
    id: 'discount-application',
    title: 'Discount Application',
    component: DiscountApplication,
    isVisible: (formData) => formData.applyDiscounts === 'Yes'
  },
  {
    id: 'finance-deposits',
    title: 'Finance Deposit Payments',
    component: FinanceDepositPayments,
    isVisible: (formData) => formData.saleType === 'Retail' && formData.invoiceTo === 'Finance Company'
  },
  {
    id: 'customer-deposits',
    title: 'Deposit Payments',
    component: CustomerDepositPayments,
    isVisible: (formData) => {
      // Show for Trade and Commercial sales
      if (formData.saleType === 'Trade' || formData.saleType === 'Commercial') {
        return true
      }
      // Show for Retail sales only when invoicing to Customer (not Finance Company)
      if (formData.saleType === 'Retail' && formData.invoiceTo === 'Customer') {
        return true
      }
      return false
    }
  },
  {
    id: 'payments-balance',
    title: 'Payments Against Balance',
    component: PaymentsAgainstBalance,
    isVisible: () => true
  },
  {
    id: 'balance-summary',
    title: 'Balance Summary',
    component: BalanceSummary,
    isVisible: () => true
  },
  {
    id: 'checklist-validation',
    title: 'Checklist Validation',
    component: ChecklistValidation,
    isVisible: (formData) => formData.saleType !== 'Trade'
  }
]

const initialFormData: FormData = {
  // Initialize all fields with empty values
  saleType: '',
  invoiceNumber: '',
  invoiceTo: '',
  vehicleRegistration: '',
  make: '',
  model: '',
  colour: '',
  salePrice: 0,
  dateOfSale: '',
  monthOfSale: '',
  quarterOfSale: 0,
  costOfPurchase: 0,
  dateOfPurchase: '',
  vin: '',
  derivative: '',
  fuelType: '',
  engineNumber: '',
  engineCapacity: '',
  firstRegDate: '',
  daysInStock: 0,
  title: '',
  firstName: '',
  middleName: '',
  surname: '',
  address: {
    street: '',
    address2: '',
    city: '',
    county: '',
    postCode: '',
    country: 'United Kingdom'
  },
  contactNumber: '',
  emailAddress: '',
  financeCompany: '',
  financeCompanyName: '',
  financeStreetAddress: '',
  financeCountyPostCode: '',
  warrantyLevel: '',
  warrantyName: '',
  inHouse: '',
  warrantyPrice: 0,
  warrantyDetails: '',
  // Enhanced/Upgraded Warranty
  enhancedWarranty: '',
  enhancedWarrantyLevel: '',
  enhancedWarrantyName: '',
  enhancedWarrantyPrice: 0,
  enhancedWarrantyDetails: '',
  addonsToFinance: '',
  financeAddon1: '',
  financeAddon1Cost: 0,
  financeAddon2: '',
  financeAddon2Cost: 0,
  financeAddonsArray: [],
  customerAddons: '',
  customerAddon1: '',
  customerAddon1Cost: 0,
  customerAddon2: '',
  customerAddon2Cost: 0,
  customerAddonsArray: [],
  applyDiscounts: '',
  dealerDeposit: 0,
  deliveryOptions: '',
  collection: 'FREE',
  deliveryCost: 0,
  dateOfCollectionDelivery: '',
  dealerDepositPaidCustomer: 0,
  dealerDepositPaymentDateCustomer: '',
  salePricePreDiscount: 0,
  discountOnSalePrice: 0,
  salePricePostDiscount: 0,
  warrantyPricePreDiscount: 0,
  discountOnWarrantyPrice: 0,
  warrantyPricePostDiscount: 0,
  deliveryPricePreDiscount: 0,
  discountOnDeliveryPrice: 0,
  deliveryPricePostDiscount: 0,
  compulsorySaleDepositFinance: 0,
  amountPaidDepositFinance: 0,
  totalFinanceDepositPaid: 0,
  depositDateFinance: '',
  outstandingDepositAmountFinance: 0,
  overpaymentsFinance: 0,
  compulsorySaleDepositCustomer: 0,
  amountPaidDepositCustomer: 0,
  depositDateCustomer: '',
  outstandingDepositAmountCustomer: 0,
  overpaymentsCustomer: 0,
  partExIncluded: '',
  pxVehicleRegistration: '',
  pxMakeModel: '',
  pxMileage: 0,
  valueOfPxVehicle: 0,
  settlementAmount: 0,
  // Multiple Payment Entries
  cardPayments: [{ amount: 0, date: '' }],
  bacsPayments: [{ amount: 0, date: '' }],
  cashPayments: [{ amount: 0, date: '' }],
  // Legacy single payment fields (for backward compatibility)
  amountPaidCard: 0,
  dateOfCard: '',
  amountPaidBacs: 0,
  dateOfBacs: '',
  amountPaidCash: 0,
  dateOfCash: '',
  amountPaidPartExchange: 0,
  dateOfPx: '',
  balanceToFinance: 0,
  paidFromBalance: 0,
  subtotalFinance: 0,
  balanceToCustomer: 0,
  customerBalanceDue: 0,
  balanceToFinanceCompany: 0,
  subtotalCustomer: 0,
  amountPaid: 0,
  remainingBalance: 0,
  tradeBalanceDue: 0,
  vatCommercial: 0,
  remainingBalanceIncVat: 0,
  additionalInformation: '',
  termsOfServiceInHouse: false,
  termsOfServiceTrade: false,
  customerAcceptedIdd: 'N/A',
  customerAvailableSignature: '',
  customerSignature: '',
  dateOfSignature: '',
  mileage: 0,
  cambeltChainConfirmation: '',
  fuelTypeChecklist: '',
  numberOfKeys: '',
  serviceHistoryRecord: '',
  userManual: '',
  wheelLockingNut: '',
  dealerPreSaleCheck: '',
  vehicleInspectionTestDrive: '',
  
  // Discount arrays for dynamic add-ons
  customerAddonsDiscountArray: [],
  financeAddonsDiscountArray: [],
  
  // Enhanced warranty discount fields
  enhancedWarrantyPricePreDiscount: 0,
  discountOnEnhancedWarrantyPrice: 0,
  enhancedWarrantyPricePostDiscount: 0,
  
  // Customer add-ons discount fields
  customerAddon1PricePreDiscount: 0,
  discountOnCustomerAddon1Price: 0,
  customerAddon1PricePostDiscount: 0,
  customerAddon2PricePreDiscount: 0,
  discountOnCustomerAddon2Price: 0,
  customerAddon2PricePostDiscount: 0,
  
  // Finance add-ons discount fields
  financeAddon1PricePreDiscount: 0,
  discountOnFinanceAddon1Price: 0,
  financeAddon1PricePostDiscount: 0,
  financeAddon2PricePreDiscount: 0,
  discountOnFinanceAddon2Price: 0,
  financeAddon2PricePostDiscount: 0
}

// Helper function to get step descriptions
const getStepDescription = (stepId: string | undefined): string => {
  const descriptions: Record<string, string> = {
    'vehicle-sale': 'Enter vehicle details and sale information',
    'customer-details': 'Provide customer contact and address information',
    'finance-company': 'Configure finance company details and terms',
    'warranty-addons': 'Set up warranty coverage and additional services',
    'dealer-deposit': 'Configure deposit amounts and delivery options',
    'discount-application': 'Apply discounts to sale price and services',
    'finance-deposits': 'Manage finance company deposit payments',
    'customer-deposits': 'Handle customer deposit transactions',
    'payments-balance': 'Record payments and part exchange details',
    'balance-summary': 'Review final calculations and terms',
    'checklist-validation': 'Complete final vehicle inspection checklist'
  }
  return descriptions[stepId || ''] || 'Complete this step to continue'
}

interface InvoiceFormProps {
  stockData?: any
  stockActionsData?: any
}

export default function InvoiceForm({ stockData, stockActionsData }: InvoiceFormProps = {}) {
  const { isDarkMode } = useTheme()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Auto-fill form data with stock data when available
  useEffect(() => {
    if (stockData) {
      console.log('🔍 [INVOICE FORM DEBUG] stockData received:', stockData)
      console.log('🔍 [INVOICE FORM DEBUG] stockActionsData received:', stockActionsData)
      
      const extractedStockId = stockData.metadata?.stockId || stockData.stockId || ''
      const extractedFuelType = stockData.vehicle?.fuelType || stockData.fuelType || ''
      
      // Get sale details from either stockData.saleDetails or stockActionsData
      const saleDetails = stockActionsData || stockData.saleDetails
      
      const autoFilledData: Partial<FormData> = {
        // Stock ID for checklist data loading
        stockId: extractedStockId,
        
        // Vehicle & Sale Information
        vehicleRegistration: stockData.vehicle?.registration || '',
        make: stockData.vehicle?.make || '',
        model: stockData.vehicle?.model || '',
        colour: stockData.vehicle?.colour || '',
        derivative: stockData.vehicle?.derivative || '',
        mileage: stockData.vehicle?.odometerReadingMiles || 0,
        vin: stockData.vehicle?.vin || '',
        firstRegDate: stockData.vehicle?.firstRegistrationDate || '',
        fuelType: extractedFuelType,
        fuelTypeChecklist: extractedFuelType,
        engineCapacity: stockData.vehicle?.engineCapacityCC?.toString() || stockData.vehicle?.engineSize || '',
        engineNumber: stockData.vehicle?.engineNumber || '',
        salePrice: stockData.adverts?.retailAdverts?.forecourtPrice?.amountGBP || 0,
        
        // Additional vehicle information from inventory details
        costOfPurchase: stockData.inventoryDetails?.costOfPurchase ? parseFloat(stockData.inventoryDetails.costOfPurchase) : 0,
        dateOfPurchase: stockData.inventoryDetails?.dateOfPurchase ? new Date(stockData.inventoryDetails.dateOfPurchase).toISOString().split('T')[0] : '',
        
        // Use vehicle registration as default invoice number
        invoiceNumber: stockData.vehicle?.registration || '',
        
        // Set default sale date to today
        dateOfSale: new Date().toISOString().split('T')[0],
        monthOfSale: new Date().toLocaleDateString('en-US', { month: 'long' }),
        quarterOfSale: Math.ceil((new Date().getMonth() + 1) / 3),
        
        // Use existing days in stock calculation from dateOnForecourt
        daysInStock: (() => {
          const dateOnForecourt = stockData.dateOnForecourt || stockData.metadata?.dateOnForecourt;
          if (dateOnForecourt) {
            const forecourtDate = new Date(dateOnForecourt);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - forecourtDate.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          return 0;
        })(),
        
        // Set default sale type
        saleType: 'Retail',
        invoiceTo: 'Customer',
      }

      // Populate from sale details if available
      if (saleDetails) {
        console.log('✅ Sale details found, populating customer, delivery, and warranty data...')
        console.log('📋 Sale Details Data:', saleDetails)
        
        // Customer Information
        // Note: title is not in sale details, will be empty
        if (saleDetails.firstName) {
          autoFilledData.firstName = saleDetails.firstName
          console.log('  ✓ First Name:', saleDetails.firstName)
        }
        if (saleDetails.lastName) {
          autoFilledData.surname = saleDetails.lastName
          console.log('  ✓ Last Name:', saleDetails.lastName)
        }
        if (saleDetails.emailAddress) {
          autoFilledData.emailAddress = saleDetails.emailAddress
          console.log('  ✓ Email:', saleDetails.emailAddress)
        }
        if (saleDetails.contactNumber) {
          autoFilledData.contactNumber = saleDetails.contactNumber
          console.log('  ✓ Phone:', saleDetails.contactNumber)
        }
        if (saleDetails.addressFirstLine || saleDetails.addressPostCode) {
          autoFilledData.address = {
            street: saleDetails.addressFirstLine || '',
            address2: '',
            city: '',
            county: '',
            postCode: saleDetails.addressPostCode || '',
            country: 'United Kingdom'
          }
          console.log('  ✓ Address:', saleDetails.addressFirstLine, saleDetails.addressPostCode)
        }
        
        // Delivery & Collection Information
        if (saleDetails.deliveryType) {
          autoFilledData.deliveryOptions = saleDetails.deliveryType === 'delivery' ? 'Delivery' : 'Collection'
          console.log('  ✓ Delivery Type:', saleDetails.deliveryType)
        }
        if (saleDetails.deliveryPrice) {
          autoFilledData.deliveryCost = parseFloat(saleDetails.deliveryPrice)
          console.log('  ✓ Delivery Cost:', saleDetails.deliveryPrice)
        }
        if (saleDetails.deliveryDate) {
          const deliveryDate = new Date(saleDetails.deliveryDate).toISOString().split('T')[0]
          autoFilledData.dateOfCollectionDelivery = deliveryDate
          console.log('  ✓ Delivery Date:', deliveryDate)
        }
        
        // Warranty Information
        if (saleDetails.warrantyType && saleDetails.warrantyType !== 'none') {
          autoFilledData.warrantyLevel = saleDetails.warrantyType
          console.log('  ✓ Warranty Type:', saleDetails.warrantyType)
          
          // Check if it's an in-house warranty
          const warrantyTypeLower = saleDetails.warrantyType.toLowerCase()
          if (warrantyTypeLower.includes('in house') || warrantyTypeLower.includes('in-house') || warrantyTypeLower.includes('inhouse')) {
            autoFilledData.inHouse = 'Yes'
            console.log('  ✓ In House Warranty: Yes (detected from warranty type)')
          } else {
            autoFilledData.inHouse = 'No'
            console.log('  ✓ In House Warranty: No (third-party warranty)')
          }
        }
        
        // Sale Information
        if (saleDetails.salePrice) {
          const price = parseFloat(saleDetails.salePrice)
          autoFilledData.salePrice = price
          console.log('  ✓ Sale Price:', price)
        }
        if (saleDetails.saleDate) {
          const saleDate = new Date(saleDetails.saleDate).toISOString().split('T')[0]
          autoFilledData.dateOfSale = saleDate
          console.log('  ✓ Sale Date:', saleDate)
        }
        if (saleDetails.monthOfSale) {
          autoFilledData.monthOfSale = saleDetails.monthOfSale
          console.log('  ✓ Month of Sale:', saleDetails.monthOfSale)
        }
        
        console.log('✅ Auto-population complete:', {
          customer: `${saleDetails.firstName || ''} ${saleDetails.lastName || ''}`.trim(),
          email: saleDetails.emailAddress || 'N/A',
          delivery: saleDetails.deliveryType || 'N/A',
          warranty: saleDetails.warrantyType || 'N/A'
        })
      } else {
        console.log('ℹ️ No sale details found for this stock item - manual entry required')
      }

      console.log('🔍 [INVOICE FORM DEBUG] Final autoFilledData:', autoFilledData)
      
      // Merge with existing form data, preserving any user changes
      setFormData(prev => ({
        ...prev,
        ...autoFilledData
      }))
    }
  }, [stockData, stockActionsData])

  // Get visible steps based on current form data
  const visibleSteps = STEPS.filter(step => step.isVisible(formData))
  const totalSteps = visibleSteps.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  // Update form data
  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates }
      const calculatedUpdates = performCalculations(newData, updates)
      
      if (Object.keys(calculatedUpdates).length > 0) {
        return { ...newData, ...calculatedUpdates }
      }
      
      return newData
    })
  }, [])

  // Perform automatic calculations
  const performCalculations = (data: FormData, updates: Partial<FormData>): Partial<FormData> => {
    const calculations: Partial<FormData> = {}

    // Days in stock calculation
    if (updates.dateOfSale || updates.dateOfPurchase) {
      if (data.dateOfSale && data.dateOfPurchase) {
        const saleDate = new Date(data.dateOfSale)
        const purchaseDate = new Date(data.dateOfPurchase)
        calculations.daysInStock = Math.ceil((saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    // Quarter of sale calculation
    if (updates.dateOfSale) {
      if (data.dateOfSale) {
        const saleDate = new Date(data.dateOfSale)
        calculations.quarterOfSale = Math.ceil((saleDate.getMonth() + 1) / 3)
        calculations.monthOfSale = saleDate.toLocaleDateString('en-US', { month: 'long' })
      }
    }

    // Discount calculations
    if (updates.salePricePreDiscount || updates.discountOnSalePrice) {
      calculations.salePricePostDiscount = (data.salePricePreDiscount || 0) - (data.discountOnSalePrice || 0)
    }

    if (updates.warrantyPricePreDiscount || updates.discountOnWarrantyPrice) {
      calculations.warrantyPricePostDiscount = (data.warrantyPricePreDiscount || 0) - (data.discountOnWarrantyPrice || 0)
    }

    if (updates.deliveryPricePreDiscount || updates.discountOnDeliveryPrice) {
      calculations.deliveryPricePostDiscount = (data.deliveryPricePreDiscount || 0) - (data.discountOnDeliveryPrice || 0)
    }

    // Outstanding deposit calculations
    if (updates.compulsorySaleDepositFinance || updates.amountPaidDepositFinance) {
      calculations.outstandingDepositAmountFinance = (data.compulsorySaleDepositFinance || 0) - (data.amountPaidDepositFinance || 0)
      if ((data.amountPaidDepositFinance || 0) > (data.compulsorySaleDepositFinance || 0)) {
        calculations.overpaymentsFinance = (data.amountPaidDepositFinance || 0) - (data.compulsorySaleDepositFinance || 0)
      }
    }

    if (updates.compulsorySaleDepositCustomer || updates.amountPaidDepositCustomer) {
      calculations.outstandingDepositAmountCustomer = (data.compulsorySaleDepositCustomer || 0) - (data.amountPaidDepositCustomer || 0)
      if ((data.amountPaidDepositCustomer || 0) > (data.compulsorySaleDepositCustomer || 0)) {
        calculations.overpaymentsCustomer = (data.amountPaidDepositCustomer || 0) - (data.compulsorySaleDepositCustomer || 0)
      }
    }

    // Part exchange calculation
    if (updates.valueOfPxVehicle || updates.settlementAmount) {
      calculations.amountPaidPartExchange = (data.valueOfPxVehicle || 0) - (data.settlementAmount || 0)
    }

    // VAT calculation for commercial
    if (data.saleType === 'Commercial') {
      const subtotal = (data.salePrice || 0) + (data.warrantyPrice || 0) + (data.deliveryCost || 0)
      calculations.vatCommercial = subtotal * 0.20
      calculations.remainingBalanceIncVat = (data.remainingBalance || 0) + calculations.vatCommercial
    }

    return calculations
  }

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      setCurrentStep(stepIndex)
    }
  }

  // Navigate to PDF Editor for editing before generation
  const goToPDFEditor = () => {
    // Store form data in sessionStorage for the PDF editor
    sessionStorage.setItem('invoiceFormData', JSON.stringify(formData))
    
    // Navigate to the authenticated PDF editor if we have stock data, otherwise use public route
    if (stockData?.metadata?.stockId) {
      window.location.href = `/mystock/${stockData.metadata.stockId}/invoice-editor`
    } else {
      window.location.href = '/invoice-pdf-editor'
    }
  }

  // Navigate to Enterprise Invoice Editor
  const goToEnterpriseEditor = () => {
    // Transform form data to match the enterprise editor format
    const enterpriseData = transformToEnterpriseFormat(formData)
    
    // Store form data in sessionStorage for the enterprise editor
    sessionStorage.setItem('enterpriseInvoiceData', JSON.stringify(enterpriseData))
    
    // Navigate to enterprise invoice editor
    window.location.href = '/enterprise-invoice-editor'
  }

  // Transform form data to enterprise editor format
  const transformToEnterpriseFormat = (data: FormData) => {
    return {
      // Basic Information
      invoiceNumber: data.invoiceNumber,
      dateOfSale: data.dateOfSale,
      invoiceTo: data.invoiceTo,
      saleType: data.saleType,
      invoiceType: 'Standard', // Default to standard, can be changed in editor
      
      // Customer Information
      title: data.title,
      firstName: data.firstName,
      lastName: data.surname,
      email: data.emailAddress,
      phone: data.contactNumber,
      address: `${data.address.street}\n${data.address.city}\n${data.address.postCode}`,
      
      // Vehicle Information
      vehicleRegistration: data.vehicleRegistration,
      make: data.make,
      model: data.model,
      derivative: data.derivative,
      vin: data.vin,
      mileage: data.mileage || '',
      colour: data.colour,
      fuelType: data.fuelType,
      engineNumber: data.engineNumber,
      engineCapacity: data.engineCapacity,
      firstRegDate: data.firstRegDate,
      
      // Pricing Information
      salePrice: data.salePrice,
      discountOnSalePrice: data.discountOnSalePrice || 0,
      salePricePostDiscount: data.salePricePostDiscount || data.salePrice,
      warrantyPrice: data.warrantyPrice || 0,
      discountOnWarranty: data.discountOnWarrantyPrice || 0,
      warrantyPricePostDiscount: data.warrantyPricePostDiscount || data.warrantyPrice,
      
      // Finance Company Information
      financeCompany: data.financeCompany,
      financeCompanyName: data.financeCompanyName,
      financeStreetAddress: data.financeStreetAddress,
      financeCountyPostCode: data.financeCountyPostCode,
      
      // Warranty Information
      warrantyLevel: data.warrantyLevel,
      inHouse: data.inHouse === 'Yes',
      warrantyDetails: data.warrantyDetails,
      
      // Delivery Information
      deliveryMethod: data.deliveryOptions,
      deliveryCost: data.deliveryCost || 0,
      deliveryDate: data.dateOfCollectionDelivery,
      
      // Add-ons
      financeAddonsEnabled: data.addonsToFinance === 'Yes',
      customerAddonsEnabled: data.customerAddons === 'Yes',
      financeAddon1: data.financeAddon1,
      financeAddon1Cost: data.financeAddon1Cost || 0,
      financeAddon2: data.financeAddon2,
      financeAddon2Cost: data.financeAddon2Cost || 0,
      // Dynamic finance add-ons
      financeAddonsArray: data.financeAddonsArray || [],
      customerAddon1: data.customerAddon1,
      customerAddon1Cost: data.customerAddon1Cost || 0,
      customerAddon2: data.customerAddon2,
      customerAddon2Cost: data.customerAddon2Cost || 0,
      // Dynamic customer add-ons
      customerAddonsArray: data.customerAddonsArray || [],
      
      // Deposit Information
      amountPaidDepositFinance: data.amountPaidDepositFinance || 0,
      amountPaidDepositCustomer: data.amountPaidDepositCustomer || 0,
      depositDateFinance: data.depositDateFinance,
      depositDateCustomer: data.depositDateCustomer,
      
      // Payment Information
      amountPaidCard: data.amountPaidCard || 0,
      amountPaidBacs: data.amountPaidBacs || 0,
      amountPaidCash: data.amountPaidCash || 0,
      amountPaidPartExchange: data.amountPaidPartExchange || 0,
      
      // Balance Information
      balanceToFinance: data.balanceToFinance || 0,
      customerBalanceDue: data.customerBalanceDue || 0,
      remainingBalance: data.remainingBalance || 0,
      
      // Additional Information
      additionalComments: data.additionalInformation || '',
      
      // Signature Information
      customerSignature: '', // Will be handled in the editor
      customerAvailableForSignature: true, // Default to available
      
      // Calculated fields
      subtotalCustomer: data.subtotalCustomer || 0,
      tradeBalanceDue: data.tradeBalanceDue || 0,
      vatCommercial: data.vatCommercial || 0,
      remainingBalanceIncVat: data.remainingBalanceIncVat || 0
    }
  }


  // Direct PDF Generation using pdfme (no editing)
  const generatePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // Import PDF service functions
      const { generateInvoicePDF, downloadPDF } = await import('@/lib/pdfService')
      
      // Generate PDF using the template
      const pdfBytes = await generateInvoicePDF(formData)
      
      // Create filename
      const fileName = `invoice_${formData.invoiceNumber || 'draft'}_${formData.vehicleRegistration || 'vehicle'}_${new Date().toISOString().split('T')[0]}.pdf`
      
      // Download the PDF
      downloadPDF(pdfBytes, fileName)
      
      // Show success message
      alert(`✅ PDF Generated Successfully!\n\nFilename: ${fileName}\n\nThe professional invoice PDF has been downloaded to your device using the company template.`)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('❌ Error generating PDF. Please try again or contact support if the issue persists.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Form submission - Pass data directly to dynamic editor with minimal validation
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Only check saleType and invoiceTo (for Retail sales)
      const errors: Record<string, string> = {}
      
      if (!formData.saleType) {
        errors.saleType = 'Sale type is required'
      }
      
      // Invoice To is only required for Retail sales
      if (formData.saleType === 'Retail' && !formData.invoiceTo) {
        errors.invoiceTo = 'Invoice recipient is required for retail sales'
      }
      
      // If validation fails, show errors and return
      if (Object.keys(errors).length > 0) {
        setErrors(errors);
        setIsSubmitting(false);
        return;
      }

      // Extract stockId from URL
      const currentUrl = window.location.pathname;
      const stockIdMatch = currentUrl.match(/\/mystock\/([^\/]+)\/invoice/);
      const stockId = stockIdMatch ? stockIdMatch[1] : 
                     stockData?.metadata?.stockId || 
                     stockData?.stockId || 
                     formData.vehicleRegistration;

      // Prepare form data for dynamic editor
      const invoiceFormData = {
        ...formData,
        stockId: stockId,
        stockData: stockData,
        timestamp: new Date().toISOString(),
        source: 'invoice_form'
      };

      // Prepare the data for router state
      const routerStateData = {
        formData: invoiceFormData,
        timestamp: new Date().toISOString(),
        source: 'invoice_form'
      };
      
      // Store as backup in sessionStorage
      try {
        sessionStorage.setItem('invoiceFormData', JSON.stringify(invoiceFormData));
      } catch (storageError) {
        console.warn('Backup storage failed:', storageError);
      }
      
      // Store data on server temporarily to avoid URL length limits
      try {
        const response = await fetch('/api/temp-invoice-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(routerStateData),
        });
        
        if (response.ok) {
          const result = await response.json();
          const finalUrl = `/dynamic-invoice-editor?stockId=${stockId}&source=form&tempId=${result.tempId}`;
          router.push(finalUrl);
        } else {
          throw new Error(`Server storage failed: ${response.status} ${response.statusText}`);
        }
        
      } catch (serverError) {
        console.error('Error storing data on server:', serverError);
        // Fallback: redirect without data and rely on sessionStorage backup
        router.push(`/dynamic-invoice-editor?stockId=${stockId}&source=form`);
      }
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert(`Error: ${(error as Error).message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentStepConfig = visibleSteps[currentStep]
  const CurrentStepComponent = currentStepConfig?.component

  return (
    <div className="w-full space-y-6">
      {/* Enhanced Header */}
      <Card className={`shadow-lg border-0 overflow-hidden ${
        isDarkMode ? 'bg-gray-900' : 'bg-white/90 backdrop-blur-sm'
      }`}>
          <CardHeader className={`relative px-8 py-8 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900' 
              : 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800'
          } text-white`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-y-12"></div>
            </div>
            
            <div className="relative z-10 space-y-6">
              {/* Main Header Content */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${
                    isDarkMode 
                      ? 'bg-slate-600/50 backdrop-blur-sm' 
                      : 'bg-white/20 backdrop-blur-sm'
                  }`}>
                    <Receipt className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-bold tracking-tight mb-1">
                      Invoice Creation
                    </CardTitle>
                    <p className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-blue-100'
                    }`}>
                      Complete vehicle sale documentation
                    </p>
                  </div>
                </div>
                

                {/* Progress Indicator */}
                <div className="text-right">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-2 ${
                    isDarkMode 
                      ? 'bg-slate-600/50 text-slate-200' 
                      : 'bg-white/20 text-white backdrop-blur-sm'
                  }`}>
                    <FileText className="w-4 h-4 mr-2" />
                    Step {currentStep + 1} of {totalSteps}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold mb-1">
                      {Math.round(progress)}%
                    </div>
                    <div className={`text-xs font-medium ${
                      isDarkMode ? 'text-white' : 'text-blue-200'
                    }`}>
                      Complete
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Step Title */}
              <div className={`flex items-center justify-between p-4 rounded-xl ${
                isDarkMode 
                  ? 'bg-slate-800/50 border border-slate-600/50' 
                  : 'bg-white/10 backdrop-blur-sm border border-white/20'
              }`}>
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">
                    {currentStepConfig?.title}
                  </h2>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-blue-100'
                  }`}>
                    {getStepDescription(currentStepConfig?.id)}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isDarkMode 
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30'
                }`}>
                  {currentStep + 1}/{totalSteps}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 lg:p-8">
            {/* Enhanced Progress Section */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Form Progress
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Complete all steps to generate your invoice
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        progress === 100 ? 'text-emerald-600' : 'text-blue-600'
                      }`}>
                        {Math.round(progress)}%
                      </div>
                      <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Complete
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      progress === 100 
                        ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' 
                        : progress > 0 
                          ? 'bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50' 
                          : 'bg-gray-300'
                    }`}></div>
                  </div>
                </div>
                <div className="relative">
                  <Progress 
                    value={progress} 
                    className={`h-4 ${
                      isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                    }`} 
                  />
                  {progress > 0 && (
                    <div className="absolute inset-0 h-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full opacity-20 animate-pulse"></div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Enhanced Step Navigation */}
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Form Steps
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {totalSteps} of {STEPS.length} steps visible
                  </p>
                </div>
                {STEPS.length - totalSteps > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      isDarkMode 
                        ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50' 
                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                      {STEPS.length - totalSteps} steps hidden based on selections
                    </span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
                {visibleSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={cn(
                      "relative p-4 text-sm font-medium rounded-xl border-2 transition-all duration-300 text-center group",
                      "hover:scale-105 hover:shadow-lg transform",
                      index === currentStep
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                        : index < currentStep
                        ? isDarkMode
                          ? "bg-gradient-to-br from-emerald-800/60 to-emerald-900/60 text-emerald-200 border-emerald-600 hover:from-emerald-700/70 hover:to-emerald-800/70 shadow-md"
                          : "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-800 border-emerald-300 hover:from-emerald-100 hover:to-emerald-200 shadow-md"
                        : isDarkMode 
                          ? 'bg-gradient-to-br from-slate-700/70 to-slate-800/70 text-slate-100 border-slate-500 hover:from-slate-600 hover:to-slate-700 hover:text-white'
                          : 'bg-gradient-to-br from-white to-gray-50 text-gray-600 border-gray-200 hover:from-gray-50 hover:to-gray-100 hover:border-gray-300'
                    )}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                        index === currentStep
                          ? "bg-white/20 text-white"
                          : index < currentStep
                          ? isDarkMode
                            ? "bg-emerald-600/30 text-emerald-200"
                            : "bg-emerald-600 text-white"
                          : isDarkMode
                            ? "bg-slate-600/50 text-slate-300"
                            : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
                      )}>
                        {index + 1}
                      </div>
                      <span className="leading-tight font-medium">{step.title}</span>
                      {index < currentStep && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Enhanced Conditional Steps Info */}
              {STEPS.length - totalSteps > 0 && (
                <div className={`mt-6 p-6 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-blue-900/20 border-blue-700/50' 
                    : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-blue-800/50' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-600'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-bold mb-3 ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-800'
                      }`}>
                        Additional Steps Available
                      </h4>
                      <div className={`text-sm space-y-2 ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-700'
                      }`}>
                        {!formData.invoiceTo && (
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <p>Select &quot;Invoice To&quot; to reveal finance-specific steps</p>
                          </div>
                        )}
                        {formData.invoiceTo === 'Finance Company' && (
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <p>Finance Company steps: Company Details, Deposit & Delivery, Finance Deposits</p>
                          </div>
                        )}
                        {(formData.saleType === 'Trade' || formData.saleType === 'Commercial' || 
                          (formData.saleType === 'Retail' && formData.invoiceTo === 'Customer')) && (
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <p>Deposit Payments step available for {formData.saleType} sales</p>
                          </div>
                        )}
                        {formData.applyDiscounts !== 'Yes' && (
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                            <p>Set &quot;Apply Discounts&quot; to &quot;Yes&quot; to reveal Discount Application step</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Current Step Content */}
        <LoadingOverlay 
          isLoading={isSubmitting || isGeneratingPDF} 
          message={isSubmitting ? "Submitting invoice..." : "Generating PDF..."}
        >
          <Card className={`shadow-xl border-0 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white/95 backdrop-blur-sm'
          }`}>
            <CardHeader className={`border-b pt-6 pb-6 px-6 ${
              isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    isDarkMode ? 'bg-blue-600/20' : 'bg-blue-600'
                  }`}>
                    <FileText className={`w-6 h-6 ${
                      isDarkMode ? 'text-blue-400' : 'text-white'
                    }`} />
                  </div>
                  <div>
                    <CardTitle className={`text-xl lg:text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {currentStepConfig?.title}
                    </CardTitle>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {getStepDescription(currentStepConfig?.id)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Step
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25">
                    {currentStep + 1}
                  </div>
                  <div className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    of {totalSteps}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {CurrentStepComponent && (
                <div className="w-full min-h-[500px] bg-gradient-to-b from-transparent to-gray-50/30">
                  <div className="px-6 py-8">
                    <div className="w-full">
                      <CurrentStepComponent
                        formData={formData}
                        updateFormData={updateFormData}
                        errors={errors}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </LoadingOverlay>

        {/* Enhanced Navigation Buttons */}
        <Card className={`shadow-lg border-0 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Previous Button */}
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
                className={`group relative overflow-hidden rounded-xl px-6 py-3 font-semibold transition-all duration-300 ${
                  currentStep === 0 
                    ? 'opacity-40 cursor-not-allowed' 
                    : 'hover:scale-105 hover:shadow-lg active:scale-95'
                } ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    currentStep === 0 
                      ? 'bg-gray-200' 
                      : isDarkMode 
                        ? 'bg-gray-600 group-hover:bg-gray-500' 
                        : 'bg-gray-200 group-hover:bg-gray-300'
                  }`}>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                  <span>Previous Step</span>
                </div>
              </Button>
              
              {/* Main Action Button */}
              <div className="flex-1 flex justify-end">
                {currentStep === totalSteps - 1 ? (
                  <Button
                    onClick={(e) => {
                      const clickId = `CLICK_${Date.now()}`;
                      console.log(`🖱️ [${clickId}] BUTTON CLICKED!`);
                      console.log(`🖱️ [${clickId}] Event:`, e);
                      console.log(`🖱️ [${clickId}] isSubmitting:`, isSubmitting);
                      console.log(`🖱️ [${clickId}] Button disabled:`, isSubmitting);
                      console.log(`🖱️ [${clickId}] About to call handleSubmit...`);
                      
                      try {
                        handleSubmit();
                        console.log(`🖱️ [${clickId}] handleSubmit called successfully`);
                      } catch (error) {
                        console.error(`🖱️ [${clickId}] Error calling handleSubmit:`, error);
                        alert(`Button click error: ${(error as Error).message}`);
                      }
                    }}
                    disabled={isSubmitting}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-green-700 hover:from-emerald-700 hover:via-emerald-800 hover:to-green-800 text-white font-bold shadow-xl shadow-emerald-500/25 disabled:opacity-50 transition-all duration-300 hover:scale-105 active:scale-95 min-w-[220px] px-8 py-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <div className="relative flex items-center justify-center gap-3">
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 animate-spin rounded-full border-2 border-transparent border-t-white" />
                          <span className="text-lg">Processing...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">Complete & Generate Invoice</span>
                          <div className="ml-2 p-1.5 bg-white/10 rounded-full group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </>
                      )}
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={goToNextStep}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold shadow-xl shadow-blue-500/25 transition-all duration-300 hover:scale-105 active:scale-95 min-w-[200px] px-8 py-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <div className="relative flex items-center justify-center gap-3">
                      <span className="text-lg">Continue to Next Step</span>
                      <div className="ml-2 p-1.5 bg-white/10 rounded-full group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}