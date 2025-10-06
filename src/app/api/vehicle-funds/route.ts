import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inventoryDetails, dealers, stockCache, fundSources, fundTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Retrieve vehicle funding data
export async function GET() {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer record from Clerk user ID
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dealer record not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult[0].id;

    console.log('📖 Fetching vehicle funding data for dealer:', dealerId);

    // Query to get all vehicles with their funding information
    const vehicleFundsQuery = db
      .select({
        // Vehicle information
        stockId: stockCache.stockId,
        registration: stockCache.registration,
        make: stockCache.make,
        model: stockCache.model,
        derivative: stockCache.derivative,
        year: stockCache.yearOfManufacture,
        mileage: stockCache.odometerReadingMiles,
        fuelType: stockCache.fuelType,
        bodyType: stockCache.bodyType,
        
        // Pricing information
        forecourtPrice: stockCache.forecourtPriceGBP,
        totalPrice: stockCache.totalPriceGBP,
        
        // Funding information from inventory details
        costOfPurchase: inventoryDetails.costOfPurchase,
        fundingAmount: inventoryDetails.fundingAmount,
        fundingSourceId: inventoryDetails.fundingSourceId,
        businessAmount: inventoryDetails.businessAmount,
        
        // Fund source information
        fundSourceName: fundSources.fundName,
        
        // Media data (includes images)
        mediaData: stockCache.mediaData,
        
        // Status and metadata
        lifecycleState: stockCache.lifecycleState,
        ownershipCondition: stockCache.ownershipCondition,
        createdAt: stockCache.createdAt,
        updatedAt: stockCache.updatedAt,
      })
      .from(stockCache)
      .leftJoin(
        inventoryDetails,
        eq(stockCache.stockId, inventoryDetails.stockId)
      )
      .leftJoin(
        fundSources,
        and(
          eq(inventoryDetails.fundingSourceId, fundSources.id),
          eq(fundSources.dealerId, dealerId)
        )
      )
      .where(eq(stockCache.dealerId, dealerId))
      .orderBy(stockCache.createdAt);

    const vehicleFunds = await vehicleFundsQuery;

    // For each vehicle with funding, check if there are any repayment transactions
    const vehicleFundsWithRepayments = await Promise.all(
      vehicleFunds.map(async (vehicle) => {
        let totalRepaid = 0;
        let hasRepayments = false;

        if (vehicle.fundingSourceId && vehicle.stockId) {
          // Get repayment transactions for this vehicle
          const repayments = await db
            .select({
              amount: fundTransactions.amount,
              transactionDate: fundTransactions.transactionDate,
              status: fundTransactions.status,
            })
            .from(fundTransactions)
            .where(
              and(
                eq(fundTransactions.fundSourceId, vehicle.fundingSourceId),
                eq(fundTransactions.vehicleStockId, vehicle.stockId),
                eq(fundTransactions.transactionType, 'repayment'),
                eq(fundTransactions.status, 'completed')
              )
            );

          totalRepaid = repayments.reduce((sum, repayment) => {
            return sum + parseFloat(repayment.amount || '0');
          }, 0);

          hasRepayments = repayments.length > 0;
        }

        return {
          ...vehicle,
          totalRepaid,
          hasRepayments,
          remainingDebt: vehicle.fundingAmount 
            ? parseFloat(vehicle.fundingAmount) - totalRepaid 
            : 0,
          isFullyRepaid: vehicle.fundingAmount 
            ? totalRepaid >= parseFloat(vehicle.fundingAmount)
            : false,
        };
      })
    );

    console.log(`✅ Retrieved ${vehicleFundsWithRepayments.length} vehicles with funding data`);

    return NextResponse.json({
      success: true,
      data: vehicleFundsWithRepayments
    });

  } catch (error) {
    console.error('❌ Error fetching vehicle funding data:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
