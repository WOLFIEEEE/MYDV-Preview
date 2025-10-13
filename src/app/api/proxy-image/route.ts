import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy external images and convert them to local blobs
 * This bypasses CORS restrictions and prevents canvas tainting
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Reject blob URLs and data URLs - these are client-side only
    if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      console.error('❌ Cannot proxy blob or data URL:', imageUrl.substring(0, 50) + '...');
      return NextResponse.json(
        { error: 'Cannot proxy blob or data URLs. These are client-side only.' },
        { status: 400 }
      );
    }

    // Validate that it's a proper HTTP/HTTPS URL
    try {
      const url = new URL(imageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      console.error('❌ Invalid URL:', imageUrl);
      return NextResponse.json(
        { error: 'Invalid URL format. Only HTTP/HTTPS URLs are supported.' },
        { status: 400 }
      );
    }

    console.log('🔄 Proxying image:', imageUrl);

    // Fetch the image from the external source
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
      },
      // Don't follow redirects indefinitely
      redirect: 'follow',
    });

    if (!imageResponse.ok) {
      console.error('❌ Failed to fetch image:', imageResponse.status);
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}` },
        { status: imageResponse.status }
      );
    }

    // Get the image as a buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    console.log('✅ Image proxied successfully:', {
      size: `${(imageBuffer.byteLength / 1024).toFixed(2)} KB`,
      contentType,
      url: imageUrl.substring(0, 100) + '...'
    });

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Image proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to proxy image' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

