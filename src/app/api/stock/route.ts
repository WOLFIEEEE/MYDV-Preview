import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { getAdvertiserId, logAdvertiserIdResolution } from '@/lib/advertiserIdResolver';
import { StockCacheService } from '@/lib/stockCacheService';
import type { StockQueryOptions } from '@/lib/stockCacheService';
import { SafeOptimizationWrapper } from '@/lib/services/safeOptimizationWrapper';

// Force dynamic rendering - prevent static optimization
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET method to retrieve stock items with intelligent caching
export async function GET(request: NextRequest) {
  console.log('📦 API Route: Stock list request received (with caching)');
  
  try {
    // Get current user from Clerk - SECURITY: This check remains unchanged
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'stock'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // SAFE OPTIMIZATION: Wrap the main logic with performance improvements
    // This preserves ALL existing functionality while adding caching and monitoring
    const { searchParams } = new URL(request.url);
    const cacheKey = SafeOptimizationWrapper.generateSafeCacheKey(
      'stock-list',
      user.id,
      Object.fromEntries(searchParams.entries())
    );

    // TEMPORARILY DISABLE CACHING to fix empty response issue
    // The SafeOptimizationWrapper was caching error responses
    return await SafeOptimizationWrapper.wrapWithSafeOptimizations(
      () => executeOriginalStockLogic(request, user),
      {
        enableCaching: false, // DISABLED: Was causing empty response issues
        cacheKey,
        cacheTTL: 300000, // 5 minutes
        enablePerformanceMonitoring: true,
        endpointName: 'stock-list',
        fallbackToOriginal: true
      }
    );

  } catch (error) {
    console.error('❌ Stock API error (outer catch):', error);
    
    // Check if this is one of our known errors
    if (error instanceof Error) {
      if (error.message.includes('DEALER_NOT_FOUND')) {
        console.error('🚨 DEALER_NOT_FOUND error caught in outer handler');
        return NextResponse.json(
          createErrorResponse({
            type: ErrorType.NOT_FOUND,
            message: 'Registration Incomplete',
            details: 'Your dealer account registration is not complete. Please complete your registration or contact support.',
            httpStatus: 404,
            timestamp: new Date().toISOString(),
            endpoint: 'stock'
          }),
          { status: 404 }
        );
      }
    }
    
    const internalError = createInternalErrorResponse(error, 'stock');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// ORIGINAL LOGIC: Extracted into separate function - NO CHANGES to functionality
async function executeOriginalStockLogic(request: NextRequest, user: any) {
  const requestStartTime = Date.now();
  console.log('✅ User authenticated:', user.id);
  console.log('⏱️ Request received at:', requestStartTime, 'User ready:', !!user?.id);

  try {
    // Get store configuration (works for both store owners and team members)
    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    const configResult = await getStoreConfigForUser(user.id, userEmail);

    if (!configResult.success) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Store configuration not found',
        details: configResult.error || 'Please contact support to set up your store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'stock'
      };
      console.log('❌ Store config not found for user:', user.id, 'Error:', configResult.error);
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    const userStoreConfig = configResult.storeConfig;
    console.log('✅ Store config found, using store owner email:', configResult.storeOwnerEmail);
    
    // Use standardized advertiser ID resolution
    let advertiserId = getAdvertiserId(userStoreConfig);
    logAdvertiserIdResolution(userStoreConfig, 'stock/route');

    if (!advertiserId) {
      console.log('❌ ADVERTISER_ID_NOT_CONFIGURED: No advertisement ID found for user:', user.id);
      console.log('🔍 Checking if user has cached data from previous sessions...');
      
      // Try to get cached data even without advertiser ID (emergency fallback)
      let cachedDataCheck = null;
      try {
        cachedDataCheck = await StockCacheService.getStockData({
          dealerId: user.id,
          advertiserId: 'UNKNOWN', // Placeholder - will trigger emergency fallback
          page: 1,
          pageSize: 10,
        });
      } catch (cacheError) {
        console.log('⚠️ Cache check failed:', cacheError instanceof Error ? cacheError.message : 'Unknown error');
        // Continue to show proper error below
      }
      
      if (cachedDataCheck && cachedDataCheck.results.length > 0) {
        console.log('✅ Found cached data despite missing advertiser ID');
        console.warn('⚠️ WARNING: User should configure advertiser ID to fetch fresh data');
        // Continue with cached data - set advertiserId to UNKNOWN but add warning
        advertiserId = 'UNKNOWN';
      } else {
        // No cached data and no advertiser ID - user must configure
        console.error('🚨 CRITICAL: No advertiser ID and no cached data - user must configure');
        const configError = {
          type: ErrorType.NOT_FOUND,
          message: 'Advertiser ID Required',
          details: 'Please configure your AutoTrader Advertiser ID in Settings to access your stock data. ' +
                   'Your Advertiser ID can be found in your AutoTrader account settings.',
          httpStatus: 404,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(configError),
          { status: 404 }
        );
      }
    }

    console.log('✅ Resolved advertisement ID:', advertiserId || 'USING_CACHED_DATA');

    // Debug: Log request details
    console.log('📋 API Request Details:', {
      userId: user.id,
      advertiserId: advertiserId,
      hasStoreConfig: !!userStoreConfig,
      timestamp: new Date().toISOString()
    });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 10;
    
    // If pageSize is very large (100+), treat it as "fetch all" 
    const effectivePageSize = pageSize >= 100 ? 1000 : pageSize; // Cap at 1000 for safety
    const lifecycleState = searchParams.get('lifecycleState') || undefined;
    const ownershipCondition = searchParams.get('ownershipCondition') || undefined;
    const make = searchParams.get('make') || undefined;
    const model = searchParams.get('model') || undefined;
    const priceFrom = searchParams.get('priceFrom') ? parseFloat(searchParams.get('priceFrom')!) : undefined;
    const priceTo = searchParams.get('priceTo') ? parseFloat(searchParams.get('priceTo')!) : undefined;
    const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!) : undefined;
    const yearTo = searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!) : undefined;
    const mileageFrom = searchParams.get('mileageFrom') ? parseInt(searchParams.get('mileageFrom')!) : undefined;
    const mileageTo = searchParams.get('mileageTo') ? parseInt(searchParams.get('mileageTo')!) : undefined;
    const sortBy = searchParams.get('sortBy') as 'make' | 'model' | 'price' | 'year' | 'mileage' | 'updated' || 'updated';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    console.log('📋 Query parameters:', {
      page, pageSize, lifecycleState, ownershipCondition, make, model,
      priceFrom, priceTo, yearFrom, yearTo, mileageFrom, mileageTo,
      sortBy, sortOrder
    });

    // Build options for cache service
    const options: StockQueryOptions = {
      dealerId: user.id,
      advertiserId: advertiserId || 'UNKNOWN', // Use placeholder if no advertiser ID (will use cached data)
      page,
      pageSize: effectivePageSize,
      make,
      model,
      lifecycleState,
      ownershipCondition,
      priceFrom,
      priceTo,
      yearFrom,
      yearTo,
      mileageFrom,
      mileageTo,
      sortBy,
      sortOrder,
    };

    // Use cache service to get stock data
    console.log('🗄️ Using StockCacheService to get stock data...');
    const stockResponse = await StockCacheService.getStockData(options);

    // Validate response data
    if (!stockResponse) {
      console.error('❌ StockCacheService returned null/undefined response');
      const errorResponse = {
        type: ErrorType.SERVER_ERROR,
        message: 'Stock data service returned invalid response',
        details: 'The stock data service did not return a valid response. Please try again.',
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'stock'
      };
      return NextResponse.json(
        createErrorResponse(errorResponse),
        { status: 500 }
      );
    }

    // Extract filter options from results for frontend
    const availableFilters = extractFilterOptions(stockResponse.results || []);

    // Prepare final response (hook expects 'stock' array)
    const responseData = {
      stock: stockResponse.results || [],  // Ensure we always return an array
      pagination: {
        page: stockResponse.page || 1,
        pageSize: stockResponse.pageSize || 10,
        totalResults: stockResponse.totalResults || 0,
        totalPages: stockResponse.totalPages || 0,
        hasNextPage: stockResponse.hasNextPage || false,
      },
      availableFilters,
      cache: stockResponse.cacheStatus,
    };

    console.log('\n✅ ===== STOCK API: SUCCESS RESPONSE =====');
    console.log('📊 Total results:', stockResponse.totalResults);
    console.log('📄 Page:', stockResponse.page);
    console.log('📄 Page size:', stockResponse.pageSize);
    console.log('🗄️ From cache:', stockResponse.cacheStatus.fromCache);
    console.log('🗄️ Stale cache used:', stockResponse.cacheStatus.staleCacheUsed);
    console.log('📊 Stock items count:', stockResponse.results?.length || 0);
    console.log('🔍 Response data keys:', Object.keys(responseData));
    console.log('🔍 Response data sample:', JSON.stringify(responseData).substring(0, 200));
    
    // Log first few items for debugging
    if (stockResponse.results && stockResponse.results.length > 0) {
      console.log('\n🚗 ===== STOCK API: FIRST ITEM ANALYSIS =====');
      const firstItem = stockResponse.results[0];
      console.log('🆔 Stock ID:', firstItem.stockId);
      console.log('🚗 Make:', firstItem.make);
      console.log('🚗 Model:', firstItem.model);
      console.log('📋 Registration:', firstItem.registration);
      console.log('📊 Lifecycle state:', firstItem.lifecycleState);
      console.log('💰 Forecourt price:', firstItem.forecourtPrice || firstItem.adverts?.retailAdverts?.forecourtPrice?.amountGBP);
      console.log('📢 Advert status:', firstItem.advertStatus);
      console.log('🏗️ Top-level keys:', Object.keys(firstItem));
      
      // Check for missing critical data
      const missingData = [];
      if (!firstItem.make) missingData.push('make');
      if (!firstItem.model) missingData.push('model');
      if (!firstItem.registration) missingData.push('registration');
      if (!firstItem.forecourtPrice && !firstItem.adverts?.retailAdverts?.forecourtPrice?.amountGBP) missingData.push('price');
      
      if (missingData.length > 0) {
        console.warn('⚠️ STOCK API: Missing critical data in first item:', missingData);
      }
    }

    // Create the JSON response
    const successResponse = createSuccessResponse(responseData, 'stock');
    console.log('📤 About to send response:', {
      hasData: !!successResponse,
      keys: Object.keys(successResponse),
      dataLength: JSON.stringify(successResponse).length
    });
    
    const response = NextResponse.json(successResponse);

    // CRITICAL: Minimal caching to ensure fresh data from database
    // Stock data changes frequently and must be up-to-date
    // no-cache forces revalidation with server on every request
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    if (stockResponse.cacheStatus.fromCache) {
      response.headers.set('X-Cache-Status', 'HIT');
    } else {
      response.headers.set('X-Cache-Status', 'MISS');
    }
    
    // Prevent CDN/edge caching completely for user-specific data
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    
    return response;

  } catch (error) {
    console.error('❌ API Route stock list error:', error);
    
    // Handle specific error types with user-friendly messages
    let errorResponse;
    
    if (error instanceof Error) {
      // Handle DEALER_NOT_FOUND error (NEW - from our fixes)
      if (error.message.includes('DEALER_NOT_FOUND')) {
        console.error('🚨 DEALER_NOT_FOUND error caught in API route');
        errorResponse = {
          type: ErrorType.NOT_FOUND,
          message: 'Registration Incomplete',
          details: 'Your dealer account registration is not complete. Please complete your registration or contact support if you recently registered. ' +
                   'If you are a team member, please ask your store owner to add you.',
          httpStatus: 404,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 404 }
        );
      }

      // Handle database errors - don't retry these
      if (error.message.includes('Database query execution failed') ||
          error.message.includes('Database insert failed') ||
          error.message.includes('Database connection error')) {
        errorResponse = {
          type: ErrorType.SERVER_ERROR,
          message: 'Database Error',
          details: 'A database error occurred while processing your request. Please try again later or contact support if the issue persists.',
          httpStatus: 500,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 500 }
        );
      }
      
      // Handle duplicate stock ID errors - critical data integrity issue
      if (error.message.includes('Duplicate stock ID detected') ||
          error.message.includes('duplicate key') ||
          error.message.includes('Duplicate key constraint violation')) {
        errorResponse = {
          type: ErrorType.VALIDATION,
          message: 'Data Integrity Issue',
          details: error.message,
          httpStatus: 422,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 422 }
        );
      }
      
      // Handle configuration errors - don't retry these
      if (error.message.includes('Invalid advertiser ID configuration') ||
          error.message.includes('advertiser ID is correct') ||
          error.message.includes('foreign key constraint') ||
          error.message.includes('constraint violation')) {
        errorResponse = {
          type: ErrorType.VALIDATION,
          message: 'Invalid Advertiser Configuration',
          details: 'Your advertiser ID configuration is invalid. Please verify your advertiser ID is correct and properly set up in your account settings.',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 400 }
        );
      }
      
      // Handle AutoTrader authentication errors - don't retry these
      if (error.message.includes('AutoTrader authentication failed') ||
          error.message.includes('verify your API credentials')) {
        errorResponse = {
          type: ErrorType.AUTHENTICATION,
          message: 'AutoTrader Authentication Failed',
          details: 'Your AutoTrader API credentials are invalid. Please check your API key and secret in your account settings.',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 401 }
        );
      }
      
      // Handle advertiser ID conflicts - don't retry these
      if (error.message.includes('Advertiser ID conflict') ||
          error.message.includes('already being used by another account')) {
        errorResponse = {
          type: ErrorType.VALIDATION,
          message: 'Advertiser ID Conflict',
          details: 'This advertiser ID is already being used by another account. Please contact support to resolve this conflict.',
          httpStatus: 409,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 409 }
        );
      }
      
      if (error.message.includes('duplicate key')) {
        // Duplicate key errors are recoverable - return partial success
        errorResponse = {
          type: ErrorType.VALIDATION,
          message: 'Stock data partially loaded',
          details: 'Some stock items were already cached. Your stock list may be incomplete. Please try refreshing.',
          httpStatus: 206, // Partial Content
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 206 }
        );
      }
      
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        errorResponse = {
          type: ErrorType.NETWORK_ERROR,
          message: 'Service temporarily unavailable',
          details: 'Unable to connect to stock data service. Please try again in a moment.',
          httpStatus: 503,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 503 }
        );
      }
      
      if (error.message.includes('AutoTrader') || error.message.includes('HTTP 4') || error.message.includes('HTTP 5')) {
        errorResponse = {
          type: ErrorType.SERVER_ERROR,
          message: 'External service error',
          details: 'Unable to fetch stock data from AutoTrader. Please try again later.',
          httpStatus: 502,
          timestamp: new Date().toISOString(),
          endpoint: 'stock'
        };
        return NextResponse.json(
          createErrorResponse(errorResponse),
          { status: 502 }
        );
      }
    }
    
    // Default internal server error
    const internalError = createInternalErrorResponse(error, 'stock');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
} // End of executeOriginalStockLogic function

// Helper function to extract filter options from results
interface StockItem {
  make?: string;
  model?: string;
  bodyType?: string;
  fuelType?: string;
  yearOfManufacture?: number;
  lifecycleState?: string;
  ownershipCondition?: string;
  forecourtPrice?: { amountGBP?: number };
  odometerReadingMiles?: number;
  vehicle?: {
    transmissionType?: string;
    colour?: string;
  };
}

function extractFilterOptions(results: StockItem[]): {
  makes: string[];
  models: string[];
  bodyTypes: string[];
  fuelTypes: string[];
  transmissionTypes: string[];
  colours: string[];
  years: number[];
  priceRange: { min: number; max: number } | null;
  mileageRange: { min: number; max: number } | null;
  lifecycleStates: string[];
  ownershipConditions: string[];
} {
  if (!results || results.length === 0) {
    return {
      makes: [],
      models: [],
      bodyTypes: [],
      fuelTypes: [],
      transmissionTypes: [],
      colours: [],
      years: [],
      priceRange: null,
      mileageRange: null,
      lifecycleStates: [],
      ownershipConditions: [],
    };
  }

  const makes = new Set<string>();
  const models = new Set<string>();
  const bodyTypes = new Set<string>();
  const fuelTypes = new Set<string>();
  const transmissionTypes = new Set<string>();
  const colours = new Set<string>();
  const years = new Set<number>();
  const lifecycleStates = new Set<string>();
  const ownershipConditions = new Set<string>();
  
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let minMileage: number | null = null;
  let maxMileage: number | null = null;

  results.forEach(item => {
    // Core fields from cache
    if (item.make) makes.add(item.make);
    if (item.model) models.add(item.model);
    if (item.bodyType) bodyTypes.add(item.bodyType);
    if (item.fuelType) fuelTypes.add(item.fuelType);
    if (item.yearOfManufacture) years.add(item.yearOfManufacture);
    if (item.lifecycleState) lifecycleStates.add(item.lifecycleState);
    if (item.ownershipCondition) ownershipConditions.add(item.ownershipCondition);

    // From vehicle data in JSON field
    const vehicle = item.vehicle || {};
    if (vehicle.transmissionType) transmissionTypes.add(vehicle.transmissionType);
    if (vehicle.colour) colours.add(vehicle.colour);

    // Price range from forecourt price
    if (item.forecourtPrice?.amountGBP) {
      const price = item.forecourtPrice.amountGBP;
      minPrice = minPrice === null ? price : Math.min(minPrice, price);
      maxPrice = maxPrice === null ? price : Math.max(maxPrice, price);
    }

    // Mileage range
    if (item.odometerReadingMiles) {
      const mileage = item.odometerReadingMiles;
      minMileage = minMileage === null ? mileage : Math.min(minMileage, mileage);
      maxMileage = maxMileage === null ? mileage : Math.max(maxMileage, mileage);
    }
  });

  return {
    makes: Array.from(makes).sort(),
    models: Array.from(models).sort(),
    bodyTypes: Array.from(bodyTypes).sort(),
    fuelTypes: Array.from(fuelTypes).sort(),
    transmissionTypes: Array.from(transmissionTypes).sort(),
    colours: Array.from(colours).sort(),
    years: Array.from(years).sort((a, b) => b - a), // Newest first
    priceRange: minPrice !== null && maxPrice !== null ? { min: minPrice, max: maxPrice } : null,
    mileageRange: minMileage !== null && maxMileage !== null ? { min: minMileage, max: maxMileage } : null,
    lifecycleStates: Array.from(lifecycleStates).sort(),
    ownershipConditions: Array.from(ownershipConditions).sort()
  };
}

// POST method remains the same as original
export async function POST(request: NextRequest) {
  console.log('📦 API Route: Stock request received');
  
  try {
    const body = await request.json();
    console.log('📋 Stock request data:', JSON.stringify(body, null, 2));
    
    const { vehicle } = body;
    
    if (!vehicle) {
      return NextResponse.json({
        success: false,
        message: 'Vehicle data is required',
        timestamp: new Date().toISOString(),
        endpoint: 'stock'
      }, { status: 400 });
    }

    // Validate required fields
    const requiredFields = ['derivativeId', 'make', 'model', 'year', 'mileage', 'condition'];
    const missingFields = requiredFields.filter(field => !vehicle[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        timestamp: new Date().toISOString(),
        endpoint: 'stock'
      }, { status: 400 });
    }

    // Generate a unique stock ID
    const stockId = `STK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // In a real application, you would save this to a database
    // For now, we'll simulate a successful response
    const stockData = {
      stockId,
      vehicle: {
        ...vehicle,
        dateAdded: new Date().toISOString(),
        status: 'Available'
      }
    };

    console.log('✅ Vehicle added to stock successfully');
    console.log('📦 Stock data:', JSON.stringify(stockData, null, 2));

    return NextResponse.json({
      success: true,
      data: stockData,
      message: 'Vehicle successfully added to stock',
      timestamp: new Date().toISOString(),
      endpoint: 'stock'
    });

  } catch (error) {
    console.error('❌ Stock API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      endpoint: 'stock'
    }, { status: 500 });
  }
}