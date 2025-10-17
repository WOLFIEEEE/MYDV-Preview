import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registrationNumber } = body;

    if (!registrationNumber) {
      return NextResponse.json({
        success: false,
        error: 'Registration number is required'
      }, { status: 400 });
    }

    const dvlaApiKey = process.env.DVLA_API_KEY;
    if (!dvlaApiKey) {
      return NextResponse.json({
        success: false,
        error: 'DVLA_API_KEY not configured'
      }, { status: 500 });
    }

    console.log(`🧪 Testing DVLA API for registration: ${registrationNumber}`);
    console.log(`🔑 Using API key: ${dvlaApiKey.substring(0, 8)}...`);

    const startTime = Date.now();

    // Test the DVLA API call
    const response = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'x-api-key': dvlaApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Vehicle-Management-System/1.0'
      },
      body: JSON.stringify({
        registrationNumber: registrationNumber.replace(/\s/g, '').toUpperCase()
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️ Request took ${duration}ms`);
    console.log(`📊 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DVLA API error:`, response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `DVLA API error: ${response.status}`,
        details: errorText,
        duration: duration,
        status: response.status
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ DVLA API success:`, data);

    return NextResponse.json({
      success: true,
      data: data,
      duration: duration,
      status: response.status,
      message: 'DVLA API test successful'
    });

  } catch (error) {
    console.error('❌ DVLA API test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: 'DVLA API test failed'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'DVLA Test API',
    usage: {
      method: 'POST',
      endpoint: '/api/dvla/test',
      body: {
        registrationNumber: 'AB12CDE'
      }
    }
  });
}
