"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw, Search as SearchIcon, Car, Database, Filter, Sparkles, FileText } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";

// Import our new components
import SearchForm from "@/components/vehicle-finder/SearchForm";
import TaxonomyWizard, { TaxonomySearchParams } from "@/components/vehicle-finder/TaxonomyWizard";
import VehicleDetails from "@/components/vehicle-finder/VehicleDetails";
import VehicleCheck from "@/components/vehicle-finder/VehicleCheck";
import VehicleFeatures from "@/components/vehicle-finder/VehicleFeatures";
import VehicleValuation from "@/components/vehicle-finder/VehicleValuation";
import AdvertiserData from "@/components/vehicle-finder/AdvertiserData";
import AdvertData from "@/components/vehicle-finder/AdvertData";
import ImageUpload from "@/components/vehicle-finder/ImageUpload";
import EnhancedAddToStockButton from "@/components/vehicle-finder/EnhancedAddToStockButton";
import InvoiceTypeDialog from "@/components/vehicle-finder/InvoiceTypeDialog";

interface VehicleInfo {
  registration: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
  engineSize: string;
  color: string;
  mileage: string;
  co2Emissions: string;
  taxBand: string;
  dateOfFirstRegistration: string;
  // Enhanced fields from API
  derivative?: string;
  derivativeId?: string;
  vehicleType?: string;
  bodyType?: string;
  transmissionType?: string;
  doors?: number;
  seats?: number;
  enginePowerBHP?: number;
  topSpeedMPH?: number;
  zeroToSixtyMPHSeconds?: number;
  fuelEconomyCombinedMPG?: number;
  insuranceGroup?: string;
  owners?: number;
  vin?: string;
  emissionClass?: string;
  engineNumber?: string;
  // Additional fields for VehicleDetails component
  ownershipCondition?: string;
  engineCapacityCC?: number;
  startStop?: boolean;
  gears?: number;
  drivetrain?: string;
  cylinders?: number;
  driveType?: string;
  features?: Array<{
    name: string;
    genericName?: string;
    type: 'Standard' | 'Optional';
    category: string;
    basicPrice: number;
    vatPrice: number;
    factoryCodes?: string[];
    rarityRating?: number | null;
    valueRating?: number | null;
  }>;
  // Valuation data from AutoTrader API
  valuations?: {
    retail?: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
    };
    partExchange?: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
    };
    trade?: {
      amountGBP: number;
      amountExcludingVatGBP?: number | null;
    };
    private?: {
      amountGBP: number;
    };
  };
  // Index signature to allow additional properties
  [key: string]: unknown;
}

interface VehicleResult {
  id: number;
  make: string;
  model: string;
  year: string;
  variant: string;
  fuelType: string;
  engineSize: string;
  estimatedPrice: string;
  availability: string;
}

export default function VehicleFinder() {
  const router = useRouter();
  const [vehicleData, setVehicleData] = useState<VehicleInfo | VehicleResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTaxonomyDialogOpen, setIsTaxonomyDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

  // Unified data collection states
  const [advertiserData, setAdvertiserData] = useState<{
    advertiserId?: string;
    name?: string;
    website?: string;
    phone?: string;
    strapline?: string;
    addressLine1?: string;
    town?: string;
    county?: string;
    postcode?: string;
  } | null>(null);
  const [advertData, setAdvertData] = useState<{
    forecourtPrice?: string;
    forecourtPriceVatStatus?: string;
    attentionGrabber?: string;
    description?: string;
  } | null>(null);
  const [vehicleImages, setVehicleImages] = useState<File[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Array<{
    name: string;
    genericName?: string;
    type: 'Standard' | 'Optional';
    category: string;
    basicPrice: number;
    vatPrice: number;
    factoryCodes?: string[];
    rarityRating?: number | null;
    valueRating?: number | null;
  }>>([]);

  const { isDarkMode } = useTheme();

  // Create a stable callback for features change
  const handleFeaturesChange = useCallback((features: Array<{
    name: string;
    genericName?: string;
    type: 'Standard' | 'Optional';
    category: string;
    basicPrice: number;
    vatPrice: number;
    factoryCodes?: string[];
    rarityRating?: number | null;
    valueRating?: number | null;
  }>) => {
    setSelectedFeatures(features);
  }, []);

  const handleRegistrationSearch = async (registration: string, mileage: string) => {
    setIsLoading(true);
    setError("");
    
    try {
      // Call the real vehicle API
      const params = new URLSearchParams({
        registration: registration.toUpperCase(),
        odometerReadingMiles: mileage,
        features: 'true',
        motTests: 'true',
        history: 'true',
        valuations: 'true'
      });

      const response = await fetch(`/api/vehicles?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      // Debug: Log full API response structure
      console.log('🔍 Full API Response:', {
        success: data.success,
        hasData: !!data.data,
        hasVehicle: !!data.data?.vehicle,
        hasValuations: !!data.data?.valuations,
        vehicleKeys: data.data?.vehicle ? Object.keys(data.data.vehicle) : [],
        dataKeys: data.data ? Object.keys(data.data) : [],
      });

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch vehicle data');
      }

      if (data.success && data.data?.vehicle) {
        const vehicle = data.data.vehicle;
        const valuations = data.data.valuations; // Extract valuations from the same level as vehicle
        
        // Debug: Log features data in detail
        console.log('🎯 Vehicle API Response - Features Analysis:', {
          hasFeatures: !!vehicle.features,
          featuresType: typeof vehicle.features,
          featuresLength: vehicle.features?.length || 0,
          featuresIsArray: Array.isArray(vehicle.features),
          allVehicleKeys: Object.keys(vehicle)
        });
        
        if (vehicle.features && vehicle.features.length > 0) {
          console.log('📋 Sample features:', vehicle.features.slice(0, 3));
        } else {
          console.log('❌ No features found in vehicle data');
        }

        // Transform API response to match our interface
        const transformedData = {
          registration: vehicle.registration || registration.toUpperCase(),
          make: vehicle.make || 'Unknown',
          model: vehicle.model || 'Unknown',
          year: vehicle.firstRegistrationDate ? new Date(vehicle.firstRegistrationDate).getFullYear().toString() : 'Unknown',
          fuelType: vehicle.fuelType || 'Unknown',
          engineSize: vehicle.badgeEngineSizeLitres ? `${vehicle.badgeEngineSizeLitres}L` : (vehicle.engineCapacityCC ? `${vehicle.engineCapacityCC}cc` : 'Unknown'),
          color: vehicle.colour || 'Unknown',
          mileage: mileage || 'Not specified',
          co2Emissions: vehicle.co2EmissionGPKM ? `${vehicle.co2EmissionGPKM} g/km` : 'Unknown',
          taxBand: vehicle.insuranceGroup || 'Unknown',
          dateOfFirstRegistration: vehicle.firstRegistrationDate ? new Date(vehicle.firstRegistrationDate).toLocaleDateString('en-GB') : 'Unknown',
          // Enhanced fields
          derivative: vehicle.derivative,
          derivativeId: vehicle.derivativeId,
          vehicleType: vehicle.vehicleType,
          bodyType: vehicle.bodyType,
          transmissionType: vehicle.transmissionType,
          doors: vehicle.doors,
          seats: vehicle.seats,
          enginePowerBHP: vehicle.enginePowerBHP,
          topSpeedMPH: vehicle.topSpeedMPH,
          zeroToSixtyMPHSeconds: vehicle.zeroToSixtyMPHSeconds,
          fuelEconomyCombinedMPG: vehicle.fuelEconomyNEDCCombinedMPG || vehicle.fuelEconomyWLTPCombinedMPG,
          insuranceGroup: vehicle.insuranceGroup,
          owners: vehicle.owners,
          vin: vehicle.vin,
          emissionClass: vehicle.emissionClass,
          engineNumber: vehicle.engineNumber,
          // Additional fields for VehicleDetails component
          ownershipCondition: vehicle.ownershipCondition,
          engineCapacityCC: vehicle.engineCapacityCC,
          startStop: vehicle.startStop,
          gears: vehicle.gears,
          drivetrain: vehicle.drivetrain,
          cylinders: vehicle.cylinders,
          driveType: vehicle.driveType,
          // Features data for VehicleFeatures component
          features: vehicle.features || [],
          // Valuation data from AutoTrader API (extracted from data.data.valuations)
          valuations: valuations || null
        };
        
        // Debug: Log transformed data features and valuations
        console.log('🔄 Transformed Data - Features:', {
          hasFeatures: !!transformedData.features,
          featuresLength: transformedData.features?.length || 0,
          featuresType: typeof transformedData.features,
          transformedDataKeys: Object.keys(transformedData),
          derivativeId: vehicle.derivativeId
        });
        
        // Debug: Log valuation data
        console.log('💰 Valuation Data Analysis:', {
          hasValuations: !!valuations,
          valuationsType: typeof valuations,
          valuationsKeys: valuations ? Object.keys(valuations) : [],
          retailValue: valuations?.retail?.amountGBP,
          privateValue: valuations?.private?.amountGBP,
          partExchangeValue: valuations?.partExchange?.amountGBP,
          tradeValue: valuations?.trade?.amountGBP,
          rawValuations: valuations
        });
        
        // If no features from vehicle API but we have derivativeId, fetch features separately
        if ((!vehicle.features || vehicle.features.length === 0) && vehicle.derivativeId) {
          console.log('🔍 No features from vehicle API, fetching from taxonomy API with derivativeId:', vehicle.derivativeId);
          
          try {
            const featuresParams = new URLSearchParams({
              derivativeId: vehicle.derivativeId,
              effectiveDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
            });
            
            const featuresResponse = await fetch(`/api/taxonomy/features?${featuresParams.toString()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (featuresResponse.ok) {
              const featuresData = await featuresResponse.json();
              console.log('🎯 Taxonomy Features Response:', {
                success: featuresData.success,
                featuresCount: featuresData.data?.length || 0
              });
              
              if (featuresData.success && featuresData.data && Array.isArray(featuresData.data)) {
                transformedData.features = featuresData.data;
                console.log('✅ Added features from taxonomy API:', featuresData.data.length, 'features');
              }
            } else {
              console.log('⚠️ Failed to fetch features from taxonomy API');
            }
          } catch (featuresError) {
            console.error('❌ Error fetching features from taxonomy API:', featuresError);
          }
        }
        
        setVehicleData(transformedData);
      } else {
        throw new Error('No vehicle data found');
      }
    } catch (error) {
      console.error('Vehicle search error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch vehicle data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaxonomySearch = async (searchParams: TaxonomySearchParams) => {
    setIsLoading(true);
    setError("");
    setIsTaxonomyDialogOpen(false);

    try {
      // Build search parameters
      const params = new URLSearchParams();
      if (searchParams.make) params.append('make', searchParams.make);
      if (searchParams.model) params.append('model', searchParams.model);
      if (searchParams.vehicleType) params.append('vehicleType', searchParams.vehicleType);
      if (searchParams.makeId) params.append('makeId', searchParams.makeId);
      if (searchParams.modelId) params.append('modelId', searchParams.modelId);
      if (searchParams.generationId) params.append('generationId', searchParams.generationId);
      if (searchParams.derivativeId) params.append('derivativeId', searchParams.derivativeId);
      if (searchParams.fuelType) params.append('fuelType', searchParams.fuelType);
      if (searchParams.bodyType) params.append('bodyType', searchParams.bodyType);
      if (searchParams.transmissionType) params.append('transmissionType', searchParams.transmissionType);
      if (searchParams.priceMin) params.append('priceMin', searchParams.priceMin);
      if (searchParams.priceMax) params.append('priceMax', searchParams.priceMax);
      if (searchParams.mileageMax) params.append('mileageMax', searchParams.mileageMax);

      const response = await fetch(`/api/vehicle-search?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to search vehicles');
      }

      if (data.success && data.data?.results) {
        setVehicleData(data.data.results);
      } else {
        throw new Error('No vehicles found matching your criteria');
      }
    } catch (error) {
      console.error('Taxonomy search error:', error);
      setError(error instanceof Error ? error.message : 'Failed to search vehicles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSearch = () => {
    setVehicleData(null);
    setError("");
  };

  const handleAddToStock = (callbackData: unknown) => {
    console.log('Add to stock callback received:', callbackData);
    
    // Check if this is a success/close callback
    if (typeof callbackData === 'object' && callbackData !== null && 'action' in callbackData) {
      const data = callbackData as { action: string; success?: boolean };
      if ((data.action === 'close' || data.action === 'add-another') && data.success) {
        // Vehicle was successfully added, clear all form state
        console.log('✅ Vehicle added successfully, clearing form state...');
        setVehicleData(null);
        setAdvertiserData(null);
        setAdvertData(null);
        setVehicleImages([]);
        setSelectedFeatures([]);
        setError('');
      }
    }
  };

  const handleCreateInvoice = (vehicleData: VehicleInfo, saleType: 'Retail' | 'Trade' | 'Commercial', invoiceTo: 'Customer' | 'Finance Company') => {
    // Convert vehicle data to URL parameters for the dynamic invoice editor
    const params = new URLSearchParams({
      source: 'vehicle_finder',
      // Sale type and invoice to parameters
      saleType: saleType,
      invoiceTo: invoiceTo,
      // Vehicle basic info
      vehicleRegistration: vehicleData.registration || '',
      make: vehicleData.make || '',
      model: vehicleData.model || '',
      derivative: vehicleData.derivative || '',
      derivativeId: vehicleData.derivativeId || '',
      mileage: vehicleData.mileage || '',
      colour: vehicleData.color || '',
      fuelType: vehicleData.fuelType || '',
      engineSize: vehicleData.engineSize || '',
      engineNumber: vehicleData.engineNumber || '',
      vin: vehicleData.vin || '',
      firstRegDate: vehicleData.dateOfFirstRegistration || '',
      // Additional vehicle details
      year: vehicleData.year || '',
      bodyType: vehicleData.bodyType || '',
      transmissionType: vehicleData.transmissionType || '',
      doors: vehicleData.doors?.toString() || '',
      seats: vehicleData.seats?.toString() || '',
      enginePowerBHP: vehicleData.enginePowerBHP?.toString() || '',
      owners: vehicleData.owners?.toString() || '',
      emissionClass: vehicleData.emissionClass || '',
      // Valuation data if available
      retailValue: vehicleData.valuations?.retail?.amountGBP?.toString() || '',
      partExchangeValue: vehicleData.valuations?.partExchange?.amountGBP?.toString() || '',
      tradeValue: vehicleData.valuations?.trade?.amountGBP?.toString() || '',
      privateValue: vehicleData.valuations?.private?.amountGBP?.toString() || ''
    });

    // Navigate to dynamic invoice editor with vehicle data
    router.push(`/dynamic-invoice-editor?${params.toString()}`);
  };

  const handleInvoiceDialogConfirm = (saleType: 'Retail' | 'Trade' | 'Commercial', invoiceTo: 'Customer' | 'Finance Company') => {
    if (vehicleData && !Array.isArray(vehicleData)) {
      handleCreateInvoice(vehicleData, saleType, invoiceTo);
    }
  };

  return (
    <div className={`min-h-screen ${
      isDarkMode 
        ? 'bg-slate-900' 
        : 'bg-gray-50'
    }`}>
      <Header />
      
      {/* Enhanced Hero Section */}
      <section className="pt-20 pb-16 px-4 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="max-w-[2140px] mx-auto text-center relative z-10 px-4">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Quick and easy vehicle information
          </div>
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r ${
            isDarkMode 
              ? 'from-white to-gray-300' 
              : 'from-gray-900 to-gray-600'
          } bg-clip-text text-transparent`}>
            Vehicle Finder
          </h1>
        </div>
      </section>

      {/* Interactive Search Section */}
      <section className="pb-16 px-4">
        <div className="max-w-[2140px] mx-auto">
          {/* Search Methods */}
          <div className="space-y-8 mb-8">
            {/* Compact Vehicle Search */}
            <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600' 
                : 'bg-gradient-to-br from-white to-blue-50/30 border-gray-200'
            }`}>
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 mr-4 shadow-lg">
                  <SearchIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Vehicle Search
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Search by registration or browse by specifications
                  </p>
                  </div>
                </div>

              <SearchForm 
                onSearch={handleRegistrationSearch}
                isLoading={isLoading}
                error={error}
              />
              
              {/* Taxonomy Search Button */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                <Button
                  onClick={() => setIsTaxonomyDialogOpen(true)}
                  variant="outline"
                  className={`w-full py-2 transition-all duration-300 ${
              isDarkMode 
                      ? 'border-purple-500 text-purple-400 hover:bg-purple-500/10'
                      : 'border-purple-500 text-purple-600 hover:bg-purple-50'
                  }`}
                  disabled={isLoading}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Taxonomy Search
                </Button>
                  </div>
                  </div>
                </div>

          {/* Search Tips */}
          {!vehicleData && !isLoading && (
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-slate-800/50' : 'bg-blue-50'
            } border ${isDarkMode ? 'border-slate-700' : 'border-blue-200'}`}>
              <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                💡 Quick Tips
              </h4>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className={isDarkMode ? 'text-white' : 'text-gray-700'}>
                  <strong>Registration:</strong> Enter UK reg (e.g., AB12 CDE) for instant vehicle data
                  </div>
                <div className={isDarkMode ? 'text-white' : 'text-gray-700'}>
                  <strong>Taxonomy:</strong> Browse by make, model, and specifications
                    </div>
                  </div>
                </div>
          )}
        </div>
      </section>

      {/* Enhanced Loading State */}
      {isLoading && (
        <section className="pb-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className={`p-12 rounded-2xl text-center ${
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            } shadow-xl border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <SearchIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                    
              <h3 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Searching Vehicle Database
                      </h3>
              <p className={`text-lg mb-6 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Retrieving comprehensive vehicle information from AutoTrader API...
              </p>
              
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>

              <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                This may take a few seconds...
                          </div>
                          </div>
        </div>
      </section>
      )}

      {/* Taxonomy Wizard */}
      <TaxonomyWizard
        isOpen={isTaxonomyDialogOpen}
        onClose={() => setIsTaxonomyDialogOpen(false)}
        onSearch={handleTaxonomySearch}
        isLoading={isLoading}
      />

      {/* Enhanced Results Section */}
      {vehicleData && (
        <section className="pb-16 px-4">
          <div className="max-w-[2140px] mx-auto w-full">
            {/* Animated Results Header */}
            <div className={`p-6 rounded-2xl mb-8 ${
              isDarkMode ? 'bg-slate-800' : 'bg-white'
            } shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                    <CheckCircle className="h-8 w-8 text-green-500 relative z-10" />
                          </div>
                <div>
                    <h2 className={`text-3xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Search Results
                  </h2>
                    <p className={`text-lg ${
                    isDarkMode ? 'text-white' : 'text-gray-600'
                  }`}>
                      {Array.isArray(vehicleData) ? `${vehicleData.length} vehicles found` : 'Comprehensive vehicle information retrieved'}
                  </p>
                </div>
                      </div>

                <div className="flex items-center space-x-3">
                  <div className={`px-4 py-2 rounded-full ${
                    isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                  } text-sm font-medium`}>
                    ✓ Data Retrieved
              </div>
              <Button
                onClick={resetSearch}
                variant="outline"
                    className="px-6 py-2 font-medium hover:scale-105 transition-transform"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                New Search
              </Button>
            </div>
                        </div>
                      </div>
                      
            {Array.isArray(vehicleData) ? (
              /* Enhanced Multiple Results Display */
              <div className="space-y-6">
                <div className={`p-8 rounded-2xl text-center ${
                  isDarkMode ? 'bg-slate-800' : 'bg-white'
                } shadow-lg border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-4">
                    <Database className="w-8 h-8" />
                    </div>
                  <h3 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Multiple Vehicles Found
                      </h3>
                  <p className={`text-lg mb-6 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Found {vehicleData.length} vehicles matching your search criteria
                  </p>
                  <div className={`inline-flex items-center px-4 py-2 rounded-full ${
                    isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                  } text-sm font-medium`}>
                    🚀 Enhanced multi-vehicle display coming soon
                        </div>
                          </div>
                          </div>
            ) : (
              /* Enhanced Comprehensive Vehicle Information Display */
              <div className="space-y-8">
                {/* Vehicle Details with Animation */}
                <div className="transform transition-all duration-500 hover:scale-[1.02]">
                  <VehicleDetails vehicleData={vehicleData} />
                      </div>

                {/* Vehicle Check with Animation */}
                <div className="transform transition-all duration-500 hover:scale-[1.02]">
                  <VehicleCheck vehicleData={vehicleData} />
                </div>

                {/* Vehicle Valuation with Animation */}
                <div className="transform transition-all duration-500 hover:scale-[1.02]">
                  <VehicleValuation vehicleData={vehicleData} />
                </div>

                {/* Vehicle Features with Animation */}
                <div className="transform transition-all duration-500 hover:scale-[1.02]">
                  <VehicleFeatures 
                    vehicleData={vehicleData}
                    onFeaturesChange={handleFeaturesChange}
                  />
                </div>

                {/* Advertiser Data with Animation */}
                <div className="transform transition-all duration-500 hover:scale-[1.02]">
                  <AdvertiserData 
                    onDataChange={setAdvertiserData}
                    defaultExpanded={false}
                  />
                      </div>

                {/* Advert Data with Animation */}
                <div className="transform transition-all duration-500 hover:scale-[1.02]">
                  <AdvertData 
                    onDataChange={setAdvertData}
                    defaultExpanded={true}
                  />
                      </div>

                {/* Image Upload with Animation */}
                <div className="transform transition-all duration-500 hover:scale-[1.02]">
                  <ImageUpload 
                    onImagesChange={setVehicleImages}
                    maxImages={100}
                    maxSizePerImage={50}
                  />
                      </div>

                {/* Enhanced Add to Stock Section */}
                <div className={`p-8 rounded-2xl text-center ${
                  isDarkMode ? 'bg-gradient-to-r from-slate-800 to-slate-700' : 'bg-gradient-to-r from-blue-50 to-purple-50'
                } border-2 ${isDarkMode ? 'border-slate-600' : 'border-blue-200'}`}>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-600 text-white mb-4">
                    <Car className="w-8 h-8" />
                  </div>
                  <h3 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Ready to Add to Stock?
                  </h3>
                  <p className={`text-lg mb-6 max-w-2xl mx-auto ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    All vehicle information has been verified and is ready to be added to your stock inventory with complete details and documentation.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <EnhancedAddToStockButton 
                      vehicleData={vehicleData}
                      advertiserData={advertiserData}
                      advertData={advertData}
                      vehicleImages={vehicleImages}
                      selectedFeatures={selectedFeatures}
                      onAddToStock={handleAddToStock}
                      className="px-12 py-4 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    />
                    <Button
                      onClick={() => setIsInvoiceDialogOpen(true)}
                      className="px-12 py-4 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                    >
                      <FileText className="w-6 h-6 mr-3" />
                      Create Invoice
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      
      <Footer />
      
      {/* Invoice Type Dialog */}
      <InvoiceTypeDialog
        isOpen={isInvoiceDialogOpen}
        onClose={() => setIsInvoiceDialogOpen(false)}
        onConfirm={handleInvoiceDialogConfirm}
        vehicleRegistration={vehicleData && !Array.isArray(vehicleData) ? vehicleData.registration : undefined}
      />
    </div>
  );
} 
