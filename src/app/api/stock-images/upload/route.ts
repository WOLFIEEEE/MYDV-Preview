import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileToStorage, generateStorageFileName } from '@/lib/storage';
import { createStockImage, createOrGetDealer, getDealerKeys } from '@/lib/database';
import { db } from '@/lib/db';
import { stockCache, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';

// Helper function to upload image to AutoTrader and get image ID
async function uploadImageToAutoTrader(
  imageUrl: string, 
  imageName: string, 
  advertiserId: string, 
  token: string
): Promise<{ success: boolean; imageId?: string; error?: string }> {
  try {
    console.log(`📸 Uploading image to AutoTrader: ${imageName}`);
    
    // Fetch the image from Supabase
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return {
        success: false,
        error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`
      };
    }
    
    const imageBlob = await imageResponse.blob();
    console.log(`📋 Image details: ${imageName}, ${imageBlob.type}, ${(imageBlob.size / 1024).toFixed(2)} KB`);
    
    // Create FormData for AutoTrader upload
    const formData = new FormData();
    formData.append('file', imageBlob, imageName);
    
    // Upload to AutoTrader
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const uploadUrl = `${baseUrl}/images?advertiserId=${advertiserId}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData
    });
    
    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log(`✅ AutoTrader upload success: ${result.imageId}`);
      return {
        success: true,
        imageId: result.imageId
      };
    } else {
      const errorText = await uploadResponse.text();
      console.error(`❌ AutoTrader upload failed: ${uploadResponse.status} ${errorText}`);
      return {
        success: false,
        error: `AutoTrader upload failed: ${uploadResponse.status} ${errorText}`
      };
    }
  } catch (error) {
    console.error('❌ Error uploading to AutoTrader:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to get dealer info from stockId for QR code uploads
async function getDealerFromStockId(stockId: string): Promise<{ success: boolean; dealer?: any; error?: string }> {
  try {
    console.log('🔍 Getting dealer info from stockId:', stockId);
    
    // Find the stock record and its associated dealer
    const stockRecord = await db
      .select({
        dealerId: stockCache.dealerId,
        dealer: dealers
      })
      .from(stockCache)
      .innerJoin(dealers, eq(stockCache.dealerId, dealers.id))
      .where(and(
        eq(stockCache.stockId, stockId),
        eq(stockCache.isStale, false) // Only active stock
      ))
      .limit(1);
    
    if (stockRecord.length === 0) {
      return {
        success: false,
        error: 'Stock not found or no longer active'
      };
    }
    
    console.log('✅ Found dealer for stock:', stockRecord[0].dealer.id);
    return {
      success: true,
      dealer: stockRecord[0].dealer
    };
  } catch (error) {
    console.error('❌ Error getting dealer from stockId:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get form data first to check for QR code upload
    const formData = await request.formData();
    const uploadSource = formData.get('uploadSource') as string;
    const stockId = formData.get('stockId') as string;
    
    let dealer;
    let isQRUpload = false;
    
    // Check if this is a QR code upload (unauthenticated)
    if (uploadSource === 'qr_code' && stockId) {
      console.log('📱 QR Code upload detected for stockId:', stockId);
      isQRUpload = true;
      
      // Get dealer info from stockId
      const dealerResult = await getDealerFromStockId(stockId);
      if (!dealerResult.success) {
        return NextResponse.json({ 
          success: false, 
          message: dealerResult.error || 'Could not find associated dealer for this stock' 
        }, { status: 400 });
      }
      dealer = dealerResult.dealer;
    } else {
      // Regular authenticated upload
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ 
          success: false, 
          message: 'Unauthorized' 
        }, { status: 401 });
      }
      
      // Get dealer information for authenticated user
      dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    }

    // Get form data parameters
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const vehicleType = formData.get('vehicleType') as string || null;
    const imageType = formData.get('imageType') as string || null;
    const isDefault = formData.get('isDefault') === 'true';
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;

    // For QR uploads, use stockId as name if no name provided
    const imageName = name || (isQRUpload && stockId ? `QR Upload - ${stockId}` : null);
    
    if (!imageName) {
      return NextResponse.json({ 
        success: false, 
        message: 'Name is required' 
      }, { status: 400 });
    }
    
    // Extract files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'At least one file is required' 
      }, { status: 400 });
    }

    const uploadedStockImages = [];
    const errors = [];
    const autoTraderImageIds = [];

    // Get AutoTrader credentials if this is for QR upload (to add images to stock)
    let autoTraderToken = null;
    let advertiserId = null;
    
    if (isQRUpload && stockId) {
      try {
        // Get dealer keys for AutoTrader integration
        const dealerKeysResult = await getDealerKeys(dealer.id);
        if (dealerKeysResult.success && dealerKeysResult.data) {
          advertiserId = dealerKeysResult.data.advertisementId;
          
          if (advertiserId) {
            // Get AutoTrader token
            const tokenResult = await getAutoTraderToken(dealer.email);
            if (tokenResult.success && tokenResult.access_token) {
              autoTraderToken = tokenResult.access_token;
              console.log('🔑 AutoTrader credentials obtained for QR upload');
            } else {
              console.warn('⚠️ Could not get AutoTrader token, images will only be stored locally');
            }
          } else {
            console.warn('⚠️ No advertiser ID found, images will only be stored locally');
          }
        }
      } catch (error) {
        console.warn('⚠️ AutoTrader integration failed, continuing with local storage only:', error);
      }
    }

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Validate file
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name}: Only image files are allowed`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          errors.push(`${file.name}: File too large (max 10MB)`);
          continue;
        }

        // Generate storage filename
        const storageFileName = generateStorageFileName(file.name, 'stock', dealer.id);
        
        // Upload to Supabase Storage
        const uploadResult = await uploadFileToStorage(file, storageFileName);
        
        if (!uploadResult.success || !uploadResult.publicUrl) {
          errors.push(`${file.name}: Upload failed - ${uploadResult.error}`);
          continue;
        }

        // Save to database
        const stockImageName = files.length > 1 ? `${imageName} (${i + 1})` : imageName;
        
        // Create tags based on upload source
        const baseTags = [imageName.toLowerCase(), 'stock'];
        if (isQRUpload) {
          baseTags.push('qr_upload', stockId);
        }
        
        const stockImageResult = await createStockImage({
          dealerId: dealer.id,
          name: stockImageName,
          description: description || (isQRUpload ? `Uploaded via QR code for stock ${stockId}` : ''),
          fileName: file.name,
          supabaseFileName: storageFileName,
          publicUrl: uploadResult.publicUrl,
          fileSize: file.size,
          mimeType: file.type,
          tags: baseTags,
          vehicleType: vehicleType,
          imageType: imageType,
          isDefault: isDefault,
          sortOrder: sortOrder + i
        });

        if (stockImageResult.success && stockImageResult.stockImage) {
          uploadedStockImages.push(stockImageResult.stockImage);
          
          // Upload to AutoTrader if this is a QR upload and we have credentials
          if (isQRUpload && autoTraderToken && advertiserId) {
            const autoTraderResult = await uploadImageToAutoTrader(
              uploadResult.publicUrl,
              stockImageName,
              advertiserId,
              autoTraderToken
            );
            
            if (autoTraderResult.success && autoTraderResult.imageId) {
              autoTraderImageIds.push(autoTraderResult.imageId);
              console.log(`✅ Image uploaded to AutoTrader: ${autoTraderResult.imageId}`);
            } else {
              console.warn(`⚠️ AutoTrader upload failed for ${file.name}: ${autoTraderResult.error}`);
              // Don't treat this as a critical error - image is still saved locally
            }
          }
        } else {
          errors.push(`${file.name}: Database save failed - ${stockImageResult.error}`);
        }

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        errors.push(`${file.name}: Processing failed`);
      }
    }

    // Return results
    if (uploadedStockImages.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No stock images were uploaded successfully',
        errors: errors
      }, { status: 400 });
    }

    const uploadTypeText = isQRUpload ? 'QR code' : 'authenticated';
    console.log(`✅ Successfully uploaded ${uploadedStockImages.length}/${files.length} stock images via ${uploadTypeText} upload`);

    // If we have AutoTrader image IDs and this is a QR upload, update the stock with the new images
    if (isQRUpload && autoTraderImageIds.length > 0 && stockId && advertiserId && autoTraderToken) {
      try {
        console.log(`🔄 Updating stock ${stockId} with ${autoTraderImageIds.length} new image IDs`);
        
        // Get current stock data to append new image IDs
        const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
        const stockUrl = `${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`;
        
        const stockResponse = await fetch(stockUrl, {
          headers: {
            'Authorization': `Bearer ${autoTraderToken}`,
            'Accept': 'application/json',
          }
        });
        
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          const currentImageIds = stockData.imageIds || [];
          const updatedImageIds = [...currentImageIds, ...autoTraderImageIds];
          
          // PATCH the stock with updated image IDs
          const patchResponse = await fetch(stockUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${autoTraderToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              imageIds: updatedImageIds
            })
          });
          
          if (patchResponse.ok) {
            console.log(`✅ Stock ${stockId} updated with new image IDs`);
          } else {
            const patchError = await patchResponse.text();
            console.warn(`⚠️ Failed to update stock with image IDs: ${patchResponse.status} ${patchError}`);
          }
        } else {
          console.warn(`⚠️ Could not fetch current stock data: ${stockResponse.status}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to update stock with image IDs:', error);
        // Don't fail the entire request for this
      }
    }

    return NextResponse.json({
      success: true,
      message: isQRUpload 
        ? `Successfully uploaded ${uploadedStockImages.length} image(s) via QR code for stock ${stockId}${autoTraderImageIds.length > 0 ? ` and added to AutoTrader` : ''}`
        : `Successfully uploaded ${uploadedStockImages.length} stock image(s)`,
      stockImages: uploadedStockImages,
      count: uploadedStockImages.length,
      errors: errors.length > 0 ? errors : undefined,
      uploadSource: isQRUpload ? 'qr_code' : 'authenticated',
      autoTraderImageIds: autoTraderImageIds.length > 0 ? autoTraderImageIds : undefined
    });

  } catch (error) {
    console.error('❌ Stock image upload error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to upload stock images',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
