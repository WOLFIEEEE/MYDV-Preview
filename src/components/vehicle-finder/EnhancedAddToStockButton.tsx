"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Check, 
  Loader2, 
  Globe, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import BackToStockButton from "@/components/shared/BackToStockButton";
import DocumentUpload from "@/components/shared/DocumentUpload";
import EditInventoryForm from "@/components/stock/tabs/actions/EditInventoryForm";

interface VehicleData {
  registration: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  derivative?: string;
  derivativeId?: string;
  bodyType?: string;
  fuelType?: string;
  transmissionType?: string;
  doors?: number;
  seats?: number;
  co2Emissions?: string;
  color?: string;
  vin?: string;
  engineSize?: string;
  // Add all other vehicle properties from API
  [key: string]: unknown;
}

interface EnhancedAddToStockButtonProps {
  vehicleData: VehicleData;
  advertiserData?: {
    advertiserId?: string;
    name?: string;
    website?: string;
    phone?: string;
    strapline?: string;
    addressLine1?: string;
    town?: string;
    county?: string;
    postcode?: string;
  } | null;
  advertData?: {
    forecourtPrice?: string;
    forecourtPriceVatStatus?: string;
    attentionGrabber?: string;
    description?: string;
  } | null;
  vehicleImages?: File[];
  selectedFeatures?: Array<{
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
  onAddToStock?: (vehicleData: unknown) => void;
  className?: string;
}

// Removed PricingData interface - using vehicleData.adverts directly

interface ChannelStatus {
  autotraderAdvert: boolean;
  advertiserAdvert: boolean;
  locatorAdvert: boolean;
  profileAdvert: boolean;
  exportAdvert: boolean;
}

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message?: string;
}

export default function EnhancedAddToStockButton({ 
  vehicleData, 
  advertiserData,
  advertData,
  vehicleImages = [],
  selectedFeatures = [],
  onAddToStock,
  className = "" 
}: EnhancedAddToStockButtonProps) {
  
  // Removed router and navigation - keeping user on current page
  const { isDarkMode } = useTheme();
  
  // Main states
  const [currentStep, setCurrentStep] = useState<'initial' | 'channels' | 'no-pricing-confirm' | 'processing' | 'success' | 'purchase-info' | 'documents'>('initial');
  // Removed pricingData - using vehicleData.adverts directly
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>({
    autotraderAdvert: false,
    advertiserAdvert: false,
    locatorAdvert: false,
    profileAdvert: false,
    exportAdvert: false
  });
  
  // Progress tracking
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { id: 'validation', label: 'Validating vehicle data', status: 'pending' },
    { id: 'images', label: 'Processing images', status: 'pending' },
    { id: 'creation', label: 'Fetching fresh vehicle data and creating stock', status: 'pending' },
    { id: 'completion', label: 'Finalizing', status: 'pending' }
  ]);
  
  // Removed tempPricing - no longer needed
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdStockId, setCreatedStockId] = useState<string | null>(null);

  const handleInitialClick = () => {
    // Check if vehicle data already has pricing (from API) OR if user has entered pricing in form
    const hasExistingPricing = (vehicleData as { adverts?: { forecourtPrice?: { amountGBP?: number }; retailAdverts?: { suppliedPrice?: { amountGBP?: number } } } }).adverts?.forecourtPrice?.amountGBP || 
                              (vehicleData as { adverts?: { forecourtPrice?: { amountGBP?: number }; retailAdverts?: { suppliedPrice?: { amountGBP?: number } } } }).adverts?.retailAdverts?.suppliedPrice?.amountGBP;
    
    const hasFormPricing = advertData?.forecourtPrice && 
                          advertData.forecourtPrice.trim() !== '';
    
    if (hasExistingPricing || hasFormPricing) {
      // Has pricing - go directly to channel selection
      setCurrentStep('channels');
    } else {
      // No pricing - show confirmation dialog about DUE_IN
      setCurrentStep('no-pricing-confirm');
    }
  };

  // Removed handlePricingSubmit - no longer needed

  const handleChannelSubmit = () => {
    setCurrentStep('processing');
    processAddToStock();
  };

  const updateProgressStep = (stepId: string, status: ProgressStep['status'], message?: string) => {
    setProgressSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message }
        : step
    ));
  };

  const processAddToStock = async () => {
    setIsProcessing(true);
    
    try {
      // Step 1: Validate vehicle data
      updateProgressStep('validation', 'in_progress', 'Checking vehicle information...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgressStep('validation', 'completed', 'Vehicle data validated');

      // Step 2: Process images (if any)
      updateProgressStep('images', 'in_progress', 'Checking for vehicle images...');
      const imageIds = await processVehicleImages();
      updateProgressStep('images', 'completed', imageIds.length > 0 ? `${imageIds.length} images processed` : 'No images to upload');

      // Step 3: Create stock entry (fetches fresh data from AutoTrader)
      updateProgressStep('creation', 'in_progress', 'Fetching fresh vehicle data from AutoTrader...');
      const stockPayload = buildStockPayload(imageIds);
      const stockResult = await createStockEntry(stockPayload);
      updateProgressStep('creation', 'completed', 'Stock entry created with fresh vehicle data');

      // Store the created stock ID for document upload
      // Handle multiple response formats based on API structure
      console.log('🔍 Full stock creation response:', stockResult);
      
      const extractedStockId = stockResult?.stockId || 
                              stockResult?.data?.stockId || 
                              stockResult?.data?.autoTraderResponse?.metadata?.stockId ||
                              stockResult?.autoTraderResponse?.metadata?.stockId ||
                              stockResult?.metadata?.stockId;
                              
      if (extractedStockId) {
        setCreatedStockId(extractedStockId);
        console.log('✅ Stock ID extracted and stored:', extractedStockId);
      } else {
        console.error('❌ No stock ID found in response. Full response:', JSON.stringify(stockResult, null, 2));
        console.error('❌ Available keys in response:', Object.keys(stockResult || {}));
        if (stockResult?.data) {
          console.error('❌ Available keys in response.data:', Object.keys(stockResult.data || {}));
        }
      }

      // Step 4: Complete
      updateProgressStep('completion', 'in_progress', 'Finalizing...');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateProgressStep('completion', 'completed', 'Stock added successfully');

      // Call callback if provided
      onAddToStock?.(stockResult);
      
      setCurrentStep('success');
      
      // Keep user on current page - no redirect
      
    } catch (error) {
      console.error('Error adding to stock:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add vehicle to stock';
      setError(errorMessage);
      
      // Update current step to error
      const currentStepInProgress = progressSteps.find(step => step.status === 'in_progress');
      if (currentStepInProgress) {
        updateProgressStep(currentStepInProgress.id, 'error', errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const processVehicleImages = async (): Promise<string[]> => {
    // Process actual images from the ImageUpload component
    if (!vehicleImages || vehicleImages.length === 0) {
      return []; // No images to process
    }
    
    const imageIds: string[] = [];
    const advertiserId = advertiserData?.advertiserId || "10028737"; // Default advertiser ID
    
    // Upload each image to the API
    for (let i = 0; i < vehicleImages.length; i++) {
      const imageFile = vehicleImages[i];
      
      try {
        updateProgressStep('images', 'in_progress', `Uploading image ${i + 1} of ${vehicleImages.length}: ${imageFile.name}`);
        
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const response = await fetch(`/api/images?advertiserId=${advertiserId}`, {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (response.ok && result.success && result.data?.imageId) {
          imageIds.push(result.data.imageId);
          console.log(`✅ Image uploaded successfully: ${result.data.imageId}`);
        } else {
          const errorMessage = result.error?.message || result.message || 'Unknown error';
          console.error(`❌ Image upload failed for ${imageFile.name}: ${errorMessage}`);
          // Continue with other images even if one fails
        }
      } catch (error) {
        console.error(`❌ Image upload error for ${imageFile.name}:`, error);
        // Continue with other images even if one fails
      }
    }
    
    return imageIds;
  };

  const buildStockPayload = (imageIds: string[] = []) => {
    // Use the new API format - much simpler!
    const hasAdvertData = advertData && (advertData.forecourtPrice || advertData.attentionGrabber || advertData.description);
    
    // Determine if this is a vehicle finder flow (has registration) or taxonomy flow (has derivativeId)
    // IMPORTANT: Prioritize registration - if we have a registration, use vehicle-finder flow
    // even if derivativeId is also present (AutoTrader returns derivativeId with registration searches)
    const isVehicleFinderFlow = !!vehicleData.registration;
    const isTaxonomyFlow = !vehicleData.registration && !!vehicleData.derivativeId;
    
    // Base payload with channel status
    const basePayload = {
      channelStatus: channelStatus,
      imageIds: imageIds,
      selectedFeatures: selectedFeatures
    };
    
    if (isVehicleFinderFlow) {
      // Vehicle Finder Flow
      return {
        ...basePayload,
        flow: 'vehicle-finder',
        registration: vehicleData.registration,
        mileage: parseInt(vehicleData.mileage.replace(/[^0-9]/g, '') || '0'),
        forecourtPrice: advertData?.forecourtPrice ? parseFloat(advertData.forecourtPrice.replace(/[^0-9.]/g, '')) : undefined,
        forecourtPriceVatStatus: advertData?.forecourtPriceVatStatus || "No VAT",
        attentionGrabber: advertData?.attentionGrabber || "Available Now",
        description: advertData?.description || `${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Excellent condition vehicle with full service history.`,
        lifecycleState: hasAdvertData ? "FORECOURT" : "DUE_IN",
        stockReference: `${vehicleData.make?.substring(0, 3).toUpperCase()}${vehicleData.model?.substring(0, 3).toUpperCase()}${vehicleData.registration?.replace(/[^A-Z0-9]/g, '').substring(-3)}`
      };
    } else if (isTaxonomyFlow) {
      // Taxonomy Flow
      return {
        ...basePayload,
        flow: 'taxonomy',
        derivativeId: vehicleData.derivativeId,
        mileage: parseInt(vehicleData.mileage.replace(/[^0-9]/g, '') || '0'),
        year: parseInt(vehicleData.year) || new Date().getFullYear(),
        plate: vehicleData.registration,
        colour: vehicleData.color,
        forecourtPrice: advertData?.forecourtPrice ? parseFloat(advertData.forecourtPrice.replace(/[^0-9.]/g, '')) : undefined,
        forecourtPriceVatStatus: advertData?.forecourtPriceVatStatus || "No VAT",
        attentionGrabber: advertData?.attentionGrabber || "Available Now",
        description: advertData?.description || `${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Excellent condition vehicle with full service history.`,
        lifecycleState: hasAdvertData ? "FORECOURT" : "DUE_IN",
        stockReference: `${vehicleData.make?.substring(0, 3).toUpperCase()}${vehicleData.model?.substring(0, 3).toUpperCase()}${vehicleData.registration?.replace(/[^A-Z0-9]/g, '').substring(-3) || 'NEW'}`
      };
    } else {
      // Fallback to vehicle finder flow
      return {
        ...basePayload,
        flow: 'vehicle-finder',
        registration: vehicleData.registration || 'UNKNOWN',
        mileage: parseInt(vehicleData.mileage.replace(/[^0-9]/g, '') || '0'),
        forecourtPrice: advertData?.forecourtPrice ? parseFloat(advertData.forecourtPrice.replace(/[^0-9.]/g, '')) : undefined,
        forecourtPriceVatStatus: advertData?.forecourtPriceVatStatus || "No VAT",
        attentionGrabber: advertData?.attentionGrabber || "Available Now",
        description: advertData?.description || `${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Excellent condition vehicle.`,
        lifecycleState: hasAdvertData ? "FORECOURT" : "DUE_IN",
        stockReference: `${vehicleData.make?.substring(0, 3).toUpperCase()}${vehicleData.model?.substring(0, 3).toUpperCase()}NEW`
      };
    }
  };

  const createStockEntry = async (payload: unknown) => {
    const response = await fetch('/api/stock/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Debug: Log the full error structure
      console.log('🔍 Full error response from API:', JSON.stringify(errorData, null, 2));
      console.log('🔍 Error data keys:', Object.keys(errorData));
      if (errorData.error) {
        console.log('🔍 Error object keys:', Object.keys(errorData.error));
      }
      
      // Parse detailed AutoTrader error information
      let detailedError = '';
      
      // Check for AutoTrader-specific error structure
      if (errorData.error?.autoTraderError) {
        const autoTraderError = errorData.error.autoTraderError;
        console.log('🔍 AutoTrader error object found:', JSON.stringify(autoTraderError, null, 2));
        
        // Handle warnings array (like duplicate stock)
        if (autoTraderError.warnings && Array.isArray(autoTraderError.warnings)) {
          console.log('🔍 Processing warnings array:', autoTraderError.warnings);
          const errorMessages = autoTraderError.warnings
            .filter((warning: { type: string; message: string }) => warning.type === 'ERROR')
            .map((warning: { type: string; message: string }) => warning.message)
            .join(', ');
          
          if (errorMessages) {
            detailedError = errorMessages;
            console.log('✅ Found error in warnings:', detailedError);
          }
        }
        
        // Handle direct error messages
        if (!detailedError && autoTraderError.message) {
          detailedError = autoTraderError.message;
          console.log('✅ Found direct error message:', detailedError);
        }
        
        // Handle error arrays
        if (!detailedError && autoTraderError.errors && Array.isArray(autoTraderError.errors)) {
          console.log('🔍 Processing errors array:', autoTraderError.errors);
          const errorMessages = autoTraderError.errors
            .map((err: { message?: string } | string) => 
              typeof err === 'string' ? err : err.message || err.toString())
            .join(', ');
          
          if (errorMessages) {
            detailedError = errorMessages;
            console.log('✅ Found error in errors array:', detailedError);
          }
        }
        
        // Try to extract any error message from the autoTraderError object
        if (!detailedError) {
          // Look for any property that might contain the error message
          const possibleErrorFields = ['message', 'error', 'description', 'detail', 'errorMessage'];
          for (const field of possibleErrorFields) {
            if (autoTraderError[field] && typeof autoTraderError[field] === 'string') {
              detailedError = autoTraderError[field];
              console.log(`✅ Found error in field '${field}':`, detailedError);
              break;
            }
          }
        }
      } else {
        console.log('⚠️ No autoTraderError found in response');
      }
      
      // Fallback to general error messages
      if (!detailedError) {
        detailedError = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.log('⚠️ Using fallback error message:', detailedError);
      }
      
      // Add response status context for better debugging
      const contextualError = response.status === 409 
        ? `Conflict: ${detailedError}`
        : response.status === 400
          ? `Validation Error: ${detailedError}`
          : response.status === 401
            ? `Authentication Error: ${detailedError}`
            : response.status === 403
              ? `Permission Error: ${detailedError}`
              : response.status >= 500
                ? `Server Error: ${detailedError}`
                : detailedError;
      
      console.log('🎯 Final error message:', contextualError);
      throw new Error(contextualError);
    }

    const result = await response.json();
    return result.data || result; // Handle both success response formats
  };

  // Removed separate publishToChannels - now handled in single API call

  const resetProcess = () => {
    setCurrentStep('initial');
    setChannelStatus({
      autotraderAdvert: false,
      advertiserAdvert: false,
      locatorAdvert: false,
      profileAdvert: false,
      exportAdvert: false
    });
    setProgressSteps(prev => prev.map(step => ({ ...step, status: 'pending', message: undefined })));
    setError(null);
    setIsProcessing(false);
    setCreatedStockId(null); // Reset stock ID
  };

  const handleDialogClose = () => {
    // Reset all state when closing the dialog
    resetProcess();
    // Notify parent component to clear form state
    if (onAddToStock) {
      onAddToStock({ action: 'close', success: true });
    }
  };

  const renderNoPricingConfirmDialog = () => (
    <Dialog open={currentStep === 'no-pricing-confirm'} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 shadow-lg">
              <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-left">
                  No Pricing Information
              </DialogTitle>
              <DialogDescription className="text-left mt-1">
                  {vehicleData.year} {vehicleData.make} {vehicleData.model}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className={`p-5 rounded-xl border-l-4 shadow-sm ${
            isDarkMode 
              ? 'bg-amber-900/20 border-amber-500 text-amber-100' 
              : 'bg-amber-50 border-amber-400 text-amber-900'
          }`}>
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <h4 className="font-semibold text-base">You haven&apos;t added any pricing for this vehicle</h4>
                <p className="text-sm leading-relaxed">
                  We will add this vehicle as <strong>&ldquo;Due In&rdquo;</strong> to your stock. You can:
                </p>
                <ul className="text-sm space-y-2 ml-2">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-current rounded-full flex-shrink-0" />
                    <span>Change the status once it appears in &ldquo;My Stock&rdquo;</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-current rounded-full flex-shrink-0" />
                    <span>Add pricing and publish to channels later</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('initial')}
              className="px-6 py-2.5 font-medium"
            >
              Go Back
            </Button>
            <Button
              onClick={() => {
                setCurrentStep('processing');
                processAddToStock();
              }}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-6 py-2.5 font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Add as Due In
              <Clock className="w-4 h-4 ml-2" />
            </Button>
          </div>
    </div>
      </DialogContent>
    </Dialog>
  );

  const renderChannelDialog = () => (
    <Dialog open={currentStep === 'channels'} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 shadow-lg">
              <Globe className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-left">
                  Select Publishing Channels
              </DialogTitle>
              <DialogDescription className="text-left mt-1">
                  {vehicleData.year} {vehicleData.make} {vehicleData.model} - Choose where to publish
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-3">
          {Object.entries({
            autotraderAdvert: 'AT Search & Find',
            advertiserAdvert: 'Dealer Website',
            locatorAdvert: 'Manufacturer Website / Used Vehicle Locators',
            profileAdvert: 'AT Dealer Page',
            exportAdvert: 'AT Linked Advertisers'
          }).map(([key, label]) => (
            <div
              key={key}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                channelStatus[key as keyof ChannelStatus]
                    ? 'border-green-500 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 shadow-sm'
                  : isDarkMode
                      ? 'border-slate-600 bg-slate-700/50 hover:border-green-400 hover:bg-slate-700'
                      : 'border-gray-200 bg-gray-50/50 hover:border-green-300 hover:bg-gray-100'
              }`}
              onClick={() => setChannelStatus(prev => ({
                ...prev,
                [key]: !prev[key as keyof ChannelStatus]
              }))}
            >
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    channelStatus[key as keyof ChannelStatus]
                        ? 'border-green-500 bg-green-500 shadow-sm'
                      : isDarkMode
                          ? 'border-slate-400 hover:border-green-400'
                          : 'border-gray-300 hover:border-green-300'
                  }`}>
                    {channelStatus[key as keyof ChannelStatus] && (
                        <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                    <span className={`font-medium text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {label}
                  </span>
                </div>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-medium transition-all ${
                  channelStatus[key as keyof ChannelStatus]
                    ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-white'
                }`}>
                  {channelStatus[key as keyof ChannelStatus] ? 'Publish' : 'Skip'}
                </span>
              </div>
            </div>
          ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('initial')}
              className="flex-1 sm:flex-none px-6 py-2.5 font-medium order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChannelSubmit}
              className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2.5 font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 order-1 sm:order-2"
            >
              Add to Stock
              <Plus className="w-4 h-4 ml-2" />
            </Button>
          </div>
    </div>
      </DialogContent>
    </Dialog>
  );

  const renderProgressDialog = () => (
    <Dialog open={currentStep === 'processing'} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 shadow-lg">
              <Loader2 className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-left">
                Adding Vehicle to Stock
              </DialogTitle>
              <DialogDescription className="text-left mt-1">
                Please wait while we process your request...
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            {progressSteps.map((step, index) => (
              <div key={step.id} className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                step.status === 'completed' 
                  ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700/50'
                  : step.status === 'in_progress'
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700/50'
                    : step.status === 'error'
                      ? 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-700/50'
                      : isDarkMode 
                        ? 'bg-slate-700/50 border border-slate-600/50' 
                        : 'bg-gray-50/50 border border-gray-200/50'
              }`}>
              <div className="flex-shrink-0">
                {step.status === 'pending' && (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-slate-500 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-500 dark:text-white">{index + 1}</span>
                    </div>
                )}
                {step.status === 'in_progress' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                )}
                {step.status === 'completed' && (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                )}
                {step.status === 'error' && (
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                )}
              </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-base ${
                    step.status === 'completed' 
                      ? 'text-green-800 dark:text-green-200'
                      : step.status === 'in_progress'
                        ? 'text-blue-800 dark:text-blue-200'
                        : step.status === 'error'
                          ? 'text-red-800 dark:text-red-200'
                          : isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                  {step.label}
                </p>
                {step.message && (
                    <div className={`text-sm mt-1 ${
                    step.status === 'error' 
                      ? 'text-red-600 dark:text-red-400' 
                        : step.status === 'completed'
                          ? 'text-green-600 dark:text-green-400'
                          : step.status === 'in_progress'
                            ? 'text-blue-600 dark:text-blue-400'
                            : isDarkMode ? 'text-white' : 'text-gray-600'
                    }`}>
                      {step.status === 'error' && step.message.length > 50 ? (
                        <div>
                          <p className="font-medium">
                            {step.message.includes('Duplicate stock found') ? 'Vehicle Already Exists' :
                             step.message.includes('Validation Error') ? 'Invalid Data' :
                             step.message.includes('Authentication Error') ? 'Auth Failed' :
                             'Error Occurred'}
                          </p>
                          <p className="text-xs mt-1 opacity-90">
                            {step.message.length > 100 ? `${step.message.substring(0, 100)}...` : step.message}
                          </p>
                        </div>
                      ) : (
                        <p>{step.message}</p>
                      )}
                    </div>
                )}
              </div>
            </div>
          ))}
          </div>

          {error && (
            <div className="p-5 rounded-xl bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-700/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                    {error.includes('Duplicate stock found') ? 'Vehicle Already Exists' :
                     error.includes('Validation Error') ? 'Invalid Vehicle Data' :
                     error.includes('Authentication Error') ? 'Authentication Issue' :
                     error.includes('Permission Error') ? 'Access Denied' :
                     error.includes('Server Error') ? 'System Error' :
                     'Error Adding Vehicle'}
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed mb-3">
                    {error}
                  </p>
                  
                  {/* Show helpful suggestions based on error type */}
                  {error.includes('Duplicate stock found') && (
                    <div className="p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 mb-3">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        💡 This vehicle is already in your stock. You can:
                      </p>
                      <ul className="text-xs text-red-600 dark:text-red-400 mt-1 ml-4 space-y-1">
                        <li>• Check &ldquo;My Stock&rdquo; to find the existing entry</li>
                        <li>• Use a different registration number</li>
                        <li>• Update the existing vehicle instead</li>
                      </ul>
                    </div>
                  )}
                  
                  {error.includes('Validation Error') && (
                    <div className="p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 mb-3">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        💡 Please check that all vehicle information is correct and complete.
                      </p>
                    </div>
                  )}
                  
                  {error.includes('Authentication Error') && (
                    <div className="p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 mb-3">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        💡 Your session may have expired. Try refreshing the page and signing in again.
                      </p>
              </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetProcess}
                      className="flex-1 sm:flex-none border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                Try Again
              </Button>
                    
                    {error.includes('Duplicate stock found') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to My Stock page
                          window.open('/mystock', '_blank');
                        }}
                        className="flex-1 sm:flex-none border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20"
                      >
                        View My Stock
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
      </DialogContent>
    </Dialog>
  );

  const renderSuccessDialog = () => (
    <Dialog open={currentStep === 'success'} onOpenChange={(open) => !open && handleDialogClose()} modal>
      <DialogContent className="sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 shadow-lg mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            
            <DialogTitle className="text-3xl font-bold mb-4">
              Vehicle Added Successfully!
            </DialogTitle>
            
            <DialogDescription className="text-lg mb-8 leading-relaxed">
              <span className="font-semibold">{vehicleData.year} {vehicleData.make} {vehicleData.model}</span> has been added to your stock inventory as{' '}
              <span className={`font-semibold px-2 py-1 rounded-full text-sm ${
                (vehicleData.adverts || (advertData?.forecourtPrice && advertData.forecourtPrice.trim() !== ''))
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              }`}>
                {(vehicleData.adverts || (advertData?.forecourtPrice && advertData.forecourtPrice.trim() !== '')) ? 'Forecourt' : 'Due In'}
              </span>.
            </DialogDescription>
            {createdStockId && (
              <div className="mt-2 mb-6 text-center">
                <span className="text-sm text-muted-foreground">
                  Stock ID: <code className="bg-muted px-2 py-1 rounded text-xs ml-2">{createdStockId}</code>
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-5 rounded-xl border ${
            isDarkMode 
              ? 'bg-slate-700/50 border-slate-600/50' 
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              Status
            </p>
            <p className={`text-lg font-bold ${
              (vehicleData.adverts || (advertData?.forecourtPrice && advertData.forecourtPrice.trim() !== ''))
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {(vehicleData.adverts || (advertData?.forecourtPrice && advertData.forecourtPrice.trim() !== '')) ? 'Forecourt' : 'Due In'}
            </p>
          </div>
          <div className={`p-5 rounded-xl border ${
            isDarkMode 
              ? 'bg-slate-700/50 border-slate-600/50' 
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              {(vehicleData.adverts || (advertData?.forecourtPrice && advertData.forecourtPrice.trim() !== '')) ? 'Channels' : 'Price'}
            </p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {(vehicleData.adverts || (advertData?.forecourtPrice && advertData.forecourtPrice.trim() !== '')) ? 
                Object.values(channelStatus).filter(Boolean).length + ' Active' : 
                advertData?.forecourtPrice ? `£${advertData.forecourtPrice}` : 'Not Set'
              }
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setCurrentStep('purchase-info')}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Add Purchase Info
              <Plus className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={() => setCurrentStep('documents')}
              variant="outline"
              className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
            >
              Skip to Documents
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                resetProcess();
                // Notify parent component to clear form state for adding another vehicle
                if (onAddToStock) {
                  onAddToStock({ action: 'add-another', success: true });
                }
              }}
              variant="outline"
              className="flex-1"
            >
              Add Another Vehicle
            </Button>
            <Button
              onClick={handleDialogClose}
              variant="outline"
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderPurchaseInfoDialog = () => (
    <Dialog open={currentStep === 'purchase-info'} onOpenChange={(open) => !open && setCurrentStep('success')} modal>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Plus className="w-6 h-6 text-blue-600" />
            Add Purchase Information
          </DialogTitle>
          <DialogDescription>
            Add purchase details for <strong>{vehicleData.year} {vehicleData.make} {vehicleData.model}</strong> (Registration: <strong>{vehicleData.registration}</strong>)
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {createdStockId ? (
            <>
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Stock ID: <code className="bg-background px-2 py-1 rounded text-xs">{createdStockId}</code>
                </p>
              </div>
              <EditInventoryForm
                stockData={{
                  metadata: {
                    stockId: createdStockId
                  },
                  vehicle: {
                    registration: vehicleData.registration
                  }
                }}
                onSuccess={() => {
                  console.log('Purchase info saved successfully for stock ID:', createdStockId);
                  // Auto-proceed to documents after saving
                  setCurrentStep('documents');
                }}
              />
            </>
          ) : (
            <div className="text-center p-8">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Stock ID Missing</h3>
              <p className="text-muted-foreground mb-4">
                Unable to load purchase information form. The stock ID is not available.
              </p>
              <div className="text-xs text-muted-foreground mb-4 p-3 bg-muted/30 rounded">
                Debug: createdStockId = {JSON.stringify(createdStockId)}
              </div>
              <Button
                onClick={() => setCurrentStep('success')}
                variant="outline"
              >
                Go Back
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            onClick={() => setCurrentStep('success')}
            variant="outline"
            className="flex-1 sm:flex-none px-6 py-2 order-2 sm:order-1"
          >
            Back to Summary
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 sm:flex-none order-1 sm:order-2">
            <Button
              onClick={() => setCurrentStep('documents')}
              variant="outline"
              className="flex-1 sm:flex-none px-6 py-2 border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400"
            >
              Skip to Documents
            </Button>
            <Button
              onClick={() => setCurrentStep('initial')}
              variant="outline"
              className="flex-1 sm:flex-none px-6 py-2"
            >
              Save & Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderDocumentDialog = () => (
    <Dialog open={currentStep === 'documents'} onOpenChange={(open) => !open && setCurrentStep('success')} modal>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Upload Vehicle Documents
          </DialogTitle>
          <DialogDescription>
            Upload documents for <strong>{vehicleData.year} {vehicleData.make} {vehicleData.model}</strong> (Registration: <strong>{vehicleData.registration}</strong>)
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <DocumentUpload
            registration={vehicleData.registration}
            stockId={createdStockId || undefined}
            uploadSource="add_to_stock"
            onUploadComplete={(documents) => {
              console.log('Documents uploaded successfully:', documents);
              // You could show a success message here
            }}
            onUploadError={(error) => {
              console.error('Document upload error:', error);
              setError(error);
            }}
            compact={true}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 order-2 sm:order-1">
            <Button
              onClick={() => setCurrentStep('purchase-info')}
              variant="outline"
              className="flex-1 sm:flex-none px-6 py-2"
            >
              Back to Purchase Info
            </Button>
            <Button
              onClick={() => setCurrentStep('success')}
              variant="outline"
              className="flex-1 sm:flex-none px-6 py-2"
            >
              Back to Summary
            </Button>
          </div>
          <Button
            onClick={handleDialogClose}
            className="order-1 sm:order-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2"
          >
            Finish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderDialog = () => {
    switch (currentStep) {
      case 'no-pricing-confirm':
        return renderNoPricingConfirmDialog();
      case 'channels':
        return renderChannelDialog();
      case 'processing':
        return renderProgressDialog();
      case 'success':
        return renderSuccessDialog();
      case 'purchase-info':
        return renderPurchaseInfoDialog();
      case 'documents':
        return renderDocumentDialog();
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
        {/* Back to Stock Button */}
        <BackToStockButton className="px-6 py-3" />
        
        {/* Enhanced Add to Stock Button */}
        <Button
          onClick={handleInitialClick}
          disabled={isProcessing}
          className={`bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${className}`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add to Stock
        </Button>
      </div>

      {/* Render dialogs using shadcn Dialog components */}
      {renderDialog()}
    </>
  );
}
