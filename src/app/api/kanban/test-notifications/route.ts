import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { kanbanTasks, kanbanBoards, dealers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { KanbanNotificationService } from '@/lib/kanbanNotifications'

/**
 * POST /api/kanban/test-notifications
 * Create test notifications for kanban functionality
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID
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

    // Get a sample task and board for testing
    const [sampleTask] = await db
      .select({
        taskId: kanbanTasks.id,
        taskTitle: kanbanTasks.title,
        boardId: kanbanTasks.boardId,
        boardName: kanbanBoards.name,
        assignedTo: kanbanTasks.assignedTo,
        stockId: kanbanTasks.stockId
      })
      .from(kanbanTasks)
      .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
      .where(eq(kanbanBoards.dealerId, dealerId))
      .orderBy(desc(kanbanTasks.createdAt))
      .limit(1)

    const body = await request.json()
    const { type = 'task_created' } = body

    const notifications = []

    switch (type) {
      case 'task_created':
        await KanbanNotificationService.notifyTaskCreated({
          taskId: sampleTask?.taskId || 'test-task-id',
          boardId: sampleTask?.boardId || 'test-board-id',
          taskTitle: 'Test Task: ' + new Date().toLocaleTimeString(),
          createdBy: user.id,
          assignedTo: sampleTask?.assignedTo || undefined,
          priority: 'high',
          stockId: sampleTask?.stockId || undefined
        })
        notifications.push('Task created notification sent')
        break

      case 'task_updated':
        await KanbanNotificationService.notifyTaskUpdated({
          taskId: sampleTask?.taskId || 'test-task-id',
          taskTitle: sampleTask?.taskTitle || 'Test Task',
          updatedBy: user.id,
          changes: ['priority', 'due date'],
          assignedTo: sampleTask?.assignedTo || undefined,
          priority: 'urgent',
          stockId: sampleTask?.stockId || undefined
        })
        notifications.push('Task updated notification sent')
        break

      case 'task_moved':
        await KanbanNotificationService.notifyTaskMoved({
          taskId: sampleTask?.taskId || 'test-task-id',
          taskTitle: sampleTask?.taskTitle || 'Test Task',
          movedBy: user.id,
          fromColumnId: 'test-from-column',
          toColumnId: 'test-to-column',
          assignedTo: sampleTask?.assignedTo || undefined,
          stockId: sampleTask?.stockId || undefined
        })
        notifications.push('Task moved notification sent')
        break

      case 'task_due_soon':
        const dueSoonDate = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
        await KanbanNotificationService.notifyTaskDueSoon({
          taskId: sampleTask?.taskId || 'test-task-id',
          taskTitle: sampleTask?.taskTitle || 'Test Task',
          dueDate: dueSoonDate,
          assignedTo: sampleTask?.assignedTo || user.id,
          hoursUntilDue: 2,
          stockId: sampleTask?.stockId || undefined
        })
        notifications.push('Task due soon notification sent')
        break

      case 'task_overdue':
        const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        await KanbanNotificationService.notifyTaskOverdue({
          taskId: sampleTask?.taskId || 'test-task-id',
          taskTitle: sampleTask?.taskTitle || 'Test Task',
          dueDate: overdueDate,
          assignedTo: sampleTask?.assignedTo || user.id,
          hoursOverdue: 24,
          stockId: sampleTask?.stockId || undefined
        })
        notifications.push('Task overdue notification sent')
        break

      case 'task_comment':
        await KanbanNotificationService.notifyTaskComment({
          taskId: sampleTask?.taskId || 'test-task-id',
          taskTitle: sampleTask?.taskTitle || 'Test Task',
          commentBy: user.id,
          comment: 'This is a test comment for notification testing',
          assignedTo: sampleTask?.assignedTo || undefined,
          stockId: sampleTask?.stockId || undefined
        })
        notifications.push('Task comment notification sent')
        break

      case 'board_created':
        await KanbanNotificationService.notifyBoardCreated({
          boardId: sampleTask?.boardId || 'test-board-id',
          boardName: 'Test Board: ' + new Date().toLocaleTimeString(),
          createdBy: user.id,
          dealerId
        })
        notifications.push('Board created notification sent')
        break

      case 'all':
        // Send all types of notifications for comprehensive testing
        const testTaskId = 'test-task-' + Date.now()
        const testBoardId = 'test-board-' + Date.now()
        
        await KanbanNotificationService.notifyTaskCreated({
          taskId: testTaskId,
          boardId: testBoardId,
          taskTitle: 'Comprehensive Test Task',
          createdBy: user.id,
          assignedTo: user.id,
          priority: 'high'
        })
        
        await KanbanNotificationService.notifyTaskUpdated({
          taskId: testTaskId,
          taskTitle: 'Comprehensive Test Task',
          updatedBy: user.id,
          changes: ['priority', 'assignee'],
          assignedTo: user.id,
          priority: 'urgent'
        })
        
        await KanbanNotificationService.notifyBoardCreated({
          boardId: testBoardId,
          boardName: 'Comprehensive Test Board',
          createdBy: user.id,
          dealerId
        })
        
        notifications.push('All notification types sent')
        break

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid notification type' 
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test notifications sent successfully',
      data: {
        type,
        notifications,
        sampleTask: sampleTask ? {
          id: sampleTask.taskId,
          title: sampleTask.taskTitle,
          board: sampleTask.boardName
        } : null
      }
    })

  } catch (error) {
    console.error('❌ Error sending test notifications:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send test notifications'
    }, { status: 500 })
  }
}

/**
 * GET /api/kanban/test-notifications
 * Get available notification types for testing
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    availableTypes: [
      'task_created',
      'task_updated', 
      'task_moved',
      'task_due_soon',
      'task_overdue',
      'task_comment',
      'board_created',
      'all'
    ],
    usage: 'POST with { "type": "notification_type" } to test specific notifications'
  })
}
