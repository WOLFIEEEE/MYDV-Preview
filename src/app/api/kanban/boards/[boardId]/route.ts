import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { kanbanBoards, kanbanColumns, kanbanTasks, kanbanTaskComments, dealers } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

// Get a specific board with its columns and tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { boardId } = await params;

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

    // Get board details
    const [board] = await db
      .select()
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

    // Get columns for this board
    const columns = await db
      .select()
      .from(kanbanColumns)
      .where(eq(kanbanColumns.boardId, boardId))
      .orderBy(asc(kanbanColumns.position));

    // Get tasks for this board
    const tasks = await db
      .select()
      .from(kanbanTasks)
      .where(eq(kanbanTasks.boardId, boardId))
      .orderBy(asc(kanbanTasks.position));

    // Group tasks by column
    const columnsWithTasks = columns.map(column => ({
      ...column,
      tasks: tasks.filter(task => task.columnId === column.id)
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...board,
        columns: columnsWithTasks
      }
    });

  } catch (error) {
    console.error('❌ Error fetching kanban board:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch kanban board'
    }, { status: 500 });
  }
}

// Update a board
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { boardId } = await params;
    const body = await request.json();
    const { name, description, color } = body;

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

    // Update the board
    const [updatedBoard] = await db
      .update(kanbanBoards)
      .set({
        name,
        description,
        color,
        updatedAt: new Date(),
      })
      .where(and(
        eq(kanbanBoards.id, boardId),
        eq(kanbanBoards.dealerId, dealerId)
      ))
      .returning();

    if (!updatedBoard) {
      return NextResponse.json({ 
        success: false, 
        error: 'Board not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedBoard
    });

  } catch (error) {
    console.error('❌ Error updating kanban board:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update kanban board'
    }, { status: 500 });
  }
}

// Delete a board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { boardId } = await params;

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

    // Check if it's the default board
    const [board] = await db
      .select({ isDefault: kanbanBoards.isDefault })
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

    if (board.isDefault) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete the default board' 
      }, { status: 400 });
    }

    // Delete related records in the correct order to avoid foreign key constraint violations
    console.log(`🗑️ Starting deletion of board: ${boardId}`);
    
    try {
      // First, get all tasks in this board
      const tasksInBoard = await db
        .select({ id: kanbanTasks.id })
        .from(kanbanTasks)
        .where(eq(kanbanTasks.boardId, boardId));
      
      console.log(`📝 Found ${tasksInBoard.length} tasks to delete`);
      
      // Delete all task comments for tasks in this board
      if (tasksInBoard.length > 0) {
        for (const task of tasksInBoard) {
          await db
            .delete(kanbanTaskComments)
            .where(eq(kanbanTaskComments.taskId, task.id));
        }
        console.log(`💬 Deleted task comments`);
      }
      
      // Then delete all tasks in this board
      await db
        .delete(kanbanTasks)
        .where(eq(kanbanTasks.boardId, boardId));
      console.log(`📝 Deleted ${tasksInBoard.length} tasks`);
      
      // Then delete all columns in this board
      const deletedColumns = await db
        .delete(kanbanColumns)
        .where(eq(kanbanColumns.boardId, boardId))
        .returning({ id: kanbanColumns.id });
      console.log(`📋 Deleted ${deletedColumns.length} columns`);
      
      // Finally, delete the board itself
      const deletedBoard = await db
        .delete(kanbanBoards)
        .where(and(
          eq(kanbanBoards.id, boardId),
          eq(kanbanBoards.dealerId, dealerId)
        ))
        .returning({ id: kanbanBoards.id });
      
      if (deletedBoard.length === 0) {
        throw new Error('Board deletion failed - no rows affected');
      }
      
      console.log(`✅ Successfully deleted board: ${boardId}`);
    } catch (deleteError) {
      console.error(`❌ Error during board deletion:`, deleteError);
      throw new Error(`Failed to delete board: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Board deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting kanban board:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete kanban board'
    }, { status: 500 });
  }
}
