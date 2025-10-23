import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealers, stockCache } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import JSZip from 'jszip';

// Type definitions
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

// Helper function to check admin access
async function checkAdminAuth() {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: { message: 'User not authenticated', httpStatus: 401 } };
  }

  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
  const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
  
  if (!adminEmails.includes(userEmail)) {
    return { success: false, error: { message: 'Admin access required', httpStatus: 403 } };
  }

  return { success: true, user };
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

// Generate Dealers.csv content combining advertiserData with dealer company info
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

  // Get advertiserData from first vehicle (primary source)
  const firstVehicle = vehiclesData[0];
  const advertiserData = firstVehicle?.advertiserData || {};
  const location = advertiserData.location || {};
  
  // Parse addressLineOne to extract building name/number and street
  const addressLineOne = location.addressLineOne || '';
  const addressParts = addressLineOne.split(' ');
  const buildingNumber = addressParts[0] && !isNaN(Number(addressParts[0])) ? addressParts[0] : '';
  const streetName = addressParts.slice(1).join(' ') || '';
  
  // Start with advertiserData, then fill missing fields from dealer company info
  const dealerMetadata = selectedDealerInfo?.metadata || {};
  const dealerAddress = dealerMetadata.address || {};
  
  const dealerRow = [
    // DealerId: Use advertiserId from advertiserData
    advertiserData.advertiserId || '',
    
    // DealerName: Use advertiserData name, fallback to dealer company name
    advertiserData.name || selectedDealerInfo?.name || '',
    
    // BuildingName: Use dealer company info (not available in advertiserData)
    dealerAddress.buildingName || '',
    
    // BuildingNumber: Use advertiserData parsed, fallback to dealer company info
    buildingNumber || dealerAddress.buildingNumber || '',
    
    // StreetName: Use advertiserData parsed, fallback to dealer company info
    streetName || dealerAddress.streetName || '',
    
    // Locality: Use dealer company info (not available in advertiserData)
    dealerAddress.locality || '',
    
    // Town: Use advertiserData, fallback to dealer company info
    location.town || dealerAddress.town || '',
    
    // County: Use advertiserData, fallback to dealer company info
    location.county || dealerAddress.county || '',
    
    // Postcode: Use advertiserData, fallback to dealer company info
    location.postCode || dealerAddress.postcode || '',
    
    // Phone: Use advertiserData, fallback to dealer company info
    advertiserData.phone || dealerMetadata.phone || '',
    
    // EmailAddress: Use dealer company email, fallback to user email
    selectedDealerInfo?.email || userCompanyInfo.email || '',
    
    // WebsiteURL: Use advertiserData, fallback to dealer company info
    advertiserData.website || dealerMetadata.websiteUrl || ''
  ].map(escapeCsvValue);

  return [headers.join(','), dealerRow.join(',')].join('\n');
}

// Generate Vehicles.csv content
function generateVehiclesCsv(vehiclesData: VehicleData[]): string {
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

  const rows = vehiclesData.map(vehicle => {
    // Extract data from JSONB fields - same structure as mystock page
    const vehicleData = vehicle.vehicleData || {};
    const advertsData = vehicle.advertsData || {};
    const mediaData = vehicle.mediaData || {};
    const featuresData = vehicle.featuresData || [];
    
    // Process images - same logic as GalleryTab and OverviewTab
    let pictureUrls = '';
    if (mediaData.images && Array.isArray(mediaData.images)) {
      pictureUrls = mediaData.images
        .filter((img: { href?: string }) => img && img.href) // Filter out invalid images
        .map((img: { href: string }) => {
          // Replace {resize} placeholder with actual size for export
          return img.href.replace('{resize}', 'w800h600');
        })
        .join('|');
    }
    
    // Process options/features - same logic as FeaturesTab
    let options = '';
    let additionalOptions = '';
    if (featuresData && Array.isArray(featuresData)) {
      // Features are typically just an array of objects with 'name' property
      const featureNames = featuresData.map((f: { name: string }) => f.name).filter(Boolean);
      options = featureNames.join('|');
      // For CF247, we'll put all features in Options field
      additionalOptions = '';
    }
    
    // Determine vehicle type (1 = car, 2 = commercial)
    const vehicleType = (vehicleData as { vehicleType?: string }).vehicleType === 'commercial' ? '2' : '1';
    
    // VAT fields - extract from adverts data (same logic as OverviewTab)
    const retailAdverts = (advertsData as { retailAdverts?: { vatStatus?: string; vatable?: string; totalPrice?: unknown; suppliedPrice?: unknown } }).retailAdverts || {};
    const vatQualifying = retailAdverts.vatStatus === 'vat_qualifying' ? 'Y' : 'N';
    const priceIncludesVat = retailAdverts.vatable === 'true' ? 'Y' : 'N';
    
    // Extract vehicle URL from adverts
    const vehicleUrl = (advertsData as { vehicleUrl?: string }).vehicleUrl || '';
    
    // Price extraction - same logic as mystock page
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
      vehicle.stockId.slice(-6), // VehicleId: Last 6 digits of stockId
      vehicle.advertiserId, // DealerId: Use advertiserId
      '', // CapId: Empty as not available
      vehicle.make,
      vehicle.model,
      vehicle.derivative || '',
      vehicle.bodyType || '',
      (vehicleData as { colour?: string }).colour || '',
      vehicle.odometerReadingMiles || 0,
      (vehicleData as { doors?: string; numberOfDoors?: string }).doors || (vehicleData as { doors?: string; numberOfDoors?: string }).numberOfDoors || '',
      (vehicleData as { engineSize?: string }).engineSize || '',
      vehicle.fuelType || '',
      (vehicleData as { transmissionType?: string }).transmissionType || '',
      (vehicleData as { insuranceGroup?: string }).insuranceGroup || '',
      (vehicleData as { serviceHistory?: string }).serviceHistory || 'No Record',
      options,
      additionalOptions,
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

  // Get advertiserData from first vehicle (primary source)
  const firstVehicle = vehiclesData[0];
  const advertiserData = firstVehicle?.advertiserData || {};
  const location = advertiserData.location || {};
  
  // Parse addressLineOne to extract building name/number and street
  const addressLineOne = location.addressLineOne || '';
  const dealerMetadata = selectedDealerInfo?.metadata || {};
  const dealerAddress = dealerMetadata.address || {};
  
  // Build full address
  const addressParts = [];
  if (dealerAddress.buildingName) addressParts.push(dealerAddress.buildingName);
  if (dealerAddress.buildingNumber) addressParts.push(dealerAddress.buildingNumber);
  if (dealerAddress.streetName) addressParts.push(dealerAddress.streetName);
  if (dealerAddress.locality) addressParts.push(dealerAddress.locality);
  if (location.town || dealerAddress.town) addressParts.push(location.town || dealerAddress.town);
  
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : addressLineOne;
  
  // Generate feed_id as companyname_dealerid format
  const companyName = advertiserData.name || selectedDealerInfo?.name || 'Unknown';
  const dealerId = advertiserData.advertiserId || selectedDealerInfo?.id || 'unknown';
  const feedId = `${companyName.replace(/\s+/g, '_')}_${dealerId}`;
  
  const dealerRow = [
    feedId,
    advertiserData.name || selectedDealerInfo?.name || '',
    fullAddress,
    location.postCode || dealerAddress.postcode || '',
    advertiserData.phone || dealerMetadata.phone || '',
    selectedDealerInfo?.email || userCompanyInfo.email || ''
  ].map(escapeCsvValue);

  return [headers.join(','), dealerRow.join(',')].join('\n');
}

// Generate AA Cars aacars.csv content
function generateAACarsStockCsv(vehiclesData: VehicleData[]): string {
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

  const rows = vehiclesData.map(vehicle => {
    // Extract data from JSONB fields
    const vehicleData = vehicle.vehicleData || {};
    const advertsData = vehicle.advertsData || {};
    const mediaData = vehicle.mediaData || {};
    const featuresData = vehicle.featuresData || [];
    
    // Process images - AA Cars format requires comma-separated URLs with no spaces
    let pictureRefs = '';
    if (mediaData.images && Array.isArray(mediaData.images)) {
      pictureRefs = mediaData.images
        .filter((img: { href?: string }) => img && img.href)
        .map((img: { href: string }) => {
          // Replace {resize} placeholder with AA Cars preferred size (1280x960)
          return img.href.replace('{resize}', 'w1280h960');
        })
        .join(',');
    }
    
    // Process options/features - AA Cars format uses comma-separated options
    let options = '';
    if (featuresData && Array.isArray(featuresData)) {
      const featureNames = featuresData.map((f: { name: string }) => f.name).filter(Boolean);
      options = featureNames.join(',');
    }
    
    // Generate feed_id as companyname_dealerid format
    const advertiserData = vehicle.advertiserData || {};
    const companyName = advertiserData.name || 'Unknown';
    const dealerId = advertiserData.advertiserId || vehicle.dealerId;
    const feedId = `${companyName.replace(/\s+/g, '_')}_${dealerId}`;
    
    // Extract price and VAT information
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
    
    // VAT status - AA Cars uses Y/N format
    const retailAdverts = (advertsData as { retailAdverts?: { vatStatus?: string; vatable?: string } }).retailAdverts || {};
    const plusVat = retailAdverts.vatStatus === 'vat_qualifying' ? 'Y' : 'N';
    
    // Extract vehicle URL for deeplink
    const vehicleUrl = (advertsData as { vehicleUrl?: string }).vehicleUrl || '';
    
    // Extract engine size in CC format
    const engineSize = (vehicleData as { engineSize?: string }).engineSize || '';
    const engineSizeCC = engineSize.replace(/[^\d]/g, '') + 'cc';
    
    // Extract doors as single integer
    const doors = (vehicleData as { doors?: string; numberOfDoors?: string }).doors || 
                  (vehicleData as { doors?: string; numberOfDoors?: string }).numberOfDoors || '';
    const doorsInt = doors.replace(/[^\d]/g, '') || '';
    
    // Service history - convert to boolean format (0/1)
    const serviceHistory = (vehicleData as { serviceHistory?: string }).serviceHistory || 'No Record';
    const serviceHistoryBool = serviceHistory === 'No Record' ? '0' : '1';
    
    // Previous owners
    const previousOwners = (vehicleData as { previousOwners?: number; owners?: number }).previousOwners || 
                          (vehicleData as { previousOwners?: number; owners?: number }).owners || 0;
    
    return [
      feedId,
      vehicle.stockId.slice(-6), // vehicleid: Last 6 digits of stockId
      (vehicle.registration || '').toUpperCase().replace(/\s/g, ''), // registration: uppercase, no spaces
      (vehicleData as { colour?: string }).colour || '',
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
      '', // description: empty for now
      options,
      pictureRefs,
      serviceHistoryBool,
      previousOwners.toString(),
      plusVat,
      vehicleUrl,
      '' // youtuberef: empty for now
    ].map(escapeCsvValue);
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// GET - Fetch export statistics
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAuth();
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error?.message },
        { status: adminCheck.error?.httpStatus || 403 }
      );
    }

    const url = new URL(request.url);
    const statsOnly = url.searchParams.get('stats') === 'true';

    if (statsOnly) {
      // Return export statistics
      // Count unique dealers from advertiserData in FORECOURT vehicles
      const vehiclesForStats = await db
        .select({ advertiserData: stockCache.advertiserData })
        .from(stockCache)
        .where(eq(stockCache.lifecycleState, 'FORECOURT'));

      // Count unique advertiserIds
      const uniqueDealerIds = new Set<string>();
      vehiclesForStats.forEach(vehicle => {
        const advertiserData = vehicle.advertiserData as AdvertiserData;
        if (advertiserData?.advertiserId) {
          uniqueDealerIds.add(advertiserData.advertiserId);
        }
      });

      const vehiclesCount = await db
        .select({ count: count() })
        .from(stockCache)
        .where(eq(stockCache.lifecycleState, 'FORECOURT'));

      return NextResponse.json({
        totalDealers: uniqueDealerIds.size,
        totalVehicles: vehiclesCount[0]?.count || 0
      });
    }

    return NextResponse.json({ message: 'Export API ready' });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Generate and download export
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAuth();
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error?.message },
        { status: adminCheck.error?.httpStatus || 403 }
      );
    }

    const body = await request.json();
    const { dealerId, options } = body;

    if (!options) {
      return NextResponse.json(
        { error: 'Export options are required' },
        { status: 400 }
      );
    }

    const { includeDealers, includeVehicles, format } = options;

    if (!includeDealers && !includeVehicles) {
      return NextResponse.json(
        { error: 'At least one data type must be selected' },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    // Fetch vehicles data - ONLY FORECOURT vehicles (needed for both dealers and vehicles)
    let vehiclesData;
    
    if (dealerId) {
      vehiclesData = await db.select().from(stockCache).where(
        and(
          eq(stockCache.dealerId, dealerId),
          eq(stockCache.lifecycleState, 'FORECOURT')
        )
      );
    } else {
      // Only export FORECOURT vehicles
      vehiclesData = await db.select().from(stockCache).where(
        eq(stockCache.lifecycleState, 'FORECOURT')
      );
    }

    // Generate dealers CSV from advertiserData if requested
    if (includeDealers && vehiclesData.length > 0) {
      // Get user company information for email
      const userCompanyInfo = {
        email: adminCheck.user?.emailAddresses?.[0]?.emailAddress || ''
      };
      
      // Always fetch dealer company information for fallback data
      let selectedDealerInfo = null;
      if (dealerId) {
        // Specific dealer selected - fetch their company info
        const dealerData = await db.select().from(dealers).where(eq(dealers.id, dealerId));
        selectedDealerInfo = dealerData[0] || null;
      } else {
        // All dealers selected - get company info from first dealer that has vehicles
        const firstVehicleDealerId = vehiclesData[0]?.dealerId;
        if (firstVehicleDealerId) {
          const dealerData = await db.select().from(dealers).where(eq(dealers.id, firstVehicleDealerId));
          selectedDealerInfo = dealerData[0] || null;
        }
      }
      
      if (format === 'aacars') {
        const dealersCsv = generateAACarsDealersCsv(vehiclesData as unknown as VehicleData[], selectedDealerInfo as unknown as DealerInfo, userCompanyInfo);
        zip.file('dealers.csv', dealersCsv);
      } else {
        const dealersCsv = generateDealersCsv(vehiclesData as unknown as VehicleData[], selectedDealerInfo as unknown as DealerInfo, userCompanyInfo);
        zip.file('Dealers.csv', dealersCsv);
      }
    }

    // Generate vehicles CSV if requested
    if (includeVehicles && vehiclesData.length > 0) {
      if (format === 'aacars') {
        const vehiclesCsv = generateAACarsStockCsv(vehiclesData as unknown as VehicleData[]);
        zip.file('aacars.csv', vehiclesCsv);
      } else {
        const vehiclesCsv = generateVehiclesCsv(vehiclesData as unknown as VehicleData[]);
        zip.file('Vehicles.csv', vehiclesCsv);
      }
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Return ZIP file
    const filename = format === 'aacars' ? 'aacars-export' : 'cf247-export';
    return new NextResponse(zipBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.zip"`
      }
    });

  } catch (error) {
    console.error('Export generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
