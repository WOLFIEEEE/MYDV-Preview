"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Star, 
  Calendar, 
  IdCard, 
  MapPin, 
  Plus, 
  Minus, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  BarChart3,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Gauge
} from "lucide-react";
import { VehicleInfo } from "@/types/retail-check";

// Types based on actual API response
interface VehicleMetricsResponse {
  vehicleMetrics: {
    retail: {
      supply: { value: number };
      demand: { value: number };
      marketCondition: { value: number };
      rating: { value: number };
      daysToSell: { value: number };
      locations?: Array<{
        advertiserId?: string;
        latitude?: number;
        longitude?: number;
        rating: { value: number };
        daysToSell: { value: number };
      }>;
      confidenceOfSale?: Array<{
        days: number;
        confidenceRating: 'MISSED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'NO_ANALYSIS';
      }>;
    };
  };
}

interface LocationByAdvertiser {
  advertiserId: string;
}

interface LocationByCoordinates {
  latitude: string;
  longitude: string;
}

interface TargetDays {
  days: number;
}


interface ImprovedEnhancedVehicleMetricsProps {
  vehicleInfo: VehicleInfo;
  isDarkMode: boolean;
  onMetricsUpdate?: (metrics: VehicleMetricsResponse) => void;
}

export default function ImprovedEnhancedVehicleMetrics({ 
  vehicleInfo, 
  isDarkMode, 
  onMetricsUpdate 
}: ImprovedEnhancedVehicleMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metricsData, setMetricsData] = useState<VehicleMetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state with sensible defaults
  const [targetDays, setTargetDays] = useState<TargetDays[]>([
    { days: 30 }, 
    { days: 60 }, 
    { days: 90 }
  ]);
  const [advertiserIds, setAdvertiserIds] = useState<LocationByAdvertiser[]>([
    { advertiserId: '10028737' },
    { advertiserId: '10031798' }
  ]);
  const [coordinates, setCoordinates] = useState<LocationByCoordinates[]>([
    { latitude: '53.257999', longitude: '-3.442000' }
  ]);
  const [daysInStock, setDaysInStock] = useState<number>(30);

  // Helper functions for managing arrays
  const addTargetDays = () => {
    setTargetDays([...targetDays, { days: 30 }]);
  };

  const removeTargetDays = (index: number) => {
    if (targetDays.length > 1) {
      setTargetDays(targetDays.filter((_, i) => i !== index));
    }
  };

  const updateTargetDays = (index: number, days: number) => {
    const updated = [...targetDays];
    updated[index] = { days };
    setTargetDays(updated);
  };

  const addAdvertiserId = () => {
    setAdvertiserIds([...advertiserIds, { advertiserId: '' }]);
  };

  const removeAdvertiserId = (index: number) => {
    if (advertiserIds.length > 1) {
      setAdvertiserIds(advertiserIds.filter((_, i) => i !== index));
    }
  };

  const updateAdvertiserId = (index: number, advertiserId: string) => {
    const updated = [...advertiserIds];
    updated[index] = { advertiserId };
    setAdvertiserIds(updated);
  };

  const addCoordinates = () => {
    setCoordinates([...coordinates, { latitude: '', longitude: '' }]);
  };

  const removeCoordinates = (index: number) => {
    setCoordinates(coordinates.filter((_, i) => i !== index));
  };

  const updateCoordinates = (index: number, field: 'latitude' | 'longitude', value: string) => {
    const updated = [...coordinates];
    updated[index] = { ...updated[index], [field]: value };
    setCoordinates(updated);
  };


  // Main analysis function
  const runComprehensiveAnalysis = async () => {
    if (!vehicleInfo.derivativeId || !vehicleInfo.firstRegistrationDate) {
      setError('Missing required vehicle data (derivativeId or firstRegistrationDate)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prepare comprehensive payload
      const validTargetDays = targetDays.filter(item => item.days > 0);
      const validAdvertiserIds = advertiserIds.filter(item => item.advertiserId.trim());
      const validCoordinates = coordinates.filter(item => 
        item.latitude.trim() && item.longitude.trim()
      );
      
      const allLocations = [...validAdvertiserIds, ...validCoordinates];

      const payload = {
        vehicle: {
          derivativeId: vehicleInfo.derivativeId,
          firstRegistrationDate: vehicleInfo.firstRegistrationDate,
          odometerReadingMiles: vehicleInfo.mileage || 0
        },
        // Include locations if available
        ...(allLocations.length > 0 && { locations: allLocations }),
        // Include sale target if available
        ...(validTargetDays.length > 0 && {
          saleTarget: {
            daysInStock: daysInStock || 0,
            targetDaysToSell: validTargetDays
          }
        }),
        // Set analysis type to get comprehensive data
        analysisType: 'location' // This gives us the most comprehensive response
      };

      console.log('🔄 Running comprehensive vehicle metrics analysis:', payload);

      const response = await fetch('/api/retail-check/enhanced-vehicle-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setMetricsData(data.data);
        onMetricsUpdate?.(data.data);
        console.log('✅ Vehicle metrics analysis completed:', data.data);
      } else {
        throw new Error(data.error?.message || 'Analysis failed');
      }

    } catch (error) {
      console.error('❌ Vehicle metrics analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get confidence rating color
  const getConfidenceColor = (rating: string) => {
    switch (rating) {
      case 'HIGH': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MISSED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Helper function to get rating color based on value
  const getRatingColor = (rating: number) => {
    if (rating >= 90) return 'text-green-600';
    if (rating >= 70) return 'text-yellow-600';
    if (rating >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className={`border shadow-xl rounded-2xl ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Enhanced Vehicle Metrics
              </CardTitle>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Comprehensive vehicle performance analysis
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Analysis Button */}
        <div className="flex justify-center pb-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            onClick={runComprehensiveAnalysis}
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Star className="w-5 h-5 mr-2" />
                Run Comprehensive Analysis
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800 dark:text-red-200">Analysis Failed</span>
            </div>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {metricsData && metricsData.vehicleMetrics && metricsData.vehicleMetrics.retail && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Core Metrics */}
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Core Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rating Card */}
                {metricsData.vehicleMetrics.retail.rating && (
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-600">Rating</span>
                    </div>
                    <div className={`text-2xl font-bold ${getRatingColor(metricsData.vehicleMetrics.retail.rating.value)}`}>
                      {metricsData.vehicleMetrics.retail.rating.value.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">out of 100</div>
                  </div>
                )}

                {/* Days to Sell Card */}
                {metricsData.vehicleMetrics.retail.daysToSell && (
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-600">Days to Sell</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(metricsData.vehicleMetrics.retail.daysToSell.value)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">estimated days</div>
                  </div>
                )}

                {/* Market Condition Card */}
                {metricsData.vehicleMetrics.retail.marketCondition && (
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-purple-600">Market Condition</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {metricsData.vehicleMetrics.retail.marketCondition.value}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">condition score</div>
                  </div>
                )}

                {/* Supply/Demand Card */}
                {metricsData.vehicleMetrics.retail.supply && metricsData.vehicleMetrics.retail.demand && (
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-orange-600" />
                      <span className="font-medium text-orange-600">Supply/Demand</span>
                    </div>
                    <div className="text-sm text-orange-600">
                      Supply: {metricsData.vehicleMetrics.retail.supply.value}
                    </div>
                    <div className="text-sm text-orange-600">
                      Demand: {metricsData.vehicleMetrics.retail.demand.value}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Analysis Results */}
            <div className="space-y-6">
              {/* Location-Specific Metrics */}
              {metricsData.vehicleMetrics.retail.locations && metricsData.vehicleMetrics.retail.locations.length > 0 && (
                <div className="space-y-4">
                  <h4 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Location Analysis
                  </h4>
                  <div className="space-y-3">
                    {metricsData.vehicleMetrics.retail.locations.map((location, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="mb-2">
                          {location.advertiserId ? (
                            <Badge variant="secondary">Advertiser: {location.advertiserId}</Badge>
                          ) : (
                            <Badge variant="secondary">
                              Coords: {location.latitude?.toFixed(3)}, {location.longitude?.toFixed(3)}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className={`text-lg font-bold ${getRatingColor(location.rating.value)}`}>
                              {location.rating.value.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Rating</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {Math.round(location.daysToSell.value)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Days to Sell</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence of Sale */}
              {metricsData.vehicleMetrics.retail.confidenceOfSale && metricsData.vehicleMetrics.retail.confidenceOfSale.length > 0 && (
                <div className="space-y-4">
                  <h4 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Target className="w-5 h-5 text-green-600" />
                    Sale Confidence
                  </h4>
                  <div className="space-y-3">
                    {metricsData.vehicleMetrics.retail.confidenceOfSale.map((confidence, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {confidence.days} Days
                          </span>
                          <Badge className={`${getConfidenceColor(confidence.confidenceRating)} border`}>
                            {confidence.confidenceRating}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Section (Collapsible) */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {/* Target Days Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Target Days to Sell
                </h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Days in Stock (Optional)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={daysInStock}
                    onChange={(e) => setDaysInStock(parseInt(e.target.value) || 0)}
                    placeholder="Enter days in stock"
                    className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}
                  />
                </div>
                <div className="space-y-2">
                  {targetDays.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={item.days}
                        onChange={(e) => updateTargetDays(index, parseInt(e.target.value) || 30)}
                        placeholder="Enter target days"
                        className={`flex-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTargetDays(index)}
                        disabled={targetDays.length <= 1}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTargetDays}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Target Days
                  </Button>
                </div>
              </div>
            </div>

            {/* Advertiser IDs Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-blue-600" />
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Advertiser IDs
                </h4>
              </div>
              <div className="space-y-2">
                {advertiserIds.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={item.advertiserId}
                      onChange={(e) => updateAdvertiserId(index, e.target.value)}
                      placeholder="Enter advertiser ID"
                      className={`flex-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAdvertiserId(index)}
                      disabled={advertiserIds.length <= 1}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addAdvertiserId}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Advertiser ID
                </Button>
              </div>
            </div>

            {/* Location Coordinates Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Location Coordinates
                </h4>
              </div>
              <div className="space-y-2">
                {coordinates.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <Input
                      type="number"
                      step="0.000001"
                      min="-90"
                      max="90"
                      value={item.latitude}
                      onChange={(e) => updateCoordinates(index, 'latitude', e.target.value)}
                      placeholder="Latitude"
                      className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.000001"
                        min="-180"
                        max="180"
                        value={item.longitude}
                        onChange={(e) => updateCoordinates(index, 'longitude', e.target.value)}
                        placeholder="Longitude"
                        className={`flex-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCoordinates(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCoordinates}
                  className="text-green-600 hover:text-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
