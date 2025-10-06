import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { 
  stockCache, 
  vehicleCosts, 
  saleDetails, 
  vehicleChecklist, 
  detailedMargins,
  invoices,
  inventoryDetails,
  dealers
} from '@/db/schema';
import { eq, sql, desc, count, sum, avg } from 'drizzle-orm';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// Define proper types for user metadata
interface UserPublicMetadata {
  userType?: string;
  storeOwnerId?: string;
  role?: string;
  [key: string]: unknown;
}

// The analytics response structure is complex and dynamic based on dealer data
// Using individual interfaces would be overly complex, so we use inline typing

// Force dynamic rendering - prevent static optimization and caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'dashboard/analytics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // FIXED: Handle both store owners and team members with proper typing
    const userMetadata = user.publicMetadata as UserPublicMetadata;
    const userType = userMetadata?.userType;
    const storeOwnerId = userMetadata?.storeOwnerId;
    
    console.log('🔍 Dashboard analytics user check:', {
      userId: user.id,
      userType,
      storeOwnerId,
      email: user.emailAddresses[0]?.emailAddress
    });

    let dealerId: string;

    if (userType === 'team_member' && storeOwnerId) {
      // Team member: Use their store owner's dealer ID
      console.log('👥 Team member detected - using store owner dealer ID:', storeOwnerId);
      dealerId = storeOwnerId;
    } else {
      // Store owner or admin: Use their own dealer record
      console.log('🏢 Store owner/admin detected - looking up own dealer record');
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, user.id))
        .limit(1);

      if (dealerResult.length === 0) {
        const notFoundError = {
          type: ErrorType.NOT_FOUND,
          message: 'Dealer record not found',
          details: `No dealer record found for user: ${user.id}`,
          httpStatus: 404,
          timestamp: new Date().toISOString(),
          endpoint: 'dashboard/analytics'
        };
        return NextResponse.json(
          createErrorResponse(notFoundError),
          { status: 404 }
        );
      }

      dealerId = dealerResult[0].id;
    }

    console.log('📊 Fetching dashboard analytics for dealer:', dealerId);

    // Parallel data fetching - focus on data completeness analysis
    const [
      inventoryStats,
      inventoryByStatus,
      inventoryByMake,
      inventoryByFuelType,
      inventoryByBodyType,
      dataCompletenessAnalysis,
      stockWithMissingData
    ] = await Promise.all([
      // 1. Basic Inventory Statistics from stock_cache
      db
        .select({
          totalVehicles: count(),
          totalValue: sum(stockCache.forecourtPriceGBP),
          avgPrice: avg(stockCache.forecourtPriceGBP),
          avgDaysInStock: sql`AVG(CASE WHEN (${stockCache.metadataRaw}->>'dateOnForecourt') IS NOT NULL THEN EXTRACT(DAY FROM NOW() - (${stockCache.metadataRaw}->>'dateOnForecourt')::date) ELSE NULL END)`,
          avgYear: avg(stockCache.yearOfManufacture),
          minPrice: sql`MIN(${stockCache.forecourtPriceGBP})`,
          maxPrice: sql`MAX(${stockCache.forecourtPriceGBP})`
        })
        .from(stockCache)
        .where(eq(stockCache.dealerId, dealerId))
        .catch(err => {
          console.error('Error fetching inventory stats:', err);
          return [{ totalVehicles: 0, totalValue: '0', avgPrice: '0', avgDaysInStock: 0, avgYear: 0, minPrice: '0', maxPrice: '0' }];
        }),

      // 2. Inventory by Lifecycle Status
      db
        .select({
          status: stockCache.lifecycleState,
          count: count(),
          totalValue: sum(stockCache.forecourtPriceGBP)
        })
        .from(stockCache)
        .where(eq(stockCache.dealerId, dealerId))
        .groupBy(stockCache.lifecycleState)
        .catch(err => {
          console.error('Error fetching inventory by status:', err);
          return [];
        }),

      // 3. Inventory by Make
      db
        .select({
          make: stockCache.make,
          count: count(),
          avgPrice: avg(stockCache.forecourtPriceGBP),
          totalValue: sum(stockCache.forecourtPriceGBP)
        })
        .from(stockCache)
        .where(eq(stockCache.dealerId, dealerId))
        .groupBy(stockCache.make)
        .orderBy(desc(count()))
        .catch(err => {
          console.error('Error fetching inventory by make:', err);
          return [];
        }),

      // 4. Inventory by Fuel Type
      db
        .select({
          fuelType: stockCache.fuelType,
          count: count(),
          avgPrice: avg(stockCache.forecourtPriceGBP)
        })
        .from(stockCache)
        .where(eq(stockCache.dealerId, dealerId))
        .groupBy(stockCache.fuelType)
        .orderBy(desc(count()))
        .catch(err => {
          console.error('Error fetching inventory by fuel type:', err);
          return [];
        }),

      // 5. Inventory by Body Type
      db
        .select({
          bodyType: stockCache.bodyType,
          count: count(),
          avgPrice: avg(stockCache.forecourtPriceGBP)
        })
        .from(stockCache)
        .where(eq(stockCache.dealerId, dealerId))
        .groupBy(stockCache.bodyType)
        .orderBy(desc(count()))
        .catch(err => {
          console.error('Error fetching inventory by body type:', err);
          return [];
        }),

      // 6. Data Completeness Analysis - Check which stock items have missing data
      db
        .select({
          stockId: stockCache.stockId,
          registration: stockCache.registration,
          make: stockCache.make,
          model: stockCache.model,
          lifecycleState: stockCache.lifecycleState,
          // Check if related data exists
          hasSaleDetails: sql`CASE WHEN ${saleDetails.stockId} IS NOT NULL THEN 1 ELSE 0 END`.as('hasSaleDetails'),
          hasVehicleCosts: sql`CASE WHEN ${vehicleCosts.stockId} IS NOT NULL THEN 1 ELSE 0 END`.as('hasVehicleCosts'),
          hasChecklist: sql`CASE WHEN ${vehicleChecklist.stockId} IS NOT NULL THEN 1 ELSE 0 END`.as('hasChecklist'),
          hasDetailedMargins: sql`CASE WHEN ${detailedMargins.stockId} IS NOT NULL THEN 1 ELSE 0 END`.as('hasDetailedMargins'),
          hasInventoryDetails: sql`CASE WHEN ${inventoryDetails.stockId} IS NOT NULL THEN 1 ELSE 0 END`.as('hasInventoryDetails'),
          hasInvoices: sql`CASE WHEN ${invoices.stockId} IS NOT NULL THEN 1 ELSE 0 END`.as('hasInvoices')
        })
        .from(stockCache)
        .leftJoin(saleDetails, eq(stockCache.stockId, saleDetails.stockId))
        .leftJoin(vehicleCosts, eq(stockCache.stockId, vehicleCosts.stockId))
        .leftJoin(vehicleChecklist, eq(stockCache.stockId, vehicleChecklist.stockId))
        .leftJoin(detailedMargins, eq(stockCache.stockId, detailedMargins.stockId))
        .leftJoin(inventoryDetails, eq(stockCache.stockId, inventoryDetails.stockId))
        .leftJoin(invoices, eq(stockCache.stockId, invoices.stockId))
        .where(eq(stockCache.dealerId, dealerId))
        .catch(err => {
          console.error('Error fetching data completeness:', err);
          return [];
        }),

      // 7. Stock with Missing Data Summary
      db
        .select({
          totalStock: count(),
          totalSoldStock: count(sql`CASE WHEN ${stockCache.lifecycleState} = 'SOLD' THEN 1 END`),
          missingChecklist: count(sql`CASE WHEN ${vehicleChecklist.stockId} IS NULL THEN 1 END`),
          missingSaleDetails: count(sql`CASE WHEN ${saleDetails.stockId} IS NULL AND ${stockCache.lifecycleState} = 'SOLD' THEN 1 END`),
          missingCosts: count(sql`CASE WHEN ${vehicleCosts.stockId} IS NULL THEN 1 END`),
          missingMargins: count(sql`CASE WHEN ${detailedMargins.stockId} IS NULL THEN 1 END`),
          missingInventoryDetails: count(sql`CASE WHEN ${inventoryDetails.stockId} IS NULL THEN 1 END`),
          missingInvoices: count(sql`CASE WHEN ${invoices.stockId} IS NULL THEN 1 END`)
        })
        .from(stockCache)
        .leftJoin(saleDetails, eq(stockCache.stockId, saleDetails.stockId))
        .leftJoin(vehicleCosts, eq(stockCache.stockId, vehicleCosts.stockId))
        .leftJoin(vehicleChecklist, eq(stockCache.stockId, vehicleChecklist.stockId))
        .leftJoin(detailedMargins, eq(stockCache.stockId, detailedMargins.stockId))
        .leftJoin(inventoryDetails, eq(stockCache.stockId, inventoryDetails.stockId))
        .leftJoin(invoices, eq(stockCache.stockId, invoices.stockId))
        .where(eq(stockCache.dealerId, dealerId))
        .catch(err => {
          console.error('Error fetching missing data summary:', err);
          return [{ totalStock: 0, totalSoldStock: 0, missingChecklist: 0, missingSaleDetails: 0, missingCosts: 0, missingMargins: 0, missingInventoryDetails: 0, missingInvoices: 0 }];
        })






    ]);

    // Process and format the data - focus on data completeness
    const totalStock = inventoryStats[0]?.totalVehicles || 0;
    const missingDataSummary = stockWithMissingData[0] || {};
    const totalSoldStock = missingDataSummary.totalSoldStock || 0;
    
    const analytics = {
      // Inventory Overview
      inventory: {
        overview: {
          totalVehicles: totalStock,
          totalValue: Number(inventoryStats[0]?.totalValue) || 0,
          averagePrice: Number(inventoryStats[0]?.avgPrice) || 0,
          averageDaysInStock: Math.round(Number(inventoryStats[0]?.avgDaysInStock) || 0),
          averageYear: Math.round(Number(inventoryStats[0]?.avgYear) || 0),
          priceRange: {
            min: Number(inventoryStats[0]?.minPrice) || 0,
            max: Number(inventoryStats[0]?.maxPrice) || 0
          }
        },
        byStatus: inventoryByStatus.map(item => ({
          status: item.status || 'Unknown',
          count: Number(item.count) || 0,
          value: Number(item.totalValue) || 0
        })),
        byMake: inventoryByMake.map(item => ({
          make: item.make || 'Unknown',
          count: Number(item.count) || 0,
          avgPrice: Number(item.avgPrice) || 0,
          totalValue: Number(item.totalValue) || 0
        })),
        byFuelType: inventoryByFuelType.map(item => ({
          fuelType: item.fuelType || 'Unknown',
          count: Number(item.count) || 0,
          avgPrice: Number(item.avgPrice) || 0
        })),
        byBodyType: inventoryByBodyType.map(item => ({
          bodyType: item.bodyType || 'Unknown',
          count: Number(item.count) || 0,
          avgPrice: Number(item.avgPrice) || 0
        }))
      },

      // Data Completeness Analysis
      dataCompleteness: {
        overview: {
          totalStock: totalStock,
          missingChecklist: missingDataSummary.missingChecklist || 0,
          missingSaleDetails: missingDataSummary.missingSaleDetails || 0,
          missingCosts: missingDataSummary.missingCosts || 0,
          missingMargins: missingDataSummary.missingMargins || 0,
          missingInventoryDetails: missingDataSummary.missingInventoryDetails || 0,
          missingInvoices: missingDataSummary.missingInvoices || 0
        },
        byDataType: [
          {
            type: 'Checklist Information',
            missing: missingDataSummary.missingChecklist || 0,
            complete: totalStock - (missingDataSummary.missingChecklist || 0),
            percentage: totalStock > 0 ? ((totalStock - (missingDataSummary.missingChecklist || 0)) / totalStock) * 100 : 0,
            description: 'Vehicle inspection checklists'
          },
          {
            type: 'Sale Details',
            missing: missingDataSummary.missingSaleDetails || 0,
            complete: totalSoldStock - (missingDataSummary.missingSaleDetails || 0),
            percentage: totalSoldStock > 0 ? ((totalSoldStock - (missingDataSummary.missingSaleDetails || 0)) / totalSoldStock) * 100 : 0,
            description: 'Sales transaction records for sold vehicles'
          },
          {
            type: 'Vehicle Costs',
            missing: missingDataSummary.missingCosts || 0,
            complete: totalStock - (missingDataSummary.missingCosts || 0),
            percentage: totalStock > 0 ? ((totalStock - (missingDataSummary.missingCosts || 0)) / totalStock) * 100 : 0,
            description: 'Cost tracking and expenses'
          },
          {
            type: 'Profit Margins',
            missing: missingDataSummary.missingMargins || 0,
            complete: totalStock - (missingDataSummary.missingMargins || 0),
            percentage: totalStock > 0 ? ((totalStock - (missingDataSummary.missingMargins || 0)) / totalStock) * 100 : 0,
            description: 'Detailed margin calculations'
          },
          {
            type: 'Purchase Information',
            missing: missingDataSummary.missingInventoryDetails || 0,
            complete: totalStock - (missingDataSummary.missingInventoryDetails || 0),
            percentage: totalStock > 0 ? ((totalStock - (missingDataSummary.missingInventoryDetails || 0)) / totalStock) * 100 : 0,
            description: 'Purchase dates and details'
          },
          {
            type: 'Invoices',
            missing: missingDataSummary.missingInvoices || 0,
            complete: totalStock - (missingDataSummary.missingInvoices || 0),
            percentage: totalStock > 0 ? ((totalStock - (missingDataSummary.missingInvoices || 0)) / totalStock) * 100 : 0,
            description: 'Generated invoices and billing'
          }
        ],
        stockDetails: dataCompletenessAnalysis.map(stock => ({
          stockId: stock.stockId,
          registration: stock.registration || 'N/A',
          make: stock.make || 'Unknown',
          model: stock.model || 'Unknown',
          lifecycleState: stock.lifecycleState || 'Unknown',
          missingData: {
            checklist: !stock.hasChecklist,
            saleDetails: !stock.hasSaleDetails,
            costs: !stock.hasVehicleCosts,
            margins: !stock.hasDetailedMargins,
            inventoryDetails: !stock.hasInventoryDetails,
            invoices: !stock.hasInvoices
          },
          completionScore: [
            stock.hasChecklist,
            stock.hasSaleDetails,
            stock.hasVehicleCosts,
            stock.hasDetailedMargins,
            stock.hasInventoryDetails,
            stock.hasInvoices
          ].filter(Boolean).length
        }))
      },





      // Summary metrics
      summary: {
        hasInventory: totalStock > 0,
        dataCompletionRate: totalStock > 0 ? (
          (totalStock * 6 - (missingDataSummary.missingChecklist || 0) - (missingDataSummary.missingSaleDetails || 0) - 
           (missingDataSummary.missingCosts || 0) - (missingDataSummary.missingMargins || 0) - 
           (missingDataSummary.missingInventoryDetails || 0) - (missingDataSummary.missingInvoices || 0)) / (totalStock * 6)
        ) * 100 : 0,
        mostMissingDataType: totalStock > 0 ? (
          Math.max(
            missingDataSummary.missingChecklist || 0,
            missingDataSummary.missingSaleDetails || 0,
            missingDataSummary.missingCosts || 0,
            missingDataSummary.missingMargins || 0,
            missingDataSummary.missingInventoryDetails || 0,
            missingDataSummary.missingInvoices || 0
          ) === (missingDataSummary.missingChecklist || 0) ? 'Checklist Information' :
          Math.max(
            missingDataSummary.missingChecklist || 0,
            missingDataSummary.missingSaleDetails || 0,
            missingDataSummary.missingCosts || 0,
            missingDataSummary.missingMargins || 0,
            missingDataSummary.missingInventoryDetails || 0,
            missingDataSummary.missingInvoices || 0
          ) === (missingDataSummary.missingSaleDetails || 0) ? 'Sale Details' :
          Math.max(
            missingDataSummary.missingChecklist || 0,
            missingDataSummary.missingSaleDetails || 0,
            missingDataSummary.missingCosts || 0,
            missingDataSummary.missingMargins || 0,
            missingDataSummary.missingInventoryDetails || 0,
            missingDataSummary.missingInvoices || 0
          ) === (missingDataSummary.missingCosts || 0) ? 'Vehicle Costs' :
          Math.max(
            missingDataSummary.missingChecklist || 0,
            missingDataSummary.missingSaleDetails || 0,
            missingDataSummary.missingCosts || 0,
            missingDataSummary.missingMargins || 0,
            missingDataSummary.missingInventoryDetails || 0,
            missingDataSummary.missingInvoices || 0
          ) === (missingDataSummary.missingMargins || 0) ? 'Profit Margins' :
          Math.max(
            missingDataSummary.missingChecklist || 0,
            missingDataSummary.missingSaleDetails || 0,
            missingDataSummary.missingCosts || 0,
            missingDataSummary.missingMargins || 0,
            missingDataSummary.missingInventoryDetails || 0,
            missingDataSummary.missingInvoices || 0
          ) === (missingDataSummary.missingInventoryDetails || 0) ? 'Purchase Information' : 'Invoices'
        ) : 'None'
      }
    };

    console.log('✅ Dashboard analytics compiled successfully');

    const response = NextResponse.json(
      createSuccessResponse(analytics, 'dashboard/analytics')
    );

    // CRITICAL SECURITY FIX: Use private caching to prevent cross-user data leakage
    // Dashboard analytics contains user-specific data and must NEVER be cached publicly
    // Using 'private' ensures only the user's browser caches it, not CDN/proxies
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('❌ Error fetching dashboard analytics:', error);
    const internalError = createInternalErrorResponse(error, 'dashboard/analytics');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
