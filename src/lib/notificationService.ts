import { db } from '@/lib/db'
import { 
  notifications, 
  notificationPreferences, 
  notificationDeliveryLog, 
  notificationTemplates,
  dealers,
  teamMembers,
  type Notification,
  type NewNotification,
  type NotificationPreferences,
  type NotificationType,
  type NotificationPriority,
  type NotificationChannel
} from '@/db/schema'
import { eq, and, desc, count, inArray, isNull, or, lt, gte } from 'drizzle-orm'

// ================================
// NOTIFICATION CREATION SERVICE
// ================================

interface CreateNotificationParams {
  recipientId: string
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  actionUrl?: string
  actionLabel?: string
  channels?: NotificationChannel[]
  scheduledFor?: Date
  expiresAt?: Date
  groupKey?: string
  senderId?: string
}

interface BulkNotificationParams extends Omit<CreateNotificationParams, 'recipientId'> {
  recipientIds: string[]
}

export class NotificationService {
  
  /**
   * Create a single notification
   */
  static async createNotification(params: CreateNotificationParams): Promise<Notification> {
    try {
      // Resolve recipient ID to UUID format expected by database
      const resolvedRecipientId = await this.resolveRecipientId(params.recipientId)
      
      if (!resolvedRecipientId) {
        throw new Error(`Could not resolve recipient ID: ${params.recipientId}`)
      }

      // Resolve sender ID to UUID format as well (if provided)
      let resolvedSenderId: string | null = null
      if (params.senderId) {
        resolvedSenderId = await this.resolveRecipientId(params.senderId)
        if (!resolvedSenderId) {
          console.warn(`Could not resolve sender ID: ${params.senderId}, setting to null`)
        }
      }

      const notification: NewNotification = {
        recipientId: resolvedRecipientId,
        senderId: resolvedSenderId,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'medium',
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        metadata: params.metadata || null,
        actionUrl: params.actionUrl || null,
        actionLabel: params.actionLabel || null,
        channels: params.channels || ['in_app'],
        scheduledFor: params.scheduledFor || null,
        expiresAt: params.expiresAt || null,
        groupKey: params.groupKey || null,
      }

      const [createdNotification] = await db
        .insert(notifications)
        .values(notification)
        .returning()

      // If notification should be sent immediately, process delivery
      if (!params.scheduledFor || params.scheduledFor <= new Date()) {
        await this.processNotificationDelivery(createdNotification.id)
      }

      return createdNotification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw new Error('Failed to create notification')
    }
  }

  /**
   * Create multiple notifications in bulk
   */
  static async createBulkNotifications(params: BulkNotificationParams): Promise<Notification[]> {
    try {
      const notificationData: NewNotification[] = params.recipientIds.map(recipientId => ({
        recipientId,
        senderId: params.senderId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'medium',
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        metadata: params.metadata || null,
        actionUrl: params.actionUrl || null,
        actionLabel: params.actionLabel || null,
        channels: params.channels || ['in_app'],
        scheduledFor: params.scheduledFor || null,
        expiresAt: params.expiresAt || null,
        groupKey: params.groupKey || null,
      }))

      const createdNotifications = await db
        .insert(notifications)
        .values(notificationData)
        .returning()

      // Process delivery for immediate notifications
      const immediateNotifications = createdNotifications.filter(
        n => !n.scheduledFor || n.scheduledFor <= new Date()
      )

      await Promise.all(
        immediateNotifications.map(n => this.processNotificationDelivery(n.id))
      )

      return createdNotifications
    } catch (error) {
      console.error('Error creating bulk notifications:', error)
      throw new Error('Failed to create bulk notifications')
    }
  }

  /**
   * Create notification from template
   */
  static async createFromTemplate(
    templateId: string, 
    recipientId: string, 
    variables: Record<string, unknown> = {},
    overrides: Partial<CreateNotificationParams> = {}
  ): Promise<Notification> {
    try {
      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.id, templateId))
        .limit(1)

      if (!template) {
        throw new Error('Notification template not found')
      }

      // Replace variables in template
      const title = this.replaceVariables(template.titleTemplate, variables)
      const message = this.replaceVariables(template.messageTemplate, variables)

      return await this.createNotification({
        recipientId,
        type: template.type as NotificationType,
        title,
        message,
        priority: template.defaultPriority as NotificationPriority,
        channels: template.defaultChannels as NotificationChannel[],
        ...overrides
      })
    } catch (error) {
      console.error('Error creating notification from template:', error)
      throw new Error('Failed to create notification from template')
    }
  }

  /**
   * Replace variables in template strings
   */
  private static replaceVariables(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match
    })
  }

  // ================================
  // NOTIFICATION RETRIEVAL
  // ================================

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      includeArchived?: boolean
      types?: NotificationType[]
      priorities?: NotificationPriority[]
    } = {}
  ) {
    try {
      const {
        limit = 50,
        offset = 0,
        unreadOnly = false,
        includeArchived = false,
        types,
        priorities
      } = options

      const conditions = [eq(notifications.recipientId, userId)]
      
      if (unreadOnly) {
        conditions.push(eq(notifications.isRead, false))
      }
      
      if (!includeArchived) {
        conditions.push(eq(notifications.isArchived, false))
      }
      
      if (types && types.length > 0) {
        conditions.push(inArray(notifications.type, types))
      }
      
      if (priorities && priorities.length > 0) {
        conditions.push(inArray(notifications.priority, priorities))
      }

      // Check for expired notifications
      conditions.push(
        or(
          isNull(notifications.expiresAt),
          gte(notifications.expiresAt, new Date())
        )!
      )

      const result = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          priority: notifications.priority,
          entityType: notifications.entityType,
          entityId: notifications.entityId,
          metadata: notifications.metadata,
          actionUrl: notifications.actionUrl,
          actionLabel: notifications.actionLabel,
          isRead: notifications.isRead,
          isArchived: notifications.isArchived,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
          sender: {
            id: dealers.id,
            name: dealers.name,
            email: dealers.email
          }
        })
        .from(notifications)
        .leftJoin(dealers, eq(notifications.senderId, dealers.id))
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset)

      return result
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      throw new Error('Failed to fetch notifications')
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, userId),
            eq(notifications.isRead, false),
            eq(notifications.isArchived, false),
            or(
              isNull(notifications.expiresAt),
              gte(notifications.expiresAt, new Date())
            )!
          )
        )

      return result.count
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  // ================================
  // NOTIFICATION ACTIONS
  // ================================

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.recipientId, userId)
          )
        )
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw new Error('Failed to mark notification as read')
    }
  }

  /**
   * Mark multiple notifications as read
   */
  static async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            inArray(notifications.id, notificationIds),
            eq(notifications.recipientId, userId)
          )
        )
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      throw new Error('Failed to mark notifications as read')
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(notifications.recipientId, userId),
            eq(notifications.isRead, false)
          )
        )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw new Error('Failed to mark all notifications as read')
    }
  }

  /**
   * Archive notification
   */
  static async archiveNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ 
          isArchived: true,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.recipientId, userId)
          )
        )
    } catch (error) {
      console.error('Error archiving notification:', error)
      throw new Error('Failed to archive notification')
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.recipientId, userId)
          )
        )
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw new Error('Failed to delete notification')
    }
  }

  // ================================
  // NOTIFICATION DELIVERY
  // ================================

  /**
   * Process notification delivery across all channels
   */
  private static async processNotificationDelivery(notificationId: string): Promise<void> {
    try {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .limit(1)

      if (!notification) {
        throw new Error('Notification not found')
      }

      // Get user preferences
      const preferences = await this.getUserPreferences(notification.recipientId)

      // Process each delivery channel
      const deliveryPromises = notification.channels.map(channel => 
        this.deliverToChannel(notification, channel as NotificationChannel, preferences)
      )

      await Promise.allSettled(deliveryPromises)
    } catch (error) {
      console.error('Error processing notification delivery:', error)
    }
  }

  /**
   * Deliver notification to specific channel
   */
  private static async deliverToChannel(
    notification: Notification, 
    channel: NotificationChannel,
    preferences: NotificationPreferences | null
  ): Promise<void> {
    try {
      // Check if user has enabled this channel for this notification type
      if (!this.isChannelEnabled(notification, channel, preferences)) {
        return
      }

      // Check priority threshold
      if (!this.meetsPriorityThreshold(notification.priority, channel, preferences)) {
        return
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        // Schedule for later delivery
        await this.scheduleForLater(notification.id, channel)
        return
      }

      // Create delivery log entry
      const deliveryLog = await db
        .insert(notificationDeliveryLog)
        .values({
          notificationId: notification.id,
          channel,
          status: 'pending',
          recipientAddress: await this.getRecipientAddress(notification.recipientId, channel)
        })
        .returning()

      // Deliver based on channel
      switch (channel) {
        case 'in_app':
          // In-app notifications are already stored in the database
          await this.updateDeliveryStatus(deliveryLog[0].id, 'delivered')
          break
        case 'email':
          await this.sendEmailNotification(notification, deliveryLog[0].id)
          break
        case 'sms':
          await this.sendSMSNotification(notification, deliveryLog[0].id)
          break
        case 'push':
          await this.sendPushNotification(notification, deliveryLog[0].id)
          break
        default:
          console.warn(`Unknown notification channel: ${channel}`)
      }
    } catch (error) {
      console.error(`Error delivering notification to ${channel}:`, error)
    }
  }

  /**
   * Check if channel is enabled for notification type
   */
  private static isChannelEnabled(
    notification: Notification, 
    channel: NotificationChannel,
    preferences: NotificationPreferences | null
  ): boolean {
    if (!preferences || !preferences.isEnabled) {
      return channel === 'in_app' // Default to in-app only
    }

    const channelPrefs = this.getChannelPreferences(channel, preferences)
    return channelPrefs[notification.type] !== false
  }

  /**
   * Check if notification meets priority threshold for channel
   */
  private static meetsPriorityThreshold(
    priority: string, 
    channel: NotificationChannel,
    preferences: NotificationPreferences | null
  ): boolean {
    if (!preferences) return true

    const priorityOrder = { low: 0, medium: 1, high: 2, urgent: 3 }
    const notificationPriority = priorityOrder[priority as keyof typeof priorityOrder] || 1

    let minPriority = 1 // default to medium
    switch (channel) {
      case 'email':
        minPriority = priorityOrder[preferences.minPriorityEmail as keyof typeof priorityOrder] || 1
        break
      case 'sms':
        minPriority = priorityOrder[preferences.minPrioritySms as keyof typeof priorityOrder] || 2
        break
      case 'push':
        minPriority = priorityOrder[preferences.minPriorityPush as keyof typeof priorityOrder] || 1
        break
    }

    return notificationPriority >= minPriority
  }

  /**
   * Check if current time is in user's quiet hours
   */
  private static isInQuietHours(preferences: NotificationPreferences | null): boolean {
    if (!preferences || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false
    }

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    
    return currentTime >= preferences.quietHoursStart || currentTime <= preferences.quietHoursEnd
  }

  /**
   * Get channel preferences for user
   */
  private static getChannelPreferences(
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): Record<string, boolean> {
    switch (channel) {
      case 'email':
        return (preferences.emailPreferences as Record<string, boolean>) || {}
      case 'sms':
        return (preferences.smsPreferences as Record<string, boolean>) || {}
      case 'push':
        return (preferences.pushPreferences as Record<string, boolean>) || {}
      case 'in_app':
        return (preferences.inAppPreferences as Record<string, boolean>) || {}
      default:
        return {}
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const [preferences] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1)

      return preferences || null
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return null
    }
  }

  /**
   * Create or update user notification preferences
   */
  static async updateUserPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const existing = await this.getUserPreferences(userId)

      if (existing) {
        const [updated] = await db
          .update(notificationPreferences)
          .set({ ...preferences, updatedAt: new Date() })
          .where(eq(notificationPreferences.userId, userId))
          .returning()
        return updated
      } else {
        const [created] = await db
          .insert(notificationPreferences)
          .values({ userId, ...preferences })
          .returning()
        return created
      }
    } catch (error) {
      console.error('Error updating user preferences:', error)
      throw new Error('Failed to update notification preferences')
    }
  }

  // ================================
  // HELPER METHODS
  // ================================

  /**
   * Resolve recipient ID to a UUID format expected by the database
   * For team members, we'll use a deterministic UUID based on their Clerk ID
   * For admin emails, we'll find the corresponding dealer record
   */
  private static async resolveRecipientId(userId: string): Promise<string | null> {
    try {
      // First check if it's already a UUID format (dealer ID)
      if (userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return userId
      }

      // Check if it's an email address (for admin notifications)
      if (userId.includes('@')) {
        // Try to find dealer by email
        const [dealer] = await db
          .select({ id: dealers.id })
          .from(dealers)
          .where(eq(dealers.email, userId))
          .limit(1)

        if (dealer?.id) {
          return dealer.id
        }

        // If no dealer found with this email, create a deterministic UUID for the email
        // This allows admin notifications to work even if the admin isn't in the dealers table
        const crypto = await import('crypto')
        const hash = crypto.createHash('sha256').update(userId).digest('hex')
        
        const uuid = [
          hash.substring(0, 8),
          hash.substring(8, 12),
          hash.substring(12, 16),
          hash.substring(16, 20),
          hash.substring(20, 32)
        ].join('-')

        return uuid
      }

      // If it's a Clerk user ID, try to find the corresponding dealer first
      const [dealer] = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, userId))
        .limit(1)

      if (dealer?.id) {
        return dealer.id
      }

      // For team members, create a deterministic UUID from their Clerk ID
      // This ensures consistent mapping without changing the database schema
      const crypto = await import('crypto')
      const hash = crypto.createHash('sha256').update(userId).digest('hex')
      
      // Convert hash to UUID format (this is deterministic and reversible)
      const uuid = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
      ].join('-')

      return uuid
    } catch (error) {
      console.error('Error resolving recipient ID:', error)
      return null
    }
  }

  private static async getRecipientAddress(userId: string, channel: NotificationChannel): Promise<string | null> {
    try {
      // If userId is already an email address, return it directly for email channel
      if (userId.includes('@') && channel === 'email') {
        return userId
      }

      // First try to find as a dealer (store owner) using dealer UUID
      const [dealer] = await db
        .select({ email: dealers.email })
        .from(dealers)
        .where(eq(dealers.id, userId))
        .limit(1)

      if (dealer?.email) {
        switch (channel) {
          case 'email':
            return dealer.email
          case 'sms':
            // TODO: Add phone number to dealers table or get from Clerk
            return null
          default:
            return null
        }
      }

      // If not found as dealer, try to find as team member using Clerk user ID
      const [teamMember] = await db
        .select({ email: teamMembers.email })
        .from(teamMembers)
        .where(eq(teamMembers.clerkUserId, userId))
        .limit(1)

      if (teamMember?.email) {
        switch (channel) {
          case 'email':
            return teamMember.email
          case 'sms':
            // TODO: Add phone number to team members table or get from Clerk
            return null
          default:
            return null
        }
      }

      // If still not found, try to find dealer by Clerk user ID (for store owners)
      const [dealerByClerk] = await db
        .select({ email: dealers.email })
        .from(dealers)
        .where(eq(dealers.clerkUserId, userId))
        .limit(1)

      switch (channel) {
        case 'email':
          return dealerByClerk?.email || null
        case 'sms':
          // TODO: Add phone number to dealers table or get from Clerk
          return null
        default:
          return null
      }
    } catch (error) {
      console.error('Error getting recipient address:', error)
      return null
    }
  }

  private static async updateDeliveryStatus(
    deliveryLogId: string, 
    status: 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = { status, updatedAt: new Date() }
      
      if (status === 'sent') updateData.sentAt = new Date()
      if (status === 'delivered') updateData.deliveredAt = new Date()
      if (status === 'failed') {
        updateData.failedAt = new Date()
        updateData.errorMessage = errorMessage
      }

      await db
        .update(notificationDeliveryLog)
        .set(updateData)
        .where(eq(notificationDeliveryLog.id, deliveryLogId))
    } catch (error) {
      console.error('Error updating delivery status:', error)
    }
  }

  private static async scheduleForLater(notificationId: string, channel: NotificationChannel): Promise<void> {
    // TODO: Implement scheduling logic for quiet hours
    console.log(`Scheduling notification ${notificationId} for later delivery via ${channel}`)
  }

  private static async sendEmailNotification(notification: Notification, deliveryLogId: string): Promise<void> {
    try {
      // Get recipient email address
      const recipientEmail = await this.getRecipientAddress(notification.recipientId, 'email')
      
      if (!recipientEmail) {
        console.warn(`No email address found for recipient: ${notification.recipientId}`)
        await this.updateDeliveryStatus(deliveryLogId, 'failed', 'No email address found for recipient')
        return
      }

      // Import EmailService dynamically to avoid circular imports
      const { EmailService } = await import('./emailService')
      
      // Send notification email using existing EmailService
      const emailResult = await EmailService.sendCustomEmail({
        to: recipientEmail,
        subject: notification.title,
        html: this.generateNotificationEmailHTML(notification),
        text: this.generateNotificationEmailText(notification)
      })

      if (emailResult.success) {
        console.log(`✅ Email notification sent successfully: ${notification.title}`)
        await this.updateDeliveryStatus(deliveryLogId, 'delivered')
      } else {
        console.error(`❌ Failed to send email notification: ${emailResult.error}`)
        await this.updateDeliveryStatus(deliveryLogId, 'failed', emailResult.error || 'Unknown email error')
      }
    } catch (error) {
      console.error('❌ Error in sendEmailNotification:', error)
      await this.updateDeliveryStatus(deliveryLogId, 'failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private static async sendSMSNotification(notification: Notification, deliveryLogId: string): Promise<void> {
    try {
      // TODO: Implement SMS sending via Twilio or similar
      console.log(`Sending SMS notification: ${notification.title}`)
      await this.updateDeliveryStatus(deliveryLogId, 'delivered')
    } catch (error) {
      await this.updateDeliveryStatus(deliveryLogId, 'failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private static async sendPushNotification(notification: Notification, deliveryLogId: string): Promise<void> {
    try {
      // TODO: Implement push notifications via web push API or Firebase
      console.log(`Sending push notification: ${notification.title}`)
      await this.updateDeliveryStatus(deliveryLogId, 'delivered')
    } catch (error) {
      await this.updateDeliveryStatus(deliveryLogId, 'failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // ================================
  // SCHEDULED NOTIFICATIONS
  // ================================

  /**
   * Process scheduled notifications that are due
   */
  static async processScheduledNotifications(): Promise<void> {
    try {
      const dueNotifications = await db
        .select()
        .from(notifications)
        .where(
          and(
            lt(notifications.scheduledFor, new Date()),
            eq(notifications.isRead, false)
          )
        )

      for (const notification of dueNotifications) {
        await this.processNotificationDelivery(notification.id)
      }
    } catch (error) {
      console.error('Error processing scheduled notifications:', error)
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<void> {
    try {
      await db
        .delete(notifications)
        .where(
          and(
            lt(notifications.expiresAt, new Date()),
            eq(notifications.isArchived, true)
          )
        )
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error)
    }
  }

  /**
   * Generate HTML email content for notifications
   */
  private static generateNotificationEmailHTML(notification: Notification): string {
    const metadata = notification.metadata as Record<string, unknown> || {}
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${notification.title}</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
          
          ${metadata.taskId ? `
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #667eea;">Task Details</h3>
            ${metadata.taskTitle ? `<p style="margin: 5px 0;"><strong>Task:</strong> ${metadata.taskTitle}</p>` : ''}
            ${metadata.boardName ? `<p style="margin: 5px 0;"><strong>Board:</strong> ${metadata.boardName}</p>` : ''}
            ${metadata.changes ? `<p style="margin: 5px 0;"><strong>Changes:</strong> ${Array.isArray(metadata.changes) ? metadata.changes.join(', ') : metadata.changes}</p>` : ''}
          </div>
          ` : ''}
          
          ${notification.actionUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${notification.actionUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">${notification.actionLabel || 'View Details'}</a>
          </div>
          ` : ''}
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            This is an automated notification from your MYDV dashboard.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate plain text email content for notifications
   */
  private static generateNotificationEmailText(notification: Notification): string {
    const metadata = notification.metadata as Record<string, unknown> || {}
    
    let text = `${notification.title}\n\n${notification.message}\n\n`
    
    if (metadata.taskId) {
      text += 'Task Details:\n'
      if (metadata.taskTitle) text += `Task: ${metadata.taskTitle}\n`
      if (metadata.boardName) text += `Board: ${metadata.boardName}\n`
      if (metadata.changes) text += `Changes: ${Array.isArray(metadata.changes) ? metadata.changes.join(', ') : metadata.changes}\n`
      text += '\n'
    }
    
    if (notification.actionUrl) {
      text += `${notification.actionLabel || 'View Details'}: ${notification.actionUrl}\n\n`
    }
    
    text += 'This is an automated notification from your MYDV dashboard.\n\n'
    text += `© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business`
    
    return text
  }
}

// ================================
// NOTIFICATION HELPER FUNCTIONS
// ================================

/**
 * Quick notification creation functions for common use cases
 */

export const NotificationHelpers = {
  // Stock notifications
  stockSold: (recipientId: string, stockId: string, registration: string, price: number) =>
    NotificationService.createNotification({
      recipientId,
      type: 'stock_sold',
      title: 'Vehicle Sold',
      message: `${registration} has been sold for £${price.toLocaleString()}`,
      priority: 'high',
      entityType: 'stock',
      entityId: stockId,
      actionUrl: `/inventory/${stockId}`,
      actionLabel: 'View Details'
    }),

  stockAdded: (recipientId: string, stockId: string, make: string, model: string) =>
    NotificationService.createNotification({
      recipientId,
      type: 'stock_added',
      title: 'New Vehicle Added',
      message: `${make} ${model} has been added to your inventory`,
      priority: 'medium',
      entityType: 'stock',
      entityId: stockId,
      actionUrl: `/inventory/${stockId}`,
      actionLabel: 'View Vehicle'
    }),

  // Task notifications
  taskAssigned: (recipientId: string, taskId: string, taskTitle: string, assignedBy: string) =>
    NotificationService.createNotification({
      recipientId,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned: ${taskTitle}`,
      priority: 'medium',
      entityType: 'task',
      entityId: taskId,
      senderId: assignedBy,
      actionUrl: `/kanban?task=${taskId}`,
      actionLabel: 'View Task'
    }),

  // Team notifications
  teamMemberJoined: (recipientId: string, memberName: string, role: string) =>
    NotificationService.createNotification({
      recipientId,
      type: 'team_member_joined',
      title: 'New Team Member',
      message: `${memberName} has joined your team as ${role}`,
      priority: 'medium',
      actionUrl: '/admin/dashboard',
      actionLabel: 'Manage Team'
    }),

  // System notifications
  systemAnnouncement: (recipientIds: string[], title: string, message: string) =>
    NotificationService.createBulkNotifications({
      recipientIds,
      type: 'system_announcement',
      title,
      message,
      priority: 'medium',
      channels: ['in_app', 'email']
    })
}
