/**
 * Pure Calculation Service for Vehicle Detailed Margins
 * 
 * Implements all margin calculations as specified:
 * - VAT calculations (VAT on spend, purchase, sale price, VAT to pay)
 * - Profit calculations (gross, net, pre/post VAT and costs)
 * - Additional metrics (percentage uplift, margin percentages, profit category, profit per day)
 * 
 * No database fields needed - all calculations are computed in real-time from existing data.
 */

export interface VehicleMarginData {
  stockId: string;
  registration: string;
  
  // Core financial data (from existing database tables)
  purchasePrice: number;        // inventoryDetails.costOfPurchase
  salePrice: number;           // saleDetails.salePrice OR stockCache.forecourtPriceGBP
  totalCosts: number;          // vehicleCosts.grandTotal (outlay on vehicle)
  
  // Cost breakdown (from existing vehicleCosts table)
  vatableCosts: number;        // vehicleCosts.incVatCostsTotal (Inc-VAT costs - VAT can be reclaimed)
  nonVatableCosts: number;     // vehicleCosts.exVatCostsTotal + fixedCostsTotal (No VAT to reclaim)
  
  // Date information (from existing tables)
  purchaseDate: Date;          // inventoryDetails.dateOfPurchase
  saleDate?: Date;             // saleDetails.saleDate (optional - may not be sold yet)
  
  // VAT status (only assumption needed - defaults to false for private purchases)
  isCommercialPurchase?: boolean; // Whether purchase is VAT-able (commercial)
}

export interface DetailedMarginCalculations {
  // Input data
  stockId: string;
  registration: string;
  purchasePrice: number;
  salePrice: number;
  totalCosts: number;
  purchaseDate: Date;
  saleDate?: Date;
  
  // Basic totals (needed for calculations but not displayed on margins tab)
  vatableTotal: number;        // Sum of all vatable costs (Inc-VAT costs)
  nonVatableTotal: number;     // Sum of all non-vatable costs (Ex-VAT + Fixed costs)
  outlayOnVehicle: number;     // Sum of all costs combined (totalCosts)
  
  // VAT calculations
  vatOnSpend: number;          // Vatable total ÷ 6
  vatOnPurchase: number;       // Cost of purchase ÷ 6 (only if commercial)
  vatOnSalePrice: number;      // (Vehicle sale price - cost of purchase) ÷ 6
  vatToPay: number;           // VAT on sale price - VAT on spend - VAT on purchase
  
  // Profit calculations
  grossProfit: number;         // Vehicle sale price - cost of purchase (profit margin pre costs)
  netProfit: number;          // Gross profit - VAT on spend - outlay on vehicle (profit margin post costs)
  profitMarginPreVat: number; // Vehicle sale price - cost of purchase - outlay on vehicle
  profitMarginPostVat: number; // Profit margin pre VAT - VAT to pay
  
  // Additional metrics for single view page
  totalInvestment: number;     // Purchase price + all costs
  percentageUpliftAfterAllCosts: number; // ((Sale price - Total investment) ÷ Total investment) × 100
  grossMarginPercent: number;  // ((Sale price - Purchase price) ÷ Sale price) × 100
  netMarginPercent: number;    // ((Sale price - Total investment) ÷ Sale price) × 100
  profitCategory: 'LOW' | 'MEDIUM' | 'HIGH'; // Based on net margin percent
  daysInStock: number;         // Days between purchase and sale (or current date)
  profitPerDay: number;        // Net profit ÷ days in stock
  
  // Date strings for filtering
  purchaseMonth: string;       // "January 2024"
  purchaseQuarter: string;     // "Q1 2024"
  saleMonth?: string;          // "March 2024" (if sold)
  saleQuarter?: string;        // "Q1 2024" (if sold)
}

/**
 * Calculate all detailed margins for a vehicle
 * Implements the exact formulas as specified by the user
 */
export function calculateDetailedMargins(data: VehicleMarginData): DetailedMarginCalculations {
  // Validate input data
  if (!data || typeof data.purchasePrice !== 'number' || typeof data.salePrice !== 'number') {
    throw new Error('Invalid margin data: missing or invalid price data');
  }

  // Basic totals with safety checks
  const vatableTotal = isNaN(data.vatableCosts) ? 0 : data.vatableCosts;
  const nonVatableTotal = isNaN(data.nonVatableCosts) ? 0 : data.nonVatableCosts;
  const outlayOnVehicle = isNaN(data.totalCosts) ? 0 : data.totalCosts; // Sum of all costs combined
  
  // VAT calculations with safety checks
  const vatOnSpend = isFinite(vatableTotal / 6) ? vatableTotal / 6 : 0;
  const vatOnPurchase = (data.isCommercialPurchase ?? false) ? 
    (isFinite(data.purchasePrice / 6) ? data.purchasePrice / 6 : 0) : 0;
  const vatOnSalePrice = isFinite((data.salePrice - data.purchasePrice) / 6) ? 
    (data.salePrice - data.purchasePrice) / 6 : 0;
  const vatToPay = vatOnSalePrice - vatOnSpend - vatOnPurchase;
  
  // Profit calculations
  const grossProfit = data.salePrice - data.purchasePrice; // Profit margin pre costs
  const netProfit = grossProfit - vatOnSpend - outlayOnVehicle; // Profit margin post costs
  const profitMarginPreVat = data.salePrice - data.purchasePrice - outlayOnVehicle;
  const profitMarginPostVat = profitMarginPreVat - vatToPay;
  
  // Additional metrics with safety checks
  const totalInvestment = data.purchasePrice + (isNaN(data.totalCosts) ? 0 : data.totalCosts);
  const percentageUpliftAfterAllCosts = totalInvestment > 0 
    ? ((data.salePrice - totalInvestment) / totalInvestment) * 100 
    : 0;
  const grossMarginPercent = data.salePrice > 0 
    ? ((data.salePrice - data.purchasePrice) / data.salePrice) * 100 
    : 0;
  const netMarginPercent = data.salePrice > 0 
    ? ((data.salePrice - totalInvestment) / data.salePrice) * 100 
    : 0;

  // Ensure all percentages are finite numbers
  const safePercentageUplift = isFinite(percentageUpliftAfterAllCosts) ? percentageUpliftAfterAllCosts : 0;
  const safeGrossMarginPercent = isFinite(grossMarginPercent) ? grossMarginPercent : 0;
  const safeNetMarginPercent = isFinite(netMarginPercent) ? netMarginPercent : 0;
  
  // Profit category based on net margin percent
  const profitCategory: 'LOW' | 'MEDIUM' | 'HIGH' = 
    safeNetMarginPercent <= 10 ? 'LOW' : 
    safeNetMarginPercent <= 20 ? 'MEDIUM' : 'HIGH';
  
  // Days in stock calculation with date validation
  const endDate = data.saleDate || new Date(); // Use sale date or current date
  
  // Validate dates before using them
  const isValidPurchaseDate = data.purchaseDate instanceof Date && !isNaN(data.purchaseDate.getTime());
  const isValidEndDate = endDate instanceof Date && !isNaN(endDate.getTime());
  
  const daysInStock = (isValidPurchaseDate && isValidEndDate) 
    ? Math.ceil((endDate.getTime() - data.purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const profitPerDay = daysInStock > 0 ? netProfit / daysInStock : 0;
  
  // Date formatting for filtering with validation
  const purchaseMonth = isValidPurchaseDate ? formatMonthYear(data.purchaseDate) : 'Invalid Date';
  const purchaseQuarter = isValidPurchaseDate ? formatQuarter(data.purchaseDate) : 'Invalid Quarter';
  const saleMonth = (data.saleDate && data.saleDate instanceof Date && !isNaN(data.saleDate.getTime())) 
    ? formatMonthYear(data.saleDate) : undefined;
  const saleQuarter = (data.saleDate && data.saleDate instanceof Date && !isNaN(data.saleDate.getTime())) 
    ? formatQuarter(data.saleDate) : undefined;
  
  return {
    // Input data
    stockId: data.stockId,
    registration: data.registration,
    purchasePrice: data.purchasePrice,
    salePrice: data.salePrice,
    totalCosts: data.totalCosts,
    purchaseDate: data.purchaseDate,
    saleDate: data.saleDate,
    
    // Basic totals
    vatableTotal,
    nonVatableTotal,
    outlayOnVehicle,
    
    // VAT calculations
    vatOnSpend,
    vatOnPurchase,
    vatOnSalePrice,
    vatToPay,
    
    // Profit calculations
    grossProfit,
    netProfit,
    profitMarginPreVat,
    profitMarginPostVat,
    
    // Additional metrics
    totalInvestment,
    percentageUpliftAfterAllCosts: safePercentageUplift,
    grossMarginPercent: safeGrossMarginPercent,
    netMarginPercent: safeNetMarginPercent,
    profitCategory,
    daysInStock,
    profitPerDay,
    
    // Date strings
    purchaseMonth,
    purchaseQuarter,
    saleMonth,
    saleQuarter
  };
}

/**
 * Helper function to format date as "Month Year" (e.g., "January 2024")
 */
function formatMonthYear(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  try {
    return date.toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Helper function to format date as quarter (e.g., "Q1 2024")
 */
function formatQuarter(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Quarter';
  }
  
  try {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const quarter = Math.ceil(month / 3);
    const year = date.getFullYear();
    return `Q${quarter} ${year}`;
  } catch (error) {
    console.error('Error formatting quarter:', error);
    return 'Invalid Quarter';
  }
}

/**
 * Fetch vehicle data from database and calculate margins
 * This function queries all the necessary tables and returns calculated margins
 */
export async function getVehicleMarginData(stockId: string, dealerId: string): Promise<VehicleMarginData | null> {
  // This will be implemented in the API route
  // For now, return null - the API will handle the database queries
  return null;
}

/**
 * Validate that we have sufficient data to perform margin calculations
 */
export function validateMarginData(data: Partial<VehicleMarginData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.stockId) errors.push('Stock ID is required');
  if (!data.purchasePrice || data.purchasePrice <= 0) errors.push('Valid purchase price is required');
  if (!data.salePrice || data.salePrice <= 0) errors.push('Valid sale price is required');
  if (!data.purchaseDate) errors.push('Purchase date is required');
  if (data.totalCosts === undefined || data.totalCosts < 0) errors.push('Total costs must be provided (can be 0)');
  if (data.vatableCosts === undefined || data.vatableCosts < 0) errors.push('Vatable costs must be provided (can be 0)');
  if (data.nonVatableCosts === undefined || data.nonVatableCosts < 0) errors.push('Non-vatable costs must be provided (can be 0)');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format currency values for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format percentage values for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
