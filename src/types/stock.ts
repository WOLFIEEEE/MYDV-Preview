// Centralized type definitions for stock-related data structures

// Base vehicle information interface
export interface VehicleInfo {
  registration?: string;
  vin?: string;
  make?: string;
  model?: string;
  derivative?: string;
  generation?: string;
  trim?: string;
  bodyType?: string;
  fuelType?: string;
  transmissionType?: string;
  colour?: string;
  engineSize?: string;
  engineCapacityCC?: number;
  enginePowerBHP?: number;
  enginePowerPS?: number;
  engineTorqueNM?: number;
  co2EmissionGPKM?: number;
  fuelEconomyNEDCCombinedMPG?: number;
  fuelEconomyNEDCUrbanMPG?: number;
  fuelEconomyNEDCExtraUrbanMPG?: number;
  seats?: number;
  doors?: number;
  yearOfManufacture?: string;
  firstRegistrationDate?: string;
  odometerReadingMiles?: number;
  owners?: number;
  previousOwners?: number;
  ownershipCondition?: string;
  drivetrain?: string;
  acceleration?: number;
  topSpeedMPH?: number;
  zeroToSixtyMPHSeconds?: number;
  zeroToOneHundredKMPHSeconds?: number;
  fuelCapacityLitres?: number;
  lengthMM?: number;
  widthMM?: number;
  heightMM?: number;
  wheelbaseMM?: number;
  kerbWeightKG?: number;
  minimumKerbWeightKG?: number;
  bootSpaceSeatsUpLitres?: number;
  bootSpaceSeatsDownLitres?: number;
  motExpiryDate?: string;
  warrantyMonthsOnPurchase?: number;
  serviceHistory?: string;
  lastServiceDate?: string;
  cylinders?: number;
  badgeEngineSizeLitres?: number;
  emissionClass?: string;
  hoursUsed?: number;
  style?: string;
  vehicleType?: string;
}

// Pricing and advertisement information
export interface AdvertInfo {
  retailAdverts?: {
    totalPrice?: {
      amountGBP?: number;
    };
    suppliedPrice?: {
      amountGBP?: number;
    };
    forecourtPrice?: {
      amountGBP?: number;
    };
    adminFee?: {
      amountGBP?: number;
    };
    description?: string;
    attentionGrabber?: string;
    priceIndicatorRating?: string;
    vatable?: string;
    vatStatus?: string;
    // Channel-specific advert status
    autotraderAdvert?: {
      status?: string;
    };
    advertiserAdvert?: {
      status?: string;
    };
    locatorAdvert?: {
      status?: string;
    };
    exportAdvert?: {
      status?: string;
    };
    profileAdvert?: {
      status?: string;
    };
  };
  forecourtPrice?: {
    amountGBP?: number;
  };
  advertiserAdvertStatus?: string;
  advertStatus?: string;
  reservationStatus?: string;
}

// Metadata information
export interface MetadataInfo {
  lifecycleState?: string;
  dateOnForecourt?: string;
  lastUpdated?: string;
  lastUpdatedByAdvertiser?: string;
  versionNumber?: number;
  stockId?: string;
}

// Media information
export interface MediaInfo {
  images?: Array<{
    href: string;
    type?: string;
  }>;
  video?: {
    href: string;
    type?: string;
  };
  spin?: {
    href: string;
    type?: string;
  };
}

// Feature information
export interface FeatureInfo {
  name: string;
  type: string;
}

// History and check information
export interface HistoryInfo {
  scrapped?: boolean;
  stolen?: boolean;
  imported?: boolean;
  exported?: boolean;
  previousOwners?: number;
}

export interface CheckInfo {
  insuranceWriteoffCategory?: string;
  scrapped?: boolean;
  stolen?: boolean;
  imported?: boolean;
  exported?: boolean;
  privateFinance?: boolean;
  tradeFinance?: boolean;
  highRisk?: boolean;
  mileageDiscrepancy?: boolean;
  insuranceGroup?: string;
  insuranceSecurityCode?: string;
  wheelchairAccessible?: boolean;
}

// Main StockItem interface with nested structure
export interface StockItem {
  // Vehicle identification
  stockId: string;
  externalStockId?: string;
  externalStockReference?: string;
  
  // Nested data structures
  vehicle?: VehicleInfo;
  adverts?: AdvertInfo;
  metadata?: MetadataInfo;
  features?: FeatureInfo[];
  media?: MediaInfo;
  history?: HistoryInfo;
  check?: CheckInfo;
  
  // Flattened properties for backward compatibility and direct access
  // Vehicle properties
  registration?: string;
  make?: string;
  model?: string;
  derivative?: string;
  generation?: string;
  trim?: string;
  bodyType?: string;
  fuelType?: string;
  transmissionType?: string;
  colour?: string;
  engineSize?: string;
  engineCapacityCC?: number;
  enginePowerBHP?: number;
  enginePowerPS?: number;
  engineTorqueNM?: number;
  co2EmissionGPKM?: number;
  fuelEconomyNEDCCombinedMPG?: number;
  fuelEconomyNEDCUrbanMPG?: number;
  fuelEconomyNEDCExtraUrbanMPG?: number;
  seats?: number;
  doors?: number;
  yearOfManufacture?: string;
  firstRegistrationDate?: string;
  odometerReadingMiles?: number;
  owners?: number;
  previousOwners?: number;
  ownershipCondition?: string;
  drivetrain?: string;
  acceleration?: number;
  topSpeedMPH?: number;
  zeroToSixtyMPHSeconds?: number;
  zeroToOneHundredKMPHSeconds?: number;
  fuelCapacityLitres?: number;
  lengthMM?: number;
  widthMM?: number;
  heightMM?: number;
  wheelbaseMM?: number;
  kerbWeightKG?: number;
  minimumKerbWeightKG?: number;
  bootSpaceSeatsUpLitres?: number;
  bootSpaceSeatsDownLitres?: number;
  motExpiryDate?: string;
  warrantyMonthsOnPurchase?: number;
  serviceHistory?: string;
  lastServiceDate?: string;
  cylinders?: number;
  badgeEngineSizeLitres?: number;
  emissionClass?: string;
  hoursUsed?: number;
  style?: string;
  vehicleType?: string;
  
  // Pricing properties
  totalPrice?: number;
  suppliedPrice?: number;
  forecourtPrice?: number;
  adminFee?: number;
  priceIndicatorRating?: string;
  attentionGrabber?: string;
  
  // Metadata properties
  lifecycleState?: string;
  dateOnForecourt?: string;
  lastUpdated?: string;
  lastUpdatedByAdvertiser?: string;
  versionNumber?: number;
  advertiserAdvertStatus?: string;
  advertStatus?: string;
  reservationStatus?: string;
  
  // Check properties
  scrapped?: boolean;
  stolen?: boolean;
  imported?: boolean;
  exported?: boolean;
  insuranceWriteoffCategory?: string;
  privateFinance?: boolean;
  tradeFinance?: boolean;
  highRisk?: boolean;
  mileageDiscrepancy?: boolean;
  insuranceGroup?: string;
  insuranceSecurityCode?: string;
  wheelchairAccessible?: boolean;
}

// Legacy MyStockVehicle interface for backward compatibility
export interface MyStockVehicle {
  id: string | number;
  registration: string;
  make: string;
  model: string;
  derivative: string;
  generation: string;
  trim: string;
  color: string;
  fuel: string;
  transmission: string;
  bodyType: string;
  derivation: string;
  engineSize: string;
  bhp: number;
  torque: number;
  fuelDelivery: string;
  engineConfig: string;
  valvesCylinder: number | null;
  battery: number | null;
  electricRange: number | null;
  seats: number;
  acceleration: number;
  topSpeed: number;
  fuelEconomy: number | null;
  co2Emissions: number;
  euroEmission: string;
  fuelCapacity: number | null;
  lengthMm: number;
  widthMm: number;
  wheelbaseMm: number;
  kerbWeightKg: number;
  bootSpaceL: number;
  mileage: number;
  previousOwners: number;
  year: string;
  doors: number;
  driverPosition: string;
  totalPrice: number;
  listPrice: number;
  adminFee: number;
  monthlyPayment: number;
  financeAPR: number;
  lifecycleState: string;
  stockStatus: string;
  daysInStock: number;
  conditionGrade: string;
  warrantyDetails: string;
  motExpiry: string;
  lastService: string;
  dateOnForecourt: string;
  // Legacy fields for compatibility
  fuelType?: string;
  variant?: string;
  purchasePrice: number;
  currentValue: number;
  targetPrice: number;
  dateAdded: string;
  lastUpdated: string;
  location: string;
  condition: "excellent" | "good" | "fair" | "poor";
  status: "tracking" | "selling" | "sold" | "watchlist";
  personalNotes: string;
  performancePercentage: number;
  daysHeld: number;
  features: string[];
  imageUrl: string;
  isFavorite: boolean;
}

// API Response types
export interface StockAPIResponse {
  success: boolean;
  data?: {
    stock: StockItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalResults: number;
      totalPages: number;
      hasNextPage: boolean;
    };
    availableFilters: {
      makes: string[];
      models: string[];
      bodyTypes: string[];
      fuelTypes: string[];
      transmissionTypes: string[];
      colours: string[];
      years: number[];
      priceRange: { min: number; max: number } | null;
      mileageRange: { min: number; max: number } | null;
      lifecycleStates: string[];
      ownershipConditions: string[];
    };
    cache?: {
      fromCache: boolean;
      lastRefresh: Date | null;
      staleCacheUsed: boolean;
    };
  };
  error?: {
    type: string;
    message: string;
    details?: string;
  };
}

// Stock detail data interface
export interface StockDetailData {
  vehicle?: VehicleInfo;
  advertiser?: any;
  adverts?: AdvertInfo;
  metadata?: MetadataInfo;
  features?: FeatureInfo[];
  media?: MediaInfo;
  history?: HistoryInfo;
  check?: CheckInfo;
  highlights?: any[];
  valuations?: any;
  responseMetrics?: any;
  [key: string]: any;
}

// Edit tab types
export type EditTabType = 
  | "vehicle"
  | "gallery"
  | "features"
  | "adverts"
  | "advertiser"
  | "edit-inventory"
  | "add-checklist" 
  | "add-costs"
  | "return-costs"
  | "sale-details"
  | "service-details"
  | "detailed-margins"
  | "generate-invoice";

// View mode types
export type ViewMode = "table" | "grid" | "cards";

// Filter types
export interface StockFilters {
  searchTerm: string;
  filterStatus: string;
  filterMake: string;
  filterModel: string;
  filterFuelType: string;
  filterBodyType: string;
  filterLifecycleState: string;
  priceRange: { min: string; max: string };
  yearRange: { min: string; max: string };
  mileageRange: { min: string; max: string };
}

// Hook options interface
export interface UseStockDataOptions {
  page?: number;
  pageSize?: number;
  lifecycleState?: string;
  ownershipCondition?: string;
  make?: string;
  model?: string;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  disabled?: boolean;
}
