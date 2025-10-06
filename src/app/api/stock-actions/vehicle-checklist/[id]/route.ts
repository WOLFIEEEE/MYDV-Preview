import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vehicleChecklist, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE - Delete vehicle checklist by ID
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
    const checklistId = parseInt(resolvedParams.id);

    if (isNaN(checklistId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid checklist ID' 
      }, { status: 400 });
    }

    console.log('🗑️ Deleting vehicle checklist with ID:', checklistId);

    // Check if the checklist exists and belongs to the dealer
    const existingRecord = await db
      .select()
      .from(vehicleChecklist)
      .where(and(
        eq(vehicleChecklist.id, checklistId),
        eq(vehicleChecklist.dealerId, dealerId)
      ))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle checklist not found or access denied' 
      }, { status: 404 });
    }

    // Delete the checklist
    const result = await db
      .delete(vehicleChecklist)
      .where(and(
        eq(vehicleChecklist.id, checklistId),
        eq(vehicleChecklist.dealerId, dealerId)
      ))
      .returning();

    console.log('✅ Vehicle checklist deleted successfully:', result[0]);

    return NextResponse.json({
      success: true,
      message: 'Vehicle checklist deleted successfully',
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error deleting vehicle checklist:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
