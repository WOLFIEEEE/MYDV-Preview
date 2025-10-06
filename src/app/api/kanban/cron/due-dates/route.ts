import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { kanbanTasks, kanbanBoards } from '@/db/schema'
import { and, eq, isNotNull, lte, gte } from 'drizzle-orm'
import { KanbanNotificationService } from '@/lib/kanbanNotifications'

/**
 * POST /api/kanban/cron/due-dates
 * Check for tasks that are due soon or overdue and send notifications
 * This should be called by a cron job (e.g., every hour)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    // Find tasks that are due soon (within 24 hours) or overdue
    const dueTasks = await db
      .select({
        id: kanbanTasks.id,
        title: kanbanTasks.title,
        dueDate: kanbanTasks.dueDate,
        assignedTo: kanbanTasks.assignedTo,
        stockId: kanbanTasks.stockId,
        boardId: kanbanTasks.boardId,
        boardName: kanbanBoards.name
      })
      .from(kanbanTasks)
      .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
      .where(and(
        isNotNull(kanbanTasks.dueDate),
        lte(kanbanTasks.dueDate, in24Hours),
        // Only notify for tasks that haven't been completed (not in "done" columns)
        // This is a simple check - you might want to make this more sophisticated
      ))

    let notificationsSent = 0

    for (const task of dueTasks) {
      if (!task.dueDate) continue

      const hoursUntilDue = (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (hoursUntilDue < 0) {
        // Task is overdue
        const hoursOverdue = Math.abs(hoursUntilDue)
        
        await KanbanNotificationService.notifyTaskOverdue({
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.dueDate,
          assignedTo: task.assignedTo || undefined,
          hoursOverdue,
          stockId: task.stockId || undefined
        })
        
        notificationsSent++
      } else if (hoursUntilDue <= 24) {
        // Task is due soon
        await KanbanNotificationService.notifyTaskDueSoon({
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.dueDate,
          assignedTo: task.assignedTo || undefined,
          hoursUntilDue,
          stockId: task.stockId || undefined
        })
        
        notificationsSent++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${dueTasks.length} due tasks, sent ${notificationsSent} notifications`,
      data: {
        tasksProcessed: dueTasks.length,
        notificationsSent
      }
    })

  } catch (error) {
    console.error('❌ Error processing due date notifications:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process due date notifications'
    }, { status: 500 })
  }
}

/**
 * GET /api/kanban/cron/due-dates
 * Test endpoint to check what tasks would be processed
 */
export async function GET() {
  try {
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const dueTasks = await db
      .select({
        id: kanbanTasks.id,
        title: kanbanTasks.title,
        dueDate: kanbanTasks.dueDate,
        assignedTo: kanbanTasks.assignedTo,
        boardName: kanbanBoards.name
      })
      .from(kanbanTasks)
      .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
      .where(and(
        isNotNull(kanbanTasks.dueDate),
        lte(kanbanTasks.dueDate, in24Hours)
      ))

    const processedTasks = dueTasks.map(task => {
      if (!task.dueDate) return null
      
      const hoursUntilDue = (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      return {
        ...task,
        hoursUntilDue: Math.round(hoursUntilDue * 100) / 100,
        status: hoursUntilDue < 0 ? 'overdue' : 'due_soon'
      }
    }).filter(Boolean)

    return NextResponse.json({
      success: true,
      data: processedTasks,
      count: processedTasks.length
    })

  } catch (error) {
    console.error('❌ Error checking due tasks:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check due tasks'
    }, { status: 500 })
  }
}
