import { db } from '@/lib/db';
import { dealers, teamMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

export interface UserRoleInfo {
  userType: 'dealer' | 'team_member';
  role: string;
  storeOwnerId?: string;
  dealerId?: string;
  isStoreOwnerAdmin?: boolean;
}

/**
 * Get user role information from database and sync with Clerk metadata
 * This function prioritizes database truth over Clerk metadata
 */
export async function getUserRoleInfo(clerkUserId: string, userEmail?: string): Promise<UserRoleInfo | null> {
  try {
    console.log('🔍 Getting user role info for:', clerkUserId, userEmail);
    
    // First check if user is a team member
    const teamMemberResult = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        status: teamMembers.status,
        storeOwnerId: teamMembers.storeOwnerId,
        email: teamMembers.email,
        clerkUserId: teamMembers.clerkUserId
      })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, clerkUserId))
      .limit(1);

    if (teamMemberResult.length > 0) {
      const teamMember = teamMemberResult[0];
      console.log('✅ Found team member:', teamMember);
      
      const roleInfo: UserRoleInfo = {
        userType: 'team_member',
        role: teamMember.role,
        storeOwnerId: teamMember.storeOwnerId,
        isStoreOwnerAdmin: teamMember.role === 'store_owner_admin'
      };

      // Update Clerk metadata to match database
      await syncClerkMetadata(clerkUserId, roleInfo);
      return roleInfo;
    }

    // If not a team member, check if user is a dealer
    const dealerResult = await db
      .select({
        id: dealers.id,
        role: dealers.role,
        email: dealers.email,
        clerkUserId: dealers.clerkUserId
      })
      .from(dealers)
      .where(eq(dealers.clerkUserId, clerkUserId))
      .limit(1);

    if (dealerResult.length > 0) {
      const dealer = dealerResult[0];
      console.log('✅ Found dealer:', dealer);
      
      const roleInfo: UserRoleInfo = {
        userType: 'dealer',
        role: dealer.role,
        dealerId: dealer.id
      };

      // Update Clerk metadata to match database
      await syncClerkMetadata(clerkUserId, roleInfo);
      return roleInfo;
    }

    console.log('❌ No user role found in database');
    return null;

  } catch (error) {
    console.error('❌ Error getting user role info:', error);
    return null;
  }
}

/**
 * Sync user role info with Clerk metadata
 */
async function syncClerkMetadata(clerkUserId: string, roleInfo: UserRoleInfo): Promise<void> {
  try {
    const client = await clerkClient();
    const metadata = {
      userType: roleInfo.userType,
      role: roleInfo.role,
      ...(roleInfo.storeOwnerId && { storeOwnerId: roleInfo.storeOwnerId }),
      ...(roleInfo.dealerId && { dealerId: roleInfo.dealerId }),
      ...(roleInfo.isStoreOwnerAdmin !== undefined && { isStoreOwnerAdmin: roleInfo.isStoreOwnerAdmin }),
      lastSynced: new Date().toISOString()
    };

    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: metadata
    });

    console.log('✅ Clerk metadata synced:', metadata);
  } catch (error) {
    console.error('❌ Error syncing Clerk metadata:', error);
  }
}

/**
 * Check if user has settings access
 */
export function hasSettingsAccess(roleInfo: UserRoleInfo | null): boolean {
  if (!roleInfo) return false;
  
  // Dealers have full access
  if (roleInfo.userType === 'dealer') return true;
  
  // Team members only have access if they're store_owner_admin
  if (roleInfo.userType === 'team_member') {
    return roleInfo.role === 'store_owner_admin';
  }
  
  return false;
}

/**
 * Set team member metadata when invited
 */
export async function setTeamMemberMetadata(clerkUserId: string, teamMemberData: {
  role: string;
  storeOwnerId: string;
  teamMemberId: number;
  name: string;
}): Promise<void> {
  try {
    const client = await clerkClient();
    const metadata = {
      userType: 'team_member',
      role: teamMemberData.role,
      storeOwnerId: teamMemberData.storeOwnerId,
      teamMemberId: teamMemberData.teamMemberId,
      isStoreOwnerAdmin: teamMemberData.role === 'store_owner_admin',
      fullName: teamMemberData.name,
      lastSynced: new Date().toISOString()
    };

    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: metadata
    });

    console.log('✅ Team member metadata set:', metadata);
  } catch (error) {
    console.error('❌ Error setting team member metadata:', error);
  }
}
