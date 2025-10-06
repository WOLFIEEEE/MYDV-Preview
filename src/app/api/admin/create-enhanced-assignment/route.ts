import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth, requireAdmin } from '@/lib/adminHelper';
import { createOrUpdateEnhancedStoreConfig, type EnhancedAssignmentData } from '@/lib/database';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Enhanced assignment API route called');
    
    // Check admin authentication and authorization
    const adminAuthResponse = await requireAdmin();
    if (adminAuthResponse) {
      // requireAdmin returns a NextResponse if unauthorized
      return adminAuthResponse;
    }

    // Get admin user details for logging
    const adminCheck = await checkAdminAuth();
    const adminUser = adminCheck.user;
    
    // This should never happen since requireAdmin() already checked, but TypeScript needs the guard
    if (!adminUser) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Admin user not found',
        details: 'Unable to retrieve admin user details',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/create-enhanced-assignment'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }
    
    console.log('✅ Admin authenticated:', {
      adminId: adminUser.id,
      email: adminUser.emailAddresses?.[0]?.emailAddress?.replace(/(.{2}).*(@.*)/, '$1***$2'),
      timestamp: new Date().toISOString()
    });

    // Parse the request body
    const body = await request.json();
    const { submissionId, assignmentData } = body;

    console.log('📋 Request data:', { submissionId, assignmentData });

    // Validate required fields
    if (!submissionId || typeof submissionId !== 'number') {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Valid submission ID is required',
        details: 'submissionId must be a valid number',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/create-enhanced-assignment'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    if (!assignmentData || typeof assignmentData !== 'object') {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Assignment data is required',
        details: 'assignmentData must be a valid object',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/create-enhanced-assignment'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Type the assignment data
    const typedAssignmentData: EnhancedAssignmentData = {
      // Legacy columns
      advertisementIds: assignmentData.advertisementIds,
      primaryAdvertisementId: assignmentData.primaryAdvertisementId,
      autotraderKey: assignmentData.autotraderKey,
      autotraderSecret: assignmentData.autotraderSecret,
      dvlaApiKey: assignmentData.dvlaApiKey,
      autotraderIntegrationId: assignmentData.autotraderIntegrationId,
      companyName: assignmentData.companyName,
      companyLogo: assignmentData.companyLogo,
      
      // New enhanced columns
      advertisementId: assignmentData.advertisementId,
      additionalAdvertisementIds: assignmentData.additionalAdvertisementIds,
      companyLogoUrl: assignmentData.companyLogoUrl,
    };

    console.log('🔄 Calling createOrUpdateEnhancedStoreConfig...');
    
    // Create or update the enhanced store config
    const result = await createOrUpdateEnhancedStoreConfig(
      submissionId,
      adminUser.id, // admin's Clerk ID (we know adminUser is not null due to check above)
      typedAssignmentData
    );

    if (!result.success) {
      console.error('❌ Failed to create/update store config:', result.error);
      const serviceError = {
        type: ErrorType.SERVER_ERROR,
        message: 'Failed to create/update store configuration',
        details: result.error,
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/create-enhanced-assignment'
      };
      return NextResponse.json(
        createErrorResponse(serviceError),
        { status: 500 }
      );
    }

    console.log('✅ Enhanced assignment created/updated successfully');
    
    const responseData = {
      ...result.data,
      adminInfo: {
        processedBy: adminUser.id, // adminUser is guaranteed to be non-null
        processedAt: new Date().toISOString()
      },
      message: result.data?.isUpdate ? 'Assignment updated successfully' : 'Assignment created successfully'
    };
    
    return NextResponse.json(
      createSuccessResponse(responseData, 'admin/create-enhanced-assignment')
    );

  } catch (error) {
    console.error('❌ Error in enhanced assignment API:', error);
    const internalError = createInternalErrorResponse(error, 'admin/create-enhanced-assignment');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Enhanced assignment GET API route called');
    
    // Check admin authentication and authorization
    const adminAuthResponse = await requireAdmin();
    if (adminAuthResponse) {
      // requireAdmin returns a NextResponse if unauthorized
      return adminAuthResponse;
    }

    // Get admin user details for logging
    const adminCheck = await checkAdminAuth();
    const adminUser = adminCheck.user;
    
    // This should never happen since requireAdmin() already checked, but TypeScript needs the guard
    if (!adminUser) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Admin user not found',
        details: 'Unable to retrieve admin user details',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/create-enhanced-assignment'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }
    
    console.log('✅ Admin authenticated for GET request:', {
      adminId: adminUser.id,
      email: adminUser.emailAddresses?.[0]?.emailAddress?.replace(/(.{2}).*(@.*)/, '$1***$2'),
      timestamp: new Date().toISOString()
    });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');
    const userClerkId = searchParams.get('userClerkId');
    const userEmail = searchParams.get('userEmail');

    console.log('📋 Query parameters:', { submissionId, userClerkId, userEmail });

    // Import the function here to avoid circular imports
    const { getEnhancedAssignmentData } = await import('@/lib/database');

    // Fetch the enhanced assignment data
    const result = await getEnhancedAssignmentData(
      submissionId ? parseInt(submissionId) : undefined,
      userClerkId || undefined,
      userEmail || undefined
    );

    if (!result.success) {
      console.error('❌ Failed to fetch assignment data:', result.error);
      const serviceError = {
        type: ErrorType.NOT_FOUND,
        message: 'Assignment data not found',
        details: result.error,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/create-enhanced-assignment'
      };
      return NextResponse.json(
        createErrorResponse(serviceError),
        { status: 404 }
      );
    }

    console.log('✅ Enhanced assignment data retrieved successfully');
    
    const responseData = {
      ...result.data,
      requestInfo: {
        requestedBy: adminUser.id, // adminUser is guaranteed to be non-null
        requestedAt: new Date().toISOString()
      }
    };
    
    return NextResponse.json(
      createSuccessResponse(responseData, 'admin/create-enhanced-assignment')
    );

  } catch (error) {
    console.error('❌ Error in enhanced assignment GET API:', error);
    const internalError = createInternalErrorResponse(error, 'admin/create-enhanced-assignment');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
} 