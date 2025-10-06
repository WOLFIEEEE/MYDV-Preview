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
  type VehicleChecklist
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// ================================
// SALE DETAILS OPERATIONS
// ================================

export async function createSaleDetails(data: NewSaleDetails): Promise<SaleDetails> {
  const [result] = await db.insert(saleDetails).values(data).returning()
  return result
}

export async function getSaleDetailsByStockId(stockId: string, dealerId: string): Promise<SaleDetails | null> {
  const [result] = await db
    .select()
    .from(saleDetails)
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
  const totalVatableCosts = vatableCosts.reduce((sum: number, cost: any) => {
    return sum + (parseFloat(cost.price) || 0)
  }, 0)
  
  const totalNonVatableCosts = nonVatableCosts.reduce((sum: number, cost: any) => {
    return sum + (parseFloat(cost.price) || 0)
  }, 0)
  
  const totalReturnAmount = totalVatableCosts + totalNonVatableCosts
  
  return {
    totalVatableCosts: totalVatableCosts.toFixed(2),
    totalNonVatableCosts: totalNonVatableCosts.toFixed(2),
    totalReturnAmount: totalReturnAmount.toFixed(2)
  }
} 