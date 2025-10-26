import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { externalNotifications, dealers } from '@/db/schema';
import { eq, and, count, sql, gte } from 'drizzle-orm';

// GET /api/external-notifications/stats - Get notification statistics
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the dealer by Clerk user ID
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1);

    if (!dealer.length) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const dealerId = dealer[0].id;

    // Get current date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Base condition for all queries
    const baseCondition = eq(externalNotifications.dealerId, dealerId);

    // Get summary statistics
    const [
      totalResult,
      unreadResult,
      highPriorityUnreadResult,
      respondedResult,
      todayResult,
      weekResult,
      monthResult
    ] = await Promise.all([
      // Total notifications
      db
        .select({ count: count() })
        .from(externalNotifications)
        .where(baseCondition),
      
      // Unread notifications
      db
        .select({ count: count() })
        .from(externalNotifications)
        .where(and(baseCondition, eq(externalNotifications.isRead, false))),
      
      // High priority unread notifications
      db
        .select({ count: count() })
        .from(externalNotifications)
        .where(and(
          baseCondition, 
          eq(externalNotifications.isRead, false),
          sql`${externalNotifications.priority} IN ('high', 'urgent')`
        )),
      
      // Responded notifications
      db
        .select({ count: count() })
        .from(externalNotifications)
        .where(and(
          baseCondition,
          sql`${externalNotifications.respondedAt} IS NOT NULL`
        )),
      
      // Today's notifications
      db
        .select({ count: count() })
        .from(externalNotifications)
        .where(and(baseCondition, gte(externalNotifications.createdAt, todayStart))),
      
      // This week's notifications
      db
        .select({ count: count() })
        .from(externalNotifications)
        .where(and(baseCondition, gte(externalNotifications.createdAt, weekStart))),
      
      // This month's notifications
      db
        .select({ count: count() })
        .from(externalNotifications)
        .where(and(baseCondition, gte(externalNotifications.createdAt, monthStart)))
    ]);

    // Get breakdown statistics
    const [statusBreakdown, enquiryTypeBreakdown, priorityBreakdown] = await Promise.all([
      // Status breakdown
      db
        .select({
          status: externalNotifications.status,
          count: count()
        })
        .from(externalNotifications)
        .where(baseCondition)
        .groupBy(externalNotifications.status),
      
      // Enquiry type breakdown
      db
        .select({
          enquiryType: externalNotifications.enquiryType,
          count: count()
        })
        .from(externalNotifications)
        .where(baseCondition)
        .groupBy(externalNotifications.enquiryType),
      
      // Priority breakdown
      db
        .select({
          priority: externalNotifications.priority,
          count: count()
        })
        .from(externalNotifications)
        .where(baseCondition)
        .groupBy(externalNotifications.priority)
    ]);

    // Calculate response rate
    const total = totalResult[0]?.count || 0;
    const responded = respondedResult[0]?.count || 0;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    // Calculate average response time (simplified - in hours)
    const avgResponseTimeQuery = await db
      .select({
        avgHours: sql<number>`
          AVG(EXTRACT(EPOCH FROM (${externalNotifications.respondedAt} - ${externalNotifications.createdAt})) / 3600)
        `
      })
      .from(externalNotifications)
      .where(and(
        baseCondition,
        sql`${externalNotifications.respondedAt} IS NOT NULL`
      ));

    const avgResponseTimeHours = Math.round(avgResponseTimeQuery[0]?.avgHours || 0);

    // Format breakdown data
    const formatBreakdown = (data: any[], key: string) => {
      return data.reduce((acc, item) => {
        acc[item[key]] = item.count;
        return acc;
      }, {} as Record<string, number>);
    };

    const stats = {
      summary: {
        total: total,
        unread: unreadResult[0]?.count || 0,
        highPriorityUnread: highPriorityUnreadResult[0]?.count || 0,
        responded: responded,
        responseRate: responseRate,
        avgResponseTimeHours: avgResponseTimeHours
      },
      timePeriods: {
        today: todayResult[0]?.count || 0,
        thisWeek: weekResult[0]?.count || 0,
        thisMonth: monthResult[0]?.count || 0
      },
      breakdown: {
        byStatus: formatBreakdown(statusBreakdown, 'status'),
        byEnquiryType: formatBreakdown(enquiryTypeBreakdown, 'enquiryType'),
        byPriority: formatBreakdown(priorityBreakdown, 'priority')
      }
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}