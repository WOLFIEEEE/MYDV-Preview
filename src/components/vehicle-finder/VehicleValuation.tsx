"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, PoundSterling, RefreshCw, Settings, AlertCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface VehicleValuationProps {
  vehicleData: {
    registration?: string;
    make?: string;
    model?: string;
    derivative?: string;
    derivativeId?: string;
    year?: string;
    mileage?: string;
    // Valuation data from AutoTrader API
    // Can be either:
    // 1. Direct structure: { retail: {...}, trade: {...}, etc. }
    // 2. Nested structure: { marketAverage: { retail: {...}, trade: {...}, etc. } }
    valuations?: {
      // Direct structure
      retail?: {
        amountGBP?: number | null;
        amountNoVatGBP?: number | null;
        amountExcludingVatGBP?: number | null;
      };
      partExchange?: {
        amountGBP?: number | null;
        amountNoVatGBP?: number | null;
        amountExcludingVatGBP?: number | null;
      };
      trade?: {
        amountGBP?: number | null;
        amountNoVatGBP?: number | null;
        amountExcludingVatGBP?: number | null;
      };
      private?: {
        amountGBP?: number | null;
        amountNoVatGBP?: number | null;
        amountExcludingVatGBP?: number | null;
      };
      // Nested structure (marketAverage)
      marketAverage?: {
        retail?: {
          amountGBP?: number | null;
          amountNoVatGBP?: number | null;
          amountExcludingVatGBP?: number | null;
        };
        partExchange?: {
          amountGBP?: number | null;
          amountNoVatGBP?: number | null;
          amountExcludingVatGBP?: number | null;
        };
        trade?: {
          amountGBP?: number | null;
          amountNoVatGBP?: number | null;
          amountExcludingVatGBP?: number | null;
        };
        private?: {
          amountGBP?: number | null;
          amountNoVatGBP?: number | null;
          amountExcludingVatGBP?: number | null;
        };
      };
    };
    // Alternative structure if valuations are normalized
    retailValue?: number;
    privateValue?: number;
    partExchangeValue?: number;
    tradeValue?: number;
  };
}

export default function VehicleValuation({ vehicleData }: VehicleValuationProps) {
  const { isDarkMode } = useTheme();

  // Helper function to get amount from any of the possible fields
  const getAmount = (valueObj: any): number | null => {
    if (!valueObj || typeof valueObj !== 'object') return null;
    
    // Try amountGBP first, then amountNoVatGBP, then amountExcludingVatGBP
    return valueObj.amountGBP ?? valueObj.amountNoVatGBP ?? valueObj.amountExcludingVatGBP ?? null;
  };

  // Extract valuation values from either structure
  const getValuationValues = () => {
    console.log('🔍 VehicleValuation - Checking valuation data:', {
      hasValuations: !!vehicleData.valuations,
      valuationsType: typeof vehicleData.valuations,
      valuationsKeys: vehicleData.valuations ? Object.keys(vehicleData.valuations) : [],
      rawValuations: vehicleData.valuations
    });

    // Check for AutoTrader API structure first (could be marketAverage or direct structure)
    if (vehicleData.valuations) {
      // Check if it's the nested structure with marketAverage
      if (vehicleData.valuations.marketAverage) {
        const marketAvg = vehicleData.valuations.marketAverage;
        const values = {
          retailValue: getAmount(marketAvg.retail) ?? 0,
          privateValue: getAmount(marketAvg.private) ?? 0,
          partExchangeValue: getAmount(marketAvg.partExchange) ?? 0,
          tradeValue: getAmount(marketAvg.trade) ?? 0,
        };
        
        console.log('💰 Extracted valuation values from marketAverage:', values);
        return values;
      }
      
      // Check if it's the direct structure (retail, trade, partExchange, private directly)
      if (vehicleData.valuations.retail || vehicleData.valuations.trade || vehicleData.valuations.partExchange || vehicleData.valuations.private) {
        const values = {
          retailValue: getAmount(vehicleData.valuations.retail) ?? 0,
          privateValue: getAmount(vehicleData.valuations.private) ?? 0,
          partExchangeValue: getAmount(vehicleData.valuations.partExchange) ?? 0,
          tradeValue: getAmount(vehicleData.valuations.trade) ?? 0,
        };
        
        console.log('💰 Extracted valuation values from direct structure:', values);
        return values;
      }
    }
    
    // Check for normalized structure
    if (vehicleData.retailValue || vehicleData.privateValue || vehicleData.partExchangeValue || vehicleData.tradeValue) {
      return {
        retailValue: vehicleData.retailValue || 0,
        privateValue: vehicleData.privateValue || 0,
        partExchangeValue: vehicleData.partExchangeValue || 0,
        tradeValue: vehicleData.tradeValue || 0,
      };
    }
    
    console.log('❌ No valuation data found');
    return null;
  };

  const valuations = getValuationValues();

  // Check if all valuation values are 0 (API issue or no data)
  const hasValidValuations = valuations && (
    valuations.retailValue > 0 || 
    valuations.privateValue > 0 || 
    valuations.partExchangeValue > 0 || 
    valuations.tradeValue > 0
  );

  // If no valuation data is available, show a message
  if (!valuations || !hasValidValuations) {
    return (
      <Card className={`border shadow-xl rounded-2xl ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600' 
          : 'bg-gradient-to-br from-white to-blue-50/30 border-gray-200'
      }`}>
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Vehicle Valuation
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Professional vehicle valuation data
              </p>
            </div>
          </div>

          <div className={`p-6 rounded-lg text-center ${
            isDarkMode ? 'bg-slate-700/50' : 'bg-orange-50'
          } border ${isDarkMode ? 'border-slate-600' : 'border-orange-200'}`}>
            <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${
              isDarkMode ? 'text-orange-400' : 'text-orange-500'
            }`} />
            <h4 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Valuation Data Not Available
            </h4>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Valuation data is not available for this vehicle. This could be due to:
            </p>
            <ul className={`text-sm text-left mb-4 space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Vehicle is too new or too old for valuation</li>
              <li>• Insufficient market data available</li>
              <li>• Vehicle type not supported for valuation</li>
              <li>• API limitations or temporary unavailability</li>
            </ul>
            
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className={`text-xs p-3 rounded border mb-4 ${
                isDarkMode ? 'bg-slate-600 border-slate-500 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}>
                <strong>Debug Info:</strong><br/>
                Has valuations object: {vehicleData.valuations ? 'Yes' : 'No'}<br/>
                {valuations && (
                  <>
                    Retail: £{valuations.retailValue}<br/>
                    Private: £{valuations.privateValue}<br/>
                    Part Exchange: £{valuations.partExchangeValue}<br/>
                    Trade: £{valuations.tradeValue}<br/>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const valuationCards = [
    {
      key: 'retailValue',
      label: 'Retail Value',
      description: 'Estimated dealer selling price',
      value: valuations.retailValue,
      icon: TrendingUp,
      primary: true,
      color: 'from-blue-600 to-blue-700'
    },
    {
      key: 'privateValue',
      label: 'Private Sale Value',
      description: 'Estimated private sale price',
      value: valuations.privateValue,
      icon: PoundSterling,
      primary: false,
      color: 'from-green-600 to-green-700'
    },
    {
      key: 'partExchangeValue',
      label: 'Part Exchange Value',
      description: 'Trade-in value at dealership',
      value: valuations.partExchangeValue,
      icon: RefreshCw,
      primary: false,
      color: 'from-purple-600 to-purple-700'
    },
    {
      key: 'tradeValue',
      label: 'Trade Value',
      description: 'Wholesale/auction value',
      value: valuations.tradeValue,
      icon: Settings,
      primary: false,
      color: 'from-gray-600 to-gray-700'
    }
  ];


  return (
    <Card className={`border shadow-xl rounded-2xl ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600' 
        : 'bg-gradient-to-br from-white to-blue-50/30 border-gray-200'
    }`}>
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Vehicle Valuation
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Professional vehicle valuation data from AutoTrader
            </p>
          </div>
        </div>

        {/* Valuation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {valuationCards.map(({ key, label, description, value, icon: Icon, primary, color }) => (
            <div
              key={key}
              className={`p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                primary
                  ? `bg-gradient-to-br ${color} text-white`
                  : isDarkMode
                    ? 'bg-slate-800/50 border border-slate-600 hover:bg-slate-800'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-6 h-6 ${
                  primary ? 'text-white' : isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              
              <div className={`text-2xl font-bold mb-2 ${
                primary ? 'text-white' : isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {formatCurrency(value)}
              </div>
              
              <div className={`text-sm font-medium mb-1 ${
                primary ? 'text-blue-100' : isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {label}
              </div>
              
              <div className={`text-xs ${
                primary ? 'text-blue-100' : isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {description}
              </div>
            </div>
          ))}
        </div>


      </CardContent>
    </Card>
  );
}
