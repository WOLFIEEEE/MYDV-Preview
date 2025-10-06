import { NotificationService } from '@/lib/notificationService'
import { db } from '@/lib/db'
import { dealers, teamMembers, stockCache } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// ================================
// NOTIFICATION TRIGGER HELPERS
// ================================

/**
 * Get all team members for a dealer (including the dealer themselves)
 */
async function getDealerTeam(dealerId: string): Promise<string[]> {
  try {
    // Get the dealer
    const [dealer] = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1)

    if (!dealer) return []

    // Get all team members
    const members = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.storeOwnerId, dealerId),
          eq(teamMembers.status, 'active')
        )
      )

    // Return dealer + team members
    return [dealerId, ...members.map(m => m.storeOwnerId)]
  } catch (error) {
    console.error('Error getting dealer team:', error)
    return [dealerId] // At least return the dealer
  }
}

/**
 * Get dealer ID from Clerk user ID
 */
async function getDealerIdFromClerkId(clerkUserId: string): Promise<string | null> {
  try {
    const [dealer] = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, clerkUserId))
      .limit(1)

    return dealer?.id || null
  } catch (error) {
    console.error('Error getting dealer from Clerk ID:', error)
    return null
  }
}

// ================================
// STOCK & INVENTORY TRIGGERS
// ================================

export const StockNotifications = {
  /**
   * Notify when a new vehicle is added to inventory
   */
  async vehicleAdded(dealerId: string, stockData: Record<string, unknown>) {
    try {
      const teamMembers = await getDealerTeam(dealerId)
      
      await NotificationService.createBulkNotifications({
        recipientIds: teamMembers,
        type: 'stock_added',
        title: 'New Vehicle Added',
        message: `${stockData.make} ${stockData.model} (${stockData.registration}) has been added to inventory`,
        priority: 'medium',
        entityType: 'stock',
        entityId: String(stockData.stockId || ''),
        actionUrl: `/inventory/${stockData.stockId || ''}`,
        actionLabel: 'View Vehicle',
        metadata: {
          make: stockData.make,
          model: stockData.model,
          registration: stockData.registration,
          price: stockData.forecourtPriceGBP
        }
      })
    } catch (error) {
      console.error('Error sending vehicle added notification:', error)
    }
  },

  /**
   * Notify when a vehicle is sold
   */
  async vehicleSold(dealerId: string, stockData: Record<string, unknown>, salePrice: number, customerName?: string) {
    try {
      const teamMembers = await getDealerTeam(dealerId)
      
      await NotificationService.createBulkNotifications({
        recipientIds: teamMembers,
        type: 'stock_sold',
        title: '🎉 Vehicle Sold!',
        message: `${stockData.make} ${stockData.model} (${stockData.registration}) sold for £${salePrice.toLocaleString()}${customerName ? ` to ${customerName}` : ''}`,
        priority: 'high',
        entityType: 'stock',
        entityId: String(stockData.stockId || ''),
        actionUrl: `/inventory/${stockData.stockId || ''}`,
        actionLabel: 'View Details',
        metadata: {
          make: stockData.make,
          model: stockData.model,
          registration: stockData.registration,
          salePrice,
          customerName
        }
      })
    } catch (error) {
      console.error('Error sending vehicle sold notification:', error)
    }
  },

  /**
   * Notify when stock action is completed
   */
  async stockActionCompleted(dealerId: string, stockId: string, actionType: string, completedBy: string) {
    try {
      // Get stock data
      const [stock] = await db
        .select()
        .from(stockCache)
        .where(eq(stockCache.stockId, stockId))
        .limit(1)

      if (!stock) return

      const teamMembers = await getDealerTeam(dealerId)
      
      await NotificationService.createBulkNotifications({
        recipientIds: teamMembers.filter(id => id !== completedBy), // Don't notify the person who completed it
        type: 'stock_action_completed',
        title: 'Stock Action Completed',
        message: `${actionType} completed for ${stock.make} ${stock.model} (${stock.registration})`,
        priority: 'medium',
        entityType: 'stock',
        entityId: stockId,
        senderId: completedBy,
        actionUrl: `/inventory/${stockId}`,
        actionLabel: 'View Vehicle',
        metadata: {
          actionType,
          make: stock.make,
          model: stock.model,
          registration: stock.registration
        }
      })
    } catch (error) {
      console.error('Error sending stock action completed notification:', error)
    }
  },

  /**
   * Notify when price changes significantly
   */
  async priceChanged(dealerId: string, stockData: Record<string, unknown>, oldPrice: number, newPrice: number) {
    try {
      const priceChange = newPrice - oldPrice
      const percentChange = Math.abs((priceChange / oldPrice) * 100)
      
      // Only notify for significant changes (>5%)
      if (percentChange < 5) return

      const teamMembers = await getDealerTeam(dealerId)
      
      await NotificationService.createBulkNotifications({
        recipientIds: teamMembers,
        type: 'price_change',
        title: 'Price Updated',
        message: `${stockData.make} ${stockData.model} price ${priceChange > 0 ? 'increased' : 'decreased'} by £${Math.abs(priceChange).toLocaleString()} (${percentChange.toFixed(1)}%)`,
        priority: percentChange > 15 ? 'high' : 'medium',
        entityType: 'stock',
        entityId: String(stockData.stockId || ''),
        actionUrl: `/inventory/${stockData.stockId || ''}`,
        actionLabel: 'View Vehicle',
        metadata: {
          oldPrice,
          newPrice,
          priceChange,
          percentChange
        }
      })
    } catch (error) {
      console.error('Error sending price change notification:', error)
    }
  }
}

// ================================
// TEAM & USER MANAGEMENT TRIGGERS
// ================================

export const TeamNotifications = {
  /**
   * Notify when a team member is invited
   */
  async memberInvited(dealerId: string, memberEmail: string, role: string, invitedBy: string) {
    try {
      await NotificationService.createNotification({
        recipientId: dealerId,
        type: 'team_member_invited',
        title: 'Team Member Invited',
        message: `${memberEmail} has been invited to join as ${role}`,
        priority: 'medium',
        senderId: invitedBy,
        actionUrl: '/admin/dashboard',
        actionLabel: 'Manage Team',
        metadata: {
          memberEmail,
          role
        }
      })
    } catch (error) {
      console.error('Error sending member invited notification:', error)
    }
  },

  /**
   * Notify when a team member joins
   */
  async memberJoined(dealerId: string, memberName: string, memberEmail: string, role: string) {
    try {
      const teamMembers = await getDealerTeam(dealerId)
      
      await NotificationService.createBulkNotifications({
        recipientIds: teamMembers,
        type: 'team_member_joined',
        title: 'New Team Member',
        message: `${memberName} (${memberEmail}) has joined your team as ${role}`,
        priority: 'medium',
        actionUrl: '/admin/dashboard',
        actionLabel: 'View Team',
        metadata: {
          memberName,
          memberEmail,
          role
        }
      })
    } catch (error) {
      console.error('Error sending member joined notification:', error)
    }
  },

  /**
   * Notify when a task is assigned
   */
  async taskAssigned(assigneeId: string, taskId: string, taskTitle: string, assignedBy: string, dueDate?: Date) {
    try {
      await NotificationService.createNotification({
        recipientId: assigneeId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned: ${taskTitle}${dueDate ? ` (Due: ${dueDate.toLocaleDateString()})` : ''}`,
        priority: dueDate && dueDate < new Date(Date.now() + 24 * 60 * 60 * 1000) ? 'high' : 'medium', // High priority if due within 24 hours
        entityType: 'task',
        entityId: taskId,
        senderId: assignedBy,
        actionUrl: `/kanban?task=${taskId}`,
        actionLabel: 'View Task',
        metadata: {
          taskTitle,
          dueDate: dueDate?.toISOString()
        }
      })
    } catch (error) {
      console.error('Error sending task assigned notification:', error)
    }
  },

  /**
   * Notify when a task is completed
   */
  async taskCompleted(dealerId: string, taskId: string, taskTitle: string, completedBy: string) {
    try {
      const teamMembers = await getDealerTeam(dealerId)
      
      await NotificationService.createBulkNotifications({
        recipientIds: teamMembers.filter(id => id !== completedBy),
        type: 'task_completed',
        title: 'Task Completed',
        message: `Task "${taskTitle}" has been completed`,
        priority: 'medium',
        entityType: 'task',
        entityId: taskId,
        senderId: completedBy,
        actionUrl: `/kanban?task=${taskId}`,
        actionLabel: 'View Task',
        metadata: {
          taskTitle
        }
      })
    } catch (error) {
      console.error('Error sending task completed notification:', error)
    }
  }
}

// ================================
// SALES & FINANCIAL TRIGGERS
// ================================

export const SalesNotifications = {
  /**
   * Notify when an invoice is generated
   */
  async invoiceGenerated(dealerId: string, invoiceId: string, invoiceNumber: string, customerName: string, amount: number) {
    try {
      const teamMembers = await getDealerTeam(dealerId)
      
      await NotificationService.createBulkNotifications({
        recipientIds: teamMembers,
        type: 'invoice_generated',
        title: 'Invoice Generated',
        message: `Invoice ${invoiceNumber} created for ${customerName} - £${amount.toLocaleString()}`,
        priority: 'medium',
        entityType: 'invoice',
        entityId: invoiceId,
        actionUrl: `/invoice?id=${invoiceId}`,
        actionLabel: 'View Invoice',
        metadata: {
          invoiceNumber,
          customerName,
          amount
        }
      })
    } catch (error) {
      console.error('Error sending invoice generated notification:', error)
    }
  },

  /**
   * Notify when payment is received
   */
  async paymentReceived(dealerId: string, invoiceId: string, customerName: string, amount: number, paymentMethod: string) {
    try {
      const teamMembers = await getDealerTeam(dealerId)
      
      await NotificationService.createBulkNotifications({
        recipientIds: teamMembers,
        type: 'payment_received',
        title: '💰 Payment Received',
        message: `£${amount.toLocaleString()} received from ${customerName} via ${paymentMethod}`,
        priority: 'high',
        entityType: 'invoice',
        entityId: invoiceId,
        actionUrl: `/invoice?id=${invoiceId}`,
        actionLabel: 'View Invoice',
        metadata: {
          customerName,
          amount,
          paymentMethod
        }
      })
    } catch (error) {
      console.error('Error sending payment received notification:', error)
    }
  },

  /**
   * Notify when profit margin is low
   */
  async lowMarginAlert(dealerId: string, stockId: string, stockData: Record<string, unknown>, marginPercent: number) {
    try {
      await NotificationService.createNotification({
        recipientId: dealerId,
        type: 'margin_alert',
        title: '⚠️ Low Margin Alert',
        message: `${stockData.make} ${stockData.model} has a low profit margin of ${marginPercent.toFixed(1)}%`,
        priority: marginPercent < 5 ? 'urgent' : 'high',
        entityType: 'stock',
        entityId: stockId,
        actionUrl: `/inventory/${stockId}`,
        actionLabel: 'Review Pricing',
        metadata: {
          marginPercent,
          make: stockData.make,
          model: stockData.model,
          registration: stockData.registration
        }
      })
    } catch (error) {
      console.error('Error sending low margin alert:', error)
    }
  }
}

// ================================
// ADMIN & SYSTEM TRIGGERS
// ================================

export const AdminNotifications = {
  /**
   * Notify admins when a join request is submitted
   */
  async joinRequestSubmitted(joinSubmissionId: string, applicantName: string, dealershipName: string) {
    try {
      // Get admin emails from environment variable
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
      
      if (adminEmails.length === 0) {
        console.warn('⚠️ No admin emails configured in NEXT_PUBLIC_ADMIN_EMAILS for join request notifications');
        return;
      }

      console.log(`📧 Creating in-app notifications for ${adminEmails.length} admin(s):`, adminEmails);

      // Create notifications for each admin email (using email as recipient ID)
      const notificationPromises = adminEmails.map(async (adminEmail) => {
        try {
          return await NotificationService.createNotification({
            recipientId: adminEmail, // Use email as recipient ID for admin notifications
            type: 'join_request_submitted',
            title: 'New Join Request',
            message: `${applicantName} from ${dealershipName} has submitted a join request`,
            priority: 'medium',
            entityType: 'join_submission',
            entityId: joinSubmissionId.toString(),
            actionUrl: '/admin/dashboard',
            actionLabel: 'Review Request',
            metadata: {
              applicantName,
              dealershipName
            }
          });
        } catch (error) {
          console.error(`❌ Failed to create notification for admin ${adminEmail}:`, error);
          return null;
        }
      });

      const notificationResults = await Promise.allSettled(notificationPromises);
      
      const successfulNotifications = notificationResults.filter(result => 
        result.status === 'fulfilled' && result.value !== null
      ).length;
      
      const failedNotifications = notificationResults.length - successfulNotifications;
      
      console.log(`📧 In-app notifications: ${successfulNotifications} created, ${failedNotifications} failed`);
    } catch (error) {
      console.error('Error sending join request notification:', error)
    }
  },

  /**
   * Notify when join request is approved
   */
  async joinRequestApproved(applicantEmail: string, dealershipName: string, approvedBy: string) {
    try {
      // This would typically be sent via email to the applicant
      // For now, we'll create a system notification
      console.log(`Join request approved for ${applicantEmail} from ${dealershipName} by ${approvedBy}`)
    } catch (error) {
      console.error('Error sending join request approved notification:', error)
    }
  },

  /**
   * Notify about system maintenance
   */
  async systemMaintenance(title: string, message: string, scheduledFor: Date) {
    try {
      // Get all users
      const allUsers = await db
        .select({ id: dealers.id })
        .from(dealers)

      if (allUsers.length === 0) return

      await NotificationService.createBulkNotifications({
        recipientIds: allUsers.map(u => u.id),
        type: 'system_maintenance',
        title,
        message,
        priority: 'high',
        channels: ['in_app', 'email'],
        scheduledFor,
        metadata: {
          maintenanceDate: scheduledFor.toISOString()
        }
      })
    } catch (error) {
      console.error('Error sending system maintenance notification:', error)
    }
  },

  /**
   * Notify about API key expiring
   */
  async apiKeyExpiring(dealerId: string, keyType: string, expiryDate: Date) {
    try {
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      await NotificationService.createNotification({
        recipientId: dealerId,
        type: 'api_key_expiring',
        title: 'API Key Expiring Soon',
        message: `Your ${keyType} API key expires in ${daysUntilExpiry} days`,
        priority: daysUntilExpiry <= 7 ? 'urgent' : 'high',
        actionUrl: '/admin/dashboard',
        actionLabel: 'Renew Key',
        metadata: {
          keyType,
          expiryDate: expiryDate.toISOString(),
          daysUntilExpiry
        }
      })
    } catch (error) {
      console.error('Error sending API key expiring notification:', error)
    }
  }
}

// ================================
// INTEGRATION TRIGGERS
// ================================

export const IntegrationNotifications = {
  /**
   * Notify when AutoTrader sync completes
   */
  async autoTraderSyncCompleted(dealerId: string, recordsProcessed: number, recordsUpdated: number, recordsCreated: number) {
    try {
      await NotificationService.createNotification({
        recipientId: dealerId,
        type: 'autotrader_sync_completed',
        title: 'AutoTrader Sync Complete',
        message: `Processed ${recordsProcessed} records (${recordsCreated} new, ${recordsUpdated} updated)`,
        priority: 'low',
        actionUrl: '/inventory',
        actionLabel: 'View Inventory',
        metadata: {
          recordsProcessed,
          recordsUpdated,
          recordsCreated
        }
      })
    } catch (error) {
      console.error('Error sending AutoTrader sync notification:', error)
    }
  },

  /**
   * Notify when AutoTrader sync fails
   */
  async autoTraderSyncFailed(dealerId: string, errorMessage: string) {
    try {
      await NotificationService.createNotification({
        recipientId: dealerId,
        type: 'autotrader_sync_failed',
        title: 'AutoTrader Sync Failed',
        message: `Sync failed: ${errorMessage}`,
        priority: 'high',
        actionUrl: '/admin/dashboard',
        actionLabel: 'Check Settings',
        metadata: {
          errorMessage
        }
      })
    } catch (error) {
      console.error('Error sending AutoTrader sync failed notification:', error)
    }
  }
}

// ================================
// CONVENIENCE FUNCTIONS
// ================================

/**
 * Trigger notification from Clerk user context
 */
export async function triggerNotificationForClerkUser(
  clerkUserId: string,
  notificationFn: (dealerId: string, ...args: unknown[]) => Promise<void>,
  ...args: unknown[]
) {
  const dealerId = await getDealerIdFromClerkId(clerkUserId)
  if (dealerId) {
    await notificationFn(dealerId, ...args)
  }
}

/**
 * Batch notification helper for multiple triggers
 */
export async function batchNotifications(notifications: Array<() => Promise<void>>) {
  try {
    await Promise.allSettled(notifications.map(fn => fn()))
  } catch (error) {
    console.error('Error in batch notifications:', error)
  }
}
