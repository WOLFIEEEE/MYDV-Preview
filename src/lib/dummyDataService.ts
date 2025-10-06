/**
 * Dummy Data Service for Testing Invoice Functionality
 * Provides comprehensive test data for different invoice scenarios
 */

export interface DummyDataScenario {
  id: string
  name: string
  description: string
  data: Record<string, any>
}

/**
 * Generate dummy data for different invoice scenarios
 */
export const DUMMY_DATA_SCENARIOS: DummyDataScenario[] = [
  {
    id: 'comprehensive_test',
    name: 'Comprehensive Test Data',
    description: 'Complete invoice with all fields, finance options, addons, and everything filled',
    data: {
      // Basic Information
      invoiceNumber: 'INV-2024-COMP-001',
      dateOfSale: '2024-01-20',
      invoiceTo: 'Finance Company',
      saleType: 'Retail',
      invoiceType: 'Retail (Customer) Invoice',
      
      // Customer Information
      title: 'Dr',
      firstName: 'Alexander',
      middleName: 'James',
      lastName: 'Thompson',
      email: 'alexander.thompson@example.com',
      phone: '07123 456789',
      address: '42 Victoria Gardens\nKensington\nLondon\nSW7 4RW',
      vulnerabilityMarker: false,
      gdprConsent: true,
      salesMarketingConsent: true,
      
      // Vehicle Information
      vehicleRegistration: 'MT24 XYZ',
      make: 'Mercedes-Benz',
      model: 'C-Class',
      derivative: 'C220d AMG Line Premium Plus',
      vin: 'WDD2050461A123456',
      mileage: '15750',
      colour: 'Obsidian Black Metallic',
      fuelType: 'Diesel',
      engineNumber: 'OM654DE20LA',
      engineCapacity: '1950cc',
      firstRegDate: '2024-03-15',
      
      // Purchase Information
      costOfPurchase: '28500',
      dateOfPurchase: '2023-12-01',
      daysInStock: 50,
      
      // Finance Company Information
      financeCompany: 'Jigsaw Finance',
      financeCompanyName: 'Jigsaw Finance Limited',
      financeStreetAddress: 'Genesis Centre, Innovation Way, Eureka Park',
      financeCountyPostCode: 'Stoke-on-Trent, Staffordshire, ST6 4BF',
      
      // Pricing Information
      salePrice: '32500',
      salePricePreDiscount: '33500',
      discountOnSalePrice: '1000',
      salePricePostDiscount: '32500',
      
      // Warranty Information
      warrantyLevel: '24 Months',
      warrantyName: 'Premium Comprehensive Warranty',
      inHouse: false,
      warrantyPrice: '899',
      warrantyPricePreDiscount: '999',
      discountOnWarrantyPrice: '100',
      warrantyPricePostDiscount: '899',
      warrantyDetails: 'Comprehensive 24-month mechanical and electrical warranty covering engine, transmission, electrical systems, air conditioning, and all major components. Includes nationwide breakdown assistance and courtesy car provision.',
      
      // Finance Add-ons
      addonsToFinance: 'Yes',
      financeAddon1: 'Gap Insurance',
      financeAddon1Cost: '399',
      financeAddon2: 'Extended Warranty',
      financeAddon2Cost: '599',
      financeAddonsArray: [
        { name: 'Mechanical Breakdown Insurance', cost: 299 },
        { name: 'Tyre & Alloy Protection', cost: 199 },
        { name: 'Key Replacement Cover', cost: 149 }
      ],
      
      // Customer Add-ons
      customerAddons: 'Yes',
      customerAddon1: 'Paint Protection Package',
      customerAddon1Cost: '299',
      customerAddon2: 'Interior Protection Kit',
      customerAddon2Cost: '199',
      customerAddonsArray: [
        { name: 'Ceramic Coating', cost: 599 },
        { name: 'Dash Cam Installation', cost: 199 },
        { name: 'Tinted Windows', cost: 299 },
        { name: 'Alloy Wheel Protection', cost: 149 },
        { name: 'Fabric Protection', cost: 99 }
      ],
      
      // Delivery Information
      deliveryOptions: 'Delivery',
      collection: 'DELIVERY',
      deliveryCost: '199',
      deliveryPricePreDiscount: '249',
      discountOnDeliveryPrice: '50',
      deliveryPricePostDiscount: '199',
      dateOfCollectionDelivery: '2024-01-25',
      deliveryAddress: '42 Victoria Gardens, Kensington, London, SW7 4RW',
      
      // Deposit Information - Finance Company
      compulsorySaleDepositFinance: '5000',
      amountPaidDepositFinance: '5000',
      depositDateFinance: '2024-01-20',
      outstandingDepositAmountFinance: '0',
      overpaymentsFinance: '0',
      
      // Deposit Information - Customer
      compulsorySaleDepositCustomer: '2000',
      amountPaidDepositCustomer: '2500',
      depositDateCustomer: '2024-01-18',
      outstandingDepositAmountCustomer: '0',
      overpaymentsCustomer: '500',
      
      // Part Exchange Information
      partExIncluded: 'Yes',
      pxVehicleRegistration: 'AB19 DEF',
      pxMakeModel: 'BMW 320d M Sport',
      pxMileage: '68500',
      valueOfPxVehicle: '12500',
      settlementAmount: '8750',
      
      // Payment Information
      amountPaidCardBacs: '1500',
      dateOfCardBacs: '2024-01-19',
      // Separate Card and BACS payments
      amountPaidCard: '800',
      dateOfCard: '2024-01-19',
      amountPaidBacs: '1200',
      dateOfBacs: '2024-01-20',
      amountPaidCash: '500',
      dateOfCash: '2024-01-20',
      
      // Vehicle Checklist
      numberOfKeys: '2 Keys + 1 Spare',
      userManual: 'Complete Service Book + Owner\'s Manual',
      serviceHistoryRecord: 'Full Mercedes-Benz Service History',
      wheelLockingNut: 'Present and Correct',
      cambeltChainConfirmation: 'Chain Drive - No Service Required',
      vehicleInspectionTestDrive: 'Completed - No Issues Found',
      dealerPreSaleCheck: 'Full 147-Point Inspection Completed',
      
      // Signature Information
      customerSignature: 'Dr A. J. Thompson',
      customerAvailableForSignature: 'Yes',
      dateOfSignature: '2024-01-20',
      
      // Status Information
      documentationComplete: true,
      keyHandedOver: true,
      customerSatisfied: true,
      depositPaid: true,
      vehiclePurchased: true,
      
      // Additional Information
      additionalInformation: 'Premium vehicle with full service history. Customer opted for comprehensive protection packages. All documentation verified and complete. Vehicle prepared to showroom standard with full valet and safety inspection.',
      
      // Calculated totals
      subtotal: '34995',
      vatAmount: '0',
      total: '34995',
      remainingBalance: '26995',
      remainingBalanceIncVat: '26995'
    }
  },
  
  {
    id: 'retail_customer',
    name: 'Retail Customer Invoice',
    description: 'Standard retail sale to customer with warranty and delivery',
    data: {
      // Basic Information
      invoiceNumber: 'INV-2024-001',
      dateOfSale: '2024-01-15',
      invoiceTo: 'Customer',
      saleType: 'Retail',
      invoiceType: 'Standard',
      
      // Customer Information
      title: 'Mr',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@email.com',
      phone: '07123 456789',
      address: '123 High Street\nLondon\nSW1A 1AA',
      
      // Vehicle Information
      vehicleRegistration: 'AB12 CDE',
      make: 'BMW',
      model: '3 Series',
      derivative: '320d M Sport',
      vin: 'WBAVA31070NM12345',
      mileage: '45000',
      colour: 'Alpine White',
      fuelType: 'Diesel',
      engineNumber: 'N47D20A',
      engineCapacity: '1995cc',
      firstRegDate: '2020-03-15',
      
      // Pricing Information
      salePrice: '18500',
      discountOnSalePrice: '500',
      salePricePostDiscount: '18000',
      warrantyPrice: '299',
      discountOnWarranty: '0',
      warrantyPricePostDiscount: '299',
      
      // Warranty Information
      warrantyLevel: '6 Months',
      inHouse: false,
      warrantyDetails: 'Comprehensive mechanical and electrical warranty covering all major components',
      
      // Delivery Information
      deliveryMethod: 'Delivery',
      deliveryCost: '150',
      deliveryDate: '2024-01-20',
      
      // Add-ons
      financeAddonsEnabled: false,
      customerAddonsEnabled: true,
      customerAddon1: 'Paint Protection',
      customerAddon1Cost: '299',
      customerAddon2: 'Extended Warranty',
      customerAddon2Cost: '199',
      
      // Additional Information
      additionalComments: 'Vehicle serviced and MOT tested. All documentation provided.',
      customerAvailableForSignature: true,
      
      // Calculated totals
      subtotal: '18948',
      vatAmount: '0',
      total: '18948'
    }
  },
  
  {
    id: 'finance_company',
    name: 'Finance Company Invoice',
    description: 'Invoice to Jigsaw Finance with deposits and balance',
    data: {
      // Basic Information
      invoiceNumber: 'INV-2024-002',
      dateOfSale: '2024-01-16',
      invoiceTo: 'Finance Company',
      saleType: 'Retail',
      invoiceType: 'Standard',
      
      // Customer Information
      title: 'Mrs',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@email.com',
      phone: '07987 654321',
      address: '456 Oak Avenue\nBirmingham\nB1 2CD',
      
      // Finance Company Information
      financeCompany: 'Jigsaw Finance',
      financeCompanyName: 'Jigsaw Finance',
      financeStreetAddress: 'Genesis Centre, Innovation Way',
      financeCountyPostCode: 'Stoke on Trent, ST6 4BF',
      
      // Vehicle Information
      vehicleRegistration: 'CD34 EFG',
      make: 'Audi',
      model: 'A4',
      derivative: '2.0 TDI S Line',
      vin: 'WAUZZZ8K5DA123456',
      mileage: '32000',
      colour: 'Phantom Black',
      fuelType: 'Diesel',
      engineNumber: 'CJCD',
      engineCapacity: '1968cc',
      firstRegDate: '2021-06-10',
      
      // Pricing Information
      salePrice: '22500',
      discountOnSalePrice: '1000',
      salePricePostDiscount: '21500',
      warrantyPrice: '399',
      discountOnWarranty: '50',
      warrantyPricePostDiscount: '349',
      
      // Warranty Information
      warrantyLevel: '12 Months',
      inHouse: true,
      warrantyDetails: 'In-house comprehensive warranty with 24/7 breakdown cover',
      
      // Delivery Information
      deliveryMethod: 'Collection',
      deliveryCost: '0',
      deliveryDate: '2024-01-18',
      
      // Finance Add-ons
      financeAddonsEnabled: true,
      customerAddonsEnabled: false,
      financeAddon1: 'GAP Insurance',
      financeAddon1Cost: '399',
      financeAddon2: 'Service Plan',
      financeAddon2Cost: '299',
      
      // Deposit Information
      financeDepositAmount: '2500',
      customerDepositAmount: '0',
      financeDepositDate: '2024-01-16',
      
      // Balance Information
      balanceToFinance: '19547',
      customerBalanceDue: '0',
      
      // Additional Information
      additionalComments: 'Finance application approved. Vehicle prepared for collection.',
      customerAvailableForSignature: true,
      
      // Calculated totals
      subtotal: '22547',
      vatAmount: '0',
      total: '22547'
    }
  },
  
  {
    id: 'trade_invoice',
    name: 'Trade Invoice',
    description: 'Trade sale to another dealer with no consumer protection',
    data: {
      // Basic Information
      invoiceNumber: 'TRD-2024-001',
      dateOfSale: '2024-01-17',
      invoiceTo: 'Customer',
      saleType: 'Trade',
      invoiceType: 'Trade Invoice',
      
      // Customer Information (Dealer)
      title: 'Mr',
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'mike@brownmotors.co.uk',
      phone: '01234 567890',
      address: 'Brown Motors Ltd\n789 Industrial Estate\nManchester\nM1 5GH',
      
      // Vehicle Information
      vehicleRegistration: 'EF56 GHI',
      make: 'Mercedes-Benz',
      model: 'C-Class',
      derivative: 'C220d AMG Line',
      vin: 'WDD2050461A123456',
      mileage: '67000',
      colour: 'Obsidian Black',
      fuelType: 'Diesel',
      engineNumber: 'OM651',
      engineCapacity: '2143cc',
      firstRegDate: '2019-09-20',
      
      // Pricing Information
      salePrice: '15500',
      discountOnSalePrice: '0',
      salePricePostDiscount: '15500',
      warrantyPrice: '0',
      discountOnWarranty: '0',
      warrantyPricePostDiscount: '0',
      
      // Warranty Information
      warrantyLevel: '30 Days',
      inHouse: false,
      warrantyDetails: 'Trade warranty - mechanical components only',
      
      // Delivery Information
      deliveryMethod: 'Collection',
      deliveryCost: '0',
      deliveryDate: '2024-01-19',
      
      // Add-ons
      financeAddonsEnabled: false,
      customerAddonsEnabled: false,
      
      // Additional Information
      additionalComments: 'TRADE SALE - Consumer rights do not apply. Sold as seen.',
      customerAvailableForSignature: true,
      
      // Calculated totals
      subtotal: '15500',
      vatAmount: '0',
      total: '15500'
    }
  },
  
  {
    id: 'commercial_vat',
    name: 'Commercial Sale with VAT',
    description: 'Commercial sale with VAT applicable',
    data: {
      // Basic Information
      invoiceNumber: 'COM-2024-001',
      dateOfSale: '2024-01-18',
      invoiceTo: 'Customer',
      saleType: 'Commercial',
      invoiceType: 'Standard',
      
      // Customer Information (Business)
      title: 'Mr',
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david@wilsonltd.co.uk',
      phone: '0161 123 4567',
      address: 'Wilson Construction Ltd\n321 Business Park\nLeeds\nLS1 2AB',
      
      // Vehicle Information
      vehicleRegistration: 'GH67 JKL',
      make: 'Ford',
      model: 'Transit',
      derivative: '350 L3 H2 RWD',
      vin: 'WF0XXXTTGXHW123456',
      mileage: '89000',
      colour: 'Frozen White',
      fuelType: 'Diesel',
      engineNumber: 'DRFB',
      engineCapacity: '2198cc',
      firstRegDate: '2018-11-15',
      
      // Pricing Information
      salePrice: '12000',
      discountOnSalePrice: '200',
      salePricePostDiscount: '11800',
      warrantyPrice: '0',
      discountOnWarranty: '0',
      warrantyPricePostDiscount: '0',
      
      // Warranty Information
      warrantyLevel: '3 Months',
      inHouse: true,
      warrantyDetails: 'Commercial vehicle warranty - engine and transmission',
      
      // Delivery Information
      deliveryMethod: 'Delivery',
      deliveryCost: '200',
      deliveryDate: '2024-01-22',
      
      // Add-ons
      financeAddonsEnabled: false,
      customerAddonsEnabled: true,
      customerAddon1: 'Ply Lining',
      customerAddon1Cost: '350',
      customerAddon2: 'Roof Bars',
      customerAddon2Cost: '150',
      
      // Additional Information
      additionalComments: 'Commercial vehicle sale. VAT invoice required.',
      customerAvailableForSignature: true,
      
      // Calculated totals (with VAT)
      subtotal: '12500',
      vatAmount: '2500',
      total: '15000'
    }
  },
  
  {
    id: 'close_brothers_finance',
    name: 'Close Brothers Finance',
    description: 'Invoice to Close Brothers Finance with full finance package',
    data: {
      // Basic Information
      invoiceNumber: 'CBF-2024-001',
      dateOfSale: '2024-01-19',
      invoiceTo: 'Finance Company',
      saleType: 'Retail',
      invoiceType: 'Standard',
      
      // Customer Information
      title: 'Ms',
      firstName: 'Emma',
      lastName: 'Davis',
      email: 'emma.davis@email.com',
      phone: '07555 123456',
      address: '654 Park Lane\nLiverpool\nL1 8JQ',
      
      // Finance Company Information
      financeCompany: 'Close Brothers Finance',
      financeCompanyName: 'Close Brothers Finance',
      financeStreetAddress: '10 Crown Place',
      financeCountyPostCode: 'London, EC2A 4FT',
      
      // Vehicle Information
      vehicleRegistration: 'HI78 MNO',
      make: 'Volkswagen',
      model: 'Golf',
      derivative: '1.5 TSI R-Line',
      vin: 'WVWZZZ1KZJW123456',
      mileage: '28000',
      colour: 'Deep Black Pearl',
      fuelType: 'Petrol',
      engineNumber: 'DADA',
      engineCapacity: '1498cc',
      firstRegDate: '2022-04-12',
      
      // Pricing Information
      salePrice: '19500',
      discountOnSalePrice: '750',
      salePricePostDiscount: '18750',
      warrantyPrice: '449',
      discountOnWarranty: '0',
      warrantyPricePostDiscount: '449',
      
      // Warranty Information
      warrantyLevel: '12 Months',
      inHouse: false,
      warrantyDetails: 'Manufacturer-backed extended warranty with AA breakdown',
      
      // Delivery Information
      deliveryMethod: 'Delivery',
      deliveryCost: '125',
      deliveryDate: '2024-01-25',
      
      // Finance Add-ons
      financeAddonsEnabled: true,
      customerAddonsEnabled: true,
      financeAddon1: 'Payment Protection',
      financeAddon1Cost: '299',
      financeAddon2: 'Tyre & Alloy Insurance',
      financeAddon2Cost: '199',
      customerAddon1: 'Ceramic Coating',
      customerAddon1Cost: '399',
      customerAddon2: 'Dash Cam',
      customerAddon2Cost: '149',
      
      // Deposit Information
      financeDepositAmount: '3000',
      customerDepositAmount: '500',
      financeDepositDate: '2024-01-19',
      customerDepositDate: '2024-01-19',
      
      // Balance Information
      balanceToFinance: '16571',
      customerBalanceDue: '0',
      
      // Additional Information
      additionalComments: 'Premium finance package with comprehensive add-ons. Customer very satisfied.',
      customerAvailableForSignature: true,
      
      // Calculated totals
      subtotal: '20071',
      vatAmount: '0',
      total: '20071'
    }
  }
]

/**
 * Get dummy data by scenario ID
 */
export function getDummyDataByScenario(scenarioId: string): Record<string, any> | null {
  const scenario = DUMMY_DATA_SCENARIOS.find(s => s.id === scenarioId)
  return scenario ? scenario.data : null
}

/**
 * Get all available scenarios
 */
export function getAllScenarios(): DummyDataScenario[] {
  return DUMMY_DATA_SCENARIOS
}

/**
 * Generate random dummy data
 */
export function generateRandomDummyData(): Record<string, any> {
  const scenarios = getAllScenarios()
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)]
  return randomScenario.data
}


