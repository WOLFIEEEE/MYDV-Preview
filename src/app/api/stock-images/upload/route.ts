import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileToStorage, generateStorageFileName } from '@/lib/storage';
import { createStockImage, createOrGetDealer } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get or create dealer record
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const vehicleType = formData.get('vehicleType') as string || null;
    const imageType = formData.get('imageType') as string || null;
    const isDefault = formData.get('isDefault') === 'true';
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;

    if (!name) {
      return NextResponse.json({ 
        success: false, 
        message: 'Name is required' 
      }, { status: 400 });
    }

    // Get dealer information
    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    
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
        const stockImageName = files.length > 1 ? `${name} (${i + 1})` : name;
        const stockImageResult = await createStockImage({
          dealerId: dealer.id,
          name: stockImageName,
          description: description,
          fileName: file.name,
          supabaseFileName: storageFileName,
          publicUrl: uploadResult.publicUrl,
          fileSize: file.size,
          mimeType: file.type,
          tags: [name.toLowerCase(), 'stock'],
          vehicleType: vehicleType,
          imageType: imageType,
          isDefault: isDefault,
          sortOrder: sortOrder + i
        });

        if (stockImageResult.success && stockImageResult.stockImage) {
          uploadedStockImages.push(stockImageResult.stockImage);
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

    console.log(`✅ Successfully uploaded ${uploadedStockImages.length}/${files.length} stock images`);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedStockImages.length} stock image(s)`,
      stockImages: uploadedStockImages,
      count: uploadedStockImages.length,
      errors: errors.length > 0 ? errors : undefined
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
