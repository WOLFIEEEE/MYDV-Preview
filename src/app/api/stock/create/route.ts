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
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { getStockImagesByDealer, createOrGetDealer } from '@/lib/database';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Flow type definitions
interface VehicleFinderFlow {
  flow: 'vehicle-finder';
  registration: string;
  mileage: number;
  // Additional data from vehicle finder
  forecourtPrice?: number;
  forecourtPriceVatStatus?: string;
  attentionGrabber?: string;
  description?: string;
  lifecycleState?: string;
  stockReference?: string;
  imageIds?: string[];
  selectedFeatures?: Array<{
    name: string;
    genericName?: string;
    type: 'Standard' | 'Optional';
    category: string;
    basicPrice: number;
    vatPrice: number;
    factoryCodes?: string[];
    rarityRating?: number | null;
    valueRating?: number | null;
  }>;
  channelStatus?: {
    autotraderAdvert: boolean;
    advertiserAdvert: boolean;
    locatorAdvert: boolean;
    profileAdvert: boolean;
    exportAdvert: boolean;
  };
}

interface TaxonomyFlow {
  flow: 'taxonomy';
  derivativeId: string;
  mileage: number;
  // Additional data from taxonomy search
  forecourtPrice?: number;
  forecourtPriceVatStatus?: string;
  attentionGrabber?: string;
  description?: string;
    lifecycleState?: string;
  stockReference?: string;
  imageIds?: string[];
  selectedFeatures?: Array<{
    name: string;
    genericName?: string;
    type: 'Standard' | 'Optional';
    category: string;
    basicPrice: number;
    vatPrice: number;
    factoryCodes?: string[];
    rarityRating?: number | null;
    valueRating?: number | null;
  }>;
  channelStatus?: {
    autotraderAdvert: boolean;
    advertiserAdvert: boolean;
    locatorAdvert: boolean;
    profileAdvert: boolean;
    exportAdvert: boolean;
  };
  // Taxonomy specific fields
  year?: number;
  plate?: string;
  colour?: string;
}

type StockCreateRequest = VehicleFinderFlow | TaxonomyFlow;

/**
 * Upload dealer stock images to AutoTrader and return their image IDs
 */
async function uploadStockImagesToAutoTrader(
  stockImages: Array<{ publicUrl: string; name: string; imageType?: string | null }>,
  advertiserId: string, 
  token: string,
  email: string
): Promise<string[]> {
  const imageIds: string[] = [];
  
  // Debug: Log authentication details
  console.log(`🔐 Authentication Debug:`);
  console.log(`   - Advertiser ID: ${advertiserId}`);
  console.log(`   - Token present: ${!!token}`);
  console.log(`   - Token length: ${token?.length || 0}`);
  console.log(`   - Token starts with: ${token?.substring(0, 20)}...`);
  
  for (const stockImage of stockImages) {
    try {
      console.log(`📸 Processing stock image: ${stockImage.name} (${stockImage.imageType})`);
      console.log(`   - Source URL: ${stockImage.publicUrl}`);
      
      // Fetch the image from Supabase
      const imageResponse = await fetch(stockImage.publicUrl);
      if (!imageResponse.ok) {
        console.error(`❌ Failed to fetch stock image from Supabase:`, {
          name: stockImage.name,
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          url: stockImage.publicUrl
        });
        continue;
      }
      
      const originalBlob = await imageResponse.blob();
      console.log(`📋 Original image details:`, {
        name: stockImage.name,
        type: originalBlob.type,
        size: `${(originalBlob.size / 1024).toFixed(2)} KB`
      });
      
      // Check image format and prepare for upload
      const finalBlob = originalBlob;
      const finalName = stockImage.name;
      
      if (!originalBlob.type.includes('jpeg') && !originalBlob.type.includes('jpg')) {
        console.log(`⚠️ Image is not JPEG format: ${originalBlob.type}`);
        console.log(`📤 AutoTrader may reject non-JPEG images. Consider converting images to JPEG before uploading to Supabase.`);
        
        // For now, we'll try to upload as-is and let AutoTrader handle it
        // In the future, we could add server-side image conversion using a library like Sharp
        console.log(`📤 Attempting upload with original format: ${originalBlob.type}`);
      } else {
        console.log(`✅ Image is already JPEG format`);
      }
      
      // Create FormData for AutoTrader upload
      // IMPORTANT: AutoTrader expects 'file' field name, not 'image'
      const formData = new FormData();
      formData.append('file', finalBlob, finalName);
      
      // Debug: Log upload details
      const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
      const uploadUrl = `${baseUrl}/images?advertiserId=${advertiserId}`;
      console.log(`📤 Uploading to AutoTrader:`, {
        url: uploadUrl,
        fileName: finalName,
        fileType: finalBlob.type,
        fileSize: `${(finalBlob.size / 1024).toFixed(2)} KB`,
        advertiserId: advertiserId,
        fieldName: 'file' // ✅ Using correct field name
      });
      
      // Upload to AutoTrader with correct headers
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
    headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Don't set Content-Type for FormData, let the browser set it with boundary
        },
        body: formData
      });
      
      console.log(`📨 AutoTrader response:`, {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log(`📋 AutoTrader success response:`, result);
        
        if (result.imageId) {
          imageIds.push(result.imageId);
          console.log(`✅ Stock image uploaded successfully: ${result.imageId}`);
        } else {
          console.error(`❌ No imageId in response:`, result);
        }
      } else {
        const errorText = await uploadResponse.text();
        console.error(`❌ Failed to upload stock image to AutoTrader:`, {
          name: stockImage.name,
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          errorBody: errorText,
          headers: Object.fromEntries(uploadResponse.headers.entries())
        });
        
        // Try to parse error as JSON
        try {
          const errorJson = JSON.parse(errorText);
          console.error(`📋 AutoTrader error details:`, errorJson);
        } catch {
          console.error(`📋 AutoTrader error (raw):`, errorText);
        }
    }
  } catch (error) {
      console.error(`❌ Error uploading stock image ${stockImage.name}:`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
  
  console.log(`🎯 Image upload summary: ${imageIds.length}/${stockImages.length} images uploaded successfully`);
  return imageIds;
}

interface AutoTraderFeature {
  name: string;
  genericName?: string;
  type: string;
  category: string;
  basicPrice: number;
  vatPrice: number;
  factoryCodes?: string[];
}

interface AutoTraderVehicleData {
  odometerReadingMiles?: number;
  ownershipCondition?: string;
  registration?: string;
  vin?: string;
  engineNumber?: string;
  make?: string;
  model?: string;
  generation?: string;
  derivative?: string;
  derivativeId?: string;
  vehicleType?: string;
  trim?: string;
  bodyType?: string;
  fuelType?: string;
  transmissionType?: string;
  wheelbaseType?: string;
  drivetrain?: string;
  seats?: number;
  doors?: number;
  cylinders?: number;
  valves?: number;
  engineTorqueNM?: number;
  co2EmissionGPKM?: number;
  topSpeedMPH?: number;
  zeroToOneHundredKMPHSeconds?: number;
  badgeEngineSizeLitres?: number;
  engineCapacityCC?: number;
  enginePowerBHP?: number;
  enginePowerPS?: number;
  fuelCapacityLitres?: number;
  emissionClass?: string;
  owners?: number;
  fuelEconomyWLTPCombinedMPG?: number;
  bootSpaceSeatsUpLitres?: number;
  bootSpaceSeatsDownLitres?: number;
  insuranceGroup?: string;
  insuranceSecurityCode?: string;
  firstRegistrationDate?: string;
  colour?: string;
  lengthMM?: number;
  heightMM?: number;
  widthMM?: number;
  wheelbaseMM?: number;
  minimumKerbWeightKG?: number;
  grossVehicleWeightKG?: number;
  fuelDelivery?: string;
  gears?: number;
  startStop?: boolean;
  engineTorqueLBFT?: number;
  boreMM?: number;
  strokeMM?: number;
  cylinderArrangement?: string;
  engineMake?: string;
  valveGear?: string;
  axles?: number;
  countryOfOrigin?: string;
  driveType?: string;
  rde2Compliant?: boolean;
  vehicleExciseDutyWithoutSupplementGBP?: number;
  sector?: string;
  yearOfManufacture?: number;
  features?: AutoTraderFeature[];
  oem?: {
    transmissionType?: string;
    drivetrain?: string;
    engineType?: string;
  };
}

interface AutoTraderStockPayload {
  vehicle: AutoTraderVehicleData & {
    odometerReadingMiles: number;
    ownershipCondition: string;
    make: string;
    model: string;
  };
  metadata: {
    lifecycleState: string;
    stockReference?: string;
  };
  features: AutoTraderFeature[];
  media?: {
    images: Array<{
      imageId: string;
    }>;
  };
  advertiser: {
    advertiserId: string;
    location: unknown[];
  };
  adverts?: {
    forecourtPrice?: {
      amountGBP: number;
    };
    forecourtPriceVatStatus?: string;
    retailAdverts?: {
      priceOnApplication?: boolean;
      suppliedPrice?: {
        amountGBP: number;
      };
      vatStatus?: string;
      attentionGrabber?: string;
      description?: string;
      autotraderAdvert?: {
        status: string;
      };
      advertiserAdvert?: {
        status: string;
      };
      locatorAdvert?: {
        status: string;
      };
      profileAdvert?: {
        status: string;
      };
      exportAdvert?: {
        status: string;
      };
    };
  };
}

/**
 * POST /api/stock/create
 * Creates a new stock item in AutoTrader from either vehicle finder or taxonomy data
 */
export async function POST(request: NextRequest) {
  console.log('📦 API Route: Stock create request received');

  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to create stock items',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/create'
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
        endpoint: 'stock/create'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    // Parse request body
    const requestData: StockCreateRequest = await request.json();
    
    console.log('📋 Stock create request data:', {
      flow: requestData.flow,
      registration: 'registration' in requestData ? requestData.registration : undefined,
      derivativeId: 'derivativeId' in requestData ? requestData.derivativeId : undefined,
      mileage: requestData.mileage
    });

    // Validate request data
    if (!requestData.flow || !['vehicle-finder', 'taxonomy'].includes(requestData.flow)) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid flow type',
          details: 'Flow must be either "vehicle-finder" or "taxonomy"',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/create'
        }),
        { status: 400 }
      );
    }

    if (!requestData.mileage || requestData.mileage <= 0) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid mileage',
          details: 'Mileage must be a positive number',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/create'
        }),
        { status: 400 }
      );
    }

    // Get store configuration (works for both store owners and team members)
    const configResult = await getStoreConfigForUser(user.id, userEmail);

    if (!configResult.success) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Store configuration not found',
        details: configResult.error || 'Please contact support to set up your store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/create'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    const userStoreConfig = configResult.storeConfig;
    const email = configResult.storeOwnerEmail || userEmail;

    // Get advertiser ID from store config
    let advertiserId = userStoreConfig.primaryAdvertisementId;
    
    if (userStoreConfig.advertisementId) {
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
      return NextResponse.json(
        createErrorResponse({
        type: ErrorType.AUTHENTICATION,
        message: 'Missing advertiser ID in store configuration',
        details: `No advertisement ID configured for store: ${userStoreConfig.storeName}`,
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/create'
        }),
        { status: 401 }
      );
    }

    // Get authentication token
    console.log(`🔐 Retrieving AutoTrader token for email: ${email}`);
    const authResult = await getAutoTraderToken(email);
    
    console.log(`🔐 Token retrieval result:`, {
      success: authResult.success,
      hasToken: !!authResult.access_token,
      tokenLength: authResult.access_token?.length || 0,
      error: authResult.error ? 'Present' : 'None'
    });
    
    if (!authResult.success || !authResult.access_token) {
      console.error(`❌ Failed to get AutoTrader token:`, authResult.error);
      return NextResponse.json(authResult.error, { status: 401 });
    }
    
    const token = authResult.access_token;
    console.log(`✅ Token retrieved successfully - Length: ${token.length} characters`);

    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    
    console.log('🔍 Using base URL:', baseUrl);
    console.log('📢 Using advertiser ID:', advertiserId);

    // Fetch fresh vehicle data based on flow type
    let vehicleData: AutoTraderVehicleData;
    
    if (requestData.flow === 'vehicle-finder') {
      // Vehicle finder flow - lookup by registration
      console.log('🚗 Vehicle finder flow - looking up registration:', requestData.registration);
      
      const vehicleParams = new URLSearchParams({
        advertiserId,
        registration: requestData.registration.toUpperCase(),
        features: 'true',
        motTests: 'true',
        history: 'true',
        valuations: 'true',
        competitors: 'true',
        vehicleMetrics: 'true'
      });

      const vehicleResponse = await fetch(`${baseUrl}/vehicles?${vehicleParams.toString()}`, {
        method: 'GET',
      headers: {
          'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        },
      });

      if (!vehicleResponse.ok) {
        const error = await parseAutoTraderError(vehicleResponse, 'vehicles');
        console.error('❌ Vehicle lookup failed:', error);
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.httpStatus }
        );
      }

      const vehicleApiData = await vehicleResponse.json();
      vehicleData = vehicleApiData.vehicle;
      
      if (!vehicleData) {
        console.error('❌ No vehicle data in AutoTrader response');
        return NextResponse.json(
          createErrorResponse({
            type: ErrorType.NOT_FOUND,
            message: 'Vehicle not found',
            details: `No vehicle found for registration: ${requestData.registration}`,
            httpStatus: 404,
            timestamp: new Date().toISOString(),
            endpoint: 'stock/create'
          }),
          { status: 404 }
        );
      }
      
      console.log('✅ Vehicle data retrieved:', { 
        make: vehicleData.make, 
        model: vehicleData.model, 
        derivative: vehicleData.derivative,
        registration: vehicleData.registration 
      });
      
      // FIX: Handle commercial vehicles where model may be null
      // Use derivative/trim/vehicleType as fallback to populate model field
      if (!vehicleData.model) {
        const fallbackModel = vehicleData.derivative || vehicleData.trim || vehicleData.vehicleType || 'Unknown Model';
        console.log(`⚠️ Model is null, using fallback: ${fallbackModel}`);
        vehicleData.model = fallbackModel;
      }

    } else {
      // Taxonomy flow - lookup by derivative ID to get full technical data
      console.log('🔍 Taxonomy flow - fetching derivative data for:', requestData.derivativeId);
      
      // Use the taxonomy derivatives endpoint to get derivative details
      const derivativeParams = new URLSearchParams({
        advertiserId,
        features: 'true'
      });

      const derivativeUrl = `${baseUrl}/taxonomy/derivatives/${requestData.derivativeId}?${derivativeParams.toString()}`;
      console.log('📡 Making taxonomy derivative request to:', derivativeUrl);

      const derivativeResponse = await fetch(derivativeUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!derivativeResponse.ok) {
        const error = await parseAutoTraderError(derivativeResponse, 'taxonomy/derivatives');
        console.error('❌ Derivative lookup failed:', error);
        return NextResponse.json(
          createErrorResponse(error),
          { status: error.httpStatus }
        );
      }

      const derivativeApiData = await derivativeResponse.json();
      
      // Map derivative data to vehicle data structure
      vehicleData = {
        make: derivativeApiData.make,
        model: derivativeApiData.model,
        generation: derivativeApiData.generationName,
        derivative: derivativeApiData.name || derivativeApiData.longName,
        derivativeId: derivativeApiData.derivativeId,
        bodyType: derivativeApiData.bodyType,
        fuelType: derivativeApiData.fuelType,
        transmissionType: derivativeApiData.transmissionType,
        doors: derivativeApiData.doors,
        seats: derivativeApiData.seats,
        engineCapacityCC: derivativeApiData.engineCapacityCC,
        enginePowerBHP: derivativeApiData.enginePowerBHP,
        badgeEngineSizeLitres: derivativeApiData.badgeEngineSizeLitres,
        features: derivativeApiData.features || [],
        // Add other available derivative fields
        ...derivativeApiData
      };
      
      if (!vehicleData) {
      return NextResponse.json(
        createErrorResponse({
            type: ErrorType.NOT_FOUND,
            message: 'Vehicle not found',
            details: `No vehicle found for derivative ID: ${requestData.derivativeId}`,
            httpStatus: 404,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/create'
        }),
          { status: 404 }
        );
      }

      // Override with taxonomy-specific fields if provided
      vehicleData.odometerReadingMiles = requestData.mileage;
      vehicleData.ownershipCondition = 'Used';
      
      if ('year' in requestData && requestData.year) {
        vehicleData.yearOfManufacture = requestData.year;
      }
      if ('plate' in requestData && requestData.plate) {
        vehicleData.registration = requestData.plate;
      }
      if ('colour' in requestData && requestData.colour) {
        vehicleData.colour = requestData.colour;
      }
      
      // FIX: Handle taxonomy vehicles where model may be null
      // Use derivative/trim/vehicleType as fallback to populate model field
      if (!vehicleData.model) {
        vehicleData.model = vehicleData.derivative || vehicleData.trim || vehicleData.vehicleType || 'Unknown Model';
      }

      console.log('✅ Full vehicle technical data retrieved for derivative:', requestData.derivativeId);
    }

    // Validate essential vehicle fields
    if (!vehicleData.make || !vehicleData.model) {
      console.error('❌ Validation failed:', { 
        make: vehicleData.make, 
        model: vehicleData.model,
        derivative: vehicleData.derivative,
        availableKeys: Object.keys(vehicleData).slice(0, 20)
      });
    return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid vehicle data',
          details: 'Vehicle must have make and model information',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'stock/create'
        }),
        { status: 400 }
      );
    }
    
    console.log('✅ Validation passed - Make:', vehicleData.make, 'Model:', vehicleData.model);

    // Get dealer ID and retrieve stock images for Default/Fallback logic
    const dealer = await createOrGetDealer(user.id, 'Unknown', userEmail);
    const dealerStockImages = await getStockImagesByDealer(dealer.id);
    
    console.log(`📋 Dealer ID: ${dealer.id} - Found ${dealerStockImages.length} dealer stock images`);
    
    if (dealerStockImages.length === 0) {
      console.log('⚠️ No stock images configured for this dealer. To add default/fallback images:');
      console.log('   1. Go to Store Owner Settings → Stock Images');
      console.log('   2. Upload images and set them as "Default" or "Fallback"');
      console.log('   3. Default images are always added to stock');
      console.log('   4. Fallback images are only added when user uploads no images');
    } else {
      console.log('📸 Available stock images:', dealerStockImages.map(img => ({
        id: img.id,
        name: img.name,
        type: img.imageType || 'unknown',
        url: img.publicUrl?.substring(0, 50) + '...'
      })));
    }
    
    // Filter stock images by type
    const defaultImages = dealerStockImages.filter(img => img.imageType === 'default');
    const fallbackImages = dealerStockImages.filter(img => img.imageType === 'fallback');
    
    console.log(`🟢 Default images: ${defaultImages.length}, 🔵 Fallback images: ${fallbackImages.length}`);
    
    if (defaultImages.length === 0 && fallbackImages.length === 0) {
      console.log('❌ No default or fallback images configured!');
      console.log('💡 Stock will only use user-uploaded images (if any)');
    }
    
    // Upload dealer stock images to AutoTrader and get their IDs
    const userImageIds = requestData.imageIds || [];
    let finalImageIds: string[] = [];
    
    // 1. Add user-uploaded images FIRST (if any)
    finalImageIds.push(...userImageIds);
    console.log(`✅ Added ${userImageIds.length} user images first`);
    
    // 2. Add Fallback images ONLY if no user images were provided (before Default images)
    if (userImageIds.length === 0 && fallbackImages.length > 0) {
      console.log('📤 No user images provided, uploading Fallback stock images to AutoTrader...');
      const fallbackImageIds = await uploadStockImagesToAutoTrader(fallbackImages, advertiserId, token, email);
      finalImageIds.push(...fallbackImageIds);
      console.log(`✅ Added ${fallbackImageIds.length} Fallback images before Default images`);
    }
    
    // 3. Always add Default images LAST
    if (defaultImages.length > 0) {
      console.log('📤 Uploading Default stock images to AutoTrader (always last)...');
      const defaultImageIds = await uploadStockImagesToAutoTrader(defaultImages, advertiserId, token, email);
      finalImageIds.push(...defaultImageIds);
      console.log(`✅ Added ${defaultImageIds.length} Default images at the end`);
    }
    
    // Deduplicate image IDs
    finalImageIds = [...new Set(finalImageIds)];
    
    console.log(`🎯 Final image summary:`);
    console.log(`   - User images: ${userImageIds.length}`);
    console.log(`   - Fallback images added: ${userImageIds.length === 0 ? fallbackImages.length : 0}`);
    console.log(`   - Default images added: ${defaultImages.length}`);
    console.log(`   - Total final images: ${finalImageIds.length}`);
    console.log(`   - Final image IDs:`, finalImageIds);
    
    if (finalImageIds.length === 0) {
      console.log('⚠️ WARNING: No images will be included in stock creation!');
      console.log('💡 To fix this:');
      console.log('   - User can upload images during stock creation, OR');
      console.log('   - Dealer can configure default/fallback images in Store Settings');
    }

    // Build the complete AutoTrader stock creation payload  
    // Use the vehicle object directly and just override key fields
    const stockPayload: AutoTraderStockPayload = {
      vehicle: {
        ...vehicleData,
        odometerReadingMiles: requestData.mileage,
        ownershipCondition: vehicleData.ownershipCondition || 'Used',
        make: vehicleData.make,
        model: vehicleData.model
      },
      metadata: {
        lifecycleState: requestData.lifecycleState || 'FORECOURT',
        stockReference: requestData.stockReference || generateStockReference(vehicleData)
      },
      features: (requestData.selectedFeatures || vehicleData.features || []).map((feature: AutoTraderFeature) => ({
        name: feature.name,
        genericName: feature.genericName,
        type: feature.type || 'Standard',
        category: feature.category || 'Other',
        basicPrice: feature.basicPrice || 0,
        vatPrice: feature.vatPrice || 0,
        factoryCodes: feature.factoryCodes || []
      })),
      media: {
        images: finalImageIds.map(imageId => ({ imageId }))
      },
      advertiser: {
        advertiserId,
        location: []
      },
      // Add adverts object if pricing is provided
      adverts: requestData.forecourtPrice ? {
        forecourtPrice: {
          amountGBP: requestData.forecourtPrice
        },
        forecourtPriceVatStatus: requestData.forecourtPriceVatStatus || 'No VAT',
        retailAdverts: {
          priceOnApplication: false,
          suppliedPrice: {
            amountGBP: requestData.forecourtPrice
          },
          vatStatus: requestData.forecourtPriceVatStatus || 'No VAT',
          attentionGrabber: requestData.attentionGrabber || 'Available Now',
          description: requestData.description || `${vehicleData.make} ${vehicleData.model} - Excellent condition`,
          autotraderAdvert: {
            status: requestData.channelStatus?.autotraderAdvert ? 'PUBLISHED' : 'NOT_PUBLISHED'
          },
          advertiserAdvert: {
            status: requestData.channelStatus?.advertiserAdvert ? 'PUBLISHED' : 'NOT_PUBLISHED'
          },
          locatorAdvert: {
            status: requestData.channelStatus?.locatorAdvert ? 'PUBLISHED' : 'NOT_PUBLISHED'
          },
          profileAdvert: {
            status: requestData.channelStatus?.profileAdvert ? 'PUBLISHED' : 'NOT_PUBLISHED'
          },
          exportAdvert: {
            status: requestData.channelStatus?.exportAdvert ? 'PUBLISHED' : 'NOT_PUBLISHED'
          }
        }
      } : undefined
    };

    // Log the complete payload for debugging
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] [INFO] === FULL STOCK CREATION PAYLOAD ===`);
    console.log(`[${timestamp}] [INFO]`, JSON.stringify(stockPayload, null, 2));
    console.log(`[${timestamp}] [INFO] === END OF FULL STOCK CREATION PAYLOAD ===`);

    // Create stock in AutoTrader
    console.log('🚀 Creating stock in AutoTrader...');
    const stockUrl = `${baseUrl}/stock?advertiserId=${advertiserId}`;
    
    console.log('📡 Making POST request to AutoTrader stock API:', stockUrl);
    console.log('📝 Stock payload size:', JSON.stringify(stockPayload).length, 'characters');
    
    const stockResponse = await fetch(stockUrl, {
  method: 'POST',
  headers: {
        'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(stockPayload),
    });

    console.log('📨 AutoTrader stock creation response status:', stockResponse.status);
    console.log('📨 AutoTrader stock creation response headers:', Object.fromEntries(stockResponse.headers.entries()));

    if (!stockResponse.ok) {
      const errorText = await stockResponse.text();
      console.error('❌ Failed to create stock in AutoTrader:', {
        status: stockResponse.status,
        statusText: stockResponse.statusText,
        errorBody: errorText,
        headers: Object.fromEntries(stockResponse.headers.entries())
      });
      
      let errorMessage = 'Failed to create stock in AutoTrader';
      let errorDetails = `AutoTrader API returned ${stockResponse.status}: ${stockResponse.statusText}`;
      let autoTraderError = null;
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('📋 AutoTrader error details:', errorJson);
        
        // Store the full AutoTrader error for frontend parsing
        autoTraderError = errorJson;
        console.log('🔍 Stored autoTraderError:', JSON.stringify(autoTraderError, null, 2));
        
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
        if (errorJson.details || errorJson.error) {
          errorDetails = errorJson.details || errorJson.error;
        }
      } catch (parseError) {
        console.error('📋 Failed to parse AutoTrader error as JSON:', parseError);
        console.error('📋 AutoTrader error (raw):', errorText);
        if (errorText) {
          errorDetails = errorText;
        }
      }

      const errorResponseData = createErrorResponse({
        type: ErrorType.SERVER_ERROR,
        message: errorMessage,
        details: errorDetails,
        autoTraderError: autoTraderError, // Include the full AutoTrader error
        httpStatus: stockResponse.status,
        timestamp: new Date().toISOString(),
        endpoint: 'stock/create'
      });
      
      console.log('🔍 Final error response being sent to frontend:', JSON.stringify(errorResponseData, null, 2));
      
      return NextResponse.json(errorResponseData, { status: stockResponse.status });
    }

    const stockResult = await stockResponse.json();
    console.log('✅ Stock created successfully in AutoTrader');
    console.log('📋 AutoTrader stock creation response:', stockResult);

    // Return success response with AutoTrader result
    return NextResponse.json(
      createSuccessResponse({
        message: 'Stock created successfully in AutoTrader',
        stockId: stockResult.stockId || stockResult.id,
        autoTraderResponse: stockResult,
        flow: requestData.flow,
        vehicleInfo: {
          make: vehicleData.make,
          model: vehicleData.model,
          registration: vehicleData.registration,
          derivativeId: vehicleData.derivativeId
        },
        imagesSummary: {
          userImages: userImageIds.length,
          fallbackImages: userImageIds.length === 0 ? fallbackImages.length : 0,
          defaultImages: defaultImages.length,
          totalImages: finalImageIds.length
        }
      }, 'stock/create')
    );

  } catch (error) {
    console.error('❌ API Route stock create error:', error);
    const internalError = createInternalErrorResponse(error, 'stock/create');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

/**
 * Generate a stock reference from vehicle data
 */
function generateStockReference(vehicleData: AutoTraderVehicleData): string {
  const make = vehicleData.make?.substring(0, 3).toUpperCase() || 'VEH';
  const model = vehicleData.model?.substring(0, 3).toUpperCase() || '';
  const reg = vehicleData.registration?.replace(/[^A-Z0-9]/g, '').substring(-3) || '';
  
  return `${make}${model}${reg}`;
}

/**
 * GET method to retrieve create stock information and example payloads
 */
export async function GET(request: NextRequest) {
  console.log('ℹ️ API Route: Stock create info request received');

  try {
    const { searchParams } = new URL(request.url);
    const flow = searchParams.get('flow') || 'both';

    const vehicleFinderExample = {
      flow: 'vehicle-finder',
      registration: 'KY24TKT',
      mileage: 30000,
      forecourtPrice: 45000,
      attentionGrabber: 'Available Now',
      description: 'Excellent condition, full service history',
      lifecycleState: 'FORECOURT',
      stockReference: 'AUDSQ7TKT'
    };

    const taxonomyExample = {
      flow: 'taxonomy',
      derivativeId: '7a62cbaa81594d5bb1e09b9563cd1124',
      mileage: 30000,
      year: 2024,
      plate: 'KY24TKT',
      colour: 'Red',
      forecourtPrice: 45000,
      attentionGrabber: 'Available Now',
      description: 'Excellent condition, full service history',
      lifecycleState: 'FORECOURT',
      stockReference: 'AUDSQ7TKT'
    };

    const response = {
      message: 'Stock create API endpoint information',
        endpoint: '/api/stock/create',
        method: 'POST',
      flows: {
        'vehicle-finder': {
          description: 'Create stock from vehicle registration lookup',
          requiredFields: ['flow', 'registration', 'mileage'],
          optionalFields: ['forecourtPrice', 'attentionGrabber', 'description', 'lifecycleState', 'stockReference'],
          example: vehicleFinderExample
        },
        'taxonomy': {
          description: 'Create stock from taxonomy derivative ID',
          requiredFields: ['flow', 'derivativeId', 'mileage'],
          optionalFields: ['year', 'plate', 'colour', 'forecourtPrice', 'attentionGrabber', 'description', 'lifecycleState', 'stockReference'],
          example: taxonomyExample
        }
      },
      examples: flow === 'vehicle-finder' ? vehicleFinderExample : 
                flow === 'taxonomy' ? taxonomyExample : 
                { vehicleFinderExample, taxonomyExample }
    };

    return NextResponse.json(
      createSuccessResponse(response, 'stock/create')
    );

  } catch (error) {
    console.error('❌ API Route stock create error:', error);
    const internalError = createInternalErrorResponse(error, 'stock/create');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}