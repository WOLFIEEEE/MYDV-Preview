import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customInvoices, dealers, teamMembers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET - List all custom invoices for the dealer
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (handles both dealers and team members)
    let dealerId: string | null = null;

    // First check if user is a dealer
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1);

    if (dealerResult.length > 0) {
      dealerId = dealerResult[0].id;
    } else {
      // If not a dealer, check if they are a team member
      const teamMemberResult = await db
        .select({ storeOwnerId: teamMembers.storeOwnerId })
        .from(teamMembers)
        .where(eq(teamMembers.clerkUserId, userId))
        .limit(1);
      
      if (teamMemberResult.length > 0) {
        dealerId = teamMemberResult[0].storeOwnerId;
      }
    }

    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer not found or unauthorized' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');

    // Build query conditions
    let conditions = [eq(customInvoices.dealerId, dealerId)];
    
    if (status) {
      conditions.push(eq(customInvoices.status, status));
    }
    
    if (paymentStatus) {
      conditions.push(eq(customInvoices.paymentStatus, paymentStatus));
    }

    // Fetch invoices
    const invoices = await db
      .select()
      .from(customInvoices)
      .where(and(...conditions))
      .orderBy(desc(customInvoices.createdAt));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching custom invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom invoices' },
      { status: 500 }
    );
  }
}

// POST - Create a new custom invoice
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (handles both dealers and team members)
    let dealerId: string | null = null;

    // First check if user is a dealer
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1);

    if (dealerResult.length > 0) {
      dealerId = dealerResult[0].id;
    } else {
      // If not a dealer, check if they are a team member
      const teamMemberResult = await db
        .select({ storeOwnerId: teamMembers.storeOwnerId })
        .from(teamMembers)
        .where(eq(teamMembers.clerkUserId, userId))
        .limit(1);
      
      if (teamMemberResult.length > 0) {
        dealerId = teamMemberResult[0].storeOwnerId;
      }
    }

    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer not found or unauthorized' }, { status: 404 });
    }

    const body = await request.json();

    // Create the invoice
    const [newInvoice] = await db
      .insert(customInvoices)
      .values({
        dealerId,
        createdBy: userId,
        invoiceNumber: body.invoiceNumber,
        invoiceDate: body.invoiceDate,
        dueDate: body.dueDate,
        invoiceTitle: body.invoiceTitle || 'INVOICE',
        invoiceType: body.invoiceType || 'standard',
        
        // Recipient information
        recipientType: body.recipientType || 'customer',
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        
        // Business recipient information
        businessName: body.businessName,
        businessEmail: body.businessEmail,
        businessPhone: body.businessPhone,
        businessAddress: body.businessAddress,
        businessVatNumber: body.businessVatNumber,
        businessCompanyNumber: body.businessCompanyNumber,
        
        // Deliver to information
        deliverToType: body.deliverToType,
        deliverToCustomerName: body.deliverToCustomerName,
        deliverToCustomerEmail: body.deliverToCustomerEmail,
        deliverToCustomerPhone: body.deliverToCustomerPhone,
        deliverToCustomerAddress: body.deliverToCustomerAddress,
        deliverToBusinessName: body.deliverToBusinessName,
        deliverToBusinessEmail: body.deliverToBusinessEmail,
        deliverToBusinessPhone: body.deliverToBusinessPhone,
        deliverToBusinessAddress: body.deliverToBusinessAddress,
        deliverToBusinessVatNumber: body.deliverToBusinessVatNumber,
        deliverToBusinessCompanyNumber: body.deliverToBusinessCompanyNumber,
        
        // Purchase from information
        purchaseFromType: body.purchaseFromType,
        purchaseFromCustomerName: body.purchaseFromCustomerName,
        purchaseFromCustomerEmail: body.purchaseFromCustomerEmail,
        purchaseFromCustomerPhone: body.purchaseFromCustomerPhone,
        purchaseFromCustomerAddress: body.purchaseFromCustomerAddress,
        purchaseFromBusinessName: body.purchaseFromBusinessName,
        purchaseFromBusinessEmail: body.purchaseFromBusinessEmail,
        purchaseFromBusinessPhone: body.purchaseFromBusinessPhone,
        purchaseFromBusinessAddress: body.purchaseFromBusinessAddress,
        purchaseFromBusinessVatNumber: body.purchaseFromBusinessVatNumber,
        purchaseFromBusinessCompanyNumber: body.purchaseFromBusinessCompanyNumber,
        
        companyInfo: body.companyInfo,
        vehicleInfo: body.vehicleInfo,
        deliveryAddress: body.deliveryAddress,
        items: body.items || [],
        subtotal: body.subtotal || 0,
        vatRate: body.vatRate || 20,
        vatAmount: body.vatAmount || 0,
        total: body.total || 0,
        vatMode: body.vatMode || 'global',
        discountMode: body.discountMode || 'global',
        globalDiscountType: body.globalDiscountType || 'percentage',
        globalDiscountValue: body.globalDiscountValue || 0,
        globalDiscountAmount: body.globalDiscountAmount || 0,
        totalDiscount: body.totalDiscount || 0,
        subtotalAfterDiscount: body.subtotalAfterDiscount || 0,
        paymentStatus: body.paymentStatus || 'unpaid',
        payments: body.payments || [],
        paidAmount: body.paidAmount || 0,
        outstandingBalance: body.outstandingBalance || 0,
        notes: body.notes,
        terms: body.terms,
        paymentInstructions: body.paymentInstructions,
        status: body.status || 'draft',
      })
      .returning();

    return NextResponse.json({ invoice: newInvoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create custom invoice' },
      { status: 500 }
    );
  }
}
