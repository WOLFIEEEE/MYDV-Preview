import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { uploadFileToStorage, generateStorageFileName } from '@/lib/storage';
import { createTemplate, createOrGetDealer } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get or create dealer record
    const formData = await request.formData();
    const category = formData.get('category') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';

    if (!category || !name) {
      return NextResponse.json({ 
        success: false, 
        message: 'Category and name are required' 
      }, { status: 400 });
    }

    // Get dealer information using enhanced resolution (supports team member delegation)
    const dealerResult = await getDealerIdForUser(user);
    let dealer;
    
    if (dealerResult.success && dealerResult.dealerId) {
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
      dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
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

    const uploadedTemplates = [];
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
        const storageFileName = generateStorageFileName(file.name, category, dealer.id);
        
        // Upload to Supabase Storage
        const uploadResult = await uploadFileToStorage(file, storageFileName);
        
        if (!uploadResult.success || !uploadResult.publicUrl) {
          errors.push(`${file.name}: Upload failed - ${uploadResult.error}`);
          continue;
        }

        // Save to database
        const templateName = files.length > 1 ? `${name} (${i + 1})` : name;
        const templateResult = await createTemplate({
          dealerId: dealer.id,
          name: templateName,
          description: description,
          category: category,
          fileName: file.name,
          supabaseFileName: storageFileName,
          publicUrl: uploadResult.publicUrl,
          fileSize: file.size,
          mimeType: file.type,
          tags: [category, name.toLowerCase()]
        });

        if (templateResult.success && templateResult.template) {
          uploadedTemplates.push(templateResult.template);
        } else {
          errors.push(`${file.name}: Database save failed - ${templateResult.error}`);
        }

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        errors.push(`${file.name}: Processing failed`);
      }
    }

    // Return results
    if (uploadedTemplates.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No templates were uploaded successfully',
        errors: errors
      }, { status: 400 });
    }

    console.log(`✅ Successfully uploaded ${uploadedTemplates.length}/${files.length} templates`);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedTemplates.length} template(s)`,
      templates: uploadedTemplates,
      count: uploadedTemplates.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Template upload error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to upload templates',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
