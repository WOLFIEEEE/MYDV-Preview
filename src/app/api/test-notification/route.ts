import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notificationService';
import { EmailService } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test notification API called');
    
    // Parse request body
    const body = await request.json();
    const { type = 'test', adminEmail } = body;
    
    if (!adminEmail) {
      return NextResponse.json({
        success: false,
        error: 'Admin email is required'
      }, { status: 400 });
    }
    
    console.log('📧 Testing notifications for admin:', adminEmail);
    
    let testResult: any = {};
    
    if (type === 'join_request' || type === 'all') {
      // Test join request notification
      console.log('🔔 Testing join request notification...');
      
      try {
        const joinNotification = await NotificationService.createNotification({
          recipientId: adminEmail,
          type: 'join_request',
          title: 'Test Join Request: Demo Dealership',
          message: 'John Doe has submitted a test join request for Demo Dealership. This is a test notification.',
          priority: 'high',
          entityType: 'join_submission',
          entityId: '999',
          actionUrl: '/admin/dashboard?tab=applications',
          actionLabel: 'Review Application',
          channels: ['in_app', 'email'],
          metadata: {
            applicantName: 'John Doe',
            applicantEmail: 'john.doe@example.com',
            dealershipName: 'Demo Dealership',
            dealershipType: 'Independent',
            inquiryType: 'partnership',
            submissionId: 999
          }
        });
        
        testResult.joinRequest = {
          success: true,
          notificationId: joinNotification.id
        };
        console.log('✅ Join request notification created:', joinNotification.id);
      } catch (error) {
        console.error('❌ Failed to create join request notification:', error);
        testResult.joinRequest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    if (type === 'contact_inquiry' || type === 'all') {
      // Test contact inquiry notification
      console.log('🔔 Testing contact inquiry notification...');
      
      try {
        const contactNotification = await NotificationService.createNotification({
          recipientId: adminEmail,
          type: 'contact_inquiry',
          title: 'Test Contact Inquiry from Jane Smith',
          message: 'Jane Smith from ABC Motors has submitted a test contact inquiry. This is a test notification.',
          priority: 'medium',
          entityType: 'contact_submission',
          entityId: '888',
          actionUrl: '/admin/dashboard?tab=contacts',
          actionLabel: 'Review Inquiry',
          channels: ['in_app', 'email'],
          metadata: {
            customerName: 'Jane Smith',
            customerEmail: 'jane.smith@example.com',
            company: 'ABC Motors',
            inquiryType: 'general',
            submissionId: 888
          }
        });
        
        testResult.contactInquiry = {
          success: true,
          notificationId: contactNotification.id
        };
        console.log('✅ Contact inquiry notification created:', contactNotification.id);
      } catch (error) {
        console.error('❌ Failed to create contact inquiry notification:', error);
        testResult.contactInquiry = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    if (type === 'email_test' || type === 'all') {
      // Test direct email sending
      console.log('📧 Testing direct email sending...');
      
      try {
        const emailResult = await EmailService.sendCustomEmail({
          to: adminEmail,
          subject: 'Test Notification Email - MYDV Admin System',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Test Notification</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">✅ Test Notification</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                <p style="font-size: 18px; margin-bottom: 20px;">Congratulations! Your notification system is working correctly.</p>
                
                <div style="background: #d4edda; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #155724;">System Status</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>✅ Email notifications are working</li>
                    <li>✅ In-app notifications are working</li>
                    <li>✅ Admin notification system is operational</li>
                  </ul>
                </div>
                
                <p>This is a test email sent from your MYDV admin notification system. If you received this email, it means:</p>
                <ul>
                  <li>Your email service (Resend) is configured correctly</li>
                  <li>The notification system can create and deliver notifications</li>
                  <li>Admin notifications will be sent for new join requests and contact inquiries</li>
                </ul>
                
                <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
                  This is an automated test email from your MYDV admin notification system.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                <p>© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business</p>
              </div>
            </body>
            </html>
          `,
          text: `
Test Notification - MYDV Admin System

Congratulations! Your notification system is working correctly.

System Status:
✅ Email notifications are working
✅ In-app notifications are working  
✅ Admin notification system is operational

This is a test email sent from your MYDV admin notification system. If you received this email, it means:
- Your email service (Resend) is configured correctly
- The notification system can create and deliver notifications
- Admin notifications will be sent for new join requests and contact inquiries

This is an automated test email from your MYDV admin notification system.

© ${new Date().getFullYear()} MYDV - Fuelling Your Dealership Business
          `
        });
        
        testResult.emailTest = {
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error
        };
        
        if (emailResult.success) {
          console.log('✅ Test email sent successfully:', emailResult.messageId);
        } else {
          console.error('❌ Failed to send test email:', emailResult.error);
        }
      } catch (error) {
        console.error('❌ Error sending test email:', error);
        testResult.emailTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test notifications processed',
      data: {
        adminEmail,
        testType: type,
        results: testResult,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in test notification:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process test notification'
    }, { status: 500 });
  }
}