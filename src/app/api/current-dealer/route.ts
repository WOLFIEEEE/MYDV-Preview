import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Use getDealerIdForUser helper to support team member credential delegation
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({
        success: false,
        error: dealerIdResult.error || 'Dealer record not found'
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

    // Get dealer details
    const dealerResult = await db
      .select({ id: dealers.id, name: dealers.name })
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dealer details not found' 
      }, { status: 404 });
    }

    const dealer = dealerResult[0];

    return NextResponse.json({
      success: true,
      data: {
        dealerId: dealer.id,
        companyName: dealer.name,
        userId: user.id
      }
    });

  } catch (error) {
    console.error('Error fetching current dealer:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
