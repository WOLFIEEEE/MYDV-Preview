import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { saleDetails, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE - Delete sale details by ID
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
    const saleDetailsId = parseInt(resolvedParams.id);

    if (isNaN(saleDetailsId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid sale details ID' 
      }, { status: 400 });
    }

    console.log('🗑️ Deleting sale details with ID:', saleDetailsId);

    // Check if the sale details exist and belong to the dealer
    const existingRecord = await db
      .select()
      .from(saleDetails)
      .where(and(
        eq(saleDetails.id, saleDetailsId),
        eq(saleDetails.dealerId, dealerId)
      ))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sale details not found or access denied' 
      }, { status: 404 });
    }

    // Delete the sale details
    const result = await db
      .delete(saleDetails)
      .where(and(
        eq(saleDetails.id, saleDetailsId),
        eq(saleDetails.dealerId, dealerId)
      ))
      .returning();

    console.log('✅ Sale details deleted successfully:', result[0]);

    return NextResponse.json({
      success: true,
      message: 'Sale details deleted successfully',
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error deleting sale details:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
