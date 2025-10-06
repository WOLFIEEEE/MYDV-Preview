import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  parseAutoTraderError, 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

export async function POST() {
  console.log('🔑 API Route: Authentication request received');

  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'auth'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'No email address found for the authenticated user',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'auth'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    // Get the correct email to use (store owner's email for team members)
    const configResult = await getStoreConfigForUser(user.id, userEmail);
    let email: string;
    
    if (configResult.success && configResult.storeOwnerEmail) {
      email = configResult.storeOwnerEmail;
      console.log('👥 Using store owner email for auth:', email);
    } else {
      email = userEmail;
      console.log('🏢 Using own email for auth:', email);
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
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 404 }
      );
    }

    const userConfig = storeConfigResult[0];
    
    // Use centralized API credentials from environment variables
    const key = process.env.AUTOTRADER_API_KEY;
    const secret = process.env.AUTOTRADER_SECRET;

    if (!key || !secret) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Missing centralized API credentials',
        details: 'AUTOTRADER_API_KEY or AUTOTRADER_SECRET not configured in environment variables',
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'auth'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 500 }
      );
    }

    // Get base URL from environment variables
    const baseUrl = getAutoTraderBaseUrlForServer();
    console.log('🔍 Using base URL:', baseUrl);
    console.log('🏪 Store config found for:', userConfig.storeName);
    console.log('🔑 Using centralized API credentials');

    const authUrl = `${baseUrl}/authenticate`;
    const authData = { key, secret };

    console.log('📡 Making centralized auth request to:', authUrl);
    console.log('📤 Centralized auth payload:', {
      key: key.substring(0, 8) + '...' + key.substring(key.length - 4),
      secret: secret.substring(0, 8) + '...' + secret.substring(secret.length - 4),
    });

    // Make request to AutoTrader API
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    });

    console.log('📨 AutoTrader response status:', response.status);

    if (!response.ok) {
      const error = await parseAutoTraderError(response, 'auth');
      console.error('❌ AutoTrader auth error:', error);
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.httpStatus }
      );
    }

    const data = await response.json();
    console.log('✅ Authentication successful');
    console.log('📄 Token expires at:', data.expires_at);

    // Include store information in the response
    const responseData = {
      ...data,
      storeInfo: {
        storeName: userConfig.storeName,
        email: userConfig.email
      }
    };

    return NextResponse.json(
      createSuccessResponse(responseData, 'auth')
    );

  } catch (error) {
    console.error('❌ API Route auth error:', error);
    const internalError = createInternalErrorResponse(error, 'auth');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
} 