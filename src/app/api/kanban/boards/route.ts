import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { kanbanBoards, kanbanColumns, dealers } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { KanbanNotificationService } from '@/lib/kanbanNotifications';

// Ensure Vehicle Job Cards board exists for the dealer
async function ensureVehicleJobCardsBoard(dealerId: string, userId: string) {
  try {
    // Check if Vehicle Job Cards board already exists
    const existingBoard = await db
      .select({ id: kanbanBoards.id })
      .from(kanbanBoards)
      .where(
        and(
          eq(kanbanBoards.dealerId, dealerId),
          eq(kanbanBoards.name, 'Vehicle Job Cards')
        )
      )
      .limit(1);

    if (existingBoard.length > 0) {
      return; // Board already exists
    }

    // Create the Vehicle Job Cards board
    const [newBoard] = await db
      .insert(kanbanBoards)
      .values({
        name: 'Vehicle Job Cards',
        description: 'Manage vehicle service and repair jobs',
        dealerId,
        createdBy: userId,
        color: '#1e40af', // Blue color
        isDefault: false, // Not the default board anymore
      })
      .returning();

    // Create fixed columns for Vehicle Job Cards
    const vehicleJobColumns = [
      { name: 'To Do', position: 0, color: '#ef4444' },
      { name: 'In Progress', position: 1, color: '#f59e0b' },
      { name: 'Due Collection', position: 2, color: '#8b5cf6' },
      { name: 'Done', position: 3, color: '#10b981' },
    ];

    await db
      .insert(kanbanColumns)
      .values(
        vehicleJobColumns.map(col => ({
          boardId: newBoard.id,
          name: col.name,
          position: col.position,
          color: col.color,
        }))
      );

    console.log('✅ Created Vehicle Job Cards board for dealer:', dealerId);
  } catch (error) {
    console.error('❌ Error creating Vehicle Job Cards board:', error);
    // Don't throw error, just log it - the main request should still work
  }
}

// Ensure Dealership Tasks board exists for the dealer
async function ensureDealershipTasksBoard(dealerId: string, userId: string) {
  try {
    // Check if Dealership Tasks board already exists
    const existingBoard = await db
      .select({ id: kanbanBoards.id })
      .from(kanbanBoards)
      .where(
        and(
          eq(kanbanBoards.dealerId, dealerId),
          eq(kanbanBoards.name, 'Dealership Tasks')
        )
      )
      .limit(1);

    if (existingBoard.length > 0) {
      return; // Board already exists
    }

    // Create the Dealership Tasks board
    const [newBoard] = await db
      .insert(kanbanBoards)
      .values({
        name: 'Dealership Tasks',
        description: 'Manage general dealership tasks and activities',
        dealerId,
        createdBy: userId,
        color: '#059669', // Green color
        isDefault: true, // Mark as default board
      })
      .returning();

    // Create default columns for Dealership Tasks
    const dealershipTaskColumns = [
      { name: 'To Do', position: 0, color: '#ef4444' },
      { name: 'In Progress', position: 1, color: '#f59e0b' },
      { name: 'Review', position: 2, color: '#8b5cf6' },
      { name: 'Done', position: 3, color: '#10b981' },
    ];

    await db
      .insert(kanbanColumns)
      .values(
        dealershipTaskColumns.map(col => ({
          boardId: newBoard.id,
          name: col.name,
          position: col.position,
          color: col.color,
        }))
      );

    console.log('✅ Created Dealership Tasks board for dealer:', dealerId);
  } catch (error) {
    console.error('❌ Error creating Dealership Tasks board:', error);
    // Don't throw error, just log it - the main request should still work
  }
}

// Get all boards for the user's dealer
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    // Check if default boards exist, create if not
    await ensureDealershipTasksBoard(dealerId, user.id);
    await ensureVehicleJobCardsBoard(dealerId, user.id);

    // Get boards with their columns and tasks
    const boards = await db
      .select({
        id: kanbanBoards.id,
        name: kanbanBoards.name,
        description: kanbanBoards.description,
        isDefault: kanbanBoards.isDefault,
        color: kanbanBoards.color,
        createdAt: kanbanBoards.createdAt,
        updatedAt: kanbanBoards.updatedAt,
      })
      .from(kanbanBoards)
      .where(eq(kanbanBoards.dealerId, dealerId))
      .orderBy(desc(kanbanBoards.isDefault), kanbanBoards.createdAt);

    return NextResponse.json({
      success: true,
      data: boards
    });

  } catch (error) {
    console.error('❌ Error fetching kanban boards:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch kanban boards'
    }, { status: 500 });
  }
}

// Create a new board
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Board name is required' 
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

    // Create the board
    const [newBoard] = await db
      .insert(kanbanBoards)
      .values({
        name,
        description,
        dealerId,
        createdBy: user.id,
        color: color || '#3b82f6',
        isDefault: false,
      })
      .returning();

    // Create default columns for the new board
    const defaultColumns = [
      { name: 'To Do', position: 0, color: '#ef4444' },
      { name: 'In Progress', position: 1, color: '#f59e0b' },
      { name: 'Review', position: 2, color: '#8b5cf6' },
      { name: 'Done', position: 3, color: '#10b981' },
    ];

    await db
      .insert(kanbanColumns)
      .values(
        defaultColumns.map(col => ({
          boardId: newBoard.id,
          name: col.name,
          position: col.position,
          color: col.color,
        }))
      );

    // Send notifications for board creation
    await KanbanNotificationService.notifyBoardCreated({
      boardId: newBoard.id,
      boardName: newBoard.name,
      createdBy: user.id,
      dealerId
    });

    return NextResponse.json({
      success: true,
      data: newBoard
    });

  } catch (error) {
    console.error('❌ Error creating kanban board:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create kanban board'
    }, { status: 500 });
  }
}
