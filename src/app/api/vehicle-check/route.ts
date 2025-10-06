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
import { getAdvertiserId, logAdvertiserIdResolution } from '@/lib/advertiserIdResolver';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Types for vehicle check response
interface VehicleCheckResponse {
  vehicle: {
    registration: string;
    make: string;
    model: string;
    derivative: string;
    colour: string;
    fuelType: string;
    transmissionType: string;
    firstRegistrationDate: string;
    owners: number;
    vin?: string;
    engineNumber?: string;
    bodyType: string;
    engineCapacityCC: number;
    co2EmissionGPKM: number;
    [key: string]: unknown;
  };
  check: {
    insuranceWriteoffCategory: string | null;
    scrapped: boolean;
    stolen: boolean;
    imported: boolean;
    exported: boolean;
    highRisk: boolean;
    privateFinance: boolean;
    tradeFinance: boolean;
    mileageDiscrepancy: boolean;
    registrationChanged: boolean;
    colourChanged: boolean;
    keeperChanges: Array<{
      date: string;
      [key: string]: unknown;
    }>;
    v5cs: Array<{
      issuedDate: string;
      [key: string]: unknown;
    }>;
    financeAgreements: Array<{
      agreementId?: string;
      company?: string;
      type?: string;
      startDate?: string;
      term?: string | number;
      contact?: string;
      telephoneNumber?: string;
      [key: string]: unknown;
    }>;
    plateChanges: Array<{
      date: string;
      currentRegistration: string;
      previousRegistration: string;
      [key: string]: unknown;
    }>;
    colourChanges: Array<{
      startDate?: string;
      date?: string;
      currentColour?: string;
      previousColour?: string | null;
      [key: string]: unknown;
    }>;
    odometerReadings: Array<{
      performed: string;
      source: string;
      odometerReadingMiles: number;
      [key: string]: unknown;
    }>;
    highRiskMarkers: Array<{
      startDate?: string;
      type?: string;
      extraInfo?: string;
      company?: string;
      telephoneNumber?: string;
      reference?: string;
      [key: string]: unknown;
    }>;
    previousSearches: Array<{
      performed: string;
      typeOfBusiness: string;
      [key: string]: unknown;
    }>;
    policeStolenMarker: {
      recordedDate: string | null;
      policeForce: string | null;
      telephoneNumber: string | null;
    };
    dvlaVehicle: {
      make: string;
      model: string | null;
      bodyType: string;
      fuelType: string;
      transmissionType: string | null;
      engineCapacityCC: number;
      colour: string;
      co2EmissionsGKM: number;
      dateScrapped: string | null;
      dateExported: string | null;
    };
    insuranceHistory?: Array<{
      type: string;
      lossDate: string;
      removedDate: string | null;
      [key: string]: unknown;
    }>;
    report?: string;
    previousOwners: number;
    [key: string]: unknown;
  };
}

// Processed check data for frontend
interface ProcessedVehicleCheck {
  vehicle: {
    title: string;
    registration: string;
    year: string;
    make: string;
    model: string;
    derivative: string;
    colour: string;
    fuelType: string;
    transmissionType: string;
    owners: number;
    vin?: string;
    engineNumber?: string;
    bodyType: string;
    engineCapacityCC: number;
    co2Emissions: number;
    firstRegistrationDate: string;
  };
  checkSummary: {
    overallStatus: 'clean' | 'issues' | 'warnings';
    statusMessage: string;
    checks: Array<{
      label: string;
      status: 'pass' | 'fail' | 'warning';
      passed: boolean;
    }>;
  };
  sections: {
    previousKeepers: {
      mostRecent: {
        numberOfPreviousKeepers: number;
        dateOfLastKeeperChange: string | null;
      };
      allChanges: Array<{
        date: string;
        [key: string]: unknown;
      }>;
    };
    finance: {
      privateFinance: boolean;
      tradeFinance: boolean;
      agreements: Array<{
        agreementId?: string;
        company?: string;
        type?: string;
        startDate?: string;
        term?: string | number;
        contact?: string;
        telephoneNumber?: string;
      }>;
    };
    highRiskMarkers: {
      hasMarkers: boolean;
      markers: Array<{
        startDate?: string;
        type?: string;
        extraInfo?: string;
        company?: string;
        telephoneNumber?: string;
        reference?: string;
      }>;
    };
    previousSearches: {
      mostRecent: {
        date: string;
        typeOfBusiness: string;
      } | null;
      allSearches: Array<{
        performed: string;
        typeOfBusiness: string;
      }>;
    };
    vehicleDetails: {
      make: string;
      model: string;
      registration: string;
      vin?: string;
      engineNumber?: string;
      bodyType: string;
      colour: string;
      firstRegistrationDate: string;
      yearOfManufacture: string;
      numberOfPreviousOwners: number;
      engineCapacity: string;
      fuelType: string;
      transmission: string;
      co2Emissions: string;
    };
    policeMarkers: {
      stolenMarker: boolean;
      details: {
        recordedDate: string | null;
        policeForce: string | null;
        telephoneNumber: string | null;
      };
    };
    v5cLogbook: {
      mostRecent: {
        dateOfMostRecentRecord: string;
      } | null;
      allRecords: Array<{
        issuedDate: string;
      }>;
    };
    plateChanges: {
      hasChanges: boolean;
      mostRecent: {
        date: string;
        currentRegistration: string;
        previousRegistration: string;
      } | null;
      allChanges: Array<{
        date: string;
        currentRegistration: string;
        previousRegistration: string;
      }>;
    };
    colourChanges: {
      hasChanges: boolean;
      changes: Array<{
        startDate?: string;
        date?: string;
        currentColour?: string;
        previousColour?: string | null;
      }>;
    };
    insuranceHistory: {
      hasHistory: boolean;
      claims: Array<{
        type: string;
        lossDate: string;
        removedDate: string | null;
      }>;
    };
    odometerReadings: {
      hasReadings: boolean;
      readings: Array<{
        performed: string;
        source: string;
        odometerReadingMiles: number;
      }>;
      mostRecent: {
        performed: string;
        source: string;
        odometerReadingMiles: number;
      } | null;
    };
    scrapExportData: {
      scrapped: boolean;
      exported: boolean;
      imported: boolean;
    };
  };
  lastUpdated: string;
}

function processVehicleCheckData(data: VehicleCheckResponse): ProcessedVehicleCheck {
  const { vehicle, check } = data;
  
  // Create vehicle title
  const title = `${vehicle.make} ${vehicle.model} ${vehicle.derivative || ''}`.trim();
  
  // Extract year from first registration date
  const year = vehicle.firstRegistrationDate ? new Date(vehicle.firstRegistrationDate).getFullYear().toString() : '';
  
  // Determine overall status
  const hasIssues = check.stolen || check.scrapped || check.insuranceWriteoffCategory || 
                   check.privateFinance || check.tradeFinance || check.mileageDiscrepancy || 
                   check.highRisk || check.plateChanges.length > 0 || 
                   (check.insuranceHistory && check.insuranceHistory.length > 0);
  
  const hasWarnings = check.imported || check.exported || check.colourChanged || 
                     check.highRiskMarkers.length > 0;
  
  const overallStatus: 'clean' | 'issues' | 'warnings' = 
    hasIssues ? 'issues' : hasWarnings ? 'warnings' : 'clean';
  const statusMessage = 
    hasIssues ? 'Issues found - see details below' : 
    hasWarnings ? 'Some concerns found - see details below' : 
    'No issues found';
  
  // Create check summary
  const checks = [
    { label: 'Not recorded as stolen', status: check.stolen ? 'fail' : 'pass', passed: !check.stolen },
    { label: 'Not recorded as scrapped', status: check.scrapped ? 'fail' : 'pass', passed: !check.scrapped },
    { label: 'Not recorded as a write-off', status: check.insuranceWriteoffCategory ? 'fail' : 'pass', passed: !check.insuranceWriteoffCategory },
    { label: 'No outstanding private finance', status: check.privateFinance ? 'fail' : 'pass', passed: !check.privateFinance },
    { label: 'No outstanding trade finance', status: check.tradeFinance ? 'fail' : 'pass', passed: !check.tradeFinance },
    { label: 'No mileage discrepancy', status: check.mileageDiscrepancy ? 'fail' : 'pass', passed: !check.mileageDiscrepancy },
    { label: 'Not imported', status: check.imported ? 'warning' : 'pass', passed: !check.imported },
    { label: 'Not exported', status: check.exported ? 'warning' : 'pass', passed: !check.exported },
    { label: 'No recorded colour changes', status: check.colourChanged ? 'warning' : 'pass', passed: !check.colourChanged },
    { label: 'Not high risk', status: check.highRisk ? 'fail' : 'pass', passed: !check.highRisk },
    { label: 'No recorded plate changes', status: check.plateChanges.length > 0 ? 'warning' : 'pass', passed: check.plateChanges.length === 0 },
    { label: 'No insurance claims history', status: (check.insuranceHistory && check.insuranceHistory.length > 0) ? 'warning' : 'pass', passed: !(check.insuranceHistory && check.insuranceHistory.length > 0) }
  ] as Array<{ label: string; status: 'pass' | 'fail' | 'warning'; passed: boolean }>;
  
  // Process previous keepers
  const mostRecentKeeperChange = check.keeperChanges.length > 0 ? check.keeperChanges[0] : null;
  
  // Process finance information (for potential future use)
  // const mostRecentFinanceAgreement = check.financeAgreements.length > 0 ? check.financeAgreements[0] : null;
  
  // Process previous searches
  const mostRecentSearch = check.previousSearches.length > 0 ? check.previousSearches[0] : null;
  
  // Process V5C records
  const mostRecentV5C = check.v5cs.length > 0 ? check.v5cs[0] : null;
  
  // Process plate changes
  const mostRecentPlateChange = check.plateChanges.length > 0 ? check.plateChanges[0] : null;
  
  return {
    vehicle: {
      title,
      registration: vehicle.registration,
      year,
      make: vehicle.make,
      model: vehicle.model,
      derivative: vehicle.derivative || '',
      colour: vehicle.colour,
      fuelType: vehicle.fuelType,
      transmissionType: vehicle.transmissionType,
      owners: vehicle.owners,
      vin: vehicle.vin,
      engineNumber: vehicle.engineNumber,
      bodyType: vehicle.bodyType,
      engineCapacityCC: vehicle.engineCapacityCC,
      co2Emissions: vehicle.co2EmissionGPKM,
      firstRegistrationDate: vehicle.firstRegistrationDate
    },
    checkSummary: {
      overallStatus,
      statusMessage,
      checks
    },
    sections: {
      previousKeepers: {
        mostRecent: {
          numberOfPreviousKeepers: check.previousOwners,
          dateOfLastKeeperChange: mostRecentKeeperChange?.date || null
        },
        allChanges: check.keeperChanges
      },
      finance: {
        privateFinance: check.privateFinance,
        tradeFinance: check.tradeFinance,
        agreements: check.financeAgreements.map(agreement => ({
                  agreementId: agreement.agreementId,
        company: agreement.company,
        type: agreement.type,
        startDate: agreement.startDate,
        term: typeof agreement.term === 'number' ? `${agreement.term} months` : agreement.term,
        contact: agreement.contact,
        telephoneNumber: agreement.telephoneNumber
        }))
      },
      highRiskMarkers: {
        hasMarkers: check.highRisk,
        markers: check.highRiskMarkers.map(marker => ({
          startDate: marker.startDate,
          type: marker.type,
          extraInfo: marker.extraInfo,
          company: marker.company,
          telephoneNumber: marker.telephoneNumber,
          reference: marker.reference
        }))
      },
      previousSearches: {
        mostRecent: mostRecentSearch ? {
          date: mostRecentSearch.performed,
          typeOfBusiness: mostRecentSearch.typeOfBusiness
        } : null,
        allSearches: check.previousSearches
      },
      vehicleDetails: {
        make: vehicle.make,
        model: vehicle.model,
        registration: vehicle.registration,
        vin: vehicle.vin,
        engineNumber: vehicle.engineNumber,
        bodyType: vehicle.bodyType,
        colour: vehicle.colour,
        firstRegistrationDate: vehicle.firstRegistrationDate,
        yearOfManufacture: year,
        numberOfPreviousOwners: vehicle.owners,
        engineCapacity: `${vehicle.engineCapacityCC} CC`,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmissionType,
        co2Emissions: `${vehicle.co2EmissionGPKM} g/km`
      },
      policeMarkers: {
        stolenMarker: check.stolen,
        details: check.policeStolenMarker
      },
      v5cLogbook: {
        mostRecent: mostRecentV5C ? {
          dateOfMostRecentRecord: mostRecentV5C.issuedDate
        } : null,
        allRecords: check.v5cs
      },
      plateChanges: {
        hasChanges: check.plateChanges.length > 0,
        mostRecent: mostRecentPlateChange ? {
          date: mostRecentPlateChange.date,
          currentRegistration: mostRecentPlateChange.currentRegistration,
          previousRegistration: mostRecentPlateChange.previousRegistration
        } : null,
        allChanges: check.plateChanges
      },
      colourChanges: {
        hasChanges: check.colourChanges.length > 0,
        changes: check.colourChanges.map(change => ({
          startDate: change.startDate,
          date: change.date,
          currentColour: change.currentColour,
          previousColour: change.previousColour
        }))
      },
      insuranceHistory: {
        hasHistory: check.insuranceHistory ? check.insuranceHistory.length > 0 : false,
        claims: check.insuranceHistory ? check.insuranceHistory.map(claim => ({
          type: claim.type,
          lossDate: claim.lossDate,
          removedDate: claim.removedDate
        })) : []
      },
      odometerReadings: {
        hasReadings: check.odometerReadings.length > 0,
        readings: check.odometerReadings,
        mostRecent: check.odometerReadings.length > 0 ? check.odometerReadings[0] : null
      },
      scrapExportData: {
        scrapped: check.scrapped,
        exported: check.exported,
        imported: check.imported
      }
    },
    lastUpdated: new Date().toISOString()
  };
}

export async function GET(request: NextRequest) {
  console.log('🔍 API Route: Vehicle check request received');

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
        endpoint: 'vehicle-check'
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
        endpoint: 'vehicle-check'
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
      console.log('👥 Using store owner email for vehicle check:', email);
    } else {
      email = userEmail;
      console.log('🏢 Using own email for vehicle check:', email);
    }

    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const registration = searchParams.get('registration');
    const advertiserId = searchParams.get('advertiserId');

    console.log('📋 Vehicle check parameters:', {
      email,
      registration,
      advertiserId
    });

    if (!registration) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Registration number is required',
        details: 'Please provide a vehicle registration number',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-check'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get authentication token
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      return NextResponse.json(authResult.error, { status: 401 });
    }

    let finalAdvertiserId = advertiserId;

    // If no advertiserId provided, get from store config
    if (!finalAdvertiserId) {
      console.log('🔍 Looking up store config for advertiser ID...');
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
        const configError = {
          type: ErrorType.AUTHENTICATION,
          message: 'Store configuration not found',
          details: `No store configuration found for email: ${email}`,
          httpStatus: 404,
          timestamp: new Date().toISOString(),
          endpoint: 'vehicle-check'
        };
        return NextResponse.json(
          createErrorResponse(configError),
          { status: 404 }
        );
      }

      const userStoreConfig = storeConfigResult[0];
      
      // Use standardized advertiser ID resolution
      finalAdvertiserId = getAdvertiserId(userStoreConfig);
      logAdvertiserIdResolution(userStoreConfig, 'vehicle-check/route');
    }
    
    if (!finalAdvertiserId) {
      const configError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Missing advertiser ID',
        details: 'No advertisement ID found in configuration or provided in request',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-check'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 401 }
      );
    }

    // Get base URL from environment variables
    const baseUrl = getAutoTraderBaseUrlForServer();
    console.log('🔍 Using base URL:', baseUrl);
    console.log('📢 Using advertiser ID:', finalAdvertiserId);

    // Build vehicle check request with fullVehicleCheck=true
    console.log('🔍 Making vehicle check request...');

    const vehicleParams = new URLSearchParams();
    vehicleParams.append('advertiserId', finalAdvertiserId);
    vehicleParams.append('registration', registration);
    vehicleParams.append('fullVehicleCheck', 'true');
    vehicleParams.append('competitors', 'true'); // ✅ FIXED: Added competitors parameter

    const vehicleUrl = `${baseUrl}/vehicles?${vehicleParams.toString()}`;
    console.log('📡 Making vehicle check request to:', vehicleUrl);

    const vehicleResponse = await fetch(vehicleUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📨 Vehicle check API response status:', vehicleResponse.status);

    if (!vehicleResponse.ok) {
      const error = await parseAutoTraderError(vehicleResponse, 'vehicle-check');
      console.error('❌ Vehicle check failed:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const vehicleData = await vehicleResponse.json() as VehicleCheckResponse;
    console.log('✅ Vehicle check successful');
    
    if (vehicleData.vehicle) {
      console.log('🚗 Vehicle found:', {
        registration: vehicleData.vehicle.registration,
        make: vehicleData.vehicle.make,
        model: vehicleData.vehicle.model,
      });
    }

    // Process the vehicle check data for frontend consumption
    const processedData = processVehicleCheckData(vehicleData);

    // Return success response with processed data
    return NextResponse.json(
      createSuccessResponse(processedData, 'vehicle-check')
    );

  } catch (error) {
    console.error('❌ API Route vehicle check error:', error);
    const internalError = createInternalErrorResponse(error, 'vehicle-check');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
