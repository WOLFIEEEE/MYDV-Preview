import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vehicleJobCards, dealers, teamMembers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { KanbanNotificationService } from '@/lib/kanbanNotifications';

// GET - Retrieve vehicle job cards for a dealer
export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (supports team member credential delegation)
    let dealerId: string;
    
    // First check if user is a team member
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      // User is a team member - use store owner's dealer ID
      dealerId = teamMemberResult[0].storeOwnerId;
      console.log('👥 Team member detected - using store owner dealer ID for vehicle job cards:', dealerId);
    } else {
      // User is not a team member - get their own dealer record
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

    console.log('🔍 Fetching vehicle job cards for dealer:', dealerId);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const registration = searchParams.get('registration');
    const stockId = searchParams.get('stockId');

    // Build where conditions
    let whereConditions = [eq(vehicleJobCards.dealerId, dealerId)];
    
    if (status) {
      whereConditions.push(eq(vehicleJobCards.status, status));
    }
    
    if (registration) {
      whereConditions.push(eq(vehicleJobCards.registration, registration));
    }
    
    if (stockId) {
      whereConditions.push(eq(vehicleJobCards.stockId, stockId));
    }

    // Fetch vehicle job cards
    const jobCards = await db
      .select()
      .from(vehicleJobCards)
      .where(and(...whereConditions))
      .orderBy(desc(vehicleJobCards.createdAt));

    console.log(`✅ Retrieved ${jobCards.length} vehicle job cards`);

    return NextResponse.json({
      success: true,
      data: jobCards
    });

  } catch (error) {
    console.error('❌ Error fetching vehicle job cards:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create a new vehicle job card
export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (supports team member credential delegation)
    let dealerId: string;
    
    // First check if user is a team member
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      // User is a team member - use store owner's dealer ID
      dealerId = teamMemberResult[0].storeOwnerId;
    } else {
      // User is not a team member - get their own dealer record
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

    const body = await request.json();
    console.log('📝 Creating vehicle job card:', body);

    const {
      stockId,
      registration,
      jobType,
      garageDetails,
      jobCategory,
      status = 'todo',
      priority = 'medium',
      estimatedHours,
      estimatedCost,
      costDescription,
      assignedTo,
      notes,
      customerNotes,
      dueDate,
      jobs
    } = body;

    // Validate required fields
    if (!stockId || !registration || !jobType || !jobCategory) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: stockId, registration, jobType, jobCategory' 
      }, { status: 400 });
    }

    // Default to store owner if no assignee is provided
    const finalAssignedTo = assignedTo || user.id;

    // Create the job card
    const [newJobCard] = await db
      .insert(vehicleJobCards)
      .values({
        dealerId,
        stockId,
        registration,
        jobType,
        garageDetails,
        jobCategory,
        status,
        priority,
        estimatedHours,
        estimatedCost: estimatedCost ? estimatedCost.toString() : null,
        costDescription,
        assignedTo: finalAssignedTo,
        createdBy: user.id,
        notes,
        customerNotes,
        dueDate: dueDate ? new Date(dueDate) : null,
        jobs: jobs || null,
      })
      .returning();

    console.log('✅ Vehicle job card created successfully:', newJobCard.id);

    // Send notifications for job card creation
    if (finalAssignedTo) {
      try {
        await KanbanNotificationService.notifyVehicleJobCardCreated({
          taskId: newJobCard.id,
          taskTitle: `${jobType} - ${registration}`,
          createdBy: user.id,
          assignedTo: finalAssignedTo,
          priority: priority,
          stockId: stockId
        });
      } catch (notificationError) {
        console.error('❌ Error sending vehicle job card notifications:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle job card created successfully',
      data: newJobCard
    });

  } catch (error) {
    console.error('❌ Error creating vehicle job card:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
