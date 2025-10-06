import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { testDriveEntries, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/test-drives/[id] - Get a specific test drive entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Find the test drive entry
    const resolvedParams = await params;
    const testDrive = await db
      .select()
      .from(testDriveEntries)
      .where(
        and(
          eq(testDriveEntries.id, resolvedParams.id),
          eq(testDriveEntries.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!testDrive.length) {
      return NextResponse.json({ error: 'Test drive not found' }, { status: 404 });
    }

    return NextResponse.json(testDrive[0]);

  } catch (error) {
    console.error('Error fetching test drive:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/test-drives/[id] - Update a specific test drive entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if test drive exists and belongs to this dealer
    const resolvedParams = await params;
    const existingTestDrive = await db
      .select()
      .from(testDriveEntries)
      .where(
        and(
          eq(testDriveEntries.id, resolvedParams.id),
          eq(testDriveEntries.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!existingTestDrive.length) {
      return NextResponse.json({ error: 'Test drive not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const {
      vehicleRegistration,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      testDriveDate,
      testDriveTime,
      estimatedDuration,
      customerName,
      customerEmail,
      customerPhone,
      addressSameAsId,
      addressLine1,
      addressLine2,
      city,
      county,
      postcode,
      country,
      drivingLicenseFile,
      status,
      notes,
    } = body;

    // Validate required fields - only check essential fields that are still in the form
    if (!vehicleRegistration) {
      return NextResponse.json(
        { error: 'Vehicle registration is required' },
        { status: 400 }
      );
    }
    
    if (!addressSameAsId) {
      return NextResponse.json(
        { error: 'Address information is required' },
        { status: 400 }
      );
    }

    // Update the test drive entry
    const updatedTestDrive = await db
      .update(testDriveEntries)
      .set({
        vehicleRegistration,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        testDriveDate: new Date(testDriveDate),
        testDriveTime,
        estimatedDuration: parseInt(estimatedDuration),
        customerName,
        customerEmail,
        customerPhone,
        addressSameAsId,
        addressLine1: addressSameAsId === 'no' ? addressLine1 : null,
        addressLine2: addressSameAsId === 'no' ? addressLine2 : null,
        city: addressSameAsId === 'no' ? city : null,
        county: addressSameAsId === 'no' ? county : null,
        postcode: addressSameAsId === 'no' ? postcode : null,
        country: addressSameAsId === 'no' ? (country || 'United Kingdom') : 'United Kingdom',
        drivingLicenseFile,
        status: status || 'scheduled',
        notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(testDriveEntries.id, resolvedParams.id),
          eq(testDriveEntries.dealerId, dealerId)
        )
      )
      .returning();

    return NextResponse.json(updatedTestDrive[0]);

  } catch (error) {
    console.error('Error updating test drive:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/test-drives/[id] - Delete a specific test drive entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if test drive exists and belongs to this dealer
    const resolvedParams = await params;
    const existingTestDrive = await db
      .select()
      .from(testDriveEntries)
      .where(
        and(
          eq(testDriveEntries.id, resolvedParams.id),
          eq(testDriveEntries.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!existingTestDrive.length) {
      return NextResponse.json({ error: 'Test drive not found' }, { status: 404 });
    }

    // Delete the test drive entry
    await db
      .delete(testDriveEntries)
      .where(
        and(
          eq(testDriveEntries.id, resolvedParams.id),
          eq(testDriveEntries.dealerId, dealerId)
        )
      );

    return NextResponse.json({ message: 'Test drive deleted successfully' });

  } catch (error) {
    console.error('Error deleting test drive:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
