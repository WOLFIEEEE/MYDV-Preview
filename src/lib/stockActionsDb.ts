import { db } from './db'
import { 
  saleDetails, 
  serviceDetails,
  detailedMargins, 
  returnCosts, 
  invoices, 
  vehicleCosts, 
  inventoryDetails, 
  vehicleChecklist,
  type NewSaleDetails,
  type NewServiceDetails,
  type NewDetailedMargins,
  type NewReturnCosts,
  type NewInvoice,
  type NewVehicleCosts,
  type NewInventoryDetails,
  type NewVehicleChecklist,
  type SaleDetails,
  type ServiceDetails,
  type DetailedMargins,
  type ReturnCosts,
  type Invoice,
  type VehicleCosts,
  type InventoryDetails,
  type VehicleChecklist,
  stockCache
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// ================================
// SALE DETAILS OPERATIONS
// ================================

export async function createSaleDetails(data: NewSaleDetails): Promise<SaleDetails> {
  const [result] = await db.insert(saleDetails).values(data).returning()
  return result
}

export async function getSaleDetailsByStockId(stockId: string, dealerId: string): Promise<SaleDetails & { advertsData: unknown } | null> {
  const [result] = await db
    .select({
      id: saleDetails.id,
      stockId: saleDetails.stockId,
      dealerId: saleDetails.dealerId,
      customerId: saleDetails.customerId,
      businessId: saleDetails.businessId,
      registration: saleDetails.registration,
      saleDate: saleDetails.saleDate,
      monthOfSale: saleDetails.monthOfSale,
      quarterOfSale: saleDetails.quarterOfSale,
      salePrice: saleDetails.salePrice,
      firstName: saleDetails.firstName,
      lastName: saleDetails.lastName,
      emailAddress: saleDetails.emailAddress,
      contactNumber: saleDetails.contactNumber,
      addressFirstLine: saleDetails.addressFirstLine,
      addressPostCode: saleDetails.addressPostCode,
      paymentMethod: saleDetails.paymentMethod,
      cashAmount: saleDetails.cashAmount,
      bacsAmount: saleDetails.bacsAmount,
      financeAmount: saleDetails.financeAmount,
      depositAmount: saleDetails.depositAmount,
      depositDate: saleDetails.depositDate,
      partExAmount: saleDetails.partExAmount,
      cardAmount: saleDetails.cardAmount,
      requiredAmount: saleDetails.requiredAmount,
      warrantyType: saleDetails.warrantyType,
      deliveryType: saleDetails.deliveryType,
      deliveryPrice: saleDetails.deliveryPrice,
      deliveryDate: saleDetails.deliveryDate,
      deliveryAddress: saleDetails.deliveryAddress,
      documentationComplete: saleDetails.documentationComplete,
      keyHandedOver: saleDetails.keyHandedOver,
      customerSatisfied: saleDetails.customerSatisfied,
      vulnerabilityMarker: saleDetails.vulnerabilityMarker,
      depositPaid: saleDetails.depositPaid,
      vehiclePurchased: saleDetails.vehiclePurchased,
      enquiry: saleDetails.enquiry,
      gdprConsent: saleDetails.gdprConsent,
      salesMarketingConsent: saleDetails.salesMarketingConsent,
      requiresAdditionalSupport: saleDetails.requiresAdditionalSupport,
      wheelNuts: saleDetails.wheelNuts,
      tyrePressures: saleDetails.tyrePressures,
      tyreSensors: saleDetails.tyreSensors,
      oilLevel: saleDetails.oilLevel,
      coolantLevel: saleDetails.coolantLevel,
      screenWash: saleDetails.screenWash,
      lockingNutGloveBox: saleDetails.lockingNutGloveBox,
      bookPackGloveBox: saleDetails.bookPackGloveBox,
      inflationKit: saleDetails.inflationKit,
      keyBatteries: saleDetails.keyBatteries,
      batteryTest: saleDetails.batteryTest,
      testDriver: saleDetails.testDriver,
      adequateDriveAwayFuel: saleDetails.adequateDriveAwayFuel,
      washerJets: saleDetails.washerJets,
      wipers: saleDetails.wipers,
      bulbs: saleDetails.bulbs,
      additionalText: saleDetails.additionalText,
      completionDate: saleDetails.completionDate,
      notes: saleDetails.notes,
      totalFinanceAddOn: saleDetails.totalFinanceAddOn,
      totalCustomerAddOn: saleDetails.totalCustomerAddOn,
      vatScheme: saleDetails.vatScheme,
      createdAt: saleDetails.createdAt,
      updatedAt: saleDetails.updatedAt,
      advertsData: stockCache.advertsData,
    })
    .from(saleDetails)
    .leftJoin(stockCache, eq(saleDetails.stockId, stockCache.stockId))
    .where(and(eq(saleDetails.stockId, stockId), eq(saleDetails.dealerId, dealerId)))
    .limit(1)
  return result || null
}

export async function updateSaleDetails(stockId: string, dealerId: string, data: Partial<NewSaleDetails>): Promise<SaleDetails> {
  const [result] = await db
    .update(saleDetails)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(saleDetails.stockId, stockId), eq(saleDetails.dealerId, dealerId)))
    .returning()
  return result
}

// ================================
// SERVICE DETAILS OPERATIONS
// ================================

export async function createServiceDetails(data: NewServiceDetails): Promise<ServiceDetails> {
  const [result] = await db.insert(serviceDetails).values(data).returning()
  return result
}

export async function getServiceDetailsByStockId(stockId: string, dealerId: string): Promise<ServiceDetails | null> {
  const [result] = await db
    .select()
    .from(serviceDetails)
    .where(and(eq(serviceDetails.stockId, stockId), eq(serviceDetails.dealerId, dealerId)))
    .limit(1)
  return result || null
}

export async function updateServiceDetails(stockId: string, dealerId: string, data: Partial<NewServiceDetails>): Promise<ServiceDetails> {
  const [result] = await db
    .update(serviceDetails)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(serviceDetails.stockId, stockId), eq(serviceDetails.dealerId, dealerId)))
    .returning()
  return result
}

// ================================
// DETAILED MARGINS OPERATIONS
// ================================

export async function createDetailedMargins(data: NewDetailedMargins): Promise<DetailedMargins> {
  const [result] = await db.insert(detailedMargins).values(data).returning()
  return result
}

export async function getDetailedMarginsByStockId(stockId: string, dealerId: string): Promise<DetailedMargins | null> {
  const [result] = await db
    .select()
    .from(detailedMargins)
    .where(and(eq(detailedMargins.stockId, stockId), eq(detailedMargins.dealerId, dealerId)))
    .limit(1)
  return result || null
}

export async function updateDetailedMargins(stockId: string, dealerId: string, data: Partial<NewDetailedMargins>): Promise<DetailedMargins> {
  const [result] = await db
    .update(detailedMargins)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(detailedMargins.stockId, stockId), eq(detailedMargins.dealerId, dealerId)))
    .returning()
  return result
}

// ================================
// RETURN COSTS OPERATIONS
// ================================

export async function createReturnCosts(data: NewReturnCosts): Promise<ReturnCosts> {
  const [result] = await db.insert(returnCosts).values(data).returning()
  return result
}

export async function getReturnCostsByStockId(stockId: string, dealerId: string): Promise<ReturnCosts | null> {
  const [result] = await db
    .select()
    .from(returnCosts)
    .where(and(eq(returnCosts.stockId, stockId), eq(returnCosts.dealerId, dealerId)))
    .limit(1)
  return result || null
}

export async function updateReturnCosts(stockId: string, dealerId: string, data: Partial<NewReturnCosts>): Promise<ReturnCosts> {
  const [result] = await db
    .update(returnCosts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(returnCosts.stockId, stockId), eq(returnCosts.dealerId, dealerId)))
    .returning()
  return result
}

// ================================
// INVOICE OPERATIONS
// ================================

export async function createInvoice(data: NewInvoice): Promise<Invoice> {
  // Generate invoice number if not provided
  if (!data.invoiceNumber) {
    const timestamp = Date.now()
    data.invoiceNumber = `INV-${timestamp}`
  }
  
  const [result] = await db.insert(invoices).values(data).returning()
  return result
}

export async function getInvoicesByStockId(stockId: string, dealerId: string): Promise<Invoice[]> {
  const results = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.stockId, stockId), eq(invoices.dealerId, dealerId)))
  return results
}

export async function updateInvoice(id: number, data: Partial<NewInvoice>): Promise<Invoice> {
  const [result] = await db
    .update(invoices)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(invoices.id, id))
    .returning()
  return result
}

// ================================
// VEHICLE COSTS OPERATIONS
// ================================

export async function createVehicleCosts(data: NewVehicleCosts): Promise<VehicleCosts> {
  const [result] = await db.insert(vehicleCosts).values(data).returning()
  return result
}

export async function getVehicleCostsByStockId(stockId: string, dealerId: string): Promise<VehicleCosts | null> {
  const [result] = await db
    .select()
    .from(vehicleCosts)
    .where(and(eq(vehicleCosts.stockId, stockId), eq(vehicleCosts.dealerId, dealerId)))
    .limit(1)
  return result || null
}

export async function updateVehicleCosts(stockId: string, dealerId: string, data: Partial<NewVehicleCosts>): Promise<VehicleCosts> {
  const [result] = await db
    .update(vehicleCosts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(vehicleCosts.stockId, stockId), eq(vehicleCosts.dealerId, dealerId)))
    .returning()
  return result
}

// ================================
// INVENTORY DETAILS OPERATIONS
// ================================

export async function createInventoryDetails(data: NewInventoryDetails): Promise<InventoryDetails> {
  const [result] = await db.insert(inventoryDetails).values(data).returning()
  return result
}

export async function getInventoryDetailsByStockId(stockId: string, dealerId: string): Promise<InventoryDetails | null> {
  const [result] = await db
    .select()
    .from(inventoryDetails)
    .where(and(eq(inventoryDetails.stockId, stockId), eq(inventoryDetails.dealerId, dealerId)))
    .limit(1)
  return result || null
}

export async function updateInventoryDetails(stockId: string, dealerId: string, data: Partial<NewInventoryDetails>): Promise<InventoryDetails> {
  const [result] = await db
    .update(inventoryDetails)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(inventoryDetails.stockId, stockId), eq(inventoryDetails.dealerId, dealerId)))
    .returning()
  return result
}

// ================================
// VEHICLE CHECKLIST OPERATIONS
// ================================

export async function createVehicleChecklist(data: NewVehicleChecklist): Promise<VehicleChecklist> {
  const [result] = await db.insert(vehicleChecklist).values(data).returning()
  return result
}

export async function getVehicleChecklistByStockId(stockId: string, dealerId: string): Promise<VehicleChecklist | null> {
  const [result] = await db
    .select()
    .from(vehicleChecklist)
    .where(and(eq(vehicleChecklist.stockId, stockId), eq(vehicleChecklist.dealerId, dealerId)))
    .limit(1)
  return result || null
}

export async function updateVehicleChecklist(stockId: string, dealerId: string, data: Partial<NewVehicleChecklist>): Promise<VehicleChecklist> {
  const [result] = await db
    .update(vehicleChecklist)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(vehicleChecklist.stockId, stockId), eq(vehicleChecklist.dealerId, dealerId)))
    .returning()
  return result
}

// ================================
// UTILITY FUNCTIONS
// ================================

// Update VAT scheme in stockCache advertsData
export async function updateStockCacheVatScheme(stockId: string, dealerId: string, vatScheme: string | null): Promise<void> {
  try {
    // First, get the current stockCache record
    const [currentRecord] = await db
      .select({
        id: stockCache.id,
        advertsData: stockCache.advertsData
      })
      .from(stockCache)
      .where(and(eq(stockCache.stockId, stockId), eq(stockCache.dealerId, dealerId)))
      .limit(1)

    if (!currentRecord) {
      console.warn(`No stockCache record found for stockId: ${stockId}, dealerId: ${dealerId}`)
      return
    }

    // Parse the current advertsData or create empty object
    let currentAdvertsData: Record<string, unknown> = {}
    try {
      currentAdvertsData = currentRecord.advertsData ? 
        (typeof currentRecord.advertsData === 'string' ? JSON.parse(currentRecord.advertsData) as Record<string, unknown> : currentRecord.advertsData as Record<string, unknown>) 
        : {}
    } catch (parseError) {
      console.warn('Failed to parse advertsData, creating new object:', parseError)
      currentAdvertsData = {}
    }

    // Update the VAT scheme in the advertsData
    const updatedAdvertsData = {
      ...currentAdvertsData,
      vatScheme: vatScheme
    }

    // Update the stockCache record with the modified advertsData
    await db
      .update(stockCache)
      .set({ 
        advertsData: updatedAdvertsData,
        updatedAt: new Date()
      })
      .where(eq(stockCache.id, currentRecord.id))

    console.log(`✅ Updated VAT scheme to '${vatScheme}' for stockId: ${stockId}`)
  } catch (error) {
    console.error('❌ Error updating stockCache VAT scheme:', error)
    throw error
  }
}

// Sync VAT scheme from adverts data to sales details
export async function syncVatSchemeToSalesDetails(stockId: string, dealerId: string, vatScheme: string | null): Promise<void> {
  try {
    // Normalize VAT scheme value
    const normalizedVatScheme = vatScheme || 'no_vat'
    
    // Check if sales details exist for this stock
    const existingSaleDetails = await getSaleDetailsByStockId(stockId, dealerId)
    
    if (existingSaleDetails) {
      // Update existing sales details with new VAT scheme
      await updateSaleDetails(stockId, dealerId, {
        vatScheme: normalizedVatScheme
      })
      console.log(`✅ Synced VAT scheme '${normalizedVatScheme}' to existing sales details for stockId: ${stockId}`)
    } else {
      console.log(`ℹ️ No existing sales details found for stockId: ${stockId}, VAT scheme will be applied when sales details are created`)
    }
  } catch (error) {
    console.error('❌ Error syncing VAT scheme to sales details:', error)
    throw error
  }
}

// Calculate completion percentage for checklist
export function calculateChecklistCompletion(checklistData: Partial<NewVehicleChecklist>): number {
  const fields = ['userManual', 'numberOfKeys', 'serviceBook', 'wheelLockingNut', 'cambeltChainConfirmation']
  const completedFields = fields.filter(field => {
    const value = checklistData[field as keyof typeof checklistData]
    return value && typeof value === 'string' && value.trim() !== ''
  })
  return Math.round((completedFields.length / fields.length) * 100)
}

// Calculate totals for detailed margins
export function calculateMarginsTotal(marginsData: Partial<NewDetailedMargins>): {
  totalVAT: string
  totalProfitMargins: string
  netTotal: string
} {
  const outlayOnVehicle = parseFloat(marginsData.outlayOnVehicle || '0')
  const vatOnSpend = parseFloat(marginsData.vatOnSpend || '0')
  const vatOnPurchase = parseFloat(marginsData.vatOnPurchase || '0')
  const vatOnSalePrice = parseFloat(marginsData.vatOnSalePrice || '0')
  
  const profitMarginPreCosts = parseFloat(marginsData.profitMarginPreCosts || '0')
  const profitMarginPostCosts = parseFloat(marginsData.profitMarginPostCosts || '0')
  const profitMarginPreVat = parseFloat(marginsData.profitMarginPreVat || '0')
  const profitMarginPostVat = parseFloat(marginsData.profitMarginPostVat || '0')

  const totalVAT = vatOnSpend + vatOnPurchase + vatOnSalePrice
  const totalProfitMargins = profitMarginPreCosts + profitMarginPostCosts + profitMarginPreVat + profitMarginPostVat
  const netTotal = outlayOnVehicle + totalVAT + totalProfitMargins

  return {
    totalVAT: totalVAT.toFixed(2),
    totalProfitMargins: totalProfitMargins.toFixed(2),
    netTotal: netTotal.toFixed(2)
  }
}

// Calculate totals for return costs
export function calculateReturnCostsTotal(returnData: Partial<NewReturnCosts>): {
  totalVatableCosts: string
  totalNonVatableCosts: string
  totalReturnAmount: string
} {
  // Parse vatable costs from JSON
  const vatableCosts = Array.isArray(returnData.vatableCosts) 
    ? returnData.vatableCosts 
    : []
  
  // Parse non-vatable costs from JSON
  const nonVatableCosts = Array.isArray(returnData.nonVatableCosts) 
    ? returnData.nonVatableCosts 
    : []
  
  // Calculate totals
  const totalVatableCosts = vatableCosts.reduce((sum: number, cost: { price?: string | number }) => {
    return sum + (parseFloat(String(cost.price || 0)) || 0)
  }, 0)
  
  const totalNonVatableCosts = nonVatableCosts.reduce((sum: number, cost: { price?: string | number }) => {
    return sum + (parseFloat(String(cost.price || 0)) || 0)
  }, 0)
  
  const totalReturnAmount = totalVatableCosts + totalNonVatableCosts
  
  return {
    totalVatableCosts: totalVatableCosts.toFixed(2),
    totalNonVatableCosts: totalNonVatableCosts.toFixed(2),
    totalReturnAmount: totalReturnAmount.toFixed(2)
  }
} 