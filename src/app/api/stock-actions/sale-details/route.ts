import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
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

    // Helper function to safely parse numeric values - defaults to 0 for calculations
    const parseNumericField = (value: unknown): number => {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? 0 : parsed;
    };

    // Helper function to safely parse integer values - defaults to 0 for calculations
    const parseIntegerField = (value: unknown): number => {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      const parsed = parseInt(String(value));
      return isNaN(parsed) ? 0 : parsed;
    };

    // Process the data to ensure proper types
    const processedData = {
      ...formData,
      // Convert date strings to Date objects for database (only if they exist and are not empty)
      ...(formData.saleDate && formData.saleDate !== '' && { saleDate: new Date(formData.saleDate) }),
      ...(formData.deliveryDate && formData.deliveryDate !== '' && { deliveryDate: new Date(formData.deliveryDate) }),
      ...(formData.depositDate && formData.depositDate !== '' && { depositDate: new Date(formData.depositDate) }),
      ...(formData.completionDate && formData.completionDate !== '' && { completionDate: new Date(formData.completionDate) }),
      // Ensure numeric fields are properly typed - convert empty strings to null
      warrantyMonths: parseIntegerField(formData.warrantyMonths),
      salePrice: parseNumericField(formData.salePrice),
      deliveryPrice: parseNumericField(formData.deliveryPrice),
      cashAmount: parseNumericField(formData.cashAmount),
      bacsAmount: parseNumericField(formData.bacsAmount),
      financeAmount: parseNumericField(formData.financeAmount),
      depositAmount: parseNumericField(formData.depositAmount),
      requiredAmount: parseNumericField(formData.requiredAmount),
      partExAmount: parseNumericField(formData.partExAmount),
      cardAmount: parseNumericField(formData.cardAmount),
      // VAT scheme handling
      vatScheme: formData.vatScheme || 'no_vat'
    }

    // Remove undefined values to prevent overwriting existing data with undefined
    const cleanedProcessedData = Object.fromEntries(
      Object.entries(processedData).filter(([, value]) => value !== undefined)
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
  } catch (error: unknown) {
    console.error('Error saving sale details:', error)
    
    // Provide more detailed error message for debugging
    let errorMessage = 'Internal server error';
    const errorObj = error as Error;
    if (errorObj?.message) {
      errorMessage = errorObj.message;
      
      // Check for specific database errors
      if (errorObj.message.includes('invalid input syntax for type numeric')) {
        errorMessage = 'Invalid numeric value provided. Please check all price and amount fields.';
      } else if (errorObj.message.includes('invalid input syntax for type timestamp')) {
        errorMessage = 'Invalid date format provided. Please check all date fields.';
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorObj?.message : undefined 
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