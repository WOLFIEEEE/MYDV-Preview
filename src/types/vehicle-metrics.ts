// AutoTrader Vehicle Metrics Types
export interface VehicleMetrics {
  retail: {
    supply: {
      value: number; // -1.0 indicates no data, positive values indicate supply level
    };
    demand: {
      value: number; // -1.0 indicates no data, positive values indicate demand level
    };
    marketCondition: {
      value: number; // Market condition indicator (0.0 = neutral)
    };
    rating: {
      value: number; // Retail rating (0-100 scale)
    };
    daysToSell: {
      value: number; // Estimated days to sell
    };
    locations: any[]; // Location-specific data (if available)
  };
}

export interface VehicleMetricsAnalysis {
  supplyLevel: 'High' | 'Medium' | 'Low' | 'Unknown';
  demandLevel: 'High' | 'Medium' | 'Low' | 'Unknown';
  marketCondition: 'Favorable' | 'Neutral' | 'Challenging' | 'Unknown';
  retailRating: number;
  retailRatingGrade: 'Excellent' | 'Good' | 'Average' | 'Poor';
  daysToSell: number;
  sellTimeCategory: 'Fast' | 'Average' | 'Slow';
  recommendations: string[];
  confidence: 'High' | 'Medium' | 'Low';
}

export interface VehicleMetricsRequest {
  derivativeId: string;
  firstRegistrationDate: string;
  odometerReadingMiles: number;
  advertiserId?: string;
}

export interface VehicleMetricsResponse {
  vehicleMetrics?: VehicleMetrics;
  analysis?: VehicleMetricsAnalysis;
  source: 'api' | 'unavailable';
  message?: string;
}

// Utility functions for analyzing metrics
export class VehicleMetricsAnalyzer {
  static analyzeMetrics(metrics: VehicleMetrics): VehicleMetricsAnalysis {
    const retail = metrics.retail;
    
    // Analyze supply level
    const supplyLevel = this.getSupplyLevel(retail.supply.value);
    
    // Analyze demand level  
    const demandLevel = this.getDemandLevel(retail.demand.value);
    
    // Analyze market condition
    const marketCondition = this.getMarketCondition(retail.marketCondition.value);
    
    // Analyze retail rating
    const retailRating = retail.rating.value;
    const retailRatingGrade = this.getRetailRatingGrade(retailRating);
    
    // Analyze days to sell
    const daysToSell = retail.daysToSell.value;
    const sellTimeCategory = this.getSellTimeCategory(daysToSell);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      supplyLevel,
      demandLevel,
      marketCondition,
      retailRatingGrade,
      sellTimeCategory
    );
    
    // Determine confidence level
    const confidence = this.getConfidenceLevel(retail);
    
    return {
      supplyLevel,
      demandLevel,
      marketCondition,
      retailRating,
      retailRatingGrade,
      daysToSell,
      sellTimeCategory,
      recommendations,
      confidence
    };
  }
  
  private static getSupplyLevel(value: number): 'High' | 'Medium' | 'Low' | 'Unknown' {
    if (value === -1.0) return 'Unknown';
    if (value > 0.7) return 'High';
    if (value > 0.3) return 'Medium';
    return 'Low';
  }
  
  private static getDemandLevel(value: number): 'High' | 'Medium' | 'Low' | 'Unknown' {
    if (value === -1.0) return 'Unknown';
    if (value > 0.7) return 'High';
    if (value > 0.3) return 'Medium';
    return 'Low';
  }
  
  private static getMarketCondition(value: number): 'Favorable' | 'Neutral' | 'Challenging' | 'Unknown' {
    if (value > 0.2) return 'Favorable';
    if (value > -0.2) return 'Neutral';
    if (value > -1.0) return 'Challenging';
    return 'Unknown';
  }
  
  private static getRetailRatingGrade(rating: number): 'Excellent' | 'Good' | 'Average' | 'Poor' {
    if (rating >= 80) return 'Excellent';
    if (rating >= 60) return 'Good';
    if (rating >= 40) return 'Average';
    return 'Poor';
  }
  
  private static getSellTimeCategory(days: number): 'Fast' | 'Average' | 'Slow' {
    if (days <= 30) return 'Fast';
    if (days <= 60) return 'Average';
    return 'Slow';
  }
  
  private static generateRecommendations(
    supply: string,
    demand: string,
    market: string,
    rating: string,
    sellTime: string
  ): string[] {
    const recommendations: string[] = [];
    
    // Supply/Demand recommendations
    if (supply === 'High' && demand === 'Low') {
      recommendations.push('High supply, low demand - consider competitive pricing');
    } else if (supply === 'Low' && demand === 'High') {
      recommendations.push('Low supply, high demand - pricing flexibility available');
    }
    
    // Market condition recommendations
    if (market === 'Challenging') {
      recommendations.push('Challenging market conditions - focus on competitive advantages');
    } else if (market === 'Favorable') {
      recommendations.push('Favorable market conditions - good time to sell');
    }
    
    // Rating recommendations
    if (rating === 'Poor') {
      recommendations.push('Below-average retail rating - review pricing strategy');
    } else if (rating === 'Excellent') {
      recommendations.push('Excellent retail rating - well-positioned for quick sale');
    }
    
    // Sell time recommendations
    if (sellTime === 'Slow') {
      recommendations.push('Extended selling time expected - consider marketing enhancements');
    } else if (sellTime === 'Fast') {
      recommendations.push('Quick sale expected - maintain current strategy');
    }
    
    return recommendations;
  }
  
  private static getConfidenceLevel(retail: any): 'High' | 'Medium' | 'Low' {
    const hasSupplyData = retail.supply.value !== -1.0;
    const hasDemandData = retail.demand.value !== -1.0;
    const hasRatingData = retail.rating.value > 0;
    const hasDaysToSellData = retail.daysToSell.value > 0;
    
    const dataPoints = [hasSupplyData, hasDemandData, hasRatingData, hasDaysToSellData].filter(Boolean).length;
    
    if (dataPoints >= 3) return 'High';
    if (dataPoints >= 2) return 'Medium';
    return 'Low';
  }
}
