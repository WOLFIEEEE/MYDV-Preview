import { db } from '@/lib/db';
import { customers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface SaleDetailsData {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  contactNumber?: string;
  addressFirstLine?: string;
  addressPostCode?: string;
  gdprConsent?: boolean;
  salesMarketingConsent?: boolean;
  vulnerabilityMarker?: boolean;
  requiresAdditionalSupport?: boolean;
  notes?: string;
}

/**
 * Automatically creates a customer record from sales details if one doesn't exist
 * Returns the customer ID (existing or newly created)
 */
export async function autoCreateCustomerFromSaleDetails(
  dealerId: string,
  saleDetailsData: SaleDetailsData
): Promise<string | null> {
  try {
    // Validate required fields
    if (!saleDetailsData.firstName || !saleDetailsData.lastName || !saleDetailsData.emailAddress) {
      console.log('⚠️ Auto-create customer: Missing required fields (firstName, lastName, emailAddress)');
      return null;
    }

    // Check if customer already exists with this email for this dealer
    const existingCustomer = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.dealerId, dealerId),
          eq(customers.email, saleDetailsData.emailAddress)
        )
      )
      .limit(1);

    if (existingCustomer.length > 0) {
      console.log('✅ Auto-create customer: Customer already exists with email:', saleDetailsData.emailAddress);
      return existingCustomer[0].id;
    }

    // Create new customer from sales details
    console.log('🆕 Auto-create customer: Creating new customer from sales details');
    const newCustomer = await db
      .insert(customers)
      .values({
        dealerId,
        firstName: saleDetailsData.firstName,
        lastName: saleDetailsData.lastName,
        email: saleDetailsData.emailAddress,
        phone: saleDetailsData.contactNumber || null,
        addressLine1: saleDetailsData.addressFirstLine || null,
        postcode: saleDetailsData.addressPostCode || null,
        country: 'United Kingdom',
        marketingConsent: saleDetailsData.salesMarketingConsent || false,
        salesConsent: saleDetailsData.salesMarketingConsent || false,
        gdprConsent: saleDetailsData.gdprConsent || false,
        consentDate: (saleDetailsData.gdprConsent || saleDetailsData.salesMarketingConsent) ? new Date() : null,
        notes: saleDetailsData.notes || null,
        customerSource: 'sales_details',
        preferredContactMethod: 'email',
        status: 'active',
        enquiryType: 'vehicle_purchase',
      })
      .returning({ id: customers.id });

    console.log('✅ Auto-create customer: Successfully created customer with ID:', newCustomer[0].id);
    return newCustomer[0].id;

  } catch (error) {
    console.error('❌ Auto-create customer: Error creating customer from sales details:', error);
    return null;
  }
}
