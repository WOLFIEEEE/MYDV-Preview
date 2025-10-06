"use client";

import { useState, useEffect, useCallback } from 'react';
import type { 
  StockItem, 
  StockAPIResponse, 
  UseStockDataOptions,
  MyStockVehicle 
} from '@/types/stock';

// Re-export types for other hooks
export type { StockAPIResponse, StockItem, UseStockDataOptions } from '@/types/stock';

export function useStockData(options: UseStockDataOptions = {}) {
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalResults: 0,
    totalPages: 0,
    hasNextPage: false
  });
  const [availableFilters, setAvailableFilters] = useState<any>(null);

  const fetchStock = useCallback(async () => {
    // Don't fetch if disabled
    if (options.disabled) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Add query parameters
      if (options.page) params.append('page', options.page.toString());
      if (options.pageSize) params.append('pageSize', options.pageSize.toString());
      if (options.lifecycleState) params.append('lifecycleState', options.lifecycleState);
      if (options.ownershipCondition) params.append('ownershipCondition', options.ownershipCondition);
      if (options.make) params.append('make', options.make);
      if (options.model) params.append('model', options.model);
      
      // Include all data points
      params.append('includeHistory', 'true');
      params.append('includeCheck', 'true');
      params.append('includeFeatures', 'true');
      params.append('includeHighlights', 'true');
      params.append('includeMedia', 'true');

      console.log('\n🔄 ===== HOOK: FETCHING STOCK DATA =====');
      console.log('📡 Request URL:', `/api/stock?${params.toString()}`);
      
      const response = await fetch(`/api/stock?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: StockAPIResponse = await response.json();
      
      console.log('\n📦 ===== HOOK: RECEIVED API RESPONSE =====');
      console.log('✅ HOOK: Response success:', result.success);
      
        // Handle API errors with user-friendly messages
        if (!response.ok || !result.success) {
          let errorMessage = result.error?.message || 'Failed to fetch stock data';
          
          if (response.status === 422) {
            // Unprocessable Entity - data integrity issues
            if (result.error?.message?.includes('Duplicate stock ID detected')) {
              errorMessage = 'Data Integrity Issue: ' + (result.error?.details || 'Duplicate stock IDs found in your feed. Please contact support to resolve this critical issue.');
            } else {
              errorMessage = 'Data integrity issue detected. Please contact support.';
            }
          } else if (response.status === 400) {
            // Bad request - configuration errors
            if (result.error?.message?.includes('Invalid Advertiser Configuration') ||
                result.error?.message?.includes('advertiser ID')) {
              errorMessage = 'Invalid Advertiser ID: Your advertiser ID configuration is incorrect. Please check your account settings and verify your advertiser ID.';
            } else {
              errorMessage = 'Configuration error. Please check your account settings.';
            }
          } else if (response.status === 409) {
            // Conflict - advertiser ID already in use
            errorMessage = 'Advertiser ID Conflict: This advertiser ID is already being used by another account. Please contact support to resolve this issue.';
          } else if (response.status === 206) {
          // Partial content - some data loaded but with issues
          errorMessage = 'Stock data partially loaded. Some items may be missing. Please try refreshing.';
        } else if (response.status === 503) {
          // Service unavailable
          errorMessage = 'Stock service is temporarily unavailable. Please try again in a moment.';
        } else if (response.status === 502) {
          // Bad gateway - external service error
          errorMessage = 'Unable to fetch stock data from AutoTrader. Please try again later.';
        } else if (response.status >= 500) {
          // Server errors
          errorMessage = 'Server error occurred while loading stock data. Please try again.';
        } else if (response.status === 404) {
          // Not found
          errorMessage = 'Stock configuration not found. Please contact support.';
        } else if (response.status === 401) {
          // Unauthorized
          errorMessage = 'Please sign in to view stock data.';
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('📊 HOOK: Stock items count:', result.data?.stock?.length || 0);

      if (result.data) {
        if (result.data.stock && result.data.stock.length > 0) {
          const firstItem = result.data.stock[0];
          console.log('\n🔍 HOOK: FIRST ITEM ANALYSIS =====');
          console.log('🏗️ HOOK: Top-level keys:', Object.keys(firstItem));
          console.log('🚗 HOOK: Vehicle data exists:', !!firstItem.vehicle);
          console.log('💰 HOOK: Adverts data exists:', !!firstItem.adverts);
          console.log('📊 HOOK: Metadata exists:', !!firstItem.metadata);
          console.log('📸 HOOK: Media exists:', !!firstItem.media);
          
          if (firstItem.vehicle) {
            console.log('\n🚗 HOOK: VEHICLE OBJECT KEYS:', Object.keys(firstItem.vehicle));
            console.log('🚗 HOOK: Sample vehicle data:', {
              make: firstItem.vehicle.make,
              model: firstItem.vehicle.model,
              derivative: firstItem.vehicle.derivative,
              registration: firstItem.vehicle.registration,
              yearOfManufacture: firstItem.vehicle.yearOfManufacture
            });
          }
          
          if (firstItem.adverts) {
            console.log('\n💰 HOOK: ADVERTS OBJECT KEYS:', Object.keys(firstItem.adverts));
            if (firstItem.adverts.retailAdverts) {
              console.log('💰 HOOK: RETAIL ADVERTS KEYS:', Object.keys(firstItem.adverts.retailAdverts));
              console.log('💰 HOOK: Sample pricing data:', {
                totalPrice: firstItem.adverts.retailAdverts.totalPrice?.amountGBP,
                suppliedPrice: firstItem.adverts.retailAdverts.suppliedPrice?.amountGBP,
                priceIndicator: firstItem.adverts.retailAdverts.priceIndicatorRating
              });
            }
          }
          
          if (firstItem.metadata) {
            console.log('\n📊 HOOK: METADATA OBJECT KEYS:', Object.keys(firstItem.metadata));
            console.log('📊 HOOK: Sample metadata:', {
              lifecycleState: firstItem.metadata.lifecycleState,
              stockId: firstItem.metadata.stockId,
              dateOnForecourt: firstItem.metadata.dateOnForecourt
            });
          }
        }
        
        setData(result.data.stock || []);
        setPagination(result.data.pagination);
        setAvailableFilters(result.data.availableFilters);
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [options.disabled, options.page, options.pageSize, options.lifecycleState, options.ownershipCondition, options.make, options.model]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  return {
    data,
    loading,
    error,
    pagination,
    availableFilters,
    refetch: fetchStock
  };
}

// Helper function to map API data to the existing MyStockVehicle interface
export function mapStockToMyStockVehicle(stockItem: StockItem): MyStockVehicle {
  const vehicle = stockItem.vehicle || {};
  const adverts = stockItem.adverts || {};
  const retailAdverts = adverts.retailAdverts || {};
  const metadata = stockItem.metadata || {};
  const features = stockItem.features || [];
  const media = stockItem.media || {};
  const images = media.images || [];
  
  // Calculate performance (mock data for now - would need historical data)
  const currentPrice = retailAdverts.totalPrice?.amountGBP || adverts.forecourtPrice?.amountGBP || 0;
  const suppliedPrice = retailAdverts.suppliedPrice?.amountGBP || currentPrice;
  const performancePercentage = suppliedPrice > 0 ? ((currentPrice - suppliedPrice) / suppliedPrice) * 100 : 0;
  
  // Determine status based on lifecycle state
  const lifecycleState = metadata.lifecycleState || 'ACTIVE';
  let status: 'tracking' | 'selling' | 'sold' | 'watchlist' = 'tracking';
  if (lifecycleState === 'SOLD') status = 'sold';
  else if (lifecycleState === 'FORECOURT' || lifecycleState === 'ACTIVE') status = 'selling';
  else if (lifecycleState === 'RESERVED') status = 'watchlist';
  
  // Calculate days in stock
  const dateOnForecourt = metadata.dateOnForecourt ? new Date(metadata.dateOnForecourt) : new Date();
  const daysInStock = Math.floor((Date.now() - dateOnForecourt.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    id: stockItem.stockId || Math.random().toString(36).substr(2, 9),
    registration: vehicle.registration || 'Unknown',
    make: vehicle.make || 'Unknown',
    model: vehicle.model || 'Unknown',
    derivative: vehicle.derivative || '',
    generation: vehicle.generation || '',
    trim: vehicle.trim || '',
    color: vehicle.colour || 'Unknown',
    fuel: vehicle.fuelType || 'Unknown',
    transmission: vehicle.transmissionType || 'Unknown',
    bodyType: vehicle.bodyType || 'Unknown',
    derivation: vehicle.derivative || '',
    engineSize: vehicle.engineSize || (vehicle.engineCapacityCC ? `${(vehicle.engineCapacityCC / 1000).toFixed(1)}L` : 'Unknown'),
    bhp: vehicle.enginePowerBHP || 0,
    torque: vehicle.engineTorqueNM || 0,
    fuelDelivery: 'Standard', // Not in API
    engineConfig: 'Standard', // Not in API
    valvesCylinder: null,
    battery: null,
    electricRange: null,
    seats: vehicle.seats || 5,
    acceleration: vehicle.acceleration || 0,
    topSpeed: vehicle.topSpeedMPH || 0,
    fuelEconomy: vehicle.fuelEconomyNEDCCombinedMPG || null,
    co2Emissions: vehicle.co2EmissionGPKM || 0,
    euroEmission: 'Euro 6', // Not in API
    fuelCapacity: vehicle.fuelCapacityLitres || null,
    lengthMm: vehicle.lengthMM || 0,
    widthMm: vehicle.widthMM || 0,
    wheelbaseMm: vehicle.wheelbaseMM || 0,
    kerbWeightKg: vehicle.kerbWeightKG || 0,
    bootSpaceL: vehicle.bootSpaceSeatsUpLitres || 0,
    mileage: vehicle.odometerReadingMiles || 0,
    previousOwners: vehicle.owners || 0,
    year: vehicle.yearOfManufacture || vehicle.firstRegistrationDate?.split('-')[0] || new Date().getFullYear().toString(),
    doors: vehicle.doors || 4,
    driverPosition: 'Right',
    totalPrice: currentPrice,
    listPrice: currentPrice,
    adminFee: retailAdverts.adminFee?.amountGBP || 0,
    monthlyPayment: Math.round(currentPrice / 48), // Mock calculation
    financeAPR: 4.9, // Mock data
    lifecycleState: lifecycleState,
    stockStatus: lifecycleState === 'FORECOURT' ? 'In Stock' : lifecycleState === 'RESERVED' ? 'Reserved' : 'Available',
    daysInStock: daysInStock,
    conditionGrade: 'A', // Not in API
    warrantyDetails: vehicle.warrantyMonthsOnPurchase ? `${vehicle.warrantyMonthsOnPurchase} months warranty` : 'Standard Warranty',
    motExpiry: vehicle.motExpiryDate || 'Unknown',
    lastService: 'Unknown', // Not in API
    dateOnForecourt: metadata.dateOnForecourt || new Date().toISOString().split('T')[0],
    
    // Legacy fields for compatibility
    fuelType: vehicle.fuelType || 'Unknown',
    variant: vehicle.trim || '',
    purchasePrice: suppliedPrice,
    currentValue: currentPrice,
    targetPrice: currentPrice * 1.1, // Mock calculation
    dateAdded: metadata.dateOnForecourt || new Date().toISOString().split('T')[0],
    lastUpdated: metadata.lastUpdated || new Date().toISOString().split('T')[0],
    location: 'Main Showroom', // Not in API
    condition: 'excellent' as const,
    status: status,
    personalNotes: retailAdverts.description || '',
    performancePercentage: performancePercentage,
    daysHeld: daysInStock,
    features: features.map(f => f.name),
    imageUrl: images[0]?.href || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
    isFavorite: false
  };
}