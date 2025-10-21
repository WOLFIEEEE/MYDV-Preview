"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { PoundSterling, Factory, Car, Fuel, Settings, Zap, Calendar, Gauge, Clock, MapPin, Wrench, BarChart3, Edit3, Upload, X, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import EditInventoryForm from "./actions/EditInventoryForm";

interface OverviewTabProps {
  stockData: any;
  stockId?: string;
  onOpenDocuments?: () => void;
}

export default function OverviewTab({ stockData, stockId, onOpenDocuments }: OverviewTabProps) {
  const [inventoryDetails, setInventoryDetails] = useState<any>(null);
  const [fundSources, setFundSources] = useState<any[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { isDarkMode } = useTheme();

  const loadInventoryDetailsData = async () => {
    if (!stockData?.metadata?.stockId) return;

    try {
      const response = await fetch(`/api/stock-actions/inventory-details?stockId=${stockData.metadata.stockId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          setInventoryDetails({
            stockReference: data.stockReference || stockData?.metadata?.stockId || '',
            registration: data.registration || stockData?.vehicle?.registration || '',
            dateOfPurchase: data.dateOfPurchase ? new Date(data.dateOfPurchase).toISOString().split('T')[0] : '',
            costOfPurchase: data.costOfPurchase || '',
            purchaseFrom: data.purchaseFrom || '',
            fundingAmount: data.fundingAmount || '',
            fundingSourceId: data.fundingSourceId || '',
            businessAmount: data.businessAmount || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading inventory details data:', error);
    }
  };

  useEffect(() => {
    const loadFundSources = async () => {
      try {
        const response = await fetch('/api/fund-sources');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setFundSources(result.data.filter((source: any) => source.status === 'active'));
          }
        }
      } catch (error) {
        console.error('Error loading fund sources:', error);
      }
    };

    loadInventoryDetailsData();
    loadFundSources();
  }, [stockData?.metadata?.stockId]);

  const vehicle = stockData.vehicle || {};
  const media = stockData.media || {};
  const highlights = stockData.highlights || [];
  const adverts = stockData.adverts || {};

  const mainImage = media.images?.[0]?.href?.replace('{resize}', 'w800h600') || '/placeholder-car.png';

  // Unified pricing logic to match StockHeader and other components
  const extractPrice = (priceObj: any) => {
    if (typeof priceObj === 'number') return priceObj;
    if (priceObj && typeof priceObj === 'object' && priceObj.amountGBP) {
      return priceObj.amountGBP;
    }
    return null;
  };

  // Try multiple sources for pricing in order of preference
  const currentPrice = extractPrice(stockData.forecourtPrice) ||
    extractPrice(stockData.totalPrice) ||
    extractPrice(adverts.forecourtPrice) ||
    extractPrice(adverts.retailAdverts?.totalPrice) ||
    extractPrice(adverts.retailAdverts?.suppliedPrice);

  const priceIndicatorRating = adverts.retailAdverts?.priceIndicatorRating ||
    stockData.priceIndicatorRating ||
    'NOANALYSIS';

  // Debug pricing data sources (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [OverviewTab] Pricing Debug:', {
      stockId: stockData.stockId || stockData.metadata?.stockId,
      forecourtPrice: stockData.forecourtPrice,
      totalPrice: stockData.totalPrice,
      advertsForecourtPrice: adverts.forecourtPrice,
      retailTotalPrice: adverts.retailAdverts?.totalPrice,
      retailSuppliedPrice: adverts.retailAdverts?.suppliedPrice,
      finalCurrentPrice: currentPrice,
      priceIndicatorRating
    });
  }
  
  // Extract descriptions from retailAdverts - show both when available
  const getVehicleDescription = () => {
    const description1 = adverts.retailAdverts?.description;
    const description2 = adverts.retailAdverts?.description2;
    
    const descriptions = [];
    
    // Add both descriptions if they exist and are different
    if (description1 && description1.trim()) {
      descriptions.push(description1.trim());
    }
    
    if (description2 && description2.trim() && description2.trim() !== description1?.trim()) {
      descriptions.push(description2.trim());
    }
    
    // If we have actual descriptions, use them
    if (descriptions.length > 0) {
      return descriptions.join('\n\n'); // Separate multiple descriptions with double line break
    }
    
    return 'No description available for this vehicle.';
  };
  
  const vehicleDescription = getVehicleDescription();
  

  // Extract key highlights from the highlights array
  const keyHighlights = highlights.map((highlight: any) => ({
    name: highlight.name || highlight.title || 'Highlight',
    description: highlight.description || highlight.shortDescription || ''
  }));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat('en-GB').format(mileage) + ' miles';
  };

  const getPriceIndicatorColor = (rating: string) => {
    switch (rating?.toLowerCase()) {
      case 'great':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'noanalysis':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-white';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-white';
    }
  };

  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Container - Main Image & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Title Section with Edit Button */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-2">
              <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehicleTitle}
              </h1>
              {/* Edit Stock Button - Positioned at top right */}
              {stockId && (
                <Link href={`/mystock/edit/${stockId}`}>
                  <Button variant="outline" size="sm">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Stock
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {vehicle.registration && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                  }`}>
                  {vehicle.registration}
                </span>
              )}
              {vehicle.yearOfManufacture && (
                <span className="flex items-center text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {vehicle.yearOfManufacture}
                </span>
              )}
              {vehicle.odometerReadingMiles && (
                <span className="flex items-center text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  {formatMileage(vehicle.odometerReadingMiles)}
                </span>
              )}
              {currentPrice && (
                <span className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatPrice(currentPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Main Image */}
          <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-sm`}>
            <div className="aspect-video bg-gray-100 dark:bg-gray-800">
              <img
                src={mainImage}
                alt={vehicleTitle}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-car.png';
                }}
              />
            </div>
          </div>



          {/* Description */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Vehicle Description
            </h3>
            <div className={`leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              {vehicleDescription.split('\n\n').map((paragraph, index) => (
                <p key={index} className={index > 0 ? 'mt-4' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Key Highlights */}
          {keyHighlights.length > 0 && (
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                Key Highlights
                <span className={`ml-2 text-sm font-normal ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                  ({keyHighlights.length})
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {keyHighlights.map((highlight: any, index: number) => (
                  <div key={index} className={`flex items-start p-3 rounded-lg border transition-colors ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}>
                    <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-1 mr-3"></div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {highlight.name}
                      </span>
                      {highlight.description && (
                        <div className={`text-xs mt-1 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                          {highlight.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Container - Detailed Information */}
        <div className="space-y-6">

          {/* Price Analysis */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <PoundSterling className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
              Price Analysis
            </h3>
            {currentPrice && (
              <div className="mb-4">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {formatPrice(currentPrice)}
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-md text-sm ${getPriceIndicatorColor(priceIndicatorRating)}`}>
                  <PoundSterling className="h-4 w-4 mr-1" />
                  {priceIndicatorRating === 'NOANALYSIS' ? 'Not Analysed' : priceIndicatorRating}
                </div>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium">
                  {stockData.metadata?.lastUpdated
                    ? new Date(stockData.metadata.lastUpdated).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                    : 'Not Available'
                  }
                </span>
              </div>
              {currentPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Price Source</span>
                  <span className="font-medium text-xs">
                    {extractPrice(stockData.forecourtPrice) ? 'Forecourt Price' :
                      extractPrice(stockData.totalPrice) ? 'Total Price' :
                        extractPrice(adverts.forecourtPrice) ? 'Advert Forecourt' :
                          extractPrice(adverts.retailAdverts?.totalPrice) ? 'Retail Total' :
                            extractPrice(adverts.retailAdverts?.suppliedPrice) ? 'Supplied Price' :
                              'Unknown Source'}
                  </span>
                </div>
              )}
            </div>

            {/* Add Documents Button */}
            {onOpenDocuments && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={onOpenDocuments}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Documents
                </Button>
              </div>
            )}
          </div>

          {/* Purchase Information */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Purchase Information
              </h3>
              <div className="flex space-x-2">
                {inventoryDetails ? (
                  <>
                    <button
                      onClick={() => setEditDialogOpen(true)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                          ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                        }`}
                      title="Edit Purchase Info"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this purchase information?')) {
                          try {
                            const response = await fetch(`/api/stock-actions/inventory-details/${inventoryDetails.id}`, {
                              method: 'DELETE',
                            });

                            if (response.ok) {
                              const result = await response.json();
                              if (result.success) {
                                setInventoryDetails(null);
                                // You might want to show a success toast here
                              }
                            }
                          } catch (error) {
                            console.error('Error deleting purchase info:', error);
                          }
                        }
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                          ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                          : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      title="Delete Purchase Info"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAddDialogOpen(true)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                        : 'bg-green-50 hover:bg-green-100 text-green-600'
                      }`}
                    title="Add Purchase Info"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {inventoryDetails ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Purchase Date */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } text-center`}>
                  <div className="flex items-center justify-center mb-1">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } mb-1`}>
                    PURCHASE DATE
                  </div>
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                    {inventoryDetails.dateOfPurchase
                      ? new Date(inventoryDetails.dateOfPurchase).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                      : 'Not set'
                    }
                  </div>
                </div>

                {/* Purchase Cost */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  } text-center`}>
                  <div className="flex items-center justify-center mb-1">
                    <PoundSterling className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className={`text-xs uppercase tracking-wide font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } mb-1`}>
                    PURCHASE COST
                  </div>
                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                    £{inventoryDetails.costOfPurchase
                      ? parseFloat(inventoryDetails.costOfPurchase).toLocaleString('en-GB', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                      : '0.00'
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No purchase information available</p>
                <p className="text-xs mt-1">Add purchase details to track vehicle costs</p>
              </div>
            )}
          </div>

          {/* Complete Specifications */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Gauge className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
              Complete Specifications
            </h3>
            <div className="space-y-3 text-sm">
              {vehicle.derivative && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Variant</span>
                  <span className="font-medium">{vehicle.derivative}</span>
                </div>
              )}
              {vehicle.bodyType && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Body Type</span>
                  <span className="font-medium">{vehicle.bodyType}</span>
                </div>
              )}
              {vehicle.numberOfDoors && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Doors</span>
                  <span className="font-medium">{vehicle.numberOfDoors}</span>
                </div>
              )}
              {vehicle.numberOfSeats && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Seats</span>
                  <span className="font-medium">{vehicle.numberOfSeats}</span>
                </div>
              )}
              {vehicle.engineSize && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Engine Size</span>
                  <span className="font-medium">{vehicle.engineSize}L</span>
                </div>
              )}
              {vehicle.colour && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Colour</span>
                  <span className="font-medium">{vehicle.colour}</span>
                </div>
              )}
              {vehicle.previousOwners !== undefined && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Previous Owners</span>
                  <span className="font-medium">{vehicle.previousOwners}</span>
                </div>
              )}
              {vehicle.bodyType && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Body Type</span>
                  <span className="font-medium">{vehicle.bodyType}</span>
                </div>
              )}
              {vehicle.driveType && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Drive Type</span>
                  <span className="font-medium">{vehicle.driveType}</span>
                </div>
              )}
              {vehicle.emissionClass && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Emission Class</span>
                  <span className="font-medium">{vehicle.emissionClass}</span>
                </div>
              )}
              {vehicle.co2EmissionGPKM && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">CO2 Emissions</span>
                  <span className="font-medium">{vehicle.co2EmissionGPKM} g/km</span>
                </div>
              )}
              {vehicle.accelerationToSixtyMPH && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">0-60 mph</span>
                  <span className="font-medium">{vehicle.accelerationToSixtyMPH}s</span>
                </div>
              )}
              {vehicle.topSpeed && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Top Speed</span>
                  <span className="font-medium">{vehicle.topSpeed} mph</span>
                </div>
              )}
              {vehicle.insurance && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-white">Insurance Group</span>
                  <span className="font-medium">{vehicle.insurance}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stock Information */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Stock Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Stock ID:</span>
                <span className="font-medium">STK-{stockData.stockId?.slice(-8) || '12345678'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Date Added:</span>
                <span className="font-medium">{stockData.dateOnForecourt || 'Today'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Last Updated:</span>
                <span className="font-medium">{stockData.lastUpdated || 'Today'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-500">Days on Forecourt:</span>
                <span className="font-medium">15 days</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Enquiries:</span>
                <span className="font-medium">7 this month</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {editDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-emerald-50/95 via-teal-50/90 to-cyan-50/95 border border-teal-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-teal-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Edit Purchase Info
              </h2>
              <button
                onClick={() => {
                  setEditDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                    : 'hover:bg-teal-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <EditInventoryForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.metadata.registration }
                }}
                onSuccess={() => {
                  setEditDialogOpen(false);
                  loadInventoryDetailsData(); // Refresh the data
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${isDarkMode ? 'bg-slate-900/95 border border-slate-700/50' : 'bg-gradient-to-br from-green-50/95 via-emerald-50/90 to-teal-50/95 border border-green-200/50'
            } shadow-2xl backdrop-blur-sm`}>
            {/* Dialog Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700/50' : 'border-green-200/50'
              }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                Add Purchase Information - {stockData.registration}
              </h2>
              <button
                onClick={() => {
                  setAddDialogOpen(false);
                }}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                    : 'hover:bg-green-100/50 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-0">
              <EditInventoryForm
                stockData={{
                  metadata: { stockId: stockData.metadata.stockId },
                  vehicle: { registration: stockData.metadata.registration }
                }}
                onSuccess={() => {
                  setAddDialogOpen(false);
                  loadInventoryDetailsData();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}