import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { kanbanTasks, kanbanBoards, kanbanColumns, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Get all kanban tasks for a specific vehicle/stockId
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'stockId parameter is required' 
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

    // Get all tasks for this stockId from boards belonging to this dealer
    const tasks = await db
      .select({
        id: kanbanTasks.id,
        title: kanbanTasks.title,
        description: kanbanTasks.description,
        priority: kanbanTasks.priority,
        assignedTo: kanbanTasks.assignedTo,
        dueDate: kanbanTasks.dueDate,
        tags: kanbanTasks.tags,
        stockId: kanbanTasks.stockId,
        estimatedHours: kanbanTasks.estimatedHours,
        actualHours: kanbanTasks.actualHours,
        createdAt: kanbanTasks.createdAt,
        updatedAt: kanbanTasks.updatedAt,
        boardId: kanbanBoards.id,
        boardName: kanbanBoards.name,
        columnName: kanbanColumns.name,
      })
      .from(kanbanTasks)
      .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
      .innerJoin(kanbanColumns, eq(kanbanTasks.columnId, kanbanColumns.id))
      .where(
        and(
          eq(kanbanTasks.stockId, stockId),
          eq(kanbanBoards.dealerId, dealerId)
        )
      )
      .orderBy(kanbanTasks.createdAt);

    return NextResponse.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    console.error('❌ Error fetching vehicle kanban tasks:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch vehicle kanban tasks'
    }, { status: 500 });
  }
}
