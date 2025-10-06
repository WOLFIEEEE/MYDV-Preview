import { NextRequest, NextResponse } from 'next/server';
import { createContactSubmission } from '@/lib/database';
import { EmailService } from '@/lib/emailService';
import { NotificationService } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Contact request API called');
    
    // Parse request body
    const body = await request.json();
    const {
      name,
      email,
      company,
      phone,
      message,
      inquiryType = 'general'
    } = body;
    
    console.log('📋 Contact request data:', {
      name,
      email,
      company,
      inquiryType,
      timestamp: new Date().toISOString()
    });
    
    // Validate required fields
    if (!name || !email || !message) {
      console.error('❌ Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, email, and message are required'
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format');
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 });
    }
    
    // Create contact submission in database
    console.log('🔄 Creating contact submission...');
    const submissionResult = await createContactSubmission({
      name,
      email,
      company: company || null,
      phone: phone || null,
      message,
      inquiryType,
    });
    
    if (!submissionResult.success) {
      console.error('❌ Failed to create contact submission:', submissionResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to submit contact form'
      }, { status: 500 });
    }
    
    console.log('✅ Contact submission created:', submissionResult.data?.id);
    
    // Get admin emails for notifications
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails configured in NEXT_PUBLIC_ADMIN_EMAILS');
    } else {
      console.log(`📧 Sending notifications to ${adminEmails.length} admin(s):`, adminEmails);
      
      // Send email notifications to all admins
      const adminEmailPromises = adminEmails.map(async (adminEmail) => {
        try {
          return await EmailService.sendCustomEmail({
            to: adminEmail,
            subject: `New Contact Inquiry from ${name}`,
            html: generateContactInquiryEmailHTML({
              customerName: name,
              customerEmail: email,
              customerPhone: phone,
              company,
              inquiryMessage: message,
              inquiryType,
              inquiryDate: new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              submissionId: submissionResult.data!.id,
              adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/dashboard`
            }),
            text: generateContactInquiryEmailText({
              customerName: name,
              customerEmail: email,
              customerPhone: phone,
              company,
              inquiryMessage: message,
              inquiryType,
              inquiryDate: new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              submissionId: submissionResult.data!.id,
              adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/dashboard`
            })
          });
        } catch (error) {
          console.error(`❌ Failed to send admin notification to ${adminEmail}:`, error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });
      
      const adminEmailResults = await Promise.allSettled(adminEmailPromises);
      
      const successfulAdminEmails = adminEmailResults.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      const failedAdminEmails = adminEmailResults.length - successfulAdminEmails;
      
      console.log(`📧 Admin notification emails: ${successfulAdminEmails} sent, ${failedAdminEmails} failed`);

      // Create in-app notifications for admins
      try {
        console.log('🔔 Creating in-app notifications for admins...');
        
        // Get all admin user IDs (we'll use their email addresses as identifiers)
        const adminNotificationPromises = adminEmails.map(async (adminEmail) => {
          try {
            // Create notification using email as recipient identifier
            // The NotificationService will resolve this to the correct admin user
            return await NotificationService.createNotification({
              recipientId: adminEmail, // Will be resolved by the service
              type: 'contact_inquiry',
              title: `New Contact Inquiry from ${name}`,
              message: `${name} ${company ? `from ${company}` : ''} has submitted a contact inquiry. Click to review and respond.`,
              priority: 'medium',
              entityType: 'contact_submission',
              entityId: submissionResult.data!.id.toString(),
              actionUrl: `/admin/dashboard?tab=contacts&highlight=${submissionResult.data!.id}`,
              actionLabel: 'Review Inquiry',
              channels: ['in_app', 'email'],
              metadata: {
                customerName: name,
                customerEmail: email,
                company,
                inquiryType,
                submissionId: submissionResult.data!.id
              }
            });
          } catch (error) {
            console.error(`❌ Failed to create notification for admin ${adminEmail}:`, error);
            return null;
          }
        });

        const notificationResults = await Promise.allSettled(adminNotificationPromises);
        const successfulNotifications = notificationResults.filter(result => 
          result.status === 'fulfilled' && result.value !== null
        ).length;
        
        console.log(`🔔 In-app notifications: ${successfulNotifications} created`);
      } catch (error) {
        console.error('❌ Error creating in-app notifications:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Contact inquiry submitted successfully',
      data: {
        submissionId: submissionResult.data!.id,
        customerName: name,
        customerEmail: email,
        company,
        adminNotificationsSent: adminEmails.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing contact request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process contact request'
    }, { status: 500 });
  }
}

// Helper function to generate contact inquiry email HTML
function generateContactInquiryEmailHTML(data: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  company?: string;
  inquiryMessage: string;
  inquiryType: string;
  inquiryDate: string;
  submissionId: number;
  adminDashboardUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Inquiry</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔔 New Contact Inquiry</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 18px; margin-bottom: 20px;">You have received a new contact inquiry!</p>
        
        <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #007bff;">Customer Details</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${data.customerName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${data.customerEmail}</p>
          ${data.customerPhone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
          ${data.company ? `<p style="margin: 5px 0;"><strong>Company:</strong> ${data.company}</p>` : ''}
          <p style="margin: 5px 0;"><strong>Inquiry Type:</strong> ${data.inquiryType}</p>
          <p style="margin: 5px 0;"><strong>Inquiry Date:</strong> ${data.inquiryDate}</p>
          <p style="margin: 5px 0;"><strong>Submission ID:</strong> #${data.submissionId}</p>
        </div>
        
        <div style="background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #28a745;">Message</h3>
          <p style="margin: 0; white-space: pre-wrap;">${data.inquiryMessage}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.adminDashboardUrl}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Review Inquiry</a>
        </div>
        
        <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
          Please respond to this inquiry promptly to maintain excellent customer service. You can manage all inquiries from your admin dashboard.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
        <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
      </div>
    </body>
    </html>
  `;
}

// Helper function to generate contact inquiry email text
function generateContactInquiryEmailText(data: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  company?: string;
  inquiryMessage: string;
  inquiryType: string;
  inquiryDate: string;
  submissionId: number;
  adminDashboardUrl: string;
}): string {
  return `
New Contact Inquiry

You have received a new contact inquiry!

Customer Details:
Name: ${data.customerName}
Email: ${data.customerEmail}
${data.customerPhone ? `Phone: ${data.customerPhone}` : ''}
${data.company ? `Company: ${data.company}` : ''}
Inquiry Type: ${data.inquiryType}
Inquiry Date: ${data.inquiryDate}
Submission ID: #${data.submissionId}

Message:
${data.inquiryMessage}

Review Inquiry: ${data.adminDashboardUrl}

Please respond to this inquiry promptly to maintain excellent customer service.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
  `;
}

