import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { dealers, serviceDetails } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer record from Clerk user ID
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

    const dealerId = dealerResult[0].id

    const body = await request.json()
    console.log('📝 Service Details API - Received data:', body)

    const { stockId, ...formData } = body

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 })
    }

    // Process the data to ensure proper types
    const processedData = {
      stockId,
      dealerId,
      stockReference: formData.stockReference || null,
      registration: formData.registration || null,
      serviceHistory: formData.serviceHistory || 'full',
      numberOfServices: formData.numberOfServices ? parseInt(formData.numberOfServices) : null,
      lastServiceDate: formData.lastServiceDate && formData.lastServiceDate !== '' 
        ? formData.lastServiceDate  // Keep as string for date type
        : null,
      majorServiceWork: formData.majorServiceWork || null,
      notes: formData.notes || null,
      updatedAt: new Date()
    }

    // Check if service details already exist
    const existingRecord = await db
      .select()
      .from(serviceDetails)
      .where(and(
        eq(serviceDetails.stockId, stockId),
        eq(serviceDetails.dealerId, dealerId)
      ))
      .limit(1)

    let result
    if (existingRecord.length > 0) {
      // Update existing record
      console.log('📝 Updating existing service details')
      result = await db
        .update(serviceDetails)
        .set(processedData)
        .where(and(
          eq(serviceDetails.stockId, stockId),
          eq(serviceDetails.dealerId, dealerId)
        ))
        .returning()
    } else {
      // Create new record
      console.log('📝 Creating new service details')
      result = await db
        .insert(serviceDetails)
        .values(processedData)
        .returning()
    }

    console.log('✅ Service Details saved successfully:', result[0])

    return NextResponse.json({
      success: true,
      message: existingRecord.length > 0 ? 'Service details updated successfully' : 'Service details created successfully',
      data: result[0]
    })

  } catch (error) {
    console.error('❌ Error saving service details:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer record from Clerk user ID
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

    const dealerId = dealerResult[0].id

    const { searchParams } = new URL(request.url)
    const stockId = searchParams.get('stockId')

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 })
    }

    console.log('📖 Fetching service details for stockId:', stockId)

    const result = await db
      .select()
      .from(serviceDetails)
      .where(and(
        eq(serviceDetails.stockId, stockId),
        eq(serviceDetails.dealerId, dealerId)
      ))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No service details found',
        data: null
      })
    }

    console.log('✅ Service details retrieved:', result[0])

    return NextResponse.json({
      success: true,
      data: result[0]
    })

  } catch (error) {
    console.error('❌ Error fetching service details:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
