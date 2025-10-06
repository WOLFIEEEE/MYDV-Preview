import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getDealerIdForUser } from '@/lib/dealerHelper'
import { db } from '@/db'
import { stockCache, inventoryDetails, saleDetails, vehicleCosts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { 
  calculateDetailedMargins, 
  validateMarginData,
  type VehicleMarginData,
  type DetailedMarginCalculations 
} from '@/lib/marginCalculations'

export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID (supports team member credential delegation)
    const dealerResult = await getDealerIdForUser(user)
    if (!dealerResult.success) {
      return NextResponse.json({ error: dealerResult.error || 'Dealer record not found' }, { status: 404 })
    }

    const dealerId = dealerResult.dealerId!

    const body = await request.json()
    const { stockId, isCommercialPurchase } = body

    if (!stockId) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 })
    }

    console.log('📊 Calculating detailed margins for:', { stockId, dealerId, isCommercialPurchase })

    // Fetch vehicle data and calculate margins
    const marginData = await fetchVehicleMarginData(stockId, dealerId, isCommercialPurchase)
    
    if (!marginData) {
      return NextResponse.json({ 
        error: 'Vehicle data not found or incomplete. Please ensure purchase info, costs, and sale details are filled.' 
      }, { status: 404 })
    }

    // Validate the data
    const validation = validateMarginData(marginData)
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Incomplete data for margin calculations', 
        details: validation.errors 
      }, { status: 400 })
    }

    // Calculate all margins
    const calculations = calculateDetailedMargins(marginData)

    console.log('✅ Detailed margins calculated successfully:', {
      stockId,
      grossProfit: calculations.grossProfit,
      netProfit: calculations.netProfit,
      vatToPay: calculations.vatToPay,
      profitCategory: calculations.profitCategory
    })

    return NextResponse.json({ 
      success: true, 
      data: calculations 
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Error calculating detailed margins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID (supports team member credential delegation)
    const dealerResult = await getDealerIdForUser(user)
    if (!dealerResult.success) {
      return NextResponse.json({ error: dealerResult.error || 'Dealer record not found' }, { status: 404 })
    }

    const dealerId = dealerResult.dealerId!

    const { searchParams } = new URL(request.url)
    const stockId = searchParams.get('stockId')
    const isCommercialPurchase = searchParams.get('isCommercialPurchase') === 'true'

    if (!stockId) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 })
    }

    console.log('📊 Fetching detailed margins for:', { stockId, dealerId, isCommercialPurchase })

    // Fetch vehicle data and calculate margins
    const marginData = await fetchVehicleMarginData(stockId, dealerId, isCommercialPurchase)
    
    if (!marginData) {
      return NextResponse.json({ 
        success: true, 
        data: null,
        message: 'Vehicle data not found or incomplete. Please ensure purchase info, costs, and sale details are filled.' 
      }, { status: 200 })
    }

    // Calculate all margins
    const calculations = calculateDetailedMargins(marginData)
    
    return NextResponse.json({ success: true, data: calculations }, { status: 200 })
  } catch (error) {
    console.error('❌ Error fetching detailed margins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Fetch all required vehicle data from database tables and prepare for margin calculations
 */
async function fetchVehicleMarginData(
  stockId: string, 
  dealerId: string, 
  isCommercialPurchase: boolean = false
): Promise<VehicleMarginData | null> {
  try {
    console.log('🔍 Fetching vehicle data from database tables...')

    // Fetch data from all relevant tables
    const [stockData, inventoryData, saleData, costsData] = await Promise.all([
      // Stock cache data (for registration and sale price if no sale details)
      db.select()
        .from(stockCache)
        .where(and(
          eq(stockCache.stockId, stockId),
          eq(stockCache.dealerId, dealerId)
        ))
        .limit(1),

      // Inventory details (for purchase price and date)
      db.select()
        .from(inventoryDetails)
        .where(and(
          eq(inventoryDetails.stockId, stockId),
          eq(inventoryDetails.dealerId, dealerId)
        ))
        .limit(1),

      // Sale details (for sale price and date)
      db.select()
        .from(saleDetails)
        .where(and(
          eq(saleDetails.stockId, stockId),
          eq(saleDetails.dealerId, dealerId)
        ))
        .limit(1),

      // Vehicle costs (for all cost data)
      db.select()
        .from(vehicleCosts)
        .where(and(
          eq(vehicleCosts.stockId, stockId),
          eq(vehicleCosts.dealerId, dealerId)
        ))
        .limit(1)
    ])

    console.log('📊 Database query results:', {
      stockData: stockData.length > 0,
      inventoryData: inventoryData.length > 0,
      saleData: saleData.length > 0,
      costsData: costsData.length > 0
    })

    // Check if we have minimum required data
    if (stockData.length === 0) {
      console.log('❌ No stock data found')
      return null
    }

    if (inventoryData.length === 0) {
      console.log('❌ No inventory/purchase data found')
      return null
    }

    const stock = stockData[0]
    const inventory = inventoryData[0]
    const sale = saleData.length > 0 ? saleData[0] : null
    const costs = costsData.length > 0 ? costsData[0] : null

    // Determine sale price (from sale details or stock cache)
    const salePrice = sale?.salePrice 
      ? parseFloat(sale.salePrice.toString())
      : stock.forecourtPriceGBP 
        ? parseFloat(stock.forecourtPriceGBP.toString())
        : 0

    // Determine purchase price
    const purchasePrice = inventory.costOfPurchase 
      ? parseFloat(inventory.costOfPurchase.toString())
      : 0

    // Determine purchase date
    const purchaseDate = inventory.dateOfPurchase 
      ? new Date(inventory.dateOfPurchase)
      : new Date()

    // Determine sale date (if sold)
    const saleDate = sale?.saleDate 
      ? new Date(sale.saleDate)
      : undefined

    // Calculate cost breakdown
    const totalCosts = costs?.grandTotal 
      ? parseFloat(costs.grandTotal.toString())
      : 0

    const incVatCosts = costs?.incVatCostsTotal 
      ? parseFloat(costs.incVatCostsTotal.toString())
      : 0

    const exVatCosts = costs?.exVatCostsTotal 
      ? parseFloat(costs.exVatCostsTotal.toString())
      : 0

    const fixedCosts = costs?.fixedCostsTotal 
      ? parseFloat(costs.fixedCostsTotal.toString())
      : 0

    // CORRECTED: Inc-VAT costs are vatable (contain VAT that can be reclaimed)
    const vatableCosts = incVatCosts
    // CORRECTED: Ex-VAT + Fixed costs are non-vatable (no VAT to reclaim)
    const nonVatableCosts = exVatCosts + fixedCosts

    console.log('💰 Calculated financial data:', {
      purchasePrice,
      salePrice,
      totalCosts,
      vatableCosts,
      nonVatableCosts,
      isCommercialPurchase
    })

    // Prepare margin data
    const marginData: VehicleMarginData = {
      stockId,
      registration: stock.registration || inventory.registration || 'N/A',
      purchasePrice,
      salePrice,
      totalCosts,
      vatableCosts,
      nonVatableCosts,
      purchaseDate,
      saleDate,
      isCommercialPurchase
    }

    return marginData
  } catch (error) {
    console.error('❌ Error fetching vehicle margin data:', error)
    return null
  }
} 