import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { dealers, teamMembers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { 
  createSaleDetails, 
  getSaleDetailsByStockId, 
  updateSaleDetails 
} from '@/lib/stockActionsDb'
import { autoCreateCustomerFromSaleDetails } from '@/lib/customerAutoCreate'
import { getDealerIdForUser } from '@/lib/dealerHelper'

export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user)
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 })
    }

    const dealerId = dealerIdResult.dealerId!

    const body = await request.json()
    const { stockId, ...formData } = body

    if (!stockId) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 })
    }

    // Process the data to ensure proper types
    const processedData = {
      ...formData,
      // Convert date strings to Date objects for database (only if they exist)
      ...(formData.saleDate && { saleDate: new Date(formData.saleDate) }),
      ...(formData.deliveryDate && formData.deliveryDate !== '' && { deliveryDate: new Date(formData.deliveryDate) }),
      ...(formData.depositDate && formData.depositDate !== '' && { depositDate: new Date(formData.depositDate) }),
      // Ensure numeric fields are properly typed (only if they exist)
      ...(formData.warrantyMonths && { warrantyMonths: parseInt(formData.warrantyMonths) }),
      ...(formData.salePrice && { salePrice: parseFloat(formData.salePrice) }),
      ...(formData.deliveryPrice && { deliveryPrice: parseFloat(formData.deliveryPrice) }),
      ...(formData.cashAmount && { cashAmount: parseFloat(formData.cashAmount) }),
      ...(formData.bacsAmount && { bacsAmount: parseFloat(formData.bacsAmount) }),
      ...(formData.financeAmount && { financeAmount: parseFloat(formData.financeAmount) }),
      ...(formData.depositAmount && { depositAmount: parseFloat(formData.depositAmount) }),
      ...(formData.requiredAmount && { requiredAmount: parseFloat(formData.requiredAmount) }),
      ...(formData.partExAmount && { partExAmount: parseFloat(formData.partExAmount) }),
      ...(formData.cardAmount && { cardAmount: parseFloat(formData.cardAmount) })
    }

    // Remove undefined values to prevent overwriting existing data with undefined
    const cleanedProcessedData = Object.fromEntries(
      Object.entries(processedData).filter(([_, value]) => value !== undefined)
    )

    // Auto-create customer from sales details if customer data is provided
    let customerId = null;
    if (cleanedProcessedData.firstName && cleanedProcessedData.lastName && cleanedProcessedData.emailAddress) {
      console.log('🔄 Auto-creating customer from sales details...');
      customerId = await autoCreateCustomerFromSaleDetails(dealerId, cleanedProcessedData);
      if (customerId) {
        console.log('✅ Customer auto-created/found with ID:', customerId);
      }
    }

    // Add customerId to processed data
    const finalProcessedData = {
      ...cleanedProcessedData,
      customerId
    };

    // Check if sale details already exist
    const existingSaleDetails = await getSaleDetailsByStockId(stockId, dealerId)

    let result
    if (existingSaleDetails) {
      // Update existing record
      result = await updateSaleDetails(stockId, dealerId, finalProcessedData)
    } else {
      // Create new record - only set saleDate if not provided
      result = await createSaleDetails({
        stockId,
        dealerId,
        saleDate: new Date(), // Default saleDate for new records
        ...finalProcessedData
      })
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (error) {
    console.error('Error saving sale details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID using helper function (supports team member credential delegation)
    const dealerIdResult = await getDealerIdForUser(user)
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 })
    }

    const dealerId = dealerIdResult.dealerId!

    const { searchParams } = new URL(request.url)
    const stockId = searchParams.get('stockId')

    if (!stockId) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 })
    }

    const saleDetails = await getSaleDetailsByStockId(stockId, dealerId)
    
    return NextResponse.json({ success: true, data: saleDetails }, { status: 200 })
  } catch (error) {
    console.error('Error fetching sale details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 