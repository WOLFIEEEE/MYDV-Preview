// Admin authentication and authorization helper functions
import { currentUser, type User } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse,
  ErrorType,
  type StandardizedError
} from '@/lib/errorHandler';

export interface AdminCheckResult {
  success: boolean;
  user?: User | null;
  isAdmin?: boolean;
  error?: StandardizedError;
}

/**
 * Check if the current user is authenticated and has admin privileges
 * This is the server-side version for API routes
 */
export async function checkAdminAuth(): Promise<AdminCheckResult> {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    
    if (!user) {
      return {
        success: false,
        error: {
          type: ErrorType.AUTHENTICATION,
          message: 'User not authenticated',
          details: 'Please sign in to access this resource',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
          endpoint: 'admin'
        }
      };
    }

    // Get admin emails from environment
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
      ?.split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0) || [];

    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails configured in NEXT_PUBLIC_ADMIN_EMAILS');
      return {
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: 'Admin configuration error',
          details: 'Admin emails not properly configured',
          httpStatus: 500,
          timestamp: new Date().toISOString(),
          endpoint: 'admin'
        }
      };
    }

    const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
    const isAdmin = adminEmails.includes(userEmail);

    // Log admin check for security audit
    console.log('🔍 Admin authentication check:', {
      userEmail: userEmail.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email for logs
      isAdmin,
      timestamp: new Date().toISOString()
    });

    if (!isAdmin) {
      return {
        success: false,
        user,
        isAdmin: false,
        error: {
          type: ErrorType.AUTHENTICATION,
          message: 'Insufficient privileges',
          details: 'Admin access required for this operation',
          httpStatus: 403,
          timestamp: new Date().toISOString(),
          endpoint: 'admin'
        }
      };
    }

    return {
      success: true,
      user,
      isAdmin: true
    };

  } catch (error) {
    console.error('❌ Error in admin authentication check:', error);
    return {
      success: false,
      error: createInternalErrorResponse(error, 'admin')
    };
  }
}

/**
 * Client-side admin check (for use in React components)
 * Returns the admin emails list and a helper function
 */
export function getAdminConfig() {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ?.split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0) || [];

  const isUserAdmin = (userEmail: string): boolean => {
    return adminEmails.includes(userEmail);
  };

  return {
    adminEmails,
    isUserAdmin
  };
}

/**
 * Middleware-style admin check that returns a NextResponse if unauthorized
 * Returns null if authorized, allowing the main function to continue
 */
export async function requireAdmin() {
  const adminCheck = await checkAdminAuth();
  
  if (!adminCheck.success && adminCheck.error) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json(
      createErrorResponse(adminCheck.error),
      { status: adminCheck.error.httpStatus }
    );
  }
  
  if (!adminCheck.success) {
    // Fallback error if no specific error was provided
    const { NextResponse } = await import('next/server');
    const fallbackError: StandardizedError = {
      type: ErrorType.AUTHENTICATION,
      message: 'Authentication failed',
      details: 'Unable to verify admin privileges',
      httpStatus: 401,
      timestamp: new Date().toISOString(),
      endpoint: 'admin'
    };
    return NextResponse.json(
      createErrorResponse(fallbackError),
      { status: 401 }
    );
  }
  
  return null; // Success - continue with the request
}

/**
 * Enhanced admin check with additional role validation
 * Can be extended for more granular permissions in the future
 */
export async function checkAdminWithRole(requiredRole?: string): Promise<AdminCheckResult> {
  const basicCheck = await checkAdminAuth();
  
  if (!basicCheck.success) {
    return basicCheck;
  }

  // For now, all admins have the same privileges
  // In the future, you could check user.publicMetadata.role or similar
  if (requiredRole) {
    // Future enhancement: check specific roles
    console.log(`📋 Role check requested: ${requiredRole} (currently all admins have full access)`);
  }

  return basicCheck;
}
