import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local explicitly for server-side usage
config({ path: join(process.cwd(), '.env.local') });

// Initialize Supabase client for storage only (server-side)
// Using service role key for full access to storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'Set' : 'Missing');
  throw new Error('Missing Supabase environment variables for storage')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Storage bucket names
export const TEMPLATES_BUCKET = 'templates'
export const LICENSES_BUCKET = 'licenses'
export const COMPANY_LOGOS_BUCKET = 'company-logos'
export const DEALER_LOGOS_BUCKET = 'dealer-logos'
export const VEHICLE_DOCUMENTS_BUCKET = 'vehicle-documents'

/**
 * Ensure a storage bucket exists, create it if it doesn't
 */
export async function ensureBucketExists(bucketName: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🪣 Checking if bucket exists:', bucketName)

    // List all buckets to check if our bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return { success: false, error: listError.message }
    }

    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
    
    if (bucketExists) {
      console.log('✅ Bucket already exists:', bucketName)
      return { success: true }
    }

    console.log('🔄 Creating bucket:', bucketName)
    
    // Create the bucket with public access for logo URLs
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB limit
    })

    if (createError) {
      console.error('❌ Error creating bucket:', createError)
      return { success: false, error: createError.message }
    }

    console.log('✅ Bucket created successfully:', bucketName)
    return { success: true }

  } catch (error) {
    console.error('❌ Unexpected error in ensureBucketExists:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFileToStorage(
  file: File,
  fileName: string,
  bucket: string = TEMPLATES_BUCKET
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    console.log('📤 Uploading file to Supabase Storage:', fileName)

    // Ensure bucket exists before uploading
    const bucketCheck = await ensureBucketExists(bucket)
    if (!bucketCheck.success) {
      console.error('❌ Failed to ensure bucket exists:', bucketCheck.error)
      return { success: false, error: `Bucket setup failed: ${bucketCheck.error}` }
    }

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('❌ Supabase upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    if (!publicUrlData?.publicUrl) {
      return { success: false, error: 'Failed to get public URL' }
    }

    console.log('✅ File uploaded successfully:', fileName)
    return { 
      success: true, 
      publicUrl: publicUrlData.publicUrl 
    }

  } catch (error) {
    console.error('❌ Upload error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get signed URL for secure document access
 */
export async function getSignedUrl(
  fileName: string,
  bucket: string = VEHICLE_DOCUMENTS_BUCKET,
  expiresIn: number = 3600 // 1 hour by default
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, expiresIn);

    if (error) {
      console.error('❌ Error creating signed URL:', error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      signedUrl: data.signedUrl 
    };
  } catch (error) {
    console.error('❌ Signed URL error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFileFromStorage(
  fileName: string,
  bucket: string = TEMPLATES_BUCKET
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Deleting file from Supabase Storage:', fileName)

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName])

    if (error) {
      console.error('❌ Supabase delete error:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ File deleted successfully:', fileName)
    return { success: true }

  } catch (error) {
    console.error('❌ Delete error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Generate unique filename for Supabase storage
 */
export function generateStorageFileName(
  originalName: string,
  category: string,
  dealerId: string
): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const fileExtension = originalName.split('.').pop()
  const sanitizedName = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars
    .substring(0, 50) // Limit length

  // Structure: dealerId/category/filename_timestamp_randomId.ext
  return `${dealerId}/${category}/${sanitizedName}_${timestamp}_${randomId}.${fileExtension}`
}

/**
 * Extract filename from Supabase public URL
 */
export function extractFileNameFromUrl(publicUrl: string): string {
  const url = new URL(publicUrl)
  const pathParts = url.pathname.split('/')
  return pathParts[pathParts.length - 1]
}
