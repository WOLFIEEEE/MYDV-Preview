import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { renderToBuffer } from '@react-pdf/renderer';
import ProfessionalInvoicePreviewPDF from '@/components/invoice/ProfessionalInvoicePreviewPDF';
import { ComprehensiveInvoiceData } from '@/app/api/invoice-data/route';

// Interface for the invoice preview data from the store-owner settings page
interface InvoicePreviewData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceTitle?: string;
  invoiceType?: 'purchase' | 'standard';
  recipientType?: 'customer' | 'business' | 'myself';
  // New fields for purchase invoices
  deliverToType?: 'customer' | 'business' | 'myself';
  deliverToData?: any | null;
  purchaseFromType?: 'customer' | 'business' | 'myself';
  purchaseFromData?: any | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountAmount?: number;
    vatRate?: number;
    vatAmount?: number;
    total: number;
    totalWithVat?: number;
  }>;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  vatMode: 'global' | 'individual';
  discountMode?: 'global' | 'individual';
  globalDiscountType?: 'percentage' | 'fixed';
  globalDiscountValue?: number;
  globalDiscountAmount?: number;
  totalDiscount?: number;
  subtotalAfterDiscount?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  paymentType?: 'none' | 'percentage' | 'fixed';
  paymentValue?: number;
  paidAmount?: number;
  outstandingBalance?: number;
  payments?: Array<{
    id: string;
    type: 'Card' | 'BACS' | 'Cash';
    amount: number | string;
    date: string;
    reference?: string;
  }>;
  notes: string;
  terms: string;
  paymentInstructions: string;
  companyInfo: {
    companyName?: string;
    companyLogo?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    vatNumber?: string;
    companyNumber?: string;
    description?: string;
  } | null;
  vehicle: {
    stockId?: string;
    registration?: string;
    make?: string;
    model?: string;
    derivative?: string;
    year?: number;
    yearOfManufacture?: number;
    fuelType?: string;
    bodyType?: string;
    price?: number;
    forecourtPriceGBP?: number;
    mileage?: number;
    odometerReadingMiles?: number;
    vin?: string;
    colour?: string;
    displayName?: string;
    firstRegistrationDate?: string;
    transmissionType?: string;
    ownershipCondition?: string;
    engineNumber?: string;
  } | null;
  customer: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
    displayName?: string;
    fullName?: string;
    businessName?: string;
  } | null;
  business?: {
    businessName?: string;
    email?: string;
    phone?: string;
    vatNumber?: string;
    companyNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
  } | null;
}

// Function to convert InvoicePreviewData to ComprehensiveInvoiceData
function mapInvoicePreviewToComprehensive(previewData: InvoicePreviewData): any {
  // Helper function to create customer data based on recipient type
  const createCustomerData = () => {
    if (previewData.recipientType === 'business' && previewData.business) {
      // Map business data to Business interface format
      return {
        businessName: previewData.business.businessName || previewData?.customer?.businessName || previewData.customer?.displayName || '',
        email: previewData.business.email || '',
        phone: previewData.business.phone || '',
        vatNumber: previewData.business.vatNumber || '',
        companyNumber: previewData.business.companyNumber || '',
        address: {
          firstLine: previewData.business.addressLine1 || '',
          secondLine: previewData.business.addressLine2 || '',
          city: previewData.business.city || '',
          county: previewData.business.county || '',
          postCode: previewData.business.postcode || '',
          country: previewData.business.country || 'United Kingdom',
        },
      };
    } else if (previewData.recipientType === 'myself') {
      // Map company info to Business interface format (since company is essentially a business)
      return {
        businessName: previewData.companyInfo?.companyName || 'Your Company Name',
        email: previewData.companyInfo?.email || '',
        phone: previewData.companyInfo?.phone || '',
        vatNumber: previewData.companyInfo?.vatNumber || '',
        companyNumber: previewData.companyInfo?.companyNumber || '',
        address: {
          firstLine: previewData.companyInfo?.addressLine1 || '',
          secondLine: previewData.companyInfo?.addressLine2 || '',
          city: previewData.companyInfo?.city || '',
          county: previewData.companyInfo?.county || '',
          postCode: previewData.companyInfo?.postcode || '',
          country: previewData.companyInfo?.country || 'United Kingdom',
        },
      };
    } else {
      // Standard customer data mapped to Customer interface format
      return {
        businessName: previewData?.customer?.businessName || previewData.customer?.displayName || '',
        firstName: previewData.customer?.firstName || '',
        lastName: previewData.customer?.lastName || '',
        email: previewData.customer?.email || '',
        phone: previewData.customer?.phone || '',
        address: {
          firstLine: previewData.customer?.addressLine1 || '',
          secondLine: previewData.customer?.addressLine2 || '',
          city: previewData.customer?.city || '',
          county: previewData.customer?.county || '',
          postCode: previewData.customer?.postcode || '',
          country: previewData.customer?.country || 'United Kingdom',
        },
      };
    }
  };

  return {
    // Include recipient type for PDF component
    recipientType: previewData.recipientType,
    
    // Meta Information
    invoiceNumber: previewData.invoiceNumber,
    invoiceTitle: previewData.invoiceTitle || 'Invoice',
    invoiceDate: previewData.invoiceDate,
    dueDate: previewData.dueDate,
    saleType: 'Retail' as const,
    invoiceType: previewData.invoiceType || 'standard',
    // invoiceTo: 'Customer' as const,
    
    // Company Information
    companyInfo: {
      name: previewData.companyInfo?.companyName || 'Your Company Name',
      address: {
        street: previewData.companyInfo?.addressLine1 || '',
        city: previewData.companyInfo?.city || '',
        county: previewData.companyInfo?.county || '',
        postCode: previewData.companyInfo?.postcode || '',
        country: previewData.companyInfo?.country || 'United Kingdom',
      },
      contact: {
        phone: previewData.companyInfo?.phone || '',
        email: previewData.companyInfo?.email || '',
        website: previewData.companyInfo?.website || '',
      },
      vatNumber: previewData.companyInfo?.vatNumber || '',
      registrationNumber: previewData.companyInfo?.companyNumber || '',
      logo: previewData.companyInfo?.companyLogo || '',
    },
    
    // Customer Information (can be customer, business, or company data)
    customer: createCustomerData(),
    
    // Vehicle Information
    vehicle: previewData?.vehicle ? {
      registration: previewData.vehicle?.registration || '',
      make: previewData.vehicle?.make || '',
      model: previewData.vehicle?.model || '',
      derivative: previewData.vehicle?.derivative || '',
      mileage: previewData.vehicle?.mileage?.toString() || previewData.vehicle?.odometerReadingMiles?.toString() || '',
      engineNumber: previewData.vehicle?.engineNumber || '',
      engineCapacity: '',
      bodyType: previewData.vehicle?.bodyType || '',
      ownershipCondition: previewData.vehicle?.ownershipCondition || '',
      vin: previewData.vehicle?.vin || '',
      firstRegDate: previewData.vehicle?.firstRegistrationDate || '',
      colour: previewData.vehicle?.colour || '',
      fuelType: previewData.vehicle?.fuelType || '',
      transmissionType: previewData.vehicle?.transmissionType || '',
    } : null,
    
    // Financial Information
    pricing: {
      salePrice: parseFloat(String(previewData.vehicle?.price || previewData.vehicle?.forecourtPriceGBP || 0)),
      salePricePostDiscount: parseFloat(String(previewData.subtotalAfterDiscount || previewData.subtotal)),
      discountOnSalePrice: parseFloat(String(previewData.totalDiscount || 0)),
      warrantyPrice: 0,
      warrantyPricePostDiscount: 0,
      discountOnWarranty: 0,
    },
    
    // Payment Information - Map from actual payment entries
    payment: {
      method: 'cash',
      breakdown: {
        cardPayments: (previewData.payments || [])
          .filter(p => p.type === 'Card')
          .map(p => ({ amount: Number(p.amount) || 0, date: p.date || '' })),
        bacsPayments: (previewData.payments || [])
          .filter(p => p.type === 'BACS')
          .map(p => ({ amount: Number(p.amount) || 0, date: p.date || '' })),
        cashPayments: (previewData.payments || [])
          .filter(p => p.type === 'Cash')
          .map(p => ({ amount: Number(p.amount) || 0, date: p.date || '' })),
        cardAmount: (previewData.payments || [])
          .filter(p => p.type === 'Card')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        bacsAmount: (previewData.payments || [])
          .filter(p => p.type === 'BACS')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        cashAmount: (previewData.payments || [])
          .filter(p => p.type === 'Cash')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        financeAmount: 0,
        depositAmount: 0,
        partExAmount: 0,
      },
      totalBalance: parseFloat(String(previewData.total)),
      outstandingBalance: Math.max(0, parseFloat(String(previewData.total)) - 
        (previewData.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)),
    },
    
    // Warranty Information
    warranty: {
      level: 'None Selected',
      inHouse: false,
      details: '',
      type: 'none' as const,
    },
    
    // Add-ons
    addons: {
      finance: {
        enabled: false,
      },
      customer: {
        enabled: false,
      },
    },
    
    // Delivery Information
    delivery: {
      type: 'collection' as const,
      cost: 0,
      postDiscountCost: 0,
    },
    
    // Sale Information
    sale: {
      date: previewData.invoiceDate,
      monthOfSale: '',
      quarterOfSale: '',
    },
    
    // Vehicle Checklist
    checklist: {
      mileage: previewData.vehicle?.mileage?.toString() || previewData.vehicle?.odometerReadingMiles?.toString() || '',
      numberOfKeys: '2',
      userManual: 'Present',
      serviceHistoryRecord: 'Full Service History',
      wheelLockingNut: 'Present',
      cambeltChainConfirmation: 'Yes',
      vehicleInspectionTestDrive: 'Yes',
      dealerPreSaleCheck: 'Yes',
      fuelType: previewData.vehicle?.fuelType || 'Petrol',
      completionPercentage: 100,
      isComplete: true,
    },
    
    // Signature Information
    signature: {
      customerSignature: '',
      customerAvailableForSignature: 'Yes',
      dateOfSignature: previewData.invoiceDate,
    },
    
    // Terms & Conditions
    terms: {
      checklistTerms: previewData.terms || '',
      basicTerms: previewData.terms || '',
      inHouseWarrantyTerms: '',
      thirdPartyTerms: '',
      tradeTerms: '',
    },
    
    // Status Information
    status: {
      documentationComplete: true,
      keyHandedOver: false,
      customerSatisfied: true,
      depositPaid: (previewData.paidAmount || 0) > 0,
      vehiclePurchased: true,
    },
    
    // Additional Data
    notes: previewData.notes || '',
    additionalInformation: previewData.paymentInstructions || '',
    customerAcceptedIdd: 'N/A',
    
    // Invoice Items - map from preview data
    items: previewData.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      vatRate: item.vatRate || previewData.vatRate,
      total: item.total,
    })),
    
    // VAT and Discount modes
    vatMode: previewData.vatMode,
    discountMode: previewData.discountMode || 'global',
    subtotal: parseFloat(String(previewData.subtotal)),
    vatAmount: parseFloat(String(previewData.vatAmount)),
    totalAmount: parseFloat(String(previewData.total)),
  };
}

// After mapping the primary data, build deliverTo/purchaseFrom parties if present
function attachOptionalParties(comprehensive: any, previewData: InvoicePreviewData) {
  const mapParty = (type?: string, data?: any) => {
    if (!type) return null;
    if (type === 'myself') {
      return {
        businessName: previewData.companyInfo?.companyName || 'Your Company Name',
        email: previewData.companyInfo?.email || '',
        phone: previewData.companyInfo?.phone || '',
        vatNumber: previewData.companyInfo?.vatNumber || '',
        companyNumber: previewData.companyInfo?.companyNumber || '',
        address: {
          firstLine: previewData.companyInfo?.addressLine1 || '',
          secondLine: previewData.companyInfo?.addressLine2 || '',
          city: previewData.companyInfo?.city || '',
          county: previewData.companyInfo?.county || '',
          postCode: previewData.companyInfo?.postcode || '',
          country: previewData.companyInfo?.country || 'United Kingdom',
        }
      };
    }

    if (type === 'business' && data) {
      return {
        businessName: data.businessName || data.business || data.businessName || data.displayName || '',
        email: data.email || '',
        phone: data.phone || '',
        vatNumber: data.vatNumber || data.businessVatNumber || '',
        companyNumber: data.companyNumber || data.companyNumber || data.businessCompanyNumber || '',
        address: {
          firstLine: data.addressLine1 || data.address || '',
          secondLine: data.addressLine2 || '',
          city: data.city || '',
          county: data.county || '',
          postCode: data.postcode || '',
          country: data.country || 'United Kingdom',
        }
      };
    }

    // customer
    if (type === 'customer' && data) {
      return {
        firstName: data.firstName || data.name || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        address: {
          firstLine: data.addressLine1 || '',
          secondLine: data.addressLine2 || '',
          city: data.city || '',
          county: data.county || '',
          postCode: data.postcode || '',
          country: data.country || 'United Kingdom',
        }
      };
    }

    return null;
  };

  comprehensive.deliverTo = mapParty(previewData.deliverToType, previewData.deliverToData);
  comprehensive.purchaseFrom = mapParty(previewData.purchaseFromType, previewData.purchaseFromData);

  return comprehensive;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the invoice preview data from request body
    const invoicePreviewData: InvoicePreviewData = await request.json();

    if (!invoicePreviewData) {
      return NextResponse.json(
        { success: false, error: 'Invoice data is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Generating PDF for invoice preview:', invoicePreviewData.invoiceNumber);

  // Convert InvoicePreviewData to ComprehensiveInvoiceData
  let comprehensiveData = mapInvoicePreviewToComprehensive(invoicePreviewData);
  // Attach optional parties (deliverTo / purchaseFrom) when present
  comprehensiveData = attachOptionalParties(comprehensiveData, invoicePreviewData);

    console.log('📊 Mapped invoice data:', {
      invoiceNumber: comprehensiveData.invoiceNumber,
      saleType: comprehensiveData.saleType,
      invoiceType: comprehensiveData.invoiceType,
      customerName: comprehensiveData.customer?.firstName ? `${comprehensiveData.customer.firstName} ${comprehensiveData.customer.lastName}` : (comprehensiveData.customer?.businessName || ''),
      salePrice: comprehensiveData.pricing.salePrice,
      deliverTo: comprehensiveData.deliverTo?.businessName || `${comprehensiveData.deliverTo?.firstName || ''} ${comprehensiveData.deliverTo?.lastName || ''}`,
      purchaseFrom: comprehensiveData.purchaseFrom?.businessName || `${comprehensiveData.purchaseFrom?.firstName || ''} ${comprehensiveData.purchaseFrom?.lastName || ''}`,
    });

    // Generate PDF buffer using the professional invoice preview PDF component
    const pdfBuffer = await renderToBuffer(
      ProfessionalInvoicePreviewPDF({ invoiceData: comprehensiveData as any })
    );

    console.log('✅ PDF generated successfully:', {
      invoiceNumber: comprehensiveData.invoiceNumber,
      bufferSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
      timestamp: new Date().toISOString()
    });

    // Create filename
    const filename = `${comprehensiveData.invoiceNumber}_${comprehensiveData?.vehicle?.registration || 'INVOICE'}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ Error generating invoice PDF:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'This endpoint requires a POST request with invoice data',
      availableEndpoints: {
        'POST /api/generate-invoice-pdf': 'Generate PDF from invoice data',
        'POST /api/dynamic-invoice-pdf': 'Generate PDF with enhanced styling'
      }
    },
    { status: 405 }
  );
}
