import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stockCache, dealers } from '@/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';

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

    // Get advertiserId from store config (supports team member credential delegation)
    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    const configResult = await getStoreConfigForUser(user.id, userEmail);
    
    if (!configResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: configResult.error || 'Store configuration not found' 
      }, { status: 404 });
    }

    // Extract advertiserId from store config
    const userStoreConfig = configResult.storeConfig;
    let advertiserId = userStoreConfig.primaryAdvertisementId || userStoreConfig.advertisementId;
    
    // Handle JSON array format if needed
    if (userStoreConfig.advertisementId && !advertiserId) {
      try {
        const adIds = JSON.parse(userStoreConfig.advertisementId);
        if (Array.isArray(adIds) && adIds.length > 0) {
          advertiserId = adIds[0];
        } else if (typeof adIds === 'string') {
          advertiserId = adIds;
        }
      } catch (e) {
        console.log('⚠️ Could not parse advertisementId JSON, using primary:', e);
      }
    }

    if (!advertiserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Advertiser ID not found in store configuration' 
      }, { status: 404 });
    }

    // Build search conditions based on provided parameters
    let searchConditions = [eq(stockCache.advertiserId, advertiserId)];

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
