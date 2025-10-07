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
    const stockId = searchParams.get('stockId');
    const query = searchParams.get('query');
    const limit = searchParams.get('limit');

    // At least one search parameter is required
    if (!registration && !stockId && !query) {
      return NextResponse.json({ 
        success: false, 
        error: 'At least one search parameter (registration, stockId, or query) is required' 
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

    // Build search conditions based on provided parameters
    let searchConditions = [eq(stockCache.dealerId, dealerId)];

    if (stockId) {
      // Exact match for stockId
      searchConditions.push(eq(stockCache.stockId, stockId));
    } else if (registration) {
      // Clean the registration (remove spaces, convert to uppercase)
      const cleanRegistration = registration.replace(/\s+/g, '').toUpperCase();
      searchConditions.push(ilike(stockCache.registration, `%${cleanRegistration}%`));
    } else if (query) {
      // General search across multiple fields
      const cleanQuery = query.replace(/\s+/g, '').toUpperCase();
      // Search in registration field with the query
      searchConditions.push(ilike(stockCache.registration, `%${cleanQuery}%`));
    }

    // Determine limit value
    let limitValue = 10; // Default limit
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        limitValue = limitNum;
      }
    }

    // Search for vehicles in inventory
    const vehicles = await db
      .select({
        stockId: stockCache.stockId,
        registration: stockCache.registration,
        make: stockCache.make,
        model: stockCache.model,
        year: stockCache.yearOfManufacture,
        fuelType: stockCache.fuelType,
        bodyType: stockCache.bodyType,
        lifecycleState: stockCache.lifecycleState,
        forecourtPriceGBP: stockCache.forecourtPriceGBP,
        odometerReadingMiles: stockCache.odometerReadingMiles,
      })
      .from(stockCache)
      .where(and(...searchConditions))
      .orderBy(stockCache.registration)
      .limit(limitValue);

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
