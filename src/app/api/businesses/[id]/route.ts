import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { businesses, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/businesses/[id] - Get a specific business
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

    // Find the business
    const resolvedParams = await params;
    const business = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, id),
          eq(businesses.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!business.length) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json(business[0]);

  } catch (error) {
    console.error('Error fetching business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/businesses/[id] - Update a specific business
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

    // Check if business exists and belongs to this dealer
    const resolvedParams = await params;
    const existingBusiness = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, id),
          eq(businesses.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!existingBusiness.length) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

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

    // Check if email is being changed and if it conflicts with another business
    if (email && email !== existingBusiness[0].email) {
      const emailConflict = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.dealerId, dealerId),
            eq(businesses.email, email)
          )
        )
        .limit(1);

      if (emailConflict.length > 0) {
        return NextResponse.json(
          { error: 'Business with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check if company number is being changed and if it conflicts with another business
    if (companyNumber && companyNumber !== existingBusiness[0].companyNumber) {
      const companyNumberConflict = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.dealerId, dealerId),
            eq(businesses.companyNumber, companyNumber)
          )
        )
        .limit(1);

      if (companyNumberConflict.length > 0) {
        return NextResponse.json(
          { error: 'Business with this company number already exists' },
          { status: 409 }
        );
      }
    }

    // Update the business
    const updatedBusiness = await db
      .update(businesses)
      .set({
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
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businesses.id, id),
          eq(businesses.dealerId, dealerId)
        )
      )
      .returning();

    return NextResponse.json(updatedBusiness[0]);

  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/businesses/[id] - Delete a specific business
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

    // Check if business exists and belongs to this dealer
    const resolvedParams = await params;
    const existingBusiness = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, id),
          eq(businesses.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!existingBusiness.length) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Delete the business
    await db
      .delete(businesses)
      .where(
        and(
          eq(businesses.id, id),
          eq(businesses.dealerId, dealerId)
        )
      );

    return NextResponse.json({ message: 'Business deleted successfully' });

  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
