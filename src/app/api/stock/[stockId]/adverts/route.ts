import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createErrorResponse, createInternalErrorResponse, ErrorType, parseAutoTraderError } from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { StockCacheService } from '@/lib/stockCacheService';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

interface AdvertsUpdateRequest {
  adverts?: {
    forecourtPrice?: {
      amountGBP?: number;
    };
    suppliedPrice?: {
      amountGBP?: number;
    };
    forecourtPriceVatStatus?: string;
    attentionGrabber?: string;
    reservationStatus?: string;
    retailAdverts?: {
      description?: string;
      description2?: string;
      suppliedPrice?: {
        amountGBP?: number;
      };
      vatStatus?: string;
      attentionGrabber?: string;
      displayOptions?: {
        excludePreviousOwners?: boolean;
        excludeStrapline?: boolean;
        excludeMot?: boolean;
        excludeWarranty?: boolean;
        excludeInteriorDetails?: boolean;
        excludeTyreCondition?: boolean;
        excludeBodyCondition?: boolean;
      };
      autotraderAdvert?: {
        status?: string;
      };
      advertiserAdvert?: {
        status?: string;
      };
      locatorAdvert?: {
        status?: string;
      };
      exportAdvert?: {
        status?: string;
      };
      profileAdvert?: {
        status?: string;
      };
    };
    tradeAdverts?: {
      dealerAuctionAdvert?: {
        status?: string;
      };
    };
  };
  metadata?: {
    lifecycleState?: string;
  };
}

function validateAdvertsUpdateRequest(body: unknown): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body is required' };
  }

  const bodyObj = body as Record<string, unknown>;

  // At least one section must be provided
  if (!bodyObj.adverts && !bodyObj.metadata) {
    return { isValid: false, error: 'At least one of adverts or metadata must be provided' };
  }

  // Validate adverts section if provided
  if (bodyObj.adverts && typeof bodyObj.adverts !== 'object') {
    return { isValid: false, error: 'Adverts data must be an object' };
  }

  // Validate metadata section if provided
  if (bodyObj.metadata && typeof bodyObj.metadata !== 'object') {
    return { isValid: false, error: 'Metadata must be an object' };
  }

  return { isValid: true };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    // Authentication
    const user = await currentUser();
    if (!user) {
      console.log('❌ Authentication failed - no user found');
      return NextResponse.json(createErrorResponse({
        type: ErrorType.AUTHENTICATION,
        message: 'Authentication required',
        details: 'Please sign in to access this endpoint',
        httpStatus: 401,
        timestamp: new Date().toISOString()
      }), { status: 401 });
    }

    // Extract parameters
    const { stockId } = await params;
    const { searchParams } = new URL(request.url);
    const advertiserId = searchParams.get('advertiserId');

    if (!advertiserId) {
      console.log('❌ Missing advertiserId parameter');
      return NextResponse.json(createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'advertiserId is required as a query parameter',
        httpStatus: 400,
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }

    // Parse and validate request body
    let requestBody: AdvertsUpdateRequest;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.log('❌ Failed to parse request body:', error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid JSON in request body',
        httpStatus: 400,
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }

    const validationResult = validateAdvertsUpdateRequest(requestBody);
    if (!validationResult.isValid) {
      console.log('❌ Request body validation failed:', validationResult.error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.VALIDATION,
        message: validationResult.error || 'Invalid request body',
        httpStatus: 400,
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }

    // Get original stock data for comparison
    let originalStock;
    try {
      originalStock = await StockCacheService.getStockById(stockId, user.id);
    } catch (error) {
      console.error('Error fetching stock from cache:', error);
      return NextResponse.json(createErrorResponse({
        type: ErrorType.SERVER_ERROR,
        message: 'Failed to fetch stock data',
        details: error instanceof Error ? error.message : 'Unknown error',
        httpStatus: 500,
        timestamp: new Date().toISOString()
      }), { status: 500 });
    }

    if (!originalStock) {
      return NextResponse.json(createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Stock not found',
        httpStatus: 404,
        timestamp: new Date().toISOString()
      }), { status: 404 });
    }

    // Parse original data
    const originalAdvertsData = originalStock.advertsData || originalStock.adverts || {};
    const originalVehicleData = originalStock.vehicleData || originalStock.vehicle || {};
    const originalMetadata = originalStock.metadataRaw || originalStock.metadata || {};
    const originalRetailAdverts = originalAdvertsData.retailAdverts || {};

    // Determine vehicle type for VAT calculations
    const vehicleType = (originalVehicleData.vehicleType || '').toLowerCase();
    const isCar = vehicleType === 'car';

    // Build payload with only changed values
    const payload: Record<string, unknown> = {};
    const advertsChanges: Record<string, unknown> = {};
    const retailAdvertsChanges: Record<string, unknown> = {};

    if (requestBody.adverts) {
      const adverts = requestBody.adverts;

      // Process forecourt price
      if (adverts.forecourtPrice?.amountGBP !== undefined) {
        const newListing = parseFloat(String(adverts.forecourtPrice.amountGBP));
        const origListing = parseFloat(String(originalAdvertsData.forecourtPrice?.amountGBP || 0));

        if (newListing !== origListing) {
          advertsChanges.forecourtPrice = { amountGBP: newListing };
        }

        // Handle supplied price for cars - use client-provided value
        if (isCar && adverts.suppliedPrice?.amountGBP !== undefined) {
          const newSupplied = parseFloat(String(adverts.suppliedPrice.amountGBP));
          const origSupplied = parseFloat(String(originalRetailAdverts.suppliedPrice?.amountGBP || 0));
          
          // Only update if value changed and meets API minimum
          if (newSupplied >= 75 && newSupplied !== origSupplied) {
            retailAdvertsChanges.suppliedPrice = { amountGBP: newSupplied };
          }
        }
      }

      // Handle VAT status changes
      if (adverts.forecourtPriceVatStatus !== undefined) {
        const newVatStatus = adverts.forecourtPriceVatStatus;
        const origForecourtVat = originalAdvertsData.forecourtPriceVatStatus;

        if (newVatStatus !== origForecourtVat) {
          advertsChanges.forecourtPriceVatStatus = newVatStatus;
        }
      }

      // Process attention grabber
      if (adverts.attentionGrabber !== undefined) {
        const newValue = String(adverts.attentionGrabber).trim();
        const origValue = originalAdvertsData.attentionGrabber || originalRetailAdverts.attentionGrabber || '';
        if (newValue !== origValue) {
          advertsChanges.attentionGrabber = newValue;
          retailAdvertsChanges.attentionGrabber = newValue;
        }
      }

      // Process reservation status
      if (adverts.reservationStatus !== undefined) {
        const newValue = String(adverts.reservationStatus).trim();
        const origValue = originalAdvertsData.reservationStatus || '';
        if (newValue !== origValue) {
          advertsChanges.reservationStatus = newValue;
        }
      }

      // Process retail adverts
      if (adverts.retailAdverts) {
        const retailAdverts = adverts.retailAdverts;

        // Description
        if (retailAdverts.description !== undefined) {
          const newValue = String(retailAdverts.description).trim();
          const origValue = originalRetailAdverts.description || '';
          if (newValue !== origValue) {
            retailAdvertsChanges.description = newValue;
          }
        }

        // Description 2
        if (retailAdverts.description2 !== undefined) {
          const newValue = String(retailAdverts.description2).trim();
          const origValue = originalRetailAdverts.description2 || '';
          if (newValue !== origValue) {
            retailAdvertsChanges.description2 = newValue;
          }
        }

        // VAT Status
        if (retailAdverts.vatStatus !== undefined) {
          const newValue = retailAdverts.vatStatus;
          const origValue = originalRetailAdverts.vatStatus;
          if (newValue !== origValue) {
            retailAdvertsChanges.vatStatus = newValue;
          }
        }

        // Display options
        if (retailAdverts.displayOptions) {
          const displayOptions = [
            'excludePreviousOwners', 'excludeStrapline', 'excludeMot', 'excludeWarranty',
            'excludeInteriorDetails', 'excludeTyreCondition', 'excludeBodyCondition'
          ];

          const displayChanges: Record<string, boolean> = {};
          for (const option of displayOptions) {
            const newValue = Boolean(retailAdverts.displayOptions[option as keyof typeof retailAdverts.displayOptions]);
            const origValue = Boolean(originalRetailAdverts.displayOptions?.[option]);

            if (newValue !== origValue) {
              displayChanges[option] = newValue;
            }
          }

          if (Object.keys(displayChanges).length > 0) {
            retailAdvertsChanges.displayOptions = displayChanges;
          }
        }

        // Advert channels
        const channels = ['autotraderAdvert', 'advertiserAdvert', 'locatorAdvert', 'exportAdvert', 'profileAdvert'];
        for (const channel of channels) {
          const channelData = retailAdverts[channel as keyof typeof retailAdverts] as { status?: string } | undefined;
          if (channelData?.status !== undefined) {
            const newValue = String(channelData.status);
            const origValue = originalRetailAdverts[channel]?.status || '';
            if (newValue !== origValue) {
              if (!retailAdvertsChanges[channel]) {
                retailAdvertsChanges[channel] = {};
              }
              (retailAdvertsChanges[channel] as Record<string, unknown>).status = newValue;
            }
          }
        }
      }

      // Process reservation status
      if (adverts.reservationStatus !== undefined) {
        const newValue = String(adverts.reservationStatus);
        const origValue = originalAdvertsData.reservationStatus || '';
        if (newValue !== origValue) {
          advertsChanges.reservationStatus = newValue;
        }
      }

      // Process trade adverts
      if (adverts.tradeAdverts?.dealerAuctionAdvert?.status !== undefined) {
        const newValue = String(adverts.tradeAdverts.dealerAuctionAdvert.status);
        const origValue = originalAdvertsData.tradeAdverts?.dealerAuctionAdvert?.status || '';
        if (newValue !== origValue) {
          if (!payload.adverts) payload.adverts = {};
          const advertsObj = payload.adverts as Record<string, unknown>;
          if (!advertsObj.tradeAdverts) advertsObj.tradeAdverts = {};
          (advertsObj.tradeAdverts as Record<string, unknown>).dealerAuctionAdvert = { status: newValue };
        }
      }
    }

    // Process metadata changes
    if (requestBody.metadata?.lifecycleState !== undefined) {
      const newValue = String(requestBody.metadata.lifecycleState);
      const origValue = originalMetadata.lifecycleState || '';
      if (newValue !== origValue) {
        payload.metadata = { lifecycleState: newValue };
      }
    }

    // Combine changes into payload
    if (Object.keys(advertsChanges).length > 0) {
      const currentAdverts = payload.adverts as Record<string, unknown> || {};
      payload.adverts = { ...currentAdverts, ...advertsChanges };
    }
    if (Object.keys(retailAdvertsChanges).length > 0) {
      if (!payload.adverts) payload.adverts = {};
      (payload.adverts as Record<string, unknown>).retailAdverts = retailAdvertsChanges;
    }

    // Check if there are any changes
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No changes detected'
      }, { status: 400 });
    }

    // Get AutoTrader authentication
    console.log('🔑 Getting AutoTrader authentication token...');
    const userEmail = user.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      console.log('❌ No email address found for user');
      const errorResponse = createInternalErrorResponse('User email address not found');
      return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
    }
    
    const tokenResult = await getAutoTraderToken(userEmail);
    if (!tokenResult.success) {
      console.log('❌ Failed to get AutoTrader token:', tokenResult);
      const errorResponse = createInternalErrorResponse('Failed to authenticate with AutoTrader API');
      return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
    }
    console.log('✅ AutoTrader token obtained successfully');

    // Make API call to AutoTrader
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const autoTraderUrl = `${baseUrl}/stock/${stockId}?advertiserId=${advertiserId}`;

    const autoTraderResponse = await fetch(autoTraderUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenResult.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!autoTraderResponse.ok) {
      const errorText = await autoTraderResponse.text();
      console.error('AutoTrader API Error:', {
        status: autoTraderResponse.status,
        statusText: autoTraderResponse.statusText,
        body: errorText,
        url: autoTraderUrl,
        payload: JSON.stringify(payload)
      });

      const errorResponse = await parseAutoTraderError(autoTraderResponse, autoTraderUrl);
      return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
    }

    // Update cache if successful
    try {
      const cacheUpdates: Record<string, unknown> = {
        updatedAt: new Date()
      };

      if (payload.adverts) {
        cacheUpdates.advertsData = { ...originalAdvertsData, ...payload.adverts };
      }
      if (payload.metadata) {
        cacheUpdates.metadataRaw = { ...originalMetadata, ...payload.metadata };
      }

      await StockCacheService.updateStockCache(stockId, cacheUpdates);
    } catch (cacheError) {
      console.warn('Failed to update stock cache:', cacheError);
      // Don't fail the request if cache update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Adverts updated successfully',
      data: {
        stockId,
        advertiserId,
        updatedSections: Object.keys(payload),
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Adverts update error (caught in main try-catch):', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const errorResponse = createInternalErrorResponse('An unexpected error occurred while updating adverts');
    console.log('📤 Returning error response due to exception');
    return NextResponse.json(createErrorResponse(errorResponse), { status: errorResponse.httpStatus });
  }
}

