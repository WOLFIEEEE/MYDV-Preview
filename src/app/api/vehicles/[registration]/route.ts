import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stockCache, dealers, teamMembers } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ registration: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const registration = params.registration;
    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Registration number is required' },
        { status: 400 }
      );
    }

    console.log(`📋 Fetching vehicle details for registration: ${registration}`);

    // Get dealer ID (handles both dealers and team members)
    let dealerId: string | null = null;

    // First check if user is a dealer
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    if (dealerResult.length > 0) {
      dealerId = dealerResult[0].id;
    } else {
      // If not a dealer, check if they are a team member
      const teamMemberResult = await db
        .select({ storeOwnerId: teamMembers.storeOwnerId })
        .from(teamMembers)
        .where(eq(teamMembers.clerkUserId, user.id))
        .limit(1);
      
      if (teamMemberResult.length > 0) {
        dealerId = teamMemberResult[0].storeOwnerId;
      }
    }

    if (!dealerId) {
      return NextResponse.json(
        { success: false, error: 'Dealer not found or unauthorized' },
        { status: 404 }
      );
    }

    // Search for vehicle by registration (case-insensitive)
    const vehicleResult = await db
      .select({
        stockId: stockCache.stockId,
        make: stockCache.make,
        model: stockCache.model,
        derivative: stockCache.derivative,
        registration: stockCache.registration,
        vin: stockCache.vin,
        yearOfManufacture: stockCache.yearOfManufacture,
        odometerReadingMiles: stockCache.odometerReadingMiles,
        fuelType: stockCache.fuelType,
        bodyType: stockCache.bodyType,
        forecourtPriceGBP: stockCache.forecourtPriceGBP,
        totalPriceGBP: stockCache.totalPriceGBP,
        lifecycleState: stockCache.lifecycleState,
        ownershipCondition: stockCache.ownershipCondition,
        vehicleData: stockCache.vehicleData, // Extended data as JSON
        lastFetchedFromAutoTrader: stockCache.lastFetchedFromAutoTrader,
      })
      .from(stockCache)
      .where(and(
        eq(stockCache.dealerId, dealerId),
        or(
          eq(stockCache.registration, registration.toUpperCase()),
          eq(stockCache.registration, registration.toLowerCase()),
          eq(stockCache.registration, registration)
        )
      ))
      .limit(1);

    if (vehicleResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found in inventory' },
        { status: 404 }
      );
    }

    const vehicle = vehicleResult[0];
    const vehicleData = vehicle.vehicleData as any; // AutoTrader vehicle data JSON

    console.log(`✅ Found vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.registration})`);

    return NextResponse.json({
      success: true,
      data: {
        stockId: vehicle.stockId,
        make: vehicle.make,
        model: vehicle.model,
        derivative: vehicle.derivative,
        registration: vehicle.registration,
        vin: vehicle.vin,
        year: vehicle.yearOfManufacture,
        mileage: vehicle.odometerReadingMiles,
        fuelType: vehicle.fuelType,
        bodyType: vehicle.bodyType,
        colour: vehicleData?.colour || null, // From JSON data
        doors: vehicleData?.doors || null, // From JSON data
        seats: vehicleData?.seats || null, // From JSON data
        engineSize: vehicleData?.engineSize ? `${vehicleData.engineSize}L` : null, // From JSON data
        transmission: vehicleData?.transmission || null, // From JSON data
        driveType: vehicleData?.driveType || null, // From JSON data
        euroStatus: vehicleData?.euroStatus || null, // From JSON data
        co2Emissions: vehicleData?.co2Emissions ? `${vehicleData.co2Emissions}g/km` : null, // From JSON data
        fuelConsumption: vehicleData?.fuelConsumption ? `${vehicleData.fuelConsumption}mpg` : null, // From JSON data
        forecourtPrice: vehicle.forecourtPriceGBP ? parseFloat(vehicle.forecourtPriceGBP) : null,
        totalPrice: vehicle.totalPriceGBP ? parseFloat(vehicle.totalPriceGBP) : null,
        lifecycleState: vehicle.lifecycleState,
        ownershipCondition: vehicle.ownershipCondition,
        lastUpdated: vehicle.lastFetchedFromAutoTrader,
      }
    });

  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch vehicle details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
