import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inventoryDetails, dealers, fundSources } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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

    // Fetch all inventory details for this dealer with funding source information
    const allInventoryDetails = await db
      .select({
        id: inventoryDetails.id,
        stockId: inventoryDetails.stockId,
        dealerId: inventoryDetails.dealerId,
        registration: inventoryDetails.registration,
        dateOfPurchase: inventoryDetails.dateOfPurchase,
        costOfPurchase: inventoryDetails.costOfPurchase,
        fundingAmount: inventoryDetails.fundingAmount,
        businessAmount: inventoryDetails.businessAmount,
        fundingSourceId: inventoryDetails.fundingSourceId,
        fundingSourceName: fundSources.fundName,
        createdAt: inventoryDetails.createdAt,
        updatedAt: inventoryDetails.updatedAt,
      })
      .from(inventoryDetails)
      .leftJoin(fundSources, eq(inventoryDetails.fundingSourceId, fundSources.id))
      .where(eq(inventoryDetails.dealerId, dealerId))
      .orderBy(desc(inventoryDetails.createdAt));

    return NextResponse.json({
      success: true,
      data: allInventoryDetails,
      count: allInventoryDetails.length
    });

  } catch (error) {
    console.error('Error fetching all inventory details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
