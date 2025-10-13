import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Image Proxy API - Fetches images from external URLs and returns them as base64
 * This bypasses CORS issues when generating PDFs with external images
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing image URL parameter' },
        { status: 400 }
      );
    }

    // Validate URL is from allowed domains (AutoTrader)
    const allowedDomains = [
      'm-qa.atcdn.co.uk',
      'atcdn.co.uk',
      'm.atcdn.co.uk',
      'images.unsplash.com'
    ];

    const urlObj = new URL(imageUrl);
    const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Image domain not allowed' },
        { status: 403 }
      );
    }

    // Fetch the image
    console.log('📸 Fetching image from:', imageUrl);
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDFGenerator/1.0)',
      },
    });

    if (!imageResponse.ok) {
      console.error('❌ Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageResponse.statusText}` },
        { status: imageResponse.status }
      );
    }

    // Convert to base64
    const buffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log('✅ Image converted to base64:', {
      url: imageUrl,
      size: `${(buffer.byteLength / 1024).toFixed(2)} KB`,
      contentType
    });

    // Return as JSON with base64 data
    return NextResponse.json({
      success: true,
      dataUrl,
      contentType,
      size: buffer.byteLength
    });

  } catch (error) {
    console.error('❌ Error in image proxy:', error);
    return NextResponse.json(
      { 
        error: 'Failed to proxy image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
