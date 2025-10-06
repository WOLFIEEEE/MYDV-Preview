import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    }

    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.email, email))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ success: false, error: 'Dealer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      dealerId: dealerResult[0].id,
      email
    });

  } catch (error) {
    console.error('❌ Error in /api/get-dealer-id:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
