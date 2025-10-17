import { db } from '@/lib/db';
import { stockCache, dvlaVehicleData } from '@/db/schema';
import { eq, and, ne, isNotNull } from 'drizzle-orm';
import type { DVLAVehicleResponse } from '@/app/api/dvla/vehicle-enquiry/route';

// Configuration for DVLA service
const DVLA_CONFIG = {
  BATCH_SIZE: 5, // Process 5 vehicles at a time to avoid rate limits
  BATCH_DELAY: 5000, // 5 second delay between batches
  REQUEST_DELAY: 2000, // 2 second delay between individual requests
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 second base retry delay
  // Refresh DVLA data if older than 7 days
  REFRESH_THRESHOLD_DAYS: 7
};

export interface DVLABatchResult {
  success: boolean;
  processed: number;
  updated: number;
  errors: number;
  details: Array<{
    stockId: string;
    registration: string;
    success: boolean;
    error?: string;
    motStatus?: string;
    motExpiryDate?: string;
  }>;
}

export interface DVLAServiceOptions {
  dealerId?: string;
  forceRefresh?: boolean;
  batchSize?: number;
}

/**
 * Fetch DVLA data for a single vehicle with retry logic
 */
async function fetchDVLAData(registration: string): Promise<{ success: boolean; data?: DVLAVehicleResponse; error?: string }> {
  const dvlaApiKey = process.env.DVLA_API_KEY;
  if (!dvlaApiKey) {
    throw new Error('DVLA_API_KEY not configured');
  }

  console.log(`🔍 Fetching DVLA data for registration: ${registration}`);

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= DVLA_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const response = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
        method: 'POST',
        headers: {
          'x-api-key': dvlaApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Vehicle-Management-System/1.0'
        },
        body: JSON.stringify({
          registrationNumber: registration.replace(/\s/g, '').toUpperCase()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ DVLA API error for ${registration} (attempt ${attempt}):`, response.status, errorText);
        
        // Handle specific error cases that shouldn't be retried
        if (response.status === 404) {
          return { success: false, error: 'N/A' };
        } else if (response.status === 403) {
          return { success: false, error: 'API access denied' };
        } else if (response.status === 429) {
          // Rate limit - wait longer before retry
          if (attempt < DVLA_CONFIG.RETRY_ATTEMPTS) {
            console.log(`⏳ Rate limited, waiting ${DVLA_CONFIG.RETRY_DELAY * attempt}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, DVLA_CONFIG.RETRY_DELAY * attempt));
            continue;
          }
          return { success: false, error: 'Rate limit exceeded' };
        }
        
        // For other errors, retry
        if (attempt < DVLA_CONFIG.RETRY_ATTEMPTS) {
          console.log(`⏳ Retrying in ${DVLA_CONFIG.RETRY_DELAY * attempt}ms... (attempt ${attempt + 1}/${DVLA_CONFIG.RETRY_ATTEMPTS})`);
          await new Promise(resolve => setTimeout(resolve, DVLA_CONFIG.RETRY_DELAY * attempt));
          continue;
        }
        
        return { success: false, error: `DVLA API error: ${response.status}` };
      }

      const data = await response.json() as DVLAVehicleResponse;
      console.log(`✅ DVLA data retrieved for ${registration}:`, {
        motStatus: data.motStatus,
        motExpiryDate: data.motExpiryDate
      });

      return { success: true, data };

    } catch (error) {
      console.error(`❌ Error fetching DVLA data for ${registration} (attempt ${attempt}):`, error);
      
      // Check if it's a timeout or connection error
      const isNetworkError = error instanceof Error && (
        error.message.includes('timeout') ||
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND') ||
        error.name === 'AbortError'
      );
      
      if (isNetworkError && attempt < DVLA_CONFIG.RETRY_ATTEMPTS) {
        const delay = DVLA_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${DVLA_CONFIG.RETRY_ATTEMPTS})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's the last attempt or not a network error, return the error
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // This should never be reached, but just in case
  return { 
    success: false, 
    error: 'Maximum retry attempts exceeded' 
  };
}

/**
 * Update both DVLA table and stock record with DVLA data
 */
async function updateStockWithDVLAData(
  stockId: string, 
  dvlaData: DVLAVehicleResponse
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, get the registration from the stock record
    const stockRecord = await db
      .select({ registration: stockCache.registration })
      .from(stockCache)
      .where(eq(stockCache.stockId, stockId))
      .limit(1);

    if (stockRecord.length === 0) {
      return { success: false, error: 'Stock record not found' };
    }

    const registration = stockRecord[0].registration;
    if (!registration) {
      return { success: false, error: 'No registration found for stock record' };
    }

    // Update or insert into DVLA table
    const dvlaRecord = {
      registrationNumber: registration,
      make: dvlaData.make,
      colour: dvlaData.colour,
      fuelType: dvlaData.fuelType,
      yearOfManufacture: dvlaData.yearOfManufacture,
      engineCapacity: dvlaData.engineCapacity,
      co2Emissions: dvlaData.co2Emissions,
      motStatus: dvlaData.motStatus,
      motExpiryDate: dvlaData.motExpiryDate || null,
      taxStatus: dvlaData.taxStatus,
      taxDueDate: dvlaData.taxDueDate || null,
      typeApproval: dvlaData.typeApproval,
      wheelplan: dvlaData.wheelplan,
      revenueWeight: dvlaData.revenueWeight,
      markedForExport: dvlaData.markedForExport || false,
      dateOfLastV5CIssued: dvlaData.dateOfLastV5CIssued || null,
      monthOfFirstRegistration: dvlaData.monthOfFirstRegistration,
      dvlaLastChecked: new Date(),
      dvlaDataRaw: dvlaData,
      updatedAt: new Date()
    };

    // Use upsert (insert or update) for DVLA table
    await db
      .insert(dvlaVehicleData)
      .values(dvlaRecord)
      .onConflictDoUpdate({
        target: dvlaVehicleData.registrationNumber,
        set: {
          make: dvlaRecord.make,
          colour: dvlaRecord.colour,
          fuelType: dvlaRecord.fuelType,
          yearOfManufacture: dvlaRecord.yearOfManufacture,
          engineCapacity: dvlaRecord.engineCapacity,
          co2Emissions: dvlaRecord.co2Emissions,
          motStatus: dvlaRecord.motStatus,
          motExpiryDate: dvlaRecord.motExpiryDate,
          taxStatus: dvlaRecord.taxStatus,
          taxDueDate: dvlaRecord.taxDueDate,
          typeApproval: dvlaRecord.typeApproval,
          wheelplan: dvlaRecord.wheelplan,
          revenueWeight: dvlaRecord.revenueWeight,
          markedForExport: dvlaRecord.markedForExport,
          dateOfLastV5CIssued: dvlaRecord.dateOfLastV5CIssued,
          monthOfFirstRegistration: dvlaRecord.monthOfFirstRegistration,
          dvlaLastChecked: dvlaRecord.dvlaLastChecked,
          dvlaDataRaw: dvlaRecord.dvlaDataRaw,
          updatedAt: dvlaRecord.updatedAt
        }
      });

    // Also update the stock cache for backward compatibility and quick access
    await db
      .update(stockCache)
      .set({
        motStatus: dvlaData.motStatus,
        motExpiryDate: dvlaData.motExpiryDate ? new Date(dvlaData.motExpiryDate) : null,
        dvlaLastChecked: new Date(),
        dvlaDataRaw: dvlaData,
        updatedAt: new Date()
      })
      .where(eq(stockCache.stockId, stockId));

    console.log(`✅ Updated both DVLA table and stock ${stockId} with DVLA data for registration ${registration}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Error updating stock ${stockId} with DVLA data:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database update failed' 
    };
  }
}

/**
 * Get vehicles that need DVLA data refresh
 */
async function getVehiclesNeedingDVLARefresh(options: DVLAServiceOptions = {}): Promise<Array<{
  stockId: string;
  registration: string;
  dealerId: string;
}>> {
  try {
    const { dealerId, forceRefresh = false } = options;
    
    // Calculate threshold date for refresh
    const refreshThreshold = new Date();
    refreshThreshold.setDate(refreshThreshold.getDate() - DVLA_CONFIG.REFRESH_THRESHOLD_DAYS);

    let whereConditions = and(
      eq(stockCache.isStale, false), // Only active stock
      // Only vehicles with registration numbers
      isNotNull(stockCache.registration),
      ne(stockCache.registration, '')
    );

    // Add dealer filter if specified
    if (dealerId) {
      whereConditions = and(whereConditions, eq(stockCache.dealerId, dealerId));
    }

    // Get all stock vehicles that could need DVLA refresh
    const stockVehicles = await db
      .select({
        stockId: stockCache.stockId,
        registration: stockCache.registration,
        dealerId: stockCache.dealerId
      })
      .from(stockCache)
      .where(whereConditions)
      .orderBy(stockCache.createdAt);

    if (forceRefresh) {
      // If force refresh, return all vehicles
      console.log(`🔍 Force refresh: Found ${stockVehicles.length} vehicles for DVLA refresh`);
      return stockVehicles.filter(v => v.registration) as Array<{
        stockId: string;
        registration: string;
        dealerId: string;
      }>;
    }

    // Get DVLA data to check which vehicles need refresh
    console.log('🔍 Checking refresh status from NEW dvlaVehicleData table');
    const dvlaData = await db
      .select({
        registrationNumber: dvlaVehicleData.registrationNumber,
        dvlaLastChecked: dvlaVehicleData.dvlaLastChecked
      })
      .from(dvlaVehicleData);

    // Create a map of DVLA data by registration
    const dvlaMap = new Map();
    dvlaData.forEach(record => {
      dvlaMap.set(record.registrationNumber, record);
    });

    // Filter vehicles that need refresh based on DVLA table data
    const vehiclesNeedingRefresh = stockVehicles.filter(vehicle => {
      const dvlaRecord = dvlaMap.get(vehicle.registration);
      
      if (!dvlaRecord || !dvlaRecord.dvlaLastChecked) {
        // No DVLA data exists, needs refresh
        return true;
      }
      
      // Check if DVLA data is older than threshold
      const lastChecked = new Date(dvlaRecord.dvlaLastChecked);
      return lastChecked < refreshThreshold;
    });

    console.log(`🔍 Found ${vehiclesNeedingRefresh.length} vehicles needing DVLA refresh (${stockVehicles.length} total vehicles)`);
    return vehiclesNeedingRefresh as Array<{
      stockId: string;
      registration: string;
      dealerId: string;
    }>;

  } catch (error) {
    console.error('❌ Error getting vehicles needing DVLA refresh:', error);
    return [];
  }
}

/**
 * Process DVLA data for multiple vehicles in batches
 */
export async function processDVLABatch(options: DVLAServiceOptions = {}): Promise<DVLABatchResult> {
  const { batchSize = DVLA_CONFIG.BATCH_SIZE } = options;
  
  console.log('🚀 Starting DVLA batch processing...');
  
  const result: DVLABatchResult = {
    success: true,
    processed: 0,
    updated: 0,
    errors: 0,
    details: []
  };

  try {
    // Get vehicles that need DVLA data
    const vehicles = await getVehiclesNeedingDVLARefresh(options);
    
    if (vehicles.length === 0) {
      console.log('✅ No vehicles need DVLA refresh');
      return result;
    }

    console.log(`📋 Processing ${vehicles.length} vehicles in batches of ${batchSize}`);

    // Process in batches
    for (let i = 0; i < vehicles.length; i += batchSize) {
      const batch = vehicles.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vehicles.length / batchSize)}`);

      // Process each vehicle in the batch
      for (const vehicle of batch) {
        result.processed++;

        try {
          // Fetch DVLA data
          const dvlaResult = await fetchDVLAData(vehicle.registration);
          
          if (dvlaResult.success && dvlaResult.data) {
            // Update stock with DVLA data
            const updateResult = await updateStockWithDVLAData(vehicle.stockId, dvlaResult.data);
            
            if (updateResult.success) {
              result.updated++;
              result.details.push({
                stockId: vehicle.stockId,
                registration: vehicle.registration,
                success: true,
                motStatus: dvlaResult.data.motStatus,
                motExpiryDate: dvlaResult.data.motExpiryDate
              });
            } else {
              result.errors++;
              result.details.push({
                stockId: vehicle.stockId,
                registration: vehicle.registration,
                success: false,
                error: updateResult.error
              });
            }
          } else {
            result.errors++;
            result.details.push({
              stockId: vehicle.stockId,
              registration: vehicle.registration,
              success: false,
              error: dvlaResult.error
            });
          }

          // Delay between requests to avoid rate limiting
          if (batch.indexOf(vehicle) < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DVLA_CONFIG.REQUEST_DELAY));
          }

        } catch (error) {
          result.errors++;
          result.details.push({
            stockId: vehicle.stockId,
            registration: vehicle.registration,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Delay between batches
      if (i + batchSize < vehicles.length) {
        console.log(`⏳ Waiting ${DVLA_CONFIG.BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DVLA_CONFIG.BATCH_DELAY));
      }
    }

    console.log(`✅ DVLA batch processing complete:`, {
      processed: result.processed,
      updated: result.updated,
      errors: result.errors
    });

  } catch (error) {
    console.error('❌ DVLA batch processing failed:', error);
    result.success = false;
  }

  return result;
}

/**
 * Process DVLA data for a single vehicle
 */
export async function processSingleVehicleDVLA(stockId: string): Promise<{
  success: boolean;
  motStatus?: string;
  motExpiryDate?: string;
  error?: string;
}> {
  try {
    // Get vehicle registration
    const vehicle = await db
      .select({
        registration: stockCache.registration
      })
      .from(stockCache)
      .where(eq(stockCache.stockId, stockId))
      .limit(1);

    if (vehicle.length === 0 || !vehicle[0].registration) {
      return {
        success: false,
        error: 'Vehicle not found or no registration number'
      };
    }

    const registration = vehicle[0].registration;
    
    // Fetch DVLA data
    const dvlaResult = await fetchDVLAData(registration);
    
    if (!dvlaResult.success || !dvlaResult.data) {
      return {
        success: false,
        error: dvlaResult.error
      };
    }

    // Update stock with DVLA data
    const updateResult = await updateStockWithDVLAData(stockId, dvlaResult.data);
    
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error
      };
    }

    return {
      success: true,
      motStatus: dvlaResult.data.motStatus,
      motExpiryDate: dvlaResult.data.motExpiryDate
    };

  } catch (error) {
    console.error(`❌ Error processing DVLA data for stock ${stockId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get DVLA processing statistics
 */
export async function getDVLAStats(dealerId?: string): Promise<{
  totalVehicles: number;
  withDVLAData: number;
  needingRefresh: number;
  validMOT: number;
  expiredMOT: number;
  unknownMOT: number;
}> {
  try {
    // Get all active vehicles with registrations
    const baseCondition = and(
      eq(stockCache.isStale, false),
      isNotNull(stockCache.registration),
      ne(stockCache.registration, '')
    );
    
    const stockCondition = dealerId 
      ? and(baseCondition, eq(stockCache.dealerId, dealerId))
      : baseCondition;

    // Get vehicles from stockCache (for total count and dealer filtering)
    const stockVehicles = await db
      .select({
        registration: stockCache.registration,
        dealerId: stockCache.dealerId
      })
      .from(stockCache)
      .where(stockCondition);

    // Get DVLA data from the new dvlaVehicleData table
    console.log('📊 Reading DVLA statistics from NEW dvlaVehicleData table');
    const dvlaData = await db
      .select({
        registrationNumber: dvlaVehicleData.registrationNumber,
        motStatus: dvlaVehicleData.motStatus,
        dvlaLastChecked: dvlaVehicleData.dvlaLastChecked,
        motExpiryDate: dvlaVehicleData.motExpiryDate
      })
      .from(dvlaVehicleData);

    // Create a map of DVLA data by registration for quick lookup
    const dvlaMap = new Map();
    dvlaData.forEach(record => {
      dvlaMap.set(record.registrationNumber, record);
    });

    const refreshThreshold = new Date();
    refreshThreshold.setDate(refreshThreshold.getDate() - DVLA_CONFIG.REFRESH_THRESHOLD_DAYS);

    const stats = {
      totalVehicles: stockVehicles.length,
      withDVLAData: 0,
      needingRefresh: 0,
      validMOT: 0,
      expiredMOT: 0,
      unknownMOT: 0
    };

    // Process each stock vehicle and check if it has DVLA data
    for (const stockVehicle of stockVehicles) {
      const dvlaRecord = dvlaMap.get(stockVehicle.registration);
      
      if (dvlaRecord && dvlaRecord.dvlaLastChecked) {
        stats.withDVLAData++;
        
        // Check if needs refresh (convert string to Date for comparison)
        const lastChecked = new Date(dvlaRecord.dvlaLastChecked);
        if (lastChecked < refreshThreshold) {
          stats.needingRefresh++;
        }
      } else {
        stats.needingRefresh++;
      }

      // Count MOT status from DVLA table
      if (dvlaRecord && dvlaRecord.motStatus) {
        if (dvlaRecord.motStatus.toLowerCase().includes('valid')) {
          stats.validMOT++;
        } else if (dvlaRecord.motStatus.toLowerCase().includes('invalid') || 
                   dvlaRecord.motStatus.toLowerCase().includes('expired')) {
          stats.expiredMOT++;
        } else {
          stats.unknownMOT++;
        }
      } else {
        stats.unknownMOT++;
      }
    }

    return stats;

  } catch (error) {
    console.error('❌ Error getting DVLA stats:', error);
    return {
      totalVehicles: 0,
      withDVLAData: 0,
      needingRefresh: 0,
      validMOT: 0,
      expiredMOT: 0,
      unknownMOT: 0
    };
  }
}
