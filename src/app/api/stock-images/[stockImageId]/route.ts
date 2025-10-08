import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { deleteFileFromStorage } from '@/lib/storage';
import { deleteStockImage, getStockImageById, createOrGetDealer, updateStockImage } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { stockImages, dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stockImageId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const resolvedParams = await params;
    const stockImageId = resolvedParams.stockImageId;
    if (!stockImageId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Stock image ID is required' 
      }, { status: 400 });
    }

    console.log(`🗑️ Starting delete process for stock image: ${stockImageId}`);
    console.log(`👤 User ID: ${user.id}`);
    console.log(`📧 User Email: ${user.emailAddresses[0]?.emailAddress}`);

    // Try enhanced dealer ID resolution first (supports team members)
    let dealerId: string;
    const dealerResult = await getDealerIdForUser(user);
    
    if (dealerResult.success && dealerResult.dealerId) {
      dealerId = dealerResult.dealerId;
      console.log(`✅ Enhanced dealer resolution successful: ${dealerId}`);
    } else {
      console.log(`⚠️ Enhanced dealer resolution failed, falling back to createOrGetDealer`);
      // Fallback to traditional dealer resolution
      const dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
      dealerId = dealer.id;
      console.log(`🏢 Fallback dealer resolution: ${dealerId}`);
    }
    
    // Get stock image details first
    const stockImage = await getStockImageById(stockImageId, dealerId);
    if (!stockImage) {
      console.error(`❌ Stock image not found: ${stockImageId} for dealer: ${dealerId}`);
      
      // Debug: Let's check if the stock image exists for any dealer
      console.log('🔍 Debugging: Checking if stock image exists at all...');
      try {
        const debugQuery = await db
          .select()
          .from(stockImages)
          .where(eq(stockImages.id, stockImageId))
          .limit(1);
        
        if (debugQuery.length > 0) {
          console.log(`🔍 Found stock image with different dealer ID: ${debugQuery[0].dealerId}`);
          console.log(`🔍 Current dealer ID: ${dealerId}`);
          console.log(`🔍 Stock image belongs to different dealer - authorization failed`);
          
          // Let's also check all dealers for this user
          console.log('🔍 Checking all possible dealer records for this user...');
          const allDealers = await db
            .select()
            .from(dealers)
            .where(eq(dealers.clerkUserId, user.id));
          console.log(`🔍 Found ${allDealers.length} dealer records for user:`, allDealers.map(d => d.id));
        } else {
          console.log(`🔍 Stock image ${stockImageId} does not exist in database at all`);
        }
      } catch (debugError) {
        console.error('❌ Debug query failed:', debugError);
      }
      
      return NextResponse.json({
        success: false,
        message: 'Stock image not found or not authorized to delete'
      }, { status: 404 });
    }

    console.log(`🗑️ Deleting stock image: ${stockImage.name} (${stockImageId})`);
    console.log(`📁 Storage file: ${stockImage.supabaseFileName}`);

    // Delete from Supabase Storage
    const storageResult = await deleteFileFromStorage(stockImage.supabaseFileName, 'templates');
    if (!storageResult.success) {
      console.warn(`⚠️ Failed to delete file from storage: ${storageResult.error}`);
      // Continue with database deletion even if storage fails
    } else {
      console.log(`✅ Successfully deleted file from storage: ${stockImage.supabaseFileName}`);
    }

    // Delete from database
    const dbResult = await deleteStockImage(stockImageId, dealerId);
    if (!dbResult.success) {
      console.error(`❌ Database deletion failed: ${dbResult.error}`);
      return NextResponse.json({
        success: false,
        message: dbResult.error || 'Failed to delete stock image from database'
      }, { status: 500 });
    }

    console.log(`✅ Successfully deleted stock image: ${stockImage.name}`);

    return NextResponse.json({
      success: true,
      message: 'Stock image deleted successfully',
      stockImageId: stockImageId
    });

  } catch (error) {
    console.error('❌ Stock image deletion error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete stock image',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stockImageId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const resolvedParams = await params;
    const stockImageId = resolvedParams.stockImageId;
    if (!stockImageId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Stock image ID is required' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { imageType } = body;

    if (!imageType || !['default', 'fallback'].includes(imageType)) {
      return NextResponse.json({
        success: false,
        message: 'Valid imageType is required (default or fallback)'
      }, { status: 400 });
    }

    // Try enhanced dealer ID resolution first (supports team members)
    let dealerId: string;
    const dealerResult = await getDealerIdForUser(user);
    
    if (dealerResult.success && dealerResult.dealerId) {
      dealerId = dealerResult.dealerId;
    } else {
      // Fallback to traditional dealer resolution
      const dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
      dealerId = dealer.id;
    }
    
    // Verify stock image exists and belongs to dealer
    const stockImage = await getStockImageById(stockImageId, dealerId);
    if (!stockImage) {
      return NextResponse.json({
        success: false,
        message: 'Stock image not found or not authorized to update'
      }, { status: 404 });
    }

    console.log(`🔄 Updating stock image type: ${stockImage.name} -> ${imageType}`);

    // Update the stock image
    const updateResult = await updateStockImage(stockImageId, dealerId, { imageType });
    if (!updateResult.success) {
      return NextResponse.json({
        success: false,
        message: updateResult.error || 'Failed to update stock image'
      }, { status: 500 });
    }

    console.log(`✅ Successfully updated stock image type: ${stockImage.name} -> ${imageType}`);

    return NextResponse.json({
      success: true,
      message: 'Stock image type updated successfully',
      stockImage: updateResult.stockImage
    });

  } catch (error) {
    console.error('❌ Stock image update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update stock image',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
