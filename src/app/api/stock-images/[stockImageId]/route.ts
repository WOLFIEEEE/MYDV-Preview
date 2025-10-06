import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteFileFromStorage } from '@/lib/storage';
import { deleteStockImage, getStockImageById, createOrGetDealer, updateStockImage } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stockImageId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
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

    // Get dealer information
    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    
    // Get stock image details first
    const stockImage = await getStockImageById(stockImageId, dealer.id);
    if (!stockImage) {
      return NextResponse.json({
        success: false,
        message: 'Stock image not found or not authorized to delete'
      }, { status: 404 });
    }

    console.log(`🗑️ Deleting stock image: ${stockImage.name} (${stockImageId})`);

    // Delete from Supabase Storage
    const storageResult = await deleteFileFromStorage(stockImage.supabaseFileName);
    if (!storageResult.success) {
      console.warn(`⚠️ Failed to delete file from storage: ${storageResult.error}`);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const dbResult = await deleteStockImage(stockImageId, dealer.id);
    if (!dbResult.success) {
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
    const { userId } = await auth();
    if (!userId) {
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

    // Get dealer information
    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    
    // Verify stock image exists and belongs to dealer
    const stockImage = await getStockImageById(stockImageId, dealer.id);
    if (!stockImage) {
      return NextResponse.json({
        success: false,
        message: 'Stock image not found or not authorized to update'
      }, { status: 404 });
    }

    console.log(`🔄 Updating stock image type: ${stockImage.name} -> ${imageType}`);

    // Update the stock image
    const updateResult = await updateStockImage(stockImageId, dealer.id, { imageType });
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
