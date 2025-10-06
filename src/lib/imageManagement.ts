// Image management utilities for AutoTrader API integration

export interface ImageUploadResult {
  success: boolean;
  imageId?: string;
  originalFilename?: string;
  fileSize?: number;
  error?: string;
}

export interface BatchImageUploadResult {
  success: boolean;
  uploadedImages: ImageUploadResult[];
  failedUploads: ImageUploadResult[];
  totalUploaded: number;
  totalFailed: number;
}

export interface StockImageUpdateResult {
  success: boolean;
  stockId: string;
  totalImages: number;
  message?: string;
  error?: string;
}

/**
 * Upload a single image to AutoTrader API
 */
export async function uploadImageToAutoTrader(
  imageFile: File,
  advertiserId: string,
  baseUrl: string = '/api'
): Promise<ImageUploadResult> {
  try {
    console.log(`📸 Uploading image: ${imageFile.name} (${imageFile.size} bytes)`);

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${baseUrl}/images?advertiserId=${advertiserId}`, {
      method: 'POST',
      body: formData,
    });

    const responseData = await response.json();

    if (response.ok && responseData.success && responseData.data?.imageId) {
      console.log(`✅ Image uploaded successfully: ${responseData.data.imageId}`);
      return {
        success: true,
        imageId: responseData.data.imageId,
        originalFilename: imageFile.name,
        fileSize: imageFile.size,
      };
    } else {
      const errorMessage = responseData.error?.message || responseData.message || 'Unknown error';
      console.error(`❌ Image upload failed: ${errorMessage}`);
      return {
        success: false,
        originalFilename: imageFile.name,
        fileSize: imageFile.size,
        error: errorMessage,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    console.error(`❌ Image upload error: ${errorMessage}`);
    return {
      success: false,
      originalFilename: imageFile.name,
      fileSize: imageFile.size,
      error: errorMessage,
    };
  }
}

/**
 * Upload multiple images to AutoTrader API in sequence
 */
export async function uploadMultipleImages(
  imageFiles: File[],
  advertiserId: string,
  baseUrl: string = '/api',
  onProgress?: (current: number, total: number, result: ImageUploadResult) => void
): Promise<BatchImageUploadResult> {
  console.log(`📸 Starting batch upload of ${imageFiles.length} images...`);

  const uploadedImages: ImageUploadResult[] = [];
  const failedUploads: ImageUploadResult[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const imageFile = imageFiles[i];
    console.log(`📸 Uploading image ${i + 1}/${imageFiles.length}: ${imageFile.name}`);

    const result = await uploadImageToAutoTrader(imageFile, advertiserId, baseUrl);

    if (result.success) {
      uploadedImages.push(result);
    } else {
      failedUploads.push(result);
    }

    // Call progress callback if provided
    if (onProgress) {
      onProgress(i + 1, imageFiles.length, result);
    }

    // Add a small delay between uploads to avoid rate limiting
    if (i < imageFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const result: BatchImageUploadResult = {
    success: failedUploads.length === 0,
    uploadedImages,
    failedUploads,
    totalUploaded: uploadedImages.length,
    totalFailed: failedUploads.length,
  };

  console.log(`📊 Batch upload complete: ${result.totalUploaded} uploaded, ${result.totalFailed} failed`);
  return result;
}

/**
 * Update stock with new image IDs (combining with existing images)
 */
export async function updateStockImages(
  stockId: string,
  advertiserId: string,
  newImageIds: string[],
  existingImageIds: string[] = [],
  baseUrl: string = '/api'
): Promise<StockImageUpdateResult> {
  try {
    console.log(`🔄 Updating stock ${stockId} with images...`);
    console.log(`📸 New images: ${newImageIds.length}, Existing images: ${existingImageIds.length}`);

    // Combine existing and new image IDs
    const allImageIds = [...existingImageIds, ...newImageIds];
    const totalImages = allImageIds.length;

    console.log(`📸 Total images to set: ${totalImages}`);

    // Prepare the media payload
    const mediaPayload = {
      media: {
        images: allImageIds.map(imageId => ({ imageId }))
      }
    };

    console.log('📝 Media payload:', JSON.stringify(mediaPayload, null, 2));

    const response = await fetch(`${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mediaPayload),
    });

    const responseData = await response.json();

    if (response.ok && responseData.success) {
      console.log(`✅ Stock images updated successfully`);
      return {
        success: true,
        stockId,
        totalImages,
        message: `Stock images updated successfully (${totalImages} images)`,
      };
    } else {
      const errorMessage = responseData.error?.message || responseData.message || 'Unknown error';
      console.error(`❌ Stock image update failed: ${errorMessage}`);
      return {
        success: false,
        stockId,
        totalImages,
        error: errorMessage,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    console.error(`❌ Stock image update error: ${errorMessage}`);
    return {
      success: false,
      stockId,
      totalImages: newImageIds.length + existingImageIds.length,
      error: errorMessage,
    };
  }
}

/**
 * Complete image management flow: upload new images and update stock
 */
export async function uploadAndUpdateStockImages(
  stockId: string,
  advertiserId: string,
  newImageFiles: File[],
  existingImageIds: string[] = [],
  baseUrl: string = '/api',
  onUploadProgress?: (current: number, total: number, result: ImageUploadResult) => void
): Promise<{
  uploadResult: BatchImageUploadResult;
  updateResult: StockImageUpdateResult;
  success: boolean;
}> {
  console.log(`🚀 Starting complete image management flow for stock ${stockId}`);
  console.log(`📸 New images to upload: ${newImageFiles.length}`);
  console.log(`📸 Existing images to preserve: ${existingImageIds.length}`);

  // Step 1: Upload new images
  const uploadResult = await uploadMultipleImages(
    newImageFiles,
    advertiserId,
    baseUrl,
    onUploadProgress
  );

  // Step 2: Update stock with all image IDs (existing + new)
  const newImageIds = uploadResult.uploadedImages
    .map(result => result.imageId)
    .filter((id): id is string => id !== undefined);

  const updateResult = await updateStockImages(
    stockId,
    advertiserId,
    newImageIds,
    existingImageIds,
    baseUrl
  );

  const overallSuccess = uploadResult.success && updateResult.success;

  console.log(`📊 Complete flow result: ${overallSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`📸 Images uploaded: ${uploadResult.totalUploaded}/${newImageFiles.length}`);
  console.log(`🔄 Stock update: ${updateResult.success ? 'SUCCESS' : 'FAILED'}`);

  return {
    uploadResult,
    updateResult,
    success: overallSuccess,
  };
}

/**
 * Get existing image IDs from stock data
 */
export function extractImageIdsFromStock(stockData: any): string[] {
  try {
    const images = stockData?.media?.images || stockData?.adverts?.media?.images || [];
    
    if (Array.isArray(images)) {
      return images
        .map((image: any) => image.imageId)
        .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
    }
    
    return [];
  } catch (error) {
    console.warn('⚠️ Failed to extract image IDs from stock data:', error);
    return [];
  }
}

/**
 * Validate image files before upload
 */
export function validateImageFiles(files: File[]): {
  valid: File[];
  invalid: { file: File; error: string }[];
} {
  const valid: File[] = [];
  const invalid: { file: File; error: string }[] = [];

  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  for (const file of files) {
    if (file.size > maxSizeBytes) {
      invalid.push({
        file,
        error: `File size too large (${Math.round(file.size / (1024 * 1024))}MB). Maximum allowed: 10MB`
      });
    } else if (!allowedTypes.includes(file.type)) {
      invalid.push({
        file,
        error: `Invalid file type (${file.type}). Allowed: ${allowedTypes.join(', ')}`
      });
    } else if (!file.name || file.name.trim() === '') {
      invalid.push({
        file,
        error: 'File must have a valid filename'
      });
    } else {
      valid.push(file);
    }
  }

  return { valid, invalid };
}
