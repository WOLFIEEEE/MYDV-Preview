import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { savedInvoices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { isPaid } = await request.json();
    const { id: invoiceId } = await params;

    // Update the isPaid status
    const updatedInvoice = await db
      .update(savedInvoices)
      .set({
        isPaid: isPaid,
        updatedAt: new Date()
      })
      .where(and(
        eq(savedInvoices.id, invoiceId),
        eq(savedInvoices.userId, user.id)
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

