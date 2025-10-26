import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { businesses, dealers } from '@/db/schema';
import { eq, and, ilike, or, desc } from 'drizzle-orm';

// GET /api/businesses - Get all businesses for the authenticated dealer
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
    const whereConditions = [eq(businesses.dealerId, dealerId)];

    // Add search filter
    if (search) {
      whereConditions.push(
        or(
          ilike(businesses.businessName, `%${search}%`),
          ilike(businesses.email, `%${search}%`),
          ilike(businesses.phone, `%${search}%`),
          ilike(businesses.vatNumber, `%${search}%`),
          ilike(businesses.companyNumber, `%${search}%`)
        )!
      );
    }

    // Add status filter
    if (status && status !== 'all') {
      whereConditions.push(eq(businesses.status, status));
    }

    // Build and execute query
    const businessList = await db
      .select({
        id: businesses.id,
        dealerId: businesses.dealerId,
        businessName: businesses.businessName,
        email: businesses.email,
        phone: businesses.phone,
        vatNumber: businesses.vatNumber,
        companyNumber: businesses.companyNumber,
        addressLine1: businesses.addressLine1,
        addressLine2: businesses.addressLine2,
        city: businesses.city,
        county: businesses.county,
        postcode: businesses.postcode,
        country: businesses.country,
        notes: businesses.notes,
        businessSource: businesses.businessSource,
        preferredContactMethod: businesses.preferredContactMethod,
        status: businesses.status,
        tags: businesses.tags,
        customFields: businesses.customFields,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
      })
      .from(businesses)
      .where(and(...whereConditions))
      .orderBy(desc(businesses.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: businesses.id })
      .from(businesses)
      .where(eq(businesses.dealerId, dealerId));

    return NextResponse.json({
      businesses: businessList,
      total: totalCount.length,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/businesses - Create a new business
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
      businessName,
      email,
      phone,
      vatNumber,
      companyNumber,
      addressLine1,
      addressLine2,
      city,
      county,
      postcode,
      country,
      notes,
      businessSource,
      preferredContactMethod,
      status,
      tags,
      customFields,
    } = body;

    // Validate required fields
    if (!businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Check if business with this email already exists for this dealer (only if email is provided)
    if (email) {
      const existingBusiness = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.dealerId, dealerId),
            eq(businesses.email, email)
          )
        )
        .limit(1);

      if (existingBusiness.length > 0) {
        return NextResponse.json(
          { error: 'Business with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check if business with this company number already exists for this dealer (only if company number is provided)
    if (companyNumber) {
      const existingBusinessByCompanyNumber = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.dealerId, dealerId),
            eq(businesses.companyNumber, companyNumber)
          )
        )
        .limit(1);

      if (existingBusinessByCompanyNumber.length > 0) {
        return NextResponse.json(
          { error: 'Business with this company number already exists' },
          { status: 409 }
        );
      }
    }

    // Create the business
    const newBusiness = await db
      .insert(businesses)
      .values({
        dealerId,
        businessName,
        email,
        phone,
        vatNumber,
        companyNumber,
        addressLine1,
        addressLine2,
        city,
        county,
        postcode,
        country: country || 'United Kingdom',
        notes,
        businessSource,
        preferredContactMethod: preferredContactMethod || 'email',
        status: status || 'active',
        tags: tags || null,
        customFields: customFields || null,
      })
      .returning();

    return NextResponse.json(newBusiness[0], { status: 201 });

  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
