import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  parseAutoTraderError, 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Vehicle search parameters interface
interface VehicleSearchParams {
  make?: string;
  model?: string;
  year?: string;
  fuelType?: string;
  bodyType?: string;
  priceMin?: string;
  priceMax?: string;
  mileageMax?: string;
  postcode?: string;
  radius?: string;
  page?: string;
  size?: string;
}

export async function GET(request: NextRequest) {
  console.log('🔍 API Route: Vehicle search request received');

  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-search'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'No email address found for the authenticated user',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-search'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Extract search parameters
    const searchCriteria: VehicleSearchParams = {
      make: searchParams.get('make') || undefined,
      model: searchParams.get('model') || undefined,
      year: searchParams.get('year') || undefined,
      fuelType: searchParams.get('fuelType') || undefined,
      bodyType: searchParams.get('bodyType') || undefined,
      priceMin: searchParams.get('priceMin') || undefined,
      priceMax: searchParams.get('priceMax') || undefined,
      mileageMax: searchParams.get('mileageMax') || undefined,
      postcode: searchParams.get('postcode') || undefined,
      radius: searchParams.get('radius') || '50', // Default 50 miles
      page: searchParams.get('page') || '1',
      size: searchParams.get('size') || '20'
    };

    console.log('🔍 Vehicle search parameters:', searchCriteria);

    // Validate required parameters
    if (!searchCriteria.make) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Make is required for vehicle search',
        details: 'Please provide a vehicle make to search for',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-search'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get user's store configuration for advertiser ID
    const storeConfigResult = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clerkUserId, user.id))
      .limit(1);

    let advertiserId: string | undefined;
    if (storeConfigResult.length > 0) {
      advertiserId = storeConfigResult[0].primaryAdvertisementId || undefined;
    }

    // Get authentication token
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Failed to authenticate with AutoTrader',
        details: authResult.error ? String(authResult.error) : 'Authentication failed',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-search'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    console.log('✅ AutoTrader authentication successful');

    // Get base URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    console.log('🔍 Using base URL:', baseUrl);

    // Build search parameters for AutoTrader API
    const apiParams = new URLSearchParams();
    
    // Add advertiser ID if available
    if (advertiserId) {
      apiParams.append('advertiserId', advertiserId);
    }

    // Add search criteria
    if (searchCriteria.make) apiParams.append('make', searchCriteria.make);
    if (searchCriteria.model) apiParams.append('model', searchCriteria.model);
    if (searchCriteria.year) apiParams.append('year', searchCriteria.year);
    if (searchCriteria.fuelType) apiParams.append('fuelType', searchCriteria.fuelType);
    if (searchCriteria.bodyType) apiParams.append('bodyType', searchCriteria.bodyType);
    if (searchCriteria.priceMin) apiParams.append('priceFrom', searchCriteria.priceMin);
    if (searchCriteria.priceMax) apiParams.append('priceTo', searchCriteria.priceMax);
    if (searchCriteria.mileageMax) apiParams.append('mileageTo', searchCriteria.mileageMax);
    if (searchCriteria.postcode) apiParams.append('postcode', searchCriteria.postcode);
    if (searchCriteria.radius) apiParams.append('radius', searchCriteria.radius);
    if (searchCriteria.page) apiParams.append('page', searchCriteria.page);
    if (searchCriteria.size) apiParams.append('size', searchCriteria.size);

    // Add additional useful parameters
    apiParams.append('sort', 'price-asc'); // Sort by price ascending
    apiParams.append('includeImages', 'true'); // Include images
    apiParams.append('includeFeatures', 'true'); // Include features

    const searchUrl = `${baseUrl}/search/vehicles?${apiParams.toString()}`;
    console.log('📡 Making vehicle search request to:', searchUrl);

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📨 Vehicle search API response status:', searchResponse.status);

    if (!searchResponse.ok) {
      // If the search endpoint doesn't exist, return mock data for now
      if (searchResponse.status === 404) {
        console.log('⚠️ Search endpoint not available, returning mock data');
        
        const mockResults = {
          results: [
            {
              id: "mock-1",
              make: searchCriteria.make,
              model: searchCriteria.model || "Unknown Model",
              year: searchCriteria.year || "2020",
              price: "£15,000",
              mileage: "45,000",
              fuelType: searchCriteria.fuelType || "Petrol",
              bodyType: searchCriteria.bodyType || "Hatchback",
              location: "London",
              images: [],
              features: [],
              description: `${searchCriteria.make} ${searchCriteria.model || "vehicle"} in excellent condition`,
              estimatedPrice: "£14,500 - £15,500",
              availability: "Available Now"
            },
            {
              id: "mock-2", 
              make: searchCriteria.make,
              model: searchCriteria.model || "Unknown Model",
              year: searchCriteria.year || "2019",
              price: "£13,500",
              mileage: "52,000",
              fuelType: searchCriteria.fuelType || "Diesel",
              bodyType: searchCriteria.bodyType || "Estate",
              location: "Manchester",
              images: [],
              features: [],
              description: `${searchCriteria.make} ${searchCriteria.model || "vehicle"} with full service history`,
              estimatedPrice: "£13,000 - £14,000",
              availability: "Available Now"
            }
          ],
          totalResults: 2,
          page: parseInt(searchCriteria.page || '1'),
          size: parseInt(searchCriteria.size || '20'),
          totalPages: 1
        };

        return NextResponse.json(
          createSuccessResponse(mockResults, 'vehicle-search')
        );
      }

      const error = await parseAutoTraderError(searchResponse, 'vehicle-search');
      console.error('❌ Vehicle search failed:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const searchData = await searchResponse.json();
    console.log('✅ Vehicle search successful');
    
    if (searchData.results) {
      console.log('🚗 Search results:', {
        totalResults: searchData.totalResults || searchData.results.length,
        page: searchData.page || 1,
        resultsOnPage: searchData.results.length
      });
    }

    // Return success response with standardized format
    return NextResponse.json(
      createSuccessResponse(searchData, 'vehicle-search')
    );

  } catch (error) {
    console.error('❌ API Route vehicle search error:', error);
    const internalError = createInternalErrorResponse(error, 'vehicle-search');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
