import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { kanbanTasks, kanbanBoards, dealers, teamMembers } from '@/db/schema';
import { eq, and, max, gt, gte, lt, lte, ne, sql } from 'drizzle-orm';
import { KanbanNotificationService } from '@/lib/kanbanNotifications';
import { getDealerIdForUser } from '@/lib/dealerHelper';

// Create a new task
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      boardId, 
      columnId, 
      title, 
      description, 
      priority, 
      assignedTo, 
      dueDate,
      tags,
      stockId,
      estimatedHours
    } = body;

    if (!boardId || !columnId || !title) {
      return NextResponse.json({ 
        success: false, 
        error: 'Board ID, column ID, and title are required' 
      }, { status: 400 });
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

    // Verify board belongs to dealer
    const [board] = await db
      .select({ id: kanbanBoards.id })
      .from(kanbanBoards)
      .where(and(
        eq(kanbanBoards.id, boardId),
        eq(kanbanBoards.dealerId, dealerId)
      ))
      .limit(1);

    if (!board) {
      return NextResponse.json({ 
        success: false, 
        error: 'Board not found' 
      }, { status: 404 });
    }

    // Get the next position for this column
    const [maxPosition] = await db
      .select({ maxPos: max(kanbanTasks.position) })
      .from(kanbanTasks)
      .where(eq(kanbanTasks.columnId, columnId));

    const nextPosition = (maxPosition?.maxPos || 0) + 1;

    // Create the task
    const [newTask] = await db
      .insert(kanbanTasks)
      .values({
        boardId,
        columnId,
        title,
        description,
        priority: priority || 'medium',
        assignedTo,
        createdBy: user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        position: nextPosition,
        tags: tags || [],
        stockId,
        estimatedHours,
      })
      .returning();

    // Send notifications for task creation
    await KanbanNotificationService.notifyTaskCreated({
      taskId: newTask.id,
      boardId: newTask.boardId,
      taskTitle: newTask.title,
      createdBy: user.id,
      assignedTo: newTask.assignedTo || undefined,
      priority: newTask.priority,
      stockId: newTask.stockId || undefined
    });

    return NextResponse.json({
      success: true,
      data: newTask
    });

  } catch (error) {
    console.error('❌ Error creating kanban task:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create kanban task'
    }, { status: 500 });
  }
}

// Move task to different column/position
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, columnId, position, boardId } = body;

    if (!taskId || !columnId || position === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task ID, column ID, and position are required' 
      }, { status: 400 });
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

    // Verify board belongs to dealer
    if (boardId) {
      const [board] = await db
        .select({ id: kanbanBoards.id })
        .from(kanbanBoards)
        .where(and(
          eq(kanbanBoards.id, boardId),
          eq(kanbanBoards.dealerId, dealerId)
        ))
        .limit(1);

      if (!board) {
        return NextResponse.json({ 
          success: false, 
          error: 'Board not found' 
        }, { status: 404 });
      }
    }

    // Get current task info before update for notifications
    const [currentTask] = await db
      .select({
        id: kanbanTasks.id,
        title: kanbanTasks.title,
        columnId: kanbanTasks.columnId,
        position: kanbanTasks.position,
        assignedTo: kanbanTasks.assignedTo,
        stockId: kanbanTasks.stockId
      })
      .from(kanbanTasks)
      .where(eq(kanbanTasks.id, taskId))
      .limit(1);

    if (!currentTask) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 });
    }

    // Handle position updates properly
    const isMovingToSameColumn = currentTask.columnId === columnId;
    const currentPosition = currentTask.position;

    // Update positions of other tasks first
    if (isMovingToSameColumn) {
      // Moving within the same column
      if (position > currentPosition) {
        // Moving down: decrease position of tasks between current and new position
        await db
          .update(kanbanTasks)
          .set({ 
            position: sql`${kanbanTasks.position} - 1`,
            updatedAt: new Date()
          })
          .where(and(
            eq(kanbanTasks.columnId, columnId),
            gt(kanbanTasks.position, currentPosition),
            lte(kanbanTasks.position, position),
            ne(kanbanTasks.id, taskId)
          ));
      } else if (position < currentPosition) {
        // Moving up: increase position of tasks between new and current position
        await db
          .update(kanbanTasks)
          .set({ 
            position: sql`${kanbanTasks.position} + 1`,
            updatedAt: new Date()
          })
          .where(and(
            eq(kanbanTasks.columnId, columnId),
            gte(kanbanTasks.position, position),
            lt(kanbanTasks.position, currentPosition),
            ne(kanbanTasks.id, taskId)
          ));
      }
    } else {
      // Moving to a different column
      // Decrease position of all tasks after current position in source column
      await db
        .update(kanbanTasks)
        .set({ 
          position: sql`${kanbanTasks.position} - 1`,
          updatedAt: new Date()
        })
        .where(and(
          eq(kanbanTasks.columnId, currentTask.columnId),
          gt(kanbanTasks.position, currentPosition)
        ));

      // Increase position of all tasks at or after new position in destination column
      await db
        .update(kanbanTasks)
        .set({ 
          position: sql`${kanbanTasks.position} + 1`,
          updatedAt: new Date()
        })
        .where(and(
          eq(kanbanTasks.columnId, columnId),
          gte(kanbanTasks.position, position)
        ));
    }

    // Update the moved task's position and column
    const [updatedTask] = await db
      .update(kanbanTasks)
      .set({
        columnId,
        position,
        updatedAt: new Date(),
      })
      .where(eq(kanbanTasks.id, taskId))
      .returning();

    if (!updatedTask) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 });
    }

    // Send notifications if task moved between columns
    if (currentTask && currentTask.columnId !== columnId) {
      await KanbanNotificationService.notifyTaskMoved({
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        movedBy: user.id,
        fromColumnId: currentTask.columnId,
        toColumnId: columnId,
        assignedTo: updatedTask.assignedTo || undefined,
        stockId: updatedTask.stockId || undefined
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedTask
    });

  } catch (error) {
    console.error('❌ Error moving kanban task:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to move kanban task'
    }, { status: 500 });
  }
}
