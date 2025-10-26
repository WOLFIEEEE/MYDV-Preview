import { NextRequest, NextResponse } from 'next/server'
import { createExternalNotification, updateExternalNotificationSource, type WebhookData, type VehicleReservationData } from '@/lib/external-notifications'

// Type for the incoming webhook request with affiliateId
type WebhookRequest = Omit<WebhookData, 'dealerId'> & {
  affiliateId: string
}

type VehicleReservationRequest = VehicleReservationData & {
  affiliateId: string
}

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json()
    
    // Extract headers for logging/security
    const userAgent = request.headers.get('user-agent') || ''
    const sourceIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const sourceWebsite = request.headers.get('origin') || 
                         request.headers.get('referer') || 
                         'unknown'
    
    // Validate required fields
    if (!body.affiliateId) {
      return NextResponse.json(
        { error: 'Missing required field: affiliateId' },
        { status: 400 }
      )
    }

    // Check if this is a vehicle reservation or general webhook
    const isVehicleReservation = body.customerDetails && body.vehicleDetails && body.amount
    
    let notification
    
    if (isVehicleReservation) {
      // Handle vehicle reservation
      const reservationData: VehicleReservationData = {
        customerDetails: body.customerDetails,
        vehicleDetails: body.vehicleDetails,
        amount: body.amount
      }
      
      notification = await createExternalNotification(reservationData, body.affiliateId)
    } else {
      // Handle general webhook - transform affiliateId to dealerId
      const webhookData: WebhookData = {
        ...body,
        dealerId: body.affiliateId
      }
      
      // Remove affiliateId from the data since we've converted it to dealerId
      delete (webhookData as any).affiliateId
      
      notification = await createExternalNotification(webhookData)
    }

    // Update the notification with source information
    if (notification) {
      await updateExternalNotificationSource(notification.id, {
        sourceWebsite,
        sourceIp,
        userAgent
      })
      
      console.log(`External notification created: ${notification.id} for dealer: ${body.affiliateId}`)
    }

    return NextResponse.json(
      { 
        success: true, 
        notificationId: notification.id,
        message: 'Notification received and stored successfully' 
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Error processing external notification webhook:', error)
    
    // Return appropriate error response
    if (error.message?.includes('Foreign key constraint')) {
      return NextResponse.json(
        { 
          error: 'Invalid affiliateId - dealer not found',
          message: 'The provided affiliateId does not correspond to a valid dealer' 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process notification' 
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Optional: Add a GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'External notifications webhook endpoint',
    methods: ['POST'],
    expectedFields: {
      affiliateId: 'string (required) - The dealer ID to associate the notification with',
      enquiryType: 'string (required) - Type of enquiry: part-exchange, find-your-next-car, book-appointment, request-finance, general-contact, vehicle-reservation',
      personal: 'object - Personal information of the enquirer',
      vehicle: 'object (optional) - Vehicle details they are interested in',
      userVehicle: 'object (optional) - Their own vehicle for part-exchange',
      findYourNextCar: 'object (optional) - Find your next car specific data',
      testDrive: 'object (optional) - Test drive details',
      employment: 'object (optional) - Employment information',
      finance: 'object (optional) - Finance information', 
      bank: 'object (optional) - Bank details',
      notes: 'string (optional) - Additional notes'
    },
    examples: {
      generalEnquiry: {
        affiliateId: 'dealer-uuid-here',
        enquiryType: 'general-contact',
        personal: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phoneNumber: '+44 1234 567890'
        },
        notes: 'Interested in viewing cars this weekend'
      },
      vehicleReservation: {
        affiliateId: 'dealer-uuid-here',
        customerDetails: {
          title: 'Mr',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+44 1234 567890',
          address: '123 Main St, London, UK'
        },
        vehicleDetails: {
          make: 'BMW',
          model: 'X5',
          registration: 'AB12 CDE',
          stockId: 'stock-123'
        },
        amount: 50000
      }
    }
  })
}