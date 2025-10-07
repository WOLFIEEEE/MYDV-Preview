import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { storeConfig, stockCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ErrorType, createErrorResponse } from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { RetailCheckData, VehicleInfo } from '@/types/retail-check';
import { OptimizedRetailCheckService } from '@/lib/services/optimizedRetailCheckService';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

interface RetailCheckRequest {
  // Flow type
  flow: 'stock' | 'vehicle-finder' | 'taxonomy';
  
  // Stock flow parameters
  stockId?: string;
  
  // Vehicle finder flow parameters
  registration?: string;
  vrm?: string;
  
  // Taxonomy flow parameters
  derivativeId?: string;
  
  // Common parameters
  mileage?: number;
  
  // Vehicle check parameter
  check?: boolean;
  
  // New optimization parameters
  includeTrendedValuations?: boolean;
  useOptimizedFlow?: boolean;
}

export async function POST(request: NextRequest) {
  console.log('🔍 API Route: Retail check request received');

  try {
    // Authentication check
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'retail-check'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'No email address found for the authenticated user',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'retail-check'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    // Get the correct email to use (store owner's email for team members)
    const configResult = await getStoreConfigForUser(user.id, userEmail);
    let email: string;
    
    if (configResult.success && configResult.storeOwnerEmail) {
      email = configResult.storeOwnerEmail;
      console.log('👥 Using store owner email for retail check:', email);
    } else {
      email = userEmail;
      console.log('🏢 Using own email for retail check:', email);
    }

    const body: RetailCheckRequest = await request.json();
    console.log('📊 Retail check request data:', body);

    // Validate required fields based on flow type
    if (!body.flow) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Flow type is required',
        details: 'Please specify the flow type: stock, vehicle-finder, or taxonomy',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'retail-check'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Validate flow-specific parameters
    let vehicleInfo: VehicleInfo;
    
    switch (body.flow) {
      case 'stock':
        if (!body.stockId) {
          const validationError = {
            type: ErrorType.VALIDATION,
            message: 'Stock ID is required for stock flow',
            details: 'Please provide a valid stock ID',
            httpStatus: 400,
            timestamp: new Date().toISOString(),
            endpoint: 'retail-check'
          };
          return NextResponse.json(
            createErrorResponse(validationError),
            { status: 400 }
          );
        }
        
        // Get vehicle info from stock database
        vehicleInfo = await getVehicleInfoFromStock(body.stockId);
        break;
        
      case 'vehicle-finder':
        const registration = body.registration || body.vrm;
        if (!registration || !body.mileage) {
          const validationError = {
            type: ErrorType.VALIDATION,
            message: 'Registration and mileage are required for vehicle-finder flow',
            details: 'Please provide both registration number and mileage',
            httpStatus: 400,
            timestamp: new Date().toISOString(),
            endpoint: 'retail-check'
          };
          return NextResponse.json(
            createErrorResponse(validationError),
            { status: 400 }
          );
        }
        
        // Get vehicle info from AutoTrader vehicle lookup
        vehicleInfo = await getVehicleInfoFromRegistration(registration, body.mileage, email);
        break;
        
      case 'taxonomy':
        if (!body.derivativeId || !body.mileage) {
          const validationError = {
            type: ErrorType.VALIDATION,
            message: 'Derivative ID and mileage are required for taxonomy flow',
            details: 'Please provide both derivative ID and mileage',
            httpStatus: 400,
            timestamp: new Date().toISOString(),
            endpoint: 'retail-check'
          };
          return NextResponse.json(
            createErrorResponse(validationError),
            { status: 400 }
          );
        }
        
        // Get vehicle info from taxonomy derivative
        vehicleInfo = await getVehicleInfoFromDerivative(body.derivativeId, body.mileage, email);
        break;
        
      default:
        const validationError = {
          type: ErrorType.VALIDATION,
          message: 'Invalid flow type',
          details: 'Flow type must be one of: stock, vehicle-finder, taxonomy',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'retail-check'
        };
        return NextResponse.json(
          createErrorResponse(validationError),
          { status: 400 }
        );
    }

    // Check if vehicle check is requested
    const includeVehicleCheck = body.check === true;
    const includeTrendedValuations = body.includeTrendedValuations === true;
    const useOptimizedFlow = body.useOptimizedFlow !== false; // Default to true
    
    let retailCheckData: RetailCheckData;
    
    if (useOptimizedFlow) {
      console.log('🚀 Using optimized retail check flow');
      retailCheckData = await OptimizedRetailCheckService.performOptimizedRetailCheck(
        vehicleInfo, 
        email, 
        includeVehicleCheck,
        includeTrendedValuations
      );
    } else {
      console.log('📊 Using legacy retail check flow');
      retailCheckData = await performRetailCheck(vehicleInfo, email, includeVehicleCheck);
    }

    console.log('✅ Retail check completed successfully');
    return NextResponse.json({
      success: true,
      data: retailCheckData,
      timestamp: new Date().toISOString(),
      optimized: useOptimizedFlow,
      cacheStats: useOptimizedFlow ? OptimizedRetailCheckService.getCacheStats() : undefined
    });

  } catch (error) {
    console.error('❌ Retail check error:', error);
    
    const serverError = {
      type: ErrorType.SERVER_ERROR,
      message: 'Internal server error during retail check',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      httpStatus: 500,
      timestamp: new Date().toISOString(),
      endpoint: 'retail-check'
    };

    return NextResponse.json(
      createErrorResponse(serverError),
      { status: 500 }
    );
  }
}

// Helper function to get vehicle info from stock database with enhanced AutoTrader data
async function getVehicleInfoFromStock(stockId: string): Promise<VehicleInfo> {
  console.log('🔍 Getting vehicle info from stock:', stockId);
  
  const stockResult = await db
    .select()
    .from(stockCache)
    .where(eq(stockCache.stockId, stockId))
    .limit(1);

  if (stockResult.length === 0) {
    throw new Error(`Stock not found: ${stockId}`);
  }

  const stockItem = stockResult[0];
  console.log('📦 Stock item found:', {
    stockId: stockItem.stockId,
    registration: stockItem.registration,
    make: stockItem.make,
    model: stockItem.model,
    mileage: stockItem.odometerReadingMiles
  });

  // Create base vehicle info from stock data
  const baseVehicleInfo: VehicleInfo = {
    registration: stockItem.registration || 'N/A',
    make: stockItem.make || 'Unknown',
    model: stockItem.model || 'Unknown',
    derivative: stockItem.derivative || undefined,
    year: stockItem.yearOfManufacture || new Date().getFullYear(),
    mileage: stockItem.odometerReadingMiles || 0,
    fuelType: stockItem.fuelType || undefined,
    transmission: (stockItem.vehicleData as Record<string, unknown>)?.transmissionType as string || undefined,
    stockId: stockItem.stockId, // Include stock ID for reference
    // Add stock pricing information
    forecourtPrice: stockItem.forecourtPriceGBP ? parseFloat(stockItem.forecourtPriceGBP.toString()) : undefined,
    totalPrice: stockItem.totalPriceGBP ? parseFloat(stockItem.totalPriceGBP.toString()) : undefined
  };

  // If we have a valid registration, enhance with AutoTrader data
  if (stockItem.registration && stockItem.registration !== 'N/A' && stockItem.registration.length >= 3) {
    try {
      console.log('🚀 Enhancing stock data with AutoTrader API for registration:', stockItem.registration);
      
      // We need the user's email for AutoTrader authentication
      // Since we don't have it in this function, we'll need to pass it
      // For now, let's get it from the current user context
      const user = await currentUser();
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        console.warn('⚠️ No user email found, using stock data only');
        return baseVehicleInfo;
      }

      const userEmail = user.emailAddresses[0].emailAddress;
      
      // Get the correct email to use (store owner's email for team members)
      const configResult = await getStoreConfigForUser(user.id, userEmail);
      let email: string;
      
      if (configResult.success && configResult.storeOwnerEmail) {
        email = configResult.storeOwnerEmail;
      } else {
        email = userEmail;
      }

      // Call AutoTrader API to get enhanced vehicle data
      const enhancedVehicleInfo = await getVehicleInfoFromRegistration(
        stockItem.registration, 
        stockItem.odometerReadingMiles || 0, 
        email
      );

      // Merge stock data with AutoTrader data (stock data takes precedence for basic info)
      const mergedVehicleInfo: VehicleInfo = {
        ...enhancedVehicleInfo, // AutoTrader data (includes apiResponse, valuations, etc.)
        ...baseVehicleInfo, // Stock data overrides (make, model, year, etc. from your database)
        // Keep important AutoTrader data
        derivativeId: enhancedVehicleInfo.derivativeId || baseVehicleInfo.derivativeId,
        apiResponse: enhancedVehicleInfo.apiResponse, // This contains valuations, features, etc.
        competitorsUrl: enhancedVehicleInfo.competitorsUrl, // For competition analysis
      };

      console.log('✅ Successfully merged stock data with AutoTrader data');
      return mergedVehicleInfo;

    } catch (error) {
      console.warn('⚠️ Failed to enhance stock data with AutoTrader API, using stock data only:', error);
      // Return stock data only if AutoTrader enhancement fails
      return baseVehicleInfo;
    }
  } else {
    console.log('ℹ️ No valid registration found, using stock data only');
    return baseVehicleInfo;
  }
}

// Helper function to get vehicle info from registration lookup
async function getVehicleInfoFromRegistration(registration: string, mileage: number, email: string): Promise<VehicleInfo> {
  console.log('🔍 Getting vehicle info from registration:', registration);
  
  // Get authentication token
  const authResult = await getAutoTraderToken(email);
  if (!authResult.success) {
    throw new Error('Failed to authenticate with AutoTrader API');
  }

  // Get advertiser ID from store config (same logic as vehicles API)
  const storeConfigResult = await db
    .select({
      advertisementId: storeConfig.advertisementId,
      primaryAdvertisementId: storeConfig.primaryAdvertisementId,
      storeName: storeConfig.storeName
    })
    .from(storeConfig)
    .where(eq(storeConfig.email, email))
    .limit(1);

  if (storeConfigResult.length === 0) {
    throw new Error(`No store configuration found for email: ${email}`);
  }

  const userStoreConfig = storeConfigResult[0];
  let advertiserId = userStoreConfig.primaryAdvertisementId;
  
  // Try to parse new advertisementId field if primary is not available
  if (!advertiserId && userStoreConfig.advertisementId) {
    try {
      const parsedIds = JSON.parse(userStoreConfig.advertisementId);
      if (Array.isArray(parsedIds) && parsedIds.length > 0) {
        advertiserId = parsedIds[0];
      }
    } catch {
      console.log('Failed to parse advertisementId JSON, using fallback');
    }
  }
  
  if (!advertiserId) {
    advertiserId = process.env.ADVERTISER_ID || process.env.NEXT_PUBLIC_ADVERTISER_ID || '10028737';
  }

  const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
  
  // Build vehicle lookup request with proper parameters including competitors
  const vehicleParams = new URLSearchParams();
  vehicleParams.append('advertiserId', advertiserId);
  vehicleParams.append('registration', registration);
  vehicleParams.append('odometerReadingMiles', mileage.toString()); // Required for valuations and metrics
  vehicleParams.append('features', 'true');
  vehicleParams.append('vehicleMetrics', 'true');
  vehicleParams.append('valuations', 'true');
  vehicleParams.append('check', 'true');
  vehicleParams.append('history', 'true');
  vehicleParams.append('competitors', 'true'); // Add competitors URL

  const vehicleUrl = `${baseUrl}/vehicles?${vehicleParams.toString()}`;
  console.log('📡 Making vehicle request to:', vehicleUrl);
  
  const response = await fetch(vehicleUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authResult.access_token!}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Vehicle API error:', response.status, errorText);
    throw new Error(`Failed to fetch vehicle data: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Vehicle API response:', { 
    hasVehicle: !!data.vehicle, 
    vehicleKeys: data.vehicle ? Object.keys(data.vehicle) : [],
    registration: data.vehicle?.registration 
  });
  
  if (!data.vehicle) {
    throw new Error(`No vehicle found for registration: ${registration}`);
  }

  const vehicle = data.vehicle;
  
  // Extract price indicator from the API response
  // The price indicator is typically in the adverts or retailAdverts section
  let priceIndicator: string | undefined = undefined;
  
  try {
    // Check different possible locations for price indicator
    if (data.adverts?.retailAdverts?.priceIndicatorRating) {
      priceIndicator = data.adverts.retailAdverts.priceIndicatorRating;
    } else if (data.vehicle?.adverts?.retailAdverts?.priceIndicatorRating) {
      priceIndicator = data.vehicle.adverts.retailAdverts.priceIndicatorRating;
    } else if (data.retailAdverts?.priceIndicatorRating) {
      priceIndicator = data.retailAdverts.priceIndicatorRating;
    }
    
    console.log('🏷️ Price indicator extracted:', priceIndicator);
  } catch (error) {
    console.warn('⚠️ Failed to extract price indicator:', error);
  }
  
  // Extract year from firstRegistrationDate if yearOfManufacture is not available
  let vehicleYear = vehicle.yearOfManufacture ? parseInt(vehicle.yearOfManufacture) : vehicle.year;
  
  // If still no year, extract from firstRegistrationDate
  if (!vehicleYear && vehicle.firstRegistrationDate) {
    vehicleYear = new Date(vehicle.firstRegistrationDate).getFullYear();
  }
  
  // Final fallback to current year
  if (!vehicleYear) {
    vehicleYear = new Date().getFullYear();
  }

  return {
    registration: vehicle.registration || registration,
    make: vehicle.make,
    model: vehicle.model,
    derivative: vehicle.derivative,
    derivativeId: vehicle.derivativeId,
    year: vehicleYear,
    mileage: vehicle.odometerReadingMiles || mileage,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmissionType,
    bodyType: vehicle.bodyType,
    doors: vehicle.doors,
    enginePowerBHP: vehicle.enginePowerBHP,
    engineTorqueNM: vehicle.engineTorqueNM,
    co2EmissionGPKM: vehicle.co2EmissionGPKM,
    fuelEconomyCombinedMPG: vehicle.fuelEconomyNEDCCombinedMPG || vehicle.fuelEconomyWLTPCombinedMPG,
    insuranceGroup: vehicle.insuranceGroup + (vehicle.insuranceSecurityCode || ''),
    firstRegistrationDate: vehicle.firstRegistrationDate,
    colour: vehicle.colour,
    competitorsUrl: data.links?.competitors?.href,
    // Add the extracted price indicator
    priceIndicator: priceIndicator,
    // Include the full API response for valuations and metrics
    apiResponse: data
  };
}

// Helper function to get vehicle info from derivative with valuations
async function getVehicleInfoFromDerivative(derivativeId: string, mileage: number, email: string): Promise<VehicleInfo> {
  console.log('🔍 Getting vehicle info from derivative:', derivativeId);
  
  // Get authentication token
  const authResult = await getAutoTraderToken(email);
  if (!authResult.success) {
    throw new Error('Failed to authenticate with AutoTrader API');
  }

  // Get advertiser ID from store config
  const storeConfigResult = await db
    .select({
      advertisementId: storeConfig.advertisementId,
      primaryAdvertisementId: storeConfig.primaryAdvertisementId,
      storeName: storeConfig.storeName
    })
    .from(storeConfig)
    .where(eq(storeConfig.email, email))
    .limit(1);

  if (storeConfigResult.length === 0) {
    throw new Error(`No store configuration found for email: ${email}`);
  }

  const userStoreConfig = storeConfigResult[0];
  let advertiserId = userStoreConfig.primaryAdvertisementId;
  
  if (!advertiserId && userStoreConfig.advertisementId) {
    try {
      const parsedIds = JSON.parse(userStoreConfig.advertisementId);
      if (Array.isArray(parsedIds) && parsedIds.length > 0) {
        advertiserId = parsedIds[0];
      }
    } catch {
      console.log('Failed to parse advertisementId JSON, using fallback');
    }
  }
  
  if (!advertiserId) {
    advertiserId = process.env.ADVERTISER_ID || process.env.NEXT_PUBLIC_ADVERTISER_ID || '10028737';
  }

  const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
  
  // Step 1: Get derivative details
  const derivativeParams = new URLSearchParams();
  derivativeParams.append('advertiserId', advertiserId);

  const derivativeUrl = `${baseUrl}/taxonomy/derivatives/${derivativeId}?${derivativeParams.toString()}`;
  console.log('📡 Making taxonomy derivative request to:', derivativeUrl);
  
  const derivativeResponse = await fetch(derivativeUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authResult.access_token!}`,
      'Content-Type': 'application/json',
    },
  });

  if (!derivativeResponse.ok) {
    const errorText = await derivativeResponse.text();
    console.error('❌ Taxonomy derivative API error:', derivativeResponse.status, errorText);
    throw new Error(`Failed to fetch derivative data: ${derivativeResponse.status} - ${errorText}`);
  }

  const derivative = await derivativeResponse.json();
  console.log('✅ Derivative API response:', { 
    derivativeId: derivative.derivativeId,
    make: derivative.make,
    model: derivative.model,
    name: derivative.name 
  });

  // Step 2: Calculate first registration date (similar to valuation page)
  // Use the derivative's introduced date or fallback to a reasonable date
  let firstRegistrationDate: string;
  
  if (derivative.introduced) {
    firstRegistrationDate = derivative.introduced;
  } else {
    // Fallback: Use current year - 2 years as a reasonable default
    const fallbackYear = new Date().getFullYear() - 2;
    firstRegistrationDate = `${fallbackYear}-01-01`;
  }

  console.log('📅 Using first registration date:', firstRegistrationDate);

  // Step 3: Get valuations using the derivative ID (same as valuation page)
  const valuationRequest = {
    vehicle: {
      derivativeId: derivativeId,
      firstRegistrationDate: firstRegistrationDate,
      odometerReadingMiles: mileage
    }
  };

  console.log('💰 Requesting valuations with:', valuationRequest);

  const valuationResponse = await fetch(`${baseUrl}/valuations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authResult.access_token!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(valuationRequest)
  });

  let valuationData = null;
  if (valuationResponse.ok) {
    const valuationResult = await valuationResponse.json();
    console.log('✅ Valuation API response received');
    valuationData = valuationResult;
  } else {
    const errorText = await valuationResponse.text();
    console.warn('⚠️ Valuations API failed, continuing without valuations:', valuationResponse.status, errorText);
  }

  // Create a mock API response structure that includes valuations (similar to vehicle lookup)
  const mockApiResponse = {
    vehicle: {
      derivativeId: derivative.derivativeId,
      make: derivative.make,
      model: derivative.model,
      derivative: derivative.name || derivative.longName,
      fuelType: derivative.fuelType,
      transmissionType: derivative.transmissionType,
      firstRegistrationDate: firstRegistrationDate,
      odometerReadingMiles: mileage
    },
    // Include valuations in the API response if we got them
    ...(valuationData && { valuations: valuationData.valuations })
  };
  
  return {
    registration: 'N/A', // No registration for taxonomy flow
    make: derivative.make || 'Unknown',
    model: derivative.model || 'Unknown',
    derivative: derivative.name || derivative.longName,
    derivativeId: derivative.derivativeId,
    year: new Date(firstRegistrationDate).getFullYear(),
    mileage: mileage,
    fuelType: derivative.fuelType,
    transmission: derivative.transmissionType,
    firstRegistrationDate: firstRegistrationDate,
    // Include the API response with valuations
    apiResponse: mockApiResponse
  };
}

// Main retail check function that combines all the data
async function performRetailCheck(vehicleInfo: VehicleInfo, email: string, includeVehicleCheck = false): Promise<RetailCheckData> {
  console.log('🔍 Performing comprehensive retail check for:', vehicleInfo);
  
  try {
    // Get authentication token
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      throw new Error('Failed to authenticate with AutoTrader API');
    }

    // Get advertiser ID from store config
    const storeConfigResult = await db
      .select({
        advertisementId: storeConfig.advertisementId,
        primaryAdvertisementId: storeConfig.primaryAdvertisementId,
        storeName: storeConfig.storeName
      })
      .from(storeConfig)
      .where(eq(storeConfig.email, email))
      .limit(1);

    if (storeConfigResult.length === 0) {
      throw new Error(`No store configuration found for email: ${email}`);
    }

    const userStoreConfig = storeConfigResult[0];
    let advertiserId = userStoreConfig.primaryAdvertisementId;
    
    // Try to parse new advertisementId field if primary is not available
    if (!advertiserId && userStoreConfig.advertisementId) {
      try {
        const parsedIds = JSON.parse(userStoreConfig.advertisementId);
        if (Array.isArray(parsedIds) && parsedIds.length > 0) {
          advertiserId = parsedIds[0];
        }
      } catch {
        console.log('Failed to parse advertisementId JSON, using fallback');
      }
    }
    
    if (!advertiserId) {
      advertiserId = process.env.ADVERTISER_ID || process.env.NEXT_PUBLIC_ADVERTISER_ID || '10028737';
    }

    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;

    // Extract valuations from the vehicle API response (no separate API call needed)
    console.log('📊 Extracting valuations from vehicle API response');
    
    // Check for API warnings first
    if (vehicleInfo.apiResponse?.warnings) {
      console.log('⚠️ API Warnings received:', vehicleInfo.apiResponse.warnings);
      vehicleInfo.apiResponse.warnings.forEach((warning: any) => {
        if (warning.feature === 'valuations') {
          console.log(`📊 Valuations warning: ${warning.message}`);
        }
        if (warning.feature === 'vehicle' && warning.message.includes('metrics')) {
          console.log(`📈 Vehicle metrics warning: ${warning.message}`);
        }
      });
    }
    
    let valuations = null;
    if (vehicleInfo.apiResponse?.valuations) {
      const apiValuations = vehicleInfo.apiResponse.valuations;
      valuations = {
        retailValue: apiValuations.retail?.amountGBP || 0,
        partExValue: apiValuations.partExchange?.amountGBP || 0,
        tradeValue: apiValuations.trade?.amountGBP || 0,
        forecourtPrice: apiValuations.private?.amountGBP
      };
      console.log('✅ Valuations extracted from vehicle response:', valuations);
    } else {
      console.log('ℹ️ No valuations available for this vehicle - this is acceptable and will be handled gracefully');
    }

    // Extract vehicle check data from the API response (already included with check=true)
    let vehicleCheck = null;
    if (includeVehicleCheck && vehicleInfo.apiResponse) {
      console.log('🔍 Extracting vehicle check data from API response');
      
      // Check for vehicle check warnings
      if (vehicleInfo.apiResponse.warnings) {
        vehicleInfo.apiResponse.warnings.forEach((warning: any) => {
          if (warning.feature === 'check' || warning.message.includes('check')) {
            console.log(`🔍 Vehicle check warning: ${warning.message}`);
          }
        });
      }
      
      // Extract check data from the history section of the API response
      const history = vehicleInfo.apiResponse.history;
      if (history) {
        vehicleCheck = {
          status: (!history.stolen && !history.scrapped && !history.exported) ? 'passed' as const : 'warning' as const,
          stolen: history.stolen || false,
          scrapped: history.scrapped || false,
          writeOff: history.scrapped ? 'Vehicle has been scrapped' : 'No write-off recorded',
          finance: 'No finance information available', // This would need separate finance check
          highRisk: history.stolen || history.scrapped || history.exported || false,
          imported: history.imported || false,
          exported: history.exported || false,
          previousOwners: history.previousOwners || 0,
          keeperChanges: history.keeperChanges || [],
          yearOfManufacture: history.yearOfManufacture
        };
        console.log('✅ Vehicle check data extracted from API response:', vehicleCheck);
      } else {
        console.log('ℹ️ No vehicle check data available in API response');
      }
    }

    const retailCheckData: RetailCheckData = {
      vehicleInfo,
      valuations,
      vehicleCheck: vehicleCheck || undefined,
      timestamp: new Date().toISOString(),
      source: 'autotrader'
    };

    return retailCheckData;
    
  } catch (error) {
    console.error('❌ Error in performRetailCheck:', error);
    throw error;
  }
}

// Vehicle check data is now extracted directly from the main /vehicles API response
// when called with check=true parameter - no separate API call needed


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'clear-cache') {
    OptimizedRetailCheckService.clearCache();
    return NextResponse.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  }
  
  if (action === 'cache-stats') {
    return NextResponse.json({
      message: 'Cache statistics',
      stats: OptimizedRetailCheckService.getCacheStats(),
      timestamp: new Date().toISOString()
    });
  }
  
  return NextResponse.json({
    message: 'Retail Check API',
    version: '2.0.0',
    optimizations: {
      parallelProcessing: true,
      caching: true,
      circuitBreaker: true,
      requestDeduplication: true,
      trendedValuations: true
    },
    endpoints: {
      POST: 'Perform retail check analysis',
      'GET?action=cache-stats': 'Get cache statistics',
      'GET?action=clear-cache': 'Clear all caches',
      flows: ['stock', 'vehicle-finder', 'taxonomy'],
      parameters: {
        stock: ['stockId'],
        'vehicle-finder': ['registration/vrm', 'mileage'],
        taxonomy: ['derivativeId', 'mileage'],
        optional: ['check', 'includeTrendedValuations', 'useOptimizedFlow']
      }
    }
  });
}
