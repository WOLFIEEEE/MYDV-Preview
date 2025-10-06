import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teamMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ isTeamMember: false, error: 'Email required' }, { status: 400 });
    }
    
    // Check if user exists in team_members table
    const teamMemberCheck = await db
      .select({ 
        id: teamMembers.id, 
        storeOwnerId: teamMembers.storeOwnerId 
      })
      .from(teamMembers)
      .where(eq(teamMembers.email, email))
      .limit(1);
    
    const isTeamMember = teamMemberCheck.length > 0;
    const teamMemberId = isTeamMember ? teamMemberCheck[0].id : null;
    const storeOwnerId = isTeamMember ? teamMemberCheck[0].storeOwnerId : null;
    
    return NextResponse.json({ 
      isTeamMember,
      email,
      teamMemberId,
      storeOwnerId
    });
    
  } catch (error) {
    console.error('❌ Error checking team member status:', error);
    return NextResponse.json({ 
      isTeamMember: false, 
      error: 'Database error' 
    }, { status: 500 });
  }
}
