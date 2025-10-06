import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { NotificationService } from '@/lib/notificationService'
import { db } from '@/lib/db'
import { dealers } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/notifications/bulk-actions
 * Perform bulk actions on notifications
 */
export async function POST(request: NextRequest) {
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
    const { action, notificationIds } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    switch (action) {
      case 'mark_all_read':
        await NotificationService.markAllAsRead(dealer.id)
        break
      case 'mark_selected_read':
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return NextResponse.json(
            { error: 'notificationIds array is required for this action' },
            { status: 400 }
          )
        }
        await NotificationService.markMultipleAsRead(notificationIds, dealer.id)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    )
  }
}
