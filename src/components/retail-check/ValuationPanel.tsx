"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PoundSterling, 
  TrendingUp, 
  TrendingDown,
  Target,
  Info
} from "lucide-react";
import { VehicleInfo } from "@/types/retail-check";

interface ValuationData {
  retailValue: number;
  partExValue: number;
  tradeValue: number;
  forecourtPrice?: number;
}

interface ValuationPanelProps {
  valuations?: ValuationData;
  vehicleInfo?: VehicleInfo;
  isDarkMode: boolean;
  stockId?: string; // Only show forecourt price when we have a stock ID
}

export default function ValuationPanel({ valuations, vehicleInfo, isDarkMode, stockId }: ValuationPanelProps) {
  if (!valuations) {
    return (
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <PoundSterling className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">No valuation data available</p>
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
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getValueDifference = (value: number, baseValue: number) => {
    const diff = value - baseValue;
    const percentage = ((diff / baseValue) * 100);
    return { diff, percentage };
  };

  // Calculate differences from retail value
  const partExDiff = getValueDifference(valuations.partExValue, valuations.retailValue);
  const tradeDiff = getValueDifference(valuations.tradeValue, valuations.retailValue);
  const forecourtDiff = valuations.forecourtPrice ? getValueDifference(valuations.forecourtPrice, valuations.retailValue) : null;

  const valuationItems = [
    {
      title: 'Recommended',
      subtitle: 'Retail Value',
      value: valuations.retailValue,
      description: 'Recommended selling price',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: <Target className="w-4 h-4" />,
      primary: true
    },
    {
      title: 'Part Exchange',
      subtitle: '',
      value: valuations.partExValue,
      description: 'Customer trade-in value',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      icon: <PoundSterling className="w-4 h-4" />,
      difference: partExDiff
    },
    {
      title: 'Trade Value',
      subtitle: '',
      value: valuations.tradeValue,
      description: 'Wholesale/auction value',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      icon: <TrendingDown className="w-4 h-4" />,
      difference: tradeDiff
    }
  ];

  // Only show forecourt price if we have a stock ID (actual vehicle in stock)
  if (stockId && valuations.forecourtPrice && forecourtDiff) {
    valuationItems.push({
      title: 'Forecourt Price',
      subtitle: '',
      value: valuations.forecourtPrice,
      description: 'Current advertised price',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      icon: <TrendingUp className="w-4 h-4" />,
      difference: forecourtDiff
    });
  }

  // Dynamic grid classes based on number of items
  const getGridClasses = (itemCount: number) => {
    switch (itemCount) {
      case 1:
        return 'grid grid-cols-1 gap-3';
      case 2:
        return 'grid grid-cols-1 md:grid-cols-2 gap-3';
      case 3:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';
      case 4:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3';
      case 5:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3';
      default:
        // For 6+ items, use a responsive grid that wraps nicely
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3';
    }
  };

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <CardHeader className="pb-4">
        <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <PoundSterling className="w-5 h-5" />
          Vehicle Valuations
          <Badge variant="outline" className="ml-auto">
            {new Date().toLocaleDateString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Dynamic Responsive Layout */}
        <div className={getGridClasses(valuationItems.length)}>
          {valuationItems.map((item, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border transition-all duration-200 ${item.borderColor} ${item.bgColor}`}
            >
              {/* Header with icon and title */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded ${item.bgColor}`}>
                  <div className={item.color}>
                    {item.icon}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium ${item.color} leading-tight`}>
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <p className={`text-xs font-medium ${item.color} leading-tight`}>
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Value */}
              <div className="mb-2">
                <p className={`text-lg font-bold leading-tight ${
                  item.primary ? 'text-green-600 dark:text-green-400' : isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {formatCurrency(item.value)}
                </p>
              </div>
              
              {/* Description */}
              <p className={`text-xs leading-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                {item.description}
              </p>
              
              {/* Difference from retail */}
              {item.difference && (
                <div className={`text-xs leading-tight ${
                  item.difference.diff > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {item.difference.diff > 0 ? '+' : ''}{formatCurrency(Math.abs(item.difference.diff))} from retail
                  <br />
                  <span className="font-medium">
                    ({item.difference.diff > 0 ? '+' : ''}{item.difference.percentage.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
