/**
 * Retail Check Navigation Utilities
 * 
 * Provides standardized navigation functions for retail check functionality
 * across all flows (vehicle-finder, taxonomy, stock)
 */

export interface RetailCheckNavigationParams {
  // Vehicle Finder flow
  registration?: string;
  vrm?: string;
  mileage?: string | number;
  
  // Taxonomy flow
  derivativeId?: string;
  
  // Stock flow
  stockId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates retail check navigation parameters
 */
export function validateRetailCheckParams(params: RetailCheckNavigationParams): ValidationResult {
  // Check if we have at least one valid flow
  const hasRegistrationFlow = (params.registration || params.vrm) && params.mileage;
  const hasTaxonomyFlow = params.derivativeId && params.mileage;
  const hasStockFlow = params.stockId;
  
  if (!hasRegistrationFlow && !hasTaxonomyFlow && !hasStockFlow) {
    return {
      isValid: false,
      error: 'At least one valid flow is required: registration+mileage, derivativeId+mileage, or stockId'
    };
  }
  
  // Validate registration flow
  if (hasRegistrationFlow) {
    const registration = params.registration || params.vrm;
    const cleanRegistration = registration?.replace(/[^A-Z0-9]/gi, '') || '';
    
    if (cleanRegistration.length < 3) {
      return {
        isValid: false,
        error: 'Registration must be at least 3 characters long'
      };
    }
    
    const mileageValue = typeof params.mileage === 'string' 
      ? parseInt(params.mileage.replace(/[^0-9]/g, ''))
      : params.mileage;
      
    if (!mileageValue || mileageValue < 0) {
      return {
        isValid: false,
        error: 'Valid mileage is required (must be 0 or greater)'
      };
    }
  }
  
  // Validate taxonomy flow
  if (hasTaxonomyFlow) {
    if (!params.derivativeId || params.derivativeId.trim().length === 0) {
      return {
        isValid: false,
        error: 'Derivative ID is required for taxonomy flow'
      };
    }
    
    const mileageValue = typeof params.mileage === 'string' 
      ? parseInt(params.mileage.replace(/[^0-9]/g, ''))
      : params.mileage;
      
    if (!mileageValue || mileageValue < 0) {
      return {
        isValid: false,
        error: 'Valid mileage is required (must be 0 or greater)'
      };
    }
  }
  
  // Validate stock flow
  if (hasStockFlow) {
    if (!params.stockId || params.stockId.trim().length === 0) {
      return {
        isValid: false,
        error: 'Stock ID is required for stock flow'
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Builds the retail check URL with proper parameters
 */
export function buildRetailCheckUrl(params: RetailCheckNavigationParams): string {
  const validation = validateRetailCheckParams(params);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  const url = new URL('/mystock/retail-check', window.location.origin);
  
  // Add parameters based on flow type
  if (params.stockId) {
    // Stock flow
    url.searchParams.set('stockId', params.stockId);
  } else if (params.derivativeId && !params.registration && !params.vrm) {
    // Taxonomy flow (only if no registration available)
    url.searchParams.set('derivativeId', params.derivativeId);
    if (params.mileage) {
      const mileageValue = typeof params.mileage === 'string' 
        ? params.mileage.replace(/[^0-9]/g, '')
        : params.mileage.toString();
      url.searchParams.set('mileage', mileageValue);
    }
  } else {
    // Vehicle finder flow (prefer registration over derivativeId)
    const registration = params.registration || params.vrm;
    if (registration) {
      const cleanRegistration = registration.replace(/[^A-Z0-9]/gi, '');
      url.searchParams.set('vrm', cleanRegistration);
      // Also pass registration parameter for better API calls
      url.searchParams.set('registration', cleanRegistration);
    }
    
    if (params.mileage) {
      const mileageValue = typeof params.mileage === 'string' 
        ? params.mileage.replace(/[^0-9]/g, '')
        : params.mileage.toString();
      url.searchParams.set('mileage', mileageValue);
    }
    
    // Include derivativeId if available (for enhanced data)
    if (params.derivativeId) {
      url.searchParams.set('derivativeId', params.derivativeId);
    }
  }
  
  return url.toString();
}

/**
 * Standardized retail check navigation function
 * Use this instead of manual router.push or window.open
 */
export function navigateToRetailCheck(
  params: RetailCheckNavigationParams,
  router: { push: (url: string) => void },
  options: { 
    onError?: (error: string) => void;
    onSuccess?: (url: string) => void;
  } = {}
): void {
  try {
    const url = buildRetailCheckUrl(params);
    
    console.log('🔄 Navigating to retail check:', {
      url,
      params,
      timestamp: new Date().toISOString()
    });
    
    router.push(url);
    options.onSuccess?.(url);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to navigate to retail check';
    console.error('❌ Retail check navigation error:', errorMessage, params);
    options.onError?.(errorMessage);
  }
}

/**
 * Helper function to extract retail check parameters from vehicle data
 */
export function extractRetailCheckParams(vehicleData: any): RetailCheckNavigationParams {
  return {
    registration: vehicleData?.registration,
    vrm: vehicleData?.vrm,
    mileage: vehicleData?.mileage || vehicleData?.odometerReadingMiles,
    derivativeId: vehicleData?.derivativeId,
    stockId: vehicleData?.stockId
  };
}
