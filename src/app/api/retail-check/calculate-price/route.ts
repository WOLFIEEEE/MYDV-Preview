import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// Price Calculator Request Interface
interface PriceCalculatorRequest {
  retail_price: number;
  margin_percentage: number;
  additional_costs: number;
  price_position: number; // Percentage position in market (0-100)
  competitor_prices?: number[]; // Optional competitor prices for better analysis
  vehicle_age?: number; // Vehicle age in years for depreciation calculation
  mileage?: number; // Current mileage for depreciation
}

// Price Calculator Response Interface
interface PriceCalculatorResponse {
  cost_price: number;
  selling_price: number;
  profit_margin: number;
  break_even_price: number;
  market_position: {
    percentile: number;
    rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH';
    days_to_sell_estimate: number;
    demand_indicator: 'High' | 'Medium' | 'Low';
  };
  recommended_adjustments: {
    optimal_price: number;
    quick_sale_price: number;
    premium_price: number;
    reasoning: string;
  };
  financial_metrics: {
    roi_percentage: number;
    margin_pounds: number;
    margin_percentage_actual: number;
    price_per_mile?: number;
  };
}

export async function POST(request: NextRequest) {
  console.log('🧮 API Route: Price calculator request received');

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
        endpoint: 'price-calculator'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('📊 Price calculator request data:', body);

    // Validate required fields
    const requiredFields = ['retail_price', 'margin_percentage', 'additional_costs', 'price_position'];
    const missingFields = requiredFields.filter(field => !body[field] && body[field] !== 0);
    
    if (missingFields.length > 0) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        details: 'Please provide all required pricing parameters',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'price-calculator'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Validate data ranges
    if (body.retail_price <= 0) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Invalid retail price',
        details: 'Retail price must be greater than 0',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'price-calculator'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    if (body.margin_percentage < 0 || body.margin_percentage > 100) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Invalid margin percentage',
        details: 'Margin percentage must be between 0 and 100',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'price-calculator'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Perform price calculations
    const calculationResult = calculatePricing(body as PriceCalculatorRequest);

    console.log('✅ Price calculation completed successfully');

    return NextResponse.json(
      createSuccessResponse(calculationResult, 'price-calculator')
    );

  } catch (error) {
    console.error('❌ Price calculator error:', error);
    const internalError = createInternalErrorResponse(error, 'price-calculator');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

// Main pricing calculation engine
function calculatePricing(params: PriceCalculatorRequest): PriceCalculatorResponse {
  const { 
    retail_price, 
    margin_percentage, 
    additional_costs, 
    price_position,
    competitor_prices = [],
    vehicle_age = 5,
    mileage = 50000
  } = params;

  console.log('🔢 Starting pricing calculations with params:', params);

  // Base calculations
  const margin_decimal = margin_percentage / 100;
  const cost_price = Math.round((retail_price / (1 + margin_decimal)) + additional_costs);
  const selling_price = Math.round(cost_price * (1 + margin_decimal));
  const profit_margin = selling_price - cost_price;
  const break_even_price = cost_price;

  // Market position analysis
  const market_position = analyzeMarketPosition(
    retail_price, 
    price_position, 
    competitor_prices,
    vehicle_age
  );

  // Price recommendations
  const recommended_adjustments = generatePriceRecommendations(
    retail_price,
    cost_price,
    market_position,
    competitor_prices
  );

  // Financial metrics
  const financial_metrics = calculateFinancialMetrics(
    retail_price,
    cost_price,
    profit_margin,
    mileage
  );

  const result: PriceCalculatorResponse = {
    cost_price,
    selling_price,
    profit_margin,
    break_even_price,
    market_position,
    recommended_adjustments,
    financial_metrics
  };

  console.log('✅ Pricing calculations completed:', result);
  return result;
}

// Analyze market position and determine rating
function analyzeMarketPosition(
  retail_price: number, 
  price_position: number, 
  competitor_prices: number[],
  vehicle_age: number
) {
  // Calculate percentile based on price position
  let percentile = price_position;
  
  // If we have competitor prices, calculate actual percentile
  if (competitor_prices.length > 0) {
    const below_price = competitor_prices.filter(price => price < retail_price).length;
    percentile = Math.round((below_price / competitor_prices.length) * 100);
  }

  // Determine rating based on percentile
  let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH';
  if (percentile <= 25) rating = 'EXCELLENT';
  else if (percentile <= 50) rating = 'GOOD';
  else if (percentile <= 75) rating = 'FAIR';
  else rating = 'HIGH';

  // Estimate days to sell based on market position and vehicle age
  let days_to_sell_estimate = 45; // Base estimate
  
  // Adjust for market position
  if (percentile <= 25) days_to_sell_estimate = Math.max(15, days_to_sell_estimate - 25);
  else if (percentile <= 50) days_to_sell_estimate = Math.max(20, days_to_sell_estimate - 10);
  else if (percentile <= 75) days_to_sell_estimate += 15;
  else days_to_sell_estimate += 35;

  // Adjust for vehicle age
  const age_factor = Math.max(0, vehicle_age - 3) * 3; // Add 3 days per year over 3 years
  days_to_sell_estimate += age_factor;

  // Determine demand indicator
  let demand_indicator: 'High' | 'Medium' | 'Low' = 'Medium';
  if (competitor_prices.length > 15 && percentile <= 40) {
    demand_indicator = 'High';
  } else if (competitor_prices.length < 5 || percentile > 80) {
    demand_indicator = 'Low';
  }

  return {
    percentile,
    rating,
    days_to_sell_estimate: Math.round(days_to_sell_estimate),
    demand_indicator
  };
}

// Generate intelligent price recommendations
interface MarketPosition {
  percentile: number;
  rating: string;
  [key: string]: unknown;
}

function generatePriceRecommendations(
  retail_price: number,
  cost_price: number,
  market_position: MarketPosition,
  competitor_prices: number[]
) {
  const { percentile, rating } = market_position;
  
  // Calculate optimal price based on market position
  let optimal_price = retail_price;
  let reasoning = 'Current price is well positioned for the market.';

  if (rating === 'HIGH') {
    // Price is too high, recommend reduction
    const reduction = Math.min(retail_price * 0.15, retail_price - cost_price * 1.1); // Max 15% or maintain 10% margin
    optimal_price = Math.round(retail_price - reduction);
    reasoning = 'Price is above market average. Consider reducing to improve competitiveness and reduce days to sell.';
  } else if (rating === 'EXCELLENT' && percentile < 15) {
    // Price might be too low, could increase
    const increase = Math.min(retail_price * 0.08, 2000); // Max 8% or £2000
    optimal_price = Math.round(retail_price + increase);
    reasoning = 'Price is significantly below market. You could increase price while maintaining competitive advantage.';
  }

  // Quick sale price (aggressive pricing)
  const quick_sale_price = Math.round(Math.max(
    cost_price * 1.05, // Minimum 5% margin
    retail_price * 0.9  // 10% reduction from current
  ));

  // Premium price (if market allows)
  let premium_price = retail_price;
  if (competitor_prices.length > 0) {
    const market_avg = competitor_prices.reduce((sum, price) => sum + price, 0) / competitor_prices.length;
    premium_price = Math.round(Math.min(
      market_avg * 1.1, // 10% above market average
      retail_price * 1.15 // 15% increase from current
    ));
  } else {
    premium_price = Math.round(retail_price * 1.1);
  }

  return {
    optimal_price,
    quick_sale_price,
    premium_price,
    reasoning
  };
}

// Calculate financial metrics
function calculateFinancialMetrics(
  retail_price: number,
  cost_price: number,
  profit_margin: number,
  mileage?: number
) {
  const roi_percentage = Math.round((profit_margin / cost_price) * 100);
  const margin_pounds = profit_margin;
  const margin_percentage_actual = Math.round((profit_margin / retail_price) * 100);
  
  let price_per_mile: number | undefined;
  if (mileage && mileage > 0) {
    price_per_mile = Math.round((retail_price / mileage) * 100) / 100; // Round to 2 decimal places
  }

  return {
    roi_percentage,
    margin_pounds,
    margin_percentage_actual,
    price_per_mile
  };
}

// GET method for price calculation parameters/info
export async function GET(request: NextRequest) {
  console.log('📋 API Route: Price calculator info request received');

  try {
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'price-calculator'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    // Return calculation parameters and defaults
    const calculatorInfo = {
      default_margin_percentage: 20,
      default_additional_costs: 300,
      margin_range: { min: 5, max: 50 },
      price_position_range: { min: 0, max: 100 },
      rating_thresholds: {
        excellent: { min: 0, max: 25 },
        good: { min: 26, max: 50 },
        fair: { min: 51, max: 75 },
        high: { min: 76, max: 100 }
      },
      demand_indicators: {
        high: 'Strong market demand, quick sale expected',
        medium: 'Normal market conditions',
        low: 'Limited demand, may take longer to sell'
      }
    };

    return NextResponse.json(
      createSuccessResponse(calculatorInfo, 'price-calculator')
    );

  } catch (error) {
    console.error('❌ Price calculator info error:', error);
    const internalError = createInternalErrorResponse(error, 'price-calculator');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
