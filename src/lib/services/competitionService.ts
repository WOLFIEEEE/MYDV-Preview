export interface CompetitionFilters {
  maxDistance?: number;
  priceRange?: { min: number; max: number };
  mileageRange?: { min: number; max: number };
  yearRange?: { min: number; max: number };
}

export interface Competitor {
  id: string;
  make: string;
  model: string;
  variant?: string;
  price: number;
  mileage: number;
  distance: number;
  dealerName: string;
  year: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  location?: string;
  imageUrl?: string;
  advertUrl?: string;
}

export interface MarketPosition {
  belowMarket: number;
  atMarket: number;
  aboveMarket: number;
}

export interface CompetitionResponse {
  competitors: Competitor[];
  marketPosition: MarketPosition;
  averagePrice: number;
  medianPrice: number;
  totalResults: number;
  source: 'api' | 'cache' | 'unavailable';
  message?: string;
  searchRadius: number;
}

interface RawCompetitorData {
  id: string;
  make: string;
  model: string;
  variant?: string;
  price: number;
  mileage: number;
  year: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  dealer?: {
    name: string;
    location?: string;
  };
  distance?: number;
  images?: string[];
  advertUrl?: string;
}

export class CompetitionService {
  static async getCompetitionData(
    vehicleData: Record<string, unknown>, // Specify a more general type
    accessToken: string,
    filters?: CompetitionFilters
  ): Promise<CompetitionResponse> {
    try {
      console.log('🏁 Starting competition analysis for:', {
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        competitorsLink: (vehicleData.links as { competitors?: { href: string } })?.competitors?.href, // Specify type for links
        filters
      });

      // Check if we have a competitors link from the vehicle data
      const competitorsUrl = (vehicleData.links as { competitors?: { href: string } })?.competitors?.href; // Specify type for links
      if (!competitorsUrl) {
        console.log('⚠️ No competitors link found in vehicle data');
        return this.getFallbackResponse(filters);
      }

      // Fetch competition data using the provided competitors URL
      const competitionData = await this.fetchFromCompetitorsUrl(
        competitorsUrl,
        accessToken,
        filters
      );

      return this.parseCompetitionData(competitionData);

    } catch (error) {
      console.error('❌ Competition data fetch failed:', error);
      return this.getFallbackResponse(filters);
    }
  }

  private static buildSearchParams(vehicleData: Record<string, unknown>, filters?: CompetitionFilters) {
    const params = new URLSearchParams();
    
    // Core vehicle parameters
    if (vehicleData.make) params.append('make', vehicleData.make as string);
    if (vehicleData.model) params.append('model', vehicleData.model as string);
    if (vehicleData.fuelType) params.append('fuelType', vehicleData.fuelType as string);
    if (vehicleData.transmission) params.append('transmission', vehicleData.transmission as string);
    if (vehicleData.bodyType) params.append('bodyType', vehicleData.bodyType as string);
    
    // Year range (±2 years from current vehicle)
    const currentYear = (vehicleData.year as number) || new Date().getFullYear();
    const minYear = filters?.yearRange?.min || Math.max(2010, currentYear - 2);
    const maxYear = filters?.yearRange?.max || Math.min(new Date().getFullYear(), currentYear + 2);
    params.append('minYear', minYear.toString());
    params.append('maxYear', maxYear.toString());
    
    // Distance
    const distance = filters?.maxDistance || 50;
    params.append('distance', distance.toString());
    
    // Price range
    if (filters?.priceRange) {
      params.append('priceFrom', filters.priceRange.min.toString());
      params.append('priceTo', filters.priceRange.max.toString());
    }
    
    // Mileage range
    if (filters?.mileageRange) {
      params.append('mileageFrom', filters.mileageRange.min.toString());
      params.append('mileageTo', filters.mileageRange.max.toString());
    }
    
    // Additional parameters
    params.append('sort', 'price-asc');
    params.append('size', '50'); // Limit results
    params.append('searchType', 'competitor');
    
    return params;
  }

  private static async fetchFromCompetitorsUrl(
    competitorsUrl: string,
    accessToken: string,
    filters?: CompetitionFilters
  ): Promise<RawCompetitorData[]> {
    console.log('📡 Making competition request to competitors URL:', competitorsUrl);
    
    // Apply additional filters to the URL if provided
    let finalUrl = competitorsUrl;
    if (filters) {
      const url = new URL(competitorsUrl);
      
      // Add distance filter if specified
      if (filters.maxDistance && filters.maxDistance !== 50) {
        url.searchParams.set('distance', filters.maxDistance.toString());
      }
      
      // Add price range filters if specified
      if (filters.priceRange) {
        if (filters.priceRange.min > 0) {
          url.searchParams.set('priceFrom', filters.priceRange.min.toString());
        }
        if (filters.priceRange.max < 100000) {
          url.searchParams.set('priceTo', filters.priceRange.max.toString());
        }
      }
      
      // Add mileage range filters if specified
      if (filters.mileageRange) {
        if (filters.mileageRange.min > 0) {
          url.searchParams.set('mileageFrom', filters.mileageRange.min.toString());
        }
        if (filters.mileageRange.max < 200000) {
          url.searchParams.set('mileageTo', filters.mileageRange.max.toString());
        }
      }
      
      finalUrl = url.toString();
    }
    
    console.log('📡 Final competition URL:', finalUrl);
    
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`AutoTrader competitors API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Competition data received:', {
      totalResults: data.totalResults || data.length,
      sampleCount: Math.min(5, (data.results || data).length)
    });

    return data.results || data || [];
  }

  private static getFallbackResponse(filters?: CompetitionFilters): CompetitionResponse {
    return {
      competitors: [],
      marketPosition: { belowMarket: 0, atMarket: 0, aboveMarket: 0 },
      averagePrice: 0,
      medianPrice: 0,
      totalResults: 0,
      source: 'unavailable',
      message: 'Competition data temporarily unavailable',
      searchRadius: filters?.maxDistance || 50
    };
  }

  private static parseCompetitionData(
    rawData: RawCompetitorData[]
  ): CompetitionResponse {
    console.log('🔄 Processing competition data:', { count: rawData.length });
    
    // Transform raw data to competitor format based on AutoTrader API structure
    const competitors: Competitor[] = rawData.map((item, index) => {
      const vehicle = item; // Use item directly as vehicle
      const advertiser = item.dealer || { name: 'Unknown Dealer', location: undefined }; // Provide default values
      const media = item.images || []; // Use images directly
      
      return {
        id: item.id || `competitor-${index}`,
        make: vehicle.make || 'Unknown',
        model: vehicle.model || 'Unknown',
        variant: vehicle.variant || 'Unknown',
        price: vehicle.price || 0,
        mileage: vehicle.mileage || 0,
        distance: vehicle.distance || 0,
        dealerName: advertiser.name,
        year: vehicle.year || new Date().getFullYear(),
        fuelType: vehicle.fuelType || 'Unknown',
        transmission: vehicle.transmission || 'Unknown',
        bodyType: vehicle.bodyType || 'Unknown',
        location: advertiser.location,
        imageUrl: media[0] || undefined,
        advertUrl: vehicle.advertUrl || undefined
      };
    }).filter(competitor => competitor.price > 0); // Filter out invalid entries

    // Calculate market statistics
    const prices = competitors.map(c => c.price).sort((a, b) => a - b);
    const averagePrice = prices.length > 0 
      ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
      : 0;
    
    const medianPrice = prices.length > 0
      ? prices.length % 2 === 0
        ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
        : prices[Math.floor(prices.length / 2)]
      : 0;

    // Calculate market position distribution
    const tolerance = 0.05; // 5% tolerance for "at market"
    const belowMarket = prices.filter(price => price < averagePrice * (1 - tolerance)).length;
    const aboveMarket = prices.filter(price => price > averagePrice * (1 + tolerance)).length;
    const atMarket = prices.length - belowMarket - aboveMarket;

    const result = {
      competitors,
      marketPosition: {
        belowMarket,
        atMarket,
        aboveMarket
      },
      averagePrice,
      medianPrice,
      totalResults: competitors.length,
      source: 'api' as const,
      searchRadius: 50 // Default, should be extracted from search params
    };

    console.log('📊 Competition analysis complete:', {
      competitors: competitors.length,
      averagePrice,
      medianPrice,
      marketPosition: result.marketPosition
    });

    return result;
  }
}
