import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileToStorage, generateStorageFileName, LICENSES_BUCKET } from '@/lib/storage';
import { db } from '@/lib/db';
import { dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get dealer information
    const dealer = await db.query.dealers.findFirst({
      where: eq(dealers.clerkUserId, userId)
    });

    if (!dealer) {
      return NextResponse.json({ 
        success: false, 
        message: 'Dealer not found' 
      }, { status: 404 });
    }

    // Extract file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        message: 'No file provided' 
      }, { status: 400 });
    }

    // Validate file type (driving licenses: images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed for driving licenses.' 
      }, { status: 400 });
    }

    // Validate file size (max 10MB for licenses)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        message: 'File too large. Maximum size is 10MB for driving licenses.' 
      }, { status: 400 });
    }

    // Generate unique filename for the license
    const fileName = generateStorageFileName(
      file.name,
      'license',
      dealer.id
    );

    // Upload file to Supabase Storage
    const uploadResult = await uploadFileToStorage(
      file,
      fileName,
      LICENSES_BUCKET
    );

    if (!uploadResult.success) {
      console.error('License upload failed:', uploadResult.error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to upload license file' 
      }, { status: 500 });
    }

    // Return success response with file URL
    return NextResponse.json({
      success: true,
      message: 'License uploaded successfully',
      fileUrl: uploadResult.publicUrl,
      fileName: fileName,
      fileSize: file.size,
      fileType: file.type
    });

  } catch (error) {
    console.error('Error uploading license:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
