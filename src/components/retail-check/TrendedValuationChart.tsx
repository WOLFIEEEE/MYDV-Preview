"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  PoundSterling
} from "lucide-react";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendedDataPoint {
  date: string;
  retailValue: number;
  tradeValue: number;
  partExValue: number;
}

interface TrendedValuationData {
  period: string;
  data: TrendedDataPoint[];
}

interface TrendedValuationChartProps {
  trendedData: TrendedValuationData;
  isDarkMode: boolean;
  currentRetailValue?: number; // Actual current retail value from main valuation
  currentPartExValue?: number; // Actual current part-ex value  
  currentTradeValue?: number; // Actual current trade value
  currentStockPrice?: number; // Current stock price (forecourt price) for stock flow
}

export default function TrendedValuationChart({ 
  trendedData, 
  isDarkMode, 
  currentRetailValue, 
  currentPartExValue, 
  currentTradeValue,
  currentStockPrice
}: TrendedValuationChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<'retailValue' | 'tradeValue' | 'partExValue'>('retailValue');

  // Debug logging
  console.log('📊 TrendedValuationChart received data:', trendedData);

  if (!trendedData?.data || trendedData.data.length === 0) {
    return (
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <TrendingUp className="w-5 h-5" />
            Trended Valuations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500 mb-2">No trended valuation data available</p>
            <p className="text-xs text-gray-400">
              {trendedData ? 'Data array is empty' : 'No data object provided'}
            </p>
            {/* Debug info */}
            <details className="mt-4 text-xs text-gray-400">
              <summary>Debug Info</summary>
              <pre className="mt-2 text-left bg-gray-100 dark:bg-gray-800 p-2 rounded">
                {JSON.stringify(trendedData, null, 2)}
              </pre>
            </details>
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'retailValue': return 'text-green-600 dark:text-green-400';
      case 'tradeValue': return 'text-orange-600 dark:text-orange-400';
      case 'partExValue': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-white';
    }
  };

  const getMetricBgColor = (metric: string) => {
    switch (metric) {
      case 'retailValue': return 'bg-green-500';
      case 'tradeValue': return 'bg-orange-500';
      case 'partExValue': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'retailValue': return 'Retail Value';
      case 'tradeValue': return 'Trade Value';
      case 'partExValue': return 'Part Exchange';
      default: return 'Value';
    }
  };

  // Get actual current values (from main retail check) vs trended values
  const getCurrentValue = () => {
    switch (selectedMetric) {
      case 'retailValue': return currentRetailValue || 0;
      case 'partExValue': return currentPartExValue || 0; 
      case 'tradeValue': return currentTradeValue || 0;
      default: return 0;
    }
  };

  const actualCurrentValue = getCurrentValue();
  const trendedCurrentValue = trendedData.data[trendedData.data.length - 1]?.[selectedMetric] || 0;
  const previousValue = trendedData.data[0]?.[selectedMetric] || 0;
  
  // Use actual current value if available, otherwise fall back to trended
  const displayCurrentValue = actualCurrentValue > 0 ? actualCurrentValue : trendedCurrentValue;
  
  // Calculate change: Current Value vs Trended Value
  const trendChange = displayCurrentValue - trendedCurrentValue;
  const trendPercentage = trendedCurrentValue > 0 ? ((trendChange / trendedCurrentValue) * 100) : 0;
  
  // Find current date index in the data
  const currentDate = new Date();
  const currentDateIndex = trendedData.data.findIndex(point => {
    const pointDate = new Date(point.date);
    return pointDate >= currentDate;
  });
  
  // If no future dates found, use the last data point as current
  const actualCurrentIndex = currentDateIndex >= 0 ? currentDateIndex : trendedData.data.length - 1;
  
  // Calculate weekly depreciation using only current date and future data points
  const futureDataPoints = trendedData.data.slice(actualCurrentIndex);
  const currentDataValue = futureDataPoints[0]?.[selectedMetric] || 0;
  const lastFutureValue = futureDataPoints[futureDataPoints.length - 1]?.[selectedMetric] || 0;
  
  // Calculate weekly depreciation from current date onwards
  const futureWeeks = futureDataPoints.length - 1;
  const weeklyDepreciation = futureWeeks > 0 ? (lastFutureValue - currentDataValue) / futureWeeks : 0;
  const weeklyDepreciationPercentage = currentDataValue > 0 ? ((weeklyDepreciation / currentDataValue) * 100) : 0;
  
  // Calculate total period change for context
  const totalPeriodChange = trendedCurrentValue - previousValue;
  const totalPeriodPercentage = previousValue > 0 ? ((totalPeriodChange / previousValue) * 100) : 0;

  // Debug logging for trend calculations
  console.log('📊 Trend calculations:', {
    actualCurrentValue,
    trendedCurrentValue,
    previousValue,
    displayCurrentValue,
    currentDateIndex: actualCurrentIndex,
    futureDataPoints: futureDataPoints.length,
    currentDataValue,
    lastFutureValue,
    trendChange: `£${trendChange.toFixed(0)} (Current vs Trended)`,
    trendPercentage: `${trendPercentage.toFixed(1)}% (Current vs Trended)`,
    weeklyDepreciation: `£${weeklyDepreciation.toFixed(0)} per data point`,
    weeklyDepreciationPercentage: `${weeklyDepreciationPercentage.toFixed(2)}% per data point`,
    totalPeriodChange: `£${totalPeriodChange.toFixed(0)} (Total Period)`,
    totalPeriodPercentage: `${totalPeriodPercentage.toFixed(1)}% (Total Period)`,
    totalDataPoints: `${trendedData.data.length} data points over ${trendedData.period}`
  });

  // Calculate max value for chart scaling
  const allValues = trendedData.data.flatMap(d => [d.retailValue, d.tradeValue, d.partExValue]);
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const valueRange = maxValue - minValue;

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <BarChart3 className="w-5 h-5" />
            Trended Valuations
            <span className={`text-sm font-normal ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              ({trendedData.period})
            </span>
          </CardTitle>
          
          <div className="flex items-center gap-4">
            {/* Current Stock Price Badge (prominent display) */}
            {currentStockPrice && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Stock Price:
                </span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(currentStockPrice)}
                </span>
              </div>
            )}
            
            {weeklyDepreciation !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${
                weeklyDepreciation > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {weeklyDepreciation > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(weeklyDepreciationPercentage).toFixed(2)}% avg
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Metric Selection */}
        <div className="flex gap-2 mb-6">
          {(['retailValue', 'tradeValue', 'partExValue'] as const).map((metric) => (
            <Button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              variant={selectedMetric === metric ? "default" : "outline"}
              size="sm"
              className={selectedMetric === metric ? getMetricBgColor(metric) : ''}
            >
              {getMetricLabel(metric)}
            </Button>
          ))}
        </div>

        {/* Chart */}
        <div className="relative h-64 mb-4">
          <Line
            data={{
              labels: trendedData.data.map(point => formatDate(point.date)),
              datasets: [
                {
                  label: 'Retail Value',
                  data: trendedData.data.map(point => point.retailValue),
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderWidth: 2,
                  fill: false,
                  tension: 0.4,
                  hidden: selectedMetric !== 'retailValue'
                },
                {
                  label: 'Trade Value',
                  data: trendedData.data.map(point => point.tradeValue),
                  borderColor: 'rgb(249, 115, 22)',
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  borderWidth: 2,
                  fill: false,
                  tension: 0.4,
                  hidden: selectedMetric !== 'tradeValue'
                },
                {
                  label: 'Part-Ex Value',
                  data: trendedData.data.map(point => point.partExValue),
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 2,
                  fill: false,
                  tension: 0.4,
                  hidden: selectedMetric !== 'partExValue'
                },
                // Add current stock price as horizontal line (only for stock flow)
                ...(currentStockPrice ? [{
                  label: 'Current Stock Price',
                  data: trendedData.data.map(() => currentStockPrice),
                  borderColor: 'rgb(168, 85, 247)', // Purple color
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  borderWidth: 3,
                  borderDash: [10, 5], // Dashed line
                  fill: false,
                  tension: 0,
                  pointRadius: 0, // No points on the line
                  pointHoverRadius: 0,
                  hidden: false // Always show when available
                }] : [])
              ]
            }}
            plugins={[
              // Custom plugin for past/future background gradients
              {
                id: 'pastFutureBackground',
                beforeDraw: (chart: any) => {
                  if (actualCurrentIndex >= 0 && actualCurrentIndex < trendedData.data.length) {
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;
                    
                    const currentX = xAxis.getPixelForValue(actualCurrentIndex);
                    
                    ctx.save();
                    
                    // Past data background (left side)
                    if (actualCurrentIndex > 0) {
                      const pastGradient = ctx.createLinearGradient(xAxis.left, 0, currentX, 0);
                      pastGradient.addColorStop(0, isDarkMode ? 'rgba(107, 114, 128, 0.1)' : 'rgba(156, 163, 175, 0.1)');
                      pastGradient.addColorStop(1, isDarkMode ? 'rgba(107, 114, 128, 0.05)' : 'rgba(156, 163, 175, 0.05)');
                      
                      ctx.fillStyle = pastGradient;
                      ctx.fillRect(xAxis.left, yAxis.top, currentX - xAxis.left, yAxis.bottom - yAxis.top);
                    }
                    
                    // Future data background (right side)
                    if (actualCurrentIndex < trendedData.data.length - 1) {
                      const futureGradient = ctx.createLinearGradient(currentX, 0, xAxis.right, 0);
                      futureGradient.addColorStop(0, isDarkMode ? 'rgba(34, 197, 94, 0.05)' : 'rgba(34, 197, 94, 0.08)');
                      futureGradient.addColorStop(1, isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.12)');
                      
                      ctx.fillStyle = futureGradient;
                      ctx.fillRect(currentX, yAxis.top, xAxis.right - currentX, yAxis.bottom - yAxis.top);
                    }
                    
                    ctx.restore();
                  }
                }
              },
              // Custom plugin for vertical current date line
              {
                id: 'currentDateLine',
                afterDraw: (chart: any) => {
                  if (actualCurrentIndex >= 0 && actualCurrentIndex < trendedData.data.length) {
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;
                    
                    const x = xAxis.getPixelForValue(actualCurrentIndex);
                    
                    ctx.save();
                    ctx.setLineDash([5, 5]); // Dotted line
                    ctx.strokeStyle = isDarkMode ? '#9ca3af' : '#6b7280';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, yAxis.top);
                    ctx.lineTo(x, yAxis.bottom);
                    ctx.stroke();
                    
                    // Add "Today" label
                    ctx.setLineDash([]); // Reset line dash
                    ctx.fillStyle = isDarkMode ? '#f3f4f6' : '#111827';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Today', x, yAxis.top - 5);
                    ctx.restore();
                  }
                }
              }
            ]}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: currentStockPrice ? true : false, // Show legend when stock price is available
                  position: 'top' as const,
                  labels: {
                    color: isDarkMode ? '#f3f4f6' : '#111827',
                    usePointStyle: true,
                    filter: function(legendItem: any) {
                      // Only show the current stock price and selected metric in legend
                      return legendItem.text === 'Current Stock Price' || 
                             (selectedMetric === 'retailValue' && legendItem.text === 'Retail Value') ||
                             (selectedMetric === 'tradeValue' && legendItem.text === 'Trade Value') ||
                             (selectedMetric === 'partExValue' && legendItem.text === 'Part-Ex Value');
                    }
                  }
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  titleColor: isDarkMode ? '#f3f4f6' : '#111827',
                  bodyColor: isDarkMode ? '#d1d5db' : '#374151',
                  borderColor: isDarkMode ? '#374151' : '#d1d5db',
                  borderWidth: 1,
                  callbacks: {
                    label: function(context: any) {
                      if (context.dataset.label === 'Current Stock Price') {
                        return `🏷️ ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                      }
                      return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    },
                    afterBody: function(tooltipItems: any[]) {
                      if (currentStockPrice) {
                        const currentValue = tooltipItems.find(item => item.dataset.label !== 'Current Stock Price')?.parsed.y;
                        if (currentValue) {
                          const diff = currentStockPrice - currentValue;
                          const diffText = diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff);
                          return [`Stock Price vs ${tooltipItems[0].dataset.label}: ${diffText}`];
                        }
                      }
                      return [];
                    }
                  }
                }
              },
              scales: {
                x: {
                  display: true,
                  grid: {
                    color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)'
                  },
                  ticks: {
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    maxTicksLimit: 8
                  }
                },
                y: {
                  display: true,
                  grid: {
                    color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)'
                  },
                  ticks: {
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    callback: function(value: any) {
                      return formatCurrency(Number(value));
                    }
                  }
                }
              },
              interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
              }
            }}
          />
        </div>

        {/* Clear Summary Stats */}
        <div className={`grid ${currentStockPrice ? 'grid-cols-4' : 'grid-cols-3'} gap-4 pt-4 border-t border-gray-200 dark:border-gray-700`}>
          <div className="text-center">
            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              Market {getMetricLabel(selectedMetric)}
            </p>
            <p className={`font-semibold text-lg ${getMetricColor(selectedMetric)}`}>
              {formatCurrency(displayCurrentValue)}
            </p>
            {actualCurrentValue > 0 && actualCurrentValue !== trendedCurrentValue && (
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-400'}`}>
                Trended: {formatCurrency(trendedCurrentValue)}
              </p>
            )}
            {actualCurrentValue > 0 && actualCurrentValue !== trendedCurrentValue && (
              <p className={`text-xs ${
                trendChange > 0 ? 'text-green-600 dark:text-green-400' : 
                trendChange < 0 ? 'text-red-600 dark:text-red-400' : 
                'text-gray-500 dark:text-white'
              }`}>
                {trendChange > 0 ? '+' : ''}{formatCurrency(trendChange)} vs trend
              </p>
            )}
          </div>
          
          {/* Current Stock Price (only for stock flow) */}
          {currentStockPrice && (
            <div className="text-center">
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Current Stock Price
              </p>
              <p className="font-semibold text-lg text-purple-600 dark:text-purple-400">
                {formatCurrency(currentStockPrice)}
              </p>
              <p className={`text-xs ${
                currentStockPrice > displayCurrentValue ? 'text-red-600 dark:text-red-400' : 
                currentStockPrice < displayCurrentValue ? 'text-green-600 dark:text-green-400' : 
                'text-gray-500 dark:text-white'
              }`}>
                {currentStockPrice > displayCurrentValue ? '+' : ''}{formatCurrency(currentStockPrice - displayCurrentValue)} vs market
              </p>
            </div>
          )}
          
          <div className="text-center">
            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              Weekly Average Depreciation
            </p>
            <p className={`font-semibold ${
              weeklyDepreciation > 0 ? 'text-green-600 dark:text-green-400' : 
              weeklyDepreciation < 0 ? 'text-red-600 dark:text-red-400' : 
              'text-gray-600 dark:text-white'
            }`}>
              {weeklyDepreciation > 0 ? '+' : ''}{formatCurrency(Math.abs(weeklyDepreciation))}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-400'}`}>
              per data point
            </p>
          </div>
          <div className="text-center">
            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              Weekly Depreciation %
            </p>
            <p className={`font-semibold ${
              weeklyDepreciationPercentage > 0 ? 'text-green-600 dark:text-green-400' : 
              weeklyDepreciationPercentage < 0 ? 'text-red-600 dark:text-red-400' : 
              'text-gray-600 dark:text-white'
            }`}>
              {weeklyDepreciationPercentage > 0 ? '+' : ''}{Math.abs(weeklyDepreciationPercentage).toFixed(2)}%
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-400'}`}>
              average rate
            </p>
          </div>
        </div>

        {/* Stock Price Comparison (only for stock flow with forecourt price) */}
        {currentStockPrice && (
          <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Current Stock Price Analysis
                </span>
              </div>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(currentStockPrice)}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>vs Retail Value</p>
                <p className={`font-semibold ${
                  currentStockPrice > (currentRetailValue || 0) ? 'text-red-600 dark:text-red-400' : 
                  currentStockPrice < (currentRetailValue || 0) ? 'text-green-600 dark:text-green-400' : 
                  'text-gray-600 dark:text-white'
                }`}>
                  {currentRetailValue ? 
                    `${currentStockPrice > currentRetailValue ? '+' : ''}${formatCurrency(currentStockPrice - currentRetailValue)}` : 
                    'N/A'
                  }
                </p>
              </div>
              <div className="text-center">
                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>vs Trade Value</p>
                <p className={`font-semibold ${
                  currentStockPrice > (currentTradeValue || 0) ? 'text-green-600 dark:text-green-400' : 
                  currentStockPrice < (currentTradeValue || 0) ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-600 dark:text-white'
                }`}>
                  {currentTradeValue ? 
                    `${currentStockPrice > currentTradeValue ? '+' : ''}${formatCurrency(currentStockPrice - currentTradeValue)}` : 
                    'N/A'
                  }
                </p>
              </div>
              <div className="text-center">
                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>vs Part-Ex Value</p>
                <p className={`font-semibold ${
                  currentStockPrice > (currentPartExValue || 0) ? 'text-green-600 dark:text-green-400' : 
                  currentStockPrice < (currentPartExValue || 0) ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-600 dark:text-white'
                }`}>
                  {currentPartExValue ? 
                    `${currentStockPrice > currentPartExValue ? '+' : ''}${formatCurrency(currentStockPrice - currentPartExValue)}` : 
                    'N/A'
                  }
                </p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Stock Price Position:
                </span>
                <span className={`text-xs font-medium ${
                  currentRetailValue && currentStockPrice > currentRetailValue ? 'text-red-600 dark:text-red-400' :
                  currentTradeValue && currentStockPrice < currentTradeValue ? 'text-red-600 dark:text-red-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {currentRetailValue && currentStockPrice > currentRetailValue ? 'Above Market Retail' :
                   currentTradeValue && currentStockPrice < currentTradeValue ? 'Below Trade Value' :
                   'Within Market Range'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Data Points Summary */}
        <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Data Points: {trendedData.data.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                trendedData.period.includes('fallback') || trendedData.period.includes('estimated') 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
              }`}></div>
              <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                {trendedData.period.includes('fallback') || trendedData.period.includes('estimated') 
                  ? 'Estimated Data' 
                  : 'Live Data'
                }
              </span>
            </div>
          </div>
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Showing {getMetricLabel(selectedMetric).toLowerCase()} trends over {trendedData.period}
          </p>
          
          {/* Market insights */}
          <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Volatility: 
                </span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>
                  {Math.abs(weeklyDepreciationPercentage) < 1 ? 'Low' : Math.abs(weeklyDepreciationPercentage) < 3 ? 'Moderate' : 'High'}
                </span>
              </div>
              <div>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Direction: 
                </span>
                <span className={`${
                  weeklyDepreciationPercentage > 0.5 ? 'text-green-600 dark:text-green-400' : 
                  weeklyDepreciationPercentage < -0.5 ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-600 dark:text-white'
                }`}>
                  {weeklyDepreciationPercentage > 0.5 ? 'Appreciating' : weeklyDepreciationPercentage < -0.5 ? 'Depreciating' : 'Stable'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
