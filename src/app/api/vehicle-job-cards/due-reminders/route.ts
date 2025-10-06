import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehicleJobCards } from '@/db/schema';
import { and, eq, lte, isNotNull } from 'drizzle-orm';
import { KanbanNotificationService } from '@/lib/kanbanNotifications';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Checking for due vehicle job cards...');

    // Get today's date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get end of today
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // Find job cards that are due today and have an assignee
    const dueJobCards = await db
      .select()
      .from(vehicleJobCards)
      .where(
        and(
          lte(vehicleJobCards.dueDate, endOfToday),
          isNotNull(vehicleJobCards.assignedTo),
          eq(vehicleJobCards.status, 'todo') // Only notify for pending jobs
        )
      );

    console.log(`📋 Found ${dueJobCards.length} due job cards`);

    let notificationsSent = 0;

    // Send notifications for each due job card
    for (const jobCard of dueJobCards) {
      if (jobCard.assignedTo && jobCard.dueDate) {
        try {
          await KanbanNotificationService.notifyVehicleJobCardDue({
            taskId: jobCard.id,
            taskTitle: `${jobCard.jobType} - ${jobCard.registration}`,
            assignedTo: jobCard.assignedTo,
            dueDate: jobCard.dueDate,
            stockId: jobCard.stockId
          });
          
          notificationsSent++;
          console.log(`✅ Sent due reminder for job card: ${jobCard.id}`);
        } catch (notificationError) {
          console.error(`❌ Failed to send due reminder for job card ${jobCard.id}:`, notificationError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${dueJobCards.length} due job cards, sent ${notificationsSent} notifications`,
      data: {
        totalDue: dueJobCards.length,
        notificationsSent
      }
    });

  } catch (error) {
    console.error('❌ Error checking due job cards:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check due job cards'
    }, { status: 500 });
  }
}
