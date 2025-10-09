import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { savedInvoices, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { syncInvoiceData } from '@/lib/invoiceSyncService';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceData, stockId } = body;

    if (!invoiceData || !stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get dealer ID for sync service
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    const dealerId = dealerResult.length > 0 ? dealerResult[0].id : null;

    // Extract key fields for quick search/filtering with null checks
    const customerName = invoiceData.customer 
      ? `${invoiceData.customer.title || ''} ${invoiceData.customer.firstName || ''} ${invoiceData.customer.lastName || ''}`.trim()
      : 'Unknown Customer';
    const vehicleRegistration = invoiceData.vehicle?.registration || 'Unknown Registration';
    const saleType = invoiceData.saleType || 'Retail';
    const invoiceType = invoiceData.invoiceType || 'Standard';
    const invoiceTo = invoiceData.invoiceTo || null; // Finance Company, Customer
    const totalAmount = (invoiceData.pricing?.salePricePostDiscount ?? invoiceData.pricing?.salePrice ?? 0).toFixed(2);
    
    // Calculate remaining balance based on sale type and invoice type (using ?? to preserve 0 values)
    let remainingBalance = '0';
    if (invoiceData.saleType === 'Retail' && invoiceData.invoiceTo === 'Finance Company') {
      // For finance invoices, show balance to customer (deposit items)
      remainingBalance = (invoiceData.pricing?.balanceToCustomer ?? invoiceData.payment?.balanceToFinance ?? 0).toFixed(2);
    } else if (invoiceData.saleType === 'Trade') {
      // For trade invoices, show trade balance due
      remainingBalance = (invoiceData.pricing?.tradeBalanceDue ?? invoiceData.payment?.customerBalanceDue ?? 0).toFixed(2);
    } else {
      // For customer/retail invoices, show remaining balance (check both pricing and payment sections)
      remainingBalance = (invoiceData.pricing?.remainingBalance ?? invoiceData.payment?.customerBalanceDue ?? 0).toFixed(2);
    }
    
    // Ensure invoiceNumber is never null or undefined
    const invoiceNumber = invoiceData.invoiceNumber || `INV-${stockId}-${Date.now()}`;
    
    console.log('🔍 Invoice save debug:', {
      originalInvoiceNumber: invoiceData.invoiceNumber,
      finalInvoiceNumber: invoiceNumber,
      stockId,
      customerName,
      vehicleRegistration,
      saleType,
      invoiceTo,
      totalAmount,
      remainingBalance,
      'pricing.remainingBalance': invoiceData.pricing?.remainingBalance,
      'pricing.balanceToCustomer': invoiceData.pricing?.balanceToCustomer,
      'pricing.tradeBalanceDue': invoiceData.pricing?.tradeBalanceDue,
      'payment.customerBalanceDue': invoiceData.payment?.customerBalanceDue,
      'payment.balanceToFinance': invoiceData.payment?.balanceToFinance
    });
    
    // Update the invoiceData object to ensure it has the correct invoiceNumber
    const updatedInvoiceData = {
      ...invoiceData,
      invoiceNumber
    };

    // Check if invoice already exists
    const existingInvoice = await db.select()
      .from(savedInvoices)
      .where(
        and(
          eq(savedInvoices.invoiceNumber, invoiceNumber),
          eq(savedInvoices.userId, user.id)
        )
      )
      .limit(1);

    let invoiceId: string;
    let isUpdate = false;

    if (existingInvoice.length > 0) {
      // Update existing invoice
      await db.update(savedInvoices)
        .set({
          invoiceData: updatedInvoiceData,
          customerName,
          vehicleRegistration,
          saleType,
          invoiceType,
          invoiceTo,
          totalAmount,
          remainingBalance,
          updatedAt: new Date(),
          lastAccessedAt: new Date()
        })
        .where(eq(savedInvoices.id, existingInvoice[0].id));

      console.log('✅ Invoice updated:', invoiceNumber);
      invoiceId = existingInvoice[0].id;
      isUpdate = true;
    } else {
      // Create new invoice
      const [newInvoice] = await db.insert(savedInvoices)
        .values({
          invoiceNumber,
          stockId,
          userId: user.id,
          invoiceData: updatedInvoiceData,
          customerName,
          vehicleRegistration,
          saleType,
          invoiceType,
          invoiceTo,
          totalAmount,
          remainingBalance,
          status: 'draft'
        })
        .returning();

      console.log('✅ Invoice saved:', invoiceNumber);
      invoiceId = newInvoice.id;
      isUpdate = false;
    }

    // Sync with CRM and Sales Details (non-blocking)
    if (dealerId) {
      console.log('🔄 Starting post-invoice sync...');
      try {
        const syncResult = await syncInvoiceData(dealerId, stockId, updatedInvoiceData);
        
        if (syncResult.success) {
          console.log('✅ Invoice sync completed successfully:', {
            customerId: syncResult.customerId,
            saleDetailsId: syncResult.saleDetailsId
          });
        } else {
          console.log('⚠️ Invoice sync completed with issues:', {
            errors: syncResult.errors,
            warnings: syncResult.warnings
          });
        }
      } catch (syncError) {
        // Don't fail the invoice save if sync fails
        console.error('❌ Invoice sync failed (non-blocking):', syncError);
      }
    } else {
      console.log('⚠️ No dealer ID found, skipping invoice sync');
    }

    return NextResponse.json({ 
      success: true, 
      message: isUpdate ? 'Invoice updated successfully' : 'Invoice saved successfully',
      invoiceId: invoiceId
    });
  } catch (error) {
    console.error('❌ Error saving invoice:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
