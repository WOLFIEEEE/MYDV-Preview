import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// DVLA API response interface
export interface DVLAVehicleResponse {
  registrationNumber: string;
  taxStatus: string;
  taxDueDate?: string;
  motStatus: string;
  make: string;
  yearOfManufacture: number;
  engineCapacity?: number;
  co2Emissions?: number;
  fuelType: string;
  markedForExport: boolean;
  colour: string;
  typeApproval?: string;
  revenueWeight?: number;
  dateOfLastV5CIssued?: string;
  motExpiryDate?: string;
  wheelplan?: string;
  monthOfFirstRegistration?: string;
}

// Request interface
interface DVLAVehicleRequest {
  registrationNumber: string;
}

// Error response interface
interface DVLAErrorResponse {
  errors: Array<{
    status: string;
    code: string;
    title: string;
    detail: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get DVLA API key from environment
    const dvlaApiKey = process.env.DVLA_API_KEY;
    if (!dvlaApiKey) {
      console.error('❌ DVLA_API_KEY not found in environment variables');
      return NextResponse.json({
        success: false,
        error: 'DVLA API key not configured'
      }, { status: 500 });
    }

    // Parse request body
    const body = await request.json() as DVLAVehicleRequest;
    const { registrationNumber } = body;

    if (!registrationNumber) {
      return NextResponse.json({
        success: false,
        error: 'Registration number is required'
      }, { status: 400 });
    }

    // Validate registration format (basic UK format check)
    const regPattern = /^[A-Z]{1,3}[0-9]{1,4}[A-Z]{0,3}$/i;
    if (!regPattern.test(registrationNumber.replace(/\s/g, ''))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid UK registration number format'
      }, { status: 400 });
    }

    console.log(`🚗 DVLA API request for registration: ${registrationNumber}`);

    // Make request to DVLA API
    const dvlaResponse = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'x-api-key': dvlaApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        registrationNumber: registrationNumber.replace(/\s/g, '').toUpperCase()
      })
    });

    // Handle DVLA API response
    if (!dvlaResponse.ok) {
      const errorData = await dvlaResponse.json() as DVLAErrorResponse;
      console.error('❌ DVLA API error:', dvlaResponse.status, errorData);
      
      // Handle specific DVLA error codes
      let errorMessage = 'Failed to fetch vehicle data from DVLA';
      if (dvlaResponse.status === 404) {
        errorMessage = 'N/A';
      } else if (dvlaResponse.status === 400) {
        errorMessage = 'Invalid registration number';
      } else if (dvlaResponse.status === 429) {
        errorMessage = 'DVLA API rate limit exceeded. Please try again later.';
      } else if (dvlaResponse.status === 403) {
        errorMessage = 'DVLA API access denied. Check API key configuration.';
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        dvlaError: errorData,
        statusCode: dvlaResponse.status
      }, { status: dvlaResponse.status });
    }

    const vehicleData = await dvlaResponse.json() as DVLAVehicleResponse;
    console.log(`✅ DVLA data retrieved for ${registrationNumber}:`, {
      make: vehicleData.make,
      motStatus: vehicleData.motStatus,
      motExpiryDate: vehicleData.motExpiryDate
    });

    return NextResponse.json({
      success: true,
      data: vehicleData,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DVLA API endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// GET endpoint for testing (optional)
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: 'DVLA Vehicle Enquiry API endpoint is active',
    usage: {
      method: 'POST',
      endpoint: '/api/dvla/vehicle-enquiry',
      body: {
        registrationNumber: 'AB12CDE'
      }
    }
  });
}
