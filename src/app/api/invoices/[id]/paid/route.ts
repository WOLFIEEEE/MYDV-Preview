import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { savedInvoices } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { isPaid } = await request.json();
    const { id: invoiceId } = await params;

    // BACKWARD COMPATIBILITY: Update the isPaid status, checking both dealer ID (new) and user Clerk ID (old)
    const updatedInvoice = await db
      .update(savedInvoices)
      .set({
        isPaid: isPaid,
        updatedAt: new Date()
      })
      .where(and(
        eq(savedInvoices.id, invoiceId),
        or(
          eq(savedInvoices.userId, dealerId),    // New invoices (saved with dealer ID)
          eq(savedInvoices.userId, user.id)     // Old invoices (saved with Clerk user ID)
        )
      ))
      .returning({
        id: savedInvoices.id,
        invoiceNumber: savedInvoices.invoiceNumber,
        isPaid: savedInvoices.isPaid
      });

    if (!updatedInvoice || updatedInvoice.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invoice not found or unauthorized'
      }, { status: 404 });
    }

    console.log(`✅ Updated payment status for invoice ${updatedInvoice[0].invoiceNumber} to ${isPaid ? 'paid' : 'unpaid'}`);

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice[0]
    });
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

