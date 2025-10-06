import { Competitor } from './competitionService';

export interface MarketAnalysis {
  position: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  percentile: number;
  competitiveAdvantage: number;
  priceDifference: number;
  marketMedian: number;
  marketAverage: number;
  recommendations: string[];
  daysToSell?: number;
  demandIndicator: 'High' | 'Medium' | 'Low';
}

export interface PriceComparison {
  competitor: Competitor;
  priceDifference: number;
  percentageDifference: number;
  mileageAdjustedPrice?: number;
  isHigherPrice: boolean;
  isLowerPrice: boolean;
  isSimilarPrice: boolean;
}

export class CompetitionAnalyzer {
  static analyzeMarketPosition(
    currentPrice: number,
    currentMileage: number,
    competitors: Competitor[]
  ): MarketAnalysis {
    if (competitors.length === 0) {
      return this.getEmptyAnalysis(currentPrice);
    }

    const prices = competitors.map(c => c.price).sort((a, b) => a - b);
    
    // Calculate percentiles
    const p25 = this.percentile(prices, 0.25);
    const p50 = this.percentile(prices, 0.50); // Median
    const p75 = this.percentile(prices, 0.75);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Determine market position
    let position: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    if (currentPrice <= p25) position = 'Excellent';
    else if (currentPrice <= p50) position = 'Good';
    else if (currentPrice <= p75) position = 'Fair';
    else position = 'Poor';
    
    // Calculate competitive metrics
    const priceDifference = currentPrice - p50;
    const competitiveAdvantage = ((p50 - currentPrice) / p50) * 100;
    const percentile = this.findPercentile(prices, currentPrice);
    
    // Estimate demand and days to sell
    const demandIndicator = this.calculateDemandIndicator(competitors, currentPrice, average);
    const daysToSell = this.estimateDaysToSell(position, competitiveAdvantage, demandIndicator);
    
    return {
      position,
      percentile,
      competitiveAdvantage,
      priceDifference,
      marketMedian: Math.round(p50),
      marketAverage: Math.round(average),
      recommendations: this.generateRecommendations(position, competitiveAdvantage, demandIndicator),
      daysToSell,
      demandIndicator
    };
  }

  static compareWithCompetitors(
    currentPrice: number,
    currentMileage: number,
    competitors: Competitor[]
  ): PriceComparison[] {
    return competitors.map(competitor => {
      const priceDifference = competitor.price - currentPrice;
      const percentageDifference = ((competitor.price - currentPrice) / currentPrice) * 100;
      
      // Adjust for mileage difference (rough estimate: £0.10 per mile difference)
      const mileageDifference = competitor.mileage - currentMileage;
      const mileageAdjustment = mileageDifference * 0.10;
      const mileageAdjustedPrice = competitor.price - mileageAdjustment;
      
      return {
        competitor,
        priceDifference,
        percentageDifference,
        mileageAdjustedPrice: Math.round(mileageAdjustedPrice),
        isHigherPrice: priceDifference > 500, // £500 tolerance
        isLowerPrice: priceDifference < -500,
        isSimilarPrice: Math.abs(priceDifference) <= 500
      };
    });
  }

  static getTopCompetitors(
    currentPrice: number,
    competitors: Competitor[],
    limit: number = 5
  ): Competitor[] {
    // Sort by price similarity and other factors
    return competitors
      .map(competitor => ({
        competitor,
        score: this.calculateCompetitorScore(currentPrice, competitor)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.competitor);
  }

  private static calculateCompetitorScore(currentPrice: number, competitor: Competitor): number {
    let score = 0;
    
    // Price similarity (higher score for similar prices)
    const priceDifference = Math.abs(competitor.price - currentPrice);
    const priceScore = Math.max(0, 100 - (priceDifference / currentPrice) * 100);
    score += priceScore * 0.4;
    
    // Recency (newer cars get higher score)
    const currentYear = new Date().getFullYear();
    const ageScore = Math.max(0, ((competitor.year - 2010) / (currentYear - 2010)) * 100);
    score += ageScore * 0.2;
    
    // Lower mileage gets higher score
    const mileageScore = Math.max(0, 100 - (competitor.mileage / 200000) * 100);
    score += mileageScore * 0.2;
    
    // Distance (closer is better)
    const distanceScore = Math.max(0, 100 - (competitor.distance / 100) * 100);
    score += distanceScore * 0.2;
    
    return score;
  }

  private static percentile(sorted: number[], p: number): number {
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private static findPercentile(sorted: number[], value: number): number {
    const index = sorted.findIndex(price => price >= value);
    return index === -1 ? 100 : (index / sorted.length) * 100;
  }

  private static calculateDemandIndicator(
    competitors: Competitor[],
    currentPrice: number,
    averagePrice: number
  ): 'High' | 'Medium' | 'Low' {
    const competitorCount = competitors.length;
    const priceSpread = this.calculatePriceSpread(competitors.map(c => c.price));
    const pricePosition = (currentPrice - averagePrice) / averagePrice;
    
    // High demand indicators
    if (competitorCount > 20 && priceSpread < 0.3 && pricePosition < 0.1) {
      return 'High';
    }
    
    // Low demand indicators
    if (competitorCount < 5 || priceSpread > 0.5 || pricePosition > 0.2) {
      return 'Low';
    }
    
    return 'Medium';
  }

  private static calculatePriceSpread(prices: number[]): number {
    if (prices.length === 0) return 0;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return (max - min) / average;
  }

  private static estimateDaysToSell(
    position: string,
    competitiveAdvantage: number,
    demandIndicator: string
  ): number {
    let baseDays = 45; // Default estimate
    
    // Adjust based on position
    switch (position) {
      case 'Excellent':
        baseDays = 20;
        break;
      case 'Good':
        baseDays = 35;
        break;
      case 'Fair':
        baseDays = 50;
        break;
      case 'Poor':
        baseDays = 75;
        break;
    }
    
    // Adjust based on demand
    switch (demandIndicator) {
      case 'High':
        baseDays *= 0.7;
        break;
      case 'Low':
        baseDays *= 1.5;
        break;
    }
    
    // Adjust based on competitive advantage
    if (competitiveAdvantage > 10) {
      baseDays *= 0.8;
    } else if (competitiveAdvantage < -10) {
      baseDays *= 1.3;
    }
    
    return Math.round(baseDays);
  }

  private static generateRecommendations(
    position: string,
    competitiveAdvantage: number,
    demandIndicator: string
  ): string[] {
    const recommendations: string[] = [];
    
    // Position-based recommendations
    switch (position) {
      case 'Poor':
        recommendations.push('Consider reducing price by 5-10% to improve competitiveness');
        recommendations.push('Review vehicle condition and specification to justify premium pricing');
        recommendations.push('Highlight unique features or recent maintenance to add value');
        break;
      case 'Fair':
        recommendations.push('Price is acceptable but could be optimized for faster sale');
        recommendations.push('Monitor competitor pricing changes regularly');
        recommendations.push('Consider minor price adjustment if vehicle has been listed for >30 days');
        break;
      case 'Good':
        recommendations.push('Well-positioned in the market for steady sales');
        recommendations.push('Consider slight price increase if demand indicators are positive');
        recommendations.push('Maintain current pricing strategy');
        break;
      case 'Excellent':
        recommendations.push('Excellent market position for quick sale');
        recommendations.push('Consider highlighting competitive pricing in marketing');
        recommendations.push('Price may be increased slightly if demand is high');
        break;
    }
    
    // Competitive advantage recommendations
    if (competitiveAdvantage > 15) {
      recommendations.push('Significant price advantage - expect quick sale');
      recommendations.push('Consider if price is too low and could be increased');
    } else if (competitiveAdvantage < -15) {
      recommendations.push('Price is significantly higher than market average');
      recommendations.push('Strong justification needed for premium pricing');
    }
    
    // Demand-based recommendations
    switch (demandIndicator) {
      case 'High':
        recommendations.push('High market demand detected - pricing flexibility available');
        break;
      case 'Low':
        recommendations.push('Limited market demand - competitive pricing essential');
        break;
      case 'Medium':
        recommendations.push('Moderate market activity - maintain competitive positioning');
        break;
    }
    
    return recommendations;
  }

  private static getEmptyAnalysis(currentPrice: number): MarketAnalysis {
    return {
      position: 'Fair',
      percentile: 50,
      competitiveAdvantage: 0,
      priceDifference: 0,
      marketMedian: currentPrice,
      marketAverage: currentPrice,
      recommendations: ['No competitor data available for analysis'],
      daysToSell: 45,
      demandIndicator: 'Medium'
    };
  }
}
