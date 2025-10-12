"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Package, AlertCircle, CheckCircle, DollarSign, Calendar, Building2, Send } from 'lucide-react';
import { PREDEFINED_FINANCE_COMPANIES, CUSTOM_FINANCE_COMPANY_ID, getFinanceCompanyById } from '@/lib/financeCompanies';
import LicensePlate from '@/components/ui/license-plate';

interface GenerateInvoiceFormProps {
  stockData: any;
  onSuccess?: () => void;
  saleDetailsData?: any | null;
}

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

  stockReference?: string
  registration?: string
}

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
  financeAddon2PricePostDiscount: 0,

  stockReference: '',
  registration: '',
}

export default function GenerateInvoiceForm({ stockData, saleDetailsData }: GenerateInvoiceFormProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const { user } = useUser();

  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    stockReference: stockData?.metadata?.stockId || '',
    registration: stockData?.vehicle?.registration || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeTerms, setTradeTerms] = useState<string>('');
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [customFinanceCountyPostCode, setCustomFinanceCountyPostCode] = useState<string>('');


  const isFinanceInvoice = formData.invoiceTo === 'Finance Company';
  const isCustomerInvoice = formData.invoiceTo === 'Customer';
  const isCommercialSale = formData.saleType === 'Commercial';
  const isTradeSale = formData.saleType === 'Trade';

  // Fetch trade terms from database when it's a trade sale
  useEffect(() => {
    const fetchTradeTerms = async () => {
      if (!isTradeSale || !user?.id) return;
      
      setIsLoadingTerms(true);
      try {
        // First get the dealer ID from the current user
        const dealerResponse = await fetch('/api/current-dealer');
        if (!dealerResponse.ok) {
          throw new Error('Failed to get dealer information');
        }
        
        const dealerResult = await dealerResponse.json();
        if (!dealerResult.success || !dealerResult.data?.dealerId) {
          throw new Error('No dealer ID found for current user');
        }
        
        const dealerId = dealerResult.data.dealerId;
        console.log('🔍 Fetching trade terms for dealer ID:', dealerId);
        
        // Now fetch the custom terms using the correct dealer ID
        const response = await fetch(`/api/custom-terms?dealerId=${dealerId}`);
        if (response.ok) {
          const result = await response.json();
          console.log('📋 Custom terms API response:', result);
          
          if (result.success && result.data?.tradeTerms) {
            console.log('✅ Found trade terms in database, length:', result.data.tradeTerms.length);
            setTradeTerms(result.data.tradeTerms);
          } else {
            console.log('⚠️ No trade terms found in database, using default');
            // Set default trade terms if none exist in database
            setTradeTerms(`## Declaration

I confirm that, when purchasing the above vehicle, I have been advised that this purchase is a Trade-Sale and outside of the scope of the Consumer Protection provisions. Therefore, no warranty or post-sale liabilities will apply.

By purchasing this vehicle, I am confirming my understanding of the above, that all of the details listed are correct and providing my consent for these conditions to be applied.

For any queries or issues, please contact us at support@mydealershipview.com`);
          }
        } else {
          throw new Error(`Custom terms API returned ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Error fetching trade terms:', error);
        // Set default terms on error
        setTradeTerms(`## Declaration

I confirm that, when purchasing the above vehicle, I have been advised that this purchase is a Trade-Sale and outside of the scope of the Consumer Protection provisions. Therefore, no warranty or post-sale liabilities will apply.

By purchasing this vehicle, I am confirming my understanding of the above, that all of the details listed are correct and providing my consent for these conditions to be applied.

For any queries or issues, please contact us at support@mydealershipview.com`);
      } finally {
        setIsLoadingTerms(false);
      }
    };

    fetchTradeTerms();
  }, [isTradeSale, user?.id]);

  useEffect(() => {
    if (stockData) {
      console.log('🔍 [INVOICE FORM DEBUG] stockData received:', stockData);
      console.log('🔍 [INVOICE FORM DEBUG] saleDetailsData received:', saleDetailsData);

      const extractedStockId = stockData.metadata?.stockId || stockData.stockId || '';
      const extractedFuelType = stockData.vehicle?.fuelType || stockData.fuelType || '';

      // Get sale details from either stockData.saleDetails or saleDetailsData
      const saleDetails = saleDetailsData;

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
        saleType: '-',
        invoiceTo: 'select',
      };

      // Populate from sale details if available
      if (saleDetails) {
        console.log('✅ Sale details found, populating customer, delivery, and warranty data...');

        // Customer Information
        if (saleDetails.firstName) {
          autoFilledData.firstName = saleDetails.firstName;
        }
        if (saleDetails.lastName) {
          autoFilledData.surname = saleDetails.lastName;
        }
        if (saleDetails.emailAddress) {
          autoFilledData.emailAddress = saleDetails.emailAddress;
        }
        if (saleDetails.contactNumber) {
          autoFilledData.contactNumber = saleDetails.contactNumber;
        }
        if (saleDetails.addressFirstLine || saleDetails.addressPostCode) {
          autoFilledData.address = {
            street: saleDetails.addressFirstLine || '',
            address2: '',
            city: '',
            county: '',
            postCode: saleDetails.addressPostCode || '',
            country: 'United Kingdom'
          };
        }

        // Delivery & Collection Information
        if (saleDetails.deliveryType) {
          autoFilledData.deliveryOptions = saleDetails.deliveryType === 'delivery' ? 'Delivery' : 'Collection';
        }
        if (saleDetails.deliveryPrice) {
          autoFilledData.deliveryCost = parseFloat(saleDetails.deliveryPrice);
        }
        if (saleDetails.deliveryDate) {
          const deliveryDate = new Date(saleDetails.deliveryDate).toISOString().split('T')[0];
          autoFilledData.dateOfCollectionDelivery = deliveryDate;
        }

        // Warranty Information
        if (saleDetails.warrantyType && saleDetails.warrantyType !== 'none') {
          autoFilledData.warrantyLevel = saleDetails.warrantyType;
          const warrantyTypeLower = saleDetails.warrantyType.toLowerCase();
          if (warrantyTypeLower.includes('in house') || warrantyTypeLower.includes('in-house') || warrantyTypeLower.includes('inhouse')) {
            autoFilledData.inHouse = 'Yes';
          } else {
            autoFilledData.inHouse = 'No';
          }
        }

        // Sale Information
        if (saleDetails.salePrice) {
          const price = parseFloat(saleDetails.salePrice);
          autoFilledData.salePrice = price;
        }
        if (saleDetails.saleDate) {
          const saleDate = new Date(saleDetails.saleDate).toISOString().split('T')[0];
          autoFilledData.dateOfSale = saleDate;
        }
        if (saleDetails.monthOfSale) {
          autoFilledData.monthOfSale = saleDetails.monthOfSale;
        }
      }

      // Merge with existing form data, preserving any user changes
      setFormData(prev => ({
        ...prev,
        ...autoFilledData
      }));
    }
  }, [stockData, saleDetailsData]);

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

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle sale type changes - set default invoiceTo for non-Retail sales
  // useEffect(() => {
  //   if (formData.saleType && formData.saleType !== 'Retail') {
  //     // For Trade and Commercial sales, default to Customer
  //     if (formData.invoiceTo !== 'Customer') {
  //       handleInputChange('invoiceTo', 'Customer');
  //     }
  //   } else if (formData.saleType === 'Retail') {
  //     // For Retail sales, clear invoiceTo if it was auto-set
  //     // Let user choose between Customer and Finance Company
  //   }
  // }, [formData.saleType, formData.invoiceTo]);

  // Handle finance company selection and auto-populate address
  const handleFinanceCompanyChange = (companyId: string) => {
    handleInputChange('financeCompany', companyId);
    
    if (companyId && companyId !== CUSTOM_FINANCE_COMPANY_ID) {
      const company = getFinanceCompanyById(companyId);
      if (company) {
        // Auto-populate the address fields
        const addressLine1 = company.address.line1;
        const addressLine2 = company.address.line2 ? `\n${company.address.line2}` : '';
        const cityCounty = company.address.county 
          ? `${company.address.city}, ${company.address.county}` 
          : company.address.city;
        const contactInfo: string[] = [];
        if (company.address.phone) contactInfo.push(company.address.phone);
        if (company.address.email) contactInfo.push(company.address.email);
        
        setFormData(prev => ({
          ...prev,
          financeCompany: companyId,
          financeCompanyName: company.fullName,
          financeStreetAddress: `${addressLine1}${addressLine2}`,
          financeCountyPostCode: `${cityCounty}\n${company.address.postcode}${contactInfo.length > 0 ? '\n' + contactInfo.join('\n') : ''}`
        }));
        // Clear custom field when selecting predefined company
        setCustomFinanceCountyPostCode('');
      }
    } else if (companyId === CUSTOM_FINANCE_COMPANY_ID) {
      // Clear fields for custom entry
      setFormData(prev => ({
        ...prev,
        financeCompany: companyId,
        financeCompanyName: '',
        financeStreetAddress: '',
        financeCountyPostCode: ''
      }));
      // Clear custom field when switching to custom
      setCustomFinanceCountyPostCode('');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Only check saleType and invoiceTo (for Retail sales)
      const newErrors: Record<string, string> = {};

      if (!formData.saleType || formData.saleType === '-') {
        newErrors.saleType = 'Sale type is required';
      }

      if (!formData.invoiceTo || formData.invoiceTo === 'select') {
        newErrors.invoiceTo = 'Please select who the invoice is to';
      }

      // Invoice To is only required for Retail sales
      if (formData.saleType === 'Retail' && formData.invoiceTo === 'select') {
        newErrors.invoiceTo = 'Invoice recipient is required for retail sales';
      }

      // Finance company is required when invoicing to Finance Company
      if (formData.saleType === 'Retail' && formData.invoiceTo === 'Finance Company' && !formData.financeCompany) {
        newErrors.financeCompany = 'Finance company selection is required';
      }

      // Terms of service agreement is required for Trade sales
      if (formData.saleType === 'Trade' && !formData.termsOfServiceTrade) {
        newErrors.termsOfServiceTrade = 'You must agree to the Trade Sale terms to proceed';
      }

      // If validation fails, show errors and return
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsSubmitting(false);
        toast.error('Please fill in all required fields');
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
        source: 'invoice_form',
        // Concatenate custom county/postcode with existing financeCountyPostCode for custom finance companies
        financeCountyPostCode: formData.financeCompany === CUSTOM_FINANCE_COMPANY_ID && customFinanceCountyPostCode
          ? (formData.financeCountyPostCode ? `${formData.financeCountyPostCode}\n${customFinanceCountyPostCode}` : customFinanceCountyPostCode)
          : formData.financeCountyPostCode
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
      toast.error(`Error: ${(error as Error).message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClass = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-blue-500/20'
  }`;

  const labelClass = `block text-sm font-semibold mb-3 ${
    isDarkMode ? 'text-white' : 'text-slate-700'
  }`;

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-indigo-100/80 via-purple-100/60 to-blue-100/80">
      {/* Enhanced Header with Gradient */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-2xl blur-xl opacity-20 ${
          isDarkMode ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gradient-to-r from-indigo-400 to-purple-500'
        }`} />
        
        <div className={`relative p-6 rounded-2xl border backdrop-blur-sm ${
          isDarkMode 
            ? 'bg-slate-900/80 border-slate-700/50' 
            : 'bg-indigo-100/70 border-purple-300/60 shadow-blue-200/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30' 
                  : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/50'
              }`}>
                <FileText className={`h-6 w-6 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  Generate Invoice
                </h2>
                <p className={`text-sm ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Create invoice for {stockData?.vehicle?.registration || 'vehicle'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Form */}
      <Card className={`p-6 rounded-xl border shadow-lg backdrop-blur-sm ${
        isDarkMode 
          ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-indigo-100/80 border-purple-300/50 shadow-blue-200/40'
      }`}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">

          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${isDarkMode
              ? 'bg-slate-900/50 border-slate-700/50'
              : 'bg-indigo-100/80 border-purple-300/50 shadow-blue-200/40'
            }`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>Stock ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.stockReference}
                    readOnly
                    className={`${inputBaseClass} cursor-not-allowed pr-10`}
                    placeholder="Stock ID"
                  />
                  <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center ${isDarkMode ? 'text-white' : 'text-slate-400'}`}>
                    🔒
                  </div>
                </div>
              </div>

              <div>
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold mb-0 ml-4 pl-2 ${isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>Registration</label>
                  <div className="flex justify-start">
                    <LicensePlate
                      registration={formData.registration || 'N/A'}
                      size="xl"
                      className=""
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-4 text-xs flex items-center ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
              <AlertCircle className="h-3 w-3 mr-1" />
              These fields are automatically populated and cannot be modified
            </div>
          </Card>

          {/* Key Input Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sale Type */}
            <div className="space-y-2">
              <label className={`${labelClass} flex items-center gap-2`}>
                <Package className="h-4 w-4" />
                Sale Type
                <span className={`text-xs px-2 py-1 rounded ${
                  isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                }`}>Required</span>
              </label>
              <select
                value={formData.saleType}
                onChange={(e) => handleInputChange('saleType', e.target.value)}
                className={`${inputBaseClass} ${errors.saleType ? 'border-red-500' : ''}`}
              >
                <option value="-">-</option>
                <option value="Retail">Retail</option>
                <option value="Trade">Trade</option>
                <option value="Commercial">Commercial</option>
              </select>
              {errors.saleType && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.saleType}
                </p>
              )}
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Defines invoice logic and available options
              </p>
            </div>

            {/* Invoice To - Only shown for Retail sales */}
            {formData.saleType === 'Retail' && (
              <div className="space-y-2">
                <label className={`${labelClass} flex items-center gap-2`}>
                  <Building2 className="h-4 w-4" />
                  Invoice To
                  <span className={`text-xs px-2 py-1 rounded ${
                    isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                  }`}>Required</span>
                </label>
                <select
                  value={formData.invoiceTo}
                  onChange={(e) => handleInputChange('invoiceTo', e.target.value)}
                  className={`${inputBaseClass} ${errors.invoiceTo ? 'border-red-500' : ''}`}
                >
                  <option value="select">Select Invoice Recipient</option>
                  <option value="Customer">Customer</option>
                  <option value="Finance Company">Finance Company</option>
                </select>
                {errors.invoiceTo && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.invoiceTo}
                  </p>
                )}
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Determines deposit and payment flow
                </p>
              </div>
            )}

            {/* Finance Company - Only shown when invoicing to Finance Company */}
            {formData.saleType === 'Retail' && formData.invoiceTo === 'Finance Company' && (
              <div className="lg:col-span-2 space-y-2">
                <label className={`${labelClass} flex items-center gap-2`}>
                  <Building2 className="h-4 w-4" />
                  Finance Company
                  <span className={`text-xs px-2 py-1 rounded ${
                    isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                  }`}>Required</span>
                </label>
                <select
                  value={formData.financeCompany}
                  onChange={(e) => handleFinanceCompanyChange(e.target.value)}
                  className={`${inputBaseClass} ${errors.financeCompany ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Finance Company</option>
                  {PREDEFINED_FINANCE_COMPANIES.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                  <option value={CUSTOM_FINANCE_COMPANY_ID}>Other</option>
                </select>
                {errors.financeCompany && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.financeCompany}
                  </p>
                )}
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Finance company details will be auto-populated
                </p>

                {/* Custom Finance Company Fields */}
                {formData.financeCompany === CUSTOM_FINANCE_COMPANY_ID && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <label className={labelClass}>Finance Company Name</label>
                      <input
                        type="text"
                        value={formData.financeCompanyName}
                        onChange={(e) => handleInputChange('financeCompanyName', e.target.value)}
                        className={inputBaseClass}
                        placeholder="Enter finance company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Street Address</label>
                      <input
                        type="text"
                        value={formData.financeStreetAddress}
                        onChange={(e) => handleInputChange('financeStreetAddress', e.target.value)}
                        className={inputBaseClass}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className={labelClass}>County, Post Code and Contact Details</label>
                      <textarea
                        value={customFinanceCountyPostCode}
                        onChange={(e) => setCustomFinanceCountyPostCode(e.target.value)}
                        className={inputBaseClass}
                        placeholder="Enter County, Post Code or Contact Details"
                        rows={3}
                      />
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Include any Contact Numbers and/or Email Address
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Terms of Service - Trade Sale */}
          {isTradeSale && (
            <div className="space-y-4 pt-6 border-t border-slate-200/20">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Terms of Service
              </h3>
              
              <div className={`p-4 border-2 rounded-xl max-h-48 overflow-y-auto ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800' 
                  : 'border-indigo-200 bg-indigo-50/50'
              }`}>
                {isLoadingTerms ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 animate-spin rounded-full border-2 border-transparent border-t-indigo-600"></div>
                    <span className={`ml-2 text-sm ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                      Loading terms...
                    </span>
                  </div>
                ) : (
                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-700'} whitespace-pre-wrap`}>
                    {tradeTerms || 'No trade terms available. Please contact your administrator to set up custom terms.'}
                  </div>
                )}
              </div>
              
              {/* Trade Sale Terms Checkbox */}
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.termsOfServiceTrade}
                    onChange={(e) => handleInputChange('termsOfServiceTrade', e.target.checked)}
                    className={`w-4 h-4 text-indigo-600 border-2 rounded focus:ring-indigo-500 ${
                      isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-indigo-300'
                    } ${errors.termsOfServiceTrade ? 'border-red-500' : ''}`}
                  />
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    I agree to the Trade Sale terms
                  </span>
                </label>
                {errors.termsOfServiceTrade && (
                  <p className="text-red-500 text-xs flex items-center gap-1 ml-7">
                    <AlertCircle className="h-3 w-3" />
                    {errors.termsOfServiceTrade}
                  </p>
                )}
                <p className={`text-xs ml-7 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Confirmation of Trade Sale Terms and Conditions
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200/20">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center justify-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                isSubmitting 
                  ? 'scale-95' 
                  : 'hover:scale-105 hover:shadow-lg'
              } ${
                isDarkMode
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-3" />
                    Create Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Info Card */}
      <Card className={`p-6 rounded-2xl border-l-4 ${
        isDarkMode 
          ? 'border-l-indigo-500 bg-gradient-to-r from-indigo-900/20 to-purple-900/10 border-slate-700/50' 
          : 'border-l-indigo-500 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 border-slate-200/50'
      }`}>
        <div className="flex items-start space-x-4">
          <div className={`p-2 rounded-lg ${
            isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100/80'
          }`}>
            <AlertCircle className={`h-5 w-5 ${
              isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
            }`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-sm mb-2 ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-800'
            }`}>
              Invoice Generation
            </h3>
            <p className={`text-sm leading-relaxed ${
              isDarkMode ? 'text-indigo-200/80' : 'text-indigo-700/80'
            }`}>
              This form collects the essential information needed to generate your invoice. 
              Additional details from sale information, customer details, and vehicle information will be automatically included.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}