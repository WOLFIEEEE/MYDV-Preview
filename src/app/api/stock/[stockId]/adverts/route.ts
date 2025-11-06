import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createErrorResponse, createInternalErrorResponse, ErrorType, parseAutoTraderError } from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { StockCacheService } from '@/lib/stockCacheService';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { syncVatSchemeToSalesDetails } from '@/lib/stockActionsDb';
import { db } from '@/lib/db';
import { inventoryDetails } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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

/**
 * Deep merge utility function to merge nested objects properly
 * This ensures nested objects like retailAdverts are merged instead of overwritten
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const sourceValue = source[key];
      const targetValue = target[key];
      
      if (isObject(sourceValue) && isObject(targetValue) && !Array.isArray(sourceValue) && !Array.isArray(targetValue)) {
        // Recursively merge nested objects
        output[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
      } else {
        // Overwrite primitive values or arrays
        output[key] = sourceValue;
      }
    });
  }
  
  return output;
}

function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
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
      }
      
      // Handle supplied price for cars
      // Check both top-level and retailAdverts for supplied price
      const suppliedPriceValue = adverts.suppliedPrice?.amountGBP ?? adverts.retailAdverts?.suppliedPrice?.amountGBP;
      
      if (isCar && suppliedPriceValue !== undefined) {
        const newSupplied = parseFloat(String(suppliedPriceValue));
        const origSupplied = parseFloat(String(originalRetailAdverts.suppliedPrice?.amountGBP || 0));
        
        // Only update if value changed and meets API minimum
        if (newSupplied >= 75 && newSupplied !== origSupplied) {
          retailAdvertsChanges.suppliedPrice = { amountGBP: newSupplied };
          console.log(`✅ Updated supplied price for car: £${newSupplied}`);
        } else if (newSupplied < 75) {
          console.warn(`⚠️ Supplied price £${newSupplied} is below API minimum of £75, skipping update`);
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

    // Get the updated stock data from AutoTrader PATCH response
    let autoTraderResponseData: { adverts?: unknown; metadata?: unknown } | null = null;
    try {
      autoTraderResponseData = await autoTraderResponse.json() as { adverts?: unknown; metadata?: unknown } | null;
      console.log('✅ AutoTrader PATCH response received');
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AutoTrader response:', parseError);
    }

    // Sync VAT status from listing details to purchase information
    try {
      const vatStatusUpdated = requestBody.adverts?.forecourtPriceVatStatus || requestBody.adverts?.retailAdverts?.vatStatus;
      if (vatStatusUpdated) {
        console.log('🔄 Syncing VAT status from listing details to purchase information...');
        
        // Get dealer ID for the user
        const dealerIdResult = await getDealerIdForUser(user);
        if (dealerIdResult.success && dealerIdResult.dealerId) {
          // Normalize VAT status to our internal format
          let normalizedVatScheme: string;
          switch (vatStatusUpdated.toLowerCase()) {
            case 'no vat':
              normalizedVatScheme = 'no_vat';
              break;
            case 'inc vat':
              normalizedVatScheme = 'includes';
              break;
            case 'ex vat':
              normalizedVatScheme = 'excludes';
              break;
            default:
              normalizedVatScheme = 'no_vat';
          }
          
          // Update VAT scheme in inventory_details table
          await db
            .update(inventoryDetails)
            .set({ 
              vatScheme: normalizedVatScheme,
              updatedAt: new Date()
            })
            .where(and(
              eq(inventoryDetails.stockId, stockId),
              eq(inventoryDetails.dealerId, dealerIdResult.dealerId)
            ));
            
          console.log(`✅ VAT scheme synced to purchase information: '${normalizedVatScheme}' for stockId: ${stockId}`);
          
          // Also sync VAT scheme to sales details if they exist
          await syncVatSchemeToSalesDetails(stockId, dealerIdResult.dealerId, normalizedVatScheme);
          console.log(`✅ VAT scheme synced to sales details: '${normalizedVatScheme}' for stockId: ${stockId}`);
        } else {
          console.warn('⚠️ Could not get dealer ID for VAT sync:', dealerIdResult.error);
        }
      }
    } catch (vatSyncError) {
      console.warn('⚠️ Failed to sync VAT scheme to purchase information:', vatSyncError);
      // Don't fail the request if VAT sync fails
    }

    // Update cache with AutoTrader response data (overwrite, don't merge)
    // Use the response from AutoTrader PATCH as the source of truth
    try {
      const cacheUpdates: Record<string, unknown> = {
        updatedAt: new Date()
      };

      if (autoTraderResponseData) {
        // Overwrite adverts data from AutoTrader response (source of truth)
        if (autoTraderResponseData.adverts) {
          const updatedAdverts = autoTraderResponseData.adverts as Record<string, unknown>;
          cacheUpdates.advertsData = updatedAdverts;
          
          // CRITICAL: Update flattened pricing columns used by My Stock table and Overview tab
          // Extract ALL pricing from the response
          const forecourtPrice = (updatedAdverts.forecourtPrice as { amountGBP?: number | null })?.amountGBP;
          const retailAdverts = updatedAdverts.retailAdverts as Record<string, unknown> | undefined;
          let totalPrice = retailAdverts ? (retailAdverts.totalPrice as { amountGBP?: number | null })?.amountGBP : undefined;
          const suppliedPrice = retailAdverts ? (retailAdverts.suppliedPrice as { amountGBP?: number | null })?.amountGBP : undefined;
          
          // Update forecourtPriceGBP (main listing price)
          if (forecourtPrice !== undefined && forecourtPrice !== null) {
            cacheUpdates.forecourtPriceGBP = forecourtPrice.toString();
            console.log(`✅ Updated forecourtPriceGBP: £${forecourtPrice}`);
          }
          
          // Calculate totalPriceGBP if not provided by AutoTrader
          if ((totalPrice === undefined || totalPrice === null) && forecourtPrice) {
            // Check VAT status to determine if we need to add 20%
            const forecourtVatStatus = updatedAdverts.forecourtPriceVatStatus as string | null | undefined;
            const retailVatStatus = retailAdverts ? (retailAdverts.vatStatus as string | null | undefined) : undefined;
            
            // Check forecourtPriceVatStatus first, then retailAdverts.vatStatus
            const vatStatus = forecourtVatStatus || retailVatStatus;
            
            if (vatStatus && vatStatus.toLowerCase() === 'ex vat') {
              // Add 20% VAT to get total price
              totalPrice = forecourtPrice * 1.20;
              console.log(`💷 Calculated totalPrice from forecourtPrice + 20% VAT: £${forecourtPrice} → £${totalPrice}`);
            } else {
              // No VAT adjustment needed, total = forecourt
              totalPrice = forecourtPrice;
              console.log(`💷 Calculated totalPrice (same as forecourtPrice, no VAT): £${totalPrice}`);
            }
          }
          
          // Update totalPriceGBP (retail price including fees)
          if (totalPrice !== undefined && totalPrice !== null) {
            cacheUpdates.totalPriceGBP = totalPrice.toString();
            console.log(`✅ Updated totalPriceGBP: £${totalPrice}`);
          }
          
          // Log supplied price for tracking (stored in advertsData JSON, not as flattened column)
          if (suppliedPrice !== undefined && suppliedPrice !== null) {
            console.log(`📝 Supplied price in response: £${suppliedPrice} (stored in advertsData JSON)`);
          }
          
          console.log('✅ Updated advertsData from AutoTrader response (overwritten)');
        }

        // Overwrite metadata from AutoTrader response if available
        if (autoTraderResponseData.metadata) {
          const updatedMetadata = autoTraderResponseData.metadata as Record<string, unknown>;
          cacheUpdates.metadataRaw = updatedMetadata;
          
          // Update flattened lifecycleState column
          if (updatedMetadata.lifecycleState) {
            cacheUpdates.lifecycleState = updatedMetadata.lifecycleState as string;
            console.log(`✅ Updated lifecycleState: ${updatedMetadata.lifecycleState}`);
          }
          
          console.log('✅ Updated metadataRaw from AutoTrader response (overwritten)');
        } else if (payload.metadata) {
          // If response doesn't include metadata but we updated it, merge with original
          const originalMeta = (originalMetadata || {}) as Record<string, unknown>;
          const payloadMeta = (payload.metadata || {}) as Record<string, unknown>;
          cacheUpdates.metadataRaw = deepMerge(originalMeta, payloadMeta);
          
          // Update flattened lifecycleState column
          if (payloadMeta.lifecycleState) {
            cacheUpdates.lifecycleState = payloadMeta.lifecycleState as string;
            console.log(`✅ Updated lifecycleState: ${payloadMeta.lifecycleState}`);
          }
          
          console.log('✅ Updated metadataRaw with payload (merged)');
        }
      } else {
        // Fallback: if no response data, use deep merge with original data and extract pricing
        console.warn('⚠️ No AutoTrader response data available, falling back to merge');
        if (payload.adverts) {
          const originalAdverts = (originalAdvertsData || {}) as Record<string, unknown>;
          const payloadAdverts = (payload.adverts || {}) as Record<string, unknown>;
          const mergedAdverts = deepMerge(originalAdverts, payloadAdverts);
          cacheUpdates.advertsData = mergedAdverts;
          
          // Extract and update flattened pricing columns from merged data
          const forecourtPrice = (mergedAdverts.forecourtPrice as { amountGBP?: number | null })?.amountGBP;
          const retailAdverts = mergedAdverts.retailAdverts as Record<string, unknown> | undefined;
          let totalPrice = retailAdverts ? (retailAdverts.totalPrice as { amountGBP?: number | null })?.amountGBP : undefined;
          const suppliedPrice = retailAdverts ? (retailAdverts.suppliedPrice as { amountGBP?: number | null })?.amountGBP : undefined;
          
          // Update forecourtPriceGBP (main listing price)
          if (forecourtPrice !== undefined && forecourtPrice !== null) {
            cacheUpdates.forecourtPriceGBP = forecourtPrice.toString();
            console.log(`✅ Updated forecourtPriceGBP (fallback): £${forecourtPrice}`);
          }
          
          // Calculate totalPriceGBP if not provided (fallback logic)
          if ((totalPrice === undefined || totalPrice === null) && forecourtPrice) {
            // Check VAT status to determine if we need to add 20%
            const forecourtVatStatus = mergedAdverts.forecourtPriceVatStatus as string | null | undefined;
            const retailVatStatus = retailAdverts ? (retailAdverts.vatStatus as string | null | undefined) : undefined;
            
            // Check forecourtPriceVatStatus first, then retailAdverts.vatStatus
            const vatStatus = forecourtVatStatus || retailVatStatus;
            
            if (vatStatus && vatStatus.toLowerCase() === 'ex vat') {
              // Add 20% VAT to get total price
              totalPrice = forecourtPrice * 1.20;
              console.log(`💷 Calculated totalPrice from forecourtPrice + 20% VAT (fallback): £${forecourtPrice} → £${totalPrice}`);
            } else {
              // No VAT adjustment needed, total = forecourt
              totalPrice = forecourtPrice;
              console.log(`💷 Calculated totalPrice (same as forecourtPrice, no VAT, fallback): £${totalPrice}`);
            }
          }
          
          // Update totalPriceGBP (retail price including fees)
          if (totalPrice !== undefined && totalPrice !== null) {
            cacheUpdates.totalPriceGBP = totalPrice.toString();
            console.log(`✅ Updated totalPriceGBP (fallback): £${totalPrice}`);
          }
          
          // Log supplied price for tracking (stored in advertsData JSON, not as flattened column)
          if (suppliedPrice !== undefined && suppliedPrice !== null) {
            console.log(`📝 Supplied price in merged data: £${suppliedPrice} (stored in advertsData JSON)`);
          }
          
          console.log('✅ Updated advertsData with deep merge (fallback)');
        }
        if (payload.metadata) {
          const originalMeta = (originalMetadata || {}) as Record<string, unknown>;
          const payloadMeta = (payload.metadata || {}) as Record<string, unknown>;
          cacheUpdates.metadataRaw = deepMerge(originalMeta, payloadMeta);
          
          // Update flattened lifecycleState column
          if (payloadMeta.lifecycleState) {
            cacheUpdates.lifecycleState = payloadMeta.lifecycleState as string;
            console.log(`✅ Updated lifecycleState (fallback): ${payloadMeta.lifecycleState}`);
          }
          
          console.log('✅ Updated metadataRaw with deep merge (fallback)');
        }
      }

      await StockCacheService.updateStockCache(stockId, cacheUpdates);
      console.log(`✅ Stock cache updated successfully for stockId: ${stockId}`);
    } catch (cacheError) {
      console.warn('⚠️ Failed to update stock cache:', cacheError);
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

