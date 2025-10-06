"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BarChart3
} from "lucide-react";
import { VehicleInfo } from "@/types/retail-check";

// Types
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

interface VehicleFeature {
  name: string;
}

interface EnhancedMetricsData {
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

interface EnhancedVehicleMetricsProps {
  vehicleInfo: VehicleInfo;
  isDarkMode: boolean;
  onMetricsUpdate?: (metrics: EnhancedMetricsData) => void;
}

export default function EnhancedVehicleMetrics({ vehicleInfo, isDarkMode, onMetricsUpdate }: EnhancedVehicleMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    basic: false,
    confidence: false,
    advertiser: false,
    coordinates: false,
    priceAdjusted: false,
    fullAnalysis: false
  });
  const [enhancedData, setEnhancedData] = useState<EnhancedMetricsData | null>(null);
  
  // Form state with test data pre-populated
  const [targetDays, setTargetDays] = useState<TargetDays[]>([{ days: 30 }, { days: 60 }, { days: 90 }]);
  const [advertiserIds, setAdvertiserIds] = useState<LocationByAdvertiser[]>([
    { advertiserId: '10028737' },
    { advertiserId: '10031798' }
  ]);
  const [coordinates, setCoordinates] = useState<LocationByCoordinates[]>([
    { latitude: '53.257999', longitude: '-3.442000' }
  ]);
  const [features, setFeatures] = useState<VehicleFeature[]>([]);
  const [askingPrice, setAskingPrice] = useState<number>(0);
  const [daysInStock, setDaysInStock] = useState<number>(0);

  // Helper function to manage loading states
  const setLoadingState = (type: keyof typeof loadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [type]: isLoading }));
  };

  // Check if any analysis is loading
  const isAnyLoading = Object.values(loadingStates).some(loading => loading);

  // Add/Remove functions
  const addTargetDays = () => {
    setTargetDays([...targetDays, { days: 30 }]);
  };

  const removeTargetDays = (index: number) => {
    if (targetDays.length > 1) {
      setTargetDays(targetDays.filter((_, i) => i !== index));
    }
  };

  const addAdvertiserId = () => {
    setAdvertiserIds([...advertiserIds, { advertiserId: '' }]);
  };

  const removeAdvertiserId = (index: number) => {
    if (advertiserIds.length > 1) {
      setAdvertiserIds(advertiserIds.filter((_, i) => i !== index));
    }
  };

  const addCoordinates = () => {
    setCoordinates([...coordinates, { latitude: '', longitude: '' }]);
  };

  const removeCoordinates = (index: number) => {
    if (coordinates.length > 1) {
      setCoordinates(coordinates.filter((_, i) => i !== index));
    }
  };

  // Update functions
  const updateTargetDays = (index: number, days: number) => {
    const updated = [...targetDays];
    updated[index].days = days;
    setTargetDays(updated);
  };

  const updateAdvertiserId = (index: number, advertiserId: string) => {
    const updated = [...advertiserIds];
    updated[index].advertiserId = advertiserId;
    setAdvertiserIds(updated);
  };

  const updateCoordinates = (index: number, field: 'latitude' | 'longitude', value: string) => {
    const updated = [...coordinates];
    updated[index][field] = value;
    setCoordinates(updated);
  };

  // Analysis functions
  const runBasicAnalysis = async () => {
    setLoadingState('basic', true);
    try {
      const response = await fetch('/api/retail-check/enhanced-vehicle-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: {
            derivativeId: vehicleInfo.derivativeId,
            firstRegistrationDate: vehicleInfo.firstRegistrationDate || '2020-01-01',
            odometerReadingMiles: vehicleInfo.mileage || 0
          },
          analysisType: 'basic'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnhancedData(data.data);
          onMetricsUpdate?.(data.data);
        }
      }
    } catch (error) {
      console.error('Basic analysis failed:', error);
    } finally {
      setLoadingState('basic', false);
    }
  };

  const runLocationAnalysis = async (type: 'advertiser' | 'coordinates') => {
    const loadingType = type === 'advertiser' ? 'advertiser' : 'coordinates';
    setLoadingState(loadingType, true);
    try {
      const locations = type === 'advertiser' 
        ? advertiserIds.filter(item => item.advertiserId.trim())
        : coordinates.filter(item => item.latitude.trim() && item.longitude.trim());

      if (locations.length === 0) {
        alert(`Please add at least one ${type === 'advertiser' ? 'advertiser ID' : 'coordinate pair'}`);
        setLoadingState(loadingType, false);
        return;
      }

      const response = await fetch('/api/retail-check/enhanced-vehicle-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: {
            derivativeId: vehicleInfo.derivativeId,
            firstRegistrationDate: vehicleInfo.firstRegistrationDate || '2020-01-01',
            odometerReadingMiles: vehicleInfo.mileage || 0
          },
          locations,
          analysisType: 'location'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnhancedData(data.data);
          onMetricsUpdate?.(data.data);
        }
      }
    } catch (error) {
      console.error('Location analysis failed:', error);
    } finally {
      setLoadingState(loadingType, false);
    }
  };

  const runConfidenceAnalysis = async () => {
    setLoadingState('confidence', true);
    try {
      const validTargetDays = targetDays.filter(item => item.days > 0);
      
      if (validTargetDays.length === 0) {
        alert('Please add at least one target day');
        setLoadingState('confidence', false);
        return;
      }

      const response = await fetch('/api/retail-check/enhanced-vehicle-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: {
            derivativeId: vehicleInfo.derivativeId,
            firstRegistrationDate: vehicleInfo.firstRegistrationDate || '2020-01-01',
            odometerReadingMiles: vehicleInfo.mileage || 0
          },
          saleTarget: {
            daysInStock: daysInStock || 0,
            targetDaysToSell: validTargetDays
          },
          analysisType: 'confidence'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnhancedData(data.data);
          onMetricsUpdate?.(data.data);
        }
      }
    } catch (error) {
      console.error('Confidence analysis failed:', error);
    } finally {
      setLoadingState('confidence', false);
    }
  };

  const runPriceAdjustedAnalysis = async () => {
    setLoadingState('priceAdjusted', true);
    try {
      const payload: any = {
        vehicle: {
          derivativeId: vehicleInfo.derivativeId,
          firstRegistrationDate: vehicleInfo.firstRegistrationDate || '2020-01-01',
          odometerReadingMiles: vehicleInfo.mileage || 0
        },
        analysisType: 'price-adjusted'
      };

      if (features.length > 0) {
        payload.features = features;
      }

      if (askingPrice > 0) {
        payload.adverts = {
          retailAdverts: {
            price: {
              amountGBP: askingPrice
            }
          }
        };
      }

      const response = await fetch('/api/retail-check/enhanced-vehicle-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnhancedData(data.data);
          onMetricsUpdate?.(data.data);
        }
      }
    } catch (error) {
      console.error('Price adjusted analysis failed:', error);
    } finally {
      setLoadingState('priceAdjusted', false);
    }
  };

  const runFullAnalysis = async () => {
    setLoadingState('fullAnalysis', true);
    try {
      // Collect all valid inputs
      const validTargetDays = targetDays.filter(item => item.days > 0);
      const validAdvertiserIds = advertiserIds.filter(item => item.advertiserId.trim());
      const validCoordinates = coordinates.filter(item => item.latitude.trim() && item.longitude.trim());
      const allLocations = [...validAdvertiserIds, ...validCoordinates];

      const payload: any = {
        vehicle: {
          derivativeId: vehicleInfo.derivativeId,
          firstRegistrationDate: vehicleInfo.firstRegistrationDate || '2020-01-01',
          odometerReadingMiles: vehicleInfo.mileage || 0
        },
        analysisType: 'location' // Use location analysis as it supports the most comprehensive data
      };

      // Add locations if available
      if (allLocations.length > 0) {
        payload.locations = allLocations;
      }

      // Add sale target if available
      if (validTargetDays.length > 0) {
        payload.saleTarget = {
          daysInStock: daysInStock || 0,
          targetDaysToSell: validTargetDays
        };
      }

      // Add features if available
      if (features.length > 0) {
        payload.features = features;
      }

      // Add pricing if available
      if (askingPrice > 0) {
        payload.adverts = {
          retailAdverts: {
            price: {
              amountGBP: askingPrice
            }
          }
        };
      }

      console.log('🔄 Running full analysis with payload:', payload);

      const response = await fetch('/api/retail-check/enhanced-vehicle-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnhancedData(data.data);
          onMetricsUpdate?.(data.data);
        } else {
          console.error('Full analysis failed:', data.error);
          alert('Full analysis failed: ' + (data.error?.message || 'Unknown error'));
        }
      } else {
        const errorData = await response.json();
        console.error('Full analysis API error:', errorData);
        alert('Full analysis failed: ' + (errorData.error?.message || 'API error'));
      }
    } catch (error) {
      console.error('Full analysis failed:', error);
      alert('Full analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoadingState('fullAnalysis', false);
    }
  };

  const getConfidenceColor = (rating: string) => {
    switch (rating) {
      case 'HIGH': return 'bg-green-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-orange-500 text-white';
      case 'MISSED': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Enhanced Vehicle Metrics
              </CardTitle>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} mt-1`}>
                Get detailed vehicle metrics with multiple targets and locations
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Full Analysis Button */}
          <div className="flex justify-center pb-4 border-b border-gray-200 dark:border-gray-700">
            <Button
              onClick={runFullAnalysis}
              disabled={isAnyLoading}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg font-semibold shadow-lg"
            >
              <Star className="w-5 h-5 mr-2" />
              {loadingStates.fullAnalysis ? 'Running Full Analysis...' : 'Run Full Analysis'}
            </Button>
          </div>

          {/* Basic Analysis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Basic Vehicle Metrics
              </h4>
              <Button
                onClick={runBasicAnalysis}
                disabled={isAnyLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {loadingStates.basic ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
          </div>

          {/* Target Days to Sell */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Target Days to Sell
              </h4>
            </div>
            
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Days in Stock (Optional)
                  </label>
                  <input
                    type="number"
                    value={daysInStock}
                    onChange={(e) => setDaysInStock(parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter days in stock"
                    min="0"
                  />
                </div>
              </div>
              
              {targetDays.map((target, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="number"
                    value={target.days}
                    onChange={(e) => updateTargetDays(index, parseInt(e.target.value) || 0)}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter target days"
                    min="1"
                    max="365"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeTargetDays(index)}
                    disabled={targetDays.length === 1}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTargetDays}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Target Days
                </Button>
                <Button
                  onClick={runConfidenceAnalysis}
                  disabled={isAnyLoading}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {loadingStates.confidence ? 'Analyzing...' : 'Run Confidence Analysis'}
                </Button>
              </div>
            </div>
          </div>

          {/* Advertiser IDs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IdCard className="w-5 h-5 text-blue-600" />
              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Advertiser IDs
              </h4>
            </div>
            
            <div className="space-y-2">
              {advertiserIds.map((advertiser, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={advertiser.advertiserId}
                    onChange={(e) => updateAdvertiserId(index, e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter advertiser ID"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeAdvertiserId(index)}
                    disabled={advertiserIds.length === 1}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addAdvertiserId}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Advertiser ID
                </Button>
                <Button
                  onClick={() => runLocationAnalysis('advertiser')}
                  disabled={isAnyLoading}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <IdCard className="w-4 h-4 mr-2" />
                  {loadingStates.advertiser ? 'Analyzing...' : 'Run Advertiser Analysis'}
                </Button>
              </div>
            </div>
          </div>

          {/* Location Coordinates */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Location Coordinates
              </h4>
            </div>
            
            <div className="space-y-2">
              {coordinates.map((coord, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="number"
                    value={coord.latitude}
                    onChange={(e) => updateCoordinates(index, 'latitude', e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Latitude"
                    min="-90"
                    max="90"
                  />
                  <input
                    type="number"
                    value={coord.longitude}
                    onChange={(e) => updateCoordinates(index, 'longitude', e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Longitude"
                    min="-180"
                    max="180"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCoordinates(index)}
                    disabled={coordinates.length === 1}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCoordinates}
                  className="text-green-600 hover:text-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
                <Button
                  onClick={() => runLocationAnalysis('coordinates')}
                  disabled={isAnyLoading}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {loadingStates.coordinates ? 'Analyzing...' : 'Run Location Analysis'}
                </Button>
              </div>
            </div>
          </div>

          {/* Price Adjusted Analysis */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Price Adjusted Analysis
              </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Asking Price (Optional)
                </label>
                <input
                  type="number"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter asking price"
                  min="0"
                />
              </div>
            </div>
            
            <Button
              onClick={runPriceAdjustedAnalysis}
              disabled={isAnyLoading}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {loadingStates.priceAdjusted ? 'Analyzing...' : 'Run Price Analysis'}
            </Button>
          </div>

          {/* Results Display */}
          {enhancedData && (
            <div className="space-y-6 pt-6 border-t-2 border-purple-200 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg shadow-lg">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <h4 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Comprehensive Analysis Results
                </h4>
              </div>
              
              {/* Basic Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Rating
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {enhancedData.vehicleMetrics?.retail?.rating?.value?.toFixed(1) || 'N/A'}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Days to Sell
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {enhancedData.vehicleMetrics?.retail?.daysToSell?.value ? Math.round(enhancedData.vehicleMetrics.retail.daysToSell.value) : 'N/A'}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Supply
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {enhancedData.vehicleMetrics?.retail?.supply?.value || 'N/A'}
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Demand
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {enhancedData.vehicleMetrics?.retail?.demand?.value || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Location-specific Results */}
              {enhancedData.vehicleMetrics?.retail?.locations && (
                <div className="space-y-2">
                  <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Location-Specific Metrics
                  </h5>
                  <div className="space-y-2">
                    {enhancedData.vehicleMetrics.retail.locations.map((location, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            {location.advertiserId && (
                              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                                Advertiser: {location.advertiserId}
                              </span>
                            )}
                            {location.latitude && location.longitude && (
                              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                                Location: {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {location.rating?.value?.toFixed(1) || 'N/A'}
                              </p>
                              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                                Rating
                              </p>
                            </div>
                            <div className="text-center">
                              <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {location.daysToSell?.value ? Math.round(location.daysToSell.value) : 'N/A'}
                              </p>
                              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                                Days
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence of Sale Results */}
              {enhancedData.vehicleMetrics?.retail?.confidenceOfSale && (
                <div className="space-y-2">
                  <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Confidence of Sale
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {enhancedData.vehicleMetrics.retail.confidenceOfSale.map((confidence, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                            {confidence.days} days
                          </span>
                          <Badge className={getConfidenceColor(confidence.confidenceRating)}>
                            {confidence.confidenceRating}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
