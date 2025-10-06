import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customInvoices, dealers, teamMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Helper function to get dealer ID from user
async function getDealerId(userId: string): Promise<string | null> {
  // First check if user is a dealer
  const dealerResult = await db
    .select({ id: dealers.id })
    .from(dealers)
    .where(eq(dealers.clerkUserId, userId))
    .limit(1);

  if (dealerResult.length > 0) {
    return dealerResult[0].id;
  }

  // If not a dealer, check if they are a team member
  const teamMemberResult = await db
    .select({ storeOwnerId: teamMembers.storeOwnerId })
    .from(teamMembers)
    .where(eq(teamMembers.clerkUserId, userId))
    .limit(1);
  
  if (teamMemberResult.length > 0) {
    return teamMemberResult[0].storeOwnerId;
  }

  return null;
}

// GET - Get a specific custom invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Get dealer ID
    const dealerId = await getDealerId(userId);
    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer not found or unauthorized' }, { status: 404 });
    }

    // Fetch the invoice
    const [invoice] = await db
      .select()
      .from(customInvoices)
      .where(and(
        eq(customInvoices.id, resolvedParams.id),
        eq(customInvoices.dealerId, dealerId)
      ));

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error fetching custom invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom invoice' },
      { status: 500 }
    );
  }
}

// PUT - Update a custom invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Get dealer ID
    const dealerId = await getDealerId(userId);
    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer not found or unauthorized' }, { status: 404 });
    }

    const body = await request.json();

    // Update the invoice
    const [updatedInvoice] = await db
      .update(customInvoices)
      .set({
        invoiceNumber: body.invoiceNumber,
        invoiceDate: body.invoiceDate,
        dueDate: body.dueDate,
        invoiceTitle: body.invoiceTitle,
        invoiceType: body.invoiceType,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        companyInfo: body.companyInfo,
        vehicleInfo: body.vehicleInfo,
        deliveryAddress: body.deliveryAddress,
        items: body.items,
        subtotal: body.subtotal,
        vatRate: body.vatRate,
        vatAmount: body.vatAmount,
        total: body.total,
        vatMode: body.vatMode,
        discountMode: body.discountMode,
        globalDiscountType: body.globalDiscountType,
        globalDiscountValue: body.globalDiscountValue,
        globalDiscountAmount: body.globalDiscountAmount,
        totalDiscount: body.totalDiscount,
        subtotalAfterDiscount: body.subtotalAfterDiscount,
        paymentStatus: body.paymentStatus,
        payments: body.payments,
        paidAmount: body.paidAmount,
        outstandingBalance: body.outstandingBalance,
        notes: body.notes,
        terms: body.terms,
        paymentInstructions: body.paymentInstructions,
        status: body.status,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(customInvoices.id, resolvedParams.id),
        eq(customInvoices.dealerId, dealerId)
      ))
      .returning();

    if (!updatedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    console.error('Error updating custom invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update custom invoice' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a custom invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Get dealer ID
    const dealerId = await getDealerId(userId);
    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer not found or unauthorized' }, { status: 404 });
    }

    // Delete the invoice
    const [deletedInvoice] = await db
      .delete(customInvoices)
      .where(and(
        eq(customInvoices.id, resolvedParams.id),
        eq(customInvoices.dealerId, dealerId)
      ))
      .returning();

    if (!deletedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom invoice' },
      { status: 500 }
    );
  }
}
