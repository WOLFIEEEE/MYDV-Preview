'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import TaxonomyService, { TaxonomyParams } from '@/services/taxonomy';
import { 
  Make, 
  Model, 
  Generation,
  Derivative, 
  TaxonomyItem,
  VehicleType,
  BodyType,
  FuelType,
  TransmissionType
} from '@/types/autotrader';

// Search parameters interface
interface TaxonomySearchParams {
  make?: string;
  model?: string;
  year?: string;
  fuelType?: string;
  bodyType?: string;
  priceMin?: string;
  priceMax?: string;
  mileageMax?: string;
}

interface TaxonomyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (params: TaxonomySearchParams) => void;
  isLoading: boolean;
}

type TaxonomyStep = 'vehicleTypes' | 'makes' | 'models' | 'generations' | 'derivatives' | 'specifications';

export default function TaxonomyDialog({ isOpen, onClose, onSearch, isLoading }: TaxonomyDialogProps) {
  const [currentStep, setCurrentStep] = useState<TaxonomyStep>('vehicleTypes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  
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
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const [selectedMake, setSelectedMake] = useState<Make | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [selectedDerivative, setSelectedDerivative] = useState<Derivative | null>(null);

  const taxonomyService = new TaxonomyService();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('vehicleTypes');
      setSelectedVehicleType(null);
      setSelectedMake(null);
      setSelectedModel(null);
      setSelectedGeneration(null);
      setSelectedDerivative(null);
      setError(null);
      loadVehicleTypes();
    }
  }, [isOpen]);

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

  const loadMakes = async (vehicleType?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: TaxonomyParams = vehicleType ? { vehicleType } : {};
      const data = await taxonomyService.getMakes(params);
      setMakes(data);
      console.log('✅ Makes loaded:', data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load makes');
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async (makeId: string, vehicleType?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: TaxonomyParams = vehicleType ? { vehicleType } : {};
      const data = await taxonomyService.getModels(makeId, params);
      setModels(data);
      console.log('✅ Models loaded:', data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const loadGenerations = async (modelId: string, vehicleType?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: TaxonomyParams = vehicleType ? { vehicleType } : {};
      const data = await taxonomyService.getGenerations(modelId, params);
      setGenerations(data);
      console.log('✅ Generations loaded:', data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load generations');
    } finally {
      setLoading(false);
    }
  };

  const loadDerivatives = async (generationId: string, vehicleType?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: TaxonomyParams = vehicleType ? { vehicleType } : {};
      const data = await taxonomyService.getDerivatives(generationId, params);
      setDerivatives(data);
      console.log('✅ Derivatives loaded:', data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load derivatives');
    } finally {
      setLoading(false);
    }
  };

  const loadSpecifications = async (vehicleType?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: TaxonomyParams = vehicleType ? { vehicleType } : {};
      const specs = await taxonomyService.getAllSpecifications(params);
      setBodyTypes(specs.bodyTypes);
      setFuelTypes(specs.fuelTypes);
      setTransmissionTypes(specs.transmissionTypes);
      console.log('✅ Specifications loaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load specifications');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleTypeSelect = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType);
    setCurrentStep('makes');
    loadMakes(vehicleType.name);
  };

  const handleMakeSelect = (make: Make) => {
    setSelectedMake(make);
    setCurrentStep('models');
    if (make.makeId) {
      loadModels(make.makeId, selectedVehicleType?.name);
    }
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
    setCurrentStep('generations');
    if (model.modelId) {
      loadGenerations(model.modelId, selectedVehicleType?.name);
    }
  };

  const handleGenerationSelect = (generation: Generation) => {
    setSelectedGeneration(generation);
    setCurrentStep('derivatives');
    if (generation.generationId) {
      loadDerivatives(generation.generationId, selectedVehicleType?.name);
    }
  };

  const handleDerivativeSelect = (derivative: Derivative) => {
    setSelectedDerivative(derivative);
    setCurrentStep('specifications');
    loadSpecifications(selectedVehicleType?.name);
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'makes':
        setCurrentStep('vehicleTypes');
        setSelectedVehicleType(null);
        break;
      case 'models':
        setCurrentStep('makes');
        setSelectedMake(null);
        break;
      case 'generations':
        setCurrentStep('models');
        setSelectedModel(null);
        break;
      case 'derivatives':
        setCurrentStep('generations');
        setSelectedGeneration(null);
        break;
      case 'specifications':
        setCurrentStep('derivatives');
        setSelectedDerivative(null);
        break;
    }
  };

  const handleSearch = () => {
    const searchParams: TaxonomySearchParams = {
      make: selectedMake?.name,
      model: selectedModel?.name,
      // Add other selected parameters as needed
    };
    onSearch(searchParams);
    onClose();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'vehicleTypes': return 'Select Vehicle Type';
      case 'makes': return 'Select Vehicle Make';
      case 'models': return 'Select Vehicle Model';
      case 'generations': return 'Select Generation';
      case 'derivatives': return 'Select Derivative';
      case 'specifications': return 'Vehicle Specifications';
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 'vehicleTypes': return '🚗';
      case 'makes': return '🏭';
      case 'models': return '🚙';
      case 'generations': return '📅';
      case 'derivatives': return '⚙️';
      case 'specifications': return '📊';
    }
  };

  const getBreadcrumb = () => {
    const items = [];
    if (selectedVehicleType) items.push(selectedVehicleType.name);
    if (selectedMake) items.push(selectedMake.name);
    if (selectedModel) items.push(selectedModel.name);
    if (selectedGeneration) items.push(selectedGeneration.name);
    if (selectedDerivative) items.push(selectedDerivative.name);
    return items.join(' > ');
  };

  const getStepNumber = () => {
    const steps = ['vehicleTypes', 'makes', 'models', 'generations', 'derivatives', 'specifications'];
    return steps.indexOf(currentStep) + 1;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getStepIcon()}</span>
              <div>
                <h2 className="text-xl font-bold">{getStepTitle()}</h2>
                {getBreadcrumb() && (
                  <p className="text-purple-100 text-sm mt-1">{getBreadcrumb()}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              {['vehicleTypes', 'makes', 'models', 'generations', 'derivatives', 'specifications'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === currentStep ? 'bg-white text-purple-600 scale-110' :
                    getStepNumber() > index + 1
                      ? 'bg-purple-400 text-white' : 'bg-purple-300 text-purple-600'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 5 && <div className={`w-8 h-1 mx-1 transition-all ${
                    getStepNumber() > index + 1 ? 'bg-purple-400' : 'bg-purple-300'
                  }`}></div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className={`border rounded-lg p-4 mb-6 ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-700 text-red-300' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex">
                <span className="text-red-400 text-xl">⚠️</span>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold">Error</h3>
                  <p className="text-sm mt-1">{error}</p>
                  <Button
                    onClick={() => {
                      setError(null);
                      if (currentStep === 'vehicleTypes') loadVehicleTypes();
                    }}
                    className="mt-2 text-xs"
                    variant="outline"
                    size="sm"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Loading...</span>
              </div>
            </div>
          ) : (
            <div>
              {/* Vehicle Types Step */}
              {currentStep === 'vehicleTypes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicleTypes.map((type) => (
                    <button
                      key={type.name}
                      onClick={() => handleVehicleTypeSelect(type)}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 text-left hover:scale-105 ${
                        isDarkMode
                          ? 'border-slate-600 bg-slate-700 text-white hover:border-purple-400 hover:bg-purple-900/20'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      <div className="font-semibold">{type.name}</div>
                      <div className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        Type: {type.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Makes Step */}
              {currentStep === 'makes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {makes.map((make) => (
                    <button
                      key={make.makeId}
                      onClick={() => handleMakeSelect(make)}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 text-left hover:scale-105 ${
                        isDarkMode
                          ? 'border-slate-600 bg-slate-700 text-white hover:border-purple-400 hover:bg-purple-900/20'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      <div className="font-semibold">{make.name}</div>
                      <div className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        ID: {make.makeId}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Models Step */}
              {currentStep === 'models' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {models.map((model) => (
                    <button
                      key={model.modelId}
                      onClick={() => handleModelSelect(model)}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 text-left hover:scale-105 ${
                        isDarkMode
                          ? 'border-slate-600 bg-slate-700 text-white hover:border-purple-400 hover:bg-purple-900/20'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      <div className="font-semibold">{model.name}</div>
                      <div className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        ID: {model.modelId}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Generations Step */}
              {currentStep === 'generations' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generations.map((generation) => (
                    <button
                      key={generation.generationId}
                      onClick={() => handleGenerationSelect(generation)}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 text-left hover:scale-105 ${
                        isDarkMode
                          ? 'border-slate-600 bg-slate-700 text-white hover:border-purple-400 hover:bg-purple-900/20'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      <div className="font-semibold">{generation.name}</div>
                      <div className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        ID: {generation.generationId}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Derivatives Step */}
              {currentStep === 'derivatives' && (
                <div className="space-y-3">
                  {derivatives.map((derivative) => (
                    <button
                      key={derivative.derivativeId}
                      onClick={() => handleDerivativeSelect(derivative)}
                      className={`w-full p-4 border-2 rounded-lg transition-all duration-200 text-left hover:scale-[1.02] ${
                        isDarkMode
                          ? 'border-slate-600 bg-slate-700 text-white hover:border-purple-400 hover:bg-purple-900/20'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      <div className="font-semibold">{derivative.name}</div>
                      <div className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        ID: {derivative.derivativeId}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Specifications Step */}
              {currentStep === 'specifications' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Taxonomy Navigation Complete! 🎉
                    </h3>
                    <p className={isDarkMode ? 'text-white' : 'text-gray-600'}>
                      You&apos;ve explored the full taxonomy hierarchy. Here are the specifications available:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Body Types */}
                    <div className={`p-4 rounded-lg ${
                      isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'
                    }`}>
                      <h4 className={`font-semibold mb-3 flex items-center ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-900'
                      }`}>
                        <span className="mr-2">🚗</span>
                        Body Types ({bodyTypes.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {bodyTypes.map((type) => (
                          <div key={type.bodyTypeId || type.name} className={`text-sm p-2 rounded border ${
                            isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                          }`}>
                            <div className="font-medium">{type.name}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                              ID: {type.bodyTypeId || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fuel Types */}
                    <div className={`p-4 rounded-lg ${
                      isDarkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'
                    }`}>
                      <h4 className={`font-semibold mb-3 flex items-center ${
                        isDarkMode ? 'text-green-300' : 'text-green-900'
                      }`}>
                        <span className="mr-2">⛽</span>
                        Fuel Types ({fuelTypes.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {fuelTypes.map((type) => (
                          <div key={type.fuelTypeId || type.name} className={`text-sm p-2 rounded border ${
                            isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                          }`}>
                            <div className="font-medium">{type.name}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                              ID: {type.fuelTypeId || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transmission Types */}
                    <div className={`p-4 rounded-lg ${
                      isDarkMode ? 'bg-orange-900/20 border border-orange-700' : 'bg-orange-50 border border-orange-200'
                    }`}>
                      <h4 className={`font-semibold mb-3 flex items-center ${
                        isDarkMode ? 'text-orange-300' : 'text-orange-900'
                      }`}>
                        <span className="mr-2">⚙️</span>
                        Transmissions ({transmissionTypes.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {transmissionTypes.map((type) => (
                          <div key={type.transmissionTypeId || type.name} className={`text-sm p-2 rounded border ${
                            isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                          }`}>
                            <div className="font-medium">{type.name}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                              ID: {type.transmissionTypeId || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={handleSearch}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                      disabled={isLoading}
                    >
                      🔍 Search with Selected Criteria
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 flex items-center justify-between border-t ${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center space-x-4">
            {currentStep !== 'vehicleTypes' && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <span>←</span>
                <span>Back</span>
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Step {getStepNumber()} of 6
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              className={isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-600' : ''}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { type TaxonomySearchParams };