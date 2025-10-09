import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customers, dealers } from '@/db/schema';
import { eq, and, ilike, or, desc } from 'drizzle-orm';

// GET /api/customers - Get all customers for the authenticated dealer
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Find the dealer by Clerk user ID
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1);

    if (!dealer.length) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const dealerId = dealer[0].id;

    // Build where conditions
    const whereConditions = [eq(customers.dealerId, dealerId)];

    // Add search filter
    if (search) {
      whereConditions.push(
        or(
          ilike(customers.firstName, `%${search}%`),
          ilike(customers.lastName, `%${search}%`),
          ilike(customers.email, `%${search}%`),
          ilike(customers.phone, `%${search}%`)
        )!
      );
    }

    // Add status filter
    if (status && status !== 'all') {
      whereConditions.push(eq(customers.status, status));
    }

    // Build and execute query
    const customerList = await db
      .select({
        id: customers.id,
        dealerId: customers.dealerId,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        dateOfBirth: customers.dateOfBirth,
        addressLine1: customers.addressLine1,
        addressLine2: customers.addressLine2,
        city: customers.city,
        county: customers.county,
        postcode: customers.postcode,
        country: customers.country,
        marketingConsent: customers.marketingConsent,
        salesConsent: customers.salesConsent,
        gdprConsent: customers.gdprConsent,
        consentDate: customers.consentDate,
        notes: customers.notes,
        customerSource: customers.customerSource,
        preferredContactMethod: customers.preferredContactMethod,
        status: customers.status,
        tags: customers.tags,
        enquiryType: customers.enquiryType,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(and(...whereConditions))
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: customers.id })
      .from(customers)
      .where(eq(customers.dealerId, dealerId));

    return NextResponse.json({
      customers: customerList,
      total: totalCount.length,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the dealer by Clerk user ID
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1);

    if (!dealer.length) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const dealerId = dealer[0].id;

    // Parse request body
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      addressLine1,
      addressLine2,
      city,
      county,
      postcode,
      country,
      marketingConsent,
      salesConsent,
      gdprConsent,
      notes,
      customerSource,
      preferredContactMethod,
      status,
      tags,
      enquiryType,
    } = body;

    // Validate required fields (email is now optional)
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Check if customer with this email already exists for this dealer (only if email is provided)
    if (email) {
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.dealerId, dealerId),
            eq(customers.email, email)
          )
        )
        .limit(1);

      if (existingCustomer.length > 0) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Create the customer
    const newCustomer = await db
      .insert(customers)
      .values({
        dealerId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        addressLine1,
        addressLine2,
        city,
        county,
        postcode,
        country: country || 'United Kingdom',
        marketingConsent: marketingConsent || false,
        salesConsent: salesConsent || false,
        gdprConsent: gdprConsent || false,
        consentDate: (marketingConsent || salesConsent || gdprConsent) ? new Date() : null,
        notes,
        customerSource,
        preferredContactMethod: preferredContactMethod || 'email',
        status: status || 'active',
        tags: tags || null,
        enquiryType: enquiryType || null,
      })
      .returning();

    return NextResponse.json(newCustomer[0], { status: 201 });

  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
