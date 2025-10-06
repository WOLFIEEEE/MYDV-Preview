import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealers, companySettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  uploadFileToStorage, 
  deleteFileFromStorage, 
  generateStorageFileName,
  COMPANY_LOGOS_BUCKET 
} from '@/lib/storage';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const logo = formData.get('logo') as File;
    const dealerId = formData.get('dealerId') as string;

    if (!logo || !dealerId) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Logo file and dealer ID are required',
        details: 'Both logo file and dealerId must be provided',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(logo.type)) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Invalid file type',
        details: `Only ${ALLOWED_TYPES.join(', ')} files are allowed`,
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Validate file size
    if (logo.size > MAX_FILE_SIZE) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'File too large',
        details: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Verify dealer exists
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      const notFoundError = {
        type: ErrorType.NOT_FOUND,
        message: 'Dealer not found',
        details: `No dealer found with ID: ${dealerId}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(notFoundError),
        { status: 404 }
      );
    }

    // Generate storage filename
    const storageFileName = generateStorageFileName(logo.name, 'company-logos', dealerId);
    
    // Upload to Supabase Storage
    const uploadResult = await uploadFileToStorage(logo, storageFileName, COMPANY_LOGOS_BUCKET);
    
    if (!uploadResult.success || !uploadResult.publicUrl) {
      const uploadError = {
        type: ErrorType.SERVER_ERROR,
        message: 'Failed to upload logo to storage',
        details: uploadResult.error || 'Unknown storage error',
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(uploadError),
        { status: 500 }
      );
    }

    // Check if company settings record exists
    const existingSettings = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    // Delete old logo from storage if it exists
    if (existingSettings.length > 0 && existingSettings[0].companyLogoSupabaseFileName) {
      await deleteFileFromStorage(existingSettings[0].companyLogoSupabaseFileName, COMPANY_LOGOS_BUCKET);
    }

    const logoData = {
      companyLogoFileName: logo.name,
      companyLogoSupabaseFileName: storageFileName,
      companyLogoPublicUrl: uploadResult.publicUrl,
      companyLogoFileSize: logo.size,
      companyLogoMimeType: logo.type,
      updatedAt: new Date()
    };

    if (existingSettings.length > 0) {
      // Update existing record with logo data
      await db
        .update(companySettings)
        .set(logoData)
        .where(eq(companySettings.dealerId, dealerId));
    } else {
      // Create new record with logo data
      await db
        .insert(companySettings)
        .values({
          dealerId,
          ...logoData,
          createdAt: new Date()
        });
    }

    return NextResponse.json(
      createSuccessResponse(
        { 
          message: 'Logo uploaded successfully',
          logoUrl: uploadResult.publicUrl,
          fileName: logo.name,
          fileSize: logo.size
        }, 
        'company-logo'
      )
    );

  } catch (error) {
    console.error('Error uploading company logo:', error);
    const internalError = createInternalErrorResponse(error, 'company-logo');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');

    if (!dealerId) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Dealer ID is required',
        details: 'dealerId parameter must be provided in query string',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get company logo from database
    const settings = await db
      .select({
        companyLogoPublicUrl: companySettings.companyLogoPublicUrl,
        companyLogoMimeType: companySettings.companyLogoMimeType,
        companyLogoFileName: companySettings.companyLogoFileName,
        companyLogoFileSize: companySettings.companyLogoFileSize
      })
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    if (settings.length === 0 || !settings[0].companyLogoPublicUrl) {
      const notFoundError = {
        type: ErrorType.NOT_FOUND,
        message: 'Logo not found',
        details: 'No logo found for this dealer',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(notFoundError),
        { status: 404 }
      );
    }

    const logoData = settings[0];

    return NextResponse.json(
      createSuccessResponse(
        {
          logoUrl: logoData.companyLogoPublicUrl,
          fileName: logoData.companyLogoFileName,
          mimeType: logoData.companyLogoMimeType,
          size: logoData.companyLogoFileSize
        },
        'company-logo'
      )
    );

  } catch (error) {
    console.error('Error fetching company logo:', error);
    const internalError = createInternalErrorResponse(error, 'company-logo');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');

    if (!dealerId) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Dealer ID is required',
        details: 'dealerId parameter must be provided in query string',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'company-logo'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Get current logo info to delete from storage
    const currentSettings = await db
      .select({
        companyLogoSupabaseFileName: companySettings.companyLogoSupabaseFileName
      })
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    // Delete from Supabase storage if file exists
    if (currentSettings.length > 0 && currentSettings[0].companyLogoSupabaseFileName) {
      await deleteFileFromStorage(currentSettings[0].companyLogoSupabaseFileName, COMPANY_LOGOS_BUCKET);
    }

    // Remove logo data from database
    await db
      .update(companySettings)
      .set({
        companyLogoFileName: null,
        companyLogoSupabaseFileName: null,
        companyLogoPublicUrl: null,
        companyLogoFileSize: null,
        companyLogoMimeType: null,
        updatedAt: new Date()
      })
      .where(eq(companySettings.dealerId, dealerId));

    return NextResponse.json(
      createSuccessResponse(
        { message: 'Logo deleted successfully' },
        'company-logo'
      )
    );

  } catch (error) {
    console.error('Error deleting company logo:', error);
    const internalError = createInternalErrorResponse(error, 'company-logo');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
