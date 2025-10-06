import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { stockCache } from '@/db/schema';
import { eq, desc, isNotNull } from 'drizzle-orm';

// GET /api/invoice-vehicles - Get all vehicles for invoice generation
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID
    const dealerResult = await getDealerIdForUser(user);
    if (!dealerResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerResult.error || 'Dealer not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult.dealerId;

    // Fetch all vehicles for this dealer with essential information for invoices
    const vehicles = await db
      .select({
        stockId: stockCache.stockId,
        registration: stockCache.registration,
        make: stockCache.make,
        model: stockCache.model,
        derivative: stockCache.derivative,
        yearOfManufacture: stockCache.yearOfManufacture,
        fuelType: stockCache.fuelType,
        bodyType: stockCache.bodyType,
        odometerReadingMiles: stockCache.odometerReadingMiles,
        vin: stockCache.vin,
        forecourtPriceGBP: stockCache.forecourtPriceGBP,
        lifecycleState: stockCache.lifecycleState,
        ownershipCondition: stockCache.ownershipCondition,
        // Note: extendedData field might not exist in current schema
      })
      .from(stockCache)
      .where(eq(stockCache.dealerId, dealerId!))
      .orderBy(desc(stockCache.lastFetchedFromAutoTrader));

    // Process vehicles to format data
    const processedVehicles = vehicles.map(vehicle => {
      let colour = null;
      
      // Color information would need to be extracted from other sources
      // as extendedData field is not available in current schema

      return {
        stockId: vehicle.stockId,
        registration: vehicle.registration || 'N/A',
        make: vehicle.make || '',
        model: vehicle.model || '',
        derivative: vehicle.derivative || '',
        year: vehicle.yearOfManufacture || null,
        yearOfManufacture: vehicle.yearOfManufacture || null,
        fuelType: vehicle.fuelType || '',
        bodyType: vehicle.bodyType || '',
        mileage: vehicle.odometerReadingMiles || null,
        odometerReadingMiles: vehicle.odometerReadingMiles || null,
        vin: vehicle.vin || '',
        colour: colour,
        price: vehicle.forecourtPriceGBP || null,
        lifecycleState: vehicle.lifecycleState || '',
        ownershipCondition: vehicle.ownershipCondition || '',
        // Create a display name for the dropdown
        displayName: `${vehicle.registration || 'No Reg'} - ${vehicle.make} ${vehicle.model} ${vehicle.derivative || ''}`.trim(),
      };
    });

    return NextResponse.json({
      success: true,
      vehicles: processedVehicles,
      total: processedVehicles.length
    });

  } catch (error) {
    console.error('Error fetching vehicles for invoice:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch vehicles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
