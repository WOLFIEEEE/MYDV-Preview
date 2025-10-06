'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import TaxonomyService, { TaxonomyParams } from '@/services/taxonomy';
import RegistrationDateCalculator from '@/lib/registrationDateCalculator';
import { 
  Make, 
  Model, 
  Generation,
  Derivative, 
  VehicleType,
  BodyType,
  FuelType,
  TransmissionType
} from '@/types/autotrader';
import { 
  ChevronDown, 
  Search, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  ArrowRight,
  Car,
  Truck,
  Bike,
  Building2,
  Factory,
  Home,
  Tractor,
  CheckCircle,
  Circle,
  Filter,
  Calendar,
  Hash,
  Fuel,
  Gauge,
  Settings,
  X
} from 'lucide-react';

// Search parameters interface
interface TaxonomySearchParams {
  vehicleType?: string;
  make?: string;
  makeId?: string;
  model?: string;
  modelId?: string;
  generation?: string;
  generationId?: string;
  derivative?: string;
  derivativeId?: string;
  bodyType?: string;
  fuelType?: string;
  transmissionType?: string;
  priceMin?: string;
  priceMax?: string;
  mileageMax?: string;
  year?: string;
  plate?: string;
}

interface TaxonomyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (params: TaxonomySearchParams) => void;
  isLoading: boolean;
}

type WizardStep = 'vehicleType' | 'make' | 'model' | 'generation' | 'trim' | 'engineSize' | 'fuelType' | 'derivative' | 'year' | 'mileage' | 'specifications' | 'filters' | 'plate';

export default function TaxonomyWizard({ isOpen, onClose, onSearch, isLoading }: TaxonomyWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('vehicleType');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const router = useRouter();
  
  // Data states
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [derivatives, setDerivatives] = useState<Derivative[]>([]);
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [transmissionTypes, setTransmissionTypes] = useState<TransmissionType[]>([]);
  
  // Selection states
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<Make | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [selectedDerivative, setSelectedDerivative] = useState<Derivative | null>(null);
  const [selectedBodyType, setSelectedBodyType] = useState<string>('');
  const [selectedFuelType, setSelectedFuelType] = useState<string>('');
  const [selectedTransmissionType, setSelectedTransmissionType] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [mileageMax, setMileageMax] = useState<string>('');
  
  // Facet selection states
  const [trims, setTrims] = useState<{name: string}[]>([]);
  const [engineSizes, setEngineSizes] = useState<{name: string}[]>([]);
  const [selectedTrim, setSelectedTrim] = useState<string>('');
  const [selectedEngineSize, setSelectedEngineSize] = useState<string>('');
  const [needsFacetSelection, setNeedsFacetSelection] = useState<boolean>(false);
  
  // New taxonomy steps
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedPlate, setSelectedPlate] = useState<string>('');
  const [availablePlates, setAvailablePlates] = useState<string[]>([]);
  const [selectedMileage, setSelectedMileage] = useState<number>(0);

  const taxonomyService = new TaxonomyService();

  // Helper function to generate plate options for a given year
  const getPlateOptionsForYear = (year: number): string[] => {
    if (year < 2001) {
      return [year.toString().slice(-1)]; // Single letter for pre-2001
    }
    
    // Special case for 2001 - only has '51' plate
    if (year === 2001) {
      return ['51'];
    }
    
    // For 2002 onwards, generate the three plate options per year
    const yearSuffix = year.toString().slice(-2);
    const prevYearSuffix = (year - 1).toString().slice(-2);
    
    // January to March: Previous year's September plate
    const janToMarchPlate = (parseInt(prevYearSuffix) + 50).toString().padStart(2, '0');
    
    // March to September: Current year plate
    const marchToSeptPlate = yearSuffix;
    
    // September to December: Current year + 50
    const septToDecPlate = (parseInt(yearSuffix) + 50).toString().padStart(2, '0');
    
    return [janToMarchPlate, marchToSeptPlate, septToDecPlate];
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetWizard();
      loadVehicleTypes();
    }
  }, [isOpen]);

  const resetWizard = () => {
    setCurrentStep('vehicleType');
    setSelectedVehicleType('');
    setSelectedMake(null);
    setSelectedModel(null);
    setSelectedGeneration(null);
    setSelectedDerivative(null);
    setSelectedBodyType('');
    setSelectedFuelType('');
    setSelectedTransmissionType('');
    setPriceMin('');
    setPriceMax('');
    setMileageMax('');
    setSelectedYear(null);
    setSelectedPlate('');
    setAvailablePlates([]);
    setSelectedMileage(0);
    // Reset facet selections
    setTrims([]);
    setEngineSizes([]);
    setSelectedTrim('');
    setSelectedEngineSize('');
    setNeedsFacetSelection(false);
    setError(null);
  };

  const loadVehicleTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taxonomyService.getVehicleTypes();
      setVehicleTypes(data);
      console.log('✅ Vehicle types loaded:', data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicle types');
    } finally {
      setLoading(false);
    }
  };

  const loadMakes = async () => {
    if (!selectedVehicleType) return;
    setLoading(true);
    try {
      const makesData = await taxonomyService.getMakes({ vehicleType: selectedVehicleType });
      setMakes(makesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load makes');
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async (makeId: string) => {
    setLoading(true);
    try {
      const modelsData = await taxonomyService.getModels(makeId, { vehicleType: selectedVehicleType });
      setModels(modelsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const loadGenerations = async (modelId: string) => {
    setLoading(true);
    try {
      const generationsData = await taxonomyService.getGenerations(modelId, { vehicleType: selectedVehicleType });
      setGenerations(generationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load generations');
    } finally {
      setLoading(false);
    }
  };

  const loadDerivatives = async (generationId: string) => {
    setLoading(true);
    try {
      // First, get the initial derivatives count
      const initialDerivatives = await taxonomyService.getDerivatives(generationId, { vehicleType: selectedVehicleType });
      console.log(`📊 Found ${initialDerivatives.length} derivatives for generation`);
      
      // If we have 8 or fewer derivatives, show them directly
      if (initialDerivatives.length <= 8) {
        setDerivatives(initialDerivatives);
        setNeedsFacetSelection(false);
        setCurrentStep('derivative');
        console.log('✅ Perfect count (≤8), showing derivatives directly');
      } else {
        // Too many derivatives, need facet selection
        setNeedsFacetSelection(true);
        setCurrentStep('trim');
        console.log('⚠️ Too many derivatives, showing facet selection first');
        await loadTrims(generationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load derivatives');
    } finally {
      setLoading(false);
    }
  };

  const loadTrims = async (generationId: string) => {
    try {
      const trimsData = await taxonomyService.getTrimsFacets(generationId, { vehicleType: selectedVehicleType });
      setTrims(trimsData);
      console.log(`📋 Loaded ${trimsData.length} trims for selection`);
    } catch (err) {
      console.error('Failed to load trims:', err);
      // If trims fail, try engine sizes
      await loadEngineSizes(generationId);
    }
  };

  const loadEngineSizes = async (generationId: string) => {
    try {
      const engineSizesData = await taxonomyService.getBadgeEngineSizesFacets(generationId, { vehicleType: selectedVehicleType });
      setEngineSizes(engineSizesData);
      console.log(`🔧 Loaded ${engineSizesData.length} engine sizes for selection`);
    } catch (err) {
      console.error('Failed to load engine sizes:', err);
      setError('Failed to load filtering options');
    }
  };

  const loadFilteredDerivatives = async (generationId: string, filters: any = {}) => {
    setLoading(true);
    try {
      const params = { vehicleType: selectedVehicleType, ...filters };
      const derivatives = await taxonomyService.getDerivatives(generationId, params);
      setDerivatives(derivatives);
      console.log(`📊 Loaded ${derivatives.length} filtered derivatives`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filtered derivatives');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleTypeSelect = async (vehicleType: string) => {
    setSelectedVehicleType(vehicleType);
    setCurrentStep('make');
    setLoading(true);
    try {
      const makesData = await taxonomyService.getMakes({ vehicleType });
      setMakes(makesData);
      console.log('✅ Makes loaded:', makesData.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load makes');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeSelect = async (make: Make) => {
    setSelectedMake(make);
    setCurrentStep('model');
    await loadModels(make.makeId);
  };

  const handleModelSelect = async (model: Model) => {
    setSelectedModel(model);
    setCurrentStep('generation');
    await loadGenerations(model.modelId);
  };

  const handleGenerationSelect = async (generation: Generation) => {
    setSelectedGeneration(generation);
    await loadDerivatives(generation.generationId);
    // The next step will be determined in loadDerivatives based on derivative count
  };

  const handleTrimSelect = async (trim: string) => {
    setSelectedTrim(trim);
    if (!selectedGeneration) return;
    
    // Check if we need engine size selection or can go to derivatives
    const filters = { trim };
    const filteredDerivatives = await taxonomyService.getDerivatives(selectedGeneration.generationId, { 
      vehicleType: selectedVehicleType, 
      ...filters 
    });
    
    console.log(`📊 After trim selection: ${filteredDerivatives.length} derivatives`);
    
    if (filteredDerivatives.length <= 8) {
      setDerivatives(filteredDerivatives);
      setCurrentStep('derivative');
    } else {
      setCurrentStep('engineSize');
      await loadEngineSizes(selectedGeneration.generationId);
    }
  };

  const handleEngineSizeSelect = async (engineSize: string) => {
    setSelectedEngineSize(engineSize);
    if (!selectedGeneration) return;
    
    // Check if we need fuel type selection or can go to derivatives
    const filters = { 
      ...(selectedTrim && { trim: selectedTrim }),
      badgeEngineSize: engineSize 
    };
    const filteredDerivatives = await taxonomyService.getDerivatives(selectedGeneration.generationId, { 
      vehicleType: selectedVehicleType, 
      ...filters 
    });
    
    console.log(`📊 After engine size selection: ${filteredDerivatives.length} derivatives`);
    
    if (filteredDerivatives.length <= 8) {
      setDerivatives(filteredDerivatives);
      setCurrentStep('derivative');
    } else {
      setCurrentStep('fuelType');
      // Load fuel types for this generation
      const fuelTypesData = await taxonomyService.getFuelTypes({ vehicleType: selectedVehicleType });
      setFuelTypes(fuelTypesData);
    }
  };

  const handleFuelTypeSelect = async (fuelType: string) => {
    setSelectedFuelType(fuelType);
    if (!selectedGeneration) return;
    
    // Apply all filters and show derivatives
    const filters = { 
      ...(selectedTrim && { trim: selectedTrim }),
      ...(selectedEngineSize && { badgeEngineSize: selectedEngineSize }),
      fuelType 
    };
    await loadFilteredDerivatives(selectedGeneration.generationId, filters);
    setCurrentStep('derivative');
  };

  const handleDerivativeSelect = (derivative: Derivative) => {
    setSelectedDerivative(derivative);
    setCurrentStep('year');
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    const plateOptions = getPlateOptionsForYear(year);
    setAvailablePlates(plateOptions);
    
    // For pre-2001 cars and 2001, only one option, auto-select and proceed
    if (year < 2001 || year === 2001) {
      setSelectedPlate(plateOptions[0]);
      setCurrentStep('mileage');
    } else {
      // For 2002+, show plate selection (3 options)
      setSelectedPlate('');
      setCurrentStep('mileage');
    }
  };

  const handlePlateSelect = (plate: string) => {
    setSelectedPlate(plate);
  };

  const handleMileageSubmit = () => {
    // Navigate to valuation page with all taxonomy data
    const params = new URLSearchParams({
      vehicleType: selectedVehicleType,
      make: selectedMake?.name || '',
      makeId: selectedMake?.makeId || '',
      model: selectedModel?.name || '',
      modelId: selectedModel?.modelId || '',
      ...(selectedGeneration && {
        generation: selectedGeneration.name,
        generationId: selectedGeneration.generationId
      }),
      ...(selectedDerivative && {
        derivative: selectedDerivative.name,
        derivativeId: selectedDerivative.derivativeId
      }),
      year: selectedYear?.toString() || '',
      plate: selectedPlate,
      mileage: selectedMileage.toString(),
    });

    // Close the wizard and navigate to valuation page
    onClose();
    router.push(`/vehicle-finder/valuation?${params.toString()}`);
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'make':
        setCurrentStep('vehicleType');
        setSelectedVehicleType('');
        break;
      case 'model':
        setCurrentStep('make');
        setSelectedMake(null);
        break;
      case 'generation':
        setCurrentStep('model');
        setSelectedModel(null);
        break;
      case 'derivative':
        setCurrentStep('generation');
        setSelectedGeneration(null);
        break;
      case 'year':
        setCurrentStep('derivative');
        setSelectedDerivative(null);
        break;
      case 'mileage':
        setCurrentStep('year');
        setSelectedYear(null);
        setSelectedPlate('');
        setAvailablePlates([]);
        setSelectedMileage(0);
        break;
    }
  };

  const handleNext = () => {
    if (currentStep === 'specifications') {
      setCurrentStep('filters');
    }
  };

  const handleSkipToFilters = () => {
    setCurrentStep('filters');
    // Load specifications if not already loaded
    if (bodyTypes.length === 0) {
      loadSpecifications();
    }
  };

  const loadSpecifications = async () => {
    setLoading(true);
    try {
      const specs = await taxonomyService.getAllSpecifications({ vehicleType: selectedVehicleType });
      setBodyTypes(specs.bodyTypes);
      setFuelTypes(specs.fuelTypes);
      setTransmissionTypes(specs.transmissionTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load specifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Generate plate identifier for the selected year (default to first half of year)
    let plateIdentifier: string | undefined;
    if (selectedYear) {
      const plateIdentifiers = RegistrationDateCalculator.getPlateIdentifiersForYear(selectedYear);
      plateIdentifier = plateIdentifiers.length > 0 ? plateIdentifiers[0] : undefined; // Use first plate identifier (March-August period)
    }
    
    const searchParams: TaxonomySearchParams = {
      vehicleType: selectedVehicleType,
      make: selectedMake?.name,
      makeId: selectedMake?.makeId,
      model: selectedModel?.name,
      modelId: selectedModel?.modelId,
      generation: selectedGeneration?.name,
      generationId: selectedGeneration?.generationId,
      derivative: selectedDerivative?.name,
      derivativeId: selectedDerivative?.derivativeId,
      bodyType: selectedBodyType,
      fuelType: selectedFuelType,
      transmissionType: selectedTransmissionType,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
      mileageMax: mileageMax || undefined,
      year: selectedYear?.toString(),
      plate: plateIdentifier,
    };
    
    console.log('🔍 Taxonomy search params:', searchParams);
    onSearch(searchParams);
    onClose();
  };



  const getVehicleTypeIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'van': return <Truck className="w-4 h-4" />;
      case 'truck': return <Truck className="w-4 h-4" />;
      case 'bike': return <Bike className="w-4 h-4" />;
      case 'motorhome': return <Home className="w-4 h-4" />;
      case 'caravan': return <Home className="w-4 h-4" />;
      case 'plant': return <Tractor className="w-4 h-4" />;
      case 'farm': return <Tractor className="w-4 h-4" />;
      default: return <Car className="w-4 h-4" />;
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 'vehicleType': return <Car className="w-5 h-5" />;
      case 'make': return <Factory className="w-5 h-5" />;
      case 'model': return <Car className="w-5 h-5" />;
      case 'generation': return <Calendar className="w-5 h-5" />;
      case 'trim': return <Filter className="w-5 h-5" />;
      case 'engineSize': return <Gauge className="w-5 h-5" />;
      case 'fuelType': return <Fuel className="w-5 h-5" />;
      case 'derivative': return <Settings className="w-5 h-5" />;
      case 'year': return <Calendar className="w-5 h-5" />;
      case 'plate': return <Hash className="w-5 h-5" />;
      case 'mileage': return <Gauge className="w-5 h-5" />;
      default: return <Search className="w-5 h-5" />;
    }
  };

  const getBreadcrumb = () => {
    const items = [];
    if (selectedVehicleType) items.push(selectedVehicleType);
    if (selectedMake) items.push(selectedMake.name);
    if (selectedModel) items.push(selectedModel.name);
    if (selectedGeneration) items.push(selectedGeneration.name);
    if (selectedDerivative) items.push(selectedDerivative.name);
    return items.join(' > ');
  };

  const getStepNumber = () => {
    const steps = ['vehicleType', 'make', 'model', 'generation', 'derivative', 'year', 'plate', 'mileage'];
    return steps.indexOf(currentStep) + 1;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'vehicleType': return selectedVehicleType !== '';
      case 'make': return selectedMake !== null;
      case 'model': return selectedModel !== null;
      case 'generation': return selectedGeneration !== null;
      case 'derivative': return selectedDerivative !== null;
      case 'specifications': return true; // Can always proceed from specifications
      case 'filters': return true;
      default: return false;
    }
  };

  const canSearch = () => {
    return selectedVehicleType && selectedMake;
  };

  // Helper function to check if a step is completed
  const isStepCompleted = (step: WizardStep) => {
    switch (step) {
      case 'vehicleType': return selectedVehicleType !== '';
      case 'make': return selectedMake !== null;
      case 'model': return selectedModel !== null;
      case 'generation': return selectedGeneration !== null;
      case 'trim': return selectedTrim !== '';
      case 'engineSize': return selectedEngineSize !== '';
      case 'fuelType': return selectedFuelType !== '';
      case 'derivative': return selectedDerivative !== null;
      case 'year': return selectedYear !== null;
      case 'mileage': return selectedMileage > 0 && selectedPlate !== '';
      default: return false;
    }
  };

  // Function to jump to any step
  const jumpToStep = (step: WizardStep) => {
    // Only allow jumping to completed steps or the next available step
    const steps: WizardStep[] = ['vehicleType', 'make', 'model', 'generation', 'derivative', 'year', 'mileage'];
    const stepIndex = steps.indexOf(step);
    const currentIndex = steps.indexOf(currentStep);
    
    // Allow jumping back to any completed step
    if (stepIndex <= currentIndex || isStepCompleted(step)) {
      setCurrentStep(step);
      setError(null); // Clear any errors when navigating
      
      // If jumping to a step that requires data loading, load it
      if (step === 'make' && makes.length === 0 && selectedVehicleType) {
        loadMakes();
      } else if (step === 'model' && models.length === 0 && selectedMake) {
        loadModels(selectedMake.makeId);
      } else if (step === 'generation' && generations.length === 0 && selectedModel) {
        loadGenerations(selectedModel.modelId);
      } else if (step === 'derivative' && derivatives.length === 0 && selectedGeneration) {
        loadDerivatives(selectedGeneration.generationId);
      }
    }
  };

  // Get step title for any step
  const getStepTitle = (step?: WizardStep) => {
    const targetStep = step || currentStep;
    switch (targetStep) {
      case 'vehicleType': return step ? 'Type' : 'Select Vehicle Type';
      case 'make': return step ? 'Make' : 'Select Make';
      case 'model': return step ? 'Model' : 'Select Model';
      case 'generation': return step ? 'Generation' : 'Select Generation';
      case 'trim': return step ? 'Trim' : 'Select Trim';
      case 'engineSize': return step ? 'Engine' : 'Select Engine Size';
      case 'fuelType': return step ? 'Fuel' : 'Select Fuel Type';
      case 'derivative': return step ? 'Derivative' : 'Select Derivative';
      case 'year': return step ? 'Year' : 'Select Year';
      case 'mileage': return step ? 'Mileage' : 'Enter Details';
    }
  };

  // Render compact clickable progress bar
  const renderProgressBar = () => {
    // Dynamic steps based on whether facets are needed
    const steps: WizardStep[] = ['vehicleType', 'make', 'model', 'generation'];
    
    if (needsFacetSelection) {
      // Add facet steps dynamically based on what's available
      if (trims.length > 0) steps.push('trim');
      if (engineSizes.length > 0) steps.push('engineSize');
      if (fuelTypes.length > 0) steps.push('fuelType');
    }
    
    steps.push('derivative', 'year', 'mileage');
    
    const currentIndex = steps.indexOf(currentStep);
    
    return (
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = isStepCompleted(step);
          const isCurrent = step === currentStep;
          const isClickable = index <= currentIndex || isCompleted;
          
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable ? jumpToStep(step) : undefined}
                  disabled={!isClickable}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                    isCompleted
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:scale-105 cursor-pointer'
                      : isCurrent
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md ring-2 ring-blue-200'
                        : isClickable
                          ? isDarkMode 
                            ? 'bg-slate-600 text-slate-300 hover:bg-slate-500 cursor-pointer'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 cursor-pointer'
                          : isDarkMode
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  title={`${getStepTitle(step)} ${isCompleted ? '(Completed - Click to edit)' : isCurrent ? '(Current)' : isClickable ? '(Click to jump)' : '(Complete previous steps first)'}`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                <span className={`text-xs mt-1 font-medium truncate max-w-[60px] ${
                  isCurrent 
                    ? isDarkMode ? 'text-blue-300' : 'text-blue-600'
                    : isCompleted
                      ? isDarkMode ? 'text-green-300' : 'text-green-600'
                      : isDarkMode ? 'text-white' : 'text-gray-500'
                }`}>
                  {getStepTitle(step)}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-200 ${
                  index < currentIndex || isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' : isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9000] p-4">
      <div className={`rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border ${
        isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          isDarkMode ? 'border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800' : 'border-blue-100 bg-gradient-to-r from-blue-50 to-white'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg">
                {getStepIcon()}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {getStepTitle()}
                </h2>
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Step {getStepNumber()} of 7 • Vehicle Search Wizard
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                isDarkMode 
                  ? 'hover:bg-slate-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Compact Progress Steps */}
          {renderProgressBar()}
          
          {/* Breadcrumb */}
          {getBreadcrumb() && (
            <div className={`mt-3 text-xs p-2 rounded-lg ${
              isDarkMode ? 'bg-slate-800 text-gray-300 border border-slate-700' : 'bg-gray-50 text-gray-700 border border-gray-200'
            }`}>
              <span className="font-medium">Path:</span> {getBreadcrumb()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          {error && (
            <div className={`border rounded-lg p-4 mb-6 ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-700 text-red-300' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-semibold">Error</h3>
                  <p className="text-sm mt-1">{error}</p>
                  <Button
                    onClick={() => {
                      setError(null);
                      if (currentStep === 'vehicleType') loadVehicleTypes();
                    }}
                    className="mt-2 text-xs"
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Loading...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Vehicle Type Step */}
              {currentStep === 'vehicleType' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Car className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Select the type of vehicle you're searching for:
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      Vehicle Type
                    </label>
                    <select
                      value={selectedVehicleType}
                      onChange={(e) => handleVehicleTypeSelect(e.target.value)}
                      className={`w-full p-3 border-2 rounded-lg transition-all duration-200 ${
                        isDarkMode
                          ? 'border-slate-600 bg-slate-700 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                          : 'border-gray-300 bg-white text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                      } focus:outline-none`}
                    >
                      <option value="">Choose a vehicle type...</option>
                      {vehicleTypes.map((type) => (
                        <option key={type.name} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Make Step */}
              {currentStep === 'make' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Factory className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Choose the vehicle manufacturer:
                    </p>
                  </div>
                  <div className="relative mb-4">
                    <select
                      value={selectedMake?.makeId || ''}
                      onChange={(e) => {
                        const make = makes.find(m => m.makeId === e.target.value);
                        if (make) handleMakeSelect(make);
                      }}
                      className={`w-full p-4 rounded-lg border-2 appearance-none text-lg ${
                        isDarkMode
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="">Choose a make...</option>
                      {makes.map((make) => (
                        <option key={make.makeId} value={make.makeId}>
                          {make.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none" />
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                    {makes.length} makes available for {selectedVehicleType}
                  </p>
                </div>
              )}

              {/* Model Step */}
              {currentStep === 'model' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Car className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Select the specific model:
                    </p>
                  </div>
                  <div className="relative mb-4">
                    <select
                      value={selectedModel?.modelId || ''}
                      onChange={(e) => {
                        const model = models.find(m => m.modelId === e.target.value);
                        if (model) handleModelSelect(model);
                      }}
                      className={`w-full p-4 rounded-lg border-2 appearance-none text-lg ${
                        isDarkMode
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="">Choose a model...</option>
                      {models.map((model) => (
                        <option key={model.modelId} value={model.modelId}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none" />
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                    {models.length} models available for {selectedMake?.name}
                  </p>
                </div>
              )}

              {/* Generation Step */}
              {currentStep === 'generation' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Choose the vehicle generation:
                    </p>
                  </div>
                  <div className="space-y-3">
                    {generations.map((generation) => (
                      <button
                        key={generation.generationId}
                        onClick={() => handleGenerationSelect(generation)}
                        className={`w-full p-4 border-2 rounded-lg transition-all duration-200 text-left hover:scale-[1.02] ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white hover:border-blue-400 hover:bg-blue-900/20'
                            : 'border-gray-200 bg-white text-gray-900 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        <div className="font-semibold">{generation.name}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <Button
                      onClick={handleSkipToFilters}
                      variant="outline"
                      className="text-sm"
                    >
                      Skip to Filters
                    </Button>
                  </div>
                </div>
              )}

              {/* Trim Selection Step */}
              {currentStep === 'trim' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Filter className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Multiple derivatives available. Please select a trim level to refine your search:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trims.map((trim) => (
                      <button
                        key={trim.name || 'no-trim'}
                        onClick={() => handleTrimSelect(trim.name || '')}
                        className={`p-4 text-left border-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 hover:border-blue-500 text-white'
                            : 'border-gray-200 bg-white hover:border-blue-500 text-gray-900'
                        }`}
                      >
                        <div className="font-semibold">{trim.name || 'Standard'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Engine Size Selection Step */}
              {currentStep === 'engineSize' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Gauge className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Further refinement needed. Please select an engine size:
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {engineSizes.map((engineSize) => (
                      <button
                        key={engineSize.name}
                        onClick={() => handleEngineSizeSelect(engineSize.name)}
                        className={`p-4 text-center border-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 hover:border-blue-500 text-white'
                            : 'border-gray-200 bg-white hover:border-blue-500 text-gray-900'
                        }`}
                      >
                        <div className="font-semibold">{engineSize.name}L</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fuel Type Selection Step */}
              {currentStep === 'fuelType' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Fuel className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Final step: Please select a fuel type to complete your search:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fuelTypes.map((fuelType) => (
                      <button
                        key={fuelType.name}
                        onClick={() => handleFuelTypeSelect(fuelType.name)}
                        className={`p-4 text-left border-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 hover:border-blue-500 text-white'
                            : 'border-gray-200 bg-white hover:border-blue-500 text-gray-900'
                        }`}
                      >
                        <div className="font-semibold">{fuelType.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Derivative Step */}
              {currentStep === 'derivative' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Settings className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Select the specific vehicle configuration:
                    </p>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {derivatives.map((derivative) => (
                      <div
                        key={derivative.derivativeId}
                        className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {derivative.name}
                            </div>
                            {derivative.introduced && (
                              <div className={`text-xs mt-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                                {derivative.introduced} - {derivative.discontinued || 'Present'}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => handleDerivativeSelect(derivative)}
                            className="ml-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <Button
                      onClick={handleSkipToFilters}
                      variant="outline"
                      className="text-sm"
                    >
                      Skip to Filters
                    </Button>
                  </div>
                </div>
              )}

              {/* Year Step */}
              {currentStep === 'year' && (
                <div>
                  <p className={`mb-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Select the year of manufacture:
                  </p>
                  <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto">
                    {/* Generate years from derivative introduction to current year */}
                    {selectedDerivative && (() => {
                      const startYear = selectedDerivative.introduced ? new Date(selectedDerivative.introduced).getFullYear() : 2000;
                      const endYear = selectedDerivative.discontinued ? new Date(selectedDerivative.discontinued).getFullYear() : new Date().getFullYear();
                      const years = [];
                      for (let year = endYear; year >= startYear; year--) {
                        // Generate plate identifier based on year
                        const plateIdentifier = year >= 2001 ? 
                          (year === 2001 ? '51' : 
                           year === 2002 ? '02/52' :
                           year === 2003 ? '03/53' :
                           year === 2004 ? '04/54' :
                           year === 2005 ? '05/55' :
                           year === 2006 ? '06/56' :
                           year === 2007 ? '07/57' :
                           year === 2008 ? '08/58' :
                           year === 2009 ? '09/59' :
                           year === 2010 ? '10/60' :
                           year === 2011 ? '11/61' :
                           year === 2012 ? '12/62' :
                           year === 2013 ? '13/63' :
                           year === 2014 ? '14/64' :
                           year === 2015 ? '15/65' :
                           year === 2016 ? '16/66' :
                           year === 2017 ? '17/67' :
                           year === 2018 ? '18/68' :
                           year === 2019 ? '19/69' :
                           year === 2020 ? '20/70' :
                           year === 2021 ? '21/71' :
                           year === 2022 ? '22/72' :
                           year === 2023 ? '23/73' :
                           year === 2024 ? '24/74' :
                           `${year.toString().slice(-2)}/${(year + 50).toString().slice(-2)}`) : 
                          year.toString().slice(-1);
                        years.push({ year, plateIdentifier });
                      }
                      return years;
                    })().map(({ year }) => (
                      <button
                        key={year}
                        onClick={() => handleYearSelect(year)}
                        className={`p-3 border-2 rounded-lg transition-all duration-200 text-center hover:scale-105 ${
                          selectedYear === year
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : isDarkMode
                              ? 'border-slate-600 bg-slate-700 hover:border-blue-400'
                              : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {year}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mileage Step */}
              {currentStep === 'mileage' && (
                <div>
                  <div className="flex items-center mb-4">
                    <Gauge className="w-5 h-5 mr-2 text-blue-600" />
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Enter vehicle details:
                    </p>
                  </div>
                  
                  {/* Plate Selection (if multiple options) */}
                  {availablePlates.length > 1 && (
                    <div className="mb-6">
                      <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Select Registration Plate for {selectedYear}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {availablePlates.map((plate, index) => {
                          // Determine the period label based on position
                          let periodLabel = '';
                          if (selectedYear && selectedYear >= 2001) {
                            switch (index) {
                              case 0: periodLabel = 'Jan - Mar'; break;
                              case 1: periodLabel = 'Mar - Sep'; break;
                              case 2: periodLabel = 'Sep - Dec'; break;
                            }
                          } else {
                            periodLabel = 'Pre-2001';
                          }
                          
                          return (
                            <button
                              key={plate}
                              onClick={() => handlePlateSelect(plate)}
                              className={`p-4 border-2 rounded-lg transition-all duration-200 text-center ${
                                selectedPlate === plate
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : isDarkMode
                                    ? 'border-slate-600 bg-slate-700 hover:border-blue-400'
                                    : 'border-gray-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {plate}
                              </div>
                              <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                                {periodLabel}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className={`p-6 border-2 rounded-lg ${
                    isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="mb-4">
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Mileage (miles)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedMileage || ''}
                        onChange={(e) => setSelectedMileage(parseInt(e.target.value) || 0)}
                        placeholder="Enter mileage..."
                        className={`w-full px-4 py-3 border-2 rounded-lg text-lg font-medium transition-all duration-200 ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-400 focus:border-blue-500'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      />
                    </div>
                    <Button
                      onClick={handleMileageSubmit}
                      disabled={!selectedMileage || selectedMileage <= 0}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      Get Valuation
                    </Button>
                  </div>
                </div>
              )}

              {/* Specifications Step */}
              {currentStep === 'specifications' && (
                <div>
                  <p className={`mb-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Optional: Select vehicle specifications:
                  </p>
                  <div className="space-y-4">
                    {/* Body Type */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        Body Type
                      </label>
                      <div className="relative">
                        <select
                          value={selectedBodyType}
                          onChange={(e) => setSelectedBodyType(e.target.value)}
                          className={`w-full p-3 rounded-lg border appearance-none ${
                            isDarkMode
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="">Any Body Type</option>
                          {bodyTypes.map((type) => (
                            <option key={type.name} value={type.name}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>

                    {/* Fuel Type */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        Fuel Type
                      </label>
                      <div className="relative">
                        <select
                          value={selectedFuelType}
                          onChange={(e) => setSelectedFuelType(e.target.value)}
                          className={`w-full p-3 rounded-lg border appearance-none ${
                            isDarkMode
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="">Any Fuel Type</option>
                          {fuelTypes.map((type) => (
                            <option key={type.name} value={type.name}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>

                    {/* Transmission Type */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        Transmission
                      </label>
                      <div className="relative">
                        <select
                          value={selectedTransmissionType}
                          onChange={(e) => setSelectedTransmissionType(e.target.value)}
                          className={`w-full p-3 rounded-lg border appearance-none ${
                            isDarkMode
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="">Any Transmission</option>
                          {transmissionTypes.map((type) => (
                            <option key={type.name} value={type.name}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters Step */}
              {currentStep === 'filters' && (
                <div>
                  <p className={`mb-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Optional: Set price and mileage filters:
                  </p>
                  <div className="space-y-4">
                    {/* Price Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                          Min Price (£)
                        </label>
                        <input
                          type="number"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          placeholder="0"
                          className={`w-full p-3 rounded-lg border ${
                            isDarkMode
                              ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                          Max Price (£)
                        </label>
                        <input
                          type="number"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          placeholder="100000"
                          className={`w-full p-3 rounded-lg border ${
                            isDarkMode
                              ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>

                    {/* Max Mileage */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        Max Mileage
                      </label>
                      <input
                        type="number"
                        value={mileageMax}
                        onChange={(e) => setMileageMax(e.target.value)}
                        placeholder="100000"
                        className={`w-full p-3 rounded-lg border ${
                          isDarkMode
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {currentStep !== 'vehicleType' && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className={isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-600' : ''}
              >
                Cancel
              </Button>
              
              {(currentStep !== 'vehicleType' && canSearch()) && (
                <Button
                  onClick={handleSearch}
                  disabled={!canSearch() || isLoading}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { type TaxonomySearchParams };
