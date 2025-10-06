"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  MapPin, 
  Car,
  PoundSterling,
  Gauge,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Target,
  ExternalLink
} from "lucide-react";
import { VehicleInfo } from "@/types/retail-check";

interface Competitor {
  id: string;
  make: string;
  model: string;
  derivative?: string;
  year: number;
  registration?: string;
  mileage: number;
  price: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  dealer_name?: string;
  dealer?: string;
  location?: {
    town?: string;
    address?: string;
  } | string;
  days_listed?: number;
  distance?: number;
  price_indicator?: string;
  retail_valuation?: number;
}

interface CompetitionData {
  totalCompetitors: number;
  averagePrice: number;
  priceRange: { min: number; max: number };
  marketPosition: number;
  competitors: Competitor[];
}

interface CompetitionTableProps {
  competitionData: CompetitionData;
  vehicleInfo?: VehicleInfo;
  isDarkMode: boolean;
}

export default function CompetitionTable({ competitionData, vehicleInfo, isDarkMode }: CompetitionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'price' | 'mileage' | 'year' | 'distance'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [maxDistance, setMaxDistance] = useState(50);

  // Debug logging
  console.log('🔍 CompetitionTable received data:', {
    totalCompetitors: competitionData.totalCompetitors,
    competitorsCount: competitionData.competitors?.length || 0,
    competitors: competitionData.competitors?.slice(0, 2), // Log first 2 for debugging
    vehicleInfo: vehicleInfo
  });

  if (!competitionData?.competitors || competitionData.competitors.length === 0) {
    return (
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">No competition data available</p>
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

  const formatMileage = (mileage: number) => {
    return mileage.toLocaleString() + ' miles';
  };

  // Filter and sort competitors
  const filteredCompetitors = competitionData.competitors
    .filter(competitor => {
      const matchesSearch = !searchTerm || 
        competitor.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        competitor.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (competitor.dealer_name || competitor.dealer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof competitor.location === 'object' ? competitor.location?.town || '' : competitor.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const withinDistance = !competitor.distance || competitor.distance <= maxDistance;
      
      return matchesSearch && withinDistance;
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
    });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getPriceComparison = (competitor: Competitor) => {
    // Use the price indicator from AutoTrader API if available
    if (competitor.price_indicator) {
      const indicator = competitor.price_indicator.toUpperCase();
      switch (indicator) {
        case 'LOW':
          return {
            label: 'LOW',
            textColor: 'text-green-800',
            bgColor: 'bg-green-200'
          };
        case 'GREAT':
          return {
            label: 'GREAT',
            textColor: 'text-green-800',
            bgColor: 'bg-green-200'
          };
        case 'GOOD':
          return {
            label: 'GOOD',
            textColor: 'text-blue-800',
            bgColor: 'bg-blue-200'
          };
        case 'FAIR':
          return {
            label: 'FAIR',
            textColor: 'text-yellow-800',
            bgColor: 'bg-yellow-200'
          };
        case 'HIGH':
          return {
            label: 'HIGH',
            textColor: 'text-red-800',
            bgColor: 'bg-red-200'
          };
        default:
          return {
            label: indicator,
            textColor: 'text-gray-800',
            bgColor: 'bg-gray-200'
          };
      }
    }
    
    // Fallback to average price comparison if no API indicator
    const avgPrice = competitionData.averagePrice;
    const difference = ((competitor.price - avgPrice) / avgPrice) * 100;
    
    if (difference <= -15) {
      return {
        label: 'LOW',
        textColor: 'text-green-800',
        bgColor: 'bg-green-200'
      };
    } else if (difference <= -5) {
      return {
        label: 'GOOD',
        textColor: 'text-blue-800',
        bgColor: 'bg-blue-200'
      };
    } else if (difference <= 5) {
      return {
        label: 'FAIR',
        textColor: 'text-yellow-800',
        bgColor: 'bg-yellow-200'
      };
    } else {
      return {
        label: 'HIGH',
        textColor: 'text-red-800',
        bgColor: 'bg-red-200'
      };
    }
  };

  const calculatePricePosition = (competitor: Competitor) => {
    // Calculate percentage based on retail valuation if available
    if (competitor.retail_valuation && competitor.retail_valuation > 0) {
      const percentage = Math.round((competitor.price / competitor.retail_valuation) * 100);
      return percentage;
    }
    
    // Fallback to position-based calculation
    const sortedPrices = competitionData.competitors
      .map(c => c.price)
      .sort((a, b) => a - b);
    
    const position = sortedPrices.findIndex(p => p >= competitor.price);
    const percentage = position === -1 ? 100 : Math.round((position / sortedPrices.length) * 100);
    return percentage;
  };

  const getUserVehicleRank = () => {
    // This would be calculated based on user's vehicle price vs competitors
    // For now, return a placeholder
    return Math.floor(competitionData.competitors.length / 2) + 1;
  };

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                Total Competitors
              </span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {competitionData.totalCompetitors}
            </p>
          </CardContent>
        </Card>

        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                Average Price
              </span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(competitionData.averagePrice)}
            </p>
          </CardContent>
        </Card>

        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PoundSterling className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                Price Range
              </span>
            </div>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {competitionData.priceRange ? 
                `${formatCurrency(competitionData.priceRange.min)} - ${formatCurrency(competitionData.priceRange.max)}` :
                'No price data available'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Competition Table */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Users className="w-5 h-5" />
              Competition Analysis
              <Badge variant="outline">
                {filteredCompetitors.length} of {competitionData.competitors.length}
              </Badge>
            </CardTitle>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by make, model, dealer, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                Max Distance:
              </span>
              <Input
                type="number"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value) || 50)}
                className={`w-20 ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                min="1"
                max="200"
              />
              <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                miles
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Image
                  </th>
                  <th className={`text-left p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Rank
                  </th>
                  <th className={`text-left p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Description
                  </th>
                  <th className={`text-left p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Year/Plate
                  </th>
                  <th 
                    className={`text-left p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                    onClick={() => handleSort('mileage')}
                  >
                    <div className="flex items-center gap-1">
                      Mileage
                      {getSortIcon('mileage')}
                    </div>
                  </th>
                  <th 
                    className={`text-left p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-1">
                      Price
                      {getSortIcon('price')}
                    </div>
                  </th>
                  <th className={`text-left p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Price Indicator
                  </th>
                  <th className={`text-left p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    % Position
                  </th>
                  <th className={`text-left p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Days in Stock
                  </th>
                  <th className={`text-left p-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Seller
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitors.map((competitor, index) => {
                  const priceComparison = getPriceComparison(competitor);
                  const pricePosition = calculatePricePosition(competitor);
                  
                  return (
                    <tr 
                      key={competitor.id} 
                      className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}
                    >
                      {/* Image */}
                      <td className="p-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <Car className="w-6 h-6 text-gray-500" />
                        </div>
                      </td>
                      
                      {/* Rank */}
                      <td className="p-3">
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {index + 1}
                        </span>
                      </td>
                      
                      {/* Description */}
                      <td className="p-3">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {competitor.make} {competitor.model}
                          </p>
                          {competitor.derivative && (
                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                              {competitor.derivative}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      {/* Year/Plate */}
                      <td className="p-3">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {competitor.year}
                          </p>
                          {competitor.registration && (
                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                              {competitor.registration}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      {/* Mileage */}
                      <td className="p-3">
                        <span className={isDarkMode ? 'text-white' : 'text-gray-700'}>
                          {formatMileage(competitor.mileage)}
                        </span>
                      </td>
                      
                      {/* Price */}
                      <td className="p-3">
                        <p className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatCurrency(competitor.price)}
                        </p>
                      </td>
                      
                      {/* Price Indicator */}
                      <td className="p-3">
                        <Badge 
                          className={`${priceComparison.bgColor} ${priceComparison.textColor} border-0 font-semibold`}
                        >
                          {priceComparison.label}
                        </Badge>
                      </td>
                      
                      {/* Price Position % */}
                      <td className="p-3">
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {pricePosition}%
                        </span>
                      </td>
                      
                      {/* Days in Stock */}
                      <td className="p-3">
                        <span className={isDarkMode ? 'text-white' : 'text-gray-700'}>
                          {competitor.days_listed || '-'}
                        </span>
                      </td>
                      
                      {/* Seller */}
                      <td className="p-3">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {competitor.dealer_name || competitor.dealer || 'Unknown Dealer'}
                          </p>
                          {(typeof competitor.location === 'object' ? competitor.location?.town : competitor.location) && (
                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                              {typeof competitor.location === 'object' ? competitor.location.town : competitor.location}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {/* User's Vehicle Row */}
                {vehicleInfo && (
                  <tr className={`border-b-2 ${isDarkMode ? 'border-blue-600 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}`}>
                    {/* Image */}
                    <td className="p-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-700' : 'bg-blue-100'}`}>
                        <Car className="w-6 h-6 text-blue-500" />
                      </div>
                    </td>
                    
                    {/* Rank */}
                    <td className="p-3">
                      <span className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        Your Vehicle (#{getUserVehicleRank()})
                      </span>
                    </td>
                    
                    {/* Description */}
                    <td className="p-3">
                      <div>
                        <p className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          {vehicleInfo.make} {vehicleInfo.model}
                        </p>
                        {vehicleInfo.derivative && (
                          <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {vehicleInfo.derivative}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    {/* Year/Plate */}
                    <td className="p-3">
                      <div>
                        <p className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          {vehicleInfo.year}
                        </p>
                        {vehicleInfo.registration && vehicleInfo.registration !== 'N/A' && (
                          <p className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {vehicleInfo.registration}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    {/* Mileage */}
                    <td className="p-3">
                      <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        {formatMileage(vehicleInfo.mileage)}
                      </span>
                    </td>
                    
                    {/* Price - This would come from user input or valuation */}
                    <td className="p-3">
                      <p className={`font-bold text-lg ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        {/* This should be the user's asking price - placeholder for now */}
                        £--,---
                      </p>
                    </td>
                    
                    {/* Price Indicator */}
                    <td className="p-3">
                      <Badge className="bg-green-500 text-white border-0 font-semibold">
                        GOOD
                      </Badge>
                    </td>
                    
                    {/* Price Position % */}
                    <td className="p-3">
                      <span className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        100.0%
                      </span>
                    </td>
                    
                    {/* Days in Stock */}
                    <td className="p-3">
                      <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        -
                      </span>
                    </td>
                    
                    {/* Seller */}
                    <td className="p-3">
                      <p className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        You
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {filteredCompetitors.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  No competitors found matching your criteria
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Market Insights */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
        <CardHeader className="pb-4">
          <CardTitle className={`flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
              <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Price Distribution */}
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                  <PoundSterling className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Price Distribution
                </h4>
              </div>
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Lowest Price
                    </span>
                    <span className={`font-bold text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {competitionData.priceRange ? formatCurrency(competitionData.priceRange.min) : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Average Price
                    </span>
                    <span className={`font-bold text-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {formatCurrency(competitionData.averagePrice)}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Highest Price
                    </span>
                    <span className={`font-bold text-lg ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {competitionData.priceRange ? formatCurrency(competitionData.priceRange.max) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Competitive Positioning */}
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                  <Target className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Competitive Positioning
                </h4>
              </div>
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-green-400' : 'bg-green-500'}`}></div>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        Below Average
                      </span>
                    </div>
                    <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {filteredCompetitors.filter(c => c.price < competitionData.averagePrice).length} competitors
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-red-400' : 'bg-red-500'}`}></div>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        Above Average
                      </span>
                    </div>
                    <span className={`font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {filteredCompetitors.filter(c => c.price > competitionData.averagePrice).length} competitors
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
