"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useStockDetailQuery } from "@/hooks/useStockDataQuery";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import StockDetailLayout from "@/components/stock/StockDetailLayout";
import VehicleCheckAlert from "@/components/stock/VehicleCheckAlert";
import DocumentViewerModal from "@/components/stock/DocumentViewerModal";
import CompactQRCode from "@/components/shared/CompactQRCode";
import { 
  ArrowLeft, 
  Home, 
  Car,  
  ChevronRight, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LicensePlate from "@/components/ui/license-plate";
import Link from "next/link";

export default function StockDetailView() {
  const { isSignedIn, isLoaded, user } = useUser();
  const params = useParams();
  const router = useRouter();
  const stockId = params.stockId as string;
  const { isDarkMode } = useTheme();
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // Use React Query for caching stock detail data
  // RACE CONDITION FIX: Check user?.id to ensure Clerk is fully initialized
  const { 
    data: stockData, 
    loading, 
    error, 
    refetch,
  } = useStockDetailQuery(stockId, isLoaded && isSignedIn && !!user?.id);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button onClick={() => router.push('/mystock')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stock List
            </Button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-red-800">Error Loading Stock</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button onClick={() => router.push('/mystock')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stock List
            </Button>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-yellow-800">Stock Not Found</h2>
            <p className="text-yellow-600">The requested stock item could not be found.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Extract vehicle details for display
  const vehicle = stockData?.vehicle || {};
  const metadata = stockData?.metadata || {};
  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Details';
  const registration = vehicle.registration || vehicle.plate || 'N/A';
  const year = vehicle.yearOfManufacture || 'N/A';
  const mileage = vehicle.odometerReadingMiles ? `${vehicle.odometerReadingMiles.toLocaleString()} miles` : 'N/A';
  // Helper function to safely extract price
  const extractPrice = (priceObj: number | { amountGBP?: number } | null | undefined): number | null => {
    if (typeof priceObj === 'number') return priceObj;
    if (priceObj && typeof priceObj === 'object' && priceObj.amountGBP) {
      return priceObj.amountGBP;
    }
    return null;
  };
  
  // Use the same comprehensive pricing logic as OverviewTab and StockHeader
  const adverts = stockData?.adverts || {};
  const priceAmount = extractPrice(stockData?.forecourtPrice) || 
                     extractPrice(stockData?.totalPrice) ||
                     extractPrice(adverts?.forecourtPrice) || 
                     extractPrice(adverts?.retailAdverts?.totalPrice) ||
                     extractPrice(adverts?.retailAdverts?.suppliedPrice);
  
  const price = priceAmount ? `£${priceAmount.toLocaleString()}` : 'POA';
  
  // Price indicator rating using same logic as other components
  const priceIndicatorRating = adverts?.retailAdverts?.priceIndicatorRating || 
                              stockData?.priceIndicatorRating || 
                              'NOANALYSIS';
  
  // Helper function for price indicator colors (same as other components)
  const getPriceIndicatorColor = (rating: string) => {
    switch (rating?.toLowerCase()) {
      case 'great':
        return isDarkMode 
          ? 'bg-green-900/30 text-green-300 border border-green-700'
          : 'bg-green-50 text-green-700 border border-green-200';
      case 'good':
        return isDarkMode 
          ? 'bg-blue-900/30 text-blue-300 border border-blue-700'
          : 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'fair':
        return isDarkMode 
          ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700'
          : 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'high':
        return isDarkMode 
          ? 'bg-red-900/30 text-red-300 border border-red-700'
          : 'bg-red-50 text-red-700 border border-red-200';
      case 'noanalysis':
      default:
        return isDarkMode 
          ? 'bg-gray-900/30 text-gray-300 border border-gray-700'
          : 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };
  
  // Debug pricing data sources (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 DetailPage Pricing Debug:', {
      stockId: stockData?.stockId || stockData?.metadata?.stockId,
      forecourtPrice: stockData?.forecourtPrice,
      totalPrice: stockData?.totalPrice,
      advertsForecourtPrice: adverts?.forecourtPrice,
      retailTotalPrice: adverts?.retailAdverts?.totalPrice,
      retailSuppliedPrice: adverts?.retailAdverts?.suppliedPrice,
      finalPriceAmount: priceAmount,
      displayPrice: price,
      priceIndicatorRating
    });
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      {/* Enhanced Page Header with Breadcrumbs and Actions */}
      <div className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="pt-24 pb-6">
            <nav className="flex items-center space-x-2 text-sm">
              <Link 
                href="/" 
                className={`flex items-center hover:text-blue-600 transition-colors ${
                  isDarkMode ? 'text-white hover:text-blue-400' : 'text-gray-500'
                }`}
              >
                <Home className="h-4 w-4 mr-1" />
                Home
              </Link>
              <ChevronRight className={`h-4 w-4 ${isDarkMode ? 'text-white' : 'text-gray-400'}`} />
              <Link 
                href="/mystock" 
                className={`flex items-center hover:text-blue-600 transition-colors ${
                  isDarkMode ? 'text-white hover:text-blue-400' : 'text-gray-500'
                }`}
              >
                <Car className="h-4 w-4 mr-1" />
                My Stock
              </Link>

            </nav>
          </div>

          {/* Page Header */}
          <div className="pb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Vehicle Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <Button 
                    onClick={() => router.push('/mystock')} 
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  {registration !== 'N/A' && (
                    <LicensePlate 
                      registration={registration} 
                      size="md" 
                    />
                  )}
                  
                  {/* FORECOURT Status */}
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    metadata.lifecycleState?.toLowerCase() === 'forecourt'
                      ? isDarkMode 
                        ? 'bg-green-900/30 text-green-300 border border-green-700'
                        : 'bg-green-50 text-green-700 border border-green-200'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 border border-gray-600'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                  }`}>
                    {(metadata.lifecycleState || 'Unknown Status').toUpperCase()}
                  </div>

                  {/* Price Indicator */}
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriceIndicatorColor(priceIndicatorRating)}`}>
                    Price: {priceIndicatorRating === 'NOANALYSIS' ? 'Not analysed' : priceIndicatorRating}
                  </div>

                  {/* Vehicle Check Alert - Inline */}
                  <VehicleCheckAlert stockData={stockData} isInline={true} />
                </div>

              </div>

              {/* Right Side - QR Code */}
              <div className="flex-shrink-0">
                <CompactQRCode
                  stockId={stockId}
                  registration={registration}
                  vehicleTitle={vehicleTitle}
                  className="w-56"
                />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content with Enhanced Layout - Full Width */}
      <div className="w-full">
        <StockDetailLayout 
          stockData={stockData} 
          stockId={stockId}
          onOpenDocuments={() => setShowDocumentModal(true)}
          registration={registration}
          vehicleTitle={vehicleTitle}
        />
      </div>
      
      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        stockId={stockId}
        registration={registration}
        vehicleTitle={vehicleTitle}
      />

      
      <Footer />
    </div>
  );
}