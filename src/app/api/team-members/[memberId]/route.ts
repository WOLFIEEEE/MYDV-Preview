import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  updateSecureTeamMember, 
  removeSecureTeamMember 
} from '@/lib/secureTeamMemberOperations';
import { TeamMemberSecurityError } from '@/lib/teamMemberSecurity';

// Update team member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { memberId } = await params;
    const memberIdNum = parseInt(memberId);

    if (!memberIdNum || isNaN(memberIdNum)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid member ID'
      }, { status: 400 });
    }

    // Parse request body
    const updates = await request.json();
    
    console.log('🔄 Updating team member:', { memberId: memberIdNum, updates });

    // Call secure update function
    const result = await updateSecureTeamMember(
      user.id,
      memberIdNum,
      updates
    );

    console.log('✅ Team member updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Team member updated successfully',
      data: result.teamMember
    });

  } catch (error) {
    console.error('❌ Error updating team member:', error);
    
    // Handle security errors with appropriate status codes
    if (error instanceof TeamMemberSecurityError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: error.statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update team member'
    }, { status: 500 });
  }
}

// Delete team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { memberId } = await params;
    const memberIdNum = parseInt(memberId);

    if (!memberIdNum || isNaN(memberIdNum)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid member ID'
      }, { status: 400 });
    }

    console.log('🗑️ Removing team member:', memberIdNum);

    // Call secure remove function
    const result = await removeSecureTeamMember(
      user.id,
      memberIdNum
    );

    console.log('✅ Team member removed successfully');

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
      data: result.teamMember
    });

  } catch (error) {
    console.error('❌ Error removing team member:', error);
    
    // Handle security errors with appropriate status codes
    if (error instanceof TeamMemberSecurityError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: error.statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to remove team member'
    }, { status: 500 });
  }
}
