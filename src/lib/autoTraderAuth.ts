// Centralized AutoTrader authentication with token caching
import TokenCache from '@/lib/tokenCache';
import { 
  parseAutoTraderError, 
  createErrorResponse, 
  createInternalErrorResponse, 
  ErrorType
} from './errorHandler';
import { db } from './db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Token refresh mutex to prevent concurrent token requests
const tokenRefreshMutex = new Map<string, Promise<AuthResult>>();

// Enhanced fetch with timeout for auth requests
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Authentication request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

interface AuthResult {
  success: boolean;
  access_token?: string;
  expires_at?: string;
  storeInfo?: {
    storeName: string;
    email: string;
  };
  error?: unknown;
}

/**
 * Get centralized AutoTrader token using environment variables
 * This is the preferred method for centralized API management
 */
export async function getCentralizedAutoTraderToken(): Promise<AuthResult> {
  try {
    const key = process.env.AUTOTRADER_API_KEY;
    const secret = process.env.AUTOTRADER_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;

    console.log('🔍 Centralized auth check:', {
      hasKey: !!key,
      hasSecret: !!secret,
      baseUrl
    });

    if (!key || !secret || !baseUrl) {
      console.error('❌ Centralized credentials not available:', {
        AUTOTRADER_API_KEY: key ? 'SET' : 'MISSING',
        AUTOTRADER_SECRET: secret ? 'SET' : 'MISSING',
        NEXT_PUBLIC_AUTOTRADER_API_BASE_URL: baseUrl ? 'SET' : 'MISSING'
      });
      return {
        success: false,
        error: 'Centralized API credentials not configured'
      };
    }

    // Check for cached valid token first
    const cachedToken = TokenCache.getCachedToken(key, secret, baseUrl);
    if (cachedToken) {
      console.log('✅ Using cached centralized token');
      return {
        success: true,
        access_token: cachedToken.access_token,
        expires_at: cachedToken.expires_at,
        storeInfo: {
          storeName: 'Centralized',
          email: 'centralized@autotrader.com'
        }
      };
    }

    // Get fresh token using the same method as individual authentication
    console.log('🔄 Fetching fresh centralized token...');
    const tokenUrl = `${baseUrl}/authenticate`;
    const authData = { key, secret };
    
    console.log('📡 Making centralized auth request to:', tokenUrl);
    
    const response = await fetchWithTimeout(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Centralized token request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return {
        success: false,
        error: `Token request failed: ${response.status} ${response.statusText}`
      };
    }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      console.error('❌ No access token in centralized response:', tokenData);
      return {
        success: false,
        error: 'No access token received'
      };
    }

    // Handle expiry time - prefer expires_at if provided by API, otherwise calculate from expires_in
    let expiresAt: string;
    
    if (tokenData.expires_at) {
      // API provided absolute expiry timestamp - use it directly
      expiresAt = tokenData.expires_at;
      console.log('✅ Using expires_at from API:', expiresAt);
    } else {
      // Calculate expiry time from expires_in (duration in seconds)
      // AutoTrader tokens are typically valid for 15 minutes
      const expiresIn = tokenData.expires_in || 900; // 15 minutes default
      expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
      console.log('✅ Calculated expires_at from expires_in:', { expiresIn, expiresAt });
    }

    const remainingMinutes = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000 / 60);
    console.log('✅ Centralized token obtained and cached', {
      expiresAt,
      expiresInMinutes: remainingMinutes
    });

    // Cache the token
    TokenCache.setCachedToken(key, secret, baseUrl, {
      access_token: tokenData.access_token,
      expires_at: expiresAt
    });
    
    return {
      success: true,
      access_token: tokenData.access_token,
      expires_at: expiresAt,
      storeInfo: {
        storeName: 'Centralized',
        email: 'centralized@autotrader.com'
      }
    };

  } catch (error) {
    console.error('❌ Error in centralized token fetch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get a valid AutoTrader access token (cached or fresh)
 * Now uses centralized API credentials from environment variables with fallback to individual keys
 * This function handles all authentication logic and token caching with mutex protection
 * @param email - User email to lookup store configuration (for logging/tracking purposes)
 */
export async function getAutoTraderToken(email: string): Promise<AuthResult> {
  const mutexKey = email || 'centralized';
  
  // Check if token refresh is already in progress for this email
  if (tokenRefreshMutex.has(mutexKey)) {
    console.log('⏳ Token refresh already in progress, waiting...');
    return await tokenRefreshMutex.get(mutexKey)!;
  }
  
  // Start new token refresh with mutex protection
  const refreshPromise = performTokenRefreshWithFallback(email)
    .finally(() => {
      tokenRefreshMutex.delete(mutexKey);
      console.log('🔓 Token refresh mutex released for:', email || 'centralized');
    });
    
  tokenRefreshMutex.set(mutexKey, refreshPromise);
  return await refreshPromise;
}

/**
 * Perform token refresh with centralized-first approach and fallback to individual keys
 */
async function performTokenRefreshWithFallback(email: string): Promise<AuthResult> {
  console.log('🔄 Starting token refresh with centralized-first approach...');
  
  // Try centralized authentication first
  const centralizedResult = await getCentralizedAutoTraderToken();
  if (centralizedResult.success) {
    console.log('✅ Using centralized authentication');
    return centralizedResult;
  }
  
  console.warn('⚠️ Centralized authentication failed, falling back to individual keys:', centralizedResult.error);
  
  // Fallback to individual key authentication
  return await performTokenRefresh(email);
}

/**
 * Internal function to perform the actual token refresh using individual store config keys
 * This is the fallback method when centralized credentials are not available
 */
async function performTokenRefresh(email: string): Promise<AuthResult> {
  try {
    if (!email) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Missing user email',
        details: 'Email is required to lookup store configuration',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'auth'
      };
      return {
        success: false,
        error: createErrorResponse(authError)
      };
    }

    console.log('🔍 Looking up store config for email:', email);

    // Get store configuration from database (only need store info, not API keys)
    const storeConfigResult = await db
      .select({
        storeName: storeConfig.storeName,
        email: storeConfig.email
      })
      .from(storeConfig)
      .where(eq(storeConfig.email, email))
      .limit(1);

    if (storeConfigResult.length === 0) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Store configuration not found',
        details: `No store configuration found for email: ${email}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'auth'
      };
      return {
        success: false,
        error: createErrorResponse(authError)
      };
    }

    const userConfig = storeConfigResult[0];
    
    // Get store configuration with individual API keys (fallback method)
    const fullStoreConfig = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, email))
      .limit(1);

    if (fullStoreConfig.length === 0) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Store configuration not found',
        details: `No store configuration found for email: ${email}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'auth'
      };
      return {
        success: false,
        error: createErrorResponse(authError)
      };
    }

    const config = fullStoreConfig[0];
    
    // Use individual API keys from store config
    const key = config.autotraderKey;
    const secret = config.autotraderSecret;

    console.log('🔍 Individual API keys check:', {
      hasKey: !!key,
      hasSecret: !!secret,
      keyLength: key ? key.length : 0,
      secretLength: secret ? secret.length : 0,
      email: email
    });

    if (!key || !secret) {
      console.error('❌ Missing individual API keys for user:', {
        email: email,
        autotraderKey: key ? 'SET' : 'MISSING',
        autotraderSecret: secret ? 'SET' : 'MISSING'
      });
      
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Missing individual API credentials',
        details: `No AutoTrader API keys configured for email: ${email}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'auth'
      };
      return {
        success: false,
        error: createErrorResponse(authError)
      };
    }

    // Get base URL from environment variables only
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    
    if (!baseUrl) {
      console.error('❌ Base URL not configured');
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'AutoTrader API base URL not configured',
        details: 'NEXT_PUBLIC_AUTOTRADER_API_BASE_URL environment variable is missing',
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'auth'
      };
      return {
        success: false,
        error: createErrorResponse(authError)
      };
    }
    
    console.log('🔍 Using base URL:', baseUrl);
    console.log('🏪 Store config found for:', userConfig.storeName);
    console.log('🔑 Using centralized API credentials');

    // Check for cached valid token first (now using centralized credentials)
    const cachedToken = TokenCache.getCachedToken(key, secret, baseUrl);
    if (cachedToken) {
      console.log('✅ Using cached token');
      return {
        success: true,
        access_token: cachedToken.access_token,
        expires_at: cachedToken.expires_at,
        storeInfo: {
          storeName: userConfig.storeName,
          email: userConfig.email
        }
      };
    }

    // No valid cached token, authenticate with AutoTrader
    console.log('🔑 Authenticating with AutoTrader API...');
    const authUrl = `${baseUrl}/authenticate`;
    const authData = { key, secret };

    console.log('📡 Making auth request to:', authUrl);

    const authResponse = await fetchWithTimeout(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    }, 15000); // 15 second timeout for auth requests

    console.log('📨 Auth response status:', authResponse.status);

    if (!authResponse.ok) {
      const error = await parseAutoTraderError(authResponse, 'auth');
      console.error('❌ Authentication failed:', error);
      return {
        success: false,
        error: createErrorResponse(error)
      };
    }

    const tokenData = await authResponse.json();
    
    // Handle expiry time - prefer expires_at if provided by API, otherwise calculate from expires_in
    let expiresAt: string;
    
    if (tokenData.expires_at) {
      // API provided absolute expiry timestamp - use it directly
      expiresAt = tokenData.expires_at;
      console.log('✅ Using expires_at from API:', expiresAt);
    } else {
      // Calculate expiry time from expires_in (duration in seconds)
      // AutoTrader tokens are typically valid for 15 minutes
      const expiresIn = tokenData.expires_in || 900; // 15 minutes default
      expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
      console.log('✅ Calculated expires_at from expires_in:', { expiresIn, expiresAt });
    }

    const remainingMinutes = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000 / 60);
    console.log('✅ New token obtained and cached', {
      expiresAt,
      expiresInMinutes: remainingMinutes
    });

    // Cache the new token with expiry
    TokenCache.setCachedToken(key, secret, baseUrl, {
      access_token: tokenData.access_token,
      expires_at: expiresAt
    });

    return {
      success: true,
      access_token: tokenData.access_token,
      expires_at: expiresAt,
      storeInfo: {
        storeName: userConfig.storeName,
        email: userConfig.email
      }
    };

  } catch (error) {
    console.error('❌ Token acquisition error:', error);
    const internalError = createInternalErrorResponse(error, 'auth');
    return {
      success: false,
      error: createErrorResponse(internalError)
    };
  }
}


/**
 * Clear the token cache (useful for testing or when credentials change)
 */
export function clearTokenCache(): void {
  TokenCache.clearCache();
}

/**
 * Invalidate a specific token (used when receiving 401 errors)
 */
export function invalidateToken(key: string, secret: string, baseUrl: string): void {
  TokenCache.invalidateToken(key, secret, baseUrl);
  console.log('🗑️ Token invalidated due to authentication failure');
}

/**
 * Invalidate token by email (safer than clearing all tokens)
 */
export async function invalidateTokenByEmail(email: string): Promise<void> {
  try {
    // Get user config to find the specific token to invalidate
    const userConfig = await db
      .select({
        autotraderKey: storeConfig.autotraderKey,
        autotraderSecret: storeConfig.autotraderSecret
      })
      .from(storeConfig)
      .where(eq(storeConfig.email, email))
      .limit(1);

    if (userConfig.length > 0) {
      const { autotraderKey, autotraderSecret } = userConfig[0];
      if (autotraderKey && autotraderSecret) {
        const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
        if (baseUrl) {
          TokenCache.invalidateToken(autotraderKey, autotraderSecret, baseUrl);
          console.log('🗑️ Token invalidated for user:', email);
        } else {
          console.warn('⚠️ Cannot invalidate token: base URL not configured');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error invalidating token by email:', error);
  }
}

/**
 * Get token cache statistics
 */
export function getTokenCacheStats() {
  return TokenCache.getCacheStats();
} 