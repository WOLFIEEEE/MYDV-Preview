import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { testDriveEntries, dealers } from '@/db/schema';
import { eq, and, ilike, or, desc } from 'drizzle-orm';

// GET /api/test-drives - Get all test drive entries for the authenticated dealer
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

    // Build the query
    // Build where conditions
    const whereConditions = [];
    whereConditions.push(eq(testDriveEntries.dealerId, dealerId));
    
    if (search) {
      whereConditions.push(
        or(
          ilike(testDriveEntries.customerName, `%${search}%`),
          ilike(testDriveEntries.customerEmail, `%${search}%`),
          ilike(testDriveEntries.vehicleRegistration, `%${search}%`),
          ilike(testDriveEntries.vehicleMake, `%${search}%`),
          ilike(testDriveEntries.vehicleModel, `%${search}%`)
        )
      );
    }
    
    if (status && status !== 'all') {
      whereConditions.push(eq(testDriveEntries.status, status));
    }

    // Add ordering, limit, and offset
    const testDriveList = await db
      .select({
        id: testDriveEntries.id,
        dealerId: testDriveEntries.dealerId,
        vehicleRegistration: testDriveEntries.vehicleRegistration,
        vehicleMake: testDriveEntries.vehicleMake,
        vehicleModel: testDriveEntries.vehicleModel,
        vehicleYear: testDriveEntries.vehicleYear,
        testDriveDate: testDriveEntries.testDriveDate,
        testDriveTime: testDriveEntries.testDriveTime,
        estimatedDuration: testDriveEntries.estimatedDuration,
        customerName: testDriveEntries.customerName,
        customerEmail: testDriveEntries.customerEmail,
        customerPhone: testDriveEntries.customerPhone,
        addressSameAsId: testDriveEntries.addressSameAsId,
        addressLine1: testDriveEntries.addressLine1,
        addressLine2: testDriveEntries.addressLine2,
        city: testDriveEntries.city,
        county: testDriveEntries.county,
        postcode: testDriveEntries.postcode,
        country: testDriveEntries.country,
        drivingLicenseFile: testDriveEntries.drivingLicenseFile,
        status: testDriveEntries.status,
        notes: testDriveEntries.notes,
        createdAt: testDriveEntries.createdAt,
        updatedAt: testDriveEntries.updatedAt,
      })
      .from(testDriveEntries)
      .where(and(...whereConditions))
      .orderBy(desc(testDriveEntries.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: testDriveEntries.id })
      .from(testDriveEntries)
      .where(eq(testDriveEntries.dealerId, dealerId));

    return NextResponse.json({
      testDrives: testDriveList,
      total: totalCount.length,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error fetching test drives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/test-drives - Create a new test drive entry
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

    // Validate required fields - only check essential fields
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

    // Create the test drive entry
    const newTestDrive = await db
      .insert(testDriveEntries)
      .values({
        dealerId,
        vehicleRegistration,
        vehicleMake: '', // Default empty value for removed field
        vehicleModel: '', // Default empty value for removed field
        vehicleYear: null, // Default null value for removed field
        testDriveDate: new Date(), // Default to current date
        testDriveTime: '09:00', // Default time
        estimatedDuration: 30, // Default 30 minutes
        customerName: '', // Default empty value for removed field
        customerEmail: '', // Default empty value for removed field
        customerPhone: null, // Default null value for removed field
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
      })
      .returning();

    return NextResponse.json(newTestDrive[0], { status: 201 });

  } catch (error) {
    console.error('Error creating test drive:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
