import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { 
  saleDetails, 
  companySettings, 
  customTerms, 
  vehicleChecklist,
  inventoryDetails,
  invoices,
  stockCache
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { getCityAndCountyFromPostcode } from '@/lib/postcodeUtils';
import { syncInvoiceData } from '@/lib/invoiceSyncService';

// Type for additional data stored in JSON fields
interface AdditionalInvoiceData {
  enhancedWarrantyPrice?: number | string;
  enhancedWarrantyPricePostDiscount?: number | string;
  discountOnEnhancedWarrantyPrice?: number | string;
  deliveryCost?: number | string;
  discountOnDelivery?: number | string;
  deliveryCostPostDiscount?: number | string;
  cardPayments?: Array<{ amount: number; date: string }>;
  bacsPayments?: Array<{ amount: number; date: string }>;
  cashPayments?: Array<{ amount: number; date: string }>;
  enhancedWarranty?: string;
  enhancedWarrantyLevel?: string;
  enhancedWarrantyDetails?: string;
}

interface VehicleData {
  engineNumber?: string;
  badgeEngineSizeLitres?: number;
  engineCapacityCC?: number;
  colour?: string;
}

interface ChecklistMetadata {
  mileage?: string;
  vehicleInspectionTestDrive?: string;
  dealerPreSaleCheck?: string;
  fuelType?: string;
  serviceHistory?: string;
}

// Comprehensive Invoice Data Interface matching invoice.md structure
export interface ComprehensiveInvoiceData {
  // Meta Information
  invoiceNumber: string;
  invoiceDate: string;
  saleType: 'Retail' | 'Trade' | 'Commercial';
  invoiceType: 'Retail (Customer) Invoice' | 'Trade Invoice';
  invoiceTo: 'Finance Company' | 'Customer';
  
  // Company Information (from companySettings)
  companyInfo: {
    name: string;
    address: {
      street: string;
      city: string;
      county: string;
      postCode: string;
      country: string;
    };
    contact: {
      phone: string;
      email: string;
      website?: string;
    };
    payment?: {
      bankName?: string;
      bankSortCode?: string;
      bankAccountNumber?: string;
      bankAccountName?: string;
      bankIban?: string;
      bankSwiftCode?: string;
    };
    vatNumber: string;
    registrationNumber?: string;
    logo?: string;
    qrCode?: string; // QR code image URL/path for invoice footer
  };
  
  // Customer Information (from saleDetails)
  customer: {
    title: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    address: {
      firstLine: string;
      secondLine?: string;
      city?: string;
      county?: string;
      postCode: string;
      country: string;
    };
    contact: {
      phone: string;
      email: string;
    };
    flags: {
      vulnerabilityMarker: boolean;
      gdprConsent: boolean;
      salesMarketingConsent: boolean;
    };
  };
  
  // Vehicle Information
  vehicle: {
    registration: string;        // {Vehicle Registration:4}
    make: string;               // {Make:25}
    model: string;              // {Model:26}
    derivative: string;         // {Derivative:23}
    mileage: string;            // {Mileage:101}
    engineNumber: string;       // {Engine Number:27}
    engineCapacity: string;     // {Engine Capacity:28}
    vin: string;                // {VIN:22}
    firstRegDate: string;       // {First Reg Date (UK):29}
    colour: string;             // {Colour:30}
    fuelType: string;           // {Fuel Type:25}
  };
  
  // Financial Information
  pricing: {
    salePrice: number;                    // {Sale Price:6}
    discountOnSalePrice?: number;         // {Discount on Sale Price:64/51}
    salePricePostDiscount: number;        // {Sale Price Post-Discount:68}
    voluntaryContribution?: number;     // Voluntary contribution to sale price
    
    // Warranty
    warrantyPrice?: number;               // {Warranty Price:45}
    discountOnWarranty?: number;          // {Discount On Warranty:55}
    warrantyPricePostDiscount?: number;   // {Warranty Price Post Discount:70}
    
    // Enhanced/Upgraded Warranty
    enhancedWarrantyPrice?: number;       // Enhanced warranty price
    discountOnEnhancedWarranty?: number;  // Discount on enhanced warranty
    enhancedWarrantyPricePostDiscount?: number; // Enhanced warranty price after discount
    
    // Delivery
    deliveryCost?: number;                // {Delivery Cost:35}
    discountOnDelivery?: number;          // Discount on delivery cost
    deliveryCostPostDiscount?: number;    // Delivery cost after discount
    
    // Deposits
    compulsorySaleDepositFinance?: number;  // {Compulsory Sale Deposit (Finance):59}
    compulsorySaleDepositCustomer?: number; // For customer invoices
    amountPaidDepositFinance?: number;      // {Amount Paid in Deposit (F):72}
    amountPaidDepositCustomer?: number;     // {Amount Paid in Deposit (C):78}
    totalFinanceDepositPaid?: number;       // Combined: dealerDepositPaidCustomer + amountPaidDepositFinance
    outstandingDepositFinance?: number;     // {Outstanding Deposit Amount (F):76}
    outstandingDepositCustomer?: number;    // For customer invoices
    
    // Balance calculations
    tradeBalanceDue?: number;             // For trade invoices - remaining balance
    remainingBalance?: number;            // For customer invoices - remaining balance
    
    // Dealer Deposit Payment fields (for Finance Company invoices only)
    dealerDepositPaidCustomer?: number;     // Dealer Deposit Paid (Customer)
    dealerDepositPaymentDateCustomer?: string; // Payment Date (Customer)
    
    // Overpayments
    overpaymentsFinance?: number;           // Overpayments (Finance)
    overpaymentsCustomer?: number;          // Overpayments (Customer)
  };
  
  // Payment Breakdown (from saleDetails)
  payment: {
    method: string;
    breakdown: {
      // Multiple payment entries
      cardPayments: Array<{ amount: number; date: string }>;
      bacsPayments: Array<{ amount: number; date: string }>;
      cashPayments: Array<{ amount: number; date: string }>;
      // Single payment fields (legacy/calculated totals)
      cashAmount: number;
      bacsAmount: number;
      cardAmount: number;                  // Separate card payments
      financeAmount: number;
      depositAmount: number;
      partExAmount: number;
      // Dealer Deposit Payment (Vehicle Reservation Fees)
      dealerDepositAmount?: number;
      dealerDepositDate?: string;
      // Payment dates (legacy)
      cashDate?: string;
      bacsDate?: string;
      cardDate?: string;
      financeDate?: string;
      depositDate?: string;
      partExDate?: string;
    };
    
    // Part Exchange Details
    partExchange?: {
      included: boolean;
      vehicleRegistration?: string;       // {PX Vehicle Registration:86}
      makeAndModel?: string;              // {PX Make and Model:87}
      mileage?: string;
      valueOfVehicle?: number;
      settlementAmount?: number;          // {Settlement Amount:96}
      amountPaid?: number;                // {Amount Paid in Part Exchange:90}
    };
    
    // Balance Calculations
    balanceToFinance?: number;            // {Balance to Finance:135}
    customerBalanceDue?: number;          // {Customer Balance Due:99}
    totalBalance: number;
    outstandingBalance: number;
  };
  
  // Finance Company Information (conditional)
  financeCompany?: {
    name: string;                         // {Finance Company:17}
    companyName?: string;                 // {Finance Company Name:192}
    address?: {
      firstLine?: string;                 // {First Line and Street:193}
      countyPostCodeContact?: string;     // {County Post Cost and Contact Details:194}
    };
  };
  
  // Warranty Information
  warranty: {
    level: string;                        // {Warranty Level:48}
    name?: string;                        // Custom warranty name
    inHouse: boolean;                     // {In house?:81}
    details?: string;                     // {Warranty details for Customer:72}
    type: 'none' | 'in_house' | 'third_party';
    // Enhanced/Upgraded Warranty
    enhanced?: boolean;                   // Whether enhanced warranty is selected
    enhancedLevel?: string;               // Enhanced warranty level
    enhancedName?: string;                // Custom enhanced warranty name
    enhancedDetails?: string;             // Enhanced warranty details
  };
  
  // Add-ons and Extras
  addons: {
    finance: {
      enabled: boolean;                   // {Extras/Addons - Finance:195}
      addon1?: {
        name: string;                     // {Finance add-on 1:196}
        cost: number;                     // {Finance Add-on 1 Cost:49}
        discount?: number;
        postDiscountCost?: number;        // Calculated: cost - discount
      };
      addon2?: {
        name: string;                     // {Finance add-on 2:198}
        cost: number;                     // {Finance Add-on 2 Cost:50}
        discount?: number;
        postDiscountCost?: number;        // Calculated: cost - discount
      };
      dynamicAddons?: Array<{             // Dynamic finance addons
        name: string;
        cost: number;
        discount?: number;
        postDiscountCost?: number;        // Calculated: cost - discount
      }>;
    };
    customer: {
      enabled: boolean;                   // {Extras/Addons - Non-Finance:200}
      addon1?: {
        name: string;                     // {Customer add-on 1:201}
        cost: number;                     // {Customer Add-on 1 Cost:55}
        discount?: number;
        postDiscountCost?: number;        // Calculated: cost - discount
      };
      addon2?: {
        name: string;                     // {Customer add-on 2:203}
        cost: number;                     // {Customer Add-on 2 Cost:56}
        discount?: number;
        postDiscountCost?: number;        // Calculated: cost - discount
      };
      dynamicAddons?: Array<{             // Dynamic customer addons
        name: string;
        cost: number;
        discount?: number;
        postDiscountCost?: number;        // Calculated: cost - discount
      }>;
    };
  };
  
  // Delivery Information
  delivery: {
    type: 'collection' | 'delivery';      // {Collection/Delivery:188}
    date?: string;                        // {Date of Collection / Delivery:129}
    cost?: number;
    discount?: number;                    // Discount on delivery cost
    postDiscountCost?: number;           // Delivery cost after discount
    address?: string;
  };
  
  // Sale Information
  sale: {
    date: string;                         // {Date of Sale:7}
    monthOfSale: string;
    quarterOfSale: string;
    daysInStock?: number;
    costOfPurchase?: number;
    dateOfPurchase?: string;
  };
  
  // Vehicle Checklist (from vehicleChecklist table)
  checklist: {
    mileage?: string;                     // {Mileage:101}
    numberOfKeys?: string;                // {Number of Keys:19}
    userManual?: string;                  // {User Manual:21}
    serviceHistoryRecord?: string;        // {Service History Record:20}
    wheelLockingNut?: string;             // {Wheel Locking Nut:22}
    cambeltChainConfirmation?: string;    // {Cambelt / Chain Confirmation:23}
    vehicleInspectionTestDrive?: string;  // {Vehicle Inspection / Test drive:24}
    dealerPreSaleCheck?: string;          // {Dealer Pre-Sale…:130}
    fuelType?: string;                    // {Fuel Type:25}
    serviceHistory?: string;              // Additional service history field
    completionPercentage?: number;        // Checklist completion percentage
    isComplete?: boolean;                 // Whether checklist is complete
  };
  
  // Signature Information
  signature: {
    customerSignature?: string;           // {Customer Signature:82}
    customerAvailableForSignature?: string; // {Customer Available for Signature:153}
    dateOfSignature?: string;             // {Date Of Signature:152}
  };
  
  // Terms & Conditions (from customTerms table)
  terms: {
    checklistTerms: string;      // PAGE 2: Vehicle checklist terms
    basicTerms: string;          // PAGE 3: Standard retail T&Cs
    inHouseWarrantyTerms: string; // PAGE 4: In-house warranty terms
    thirdPartyTerms: string;     // PAGE 6: External warranty terms
    tradeTerms: string;          // PAGE 2: Trade sale disclaimer
  };
  
  // Status Information
  status: {
    documentationComplete: boolean;
    keyHandedOver: boolean;
    customerSatisfied: boolean;
    depositPaid: boolean;
    vehiclePurchased: boolean;
  };
  
  // Additional Data
  notes?: string;
  additionalInformation?: string;
  customerAcceptedIdd?: string;
  
  // Invoice Items (for PDF generation)
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    vatRate?: number;
    total: number;
  }>;
  
  // VAT and Discount modes (for PDF generation)
  vatMode?: 'individual' | 'global';
  discountMode?: 'individual' | 'global';
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
}

// GET - Fetch comprehensive invoice data
export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

    const { searchParams } = new URL(request.url);
    const saleId = searchParams.get('saleId');
    const stockId = searchParams.get('stockId');

    if (!saleId && !stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Either saleId or stockId is required' 
      }, { status: 400 });
    }

    console.log('📖 Fetching comprehensive invoice data for:', { saleId, stockId, dealerId });

    // 1. Fetch Sale Details
    let saleDetailsData = null;
    if (saleId) {
      const saleResult = await db
        .select()
        .from(saleDetails)
        .where(and(
          eq(saleDetails.id, parseInt(saleId)),
          eq(saleDetails.dealerId, dealerId)
        ))
        .limit(1);
      
      saleDetailsData = saleResult[0] || null;
    } else if (stockId) {
      const saleResult = await db
        .select()
        .from(saleDetails)
        .where(and(
          eq(saleDetails.stockId, stockId),
          eq(saleDetails.dealerId, dealerId)
        ))
        .limit(1);
      
      saleDetailsData = saleResult[0] || null;
    }

    if (!saleDetailsData && !stockId) {
      return NextResponse.json({
        success: false,
        error: 'Sale details not found and no stock ID provided'
      }, { status: 404 });
    }

    // If no sale details but we have stockId, create minimal data structure
    if (!saleDetailsData && stockId) {
      console.log('⚠️ No sale details found, creating minimal structure for stockId:', stockId);
      // We'll continue with minimal data and let the user fill in the details
    }

    // 2. Fetch Company Settings
    const companyResult = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    const companyData = companyResult[0] || null;

    // 3. Fetch Custom Terms
    const termsResult = await db
      .select()
      .from(customTerms)
      .where(eq(customTerms.dealerId, dealerId))
      .limit(1);

    const termsData = termsResult[0] || null;

    // Determine the stockId to use for queries
    const queryStockId = saleDetailsData?.stockId || stockId;

    // 4. Fetch Vehicle Checklist
    let checklistData = null;
    if (queryStockId) {
      const checklistResult = await db
        .select()
        .from(vehicleChecklist)
        .where(and(
          eq(vehicleChecklist.stockId, queryStockId),
          eq(vehicleChecklist.dealerId, dealerId)
        ))
        .limit(1);

      checklistData = checklistResult[0] || null;
    }

    // 5. Fetch Inventory Details
    let inventoryData = null;
    if (queryStockId) {
      const inventoryResult = await db
        .select()
        .from(inventoryDetails)
        .where(and(
          eq(inventoryDetails.stockId, queryStockId),
          eq(inventoryDetails.dealerId, dealerId)
        ))
        .limit(1);

      inventoryData = inventoryResult[0] || null;
    }

    // 6. Fetch Stock Cache Data for additional vehicle information
    let stockData = null;
    if (queryStockId) {
      const stockResult = await db
        .select()
        .from(stockCache)
        .where(and(
          eq(stockCache.stockId, queryStockId),
          eq(stockCache.dealerId, dealerId)
        ))
        .limit(1);

      stockData = stockResult[0] || null;
    }

    // 7. Check for existing invoice
    let existingInvoice = null;
    if (queryStockId) {
      const existingInvoiceResult = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.stockId, queryStockId),
          eq(invoices.dealerId, dealerId)
        ))
        .limit(1);

      existingInvoice = existingInvoiceResult[0] || null;
    }

    // 7. Build comprehensive invoice data structure
    const invoiceData: ComprehensiveInvoiceData = {
      // Meta Information - Enhanced mapping
      invoiceNumber: existingInvoice?.invoiceNumber || `INV-${stockData?.registration || saleDetailsData?.registration || stockId || 'DRAFT'}-${Date.now()}`,
      invoiceDate: saleDetailsData?.saleDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      saleType: (existingInvoice?.saleType as 'Retail' | 'Trade' | 'Commercial') || 'Retail',
      invoiceType: ((existingInvoice?.saleType as 'Retail' | 'Trade' | 'Commercial') === 'Trade') ? 'Trade Invoice' : 'Retail (Customer) Invoice',
      invoiceTo: (existingInvoice?.invoiceTo as 'Finance Company' | 'Customer') || 'Customer',
      
      // Company Information
      companyInfo: {
        name: companyData?.companyName || '',
        address: {
          street: companyData?.addressStreet || '',
          city: companyData?.addressCity || '',
          county: companyData?.addressCounty || '',
          postCode: companyData?.addressPostCode || '',
          country: companyData?.addressCountry || 'United Kingdom',
        },
        contact: {
          phone: companyData?.contactPhone || '',
          email: companyData?.contactEmail || '',
          website: companyData?.contactWebsite || '',
        },
        payment: {
          bankName: companyData?.bankName || '',
          bankSortCode: companyData?.bankSortCode || '',
          bankAccountNumber: companyData?.bankAccountNumber || '',
          bankAccountName: companyData?.bankAccountName || '',
          bankIban: companyData?.bankIban || '',
          bankSwiftCode: companyData?.bankSwiftCode || '',
        },
        vatNumber: companyData?.vatNumber || '',
        registrationNumber: companyData?.registrationNumber || '',
        logo: companyData?.companyLogoPublicUrl || '',
        qrCode: companyData?.qrCodePublicUrl || '',
      },
      
      // Customer Information - From sale details only
      customer: {
        title: existingInvoice?.customerTitle || '',
        firstName: saleDetailsData?.firstName || '',
        middleName: existingInvoice?.customerMiddleName || '',
        lastName: saleDetailsData?.lastName || '',
        address: (() => {
          const postCode = saleDetailsData?.addressPostCode || '';
          const { city, county } = getCityAndCountyFromPostcode(postCode);
          
          return {
            firstLine: saleDetailsData?.addressFirstLine || '',
            secondLine: '',
            city: city || '',
            county: county || '',
            postCode: postCode,
            country: 'United Kingdom',
          };
        })(),
        contact: {
          phone: saleDetailsData?.contactNumber || '',
          email: saleDetailsData?.emailAddress || '',
        },
        flags: {
          vulnerabilityMarker: saleDetailsData?.vulnerabilityMarker || false,
          gdprConsent: saleDetailsData?.gdprConsent || false,
          salesMarketingConsent: saleDetailsData?.salesMarketingConsent || false,
        },
      },
      
      // Vehicle Information - Enhanced mapping from multiple sources
      vehicle: {
        registration: stockData?.registration || saleDetailsData?.registration || stockId || '',
        make: stockData?.make || existingInvoice?.make || '',
        model: stockData?.model || existingInvoice?.model || '',
        derivative: stockData?.derivative || existingInvoice?.derivative || '',
        mileage: stockData?.odometerReadingMiles?.toString() || '',
        engineNumber: existingInvoice?.engineNumber || (stockData?.vehicleData as VehicleData)?.engineNumber || '',
        engineCapacity: existingInvoice?.engineCapacity || (() => {
          const vehicleData = stockData?.vehicleData as VehicleData;
          // Try badgeEngineSizeLitres first (e.g., 2.0L), then engineCapacityCC (e.g., 1998cc)
          if (vehicleData?.badgeEngineSizeLitres) {
            return `${vehicleData.badgeEngineSizeLitres}L`;
          } else if (vehicleData?.engineCapacityCC) {
            return `${vehicleData.engineCapacityCC}cc`;
          }
          return '';
        })(),
        vin: stockData?.vin || existingInvoice?.vin || '',
        firstRegDate: stockData?.yearOfManufacture ? `${stockData.yearOfManufacture}-01-01` : existingInvoice?.firstRegDate?.toISOString().split('T')[0] || '',
        colour: (stockData?.vehicleData as VehicleData)?.colour || existingInvoice?.colour || '',
        fuelType: stockData?.fuelType || existingInvoice?.fuelType || '',
      },
      
      // Financial Information - Enhanced mapping from sale details and stock cache
      pricing: {
        salePrice: parseFloat(saleDetailsData?.salePrice?.toString() || stockData?.forecourtPriceGBP?.toString() || '0'),
        salePricePostDiscount: parseFloat(saleDetailsData?.salePrice?.toString() || stockData?.forecourtPriceGBP?.toString() || '0'),
        discountOnSalePrice: 0,
        warrantyPrice: 0,
        warrantyPricePostDiscount: 0,
        discountOnWarranty: 0,
        // Enhanced warranty pricing fields
        enhancedWarrantyPrice: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.enhancedWarrantyPrice?.toString() || '0'),
        enhancedWarrantyPricePostDiscount: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.enhancedWarrantyPricePostDiscount?.toString() || '0'),
        discountOnEnhancedWarranty: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.discountOnEnhancedWarrantyPrice?.toString() || '0'),
        // Delivery pricing fields
        deliveryCost: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.deliveryCost?.toString() || saleDetailsData?.deliveryPrice?.toString() || '0'),
        discountOnDelivery: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.discountOnDelivery?.toString() || '0'),
        deliveryCostPostDiscount: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.deliveryCostPostDiscount?.toString() || saleDetailsData?.deliveryPrice?.toString() || '0'),
        compulsorySaleDepositFinance: 0,
        compulsorySaleDepositCustomer: 0,
        amountPaidDepositFinance: 0,
        amountPaidDepositCustomer: 0,
      },
      
      // Payment Breakdown - Initialize empty for manual entry in invoice
      payment: {
        method: 'cash',
        breakdown: {
          // Multiple payment entries - initialize empty for manual entry
          cardPayments: (() => {
            // Try to get from existing invoice additionalData
            const existingCardPayments = (existingInvoice?.additionalData as AdditionalInvoiceData)?.cardPayments;
            if (existingCardPayments && Array.isArray(existingCardPayments) && existingCardPayments.length > 0) {
              return existingCardPayments;
            }
            return [{ amount: 0, date: '' }];
          })(),
          bacsPayments: (() => {
            // Try to get from existing invoice additionalData
            const existingBacsPayments = (existingInvoice?.additionalData as AdditionalInvoiceData)?.bacsPayments;
            if (existingBacsPayments && Array.isArray(existingBacsPayments) && existingBacsPayments.length > 0) {
              return existingBacsPayments;
            }
            return [{ amount: 0, date: '' }];
          })(),
          cashPayments: (() => {
            // Try to get from existing invoice additionalData
            const existingCashPayments = (existingInvoice?.additionalData as AdditionalInvoiceData)?.cashPayments;
            if (existingCashPayments && Array.isArray(existingCashPayments) && existingCashPayments.length > 0) {
              return existingCashPayments;
            }
            return [{ amount: 0, date: '' }];
          })(),
          // Initialize all payment fields as 0 for manual entry
          cashAmount: 0,
          bacsAmount: 0,
          cardAmount: 0,
          financeAmount: 0,
          depositAmount: 0,
          partExAmount: 0,
          // Initialize payment dates as empty
          cashDate: '',
          bacsDate: '',
          cardDate: '',
          financeDate: '',
          depositDate: '',
          partExDate: '',
        },
        totalBalance: parseFloat(saleDetailsData?.salePrice?.toString() || stockData?.forecourtPriceGBP?.toString() || '0'),
        outstandingBalance: 0,
        balanceToFinance: 0,
        customerBalanceDue: 0,
        partExchange: undefined,
      },
      
      // Finance Company (if applicable)
      financeCompany: existingInvoice?.financeCompany ? {
        name: existingInvoice.financeCompany,
        companyName: existingInvoice.financeCompanyName || '',
      } : undefined,
      
      // Warranty Information - Enhanced mapping
      warranty: {
        level: existingInvoice?.warrantyLevel || '',
        inHouse: (saleDetailsData?.warrantyType === 'in_house') || false,
        details: existingInvoice?.warrantyDetails || '',
        type: (saleDetailsData?.warrantyType as 'none' | 'in_house' | 'third_party') || 'none',
        // Enhanced warranty fields
        enhanced: (existingInvoice?.additionalData as AdditionalInvoiceData)?.enhancedWarranty === 'Yes' || false,
        enhancedLevel: (existingInvoice?.additionalData as AdditionalInvoiceData)?.enhancedWarrantyLevel || '',
        enhancedDetails: (existingInvoice?.additionalData as AdditionalInvoiceData)?.enhancedWarrantyDetails || '',
      },
      
      // Add-ons - Enhanced mapping from sale details
      addons: {
        finance: {
          enabled: false,
          addon1: undefined,
          addon2: undefined,
        },
        customer: {
          enabled: false,
          addon1: undefined,
          addon2: undefined,
        },
      },
      
      // Delivery Information - Enhanced mapping
      delivery: {
        type: (saleDetailsData?.deliveryType === 'delivery') ? 'delivery' : 'collection',
        date: saleDetailsData?.deliveryDate?.toISOString().split('T')[0] || '',
        cost: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.deliveryCost?.toString() || saleDetailsData?.deliveryPrice?.toString() || '0'),
        discount: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.discountOnDelivery?.toString() || '0'),
        postDiscountCost: parseFloat((existingInvoice?.additionalData as AdditionalInvoiceData)?.deliveryCostPostDiscount?.toString() || saleDetailsData?.deliveryPrice?.toString() || '0'),
        address: saleDetailsData?.deliveryAddress || '',
      },
      
      // Sale Information
      sale: {
        date: saleDetailsData?.saleDate?.toISOString().split('T')[0] || '',
        monthOfSale: saleDetailsData?.monthOfSale || '',
        quarterOfSale: saleDetailsData?.quarterOfSale || '',
        costOfPurchase: 0,
        dateOfPurchase: '',
      },
      
      // Vehicle Checklist - Enhanced mapping from multiple data sources
      checklist: {
        // Map mileage from stock cache first, then checklist metadata
        mileage: stockData?.odometerReadingMiles?.toString() || (checklistData?.metadata as ChecklistMetadata)?.mileage || '',
        numberOfKeys: checklistData?.numberOfKeys || '2', // Default to 2 keys
        userManual: checklistData?.userManual || 'Not Present',
        serviceHistoryRecord: checklistData?.serviceBook || 'Unknown',
        wheelLockingNut: checklistData?.wheelLockingNut || 'Not Present',
        cambeltChainConfirmation: checklistData?.cambeltChainConfirmation || 'No',
        vehicleInspectionTestDrive: (checklistData?.metadata as ChecklistMetadata)?.vehicleInspectionTestDrive || 'No',
        dealerPreSaleCheck: (checklistData?.metadata as ChecklistMetadata)?.dealerPreSaleCheck || 'No',
        // Map fuel type from stock cache first, then other sources
        fuelType: stockData?.fuelType || (checklistData?.metadata as ChecklistMetadata)?.fuelType || 'Petrol',
        // Additional checklist fields from metadata
        serviceHistory: (checklistData?.metadata as ChecklistMetadata)?.serviceHistory || 'Not Available',
        completionPercentage: checklistData?.completionPercentage || 0,
        isComplete: checklistData?.isComplete || false,
      },
      
      // Signature Information - Enhanced mapping
      signature: {
        customerSignature: '',
        customerAvailableForSignature: '',
        dateOfSignature: '',
      },
      
      // Terms & Conditions
      terms: {
        checklistTerms: termsData?.checklistTerms || '',
        basicTerms: termsData?.basicTerms || '',
        inHouseWarrantyTerms: termsData?.inHouseWarrantyTerms || '',
        thirdPartyTerms: termsData?.thirdPartyTerms || '',
        tradeTerms: termsData?.tradeTerms || '',
      },
      
      // Status Information
      status: {
        documentationComplete: saleDetailsData?.documentationComplete || false,
        keyHandedOver: saleDetailsData?.keyHandedOver || false,
        customerSatisfied: saleDetailsData?.customerSatisfied || false,
        depositPaid: saleDetailsData?.depositPaid || false,
        vehiclePurchased: saleDetailsData?.vehiclePurchased || false,
      },
      
      // Additional Data
      notes: saleDetailsData?.notes || '',
      additionalInformation: '',
      customerAcceptedIdd: 'N/A',
      
      // Invoice Items (create default vehicle item)
      items: [{
        description: `${existingInvoice?.make || 'Vehicle'} ${existingInvoice?.model || ''} - ${saleDetailsData?.registration || stockId || 'Registration'}`.trim(),
        quantity: 1,
        unitPrice: parseFloat(saleDetailsData?.salePrice?.toString() || '0'),
        discount: 0,
        vatRate: 20,
        total: parseFloat(saleDetailsData?.salePrice?.toString() || '0')
      }],
      
      // VAT and Discount modes
      vatMode: 'global' as const,
      discountMode: 'global' as const,
      subtotal: parseFloat(saleDetailsData?.salePrice?.toString() || '0'),
      vatAmount: parseFloat(saleDetailsData?.salePrice?.toString() || '0') * 0.2,
      totalAmount: parseFloat(saleDetailsData?.salePrice?.toString() || '0') * 1.2,
    };

    // Update warranty inHouse flag based on warranty type
    invoiceData.warranty.inHouse = invoiceData.warranty.type === 'in_house';

    console.log('✅ Comprehensive invoice data compiled successfully');

    return NextResponse.json({
      success: true,
      data: invoiceData,
      meta: {
        saleId: saleDetailsData?.id || null,
        stockId: saleDetailsData?.stockId || stockId,
        dealerId: dealerId,
        hasExistingInvoice: !!existingInvoice,
        dataSourcesFound: {
          saleDetails: !!saleDetailsData,
          companySettings: !!companyData,
          customTerms: !!termsData,
          vehicleChecklist: !!checklistData,
          inventoryDetails: !!inventoryData,
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching comprehensive invoice data:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Update comprehensive invoice data
export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

    const body = await request.json();
    const { stockId, invoiceData }: { stockId: string; invoiceData: Partial<ComprehensiveInvoiceData> } = body;

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 });
    }

    console.log('📝 Updating comprehensive invoice data for stockId:', stockId);

    // Check if invoice exists
    const existingInvoiceResult = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.stockId, stockId),
        eq(invoices.dealerId, dealerId)
      ))
      .limit(1);

    const existingInvoice = existingInvoiceResult[0];

    // Prepare invoice data for database
    const dbInvoiceData = {
      stockId,
      dealerId,
      invoiceNumber: invoiceData.invoiceNumber || `INV-${invoiceData.vehicle?.registration || stockId || 'DRAFT'}-${Date.now()}`,
      invoiceTo: invoiceData.invoiceTo || 'Customer',
      saleType: invoiceData.saleType || 'Retail',
      
      // Vehicle Information
      vehicleRegistration: invoiceData.vehicle?.registration || '',
      make: invoiceData.vehicle?.make || '',
      model: invoiceData.vehicle?.model || '',
      derivative: invoiceData.vehicle?.derivative || '',
      vin: invoiceData.vehicle?.vin || '',
      engineNumber: invoiceData.vehicle?.engineNumber || '',
      engineCapacity: invoiceData.vehicle?.engineCapacity || '',
      colour: invoiceData.vehicle?.colour || '',
      fuelType: invoiceData.vehicle?.fuelType || '',
      firstRegDate: invoiceData.vehicle?.firstRegDate ? new Date(invoiceData.vehicle.firstRegDate) : null,
      
      // Sale Information
      salePrice: (invoiceData.pricing?.salePrice || 0).toString(),
      dateOfSale: invoiceData.sale?.date ? new Date(invoiceData.sale.date) : new Date(),
      monthOfSale: invoiceData.sale?.monthOfSale || '',
      quarterOfSale: 1, // Will be calculated
      
      // Customer Information
      customerTitle: invoiceData.customer?.title || '',
      customerFirstName: invoiceData.customer?.firstName || '',
      customerMiddleName: invoiceData.customer?.middleName || '',
      customerSurname: invoiceData.customer?.lastName || '',
      customerAddress: {
        street: invoiceData.customer?.address?.firstLine || '',
        address2: invoiceData.customer?.address?.secondLine || '',
        city: invoiceData.customer?.address?.city || '',
        county: invoiceData.customer?.address?.county || '',
        postCode: invoiceData.customer?.address?.postCode || '',
        country: invoiceData.customer?.address?.country || 'United Kingdom',
      },
      customerContactNumber: invoiceData.customer?.contact?.phone || '',
      customerEmailAddress: invoiceData.customer?.contact?.email || '',
      
      // Finance Information
      financeCompany: invoiceData.financeCompany?.name || '',
      financeCompanyName: invoiceData.financeCompany?.companyName || '',
      
      // Warranty Information
      warrantyLevel: invoiceData.warranty?.level || '',
      warrantyPrice: (invoiceData.pricing?.warrantyPrice || 0).toString(),
      warrantyDetails: invoiceData.warranty?.details || '',
      
      // Delivery Information
      deliveryDate: invoiceData.delivery?.date ? new Date(invoiceData.delivery.date) : null,
      depositAmount: (invoiceData.pricing?.amountPaidDepositFinance || invoiceData.pricing?.amountPaidDepositCustomer || 0).toString(),
      
      // Status
      status: 'draft' as const,
      checklistValidated: false,
      
      // Store additional complex data in additionalData jsonb field
      additionalData: {
        // Financial calculations
        discountOnSalePrice: invoiceData.pricing?.discountOnSalePrice || 0,
        salePricePostDiscount: invoiceData.pricing?.salePricePostDiscount || invoiceData.pricing?.salePrice || 0,
        warrantyPricePostDiscount: invoiceData.pricing?.warrantyPricePostDiscount || invoiceData.pricing?.warrantyPrice || 0,
        
        // Deposits
        compulsorySaleDepositFinance: invoiceData.pricing?.compulsorySaleDepositFinance || 0,
        compulsorySaleDepositCustomer: invoiceData.pricing?.compulsorySaleDepositCustomer || 0,
        amountPaidDepositFinance: invoiceData.pricing?.amountPaidDepositFinance || 0,
        amountPaidDepositCustomer: invoiceData.pricing?.amountPaidDepositCustomer || 0,
        outstandingDepositFinance: invoiceData.pricing?.outstandingDepositFinance || 0,
        outstandingDepositCustomer: invoiceData.pricing?.outstandingDepositCustomer || 0,
        
        // Multiple Payments Data
        cardPayments: invoiceData.payment?.breakdown?.cardPayments || [{ amount: 0, date: '' }],
        bacsPayments: invoiceData.payment?.breakdown?.bacsPayments || [{ amount: 0, date: '' }],
        cashPayments: invoiceData.payment?.breakdown?.cashPayments || [{ amount: 0, date: '' }],
        
        // Part Exchange
        partExIncluded: !!invoiceData.payment?.partExchange?.included,
        pxVehicleRegistration: invoiceData.payment?.partExchange?.vehicleRegistration || '',
        pxMakeAndModel: invoiceData.payment?.partExchange?.makeAndModel || '',
        valueOfPxVehicle: invoiceData.payment?.partExchange?.valueOfVehicle || 0,
        settlementAmount: invoiceData.payment?.partExchange?.settlementAmount || 0,
        amountPaidPartExchange: invoiceData.payment?.partExchange?.amountPaid || 0,
        
        // Balance calculations
        balanceToFinance: invoiceData.payment?.balanceToFinance || 0,
        customerBalanceDue: invoiceData.payment?.customerBalanceDue || 0,
        
        // Checklist data
        mileage: invoiceData.checklist?.mileage || '',
        numberOfKeys: invoiceData.checklist?.numberOfKeys || '',
        userManual: invoiceData.checklist?.userManual || '',
        serviceHistoryRecord: invoiceData.checklist?.serviceHistoryRecord || '',
        wheelLockingNut: invoiceData.checklist?.wheelLockingNut || '',
        cambeltChainConfirmation: invoiceData.checklist?.cambeltChainConfirmation || '',
        vehicleInspectionTestDrive: invoiceData.checklist?.vehicleInspectionTestDrive || '',
        dealerPreSaleCheck: invoiceData.checklist?.dealerPreSaleCheck || '',
        
        // Signature data
        customerSignature: invoiceData.signature?.customerSignature || '',
        customerAvailableForSignature: invoiceData.signature?.customerAvailableForSignature || '',
        dateOfSignature: invoiceData.signature?.dateOfSignature || '',
        
        // Add-ons
        financeAddonsEnabled: invoiceData.addons?.finance?.enabled || false,
        financeAddon1: invoiceData.addons?.finance?.addon1?.name || '',
        financeAddon1Cost: invoiceData.addons?.finance?.addon1?.cost || 0,
        financeAddon2: invoiceData.addons?.finance?.addon2?.name || '',
        financeAddon2Cost: invoiceData.addons?.finance?.addon2?.cost || 0,
        customerAddonsEnabled: invoiceData.addons?.customer?.enabled || false,
        customerAddon1: invoiceData.addons?.customer?.addon1?.name || '',
        customerAddon1Cost: invoiceData.addons?.customer?.addon1?.cost || 0,
        customerAddon2: invoiceData.addons?.customer?.addon2?.name || '',
        customerAddon2Cost: invoiceData.addons?.customer?.addon2?.cost || 0,
        
        // Delivery
        deliveryType: invoiceData.delivery?.type || 'collection',
        deliveryCost: invoiceData.delivery?.cost || 0,
        discountOnDelivery: invoiceData.delivery?.discount || 0,
        deliveryCostPostDiscount: invoiceData.delivery?.postDiscountCost || invoiceData.delivery?.cost || 0,
        
      // Additional information
      notes: invoiceData.notes || '',
      additionalInformation: invoiceData.additionalInformation || '',
      customerAcceptedIdd: invoiceData.customerAcceptedIdd || 'N/A',
      },
      
      updatedAt: new Date(),
    };

    let result;
    if (existingInvoice) {
      // Update existing invoice
      console.log('📝 Updating existing invoice');
      result = await db
        .update(invoices)
        .set(dbInvoiceData)
        .where(and(
          eq(invoices.stockId, stockId),
          eq(invoices.dealerId, dealerId)
        ))
        .returning();
    } else {
      // Create new invoice
      console.log('📝 Creating new invoice');
      result = await db
        .insert(invoices)
        .values(dbInvoiceData)
        .returning();
    }

    console.log('✅ Invoice data saved successfully:', result[0]);

    // ==========================================
    // BIDIRECTIONAL SYNC: Use proper sync service
    // ==========================================
    
    console.log('🔄 Starting bidirectional sync for stockId:', stockId);
    
    try {
      // Use the sync service which handles:
      // 1. Customer creation/update in CRM
      // 2. Sales details sync with payment aggregation
      // 3. Proper data validation and error handling
      // Only sync if we have complete invoice data
      if (invoiceData.invoiceNumber && invoiceData.invoiceDate && invoiceData.saleType) {
        const syncResult = await syncInvoiceData(dealerId, stockId, invoiceData as ComprehensiveInvoiceData);
        
        if (syncResult.success) {
          console.log('✅ Invoice sync completed successfully:', {
            customerId: syncResult.customerId,
            saleDetailsId: syncResult.saleDetailsId
          });
        } else {
          console.log('⚠️ Invoice sync completed with issues:', {
            errors: syncResult.errors,
            warnings: syncResult.warnings
          });
        }
      } else {
        console.log('⚠️ Skipping sync - invoice data is incomplete');
      }

      // Note: Vehicle checklist sync could be added to the sync service if needed
      // For now, keeping checklist separate as it's specific to invoice workflow
      
    } catch (syncError) {
      console.error('⚠️ Error during bidirectional sync (non-critical):', syncError);
      // Don't fail the main request if sync fails
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice data saved successfully with bidirectional sync',
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error saving comprehensive invoice data:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
