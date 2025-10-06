import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// Competition Analysis Request Interface
interface CompetitionRequest {
  vehicle: {
    make: string;
    model: string;
    year: number;
    mileage: number;
    registration: string;
    fuelType?: string;
    transmission?: string;
    bodyType?: string;
    derivative?: string;
  };
  filters?: {
    max_distance?: number;
    price_range?: { min: number; max: number; };
    year_range?: { min: number; max: number; };
    mileage_variance?: number; // percentage
    include_similar_models?: boolean;
  };
  user_price?: number; // User's asking price for comparison
}

// Enhanced Competitor Interface
interface EnhancedCompetitor {
  id: string;
  make: string;
  model: string;
  derivative: string;
  generation: string;
  price: number;
  mileage: number;
  year: number;
  registration: string;
  fuel_type: string;
  transmission: string;
  body_type: string;
  engine_size: number;
  engine_power: number;
  doors: number;
  seats: number;
  dealer_name: string;
  dealer_segment: string;
  dealer_phone: string;
  dealer_website: string;
  location: {
    address: string;
    town: string;
    county: string;
    region: string;
    postcode: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  days_listed: number;
  last_updated: string;
  lifecycle_state: string;
  attention_grabber: string;
  description: string;
  price_indicator: string;
  retail_valuation?: number;
  vat_status: string;
  images: Array<{
    id: string;
    url: string;
    category: string;
    label: string;
  }>;
  video_url: string | null;
  market_valuations: {
    retail: number;
    trade: number;
    part_exchange: number;
    private: number;
  } | null;
  key_features: Array<{
    name: string;
    category: string;
    type: string;
  }>;
  highlights: string[];
  vehicle_history: {
    previous_owners: number;
    imported: boolean;
    exported: boolean;
    stolen: boolean;
    scrapped: boolean;
  } | null;
  vehicle_check: {
    finance_outstanding: boolean;
    insurance_writeoff: string | null;
    mileage_discrepancy: boolean;
    colour_changed: boolean;
    high_risk: boolean;
  } | null;
  mot_expiry: string | null;
  service_history: string | null;
  warranty_months: number;
  keys: number;
  v5_present: boolean;
  battery_info: {
    range_miles: number;
    capacity_kwh: number;
    usable_capacity_kwh: number;
  } | null;
  performance: {
    top_speed_mph: number;
    zero_to_sixty: number;
    co2_emissions: number;
    fuel_economy: number;
  };
  dimensions: {
    length_mm: number;
    width_mm: number;
    height_mm: number;
    wheelbase_mm: number;
    boot_space_litres: number;
  };
}

// Competition Analysis Response Interface
interface CompetitionResponse {
  competitors: EnhancedCompetitor[];
  market_analysis: {
    total_competitors: number;
    average_price: number;
    median_price: number;
    price_range: { min: number; max: number };
    user_position?: {
      percentile: number;
      below_user_price: number;
      above_user_price: number;
      price_rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH';
    };
    market_insights: {
      most_common_price_range: { min: number; max: number };
      price_distribution: Array<{ range: string; count: number; percentage: number }>;
      geographic_spread: Array<{ location: string; count: number; avg_price: number }>;
      age_analysis: Array<{ year: number; count: number; avg_price: number }>;
      mileage_analysis: Array<{ range: string; count: number; avg_price: number }>;
    };
  };
  recommendations: {
    pricing_strategy: string;
    competitive_advantages: string[];
    areas_for_improvement: string[];
    market_timing: string;
  };
  metadata: {
    search_radius: number;
    filters_applied: any;
    last_updated: string;
    data_freshness: 'live' | 'recent' | 'cached';
  };
}

export async function POST(request: NextRequest) {
  console.log('🏁 API Route: Competition analysis request received');

  try {
    // Authentication check
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'competition'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User email not found',
        details: 'No email address found for the authenticated user',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'competition'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('🔍 Competition analysis request data:', body);

    // Validate required fields - either competitors URL or vehicle make/model
    if (!body.vehicle || (!body.vehicle.competitorsUrl && (!body.vehicle.make || !body.vehicle.model))) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Vehicle information required',
        details: 'Please provide either competitors URL or vehicle make and model',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'competition'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    const requestData: CompetitionRequest = body;

    // Get user's store configuration for advertiser ID
    const storeConfigResult = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clerkUserId, user.id))
      .limit(1);

    let advertiserId: string | undefined;
    if (storeConfigResult.length > 0) {
      advertiserId = storeConfigResult[0].primaryAdvertisementId || undefined;
    }

    // Get authentication token for AutoTrader API
    const authResult = await getAutoTraderToken(email);
    if (!authResult.success) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Failed to authenticate with AutoTrader',
        details: authResult.error ? String(authResult.error) : 'Authentication failed',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'competition'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Perform competition analysis
    if (!authResult.access_token) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'No access token available',
        details: 'AutoTrader access token is missing',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'competition'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }
    
    const competitionData = await performCompetitionAnalysis(
      requestData,
      authResult.access_token,
      advertiserId
    );

    console.log('✅ Competition analysis completed successfully');

    return NextResponse.json(
      createSuccessResponse(competitionData, 'competition')
    );

  } catch (error) {
    console.error('❌ Competition analysis error:', error);
    const internalError = createInternalErrorResponse(error, 'competition');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// Main competition analysis function
async function performCompetitionAnalysis(
  request: CompetitionRequest,
  accessToken: string,
  advertiserId?: string
): Promise<CompetitionResponse> {
  const { vehicle, filters = {}, user_price } = request;

  console.log('🔍 Starting competition analysis for:', vehicle);

  // Set default filters
  const searchFilters = {
    max_distance: filters.max_distance || 50,
    price_range: filters.price_range,
    year_range: filters.year_range || { 
      min: Math.max(1990, vehicle.year - 3), 
      max: vehicle.year + 2 
    },
    mileage_variance: filters.mileage_variance || 30, // 30% variance
    include_similar_models: filters.include_similar_models || false
  };

  // Fetch competitor data from AutoTrader
  const competitorData = await fetchCompetitorData(
    vehicle,
    searchFilters,
    accessToken,
    advertiserId
  );

  // Process and analyze the data
  const analysis = analyzeCompetitionData(competitorData, vehicle, user_price);

  // Generate recommendations
  const recommendations = generateCompetitionRecommendations(analysis, vehicle, user_price);

  const finalResult = {
    competitors: competitorData.slice(0, 50), // Limit to top 50 results
    market_analysis: {
      ...analysis,
      // Add camelCase aliases for frontend compatibility
      totalCompetitors: analysis.total_competitors,
      averagePrice: analysis.average_price,
      medianPrice: analysis.median_price,
      priceRange: analysis.price_range,
      marketPosition: analysis.user_position?.percentile || 0
    },
    recommendations,
    metadata: {
      search_radius: searchFilters.max_distance,
      filters_applied: searchFilters,
      last_updated: new Date().toISOString(),
      data_freshness: 'live' as 'live' | 'recent' | 'cached'
    }
  };

  console.log(`🚀 Competition analysis complete:`, {
    competitorsCount: finalResult.competitors.length,
    totalCompetitors: finalResult.market_analysis.totalCompetitors,
    averagePrice: finalResult.market_analysis.averagePrice,
    sampleCompetitor: finalResult.competitors[0]
  });

  return finalResult;
}

// Fetch competitor data from AutoTrader API
async function fetchCompetitorData(
  vehicle: any,
  filters: any,
  accessToken: string,
  advertiserId?: string
): Promise<any[]> {
  try {
    const baseUrl = getAutoTraderBaseUrlForServer();
    
    // If we have a competitors URL from the vehicle data, use it directly
    if (vehicle.competitorsUrl) {
      console.log('🔗 Using competitors URL from vehicle data:', vehicle.competitorsUrl);
      
      const response = await fetch(vehicle.competitorsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Competitors API failed with status ${response.status}:`, errorText);
        throw new Error(`Competitors API failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched full competition data: ${data.results?.length || 0} competitors`);
      
      // Process the full AutoTrader competition response
      const processedCompetitors = processFullCompetitionData(data.results || []);
      console.log(`🔍 Processed competitors:`, {
        originalCount: data.results?.length || 0,
        processedCount: processedCompetitors.length,
        sampleCompetitor: processedCompetitors[0]
      });
      
      return processedCompetitors;
    }
    
    // Fallback: Build comprehensive search parameters manually
    const searchParams = new URLSearchParams({
      searchType: 'competitor',
      valuations: 'true',
      sort: 'price-asc',
      size: '100' // Get more results for better analysis
    });

    // Add advertiser ID if available
    if (advertiserId) {
      searchParams.append('advertiserId', advertiserId);
    }

    // Exclude user's own vehicle
    if (vehicle.registration) {
      searchParams.append('registration!', vehicle.registration);
    }

    // Vehicle criteria
    searchParams.append('standardMake', vehicle.make);
    searchParams.append('standardModel', vehicle.model);
    
    if (vehicle.fuelType) {
      searchParams.append('standardFuelType', vehicle.fuelType);
    }
    
    if (vehicle.transmission) {
      searchParams.append('standardTransmissionType', vehicle.transmission);
    }
    
    if (vehicle.bodyType) {
      searchParams.append('standardBodyType', vehicle.bodyType);
    }

    // Year range
    searchParams.append('minYear', filters.year_range.min.toString());
    searchParams.append('maxYear', filters.year_range.max.toString());

    // Mileage range
    if (vehicle.mileage) {
      const mileageVariance = Math.round(vehicle.mileage * (filters.mileage_variance / 100));
      searchParams.append('minMileage', Math.max(0, vehicle.mileage - mileageVariance).toString());
      searchParams.append('maxMileage', Math.min(300000, vehicle.mileage + mileageVariance).toString());
    }

    // Price range if specified
    if (filters.price_range) {
      searchParams.append('minPrice', filters.price_range.min.toString());
      searchParams.append('maxPrice', filters.price_range.max.toString());
    }

    // Distance filter
    searchParams.append('distance', filters.max_distance.toString());

    const searchUrl = `${baseUrl}/stock?${searchParams.toString()}`;
    console.log('📡 Making competition search request to:', searchUrl);

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('⚠️ Competition search failed:', response.status);
      return [];
    }

    const data = await response.json();
    console.log(`✅ Found ${data.results?.length || 0} competitors`);

    // Process and format competitor data
    return (data.results || []).map((comp: any) => ({
      id: comp.stockId || comp.id || Math.random().toString(36),
      make: comp.make || vehicle.make,
      model: comp.model || vehicle.model,
      derivative: comp.derivative,
      price: comp.price?.totalPrice || comp.price?.suppliedPrice || 0,
      mileage: comp.odometerReadingMiles || 0,
      year: comp.yearOfManufacture || 0,
      distance: comp.distance || 0,
      dealer_name: comp.advertiser?.name || 'Unknown Dealer',
      location: comp.advertiser?.location || comp.location,
      fuel_type: comp.fuelType,
      transmission: comp.transmission,
      body_type: comp.bodyType,
      days_listed: comp.daysListed,
      price_change: comp.priceChange,
      images: comp.media?.images?.slice(0, 3) || [],
      url: comp.url || comp.detailsUrl
    })).filter((comp: any) => comp.price > 0);

  } catch (error) {
    console.error('❌ Competitor data fetch error:', error);
    return [];
  }
}

// Process full AutoTrader competition data and extract important information
function processFullCompetitionData(results: any[]): any[] {
  console.log('🔍 Processing full competition data from AutoTrader...');
  
  return results.map((competitor: any) => {
    const vehicle = competitor.vehicle || {};
    const advertiser = competitor.advertiser || {};
    const adverts = competitor.adverts || {};
    const retailAdverts = adverts.retailAdverts || {};
    const metadata = competitor.metadata || {};
    const media = competitor.media || {};
    const valuations = competitor.valuations || {};
    const features = competitor.features || [];
    const highlights = competitor.highlights || [];

    // Extract key vehicle information
    const processedCompetitor = {
      id: metadata.stockId || metadata.externalStockId || Math.random().toString(36),
      
      // Vehicle details
      make: vehicle.make || 'Unknown',
      model: vehicle.model || 'Unknown',
      derivative: vehicle.derivative || vehicle.trim || '',
      generation: vehicle.generation || '',
      
      // Pricing information
      price: retailAdverts.suppliedPrice?.amountGBP || 
             retailAdverts.totalPrice?.amountGBP || 
             adverts.forecourtPrice?.amountGBP || 0,
      
      // Vehicle specifications
      mileage: vehicle.odometerReadingMiles || 0,
      year: parseInt(vehicle.yearOfManufacture) || 0,
      registration: vehicle.registration || '',
      
      // Technical specs
      fuel_type: vehicle.fuelType || '',
      transmission: vehicle.transmissionType || '',
      body_type: vehicle.bodyType || '',
      engine_size: vehicle.engineCapacityCC || vehicle.badgeEngineSizeCC || 0,
      engine_power: vehicle.enginePowerBHP || 0,
      doors: vehicle.doors || 0,
      seats: vehicle.seats || 0,
      
      // Dealer information
      dealer_name: advertiser.name || 'Unknown Dealer',
      dealer_segment: advertiser.segment || '',
      dealer_phone: advertiser.phone || '',
      dealer_website: advertiser.website || '',
      
      // Location details
      location: advertiser.location ? {
        address: advertiser.location.addressLineOne || '',
        town: advertiser.location.town || '',
        county: advertiser.location.county || '',
        region: advertiser.location.region || '',
        postcode: advertiser.location.postCode || '',
        latitude: advertiser.location.latitude || null,
        longitude: advertiser.location.longitude || null
      } : null,
      
      // Distance from user (if available in the API response)
      distance: competitor.distance || advertiser.distance || 0,
      
      // Listing details
      days_listed: metadata.dateOnForecourt ? 
        Math.floor((new Date().getTime() - new Date(metadata.dateOnForecourt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      last_updated: metadata.lastUpdated || '',
      lifecycle_state: metadata.lifecycleState || '',
      
      // Advert details
      attention_grabber: retailAdverts.attentionGrabber || '',
      description: retailAdverts.description || retailAdverts.description2 || '',
      price_indicator: retailAdverts.priceIndicatorRating || '',
      retail_valuation: valuations.marketAverage?.retail?.amountGBP || 
                       valuations.adjusted?.retail?.amountGBP || 0,
      vat_status: retailAdverts.vatStatus || adverts.vatScheme || '',
      
      // Media
      images: media.images ? media.images.slice(0, 5).map((img: any) => ({
        id: img.imageId,
        url: img.href,
        category: img.classificationTags?.[0]?.category || 'Unknown',
        label: img.classificationTags?.[0]?.label || 'Unknown'
      })) : [],
      video_url: media.video?.href || null,
      
      // Valuations
      market_valuations: valuations.marketAverage ? {
        retail: valuations.marketAverage.retail?.amountGBP || 0,
        trade: valuations.marketAverage.trade?.amountGBP || 0,
        part_exchange: valuations.marketAverage.partExchange?.amountGBP || 0,
        private: valuations.marketAverage.private?.amountGBP || 0
      } : null,
      
      // Key features (top 10 most relevant)
      key_features: features.slice(0, 10).map((feature: any) => ({
        name: feature.name,
        category: feature.category || 'Other',
        type: feature.type || 'Standard'
      })),
      
      // Highlights
      highlights: highlights.map((highlight: any) => highlight.name),
      
      // Vehicle history and condition
      vehicle_history: competitor.history ? {
        previous_owners: competitor.history.previousOwners || 0,
        imported: competitor.history.imported || false,
        exported: competitor.history.exported || false,
        stolen: competitor.history.stolen || false,
        scrapped: competitor.history.scrapped || false
      } : null,
      
      // Vehicle check information
      vehicle_check: competitor.check ? {
        finance_outstanding: competitor.check.privateFinance || competitor.check.tradeFinance || false,
        insurance_writeoff: competitor.check.insuranceWriteoffCategory || null,
        mileage_discrepancy: competitor.check.mileageDiscrepancy || false,
        colour_changed: competitor.check.colourChanged || false,
        high_risk: competitor.check.highRisk || false
      } : null,
      
      // Additional vehicle details
      mot_expiry: vehicle.motExpiryDate || null,
      service_history: vehicle.serviceHistory || null,
      warranty_months: vehicle.warrantyMonthsOnPurchase || 0,
      keys: vehicle.keys || 0,
      v5_present: vehicle.v5Certificate || false,
      
      // Electric vehicle specific (if applicable)
      battery_info: vehicle.fuelType === 'Electric' ? {
        range_miles: vehicle.batteryRangeMiles || 0,
        capacity_kwh: vehicle.batteryCapacityKWH || 0,
        usable_capacity_kwh: vehicle.batteryUsableCapacityKWH || 0
      } : null,
      
      // Performance data
      performance: {
        top_speed_mph: vehicle.topSpeedMPH || 0,
        zero_to_sixty: vehicle.zeroToSixtyMPHSeconds || 0,
        co2_emissions: vehicle.co2EmissionGPKM || 0,
        fuel_economy: vehicle.fuelEconomyWLTPCombinedMPG || 0
      },
      
      // Dimensions
      dimensions: {
        length_mm: vehicle.lengthMM || 0,
        width_mm: vehicle.widthMM || 0,
        height_mm: vehicle.heightMM || 0,
        wheelbase_mm: vehicle.wheelbaseMM || 0,
        boot_space_litres: vehicle.bootSpaceSeatsUpLitres || 0
      }
    };

    console.log(`📋 Processed competitor: ${processedCompetitor.make} ${processedCompetitor.model} - £${processedCompetitor.price}`);
    return processedCompetitor;
  }).filter(competitor => competitor.price > 0); // Filter out competitors without valid pricing
}

// Analyze competition data
function analyzeCompetitionData(competitors: any[], vehicle: any, userPrice?: number) {
  if (competitors.length === 0) {
    return {
      total_competitors: 0,
      average_price: 0,
      median_price: 0,
      price_range: { min: 0, max: 0 },
      market_insights: {
        most_common_price_range: { min: 0, max: 0 },
        price_distribution: [],
        geographic_spread: [],
        age_analysis: [],
        mileage_analysis: []
      }
    };
  }

  const prices = competitors.map(c => c.price).sort((a, b) => a - b);
  const totalCompetitors = competitors.length;
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const priceRange = { min: Math.min(...prices), max: Math.max(...prices) };

  // User position analysis
  let userPosition;
  if (userPrice) {
    const belowUserPrice = prices.filter(price => price < userPrice).length;
    const aboveUserPrice = prices.filter(price => price > userPrice).length;
    const percentile = Math.round((belowUserPrice / prices.length) * 100);
    
    let priceRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH';
    if (percentile <= 25) priceRating = 'EXCELLENT';
    else if (percentile <= 50) priceRating = 'GOOD';
    else if (percentile <= 75) priceRating = 'FAIR';
    else priceRating = 'HIGH';

    userPosition = {
      percentile,
      below_user_price: belowUserPrice,
      above_user_price: aboveUserPrice,
      price_rating: priceRating
    };
  }

  // Price distribution analysis
  const priceRanges = [
    { min: 0, max: 10000, label: '£0-£10k' },
    { min: 10000, max: 20000, label: '£10k-£20k' },
    { min: 20000, max: 30000, label: '£20k-£30k' },
    { min: 30000, max: 50000, label: '£30k-£50k' },
    { min: 50000, max: 100000, label: '£50k-£100k' },
    { min: 100000, max: Infinity, label: '£100k+' }
  ];

  const priceDistribution = priceRanges.map(range => {
    const count = prices.filter(price => price >= range.min && price < range.max).length;
    return {
      range: range.label,
      count,
      percentage: Math.round((count / totalCompetitors) * 100)
    };
  }).filter(dist => dist.count > 0);

  // Find most common price range
  const mostCommonRange = priceDistribution.reduce((max, current) => 
    current.count > max.count ? current : max, priceDistribution[0] || { range: '', count: 0 });

  const mostCommonPriceRange = priceRanges.find(r => r.label === mostCommonRange?.range) || 
    { min: priceRange.min, max: priceRange.max };

  // Geographic analysis
  const locationGroups = competitors.reduce((acc: any, comp) => {
    const location = comp.location || 'Unknown';
    if (!acc[location]) {
      acc[location] = { count: 0, totalPrice: 0 };
    }
    acc[location].count++;
    acc[location].totalPrice += comp.price;
    return acc;
  }, {});

  const geographicSpread = Object.entries(locationGroups)
    .map(([location, data]: [string, any]) => ({
      location,
      count: data.count,
      avg_price: Math.round(data.totalPrice / data.count)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Age analysis
  const yearGroups = competitors.reduce((acc: any, comp) => {
    const year = comp.year || 0;
    if (!acc[year]) {
      acc[year] = { count: 0, totalPrice: 0 };
    }
    acc[year].count++;
    acc[year].totalPrice += comp.price;
    return acc;
  }, {});

  const ageAnalysis = Object.entries(yearGroups)
    .map(([year, data]: [string, any]) => ({
      year: parseInt(year),
      count: data.count,
      avg_price: Math.round(data.totalPrice / data.count)
    }))
    .sort((a, b) => b.year - a.year);

  // Mileage analysis
  const mileageRanges = [
    { min: 0, max: 10000, label: '0-10k' },
    { min: 10000, max: 30000, label: '10k-30k' },
    { min: 30000, max: 60000, label: '30k-60k' },
    { min: 60000, max: 100000, label: '60k-100k' },
    { min: 100000, max: Infinity, label: '100k+' }
  ];

  const mileageAnalysis = mileageRanges.map(range => {
    const inRange = competitors.filter(comp => 
      comp.mileage >= range.min && comp.mileage < range.max);
    const count = inRange.length;
    const avgPrice = count > 0 ? 
      Math.round(inRange.reduce((sum, comp) => sum + comp.price, 0) / count) : 0;
    
    return {
      range: range.label,
      count,
      avg_price: avgPrice
    };
  }).filter(analysis => analysis.count > 0);

  const averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  
  return {
    total_competitors: totalCompetitors,
    average_price: averagePrice,
    median_price: medianPrice,
    price_range: priceRange,
    user_position: userPosition,
    market_insights: {
      most_common_price_range: mostCommonPriceRange,
      price_distribution: priceDistribution,
      geographic_spread: geographicSpread,
      age_analysis: ageAnalysis,
      mileage_analysis: mileageAnalysis
    }
  };
}

// Generate competition-based recommendations
function generateCompetitionRecommendations(analysis: any, vehicle: any, userPrice?: number) {
  const { total_competitors, average_price, user_position } = analysis;

  let pricingStrategy = 'Maintain current competitive positioning';
  const competitiveAdvantages: string[] = [];
  const areasForImprovement: string[] = [];
  let marketTiming = 'Normal market conditions';

  if (total_competitors === 0) {
    pricingStrategy = 'Limited competition detected - premium pricing opportunity';
    competitiveAdvantages.push('Unique market position');
    marketTiming = 'Excellent time to sell - low competition';
  } else if (total_competitors < 5) {
    pricingStrategy = 'Low competition - consider premium pricing';
    competitiveAdvantages.push('Limited supply in market');
    marketTiming = 'Good time to sell - seller\'s market';
  } else if (total_competitors > 20) {
    pricingStrategy = 'High competition - competitive pricing essential';
    areasForImprovement.push('Stand out with unique selling points');
    marketTiming = 'Buyer\'s market - competitive pricing crucial';
  }

  if (userPrice && user_position) {
    if (user_position.price_rating === 'HIGH') {
      pricingStrategy = 'Price reduction recommended to improve competitiveness';
      areasForImprovement.push('Reduce price to match market expectations');
    } else if (user_position.price_rating === 'EXCELLENT') {
      competitiveAdvantages.push('Excellent value pricing');
      if (user_position.percentile < 15) {
        areasForImprovement.push('Consider slight price increase - may be undervalued');
      }
    }
  }

  // Market timing analysis
  if (analysis.market_insights.age_analysis.length > 0) {
    const avgAge = analysis.market_insights.age_analysis.reduce((sum: number, item: any) => 
      sum + ((new Date().getFullYear() - item.year) * item.count), 0) / total_competitors;
    
    const vehicleAge = new Date().getFullYear() - vehicle.year;
    
    if (vehicleAge < avgAge - 1) {
      competitiveAdvantages.push('Newer than average competitor');
    } else if (vehicleAge > avgAge + 2) {
      areasForImprovement.push('Older than typical market offerings');
    }
  }

  // Mileage comparison
  if (analysis.market_insights.mileage_analysis.length > 0 && vehicle.mileage) {
    const totalMileage = analysis.market_insights.mileage_analysis.reduce((sum: number, item: any) => 
      sum + (item.avg_price * item.count), 0);
    const avgMileage = totalMileage / total_competitors;
    
    if (vehicle.mileage < avgMileage * 0.8) {
      competitiveAdvantages.push('Lower mileage than competitors');
    } else if (vehicle.mileage > avgMileage * 1.2) {
      areasForImprovement.push('Higher mileage than market average');
    }
  }

  return {
    pricing_strategy: pricingStrategy,
    competitive_advantages: competitiveAdvantages,
    areas_for_improvement: areasForImprovement,
    market_timing: marketTiming
  };
}

// GET method for competition analysis info
export async function GET() {
  console.log('📋 API Route: Competition analysis info request received');

  try {
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'competition'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Return information about competition analysis
    const competitionInfo = {
      search_parameters: {
        default_radius: '50 miles',
        max_results: 100,
        default_year_range: '±3 years',
        default_mileage_variance: '30%'
      },
      analysis_features: [
        'Price positioning analysis',
        'Market penetration insights',
        'Geographic competition mapping',
        'Age and mileage comparisons',
        'Pricing recommendations',
        'Full vehicle specifications',
        'Dealer information and contact details',
        'Vehicle history and condition checks',
        'Market valuations comparison',
        'Key features analysis',
        'Media gallery (images and videos)',
        'Electric vehicle specific data'
      ],
      data_sources: ['AutoTrader full competition API', 'Real-time market data'],
      update_frequency: 'Real-time',
      enhanced_data_extraction: {
        vehicle_details: 'Full technical specifications, performance data, dimensions',
        dealer_information: 'Complete dealer profiles with contact details and location',
        pricing_analysis: 'Market valuations, price indicators, VAT status',
        vehicle_condition: 'History checks, MOT, service records, warranty information',
        media_content: 'High-quality images, video tours, classification tags',
        features_analysis: 'Comprehensive feature lists with categorization',
        electric_vehicles: 'Battery capacity, range, charging specifications'
      },
      supported_filters: {
        max_distance: 'Search radius in miles',
        price_range: 'Min/max price filters',
        year_range: 'Vehicle age range',
        mileage_variance: 'Percentage variance for mileage comparison',
        include_similar_models: 'Expand search to similar models'
      },
      data_processing: {
        url_based_fetching: 'Uses competition URL when available for comprehensive data',
        fallback_search: 'Manual search parameters when URL not provided',
        data_filtering: 'Extracts only relevant information from full AutoTrader response',
        quality_control: 'Filters out competitors without valid pricing'
      }
    };

    return NextResponse.json(
      createSuccessResponse(competitionInfo, 'competition')
    );

  } catch (error) {
    console.error('❌ Competition analysis info error:', error);
    const internalError = createInternalErrorResponse(error, 'competition');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
