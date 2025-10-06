import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { 
  createInternalErrorResponse
} from '@/lib/errorHandler';
import { db } from '@/lib/db';
import { dealers } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Define proper types for user metadata
interface UserPublicMetadata {
  userType?: string;
  storeOwnerId?: string;
  role?: string;
  [key: string]: unknown;
}

type AuthTestErrorType = 'NO_STORE_CONFIG' | 'MISSING_KEYS' | 'INVALID_KEYS' | 'KEYS_NOT_ACTIVATED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

export interface AuthTestError {
  type: AuthTestErrorType;
  title: string;
  message: string;
  details: string;
  suggestions: string[];
}

export interface AuthTestResult {
  success: boolean;
  authenticated: boolean;
  error?: AuthTestError;
  storeInfo?: {
    storeName: string;
    email: string;
  };
}

export async function GET(): Promise<NextResponse<AuthTestResult>> {
  console.log('🧪 API Route: AutoTrader authentication test request received');

  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: {
          type: 'UNKNOWN_ERROR',
          title: 'Authentication Required',
          message: 'You must be signed in to test AutoTrader authentication',
          details: 'Please sign in to your account and try again',
          suggestions: [
            'Sign in to your account',
            'Contact support if you continue to have issues'
          ]
        }
      }, { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: {
          type: 'UNKNOWN_ERROR',
          title: 'Email Address Missing',
          message: 'No email address found for your account',
          details: 'Your account must have a valid email address',
          suggestions: [
            'Update your account email address',
            'Contact support for assistance'
          ]
        }
      }, { status: 400 });
    }

    console.log('🔍 Testing AutoTrader authentication for email:', email);

    // FIXED: Handle team members - they should use their store owner's email for auth
    const userMetadata = user.publicMetadata as UserPublicMetadata;
    const userType = userMetadata?.userType;
    const storeOwnerId = userMetadata?.storeOwnerId;
    
    let emailForAuth = email;
    
    if (userType === 'team_member' && storeOwnerId) {
      console.log('👥 Team member detected - finding store owner email for auth test');
      
      // Get store owner's email from dealer record
      const storeOwnerResult = await db
        .select({ email: dealers.email })
        .from(dealers)
        .where(eq(dealers.id, storeOwnerId))
        .limit(1);
      
      if (storeOwnerResult.length > 0) {
        emailForAuth = storeOwnerResult[0].email;
        console.log('✅ Using store owner email for auth test:', emailForAuth);
      } else {
        console.log('⚠️ Store owner not found, using team member email');
      }
    }

    // Test AutoTrader authentication
    const authResult = await getAutoTraderToken(emailForAuth);
    
    if (authResult.success && authResult.access_token) {
      console.log('✅ AutoTrader authentication test successful');
      return NextResponse.json({
        success: true,
        authenticated: true,
        storeInfo: authResult.storeInfo
      });
    }

    // Authentication failed - analyze the error to provide helpful feedback
    console.log('❌ AutoTrader authentication test failed:', authResult.error);
    
    const errorResponse = authResult.error;
    let errorType: AuthTestErrorType = 'UNKNOWN_ERROR';
    let title = 'AutoTrader Authentication Failed';
    let message = 'Unable to authenticate with AutoTrader';
    let details = 'An unknown error occurred during authentication';
    let suggestions = ['Contact your administrator for assistance'];

    // Analyze the error to provide specific guidance with proper type checking
    const errorMessage = errorResponse && typeof errorResponse === 'object' && 'error' in errorResponse 
      ? (errorResponse.error as { message?: string; httpStatus?: number }).message 
      : '';
    const errorStatus = errorResponse && typeof errorResponse === 'object' && 'error' in errorResponse 
      ? (errorResponse.error as { message?: string; httpStatus?: number }).httpStatus 
      : undefined;

    if (errorMessage?.includes('Store configuration not found')) {
      errorType = 'NO_STORE_CONFIG';
      title = 'No Store Configuration Found';
      message = 'Your account has not been set up with AutoTrader access yet';
      details = `No store configuration found for your email address: ${email}`;
      suggestions = [
        'Contact your administrator to set up your AutoTrader access',
        'Ensure you are using the correct email address',
        'Check if your account has been approved for AutoTrader integration'
      ];
    } else if (errorMessage?.includes('Missing API credentials')) {
      errorType = 'MISSING_KEYS';
      title = 'AutoTrader Keys Not Assigned';
      message = 'Your store configuration exists but AutoTrader API keys are missing';
      details = 'AutoTrader API key or secret not configured for your store';
      suggestions = [
        'Contact your administrator to assign AutoTrader API keys',
        'Ensure your store has been properly configured',
        'Check if your AutoTrader integration is complete'
      ];
    } else if (errorStatus === 401 || errorStatus === 403) {
      errorType = 'INVALID_KEYS';
      title = 'Invalid AutoTrader Credentials';
      message = 'Your AutoTrader API keys appear to be incorrect or expired';
      details = 'The API keys configured for your account are not valid';
      suggestions = [
        'Contact your administrator to verify your AutoTrader API keys',
        'Check if your AutoTrader keys have expired',
        'Ensure the keys are correctly configured in your store settings'
      ];
    } else if (errorMessage?.includes('not activated') || errorMessage?.includes('suspended')) {
      errorType = 'KEYS_NOT_ACTIVATED';
      title = 'AutoTrader Account Not Activated';
      message = 'Your AutoTrader API keys exist but your account may not be activated';
      details = 'Your AutoTrader integration may be pending activation or has been suspended';
      suggestions = [
        'Contact AutoTrader support to activate your API access',
        'Verify your AutoTrader account status',
        'Contact your administrator to check integration status'
      ];
    } else if (errorMessage?.includes('network') || errorMessage?.includes('timeout')) {
      errorType = 'NETWORK_ERROR';
      title = 'Connection Error';
      message = 'Unable to connect to AutoTrader services';
      details = 'There may be a temporary network issue or AutoTrader services may be unavailable';
      suggestions = [
        'Try again in a few minutes',
        'Check your internet connection',
        'Contact support if the problem persists'
      ];
    }

    return NextResponse.json({
      success: false,
      authenticated: false,
      error: {
        type: errorType,
        title,
        message,
        details,
        suggestions
      }
    }, { status: 200 }); // Return 200 so the client can handle the error gracefully

  } catch (error) {
    console.error('❌ Error testing AutoTrader authentication:', error);
    
    // Use standardized internal error response for consistency
    const internalError = createInternalErrorResponse(error, 'auth/test');
    
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: {
        type: 'UNKNOWN_ERROR' as AuthTestErrorType,
        title: 'System Error',
        message: 'An unexpected error occurred while testing authentication',
        details: internalError.details || 'Unknown system error',
        suggestions: [
          'Try refreshing the page',
          'Contact support if the problem persists',
          'Check system status'
        ]
      }
    }, { status: 500 });
  }
}
