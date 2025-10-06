// Adjusted Vehicle Metrics Service
// Provides location-based vehicle metrics adjustments

import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { AUTOTRADER_CONFIG } from '@/lib/autoTraderConfig';

export interface AdjustedVehicleMetricsRequest {
  derivativeId: string;
  firstRegistrationDate: string;
  odometerReadingMiles: number;
  advertiserId: string;
  userEmail?: string; // Add userEmail for authentication
}

export interface AdjustedVehicleMetricsResponse {
  vehicleMetrics?: {
    retail: {
      supply: { value: number };
      demand: { value: number };
      marketCondition: { value: number };
      rating: { value: number };
      daysToSell: { value: number };
      locations: Array<{
        area?: string;
        adjustedRating?: number;
        adjustedDaysToSell?: number;
        localSupply?: number;
        localDemand?: number;
      }>;
    };
  };
  locationAdjustments?: {
    postcode: string;
    adjustmentFactor: number;
    localMarketCondition: string;
    regionalInsights: string[];
  };
  source: 'api' | 'fallback';
  error?: string;
}

export class AdjustedVehicleMetricsService {
  private static readonly BASE_URL = AUTOTRADER_CONFIG.BASE_URL;

  /**
   * Get adjusted vehicle metrics with location-based adjustments
   */
  static async getAdjustedMetrics(
    request: AdjustedVehicleMetricsRequest
  ): Promise<AdjustedVehicleMetricsResponse> {
    try {
      console.log('📍 Fetching adjusted vehicle metrics:', {
        derivativeId: request.derivativeId,
        mileage: request.odometerReadingMiles,
        advertiserId: request.advertiserId
      });

      // Get access token - use userEmail if provided, otherwise this will fail
      // In production, userEmail should always be provided from the API route
      if (!request.userEmail) {
        console.warn('⚠️ No userEmail provided to AdjustedVehicleMetricsService');
        return this.getFallbackResponse(request);
      }
      
      const authResult = await getAutoTraderToken(request.userEmail);
      if (!authResult.success || !authResult.access_token) {
        console.error('❌ Failed to get AutoTrader access token:', authResult.error);
        return this.getFallbackResponse(request);
      }
      
      const accessToken = authResult.access_token;

      // Prepare request payload - only vehicle data as per AutoTrader API spec
      const payload = {
        vehicle: {
          derivativeId: request.derivativeId,
          firstRegistrationDate: request.firstRegistrationDate,
          odometerReadingMiles: request.odometerReadingMiles
        }
      };

      console.log('📡 Making adjusted metrics API request:', {
        url: `${this.BASE_URL}/vehicle-metrics`,
        advertiserId: request.advertiserId,
        payload
      });

      // Make API request
      const response = await fetch(
        `${this.BASE_URL}/vehicle-metrics?advertiserId=${request.advertiserId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Adjusted metrics API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });

        // Return fallback response
        return this.getFallbackResponse(request);
      }

      const data = await response.json();
      console.log('✅ Adjusted metrics API response:', {
        hasVehicleMetrics: !!data.vehicleMetrics,
        hasLocations: !!data.vehicleMetrics?.retail?.locations?.length,
        locationsCount: data.vehicleMetrics?.retail?.locations?.length || 0
      });

      // Process and enhance the response
      const processedResponse = this.processAdjustedMetrics(data, request);
      
      return {
        ...processedResponse,
        source: 'api'
      };

    } catch (error) {
      console.error('❌ Error fetching adjusted vehicle metrics:', error);
      return this.getFallbackResponse(request);
    }
  }

  /**
   * Process the raw API response and add location-based insights
   */
  private static processAdjustedMetrics(
    data: any, 
    request: AdjustedVehicleMetricsRequest
  ): Partial<AdjustedVehicleMetricsResponse> {
    const vehicleMetrics = data.vehicleMetrics || {};
    const retail = vehicleMetrics.retail || {};
    const locations = retail.locations || [];

    // Generate location adjustments if locations available
    let locationAdjustments: { postcode: string; adjustmentFactor: number; localMarketCondition: string; regionalInsights: string[]; } | undefined = undefined;
    if (locations.length > 0) {
      locationAdjustments = this.generateLocationAdjustments(
        locations, 
        'N/A', 
        retail
      );
    }

    return {
      vehicleMetrics,
      locationAdjustments
    };
  }

  /**
   * Generate location-based adjustments and insights
   */
  private static generateLocationAdjustments(
    locations: any[], 
    postcode: string, 
    baseMetrics: any
  ) {
    // Find location-specific data
    const locationData = locations.find(loc => 
      loc.postcode === postcode || 
      loc.area?.toLowerCase().includes(postcode.toLowerCase())
    ) || locations[0];

    if (!locationData) {
      return undefined;
    }

    // Calculate adjustment factor
    const baseRating = baseMetrics.rating?.value || 50;
    const adjustedRating = locationData.adjustedRating || baseRating;
    const adjustmentFactor = adjustedRating / baseRating;

    // Determine local market condition
    const localMarketCondition = this.determineLocalMarketCondition(
      locationData.localSupply || baseMetrics.supply?.value || 0,
      locationData.localDemand || baseMetrics.demand?.value || 0
    );

    // Generate regional insights
    const regionalInsights = this.generateRegionalInsights(
      locationData,
      baseMetrics,
      adjustmentFactor
    );

    return {
      postcode,
      adjustmentFactor,
      localMarketCondition,
      regionalInsights
    };
  }

  /**
   * Determine local market condition based on supply/demand
   */
  private static determineLocalMarketCondition(supply: number, demand: number): string {
    if (supply === -1 || demand === -1) return 'Unknown';
    
    const ratio = demand / (supply + 0.1); // Avoid division by zero
    
    if (ratio > 1.5) return 'High Demand Market';
    if (ratio > 1.0) return 'Balanced Market';
    if (ratio > 0.5) return 'Moderate Supply Market';
    return 'High Supply Market';
  }

  /**
   * Generate regional insights based on location data
   */
  private static generateRegionalInsights(
    locationData: any,
    baseMetrics: any,
    adjustmentFactor: number
  ): string[] {
    const insights: string[] = [];

    // Adjustment factor insights
    if (adjustmentFactor > 1.1) {
      insights.push('This location shows stronger market performance than average');
    } else if (adjustmentFactor < 0.9) {
      insights.push('This location shows weaker market performance than average');
    }

    // Days to sell insights
    const baseDays = baseMetrics.daysToSell?.value || 45;
    const adjustedDays = locationData.adjustedDaysToSell || baseDays;
    
    if (adjustedDays < baseDays * 0.8) {
      insights.push('Vehicles typically sell faster in this area');
    } else if (adjustedDays > baseDays * 1.2) {
      insights.push('Vehicles may take longer to sell in this area');
    }

    // Supply/demand insights
    if (locationData.localSupply && locationData.localDemand) {
      if (locationData.localDemand > locationData.localSupply) {
        insights.push('Local demand exceeds supply - favorable for sellers');
      } else if (locationData.localSupply > locationData.localDemand * 1.5) {
        insights.push('High local supply - competitive pricing recommended');
      }
    }

    // Default insight if no specific insights generated
    if (insights.length === 0) {
      insights.push('Location-specific data available for enhanced market analysis');
    }

    return insights;
  }

  /**
   * Generate fallback response when API is unavailable
   */
  private static getFallbackResponse(
    request: AdjustedVehicleMetricsRequest
  ): AdjustedVehicleMetricsResponse {
    console.log('📊 Generating fallback adjusted metrics response');

    return {
      vehicleMetrics: {
        retail: {
          supply: { value: -1.0 },
          demand: { value: -1.0 },
          marketCondition: { value: 0.0 },
          rating: { value: 50.0 },
          daysToSell: { value: 45.0 },
          locations: []
        }
      },
      locationAdjustments: {
        postcode: 'N/A',
        adjustmentFactor: 1.0,
        localMarketCondition: 'Unknown',
        regionalInsights: ['Location-specific metrics unavailable - using national averages']
      },
      source: 'fallback',
      error: 'Adjusted vehicle metrics API unavailable'
    };
  }

  /**
   * Validate request parameters
   */
  static validateRequest(request: AdjustedVehicleMetricsRequest): string[] {
    const errors: string[] = [];

    if (!request.derivativeId) {
      errors.push('derivativeId is required');
    }

    if (!request.firstRegistrationDate) {
      errors.push('firstRegistrationDate is required');
    }

    if (!request.odometerReadingMiles || request.odometerReadingMiles < 0) {
      errors.push('Valid odometerReadingMiles is required');
    }

    if (!request.advertiserId) {
      errors.push('advertiserId is required');
    }

    // Postcode validation removed - not needed for vehicle metrics API

    return errors;
  }
}
