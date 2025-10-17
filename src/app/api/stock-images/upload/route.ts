import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { uploadFileToStorage, generateStorageFileName, generateQRStorageFileName, QR_STOCK_IMAGES_BUCKET } from '@/lib/storage';
import { createStockImage, createOrGetDealer, getDealerKeys } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { stockCache, dealers, stockImages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';

// Helper function to upload image directly to AutoTrader from File object
async function uploadImageDirectlyToAutoTrader(
  file: File, 
  imageName: string, 
  advertiserId: string, 
  token: string
): Promise<{ success: boolean; imageId?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file, imageName);
    
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const uploadUrl = `${baseUrl}/images?advertiserId=${advertiserId}`;
    
    console.log(`📤 POST ${uploadUrl}`);
    console.log(`📦 Payload: FormData with file: ${imageName} (${(file.size / 1024).toFixed(2)}KB)`);
    
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
      console.log(`✅ ${uploadResponse.status} Response: ${JSON.stringify(result)}`);
      return {
        success: true,
        imageId: result.imageId
      };
    } else {
      const errorText = await uploadResponse.text();
      console.error(`❌ ${uploadResponse.status} Error: ${errorText}`);
      return {
        success: false,
        error: `AutoTrader upload failed: ${uploadResponse.status} ${errorText}`
      };
    }
  } catch (error) {
    console.error('❌ AutoTrader upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Parallel upload function - uploads to both Supabase and AutoTrader simultaneously
async function uploadImageInParallel(
  file: File,
  imageName: string,
  dealer: typeof dealers.$inferSelect,
  stockId: string,
  registration: string | undefined,
  description: string,
  vehicleType: string | null,
  imageType: string | null,
  isDefault: boolean,
  sortOrder: number,
  advertiserId: string | null,
  autoTraderToken: string | null,
  isQRUpload: boolean
): Promise<{
  success: boolean;
  stockImage?: typeof stockImages.$inferSelect;
  autoTraderImageId?: string;
  error?: string;
}> {
  try {
    // Generate storage filename based on upload type
    let storageFileName: string;
    let bucketName: string;
    
    if (isQRUpload && stockId) {
      storageFileName = generateQRStorageFileName(file.name, dealer.id, stockId, registration);
      bucketName = QR_STOCK_IMAGES_BUCKET;
    } else {
      storageFileName = generateStorageFileName(file.name, 'stock', dealer.id);
      bucketName = 'templates';
    }

    // Create promises for parallel execution
    const supabaseUploadPromise = uploadFileToStorage(file, storageFileName, bucketName);
    
    let autoTraderUploadPromise: Promise<{ success: boolean; imageId?: string; error?: string }> | null = null;
    
    // Only upload to AutoTrader if we have credentials
    if (isQRUpload && autoTraderToken && advertiserId) {
      autoTraderUploadPromise = uploadImageDirectlyToAutoTrader(
        file,
        imageName,
        advertiserId,
        autoTraderToken
      );
    }

    // Execute uploads in parallel
    const results = await Promise.allSettled([
      supabaseUploadPromise,
      autoTraderUploadPromise
    ]);

    // Process Supabase result
    const supabaseResult = results[0];
    if (supabaseResult.status === 'rejected') {
      return {
        success: false,
        error: `Supabase upload failed: ${supabaseResult.reason}`
      };
    }

    const supabaseUploadResult = supabaseResult.value;
    if (!supabaseUploadResult.success || !supabaseUploadResult.publicUrl) {
      return {
        success: false,
        error: `Supabase upload failed: ${supabaseUploadResult.error}`
      };
    }

    // Process AutoTrader result
    let autoTraderImageId: string | undefined;
    if (autoTraderUploadPromise && results[1]) {
      const autoTraderResult = results[1];
      if (autoTraderResult.status === 'fulfilled' && autoTraderResult.value) {
        const autoTraderUploadResult = autoTraderResult.value;
        if (autoTraderUploadResult.success && autoTraderUploadResult.imageId) {
          autoTraderImageId = autoTraderUploadResult.imageId;
        }
      }
    }

    // Save to database
    const baseTags = [imageName.toLowerCase(), 'stock'];
    if (isQRUpload) {
      baseTags.push('qr_upload', stockId);
      if (registration && registration !== 'UNKNOWN_REG') {
        baseTags.push(`reg_${registration.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
        baseTags.push('has_registration');
      } else {
        baseTags.push('no_registration');
      }
      baseTags.push('qr_bucket');
    } else {
      baseTags.push('template_bucket');
    }
    
    const stockImageResult = await createStockImage({
      dealerId: dealer.id,
      name: imageName,
      description: description || (isQRUpload ? `Uploaded via QR code for stock ${stockId}${registration ? ` (Registration: ${registration})` : ''}` : ''),
      fileName: file.name,
      supabaseFileName: storageFileName,
      publicUrl: supabaseUploadResult.publicUrl,
      fileSize: file.size,
      mimeType: file.type,
      tags: baseTags,
      vehicleType: vehicleType,
      imageType: imageType,
      isDefault: isDefault,
      sortOrder: sortOrder
    });

    if (!stockImageResult.success || !stockImageResult.stockImage) {
      return {
        success: false,
        error: `Database save failed: ${stockImageResult.error}`
      };
    }

    return {
      success: true,
      stockImage: stockImageResult.stockImage,
      autoTraderImageId: autoTraderImageId
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to get dealer info, registration, and existing images from stockId for QR code uploads
async function getDealerAndStockInfoFromStockId(stockId: string): Promise<{ 
  success: boolean; 
  dealer?: typeof dealers.$inferSelect; 
  registration?: string;
  existingImageIds?: string[];
  error?: string 
}> {
  try {
    console.log(`🔍 Checking stock cache for: ${stockId}`);
    
    // Find the stock record and its associated dealer
    const stockRecord = await db
      .select({
        dealerId: stockCache.dealerId,
        dealer: dealers,
        vehicleData: stockCache.vehicleData,
        registration: stockCache.registration,
        mediaData: stockCache.mediaData
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
    
    const stock = stockRecord[0];
    const vehicleData = (stock.vehicleData as Record<string, unknown>) || {};
    const mediaData = (stock.mediaData as Record<string, unknown>) || {};
    
    // Get registration from multiple possible sources
    const registration = stock.registration || 
                        (vehicleData.registration as string) || 
                        (vehicleData.plate as string) || 
                        'UNKNOWN_REG';

    // Extract existing image IDs from mediaData
    const existingImageIds: string[] = [];
    if (mediaData.images && Array.isArray(mediaData.images)) {
      mediaData.images.forEach((image: Record<string, unknown>) => {
        if (image.imageId && typeof image.imageId === 'string') {
          existingImageIds.push(image.imageId);
        }
      });
    }
    
    console.log(`📊 Stock ${stockId}: ${existingImageIds.length} existing images [${existingImageIds.join(', ')}]`);
    
    return {
      success: true,
      dealer: stock.dealer,
      registration: registration,
      existingImageIds: existingImageIds
    };
  } catch (error) {
    console.error('❌ Error getting stock info:', error);
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
    let registration: string | undefined;
    let existingImageIds: string[] = [];
    
    // Check if this is a QR code upload (unauthenticated)
    if (uploadSource === 'qr_code' && stockId) {
      console.log(`📱 QR upload for stock: ${stockId}`);
      isQRUpload = true;
      
      // Get dealer info, registration, and existing images from stockId
      const stockInfoResult = await getDealerAndStockInfoFromStockId(stockId);
      if (!stockInfoResult.success) {
        return NextResponse.json({ 
          success: false, 
          message: stockInfoResult.error || 'Could not find associated dealer for this stock' 
        }, { status: 400 });
      }
      dealer = stockInfoResult.dealer;
      registration = stockInfoResult.registration;
      existingImageIds = stockInfoResult.existingImageIds || [];
    } else {
      // Regular authenticated upload
      const user = await currentUser();
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          message: 'Unauthorized' 
        }, { status: 401 });
      }
      
      // Get or create dealer record using enhanced resolution
      const dealerResult = await getDealerIdForUser(user);
      
      if (dealerResult.success && dealerResult.dealerId) {
        console.log(`✅ Enhanced dealer resolution for upload: ${dealerResult.dealerId}`);
        
        // Get the full dealer record
        const fullDealerResult = await db
          .select()
          .from(dealers)
          .where(eq(dealers.id, dealerResult.dealerId))
          .limit(1);
        
        if (fullDealerResult.length > 0) {
          dealer = fullDealerResult[0];
        } else {
          return NextResponse.json({ 
            success: false, 
            message: 'Dealer record not found' 
          }, { status: 400 });
        }
      } else {
        console.log(`⚠️ Enhanced dealer resolution failed, falling back to createOrGetDealer`);
        // Fallback to traditional dealer resolution
        dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
        console.log(`🏢 Fallback dealer resolution for upload: ${dealer.id}`);
      }
    }

    // Ensure dealer is defined
    if (!dealer) {
      return NextResponse.json({ 
        success: false, 
        message: 'Dealer information could not be resolved' 
      }, { status: 400 });
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
          console.log(`🔑 Dealer keys: advertiserId=${advertiserId}, dealerId=${dealer.id}`);
          
          if (advertiserId) {
            // Get AutoTrader token
            const tokenResult = await getAutoTraderToken(dealer.email);
            if (tokenResult.success && tokenResult.access_token) {
              autoTraderToken = tokenResult.access_token;
              console.log(`🔑 AutoTrader token obtained for ${dealer.email}`);
            } else {
              console.warn(`⚠️ Could not get AutoTrader token for ${dealer.email}:`, tokenResult.error);
            }
          } else {
            console.warn('⚠️ No advertiser ID found in dealer keys');
          }
        } else {
          console.warn('⚠️ Could not get dealer keys:', dealerKeysResult.error);
        }
      } catch (error) {
        console.warn('⚠️ AutoTrader integration failed, continuing with local storage only:', error);
      }
    }

    // Process each file using parallel upload
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

        // Generate image name for this file
        const stockImageName = files.length > 1 ? `${imageName} (${i + 1})` : imageName;
        
        // Use parallel upload function
        const parallelResult = await uploadImageInParallel(
          file,
          stockImageName,
          dealer,
          stockId,
          registration,
          description,
          vehicleType,
          imageType,
          isDefault,
          sortOrder + i,
          advertiserId,
          autoTraderToken,
          isQRUpload
        );

        if (parallelResult.success && parallelResult.stockImage) {
          uploadedStockImages.push(parallelResult.stockImage);
          
          // Track AutoTrader image ID if available
          if (parallelResult.autoTraderImageId) {
            autoTraderImageIds.push(parallelResult.autoTraderImageId);
          }
        } else {
          errors.push(`${file.name}: ${parallelResult.error || 'Processing failed'}`);
        }

      } catch {
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

    // If we have AutoTrader image IDs and this is a QR upload, update the stock with the new images
    if (isQRUpload && autoTraderImageIds.length > 0 && stockId && advertiserId && autoTraderToken) {
      try {
        const updatedImageIds = [...existingImageIds, ...autoTraderImageIds];
        
        // Correct payload format for AutoTrader API
        const mediaPayload = {
          media: {
            images: updatedImageIds.map(imageId => ({ imageId }))
          }
        };
        
        const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
        const stockUrl = `${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`;
        
        console.log(`📤 PATCH ${stockUrl}`);
        console.log(`📦 Payload: ${JSON.stringify(mediaPayload)}`);
        
        const patchResponse = await fetch(stockUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${autoTraderToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(mediaPayload)
        });
        
        if (patchResponse.ok) {
          const patchResult = await patchResponse.json();
          console.log(`✅ ${patchResponse.status} Response: ${JSON.stringify(patchResult)}`);
          
          // Verify the update by fetching the stock again
          const verifyResponse = await fetch(stockUrl, {
            headers: {
              'Authorization': `Bearer ${autoTraderToken}`,
              'Accept': 'application/json',
            }
          });
          
          if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json();
            const currentImages = verifyResult.media?.images || [];
            const currentImageIds = currentImages.map((img: Record<string, unknown>) => img.imageId as string).filter(Boolean);
            console.log(`🔍 Verification - Current images in stock: [${currentImageIds.join(', ')}]`);
            console.log(`✅ Images successfully ${currentImageIds.length > existingImageIds.length ? 'added' : 'not added'} to stock`);
          }
        } else {
          const patchError = await patchResponse.text();
          console.error(`❌ ${patchResponse.status} Error: ${patchError}`);
        }
      } catch (error) {
        console.error('❌ Stock update error:', error);
      }
    }

    const responseData = {
      success: true,
      message: isQRUpload 
        ? `Successfully uploaded ${uploadedStockImages.length} image(s) via QR code for stock ${stockId}${autoTraderImageIds.length > 0 ? ` and added to AutoTrader` : ''}`
        : `Successfully uploaded ${uploadedStockImages.length} stock image(s)`,
      stockImages: uploadedStockImages,
      count: uploadedStockImages.length,
      errors: errors.length > 0 ? errors : undefined,
      uploadSource: isQRUpload ? 'qr_code' : 'authenticated',
      autoTraderImageIds: autoTraderImageIds.length > 0 ? autoTraderImageIds : undefined,
      autoTraderImageCount: autoTraderImageIds.length,
      stockId: isQRUpload ? stockId : undefined,
      registration: isQRUpload ? registration : undefined
    };

    console.log(`✅ Uploaded ${uploadedStockImages.length} images. AutoTrader IDs: [${autoTraderImageIds.join(', ')}]`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Stock image upload error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to upload stock images',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
