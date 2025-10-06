import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getDealerIdForUser } from '@/lib/dealerHelper'
import { 
  createVehicleChecklist, 
  getVehicleChecklistByStockId, 
  updateVehicleChecklist,
  calculateChecklistCompletion
} from '@/lib/stockActionsDb'

export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID (supports team member credential delegation)
    const dealerResult = await getDealerIdForUser(user)
    if (!dealerResult.success) {
      return NextResponse.json({ error: dealerResult.error || 'Dealer record not found' }, { status: 404 })
    }

    const dealerId = dealerResult.dealerId!

    const body = await request.json()
    const { stockId, ...formData } = body

    if (!stockId) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 })
    }

    // Calculate completion status
    const completionPercentage = calculateChecklistCompletion(formData)
    const dataWithCompletion = {
      ...formData,
      completionPercentage,
      isComplete: completionPercentage === 100
    }

    // Check if vehicle checklist already exists
    const existingChecklist = await getVehicleChecklistByStockId(stockId, dealerId)

    let result
    if (existingChecklist) {
      // Update existing record
      result = await updateVehicleChecklist(stockId, dealerId, dataWithCompletion)
    } else {
      // Create new record
      result = await createVehicleChecklist({
        stockId,
        dealerId,
        ...dataWithCompletion
      })
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (error) {
    console.error('❌ Error saving vehicle checklist:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'
    const errorName = error instanceof Error ? error.name : 'Unknown error type'
    
    console.error('❌ Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    })
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID (supports team member credential delegation)
    const dealerResult = await getDealerIdForUser(user)
    if (!dealerResult.success) {
      return NextResponse.json({ error: dealerResult.error || 'Dealer record not found' }, { status: 404 })
    }

    const dealerId = dealerResult.dealerId!

    const { searchParams } = new URL(request.url)
    const stockId = searchParams.get('stockId')

    if (!stockId) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 })
    }

    const checklist = await getVehicleChecklistByStockId(stockId, dealerId)
    
    return NextResponse.json({ success: true, data: checklist }, { status: 200 })
  } catch (error) {
    console.error('Error fetching vehicle checklist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 