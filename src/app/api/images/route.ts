import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// POST handler for uploading images to AutoTrader
export async function POST(request: NextRequest) {
  console.log('📸 API Route: Upload image to AutoTrader request received');

  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('❌ User not authenticated');
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication required',
          details: 'Please sign in to upload images',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
        }),
        { status: 401 }
      );
    }

    // Get advertiserId from query parameters
    const { searchParams } = new URL(request.url);
    const advertiserId = searchParams.get('advertiserId');

    if (!advertiserId) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Advertiser ID required',
          details: 'advertiserId query parameter is required',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    console.log('📝 Uploading image for advertiser:', advertiserId);

    // Get user email for AutoTrader authentication
    const userEmail = user.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'User email not found',
          details: 'Unable to retrieve user email for API authentication',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // Get AutoTrader access token
    const tokenResult = await getAutoTraderToken(userEmail);
    if (!tokenResult.success || !tokenResult.access_token) {
      console.error('❌ AutoTrader authentication failed:', tokenResult.error);
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'AutoTrader authentication failed',
          details: 'Unable to authenticate with AutoTrader API. Please check your API credentials.',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
        }),
        { status: 401 }
      );
    }

    // Get the form data (image file)
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Image file required',
          details: 'Please provide an image file in the "image" field',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    console.log('📸 Image file details:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type
    });

    // Validate image file
    const validationResult = validateImageFile(imageFile);
    if (!validationResult.isValid) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid image file',
          details: validationResult.error,
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    // Prepare form data for AutoTrader API
    // Based on testing: AutoTrader expects 'file' field name, not 'image'
    const autoTraderFormData = new FormData();
    autoTraderFormData.append('file', imageFile);

    // Make POST request to AutoTrader images API
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const autoTraderUrl = `${baseUrl}/images?advertiserId=${advertiserId}`;

    console.log('📡 Making POST request to AutoTrader images API:', autoTraderUrl);
    console.log('🔑 Using access token:', tokenResult.access_token?.substring(0, 20) + '...');
    console.log('📝 Using field name: "file" (confirmed working pattern)');

    const requestHeaders = {
      'Authorization': `Bearer ${tokenResult.access_token}`,
      'Accept': 'application/json',
      // Don't set Content-Type for FormData, let the browser set it with boundary
    };

    const autoTraderResponse = await fetch(autoTraderUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: autoTraderFormData,
    });

    console.log('📨 AutoTrader response status:', autoTraderResponse.status);

    if (!autoTraderResponse.ok) {
      const errorText = await autoTraderResponse.text();
      console.error('❌ AutoTrader API error:', errorText);
      
      let errorMessage = 'Failed to upload image to AutoTrader';
      let errorDetails = `AutoTrader API returned ${autoTraderResponse.status}: ${autoTraderResponse.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
        if (errorJson.details || errorJson.error) {
          errorDetails = errorJson.details || errorJson.error;
        }
      } catch {
        // If error response is not JSON, use the text as details
        if (errorText) {
          errorDetails = errorText;
        }
      }

      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.SERVER_ERROR,
          message: errorMessage,
          details: errorDetails,
          httpStatus: autoTraderResponse.status,
          timestamp: new Date().toISOString(),
        }),
        { status: autoTraderResponse.status }
      );
    }

    const autoTraderResponseData = await autoTraderResponse.json();
    console.log('✅ Image uploaded successfully to AutoTrader');
    console.log('📸 Image response:', autoTraderResponseData);

    return NextResponse.json(
      createSuccessResponse(
        {
          imageId: autoTraderResponseData.imageId,
          message: 'Image uploaded successfully',
          originalFilename: imageFile.name,
          fileSize: imageFile.size,
          autoTraderResponse: autoTraderResponseData,
          timestamp: new Date().toISOString()
        },
        'images/upload'
      )
    );

  } catch (error) {
    console.error('❌ API Route upload image error:', error);
    const internalError = createInternalErrorResponse(error, 'images/upload');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// Validation function for image files
function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file size (e.g., max 10MB)
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeBytes) {
    return { 
      isValid: false, 
      error: `File size too large. Maximum allowed size is ${maxSizeBytes / (1024 * 1024)}MB` 
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }

  // Check filename
  if (!file.name || file.name.trim() === '') {
    return { 
      isValid: false, 
      error: 'File must have a valid filename' 
    };
  }

  return { isValid: true };
}
