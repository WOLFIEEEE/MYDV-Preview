import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileToStorage, generateStorageFileName, VEHICLE_DOCUMENTS_BUCKET } from '@/lib/storage';
import { createOrGetDealer } from '@/lib/database';
import { db } from '@/lib/db';
import { vehicleDocuments, documentAccessLog } from '@/db/schema';

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
    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    
    // Parse form data
    const formData = await request.formData();
    const registration = formData.get('registration') as string;
    const stockId = formData.get('stockId') as string || null;
    const uploadSource = formData.get('uploadSource') as string || 'manual';

    // Validation
    if (!registration) {
      return NextResponse.json({ 
        success: false, 
        message: 'Registration is required' 
      }, { status: 400 });
    }

    // Extract files and their metadata from form data
    const fileData: Array<{
      file: File;
      documentName: string;
      documentType: string;
      description?: string;
      expiryDate?: string;
      documentDate?: string;
    }> = [];

    // Get all files and their corresponding metadata
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        const index = key.replace('file_', '');
        const documentName = formData.get(`documentName_${index}`) as string;
        const documentType = formData.get(`documentType_${index}`) as string;
        const description = formData.get(`description_${index}`) as string || '';
        const expiryDate = formData.get(`expiryDate_${index}`) as string || null;
        const documentDate = formData.get(`documentDate_${index}`) as string || null;

        // Validate required fields for each file
        if (!documentName || !documentType) {
          return NextResponse.json({ 
            success: false, 
            message: `Document name and type are required for file: ${value.name}` 
          }, { status: 400 });
        }

        fileData.push({
          file: value,
          documentName,
          documentType,
          description: description || undefined,
          expiryDate: expiryDate || undefined,
          documentDate: documentDate || undefined
        });
      }
    }

    if (fileData.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'At least one file is required' 
      }, { status: 400 });
    }

    const uploadedDocuments = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < fileData.length; i++) {
      const { file, documentName, documentType, description, expiryDate, documentDate } = fileData[i];
      
      try {
        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
          errors.push(`File ${file.name} is too large (max 20MB)`);
          continue;
        }

        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
          errors.push(`File ${file.name} has unsupported type: ${file.type}`);
          continue;
        }

        // Generate unique filename for storage
        const supabaseFileName = generateStorageFileName(file.name, 'vehicle-documents', dealer.id);
        
        // Upload to Supabase storage
        const { publicUrl, error: uploadError } = await uploadFileToStorage(
          file,
          `vehicle-documents/${supabaseFileName}`,
          VEHICLE_DOCUMENTS_BUCKET
        );

        if (uploadError) {
          console.error('Upload error:', uploadError);
          errors.push(`Failed to upload ${file.name}: ${uploadError}`);
          continue;
        }

        // Save document record to database
        const documentRecord = await db.insert(vehicleDocuments).values({
          dealerId: dealer.id,
          stockId,
          registration: registration.toUpperCase(),
          documentName,
          documentType,
          description: description || '',
          fileName: file.name,
          supabaseFileName,
          publicUrl: publicUrl!,
          fileSize: file.size,
          mimeType: file.type,
          tags: [],
          isRequired: false,
          isVerified: true, // Mark as verified upon upload
          verifiedBy: userId,
          verifiedAt: new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          documentDate: documentDate ? new Date(documentDate) : null,
          uploadedBy: userId,
          uploadSource,
          status: 'active',
          visibility: 'internal'
        }).returning();

        // Log the upload action
        await db.insert(documentAccessLog).values({
          documentId: documentRecord[0].id,
          userId,
          action: 'upload',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            uploadSource
          }
        });

        uploadedDocuments.push({
          id: documentRecord[0].id,
          documentName: documentRecord[0].documentName,
          fileName: file.name,
          publicUrl: publicUrl!,
          documentType,
          fileSize: file.size,
          mimeType: file.type
        });

        console.log(`✅ Successfully uploaded document: ${file.name} for registration: ${registration}`);

      } catch (error: any) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push(`Failed to process ${file.name}: ${error.message}`);
      }
    }

    // Return response
    if (uploadedDocuments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No documents were uploaded successfully',
        errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
      data: {
        documents: uploadedDocuments,
        registration,
        stockId,
        uploadedCount: uploadedDocuments.length,
        errorCount: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Vehicle document upload error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}
