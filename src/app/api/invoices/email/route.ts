import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { EmailService } from '@/lib/emailService';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceData, recipientEmail, message, pdfBuffer } = body;

    if (!invoiceData || !recipientEmail || !pdfBuffer) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: invoiceData, recipientEmail, and pdfBuffer are required'
      }, { status: 400 });
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user);
    if (!dealerIdResult.success) {
      return NextResponse.json({
        success: false,
        error: dealerIdResult.error || 'Failed to resolve dealer ID'
      }, { status: 404 });
    }

    const dealerId = dealerIdResult.dealerId!;

    // Prepare email data
    const customerName = `${invoiceData.customer.firstName} ${invoiceData.customer.lastName}`.trim();
    const vehicleInfo = `${invoiceData.vehicle.make} ${invoiceData.vehicle.model} - ${invoiceData.vehicle.registration}`.trim();
    const companyName = invoiceData.companyInfo.name || 'Your Company';
    
    // Convert base64 PDF buffer to Buffer for attachment
    const pdfAttachment = Buffer.from(pdfBuffer, 'base64');
    
    // Generate filename
    const filename = `Invoice-${invoiceData.invoiceNumber}-${invoiceData.vehicle.registration || 'Vehicle'}.pdf`;

    // Parse multiple email addresses (comma-separated)
    const emailAddresses = recipientEmail
      .split(',')
      .map((email: string) => email.trim())
      .filter((email: string) => email.length > 0);

    if (emailAddresses.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid email addresses provided'
      }, { status: 400 });
    }

    // Send email using EmailService
    const emailResult = await EmailService.sendEmail({
      to: emailAddresses,
      subject: `Invoice ${invoiceData.invoiceNumber} - ${vehicleInfo}`,
      type: 'invoice_generated',
      templateData: {
        customerName,
        invoiceNumber: invoiceData.invoiceNumber,
        vehicleInfo,
        companyName,
        salePrice: invoiceData.pricing.salePricePostDiscount,
        message: message || '',
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses?.[0]?.emailAddress || 'Team Member'
      },
      attachments: [{
        filename,
        content: pdfAttachment,
        contentType: 'application/pdf'
      }]
    });

    if (emailResult.success) {
      console.log('✅ Invoice email sent successfully:', emailResult.messageId);
      return NextResponse.json({
        success: true,
        messageId: emailResult.messageId,
        message: 'Invoice email sent successfully',
        recipients: emailAddresses
      });
    } else {
      console.error('❌ Failed to send invoice email:', emailResult.error);
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to send email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error sending invoice email:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
