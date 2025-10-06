import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { returnCosts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (supports team member credential delegation)
    const dealerResult = await getDealerIdForUser(user);
    if (!dealerResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerResult.error || 'Dealer record not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult.dealerId!;

    const body = await request.json();
    const { stockId, stockReference, registration, vatableCosts, nonVatableCosts } = body;

    console.log('📝 API received data:', { stockId, dealerId, stockReference, registration, vatableCosts, nonVatableCosts });

    if (!stockId) {
      console.error('❌ Missing required field: stockId');
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existingRecord = await db
      .select()
      .from(returnCosts)
      .where(eq(returnCosts.stockId, stockId))
      .limit(1);

    const returnCostData = {
      stockId,
      dealerId,
      stockReference,
      registration,
      vatableCosts: vatableCosts || [],
      nonVatableCosts: nonVatableCosts || [],
      updatedAt: new Date(),
    };

    let result;
    if (existingRecord.length > 0) {
      // Update existing record
      result = await db
        .update(returnCosts)
        .set(returnCostData)
        .where(eq(returnCosts.stockId, stockId))
        .returning();
    } else {
      // Insert new record
      result = await db
        .insert(returnCosts)
        .values({
          ...returnCostData,
          createdAt: new Date(),
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Return costs saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving return costs:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { success: false, error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (supports team member credential delegation)
    const dealerResult = await getDealerIdForUser(user);
    if (!dealerResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerResult.error || 'Dealer record not found' 
      }, { status: 404 });
    }


    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    if (!stockId) {
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(returnCosts)
      .where(eq(returnCosts.stockId, stockId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No return costs found'
      });
    }

    // Return data as-is since jsonb fields are already parsed
    const data = {
      ...result[0],
      vatableCosts: result[0].vatableCosts || [],
      nonVatableCosts: result[0].nonVatableCosts || []
    };

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Return costs retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving return costs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve return costs' },
      { status: 500 }
    );
  }
}