import { db } from '@/lib/db';
import { storeConfig, teamMembers, dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface StoreConfigResult {
  success: boolean;
  storeConfig?: any;
  storeOwnerEmail?: string;
  error?: string;
}

/**
 * Get store configuration for both store owners and team members
 * Team members will use their store owner's configuration
 */
export async function getStoreConfigForUser(clerkUserId: string, userEmail: string): Promise<StoreConfigResult> {
  try {
    console.log('🔍 Getting store config for user:', { clerkUserId, userEmail });
    
    // First, check if user is a team member
    const teamMemberResult = await db
      .select({
        id: teamMembers.id,
        storeOwnerId: teamMembers.storeOwnerId,
        role: teamMembers.role
      })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, clerkUserId))
      .limit(1);
    
    if (teamMemberResult.length > 0) {
      // User is a team member - get store owner's config
      const teamMember = teamMemberResult[0];
      console.log('👥 User is team member, getting store owner config:', teamMember.storeOwnerId);
      
      // Get store owner's email from dealers table
      const storeOwnerResult = await db
        .select({ email: dealers.email })
        .from(dealers)
        .where(eq(dealers.id, teamMember.storeOwnerId))
        .limit(1);
      
      if (storeOwnerResult.length === 0) {
        return {
          success: false,
          error: 'Store owner not found for team member'
        };
      }
      
      const storeOwnerEmail = storeOwnerResult[0].email;
      console.log('📧 Store owner email:', storeOwnerEmail);
      
      // Get store config using store owner's email
      const configResult = await db
        .select()
        .from(storeConfig)
        .where(eq(storeConfig.email, storeOwnerEmail))
        .limit(1);
      
      if (configResult.length === 0) {
        return {
          success: false,
          error: 'Store configuration not found for store owner'
        };
      }
      
      console.log('✅ Found store config for team member via store owner');
      return {
        success: true,
        storeConfig: configResult[0],
        storeOwnerEmail
      };
    }
    
    // User is not a team member - check if they have their own store config
    console.log('🏢 User is not team member, checking for direct store config');
    
    // Try by Clerk user ID first
    let configResult = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clerkUserId, clerkUserId))
      .limit(1);
    
    // If not found by Clerk ID, try by email
    if (configResult.length === 0) {
      console.log('🔍 No config found by Clerk ID, trying by email:', userEmail);
      configResult = await db
        .select()
        .from(storeConfig)
        .where(eq(storeConfig.email, userEmail))
        .limit(1);
    }
    
    if (configResult.length === 0) {
      return {
        success: false,
        error: 'Store configuration not found'
      };
    }
    
    console.log('✅ Found direct store config for store owner');
    return {
      success: true,
      storeConfig: configResult[0],
      storeOwnerEmail: userEmail
    };
    
  } catch (error) {
    console.error('❌ Error getting store config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
