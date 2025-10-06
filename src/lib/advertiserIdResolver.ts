/**
 * Advertiser ID Resolution Utility
 * 
 * This utility provides standardized logic for resolving advertiser IDs
 * from store configuration, handling both legacy and new enhanced fields.
 */

export interface StoreConfigAdvertiserData {
  // New enhanced fields (preferred)
  advertisementId?: string | null;
  additionalAdvertisementIds?: string | null; // JSON string
  
  // Legacy fields (for backward compatibility)
  primaryAdvertisementId?: string | null;
  advertisementIds?: string | null; // JSON string
}

export interface AdvertiserResolution {
  advertiserId: string | null;
  source: 'enhanced_primary' | 'enhanced_additional' | 'legacy_primary' | 'legacy_array' | 'none';
  allAvailableIds: string[];
}

/**
 * Standardized function to resolve advertiser ID from store configuration
 * 
 * Priority order:
 * 1. advertisementId (new enhanced primary field)
 * 2. additionalAdvertisementIds[0] (first from new enhanced additional IDs)
 * 3. primaryAdvertisementId (legacy primary field)
 * 4. advertisementIds[0] (first from legacy array)
 * 
 * @param storeConfig - Store configuration object with advertiser fields
 * @returns AdvertiserResolution object with ID, source, and all available IDs
 */
export function resolveAdvertiserId(storeConfig: StoreConfigAdvertiserData): AdvertiserResolution {
  const allAvailableIds: string[] = [];
  
  // 1. Try new enhanced primary field first
  if (storeConfig.advertisementId && storeConfig.advertisementId.trim()) {
    let primaryId = storeConfig.advertisementId.trim();
    
    // Handle case where primary field contains JSON array (data migration issue)
    if (primaryId.startsWith('[') && primaryId.endsWith(']')) {
      try {
        const parsed = JSON.parse(primaryId);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          console.warn('⚠️ Primary advertisementId contains JSON array, extracting first element:', primaryId);
          primaryId = parsed[0].trim();
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse primary advertisementId as JSON array:', primaryId, error);
      }
    }
    
    if (primaryId) {
      allAvailableIds.push(primaryId);
      return {
        advertiserId: primaryId,
        source: 'enhanced_primary',
        allAvailableIds
      };
    }
  }
  
  // 2. Try new enhanced additional IDs
  if (storeConfig.additionalAdvertisementIds) {
    try {
      const additionalIds = JSON.parse(storeConfig.additionalAdvertisementIds);
      if (Array.isArray(additionalIds) && additionalIds.length > 0) {
        const validIds = additionalIds.filter(id => id && typeof id === 'string' && id.trim());
        allAvailableIds.push(...validIds);
        
        if (validIds.length > 0) {
          return {
            advertiserId: validIds[0].trim(),
            source: 'enhanced_additional',
            allAvailableIds
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse additionalAdvertisementIds JSON:', error);
    }
  }
  
  // 3. Fallback to legacy primary field
  if (storeConfig.primaryAdvertisementId && storeConfig.primaryAdvertisementId.trim()) {
    allAvailableIds.push(storeConfig.primaryAdvertisementId.trim());
    return {
      advertiserId: storeConfig.primaryAdvertisementId.trim(),
      source: 'legacy_primary',
      allAvailableIds
    };
  }
  
  // 4. Fallback to legacy array field
  if (storeConfig.advertisementIds) {
    try {
      const legacyIds = JSON.parse(storeConfig.advertisementIds);
      if (Array.isArray(legacyIds) && legacyIds.length > 0) {
        const validIds = legacyIds.filter(id => id && typeof id === 'string' && id.trim());
        allAvailableIds.push(...validIds);
        
        if (validIds.length > 0) {
          return {
            advertiserId: validIds[0].trim(),
            source: 'legacy_array',
            allAvailableIds
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse advertisementIds JSON:', error);
    }
  }
  
  // No valid advertiser ID found
  return {
    advertiserId: null,
    source: 'none',
    allAvailableIds
  };
}

/**
 * Simple function to get just the advertiser ID (most common use case)
 * 
 * @param storeConfig - Store configuration object with advertiser fields
 * @returns string | null - The resolved advertiser ID or null if none found
 */
export function getAdvertiserId(storeConfig: StoreConfigAdvertiserData): string | null {
  return resolveAdvertiserId(storeConfig).advertiserId;
}

/**
 * Function to get all available advertiser IDs from store configuration
 * 
 * @param storeConfig - Store configuration object with advertiser fields
 * @returns string[] - Array of all available advertiser IDs
 */
export function getAllAdvertiserIds(storeConfig: StoreConfigAdvertiserData): string[] {
  return resolveAdvertiserId(storeConfig).allAvailableIds;
}

/**
 * Validation function to check if store config has any advertiser ID configured
 * 
 * @param storeConfig - Store configuration object with advertiser fields
 * @returns boolean - True if at least one advertiser ID is configured
 */
export function hasAdvertiserIdConfigured(storeConfig: StoreConfigAdvertiserData): boolean {
  return resolveAdvertiserId(storeConfig).advertiserId !== null;
}

/**
 * Function to log advertiser ID resolution for debugging
 * 
 * @param storeConfig - Store configuration object with advertiser fields
 * @param context - Context string for logging (e.g., API route name)
 */
export function logAdvertiserIdResolution(storeConfig: StoreConfigAdvertiserData, context: string = 'Unknown'): void {
  const resolution = resolveAdvertiserId(storeConfig);
  
  console.log(`🎯 [${context}] Advertiser ID Resolution:`, {
    resolvedId: resolution.advertiserId,
    source: resolution.source,
    allAvailable: resolution.allAvailableIds,
    configFields: {
      advertisementId: storeConfig.advertisementId,
      additionalAdvertisementIds: storeConfig.additionalAdvertisementIds,
      primaryAdvertisementId: storeConfig.primaryAdvertisementId,
      advertisementIds: storeConfig.advertisementIds
    }
  });
}

/**
 * Migration helper: Check if store config is using legacy fields only
 * 
 * @param storeConfig - Store configuration object with advertiser fields
 * @returns boolean - True if only legacy fields are populated
 */
export function isUsingLegacyFieldsOnly(storeConfig: StoreConfigAdvertiserData): boolean {
  const hasEnhancedFields = !!(storeConfig.advertisementId || storeConfig.additionalAdvertisementIds);
  const hasLegacyFields = !!(storeConfig.primaryAdvertisementId || storeConfig.advertisementIds);
  
  return hasLegacyFields && !hasEnhancedFields;
}

/**
 * Migration helper: Convert legacy fields to new enhanced format
 * 
 * @param storeConfig - Store configuration object with advertiser fields
 * @returns Object with new enhanced field values
 */
export function convertLegacyToEnhanced(storeConfig: StoreConfigAdvertiserData): {
  advertisementId: string | null;
  additionalAdvertisementIds: string | null;
} {
  const resolution = resolveAdvertiserId(storeConfig);
  const allIds = resolution.allAvailableIds;
  
  if (allIds.length === 0) {
    return {
      advertisementId: null,
      additionalAdvertisementIds: null
    };
  }
  
  const primaryId = allIds[0];
  const additionalIds = allIds.slice(1);
  
  return {
    advertisementId: primaryId,
    additionalAdvertisementIds: additionalIds.length > 0 ? JSON.stringify(additionalIds) : null
  };
}
