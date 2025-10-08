import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStockImagesByDealer, createOrGetDealer } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';

// Force dynamic rendering - prevent static optimization
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Stock images API endpoint
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized',
        stockImages: [] 
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const vehicleType = searchParams.get('vehicleType');
    const imageType = searchParams.get('imageType');
    const defaultOnly = searchParams.get('defaultOnly') === 'true';

    // Get dealer information using enhanced resolution
    let dealerId: string;
    const dealerResult = await getDealerIdForUser(user);
    
    if (dealerResult.success && dealerResult.dealerId) {
      dealerId = dealerResult.dealerId;
      console.log(`✅ Enhanced dealer resolution for GET: ${dealerId}`);
    } else {
      console.log(`⚠️ Enhanced dealer resolution failed, falling back to createOrGetDealer`);
      // Fallback to traditional dealer resolution
      const dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
      dealerId = dealer.id;
      console.log(`🏢 Fallback dealer resolution for GET: ${dealerId}`);
    }
    
    // Get stock images from database
    const stockImages = await getStockImagesByDealer(dealerId);

    // Apply filters if specified
    let filteredStockImages = stockImages;
    
    if (vehicleType) {
      filteredStockImages = filteredStockImages.filter(img => img.vehicleType === vehicleType);
    }
    
    if (imageType) {
      filteredStockImages = filteredStockImages.filter(img => img.imageType === imageType);
    }
    
    if (defaultOnly) {
      filteredStockImages = filteredStockImages.filter(img => img.isDefault === true);
    }

    // Transform database records to match expected frontend format
    const formattedStockImages = filteredStockImages.map(stockImage => ({
      id: stockImage.id,
      name: stockImage.name,
      fileName: stockImage.fileName,
      url: stockImage.publicUrl,
      type: stockImage.mimeType.split('/')[1] || 'unknown',
      category: 'stock', // Always stock for this endpoint
      description: stockImage.description || '',
      tags: Array.isArray(stockImage.tags) ? stockImage.tags : [],
      uploadedAt: stockImage.createdAt.toISOString(),
      size: stockImage.fileSize,
      vehicleType: stockImage.vehicleType,
      imageType: stockImage.imageType,
      isDefault: stockImage.isDefault,
      sortOrder: stockImage.sortOrder
    }));

    const filterDescription = [
      vehicleType && `vehicle type: ${vehicleType}`,
      imageType && `image type: ${imageType}`,
      defaultOnly && 'default images only'
    ].filter(Boolean).join(', ');

    console.log(`📸 Found ${formattedStockImages.length} stock images for dealer: ${dealerId}${filterDescription ? ` (${filterDescription})` : ''}`);

    const response = NextResponse.json({
      success: true,
      message: `Found ${formattedStockImages.length} stock images`,
      stockImages: formattedStockImages,
      totalCount: formattedStockImages.length,
      filters: {
        vehicleType,
        imageType,
        defaultOnly
      }
    });

    // CRITICAL: No caching for stock images to ensure immediate updates after add/delete operations
    // Stock images are user-specific and must be fresh to reflect real-time changes
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('❌ Error fetching stock images:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch stock images',
        error: error instanceof Error ? error.message : 'Unknown error',
        stockImages: [] 
      },
      { status: 500 }
    );
  }
}
