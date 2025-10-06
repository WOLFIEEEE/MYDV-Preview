import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { NotificationService } from '@/lib/notificationService'
import { db } from '@/lib/db'
import { dealers } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer record
    const [dealer] = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1)

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    const preferences = await NotificationService.getUserPreferences(dealer.id)

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer record
    const [dealer] = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1)

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      isEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone,
      emailPreferences,
      smsPreferences,
      pushPreferences,
      inAppPreferences,
      minPriorityEmail,
      minPrioritySms,
      minPriorityPush,
      digestFrequency,
      maxNotificationsPerHour
    } = body

    const updatedPreferences = await NotificationService.updateUserPreferences(dealer.id, {
      isEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone,
      emailPreferences,
      smsPreferences,
      pushPreferences,
      inAppPreferences,
      minPriorityEmail,
      minPrioritySms,
      minPriorityPush,
      digestFrequency,
      maxNotificationsPerHour
    })

    return NextResponse.json({ 
      success: true, 
      preferences: updatedPreferences 
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}
