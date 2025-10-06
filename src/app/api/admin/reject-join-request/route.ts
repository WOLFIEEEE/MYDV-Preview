import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { rejectJoinSubmission } from '@/lib/database';
import { 
  createErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

export async function POST(request: NextRequest) {
  try {
    console.log('❌ Admin reject join request API called');
    
    // Get current user
    const user = await currentUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.AUTHENTICATION,
          message: 'User not authenticated',
          details: 'Please sign in to access this resource',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
          endpoint: 'admin/reject-join-request'
        }),
        { status: 401 }
      );
    }
    
    console.log('✅ Admin authenticated:', user.id);
    
    // Parse request body
    const body = await request.json();
    const { submissionId, rejectionReason } = body;
    
    console.log('📋 Rejection request data:', {
      submissionId,
      rejectionReason: rejectionReason ? 'Provided' : 'Not provided',
      adminId: user.id,
      timestamp: new Date().toISOString()
    });
    
    // Validate required fields
    if (!submissionId || typeof submissionId !== 'number') {
      console.error('❌ Missing or invalid submission ID');
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.VALIDATION,
          message: 'Valid submission ID is required',
          details: 'submissionId must be a valid number',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          endpoint: 'admin/reject-join-request'
        }),
        { status: 400 }
      );
    }
    
    // Call the rejection function
    console.log('🔄 Processing join request rejection...');
    const result = await rejectJoinSubmission(
      submissionId,
      user.id,
      rejectionReason
    );
    
    if (!result.success) {
      console.error('❌ Failed to reject join request:', result.error);
      return NextResponse.json(
        createErrorResponse({
          type: ErrorType.SERVER_ERROR,
          message: 'Failed to reject join request',
          details: result.error,
          httpStatus: 500,
          timestamp: new Date().toISOString(),
          endpoint: 'admin/reject-join-request'
        }),
        { status: 500 }
      );
    }
    
    console.log('✅ Join request rejected successfully:', {
      submissionId,
      applicantEmail: result.data?.submission?.email,
      rejectionEmailSent: true
    });
    
    return NextResponse.json(
      createSuccessResponse({
        message: 'Join request rejected successfully',
        data: {
          submissionId,
          applicantName: `${result.data?.submission?.firstName} ${result.data?.submission?.lastName}`,
          applicantEmail: result.data?.submission?.email,
          dealershipName: result.data?.submission?.dealershipName,
          rejectionReason: result.data?.rejectionReason,
          rejectionEmailSent: true,
          rejectedAt: new Date().toISOString()
        }
      })
    );
    
  } catch (error) {
    console.error('❌ Error in reject join request API:', error);
    return NextResponse.json(
      createErrorResponse({
        type: ErrorType.SERVER_ERROR,
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/reject-join-request'
      }),
      { status: 500 }
    );
  }
}
