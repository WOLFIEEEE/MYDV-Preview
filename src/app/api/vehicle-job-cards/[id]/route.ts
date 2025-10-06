import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vehicleJobCards, dealers, teamMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { KanbanNotificationService } from '@/lib/kanbanNotifications';

// GET - Retrieve a specific vehicle job card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (supports team member credential delegation)
    let dealerId: string;
    
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      dealerId = teamMemberResult[0].storeOwnerId;
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

    const resolvedParams = await params;
    const jobCardId = resolvedParams.id;

    // Fetch the job card
    const [jobCard] = await db
      .select()
      .from(vehicleJobCards)
      .where(and(
        eq(vehicleJobCards.id, jobCardId),
        eq(vehicleJobCards.dealerId, dealerId)
      ))
      .limit(1);

    if (!jobCard) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle job card not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: jobCard
    });

  } catch (error) {
    console.error('❌ Error fetching vehicle job card:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH - Update a vehicle job card
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (supports team member credential delegation)
    let dealerId: string;
    
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      dealerId = teamMemberResult[0].storeOwnerId;
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

    const resolvedParams = await params;
    const jobCardId = resolvedParams.id;
    const body = await request.json();

    console.log('📝 Updating vehicle job card:', jobCardId, body);

    // Check if job card exists and belongs to dealer
    const [existingJobCard] = await db
      .select()
      .from(vehicleJobCards)
      .where(and(
        eq(vehicleJobCards.id, jobCardId),
        eq(vehicleJobCards.dealerId, dealerId)
      ))
      .limit(1);

    if (!existingJobCard) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle job card not found' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only update fields that are provided
    if (body.jobType !== undefined) updateData.jobType = body.jobType;
    if (body.garageDetails !== undefined) updateData.garageDetails = body.garageDetails;
    if (body.jobCategory !== undefined) updateData.jobCategory = body.jobCategory;
    if (body.status !== undefined) {
      updateData.status = body.status;
      
      // Set timestamps based on status changes
      if (body.status === 'in_progress' && !existingJobCard.startedAt) {
        updateData.startedAt = new Date();
      }
      if (body.status === 'done' && !existingJobCard.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.estimatedHours !== undefined) updateData.estimatedHours = body.estimatedHours;
    if (body.actualHours !== undefined) updateData.actualHours = body.actualHours;
    if (body.estimatedCost !== undefined) updateData.estimatedCost = body.estimatedCost ? body.estimatedCost.toString() : null;
    if (body.actualCost !== undefined) updateData.actualCost = body.actualCost ? body.actualCost.toString() : null;
    if (body.costDescription !== undefined) updateData.costDescription = body.costDescription;
    if (body.costsSubmitted !== undefined) {
      updateData.costsSubmitted = body.costsSubmitted;
      if (body.costsSubmitted && !existingJobCard.costsSubmittedAt) {
        updateData.costsSubmittedAt = new Date();
      }
    }
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.customerNotes !== undefined) updateData.customerNotes = body.customerNotes;
      if (body.attachments !== undefined) updateData.attachments = body.attachments;
      if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      if (body.jobs !== undefined) updateData.jobs = body.jobs;

    // Update the job card
    const [updatedJobCard] = await db
      .update(vehicleJobCards)
      .set(updateData)
      .where(and(
        eq(vehicleJobCards.id, jobCardId),
        eq(vehicleJobCards.dealerId, dealerId)
      ))
      .returning();

    console.log('✅ Vehicle job card updated successfully:', updatedJobCard.id);

    // Send notifications for job card updates
    try {
      const changes: string[] = [];
      if (body.jobType !== undefined && existingJobCard.jobType !== body.jobType) changes.push('job details');
      if (body.garageDetails !== undefined && existingJobCard.garageDetails !== body.garageDetails) changes.push('garage details');
      if (body.jobCategory !== undefined && existingJobCard.jobCategory !== body.jobCategory) changes.push('job category');
      if (body.priority !== undefined && existingJobCard.priority !== body.priority) changes.push('priority');
      if (body.assignedTo !== undefined && existingJobCard.assignedTo !== body.assignedTo) changes.push('assignee');
      if (body.estimatedHours !== undefined && existingJobCard.estimatedHours !== body.estimatedHours) changes.push('estimated hours');
      if (body.estimatedCost !== undefined && existingJobCard.estimatedCost !== (body.estimatedCost ? body.estimatedCost.toString() : null)) changes.push('estimated cost');
      if (body.dueDate !== undefined && existingJobCard.dueDate?.toISOString().split('T')[0] !== body.dueDate) changes.push('due date');

      if (changes.length > 0) {
        await KanbanNotificationService.notifyVehicleJobCardUpdated({
          taskId: updatedJobCard.id,
          taskTitle: `${updatedJobCard.jobType} - ${updatedJobCard.registration}`,
          updatedBy: user.id,
          changes: changes,
          assignedTo: updatedJobCard.assignedTo || undefined,
          previousAssignee: existingJobCard.assignedTo || undefined,
          stockId: updatedJobCard.stockId
        });
      }
    } catch (notificationError) {
      console.error('❌ Error sending vehicle job card update notifications:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle job card updated successfully',
      data: updatedJobCard
    });

  } catch (error) {
    console.error('❌ Error updating vehicle job card:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete a vehicle job card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (supports team member credential delegation)
    let dealerId: string;
    
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      dealerId = teamMemberResult[0].storeOwnerId;
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

    const resolvedParams = await params;
    const jobCardId = resolvedParams.id;

    console.log('🗑️ Deleting vehicle job card:', jobCardId);

    // Check if job card exists and belongs to dealer
    const [existingJobCard] = await db
      .select()
      .from(vehicleJobCards)
      .where(and(
        eq(vehicleJobCards.id, jobCardId),
        eq(vehicleJobCards.dealerId, dealerId)
      ))
      .limit(1);

    if (!existingJobCard) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vehicle job card not found' 
      }, { status: 404 });
    }

    // Delete the job card
    await db
      .delete(vehicleJobCards)
      .where(and(
        eq(vehicleJobCards.id, jobCardId),
        eq(vehicleJobCards.dealerId, dealerId)
      ));

    console.log('✅ Vehicle job card deleted successfully:', jobCardId);

    return NextResponse.json({
      success: true,
      message: 'Vehicle job card deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting vehicle job card:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
