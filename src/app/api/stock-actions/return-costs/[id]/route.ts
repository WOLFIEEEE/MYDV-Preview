import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { returnCosts, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE - Delete return costs by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const resolvedParams = await params;
    const returnCostsId = parseInt(resolvedParams.id);

    if (isNaN(returnCostsId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid return costs ID' 
      }, { status: 400 });
    }

    console.log('🗑️ Deleting return costs with ID:', returnCostsId);

    // Check if the return costs exist and belong to the dealer
    const existingRecord = await db
      .select()
      .from(returnCosts)
      .where(and(
        eq(returnCosts.id, returnCostsId),
        eq(returnCosts.dealerId, dealerId)
      ))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Return costs not found or access denied' 
      }, { status: 404 });
    }

    // Delete the return costs
    const result = await db
      .delete(returnCosts)
      .where(and(
        eq(returnCosts.id, returnCostsId),
        eq(returnCosts.dealerId, dealerId)
      ))
      .returning();

    console.log('✅ Return costs deleted successfully:', result[0]);

    return NextResponse.json({
      success: true,
      message: 'Return costs deleted successfully',
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error deleting return costs:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
