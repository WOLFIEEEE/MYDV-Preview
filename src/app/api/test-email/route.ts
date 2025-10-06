import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/emailService'

/**
 * POST /api/test-email
 * Test endpoint for email functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    let result

    switch (type) {
      case 'team_invitation':
        result = await EmailService.sendTeamInvitation({
          to: data.to || 'test@example.com',
          inviterName: data.inviterName || 'John Doe',
          dealershipName: data.dealershipName || 'Test Dealership',
          role: data.role || 'sales',
          inviteUrl: data.inviteUrl || 'http://localhost:3000/accept-invitation?token=test123'
        })
        break

      case 'team_welcome':
        result = await EmailService.sendTeamWelcome({
          to: data.to || 'test@example.com',
          userName: data.userName || 'Jane Smith',
          dealershipName: data.dealershipName || 'Test Dealership',
          role: data.role || 'sales',
          dashboardUrl: data.dashboardUrl || 'http://localhost:3000/dashboard'
        })
        break

      case 'role_changed':
        result = await EmailService.sendRoleChanged({
          to: data.to || 'test@example.com',
          userName: data.userName || 'Jane Smith',
          oldRole: data.oldRole || 'employee',
          newRole: data.newRole || 'sales',
          changedBy: data.changedBy || 'John Doe',
          dealershipName: data.dealershipName || 'Test Dealership'
        })
        break

      case 'customer_inquiry':
        result = await EmailService.sendCustomerInquiry({
          to: data.to || 'test@example.com',
          customerName: data.customerName || 'Test Customer',
          customerEmail: data.customerEmail || 'customer@example.com',
          customerPhone: data.customerPhone || '01234567890',
          vehicleDetails: data.vehicleDetails || '2020 BMW X5',
          inquiryMessage: data.inquiryMessage || 'I am interested in this vehicle. Please contact me.',
          inquiryDate: data.inquiryDate || new Date().toLocaleDateString('en-GB')
        })
        break

      case 'payment_reminder':
        result = await EmailService.sendPaymentReminder({
          to: data.to || 'test@example.com',
          customerName: data.customerName || 'Test Customer',
          invoiceNumber: data.invoiceNumber || 'INV-12345',
          amount: data.amount || '£25,000',
          dueDate: data.dueDate || '31/12/2024',
          paymentUrl: data.paymentUrl || 'http://localhost:3000/payment/INV-12345'
        })
        break

      case 'invoice_generated':
        result = await EmailService.sendInvoiceGenerated({
          to: data.to || 'test@example.com',
          customerName: data.customerName || 'Test Customer',
          invoiceNumber: data.invoiceNumber || 'INV-12345',
          amount: data.amount || '£25,000',
          vehicleDetails: data.vehicleDetails || '2020 BMW X5 (AB12 CDE)',
          invoiceUrl: data.invoiceUrl || 'http://localhost:3000/invoice/INV-12345'
        })
        break

      case 'lead_assigned':
        result = await EmailService.sendLeadAssigned({
          to: data.to || 'test@example.com',
          assigneeName: data.assigneeName || 'Jane Smith',
          customerName: data.customerName || 'Test Customer',
          leadSource: data.leadSource || 'Website Contact Form',
          vehicleInterest: data.vehicleInterest || '2020 BMW X5',
          assignedBy: data.assignedBy || 'John Doe'
        })
        break

      case 'custom':
        result = await EmailService.sendCustomEmail({
          to: data.to || 'test@example.com',
          subject: data.subject || 'Test Email',
          html: data.html || '<p>This is a test email.</p>',
          text: data.text || 'This is a test email.'
        })
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid email type. Supported types: team_invitation, team_welcome, role_changed, customer_inquiry, payment_reminder, invoice_generated, lead_assigned, custom'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `${type} email sent successfully`,
      data: result
    })

  } catch (error) {
    console.error('❌ Error testing email:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/test-email
 * Get available email types and example payloads
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Email test endpoint - use POST with email type and data',
    availableTypes: {
      team_invitation: {
        description: 'Send team member invitation',
        requiredFields: ['to', 'inviterName', 'dealershipName', 'role', 'inviteUrl'],
        example: {
          type: 'team_invitation',
          to: 'newmember@example.com',
          inviterName: 'John Doe',
          dealershipName: 'ABC Motors',
          role: 'sales',
          inviteUrl: 'http://localhost:3000/accept-invitation?token=abc123'
        }
      },
      team_welcome: {
        description: 'Send welcome email to new team member',
        requiredFields: ['to', 'userName', 'dealershipName', 'role', 'dashboardUrl'],
        example: {
          type: 'team_welcome',
          to: 'newmember@example.com',
          userName: 'Jane Smith',
          dealershipName: 'ABC Motors',
          role: 'sales',
          dashboardUrl: 'http://localhost:3000/dashboard'
        }
      },
      customer_inquiry: {
        description: 'Send customer inquiry notification',
        requiredFields: ['to', 'customerName', 'customerEmail', 'inquiryMessage', 'inquiryDate'],
        example: {
          type: 'customer_inquiry',
          to: 'sales@dealership.com',
          customerName: 'John Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '01234567890',
          vehicleDetails: '2020 BMW X5',
          inquiryMessage: 'I am interested in this vehicle',
          inquiryDate: '25/12/2024'
        }
      },
      payment_reminder: {
        description: 'Send payment reminder to customer',
        requiredFields: ['to', 'customerName', 'invoiceNumber', 'amount', 'dueDate'],
        example: {
          type: 'payment_reminder',
          to: 'customer@example.com',
          customerName: 'John Customer',
          invoiceNumber: 'INV-12345',
          amount: '£25,000',
          dueDate: '31/12/2024',
          paymentUrl: 'http://localhost:3000/payment/INV-12345'
        }
      },
      invoice_generated: {
        description: 'Send invoice to customer',
        requiredFields: ['to', 'customerName', 'invoiceNumber', 'amount'],
        example: {
          type: 'invoice_generated',
          to: 'customer@example.com',
          customerName: 'John Customer',
          invoiceNumber: 'INV-12345',
          amount: '£25,000',
          vehicleDetails: '2020 BMW X5 (AB12 CDE)',
          invoiceUrl: 'http://localhost:3000/invoice/INV-12345'
        }
      },
      lead_assigned: {
        description: 'Send lead assignment notification',
        requiredFields: ['to', 'assigneeName', 'customerName', 'leadSource', 'assignedBy'],
        example: {
          type: 'lead_assigned',
          to: 'sales@dealership.com',
          assigneeName: 'Jane Smith',
          customerName: 'John Customer',
          leadSource: 'Website Contact Form',
          vehicleInterest: '2020 BMW X5',
          assignedBy: 'John Manager'
        }
      },
      custom: {
        description: 'Send custom email',
        requiredFields: ['to', 'subject', 'html'],
        example: {
          type: 'custom',
          to: 'recipient@example.com',
          subject: 'Custom Email Subject',
          html: '<h1>Hello</h1><p>This is a custom email.</p>',
          text: 'Hello\n\nThis is a custom email.'
        }
      }
    }
  })
}


