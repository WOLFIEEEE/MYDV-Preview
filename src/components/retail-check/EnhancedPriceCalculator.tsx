"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Target, 
  TrendingUp,
  PoundSterling,
  Percent,
  Settings,
  Info,
  RefreshCw,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import { VehicleInfo } from "@/types/retail-check";

interface VehicleMetricsData {
  retailPrice: number;
  targetBuyPrice: number;
  daysToSell: number | null;
  pricePosition: number;
  margin: number;
  costs: number;
  priceRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH';
  derivativeId?: string;
  firstRegistrationDate?: string;
  mileage?: number;
  features?: Array<{ name: string }>;
}

interface ValuationData {
  retailValue: number;
  partExValue: number;
  tradeValue: number;
  forecourtPrice?: number;
}

interface EnhancedPriceCalculatorProps {
  vehicleInfo?: VehicleInfo;
  valuations?: ValuationData;
  isDarkMode: boolean;
}

export default function EnhancedPriceCalculator({ vehicleInfo, valuations, isDarkMode }: EnhancedPriceCalculatorProps) {
  const [metricsData, setMetricsData] = useState<VehicleMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculator inputs (editable)
  const [retailPrice, setRetailPrice] = useState(0);
  const [pricePosition, setPricePosition] = useState(100);
  const [margin, setMargin] = useState(1500);
  const [costs, setCosts] = useState(300);
  
  // Calculated values
  const [targetBuyPrice, setTargetBuyPrice] = useState(0);
  const [priceRating, setPriceRating] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH'>('GOOD');
  const [daysToSell, setDaysToSell] = useState<number | null>(null);

  // Load initial vehicle metrics data
  useEffect(() => {
    if (vehicleInfo && (vehicleInfo.derivativeId || valuations)) {
      loadVehicleMetrics();
    }
  }, [vehicleInfo, valuations]);

  // Update calculated values when inputs change
  useEffect(() => {
    calculateValues();
  }, [retailPrice, pricePosition, margin, costs]);

  const loadVehicleMetrics = async () => {
    if (!vehicleInfo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Loading vehicle metrics for:', vehicleInfo);
      
      // First check if we have a price indicator from the vehicle info (from AutoTrader API)
      let initialPriceRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH' = 'GOOD';
      if (vehicleInfo.priceIndicator) {
        // Map AutoTrader price indicator to our rating system
        const priceIndicator = vehicleInfo.priceIndicator.toUpperCase();
        if (['EXCELLENT', 'GOOD', 'FAIR', 'HIGH'].includes(priceIndicator)) {
          initialPriceRating = priceIndicator as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'HIGH';
        }
        console.log('🏷️ Using price indicator from vehicle info:', vehicleInfo.priceIndicator, '→', initialPriceRating);
      }
      
      // Try adjusted-vehicle-metrics API first
      if (vehicleInfo.derivativeId) {
        const metricsResponse = await fetch('/api/adjusted-vehicle-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            derivativeId: vehicleInfo.derivativeId,
            firstRegistrationDate: `${vehicleInfo.year}-01-01`,
            odometerReadingMiles: vehicleInfo.mileage || 0
          })
        });

        if (metricsResponse.ok) {
          const metricsResult = await metricsResponse.json();
          console.log('✅ Vehicle metrics response:', metricsResult);
          
          if (metricsResult.success && metricsResult.data) {
            const data = metricsResult.data;
            const metrics: VehicleMetricsData = {
              retailPrice: data.retailPrice || valuations?.retailValue || 0,
              targetBuyPrice: data.targetBuyPrice || (valuations?.retailValue || 0) * 0.75,
              daysToSell: data.daysToSell || null,
              pricePosition: data.pricePosition || 100,
              margin: data.margin || 1500,
              costs: data.costs || 300,
              priceRating: initialPriceRating || data.priceRating || 'GOOD',
              derivativeId: vehicleInfo.derivativeId,
              firstRegistrationDate: `${vehicleInfo.year}-01-01`,
              mileage: vehicleInfo.mileage,
              features: [] // Would come from vehicle data
            };
            
            setMetricsData(metrics);
            setRetailPrice(metrics.retailPrice);
            setPricePosition(metrics.pricePosition);
            setMargin(metrics.margin);
            setCosts(metrics.costs);
            setPriceRating(metrics.priceRating);
            setDaysToSell(metrics.daysToSell);
            
            return;
          }
        }
      }
      
      // Fallback to valuations data
      if (valuations) {
        console.log('📊 Using valuations fallback data');
        const fallbackMetrics: VehicleMetricsData = {
          retailPrice: valuations.retailValue,
          targetBuyPrice: Math.round(valuations.retailValue * 0.75),
          daysToSell: null,
          pricePosition: 100,
          margin: 1500,
          costs: 300,
          priceRating: initialPriceRating
        };
        
        setMetricsData(fallbackMetrics);
        setRetailPrice(fallbackMetrics.retailPrice);
        setPricePosition(fallbackMetrics.pricePosition);
        setMargin(fallbackMetrics.margin);
        setCosts(fallbackMetrics.costs);
        setPriceRating(fallbackMetrics.priceRating);
      }
      
    } catch (err) {
      console.error('❌ Failed to load vehicle metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vehicle metrics');
      
      // Use basic fallback
      if (valuations) {
        setRetailPrice(valuations.retailValue);
        setTargetBuyPrice(Math.round(valuations.retailValue * 0.75));
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = () => {
    // Calculate target buy price: retail - margin - costs
    const calculatedBuyPrice = Math.max(0, retailPrice - margin - costs);
    setTargetBuyPrice(Math.round(calculatedBuyPrice));
    
    // Calculate price rating based on position
    if (pricePosition <= 80) {
      setPriceRating('EXCELLENT');
    } else if (pricePosition <= 100) {
      setPriceRating('GOOD');
    } else if (pricePosition <= 120) {
      setPriceRating('FAIR');
    } else {
      setPriceRating('HIGH');
    }
  };

  const handleRecalculate = async () => {
    setLoading(true);
    
    try {
      // Call the calculate-price API with current values
      const response = await fetch('/api/retail-check/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retail_price: retailPrice,
          margin_percentage: (margin / retailPrice) * 100,
          additional_costs: costs,
          price_position: pricePosition,
          vehicle_age: vehicleInfo ? new Date().getFullYear() - vehicleInfo.year : 5,
          mileage: vehicleInfo?.mileage || 50000
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const data = result.data;
          setTargetBuyPrice(data.cost_price);
          setMargin(data.profit_margin);
          
          // PRESERVE the original AutoTrader price indicator rating
          // Don't override with calculated rating - keep the real API rating
          console.log('🔧 Recalculation complete - preserving original AutoTrader price rating:', priceRating);
          
          // Optional: Log what the calculated rating would have been for comparison
          console.log('📊 Calculated rating (not used):', data.market_position.rating);
        }
      }
    } catch (err) {
      console.error('❌ Recalculation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT': return 'bg-green-500 text-white';
      case 'GOOD': return 'bg-blue-500 text-white';
      case 'FAIR': return 'bg-yellow-500 text-black';
      case 'HIGH': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !metricsData) {
    return (
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading vehicle metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <CardContent className="space-y-6 pt-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              {error}
            </span>
          </div>
        )}
        {/* Row 1: Primary Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Retail Price */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Retail Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
              <Input
                type="number"
                value={retailPrice}
                onChange={(e) => setRetailPrice(parseInt(e.target.value) || 0)}
                className={`pl-8 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                min="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Rating:
              </span>
              <Badge className={getRatingColor(priceRating)}>
                {priceRating}
              </Badge>
            </div>
          </div>

          {/* Target Buy Price */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Target Buy Price
            </label>
            <div className={`p-3 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20`}>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(targetBuyPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Days to Sell */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Days to Sell
            </label>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {daysToSell ? `${daysToSell} days` : 'Not Analyzed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Calculator Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Price Position */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Price Position
            </label>
            <div className="relative">
              <Input
                type="number"
                value={pricePosition}
                onChange={(e) => setPricePosition(parseInt(e.target.value) || 100)}
                className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                min="0"
                max="200"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>

          {/* Margin */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Margin
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
              <Input
                type="number"
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value) || 0)}
                className={`pl-8 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                min="0"
              />
            </div>
          </div>

          {/* Costs */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Costs
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
              <Input
                type="number"
                value={costs}
                onChange={(e) => setCosts(parseInt(e.target.value) || 0)}
                className={`pl-8 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Recalculate Button */}
        <div className="flex justify-center">
          <Button 
            onClick={handleRecalculate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Calculate Parameters Again
              </>
            )}
          </Button>
        </div>

        {/* Additional Metrics */}
        {metricsData && (
          <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Financial Metrics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className={`block ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Profit Margin
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(margin)}
                </span>
              </div>
              <div>
                <span className={`block ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Margin %
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {retailPrice > 0 ? ((margin / retailPrice) * 100).toFixed(1) : '0'}%
                </span>
              </div>
              <div>
                <span className={`block ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Total Costs
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(costs)}
                </span>
              </div>
              <div>
                <span className={`block ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  ROI
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {targetBuyPrice > 0 ? ((margin / targetBuyPrice) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
