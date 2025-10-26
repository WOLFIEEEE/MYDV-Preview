import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { externalNotifications, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/external-notifications/[id] - Get a specific external notification
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get the specific notification
    const notification = await db
      .select()
      .from(externalNotifications)
      .where(
        and(
          eq(externalNotifications.id, params.id),
          eq(externalNotifications.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!notification.length) {
      return NextResponse.json(
        { error: 'External notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      notification: notification[0]
    });

  } catch (error) {
    console.error('Error fetching external notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/external-notifications/[id] - Update a specific external notification
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Parse request body
    const body = await request.json();
    const {
      status,
      priority,
      assignedTo,
      isRead,
      respondedAt,
      lastContactedAt,
      notes
    } = body;

    // Check if notification exists and belongs to this dealer
    const existingNotification = await db
      .select()
      .from(externalNotifications)
      .where(
        and(
          eq(externalNotifications.id, params.id),
          eq(externalNotifications.dealerId, dealerId)
        )
      )
      .limit(1);

    if (!existingNotification.length) {
      return NextResponse.json(
        { error: 'External notification not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (notes !== undefined) updateData.notes = notes;
    
    // Handle read status
    if (isRead !== undefined) {
      updateData.isRead = isRead;
      if (isRead && !existingNotification[0].readAt) {
        updateData.readAt = new Date();
      }
    }
    
    // Handle response tracking
    if (respondedAt !== undefined) {
      updateData.respondedAt = respondedAt ? new Date(respondedAt) : null;
    }
    
    if (lastContactedAt !== undefined) {
      updateData.lastContactedAt = lastContactedAt ? new Date(lastContactedAt) : null;
    }

    // Update the notification
    const updatedNotification = await db
      .update(externalNotifications)
      .set(updateData)
      .where(
        and(
          eq(externalNotifications.id, params.id),
          eq(externalNotifications.dealerId, dealerId)
        )
      )
      .returning();

    return NextResponse.json({
      notification: updatedNotification[0]
    });

  } catch (error) {
    console.error('Error updating external notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}