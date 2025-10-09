import { db } from '@/lib/db';
import { customers, saleDetails, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { autoCreateCustomerFromSaleDetails } from '@/lib/customerAutoCreate';
import { createSaleDetails, getSaleDetailsByStockId, updateSaleDetails } from '@/lib/stockActionsDb';

// Import the ComprehensiveInvoiceData interface
import type { ComprehensiveInvoiceData } from '@/app/api/invoice-data/route';

interface InvoiceSyncResult {
  success: boolean;
  customerId?: string;
  saleDetailsId?: number;
  errors: string[];
  warnings: string[];
}

/**
 * Main service to synchronize invoice data with CRM customers and sales details
 * This service runs after an invoice is successfully saved
 */
export class InvoiceSyncService {
  private dealerId: string;
  private stockId: string;
  private invoiceData: ComprehensiveInvoiceData;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(dealerId: string, stockId: string, invoiceData: ComprehensiveInvoiceData) {
    this.dealerId = dealerId;
    this.stockId = stockId;
    this.invoiceData = invoiceData;
  }

  /**
   * Main synchronization method
   */
  async sync(): Promise<InvoiceSyncResult> {
    console.log('🔄 Starting invoice synchronization for stockId:', this.stockId);
    
    try {
      // Step 1: Sync customer data
      const customerId = await this.syncCustomer();
      
      // Step 2: Sync sales details
      const saleDetailsId = await this.syncSalesDetails(customerId);

      const result: InvoiceSyncResult = {
        success: this.errors.length === 0,
        customerId,
        saleDetailsId,
        errors: this.errors,
        warnings: this.warnings
      };

      if (result.success) {
        console.log('✅ Invoice synchronization completed successfully');
      } else {
        console.log('⚠️ Invoice synchronization completed with errors:', this.errors);
      }

      return result;

    } catch (error) {
      console.error('❌ Invoice synchronization failed:', error);
      this.errors.push(`Synchronization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings
      };
    }
  }

  /**
   * Synchronize customer data with CRM
   */
  private async syncCustomer(): Promise<string | undefined> {
    console.log('👤 Syncing customer data...');

    if (!this.invoiceData.customer) {
      this.warnings.push('No customer data found in invoice');
      return undefined;
    }

    const customer = this.invoiceData.customer;

    // Validate required customer fields (email is now optional)
    if (!customer.firstName || !customer.lastName) {
      this.warnings.push('Missing required customer fields (firstName, lastName)');
      return undefined;
    }

    try {
      // Prepare customer data for auto-creation/update
      const customerData = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        emailAddress: customer.contact.email,
        contactNumber: customer.contact.phone || undefined,
        addressFirstLine: customer.address?.firstLine || undefined,
        addressPostCode: customer.address?.postCode || undefined,
        gdprConsent: customer.flags?.gdprConsent || false,
        salesMarketingConsent: customer.flags?.salesMarketingConsent || false,
        vulnerabilityMarker: customer.flags?.vulnerabilityMarker || false,
        notes: `Updated from invoice: ${this.invoiceData.invoiceNumber}`
      };

      // Use existing auto-create customer function
      const customerId = await autoCreateCustomerFromSaleDetails(this.dealerId, customerData);

      if (customerId) {
        console.log('✅ Customer synced successfully:', customerId);
        
        // If customer already existed, update with any new information
        await this.updateExistingCustomer(customerId, customer);
        
        return customerId;
      } else {
        this.errors.push('Failed to create/find customer in CRM');
        return undefined;
      }

    } catch (error) {
      console.error('❌ Error syncing customer:', error);
      this.errors.push(`Customer sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }

  /**
   * Update existing customer with additional invoice data
   */
  private async updateExistingCustomer(customerId: string, customerData: ComprehensiveInvoiceData['customer']): Promise<void> {
    try {
      const updateData: any = {};
      let hasUpdates = false;

      // Update address fields if they exist and are more complete
      if (customerData.address?.secondLine) {
        updateData.addressLine2 = customerData.address.secondLine;
        hasUpdates = true;
      }
      if (customerData.address?.city) {
        updateData.city = customerData.address.city;
        hasUpdates = true;
      }
      if (customerData.address?.county) {
        updateData.county = customerData.address.county;
        hasUpdates = true;
      }
      if (customerData.address?.country && customerData.address.country !== 'United Kingdom') {
        updateData.country = customerData.address.country;
        hasUpdates = true;
      }

      // Update consent flags if they're true (don't override existing true values with false)
      if (customerData.flags?.gdprConsent) {
        updateData.gdprConsent = true;
        hasUpdates = true;
      }
      if (customerData.flags?.salesMarketingConsent) {
        updateData.marketingConsent = true;
        updateData.salesConsent = true;
        hasUpdates = true;
      }

      // Always update the timestamp
      updateData.updatedAt = new Date();

      if (hasUpdates) {
        await db.update(customers)
          .set(updateData)
          .where(eq(customers.id, customerId));
        
        console.log('✅ Customer updated with additional invoice data');
      }

    } catch (error) {
      console.error('⚠️ Error updating existing customer:', error);
      this.warnings.push(`Failed to update customer details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Synchronize sales details with proper payment aggregation
   */
  private async syncSalesDetails(customerId?: string): Promise<number | undefined> {
    console.log('💰 Syncing sales details...');

    try {
      // Check if sales details already exist
      const existingSaleDetails = await getSaleDetailsByStockId(this.stockId, this.dealerId);

      // Prepare sales details data
      const saleDetailsData = this.prepareSalesDetailsData(customerId);

      let result;
      if (existingSaleDetails) {
        console.log('📝 Updating existing sales details');
        result = await updateSaleDetails(this.stockId, this.dealerId, saleDetailsData);
      } else {
        console.log('🆕 Creating new sales details');
        result = await createSaleDetails({
          stockId: this.stockId,
          dealerId: this.dealerId,
          saleDate: this.invoiceData.sale?.date ? new Date(this.invoiceData.sale.date) : new Date(),
          ...saleDetailsData
        });
      }

      if (result) {
        console.log('✅ Sales details synced successfully');
        return result.id;
      } else {
        this.errors.push('Failed to create/update sales details');
        return undefined;
      }

    } catch (error) {
      console.error('❌ Error syncing sales details:', error);
      this.errors.push(`Sales details sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }

  /**
   * Prepare sales details data from invoice data
   */
  private prepareSalesDetailsData(customerId?: string): any {
    const invoice = this.invoiceData;
    
    // Aggregate multiple payments
    const paymentTotals = this.aggregatePayments();

    const saleDetailsData: any = {
      // Link to customer if available
      customerId: customerId || null,
      
      // Vehicle registration
      registration: invoice.vehicle?.registration,
      
      // Sale information
      saleDate: invoice.sale?.date ? new Date(invoice.sale.date) : new Date(),
      monthOfSale: invoice.sale?.monthOfSale,
      quarterOfSale: invoice.sale?.quarterOfSale,
      salePrice: invoice.pricing?.salePricePostDiscount?.toString() || invoice.pricing?.salePrice?.toString(),
      
      // Customer information (from invoice customer data)
      firstName: invoice.customer?.firstName,
      lastName: invoice.customer?.lastName,
      emailAddress: invoice.customer?.contact?.email,
      contactNumber: invoice.customer?.contact?.phone,
      addressFirstLine: invoice.customer?.address?.firstLine,
      addressPostCode: invoice.customer?.address?.postCode,
      
      // Payment method and breakdown
      paymentMethod: invoice.payment?.method || 'cash',
      
      // Aggregated payment amounts
      cashAmount: paymentTotals.cashAmount,
      bacsAmount: paymentTotals.bacsAmount,
      cardAmount: paymentTotals.cardAmount,
      financeAmount: paymentTotals.financeAmount,
      depositAmount: paymentTotals.depositAmount,
      partExAmount: paymentTotals.partExAmount,
      
      // Payment dates (use first available date from arrays)
      depositDate: this.getFirstPaymentDate([
        ...(invoice.payment?.breakdown?.cardPayments || []),
        ...(invoice.payment?.breakdown?.bacsPayments || []),
        ...(invoice.payment?.breakdown?.cashPayments || [])
      ]),
      
      // Warranty information
      warrantyType: invoice.warranty?.type || 'none',
      
      // Delivery information
      deliveryType: invoice.delivery?.type || 'collection',
      deliveryPrice: invoice.delivery?.cost?.toString(),
      deliveryDate: invoice.delivery?.date ? new Date(invoice.delivery.date) : undefined,
      deliveryAddress: invoice.delivery?.address,
      
      // Status flags from invoice
      documentationComplete: invoice.status?.documentationComplete || false,
      keyHandedOver: invoice.status?.keyHandedOver || false,
      customerSatisfied: invoice.status?.customerSatisfied || false,
      vulnerabilityMarker: invoice.customer?.flags?.vulnerabilityMarker || false,
      depositPaid: paymentTotals.depositAmount > 0,
      vehiclePurchased: invoice.status?.vehiclePurchased || false,
      gdprConsent: invoice.customer?.flags?.gdprConsent || false,
      salesMarketingConsent: invoice.customer?.flags?.salesMarketingConsent || false,
      
      // Additional notes
      notes: invoice.notes ? (Array.isArray(invoice.notes) ? invoice.notes.join('\n') : invoice.notes) : undefined,
      
      // Update timestamp
      updatedAt: new Date()
    };

    // Remove undefined values to prevent overwriting existing data
    return Object.fromEntries(
      Object.entries(saleDetailsData).filter(([_, value]) => value !== undefined)
    );
  }

  /**
   * Aggregate multiple payment entries into totals
   */
  private aggregatePayments() {
    const payment = this.invoiceData.payment;
    
    if (!payment?.breakdown) {
      return {
        cashAmount: 0,
        bacsAmount: 0,
        cardAmount: 0,
        financeAmount: 0,
        depositAmount: 0,
        partExAmount: 0
      };
    }

    const breakdown = payment.breakdown;

    // Sum multiple payment entries
    const cashAmount = (breakdown.cashPayments || [])
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const bacsAmount = (breakdown.bacsPayments || [])
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const cardAmount = (breakdown.cardPayments || [])
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

    // Use single payment fields as fallback/addition
    const financeAmount = breakdown.financeAmount || 0;
    const depositAmount = breakdown.depositAmount || 0;
    const partExAmount = breakdown.partExAmount || 0;

    console.log('💰 Payment aggregation:', {
      cashAmount,
      bacsAmount,
      cardAmount,
      financeAmount,
      depositAmount,
      partExAmount,
      total: cashAmount + bacsAmount + cardAmount + financeAmount + depositAmount + partExAmount
    });

    return {
      cashAmount,
      bacsAmount,
      cardAmount,
      financeAmount,
      depositAmount,
      partExAmount
    };
  }

  /**
   * Get the first available payment date from payment arrays
   */
  private getFirstPaymentDate(payments: Array<{ amount: number; date: string }>): Date | undefined {
    const validPayment = payments.find(p => p.date && p.date.trim() !== '' && p.amount > 0);
    return validPayment?.date ? new Date(validPayment.date) : undefined;
  }
}

/**
 * Convenience function to sync invoice data
 */
export async function syncInvoiceData(
  dealerId: string,
  stockId: string,
  invoiceData: ComprehensiveInvoiceData
): Promise<InvoiceSyncResult> {
  const syncService = new InvoiceSyncService(dealerId, stockId, invoiceData);
  return await syncService.sync();
}
