import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stockCache, dealers } from '@/db/schema';
import { eq, and, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration');

    if (!registration) {
      return NextResponse.json({ 
        success: false, 
        error: 'Registration parameter is required' 
      }, { status: 400 });
    }

    // Get dealer ID (handle both store owners and team members)
    const userMetadata = user.publicMetadata;
    const userType = userMetadata?.userType as string;
    const storeOwnerId = userMetadata?.storeOwnerId as string;
    
    let dealerId: string;

    if (userType === 'team_member' && storeOwnerId) {
      dealerId = storeOwnerId;
    } else {
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, user.id))
        .limit(1);

      if (dealerResult.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Dealer record not found' 
        }, { status: 404 });
      }

      dealerId = dealerResult[0].id;
    }

    // Clean the registration (remove spaces, convert to uppercase)
    const cleanRegistration = registration.replace(/\s+/g, '').toUpperCase();

    // Search for vehicles in inventory by registration
    // Support both exact matches and partial matches for autocomplete
    const vehicles = await db
      .select({
        stockId: stockCache.stockId,
        registration: stockCache.registration,
        make: stockCache.make,
        model: stockCache.model,
        yearOfManufacture: stockCache.yearOfManufacture,
        fuelType: stockCache.fuelType,
        bodyType: stockCache.bodyType,
        lifecycleState: stockCache.lifecycleState,
        forecourtPriceGBP: stockCache.forecourtPriceGBP,
        odometerReadingMiles: stockCache.odometerReadingMiles,
      })
      .from(stockCache)
      .where(
        and(
          eq(stockCache.dealerId, dealerId),
          ilike(stockCache.registration, `%${cleanRegistration}%`)
        )
      )
      .orderBy(stockCache.registration) // Order by registration for consistent results
      .limit(10);

    return NextResponse.json({
      success: true,
      data: vehicles
    });

  } catch (error) {
    console.error('❌ Error searching vehicle inventory:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search vehicle inventory'
    }, { status: 500 });
  }
}
