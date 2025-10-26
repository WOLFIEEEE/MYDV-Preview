import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { externalNotifications, dealers } from '@/db/schema';
import { eq, and, ilike, or, desc, count } from 'drizzle-orm';

// GET /api/external-notifications - Get all external notifications for the authenticated dealer
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
    const enquiryType = searchParams.get('enquiryType') || '';
    const priority = searchParams.get('priority') || '';
    const isRead = searchParams.get('isRead');
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
    const whereConditions = [eq(externalNotifications.dealerId, dealerId)];

    // Add search filter - search across personal information and notes
    if (search) {
      whereConditions.push(
        or(
          ilike(externalNotifications.personalFirstName, `%${search}%`),
          ilike(externalNotifications.personalLastName, `%${search}%`),
          ilike(externalNotifications.personalEmail, `%${search}%`),
          ilike(externalNotifications.personalPhoneNumber, `%${search}%`),
          ilike(externalNotifications.vehicleMake, `%${search}%`),
          ilike(externalNotifications.vehicleModel, `%${search}%`),
          ilike(externalNotifications.vehicleRegistration, `%${search}%`),
          ilike(externalNotifications.notes, `%${search}%`)
        )!
      );
    }

    // Add status filter
    if (status && status !== 'all') {
      whereConditions.push(eq(externalNotifications.status, status));
    }

    // Add enquiry type filter
    if (enquiryType && enquiryType !== 'all') {
      whereConditions.push(eq(externalNotifications.enquiryType, enquiryType));
    }

    // Add priority filter
    if (priority && priority !== 'all') {
      whereConditions.push(eq(externalNotifications.priority, priority));
    }

    // Add read/unread filter
    if (isRead !== null && isRead !== '') {
      whereConditions.push(eq(externalNotifications.isRead, isRead === 'true'));
    }

    // Build and execute query
    const notificationsList = await db
      .select({
        id: externalNotifications.id,
        dealerId: externalNotifications.dealerId,
        enquiryType: externalNotifications.enquiryType,
        
        // Personal Information
        personalTitle: externalNotifications.personalTitle,
        personalFirstName: externalNotifications.personalFirstName,
        personalLastName: externalNotifications.personalLastName,
        personalEmail: externalNotifications.personalEmail,
        personalPhoneNumber: externalNotifications.personalPhoneNumber,
        personalAddress: externalNotifications.personalAddress,
        
        // Vehicle Details (interested vehicle)
        vehicleStockId: externalNotifications.vehicleStockId,
        vehicleMake: externalNotifications.vehicleMake,
        vehicleModel: externalNotifications.vehicleModel,
        vehicleRegistration: externalNotifications.vehicleRegistration,
        vehiclePrice: externalNotifications.vehiclePrice,
        
        // User Vehicle (for part-exchange)
        userVehicleMake: externalNotifications.userVehicleMake,
        userVehicleModel: externalNotifications.userVehicleModel,
        userVehicleRegistration: externalNotifications.userVehicleRegistration,
        
        // Employment and Finance (abbreviated for overview)
        employmentStatus: externalNotifications.employmentStatus,
        employmentAnnualIncome: externalNotifications.employmentAnnualIncome,
        
        // Test Drive
        testDriveIsTestDrive: externalNotifications.testDriveIsTestDrive,
        testDriveDate: externalNotifications.testDriveDate,
        testDriveTime: externalNotifications.testDriveTime,
        
        // Vehicle Reservation
        reservationAmount: externalNotifications.reservationAmount,
        
        // General
        notes: externalNotifications.notes,
        
        // Status and Management
        status: externalNotifications.status,
        priority: externalNotifications.priority,
        assignedTo: externalNotifications.assignedTo,
        
        // Source Information
        sourceWebsite: externalNotifications.sourceWebsite,
        sourceIp: externalNotifications.sourceIp,
        
        // Response Tracking
        isRead: externalNotifications.isRead,
        readAt: externalNotifications.readAt,
        respondedAt: externalNotifications.respondedAt,
        lastContactedAt: externalNotifications.lastContactedAt,
        
        // Timestamps
        createdAt: externalNotifications.createdAt,
        updatedAt: externalNotifications.updatedAt,
      })
      .from(externalNotifications)
      .where(and(...whereConditions))
      .orderBy(desc(externalNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(externalNotifications)
      .where(and(...whereConditions));

    const totalCount = totalCountResult[0]?.count || 0;

    // Get summary statistics
    const unreadCount = await db
      .select({ count: count() })
      .from(externalNotifications)
      .where(
        and(
          eq(externalNotifications.dealerId, dealerId),
          eq(externalNotifications.isRead, false)
        )
      );

    const highPriorityCount = await db
      .select({ count: count() })
      .from(externalNotifications)
      .where(
        and(
          eq(externalNotifications.dealerId, dealerId),
          or(
            eq(externalNotifications.priority, 'high'),
            eq(externalNotifications.priority, 'urgent')
          )!,
          eq(externalNotifications.isRead, false)
        )
      );

    return NextResponse.json({
      notifications: notificationsList,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      summary: {
        unreadCount: unreadCount[0]?.count || 0,
        highPriorityUnreadCount: highPriorityCount[0]?.count || 0,
      },
      filters: {
        search,
        status,
        enquiryType,
        priority,
        isRead,
      }
    });

  } catch (error) {
    console.error('Error fetching external notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}