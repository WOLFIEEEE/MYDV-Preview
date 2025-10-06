import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { kanbanColumns, kanbanBoards, dealers } from '@/db/schema';
import { eq, and, max } from 'drizzle-orm';

// Create a new column
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { boardId, name, color, limitWip } = body;

    if (!boardId || !name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Board ID and column name are required' 
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

    // Get the next position for this board
    const [maxPosition] = await db
      .select({ maxPos: max(kanbanColumns.position) })
      .from(kanbanColumns)
      .where(eq(kanbanColumns.boardId, boardId));

    const nextPosition = (maxPosition?.maxPos || 0) + 1;

    // Create the column
    const [newColumn] = await db
      .insert(kanbanColumns)
      .values({
        boardId,
        name: name.trim(),
        position: nextPosition,
        color: color || '#6b7280',
        limitWip: limitWip || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newColumn
    });

  } catch (error) {
    console.error('❌ Error creating kanban column:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create kanban column'
    }, { status: 500 });
  }
}
