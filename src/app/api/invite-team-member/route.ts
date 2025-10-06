import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createSecureTeamMemberInvitation } from '@/lib/secureTeamMemberOperations';
import { TeamMemberSecurityError } from '@/lib/teamMemberSecurity';
import { EmailService } from '@/lib/emailService';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    console.log('📧 Team member invitation API called');
    
    // Get current user
    const user = await currentUser();
    if (!user) {
      console.error('❌ User not authenticated');
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Parse request body
    const body = await req.json();
    const { storeOwnerId, name, email, role, phone, specialization } = body;
    
    console.log('📋 Invitation request data:', {
      storeOwnerId,
      name,
      email,
      role,
      phone,
      specialization
    });
    
    // Validate required fields
    if (!storeOwnerId) {
      console.error('❌ Missing store owner ID');
      return NextResponse.json({
        success: false,
        error: 'Store owner ID is required'
      }, { status: 400 });
    }
    
    // Call the secure database function
    console.log('🔄 Creating secure team member invitation...');
    const result = await createSecureTeamMemberInvitation(
      user.id,
      storeOwnerId,
      { name, email, role, phone, specialization }
    );
    
    console.log('📋 Invitation result:', result);
    
    if (result.success) {
      console.log('✅ Team member invitation created successfully');
      
      // Send invitation email
      try {
        // Construct the Clerk invitation URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteUrl = result.invitationId 
          ? `${baseUrl}/dashboard-redirect?__clerk_invitation_token=${result.invitationId}`
          : `${baseUrl}/dashboard-redirect?invitation=1`;
        
        // Get dealership name from store config
        let dealershipName = 'Your Dealership';
        try {
          const [storeConfigRecord] = await db
            .select({ storeName: storeConfig.storeName })
            .from(storeConfig)
            .where(eq(storeConfig.assignedBy, storeOwnerId))
            .limit(1);
          
          dealershipName = storeConfigRecord?.storeName || 'Your Dealership';
        } catch (dbError) {
          console.warn('⚠️ Could not fetch dealership name:', dbError);
        }
        
        const emailResult = await EmailService.sendTeamInvitation({
          to: email,
          inviterName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.emailAddresses[0]?.emailAddress || 'Team Administrator',
          dealershipName: dealershipName,
          role: role,
          inviteUrl: inviteUrl
        });
        
        if (emailResult.success) {
          console.log('✅ Invitation email sent successfully');
        } else {
          console.warn('⚠️ Failed to send invitation email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error sending invitation email:', emailError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Team member invitation sent successfully',
        data: {
          teamMember: result.teamMember,
          invitationId: result.invitationId
        }
      });
    } else {
      console.error('❌ Failed to create team member invitation');
      return NextResponse.json({
        success: false,
        error: 'Failed to create team member invitation'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Team member invitation API error:', error);
    
    // Handle security errors with appropriate status codes
    if (error instanceof TeamMemberSecurityError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: error.statusCode });
    }
    
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 