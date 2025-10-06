import { NextRequest, NextResponse } from 'next/server';
import { createJoinSubmission } from '@/lib/database';
import { EmailService } from '@/lib/emailService';
import { NotificationService } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Join request API called');
    
    // Parse request body
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      dealershipName,
      dealershipType,
      numberOfVehicles,
      currentSystem,
      inquiryType,
      subject,
      message,
      preferredContact
    } = body;
    
    console.log('📋 Join request data:', {
      firstName,
      lastName,
      email,
      dealershipName,
      dealershipType,
      inquiryType,
      timestamp: new Date().toISOString()
    });
    
    // Validate required fields
    if (!firstName || !lastName || !email || !dealershipName || !dealershipType || !inquiryType || !message) {
      console.error('❌ Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email, dealershipName, dealershipType, inquiryType, and message are required'
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
    
    // Create join submission in database
    console.log('🔄 Creating join submission...');
    const submissionResult = await createJoinSubmission({
      firstName,
      lastName,
      email,
      phone: phone || null,
      dealershipName,
      dealershipType,
      numberOfVehicles: numberOfVehicles || null,
      currentSystem: currentSystem || null,
      inquiryType,
      subject: subject || null,
      message,
      preferredContact: preferredContact || 'email',
    });
    
    if (!submissionResult.success) {
      console.error('❌ Failed to create join submission:', submissionResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to submit application'
      }, { status: 500 });
    }
    
    console.log('✅ Join submission created:', submissionResult.data?.id);
    
    // Send confirmation email to applicant
    console.log('📧 Sending confirmation email to applicant...');
    try {
      const confirmationResult = await EmailService.sendJoinRequestConfirmation({
        to: email,
        applicantName: `${firstName} ${lastName}`,
        dealershipName,
        submissionId: submissionResult.data!.id,
        inquiryType,
        submissionDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
      
      if (confirmationResult.success) {
        console.log('✅ Confirmation email sent to applicant');
      } else {
        console.warn('⚠️ Failed to send confirmation email:', confirmationResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error sending confirmation email:', emailError);
    }
    
    // Send notification emails to all admin emails
    console.log('📧 Sending admin notification emails...');
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails configured in NEXT_PUBLIC_ADMIN_EMAILS');
    } else {
      console.log(`📧 Sending notifications to ${adminEmails.length} admin(s):`, adminEmails);
      
      // Send email to each admin
      const adminEmailPromises = adminEmails.map(async (adminEmail) => {
        try {
          return await EmailService.sendJoinRequestAdminNotification({
            to: adminEmail,
            applicantName: `${firstName} ${lastName}`,
            applicantEmail: email,
            applicantPhone: phone,
            dealershipName,
            dealershipType,
            numberOfVehicles,
            currentSystem,
            inquiryType,
            subject,
            message,
            preferredContact: preferredContact || 'email',
            submissionId: submissionResult.data!.id,
            submissionDate: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/dashboard`
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
        
        const adminNotificationPromises = adminEmails.map(async (adminEmail) => {
          try {
            return await NotificationService.createNotification({
              recipientId: adminEmail, // Will be resolved by the service
              type: 'join_request',
              title: `New Join Request: ${dealershipName}`,
              message: `${firstName} ${lastName} has submitted a join request for ${dealershipName}. Click to review and take action.`,
              priority: 'high',
              entityType: 'join_submission',
              entityId: submissionResult.data!.id.toString(),
              actionUrl: `/admin/dashboard?tab=applications&highlight=${submissionResult.data!.id}`,
              actionLabel: 'Review Application',
              channels: ['in_app', 'email'],
              metadata: {
                applicantName: `${firstName} ${lastName}`,
                applicantEmail: email,
                dealershipName,
                dealershipType,
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
      message: 'Join request submitted successfully',
      data: {
        submissionId: submissionResult.data!.id,
        applicantName: `${firstName} ${lastName}`,
        applicantEmail: email,
        dealershipName,
        adminNotificationsSent: adminEmails.length,
        confirmationEmailSent: true
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing join request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process join request'
    }, { status: 500 });
  }
}
