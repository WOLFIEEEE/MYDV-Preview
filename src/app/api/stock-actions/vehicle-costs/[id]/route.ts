import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vehicleCosts, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE - Delete vehicle costs by ID
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
    const costsId = parseInt(resolvedParams.id);

    if (isNaN(costsId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid costs ID' 
      }, { status: 400 });
    }

    console.log('🗑️ Deleting vehicle costs with ID:', costsId);

    // Check if the costs exist and belong to the dealer
    const existingRecord = await db
      .select()
      .from(vehicleCosts)
      .where(and(
        eq(vehicleCosts.id, costsId),
        eq(vehicleCosts.dealerId, dealerId)
      ))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle costs not found or access denied' 
      }, { status: 404 });
    }

    // Delete the costs
    const result = await db
      .delete(vehicleCosts)
      .where(and(
        eq(vehicleCosts.id, costsId),
        eq(vehicleCosts.dealerId, dealerId)
      ))
      .returning();

    console.log('✅ Vehicle costs deleted successfully:', result[0]);

    return NextResponse.json({
      success: true,
      message: 'Vehicle costs deleted successfully',
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error deleting vehicle costs:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
