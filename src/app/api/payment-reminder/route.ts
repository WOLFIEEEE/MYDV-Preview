import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { dealers, customers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { EmailService } from '@/lib/emailService'

/**
 * POST /api/payment-reminder
 * Send payment reminder emails to customers
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      customerId,
      customerEmail,
      customerName,
      invoiceNumber,
      amount,
      dueDate,
      paymentUrl
    } = body

    // Validate required fields
    if (!customerEmail || !customerName || !invoiceNumber || !amount || !dueDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: customerEmail, customerName, invoiceNumber, amount, and dueDate are required'
      }, { status: 400 })
    }

    // Get dealer ID
    const userMetadata = user.publicMetadata
    const userType = userMetadata?.userType as string
    const storeOwnerId = userMetadata?.storeOwnerId as string
    
    let dealerId: string

    if (userType === 'team_member' && storeOwnerId) {
      dealerId = storeOwnerId
    } else {
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, user.id))
        .limit(1)

      if (dealerResult.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Dealer record not found' 
        }, { status: 404 })
      }

      dealerId = dealerResult[0].id
    }

    // Verify customer belongs to this dealer (if customerId provided)
    if (customerId) {
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(
          eq(customers.id, customerId),
          eq(customers.dealerId, dealerId)
        ))
        .limit(1)

      if (!customer) {
        return NextResponse.json({
          success: false,
          error: 'Customer not found or does not belong to your dealership'
        }, { status: 404 })
      }
    }

    // Send payment reminder email
    const emailResult = await EmailService.sendPaymentReminder({
      to: customerEmail,
      customerName,
      invoiceNumber,
      amount,
      dueDate,
      paymentUrl
    })

    if (emailResult.success) {
      console.log(`✅ Payment reminder sent to ${customerEmail} for invoice ${invoiceNumber}`)
      
      return NextResponse.json({
        success: true,
        message: 'Payment reminder sent successfully',
        data: {
          customerEmail,
          invoiceNumber,
          messageId: emailResult.messageId
        }
      })
    } else {
      console.error(`❌ Failed to send payment reminder to ${customerEmail}:`, emailResult.error)
      
      return NextResponse.json({
        success: false,
        error: `Failed to send payment reminder: ${emailResult.error}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error sending payment reminder:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send payment reminder'
    }, { status: 500 })
  }
}


