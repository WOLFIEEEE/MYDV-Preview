'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import Header from '@/components/shared/Header';
import { Button } from '@/components/ui/button';
import { 
  Car, 
  Calendar, 
  Gauge, 
  Settings, 
  Star,
  TrendingUp,
  PoundSterling,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ValuationRequest, ValuationResponse, ConditionRating, Feature } from '@/types/autotrader';
import RegistrationDateCalculator from '@/lib/registrationDateCalculator';
import { navigateToRetailCheck } from '@/lib/utils/retailCheckNavigation';
import EnhancedAddToStockButton from '@/components/vehicle-finder/EnhancedAddToStockButton';
import AdvertiserData from '@/components/vehicle-finder/AdvertiserData';
import AdvertData from '@/components/vehicle-finder/AdvertData';
import ImageUpload from '@/components/vehicle-finder/ImageUpload';

interface TaxonomyData {
  vehicleType: string;
  make: string;
  makeId: string;
  model: string;
  modelId: string;
  generation: string;
  generationId: string;
  derivative: string;
  derivativeId: string;
  year: string;
  plate: string;
  mileage: string;
}

// Loading component for Suspense fallback
function ValuationLoading() {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className={isDarkMode ? 'text-white' : 'text-gray-600'}>
              Loading valuation data...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that uses useSearchParams
function ValuationContent() {
  const { isDarkMode } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Taxonomy data from URL params
  const [taxonomyData, setTaxonomyData] = useState<TaxonomyData | null>(null);
  
  // Valuation data
  const [valuationData, setValuationData] = useState<ValuationResponse | null>(null);
  const [originalValuation, setOriginalValuation] = useState<ValuationResponse | null>(null);
  
  // User adjustments
  const [selectedCondition, setSelectedCondition] = useState<ConditionRating>('GOOD');
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);

  // Additional data collection states for stock creation
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
    attentionGrabber?: string;
    description?: string;
  } | null>(null);
  const [vehicleImages, setVehicleImages] = useState<File[]>([]);

  // Condition options
  const conditionOptions: Array<{value: ConditionRating, label: string, description: string}> = [
    { value: 'EXCELLENT', label: 'Excellent', description: 'Like new, no visible defects' },
    { value: 'GREAT', label: 'Great', description: 'Minor wear, well maintained' },
    { value: 'GOOD', label: 'Good', description: 'Normal wear for age and mileage' },
    { value: 'FAIR', label: 'Fair', description: 'Noticeable wear, may need repairs' },
    { value: 'POOR', label: 'Poor', description: 'Significant wear, requires repairs' }
  ];

  // Extract taxonomy data from URL params
  useEffect(() => {
    const data: TaxonomyData = {
      vehicleType: searchParams.get('vehicleType') || '',
      make: searchParams.get('make') || '',
      makeId: searchParams.get('makeId') || '',
      model: searchParams.get('model') || '',
      modelId: searchParams.get('modelId') || '',
      generation: searchParams.get('generation') || '',
      generationId: searchParams.get('generationId') || '',
      derivative: searchParams.get('derivative') || '',
      derivativeId: searchParams.get('derivativeId') || '',
      year: searchParams.get('year') || '',
      plate: searchParams.get('plate') || '',
      mileage: searchParams.get('mileage') || '0'
    };
    
    setTaxonomyData(data);
    
    if (data.derivativeId && data.year && data.mileage) {
      loadInitialValuation(data);
      loadFeatures(data.derivativeId);
    }
  }, [searchParams]);

  const loadInitialValuation = async (data: TaxonomyData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get derivative details to obtain introduced/discontinued dates
      let introducedDate: string | undefined;
      let discontinuedDate: string | undefined;
      
      try {
        const derivativeResponse = await fetch(`/api/taxonomy/derivatives/${data.derivativeId}`);
        if (derivativeResponse.ok) {
          const derivativeResult = await derivativeResponse.json();
          if (derivativeResult.success && derivativeResult.data) {
            introducedDate = derivativeResult.data.introduced;
            discontinuedDate = derivativeResult.data.discontinued;
          }
        }
      } catch (err) {
        console.warn('Failed to get derivative details, using fallback registration date calculation:', err);
      }
      
      // Calculate proper first registration date using UK plate period logic
      const plateIdentifier = data.plate || null;
      const fallbackIntroducedDate = introducedDate || `${parseInt(data.year) - 1}-01-01`; // Fallback to year before selected year
      
      const registrationResult = RegistrationDateCalculator.calculateRegistrationDate(
        plateIdentifier,
        fallbackIntroducedDate,
        discontinuedDate
      );
      
      console.log('🗓️ Registration date calculation:', {
        plateIdentifier,
        introducedDate: fallbackIntroducedDate,
        discontinuedDate,
        result: registrationResult
      });
      
      const valuationRequest: ValuationRequest = {
        vehicle: {
          derivativeId: data.derivativeId,
          firstRegistrationDate: registrationResult.firstRegistrationDate,
          odometerReadingMiles: parseInt(data.mileage)
        }
      };

      const response = await fetch('/api/valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(valuationRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to get valuation');
      }

      const result = await response.json();
      if (result.success) {
        setValuationData(result.data);
        setOriginalValuation(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to get valuation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load valuation');
    } finally {
      setLoading(false);
    }
  };

  const loadFeatures = async (derivativeId: string) => {
    try {
      const response = await fetch(`/api/taxonomy/features?derivativeId=${derivativeId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvailableFeatures(result.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load features:', err);
    }
  };

  const recalculateValuation = async () => {
    if (!taxonomyData || !originalValuation) return;
    
    setRecalculating(true);
    setError(null);
    
    try {
      // Get derivative details for proper registration date calculation
      let introducedDate: string | undefined;
      let discontinuedDate: string | undefined;
      
      try {
        const derivativeResponse = await fetch(`/api/taxonomy/derivatives/${taxonomyData.derivativeId}`);
        if (derivativeResponse.ok) {
          const derivativeResult = await derivativeResponse.json();
          if (derivativeResult.success && derivativeResult.data) {
            introducedDate = derivativeResult.data.introduced;
            discontinuedDate = derivativeResult.data.discontinued;
          }
        }
      } catch (err) {
        console.warn('Failed to get derivative details for recalculation:', err);
      }
      
      // Calculate proper first registration date
      const plateIdentifier = taxonomyData.plate || null;
      const fallbackIntroducedDate = introducedDate || `${parseInt(taxonomyData.year) - 1}-01-01`;
      
      const registrationResult = RegistrationDateCalculator.calculateRegistrationDate(
        plateIdentifier,
        fallbackIntroducedDate,
        discontinuedDate
      );
      
      const valuationRequest: ValuationRequest = {
        vehicle: {
          derivativeId: taxonomyData.derivativeId,
          firstRegistrationDate: registrationResult.firstRegistrationDate,
          odometerReadingMiles: parseInt(taxonomyData.mileage)
        },
        features: selectedFeatures.map(f => ({ name: f.name })),
        conditionRating: selectedCondition
      };

      const response = await fetch('/api/valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(valuationRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to recalculate valuation');
      }

      const result = await response.json();
      if (result.success) {
        setValuationData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to recalculate valuation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate valuation');
    } finally {
      setRecalculating(false);
    }
  };

  const toggleFeature = (feature: Feature) => {
    setSelectedFeatures(prev => {
      const exists = prev.find(f => f.name === feature.name);
      if (exists) {
        return prev.filter(f => f.name !== feature.name);
      } else {
        return [...prev, feature];
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getValueDifference = (current: number, original: number) => {
    const diff = current - original;
    const percentage = ((diff / original) * 100).toFixed(1);
    return { diff, percentage };
  };

  const handleRetailCheck = () => {
    if (!taxonomyData) {
      console.error('No taxonomy data available for retail check');
      return;
    }
    
    navigateToRetailCheck(
      {
        derivativeId: taxonomyData.derivativeId,
        mileage: taxonomyData.mileage
      },
      router,
      {
        onError: (errorMessage) => {
          console.error('Retail check navigation failed:', errorMessage);
          alert(errorMessage); // You could replace this with a toast notification
        },
        onSuccess: (url) => {
          console.log('Successfully navigating to retail check:', url);
        }
      }
    );
  };

  // Build vehicle data structure for EnhancedAddToStockButton
  const buildVehicleData = () => {
    if (!taxonomyData) return null;
    
    return {
      // Core taxonomy data
      registration: taxonomyData.plate,
      make: taxonomyData.make,
      model: taxonomyData.model,
      year: taxonomyData.year,
      mileage: taxonomyData.mileage,
      derivative: taxonomyData.derivative,
      derivativeId: taxonomyData.derivativeId,
      
      // Additional fields for taxonomy flow
      vehicleType: taxonomyData.vehicleType,
      generation: taxonomyData.generation,
      generationId: taxonomyData.generationId,
      
      // Valuation-based pricing (use retail value as suggested price)
      suggestedPrice: valuationData?.valuations.retailValue,
      
      // Features from taxonomy
      features: availableFeatures,
      selectedFeatures: selectedFeatures,
      
      // Condition
      condition: selectedCondition,
      
      // Additional properties that might be available
      bodyType: '',
      fuelType: '',
      transmissionType: '',
      doors: 5,
      seats: 5,
      co2Emissions: '',
      color: '',
      vin: '',
      engineSize: ''
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Getting details...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className={`text-lg mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {error}
              </p>
              <Button
                onClick={() => taxonomyData && loadInitialValuation(taxonomyData)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!valuationData || !taxonomyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              No valuation data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="w-full px-4 py-8 pt-24">
        {/* Header */}
        <div className={`mb-8 p-6 rounded-lg ${
          isDarkMode ? 'bg-slate-800' : 'bg-white'
        } shadow-lg`}>
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Taxonomy Vehicle Details
          </h1>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Derivative ID: {taxonomyData.derivativeId}
          </p>
          
          {/* Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-blue-600" />
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Vehicle</div>
                <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {taxonomyData.make} {taxonomyData.model}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Year</div>
                <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {taxonomyData.year} ({taxonomyData.plate})
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-blue-600" />
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Mileage</div>
                <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {parseInt(taxonomyData.mileage).toLocaleString()} miles
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-blue-600" />
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Condition</div>
                <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedCondition}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Valuation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { key: 'retailValue', label: 'Retail Value', icon: TrendingUp, primary: true },
            { key: 'privateValue', label: 'Private Sale Value', icon: PoundSterling },
            { key: 'partExchangeValue', label: 'Part Exchange Value', icon: RefreshCw },
            { key: 'tradeValue', label: 'Trade Value', icon: Settings }
          ].map(({ key, label, icon: Icon, primary }) => {
            const currentValue = valuationData.valuations[key as keyof typeof valuationData.valuations];
            const originalValue = originalValuation?.valuations[key as keyof typeof originalValuation.valuations] || currentValue;
            const { diff, percentage } = getValueDifference(currentValue, originalValue);
            
            return (
              <div
                key={key}
                className={`p-6 rounded-lg shadow-lg transition-all duration-300 hover:scale-105 ${
                  primary
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                    : isDarkMode
                      ? 'bg-slate-800 border border-slate-700'
                      : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`w-6 h-6 ${primary ? 'text-white' : 'text-blue-600'}`} />
                  {diff !== 0 && (
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      diff > 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {diff > 0 ? '+' : ''}{percentage}%
                    </div>
                  )}
                </div>
                
                <div className={`text-2xl font-bold mb-2 ${
                  primary ? 'text-white' : isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {formatCurrency(currentValue)}
                </div>
                
                <div className={`text-sm ${
                  primary ? 'text-blue-100' : isDarkMode ? 'text-white' : 'text-gray-600'
                }`}>
                  {label}
                </div>
                
                {diff !== 0 && (
                  <div className={`text-xs mt-2 ${
                    primary ? 'text-blue-100' : isDarkMode ? 'text-white' : 'text-gray-500'
                  }`}>
                    {diff > 0 ? '+' : ''}{formatCurrency(diff)} from base
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Adjustment Panel */}
        <div className={`p-6 rounded-lg mb-8 ${
          isDarkMode ? 'bg-slate-800' : 'bg-white'
        } shadow-lg`}>
          <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Adjust Valuation Parameters
          </h2>
          
          {/* Condition Selection */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Vehicle Condition
            </label>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {conditionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedCondition(option.value)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedCondition === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isDarkMode
                        ? 'border-slate-600 bg-slate-700 hover:border-blue-400'
                        : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                  }`}
                >
                  <div className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {option.label}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Features Selection */}
          {availableFeatures.length > 0 && (
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Optional Features ({selectedFeatures.length} selected)
              </label>
              <p className={`text-xs mb-3 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Note: All standard features are included by default in the valuation
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {availableFeatures.filter(f => f.type === 'Optional').map((feature) => {
                  const isSelected = selectedFeatures.some(f => f.name === feature.name);
                  return (
                    <button
                      key={feature.name}
                      onClick={() => toggleFeature(feature)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : isDarkMode
                            ? 'border-slate-600 bg-slate-700 hover:border-blue-400'
                            : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : isDarkMode
                              ? 'border-slate-400'
                              : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {feature.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recalculate Button */}
          <div className="text-center">
            <Button
              onClick={recalculateValuation}
              disabled={recalculating}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {recalculating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recalculating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate Valuation
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Additional Data Collection for Stock Creation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Advertiser Data */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Advertiser Information
            </h3>
            <AdvertiserData
              defaultExpanded={false}
              onDataChange={setAdvertiserData}
              initialData={advertiserData || undefined}
            />
          </div>

          {/* Advert Data */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Pricing & Description
            </h3>
            <AdvertData
              defaultExpanded={false}
              onDataChange={setAdvertData}
              initialData={advertData || undefined}
            />
            {valuationData && (
              <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-blue-50'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-blue-800'}`}>
                  💡 Suggested retail price: <strong>{formatCurrency(valuationData.valuations.retailValue)}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Image Upload */}
        <div className={`p-6 rounded-lg mb-8 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Vehicle Images
          </h3>
          <ImageUpload
            onImagesChange={setVehicleImages}
            maxImages={10}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {buildVehicleData() && (
            <EnhancedAddToStockButton
              vehicleData={buildVehicleData()!}
              advertiserData={advertiserData}
              advertData={advertData}
              vehicleImages={vehicleImages}
              className="px-8 py-3 rounded-lg font-medium"
            />
          )}
          
          <Button
            variant="outline"
            onClick={handleRetailCheck}
            className="px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Perform Retail Check
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ValuationPage() {
  return (
    <Suspense fallback={<ValuationLoading />}>
      <ValuationContent />
    </Suspense>
  );
}
