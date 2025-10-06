import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inventoryDetails, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE - Delete inventory details by ID
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
    const inventoryDetailId = parseInt(resolvedParams.id);

    if (isNaN(inventoryDetailId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid inventory detail ID' 
      }, { status: 400 });
    }

    console.log('🗑️ Deleting inventory detail with ID:', inventoryDetailId);

    // Check if the inventory detail exists and belongs to the dealer
    const existingRecord = await db
      .select()
      .from(inventoryDetails)
      .where(and(
        eq(inventoryDetails.id, inventoryDetailId),
        eq(inventoryDetails.dealerId, dealerId)
      ))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Inventory detail not found or access denied' 
      }, { status: 404 });
    }

    // Delete the inventory detail
    const result = await db
      .delete(inventoryDetails)
      .where(and(
        eq(inventoryDetails.id, inventoryDetailId),
        eq(inventoryDetails.dealerId, dealerId)
      ))
      .returning();

    console.log('✅ Inventory detail deleted successfully:', result[0]);

    return NextResponse.json({
      success: true,
      message: 'Inventory detail deleted successfully',
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error deleting inventory detail:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
