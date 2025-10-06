import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vehicleChecklist, dealers } from '@/db/schema';
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

    // Fetch all vehicle checklists for this dealer
    const allChecklists = await db
      .select()
      .from(vehicleChecklist)
      .where(eq(vehicleChecklist.dealerId, dealerId))
      .orderBy(desc(vehicleChecklist.createdAt));

    return NextResponse.json({
      success: true,
      data: allChecklists,
      count: allChecklists.length
    });

  } catch (error) {
    console.error('Error fetching all vehicle checklists:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
