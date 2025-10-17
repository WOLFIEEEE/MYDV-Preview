import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileToStorage, generateStorageFileName, VEHICLE_DOCUMENTS_BUCKET } from '@/lib/storage';
import { createOrGetDealer } from '@/lib/database';
import { db } from '@/lib/db';
import { vehicleDocuments, documentAccessLog, stockCache, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Helper function to get dealer info from stockId for QR code uploads
async function getDealerFromStockId(stockId: string): Promise<{ success: boolean; dealer?: typeof dealers.$inferSelect; error?: string }> {
  try {
    console.log('🔍 Getting dealer info from stockId for documents:', stockId);
    
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
    
    console.log('✅ Found dealer for stock documents:', stockRecord[0].dealer.id);
    return {
      success: true,
      dealer: stockRecord[0].dealer
    };
  } catch (error) {
    console.error('❌ Error getting dealer from stockId for documents:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data first to check for QR code upload
    const formData = await request.formData();
    const uploadSource = formData.get('uploadSource') as string || 'manual';
    const stockId = formData.get('stockId') as string || null;
    const registration = formData.get('registration') as string;
    
    let dealer;
    let isQRUpload = false;
    let userId: string | null = null;
    
    // Check if this is a QR code upload (unauthenticated)
    if (uploadSource === 'qr_code' && stockId) {
      console.log('📱 QR Code document upload detected for stockId:', stockId);
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
      const authResult = await auth();
      userId = authResult.userId;
      if (!userId) {
        return NextResponse.json({ 
          success: false, 
          message: 'Unauthorized' 
        }, { status: 401 });
      }
      
      // Get or create dealer record
      dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    }

    // Validation - for QR uploads, try to get registration from stock data if not provided
    let finalRegistration = registration;
    
    if (!finalRegistration && isQRUpload && stockId) {
      // Try to get registration from the stock data we already have
      try {
        const stockRecord = await db
          .select({
            vehicleData: stockCache.vehicleData
          })
          .from(stockCache)
          .where(and(
            eq(stockCache.stockId, stockId),
            eq(stockCache.isStale, false)
          ))
          .limit(1);
        
        if (stockRecord.length > 0) {
          const vehicleData = (stockRecord[0].vehicleData as Record<string, unknown>) || {};
          finalRegistration = (vehicleData.registration as string) || (vehicleData.plate as string) || stockId.slice(-8);
          console.log('📋 Got registration from stock data:', finalRegistration);
        }
      } catch (error) {
        console.warn('⚠️ Could not get registration from stock data:', error);
      }
    }
    
    if (!finalRegistration) {
      return NextResponse.json({ 
        success: false, 
        message: 'Registration is required for document upload' 
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
        const supabaseFileName = generateStorageFileName(file.name, 'vehicle-documents', dealer!.id);
        
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
          dealerId: dealer!.id,
          stockId,
          registration: finalRegistration.toUpperCase(),
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
          isVerified: !isQRUpload, // QR uploads need manual verification
          verifiedBy: userId || null,
          verifiedAt: userId ? new Date() : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          documentDate: documentDate ? new Date(documentDate) : null,
          uploadedBy: userId || 'qr_upload', // Use placeholder for QR uploads
          uploadSource,
          status: 'active',
          visibility: 'internal'
        }).returning();

        // Log the upload action (only if we have a userId)
        if (userId) {
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
        }

        uploadedDocuments.push({
          id: documentRecord[0].id,
          documentName: documentRecord[0].documentName,
          fileName: file.name,
          publicUrl: publicUrl!,
          documentType,
          fileSize: file.size,
          mimeType: file.type
        });

        const uploadTypeText = isQRUpload ? 'QR code' : 'authenticated';
        console.log(`✅ Successfully uploaded document via ${uploadTypeText}: ${file.name} for registration: ${registration}`);

      } catch (error: unknown) {
        console.error(`Error processing file ${file.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process ${file.name}: ${errorMessage}`);
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
      message: isQRUpload 
        ? `Successfully uploaded ${uploadedDocuments.length} document(s) via QR code for vehicle ${finalRegistration} (Stock: ${stockId})`
        : `Successfully uploaded ${uploadedDocuments.length} document(s) for vehicle ${finalRegistration}`,
      data: {
        documents: uploadedDocuments,
        registration: finalRegistration,
        stockId,
        uploadedCount: uploadedDocuments.length,
        uploadSource: isQRUpload ? 'qr_code' : 'authenticated',
        errorCount: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: unknown) {
    console.error('Vehicle document upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: errorMessage
    }, { status: 500 });
  }
}
