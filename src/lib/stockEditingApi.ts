/**
 * Stock Editing API Service
 * Provides functions to interact with all stock editing endpoints
 */

export interface Feature {
  name: string;
  type?: string;
  standardName?: string;
  category?: string;
  rarityRating?: number | null;
  valueRating?: number | null;
}

export interface VehicleUpdateData {
  vehicle?: {
    registration?: string;
    colour?: string;
    odometerReadingMiles?: number;
    plate?: string;
    yearOfRegistration?: string;
  };
  features?: Feature[];
  highlights?: Array<{ name: string }>;
}

export interface AdvertsUpdateData {
  adverts?: {
    forecourtPrice?: {
      amountGBP?: number;
    };
    suppliedPrice?: {
      amountGBP?: number;
    };
    vatable?: string;
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
      autotraderAdvert?: { status?: string };
      advertiserAdvert?: { status?: string };
      locatorAdvert?: { status?: string };
      exportAdvert?: { status?: string };
      profileAdvert?: { status?: string };
    };
    tradeAdverts?: {
      dealerAuctionAdvert?: { status?: string };
    };
  };
  metadata?: {
    lifecycleState?: string;
  };
}

export interface AdvertiserData {
  advertiser: {
    name?: string;
    segment?: string;
    website?: string;
    phone?: string;
    location?: {
      addressLineOne?: string;
      town?: string;
      county?: string;
      region?: string;
      postCode?: string;
      latitude?: number;
      longitude?: number;
    };
    advertStrapline?: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: {
    type: string;
    code: number;
  };
}

/**
 * Update stock features
 */
export async function updateStockFeatures(
  stockId: string,
  advertiserId: string,
  features: Feature[]
): Promise<ApiResponse> {
  try {
    const response = await fetch(`/api/stock/${stockId}/features?advertiserId=${advertiserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ features }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating stock features:', error);
    return {
      success: false,
      message: 'Failed to update features. Please try again.',
    };
  }
}

/**
 * Update vehicle details, features, and highlights
 */
export async function updateVehicleDetails(
  stockId: string,
  advertiserId: string,
  data: VehicleUpdateData
): Promise<ApiResponse> {
  try {
    const response = await fetch(`/api/stock/${stockId}/vehicle?advertiserId=${advertiserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating vehicle details:', error);
    return {
      success: false,
      message: 'Failed to update vehicle details. Please try again.',
    };
  }
}

/**
 * Update stock adverts and pricing
 */
export async function updateStockAdverts(
  stockId: string,
  advertiserId: string,
  data: AdvertsUpdateData
): Promise<ApiResponse> {
  try {
    const response = await fetch(`/api/stock/${stockId}/adverts?advertiserId=${advertiserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating stock adverts:', error);
    return {
      success: false,
      message: 'Failed to update adverts. Please try again.',
    };
  }
}

/**
 * Update advertiser information
 */
export async function updateAdvertiserInfo(
  stockId: string,
  advertiserId: string,
  data: AdvertiserData
): Promise<ApiResponse> {
  try {
    const response = await fetch(`/api/stock/${stockId}/advertiser?advertiserId=${advertiserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating advertiser info:', error);
    return {
      success: false,
      message: 'Failed to update advertiser information. Please try again.',
    };
  }
}

/**
 * Update stock lifecycle state (SOLD, DELETED, SALE_IN_PROGRESS, DUE_IN, etc.)
 */
export async function updateStockLifecycle(
  stockId: string,
  advertiserId: string,
  lifecycleState: string,
  retailAdverts?: Record<string, any>
): Promise<ApiResponse> {
  try {
    const payload: any = {
      metadata: { lifecycleState }
    };

    // Add retail adverts if provided (for SOLD/DELETED states)
    if (retailAdverts) {
      payload.adverts = {
        retailAdverts: retailAdverts
      };

      // Add soldDate for SOLD items
      if (lifecycleState === 'SOLD') {
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        payload.adverts.soldDate = currentDate;
      }
    }

    const response = await fetch(`/api/stock/${stockId}?advertiserId=${advertiserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating stock lifecycle:', error);
    return {
      success: false,
      message: 'Failed to update stock lifecycle. Please try again.',
    };
  }
}

/**
 * Helper function to show toast notifications
 */
export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // This can be replaced with your preferred notification system
  // For now, we'll use a simple alert
  if (type === 'error') {
    console.error(message);
  } else if (type === 'success') {
    console.log('✅', message);
  } else {
    console.info('ℹ️', message);
  }
  
  // You can integrate with toast libraries like react-hot-toast, sonner, etc.
  // toast[type](message);
}

/**
 * Helper function to extract advertiser ID from stock data
 */
export function getAdvertiserId(stockData: any): string | null {
  return stockData?.advertiser?.advertiserId || 
         stockData?.metadata?.advertiserId || 
         null;
}

