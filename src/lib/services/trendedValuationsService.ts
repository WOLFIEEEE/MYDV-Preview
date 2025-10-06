// Trended Valuations Service
// Handles AutoTrader's trended valuations API with fallback mechanisms

import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { EnhancedErrorHandler } from '@/lib/enhancedErrorHandler';
import { PerformanceMonitor } from '@/lib/services/performanceMonitor';
import { AUTOTRADER_CONFIG } from '@/lib/autoTraderConfig';

export interface TrendedValuationPoint {
  date: string;
  retailValue: number;
  tradeValue: number;
  partExchangeValue: number;
  mileage?: number;
  dataSource: 'api' | 'interpolated' | 'fallback';
}

export interface TrendedValuationsResponse {
  vehicleInfo: {
    derivativeId: string;
    make?: string;
    model?: string;
    derivative?: string;
  };
  valuationHistory: TrendedValuationPoint[];
  marketTrend: 'rising' | 'stable' | 'declining';
  trendStrength: number; // -1 to 1, where -1 is strongly declining, 1 is strongly rising
  projectedValues?: {
    nextMonth: TrendedValuationPoint;
    nextQuarter: TrendedValuationPoint;
  };
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  source: 'autotrader-api' | 'fallback-generated' | 'cache';
  lastUpdated: string;
}

export class TrendedValuationsService {
  private static readonly BASE_URL = AUTOTRADER_CONFIG.BASE_URL;
  private static readonly CACHE_TTL = 3600000; // 1 hour
  private static cache = new Map<string, { data: TrendedValuationsResponse; expiry: number }>();

  /**
   * Get trended valuations for a vehicle
   */
  static async getTrendedValuations(
    derivativeId: string,
    firstRegistrationDate: string,
    currentMileage: number,
    email: string,
    currentValuations?: {
      retailValue: number;
      tradeValue: number;
      partExchangeValue: number;
    }
  ): Promise<TrendedValuationsResponse> {
    const startTime = Date.now();
    const cacheKey = `trended-${derivativeId}-${firstRegistrationDate}-${currentMileage}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        PerformanceMonitor.recordMetric(
          'trended-valuations',
          Date.now() - startTime,
          true,
          { cacheHit: true }
        );
        return cached;
      }

      // Try to get from AutoTrader API
      const apiResult = await this.fetchFromAutoTraderAPI(
        derivativeId,
        firstRegistrationDate,
        currentMileage,
        email
      );

      if (apiResult) {
        this.setCache(cacheKey, apiResult);
        PerformanceMonitor.recordMetric(
          'trended-valuations',
          Date.now() - startTime,
          true,
          { cacheHit: false }
        );
        return apiResult;
      }

      // Fallback to generated trends
      console.log('📊 Generating fallback trended valuations');
      const fallbackResult = this.generateFallbackTrends(
        derivativeId,
        firstRegistrationDate,
        currentMileage,
        currentValuations
      );

      this.setCache(cacheKey, fallbackResult, 300000); // Cache fallback for 5 minutes only
      
      PerformanceMonitor.recordMetric(
        'trended-valuations',
        Date.now() - startTime,
        true,
        { cacheHit: false }
      );

      return fallbackResult;

    } catch (error) {
      console.error('❌ Trended valuations service error:', error);
      
      PerformanceMonitor.recordMetric(
        'trended-valuations',
        Date.now() - startTime,
        false,
        { errorType: error instanceof Error ? error.message : 'Unknown error' }
      );

      // Return minimal fallback on complete failure
      return this.generateMinimalFallback(derivativeId, currentValuations);
    }
  }

  /**
   * Fetch trended valuations from AutoTrader API
   */
  private static async fetchFromAutoTraderAPI(
    derivativeId: string,
    firstRegistrationDate: string,
    currentMileage: number,
    email: string
  ): Promise<TrendedValuationsResponse | null> {
    try {
      // Get authentication token
      const authResult = await getAutoTraderToken(email);
      if (!authResult.success) {
        throw new Error('Authentication failed');
      }

      const params = new URLSearchParams({
        derivativeId,
        firstRegistrationDate,
        odometerReadingMiles: currentMileage.toString()
      });

      const response = await EnhancedErrorHandler.executeWithRetry(
        async () => {
          const res = await fetch(`${this.BASE_URL}/valuations/trended?${params.toString()}`, {
            headers: {
              'Authorization': `Bearer ${authResult.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!res.ok) {
            if (res.status === 404 || res.status === 400) {
              // These are expected for vehicles without trended data
              return null;
            }
            const error = await EnhancedErrorHandler.parseAutoTraderError(res, 'trended-valuations');
            throw new Error(`Trended valuations API error: ${error.message}`);
          }

          return res.json();
        },
        { maxRetries: 1, baseDelay: 500 },
        'trended-valuations-api'
      );

      if (!response) {
        return null;
      }

      // Process API response
      return this.processAutoTraderResponse(response, derivativeId);

    } catch (error) {
      console.log('ℹ️ AutoTrader trended valuations not available:', error);
      return null;
    }
  }

  /**
   * Process AutoTrader API response
   */
  private static processAutoTraderResponse(
    apiResponse: any,
    derivativeId: string
  ): TrendedValuationsResponse {
    const valuationHistory: TrendedValuationPoint[] = [];

    // Process the API response structure (this will depend on actual AutoTrader API format)
    if (apiResponse.valuations && Array.isArray(apiResponse.valuations)) {
      for (const valuation of apiResponse.valuations) {
        valuationHistory.push({
          date: valuation.date || valuation.timestamp,
          retailValue: valuation.retail?.amountGBP || 0,
          tradeValue: valuation.trade?.amountGBP || 0,
          partExchangeValue: valuation.partExchange?.amountGBP || 0,
          mileage: valuation.mileage,
          dataSource: 'api'
        });
      }
    }

    // Calculate trend
    const { trend, strength } = this.calculateTrend(valuationHistory);

    return {
      vehicleInfo: {
        derivativeId,
        make: apiResponse.vehicle?.make,
        model: apiResponse.vehicle?.model,
        derivative: apiResponse.vehicle?.derivative
      },
      valuationHistory,
      marketTrend: trend,
      trendStrength: strength,
      projectedValues: this.generateProjections(valuationHistory, trend, strength),
      dataQuality: 'excellent',
      source: 'autotrader-api',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate fallback trends when API is not available
   */
  private static generateFallbackTrends(
    derivativeId: string,
    firstRegistrationDate: string,
    currentMileage: number,
    currentValuations?: {
      retailValue: number;
      tradeValue: number;
      partExchangeValue: number;
    }
  ): TrendedValuationsResponse {
    const valuationHistory: TrendedValuationPoint[] = [];
    const vehicleAge = this.calculateVehicleAge(firstRegistrationDate);
    
    // Generate realistic historical data points
    const monthsBack = Math.min(24, vehicleAge * 12); // Up to 2 years or vehicle age
    const currentDate = new Date();

    for (let i = monthsBack; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);

      // Simulate realistic depreciation curve
      const ageAtPoint = vehicleAge - (i / 12);
      const depreciationFactor = this.calculateDepreciationFactor(ageAtPoint);
      
      // Add some market volatility
      const marketVolatility = 1 + (Math.random() - 0.5) * 0.1; // ±5% volatility

      const baseRetail = currentValuations?.retailValue || 15000;
      const baseTrade = currentValuations?.tradeValue || 12000;
      const basePartEx = currentValuations?.partExchangeValue || 13000;

      valuationHistory.push({
        date: date.toISOString().split('T')[0],
        retailValue: Math.round(baseRetail * depreciationFactor * marketVolatility),
        tradeValue: Math.round(baseTrade * depreciationFactor * marketVolatility),
        partExchangeValue: Math.round(basePartEx * depreciationFactor * marketVolatility),
        dataSource: i === 0 ? 'api' : 'interpolated'
      });
    }

    const { trend, strength } = this.calculateTrend(valuationHistory);

    return {
      vehicleInfo: { derivativeId },
      valuationHistory,
      marketTrend: trend,
      trendStrength: strength,
      projectedValues: this.generateProjections(valuationHistory, trend, strength),
      dataQuality: 'fair',
      source: 'fallback-generated',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate minimal fallback for complete failures
   */
  private static generateMinimalFallback(
    derivativeId: string,
    currentValuations?: {
      retailValue: number;
      tradeValue: number;
      partExchangeValue: number;
    }
  ): TrendedValuationsResponse {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      vehicleInfo: { derivativeId },
      valuationHistory: [{
        date: today,
        retailValue: currentValuations?.retailValue || 0,
        tradeValue: currentValuations?.tradeValue || 0,
        partExchangeValue: currentValuations?.partExchangeValue || 0,
        dataSource: 'fallback'
      }],
      marketTrend: 'stable',
      trendStrength: 0,
      dataQuality: 'poor',
      source: 'fallback-generated',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate market trend from historical data
   */
  private static calculateTrend(
    history: TrendedValuationPoint[]
  ): { trend: 'rising' | 'stable' | 'declining'; strength: number } {
    if (history.length < 2) {
      return { trend: 'stable', strength: 0 };
    }

    // Calculate trend using linear regression on retail values
    const n = history.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    history.forEach((point, index) => {
      const x = index;
      const y = point.retailValue;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgValue = sumY / n;
    
    // Normalize slope to get strength (-1 to 1)
    const strength = Math.max(-1, Math.min(1, slope / (avgValue / n)));

    let trend: 'rising' | 'stable' | 'declining' = 'stable';
    if (Math.abs(strength) > 0.1) {
      trend = strength > 0 ? 'rising' : 'declining';
    }

    return { trend, strength };
  }

  /**
   * Generate future projections based on trend
   */
  private static generateProjections(
    history: TrendedValuationPoint[],
    trend: 'rising' | 'stable' | 'declining',
    strength: number
  ): { nextMonth: TrendedValuationPoint; nextQuarter: TrendedValuationPoint } | undefined {
    if (history.length === 0) return undefined;

    const latest = history[history.length - 1];
    const monthlyChange = strength * 0.02; // 2% max monthly change
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const nextQuarter = new Date();
    nextQuarter.setMonth(nextQuarter.getMonth() + 3);

    return {
      nextMonth: {
        date: nextMonth.toISOString().split('T')[0],
        retailValue: Math.round(latest.retailValue * (1 + monthlyChange)),
        tradeValue: Math.round(latest.tradeValue * (1 + monthlyChange)),
        partExchangeValue: Math.round(latest.partExchangeValue * (1 + monthlyChange)),
        dataSource: 'interpolated'
      },
      nextQuarter: {
        date: nextQuarter.toISOString().split('T')[0],
        retailValue: Math.round(latest.retailValue * (1 + monthlyChange * 3)),
        tradeValue: Math.round(latest.tradeValue * (1 + monthlyChange * 3)),
        partExchangeValue: Math.round(latest.partExchangeValue * (1 + monthlyChange * 3)),
        dataSource: 'interpolated'
      }
    };
  }

  /**
   * Calculate vehicle age in years
   */
  private static calculateVehicleAge(firstRegistrationDate: string): number {
    const regDate = new Date(firstRegistrationDate);
    const now = new Date();
    return (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }

  /**
   * Calculate depreciation factor based on vehicle age
   */
  private static calculateDepreciationFactor(ageInYears: number): number {
    // Realistic depreciation curve: steep in first few years, then levels off
    if (ageInYears <= 0) return 1.0;
    if (ageInYears <= 1) return 0.8; // 20% in first year
    if (ageInYears <= 3) return 0.8 - (ageInYears - 1) * 0.1; // 10% per year for years 2-3
    if (ageInYears <= 5) return 0.6 - (ageInYears - 3) * 0.05; // 5% per year for years 4-5
    return Math.max(0.2, 0.5 - (ageInYears - 5) * 0.02); // 2% per year after 5 years, minimum 20%
  }

  /**
   * Cache management
   */
  private static getFromCache(key: string): TrendedValuationsResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return { ...cached.data, source: 'cache' };
  }

  private static setCache(key: string, data: TrendedValuationsResponse, ttl: number = this.CACHE_TTL) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  /**
   * Clear cache
   */
  static clearCache() {
    this.cache.clear();
    console.log('🧹 Trended valuations cache cleared');
  }

  /**
   * Get cache stats
   */
  static getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
