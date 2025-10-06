export interface VehicleInfo {
  registration: string;
  make: string;
  model: string;
  derivative?: string;
  derivativeId?: string;
  year: number;
  mileage: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  doors?: number;
  enginePowerBHP?: number;
  engineTorqueNM?: number;
  co2EmissionGPKM?: number;
  fuelEconomyCombinedMPG?: number;
  insuranceGroup?: string;
  firstRegistrationDate?: string;
  colour?: string;
  competitorsUrl?: string;
  stockId?: string; // For stock flow
  // Stock pricing information (for stock flow)
  forecourtPrice?: number; // Current stock price
  totalPrice?: number; // Total retail price including fees
  // Price indicator rating from AutoTrader API
  priceIndicator?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH' | string;
  // Vehicle images from AutoTrader API
  images?: string[]; // Array of image URLs
  apiResponse?: any; // Full AutoTrader API response with valuations and metrics
}

export interface Valuations {
  retailValue: number;
  partExValue: number;
  tradeValue: number;
  forecourtPrice?: number;
}

export interface MarketAnalysis {
  competitorCount: number;
  averagePrice: number;
  priceRange: { min: number; max: number };
  marketPosition: number; // percentage
  daysToSell?: number;
}

export interface Calculator {
  retailPrice: number;
  pricePosition: number;
  margin: number;
  costs: number;
  targetBuyPrice: number;
}

export interface VehicleCheck {
  status: 'passed' | 'failed' | 'warning';
  stolen: boolean;
  scrapped: boolean;
  writeOff: string;
  finance: string;
  highRisk: boolean;
  imported?: boolean;
  exported?: boolean;
  previousOwners?: number;
  keeperChanges?: any[];
  yearOfManufacture?: number;
}

export interface ChartData {
  labels: string[];
  retail: (number | null)[];
  partex: (number | null)[];
  trade?: (number | null)[];
  mileage: number[];
  pointTypes: string[];
  currentIndex: number;
  source: 'api' | 'fallback' | 'unavailable';
}

export interface CompetitorVehicle {
  id: string;
  rank: number;
  description: string;
  year: number;
  plate: string;
  mileage: number;
  price: number;
  priceIndicator: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH';
  pricePosition: number;
  daysInStock?: number;
  seller: string;
  imageUrl?: string;
  isUserVehicle?: boolean;
}

export interface RetailCheckData {
  vehicleInfo: VehicleInfo;
  valuations?: Valuations | null; // Optional - some vehicles may not have valuations available
  marketAnalysis?: MarketAnalysis;
  calculator?: Calculator;
  vehicleCheck?: VehicleCheck;
  chartData?: ChartData;
  competitors?: CompetitorVehicle[];
  competitionData?: any; // CompetitionResponse from CompetitionService
  vehicleMetrics?: any; // Raw vehicle metrics from AutoTrader
  metricsAnalysis?: any; // Processed vehicle metrics analysis
  adjustedMetrics?: any; // Location-adjusted vehicle metrics
  trendedValuations?: any; // Trended valuations data
  timestamp?: string;
  source?: string;
}

export interface RetailCheckProps {
  registration?: string;
  stockId?: string;
  mileage?: number;
  onClose?: () => void;
}

export type PriceRating = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH';

export interface PriceUpdateData {
  retailPrice: number;
  pricePosition: number;
  margin: number;
  costs: number;
  targetBuyPrice: number;
  marketPosition: number;
  priceRating: PriceRating;
}
