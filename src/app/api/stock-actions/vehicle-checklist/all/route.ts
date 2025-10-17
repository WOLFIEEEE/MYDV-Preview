import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vehicleChecklist, dealers, teamMembers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function GET() {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

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
