import { db } from '@/lib/db';
import { teamMembers, dealers, type TeamMember, type NewTeamMember } from '@/db/schema';
import { eq, and, desc, ne, sql } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import {
  teamMemberInviteSchema,
  teamMemberUpdateSchema,
  verifyStoreOwnership,
  getUserRole,
  canAssignRole,
  validateTeamMemberOwnership,
  checkDuplicateEmail,
  sanitizeTeamMemberInput,
  TeamMemberSecurityError,
  SECURITY_ERRORS
} from './teamMemberSecurity';
import { sendTeamMemberInvitation } from './database';

// Secure team member invitation with full validation and authorization
export async function createSecureTeamMemberInvitation(
  requestingClerkUserId: string,
  storeOwnerId: string,
  inviteData: {
    name: string;
    email: string;
    role: string;
    phone?: string;
    specialization?: string;
  }
) {
  try {
    console.log('🔒 Starting secure team member invitation process');
    console.log('👤 Requesting user:', requestingClerkUserId);
    console.log('🏪 Store owner ID:', storeOwnerId);

    // 1. Verify authorization - user must own the store
    const hasPermission = await verifyStoreOwnership(requestingClerkUserId, storeOwnerId);
    if (!hasPermission) {
      throw SECURITY_ERRORS.UNAUTHORIZED;
    }

    // 2. Get requesting user's role for role assignment validation
    const requestingUserRole = await getUserRole(requestingClerkUserId, storeOwnerId);
    if (!requestingUserRole) {
      throw SECURITY_ERRORS.UNAUTHORIZED;
    }

    // 3. Sanitize input data
    const sanitizedData = sanitizeTeamMemberInput(inviteData);

    // 4. Validate input data
    const validatedData = teamMemberInviteSchema.parse(sanitizedData);

    // 5. Check role assignment permissions
    if (!canAssignRole(requestingUserRole, validatedData.role)) {
      throw SECURITY_ERRORS.ROLE_ESCALATION;
    }

    // 6. Check for duplicate email within the store
    const isDuplicate = await checkDuplicateEmail(validatedData.email, storeOwnerId);
    if (isDuplicate) {
      throw SECURITY_ERRORS.DUPLICATE_EMAIL;
    }

    // 7. Send Clerk invitation
    const invitationResult = await sendTeamMemberInvitation(
      validatedData.email,
      validatedData.role,
      storeOwnerId
    );

    if (!invitationResult.success) {
      throw new TeamMemberSecurityError(
        `Failed to send invitation: ${invitationResult.error}`,
        'INVITATION_FAILED',
        500
      );
    }

    // 8. Create team member record in database
    const [newTeamMember] = await db
      .insert(teamMembers)
      .values({
        storeOwnerId,
        name: validatedData.name,
        email: invitationResult.email!,
        phone: validatedData.phone || null,
        role: validatedData.role,
        status: invitationResult.existingUser ? 'active' : 'pending',
        invitationStatus: invitationResult.existingUser ? 'accepted' : 'invited',
        clerkInvitationId: invitationResult.invitationId!,
        clerkUserId: invitationResult.existingUser ? invitationResult.userId : null,
        specialization: validatedData.specialization || 
          (validatedData.role === 'sales' ? 'General Sales' : 'Operations'),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log('✅ Secure team member invitation created successfully');

    return {
      success: true,
      teamMember: newTeamMember,
      invitationId: invitationResult.invitationId,
      existingUser: invitationResult.existingUser || false
    };

  } catch (error) {
    console.error('❌ Error in secure team member invitation:', error);
    
    if (error instanceof TeamMemberSecurityError) {
      throw error;
    }
    
    if (error instanceof Error && error.name === 'ZodError') {
      throw new TeamMemberSecurityError(
        `Validation error: ${error.message}`,
        'VALIDATION_ERROR',
        400
      );
    }

    throw new TeamMemberSecurityError(
      'Failed to create team member invitation',
      'INTERNAL_ERROR',
      500
    );
  }
}

// Secure team member update with authorization and validation
export async function updateSecureTeamMember(
  requestingClerkUserId: string,
  teamMemberId: number,
  updates: Partial<NewTeamMember>
) {
  try {
    console.log('🔒 Starting secure team member update');
    console.log('👤 Requesting user:', requestingClerkUserId);
    console.log('🆔 Team member ID:', teamMemberId);

    // 1. Validate team member ownership and get current data
    const ownershipCheck = await validateTeamMemberOwnership(requestingClerkUserId, teamMemberId);
    if (!ownershipCheck.isOwner || !ownershipCheck.teamMember) {
      throw SECURITY_ERRORS.UNAUTHORIZED;
    }

    const currentMember = ownershipCheck.teamMember;
    const storeOwnerId = ownershipCheck.storeOwnerId!;

    // 2. Prevent self-modification (optional security measure)
    if (currentMember.clerkUserId === requestingClerkUserId) {
      throw SECURITY_ERRORS.SELF_MODIFICATION;
    }

    // 3. Get requesting user's role for role assignment validation
    const requestingUserRole = await getUserRole(requestingClerkUserId, storeOwnerId);
    if (!requestingUserRole) {
      throw SECURITY_ERRORS.UNAUTHORIZED;
    }

    // 4. Sanitize input data
    const sanitizedUpdates = sanitizeTeamMemberInput(updates);

    // 5. Validate input data
    const validatedUpdates = teamMemberUpdateSchema.parse(sanitizedUpdates);

    // 6. Check role assignment permissions if role is being changed
    if (validatedUpdates.role && validatedUpdates.role !== currentMember.role) {
      if (!canAssignRole(requestingUserRole, validatedUpdates.role)) {
        throw SECURITY_ERRORS.ROLE_ESCALATION;
      }
    }

    // 7. Check for duplicate email if email is being changed
    if (validatedUpdates.email && validatedUpdates.email !== currentMember.email) {
      const isDuplicate = await checkDuplicateEmail(
        validatedUpdates.email,
        storeOwnerId,
        teamMemberId
      );
      if (isDuplicate) {
        throw SECURITY_ERRORS.DUPLICATE_EMAIL;
      }
    }

    // 8. Update the team member in database
    const [updatedMember] = await db
      .update(teamMembers)
      .set({ 
        ...validatedUpdates, 
        updatedAt: new Date() 
      })
      .where(eq(teamMembers.id, teamMemberId))
      .returning();

    // 9. Update Clerk metadata if role changed and user is active
    if (updatedMember.clerkUserId && 
        validatedUpdates.role && 
        validatedUpdates.role !== currentMember.role) {
      
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(updatedMember.clerkUserId, {
          publicMetadata: {
            role: validatedUpdates.role,
            userType: 'team_member',
            storeOwnerId: updatedMember.storeOwnerId,
            teamMemberId: updatedMember.id
          }
        });
        console.log('✅ Clerk metadata updated successfully');
      } catch (clerkError) {
        console.error('❌ Error updating Clerk metadata:', clerkError);
        // Don't fail the operation if Clerk update fails
      }
    }

    console.log('✅ Secure team member update completed successfully');

    return {
      success: true,
      teamMember: updatedMember
    };

  } catch (error) {
    console.error('❌ Error in secure team member update:', error);
    
    if (error instanceof TeamMemberSecurityError) {
      throw error;
    }
    
    if (error instanceof Error && error.name === 'ZodError') {
      throw new TeamMemberSecurityError(
        `Validation error: ${error.message}`,
        'VALIDATION_ERROR',
        400
      );
    }

    throw new TeamMemberSecurityError(
      'Failed to update team member',
      'INTERNAL_ERROR',
      500
    );
  }
}

// Secure team member removal with authorization
export async function removeSecureTeamMember(
  requestingClerkUserId: string,
  teamMemberId: number
) {
  try {
    console.log('🔒 Starting secure team member removal');
    console.log('👤 Requesting user:', requestingClerkUserId);
    console.log('🆔 Team member ID:', teamMemberId);

    // 1. Validate team member ownership and get current data
    const ownershipCheck = await validateTeamMemberOwnership(requestingClerkUserId, teamMemberId);
    if (!ownershipCheck.isOwner || !ownershipCheck.teamMember) {
      throw SECURITY_ERRORS.UNAUTHORIZED;
    }

    const currentMember = ownershipCheck.teamMember;

    // 2. Prevent self-deletion
    if (currentMember.clerkUserId === requestingClerkUserId) {
      throw SECURITY_ERRORS.SELF_MODIFICATION;
    }

    // 3. Remove team member from database
    const [deletedMember] = await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, teamMemberId))
      .returning();

    // 4. Update Clerk metadata to revoke access (if user is active)
    if (deletedMember.clerkUserId) {
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(deletedMember.clerkUserId, {
          publicMetadata: {
            role: null,
            userType: null,
            storeOwnerId: null,
            teamMemberId: null
          }
        });
        console.log('✅ Clerk access revoked successfully');
      } catch (clerkError) {
        console.error('❌ Error revoking Clerk access:', clerkError);
        // Don't fail the operation if Clerk update fails
      }
    }

    console.log('✅ Secure team member removal completed successfully');

    return {
      success: true,
      teamMember: deletedMember
    };

  } catch (error) {
    console.error('❌ Error in secure team member removal:', error);
    
    if (error instanceof TeamMemberSecurityError) {
      throw error;
    }

    throw new TeamMemberSecurityError(
      'Failed to remove team member',
      'INTERNAL_ERROR',
      500
    );
  }
}

// Secure team member list with authorization
export async function getSecureTeamMembers(
  requestingClerkUserId: string,
  storeOwnerId: string,
  options: {
    includeInactive?: boolean;
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  } = {}
): Promise<{
  members: TeamMember[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  try {
    console.log('🔒 Starting secure team member list');
    console.log('👤 Requesting user:', requestingClerkUserId);
    console.log('🏪 Store owner ID:', storeOwnerId);

    // 1. Verify authorization
    const hasPermission = await verifyStoreOwnership(requestingClerkUserId, storeOwnerId);
    if (!hasPermission) {
      throw SECURITY_ERRORS.UNAUTHORIZED;
    }

    // 2. Build where conditions
    const whereConditions = [eq(teamMembers.storeOwnerId, storeOwnerId)];

    // Add status filter
    if (!options.includeInactive) {
      whereConditions.push(eq(teamMembers.status, 'active'));
    }

    // Add role filter
    if (options.role) {
      whereConditions.push(eq(teamMembers.role, options.role));
    }

    // Build query with all conditions
    const query = db
      .select({
        id: teamMembers.id,
        storeOwnerId: teamMembers.storeOwnerId,
        name: teamMembers.name,
        email: teamMembers.email,
        phone: teamMembers.phone,
        role: teamMembers.role,
        status: teamMembers.status,
        clerkUserId: teamMembers.clerkUserId,
        clerkInvitationId: teamMembers.clerkInvitationId,
        invitationStatus: teamMembers.invitationStatus,
        specialization: teamMembers.specialization,
        createdAt: teamMembers.createdAt,
        updatedAt: teamMembers.updatedAt,
        // Add missing fields with default values
        salesCount: sql<number>`0`.as('salesCount'),
        performance: sql<number>`0`.as('performance'),
        revenue: sql<number>`0`.as('revenue')
      })
      .from(teamMembers)
      .where(and(...whereConditions));

    // 3. Execute query with pagination if requested
    if (options.page && options.limit) {
      const offset = (options.page - 1) * options.limit;
      
      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(teamMembers)
        .where(eq(teamMembers.storeOwnerId, storeOwnerId));

      const members = await query
        .limit(options.limit)
        .offset(offset)
        .orderBy(desc(teamMembers.createdAt));

      return {
        members,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: Number(count),
          pages: Math.ceil(Number(count) / options.limit)
        }
      };
    }

    // 4. Execute query without pagination
    const members = await query.orderBy(desc(teamMembers.createdAt));

    console.log(`✅ Retrieved ${members.length} team members securely`);

    return { members };

  } catch (error) {
    console.error('❌ Error in secure team member list:', error);
    
    if (error instanceof TeamMemberSecurityError) {
      throw error;
    }

    throw new TeamMemberSecurityError(
      'Failed to retrieve team members',
      'INTERNAL_ERROR',
      500
    );
  }
}
