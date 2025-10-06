"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Edit3, 
  ArrowLeft, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Split,
  FileDown
} from "lucide-react";
import { ComprehensiveInvoiceData } from "@/app/api/invoice-data/route";
import DynamicInvoiceFormWrapper from "@/components/invoice/DynamicInvoiceFormWrapper";
import InvoicePDFPreviewWrapper from "@/components/invoice/InvoicePDFPreviewWrapper";

// Type for form data from invoice form - flexible to handle various data types
interface InvoiceFormData {
  [key: string]: any;
}

// Extend window interface for our backup data
declare global {
  interface Window {
    invoiceFormDataBackup?: InvoiceFormData;
  }
}

// Helper function to safely convert values to strings
const toString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// Helper function to safely convert values to booleans
const toBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

// Function to fetch dealer ID from current user
const getDealerId = async (): Promise<string | null> => {
  try {
    const response = await fetch('/api/current-dealer');
    if (response.ok) {
      const result = await response.json();
      return result.data?.dealerId || null;
    }
  } catch (error) {
    console.error('Error fetching dealer ID:', error);
  }
  return null;
};

// Function to fetch company settings from database
const fetchCompanySettings = async (dealerId: string) => {
  try {
    const response = await fetch(`/api/company-settings?dealerId=${dealerId}`);
    if (response.ok) {
      const result = await response.json();
      return result.data;
    }
  } catch (error) {
    console.error('Error fetching company settings:', error);
  }
  return null;
};

// Function to fetch custom terms from database
const fetchCustomTerms = async (dealerId: string) => {
  try {
    console.log('🔍 Fetching custom terms for dealerId:', dealerId);
    const response = await fetch(`/api/custom-terms?dealerId=${dealerId}`);
    console.log('📡 Custom terms response status:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('📋 Custom terms result:', {
        success: result.success,
        hasData: !!result.data,
        hasInHouseWarrantyTerms: !!result.data?.inHouseWarrantyTerms,
        inHouseWarrantyTermsLength: result.data?.inHouseWarrantyTerms?.length || 0,
        dataKeys: result.data ? Object.keys(result.data) : 'No data'
      });
      return result.data;
    } else {
      console.error('❌ Custom terms fetch failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error fetching custom terms:', error);
  }
  return null;
};

// Enhanced function to convert form data and fetch database data
const convertFormDataToInvoiceDataWithDB = async (formData: InvoiceFormData): Promise<ComprehensiveInvoiceData> => {
  console.log('🔄 Converting form data to invoice format with database data...');
  console.log('🔍 Input formData for conversion:', formData);
  
  // First get the basic form data conversion
  const basicInvoiceData = convertFormDataToInvoiceData(formData);
  
  // Fetch database data
  console.log('🏢 Fetching company settings and terms from database...');
  const dealerId = await getDealerId();
  
  if (dealerId) {
    console.log('✅ Dealer ID found:', dealerId);
    
    // Fetch company settings and terms in parallel
    const [companySettings, customTerms] = await Promise.all([
      fetchCompanySettings(dealerId),
      fetchCustomTerms(dealerId)
    ]);
    
    console.log('🏢 Company settings fetched:', !!companySettings);
    console.log('📋 Custom terms fetched:', !!customTerms);
    
    // DEBUG: Log custom terms details
    if (customTerms) {
      console.log('🔍 CUSTOM TERMS DEBUG:', {
        hasInHouseWarrantyTerms: !!customTerms.inHouseWarrantyTerms,
        inHouseWarrantyTermsLength: customTerms.inHouseWarrantyTerms?.length || 0,
        inHouseWarrantyTermsPreview: customTerms.inHouseWarrantyTerms?.substring(0, 100) + '...',
        allTermsKeys: Object.keys(customTerms)
      });
    } else {
      console.log('❌ NO CUSTOM TERMS FETCHED - this is the problem!');
    }
    
    // Merge database data with form data
    if (companySettings) {
      basicInvoiceData.companyInfo = {
        name: companySettings.companyName || 'Your Company Name',
        address: {
          street: companySettings.address?.street || '',
          city: companySettings.address?.city || '',
          county: companySettings.address?.county || '',
          postCode: companySettings.address?.postCode || '',
          country: companySettings.address?.country || 'United Kingdom',
        },
        contact: {
          phone: companySettings.contact?.phone || '',
          email: companySettings.contact?.email || '',
          website: companySettings.contact?.website || '',
        },
        vatNumber: companySettings.vatNumber || '',
        registrationNumber: companySettings.registrationNumber || '',
        logo: companySettings.companyLogo || '',
      };
    }
    
    if (customTerms) {
      basicInvoiceData.terms = {
        checklistTerms: customTerms.checklistTerms || '',
        basicTerms: customTerms.basicTerms || '',
        inHouseWarrantyTerms: customTerms.inHouseWarrantyTerms || '',
        thirdPartyTerms: customTerms.thirdPartyTerms || '',
        tradeTerms: customTerms.tradeTerms || '',
      };
      
      // DEBUG: Log what we're setting
      console.log('✅ TERMS SET IN BASIC INVOICE DATA:', {
        hasInHouseWarrantyTerms: !!basicInvoiceData.terms.inHouseWarrantyTerms,
        inHouseWarrantyTermsLength: basicInvoiceData.terms.inHouseWarrantyTerms?.length || 0
      });
    } else {
      console.log('⚠️ NO CUSTOM TERMS - using empty terms object');
      basicInvoiceData.terms = {
        checklistTerms: '',
        basicTerms: '',
        inHouseWarrantyTerms: '',
        thirdPartyTerms: '',
        tradeTerms: '',
      };
    }
    
    console.log('✅ Database data merged successfully');
  } else {
    console.warn('⚠️ Could not fetch dealer ID, using default company info and terms');
  }
  
  return basicInvoiceData;
};

// Function to convert form data to ComprehensiveInvoiceData format
const convertFormDataToInvoiceData = (formData: InvoiceFormData): ComprehensiveInvoiceData => {
  console.log('🔄 Converting form data to invoice format...');
  console.log('🔍 Input formData for conversion:', formData);
  
  // Debug key field mappings with safe type conversion
  const saleTypeRaw = toString(formData.saleType) || 'Retail';
  const saleType = (['Retail', 'Trade', 'Commercial'].includes(saleTypeRaw) ? saleTypeRaw : 'Retail') as 'Retail' | 'Trade' | 'Commercial';
  const invoiceType = saleType === 'Trade' ? 'Trade Invoice' : 'Retail (Customer) Invoice';
  const invoiceToRaw = toString(formData.invoiceTo) || 'Customer';
  const invoiceTo = (['Customer', 'Finance Company'].includes(invoiceToRaw) ? invoiceToRaw : 'Customer') as 'Customer' | 'Finance Company';
  
  console.log('🎯 Key conversions:', {
    'formData.saleType': formData.saleType,
    'computed saleType': saleType,
    'computed invoiceType': invoiceType,
    'formData.invoiceTo': formData.invoiceTo,
    'computed invoiceTo': invoiceTo
  });
  
  return {
    // Meta Information
    invoiceNumber: formData.invoiceNumber || `INV-${Date.now()}`,
    invoiceDate: formData.dateOfSale || new Date().toISOString().split('T')[0],
    saleType: saleType,
    invoiceType: invoiceType,
    invoiceTo: invoiceTo,
    
    // Company Information (use defaults for now)
    companyInfo: {
      name: 'Your Company Name',
      address: {
        street: '',
        city: '',
        county: '',
        postCode: '',
        country: 'United Kingdom',
      },
      contact: {
        phone: '',
        email: '',
        website: '',
      },
      vatNumber: '',
      registrationNumber: '',
      logo: '',
    },
    
    // Customer Information from form - Fixed mapping
    customer: {
      title: toString(formData.title),
      firstName: toString(formData.firstName),
      middleName: toString(formData.middleName),
      lastName: toString(formData.surname || formData.lastName),
      address: {
        firstLine: toString(formData.address?.street || ''),
        secondLine: toString(formData.address?.address2 || ''),
        city: toString(formData.address?.city || ''),
        county: toString(formData.address?.county || ''),
        postCode: toString(formData.address?.postCode || ''),
        country: toString(formData.address?.country || 'United Kingdom'),
      },
      contact: {
        phone: toString(formData.contactNumber),
        email: toString(formData.emailAddress),
      },
      flags: {
        vulnerabilityMarker: toBoolean(formData.vulnerabilityMarker),
        gdprConsent: toBoolean(formData.gdprConsent),
        salesMarketingConsent: toBoolean(formData.salesMarketingConsent),
      },
    },
    
    // Vehicle Information from form and stock data
    vehicle: {
      registration: toString(formData.vehicleRegistration),
      make: toString(formData.make || (formData.stockData as any)?.vehicle?.make),
      model: toString(formData.model || (formData.stockData as any)?.vehicle?.model),
      derivative: toString(formData.derivative || (formData.stockData as any)?.vehicle?.derivative),
      mileage: toString(formData.mileage || (formData.stockData as any)?.vehicle?.odometerReadingMiles),
      engineNumber: toString(formData.engineNumber || (formData.stockData as any)?.vehicle?.engineNumber),
      engineCapacity: toString(formData.engineCapacity || (formData.stockData as any)?.vehicle?.engineSize),
      vin: toString(formData.vin || (formData.stockData as any)?.vehicle?.vin),
      firstRegDate: toString(formData.firstRegDate || (formData.stockData as any)?.vehicle?.firstRegistrationDate),
      colour: toString(formData.colour || (formData.stockData as any)?.vehicle?.colour),
      fuelType: toString(formData.fuelType || (formData.stockData as any)?.vehicle?.fuelType),
    },
    
    // Financial Information from form - Complete mapping with all pricing fields
    pricing: {
      salePrice: parseFloat(formData.salePrice?.toString() || '0'),
      salePricePostDiscount: parseFloat(formData.salePricePostDiscount?.toString() || formData.salePrice?.toString() || '0'),
      discountOnSalePrice: parseFloat(formData.discountOnSalePrice?.toString() || '0'),
      warrantyPrice: parseFloat(formData.warrantyPrice?.toString() || '0'),
      warrantyPricePostDiscount: parseFloat(formData.warrantyPricePostDiscount?.toString() || formData.warrantyPrice?.toString() || '0'),
      discountOnWarranty: parseFloat(formData.discountOnWarrantyPrice?.toString() || '0'),
      // Enhanced/Upgraded Warranty pricing fields
      enhancedWarrantyPrice: parseFloat(formData.enhancedWarrantyPrice?.toString() || '0'),
      enhancedWarrantyPricePostDiscount: parseFloat(formData.enhancedWarrantyPricePostDiscount?.toString() || formData.enhancedWarrantyPrice?.toString() || '0'),
      discountOnEnhancedWarranty: parseFloat(formData.discountOnEnhancedWarrantyPrice?.toString() || '0'),
      compulsorySaleDepositFinance: parseFloat(formData.compulsorySaleDepositFinance?.toString() || '0'),
      compulsorySaleDepositCustomer: parseFloat(formData.compulsorySaleDepositCustomer?.toString() || '0'),
      amountPaidDepositFinance: parseFloat(formData.amountPaidDepositFinance?.toString() || '0'),
      amountPaidDepositCustomer: parseFloat(formData.amountPaidDepositCustomer?.toString() || '0'),
      // Combined total finance deposit paid
      totalFinanceDepositPaid: parseFloat(formData.totalFinanceDepositPaid?.toString() || '0'),
      // Additional pricing fields from form
      outstandingDepositFinance: parseFloat(formData.outstandingDepositAmountFinance?.toString() || '0'),
      outstandingDepositCustomer: parseFloat(formData.outstandingDepositAmountCustomer?.toString() || '0'),
      // Dealer Deposit Payment fields (for Finance Company invoices only)
      dealerDepositPaidCustomer: parseFloat(formData.dealerDepositPaidCustomer?.toString() || '0'),
      dealerDepositPaymentDateCustomer: toString(formData.dealerDepositPaymentDateCustomer) || '',
      // Note: Additional pricing fields stored in notes section
    },
    
    // Payment Information from form - Complete mapping with all payment fields
    payment: {
      method: toString(formData.paymentMethod) || 'cash',
      breakdown: {
        // Multiple payment entries (convert from form data or initialize)
        cardPayments: Array.isArray(formData.cardPayments) ? formData.cardPayments : [{ amount: parseFloat(formData.amountPaidCard?.toString() || '0'), date: toString(formData.dateOfCard) || '' }],
        bacsPayments: Array.isArray(formData.bacsPayments) ? formData.bacsPayments : [{ amount: parseFloat(formData.amountPaidBacs?.toString() || '0'), date: toString(formData.dateOfBacs) || '' }],
        cashPayments: Array.isArray(formData.cashPayments) ? formData.cashPayments : [{ amount: parseFloat(formData.amountPaidCash?.toString() || '0'), date: toString(formData.dateOfCash) || '' }],
        // Legacy single payment fields
        cashAmount: parseFloat(formData.amountPaidCash?.toString() || '0'),
        bacsAmount: parseFloat(formData.amountPaidBacs?.toString() || '0'),
        cardAmount: parseFloat(formData.amountPaidCard?.toString() || '0'),
        financeAmount: 0, // User-editable field, not auto-populated
        depositAmount: parseFloat(formData.amountPaidDepositCustomer?.toString() || formData.amountPaidDepositFinance?.toString() || '0'),
        partExAmount: parseFloat(formData.amountPaidPartExchange?.toString() || '0'),
        // Dealer Deposit Payment (Vehicle Reservation Fees)
        dealerDepositAmount: parseFloat(formData.dealerDepositPaidCustomer?.toString() || '0'),
        dealerDepositDate: toString(formData.dealerDepositPaymentDateCustomer) || '',
        // Payment dates (legacy)
        cashDate: toString(formData.dateOfCash) || '',
        bacsDate: toString(formData.dateOfBacs) || '',
        cardDate: toString(formData.dateOfCard) || '',
        financeDate: '',
        depositDate: toString(formData.depositDateCustomer || formData.depositDateFinance) || '',
        partExDate: toString(formData.dateOfPx) || '',
      },
      // Required fields for interface
      totalBalance: parseFloat(formData.salePrice?.toString() || '0'),
      outstandingBalance: parseFloat(formData.remainingBalance?.toString() || '0'),
      balanceToFinance: parseFloat(formData.balanceToFinance?.toString() || '0'),
      customerBalanceDue: parseFloat(formData.customerBalanceDue?.toString() || '0'),
      // Part Exchange
      partExchange: (formData.partExIncluded === 'Yes') ? {
        included: true,
        vehicleRegistration: toString(formData.pxVehicleRegistration),
        makeAndModel: toString(formData.pxMakeModel),
        mileage: toString(formData.pxMileage || '0'),
        valueOfVehicle: parseFloat(toString(formData.valueOfPxVehicle) || '0'),
        amountPaid: parseFloat(toString(formData.amountPaidPartExchange) || '0'),
        settlementAmount: parseFloat(toString(formData.settlementAmount) || '0'),
      } : undefined,
    },
    
    // Finance Company Information - Fixed field mappings
    financeCompany: invoiceTo === 'Finance Company' ? {
      name: toString(formData.financeCompany),
      companyName: toString(formData.financeCompanyName),
      address: {
        firstLine: toString(formData.financeStreetAddress),
        countyPostCodeContact: toString(formData.financeCountyPostCode),
      },
    } : undefined,
    
    // Warranty Information from form - Fixed mappings with Enhanced Warranty
    warranty: {
      level: toString(formData.warrantyLevel) || 'None Selected',
      name: toString(formData.warrantyName),
      inHouse: formData.inHouse === 'Yes',
      details: toString(formData.warrantyDetails),
      type: formData.inHouse === 'Yes' ? 'in_house' : (formData.warrantyLevel !== 'None' ? 'third_party' : 'none') as 'none' | 'in_house' | 'third_party',
      // Enhanced/Upgraded Warranty fields
      enhanced: formData.enhancedWarranty === 'Yes',
      enhancedLevel: toString(formData.enhancedWarrantyLevel),
      enhancedName: toString(formData.enhancedWarrantyName),
      enhancedDetails: toString(formData.enhancedWarrantyDetails),
    },
    
    // Add-ons from form (including dynamic arrays) - Fixed enable conditions
    addons: {
      finance: {
        enabled: formData.addonsToFinance === 'Yes',
        addon1: formData.financeAddon1 ? {
          name: toString(formData.financeAddon1),
          cost: parseFloat(toString(formData.financeAddon1Cost) || '0'),
          discount: parseFloat(toString(formData.discountOnFinanceAddon1Price) || '0'),
          postDiscountCost: parseFloat(toString(formData.financeAddon1PricePostDiscount) || toString(formData.financeAddon1Cost) || '0'),
        } : undefined,
        // Convert first dynamic addon to static addon2 for better display - WITH DISCOUNT DATA
        addon2: (() => {
          let firstAddon = null;
          if (Array.isArray(formData.financeAddonsArray) && formData.financeAddonsArray.length > 0) {
            firstAddon = formData.financeAddonsArray[0];
          } else if (formData.financeAddonsArray && typeof formData.financeAddonsArray === 'object') {
            const arrayFromObject = Object.values(formData.financeAddonsArray);
            firstAddon = arrayFromObject[0];
          }
          
          if (firstAddon && firstAddon.name) {
            // Get discount data for first dynamic finance addon (index 0)
            const discountData = (formData.financeAddonsDiscountArray || [])[0] || {};
            return {
              name: toString(firstAddon.name),
              cost: parseFloat(toString(firstAddon.cost) || '0'),
              discount: discountData.discountAmount || 0,
              postDiscountCost: discountData.pricePostDiscount || Math.max(0, (parseFloat(toString(firstAddon.cost) || '0') - (discountData.discountAmount || 0))),
            };
          }
          return undefined;
        })(),
        // Dynamic finance add-ons (skip first one since it becomes addon2) - WITH DISCOUNT DATA
        dynamicAddons: (() => {
          let baseAddons = [];
          if (Array.isArray(formData.financeAddonsArray)) {
            baseAddons = formData.financeAddonsArray.slice(1);
          } else if (formData.financeAddonsArray && typeof formData.financeAddonsArray === 'object') {
            // Convert object format {0: {...}, 1: {...}} to array format
            const arrayFromObject = Object.values(formData.financeAddonsArray);
            baseAddons = arrayFromObject.slice(1);
          }
          
          // Map discount data from financeAddonsDiscountArray
          return baseAddons.map((addon, index) => {
            const discountIndex = index + 1; // +1 because we sliced off the first addon
            const discountData = (formData.financeAddonsDiscountArray || [])[discountIndex] || {};
            return {
              name: toString(addon.name),
              cost: parseFloat(toString(addon.cost) || '0'),
              discount: discountData.discountAmount || 0,
              postDiscountCost: discountData.pricePostDiscount || Math.max(0, (parseFloat(toString(addon.cost) || '0') - (discountData.discountAmount || 0)))
            };
          });
        })(),
      },
      customer: {
        enabled: formData.customerAddons === 'Yes',
        addon1: formData.customerAddon1 ? {
          name: toString(formData.customerAddon1),
          cost: parseFloat(toString(formData.customerAddon1Cost) || '0'),
          discount: parseFloat(toString(formData.discountOnCustomerAddon1Price) || '0'),
          postDiscountCost: parseFloat(toString(formData.customerAddon1PricePostDiscount) || toString(formData.customerAddon1Cost) || '0'),
        } : undefined,
        // Convert first dynamic addon to static addon2 for better display - WITH DISCOUNT DATA
        addon2: (() => {
          let firstAddon = null;
          if (Array.isArray(formData.customerAddonsArray) && formData.customerAddonsArray.length > 0) {
            firstAddon = formData.customerAddonsArray[0];
          } else if (formData.customerAddonsArray && typeof formData.customerAddonsArray === 'object') {
            const arrayFromObject = Object.values(formData.customerAddonsArray);
            firstAddon = arrayFromObject[0];
          }
          
          if (firstAddon && firstAddon.name) {
            // Get discount data for first dynamic customer addon (index 0)
            const discountData = (formData.customerAddonsDiscountArray || [])[0] || {};
            return {
              name: toString(firstAddon.name),
              cost: parseFloat(toString(firstAddon.cost) || '0'),
              discount: discountData.discountAmount || 0,
              postDiscountCost: discountData.pricePostDiscount || Math.max(0, (parseFloat(toString(firstAddon.cost) || '0') - (discountData.discountAmount || 0))),
            };
          }
          return undefined;
        })(),
        // Dynamic customer add-ons (skip first one since it becomes addon2) - WITH DISCOUNT DATA
        dynamicAddons: (() => {
          console.log('🔍 [CONVERSION] Customer addons conversion:', {
            customerAddonsArray: formData.customerAddonsArray,
            customerAddonsDiscountArray: formData.customerAddonsDiscountArray,
            isArray: Array.isArray(formData.customerAddonsArray),
            isObject: formData.customerAddonsArray && typeof formData.customerAddonsArray === 'object'
          });
          
          let baseAddons = [];
          if (Array.isArray(formData.customerAddonsArray)) {
            baseAddons = formData.customerAddonsArray.slice(1);
            console.log('🔍 [CONVERSION] Array path - result:', baseAddons);
          } else if (formData.customerAddonsArray && typeof formData.customerAddonsArray === 'object') {
            // Convert object format {0: {...}, 1: {...}} to array format
            const arrayFromObject = Object.values(formData.customerAddonsArray);
            baseAddons = arrayFromObject.slice(1);
            console.log('🔍 [CONVERSION] Object path - arrayFromObject:', arrayFromObject, 'result after slice(1):', baseAddons);
          }
          
          if (baseAddons.length === 0) {
            console.log('🔍 [CONVERSION] No data path - returning empty array');
            return [];
          }
          
          // Map discount data from customerAddonsDiscountArray
          const result = baseAddons.map((addon, index) => {
            const discountIndex = index + 1; // +1 because we sliced off the first addon
            const discountData = (formData.customerAddonsDiscountArray || [])[discountIndex] || {};
            const addonWithDiscount = {
              name: toString(addon.name),
              cost: parseFloat(toString(addon.cost) || '0'),
              discount: discountData.discountAmount || 0,
              postDiscountCost: discountData.pricePostDiscount || Math.max(0, (parseFloat(toString(addon.cost) || '0') - (discountData.discountAmount || 0)))
            };
            console.log('🔍 [CONVERSION] Customer addon with discount:', { addon, discountData, result: addonWithDiscount });
            return addonWithDiscount;
          });
          
          console.log('🔍 [CONVERSION] Final customer dynamic addons with discounts:', result);
          return result;
        })(),
      },
    },
    
    // Delivery Information from form - Fixed field mappings
    delivery: {
      type: toString(formData.deliveryOptions) === 'Delivery' ? 'Delivery' : 'Collection',
      date: toString(formData.dateOfCollectionDelivery),
      cost: parseFloat(toString(formData.deliveryPricePreDiscount) || toString(formData.deliveryCost) || '0'),
      discount: parseFloat(toString(formData.discountOnDeliveryPrice) || '0'),
      postDiscountCost: (() => {
        const preCost = parseFloat(toString(formData.deliveryPricePreDiscount) || toString(formData.deliveryCost) || '0');
        const discount = parseFloat(toString(formData.discountOnDeliveryPrice) || '0');
        return Math.max(0, preCost - discount);
      })(),
      address: toString(formData.deliveryAddress),
    },
    
    // Sale Information from form - Complete mapping
    sale: {
      date: toString(formData.dateOfSale),
      monthOfSale: toString(formData.monthOfSale),
      quarterOfSale: toString(formData.quarterOfSale),
      costOfPurchase: parseFloat(toString(formData.costOfPurchase) || '0'),
      dateOfPurchase: toString(formData.dateOfPurchase),
      daysInStock: parseFloat(toString(formData.daysInStock) || '0'),
    },
    
    // Vehicle Checklist from form - Complete mapping with correct field names
    checklist: {
      mileage: toString(formData.mileage),
      numberOfKeys: toString(formData.numberOfKeys),
      userManual: toString(formData.userManual),
      serviceHistoryRecord: toString(formData.serviceHistoryRecord),
      wheelLockingNut: toString(formData.wheelLockingNut),
      cambeltChainConfirmation: toString(formData.cambeltChainConfirmation),
      vehicleInspectionTestDrive: toString(formData.vehicleInspectionTestDrive),
      dealerPreSaleCheck: toString(formData.dealerPreSaleCheck),
      fuelType: toString(formData.fuelTypeChecklist),
    },
    
    // Signature Information from form
    signature: {
      customerSignature: toString(formData.customerSignature),
      customerAvailableForSignature: toString(formData.customerAvailableForSignature),
      dateOfSignature: toString(formData.dateOfSignature),
    },
    
    // Terms & Conditions (defaults)
    terms: {
      checklistTerms: '',
      basicTerms: '',
      inHouseWarrantyTerms: '',
      thirdPartyTerms: '',
      tradeTerms: '',
    },
    
    // Status Information from form - Only fields supported by interface
    status: {
      documentationComplete: toBoolean(formData.documentationComplete),
      keyHandedOver: toBoolean(formData.keyHandedOver),
      customerSatisfied: toBoolean(formData.customerSatisfied),
      depositPaid: toBoolean(formData.depositPaid),
      vehiclePurchased: toBoolean(formData.vehiclePurchased),
    },
    
    // Additional Data - Include extra form fields in notes
    notes: [
      toString(formData.additionalInformation),
      // Store additional fields that don't fit in the interface
      formData.termsOfServiceInHouse ? 'Terms of Service In-House: Yes' : '',
      formData.termsOfServiceTrade ? 'Terms of Service Trade: Yes' : '',
      formData.applyDiscounts ? `Apply Discounts: ${formData.applyDiscounts}` : '',
      // Additional pricing fields
      formData.salePricePreDiscount ? `Sale Price Pre-Discount: £${formData.salePricePreDiscount}` : '',
      formData.warrantyPricePreDiscount ? `Warranty Price Pre-Discount: £${formData.warrantyPricePreDiscount}` : '',
      formData.deliveryPricePreDiscount ? `Delivery Price Pre-Discount: £${formData.deliveryPricePreDiscount}` : '',
      formData.discountOnDeliveryPrice ? `Discount on Delivery: £${formData.discountOnDeliveryPrice}` : '',
      formData.dealerDeposit ? `Dealer Deposit: £${formData.dealerDeposit}` : '',
      // Payment dates
      formData.dateOfCash ? `Cash Payment Date: ${formData.dateOfCash}` : '',
      formData.dateOfBacs ? `BACS Payment Date: ${formData.dateOfBacs}` : '',
      formData.dateOfCard ? `Card Payment Date: ${formData.dateOfCard}` : '',
      formData.dateOfPx ? `Part Exchange Date: ${formData.dateOfPx}` : '',
      formData.depositDateFinance ? `Finance Deposit Date: ${formData.depositDateFinance}` : '',
      formData.depositDateCustomer ? `Customer Deposit Date: ${formData.depositDateCustomer}` : '',
    ].filter(Boolean).join('\n'),
    additionalInformation: toString(formData.additionalInformation),
    customerAcceptedIdd: toString(formData.customerAcceptedIdd) || 'N/A',
    
    // Invoice Items (create default vehicle item)
    items: [{
      description: `${formData.make || 'Vehicle'} ${formData.model || ''} - ${formData.vehicleRegistration || 'Registration'}`.trim(),
      quantity: 1,
      unitPrice: parseFloat(formData.salePrice?.toString() || '0'),
      discount: parseFloat(formData.discountAmount?.toString() || '0'),
      vatRate: 20,
      total: parseFloat(formData.salePrice?.toString() || '0') - parseFloat(formData.discountAmount?.toString() || '0')
    }],
    
    // VAT and Discount modes
    vatMode: 'global' as const,
    discountMode: 'global' as const,
    subtotal: parseFloat(formData.salePrice?.toString() || '0'),
    vatAmount: formData.saleType === 'Commercial' ? parseFloat(formData.salePrice?.toString() || '0') * 0.2 : 0,
    totalAmount: formData.saleType === 'Commercial' ? parseFloat(formData.salePrice?.toString() || '0') * 1.2 : parseFloat(formData.salePrice?.toString() || '0'),
  };
};

// Component that uses useSearchParams - needs to be wrapped in Suspense
function DynamicInvoiceEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();

  // URL Parameters
  const saleId = searchParams.get('saleId');
  const stockId = searchParams.get('stockId');
  const invoiceId = searchParams.get('invoiceId'); // For loading saved invoices
  const source = searchParams.get('source'); // Track if coming from invoice form

  // State Management
  const [invoiceData, setInvoiceData] = useState<ComprehensiveInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveTriggered, setAutoSaveTriggered] = useState(false); // Track if auto-save already happened
  
  // Layout State
  const [viewMode, setViewMode] = useState<'split' | 'form' | 'preview'>('split');
  const [activeTab, setActiveTab] = useState('basic');
  
  // PDF Generation State
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Load invoice data on component mount
  const loadInvoiceData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError('Please sign in to access the invoice editor.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check for URL parameters with temp ID (most reliable)
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get('source');
      const debugId = urlParams.get('debug');
      const tempId = urlParams.get('tempId');
      
      console.log(`🔍 [EDITOR] URL Parameters:`, { source, debugId, saleId, stockId, tempId, invoiceId });
      
      // PRIORITY 1: Load saved invoice if invoiceId is provided
      if (invoiceId) {
        console.log(`📂 [EDITOR] Loading saved invoice: ${invoiceId}`);
        
        try {
          const response = await fetch(`/api/invoices/${invoiceId}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ [EDITOR] Saved invoice loaded successfully`);
            setInvoiceData(result.invoice);
            
            // Update stockId if available from metadata
            if (result.metadata?.stockId) {
              // Store stockId for future saves
              const url = new URL(window.location.href);
              url.searchParams.set('stockId', result.metadata.stockId);
              window.history.replaceState({}, '', url);
            }
            
            setLoading(false);
            return;
          } else {
            throw new Error('Failed to load saved invoice');
          }
        } catch (error) {
          console.error('❌ Error loading saved invoice:', error);
          setError(`Failed to load saved invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setLoading(false);
          return;
        }
      }
      
      // PRIORITY 2: Use temporary server storage if available (most reliable)
      if (tempId && source === 'form') {
        console.log(`🚀 [EDITOR] Using TEMPORARY SERVER STORAGE (most reliable method)`);
        console.log(`🔑 [EDITOR] Temp ID:`, tempId);
        
        try {
          // Fetch data from server
          const response = await fetch(`/api/temp-invoice-data?tempId=${tempId}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ [EDITOR] Data retrieved from server successfully`);
            console.log(`📦 [EDITOR] Server data:`, result.data);
            
            // Verify this is our invoice form data
            if (result.data && result.data.source === 'invoice_form' && result.data.formData) {
              const formData = result.data.formData;
              console.log(`🔍 [EDITOR] Form data from server:`, formData);
              console.log(`🎯 [EDITOR] Key fields from server:`, {
                saleType: formData.saleType,
                firstName: formData.firstName,
                surname: formData.surname,
                vehicleRegistration: formData.vehicleRegistration,
                debugId: formData.debugId
              });
              
              // Convert form data to ComprehensiveInvoiceData format and fetch database data
              console.log(`🔄 [EDITOR] Converting server data and fetching database info...`);
              const invoiceData = await convertFormDataToInvoiceDataWithDB(formData);
              
              console.log(`✅ [EDITOR] SERVER DATA CONVERSION COMPLETE:`, {
                saleType: invoiceData.saleType,
                invoiceType: invoiceData.invoiceType,
                customerName: `${invoiceData.customer.firstName} ${invoiceData.customer.lastName}`,
                vehicleReg: invoiceData.vehicle.registration,
                companyName: invoiceData.companyInfo.name,
                hasTerms: !!(invoiceData.terms.basicTerms || invoiceData.terms.checklistTerms)
              });
              
              setInvoiceData(invoiceData);
              console.log(`✅ [EDITOR] Invoice data loaded from server successfully`);
              return;
            } else {
              console.warn(`⚠️ [EDITOR] Server data is not valid invoice form data:`, result.data);
            }
          } else {
            throw new Error(`Server retrieval failed: ${response.status} ${response.statusText}`);
          }
          
        } catch (serverError) {
          console.error(`❌ [EDITOR] Error retrieving data from server:`, serverError);
          console.log(`🔄 [EDITOR] Falling back to storage methods...`);
        }
      }
      
      // Test sessionStorage availability
      console.log(`🧪 [EDITOR] Testing sessionStorage availability...`);
      try {
        const testKey = `editor_test_${Date.now()}`;
        sessionStorage.setItem(testKey, 'test');
        const testRetrieve = sessionStorage.getItem(testKey);
        sessionStorage.removeItem(testKey);
        console.log(`✅ [EDITOR] SessionStorage test passed:`, testRetrieve === 'test');
      } catch (storageError) {
        console.error(`❌ [EDITOR] SessionStorage test failed:`, storageError);
      }
      
      // MULTI-STORAGE RETRIEVAL: Check all storage methods
      const sessionData = sessionStorage.getItem('invoiceFormData');
      const localData = localStorage.getItem('invoiceFormData');
      const windowData = window.invoiceFormDataBackup;
      
      console.log(`🔍 [EDITOR] MULTI-STORAGE check:`, {
        sessionStorage: !!sessionData,
        localStorage: !!localData,
        windowObject: !!windowData,
        sessionLength: sessionData?.length || 0,
        localLength: localData?.length || 0,
        source: source,
        debugId: debugId
      });
      
      // Try to get data from any available source
      let storedFormData = sessionData || localData;
      let dataSource = sessionData ? 'sessionStorage' : localData ? 'localStorage' : null;
      
      // If string storage failed, try window object
      if (!storedFormData && windowData) {
        storedFormData = JSON.stringify(windowData);
        dataSource = 'windowObject';
        console.log(`🔄 [EDITOR] Using window object data, converting to string`);
      }
      
      console.log(`🎯 [EDITOR] Selected data source:`, dataSource);
      
      if (storedFormData && source === 'form') {
        console.log(`📝 [EDITOR] Using form data from ${dataSource} (new flow)`);
        console.log(`📏 [EDITOR] Raw data length:`, storedFormData.length);
        
        let formData;
        try {
          formData = JSON.parse(storedFormData);
          console.log(`✅ [EDITOR] JSON parse successful`);
        } catch (parseError) {
          console.error(`❌ [EDITOR] JSON parse failed:`, parseError);
          throw new Error(`Failed to parse stored form data: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
        }
        
        console.log(`🔍 [EDITOR] RAW FORM DATA FROM SESSIONSTORAGE:`, formData);
        console.log(`🎯 [EDITOR] Critical fields from sessionStorage:`, {
          saleType: formData.saleType,
          invoiceTo: formData.invoiceTo,
          invoiceNumber: formData.invoiceNumber,
          firstName: formData.firstName,
          surname: formData.surname,
          vehicleRegistration: formData.vehicleRegistration,
          salePrice: formData.salePrice,
          warrantyType: formData.warrantyType,
          warrantyLevel: formData.warrantyLevel,
          source: formData.source,
          timestamp: formData.timestamp,
          debugId: formData.debugId
        });
        
        // Verify debug ID matches
        if (debugId && formData.debugId !== debugId) {
          console.warn(`⚠️ [EDITOR] Debug ID mismatch! URL: ${debugId}, Data: ${formData.debugId}`);
        }
        
        // Convert form data to ComprehensiveInvoiceData format and fetch database data
        console.log(`🔄 [EDITOR] Starting conversion process with database data...`);
        
        // DEBUG: Log addon arrays before conversion
        console.log('🔍 [EDITOR] ADDON ARRAYS FROM FORM DATA:', {
          customerAddons: formData.customerAddons,
          customerAddon1: formData.customerAddon1,
          customerAddon1Cost: formData.customerAddon1Cost,
          customerAddon2: formData.customerAddon2,
          customerAddon2Cost: formData.customerAddon2Cost,
          customerAddonsArray: formData.customerAddonsArray,
          financeAddons: formData.addonsToFinance,
          financeAddon1: formData.financeAddon1,
          financeAddon1Cost: formData.financeAddon1Cost,
          financeAddon2: formData.financeAddon2,
          financeAddon2Cost: formData.financeAddon2Cost,
          financeAddonsArray: formData.financeAddonsArray
        });
        
        const invoiceData = await convertFormDataToInvoiceDataWithDB(formData);
        
        // DEBUG: Log converted addon data
        console.log('🔍 [EDITOR] CONVERTED ADDON DATA:', {
          customerEnabled: invoiceData.addons?.customer?.enabled,
          customerAddon1: invoiceData.addons?.customer?.addon1,
          customerAddon2: invoiceData.addons?.customer?.addon2,
          customerDynamicAddons: invoiceData.addons?.customer?.dynamicAddons,
          customerDynamicAddonsLength: invoiceData.addons?.customer?.dynamicAddons?.length,
          financeEnabled: invoiceData.addons?.finance?.enabled,
          financeAddon1: invoiceData.addons?.finance?.addon1,
          financeAddon2: invoiceData.addons?.finance?.addon2,
          financeDynamicAddons: invoiceData.addons?.finance?.dynamicAddons,
          financeDynamicAddonsLength: invoiceData.addons?.finance?.dynamicAddons?.length
        });
        
        console.log(`✅ [EDITOR] CONVERSION COMPLETE - Final invoice data:`, invoiceData);
        console.log(`🎯 [EDITOR] Key converted fields:`, {
          saleType: invoiceData.saleType,
          invoiceType: invoiceData.invoiceType,
          invoiceTo: invoiceData.invoiceTo,
          customerName: `${invoiceData.customer.firstName} ${invoiceData.customer.lastName}`,
          vehicleReg: invoiceData.vehicle.registration,
          salePrice: invoiceData.pricing.salePrice,
          warrantyType: invoiceData.warranty.type,
          warrantyInHouse: invoiceData.warranty.inHouse,
          companyName: invoiceData.companyInfo.name,
          hasTerms: !!(invoiceData.terms.basicTerms || invoiceData.terms.checklistTerms)
        });
        
        setInvoiceData(invoiceData);
        console.log(`✅ [EDITOR] Invoice data loaded from ${dataSource} successfully`);
        
        // Clear all stored data after successful use
        sessionStorage.removeItem('invoiceFormData');
        localStorage.removeItem('invoiceFormData');
        delete window.invoiceFormDataBackup;
        console.log(`🧹 [EDITOR] All storage methods cleared after successful load`);
        
        // Mark that we need to auto-save this form data
        if (source === 'form' && !autoSaveTriggered) {
          console.log(`🎯 [EDITOR] Coming from invoice form - will trigger auto-save`);
          setHasUnsavedChanges(true); // Mark as having unsaved changes so save knows to proceed
        }
        
        return;
      }
      
      // Fallback to old flow (fetch from database) if no form data
      if (!saleId && !stockId) {
        setError('Missing required parameters. Please provide either saleId or stockId, or submit form data.');
        return;
      }
      
      console.log('📊 Using database fetch (old flow)');
      const params = new URLSearchParams();
      if (saleId) params.append('saleId', saleId);
      if (stockId) params.append('stockId', stockId);
      
      const response = await fetch(`/api/invoice-data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ [EDITOR] Database data loaded:`, {
          companyName: result.data.companyInfo?.name,
          hasBasicTerms: !!result.data.terms?.basicTerms,
          hasTradeTerms: !!result.data.terms?.tradeTerms,
          hasChecklistTerms: !!result.data.terms?.checklistTerms,
          hasInHouseWarrantyTerms: !!result.data.terms?.inHouseWarrantyTerms,
          hasThirdPartyTerms: !!result.data.terms?.thirdPartyTerms,
          saleType: result.data.saleType,
          invoiceType: result.data.invoiceType,
          termsDataRaw: result.data.terms
        });
        setInvoiceData(result.data);
        console.log('✅ Invoice data loaded from database successfully');
        console.log('📊 Data sources found:', result.meta?.dataSourcesFound);
        console.log('🔍 Meta info:', result.meta);
        console.log('📝 Invoice data preview:', {
          invoiceNumber: result.data.invoiceNumber,
          saleType: result.data.saleType,
          customerName: `${result.data.customer.firstName} ${result.data.customer.lastName}`,
          vehicleReg: result.data.vehicle.registration,
          salePrice: result.data.pricing.salePrice
        });
      } else {
        throw new Error(result.error || 'Failed to load invoice data');
      }
    } catch (err) {
      console.error('❌ Error loading invoice data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId, saleId, stockId, invoiceId, autoSaveTriggered]);

  useEffect(() => {
    // Only load data if user is authenticated
    if (userId) {
      loadInvoiceData();
    } else {
      setLoading(false);
      setError('Please sign in to access the invoice editor.');
    }
  }, [loadInvoiceData, userId]);

  // Handle invoice data updates
  const handleInvoiceDataUpdate = useCallback((updates: Partial<ComprehensiveInvoiceData>) => {
    setInvoiceData(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  // Save invoice data to database (wrapped in useCallback to prevent recreating on every render)
  const saveInvoiceData = useCallback(async (): Promise<boolean> => {
    if (!invoiceData || !stockId) return false;
    
    try {
      const response = await fetch('/api/invoices/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockId,
          invoiceData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        console.log('✅ Invoice data saved to database:', result.invoiceId);
        return true;
      } else {
        throw new Error(result.error || 'Failed to save invoice data');
      }
    } catch (error) {
      console.error('❌ Error saving invoice data:', error);
      alert(`Error saving invoice data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [invoiceData, stockId]);

  // Auto-save effect: Trigger save when coming from invoice form
  useEffect(() => {
    const triggerAutoSave = async () => {
      // Only trigger if:
      // 1. Coming from invoice form (source === 'form')
      // 2. Invoice data is loaded
      // 3. Not currently loading
      // 4. Haven't triggered auto-save yet
      // 5. Have stockId
      if (source === 'form' && invoiceData && !loading && !autoSaveTriggered && stockId) {
        console.log(`🎯 [EDITOR] Auto-triggering save for form submission...`);
        setAutoSaveTriggered(true); // Mark as triggered to prevent duplicate saves
        
        // Wait a brief moment for UI to settle
        setTimeout(async () => {
          setSaving(true);
          try {
            console.log('💾 [AUTO-SAVE] Saving invoice data from form submission...');
            const saved = await saveInvoiceData();
            
            if (saved) {
              console.log('✅ [AUTO-SAVE] Invoice data saved successfully!');
              // Don't show alert for auto-save, just update the state
              setHasUnsavedChanges(false);
              setLastSaved(new Date());
            } else {
              console.error('❌ [AUTO-SAVE] Failed to save invoice data');
              // Show error alert for failed auto-save
              alert('⚠️ Auto-save failed. Please use the Save button to manually save your invoice.');
            }
          } catch (error) {
            console.error('❌ [AUTO-SAVE] Error during auto-save:', error);
            alert(`❌ Auto-save failed\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease use the Save button to manually save.`);
          } finally {
            setSaving(false);
          }
        }, 500); // 500ms delay to ensure UI is ready
      }
    };

    triggerAutoSave();
  }, [source, invoiceData, loading, autoSaveTriggered, stockId, saveInvoiceData]);

  // Save Changes Only (without PDF generation)
  const handleSaveChanges = async () => {
    if (!invoiceData) return;
    
    setSaving(true);
    try {
      console.log('💾 Saving invoice data...');
      const saved = await saveInvoiceData();
      
      if (saved) {
        alert('✅ Invoice data saved successfully!');
      }
    } catch (error) {
      console.error('❌ Error saving invoice data:', error);
      alert(`❌ Failed to save invoice data\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Save and Download PDF
  const handleSaveAndDownloadPDF = async () => {
    if (!invoiceData) return;
    
    setGeneratingPDF(true);
    setSaving(true);
    try {
      // First save the invoice data
      console.log('💾 Saving invoice data...');
      const saved = await saveInvoiceData();
      
      if (!saved) {
        throw new Error('Failed to save invoice data');
      }
      
      console.log('🔄 Starting PDF generation with new route...');
      console.log('📊 Invoice data being sent:', {
        invoiceNumber: invoiceData.invoiceNumber,
        saleType: invoiceData.saleType,
        invoiceType: invoiceData.invoiceType,
        warrantyInHouse: invoiceData.warranty.inHouse,
        warrantyLevel: invoiceData.warranty.level
      });

      const response = await fetch('/api/dynamic-invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Create filename: VehicleReg-FirstName-LastName
        const filename = `${invoiceData.vehicle.registration}_${invoiceData.customer.firstName}_${invoiceData.customer.lastName}.pdf`;
        
        // Download the PDF
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        console.log('✅ PDF generated successfully with enhanced matching');
        
        // Show success message with details
        alert(`✅ PDF Generated Successfully!\n\nFilename: ${filename}\n\nThe PDF has been generated to exactly match the live preview with all pages properly formatted.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert(`❌ Failed to generate PDF\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setGeneratingPDF(false);
      setSaving(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="pt-16">
          <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
                <h2 className="text-xl font-semibold mb-2">Loading Invoice Data</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Fetching sale details, company settings, and terms...
                </p>
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="pt-16">
          <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="w-full max-w-md">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2 text-red-600">Error Loading Invoice</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={loadInvoiceData} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                    <Button onClick={handleBack} variant="outline">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  // Main editor interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      {/* Add top padding to account for fixed header - same as inventory page */}
      <div className="pt-16">
        <main className="mx-auto px-2 py-6 w-full">

          {/* Header Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleBack}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Dynamic Invoice Editor
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {invoiceData?.vehicle.registration}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Save Status */}
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              
              {lastSaved && !hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Saved {lastSaved.toLocaleTimeString()}
                </Badge>
              )}

              {/* View Mode Toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'form' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('form')}
                  className="rounded-none"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'split' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('split')}
                  className="rounded-none"
                >
                  <Split className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'preview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('preview')}
                  className="rounded-none"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              {/* Save Changes Button - Top */}
              <Button
                onClick={handleSaveChanges}
                disabled={saving || !invoiceData}
                size="sm"
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                {saving && !generatingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>

              {/* Action Button - Save & Download PDF */}
              <Button
                onClick={handleSaveAndDownloadPDF}
                disabled={generatingPDF || saving}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generatingPDF || saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Save & Download PDF
              </Button>
            </div>
            </div>

            {/* Invoice Info Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Invoice Type</div>
              <div className="font-semibold">{invoiceData?.invoiceType}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Sale Type</div>
              <div className="font-semibold">{invoiceData?.saleType}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Invoice To</div>
              <div className="font-semibold">{invoiceData?.invoiceTo}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Sale Price</div>
              <div className="font-semibold">£{invoiceData?.pricing.salePrice?.toFixed(2)}</div>
            </Card>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`grid gap-6 ${
            viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-2' :
            viewMode === 'preview' ? 'grid-cols-1' :
            'grid-cols-1'
          }`} style={{ minHeight: '600px', height: 'auto' }}>
            {/* Form Editor */}
            {(viewMode === 'form' || viewMode === 'split') && (
              <div className={`${viewMode === 'form' ? 'xl:col-span-2' : ''}`}>
                <Card className="h-[900px] flex flex-col">
                  <CardHeader className="pb-4 flex-shrink-0">
                    <CardTitle className="flex items-center">
                      <Edit3 className="h-5 w-5 mr-2" />
                      Invoice Editor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-y-auto">
                    {invoiceData && (
                      <DynamicInvoiceFormWrapper
                        invoiceData={invoiceData}
                        onUpdate={handleInvoiceDataUpdate}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* PDF Preview */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`${viewMode === 'preview' ? 'xl:col-span-2' : ''}`}>
                <Card className="h-[900px] flex flex-col">
                  <CardHeader className="pb-4 flex-shrink-0">
                    <CardTitle className="flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Live Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-y-auto">
                    {invoiceData && (
                      <InvoicePDFPreviewWrapper
                        invoiceData={invoiceData}
                        className="h-full"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-4 mt-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {invoiceData && stockId && (
                  <>
                    Stock ID: {stockId}
                  </>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveChanges}
                  disabled={saving || !invoiceData}
                  size="sm"
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
                >
                  {saving && !generatingPDF ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleSaveAndDownloadPDF}
                  disabled={generatingPDF || saving || !invoiceData}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generatingPDF || saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Save & Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}

// Loading component for Suspense fallback
function DynamicInvoiceEditorLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      <div className="pt-16">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
              <h2 className="text-xl font-semibold mb-2">Loading Invoice Editor</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Preparing the dynamic invoice editor...
              </p>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

// Main export component with Suspense boundary
export default function DynamicInvoiceEditorPage() {
  return (
    <Suspense fallback={<DynamicInvoiceEditorLoading />}>
      <DynamicInvoiceEditorContent />
    </Suspense>
  );
}
