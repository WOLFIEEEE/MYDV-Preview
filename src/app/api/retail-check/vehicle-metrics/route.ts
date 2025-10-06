import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

interface VehicleMetricsRequest {
  registration?: string;
  vin?: string;
  derivativeId?: string;
  mileage?: number;
}

interface VehicleMetricsResponse {
  performance: {
    acceleration_0_60: number;
    top_speed_mph: number;
    power_bhp: number;
    torque_nm: number;
  };
  economy: {
    mpg_combined: number;
    mpg_urban: number;
    mpg_extra_urban: number;
    co2_emissions: number;
    fuel_capacity_litres: number;
    range_miles?: number;
  };
  dimensions: {
    length_mm: number;
    width_mm: number;
    height_mm: number;
    wheelbase_mm: number;
    boot_capacity_litres: number;
    gross_weight_kg: number;
  };
  safety: {
    ncap_rating?: number;
    airbags: number;
    abs: boolean;
    esp: boolean;
    isofix: boolean;
  };
  ownership: {
    insurance_group: string;
    tax_band: string;
    annual_tax: number;
    warranty_years: number;
    service_interval_miles: number;
  };
  market_position: {
    segment: string;
    competitors: string[];
    popularity_score?: number;
    depreciation_rate?: number;
    days_to_sell?: number;
    market_condition?: number;
    supply_demand_ratio?: number;
  };
}

export async function POST(request: NextRequest) {
  console.log('📊 API Route: Vehicle metrics request received');

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
        endpoint: 'vehicle-metrics'
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
        endpoint: 'vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    const body: VehicleMetricsRequest = await request.json();
    console.log('📋 Vehicle metrics request data:', body);

    // Validate that we have at least one identifier
    if (!body.registration && !body.vin && !body.derivativeId) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Vehicle identifier required',
        details: 'Please provide registration, VIN, or derivative ID',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get user's store configuration
    const storeConfigResult = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, email))
      .limit(1);

    let advertiserId: string | undefined;
    if (storeConfigResult.length > 0) {
      advertiserId = storeConfigResult[0].primaryAdvertisementId || undefined;
      
      // Try to get from advertisementId field
      if (!advertiserId && storeConfigResult[0].advertisementId) {
        try {
          const adIds = JSON.parse(storeConfigResult[0].advertisementId);
          if (Array.isArray(adIds) && adIds.length > 0) {
            advertiserId = adIds[0];
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    if (!advertiserId) {
      advertiserId = process.env.ADVERTISER_ID || '10028737';
    }

    // Get authentication token
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      console.error('❌ AutoTrader authentication failed');
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'AutoTrader authentication failed',
        details: 'Failed to authenticate with AutoTrader API',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const accessToken = authResult.access_token;
    const baseUrl = getAutoTraderBaseUrlForServer();

    // Note: Vehicle metrics should be obtained from the main retail check API
    // This endpoint is for cases where we need metrics separately
    
    // Build the API request with mileage for complete data
    const params = new URLSearchParams();
    params.append('advertiserId', advertiserId);
    params.append('vehicleMetrics', 'true');
    params.append('valuations', 'true'); // Include valuations for complete data
    
    if (body.registration) {
      params.append('registration', body.registration);
    } else if (body.vin) {
      params.append('vin', body.vin);
    }
    
    // Add mileage if provided for better metrics
    if (body.mileage) {
      params.append('odometerReadingMiles', body.mileage.toString());
    }

    const url = `${baseUrl}/vehicles?${params.toString()}`;
    console.log('📡 Fetching vehicle metrics from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Vehicle metrics API error:', response.status, errorText);
      
      const apiError = {
        type: ErrorType.SERVER_ERROR,
        message: 'Vehicle metrics API failed',
        details: `API returned ${response.status}: ${errorText}`,
        httpStatus: response.status,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-metrics'
      };
      return NextResponse.json(
        createErrorResponse(apiError),
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Vehicle metrics API response received');

    // Check for API warnings
    if (data.warnings) {
      console.log('⚠️ Vehicle metrics API warnings:', data.warnings);
      data.warnings.forEach((warning: any) => {
        if (warning.feature === 'vehicle' && warning.message.includes('metrics')) {
          console.log(`📈 Vehicle metrics warning: ${warning.message}`);
        }
      });
    }

    // Transform API response to our format - handle gracefully if some data is missing
    const metrics = transformVehicleMetrics(data);
    
    return NextResponse.json(
      createSuccessResponse(metrics, 'vehicle-metrics')
    );

  } catch (error) {
    console.error('❌ Vehicle metrics error:', error);
    
    const internalError = {
      type: ErrorType.SERVER_ERROR,
      message: 'Internal server error in vehicle metrics',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      httpStatus: 500,
      timestamp: new Date().toISOString(),
      endpoint: 'vehicle-metrics'
    };
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

function transformVehicleMetrics(apiData: any): VehicleMetricsResponse {
  const vehicle = apiData.vehicle || {};
  const features = apiData.features || [];
  const vehicleMetrics = apiData.vehicleMetrics || {};
  
  // Handle gracefully if some data is missing - show what we have
  console.log('🔄 Transforming vehicle metrics with available data');
  if (!vehicle || Object.keys(vehicle).length === 0) {
    console.log('ℹ️ Limited vehicle data available - showing partial metrics');
  }
  
  return {
    performance: {
      acceleration_0_60: vehicle.zeroToSixtyMPHSeconds,
      top_speed_mph: vehicle.topSpeedMPH,
      power_bhp: vehicle.enginePowerBHP,
      torque_nm: vehicle.engineTorqueNM
    },
    economy: {
      mpg_combined: vehicle.fuelEconomyNEDCCombinedMPG || vehicle.fuelEconomyWLTPCombinedMPG,
      mpg_urban: vehicle.fuelEconomyNEDCUrbanMPG || vehicle.fuelEconomyWLTPLowMPG,
      mpg_extra_urban: vehicle.fuelEconomyNEDCExtraUrbanMPG || vehicle.fuelEconomyWLTPExtraHighMPG,
      co2_emissions: vehicle.co2EmissionGPKM,
      fuel_capacity_litres: vehicle.fuelCapacityLitres,
      range_miles: vehicle.fuelCapacityLitres && vehicle.fuelEconomyNEDCCombinedMPG ? 
        calculateRange(vehicle.fuelCapacityLitres, vehicle.fuelEconomyNEDCCombinedMPG) : undefined
    },
    dimensions: {
      length_mm: vehicle.lengthMM,
      width_mm: vehicle.widthMM,
      height_mm: vehicle.heightMM,
      wheelbase_mm: vehicle.wheelbaseMM,
      boot_capacity_litres: vehicle.bootSpaceSeatsUpLitres,
      gross_weight_kg: vehicle.grossVehicleWeightKG || vehicle.minimumKerbWeightKG
    },
    safety: {
      ncap_rating: 0, // Not available in basic vehicle data
      airbags: 0, // Would need to parse features array
      abs: true, // Assume standard on modern vehicles
      esp: true, // Assume standard on modern vehicles
      isofix: true // Assume standard on modern vehicles
    },
    ownership: {
      insurance_group: vehicle.insuranceGroup + (vehicle.insuranceSecurityCode || ''),
      tax_band: vehicle.co2EmissionGPKM ? calculateTaxBand(vehicle.co2EmissionGPKM) : '',
      annual_tax: vehicle.vehicleExciseDutyWithoutSupplementGBP,
      warranty_years: vehicle.warrantyMonthsOnPurchase ? Math.floor(vehicle.warrantyMonthsOnPurchase / 12) : 0,
      service_interval_miles: 0 // Not available in API
    },
    market_position: {
      segment: vehicle.bodyType,
      competitors: vehicle.make && vehicle.model ? generateCompetitors(vehicle.make, vehicle.model) : [],
      popularity_score: vehicleMetrics.retail?.rating?.value, // From vehicleMetrics API
      depreciation_rate: undefined, // Not available in API
      days_to_sell: vehicleMetrics.retail?.daysToSell?.value, // From vehicleMetrics API
      market_condition: vehicleMetrics.retail?.marketCondition?.value, // From vehicleMetrics API
      supply_demand_ratio: vehicleMetrics.retail?.supply?.value && vehicleMetrics.retail?.demand?.value ? 
        vehicleMetrics.retail.supply.value / vehicleMetrics.retail.demand.value : undefined
    }
  };
}

function calculateRange(fuelCapacity: number, mpg: number): number {
  return Math.round(fuelCapacity * mpg * 0.22); // Convert litres and mpg to miles
}

function calculateTaxBand(co2: number): string {
  if (co2 === 0) return 'A';
  if (co2 <= 50) return 'B';
  if (co2 <= 75) return 'C';
  if (co2 <= 90) return 'D';
  if (co2 <= 100) return 'E';
  if (co2 <= 110) return 'F';
  if (co2 <= 130) return 'G';
  if (co2 <= 150) return 'H';
  if (co2 <= 170) return 'I';
  if (co2 <= 190) return 'J';
  if (co2 <= 225) return 'K';
  if (co2 <= 255) return 'L';
  return 'M';
}

function calculateAnnualTax(co2: number): number {
  if (co2 === 0) return 0;
  if (co2 <= 50) return 10;
  if (co2 <= 75) return 25;
  if (co2 <= 90) return 120;
  if (co2 <= 100) return 145;
  if (co2 <= 110) return 165;
  if (co2 <= 130) return 185;
  if (co2 <= 150) return 210;
  if (co2 <= 170) return 255;
  if (co2 <= 190) return 305;
  if (co2 <= 225) return 355;
  if (co2 <= 255) return 630;
  return 645;
}

function generateCompetitors(make?: string, model?: string): string[] {
  const competitorMap: Record<string, string[]> = {
    'BMW 3 Series': ['Mercedes-Benz C-Class', 'Audi A4', 'Jaguar XE'],
    'Volkswagen Golf': ['Ford Focus', 'Vauxhall Astra', 'Mazda 3'],
    'Ford Fiesta': ['Volkswagen Polo', 'Vauxhall Corsa', 'Peugeot 208'],
    'Nissan Qashqai': ['Kia Sportage', 'Hyundai Tucson', 'Mazda CX-5'],
  };
  
  const key = `${make} ${model}`;
  return competitorMap[key] || ['Similar Vehicle 1', 'Similar Vehicle 2', 'Similar Vehicle 3'];
}

