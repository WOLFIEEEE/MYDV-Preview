import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getDealerIdForUser } from '@/lib/dealerHelper'
import { db } from '@/db'
import { stockCache, inventoryDetails, saleDetails, vehicleCosts } from '@/db/schema'
import { eq, and, isNotNull, isNull, or } from 'drizzle-orm'
import { 
  calculateDetailedMargins, 
  validateMarginData,
  type VehicleMarginData,
  type DetailedMarginCalculations 
} from '@/lib/marginCalculations'

interface DetailedMarginOverviewItem extends DetailedMarginCalculations {
  hasCompleteData: boolean
  missingDataReasons: string[]
}

// Helper function to create incomplete margin items with default values
function createIncompleteMarginItem(item: any, reasons: string[]): DetailedMarginOverviewItem {
  const now = new Date()
  const purchaseDate = item.dateOfPurchase ? 
    (isNaN(new Date(item.dateOfPurchase).getTime()) ? now : new Date(item.dateOfPurchase)) : 
    now

  return {
    stockId: item.stockId || 'Unknown',
    registration: item.registration || 'Unknown',
    purchasePrice: parseFloat(item.costOfPurchase || '0') || 0,
    salePrice: parseFloat((item.salePrice || item.forecourtPriceGBP || '0').toString()) || 0,
    totalCosts: parseFloat(item.grandTotal || '0') || 0,
    purchaseDate,
    saleDate: item.saleDate ? (isNaN(new Date(item.saleDate).getTime()) ? undefined : new Date(item.saleDate)) : undefined,
    
    // Default calculated values for incomplete data
    vatableTotal: 0,
    nonVatableTotal: 0,
    outlayOnVehicle: 0,
    vatOnSpend: 0,
    vatOnPurchase: 0,
    vatOnSalePrice: 0,
    vatToPay: 0,
    grossProfit: 0,
    netProfit: 0,
    profitMarginPreVat: 0,
    profitMarginPostVat: 0,
    totalInvestment: 0,
    percentageUpliftAfterAllCosts: 0,
    grossMarginPercent: 0,
    netMarginPercent: 0,
    profitCategory: 'LOW' as const,
    daysInStock: 0,
    profitPerDay: 0,
    purchaseMonth: 'Unknown',
    purchaseQuarter: 'Unknown',
    
    hasCompleteData: false,
    missingDataReasons: reasons
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is store owner (not team member)
    const userRole = user.publicMetadata?.role as string
    const userType = user.publicMetadata?.userType as string
    const isTeamMember = userType === 'team_member' && userRole !== 'store_owner_admin'
    
    if (isTeamMember) {
      return NextResponse.json({ 
        error: 'Access denied. This feature is only available to store owners.' 
      }, { status: 403 })
    }

    // Get dealer ID (supports team member credential delegation)
    const dealerResult = await getDealerIdForUser(user)
    if (!dealerResult.success) {
      return NextResponse.json({ error: dealerResult.error || 'Dealer record not found' }, { status: 404 })
    }

    const dealerId = dealerResult.dealerId!
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '1000') // Fetch all data
    const offset = (page - 1) * limit

    console.log('📊 Fetching detailed margins overview:', { dealerId, page, limit })

    // Fetch all inventory items with their related data
    let stockItems: any[] = []
    try {
      console.log('🔍 Executing database query with params:', { dealerId, limit, offset })
      
      // First, let's check if this dealer has any stock
      const dealerStockCount = await db
        .select({ count: stockCache.stockId })
        .from(stockCache)
        .where(eq(stockCache.dealerId, dealerId))
      
      console.log(`📊 Dealer ${dealerId} has ${dealerStockCount.length} stock items`)
      
      if (dealerStockCount.length === 0) {
        console.log('⚠️ No stock found for this dealer')
        stockItems = []
      } else {
        stockItems = await db
          .select({
            // Stock cache data
            stockId: stockCache.stockId,
            registration: stockCache.registration,
            make: stockCache.make,
            model: stockCache.model,
            derivative: stockCache.derivative,
            forecourtPriceGBP: stockCache.forecourtPriceGBP,
            
            // Inventory details (purchase info)
            costOfPurchase: inventoryDetails.costOfPurchase,
            dateOfPurchase: inventoryDetails.dateOfPurchase,
            
            // Sale details
            salePrice: saleDetails.salePrice,
            saleDate: saleDetails.saleDate,
            
            // Vehicle costs
            grandTotal: vehicleCosts.grandTotal,
            incVatCostsTotal: vehicleCosts.incVatCostsTotal,
            exVatCostsTotal: vehicleCosts.exVatCostsTotal,
            fixedCostsTotal: vehicleCosts.fixedCostsTotal,
          })
          .from(stockCache)
          .leftJoin(inventoryDetails, eq(stockCache.stockId, inventoryDetails.stockId))
          .leftJoin(saleDetails, eq(stockCache.stockId, saleDetails.stockId))
          .leftJoin(vehicleCosts, eq(stockCache.stockId, vehicleCosts.stockId))
          .where(eq(stockCache.dealerId, dealerId))
          .limit(limit)
          .offset(offset)
      }
        
      console.log(`✅ Database query successful, found ${stockItems.length} items`)
      
      // Validate the structure of returned data
      if (stockItems.length > 0) {
        const sampleItem = stockItems[0]
        console.log('📋 Sample item structure:', {
          stockId: sampleItem?.stockId,
          registration: sampleItem?.registration,
          hasInventoryData: !!sampleItem?.costOfPurchase,
          hasCostsData: sampleItem?.grandTotal !== null,
          hasSalePrice: !!(sampleItem?.salePrice || sampleItem?.forecourtPriceGBP)
        })
      }
    } catch (dbError) {
      console.error('❌ Database query failed:', dbError)
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 })
    }

    console.log(`📊 Found ${stockItems.length} stock items for detailed margins`)

    const marginsData: DetailedMarginOverviewItem[] = []

    // Ensure stockItems is an array and has valid structure
    if (!Array.isArray(stockItems)) {
      console.error('❌ stockItems is not an array:', typeof stockItems, stockItems)
      stockItems = []
    }

    for (let i = 0; i < stockItems.length; i++) {
      const item = stockItems[i]
      
      try {
        // Validate item structure more thoroughly
        if (!item || typeof item !== 'object' || item === null) {
          console.warn(`⚠️ Invalid item structure at index ${i}:`, typeof item, item)
          continue
        }

        // Check if item has the expected properties
        if (!('stockId' in item)) {
          console.warn(`⚠️ Item missing stockId property at index ${i}:`, Object.keys(item || {}))
          continue
        }

        if (!item.stockId) {
          console.warn(`⚠️ Item has null/empty stockId at index ${i}:`, item.stockId)
          continue
        }

        console.log(`🔍 Processing item ${i + 1}/${stockItems.length}: ${item.stockId}`)
        
        // Safely check if we have the minimum required data
        const hasInventoryData = !!(item.costOfPurchase && item.dateOfPurchase)
        const hasCostsData = item.grandTotal !== null && item.grandTotal !== undefined
        const hasSalePrice = !!(item.salePrice || item.forecourtPriceGBP)
        
        const missingDataReasons: string[] = []
        if (!hasInventoryData) missingDataReasons.push('Purchase info missing')
        if (!hasCostsData) missingDataReasons.push('Costs data missing')
        if (!hasSalePrice) missingDataReasons.push('Sale price missing')

        const hasCompleteData = hasInventoryData && hasCostsData && hasSalePrice

        console.log(`📋 Item ${item.stockId} data status:`, {
          hasInventoryData,
          hasCostsData,
          hasSalePrice,
          hasCompleteData,
          missingDataReasons
        })

        // Include all items - filtering will be done client-side

        // For items with complete data, calculate margins
        if (hasCompleteData) {
          try {
            // Safely parse numeric values with validation
            const purchasePrice = parseFloat(item.costOfPurchase || '0')
            const salePrice = parseFloat((item.salePrice || item.forecourtPriceGBP || '0').toString())
            const totalCosts = parseFloat(item.grandTotal || '0')
            const vatableCosts = parseFloat(item.incVatCostsTotal || '0')
            const exVatCosts = parseFloat(item.exVatCostsTotal || '0')
            const fixedCosts = parseFloat(item.fixedCostsTotal || '0')
            const nonVatableCosts = exVatCosts + fixedCosts

            // Validate parsed values
            if (isNaN(purchasePrice) || isNaN(salePrice) || isNaN(totalCosts)) {
              throw new Error(`Invalid numeric values: purchase=${purchasePrice}, sale=${salePrice}, costs=${totalCosts}`)
            }

            // Safely parse dates
            let purchaseDate: Date
            let saleDate: Date | undefined

            try {
              purchaseDate = new Date(item.dateOfPurchase!)
              if (isNaN(purchaseDate.getTime())) {
                throw new Error(`Invalid purchase date: ${item.dateOfPurchase}`)
              }
            } catch (dateError) {
              console.warn(`⚠️ Invalid purchase date for ${item.stockId}, using current date:`, dateError)
              purchaseDate = new Date()
            }

            if (item.saleDate) {
              try {
                saleDate = new Date(item.saleDate)
                if (isNaN(saleDate.getTime())) {
                  console.warn(`⚠️ Invalid sale date for ${item.stockId}, ignoring:`, item.saleDate)
                  saleDate = undefined
                }
              } catch (dateError) {
                console.warn(`⚠️ Error parsing sale date for ${item.stockId}:`, dateError)
                saleDate = undefined
              }
            }

            const marginData: VehicleMarginData = {
              stockId: item.stockId,
              registration: item.registration || 'Unknown',
              purchasePrice,
              salePrice,
              totalCosts,
              vatableCosts,
              nonVatableCosts,
              purchaseDate,
              saleDate,
              isCommercialPurchase: false // Default to false since this field doesn't exist in schema
            }

            console.log(`📊 Calculating margins for ${item.stockId}:`, {
              purchasePrice,
              salePrice,
              totalCosts,
              vatableCosts,
              nonVatableCosts
            })

            // Validate the data
            const validation = validateMarginData(marginData)
            if (validation.isValid) {
              const calculations = calculateDetailedMargins(marginData)
              console.log(`✅ Margins calculated successfully for ${item.stockId}`)
              marginsData.push({
                ...calculations,
                hasCompleteData: true,
                missingDataReasons: []
              })
            } else {
              console.warn(`⚠️ Margin data validation failed for ${item.stockId}:`, validation.errors)
              // Add as incomplete item
              marginsData.push(createIncompleteMarginItem(item, validation.errors))
            }
          } catch (marginError) {
            console.error(`❌ Error calculating margins for ${item.stockId}:`, marginError)
            // Add as incomplete item with error
            marginsData.push(createIncompleteMarginItem(item, [`Calculation error: ${marginError instanceof Error ? marginError.message : 'Unknown error'}`]))
          }
        } else {
          // Add as incomplete item with basic info
          console.log(`📝 Adding incomplete item ${item.stockId} with reasons:`, missingDataReasons)
          marginsData.push(createIncompleteMarginItem(item, missingDataReasons))
        }
      } catch (error) {
        console.error(`❌ Error processing margin data for stock ${item?.stockId || 'unknown'}:`, error)
        // Still add the item but mark as incomplete with error
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'
        marginsData.push(createIncompleteMarginItem(item || { stockId: 'unknown' }, [`Processing error: ${errorMessage}`]))
      }
    }

    // Get total count for pagination with error handling
    let totalItems = 0
    let totalPages = 1
    
    try {
      console.log('🔢 Getting total count for pagination...')
      const totalCountResult = await db
        .select({ count: stockCache.stockId })
        .from(stockCache)
        .where(eq(stockCache.dealerId, dealerId))
      
      // Validate the count result
      if (!Array.isArray(totalCountResult)) {
        console.error('❌ totalCountResult is not an array:', typeof totalCountResult, totalCountResult)
        totalItems = 0
      } else {
        totalItems = totalCountResult.length
        console.log(`📊 Total count query returned ${totalItems} records`)
      }
      
      totalPages = Math.ceil(Math.max(totalItems, 1) / limit)
      console.log(`📊 Pagination calculated: ${totalItems} total items, ${totalPages} pages`)
    } catch (countError) {
      console.error('❌ Error getting total count:', countError)
      console.error('❌ Count error stack:', countError instanceof Error ? countError.stack : 'No stack trace available')
      totalItems = marginsData.length
      totalPages = 1
    }

    // Calculate summary statistics with error handling
    let completeItems: DetailedMarginOverviewItem[] = []
    let pendingItems: DetailedMarginOverviewItem[] = []
    let totalNetProfit = 0
    let averageNetMargin = 0
    let averageDaysInStock = 0

    try {
      console.log('📈 Calculating summary statistics...')
      
      // Ensure marginsData is a valid array
      if (!Array.isArray(marginsData)) {
        console.error('❌ marginsData is not an array:', typeof marginsData, marginsData)
        throw new Error('marginsData is not an array')
      }
      
      console.log(`📊 Processing ${marginsData.length} margin items for summary`)
      
      completeItems = marginsData.filter(item => {
        try {
          return item && typeof item === 'object' && item.hasCompleteData === true
        } catch (filterError) {
          console.warn('⚠️ Error filtering complete item:', filterError, item)
          return false
        }
      })
      
      pendingItems = marginsData.filter(item => {
        try {
          return item && typeof item === 'object' && item.hasCompleteData === false
        } catch (filterError) {
          console.warn('⚠️ Error filtering pending item:', filterError, item)
          return false
        }
      })
      
      // Calculate totals with safety checks
      totalNetProfit = completeItems.reduce((sum, item) => {
        const profit = typeof item.netProfit === 'number' && !isNaN(item.netProfit) ? item.netProfit : 0
        return sum + profit
      }, 0)
      
      averageNetMargin = completeItems.length > 0 
        ? completeItems.reduce((sum, item) => {
            const margin = typeof item.netMarginPercent === 'number' && !isNaN(item.netMarginPercent) ? item.netMarginPercent : 0
            return sum + margin
          }, 0) / completeItems.length 
        : 0
        
      averageDaysInStock = completeItems.length > 0
        ? completeItems.reduce((sum, item) => {
            const days = typeof item.daysInStock === 'number' && !isNaN(item.daysInStock) ? item.daysInStock : 0
            return sum + days
          }, 0) / completeItems.length
        : 0

      console.log('✅ Summary statistics calculated:', {
        totalItems,
        completeItems: completeItems.length,
        pendingItems: pendingItems.length,
        totalNetProfit,
        averageNetMargin,
        averageDaysInStock
      })
    } catch (summaryError) {
      console.error('❌ Error calculating summary statistics:', summaryError)
      // Use safe defaults
      completeItems = []
      pendingItems = marginsData
      totalNetProfit = 0
      averageNetMargin = 0
      averageDaysInStock = 0
    }

    console.log('✅ Detailed margins overview calculated successfully:', {
      totalItems: marginsData.length,
      completeItems: completeItems.length,
      pendingItems: pendingItems.length,
      totalNetProfit,
      averageNetMargin
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        items: marginsData,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        summary: {
          totalVehicles: totalItems,
          completeDataItems: completeItems.length,
          pendingDataItems: pendingItems.length,
          totalNetProfit,
          averageNetMargin,
          averageDaysInStock
        }
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Error fetching detailed margins overview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
