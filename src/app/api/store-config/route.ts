import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';

export async function GET() {
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
        endpoint: 'store-config'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Get store configuration (works for both store owners and team members)
    const userEmail = user.emailAddresses[0]?.emailAddress || '';
    const configResult = await getStoreConfigForUser(user.id, userEmail);

    if (!configResult.success) {
      const configError = {
        type: ErrorType.NOT_FOUND,
        message: 'Store configuration not found',
        details: configResult.error || 'Please contact support to set up your store configuration',
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'store-config'
      };
      return NextResponse.json(
        createErrorResponse(configError),
        { status: 404 }
      );
    }

    // Return the store configuration with advertiser ID
    const storeConfig = configResult.storeConfig;
    const advertiserId = storeConfig.primaryAdvertisementId || storeConfig.advertisementId;

    return NextResponse.json(
      createSuccessResponse({
        ...storeConfig,
        advertiserId,
        primaryAdvertisementId: storeConfig.primaryAdvertisementId,
        advertisementId: storeConfig.advertisementId
      }, 'store-config')
    );

  } catch (error) {
    console.error('❌ Error fetching store config:', error);
    return NextResponse.json(
      createErrorResponse({
        type: ErrorType.SERVER_ERROR,
        message: 'Failed to fetch store configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
        httpStatus: 500,
        timestamp: new Date().toISOString(),
        endpoint: 'store-config'
      }),
      { status: 500 }
    );
  }
}
