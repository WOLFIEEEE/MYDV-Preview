import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockCache, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    const { stockId } = await params;
    
    if (!stockId) {
      return NextResponse.json({
        success: false,
        error: 'Stock ID is required'
      }, { status: 400 });
    }

    console.log('🔍 Getting basic info for stock:', stockId);

    // Get stock data with dealer info
    const stockRecord = await db
      .select({
        stockId: stockCache.stockId,
        vehicleData: stockCache.vehicleData,
        dealerId: stockCache.dealerId,
        dealer: dealers
      })
      .from(stockCache)
      .innerJoin(dealers, eq(stockCache.dealerId, dealers.id))
      .where(and(
        eq(stockCache.stockId, stockId),
        eq(stockCache.isStale, false) // Only active stock
      ))
      .limit(1);

    if (stockRecord.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Stock not found or no longer active'
      }, { status: 404 });
    }

    const stock = stockRecord[0];
    const vehicleData = (stock.vehicleData as Record<string, unknown>) || {};
    
    // Extract basic vehicle information
    const basicInfo = {
      stockId: stock.stockId,
      registration: (vehicleData.registration as string) || (vehicleData.plate as string) || 'N/A',
      make: (vehicleData.make as string) || 'Unknown',
      model: (vehicleData.model as string) || 'Unknown',
      year: (vehicleData.yearOfManufacture as string) || (vehicleData.year as string) || 'Unknown',
      dealerName: stock.dealer.name || 'Unknown Dealer'
    };

    console.log('✅ Basic info retrieved for stock:', stockId);

    return NextResponse.json({
      success: true,
      ...basicInfo
    });

  } catch (error) {
    console.error('❌ Error getting basic stock info:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}