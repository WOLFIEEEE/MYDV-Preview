import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSecureTeamMembers } from '@/lib/secureTeamMemberOperations';
import { TeamMemberSecurityError } from '@/lib/teamMemberSecurity';
import { db } from '@/lib/db';
import { teamMembers, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Get team members for a dealer (for assignment dropdowns)
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID (supports team member credential delegation)
    let dealerId: string;
    
    // First check if user is a team member
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      // User is a team member - use store owner's dealer ID
      dealerId = teamMemberResult[0].storeOwnerId;
      console.log('👥 Team member detected - using store owner dealer ID for team members:', dealerId);
    } else {
      // User is not a team member - get their own dealer record
      const dealerResult = await db
        .select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.clerkUserId, user.id))
        .limit(1);

      if (dealerResult.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Dealer record not found' 
        }, { status: 404 });
      }

      dealerId = dealerResult[0].id;
      console.log('🏢 Store owner detected - using own dealer ID for team members:', dealerId);
    }

    console.log('🔍 Fetching team members for dealer:', dealerId);

    // Get all active team members using secure function
    const { members } = await getSecureTeamMembers(user.id, dealerId, {
      includeInactive: false
    });

    console.log(`👥 Found ${members.length} active team members for dealer`);

    // Also get the store owner info
    const [storeOwner] = await db
      .select({
        id: dealers.id,
        name: dealers.name,
        clerkUserId: dealers.clerkUserId
      })
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    // Combine store owner and team members for assignment options
    const assignmentOptions = [];

    // Add store owner as an option
    if (storeOwner && storeOwner.clerkUserId) {
      assignmentOptions.push({
        id: storeOwner.clerkUserId,
        name: storeOwner.name || 'Store Owner',
        email: '', // We don't have store owner email in dealers table
        role: 'owner',
        type: 'owner'
      });
      console.log('✅ Added store owner to assignment options:', storeOwner.name || 'Store Owner');
    } else {
      console.log('⚠️ Store owner not found or missing clerkUserId');
    }

    // Add team members
    members.forEach(member => {
      if (member.clerkUserId) { // Only include members who have completed signup
        assignmentOptions.push({
          id: member.clerkUserId,
          name: member.name,
          email: member.email,
          role: member.role,
          type: 'team_member'
        });
        console.log('✅ Added team member to assignment options:', member.name);
      } else {
        console.log('⚠️ Skipping team member without clerkUserId:', member.name);
      }
    });

    console.log(`✅ Returning ${assignmentOptions.length} assignment options:`, 
      assignmentOptions.map(opt => ({ name: opt.name, type: opt.type })));

    return NextResponse.json({
      success: true,
      data: assignmentOptions
    });

  } catch (error) {
    console.error('❌ Error fetching team members:', error);
    
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
      error: 'Failed to fetch team members'
    }, { status: 500 });
  }
}
