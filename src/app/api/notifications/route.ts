import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { NotificationService } from '@/lib/notificationService'
import { db } from '@/lib/db'
import { dealers } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/notifications
 * Fetch notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get dealer record first
    const [dealer] = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1)

    // Check if user is an admin (even if they don't have a dealer record)
    const userEmail = user.emailAddresses?.[0]?.emailAddress || ''
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || []
    const isAdmin = adminEmails.includes(userEmail)

    let recipientId: string
    if (dealer?.id) {
      // User has a dealer record - use dealer ID
      recipientId = dealer.id
    } else if (isAdmin) {
      // User is an admin but doesn't have a dealer record - create deterministic UUID from email
      const crypto = await import('crypto')
      const hash = crypto.createHash('sha256').update(userEmail).digest('hex')
      recipientId = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
      ].join('-')
      console.log('🔍 Admin user without dealer record - using email-based UUID:', userEmail.replace(/(.{2}).*(@.*)/, '$1***$2'))
    } else {
      // For team members or other users, use Clerk ID to create deterministic UUID
      const crypto = await import('crypto')
      const hash = crypto.createHash('sha256').update(user.id).digest('hex')
      recipientId = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
      ].join('-')
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const types = searchParams.get('types')?.split(',') || undefined
    const priorities = searchParams.get('priorities')?.split(',') || undefined

    // Fetch notifications
    const notifications = await NotificationService.getUserNotifications(recipientId, {
      limit,
      offset,
      unreadOnly,
      includeArchived,
      types: types as any,
      priorities: priorities as any
    })

    // Get unread count
    const unreadCount = await NotificationService.getUnreadCount(recipientId)

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Create a new notification (admin only or system use)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin (either via dealer record or environment variable)
    const userEmail = user.emailAddresses?.[0]?.emailAddress || ''
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || []
    const isAdminByEmail = adminEmails.includes(userEmail)

    // Get dealer record if exists
    const [dealer] = await db
      .select({ id: dealers.id, role: dealers.role })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1)

    // Check admin permissions - either via dealer role or admin email list
    const isAdminByRole = dealer?.role === 'admin'
    const isAdmin = isAdminByEmail || isAdminByRole

    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions - Admin access required' }, { status: 403 })
    }

    console.log('🔍 Admin creating notification:', {
      userEmail: userEmail.replace(/(.{2}).*(@.*)/, '$1***$2'),
      hasDealer: !!dealer,
      isAdminByEmail,
      isAdminByRole
    })

    const body = await request.json()
    const {
      recipientId,
      recipientIds, // for bulk notifications
      type,
      title,
      message,
      priority = 'medium',
      entityType,
      entityId,
      metadata,
      actionUrl,
      actionLabel,
      channels = ['in_app'],
      scheduledFor,
      expiresAt,
      groupKey
    } = body

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message' },
        { status: 400 }
      )
    }

    let result
    if (recipientIds && Array.isArray(recipientIds)) {
      // Bulk notification
      result = await NotificationService.createBulkNotifications({
        recipientIds,
        type,
        title,
        message,
        priority,
        entityType,
        entityId,
        metadata,
        actionUrl,
        actionLabel,
        channels,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        groupKey,
        senderId: dealer?.id
      })
    } else if (recipientId) {
      // Single notification
      result = await NotificationService.createNotification({
        recipientId,
        type,
        title,
        message,
        priority,
        entityType,
        entityId,
        metadata,
        actionUrl,
        actionLabel,
        channels,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        groupKey,
        senderId: dealer?.id
      })
    } else {
      return NextResponse.json(
        { error: 'Either recipientId or recipientIds must be provided' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
