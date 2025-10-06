import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { customers } from '@/db/schema';
import { eq, desc, or, ilike } from 'drizzle-orm';

// GET /api/invoice-customers - Get all customers for invoice generation
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID
    const dealerResult = await getDealerIdForUser(user);
    if (!dealerResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerResult.error || 'Dealer not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult.dealerId;

    // Get search parameter for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Build where conditions
    let whereCondition = eq(customers.dealerId, dealerId!);

    // Add search filter if provided
    if (search) {
      whereCondition = eq(customers.dealerId, dealerId!);
    }

    // Fetch all active customers for this dealer
    let query = db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        addressLine1: customers.addressLine1,
        addressLine2: customers.addressLine2,
        city: customers.city,
        county: customers.county,
        postcode: customers.postcode,
        country: customers.country,
        status: customers.status,
      })
      .from(customers)
      .where(whereCondition)
      .orderBy(desc(customers.createdAt));

    // Add search filter if provided
    if (search) {
      query = db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
          addressLine1: customers.addressLine1,
          addressLine2: customers.addressLine2,
          city: customers.city,
          county: customers.county,
          postcode: customers.postcode,
          country: customers.country,
          status: customers.status,
        })
        .from(customers)
        .where(
          eq(customers.dealerId, dealerId!)
        )
        .orderBy(desc(customers.createdAt));

      // Apply search filter
      const searchConditions = or(
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
        ilike(customers.email, `%${search}%`),
        customers.phone ? ilike(customers.phone, `%${search}%`) : undefined
      );

      if (searchConditions) {
        query = db
          .select({
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            addressLine1: customers.addressLine1,
            addressLine2: customers.addressLine2,
            city: customers.city,
            county: customers.county,
            postcode: customers.postcode,
            country: customers.country,
            status: customers.status,
          })
          .from(customers)
          .where(
            eq(customers.dealerId, dealerId!)
          )
          .orderBy(desc(customers.createdAt));
      }
    }

    const customerList = await query;

    // Process customers to add display names and ensure proper formatting
    const processedCustomers = customerList.map(customer => ({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || '',
      addressLine1: customer.addressLine1 || '',
      addressLine2: customer.addressLine2 || '',
      city: customer.city || '',
      county: customer.county || '',
      postcode: customer.postcode || '',
      country: customer.country || 'United Kingdom',
      status: customer.status,
      // Create a display name for the dropdown
      displayName: `${customer.firstName} ${customer.lastName} (${customer.email})`,
      fullName: `${customer.firstName} ${customer.lastName}`,
    }));

    // Filter only active customers for invoice generation
    const activeCustomers = processedCustomers.filter(customer => 
      customer.status === 'active' || !customer.status
    );

    return NextResponse.json({
      success: true,
      customers: activeCustomers,
      total: activeCustomers.length
    });

  } catch (error) {
    console.error('Error fetching customers for invoice:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch customers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
