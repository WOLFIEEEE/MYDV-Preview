import { NotificationService } from './notificationService'
import { db } from './db'
import { dealers, kanbanTasks, kanbanBoards, kanbanColumns } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export interface KanbanNotificationContext {
  taskId?: string
  boardId?: string
  columnId?: string
  taskTitle?: string
  boardName?: string
  columnName?: string
  assignedTo?: string
  assignedBy?: string
  dueDate?: Date
  priority?: string
  previousColumn?: string
  newColumn?: string
  stockId?: string
}

export class KanbanNotificationService {
  /**
   * Notify when a new task is created
   */
  static async notifyTaskCreated(context: KanbanNotificationContext & {
    taskId: string
    boardId: string
    taskTitle: string
    createdBy: string
    assignedTo?: string
  }) {
    try {
      // Get board and dealer info
      const [boardInfo] = await db
        .select({
          boardName: kanbanBoards.name,
          dealerId: kanbanBoards.dealerId
        })
        .from(kanbanBoards)
        .where(eq(kanbanBoards.id, context.boardId))
        .limit(1)

      if (!boardInfo) return

      // Notify the assignee (including self-assignments)
      if (context.assignedTo) {
        const isSelfAssignment = context.assignedTo === context.createdBy
        
        await NotificationService.createNotification({
          recipientId: context.assignedTo,
          type: 'task_assigned',
          title: isSelfAssignment ? '📋 Task Created & Self-Assigned' : '📋 New Task Assigned',
          message: isSelfAssignment 
            ? `You created and assigned yourself a new task: "${context.taskTitle}" in board "${boardInfo.boardName}"`
            : `You've been assigned a new task: "${context.taskTitle}" in board "${boardInfo.boardName}"`,
          priority: context.priority === 'urgent' ? 'high' : 'medium',
          senderId: context.createdBy,
          entityType: 'kanban_task',
          entityId: context.taskId,
          actionUrl: `/kanban?task=${context.taskId}`,
          actionLabel: 'View Task',
          channels: isSelfAssignment ? ['in_app'] : ['in_app', 'email'], // Only in-app for self-assignments
          metadata: {
            taskId: context.taskId,
            boardId: context.boardId,
            boardName: boardInfo.boardName,
            taskTitle: context.taskTitle,
            assignedBy: context.createdBy,
            isSelfAssignment,
            stockId: context.stockId
          }
        })
      }

    } catch (error) {
      console.error('Error sending task created notifications:', error)
    }
  }

  /**
   * Notify when a task is updated
   */
  static async notifyTaskUpdated(context: KanbanNotificationContext & {
    taskId: string
    taskTitle: string
    updatedBy: string
    changes: string[]
    assignedTo?: string
    previousAssignee?: string
  }) {
    try {
      // Get task and board info
      const [taskInfo] = await db
        .select({
          boardId: kanbanTasks.boardId,
          boardName: kanbanBoards.name,
          dealerId: kanbanBoards.dealerId
        })
        .from(kanbanTasks)
        .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
        .where(eq(kanbanTasks.id, context.taskId))
        .limit(1)

      if (!taskInfo) return

      const changesList = context.changes.join(', ')

      // Notify current assignee (including self-updates for assignment changes)
      if (context.assignedTo) {
        const isSelfUpdate = context.assignedTo === context.updatedBy
        const isAssignmentChange = context.changes.includes('assignee')
        
        // For self-updates, only notify if it's an assignment change (assigning to yourself)
        // For other updates, notify regardless of who made the change
        if (!isSelfUpdate || isAssignmentChange) {
          await NotificationService.createNotification({
            recipientId: context.assignedTo,
            type: 'task_assigned', // Using existing type
            title: isSelfUpdate && isAssignmentChange ? '📝 Task Self-Assigned' : '📝 Task Updated',
            message: isSelfUpdate && isAssignmentChange
              ? `You assigned yourself to task "${context.taskTitle}". Changes: ${changesList}`
              : `Your task "${context.taskTitle}" was updated. Changes: ${changesList}`,
            priority: 'medium',
            senderId: context.updatedBy,
            entityType: 'kanban_task',
            entityId: context.taskId,
            actionUrl: `/kanban?task=${context.taskId}`,
            actionLabel: 'View Task',
            channels: isSelfUpdate ? ['in_app'] : ['in_app', 'email'], // Only in-app for self-updates
            metadata: {
              taskId: context.taskId,
              boardId: taskInfo.boardId,
              boardName: taskInfo.boardName,
              taskTitle: context.taskTitle,
              updatedBy: context.updatedBy,
              changes: context.changes,
              isSelfUpdate,
              isAssignmentChange,
              stockId: context.stockId
            }
          })
        }
      }

    } catch (error) {
      console.error('Error sending task updated notifications:', error)
    }
  }

  /**
   * Notify when a task is moved between columns
   */
  static async notifyTaskMoved(context: KanbanNotificationContext & {
    taskId: string
    taskTitle: string
    movedBy: string
    fromColumnId: string
    toColumnId: string
    assignedTo?: string
  }) {
    try {
      // Get column names and board info
      const [fromColumn] = await db
        .select({ name: kanbanColumns.name })
        .from(kanbanColumns)
        .where(eq(kanbanColumns.id, context.fromColumnId))
        .limit(1)

      const [toColumn] = await db
        .select({ name: kanbanColumns.name })
        .from(kanbanColumns)
        .where(eq(kanbanColumns.id, context.toColumnId))
        .limit(1)

      const [taskInfo] = await db
        .select({
          boardId: kanbanTasks.boardId,
          boardName: kanbanBoards.name,
          dealerId: kanbanBoards.dealerId
        })
        .from(kanbanTasks)
        .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
        .where(eq(kanbanTasks.id, context.taskId))
        .limit(1)

      if (!fromColumn || !toColumn || !taskInfo) return

      // Notify assignee if they exist and didn't move the task
      if (context.assignedTo && context.assignedTo !== context.movedBy) {
        await NotificationService.createNotification({
          recipientId: context.assignedTo,
          type: 'task_assigned', // Using existing type
          title: '🔄 Task Moved',
          message: `Your task "${context.taskTitle}" was moved from "${fromColumn.name}" to "${toColumn.name}"`,
          priority: 'medium',
          senderId: context.movedBy,
          entityType: 'kanban_task',
          entityId: context.taskId,
          metadata: {
            taskId: context.taskId,
            boardId: taskInfo.boardId,
            boardName: taskInfo.boardName,
            taskTitle: context.taskTitle,
            movedBy: context.movedBy,
            fromColumn: fromColumn.name,
            toColumn: toColumn.name,
            stockId: context.stockId
          }
        })
      }

      // Special notifications for important column moves
      const completedColumns = ['done', 'completed', 'finished', 'closed']
      
      if (completedColumns.some(col => toColumn.name.toLowerCase().includes(col))) {
        // Task completed - notify assignee
        if (context.assignedTo && context.assignedTo !== context.movedBy) {
          await NotificationService.createNotification({
            recipientId: context.assignedTo,
            type: 'task_completed',
            title: '✅ Task Completed',
            message: `Task "${context.taskTitle}" has been completed!`,
            priority: 'medium',
            senderId: context.movedBy,
            entityType: 'kanban_task',
            entityId: context.taskId,
            metadata: {
              taskId: context.taskId,
              boardId: taskInfo.boardId,
              boardName: taskInfo.boardName,
              taskTitle: context.taskTitle,
              completedBy: context.movedBy,
              stockId: context.stockId
            }
          })
        }
      }

    } catch (error) {
      console.error('Error sending task moved notifications:', error)
    }
  }

  /**
   * Notify when a task is due soon
   */
  static async notifyTaskDueSoon(context: KanbanNotificationContext & {
    taskId: string
    taskTitle: string
    dueDate: Date
    assignedTo?: string
    hoursUntilDue: number
  }) {
    try {
      if (!context.assignedTo) return

      const [taskInfo] = await db
        .select({
          boardId: kanbanTasks.boardId,
          boardName: kanbanBoards.name,
          dealerId: kanbanBoards.dealerId
        })
        .from(kanbanTasks)
        .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
        .where(eq(kanbanTasks.id, context.taskId))
        .limit(1)

      if (!taskInfo) return

      const urgency = context.hoursUntilDue <= 2 ? 'urgent' : 
                     context.hoursUntilDue <= 24 ? 'high' : 'medium'

      const timeText = context.hoursUntilDue <= 1 ? 'within an hour' :
                      context.hoursUntilDue <= 24 ? `in ${Math.round(context.hoursUntilDue)} hours` :
                      `in ${Math.round(context.hoursUntilDue / 24)} days`

      // Notify assignee
      await NotificationService.createNotification({
        recipientId: context.assignedTo,
        type: 'task_overdue', // Using existing type
        title: '⏰ Task Due Soon',
        message: `Your task "${context.taskTitle}" is due ${timeText}`,
        priority: urgency,
        entityType: 'kanban_task',
        entityId: context.taskId,
        metadata: {
          taskId: context.taskId,
          boardId: taskInfo.boardId,
          boardName: taskInfo.boardName,
          taskTitle: context.taskTitle,
          dueDate: context.dueDate.toISOString(),
          hoursUntilDue: context.hoursUntilDue,
          stockId: context.stockId
        }
      })

    } catch (error) {
      console.error('Error sending task due soon notifications:', error)
    }
  }

  /**
   * Notify when a task is overdue
   */
  static async notifyTaskOverdue(context: KanbanNotificationContext & {
    taskId: string
    taskTitle: string
    dueDate: Date
    assignedTo?: string
    hoursOverdue: number
  }) {
    try {
      if (!context.assignedTo) return

      const [taskInfo] = await db
        .select({
          boardId: kanbanTasks.boardId,
          boardName: kanbanBoards.name,
          dealerId: kanbanBoards.dealerId
        })
        .from(kanbanTasks)
        .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
        .where(eq(kanbanTasks.id, context.taskId))
        .limit(1)

      if (!taskInfo) return

      const timeText = context.hoursOverdue <= 24 ? `${Math.round(context.hoursOverdue)} hours` :
                      `${Math.round(context.hoursOverdue / 24)} days`

      // Notify assignee
      await NotificationService.createNotification({
        recipientId: context.assignedTo,
        type: 'task_overdue',
        title: '🚨 Task Overdue',
        message: `Your task "${context.taskTitle}" is overdue by ${timeText}`,
        priority: 'urgent',
        entityType: 'kanban_task',
        entityId: context.taskId,
        metadata: {
          taskId: context.taskId,
          boardId: taskInfo.boardId,
          boardName: taskInfo.boardName,
          taskTitle: context.taskTitle,
          dueDate: context.dueDate.toISOString(),
          hoursOverdue: context.hoursOverdue,
          stockId: context.stockId
        }
      })

    } catch (error) {
      console.error('Error sending task overdue notifications:', error)
    }
  }

  /**
   * Notify when a task is deleted
   */
  static async notifyTaskDeleted(context: KanbanNotificationContext & {
    taskId: string
    taskTitle: string
    deletedBy: string
    assignedTo?: string
    boardName: string
    dealerId: string
  }) {
    try {
      // Notify assignee if they exist and didn't delete the task
      if (context.assignedTo && context.assignedTo !== context.deletedBy) {
        await NotificationService.createNotification({
          recipientId: context.assignedTo,
          type: 'task_assigned', // Using existing type
          title: '🗑️ Task Deleted',
          message: `Your assigned task "${context.taskTitle}" was deleted from "${context.boardName}"`,
          priority: 'medium',
          senderId: context.deletedBy,
          metadata: {
            taskTitle: context.taskTitle,
            boardName: context.boardName,
            deletedBy: context.deletedBy,
            stockId: context.stockId
          }
        })
      }

    } catch (error) {
      console.error('Error sending task deleted notifications:', error)
    }
  }

  /**
   * Notify when a comment is added to a task
   */
  static async notifyTaskComment(context: {
    taskId: string
    taskTitle: string
    commentBy: string
    comment: string
    assignedTo?: string
    stockId?: string
  }) {
    try {
      const [taskInfo] = await db
        .select({
          boardId: kanbanTasks.boardId,
          boardName: kanbanBoards.name,
          dealerId: kanbanBoards.dealerId,
          createdBy: kanbanTasks.createdBy
        })
        .from(kanbanTasks)
        .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
        .where(eq(kanbanTasks.id, context.taskId))
        .limit(1)

      if (!taskInfo) return

      const recipients = [taskInfo.createdBy, context.assignedTo]
        .filter(Boolean)
        .filter(id => id !== context.commentBy) // Don't notify the commenter

      for (const recipientId of recipients) {
        if (recipientId) {
          await NotificationService.createNotification({
            recipientId,
            type: 'task_commented',
            title: '💬 New Task Comment',
            message: `New comment on task "${context.taskTitle}": ${context.comment.substring(0, 100)}${context.comment.length > 100 ? '...' : ''}`,
            priority: 'low',
            senderId: context.commentBy,
            entityType: 'kanban_task',
            entityId: context.taskId,
            metadata: {
              taskId: context.taskId,
              boardId: taskInfo.boardId,
              boardName: taskInfo.boardName,
              taskTitle: context.taskTitle,
              commentBy: context.commentBy,
              comment: context.comment,
              stockId: context.stockId
            }
          })
        }
      }

    } catch (error) {
      console.error('Error sending task comment notifications:', error)
    }
  }

  /**
   * Notify when a board is created
   */
  static async notifyBoardCreated(context: {
    boardId: string
    boardName: string
    createdBy: string
    dealerId: string
  }) {
    try {
      // For now, we'll skip team notifications as it requires getting all team members
      // This would need additional logic to fetch all team members for the dealer
      console.log(`Board "${context.boardName}" created by ${context.createdBy}`)

    } catch (error) {
      console.error('Error sending board created notifications:', error)
    }
  }

  /**
   * Notify when a vehicle job card is created
   */
  static async notifyVehicleJobCardCreated(context: {
    taskId: string
    taskTitle: string
    createdBy: string
    assignedTo?: string
    priority?: string
    stockId?: string
  }) {
    try {
      // Notify the assignee (including self-assignments)
      if (context.assignedTo) {
        const isSelfAssignment = context.assignedTo === context.createdBy
        
        await NotificationService.createNotification({
          recipientId: context.assignedTo,
          type: 'task_assigned',
          title: isSelfAssignment ? '🚗 Vehicle Job Created & Self-Assigned' : '🚗 New Vehicle Job Assigned',
          message: isSelfAssignment 
            ? `You created and assigned yourself a new vehicle job: "${context.taskTitle}"`
            : `You've been assigned a new vehicle job: "${context.taskTitle}"`,
          priority: context.priority === 'urgent' ? 'high' : 'medium',
          senderId: context.createdBy,
          entityType: 'vehicle_job_card',
          entityId: context.taskId,
          actionUrl: `/kanban`,
          actionLabel: 'View Job Card',
          channels: isSelfAssignment ? ['in_app'] : ['in_app', 'email'], // Only in-app for self-assignments
          metadata: {
            taskId: context.taskId,
            taskTitle: context.taskTitle,
            assignedBy: context.createdBy,
            isSelfAssignment,
            stockId: context.stockId,
            jobType: 'vehicle_job_card'
          }
        })
      }

    } catch (error) {
      console.error('Error sending vehicle job card created notifications:', error)
    }
  }

  /**
   * Notify when a vehicle job card is updated
   */
  static async notifyVehicleJobCardUpdated(context: {
    taskId: string
    taskTitle: string
    updatedBy: string
    changes: string[]
    assignedTo?: string
    previousAssignee?: string
    stockId?: string
  }) {
    try {
      const changesList = context.changes.join(', ')

      // Notify current assignee (including self-updates for assignment changes)
      if (context.assignedTo) {
        const isSelfUpdate = context.assignedTo === context.updatedBy
        const isAssignmentChange = context.changes.includes('assignee')
        
        // For self-updates, only notify if it's an assignment change (assigning to yourself)
        // For other updates, notify regardless of who made the change
        if (!isSelfUpdate || isAssignmentChange) {
          await NotificationService.createNotification({
            recipientId: context.assignedTo,
            type: 'task_assigned', // Using existing type
            title: isSelfUpdate && isAssignmentChange ? '🚗 Vehicle Job Self-Assigned' : '🚗 Vehicle Job Updated',
            message: isSelfUpdate && isAssignmentChange
              ? `You assigned yourself to vehicle job "${context.taskTitle}". Changes: ${changesList}`
              : `Your vehicle job "${context.taskTitle}" was updated. Changes: ${changesList}`,
            priority: 'medium',
            senderId: context.updatedBy,
            entityType: 'vehicle_job_card',
            entityId: context.taskId,
            actionUrl: `/kanban`,
            actionLabel: 'View Job Card',
            channels: isSelfUpdate ? ['in_app'] : ['in_app', 'email'], // Only in-app for self-updates
            metadata: {
              taskId: context.taskId,
              taskTitle: context.taskTitle,
              updatedBy: context.updatedBy,
              changes: context.changes,
              isSelfUpdate,
              isAssignmentChange,
              stockId: context.stockId,
              jobType: 'vehicle_job_card'
            }
          })
        }
      }

    } catch (error) {
      console.error('Error sending vehicle job card updated notifications:', error)
    }
  }

  /**
   * Notify when a vehicle job card is due (reminder notification)
   */
  static async notifyVehicleJobCardDue(context: {
    taskId: string
    taskTitle: string
    assignedTo: string
    dueDate: Date
    stockId?: string
  }) {
    try {
      await NotificationService.createNotification({
        recipientId: context.assignedTo,
        type: 'task_assigned', // Using existing type
        title: '⏰ Vehicle Job Due Reminder',
        message: `Your vehicle job "${context.taskTitle}" is due today. Please complete it as soon as possible.`,
        priority: 'high',
        senderId: 'system', // System-generated notification
        entityType: 'vehicle_job_card',
        entityId: context.taskId,
        actionUrl: `/kanban`,
        actionLabel: 'View Job Card',
        channels: ['in_app', 'email'], // Both channels for due reminders
        metadata: {
          taskId: context.taskId,
          taskTitle: context.taskTitle,
          dueDate: context.dueDate.toISOString(),
          stockId: context.stockId,
          jobType: 'vehicle_job_card',
          reminderType: 'due_today'
        }
      })

    } catch (error) {
      console.error('Error sending vehicle job card due reminder notifications:', error)
    }
  }
}