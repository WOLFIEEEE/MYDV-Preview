import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getDealerIdForUser } from '@/lib/dealerHelper'
import { db } from '@/db'
import { stockCache, inventoryDetails, saleDetails, vehicleCosts } from '@/db/schema'
import { eq, and, isNotNull } from 'drizzle-orm'
import { 
  calculateDetailedMargins, 
  type VehicleMarginData,
  type DetailedMarginCalculations 
} from '@/lib/marginCalculations'

interface MarginOverviewData extends DetailedMarginCalculations {
  make?: string;
  model?: string;
  derivative?: string;
  lifecycleState?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is store owner (dealer) - Updated logic
    const userRole = user.publicMetadata?.role as string;
    const userType = user.publicMetadata?.userType as string;
    
    // Store owner: userType = 'store_owner' OR no userType (fallback for existing users)
    // Also allow dealer admin (team member with store_owner_admin role)
    const isStoreOwner = userType === 'store_owner' || 
                        (!userType && userRole) || // Fallback for existing users
                        (userType === 'team_member' && userRole === 'store_owner_admin');
    
    if (!isStoreOwner) {
      return NextResponse.json({ error: 'Access denied. Store owner access required.' }, { status: 403 })
    }

    // Get dealer ID (supports team member credential delegation)
    const dealerResult = await getDealerIdForUser(user)
    if (!dealerResult.success) {
      return NextResponse.json({ error: dealerResult.error || 'Dealer record not found' }, { status: 404 })
    }

    const dealerId = dealerResult.dealerId!

    console.log('📊 Fetching margins overview for dealer:', dealerId)

    // Fetch all vehicles with complete data for margin calculations
    const vehiclesWithData = await db
      .select({
        // Stock cache data
        stockId: stockCache.stockId,
        registration: stockCache.registration,
        make: stockCache.make,
        model: stockCache.model,
        derivative: stockCache.derivative,
        lifecycleState: stockCache.lifecycleState,
        forecourtPriceGbp: stockCache.forecourtPriceGBP,
        
        // Inventory details
        costOfPurchase: inventoryDetails.costOfPurchase,
        dateOfPurchase: inventoryDetails.dateOfPurchase,
        
        // Sale details (optional - may not be sold yet)
        salePrice: saleDetails.salePrice,
        saleDate: saleDetails.saleDate,
        
        // Vehicle costs
        grandTotal: vehicleCosts.grandTotal,
        exVatCostsTotal: vehicleCosts.exVatCostsTotal,
        incVatCostsTotal: vehicleCosts.incVatCostsTotal,
        fixedCostsTotal: vehicleCosts.fixedCostsTotal,
      })
      .from(stockCache)
      .innerJoin(inventoryDetails, and(
        eq(inventoryDetails.stockId, stockCache.stockId),
        eq(inventoryDetails.dealerId, stockCache.dealerId)
      ))
      .leftJoin(saleDetails, and(
        eq(saleDetails.stockId, stockCache.stockId),
        eq(saleDetails.dealerId, stockCache.dealerId)
      ))
      .leftJoin(vehicleCosts, and(
        eq(vehicleCosts.stockId, stockCache.stockId),
        eq(vehicleCosts.dealerId, stockCache.dealerId)
      ))
      .where(and(
        eq(stockCache.dealerId, dealerId),
        isNotNull(inventoryDetails.costOfPurchase),
        isNotNull(inventoryDetails.dateOfPurchase)
      ))

    console.log(`📊 Found ${vehiclesWithData.length} vehicles with margin data`)
    
    // Validate query results
    if (!Array.isArray(vehiclesWithData)) {
      console.error('❌ Database query returned invalid data type:', typeof vehiclesWithData)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }
    
    // Debug: Log the first vehicle to see the data structure
    if (vehiclesWithData.length > 0) {
      console.log('🔍 Sample vehicle data structure:', JSON.stringify(vehiclesWithData[0], null, 2))
    }

    // Calculate margins for each vehicle
    const marginsData: MarginOverviewData[] = []

    for (const vehicle of vehiclesWithData) {
      try {
        // Validate vehicle object
        if (!vehicle || typeof vehicle !== 'object') {
          console.warn('⚠️ Invalid vehicle object, skipping:', vehicle)
          continue
        }

        console.log(`🔍 Processing vehicle ${vehicle.stockId}:`, {
          stockId: vehicle.stockId,
          registration: vehicle.registration,
          salePrice: vehicle.salePrice,
          forecourtPriceGbp: vehicle.forecourtPriceGbp,
          costOfPurchase: vehicle.costOfPurchase
        })

        // Determine sale price (from sale details or stock cache)
        const salePrice = vehicle.salePrice 
          ? parseFloat(vehicle.salePrice.toString())
          : vehicle.forecourtPriceGbp 
            ? parseFloat(vehicle.forecourtPriceGbp.toString())
            : 0

        // Skip vehicles without sale price
        if (salePrice <= 0) {
          console.warn(`⚠️ Vehicle ${vehicle.stockId} has no valid sale price, skipping`)
          continue
        }

        // Determine purchase price
        const purchasePrice = vehicle.costOfPurchase 
          ? parseFloat(vehicle.costOfPurchase.toString())
          : 0

        // Skip vehicles without purchase price
        if (purchasePrice <= 0) {
          console.warn(`⚠️ Vehicle ${vehicle.stockId} has no valid purchase price, skipping`)
          continue
        }

        // Determine purchase date with validation
        let purchaseDate: Date;
        try {
          purchaseDate = vehicle.dateOfPurchase 
            ? new Date(vehicle.dateOfPurchase)
            : new Date();
          
          // Validate the date
          if (isNaN(purchaseDate.getTime())) {
            console.warn(`⚠️ Invalid purchase date for vehicle ${vehicle.stockId}, using current date`);
            purchaseDate = new Date();
          }
        } catch (dateError) {
          console.warn(`⚠️ Error parsing purchase date for vehicle ${vehicle.stockId}:`, dateError);
          purchaseDate = new Date();
        }

        // Determine sale date (if sold) with validation
        let saleDate: Date | undefined;
        try {
          if (vehicle.saleDate) {
            saleDate = new Date(vehicle.saleDate);
            
            // Validate the date
            if (isNaN(saleDate.getTime())) {
              console.warn(`⚠️ Invalid sale date for vehicle ${vehicle.stockId}, ignoring`);
              saleDate = undefined;
            }
          }
        } catch (dateError) {
          console.warn(`⚠️ Error parsing sale date for vehicle ${vehicle.stockId}:`, dateError);
          saleDate = undefined;
        }

        // Calculate cost breakdown
        const totalCosts = vehicle.grandTotal 
          ? parseFloat(vehicle.grandTotal.toString())
          : 0

        const incVatCosts = vehicle.incVatCostsTotal 
          ? parseFloat(vehicle.incVatCostsTotal.toString())
          : 0

        const exVatCosts = vehicle.exVatCostsTotal 
          ? parseFloat(vehicle.exVatCostsTotal.toString())
          : 0

        const fixedCosts = vehicle.fixedCostsTotal 
          ? parseFloat(vehicle.fixedCostsTotal.toString())
          : 0

        // CORRECTED: Inc-VAT costs are vatable (contain VAT that can be reclaimed)
        const vatableCosts = incVatCosts
        // CORRECTED: Ex-VAT + Fixed costs are non-vatable (no VAT to reclaim)
        const nonVatableCosts = exVatCosts + fixedCosts

        // Prepare margin data (assume private purchase by default)
        const marginData: VehicleMarginData = {
          stockId: vehicle.stockId || '',
          registration: vehicle.registration || 'N/A',
          purchasePrice,
          salePrice,
          totalCosts,
          vatableCosts,
          nonVatableCosts,
          purchaseDate,
          saleDate,
          isCommercialPurchase: false // Default to private purchase
        }

        console.log(`📊 Margin data prepared for vehicle ${vehicle.stockId}:`, {
          stockId: marginData.stockId,
          registration: marginData.registration,
          purchasePrice: marginData.purchasePrice,
          salePrice: marginData.salePrice,
          totalCosts: marginData.totalCosts,
          vatableCosts: marginData.vatableCosts,
          nonVatableCosts: marginData.nonVatableCosts
        })

        // Calculate margins with error handling
        let calculations: DetailedMarginCalculations
        try {
          calculations = calculateDetailedMargins(marginData)
          console.log(`✅ Calculations completed for vehicle ${vehicle.stockId}`)
          
          // Validate calculations object structure
          if (!calculations || typeof calculations !== 'object') {
            console.error(`❌ Invalid calculations object for vehicle ${vehicle.stockId}:`, typeof calculations)
            continue
          }
          
          // Log calculation keys to debug
          console.log(`🔍 Calculation keys for vehicle ${vehicle.stockId}:`, Object.keys(calculations))
          
        } catch (calcError) {
          console.error(`❌ Error in calculateDetailedMargins for vehicle ${vehicle.stockId}:`, calcError)
          continue
        }

        // Validate calculations - ensure no NaN or undefined values
        if (!calculations || 
            typeof calculations.grossProfit !== 'number' || isNaN(calculations.grossProfit) ||
            typeof calculations.netProfit !== 'number' || isNaN(calculations.netProfit) || 
            typeof calculations.vatToPay !== 'number' || isNaN(calculations.vatToPay) || 
            typeof calculations.netMarginPercent !== 'number' || isNaN(calculations.netMarginPercent)) {
          console.warn(`⚠️ Invalid calculations for vehicle ${vehicle.stockId}, skipping`)
          console.warn(`🔍 Calculation values:`, {
            grossProfit: calculations?.grossProfit,
            netProfit: calculations?.netProfit,
            vatToPay: calculations?.vatToPay,
            netMarginPercent: calculations?.netMarginPercent
          })
          continue
        }

        // Validate all required fields exist
        const requiredFields = [
          'stockId', 'registration', 'purchasePrice', 'salePrice', 'totalCosts',
          'vatableTotal', 'nonVatableTotal', 'outlayOnVehicle', 'vatOnSpend',
          'vatOnPurchase', 'vatOnSalePrice', 'vatToPay', 'grossProfit', 'netProfit',
          'profitMarginPreVat', 'profitMarginPostVat', 'totalInvestment',
          'percentageUpliftAfterAllCosts', 'grossMarginPercent', 'netMarginPercent',
          'profitCategory', 'daysInStock', 'profitPerDay', 'purchaseMonth', 'purchaseQuarter'
        ];

        const missingFields = requiredFields.filter(field => !(field in calculations));
        if (missingFields.length > 0) {
          console.error(`❌ Missing required fields in calculations for vehicle ${vehicle.stockId}:`, missingFields);
          continue;
        }

        // Add additional fields for overview with safe object creation
        try {
          const overviewData: MarginOverviewData = {
            // Core identification
            stockId: String(calculations.stockId || ''),
            registration: String(calculations.registration || 'N/A'),
            purchasePrice: Number(calculations.purchasePrice) || 0,
            salePrice: Number(calculations.salePrice) || 0,
            totalCosts: Number(calculations.totalCosts) || 0,
            
            // Basic totals
            vatableTotal: Number(calculations.vatableTotal) || 0,
            nonVatableTotal: Number(calculations.nonVatableTotal) || 0,
            outlayOnVehicle: Number(calculations.outlayOnVehicle) || 0,
            
            // VAT calculations
            vatOnSpend: Number(calculations.vatOnSpend) || 0,
            vatOnPurchase: Number(calculations.vatOnPurchase) || 0,
            vatOnSalePrice: Number(calculations.vatOnSalePrice) || 0,
            vatToPay: Number(calculations.vatToPay) || 0,
            
            // Profit calculations
            grossProfit: Number(calculations.grossProfit) || 0,
            netProfit: Number(calculations.netProfit) || 0,
            profitMarginPreVat: Number(calculations.profitMarginPreVat) || 0,
            profitMarginPostVat: Number(calculations.profitMarginPostVat) || 0,
            
            // Additional metrics
            totalInvestment: Number(calculations.totalInvestment) || 0,
            percentageUpliftAfterAllCosts: Number(calculations.percentageUpliftAfterAllCosts) || 0,
            grossMarginPercent: Number(calculations.grossMarginPercent) || 0,
            netMarginPercent: Number(calculations.netMarginPercent) || 0,
            profitCategory: calculations.profitCategory || 'LOW',
            daysInStock: Number(calculations.daysInStock) || 0,
            profitPerDay: Number(calculations.profitPerDay) || 0,
            
            // Date fields
            purchaseDate: calculations.purchaseDate || purchaseDate,
            saleDate: calculations.saleDate,
            
            // Date strings
            purchaseMonth: String(calculations.purchaseMonth || ''),
            purchaseQuarter: String(calculations.purchaseQuarter || ''),
            saleMonth: calculations.saleMonth ? String(calculations.saleMonth) : undefined,
            saleQuarter: calculations.saleQuarter ? String(calculations.saleQuarter) : undefined,
            
            // Additional vehicle fields
            make: String(vehicle.make || ''),
            model: String(vehicle.model || ''),
            derivative: String(vehicle.derivative || ''),
            lifecycleState: String(vehicle.lifecycleState || 'Available')
          };

          marginsData.push(overviewData);
          console.log(`✅ Successfully added vehicle ${vehicle.stockId} to margins data`);
          
        } catch (overviewError) {
          console.error(`❌ Error creating overview data for vehicle ${vehicle.stockId}:`, overviewError);
          continue;
        }
      } catch (error) {
        console.error(`❌ Error calculating margins for vehicle ${vehicle.stockId}:`, error)
        // Continue with other vehicles
      }
    }

    console.log(`✅ Successfully calculated margins for ${marginsData.length} vehicles`)

    // Sort by net profit descending with error handling
    try {
      marginsData.sort((a, b) => {
        const aProfit = isNaN(a.netProfit) ? 0 : a.netProfit;
        const bProfit = isNaN(b.netProfit) ? 0 : b.netProfit;
        return bProfit - aProfit;
      });
    } catch (sortError) {
      console.error('❌ Error sorting margins data:', sortError);
    }

    // Calculate summary with safe reduce operations
    let summary;
    try {
      const safeReduce = (arr: MarginOverviewData[], key: keyof MarginOverviewData): number => {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        
        return arr.reduce((sum, item) => {
          if (!item || typeof item !== 'object') return sum;
          const value = item[key] as number;
          return sum + (typeof value === 'number' && isFinite(value) ? value : 0);
        }, 0);
      };

      summary = {
        totalVehicles: marginsData.length,
        totalGrossProfit: safeReduce(marginsData, 'grossProfit'),
        totalNetProfit: safeReduce(marginsData, 'netProfit'),
        totalVatToPay: safeReduce(marginsData, 'vatToPay'),
        averageMargin: marginsData.length > 0 
          ? safeReduce(marginsData, 'netMarginPercent') / marginsData.length 
          : 0
      };
    } catch (summaryError) {
      console.error('❌ Error calculating summary:', summaryError);
      summary = {
        totalVehicles: marginsData.length,
        totalGrossProfit: 0,
        totalNetProfit: 0,
        totalVatToPay: 0,
        averageMargin: 0
      };
    }

    return NextResponse.json({ 
      success: true, 
      data: marginsData,
      summary
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Error fetching margins overview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
