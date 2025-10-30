"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { TrendingUp, BarChart3 } from "lucide-react";
import DataGrid from "../shared/DataGrid";

interface MetricsTabProps {
  stockData: any;
}

export default function MetricsTab({ stockData }: MetricsTabProps) {
  const { isDarkMode } = useTheme();
  const responseMetrics = stockData.responseMetrics || {};
  console.log("🚀 ~ MetricsTab ~ responseMetrics:", responseMetrics)

  const metricsItems = [
    { label: 'Performance Score', value: responseMetrics.performanceRating?.score },
    { label: 'Performance Rating', value: responseMetrics.performanceRating?.rating },
    { label: 'Advert View Rating', value: responseMetrics.advertViewRating?.rating },
    { label: 'Search View Rating', value: responseMetrics.searchViewRating?.rating },
    { label: 'Lead Count Rating', value: responseMetrics.leadCountRating?.rating },
    { label: 'Yesterday Advert Views', value: responseMetrics.yesterday?.advertViews },
    { label: 'Yesterday Search Views', value: responseMetrics.yesterday?.searchViews },
    { label: 'Last Week Advert Views', value: responseMetrics.lastWeek?.advertViews },
    { label: 'Last Week Search Views', value: responseMetrics.lastWeek?.searchViews },
  ];

  const hasData = metricsItems.some(item => item.value !== null && item.value !== undefined);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Response Metrics</h2>
        </div>
      </div>
      
      {hasData ? (
        <div className={`p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-sm`}>
          <DataGrid items={metricsItems} />
        </div>
      ) : (
        <div className={`p-8 text-center rounded-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-sm`}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold">No Metrics Available</h3>
          </div>
          <p className="text-gray-500 dark:text-white">
            Response metrics data is not available for this vehicle.
          </p>
        </div>
      )}
    </div>
  );
}