import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  parseAutoTraderError, 
  createErrorResponse, 
  createInternalErrorResponse, 
  ErrorType
} from '@/lib/errorHandler';
import { getCentralizedAutoTraderToken } from '@/lib/autoTraderAuth';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/vehicle-check/pdf
 * Downloads a vehicle check PDF report from AutoTrader
 * 
 * Query Parameters:
 * - registration (required): Vehicle registration number
 * - reportId (optional): Specific report ID if available
 * 
 * Expected AutoTrader API Response Structure:
 * {
 *   "vehicle": { ... vehicle data ... },
 *   "check": {
 *     "report": "https://api.autotrader.co.uk/vehicles/vehicle-check-report/[reportId]",
 *     ... other check data ...
 *   }
 * }
 * 
 * Returns: PDF file as downloadable attachment
 */
export async function GET(request: NextRequest) {
  console.log('📄 API Route: Vehicle check PDF download request received');
  
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to download vehicle check reports',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-check/pdf'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    console.log('👤 User authentication details:', {
      userId: user.id,
      userEmail: userEmail,
      hasEmail: !!userEmail
    });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration');
    const reportId = searchParams.get('reportId');

    if (!registration) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Missing registration parameter',
        details: 'Vehicle registration is required to download PDF report',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-check/pdf'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    console.log('📋 PDF download request:', {
      registration: registration.toUpperCase(),
      reportId,
      userEmail,
      timestamp: new Date().toISOString()
    });

    // Get authentication token using environment variables
    console.log('🔑 Using AutoTrader API keys from environment variables');
    console.log('🔍 Environment check:', {
      hasAutoTraderKey: !!process.env.AUTOTRADER_API_KEY,
      hasAutoTraderSecret: !!process.env.AUTOTRADER_SECRET,
      hasBaseUrl: !!process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL,
      hasAdvertiserId: !!(process.env.ADVERTISER_ID || process.env.NEXT_PUBLIC_ADVERTISER_ID)
    });
    
    const authResult = await getCentralizedAutoTraderToken();
    if (!authResult.success) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Failed to authenticate with AutoTrader API',
        details: String(authResult.error) || 'Unable to obtain access token from environment credentials',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-check/pdf'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Get advertiser ID from store configuration using Clerk ID
    let finalAdvertiserId = process.env.ADVERTISER_ID || process.env.NEXT_PUBLIC_ADVERTISER_ID || '10028737';
    
    try {
      console.log('📋 Attempting to get advertiser ID from database for Clerk user:', user.id);
      
      // Query database using Clerk ID instead of email
      const storeConfigResult = await db
        .select({
          advertisementId: storeConfig.advertisementId,
          primaryAdvertisementId: storeConfig.primaryAdvertisementId,
          storeName: storeConfig.storeName
        })
        .from(storeConfig)
        .where(eq(storeConfig.clerkUserId, user.id))
        .limit(1);

      if (storeConfigResult.length > 0) {
        const userStoreConfig = storeConfigResult[0];
        let dbAdvertiserId = userStoreConfig.primaryAdvertisementId;
        
        // Try to parse new advertisementId field if primary is not available
        if (!dbAdvertiserId && userStoreConfig.advertisementId) {
          try {
            const parsedIds = JSON.parse(userStoreConfig.advertisementId);
            if (Array.isArray(parsedIds) && parsedIds.length > 0) {
              dbAdvertiserId = parsedIds[0];
            }
          } catch {
            console.log('Failed to parse advertisementId JSON, using fallback');
          }
        }
        
        if (dbAdvertiserId) {
          finalAdvertiserId = dbAdvertiserId;
          console.log('✅ Using advertiser ID from database:', finalAdvertiserId);
        } else {
          console.log('⚠️ No advertiser ID found in database config, using environment fallback:', finalAdvertiserId);
        }
      } else {
        console.log('⚠️ No store config found for Clerk user, using environment fallback:', finalAdvertiserId);
      }
    } catch (error) {
      console.log('⚠️ Failed to get advertiser ID from database, using environment fallback:', error);
      // Continue with environment fallback
    }

    // Get base URL from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    console.log('🔍 Using base URL:', baseUrl);
    console.log('📢 Using advertiser ID:', finalAdvertiserId);

    // First, get the vehicle check data to find the PDF report URL
    console.log('🔄 Getting vehicle check data to find PDF report URL...');
    
    const vehicleParams = new URLSearchParams();
    vehicleParams.append('advertiserId', finalAdvertiserId);
    vehicleParams.append('registration', registration.toUpperCase());
    vehicleParams.append('fullVehicleCheck', 'true');

    const vehicleUrl = `${baseUrl}/vehicles?${vehicleParams.toString()}`;
    console.log('📡 Making vehicle check request to get PDF URL:', vehicleUrl);

    const vehicleResponse = await fetch(vehicleUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!vehicleResponse.ok) {
      const error = await parseAutoTraderError(vehicleResponse, 'vehicle-check/pdf');
      console.error('❌ Vehicle check failed:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const vehicleData = await vehicleResponse.json();
    console.log('🔍 Checking vehicle data for PDF URL...');
    console.log('📋 Vehicle data structure:', {
      hasVehicle: !!vehicleData?.vehicle,
      hasCheck: !!vehicleData?.check,
      checkKeys: vehicleData?.check ? Object.keys(vehicleData.check) : [],
      reportUrl: vehicleData?.check?.report
    });
    
    // Look for PDF URL in the response - based on your example, it's in vehicleData.check.report
    const pdfUrl = vehicleData?.check?.report || 
                  vehicleData?.vehicle?.vehicleCheck?.reportUrl || 
                  vehicleData?.vehicleCheck?.reportUrl ||
                  vehicleData?.reportUrl;

    if (!pdfUrl) {
      console.log('❌ No PDF report URL found in vehicle data');
      console.log('📋 Available data structure:', Object.keys(vehicleData || {}));
      if (vehicleData?.check) {
        console.log('📋 Check data keys:', Object.keys(vehicleData.check));
      }
      
      const pdfError = {
        type: ErrorType.NOT_FOUND,
        message: 'PDF report URL not found',
        details: 'No PDF report URL found in the vehicle check response. The report may not be available for this vehicle.',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-check/pdf'
      };
      return NextResponse.json(
        createErrorResponse(pdfError),
        { status: 404 }
      );
    }

    console.log('📄 Found PDF URL in vehicle data:', pdfUrl);
    
    // Fetch the PDF from the provided URL
    console.log('📡 Downloading PDF from AutoTrader URL:', pdfUrl);
    const pdfResponse = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token}`,
        'Accept': 'application/pdf',
      },
    });

    console.log('📨 PDF download response status:', pdfResponse.status);

    if (!pdfResponse.ok) {
      const pdfError = {
        type: ErrorType.NOT_FOUND,
        message: 'Failed to download PDF report',
        details: `AutoTrader PDF download failed with status ${pdfResponse.status}`,
        httpStatus: pdfResponse.status,
        timestamp: new Date().toISOString(),
        endpoint: 'vehicle-check/pdf'
      };
      return NextResponse.json(
        createErrorResponse(pdfError),
        { status: pdfResponse.status }
      );
    }

    // Get the PDF content
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfSize = pdfBuffer.byteLength;

    console.log('✅ PDF downloaded successfully:', {
      registration: registration.toUpperCase(),
      pdfUrl: pdfUrl,
      sizeKB: Math.round(pdfSize / 1024),
      timestamp: new Date().toISOString()
    });

    // Generate filename
    const cleanRegistration = registration.replace(/[^A-Z0-9]/gi, '');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `vehicle-check-${cleanRegistration}-${timestamp}.pdf`;

    // Return the PDF as a downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfSize.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ API Route vehicle check PDF error:', error);
    const internalError = createInternalErrorResponse(error, 'vehicle-check/pdf');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
