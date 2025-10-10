import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { savedInvoices } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

    // BACKWARD COMPATIBILITY: Get invoice by ID, checking both dealer ID (new) and user Clerk ID (old)
    const [invoice] = await db.select()
      .from(savedInvoices)
      .where(
        and(
          eq(savedInvoices.id, invoiceId),
          or(
            eq(savedInvoices.userId, dealerId),    // New invoices (saved with dealer ID)
            eq(savedInvoices.userId, user.id)     // Old invoices (saved with Clerk user ID)
          )
        )
      )
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invoice not found' 
      }, { status: 404 });
    }

    // Update last accessed timestamp
    await db.update(savedInvoices)
      .set({ lastAccessedAt: new Date() })
      .where(eq(savedInvoices.id, invoiceId));

    console.log('✅ Retrieved invoice:', invoice.invoiceNumber);

    return NextResponse.json({ 
      success: true, 
      invoice: invoice.invoiceData,
      metadata: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        stockId: invoice.stockId,
        status: invoice.status,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving invoice:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

    // BACKWARD COMPATIBILITY: Check if invoice exists, checking both dealer ID (new) and user Clerk ID (old)
    const [invoice] = await db.select()
      .from(savedInvoices)
      .where(
        and(
          eq(savedInvoices.id, invoiceId),
          or(
            eq(savedInvoices.userId, dealerId),    // New invoices (saved with dealer ID)
            eq(savedInvoices.userId, user.id)     // Old invoices (saved with Clerk user ID)
          )
        )
      )
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invoice not found' 
      }, { status: 404 });
    }

    // Delete the invoice (using the same condition as the check above)
    await db.delete(savedInvoices)
      .where(
        and(
          eq(savedInvoices.id, invoiceId),
          or(
            eq(savedInvoices.userId, dealerId),    // New invoices (saved with dealer ID)
            eq(savedInvoices.userId, user.id)     // Old invoices (saved with Clerk user ID)
          )
        )
      );

    console.log('✅ Invoice deleted:', invoice.invoiceNumber);

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice deleted successfully',
      deletedInvoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber
      }
    });
  } catch (error) {
    console.error('❌ Error deleting invoice:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
