import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dealers, stockCache, userAssignments, companySettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import JSZip from 'jszip';
import { rateLimiter, getClientIdentifier } from '@/lib/rateLimiter';

/**
 * Public Export API Endpoint
 * 
 * This is a public API endpoint for exporting dealer and vehicle data
 * with token-based authentication and rate limiting.
 * 
 * Features:
 * - Token-based authentication (EXPORT_API_TOKEN from .env)
 * - Rate limiting: 10 requests per hour per token/IP
 * - Support for different export formats (car_24/cf247, aa/aacars)
 * - Optional dealer-specific exports
 * - Returns ZIP file with CSV data
 * 
 * Usage:
 * POST /api/public/export
 * Headers:
 *   Authorization: Bearer <EXPORT_API_TOKEN>
 *   Content-Type: application/json
 * Body:
 *   {
 *     "dealerId": "optional-dealer-id",
 *     "format": "car_24" | "aa" | "cf247" | "aacars"
 *   }
 */

// Type definitions (same as admin export)
interface AdvertiserData {
  advertiserId?: string;
  name?: string;
  phone?: string;
  website?: string;
  location?: {
    town?: string;
    county?: string;
    postCode?: string;
    addressLineOne?: string;
  };
}

interface VehicleData {
  stockId: string;
  dealerId: string;
  advertiserId: string;
  advertiserData?: AdvertiserData;
  vehicleData?: Record<string, unknown>;
  advertsData?: Record<string, unknown>;
  mediaData?: Record<string, unknown>;
  featuresData?: Array<{ name: string }>;
  checkData?: Record<string, unknown>;
  make: string;
  model: string;
  derivative?: string;
  bodyType?: string;
  fuelType?: string;
  odometerReadingMiles?: number;
  registration?: string;
  yearOfManufacture?: number;
  forecourtPriceGBP?: number;
  totalPriceGBP?: number;
}

interface DealerInfo {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  websiteUrl?: string;
  metadata?: {
    address?: {
      buildingName?: string;
      buildingNumber?: string;
      streetName?: string;
      locality?: string;
      town?: string;
      county?: string;
      postcode?: string;
    };
    phone?: string;
    websiteUrl?: string;
  };
}

interface UserCompanyInfo {
  email?: string;
}

// Helper function to authenticate API token
function authenticateToken(request: NextRequest): { success: boolean; error?: string } {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return { success: false, error: 'Missing authorization header' };
  }

  // Support both "Bearer <token>" and just "<token>"
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  const validToken = process.env.EXPORT_API_TOKEN;

  if (!validToken) {
    console.error('❌ EXPORT_API_TOKEN not configured in environment variables');
    return { success: false, error: 'Server configuration error' };
  }

  if (token !== validToken) {
    return { success: false, error: 'Invalid authentication token' };
  }

  return { success: true };
}

// Helper function to generate deep link URL
function generateDeepLinkUrl(vehicle: VehicleData, selectedDealerInfo: DealerInfo | null = null): string {
  if (!selectedDealerInfo?.websiteUrl) {
    return '';
  }
  
  const make = vehicle.make || '';
  const model = vehicle.model || '';
  const year = vehicle.yearOfManufacture || '';
  
  const cleanMake = make.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cleanModel = model.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cleanYear = year.toString();
  
  const baseUrl = selectedDealerInfo.websiteUrl.replace(/\/$/, '');
  const stockId = vehicle.stockId;
  
  return `${baseUrl}/used-cars/${cleanMake}-${cleanModel}-${cleanYear}-${stockId}`;
}

// Helper function to escape CSV values
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Generate Dealers.csv content (CF247 format)
function generateDealersCsv(vehiclesData: VehicleData[], selectedDealerInfo: DealerInfo | null = null, userCompanyInfo: UserCompanyInfo = {}): string {
  const headers = [
    'DealerId',
    'DealerName',
    'BuildingName',
    'BuildingNumber', 
    'StreetName',
    'Locality',
    'Town',
    'County',
    'Postcode',
    'Phone',
    'EmailAddress',
    'WebsiteURL'
  ];

  const firstVehicle = vehiclesData[0];
  const advertiserData = firstVehicle?.advertiserData || {};
  const location = advertiserData.location || {};
  
  const addressLineOne = location.addressLineOne || '';
  const addressParts = addressLineOne.split(' ');
  const buildingNumber = addressParts[0] && !isNaN(Number(addressParts[0])) ? addressParts[0] : '';
  const streetName = addressParts.slice(1).join(' ') || '';
  
  const dealerMetadata = selectedDealerInfo?.metadata || {};
  const dealerAddress = dealerMetadata.address || {};
  
  const dealerRow = [
    advertiserData.advertiserId || '',
    advertiserData.name || selectedDealerInfo?.name || '',
    dealerAddress.buildingName || '',
    buildingNumber || dealerAddress.buildingNumber || '',
    streetName || dealerAddress.streetName || '',
    dealerAddress.locality || '',
    location.town || dealerAddress.town || '',
    location.county || dealerAddress.county || '',
    location.postCode || dealerAddress.postcode || '',
    advertiserData.phone || dealerMetadata.phone || '',
    selectedDealerInfo?.email || userCompanyInfo.email || '',
    advertiserData.website || dealerMetadata.websiteUrl || ''
  ].map(escapeCsvValue);

  return [headers.join(','), dealerRow.join(',')].join('\n');
}

// Generate Vehicles.csv content (CF247 format)
function generateVehiclesCsv(vehiclesData: VehicleData[], selectedDealerInfo: DealerInfo | null = null): string {
  const headers = [
    'VehicleId',
    'DealerId', 
    'CapId',
    'Make',
    'Range',
    'Trim',
    'BodyStyle',
    'Colour',
    'Mileage',
    'NumberOfDoors',
    'EngineSize',
    'FuelType',
    'TransmissionType',
    'InsuranceGroup',
    'ServiceHistory',
    'Options',
    'AdditionalOptions',
    'PictureURLs',
    'NoOfPreviousOwners',
    'Price',
    'Registration',
    'YearOfManufacture',
    'VehicleURL',
    'VehicleType',
    'VAT Qualifying',
    'Price Includes VAT'
  ];

  const rows = vehiclesData.map((vehicle, index) => {
    const vehicleData = vehicle.vehicleData || {};
    const advertsData = vehicle.advertsData || {};
    const mediaData = vehicle.mediaData || {};
    const featuresData = vehicle.featuresData || [];
    
    let pictureUrls = '';
    if (mediaData.images && Array.isArray(mediaData.images)) {
      pictureUrls = mediaData.images
        .filter((img: { href?: string }) => img && img.href)
        .map((img: { href: string }) => img.href.replace('{resize}', 'w800h600'))
        .join('|');
    }
    
    let options = '';
    if (featuresData && Array.isArray(featuresData)) {
      const featureNames = featuresData.map((f: { name: string }) => f.name).filter(Boolean);
      options = featureNames.join('|');
    }
    
    const vehicleType = (vehicleData as { vehicleType?: string }).vehicleType === 'commercial' ? '2' : '1';
    
    const retailAdverts = (advertsData as { retailAdverts?: { vatStatus?: string; vatable?: string; totalPrice?: unknown; suppliedPrice?: unknown } }).retailAdverts || {};
    const vatStatus = retailAdverts.vatStatus ?? advertsData.forecourtPriceVatStatus;
    const vatQualifying = vatStatus === 'Ex VAT' || vatStatus === 'Inc VAT' ? 'Y' : 'N';
    const priceIncludesVat = vatStatus === 'Inc VAT' ? 'Y' : 'N';
    
    const vehicleUrl = generateDeepLinkUrl(vehicle, selectedDealerInfo);
    
    const extractPrice = (priceObj: number | { amountGBP?: number } | null | undefined): number | null => {
      if (typeof priceObj === 'number') return priceObj;
      if (priceObj && typeof priceObj === 'object' && priceObj.amountGBP) {
        return priceObj.amountGBP;
      }
      return null;
    };
    
    const currentPrice = extractPrice(vehicle.forecourtPriceGBP) || 
                       extractPrice(vehicle.totalPriceGBP) ||
                       extractPrice((advertsData as { forecourtPrice?: unknown }).forecourtPrice as number | { amountGBP?: number } | null | undefined) || 
                       extractPrice(retailAdverts.totalPrice as number | { amountGBP?: number } | null | undefined) ||
                       extractPrice(retailAdverts.suppliedPrice as number | { amountGBP?: number } | null | undefined) ||
                       0;
    
    return [
      (index + 1).toString(),
      vehicle.advertiserId,
      '',
      vehicle.make,
      vehicle.model,
      vehicle.derivative || '',
      vehicle.bodyType || '',
      (vehicleData as { colour?: string; standard?: { colour?: string } }).colour || 
      (vehicleData as { colour?: string; standard?: { colour?: string } }).standard?.colour || '',
      vehicle.odometerReadingMiles || 0,
      (vehicleData as { doors?: string; numberOfDoors?: string }).doors || (vehicleData as { doors?: string; numberOfDoors?: string }).numberOfDoors || '',
      (() => {
        const engineCapacityCC = (vehicleData as { engineCapacityCC?: number }).engineCapacityCC;
        return engineCapacityCC ? `${engineCapacityCC}cc` : '';
      })(),
      vehicle.fuelType || '',
      (vehicleData as { transmissionType?: string }).transmissionType || '',
      (vehicleData as { insuranceGroup?: string }).insuranceGroup || '',
      (vehicleData as { serviceHistory?: string }).serviceHistory || 'No Record',
      options,
      '',
      pictureUrls,
      (vehicleData as { previousOwners?: number; owners?: number }).previousOwners || (vehicleData as { previousOwners?: number; owners?: number }).owners || 0,
      currentPrice,
      vehicle.registration || '',
      vehicle.yearOfManufacture || '',
      vehicleUrl,
      vehicleType,
      vatQualifying,
      priceIncludesVat
    ].map(escapeCsvValue);
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Generate AA Cars dealers.csv content
function generateAACarsDealersCsv(vehiclesData: VehicleData[], selectedDealerInfo: DealerInfo | null = null, userCompanyInfo: UserCompanyInfo = {}): string {
  const headers = [
    'feed_id',
    'dealername',
    'address',
    'postcode',
    'phone_number',
    'email'
  ];

  const firstVehicle = vehiclesData[0];
  const advertiserData = firstVehicle?.advertiserData || {};
  const location = advertiserData.location || {};
  
  const addressLineOne = location.addressLineOne || '';
  const dealerMetadata = selectedDealerInfo?.metadata || {};
  const dealerAddress = dealerMetadata.address || {};
  
  const addressParts = [];
  if (dealerAddress.buildingName) addressParts.push(dealerAddress.buildingName);
  if (dealerAddress.buildingNumber) addressParts.push(dealerAddress.buildingNumber);
  if (dealerAddress.streetName) addressParts.push(dealerAddress.streetName);
  if (dealerAddress.locality) addressParts.push(dealerAddress.locality);
  if (location.town || dealerAddress.town) addressParts.push(location.town || dealerAddress.town);
  
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : addressLineOne;
  
  const companyName = selectedDealerInfo?.companyName || advertiserData.name || selectedDealerInfo?.name || 'Unknown';
  const dealerId = advertiserData.advertiserId || selectedDealerInfo?.id || 'unknown';
  
  const firstWord = companyName.split(' ')[0].toLowerCase();
  const feedId = `${firstWord}_${dealerId}`;
  
  const dealerRow = [
    feedId,
    selectedDealerInfo?.companyName || advertiserData.name || selectedDealerInfo?.name || '',
    fullAddress,
    location.postCode || dealerAddress.postcode || '',
    advertiserData.phone || dealerMetadata.phone || '',
    selectedDealerInfo?.email || userCompanyInfo.email || ''
  ].map(escapeCsvValue);

  return [headers.join(','), dealerRow.join(',')].join('\n');
}

// Generate AA Cars aacars.csv content
function generateAACarsStockCsv(vehiclesData: VehicleData[], selectedDealerInfo: DealerInfo | null = null): string {
  const headers = [
    'feedid',
    'vehicleid',
    'registration',
    'colour',
    'fueltype',
    'year',
    'mileage',
    'bodytype',
    'doors',
    'make',
    'model',
    'variant',
    'enginesize',
    'price',
    'transmission',
    'description',
    'options',
    'picturerefs',
    'servicehistory',
    'previousowners',
    'plusvat',
    'deeplink',
    'youtuberef'
  ];

  const rows = vehiclesData.map((vehicle, index) => {
    const vehicleData = vehicle.vehicleData || {};
    const advertsData = vehicle.advertsData || {};
    const mediaData = vehicle.mediaData || {};
    const featuresData = vehicle.featuresData || [];
    
    let pictureRefs = '';
    if (mediaData.images && Array.isArray(mediaData.images)) {
      pictureRefs = mediaData.images
        .filter((img: { href?: string }) => img && img.href)
        .map((img: { href: string }) => img.href.replace('{resize}', 'w1280h960'))
        .join(',');
    }
    
    let options = '';
    if (featuresData && Array.isArray(featuresData)) {
      const featureNames = featuresData.map((f: { name: string }) => f.name).filter(Boolean);
      options = featureNames.join(',');
    }
    
    const advertiserData = vehicle.advertiserData || {};
    const companyName = selectedDealerInfo?.companyName || advertiserData.name || 'Unknown';
    const dealerId = advertiserData.advertiserId || vehicle.dealerId;
    
    const firstWord = companyName.split(' ')[0].toLowerCase();
    const feedId = `${firstWord}_${dealerId}`;
    
    const extractPrice = (priceObj: number | { amountGBP?: number } | null | undefined): number | null => {
      if (typeof priceObj === 'number') return priceObj;
      if (priceObj && typeof priceObj === 'object' && priceObj.amountGBP) {
        return priceObj.amountGBP;
      }
      return null;
    };
    
    const currentPrice = extractPrice(vehicle.forecourtPriceGBP) || 
                       extractPrice(vehicle.totalPriceGBP) ||
                       extractPrice((advertsData as { forecourtPrice?: unknown }).forecourtPrice as number | { amountGBP?: number } | null | undefined) || 
                       0;
    
    const retailAdverts = (advertsData as { retailAdverts?: { vatStatus?: string; vatable?: string } }).retailAdverts || {};
    const plusVat = retailAdverts.vatStatus === 'vat_qualifying' ? 'Y' : 'N';
    
    const vehicleUrl = generateDeepLinkUrl(vehicle, selectedDealerInfo);
    
    const engineCapacityCC = (vehicleData as { engineCapacityCC?: number }).engineCapacityCC;
    const engineSizeCC = engineCapacityCC ? `${engineCapacityCC}cc` : '';
    
    const doors = (vehicleData as { doors?: string | number; numberOfDoors?: string | number }).doors || 
                  (vehicleData as { doors?: string | number; numberOfDoors?: string | number }).numberOfDoors || '';
    const doorsInt = String(doors).replace(/[^\d]/g, '') || '';
    
    const serviceHistory = (vehicleData as { serviceHistory?: string }).serviceHistory || 'No Record';
    const serviceHistoryBool = serviceHistory === 'No Record' ? '0' : '1';
    
    const previousOwners = (vehicleData as { previousOwners?: number; owners?: number }).previousOwners || 
                          (vehicleData as { previousOwners?: number; owners?: number }).owners || 0;
    
    return [
      feedId,
      (index + 1).toString(),
      (vehicle.registration || '').toUpperCase().replace(/\s/g, ''),
      (vehicleData as { colour?: string; standard?: { colour?: string } }).colour || 
      (vehicleData as { colour?: string; standard?: { colour?: string } }).standard?.colour || '',
      vehicle.fuelType || '',
      vehicle.yearOfManufacture || '',
      vehicle.odometerReadingMiles || 0,
      vehicle.bodyType || '',
      doorsInt,
      vehicle.make,
      vehicle.model,
      vehicle.derivative || '',
      engineSizeCC,
      currentPrice,
      (vehicleData as { transmissionType?: string }).transmissionType || '',
      '',
      options,
      pictureRefs,
      serviceHistoryBool,
      previousOwners.toString(),
      plusVat,
      vehicleUrl,
      ''
    ].map(escapeCsvValue);
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// GET - API documentation
export async function GET() {
  return NextResponse.json({
    message: 'Public Export API',
    version: '1.0.0',
    authentication: 'Bearer token required (EXPORT_API_TOKEN)',
    rateLimit: {
      requests: 10,
      window: '1 hour',
      identifier: 'token + IP address'
    },
    endpoints: {
      POST: {
        description: 'Generate and download export',
        path: '/api/public/export',
        headers: {
          Authorization: 'Bearer <EXPORT_API_TOKEN>',
          'Content-Type': 'application/json'
        },
        body: {
          dealerId: 'optional - specific dealer ID or omit for all dealers',
          format: 'required - "car_24" or "aa" (aliases: "cf247", "aacars")'
        },
        response: {
          success: 'ZIP file download',
          error: 'JSON error response'
        }
      }
    },
    formats: {
      car_24: 'CF247 format - Dealers.csv and Vehicles.csv',
      cf247: 'CF247 format - Dealers.csv and Vehicles.csv',
      aa: 'AA Cars format - dealers.csv and aacars.csv',
      aacars: 'AA Cars format - dealers.csv and aacars.csv'
    }
  });
}

// POST - Generate and download export
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate token
    const authResult = authenticateToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error || 'Authentication failed'
        },
        { status: 401 }
      );
    }

    // 2. Check rate limit (10 requests per hour)
    const clientId = getClientIdentifier(request);
    const rateLimitKey = `export_${clientId}`;
    const rateLimit = rateLimiter.check(rateLimitKey, 10, 60 * 60 * 1000); // 10 requests per hour

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          details: {
            limit: 10,
            window: '1 hour',
            resetAt: new Date(rateLimit.resetAt).toISOString(),
            retryAfter: rateLimit.retryAfter
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': rateLimit.retryAfter.toString()
          }
        }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { dealerId, format } = body;

    if (!format) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Format is required',
          details: 'Supported formats: car_24, cf247, aa, aacars'
        },
        { status: 400 }
      );
    }

    // Normalize format (car_24 -> cf247, aa -> aacars)
    const normalizedFormat = format === 'car_24' || format === 'cf247' 
      ? 'cf247' 
      : format === 'aa' || format === 'aacars'
      ? 'aacars'
      : null;

    if (!normalizedFormat) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid format',
          details: 'Supported formats: car_24, cf247, aa, aacars'
        },
        { status: 400 }
      );
    }

    // 4. Fetch vehicles data - ONLY FORECOURT vehicles
    let vehiclesData;
    
    if (dealerId) {
      vehiclesData = await db.select().from(stockCache).where(
        and(
          eq(stockCache.dealerId, dealerId),
          eq(stockCache.lifecycleState, 'FORECOURT')
        )
      );
    } else {
      vehiclesData = await db.select().from(stockCache).where(
        eq(stockCache.lifecycleState, 'FORECOURT')
      );
    }

    if (vehiclesData.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No vehicles found',
          details: dealerId 
            ? `No FORECOURT vehicles found for dealer ID: ${dealerId}`
            : 'No FORECOURT vehicles found in the system'
        },
        { status: 404 }
      );
    }

    // 5. Fetch dealer information
    let selectedDealerInfo = null;
    const targetDealerId = dealerId || vehiclesData[0]?.dealerId;
    
    if (targetDealerId) {
      const dealerData = await db.select().from(dealers).where(eq(dealers.id, targetDealerId));
      const dealer = dealerData[0];
      
      if (dealer) {
        const userAssignment = await db.select().from(userAssignments).where(eq(userAssignments.dealerId, targetDealerId)).limit(1);
        const companySetting = await db.select().from(companySettings).where(eq(companySettings.dealerId, targetDealerId)).limit(1);
        
        selectedDealerInfo = {
          ...dealer,
          companyName: userAssignment[0]?.companyName || companySetting[0]?.companyName || null,
          websiteUrl: companySetting[0]?.contactWebsite || null
        };
      }
    }

    // 6. Generate export files
    const zip = new JSZip();
    const userCompanyInfo = { email: selectedDealerInfo?.email || '' };

    if (normalizedFormat === 'aacars') {
      // AA Cars format
      const dealersCsv = generateAACarsDealersCsv(
        vehiclesData as unknown as VehicleData[], 
        selectedDealerInfo as unknown as DealerInfo, 
        userCompanyInfo
      );
      const vehiclesCsv = generateAACarsStockCsv(
        vehiclesData as unknown as VehicleData[], 
        selectedDealerInfo as unknown as DealerInfo
      );
      
      zip.file('dealers.csv', dealersCsv);
      zip.file('aacars.csv', vehiclesCsv);
    } else {
      // CF247 format
      const dealersCsv = generateDealersCsv(
        vehiclesData as unknown as VehicleData[], 
        selectedDealerInfo as unknown as DealerInfo, 
        userCompanyInfo
      );
      const vehiclesCsv = generateVehiclesCsv(
        vehiclesData as unknown as VehicleData[], 
        selectedDealerInfo as unknown as DealerInfo
      );
      
      zip.file('Dealers.csv', dealersCsv);
      zip.file('Vehicles.csv', vehiclesCsv);
    }

    // 7. Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 8. Return ZIP file with rate limit headers
    const filename = normalizedFormat === 'aacars' ? 'aacars-export' : 'cf247-export';
    return new NextResponse(zipBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.zip"`,
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString()
      }
    });

  } catch (error) {
    console.error('Public export API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

