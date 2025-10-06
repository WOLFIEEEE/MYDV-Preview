import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { savedInvoices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Get the specific invoice
    const [invoice] = await db.select()
      .from(savedInvoices)
      .where(
        and(
          eq(savedInvoices.id, invoiceId),
          eq(savedInvoices.userId, user.id)
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

    // Check if invoice exists and belongs to user
    const [invoice] = await db.select()
      .from(savedInvoices)
      .where(
        and(
          eq(savedInvoices.id, invoiceId),
          eq(savedInvoices.userId, user.id)
        )
      )
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invoice not found' 
      }, { status: 404 });
    }

    // Delete the invoice
    await db.delete(savedInvoices)
      .where(
        and(
          eq(savedInvoices.id, invoiceId),
          eq(savedInvoices.userId, user.id)
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
