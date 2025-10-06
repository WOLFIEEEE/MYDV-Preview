/**
 * Test suite for margin calculations
 * Verifies that all formulas match the user's exact specifications
 */

import { calculateDetailedMargins, validateMarginData, type VehicleMarginData } from '../marginCalculations';

describe('Margin Calculations', () => {
  // Sample test data based on user requirements
  const sampleData: VehicleMarginData = {
    stockId: 'TEST001',
    registration: 'AB12 CDE',
    purchasePrice: 10000,      // £10,000 purchase price
    salePrice: 15000,          // £15,000 sale price
    totalCosts: 1200,          // £1,200 total costs (outlay on vehicle)
    vatableCosts: 600,         // £600 vatable costs (inc-VAT costs - VAT can be reclaimed)
    nonVatableCosts: 600,      // £600 non-vatable costs (ex-VAT + fixed costs)
    purchaseDate: new Date('2024-01-15'),
    saleDate: new Date('2024-03-15'),
    isCommercialPurchase: false // Private purchase (no VAT on purchase)
  };

  describe('Basic VAT Calculations', () => {
    test('should calculate VAT on spend correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // VAT on Spend = Vatable Total ÷ 6
      // £600 ÷ 6 = £100
      expect(result.vatOnSpend).toBe(100);
    });

    test('should calculate VAT on purchase for private purchase', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // VAT on Purchase = £0 for private purchase
      expect(result.vatOnPurchase).toBe(0);
    });

    test('should calculate VAT on purchase for commercial purchase', () => {
      const commercialData = { ...sampleData, isCommercialPurchase: true };
      const result = calculateDetailedMargins(commercialData);
      
      // VAT on Purchase = Cost of Purchase ÷ 6 (only if commercial)
      // £10,000 ÷ 6 = £1,666.67
      expect(result.vatOnPurchase).toBeCloseTo(1666.67, 2);
    });

    test('should calculate VAT on sale price correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // VAT on Sale Price = (Vehicle Sale Price - Cost of Purchase) ÷ 6
      // (£15,000 - £10,000) ÷ 6 = £5,000 ÷ 6 = £833.33
      expect(result.vatOnSalePrice).toBeCloseTo(833.33, 2);
    });

    test('should calculate VAT to pay correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // VAT to Pay = VAT on Sale Price - VAT on Spend - VAT on Purchase
      // £833.33 - £100 - £0 = £733.33
      expect(result.vatToPay).toBeCloseTo(733.33, 2);
    });
  });

  describe('Profit Calculations', () => {
    test('should calculate gross profit correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Gross Profit = Vehicle Sale Price - Cost of Purchase
      // £15,000 - £10,000 = £5,000
      expect(result.grossProfit).toBe(5000);
    });

    test('should calculate net profit correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Net Profit = Gross Profit - VAT on Spend - Outlay on Vehicle
      // £5,000 - £100 - £1,200 = £3,700
      expect(result.netProfit).toBe(3700);
    });

    test('should calculate profit margin pre-VAT correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Profit Margin Pre-VAT = Vehicle Sale Price - Cost of Purchase - Outlay on Vehicle
      // £15,000 - £10,000 - £1,200 = £3,800
      expect(result.profitMarginPreVat).toBe(3800);
    });

    test('should calculate profit margin post-VAT correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Profit Margin Post-VAT = Profit Margin Pre-VAT - VAT to Pay
      // £3,800 - £733.33 = £3,066.67
      expect(result.profitMarginPostVat).toBeCloseTo(3066.67, 2);
    });
  });

  describe('Additional Metrics', () => {
    test('should calculate total investment correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Total Investment = Purchase Price + All Costs
      // £10,000 + £1,200 = £11,200
      expect(result.totalInvestment).toBe(11200);
    });

    test('should calculate percentage uplift after all costs correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Percentage Uplift = ((Sale Price - Total Investment) ÷ Total Investment) × 100
      // ((£15,000 - £11,200) ÷ £11,200) × 100 = (£3,800 ÷ £11,200) × 100 = 33.93%
      expect(result.percentageUpliftAfterAllCosts).toBeCloseTo(33.93, 2);
    });

    test('should calculate gross margin percent correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Gross Margin Percent = ((Sale Price - Purchase Price) ÷ Sale Price) × 100
      // ((£15,000 - £10,000) ÷ £15,000) × 100 = (£5,000 ÷ £15,000) × 100 = 33.33%
      expect(result.grossMarginPercent).toBeCloseTo(33.33, 2);
    });

    test('should calculate net margin percent correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Net Margin Percent = ((Sale Price - Total Investment) ÷ Sale Price) × 100
      // ((£15,000 - £11,200) ÷ £15,000) × 100 = (£3,800 ÷ £15,000) × 100 = 25.33%
      expect(result.netMarginPercent).toBeCloseTo(25.33, 2);
    });

    test('should categorize profit correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Net Margin Percent = 25.33% = HIGH (over 20%)
      expect(result.profitCategory).toBe('HIGH');
    });

    test('should calculate days in stock correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Days in Stock = Sale Date - Purchase Date
      // March 15, 2024 - January 15, 2024 = 60 days
      expect(result.daysInStock).toBe(60);
    });

    test('should calculate profit per day correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Profit per Day = Net Profit ÷ Days in Stock
      // £3,700 ÷ 60 = £61.67
      expect(result.profitPerDay).toBeCloseTo(61.67, 2);
    });
  });

  describe('Profit Categories', () => {
    test('should categorize LOW profit correctly', () => {
      const lowProfitData = {
        ...sampleData,
        salePrice: 11000 // Lower sale price for low margin
      };
      const result = calculateDetailedMargins(lowProfitData);
      
      // Net Margin Percent should be LOW (0-10%)
      expect(result.profitCategory).toBe('LOW');
      expect(result.netMarginPercent).toBeLessThanOrEqual(10);
    });

    test('should categorize MEDIUM profit correctly', () => {
      const mediumProfitData = {
        ...sampleData,
        salePrice: 13000 // Medium sale price for medium margin
      };
      const result = calculateDetailedMargins(mediumProfitData);
      
      // Net Margin Percent should be MEDIUM (10-20%)
      expect(result.profitCategory).toBe('MEDIUM');
      expect(result.netMarginPercent).toBeGreaterThan(10);
      expect(result.netMarginPercent).toBeLessThanOrEqual(20);
    });

    test('should categorize HIGH profit correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      // Net Margin Percent should be HIGH (over 20%)
      expect(result.profitCategory).toBe('HIGH');
      expect(result.netMarginPercent).toBeGreaterThan(20);
    });
  });

  describe('Date Formatting', () => {
    test('should format purchase month correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      expect(result.purchaseMonth).toBe('January 2024');
    });

    test('should format purchase quarter correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      expect(result.purchaseQuarter).toBe('Q1 2024');
    });

    test('should format sale month correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      expect(result.saleMonth).toBe('March 2024');
    });

    test('should format sale quarter correctly', () => {
      const result = calculateDetailedMargins(sampleData);
      
      expect(result.saleQuarter).toBe('Q1 2024');
    });
  });

  describe('Data Validation', () => {
    test('should validate complete data as valid', () => {
      const validation = validateMarginData(sampleData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should invalidate data missing required fields', () => {
      const incompleteData = {
        ...sampleData,
        purchasePrice: 0,
        salePrice: 0
      };
      
      const validation = validateMarginData(incompleteData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Valid purchase price is required');
      expect(validation.errors).toContain('Valid sale price is required');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero costs correctly', () => {
      const zeroCostsData = {
        ...sampleData,
        totalCosts: 0,
        vatableCosts: 0,
        nonVatableCosts: 0
      };
      
      const result = calculateDetailedMargins(zeroCostsData);
      
      expect(result.outlayOnVehicle).toBe(0);
      expect(result.vatOnSpend).toBe(0);
      expect(result.netProfit).toBe(result.grossProfit); // No costs deducted
    });

    test('should handle vehicle not yet sold (no sale date)', () => {
      const notSoldData = {
        ...sampleData,
        saleDate: undefined
      };
      
      const result = calculateDetailedMargins(notSoldData);
      
      expect(result.saleDate).toBeUndefined();
      expect(result.saleMonth).toBeUndefined();
      expect(result.saleQuarter).toBeUndefined();
      expect(result.daysInStock).toBeGreaterThan(0); // Should use current date
    });

    test('should handle negative profit correctly', () => {
      const lossData = {
        ...sampleData,
        salePrice: 8000, // Sell for less than purchase price
        totalCosts: 2000 // High costs
      };
      
      const result = calculateDetailedMargins(lossData);
      
      expect(result.grossProfit).toBe(-2000); // £8,000 - £10,000
      expect(result.netProfit).toBeLessThan(0);
      expect(result.profitCategory).toBe('LOW');
    });
  });
});

// Helper function to run a quick manual test
export function runManualTest() {
  console.log('🧪 Running manual margin calculation test...');
  
  const testData: VehicleMarginData = {
    stockId: 'MANUAL_TEST',
    registration: 'TEST 123',
    purchasePrice: 15000,
    salePrice: 20000,
    totalCosts: 1500,
    vatableCosts: 900,
    nonVatableCosts: 600,
    purchaseDate: new Date('2024-01-01'),
    saleDate: new Date('2024-02-29'),
    isCommercialPurchase: false
  };
  
  const result = calculateDetailedMargins(testData);
  
  console.log('📊 Test Results:');
  console.log(`Gross Profit: £${result.grossProfit}`);
  console.log(`Net Profit: £${result.netProfit}`);
  console.log(`VAT to Pay: £${result.vatToPay}`);
  console.log(`Net Margin: ${result.netMarginPercent.toFixed(2)}%`);
  console.log(`Profit Category: ${result.profitCategory}`);
  console.log(`Days in Stock: ${result.daysInStock}`);
  console.log(`Profit per Day: £${result.profitPerDay.toFixed(2)}`);
  
  return result;
}
