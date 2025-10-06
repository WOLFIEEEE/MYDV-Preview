import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Join Us email flow...');
    
    const body = await request.json();
    const { emailType, testEmail } = body;
    
    if (!testEmail) {
      return NextResponse.json({
        success: false,
        error: 'Test email address is required'
      }, { status: 400 });
    }
    
    let result;
    const testData = {
      applicantName: 'John Smith',
      dealershipName: 'Test Motors Ltd',
      submissionId: 12345,
      inquiryType: 'New Dealership',
      submissionDate: new Date().toLocaleDateString('en-GB'),
      adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/dashboard`,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard-redirect?invitation=1`,
      adminName: 'Test Admin',
      approvalDate: new Date().toLocaleDateString('en-GB'),
      rejectionReason: 'This is a test rejection for demonstration purposes.',
      rejectionDate: new Date().toLocaleDateString('en-GB'),
      oldStatus: 'pending',
      newStatus: 'reviewing',
      statusMessage: 'Your application is now under review by our team.',
      updateDate: new Date().toLocaleDateString('en-GB')
    };
    
    switch (emailType) {
      case 'admin_notification':
        result = await EmailService.sendJoinRequestAdminNotification({
          to: testEmail,
          applicantName: testData.applicantName,
          applicantEmail: 'john.smith@testmotors.com',
          applicantPhone: '+44 7700 900123',
          dealershipName: testData.dealershipName,
          dealershipType: 'Independent Dealer',
          numberOfVehicles: '50-100',
          currentSystem: 'Manual/Excel',
          inquiryType: testData.inquiryType,
          subject: 'Partnership Inquiry',
          message: 'We are interested in joining your platform to streamline our dealership operations and reach more customers.',
          preferredContact: 'email',
          submissionId: testData.submissionId,
          submissionDate: testData.submissionDate,
          adminDashboardUrl: testData.adminDashboardUrl
        });
        break;
        
      case 'confirmation':
        result = await EmailService.sendJoinRequestConfirmation({
          to: testEmail,
          applicantName: testData.applicantName,
          dealershipName: testData.dealershipName,
          submissionId: testData.submissionId,
          inquiryType: testData.inquiryType,
          submissionDate: testData.submissionDate
        });
        break;
        
      case 'approved':
        result = await EmailService.sendJoinRequestApproved({
          to: testEmail,
          applicantName: testData.applicantName,
          dealershipName: testData.dealershipName,
          inviteUrl: testData.inviteUrl,
          adminName: testData.adminName,
          approvalDate: testData.approvalDate,
          assignmentDetails: {
            companyName: 'Test Motors Ltd',
            primaryAdvertisementId: 'ADV123456',
            advertisementIds: ['ADV123456', 'ADV789012'],
            autotraderIntegrationId: 'INT-TEST-001',
            autotraderKey: 'AT_KEY_123456789ABCDEF',
            autotraderSecret: 'AT_SECRET_987654321FEDCBA',
            dvlaApiKey: 'DVLA_KEY_ABCDEF123456789',
            companyLogo: 'https://example.com/logo.png'
          }
        });
        break;
        
      case 'rejected':
        result = await EmailService.sendJoinRequestRejected({
          to: testEmail,
          applicantName: testData.applicantName,
          dealershipName: testData.dealershipName,
          rejectionReason: testData.rejectionReason,
          adminName: testData.adminName,
          rejectionDate: testData.rejectionDate
        });
        break;
        
      case 'status_update':
        result = await EmailService.sendJoinRequestStatusUpdate({
          to: testEmail,
          applicantName: testData.applicantName,
          dealershipName: testData.dealershipName,
          oldStatus: testData.oldStatus,
          newStatus: testData.newStatus,
          statusMessage: testData.statusMessage,
          adminName: testData.adminName,
          updateDate: testData.updateDate
        });
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid email type. Valid types: admin_notification, confirmation, approved, rejected, status_update'
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Test ${emailType} email sent successfully to ${testEmail}` 
        : `Failed to send test email: ${result.error}`,
      data: {
        emailType,
        testEmail,
        messageId: result.messageId
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing join emails:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test join emails'
    }, { status: 500 });
  }
}
