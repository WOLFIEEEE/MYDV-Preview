import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dealers, teamMembers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { EmailService } from '@/lib/emailService'

/**
 * POST /api/customer-inquiry
 * Handle customer inquiries and send email notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerName,
      customerEmail,
      customerPhone,
      vehicleDetails,
      inquiryMessage,
      dealershipId
    } = body

    // Validate required fields
    if (!customerName || !customerEmail || !inquiryMessage) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: customerName, customerEmail, and inquiryMessage are required'
      }, { status: 400 })
    }

    // Get dealer information
    let dealerId = dealershipId
    if (!dealerId) {
      // If no specific dealership, use the first available dealer (for demo purposes)
      const [firstDealer] = await db
        .select({ id: dealers.id })
        .from(dealers)
        .limit(1)
      
      if (!firstDealer) {
        return NextResponse.json({
          success: false,
          error: 'No dealership found'
        }, { status: 404 })
      }
      
      dealerId = firstDealer.id
    }

    // Get team members who should receive inquiry notifications
    // Priority: sales team members, then store owner admins, then all team members
    const salesTeam = await db
      .select({
        email: teamMembers.email,
        name: teamMembers.name,
        role: teamMembers.role
      })
      .from(teamMembers)
      .where(eq(teamMembers.storeOwnerId, dealerId))

    // Filter for sales team first, then admins, then all active members
    const notificationRecipients = salesTeam.filter(member => 
      member.role === 'sales' || 
      member.role === 'store_owner_admin' || 
      member.role === 'employee'
    )

    if (notificationRecipients.length === 0) {
      console.warn('⚠️ No team members found to notify for customer inquiry')
      return NextResponse.json({
        success: true,
        message: 'Customer inquiry received but no team members to notify'
      })
    }

    // Send email notifications to relevant team members
    const emailPromises = notificationRecipients.map(async (recipient) => {
      try {
        return await EmailService.sendCustomerInquiry({
          to: recipient.email,
          customerName,
          customerEmail,
          customerPhone,
          vehicleDetails,
          inquiryMessage,
          inquiryDate: new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
      } catch (error) {
        console.error(`❌ Failed to send inquiry email to ${recipient.email}:`, error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })

    const emailResults = await Promise.allSettled(emailPromises)
    
    const successfulEmails = emailResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length

    const failedEmails = emailResults.length - successfulEmails

    console.log(`📧 Customer inquiry emails: ${successfulEmails} sent, ${failedEmails} failed`)

    return NextResponse.json({
      success: true,
      message: 'Customer inquiry processed successfully',
      data: {
        customerName,
        customerEmail,
        notificationsSent: successfulEmails,
        notificationsFailed: failedEmails,
        totalRecipients: notificationRecipients.length
      }
    })

  } catch (error) {
    console.error('❌ Error processing customer inquiry:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process customer inquiry'
    }, { status: 500 })
  }
}


