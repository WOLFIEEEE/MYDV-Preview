import { db } from '@/lib/db';
import { dealers, teamMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@clerk/nextjs/server';

/**
 * Get the correct dealer ID for a user (supports team member credential delegation)
 * Team members will get their store owner's dealer ID
 * Store owners will get their own dealer ID
 */
export async function getDealerIdForUser(user: User): Promise<{ success: boolean; dealerId?: string; error?: string }> {
  try {
    // First check if user is a team member
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      // User is a team member - return their store owner's dealer ID
      const dealerId = teamMemberResult[0].storeOwnerId;
      console.log('👥 Team member detected - using store owner dealer ID:', dealerId);
      return { success: true, dealerId };
    }
    
    // User is not a team member - check if they have their own dealer record
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);
    
    if (dealerResult.length > 0) {
      const dealerId = dealerResult[0].id;
      console.log('🏢 Store owner detected - using own dealer ID:', dealerId);
      return { success: true, dealerId };
    }
    
    console.log('❌ No dealer record found for user:', user.id);
    return { success: false, error: 'Dealer record not found' };
  } catch (error) {
    console.error('❌ Error resolving dealer ID:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
