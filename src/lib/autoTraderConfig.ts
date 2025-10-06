/**
 * Centralized AutoTrader API Configuration
 * 
 * This utility provides a single source of truth for AutoTrader API configuration,
 * ensuring consistent URL handling across the entire application.
 * 
 * Uses environment variables to determine the API endpoint:
 * - AUTOTRADER_API_BASE_URL (server-side, preferred)
 * - NEXT_PUBLIC_AUTOTRADER_API_BASE_URL (client-side, fallback)
 * - Defaults to production API if no environment variables are set
 */

/**
 * API endpoint URLs
 */
const API_ENDPOINTS = {
  SANDBOX: 'https://api-sandbox.autotrader.co.uk',
  PRODUCTION: 'https://api.autotrader.co.uk'
} as const;

/**
 * Get the AutoTrader API base URL from environment variables
 * 
 * Priority order:
 * 1. AUTOTRADER_API_BASE_URL (server-side)
 * 2. NEXT_PUBLIC_AUTOTRADER_API_BASE_URL (client-side)
 * 3. Production fallback
 * 
 * @returns The AutoTrader API base URL
 */
export function getAutoTraderBaseUrl(): string {
  // Server-side environment variable (preferred)
  if (typeof process !== 'undefined' && process.env?.AUTOTRADER_API_BASE_URL) {
    return process.env.AUTOTRADER_API_BASE_URL;
  }
  
  // Client-side environment variable (fallback)
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
  }
  
  // Production fallback
  return API_ENDPOINTS.PRODUCTION;
}

/**
 * Get the AutoTrader vehicle check report base URL
 * 
 * @returns The vehicle check report base URL
 */
export function getAutoTraderVehicleCheckUrl(): string {
  const baseUrl = getAutoTraderBaseUrl();
  return `${baseUrl}/vehicles/vehicle-check-report/`;
}

/**
 * Get the AutoTrader vehicle check sample report URL
 * 
 * @returns The sample vehicle check report URL
 */
export function getAutoTraderVehicleCheckSampleUrl(): string {
  const baseUrl = getAutoTraderBaseUrl();
  return `${baseUrl}/vehicles/vehicle-check-report/sample`;
}

/**
 * Build a complete AutoTrader API URL
 * 
 * @param endpoint - The API endpoint (e.g., '/vehicles', '/authenticate')
 * @returns Complete API URL
 */
export function buildAutoTraderApiUrl(endpoint: string): string {
  const baseUrl = getAutoTraderBaseUrl();
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * AutoTrader API Configuration Constants
 */
export const AUTOTRADER_CONFIG = {
  /**
   * Get the base URL for AutoTrader API
   */
  get BASE_URL() {
    return getAutoTraderBaseUrl();
  },
  
  /**
   * Get the vehicle check report URL
   */
  get VEHICLE_CHECK_URL() {
    return getAutoTraderVehicleCheckUrl();
  },
  
  /**
   * Get the sample vehicle check report URL
   */
  get VEHICLE_CHECK_SAMPLE_URL() {
    return getAutoTraderVehicleCheckSampleUrl();
  },
  
  /**
   * Build API URL helper
   */
  buildUrl: buildAutoTraderApiUrl,
  
  /**
   * API endpoints
   */
  ENDPOINTS: API_ENDPOINTS
} as const;

/**
 * Get AutoTrader base URL for server-side API routes
 * 
 * @returns The AutoTrader API base URL with server-side priority
 */
export function getAutoTraderBaseUrlForServer(): string {
  return process.env.AUTOTRADER_API_BASE_URL || 
         process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL || 
         API_ENDPOINTS.PRODUCTION;
}

/**
 * Legacy compatibility - maintains backward compatibility with existing code
 * @deprecated Use getAutoTraderBaseUrl() instead
 */
export const getBaseUrl = getAutoTraderBaseUrl;

export default AUTOTRADER_CONFIG;