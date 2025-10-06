import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { savedInvoices } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Get most recent invoices for all stock IDs for the current user
export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Fetching most recent invoices for user:', user.id);

    // Get all saved invoices for the current user (same approach as main invoices page)
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
      .where(eq(savedInvoices.userId, user.id))
      .orderBy(desc(savedInvoices.updatedAt));

    console.log(`📊 Found ${allInvoices.length} total invoices for user`);

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
