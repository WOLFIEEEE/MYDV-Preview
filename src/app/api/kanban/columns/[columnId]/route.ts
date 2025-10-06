import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { kanbanColumns, kanbanBoards, kanbanTasks, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Delete a column
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { columnId } = await params;

    if (!columnId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Column ID is required' 
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

    // Verify column exists and belongs to dealer's board
    const [column] = await db
      .select({ 
        id: kanbanColumns.id,
        boardId: kanbanColumns.boardId,
        name: kanbanColumns.name
      })
      .from(kanbanColumns)
      .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
      .where(and(
        eq(kanbanColumns.id, columnId),
        eq(kanbanBoards.dealerId, dealerId)
      ))
      .limit(1);

    if (!column) {
      return NextResponse.json({ 
        success: false, 
        error: 'Column not found' 
      }, { status: 404 });
    }

    // Delete all tasks in the column first
    await db
      .delete(kanbanTasks)
      .where(eq(kanbanTasks.columnId, columnId));

    // Delete the column
    await db
      .delete(kanbanColumns)
      .where(eq(kanbanColumns.id, columnId));

    return NextResponse.json({
      success: true,
      message: `Column "${column.name}" and all its tasks have been deleted`
    });

  } catch (error) {
    console.error('❌ Error deleting kanban column:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete kanban column'
    }, { status: 500 });
  }
}

// Update a column
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { columnId } = await params;
    const body = await request.json();
    const { name, color, limitWip } = body;

    if (!columnId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Column ID is required' 
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

    // Verify column exists and belongs to dealer's board
    const [column] = await db
      .select({ 
        id: kanbanColumns.id,
        boardId: kanbanColumns.boardId
      })
      .from(kanbanColumns)
      .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
      .where(and(
        eq(kanbanColumns.id, columnId),
        eq(kanbanBoards.dealerId, dealerId)
      ))
      .limit(1);

    if (!column) {
      return NextResponse.json({ 
        success: false, 
        error: 'Column not found' 
      }, { status: 404 });
    }

    // Update the column
    const [updatedColumn] = await db
      .update(kanbanColumns)
      .set({
        name: name?.trim(),
        color: color,
        limitWip: limitWip,
        updatedAt: new Date(),
      })
      .where(eq(kanbanColumns.id, columnId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedColumn
    });

  } catch (error) {
    console.error('❌ Error updating kanban column:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update kanban column'
    }, { status: 500 });
  }
}
