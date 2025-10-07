import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { kanbanTasks, kanbanBoards, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { KanbanNotificationService } from '@/lib/kanbanNotifications';

// Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();
    const { title, description, priority, assignedTo, dueDate, estimatedHours, stockId } = body;

    if (!taskId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task ID is required' 
      }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task title is required' 
      }, { status: 400 });
    }

    // Get dealer ID (handle both store owners and team members)
    const userMetadata = user.publicMetadata;
    const userType = userMetadata?.userType as string;
    const storeOwnerId = userMetadata?.storeOwnerId as string;
    
    let dealerId: string;

    if (userType === 'team_member' && storeOwnerId) {
      dealerId = storeOwnerId;
    } else {
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, user.id))
        .limit(1);

      if (dealerResult.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Dealer record not found' 
        }, { status: 404 });
      }

      dealerId = dealerResult[0].id;
    }

    // Verify task exists and belongs to dealer's board, get current values for comparison
    const [task] = await db
      .select({ 
        id: kanbanTasks.id,
        boardId: kanbanTasks.boardId,
        title: kanbanTasks.title,
        description: kanbanTasks.description,
        priority: kanbanTasks.priority,
        assignedTo: kanbanTasks.assignedTo,
        dueDate: kanbanTasks.dueDate,
        estimatedHours: kanbanTasks.estimatedHours,
        stockId: kanbanTasks.stockId
      })
      .from(kanbanTasks)
      .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
      .where(and(
        eq(kanbanTasks.id, taskId),
        eq(kanbanBoards.dealerId, dealerId)
      ))
      .limit(1);

    if (!task) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 });
    }

    // Update the task
    const [updatedTask] = await db
      .update(kanbanTasks)
      .set({
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'medium',
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours || null,
        stockId: stockId || null,
        updatedAt: new Date(),
      })
      .where(eq(kanbanTasks.id, taskId))
      .returning();

    // Send notifications for task updates
    const changes: string[] = [];
    if (task.title !== title.trim()) changes.push('title');
    if (task.description !== (description?.trim() || null)) changes.push('description');
    if (task.priority !== (priority || 'medium')) changes.push('priority');
    if (task.assignedTo !== (assignedTo || null)) changes.push('assignee');
    if (task.dueDate?.getTime() !== (dueDate ? new Date(dueDate).getTime() : null)) changes.push('due date');
    if (task.estimatedHours !== (estimatedHours || null)) changes.push('estimated hours');
    if (task.stockId !== (stockId || null)) changes.push('vehicle link');

    if (changes.length > 0) {
      await KanbanNotificationService.notifyTaskUpdated({
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        updatedBy: user.id,
        changes,
        assignedTo: updatedTask.assignedTo || undefined,
        previousAssignee: task.assignedTo || undefined,
        priority: updatedTask.priority,
        stockId: updatedTask.stockId || undefined
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedTask
    });

  } catch (error) {
    console.error('❌ Error updating kanban task:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update kanban task'
    }, { status: 500 });
  }
}

// Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task ID is required' 
      }, { status: 400 });
    }

    // Get dealer ID (handle both store owners and team members)
    const userMetadata = user.publicMetadata;
    const userType = userMetadata?.userType as string;
    const storeOwnerId = userMetadata?.storeOwnerId as string;
    
    let dealerId: string;

    if (userType === 'team_member' && storeOwnerId) {
      dealerId = storeOwnerId;
    } else {
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, user.id))
        .limit(1);

      if (dealerResult.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Dealer record not found' 
        }, { status: 404 });
      }

      dealerId = dealerResult[0].id;
    }

    // Verify task exists and belongs to dealer's board, get info for notifications
    const [task] = await db
      .select({ 
        id: kanbanTasks.id,
        boardId: kanbanTasks.boardId,
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
      .limit(1);

    if (!task) {
      return NextResponse.json({ 
        success: false, 
        error: 'Task not found' 
      }, { status: 404 });
    }

    // Get board name for notifications
    const [board] = await db
      .select({ name: kanbanBoards.name })
      .from(kanbanBoards)
      .where(eq(kanbanBoards.id, task.boardId))
      .limit(1);

    // Delete the task
    await db
      .delete(kanbanTasks)
      .where(eq(kanbanTasks.id, taskId));

    // Send notifications for task deletion
    if (board) {
      await KanbanNotificationService.notifyTaskDeleted({
        taskId: task.id,
        taskTitle: task.title,
        deletedBy: user.id,
        assignedTo: task.assignedTo || undefined,
        boardName: board.name,
        dealerId,
        stockId: task.stockId || undefined
      });
    }

    return NextResponse.json({
      success: true,
      message: `Task "${task.title}" has been deleted`
    });

  } catch (error) {
    console.error('❌ Error deleting kanban task:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete kanban task'
    }, { status: 500 });
  }
}
