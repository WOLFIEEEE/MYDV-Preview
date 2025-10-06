import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { kanbanTaskComments, kanbanTasks, kanbanBoards, dealers } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { KanbanNotificationService } from '@/lib/kanbanNotifications'

/**
 * GET /api/kanban/tasks/[taskId]/comments
 * Get all comments for a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task ID is required' 
      }, { status: 400 })
    }

    // Get dealer ID (handle both store owners and team members)
    const userMetadata = user.publicMetadata
    const userType = userMetadata?.userType as string
    const storeOwnerId = userMetadata?.storeOwnerId as string
    
    let dealerId: string

    if (userType === 'team_member' && storeOwnerId) {
      dealerId = storeOwnerId
    } else {
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, user.id))
        .limit(1)

      if (dealerResult.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Dealer record not found' 
        }, { status: 404 })
      }

      dealerId = dealerResult[0].id
    }

    // Verify task belongs to dealer's board
    const [task] = await db
      .select({ id: kanbanTasks.id })
      .from(kanbanTasks)
      .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
      .where(and(
        eq(kanbanTasks.id, taskId),
        eq(kanbanBoards.dealerId, dealerId)
      ))
      .limit(1)

    if (!task) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 })
    }

    // Get comments for the task
    const comments = await db
      .select()
      .from(kanbanTaskComments)
      .where(eq(kanbanTaskComments.taskId, taskId))
      .orderBy(desc(kanbanTaskComments.createdAt))

    return NextResponse.json({
      success: true,
      data: comments
    })

  } catch (error) {
    console.error('❌ Error fetching task comments:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch task comments'
    }, { status: 500 })
  }
}

/**
 * POST /api/kanban/tasks/[taskId]/comments
 * Add a comment to a task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params
    const body = await request.json()
    const { comment } = body

    if (!taskId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task ID is required' 
      }, { status: 400 })
    }

    if (!comment?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Comment is required' 
      }, { status: 400 })
    }

    // Get dealer ID (handle both store owners and team members)
    const userMetadata = user.publicMetadata
    const userType = userMetadata?.userType as string
    const storeOwnerId = userMetadata?.storeOwnerId as string
    
    let dealerId: string

    if (userType === 'team_member' && storeOwnerId) {
      dealerId = storeOwnerId
    } else {
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, user.id))
        .limit(1)

      if (dealerResult.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Dealer record not found' 
        }, { status: 404 })
      }

      dealerId = dealerResult[0].id
    }

    // Verify task belongs to dealer's board and get task info
    const [task] = await db
      .select({ 
        id: kanbanTasks.id,
        title: kanbanTasks.title,
        assignedTo: kanbanTasks.assignedTo,
        stockId: kanbanTasks.stockId
      })
      .from(kanbanTasks)
      .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
      .where(and(
        eq(kanbanTasks.id, taskId),
        eq(kanbanBoards.dealerId, dealerId)
      ))
      .limit(1)

    if (!task) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 })
    }

    // Create the comment
    const [newComment] = await db
      .insert(kanbanTaskComments)
      .values({
        taskId,
        userId: user.id,
        comment: comment.trim()
      })
      .returning()

    // Send notifications for the comment
    await KanbanNotificationService.notifyTaskComment({
      taskId,
      taskTitle: task.title,
      commentBy: user.id,
      comment: comment.trim(),
      assignedTo: task.assignedTo || undefined,
      stockId: task.stockId || undefined
    })

    return NextResponse.json({
      success: true,
      data: newComment
    })

  } catch (error) {
    console.error('❌ Error creating task comment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create task comment'
    }, { status: 500 })
  }
}
