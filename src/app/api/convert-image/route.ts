import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// POST handler for converting external images to avoid CORS issues
export async function POST(request: NextRequest) {
  console.log('🔄 API Route: Convert image request received');

  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('❌ User not authenticated');
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication required',
          details: 'Please sign in to convert images',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
        }),
        { status: 401 }
      );
    }

    // Get the request body
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Image URL required',
          details: 'imageUrl is required in the request body',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    console.log('🔄 Converting image:', imageUrl.substring(0, 100) + '...');

    // Fetch the image from the external source
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageConverter/1.0)',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.error('❌ Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to fetch image',
          details: `External image server returned ${imageResponse.status}: ${imageResponse.statusText}`,
          httpStatus: imageResponse.status,
          timestamp: new Date().toISOString(),
        }),
        { status: imageResponse.status }
      );
    }

    // Get the image as a blob
    const imageBlob = await imageResponse.blob();
    
    // Validate that it's actually an image
    if (!imageBlob.type.startsWith('image/')) {
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Invalid image type',
          details: `Expected image, got ${imageBlob.type}`,
          httpStatus: 400,
          timestamp: new Date().toISOString(),
        }),
        { status: 400 }
      );
    }

    console.log('✅ Image converted successfully:', {
      originalUrl: imageUrl.substring(0, 100) + '...',
      size: `${(imageBlob.size / 1024).toFixed(2)} KB`,
      type: imageBlob.type
    });

    // Return the image blob directly
    return new NextResponse(imageBlob, {
      status: 200,
      headers: {
        'Content-Type': imageBlob.type,
        'Content-Length': imageBlob.size.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'X-Converted-From': imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
      },
    });

  } catch (error) {
    console.error('❌ API Route convert image error:', error);
    const internalError = createInternalErrorResponse(error, 'convert-image');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
