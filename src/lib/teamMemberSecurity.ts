import { z } from 'zod';
import { db } from '@/lib/db';
import { dealers, teamMembers } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';

// Input validation schemas
export const teamMemberInviteSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email must be less than 255 characters'),
  role: z.enum(['employee', 'sales', 'store_owner_admin'], {
    message: 'Role must be employee, sales, or store_owner_admin'
  }),
  phone: z.string()
    .regex(/^[\+]?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  specialization: z.string()
    .max(255, 'Specialization must be less than 255 characters')
    .optional()
    .or(z.literal(''))
});

export const teamMemberUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  role: z.enum(['employee', 'sales', 'store_owner_admin'], {
    message: 'Role must be employee, sales, or store_owner_admin'
  }).optional(),
  phone: z.string()
    .regex(/^[\+]?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  specialization: z.string()
    .max(255, 'Specialization must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  status: z.enum(['pending', 'active', 'inactive']).optional()
});

// Role hierarchy and permissions
export const ROLE_HIERARCHY = {
  store_owner_admin: 3,
  sales: 2,
  employee: 1
} as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  employee: [
    'view_inventory',
    'create_customer',
    'view_own_tasks'
  ],
  sales: [
    'view_inventory',
    'create_customer',
    'manage_sales',
    'view_reports',
    'view_own_tasks',
    'create_tasks'
  ],
  store_owner_admin: [
    '*' // All permissions
  ]
};

// Security error types
export class TeamMemberSecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TeamMemberSecurityError';
  }
}

export const SECURITY_ERRORS = {
  UNAUTHORIZED: new TeamMemberSecurityError('Unauthorized access', 'UNAUTHORIZED', 403),
  NOT_FOUND: new TeamMemberSecurityError('Team member not found', 'NOT_FOUND', 404),
  INVALID_INPUT: new TeamMemberSecurityError('Invalid input data', 'INVALID_INPUT', 400),
  DUPLICATE_EMAIL: new TeamMemberSecurityError('Email already exists for this store', 'DUPLICATE_EMAIL', 409),
  ROLE_ESCALATION: new TeamMemberSecurityError('Cannot assign higher role than your own', 'ROLE_ESCALATION', 403),
  SELF_MODIFICATION: new TeamMemberSecurityError('Cannot modify your own account', 'SELF_MODIFICATION', 400),
} as const;

// Authorization functions
export async function verifyStoreOwnership(
  clerkUserId: string,
  storeOwnerId: string
): Promise<boolean> {
  try {
    // Check if user is the store owner
    const [dealer] = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(and(
        eq(dealers.clerkUserId, clerkUserId),
        eq(dealers.id, storeOwnerId)
      ))
      .limit(1);

    if (dealer) {
      return true;
    }

    // Check if user is a team member with admin role
    const [teamMember] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.clerkUserId, clerkUserId),
        eq(teamMembers.storeOwnerId, storeOwnerId),
        eq(teamMembers.role, 'store_owner_admin'),
        eq(teamMembers.status, 'active')
      ))
      .limit(1);

    return !!teamMember;
  } catch (error) {
    console.error('Error verifying store ownership:', error);
    return false;
  }
}

export async function getUserRole(
  clerkUserId: string,
  storeOwnerId: string
): Promise<string | null> {
  try {
    // Check if user is the store owner
    const [dealer] = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(and(
        eq(dealers.clerkUserId, clerkUserId),
        eq(dealers.id, storeOwnerId)
      ))
      .limit(1);

    if (dealer) {
      return 'store_owner'; // Highest role
    }

    // Check team member role
    const [teamMember] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.clerkUserId, clerkUserId),
        eq(teamMembers.storeOwnerId, storeOwnerId),
        eq(teamMembers.status, 'active')
      ))
      .limit(1);

    return teamMember?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

export function canAssignRole(
  currentUserRole: string,
  targetRole: string
): boolean {
  const currentLevel = ROLE_HIERARCHY[currentUserRole as keyof typeof ROLE_HIERARCHY] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole as keyof typeof ROLE_HIERARCHY] || 0;
  
  // Store owners can assign any role
  if (currentUserRole === 'store_owner') {
    return true;
  }
  
  // Users can only assign roles lower than or equal to their own
  return currentLevel >= targetLevel;
}

export function hasPermission(
  userRole: string,
  permission: string
): boolean {
  if (userRole === 'store_owner') {
    return true; // Store owners have all permissions
  }
  
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
  return permissions?.includes('*') || permissions?.includes(permission) || false;
}

export async function validateTeamMemberOwnership(
  clerkUserId: string,
  teamMemberId: number
): Promise<{ isOwner: boolean; storeOwnerId?: string; teamMember?: any }> {
  try {
    // Get the team member and verify ownership
    const [teamMember] = await db
      .select({
        id: teamMembers.id,
        storeOwnerId: teamMembers.storeOwnerId,
        clerkUserId: teamMembers.clerkUserId,
        email: teamMembers.email,
        role: teamMembers.role
      })
      .from(teamMembers)
      .where(eq(teamMembers.id, teamMemberId))
      .limit(1);

    if (!teamMember) {
      return { isOwner: false };
    }

    // Check if the requesting user owns this team member
    const isOwner = await verifyStoreOwnership(clerkUserId, teamMember.storeOwnerId);
    
    return {
      isOwner,
      storeOwnerId: teamMember.storeOwnerId,
      teamMember
    };
  } catch (error) {
    console.error('Error validating team member ownership:', error);
    return { isOwner: false };
  }
}

export async function checkDuplicateEmail(
  email: string,
  storeOwnerId: string,
  excludeTeamMemberId?: number
): Promise<boolean> {
  try {
    let whereConditions = and(
      eq(teamMembers.email, email.toLowerCase()),
      eq(teamMembers.storeOwnerId, storeOwnerId)
    );

    if (excludeTeamMemberId) {
      whereConditions = and(
        eq(teamMembers.email, email.toLowerCase()),
        eq(teamMembers.storeOwnerId, storeOwnerId),
        ne(teamMembers.id, excludeTeamMemberId)
      );
    }

    const [existing] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(whereConditions)
      .limit(1);
      
    return !!existing;
  } catch (error) {
    console.error('Error checking duplicate email:', error);
    return false;
  }
}

// Sanitization functions
export function sanitizeTeamMemberInput(input: any): any {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  const sanitized = { ...input };

  // Trim string values
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitized[key].trim();
    }
  });

  // Normalize email
  if (sanitized.email) {
    sanitized.email = sanitized.email.toLowerCase();
  }

  // Remove empty strings for optional fields
  ['phone', 'specialization'].forEach(field => {
    if (sanitized[field] === '') {
      sanitized[field] = undefined;
    }
  });

  return sanitized;
}
