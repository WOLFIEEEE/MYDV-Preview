import { Resend } from 'resend'

// Initialize Resend lazily
let resend: Resend | null = null

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || 'noreply@mydv.co.uk',
  replyTo: process.env.RESEND_REPLY_TO || 'support@mydv.co.uk',
  defaultSubjectPrefix: '[MYDV] '
}

// Email types for tracking and templates
export type EmailType = 
  // Team Management
  | 'team_invitation'
  | 'team_welcome'
  | 'team_role_changed'
  | 'team_member_removed'
  // Sales & Customer
  | 'customer_inquiry'
  | 'payment_reminder'
  | 'invoice_generated'
  | 'lead_assigned'
  | 'follow_up_required'
  // Join Requests
  | 'join_request_admin_notification'
  | 'join_request_confirmation'
  | 'join_request_approved'
  | 'join_request_rejected'
  | 'join_request_status_update'
  // General
  | 'custom'

export interface EmailData {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  type: EmailType
  templateData?: Record<string, any>
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export class EmailService {
  
  /**
   * Send an email using Resend
   */
  static async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not configured - email not sent')
        return { success: false, error: 'Email service not configured' }
      }

      // Generate email content based on type
      const template = await this.getEmailTemplate(emailData.type, emailData.templateData || {})
      
      const emailPayload = {
        from: EMAIL_CONFIG.from,
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        cc: emailData.cc,
        bcc: emailData.bcc,
        reply_to: EMAIL_CONFIG.replyTo,
        subject: emailData.subject.startsWith(EMAIL_CONFIG.defaultSubjectPrefix) 
          ? emailData.subject 
          : `${EMAIL_CONFIG.defaultSubjectPrefix}${emailData.subject}`,
        html: template.html,
        text: template.text,
        attachments: emailData.attachments
      }

      const result = await getResendClient().emails.send(emailPayload)

      if (result.error) {
        console.error('❌ Resend error:', result.error)
        return { success: false, error: result.error.message }
      }

      console.log('✅ Email sent successfully:', result.data?.id)
      return { success: true, messageId: result.data?.id }

    } catch (error) {
      console.error('❌ Email service error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Send team invitation email
   */
  static async sendTeamInvitation(data: {
    to: string
    inviterName: string
    dealershipName: string
    role: string
    inviteUrl: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `You've been invited to join ${data.dealershipName}`,
      type: 'team_invitation',
      templateData: data
    })
  }

  /**
   * Send team welcome email
   */
  static async sendTeamWelcome(data: {
    to: string
    userName: string
    dealershipName: string
    role: string
    dashboardUrl: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `Welcome to ${data.dealershipName}!`,
      type: 'team_welcome',
      templateData: data
    })
  }

  /**
   * Send role change notification
   */
  static async sendRoleChanged(data: {
    to: string
    userName: string
    oldRole: string
    newRole: string
    changedBy: string
    dealershipName: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `Your role has been updated`,
      type: 'team_role_changed',
      templateData: data
    })
  }

  /**
   * Send customer inquiry notification
   */
  static async sendCustomerInquiry(data: {
    to: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    vehicleDetails?: string
    inquiryMessage: string
    inquiryDate: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `New Customer Inquiry from ${data.customerName}`,
      type: 'customer_inquiry',
      templateData: data
    })
  }

  /**
   * Send payment reminder
   */
  static async sendPaymentReminder(data: {
    to: string
    customerName: string
    invoiceNumber: string
    amount: string
    dueDate: string
    paymentUrl?: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `Payment Reminder - Invoice ${data.invoiceNumber}`,
      type: 'payment_reminder',
      templateData: data
    })
  }

  /**
   * Send invoice generated notification
   */
  static async sendInvoiceGenerated(data: {
    to: string
    customerName: string
    invoiceNumber: string
    amount: string
    vehicleDetails?: string
    invoiceUrl?: string
    attachments?: Array<{
      filename: string
      content: Buffer | string
      contentType?: string
    }>
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `Invoice ${data.invoiceNumber} - ${data.amount}`,
      type: 'invoice_generated',
      templateData: data,
      attachments: data.attachments
    })
  }

  /**
   * Send lead assignment notification
   */
  static async sendLeadAssigned(data: {
    to: string
    assigneeName: string
    customerName: string
    leadSource: string
    vehicleInterest?: string
    assignedBy: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `New Lead Assigned: ${data.customerName}`,
      type: 'lead_assigned',
      templateData: data
    })
  }

  /**
   * Send join request admin notification
   */
  static async sendJoinRequestAdminNotification(data: {
    to: string
    applicantName: string
    applicantEmail: string
    applicantPhone?: string
    dealershipName: string
    dealershipType: string
    numberOfVehicles?: string
    currentSystem?: string
    inquiryType: string
    subject?: string
    message: string
    preferredContact: string
    submissionId: number
    submissionDate: string
    adminDashboardUrl: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `New Join Request: ${data.dealershipName}`,
      type: 'join_request_admin_notification',
      templateData: data
    })
  }

  /**
   * Send join request confirmation to applicant
   */
  static async sendJoinRequestConfirmation(data: {
    to: string
    applicantName: string
    dealershipName: string
    submissionId: number
    inquiryType: string
    submissionDate: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `Application Received - ${data.dealershipName}`,
      type: 'join_request_confirmation',
      templateData: data
    })
  }

  /**
   * Send join request approval notification
   */
  static async sendJoinRequestApproved(data: {
    to: string
    applicantName: string
    dealershipName: string
    inviteUrl: string
    adminName: string
    approvalDate: string
    assignmentDetails?: {
      advertisementIds?: string[]
      primaryAdvertisementId?: string
      autotraderKey?: string
      autotraderSecret?: string
      dvlaApiKey?: string
      autotraderIntegrationId?: string
      companyName?: string
      companyLogo?: string
    }
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `Application Approved - Welcome to MYDV!`,
      type: 'join_request_approved',
      templateData: data
    })
  }

  /**
   * Send join request rejection notification
   */
  static async sendJoinRequestRejected(data: {
    to: string
    applicantName: string
    dealershipName: string
    rejectionReason?: string
    adminName: string
    rejectionDate: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `Application Update - ${data.dealershipName}`,
      type: 'join_request_rejected',
      templateData: data
    })
  }

  /**
   * Send join request status update
   */
  static async sendJoinRequestStatusUpdate(data: {
    to: string
    applicantName: string
    dealershipName: string
    oldStatus: string
    newStatus: string
    statusMessage?: string
    adminName: string
    updateDate: string
  }) {
    return this.sendEmail({
      to: data.to,
      subject: `Application Status Update - ${data.dealershipName}`,
      type: 'join_request_status_update',
      templateData: data
    })
  }

  /**
   * Send custom email
   */
  static async sendCustomEmail(data: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    cc?: string | string[]
    bcc?: string | string[]
    attachments?: Array<{
      filename: string
      content: Buffer | string
      contentType?: string
    }>
  }) {
    return this.sendEmail({
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      type: 'custom',
      templateData: {
        html: data.html,
        text: data.text
      },
      attachments: data.attachments
    })
  }

  /**
   * Get email template based on type
   */
  private static async getEmailTemplate(type: EmailType, data: Record<string, any>): Promise<EmailTemplate> {
    switch (type) {
      case 'team_invitation':
        return this.getTeamInvitationTemplate(data)
      
      case 'team_welcome':
        return this.getTeamWelcomeTemplate(data)
      
      case 'team_role_changed':
        return this.getRoleChangedTemplate(data)
      
      case 'customer_inquiry':
        return this.getCustomerInquiryTemplate(data)
      
      case 'payment_reminder':
        return this.getPaymentReminderTemplate(data)
      
      case 'invoice_generated':
        return this.getInvoiceGeneratedTemplate(data)
      
      case 'lead_assigned':
        return this.getLeadAssignedTemplate(data)
      
      case 'join_request_admin_notification':
        return this.getJoinRequestAdminNotificationTemplate(data)
      
      case 'join_request_confirmation':
        return this.getJoinRequestConfirmationTemplate(data)
      
      case 'join_request_approved':
        return this.getJoinRequestApprovedTemplate(data)
      
      case 'join_request_rejected':
        return this.getJoinRequestRejectedTemplate(data)
      
      case 'join_request_status_update':
        return this.getJoinRequestStatusUpdateTemplate(data)
      
      case 'custom':
        return {
          subject: '',
          html: data.html || '',
          text: data.text || ''
        }
      
      default:
        return {
          subject: '',
          html: '<p>Email content not available</p>',
          text: 'Email content not available'
        }
    }
  }

  /**
   * Team invitation email template
   */
  private static getTeamInvitationTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hi there!</p>
          
          <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.dealershipName}</strong> as a <strong>${data.role}</strong>.</p>
          
          <p>MYDV is a comprehensive dealership management platform that will help you manage inventory, customers, tasks, and more efficiently.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.inviteUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Accept Invitation</a>
          </div>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            If you have any questions, please contact your team administrator or reply to this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
You're Invited to Join ${data.dealershipName}!

Hi there!

${data.inviterName} has invited you to join ${data.dealershipName} as a ${data.role}.

MYDV is a comprehensive dealership management platform that will help you manage inventory, customers, tasks, and more efficiently.

To accept this invitation, please visit: ${data.inviteUrl}

If you have any questions, please contact your team administrator.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `You've been invited to join ${data.dealershipName}`,
      html,
      text
    }
  }

  /**
   * Team welcome email template
   */
  private static getTeamWelcomeTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to the Team</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${data.dealershipName}!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hi ${data.userName}!</p>
          
          <p>Welcome to the team! We're excited to have you join us as a <strong>${data.role}</strong>.</p>
          
          <p>Here's what you can do next:</p>
          <ul>
            <li>Access your dashboard and explore the platform</li>
            <li>Complete your profile setup</li>
            <li>Familiarize yourself with the inventory management tools</li>
            <li>Connect with your team members</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
          </div>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            If you need any help getting started, don't hesitate to reach out to your team administrator.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
Welcome to ${data.dealershipName}!

Hi ${data.userName}!

Welcome to the team! We're excited to have you join us as a ${data.role}.

Here's what you can do next:
- Access your dashboard and explore the platform
- Complete your profile setup  
- Familiarize yourself with the inventory management tools
- Connect with your team members

Visit your dashboard: ${data.dashboardUrl}

If you need any help getting started, don't hesitate to reach out to your team administrator.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `Welcome to ${data.dealershipName}!`,
      html,
      text
    }
  }

  /**
   * Role changed email template
   */
  private static getRoleChangedTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Role Updated</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ffc107 0%, #ff8c00 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Role Updated</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hi ${data.userName}!</p>
          
          <p>Your role at <strong>${data.dealershipName}</strong> has been updated by <strong>${data.changedBy}</strong>.</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0;"><strong>Previous Role:</strong> ${data.oldRole}</p>
            <p style="margin: 10px 0 0 0;"><strong>New Role:</strong> ${data.newRole}</p>
          </div>
          
          <p>This change may affect your access permissions and available features. Please log in to see your updated dashboard.</p>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            If you have any questions about this change, please contact your administrator.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
Role Updated

Hi ${data.userName}!

Your role at ${data.dealershipName} has been updated by ${data.changedBy}.

Previous Role: ${data.oldRole}
New Role: ${data.newRole}

This change may affect your access permissions and available features. Please log in to see your updated dashboard.

If you have any questions about this change, please contact your administrator.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: 'Your role has been updated',
      html,
      text
    }
  }

  /**
   * Customer inquiry email template
   */
  private static getCustomerInquiryTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Customer Inquiry</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Customer Inquiry</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">You have a new customer inquiry!</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #007bff;">Customer Details</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${data.customerName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${data.customerEmail}</p>
            ${data.customerPhone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Inquiry Date:</strong> ${data.inquiryDate}</p>
          </div>
          
          ${data.vehicleDetails ? `
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #28a745;">Vehicle Interest</h3>
            <p style="margin: 0;">${data.vehicleDetails}</p>
          </div>
          ` : ''}
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #ffc107;">Message</h3>
            <p style="margin: 0; white-space: pre-wrap;">${data.inquiryMessage}</p>
          </div>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            Please respond to this inquiry promptly to maintain excellent customer service.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
New Customer Inquiry

You have a new customer inquiry!

Customer Details:
Name: ${data.customerName}
Email: ${data.customerEmail}
${data.customerPhone ? `Phone: ${data.customerPhone}` : ''}
Inquiry Date: ${data.inquiryDate}

${data.vehicleDetails ? `Vehicle Interest: ${data.vehicleDetails}` : ''}

Message:
${data.inquiryMessage}

Please respond to this inquiry promptly to maintain excellent customer service.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `New Customer Inquiry from ${data.customerName}`,
      html,
      text
    }
  }

  /**
   * Payment reminder email template
   */
  private static getPaymentReminderTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Reminder</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${data.customerName},</p>
          
          <p>This is a friendly reminder that your payment is due.</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #dc3545;">Payment Details</h3>
            <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
            <p style="margin: 5px 0;"><strong>Amount Due:</strong> ${data.amount}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
          </div>
          
          ${data.paymentUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.paymentUrl}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Make Payment</a>
          </div>
          ` : ''}
          
          <p>If you have already made this payment, please disregard this reminder. If you have any questions, please contact us.</p>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            Thank you for your business!
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
Payment Reminder

Dear ${data.customerName},

This is a friendly reminder that your payment is due.

Payment Details:
Invoice Number: ${data.invoiceNumber}
Amount Due: ${data.amount}
Due Date: ${data.dueDate}

${data.paymentUrl ? `Make payment at: ${data.paymentUrl}` : ''}

If you have already made this payment, please disregard this reminder. If you have any questions, please contact us.

Thank you for your business!

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `Payment Reminder - Invoice ${data.invoiceNumber}`,
      html,
      text
    }
  }

  /**
   * Invoice generated email template
   */
  private static getInvoiceGeneratedTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${data.invoiceNumber || 'Invoice'}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Invoice ${data.invoiceNumber || ''}</h1>
          <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">From ${data.companyName || 'Your Dealership'}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${data.customerName || 'Customer'},</p>
          
          <p>Please find attached your invoice for the vehicle purchase. The PDF contains all the details of your transaction.</p>
          
          ${data.message ? `
          <div style="background: #fff; padding: 15px; border-radius: 5px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${data.message}"</p>
          </div>
          ` : ''}
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #2563eb;">Invoice Summary</h3>
            <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${data.invoiceNumber || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${data.vehicleInfo || 'Vehicle Details'}</p>
            <p style="margin: 5px 0;"><strong>Sale Price:</strong> £${data.salePrice ? Number(data.salePrice).toFixed(2) : '0.00'}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>📎 Attachment:</strong> Your complete invoice is attached as a PDF file to this email.</p>
          </div>
          
          <p>Please review the invoice and proceed with payment at your earliest convenience.</p>
          
          ${data.senderName ? `
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            ${data.senderName}<br>
            ${data.companyName || 'Your Dealership'}
          </p>
          ` : ''}
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            If you have any questions about this invoice, please contact us.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
Invoice ${data.invoiceNumber || ''} - From ${data.companyName || 'Your Dealership'}

Dear ${data.customerName || 'Customer'},

Please find attached your invoice for the vehicle purchase. The PDF contains all the details of your transaction.

${data.message ? `Message: "${data.message}"` : ''}

Invoice Summary:
- Invoice Number: ${data.invoiceNumber || 'N/A'}
- Vehicle: ${data.vehicleInfo || 'Vehicle Details'}
- Sale Price: £${data.salePrice ? Number(data.salePrice).toFixed(2) : '0.00'}

📎 Attachment: Your complete invoice is attached as a PDF file to this email.

Please review the invoice and proceed with payment at your earliest convenience.

${data.senderName ? `Best regards,
${data.senderName}
${data.companyName || 'Your Dealership'}` : ''}

If you have any questions about this invoice, please contact us.

${data.invoiceUrl ? `View invoice at: ${data.invoiceUrl}` : ''}

Please review the invoice and proceed with payment at your earliest convenience.

If you have any questions about this invoice, please contact us.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `Invoice ${data.invoiceNumber} - ${data.amount}`,
      html,
      text
    }
  }

  /**
   * Lead assigned email template
   */
  private static getLeadAssignedTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Lead Assigned</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6f42c1 0%, #5a2d91 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Lead Assigned</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hi ${data.assigneeName}!</p>
          
          <p>A new lead has been assigned to you by <strong>${data.assignedBy}</strong>.</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #6f42c1; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #6f42c1;">Lead Details</h3>
            <p style="margin: 5px 0;"><strong>Customer:</strong> ${data.customerName}</p>
            <p style="margin: 5px 0;"><strong>Source:</strong> ${data.leadSource}</p>
            ${data.vehicleInterest ? `<p style="margin: 5px 0;"><strong>Vehicle Interest:</strong> ${data.vehicleInterest}</p>` : ''}
          </div>
          
          <p>Please follow up with this lead promptly to maximize conversion potential.</p>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            Good luck with your new lead!
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
New Lead Assigned

Hi ${data.assigneeName}!

A new lead has been assigned to you by ${data.assignedBy}.

Lead Details:
Customer: ${data.customerName}
Source: ${data.leadSource}
${data.vehicleInterest ? `Vehicle Interest: ${data.vehicleInterest}` : ''}

Please follow up with this lead promptly to maximize conversion potential.

Good luck with your new lead!

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `New Lead Assigned: ${data.customerName}`,
      html,
      text
    }
  }

  /**
   * Join request admin notification email template
   */
  private static getJoinRequestAdminNotificationTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Join Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚨 New Join Request</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">A new dealership has submitted a join request!</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #dc3545;">Applicant Details</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${data.applicantName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${data.applicantEmail}</p>
            ${data.applicantPhone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${data.applicantPhone}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Preferred Contact:</strong> ${data.preferredContact}</p>
            <p style="margin: 5px 0;"><strong>Submission Date:</strong> ${data.submissionDate}</p>
            <p style="margin: 5px 0;"><strong>Submission ID:</strong> #${data.submissionId}</p>
          </div>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #007bff;">Dealership Information</h3>
            <p style="margin: 5px 0;"><strong>Dealership Name:</strong> ${data.dealershipName}</p>
            <p style="margin: 5px 0;"><strong>Dealership Type:</strong> ${data.dealershipType}</p>
            <p style="margin: 5px 0;"><strong>Inquiry Type:</strong> ${data.inquiryType}</p>
            ${data.numberOfVehicles ? `<p style="margin: 5px 0;"><strong>Number of Vehicles:</strong> ${data.numberOfVehicles}</p>` : ''}
            ${data.currentSystem ? `<p style="margin: 5px 0;"><strong>Current System:</strong> ${data.currentSystem}</p>` : ''}
            ${data.subject ? `<p style="margin: 5px 0;"><strong>Subject:</strong> ${data.subject}</p>` : ''}
          </div>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #28a745;">Message</h3>
            <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.adminDashboardUrl}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Review Application</a>
          </div>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            Please review this application promptly and take appropriate action. You can approve, reject, or request more information from the admin dashboard.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
New Join Request - ${data.dealershipName}

A new dealership has submitted a join request!

Applicant Details:
Name: ${data.applicantName}
Email: ${data.applicantEmail}
${data.applicantPhone ? `Phone: ${data.applicantPhone}` : ''}
Preferred Contact: ${data.preferredContact}
Submission Date: ${data.submissionDate}
Submission ID: #${data.submissionId}

Dealership Information:
Dealership Name: ${data.dealershipName}
Dealership Type: ${data.dealershipType}
Inquiry Type: ${data.inquiryType}
${data.numberOfVehicles ? `Number of Vehicles: ${data.numberOfVehicles}` : ''}
${data.currentSystem ? `Current System: ${data.currentSystem}` : ''}
${data.subject ? `Subject: ${data.subject}` : ''}

Message:
${data.message}

Review Application: ${data.adminDashboardUrl}

Please review this application promptly and take appropriate action.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `New Join Request: ${data.dealershipName}`,
      html,
      text
    }
  }

  /**
   * Join request confirmation email template
   */
  private static getJoinRequestConfirmationTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Received</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Application Received</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${data.applicantName},</p>
          
          <p>Thank you for your interest in joining MYDV! We have successfully received your application for <strong>${data.dealershipName}</strong>.</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #28a745;">Application Summary</h3>
            <p style="margin: 5px 0;"><strong>Dealership:</strong> ${data.dealershipName}</p>
            <p style="margin: 5px 0;"><strong>Inquiry Type:</strong> ${data.inquiryType}</p>
            <p style="margin: 5px 0;"><strong>Submission Date:</strong> ${data.submissionDate}</p>
            <p style="margin: 5px 0;"><strong>Reference ID:</strong> #${data.submissionId}</p>
          </div>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #007bff;">What Happens Next?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Our team will review your application within 24-48 hours</li>
              <li>We may contact you for additional information if needed</li>
              <li>You'll receive an email notification once your application is processed</li>
              <li>If approved, you'll receive an invitation to set up your account</li>
            </ul>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #856404;">Important Information</h3>
            <p style="margin: 0;">Please keep your reference ID <strong>#${data.submissionId}</strong> for your records. You can reference this number in any future communications with our team.</p>
          </div>
          
          <p>If you have any urgent questions or need to update your application, please don't hesitate to contact our support team.</p>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            Thank you for choosing MYDV to fuel your dealership business!
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
Application Received - ${data.dealershipName}

Dear ${data.applicantName},

Thank you for your interest in joining MYDV! We have successfully received your application for ${data.dealershipName}.

Application Summary:
Dealership: ${data.dealershipName}
Inquiry Type: ${data.inquiryType}
Submission Date: ${data.submissionDate}
Reference ID: #${data.submissionId}

What Happens Next?
- Our team will review your application within 24-48 hours
- We may contact you for additional information if needed
- You'll receive an email notification once your application is processed
- If approved, you'll receive an invitation to set up your account

Important Information:
Please keep your reference ID #${data.submissionId} for your records. You can reference this number in any future communications with our team.

If you have any urgent questions or need to update your application, please don't hesitate to contact our support team.

Thank you for choosing MYDV to fuel your dealership business!

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `Application Received - ${data.dealershipName}`,
      html,
      text
    }
  }

  /**
   * Join request approved email template
   */
  private static getJoinRequestApprovedTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Approved</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Application Approved!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Congratulations ${data.applicantName}!</p>
          
          <p>We're excited to inform you that your application for <strong>${data.dealershipName}</strong> has been approved by ${data.adminName}!</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #155724;">Welcome to MYDV!</h3>
            <p style="margin: 0;">You're now part of the MYDV family. Our comprehensive dealership management platform will help you streamline your operations, manage inventory, track sales, and grow your business.</p>
          </div>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #007bff;">Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Click the invitation link below to set up your account</li>
              <li>Complete your profile and dealership information</li>
              <li>Explore the platform features and tools</li>
              <li>Start managing your inventory and customers</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.inviteUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Set Up Your Account</a>
          </div>
          
          ${data.assignmentDetails ? `
          <div style="background: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #856404;">Your Account Details</h3>
            ${data.assignmentDetails.companyName ? `<p style="margin: 5px 0;"><strong>Company Name:</strong> ${data.assignmentDetails.companyName}</p>` : ''}
            ${data.assignmentDetails.primaryAdvertisementId ? `<p style="margin: 5px 0;"><strong>Primary Advertisement ID:</strong> ${data.assignmentDetails.primaryAdvertisementId}</p>` : ''}
            ${data.assignmentDetails.advertisementIds && data.assignmentDetails.advertisementIds.length > 0 ? `<p style="margin: 5px 0;"><strong>Advertisement IDs:</strong> ${data.assignmentDetails.advertisementIds.join(', ')}</p>` : ''}
            ${data.assignmentDetails.autotraderIntegrationId ? `<p style="margin: 5px 0;"><strong>AutoTrader Integration ID:</strong> ${data.assignmentDetails.autotraderIntegrationId}</p>` : ''}
            ${data.assignmentDetails.autotraderKey ? `<p style="margin: 5px 0;"><strong>AutoTrader API Key:</strong> ${data.assignmentDetails.autotraderKey.substring(0, 8)}...</p>` : ''}
            ${data.assignmentDetails.dvlaApiKey ? `<p style="margin: 5px 0;"><strong>DVLA API Key:</strong> ${data.assignmentDetails.dvlaApiKey.substring(0, 8)}...</p>` : ''}
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #856404;"><em>Keep these details secure and accessible for your account setup.</em></p>
          </div>
          ` : ''}
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #007bff;">What You Get</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Complete inventory management system</li>
              <li>Customer relationship management tools</li>
              <li>Sales tracking and analytics</li>
              <li>AutoTrader integration with your assigned keys</li>
              <li>DVLA vehicle data access</li>
              <li>Team collaboration features</li>
              <li>Mobile-friendly dashboard</li>
              <li>Dedicated support from our team</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">If you have any questions during the setup process, our support team is here to help!</p>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            <strong>Approved by:</strong> ${data.adminName}<br>
            <strong>Approval Date:</strong> ${data.approvalDate}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
Application Approved - Welcome to MYDV!

Congratulations ${data.applicantName}!

We're excited to inform you that your application for ${data.dealershipName} has been approved by ${data.adminName}!

Welcome to MYDV!
You're now part of the MYDV family. Our comprehensive dealership management platform will help you streamline your operations, manage inventory, track sales, and grow your business.

Next Steps:
1. Click the invitation link below to set up your account
2. Complete your profile and dealership information
3. Explore the platform features and tools
4. Start managing your inventory and customers

Set Up Your Account: ${data.inviteUrl}

${data.assignmentDetails ? `Your Account Details:
${data.assignmentDetails.companyName ? `Company Name: ${data.assignmentDetails.companyName}` : ''}
${data.assignmentDetails.primaryAdvertisementId ? `Primary Advertisement ID: ${data.assignmentDetails.primaryAdvertisementId}` : ''}
${data.assignmentDetails.advertisementIds && data.assignmentDetails.advertisementIds.length > 0 ? `Advertisement IDs: ${data.assignmentDetails.advertisementIds.join(', ')}` : ''}
${data.assignmentDetails.autotraderIntegrationId ? `AutoTrader Integration ID: ${data.assignmentDetails.autotraderIntegrationId}` : ''}
${data.assignmentDetails.autotraderKey ? `AutoTrader API Key: ${data.assignmentDetails.autotraderKey.substring(0, 8)}...` : ''}
${data.assignmentDetails.dvlaApiKey ? `DVLA API Key: ${data.assignmentDetails.dvlaApiKey.substring(0, 8)}...` : ''}

Keep these details secure and accessible for your account setup.

` : ''}What You Get:
- Complete inventory management system
- Customer relationship management tools
- Sales tracking and analytics
- AutoTrader integration with your assigned keys
- DVLA vehicle data access
- Team collaboration features
- Mobile-friendly dashboard
- Dedicated support from our team

If you have any questions during the setup process, our support team is here to help!

Approved by: ${data.adminName}
Approval Date: ${data.approvalDate}

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `Application Approved - Welcome to MYDV!`,
      html,
      text
    }
  }

  /**
   * Join request rejected email template
   */
  private static getJoinRequestRejectedTemplate(data: any): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Application Update</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${data.applicantName},</p>
          
          <p>Thank you for your interest in joining MYDV and for taking the time to submit your application for <strong>${data.dealershipName}</strong>.</p>
          
          <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
          
          ${data.rejectionReason ? `
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #6c757d; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #6c757d;">Additional Information</h3>
            <p style="margin: 0;">${data.rejectionReason}</p>
          </div>
          ` : ''}
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #007bff;">Future Opportunities</h3>
            <p style="margin: 0;">This decision doesn't prevent you from reapplying in the future. We encourage you to address any concerns mentioned above and consider submitting a new application when circumstances change.</p>
          </div>
          
          <p>We appreciate your understanding and wish you success in your business endeavors.</p>
          
          <p>If you have any questions about this decision or would like guidance on future applications, please don't hesitate to contact our support team.</p>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            <strong>Reviewed by:</strong> ${data.adminName}<br>
            <strong>Decision Date:</strong> ${data.rejectionDate}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
Application Update - ${data.dealershipName}

Dear ${data.applicantName},

Thank you for your interest in joining MYDV and for taking the time to submit your application for ${data.dealershipName}.

After careful review, we regret to inform you that we are unable to approve your application at this time.

${data.rejectionReason ? `Additional Information:\n${data.rejectionReason}\n\n` : ''}

Future Opportunities:
This decision doesn't prevent you from reapplying in the future. We encourage you to address any concerns mentioned above and consider submitting a new application when circumstances change.

We appreciate your understanding and wish you success in your business endeavors.

If you have any questions about this decision or would like guidance on future applications, please don't hesitate to contact our support team.

Reviewed by: ${data.adminName}
Decision Date: ${data.rejectionDate}

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `Application Update - ${data.dealershipName}`,
      html,
      text
    }
  }

  /**
   * Join request status update email template
   */
  private static getJoinRequestStatusUpdateTemplate(data: any): EmailTemplate {
    const statusColors: Record<string, string> = {
      'pending': '#ffc107',
      'reviewing': '#007bff',
      'approved': '#28a745',
      'rejected': '#dc3545',
      'contacted': '#6f42c1'
    }

    const statusColor = statusColors[data.newStatus] || '#6c757d'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Status Update</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${data.applicantName},</p>
          
          <p>We wanted to update you on the status of your application for <strong>${data.dealershipName}</strong>.</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: ${statusColor};">Status Change</h3>
            <p style="margin: 5px 0;"><strong>Previous Status:</strong> ${data.oldStatus}</p>
            <p style="margin: 5px 0;"><strong>New Status:</strong> ${data.newStatus}</p>
            <p style="margin: 5px 0;"><strong>Updated by:</strong> ${data.adminName}</p>
            <p style="margin: 5px 0;"><strong>Update Date:</strong> ${data.updateDate}</p>
          </div>
          
          ${data.statusMessage ? `
          <div style="background: #e7f3ff; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #007bff;">Additional Information</h3>
            <p style="margin: 0;">${data.statusMessage}</p>
          </div>
          ` : ''}
          
          <p>We'll continue to keep you updated as your application progresses through our review process.</p>
          
          <p>If you have any questions about this status update, please don't hesitate to contact our support team.</p>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            Thank you for your patience during the review process.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
        </div>
      </body>
      </html>
    `

    const text = `
Application Status Update - ${data.dealershipName}

Dear ${data.applicantName},

We wanted to update you on the status of your application for ${data.dealershipName}.

Status Change:
Previous Status: ${data.oldStatus}
New Status: ${data.newStatus}
Updated by: ${data.adminName}
Update Date: ${data.updateDate}

${data.statusMessage ? `Additional Information:\n${data.statusMessage}\n\n` : ''}

We'll continue to keep you updated as your application progresses through our review process.

If you have any questions about this status update, please don't hesitate to contact our support team.

Thank you for your patience during the review process.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
    `

    return {
      subject: `Application Status Update - ${data.dealershipName}`,
      html,
      text
    }
  }
}
