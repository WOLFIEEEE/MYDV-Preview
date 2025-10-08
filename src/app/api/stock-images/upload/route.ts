import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { uploadFileToStorage, generateStorageFileName } from '@/lib/storage';
import { createStockImage, createOrGetDealer } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get or create dealer record using enhanced resolution
    let dealerId: string;
    const dealerResult = await getDealerIdForUser(user);
    
    if (dealerResult.success && dealerResult.dealerId) {
      dealerId = dealerResult.dealerId;
      console.log(`✅ Enhanced dealer resolution for upload: ${dealerId}`);
    } else {
      console.log(`⚠️ Enhanced dealer resolution failed, falling back to createOrGetDealer`);
      // Fallback to traditional dealer resolution
      const dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
      dealerId = dealer.id;
      console.log(`🏢 Fallback dealer resolution for upload: ${dealerId}`);
    }
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
    const total = files.length;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round(((i + 1) / total) * 100);
      
      console.log(`📷 Processing file ${i + 1}/${total}: ${file.name} (${progress}%)`);

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
        const storageFileName = generateStorageFileName(file.name, 'stock', dealerId);
        
        // Upload to Supabase Storage
        const uploadResult = await uploadFileToStorage(file, storageFileName, 'templates');
        
        if (!uploadResult.success || !uploadResult.publicUrl) {
          errors.push(`${file.name}: Upload failed - ${uploadResult.error}`);
          continue;
        }

        // Save to database
        const stockImageName = files.length > 1 ? `${name} (${i + 1})` : name;
        const stockImageResult = await createStockImage({
          dealerId: dealerId,
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
