import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { customers, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/customers/[id] - Get a specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Find the customer
    const resolvedParams = await params;
    const customer = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!customer.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer[0]);

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update a specific customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Check if customer exists and belongs to this dealer
    const resolvedParams = await params;
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!existingCustomer.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

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

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Check if email is being changed and if it conflicts with another customer
    if (email !== existingCustomer[0].email) {
      const emailConflict = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.dealerId, dealerId),
            eq(customers.email, email)
          )
        )
        .limit(1);

      if (emailConflict.length > 0) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Update the customer
    const updatedCustomer = await db
      .update(customers)
      .set({
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
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, id),
          eq(customers.dealerId, dealerId)
        )
      )
      .returning();

    return NextResponse.json(updatedCustomer[0]);

  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete a specific customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Check if customer exists and belongs to this dealer
    const resolvedParams = await params;
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!existingCustomer.length) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Delete the customer
    await db
      .delete(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.dealerId, dealerId)
        )
      );

    return NextResponse.json({ message: 'Customer deleted successfully' });

  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
