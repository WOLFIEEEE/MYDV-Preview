import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminHelper';
import { db } from '@/lib/db';
import { dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  uploadFileToStorage, 
  generateStorageFileName,
  DEALER_LOGOS_BUCKET 
} from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication and authorization using environment variable
    const adminAuthResponse = await requireAdmin();
    if (adminAuthResponse) {
      // requireAdmin returns a NextResponse if unauthorized
      return adminAuthResponse;
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const dealerId = formData.get('dealerId') as string;

    if (!file || !dealerId) {
      return NextResponse.json({ error: 'Logo file and dealer ID are required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (max 5MB for admin uploads)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Verify dealer exists
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // Generate storage filename for Supabase
    const storageFileName = generateStorageFileName(file.name, 'admin-assigned', dealerId);
    
    // Upload to Supabase Storage
    const uploadResult = await uploadFileToStorage(file, storageFileName, DEALER_LOGOS_BUCKET);
    
    if (!uploadResult.success || !uploadResult.publicUrl) {
      return NextResponse.json({ 
        error: `Failed to upload logo to storage: ${uploadResult.error}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: uploadResult.publicUrl,
        logoFileName: file.name,
        logoSupabaseFileName: storageFileName,
        logoFileSize: file.size,
        logoMimeType: file.type,
        dealerId
      },
      message: 'Logo uploaded successfully to Supabase storage'
    });

  } catch (error) {
    console.error('Error uploading dealer logo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
