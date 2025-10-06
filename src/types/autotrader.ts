// AutoTrader API Types - Based on actual API response structure analyzed with curl

export interface VehicleType {
  name: string; // Note: AutoTrader vehicleTypes only have name, no ID
}

export interface Make {
  makeId: string;
  name: string;
}

export interface Model {
  modelId: string;
  name: string;
}

export interface Generation {
  generationId: string;
  name: string;
}

export interface Derivative {
  derivativeId: string;
  name: string;
  introduced?: string;
  discontinued?: string;
}

// Detailed derivative information from /taxonomy/derivatives/{derivativeId}
export interface DerivativeDetails {
  derivativeId: string;
  generationId: string;
  vehicleType: string;
  make: string;
  model: string;
  generation: string;
  name: string;
  longName: string;
  introduced?: string;
  discontinued?: string;
  trim?: string;
  bodyType?: string;
  fuelType?: string;
  fuelDelivery?: string;
  transmissionType?: string;
  drivetrain?: string;
  cabType?: string | null;
  wheelbaseType?: string;
  roofHeightType?: string | null;
  seats?: number;
  doors?: number;
  valves?: number;
  gears?: number;
  cylinders?: number;
  cylinderArrangement?: string;
  engineMake?: string;
  valveGear?: string;
  axles?: number;
  countryOfOrigin?: string;
  driveType?: string;
  startStop?: boolean;
  enginePowerPS?: number;
  engineTorqueNM?: number;
  engineTorqueLBFT?: number;
  co2EmissionGPKM?: number;
  topSpeedMPH?: number;
  zeroToSixtyMPHSeconds?: number | null;
  zeroToOneHundredKMPHSeconds?: number | null;
  badgeEngineSizeLitres?: number;
  engineCapacityCC?: number;
  enginePowerBHP?: number;
  fuelCapacityLitres?: number;
  emissionClass?: string;
  fuelEconomyNEDCExtraUrbanMPG?: number | null;
  fuelEconomyNEDCUrbanMPG?: number | null;
  fuelEconomyNEDCCombinedMPG?: number | null;
  fuelEconomyWLTPLowMPG?: number | null;
  fuelEconomyWLTPMediumMPG?: number | null;
  fuelEconomyWLTPHighMPG?: number | null;
  fuelEconomyWLTPExtraHighMPG?: number | null;
  fuelEconomyWLTPCombinedMPG?: number | null;
  lengthMM?: number;
  heightMM?: number;
  widthMM?: number;
  wheelbaseMM?: number;
  bootSpaceSeatsUpLitres?: number | null;
  bootSpaceSeatsDownLitres?: number | null;
  insuranceGroup?: string;
  insuranceSecurityCode?: string;
  batteryRangeMiles?: number | null;
  batteryCapacityKWH?: number | null;
  batteryUsableCapacityKWH?: number | null;
  minimumKerbWeightKG?: number;
  grossVehicleWeightKG?: number;
  grossCombinedWeightKG?: number | null;
  grossTrainWeightKG?: number | null;
  boreMM?: number;
  strokeMM?: number;
  payloadLengthMM?: number | null;
  payloadWidthMM?: number | null;
  payloadHeightMM?: number | null;
  payloadWeightKG?: number;
  cargoVolumeVDALitres?: number | null;
  payloadVolumeCubicMetres?: number | null;
  rde2Compliant?: boolean;
  sector?: string;
  chargeTimes?: unknown[];
  oem?: {
    make?: string | null;
    model?: string | null;
    derivative?: string | null;
    bodyType?: string | null;
    transmissionType?: string;
    drivetrain?: string | null;
    wheelbaseType?: string | null;
    roofHeightType?: string | null;
    engineType?: string;
    engineTechnology?: string | null;
    engineMarketing?: string;
    editionDescription?: string | null;
    colour?: string | null;
  };
}

// Feature information from /taxonomy/features
export interface Feature {
  name: string;
  genericName: string;
  type: 'Standard' | 'Optional';
  category: string;
  basicPrice: number;
  vatPrice: number;
  factoryCodes: string[];
  rarityRating?: number | null;
  valueRating?: number | null;
}

export interface BodyType {
  bodyTypeId?: string;
  name: string;
}

export interface FuelType {
  fuelTypeId?: string;
  name: string;
}

export interface TransmissionType {
  transmissionTypeId?: string;
  name: string;
}

// Generic taxonomy item for backwards compatibility
export interface TaxonomyItem {
  id?: string;
  name: string;
}

// API Response wrapper
export interface TaxonomyResponse<T> {
  success: boolean;
  data: T[];
  error?: {
    message: string;
    details?: string;
  };
}

// Search parameters for taxonomy API
export interface TaxonomySearchParams {
  vehicleType?: string;
  makeId?: string;
  modelId?: string;
  generationId?: string;
  derivativeId?: string;
  make?: string;
  model?: string;
  generation?: string;
  derivative?: string;
  bodyType?: string;
  fuelType?: string;
  transmissionType?: string;
  priceMin?: string;
  priceMax?: string;
  mileageMax?: string;
  [key: string]: string | undefined;
}

// AutoTrader API raw response structures (what we actually get from the API)
export interface AutoTraderVehicleTypesResponse {
  vehicleTypes: VehicleType[];
}

export interface AutoTraderMakesResponse {
  makes: Make[];
}

export interface AutoTraderModelsResponse {
  models: Model[];
}

export interface AutoTraderGenerationsResponse {
  generations: Generation[];
}

export interface AutoTraderDerivativesResponse {
  derivatives: Derivative[];
}

export interface AutoTraderFeaturesResponse {
  features: Feature[];
}

// Valuation request and response types
export interface ValuationRequest {
  vehicle: {
    derivativeId: string;
    firstRegistrationDate: string; // ISO date format
    odometerReadingMiles: number;
  };
  features?: Array<{ name: string }>;
  conditionRating?: 'EXCELLENT' | 'GREAT' | 'GOOD' | 'FAIR' | 'POOR';
}

// AutoTrader valuation response structure (actual API response)
export interface AutoTraderValuationResponse {
  valuations: {
    retail: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
      amountNoVatGBP?: number | null;
    };
    partExchange: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
      amountNoVatGBP?: number | null;
    };
    trade: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
      amountNoVatGBP?: number | null;
    };
    private: {
      amountGBP: number;
    };
  };
}

// Our normalized valuation response
export interface ValuationResponse {
  valuations: {
    retailValue: number;
    privateValue: number;
    partExchangeValue: number;
    tradeValue: number;
  };
  vehicle: {
    make: string;
    model: string;
    derivative: string;
    year: number;
    mileage: number;
  };
  condition?: string;
  features?: Array<{ name: string; type: string }>;
}

// Condition rating options
export type ConditionRating = 'EXCELLENT' | 'GREAT' | 'GOOD' | 'FAIR' | 'POOR';

// Year and plate selection types
export interface YearOption {
  year: number;
  plateIdentifier: string;
  registrationPeriod: string;
}

export interface PlateOption {
  plateIdentifier: string;
  registrationPeriod: string;
  startDate: string;
  endDate: string;
}