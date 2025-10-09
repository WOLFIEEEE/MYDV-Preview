import { syncInvoiceData } from '@/lib/invoiceSyncService';
import type { ComprehensiveInvoiceData } from '@/app/api/invoice-data/route';

/**
 * Test script to validate the invoice synchronization service
 * This script creates mock invoice data and tests the sync functionality
 */

// Mock invoice data for testing
const mockInvoiceData: ComprehensiveInvoiceData = {
  // Meta Information
  invoiceNumber: 'TEST-INV-001',
  invoiceDate: '2024-01-15',
  saleType: 'Retail',
  invoiceType: 'Retail (Customer) Invoice',
  invoiceTo: 'Customer',
  
  // Company Information (minimal for test)
  companyInfo: {
    name: 'Test Dealership',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      county: 'Test County',
      postCode: 'TE1 2ST',
      country: 'United Kingdom'
    },
    contact: {
      phone: '01234567890',
      email: 'test@dealership.com'
    },
    vatNumber: 'GB123456789'
  },
  
  // Customer Information
  customer: {
    title: 'Mr',
    firstName: 'John',
    lastName: 'Doe',
    address: {
      firstLine: '456 Customer Street',
      secondLine: 'Apt 2B',
      city: 'Customer City',
      county: 'Customer County',
      postCode: 'CU1 2ST',
      country: 'United Kingdom'
    },
    contact: {
      phone: '07123456789',
      email: 'john.doe@email.com'
    },
    flags: {
      vulnerabilityMarker: false,
      gdprConsent: true,
      salesMarketingConsent: true
    }
  },
  
  // Vehicle Information
  vehicle: {
    registration: 'TEST123',
    make: 'Toyota',
    model: 'Corolla',
    derivative: '1.8 Hybrid',
    mileage: '25000',
    engineNumber: 'ENG123456',
    engineCapacity: '1800',
    vin: 'VIN1234567890',
    firstRegDate: '2020-03-15',
    colour: 'Silver',
    fuelType: 'Hybrid'
  },
  
  // Financial Information
  pricing: {
    salePrice: 15000,
    discountOnSalePrice: 500,
    salePricePostDiscount: 14500,
    warrantyPrice: 800,
    warrantyPricePostDiscount: 800,
    deliveryCost: 200,
    deliveryCostPostDiscount: 200
  },
  
  // Payment Information with multiple payments
  payment: {
    method: 'mixed',
    breakdown: {
      // Multiple payment entries to test aggregation
      cardPayments: [
        { amount: 2000, date: '2024-01-15' },
        { amount: 1500, date: '2024-01-16' }
      ],
      bacsPayments: [
        { amount: 5000, date: '2024-01-17' }
      ],
      cashPayments: [
        { amount: 1000, date: '2024-01-15' }
      ],
      // Single payment fields
      cashAmount: 1000,
      bacsAmount: 5000,
      cardAmount: 3500,
      financeAmount: 5000,
      depositAmount: 500,
      partExAmount: 0
    },
    totalBalance: 15500,
    outstandingBalance: 0
  },
  
  // Sale Information
  sale: {
    date: '2024-01-15',
    monthOfSale: 'January 2024',
    quarterOfSale: 'Q1 2024'
  },
  
  // Status Information
  status: {
    documentationComplete: true,
    keyHandedOver: true,
    customerSatisfied: true,
    depositPaid: true,
    vehiclePurchased: true
  },
  
  // Delivery Information
  delivery: {
    type: 'delivery',
    cost: 200,
    date: '2024-01-20',
    address: '456 Customer Street, Customer City, CU1 2ST'
  },
  
  // Warranty Information
  warranty: {
    level: '24 Months',
    name: 'Test Warranty Co Extended Warranty',
    inHouse: false,
    details: 'Comprehensive 24-month extended warranty coverage',
    type: 'third_party',
    enhanced: false
  },
  
  // Addons Information
  addons: {
    finance: {
      enabled: false
    },
    customer: {
      enabled: false
    }
  },
  
  // Vehicle Checklist
  checklist: {
    mileage: '25000',
    numberOfKeys: '2',
    userManual: 'Present',
    serviceHistoryRecord: 'Available',
    wheelLockingNut: 'Present',
    cambeltChainConfirmation: 'Confirmed',
    vehicleInspectionTestDrive: 'Completed',
    dealerPreSaleCheck: 'Completed',
    fuelType: 'Hybrid',
    completionPercentage: 100,
    isComplete: true
  },
  
  // Signature Information
  signature: {
    customerSignature: '',
    customerAvailableForSignature: 'Yes',
    dateOfSignature: '2024-01-15'
  },
  
  // Terms & Conditions
  terms: {
    checklistTerms: 'Standard checklist terms and conditions apply.',
    basicTerms: 'Standard retail terms and conditions apply.',
    inHouseWarrantyTerms: '',
    thirdPartyTerms: 'Extended warranty terms apply as per provider.',
    tradeTerms: ''
  },
  
  // Notes
  notes: 'Test invoice for sync validation. Customer requested delivery.',
  additionalInformation: 'Test sync functionality',
  customerAcceptedIdd: 'Yes',
  
  // Invoice Items
  items: [
    {
      description: 'Toyota Corolla 1.8 Hybrid - TEST123',
      quantity: 1,
      unitPrice: 14500,
      total: 14500
    },
    {
      description: 'Extended Warranty - 24 months',
      quantity: 1,
      unitPrice: 800,
      total: 800
    },
    {
      description: 'Delivery Service',
      quantity: 1,
      unitPrice: 200,
      total: 200
    }
  ],
  
  // Totals
  subtotal: 15500,
  vatAmount: 0,
  totalAmount: 15500
};

/**
 * Test the invoice sync service
 */
async function testInvoiceSync() {
  console.log('🧪 Starting Invoice Sync Service Test');
  console.log('=====================================');
  
  // Test parameters (you would need to replace these with actual values)
  const testDealerId = 'test-dealer-id'; // Replace with actual dealer ID
  const testStockId = 'TEST-STOCK-001';
  
  try {
    console.log('📋 Test Invoice Data:');
    console.log('- Invoice Number:', mockInvoiceData.invoiceNumber);
    console.log('- Customer:', `${mockInvoiceData.customer.firstName} ${mockInvoiceData.customer.lastName}`);
    console.log('- Vehicle:', `${mockInvoiceData.vehicle.make} ${mockInvoiceData.vehicle.model} (${mockInvoiceData.vehicle.registration})`);
    console.log('- Sale Price:', `£${mockInvoiceData.pricing.salePricePostDiscount}`);
    console.log('- Payment Breakdown:');
    console.log('  - Card Payments:', mockInvoiceData.payment.breakdown.cardPayments);
    console.log('  - BACS Payments:', mockInvoiceData.payment.breakdown.bacsPayments);
    console.log('  - Cash Payments:', mockInvoiceData.payment.breakdown.cashPayments);
    console.log('');
    
    console.log('🔄 Running sync test...');
    const syncResult = await syncInvoiceData(testDealerId, testStockId, mockInvoiceData);
    
    console.log('📊 Sync Results:');
    console.log('- Success:', syncResult.success);
    console.log('- Customer ID:', syncResult.customerId || 'Not created');
    console.log('- Sale Details ID:', syncResult.saleDetailsId || 'Not created');
    
    if (syncResult.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      syncResult.warnings.forEach(warning => console.log('  -', warning));
    }
    
    if (syncResult.errors.length > 0) {
      console.log('❌ Errors:');
      syncResult.errors.forEach(error => console.log('  -', error));
    }
    
    if (syncResult.success) {
      console.log('✅ Test completed successfully!');
    } else {
      console.log('❌ Test completed with errors');
    }
    
  } catch (error) {
    console.error('💥 Test failed with exception:', error);
  }
  
  console.log('=====================================');
}

// Export for use in other test files
export { testInvoiceSync, mockInvoiceData };

// Run test if this file is executed directly
if (require.main === module) {
  testInvoiceSync();
}
