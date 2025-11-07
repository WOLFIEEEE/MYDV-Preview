import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inventoryDetails, dealers, fundTransactions, fundSources, teamMembers, stockCache } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { updateStockCacheVatScheme } from '@/lib/stockActionsDb';

// Helper function to create or update fund transaction
async function handleFundTransaction(
  dealerId: string,
  stockId: string,
  fundingSourceId: string | null,
  fundingAmount: string | null,
  existingInventoryRecord: any
) {
  // If no funding information provided, skip transaction creation
  if (!fundingSourceId || !fundingAmount || parseFloat(fundingAmount) <= 0) {
    return null;
  }

  const transactionAmount = parseFloat(fundingAmount);
  
  // Check if fund source exists and is active
  const fundSource = await db
    .select()
    .from(fundSources)
    .where(and(
      eq(fundSources.id, fundingSourceId),
      eq(fundSources.dealerId, dealerId),
      eq(fundSources.status, 'active')
    ))
    .limit(1);

  if (fundSource.length === 0) {
    throw new Error('Selected fund source not found or inactive');
  }

  // Check if there's already a transaction for this stock item
  const existingTransaction = await db
    .select()
    .from(fundTransactions)
    .where(and(
      eq(fundTransactions.fundSourceId, fundingSourceId),
      eq(fundTransactions.vehicleStockId, stockId),
      eq(fundTransactions.transactionType, 'usage')
    ))
    .limit(1);

  const transactionData = {
    fundSourceId: fundingSourceId,
    transactionType: 'usage' as const,
    amount: transactionAmount.toString(),
    description: `Vehicle purchase funding for stock ID: ${stockId}`,
    vehicleStockId: stockId,
    transactionDate: new Date(),
    status: 'completed' as const,
    notes: `Auto-generated from purchase information form`,
    dealerId
  };

  if (existingTransaction.length > 0) {
    // Update existing transaction
    const result = await db
      .update(fundTransactions)
      .set({
        ...transactionData,
        updatedAt: new Date()
      })
      .where(eq(fundTransactions.id, existingTransaction[0].id))
      .returning();
    
    console.log('✅ Updated existing fund transaction:', result[0]);
    return result[0];
  } else {
    // Create new transaction
    const result = await db
      .insert(fundTransactions)
      .values(transactionData)
      .returning();
    
    console.log('✅ Created new fund transaction:', result[0]);
    return result[0];
  }
}

// POST - Create or update inventory details
export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    const body = await request.json();
    console.log('📝 Inventory Details API - Received data:', body);

    const {
      stockId,
      stockReference,
      registration,
      dateOfPurchase,
      costOfPurchase,
      purchaseFrom,
      fundingAmount,
      fundingSourceId,
      businessAmount,
      vatScheme
    } = body;

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 });
    }

    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(inventoryDetails)
      .where(and(
        eq(inventoryDetails.stockId, stockId),
        eq(inventoryDetails.dealerId, dealerId)
      ))
      .limit(1);

    const inventoryData = {
      stockId,
      dealerId,
      stockReference,
      registration,
      dateOfPurchase: dateOfPurchase ? new Date(dateOfPurchase) : null,
      costOfPurchase: costOfPurchase ? costOfPurchase.toString() : null,
      purchaseFrom: purchaseFrom || null,
      fundingAmount: fundingAmount ? fundingAmount.toString() : null,
      fundingSourceId: fundingSourceId || null,
      businessAmount: businessAmount ? businessAmount.toString() : null,
      vatScheme: vatScheme || 'no_vat', // Store VAT scheme in inventory details
      updatedAt: new Date()
    };

    let result;
    if (existingRecord.length > 0) {
      // Update existing record
      console.log('📝 Updating existing inventory details');
      result = await db
        .update(inventoryDetails)
        .set(inventoryData)
        .where(and(
          eq(inventoryDetails.stockId, stockId),
          eq(inventoryDetails.dealerId, dealerId)
        ))
        .returning();
    } else {
      // Create new record
      console.log('📝 Creating new inventory details');
      result = await db
        .insert(inventoryDetails)
        .values(inventoryData)
        .returning();
    }

    console.log('✅ Inventory Details saved successfully:', result[0]);

    // Handle fund transaction if funding information is provided
    let fundTransaction = null;
    try {
      if (fundingSourceId && fundingAmount) {
        console.log('💰 Processing fund transaction for funding amount:', fundingAmount);
        fundTransaction = await handleFundTransaction(
          dealerId,
          stockId,
          fundingSourceId,
          fundingAmount,
          existingRecord.length > 0 ? existingRecord[0] : null
        );
      }
    } catch (fundError) {
      console.error('❌ Error handling fund transaction:', fundError);
      // Don't fail the entire request if fund transaction fails
      // Just log the error and continue
    }


    return NextResponse.json({
      success: true,
      message: 'Inventory details saved successfully',
      data: result[0],
      fundTransaction: fundTransaction ? {
        id: fundTransaction.id,
        amount: fundTransaction.amount,
        transactionType: fundTransaction.transactionType,
        status: fundTransaction.status
      } : null
    });

  } catch (error) {
    console.error('❌ Error saving inventory details:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Retrieve inventory details
export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 });
    }

    console.log('📖 Fetching inventory details for stockId:', stockId);

    // Fetch inventory details
    const result = await db
      .select()
      .from(inventoryDetails)
      .where(and(
        eq(inventoryDetails.stockId, stockId),
        eq(inventoryDetails.dealerId, dealerId)
      ))
      .limit(1);

    // Fetch VAT scheme from stockCache
    let vatScheme = null;
    let forecourtVatStatus = null;
    try {
      const stockCacheResult = await db
        .select({
          advertsData: stockCache.advertsData
        })
        .from(stockCache)
        .where(and(
          eq(stockCache.stockId, stockId),
          eq(stockCache.dealerId, dealerId)
        ))
        .limit(1);

      if (stockCacheResult.length > 0 && stockCacheResult[0].advertsData) {
        const advertsData = stockCacheResult[0].advertsData;
        // Handle both string and object types for advertsData
        const parsedAdvertsData = typeof advertsData === 'string' 
          ? JSON.parse(advertsData) 
          : advertsData;
        vatScheme = parsedAdvertsData?.vatScheme || null;
        forecourtVatStatus = parsedAdvertsData?.forecourtPriceVatStatus || null;
        console.log('📖 Retrieved VAT scheme:', vatScheme);
      }
    } catch (vatError) {
      console.warn('⚠️ Failed to fetch VAT scheme from stockCache:', vatError);
      // Don't fail the request if VAT scheme fetch fails
    }

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No inventory details found',
        data: null,
        vatScheme: vatScheme, // Include VAT scheme even if no inventory details found
        forecourtPriceVatStatus: forecourtVatStatus
      });
    }

    console.log('✅ Inventory details retrieved:', result[0]);

    return NextResponse.json({
      success: true,
      data: {
        ...result[0],
        vatScheme: result[0].vatScheme || vatScheme || 'no_vat', // Prioritize inventory details VAT scheme, fallback to stockCache
        forecourtPriceVatStatus: forecourtVatStatus
      }
    });

  } catch (error) {
    console.error('❌ Error fetching inventory details:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 