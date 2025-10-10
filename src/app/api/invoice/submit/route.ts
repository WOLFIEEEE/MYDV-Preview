import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { dealers, invoices, teamMembers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { EmailService } from '@/lib/emailService'
import { getDealerIdForUser } from '@/lib/dealerHelper'

export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user)
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 })
    }

    const dealerId = dealerIdResult.dealerId!
    const formData = await request.json()
    
    console.log('Invoice submission received:', {
      invoiceNumber: formData.invoiceNumber,
      vehicleRegistration: formData.vehicleRegistration,
      customerName: `${formData.firstName} ${formData.surname}`,
      saleType: formData.saleType,
      salePrice: formData.salePrice,
      timestamp: new Date().toISOString()
    })
    
    // Generate invoice ID if not provided
    const invoiceId = formData.invoiceNumber || `INV-${Date.now()}`
    
    // Prepare invoice data for database
    const invoiceData = {
      stockId: formData.vehicleRegistration, // Use registration as fallback stockId
      dealerId,
      invoiceNumber: invoiceId,
      invoiceTo: formData.invoiceTo || 'Customer',
      saleType: formData.saleType || 'Retail',
      
      // Vehicle Information
      vehicleRegistration: formData.vehicleRegistration,
      make: formData.make,
      model: formData.model,
      derivative: formData.derivative,
      vin: formData.vin,
      engineNumber: formData.engineNumber,
      engineCapacity: formData.engineCapacity,
      colour: formData.colour,
      fuelType: formData.fuelType,
      firstRegDate: formData.firstRegDate ? new Date(formData.firstRegDate) : null,
      
      // Sale Information
      salePrice: formData.salePrice || 0,
      dateOfSale: formData.dateOfSale ? new Date(formData.dateOfSale) : new Date(),
      monthOfSale: formData.monthOfSale || '',
      quarterOfSale: formData.quarterOfSale || 1,
      costOfPurchase: formData.costOfPurchase || 0,
      dateOfPurchase: formData.dateOfPurchase ? new Date(formData.dateOfPurchase) : null,
      daysInStock: formData.daysInStock || 0,
      
      // Customer Information
      customerTitle: formData.title || '',
      customerFirstName: formData.firstName || '',
      customerMiddleName: formData.middleName || '',
      customerSurname: formData.surname || '',
      customerAddress: {
        street: formData.address?.street || '',
        address2: formData.address?.address2 || '',
        city: formData.address?.city || '',
        county: formData.address?.county || '',
        postCode: formData.address?.postCode || '',
        country: formData.address?.country || 'United Kingdom',
      },
      customerContactNumber: formData.contactNumber || '',
      customerEmailAddress: formData.emailAddress || '',
      
      // Finance Information
      financeCompany: formData.financeCompany || '',
      financeCompanyName: formData.financeCompanyName || '',
      
      // Warranty Information
      warrantyLevel: formData.warrantyLevel || 'None Selected',
      warrantyPrice: formData.warrantyPrice || 0,
      warrantyDetails: formData.warrantyDetails || '',
      
      // Delivery Information
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : null,
      depositAmount: formData.depositAmount || 0,
      
      // Status
      status: 'draft' as const,
      checklistValidated: false,
      
      // Store additional form data in additionalData jsonb field
      additionalData: formData,
      
      updatedAt: new Date(),
    }

    // Check if invoice already exists for this stock
    const existingInvoice = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.stockId, invoiceData.stockId),
        eq(invoices.dealerId, dealerId)
      ))
      .limit(1)

    let result
    if (existingInvoice.length > 0) {
      // Update existing invoice
      result = await db
        .update(invoices)
        .set(invoiceData)
        .where(and(
          eq(invoices.stockId, invoiceData.stockId),
          eq(invoices.dealerId, dealerId)
        ))
        .returning()
    } else {
      // Create new invoice
      result = await db
        .insert(invoices)
        .values(invoiceData)
        .returning()
    }

    console.log('✅ Invoice saved to database:', result[0])
    
    const customerName = `${formData.firstName} ${formData.surname}`
    const customerEmail = formData.emailAddress || formData.email
    
    // Send invoice email notification if customer email is provided
    if (customerEmail) {
      try {
        const emailResult = await EmailService.sendInvoiceGenerated({
          to: customerEmail,
          customerName: customerName,
          invoiceNumber: invoiceId,
          amount: `£${formData.salePrice}`,
          vehicleDetails: `${formData.make} ${formData.model} (${formData.vehicleRegistration})`,
          invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoice/${invoiceId}`
        })
        
        if (emailResult.success) {
          console.log(`✅ Invoice email sent to ${customerEmail} for ${invoiceId}`)
        } else {
          console.warn(`⚠️ Failed to send invoice email to ${customerEmail}:`, emailResult.error)
        }
      } catch (emailError) {
        console.error('❌ Error sending invoice email:', emailError)
      }
    }
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Invoice submitted successfully',
        invoiceId: invoiceId,
        data: result[0], // Include the saved invoice data
        submittedAt: new Date().toISOString(),
        emailSent: !!customerEmail
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing invoice submission:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing invoice submission',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}