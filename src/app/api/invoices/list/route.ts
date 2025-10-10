import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { savedInvoices } from '@/db/schema';
import { eq, desc, or } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function GET(request: NextRequest) {
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

    // BACKWARD COMPATIBILITY: Get invoices saved with both dealer ID (new) and user Clerk ID (old)
    // This ensures we show both old invoices (saved with user.id) and new invoices (saved with dealerId)
    const allInvoices = await db.select({
      id: savedInvoices.id,
      invoiceNumber: savedInvoices.invoiceNumber,
      stockId: savedInvoices.stockId,
      customerName: savedInvoices.customerName,
      vehicleRegistration: savedInvoices.vehicleRegistration,
      saleType: savedInvoices.saleType,
      invoiceType: savedInvoices.invoiceType,
      invoiceTo: savedInvoices.invoiceTo,
      totalAmount: savedInvoices.totalAmount,
      remainingBalance: savedInvoices.remainingBalance,
      isPaid: savedInvoices.isPaid,
      status: savedInvoices.status,
      createdAt: savedInvoices.createdAt,
      updatedAt: savedInvoices.updatedAt,
      lastAccessedAt: savedInvoices.lastAccessedAt
    })
    .from(savedInvoices)
    .where(
      or(
        eq(savedInvoices.userId, dealerId),    // New invoices (saved with dealer ID)
        eq(savedInvoices.userId, user.id)     // Old invoices (saved with Clerk user ID)
      )
    )
    .orderBy(desc(savedInvoices.updatedAt));

    // Filter to only get the latest invoice per stockId + registration combination
    const invoiceMap = new Map<string, typeof allInvoices[0]>();
    
    for (const invoice of allInvoices) {
      const key = `${invoice.stockId}-${invoice.vehicleRegistration}`;
      if (!invoiceMap.has(key)) {
        invoiceMap.set(key, invoice);
      }
    }
    
    const latestInvoices = Array.from(invoiceMap.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`✅ Retrieved ${latestInvoices.length} latest invoices (filtered from ${allInvoices.length} total) for dealer ${dealerId} (includes backward compatibility for old Clerk user ID invoices)`);

    return NextResponse.json({ 
      success: true, 
      invoices: latestInvoices
    });
  } catch (error) {
    console.error('❌ Error retrieving invoices:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
