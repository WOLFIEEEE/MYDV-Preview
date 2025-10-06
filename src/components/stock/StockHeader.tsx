"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { 
  FileText, 
  Info, 
  XCircle, 
  ExternalLink, 
  PoundSterling,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import VehicleCheckAlert from "./VehicleCheckAlert";

interface StockHeaderProps {
  stockData: any;
}

export default function StockHeader({ stockData }: StockHeaderProps) {
  const { isDarkMode } = useTheme();
  
  const vehicle = stockData.vehicle || {};
  const metadata = stockData.metadata || {};
  
  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Details';
  const registration = vehicle.registration || vehicle.plate || 'N/A';
  const lifecycleState = metadata.lifecycleState || 'UNKNOWN';
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'forecourt':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'sold':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'workshop':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-white';
    }
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

  // Use the same comprehensive pricing logic as OverviewTab
  const adverts = stockData.adverts || {};
  
  const priceIndicatorRating = adverts.retailAdverts?.priceIndicatorRating || 
                              stockData.priceIndicatorRating || 
                              'NOANALYSIS';

  // Try multiple sources for pricing in order of preference (same as OverviewTab)
  const forecourtPrice = stockData.forecourtPrice || 
                        stockData.totalPrice ||
                        adverts.forecourtPrice || 
                        adverts.retailAdverts?.totalPrice ||
                        adverts.retailAdverts?.suppliedPrice;
  
  const suppliedPrice = stockData.suppliedPrice;
  
  // Helper function to safely extract amount from price objects
  const extractPrice = (priceObj: any) => {
    if (typeof priceObj === 'number') return priceObj;
    if (priceObj && typeof priceObj === 'object' && priceObj.amountGBP) {
      return priceObj.amountGBP;
    }
    return null;
  };
  
  const forecourtAmount = extractPrice(forecourtPrice);
  const suppliedAmount = extractPrice(suppliedPrice);
  
  // Debug pricing data sources (only in development) - same format as OverviewTab
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [StockHeader] Pricing Debug:', {
      stockId: stockData.stockId || stockData.metadata?.stockId,
      forecourtPrice: stockData.forecourtPrice,
      totalPrice: stockData.totalPrice,
      advertsForecourtPrice: adverts.forecourtPrice,
      retailTotalPrice: adverts.retailAdverts?.totalPrice,
      retailSuppliedPrice: adverts.retailAdverts?.suppliedPrice,
      finalForecourtAmount: forecourtAmount,
      extractedSuppliedAmount: suppliedAmount,
      priceIndicatorRating,
      priceSource: extractPrice(stockData.forecourtPrice) ? 'Top-level Forecourt' :
                   extractPrice(stockData.totalPrice) ? 'Top-level Total' :
                   extractPrice(adverts.forecourtPrice) ? 'Adverts Forecourt' :
                   extractPrice(adverts.retailAdverts?.totalPrice) ? 'Retail Total' :
                   extractPrice(adverts.retailAdverts?.suppliedPrice) ? 'Supplied Price' :
                   'No Price Found'
    });
  }

  return (
    <div className={`relative overflow-hidden ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800"></div>
      </div>
      
      <div className="relative p-6">
        {/* Simplified Essential Info Only */}
        <div className="flex justify-between items-center">
          {/* Essential Status Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lifecycleState)}`}>
              <Info className="h-4 w-4 mr-2" />
              {lifecycleState.toUpperCase()}
            </div>

            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriceIndicatorColor(priceIndicatorRating)}`}>
              <PoundSterling className="h-4 w-4 mr-2" />
              Price: {priceIndicatorRating === 'NOANALYSIS' ? 'Not analysed' : priceIndicatorRating}
            </div>
          </div>

          {/* Quick Pricing Info */}
          {forecourtAmount && (
            <div className={`text-right ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>Forecourt Price</div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                £{forecourtAmount.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Vehicle Check Status Alert */}
        <VehicleCheckAlert stockData={stockData} />
      </div>
    </div>
  );
}