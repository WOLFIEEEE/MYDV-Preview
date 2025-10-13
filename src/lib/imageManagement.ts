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
 * Replace an existing image with a new one
 */
export async function replaceStockImage(
  stockId: string,
  advertiserId: string,
  oldImageId: string,
  newImageFile: File,
  baseUrl: string = '/api'
): Promise<{
  success: boolean;
  newImageId?: string;
  error?: string;
}> {
  try {
    console.log(`🔄 Replacing image ${oldImageId} for stock ${stockId}`);

    // Step 1: Upload the new image
    const uploadResult = await uploadImageToAutoTrader(newImageFile, advertiserId, baseUrl);
    
    if (!uploadResult.success || !uploadResult.imageId) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload replacement image'
      };
    }

    // Step 2: Get current stock data to find existing images
    const stockResponse = await fetch(`${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`);
    const stockData = await stockResponse.json();
    
    if (!stockResponse.ok || !stockData.success) {
      return {
        success: false,
        error: 'Failed to fetch current stock data'
      };
    }

    // Step 3: Replace the old image ID with the new one in the images array
    const currentImageIds = extractImageIdsFromStock(stockData.data);
    const updatedImageIds = currentImageIds.map(id => 
      id === oldImageId ? uploadResult.imageId! : id
    );

    // Step 4: Update stock with the new image list
    const updateResponse = await fetch(`${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media: {
          images: updatedImageIds.map(imageId => ({ imageId }))
        }
      }),
    });

    const updateResult = await updateResponse.json();

    if (updateResponse.ok && updateResult.success) {
      console.log(`✅ Successfully replaced image ${oldImageId} with ${uploadResult.imageId}`);
      return {
        success: true,
        newImageId: uploadResult.imageId
      };
    } else {
      return {
        success: false,
        error: updateResult.message || 'Failed to update stock with replacement image'
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    console.error(`❌ Image replacement error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Process AutoTrader image URLs with {resize} placeholders
 * Matches the resolution configuration used throughout the app
 */
export function processAutoTraderImageUrl(
  url: string, 
  size: 'gallery' | 'overview' | 'thumbnail' | 'edit' | 'list' = 'overview'
): string {
  if (!url) return '';
  
  // Handle AutoTrader URLs with {resize} placeholder
  if (url.includes('{resize}')) {
    // Match the resolution configuration used throughout the app:
    // Gallery tab: w1920h1080 for main image, w200h200 for thumbnails
    // Overview tab: w800h600 for main image  
    // List view: w200h150 for small thumbnails
    // Edit dialog: Use highest quality for editing
    const sizeMap = {
      gallery: 'w1920h1080',    // Gallery main image (highest quality)
      edit: 'w1920h1080',       // Edit dialog (use highest quality for editing)
      overview: 'w800h600',     // Overview tab main image
      thumbnail: 'w200h200',    // Thumbnails in gallery
      list: 'w200h150'          // List view thumbnails
    };
    return url.replace('{resize}', sizeMap[size]);
  }
  
  return url;
}

/**
 * Get fallback URLs for AutoTrader images in order of preference
 */
export function getAutoTraderImageFallbacks(originalUrl: string): string[] {
  if (!originalUrl) {
    return [];
  }
  
  // If URL contains {resize} placeholder, create fallbacks
  if (originalUrl.includes('{resize}')) {
    return [
      processAutoTraderImageUrl(originalUrl, 'gallery'),    // Highest quality first
      processAutoTraderImageUrl(originalUrl, 'overview'),   // Medium quality
      processAutoTraderImageUrl(originalUrl, 'thumbnail'),  // Gallery thumbnails
      processAutoTraderImageUrl(originalUrl, 'list'),       // List thumbnails
      originalUrl // Original URL as last resort
    ].filter(Boolean);
  }
  
  // If URL is already processed (contains size), create fallbacks by replacing the size
  if (originalUrl.includes('autotrader') && 
      (originalUrl.includes('w1920h1080') || originalUrl.includes('w800h600') || 
       originalUrl.includes('w400h300') || originalUrl.includes('w200h200') || 
       originalUrl.includes('w200h150'))) {
    const fallbacks = [];
    
    // Try different sizes by replacing the current size, prioritizing highest quality
    if (originalUrl.includes('w1920h1080')) {
      fallbacks.push(originalUrl); // Current highest quality
      fallbacks.push(originalUrl.replace('w1920h1080', 'w800h600')); // Overview size
      fallbacks.push(originalUrl.replace('w1920h1080', 'w200h200')); // Gallery thumbnails
      fallbacks.push(originalUrl.replace('w1920h1080', 'w200h150')); // List thumbnails
    } else if (originalUrl.includes('w800h600')) {
      fallbacks.push(originalUrl.replace('w800h600', 'w1920h1080')); // Try highest first
      fallbacks.push(originalUrl); // Current overview size
      fallbacks.push(originalUrl.replace('w800h600', 'w200h200')); // Gallery thumbnails
      fallbacks.push(originalUrl.replace('w800h600', 'w200h150')); // List thumbnails
    } else if (originalUrl.includes('w400h300')) {
      fallbacks.push(originalUrl.replace('w400h300', 'w1920h1080')); // Try highest first
      fallbacks.push(originalUrl.replace('w400h300', 'w800h600')); // Overview size
      fallbacks.push(originalUrl); // Current medium size
      fallbacks.push(originalUrl.replace('w400h300', 'w200h200')); // Gallery thumbnails
      fallbacks.push(originalUrl.replace('w400h300', 'w200h150')); // List thumbnails
    } else if (originalUrl.includes('w200h200')) {
      fallbacks.push(originalUrl.replace('w200h200', 'w1920h1080')); // Try highest first
      fallbacks.push(originalUrl.replace('w200h200', 'w800h600')); // Overview size
      fallbacks.push(originalUrl); // Current gallery thumbnail size
      fallbacks.push(originalUrl.replace('w200h200', 'w200h150')); // List thumbnails
    } else if (originalUrl.includes('w200h150')) {
      fallbacks.push(originalUrl.replace('w200h150', 'w1920h1080')); // Try highest first
      fallbacks.push(originalUrl.replace('w200h150', 'w800h600')); // Overview size
      fallbacks.push(originalUrl.replace('w200h150', 'w200h200')); // Gallery thumbnails
      fallbacks.push(originalUrl); // Current list thumbnail size
    }
    
    return fallbacks.filter(Boolean);
  }
  
  // For non-AutoTrader URLs or URLs without size info, just return the original
  return [originalUrl];
}

/**
 * Load image with AutoTrader fallback support and server proxy for CORS-free editing
 */
export function loadImageWithFallbacks(
  imageUrl: string,
  onLoad: (img: HTMLImageElement) => void,
  onError: (error: string) => void,
  forEditing: boolean = false
): void {
  const fallbackUrls = getAutoTraderImageFallbacks(imageUrl);

  console.log('🔄 Starting image load with fallbacks:', {
    originalUrl: imageUrl.substring(0, 100) + '...',
    fallbackCount: fallbackUrls.length,
    forEditing: forEditing,
    fallbacks: fallbackUrls.map(url => url.substring(0, 100) + '...')
  });

  // For editing, always use server proxy to ensure CORS-free operation
  if (forEditing) {
    loadImageViaProxy(imageUrl, onLoad, onError);
    return;
  }

  // For non-editing use cases, try fallbacks first
  let currentIndex = 0;
  let corsRetryCount = 0;
  const maxCorsRetries = 2;

  const attemptLoad = () => {
    if (currentIndex >= fallbackUrls.length) {
      onError(`All image loading attempts failed. Tried ${fallbackUrls.length} URLs with CORS fallbacks.`);
      return;
    }

    const url = fallbackUrls[currentIndex];
    const img = new Image();
    const useCors = corsRetryCount === 0;

    console.log(`🔄 Attempting to load image (${currentIndex + 1}/${fallbackUrls.length}, CORS: ${useCors}):`, url.substring(0, 100) + '...');

    img.onload = () => {
      console.log(`✅ Image loaded successfully (attempt ${currentIndex + 1}, CORS: ${useCors}):`, url.substring(0, 100) + '...');
      onLoad(img);
    };

    img.onerror = (error) => {
      console.warn(`❌ Image load failed (attempt ${currentIndex + 1}, CORS: ${useCors}):`, {
        url: url.substring(0, 100) + '...',
        error: error
      });

      // Try without CORS for the same URL before moving to next URL
      if (corsRetryCount < maxCorsRetries - 1) {
        corsRetryCount++;
        console.log(`🔄 Retrying same URL without CORS...`);
        attemptLoad();
        return;
      }

      // Move to next URL and reset CORS retry count
      corsRetryCount = 0;
      currentIndex++;
      attemptLoad();
    };

    // Set crossOrigin only for external URLs and only on first attempt
    if (useCors && !url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    img.src = url;
  };

  attemptLoad();
}

/**
 * Load image via server proxy for CORS-free operations
 */
async function loadImageViaProxy(
  imageUrl: string,
  onLoad: (img: HTMLImageElement) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    // If it's already a blob or data URL, load it directly (no proxy needed)
    if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      console.log('🔄 Loading blob/data URL directly (no proxy needed):', imageUrl.substring(0, 50) + '...');
      
      const img = new Image();
      img.onload = () => {
        console.log('✅ Blob/data image loaded successfully');
        onLoad(img);
      };
      img.onerror = () => {
        console.error('❌ Failed to load blob/data image');
        onError('Failed to load blob/data image');
      };
      img.src = imageUrl;
      return;
    }

    console.log('🔄 Loading image via server proxy for CORS-free operation:', imageUrl.substring(0, 100) + '...');

    const response = await fetch('/api/proxy-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error(`Server proxy failed: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      console.log('✅ Image loaded via server proxy successfully');
      URL.revokeObjectURL(blobUrl); // Clean up
      onLoad(img);
    };
    img.onerror = () => {
      console.error('❌ Failed to load proxied image');
      URL.revokeObjectURL(blobUrl); // Clean up
      onError('Failed to load image via proxy');
    };
    img.src = blobUrl;

  } catch (error) {
    console.error('❌ Server proxy load failed:', error);
    onError(`Server proxy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert image via server to avoid CORS issues for editing
 */
async function convertImageViaServer(
  imageUrl: string,
  onLoad: (img: HTMLImageElement) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    console.log('🔄 Converting image via server proxy...');
    
    // Create a server endpoint call to convert the image
    const response = await fetch('/api/convert-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });
    
    if (!response.ok) {
      throw new Error(`Server conversion failed: ${response.status}`);
    }
    
    const blob = await response.blob();
    const dataUrl = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = () => {
      console.log('✅ Image converted via server successfully');
      URL.revokeObjectURL(dataUrl); // Clean up
      onLoad(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(dataUrl); // Clean up
      onError('Failed to load converted image');
    };
    img.src = dataUrl;
    
  } catch (error) {
    console.error('❌ Server conversion failed:', error);
    onError(`Server conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
