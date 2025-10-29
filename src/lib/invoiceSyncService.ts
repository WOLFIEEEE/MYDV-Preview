import { db } from '@/lib/db';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { autoCreateCustomerFromSaleDetails } from '@/lib/customerAutoCreate';
import { createSaleDetails, getSaleDetailsByStockId, updateSaleDetails, getVehicleChecklistByStockId, updateVehicleChecklist, createVehicleChecklist } from '@/lib/stockActionsDb';
import { getCityAndCountyFromPostcode } from '@/lib/postcodeUtils';

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

      // Step 3: Sync vehicle checklist
      await this.syncVehicleChecklist();

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
  async syncCustomer(): Promise<string | undefined> {
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
      const updateData: Record<string, any> = {};
      let hasUpdates = false;

      // Update address fields if they exist and are more complete
      if (customerData.address?.secondLine) {
        updateData.addressLine2 = customerData.address.secondLine;
        hasUpdates = true;
      }
      
      // Auto-populate city and county from postcode if needed
      const postCode = customerData.address?.postCode;
      if (postCode && (!customerData.address?.city || !customerData.address?.county)) {
        const { city, county } = getCityAndCountyFromPostcode(postCode);
        
        if (city && !customerData.address?.city) {
          updateData.city = city;
          hasUpdates = true;
        }
        if (county && !customerData.address?.county) {
          updateData.county = county;
          hasUpdates = true;
        }
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
      console.log('📊 [SYNC] Existing sale details found:', !!existingSaleDetails);

      // Prepare sales details data
      const saleDetailsData = this.prepareSalesDetailsData(customerId);
      
      console.log('📝 [SYNC] Prepared sales details data:', {
        deliveryType: saleDetailsData.deliveryType,
        deliveryPrice: saleDetailsData.deliveryPrice,
        deliveryDate: saleDetailsData.deliveryDate,
        stockId: this.stockId,
        dealerId: this.dealerId
      });

      let result;
      if (existingSaleDetails) {
        console.log('📝 Updating existing sales details');
        result = await updateSaleDetails(this.stockId, this.dealerId, saleDetailsData);
        console.log('✅ [SYNC] Sales details updated. Result:', {
          id: result?.id,
          deliveryType: result?.deliveryType,
          deliveryPrice: result?.deliveryPrice,
          deliveryDate: result?.deliveryDate
        });
      } else {
        console.log('🆕 Creating new sales details');
        result = await createSaleDetails({
          stockId: this.stockId,
          dealerId: this.dealerId,
          saleDate: this.invoiceData.sale?.date ? new Date(this.invoiceData.sale.date) : new Date(),
          ...saleDetailsData
        });
        console.log('✅ [SYNC] Sales details created. Result:', {
          id: result?.id,
          deliveryType: result?.deliveryType,
          deliveryPrice: result?.deliveryPrice,
          deliveryDate: result?.deliveryDate
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
   * Extract VAT scheme from invoice data
   * Checks multiple possible locations where VAT status might be stored
   */
  private extractVatScheme(): string | undefined {
    const invoice = this.invoiceData;
    
    // Check for explicit vatScheme field (from URL params stored in metadata/additionalData)
    const invoiceDataAny = invoice as any;
    if (invoiceDataAny.vatScheme) {
      return invoiceDataAny.vatScheme;
    }
    
    // Check metadata if it exists
    if (invoiceDataAny.metadata?.vatScheme) {
      return invoiceDataAny.metadata.vatScheme;
    }
    
    // Check additionalData if it exists
    if (invoiceDataAny.additionalData?.vatStatus) {
      const vatStatus = invoiceDataAny.additionalData.vatStatus;
      // Normalize vatStatus to vatScheme format (no_vat, includes, excludes)
      if (vatStatus === 'no_vat' || vatStatus === 'includes' || vatStatus === 'excludes') {
        return vatStatus;
      }
    }
    
    // Derive from VAT application flags in pricing
    if (invoice.pricing?.applyVatToSalePrice) {
      // If VAT is applied, check if price includes or excludes VAT
      if (invoice.pricing.salePriceIncludingVat && invoice.pricing.salePrice) {
        // If includingVat exists and matches salePrice, it's includes
        if (Math.abs(invoice.pricing.salePriceIncludingVat - invoice.pricing.salePrice) < 0.01) {
          return 'includes';
        } else {
          return 'excludes';
        }
      }
      // Default to excludes if VAT is applied but not explicitly includes
      return 'excludes';
    }
    
    // No VAT applied
    return 'no_vat';
  }

  /**
   * Prepare sales details data from invoice data
   */
  private prepareSalesDetailsData(customerId?: string): Record<string, any> {
    const invoice = this.invoiceData;
    
    // Aggregate multiple payments
    const paymentTotals = this.aggregatePayments();
    
    // Extract VAT scheme from invoice data
    const vatScheme = this.extractVatScheme();
    console.log('💰 [SYNC] Extracted VAT scheme from invoice:', vatScheme);

    const saleDetailsData: Record<string, any> = {
      // Link to customer if available
      customerId: customerId || null,
      
      // Vehicle registration
      registration: invoice.vehicle?.registration,
      
      // Sale information
      saleDate: invoice.sale?.date ? new Date(invoice.sale.date) : new Date(),
      monthOfSale: invoice.sale?.monthOfSale,
      quarterOfSale: invoice.sale?.quarterOfSale,
      salePrice: (invoice.pricing?.salePricePostDiscount !== undefined ? invoice.pricing.salePricePostDiscount : (invoice.pricing?.salePrice ?? 0)).toString(),
      
      // VAT Scheme - sync from invoice data
      vatScheme: vatScheme || 'no_vat',
      
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
      warrantyPrice: (invoice.pricing?.warrantyPricePostDiscount !== undefined ? invoice.pricing.warrantyPricePostDiscount : (invoice.pricing?.warrantyPrice ?? 0)).toString(),
      
      // Delivery information - always use discounted delivery price
      deliveryType: invoice.delivery?.type || 'collection',
      deliveryPrice: (() => {
        // PRIORITY ORDER: 
        // 1. Use invoice.delivery.postDiscountCost (most accurate)
        // 2. Fall back to invoice.pricing.deliveryCostPostDiscount
        // 3. Fall back to original costs
        const deliveryPostDiscount = invoice.delivery?.postDiscountCost;
        const pricingPostDiscount = invoice.pricing?.deliveryCostPostDiscount;
        const originalCost = invoice.delivery?.cost ?? invoice.pricing?.deliveryCost ?? 0;
        
        const finalPrice = deliveryPostDiscount !== undefined 
          ? deliveryPostDiscount 
          : (pricingPostDiscount !== undefined ? pricingPostDiscount : originalCost);
        
        console.log('🚚 [SYNC] Delivery Price Calculation (FIXED):', {
          deliveryPostDiscount,
          pricingPostDiscount,
          originalCost,
          finalPrice,
          deliveryType: invoice.delivery?.type || 'collection',
          dataSource: deliveryPostDiscount !== undefined ? 'invoice.delivery' : 
                     (pricingPostDiscount !== undefined ? 'invoice.pricing' : 'original')
        });
        
        return finalPrice.toString();
      })(),
      deliveryDate: invoice.delivery?.date ? new Date(invoice.delivery.date) : undefined,
      deliveryAddress: invoice.delivery?.address,
      
      // Add-on totals calculation
      totalFinanceAddOn: this.calculateTotalFinanceAddOns().toString(),
      totalCustomerAddOn: this.calculateTotalCustomerAddOns().toString(),
      
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
      Object.entries(saleDetailsData).filter(([, value]) => value !== undefined)
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
    
    // Aggregate all deposit payments from multiple sources
    const depositAmount = (breakdown.depositAmount || 0) + 
                         (this.invoiceData.pricing?.amountPaidDepositFinance || 0) +
                         (this.invoiceData.pricing?.amountPaidDepositCustomer || 0) +
                         (this.invoiceData.pricing?.dealerDepositPaidCustomer || 0);
    
    // Part exchange amount from payment section
    const partExAmount = (breakdown.partExAmount || 0) + 
                        (this.invoiceData.payment?.partExchange?.amountPaid || 0);

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
   * Synchronize vehicle checklist data
   */
  private async syncVehicleChecklist(): Promise<void> {
    console.log('📋 Syncing vehicle checklist...');

    if (!this.invoiceData.checklist) {
      this.warnings.push('No checklist data found in invoice');
      return;
    }

    try {
      const checklist = this.invoiceData.checklist;
      
      // Check if checklist already exists
      const existingChecklist = await getVehicleChecklistByStockId(this.stockId, this.dealerId);

      const checklistData = {
        numberOfKeys: checklist.numberOfKeys || '2',
        userManual: checklist.userManual || 'Not Present',
        serviceBook: checklist.serviceHistoryRecord || 'Unknown',
        wheelLockingNut: checklist.wheelLockingNut || 'Not Present',
        cambeltChainConfirmation: checklist.cambeltChainConfirmation || 'No',
        
        // Update metadata with additional checklist fields
        metadata: {
          mileage: checklist.mileage,
          vehicleInspectionTestDrive: checklist.vehicleInspectionTestDrive || 'No',
          dealerPreSaleCheck: checklist.dealerPreSaleCheck || 'No',
          fuelType: checklist.fuelType || 'Petrol',
          serviceHistory: checklist.serviceHistory || 'Not Available',
          // Preserve existing metadata if any
          ...(existingChecklist?.metadata as Record<string, any> || {})
        },
        
        // Calculate completion percentage
        completionPercentage: checklist.completionPercentage || 0,
        isComplete: checklist.isComplete || false,
        
        updatedAt: new Date()
      };

      // Remove undefined values
      const cleanChecklistData = Object.fromEntries(
        Object.entries(checklistData).filter(([, value]) => value !== undefined)
      );

      if (Object.keys(cleanChecklistData).length > 1) { // More than just updatedAt
        if (existingChecklist) {
          await updateVehicleChecklist(this.stockId, this.dealerId, cleanChecklistData);
          console.log('✅ Vehicle checklist updated');
        } else {
          await createVehicleChecklist({
            stockId: this.stockId,
            dealerId: this.dealerId,
            registration: this.invoiceData.vehicle?.registration,
            ...cleanChecklistData
          });
          console.log('✅ Vehicle checklist created');
        }
      }

    } catch (error) {
      console.error('❌ Error syncing vehicle checklist:', error);
      this.errors.push(`Vehicle checklist sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the first available payment date from payment arrays
   */
  private getFirstPaymentDate(payments: Array<{ amount: number; date: string }>): Date | undefined {
    const validPayment = payments.find(p => p.date && p.date.trim() !== '' && p.amount > 0);
    return validPayment?.date ? new Date(validPayment.date) : undefined;
  }

  /**
   * Calculate total finance add-ons (post-discount values)
   */
  private calculateTotalFinanceAddOns(): number {
    const invoice = this.invoiceData;
    let total = 0;

    // Static finance add-ons (addon1 and addon2)
    const financeAddon1Cost = invoice.addons?.finance?.addon1?.postDiscountCost ?? 
                             invoice.addons?.finance?.addon1?.cost ?? 0;
    const financeAddon2Cost = invoice.addons?.finance?.addon2?.postDiscountCost ?? 
                             invoice.addons?.finance?.addon2?.cost ?? 0;
    
    total += financeAddon1Cost + financeAddon2Cost;

    // Dynamic finance add-ons
    if (invoice.addons?.finance?.dynamicAddons) {
      let dynamicAddons = invoice.addons.finance.dynamicAddons;
      
      // Convert object format to array if needed
      if (!Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
        dynamicAddons = Object.values(dynamicAddons);
      }
      
      if (Array.isArray(dynamicAddons)) {
        total += dynamicAddons.reduce((sum: number, addon: any) => {
          return sum + (addon.postDiscountCost ?? addon.cost ?? 0);
        }, 0);
      }
    }

    return total;
  }

  /**
   * Calculate total customer add-ons (post-discount values)
   */
  private calculateTotalCustomerAddOns(): number {
    const invoice = this.invoiceData;
    let total = 0;

    // Static customer add-ons (addon1 and addon2)
    const customerAddon1Cost = invoice.addons?.customer?.addon1?.postDiscountCost ?? 
                              invoice.addons?.customer?.addon1?.cost ?? 0;
    const customerAddon2Cost = invoice.addons?.customer?.addon2?.postDiscountCost ?? 
                              invoice.addons?.customer?.addon2?.cost ?? 0;
    
    total += customerAddon1Cost + customerAddon2Cost;

    // Dynamic customer add-ons
    if (invoice.addons?.customer?.dynamicAddons) {
      let dynamicAddons = invoice.addons.customer.dynamicAddons;
      
      // Convert object format to array if needed
      if (!Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
        dynamicAddons = Object.values(dynamicAddons);
      }
      
      if (Array.isArray(dynamicAddons)) {
        total += dynamicAddons.reduce((sum: number, addon: any) => {
          return sum + (addon.postDiscountCost ?? addon.cost ?? 0);
        }, 0);
      }
    }

    return total;
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
  // Check if this is a vehicle finder invoice (placeholder stockId)
  const isVehicleFinderInvoice = stockId.startsWith('vehicle-finder-');
  
  if (isVehicleFinderInvoice) {
    console.log('🚗 Vehicle finder invoice detected - performing limited sync (CRM only)');
    
    // For vehicle finder invoices, only sync customer data (CRM)
    // Skip sales details and vehicle checklist sync as there's no real stock entry
    const syncService = new InvoiceSyncService(dealerId, stockId, invoiceData);
    
    try {
      // Only sync customer data
      const customerId = await syncService.syncCustomer();
      
      console.log('✅ Vehicle finder invoice sync completed (CRM only)');
      return {
        success: true,
        customerId,
        saleDetailsId: undefined, // Not applicable for vehicle finder
        errors: [],
        warnings: ['Sales details and vehicle checklist sync skipped for vehicle finder invoice']
      };
      
    } catch (error) {
      console.error('❌ Vehicle finder invoice sync failed:', error);
      return {
        success: false,
        errors: [`Vehicle finder sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  } else {
    // Regular stock-based invoice - perform full sync
    console.log('📦 Stock-based invoice detected - performing full sync');
    const syncService = new InvoiceSyncService(dealerId, stockId, invoiceData);
    return await syncService.sync();
  }
}
