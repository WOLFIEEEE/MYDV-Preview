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
  Loader2
} from "lucide-react";
import { VehicleInfo } from "@/types/retail-check";

interface PriceCalculationData {
  suggestedRetailPrice: number;
  margin: number;
  costs: number;
  targetBuyPrice: number;
  pricePosition: number;
}

interface ValuationData {
  retailValue: number;
  partExValue: number;
  tradeValue: number;
  forecourtPrice?: number;
}

interface PriceCalculatorProps {
  priceData: PriceCalculationData;
  valuations?: ValuationData;
  vehicleInfo?: VehicleInfo;
  isDarkMode: boolean;
}

export default function PriceCalculator({ priceData, valuations, vehicleInfo, isDarkMode }: PriceCalculatorProps) {
  const [customInputs, setCustomInputs] = useState({
    targetMargin: Math.round((priceData.margin / priceData.suggestedRetailPrice) * 100),
    estimatedCosts: priceData.costs,
    desiredPosition: priceData.pricePosition
  });
  
  const [calculatedPrice, setCalculatedPrice] = useState(priceData.suggestedRetailPrice);
  const [calculatedBuyPrice, setCalculatedBuyPrice] = useState(priceData.targetBuyPrice);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newInputs = { ...customInputs, [field]: numValue };
    setCustomInputs(newInputs);
    
    // Recalculate prices based on new inputs
    recalculatePrices(newInputs);
  };

  const recalculatePrices = (inputs: typeof customInputs) => {
    const baseValue = valuations?.retailValue || priceData.suggestedRetailPrice;
    
    // Adjust base value based on market position
    const positionMultiplier = 1 + ((inputs.desiredPosition - 50) / 100 * 0.2); // ±20% based on position
    const adjustedBaseValue = baseValue * positionMultiplier;
    
    // Calculate retail price including margin
    const marginAmount = (adjustedBaseValue * inputs.targetMargin) / 100;
    const newRetailPrice = adjustedBaseValue + marginAmount;
    
    // Calculate buy price (retail - margin - costs)
    const newBuyPrice = newRetailPrice - marginAmount - inputs.estimatedCosts;
    
    setCalculatedPrice(Math.round(newRetailPrice));
    setCalculatedBuyPrice(Math.round(Math.max(0, newBuyPrice)));
  };

  const resetToRecommended = () => {
    const resetInputs = {
      targetMargin: Math.round((priceData.margin / priceData.suggestedRetailPrice) * 100),
      estimatedCosts: priceData.costs,
      desiredPosition: priceData.pricePosition
    };
    setCustomInputs(resetInputs);
    setCalculatedPrice(priceData.suggestedRetailPrice);
    setCalculatedBuyPrice(priceData.targetBuyPrice);
  };

  const getPositionLabel = (position: number) => {
    if (position >= 80) return { label: 'Premium', color: 'text-purple-600 dark:text-purple-400' };
    if (position >= 60) return { label: 'Above Market', color: 'text-blue-600 dark:text-blue-400' };
    if (position >= 40) return { label: 'Market Average', color: 'text-green-600 dark:text-green-400' };
    if (position >= 20) return { label: 'Below Market', color: 'text-orange-600 dark:text-orange-400' };
    return { label: 'Budget', color: 'text-red-600 dark:text-red-400' };
  };

  const positionInfo = getPositionLabel(customInputs.desiredPosition);
  const actualMargin = calculatedPrice - calculatedBuyPrice - customInputs.estimatedCosts;
  const actualMarginPercent = calculatedPrice > 0 ? (actualMargin / calculatedPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Price Calculator */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Calculator className="w-5 h-5" />
            Price Calculator
            <Badge variant="outline" className="ml-auto">
              Interactive
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Controls */}
            <div className="space-y-4">
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Adjust Parameters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Target Margin (%)
                  </label>
                  <Input
                    type="number"
                    value={customInputs.targetMargin}
                    onChange={(e) => handleInputChange('targetMargin', e.target.value)}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Estimated Costs (£)
                  </label>
                  <Input
                    type="number"
                    value={customInputs.estimatedCosts}
                    onChange={(e) => handleInputChange('estimatedCosts', e.target.value)}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                    min="0"
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Prep, transport, admin costs
                  </p>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Market Position (%)
                  </label>
                  <Input
                    type="range"
                    value={customInputs.desiredPosition}
                    onChange={(e) => handleInputChange('desiredPosition', e.target.value)}
                    className="w-full"
                    min="0"
                    max="100"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Budget</span>
                    <span className={positionInfo.color}>
                      {customInputs.desiredPosition}% - {positionInfo.label}
                    </span>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Premium</span>
                  </div>
                </div>
                
                <Button 
                  onClick={resetToRecommended} 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Recommended
                </Button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Calculated Prices
              </h3>
              
              <div className="space-y-3">
                <div className={`p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Suggested Retail Price
                    </span>
                    <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(calculatedPrice)}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Target Buy Price
                    </span>
                    <PoundSterling className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(calculatedBuyPrice)}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Actual Margin
                    </span>
                    <Percent className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(actualMargin)}
                    </p>
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      ({actualMarginPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison with Market */}
      {valuations && (
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <TrendingUp className="w-5 h-5" />
              Market Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  vs Market Retail
                </p>
                <p className={`text-lg font-semibold ${
                  calculatedPrice > valuations.retailValue ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {calculatedPrice > valuations.retailValue ? '+' : ''}{formatCurrency(calculatedPrice - valuations.retailValue)}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  ({((calculatedPrice - valuations.retailValue) / valuations.retailValue * 100).toFixed(1)}%)
                </p>
              </div>
              
              <div className="text-center">
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  vs Part Exchange
                </p>
                <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  +{formatCurrency(calculatedPrice - valuations.partExValue)}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  ({((calculatedPrice - valuations.partExValue) / valuations.partExValue * 100).toFixed(1)}%)
                </p>
              </div>
              
              <div className="text-center">
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  vs Trade Value
                </p>
                <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  +{formatCurrency(calculatedPrice - valuations.tradeValue)}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  ({((calculatedPrice - valuations.tradeValue) / valuations.tradeValue * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Strategy Tips */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Info className="w-5 h-5" />
            Pricing Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
              <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                Recommended Strategy
              </h4>
              <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                {customInputs.desiredPosition >= 70 
                  ? "Premium positioning - highlight unique features and quality"
                  : customInputs.desiredPosition >= 50
                  ? "Market competitive - balance price with value proposition"
                  : "Value positioning - emphasize affordability and reliability"
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Margin Analysis
                </h5>
                <p className={isDarkMode ? 'text-white' : 'text-gray-700'}>
                  {actualMarginPercent >= 20 
                    ? "Healthy margin - good profitability"
                    : actualMarginPercent >= 10
                    ? "Moderate margin - consider cost optimization"
                    : "Low margin - review pricing strategy"
                  }
                </p>
              </div>
              
              <div>
                <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Market Position
                </h5>
                <p className={isDarkMode ? 'text-white' : 'text-gray-700'}>
                  {customInputs.desiredPosition}% positioning places you in the {positionInfo.label.toLowerCase()} segment
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
