import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { savedInvoices } from '@/db/schema';
import { eq, desc, or } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';

// GET - Get most recent invoices for all stock IDs for the current user
export async function GET(request: NextRequest) {
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
    console.log('🔍 Fetching most recent invoices for dealer:', dealerId);

    // BACKWARD COMPATIBILITY: Get invoices saved with both dealer ID (new) and user Clerk ID (old)
    const allInvoices = await db
      .select({
        id: savedInvoices.id,
        stockId: savedInvoices.stockId,
        invoiceNumber: savedInvoices.invoiceNumber,
        vehicleRegistration: savedInvoices.vehicleRegistration,
        customerName: savedInvoices.customerName,
        totalAmount: savedInvoices.totalAmount,
        createdAt: savedInvoices.createdAt,
        updatedAt: savedInvoices.updatedAt,
        status: savedInvoices.status
      })
      .from(savedInvoices)
      .where(
        or(
          eq(savedInvoices.userId, dealerId),    // New invoices (saved with dealer ID)
          eq(savedInvoices.userId, user.id)     // Old invoices (saved with Clerk user ID)
        )
      )
      .orderBy(desc(savedInvoices.updatedAt));

    console.log(`📊 Found ${allInvoices.length} total invoices for dealer`);

    // Group by stockId and keep only the most recent invoice for each (same logic as main invoices page)
    const invoiceMap = new Map<string, typeof allInvoices[0]>();
    
    for (const invoice of allInvoices) {
      const key = `${invoice.stockId}-${invoice.vehicleRegistration}`;
      if (!invoiceMap.has(key)) {
        invoiceMap.set(key, invoice);
      }
    }
    
    const latestInvoices = Array.from(invoiceMap.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`✅ Found ${latestInvoices.length} most recent invoices after filtering`);

    // Create a map for quick lookup by stockId
    const stockIdToInvoiceMap: Record<string, any> = {};
    latestInvoices.forEach(invoice => {
      stockIdToInvoiceMap[invoice.stockId] = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        vehicleRegistration: invoice.vehicleRegistration,
        customerName: invoice.customerName || 'N/A',
        totalAmount: invoice.totalAmount,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        status: invoice.status
      };
    });

    return NextResponse.json({
      success: true,
      data: stockIdToInvoiceMap,
      count: latestInvoices.length
    });

  } catch (error) {
    console.error('❌ Error fetching recent invoices:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recent invoices',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
