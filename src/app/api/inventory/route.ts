import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stockCache, vehicleCosts, saleDetails, vehicleChecklist, returnCosts, dealers, teamMembers, inventoryDetails } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// Define proper types for checklist data (removed unused interface)

// Define types for cost data
interface CostItem {
  price: string | number;
  description?: string;
  [key: string]: unknown;
}

// Removed unused ReturnCostsRecord interface

interface ReturnCostTotals {
  vatable: number;
  nonVatable: number;
}

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
        endpoint: 'inventory'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Get dealer ID (supports team member credential delegation)
    let dealerId: string;
    
    // First check if user is a team member
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      // User is a team member - use store owner's dealer ID
      dealerId = teamMemberResult[0].storeOwnerId;
      console.log('👥 Team member detected - using store owner dealer ID for inventory:', dealerId);
    } else {
      // User is not a team member - get their own dealer record
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
          endpoint: 'inventory'
        };
        return NextResponse.json(
          createErrorResponse(notFoundError),
          { status: 404 }
        );
      }

      dealerId = dealerResult[0].id;
      console.log('🏢 Store owner detected - using own dealer ID for inventory:', dealerId);
    }

    console.log('🔍 Fetching inventory data for dealer:', dealerId);

    // OPTIMIZED: Single query with LEFT JOINs instead of N+1 queries
    // This reduces database calls from potentially 1000+ to just 2 queries (main + fallback)
    const fallbackDealerId = '278d2698-4686-4a51-80fb-ab9ce16e05d0';
    
    const inventoryRawData = await db
      .select({
        // Stock data
        stockId: stockCache.stockId,
        registration: stockCache.registration,
        make: stockCache.make,
        model: stockCache.model,
        derivative: stockCache.derivative, // Add derivative field for variant export
        yearOfManufacture: stockCache.yearOfManufacture,
        fuelType: stockCache.fuelType,
        bodyType: stockCache.bodyType,
        lifecycleState: stockCache.lifecycleState,
        forecourtPriceGBP: stockCache.forecourtPriceGBP,
        odometerReadingMiles: stockCache.odometerReadingMiles,
        metadataRaw: stockCache.metadataRaw,
        advertsData: stockCache.advertsData, // Add advertsData for published status
        
        // Costs data (prioritize current dealer, fallback to default)
        costsGrandTotal: vehicleCosts.grandTotal,
        costsIncVatTotal: vehicleCosts.incVatCostsTotal,
        costsExVatTotal: vehicleCosts.exVatCostsTotal,
        costsFixedTotal: vehicleCosts.fixedCostsTotal,
        
        // Sales data
        saleDate: saleDetails.saleDate,
        salePrice: saleDetails.salePrice,
        saleFirstName: saleDetails.firstName,
        saleLastName: saleDetails.lastName,
        saleEmailAddress: saleDetails.emailAddress,
        
        // Purchase info data
        purchaseDate: inventoryDetails.dateOfPurchase,
        purchasePrice: inventoryDetails.costOfPurchase,
        
        // Checklist data
        checklistUserManual: vehicleChecklist.userManual,
        checklistNumberOfKeys: vehicleChecklist.numberOfKeys,
        checklistServiceBook: vehicleChecklist.serviceBook,
        checklistWheelLockingNut: vehicleChecklist.wheelLockingNut,
        checklistCambeltChainConfirmation: vehicleChecklist.cambeltChainConfirmation,
        
        // Return costs data
        returnCostsVatable: returnCosts.vatableCosts,
        returnCostsNonVatable: returnCosts.nonVatableCosts,
      })
      .from(stockCache)
      .leftJoin(
        vehicleCosts,
        and(
          eq(vehicleCosts.stockId, stockCache.stockId),
          eq(vehicleCosts.dealerId, dealerId)
        )
      )
      .leftJoin(
        saleDetails,
        and(
          eq(saleDetails.stockId, stockCache.stockId),
          eq(saleDetails.dealerId, dealerId)
        )
      )
      .leftJoin(
        inventoryDetails,
        and(
          eq(inventoryDetails.stockId, stockCache.stockId),
          eq(inventoryDetails.dealerId, dealerId)
        )
      )
      .leftJoin(
        vehicleChecklist,
        and(
          eq(vehicleChecklist.stockId, stockCache.stockId),
          eq(vehicleChecklist.dealerId, dealerId)
        )
      )
      .leftJoin(
        returnCosts,
        and(
          eq(returnCosts.stockId, stockCache.stockId),
          eq(returnCosts.dealerId, dealerId)
        )
      )
      .where(eq(stockCache.dealerId, dealerId));

    // If we have missing data, fetch fallback data for those stock items
    let fallbackData: Record<string, unknown>[] = [];
    const stockIdsWithMissingData = inventoryRawData
      .filter(row => !row.costsGrandTotal && !row.salePrice && !row.checklistUserManual)
      .map(row => row.stockId);

    if (stockIdsWithMissingData.length > 0 && dealerId !== fallbackDealerId) {
      console.log(`🔄 Fetching fallback data for ${stockIdsWithMissingData.length} items from fallback dealer`);
      
      fallbackData = await db
        .select({
          stockId: stockCache.stockId,
          costsGrandTotal: vehicleCosts.grandTotal,
          costsIncVatTotal: vehicleCosts.incVatCostsTotal,
          costsExVatTotal: vehicleCosts.exVatCostsTotal,
          costsFixedTotal: vehicleCosts.fixedCostsTotal,
          saleDate: saleDetails.saleDate,
          salePrice: saleDetails.salePrice,
          purchaseDate: inventoryDetails.dateOfPurchase,
          purchasePrice: inventoryDetails.costOfPurchase,
          checklistUserManual: vehicleChecklist.userManual,
          checklistNumberOfKeys: vehicleChecklist.numberOfKeys,
          checklistServiceBook: vehicleChecklist.serviceBook,
          checklistWheelLockingNut: vehicleChecklist.wheelLockingNut,
          checklistCambeltChainConfirmation: vehicleChecklist.cambeltChainConfirmation,
          returnCostsVatable: returnCosts.vatableCosts,
          returnCostsNonVatable: returnCosts.nonVatableCosts,
        })
        .from(stockCache)
        .leftJoin(
          vehicleCosts,
          and(
            eq(vehicleCosts.stockId, stockCache.stockId),
            eq(vehicleCosts.dealerId, fallbackDealerId)
          )
        )
        .leftJoin(
          saleDetails,
          and(
            eq(saleDetails.stockId, stockCache.stockId),
            eq(saleDetails.dealerId, fallbackDealerId)
          )
        )
        .leftJoin(
          inventoryDetails,
          and(
            eq(inventoryDetails.stockId, stockCache.stockId),
            eq(inventoryDetails.dealerId, fallbackDealerId)
          )
        )
        .leftJoin(
          vehicleChecklist,
          and(
            eq(vehicleChecklist.stockId, stockCache.stockId),
            eq(vehicleChecklist.dealerId, fallbackDealerId)
          )
        )
        .leftJoin(
          returnCosts,
          and(
            eq(returnCosts.stockId, stockCache.stockId),
            eq(returnCosts.dealerId, fallbackDealerId)
          )
        )
        .where(eq(stockCache.dealerId, dealerId));
    }

    // Create a fallback lookup map for efficient merging
    const fallbackMap = new Map(fallbackData.map(item => [item.stockId, item]));

    console.log(`📦 Found ${inventoryRawData.length} stock items for dealer (optimized query with ${fallbackData.length} fallback items)`);

    // Process the joined data into the expected format
    const inventoryData = inventoryRawData.map((row) => {
      // Get fallback data if available
      const fallback = fallbackMap.get(row.stockId);
      
      // Calculate checklist status from the joined row data (with fallback)
      const getChecklistStatus = (): string => {
        const fields = [
          row.checklistUserManual || fallback?.checklistUserManual,
          row.checklistNumberOfKeys || fallback?.checklistNumberOfKeys,
          row.checklistServiceBook || fallback?.checklistServiceBook,
          row.checklistWheelLockingNut || fallback?.checklistWheelLockingNut,
          row.checklistCambeltChainConfirmation || fallback?.checklistCambeltChainConfirmation
        ];
        
        const filledFields = fields.filter(field => field && field.toString().trim() !== '').length;
        const totalFields = fields.length;
        
        if (filledFields === 0) return 'Not Added';
        if (filledFields === totalFields) return 'Added';
        return 'Some Missing';
      };

      // Calculate sales details status
      const getSalesDetailsStatus = (): string => {
        // Check if meaningful sale details exist (with fallback)
        // We need at least customer name OR meaningful sale price (> 0) to consider it "Added"
        const hasCustomerInfo = !!(
          (row.saleFirstName || fallback?.saleFirstName) ||
          (row.saleLastName || fallback?.saleLastName) ||
          (row.saleEmailAddress || fallback?.saleEmailAddress)
        );
        
        const hasMeaningfulSalePrice = !!(
          (row.salePrice && Number(row.salePrice) > 0) ||
          (fallback?.salePrice && Number(fallback.salePrice) > 0)
        );
        
        // Consider it "Added" only if we have customer info OR a meaningful sale price
        const hasSaleDetails = hasCustomerInfo || hasMeaningfulSalePrice;
        
        if (hasSaleDetails) {
          return 'Added';
        }
        
        // If no sales details, check lifecycle state
        const lifecycleState = row.lifecycleState;
        if (lifecycleState === 'SOLD') {
          return 'Not Added';
        } else {
          return 'Not Sold';
        }
      };

      // Calculate return cost totals from JSON data (with fallback)
      const calculateReturnCostTotals = (): ReturnCostTotals => {
        const vatableData = row.returnCostsVatable || fallback?.returnCostsVatable;
        const nonVatableData = row.returnCostsNonVatable || fallback?.returnCostsNonVatable;
        
        if (!vatableData && !nonVatableData) {
          return { vatable: 0, nonVatable: 0 };
        }
        
        // Safely parse JSON fields from database
        const vatableCosts = Array.isArray(vatableData) 
          ? vatableData as CostItem[] 
          : [];
        const nonVatableCosts = Array.isArray(nonVatableData) 
          ? nonVatableData as CostItem[] 
          : [];
        
        const vatableTotal = vatableCosts.reduce((sum: number, cost: CostItem) => 
          sum + (Number(cost.price) || 0), 0);
        
        const nonVatableTotal = nonVatableCosts.reduce((sum: number, cost: CostItem) => 
          sum + (Number(cost.price) || 0), 0);
        
        return { vatable: vatableTotal, nonVatable: nonVatableTotal };
      };

      const returnCostTotals = calculateReturnCostTotals();

      // Calculate total non-vatable (ex vat + fixed costs) with fallback
      const exVatTotal = Number(row.costsExVatTotal || fallback?.costsExVatTotal) || 0;
      const fixedTotal = Number(row.costsFixedTotal || fallback?.costsFixedTotal) || 0;
      const totalNonVatable = exVatTotal + fixedTotal;

      // Map data to inventory structure
      return {
        // From MyStock table (stockCache)
        registration: row.registration || 'N/A',
        stockId: row.stockId,
        makeModel: `${row.make || 'Unknown'} ${row.model || ''}`.trim(),
        mileage: row.odometerReadingMiles || 0,

        // From Cost table (vehicleCosts) with fallback
        totalCost: Number(row.costsGrandTotal || fallback?.costsGrandTotal) || 0,
        totalVatable: Number(row.costsIncVatTotal || fallback?.costsIncVatTotal) || 0,
        totalNonVatable: totalNonVatable,

        // From Purchase Info table (inventoryDetails) with fallback
        purchasePrice: Number(row.purchasePrice || fallback?.purchasePrice) || undefined,
        purchaseDate: (() => {
          const dateValue = row.purchaseDate || fallback?.purchaseDate;
          if (!dateValue) return undefined;
          try {
            return new Date(dateValue as string | number | Date).toISOString();
          } catch {
            return undefined;
          }
        })(),

        // From Sales table (saleDetails) with fallback
        salesDate: (() => {
          const dateValue = row.saleDate || fallback?.saleDate;
          if (!dateValue) return null;
          try {
            return new Date(dateValue as string | number | Date).toLocaleDateString();
          } catch {
            return null;
          }
        })(),
        salesPrice: Number(row.salePrice || fallback?.salePrice) || 0,

        // From Checklist table (vehicleChecklist)
        checklistStatus: getChecklistStatus(),

        // Sales Details Status
        salesDetailsStatus: getSalesDetailsStatus(),

        // From Return Cost table (returnCosts)
        returnCostVatable: returnCostTotals.vatable,
        returnCostNonVatable: returnCostTotals.nonVatable,

        // Additional useful data
        make: row.make || 'Unknown',
        model: row.model || '',
        derivative: row.derivative || '', // Add derivative field for variant export
        yearOfManufacture: row.yearOfManufacture,
        fuelType: row.fuelType,
        bodyType: row.bodyType,
        lifecycleState: row.lifecycleState,
        forecourtPriceGBP: Number(row.forecourtPriceGBP) || 0,
        dateOnForecourt: (row.metadataRaw as Record<string, unknown>)?.dateOnForecourt,
        
        // CRITICAL FIX: Include advertsData for published status filtering
        advertsData: row.advertsData,
      };
    });

    // DEDUPLICATION: Remove duplicate entries that can occur from JOIN operations
    const deduplicatedInventoryData = inventoryData.reduce((acc, current) => {
      const existingIndex = acc.findIndex(item => item.stockId === current.stockId);
      if (existingIndex === -1) {
        acc.push(current);
      } else {
        // If duplicate found, keep the one with more complete data (more non-null fields)
        const existing = acc[existingIndex];
        const currentNonNullCount = Object.values(current).filter(val => val !== null && val !== undefined && val !== '').length;
        const existingNonNullCount = Object.values(existing).filter(val => val !== null && val !== undefined && val !== '').length;
        
        if (currentNonNullCount > existingNonNullCount) {
          acc[existingIndex] = current;
        }
      }
      return acc;
    }, [] as typeof inventoryData);

    console.log(`✅ Successfully processed ${deduplicatedInventoryData.length} inventory items`);
    console.log(`🔧 Removed ${inventoryData.length - deduplicatedInventoryData.length} duplicate entries`);

    // Return in the format expected by the frontend hook (backward compatibility)
    const response = NextResponse.json(
      createSuccessResponse(deduplicatedInventoryData, 'inventory')
    );

    // CRITICAL SECURITY FIX: Use private caching to prevent cross-user data leakage
    // Inventory data is user-specific and must NOT be cached publicly at CDN/proxy level
    // Using 'private' allows browser caching but prevents CDN from serving to other users
    response.headers.set('Cache-Control', 'private, max-age=60, must-revalidate'); // 1 minute browser cache only
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    response.headers.set('X-Cache-Status', 'fresh');
    response.headers.set('X-Data-Source', 'database');

    return response;

  } catch (error) {
    console.error('❌ Error fetching inventory data:', error);
    const internalError = createInternalErrorResponse(error, 'inventory');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
