"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, Plus, X, CheckCircle, AlertCircle } from "lucide-react";
import { updateStockFeatures, getAdvertiserId, showNotification, type Feature } from "@/lib/stockEditingApi";

interface FeaturesTabProps {
  stockData: any;
  stockId?: string;
  onSave?: (data: any) => void;
}

interface LocalFeature {
  name: string;
  type: 'Standard' | 'Optional' | 'Custom';
  category: string;
  checked: boolean;
}

const featureCategories = [
  'Audio and Communications',
  'Drivers Assistance', 
  'Exterior',
  'Illumination',
  'Interior',
  'Performance',
  'Safety and Security'
];

const sampleFeatures: LocalFeature[] = [
  // Audio and Communications
  { name: "2 x USB Charging Ports and 1 x AUX-IN", type: "Standard", category: "Audio and Communications", checked: true },
  { name: "8 Passive Speakers", type: "Standard", category: "Audio and Communications", checked: true },
  { name: "Bluetooth Interface", type: "Standard", category: "Audio and Communications", checked: true },
  { name: "DAB Digital Radio", type: "Standard", category: "Audio and Communications", checked: true },
  
  // Drivers Assistance
  { name: "Cruise Control", type: "Standard", category: "Drivers Assistance", checked: true },
  { name: "Tyre Pressure Monitoring System", type: "Standard", category: "Drivers Assistance", checked: true },
  { name: "Voice Control", type: "Standard", category: "Drivers Assistance", checked: true },
  
  // Exterior
  { name: "18in Alloy Wheels", type: "Standard", category: "Exterior", checked: true },
  { name: "Electric Windows - Front and Rear", type: "Standard", category: "Exterior", checked: true },
  { name: "Body Coloured Door Mirrors", type: "Standard", category: "Exterior", checked: true },
  
  // Interior
  { name: "Dual-Zone Electronic Climate Control", type: "Standard", category: "Interior", checked: true },
  { name: "LED Interior Light Package", type: "Standard", category: "Interior", checked: true },
  { name: "Leather Steering Wheel", type: "Standard", category: "Interior", checked: true },
  
  // Safety and Security
  { name: "6-Airbag System", type: "Standard", category: "Safety and Security", checked: true },
  { name: "Anti-Theft Alarm", type: "Standard", category: "Safety and Security", checked: true },
  { name: "Electronic Stability Control", type: "Standard", category: "Safety and Security", checked: true },
];

export default function FeaturesTab({ stockData, stockId, onSave }: FeaturesTabProps) {
  const { isDarkMode } = useTheme();
  const [features, setFeatures] = useState<LocalFeature[]>(sampleFeatures);
  const [activeCategory, setActiveCategory] = useState('all');
  const [customFeatures, setCustomFeatures] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Populate features from stock data
  useEffect(() => {
    if (stockData?.features) {
      // TODO: Map actual features from stock data
      console.log('Stock features:', stockData.features);
    }
  }, [stockData]);

  const handleFeatureToggle = (featureName: string) => {
    setFeatures(prev => prev.map(feature => 
      feature.name === featureName 
        ? { ...feature, checked: !feature.checked }
        : feature
    ));
  };

  const handleCustomFeatureChange = (index: number, value: string) => {
    setCustomFeatures(prev => prev.map((feature, i) => 
      i === index ? value : feature
    ));
  };

  const addCustomFeature = () => {
    setCustomFeatures(prev => [...prev, '']);
  };

  const removeCustomFeature = (index: number) => {
    if (customFeatures.length > 1) {
      setCustomFeatures(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stockId) {
      setSaveStatus('error');
      setSaveMessage('Stock ID is required');
      return;
    }

    const advertiserId = getAdvertiserId(stockData);
    if (!advertiserId) {
      setSaveStatus('error');
      setSaveMessage('Advertiser ID is required');
      return;
    }

    setSaveStatus('saving');
    setSaveMessage('Saving features...');
    setIsLoading(true);

    try {
      const selectedFeatures = features.filter(f => f.checked);
      const validCustomFeatures = customFeatures.filter(f => f.trim() !== '');
      
      // Combine standard and custom features into API format
      const allFeatures: Feature[] = [
        ...selectedFeatures.map(f => ({
          name: f.name,
          type: f.type,
          standardName: f.name,
          category: f.category,
          rarityRating: null,
          valueRating: null
        })),
        ...validCustomFeatures.map(name => ({
          name,
          type: 'Optional',
          standardName: name,
          category: 'Custom Features',
          rarityRating: null,
          valueRating: null
        }))
      ];

      const result = await updateStockFeatures(stockId, advertiserId, allFeatures);
      
      if (result.success) {
        setSaveStatus('success');
        setSaveMessage(result.message || 'Features updated successfully!');
        showNotification(result.message || 'Features updated successfully!', 'success');
        
        if (onSave) {
          onSave({
            features: selectedFeatures,
            customFeatures: validCustomFeatures
          });
        }
      } else {
        setSaveStatus('error');
        setSaveMessage(result.message || 'Failed to update features');
        showNotification(result.message || 'Failed to update features', 'error');
      }
    } catch (error) {
      console.error('Error updating features:', error);
      setSaveStatus('error');
      setSaveMessage('An unexpected error occurred. Please try again.');
      showNotification('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsLoading(false);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 5000);
    }
  };

  const filteredFeatures = activeCategory === 'all' 
    ? features 
    : features.filter(f => f.category === activeCategory);

  const getFeatureTypeColor = (type: string) => {
    switch (type) {
      case 'Standard':
        return isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800';
      case 'Optional':
        return isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800';
      case 'Custom':
        return isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800';
      default:
        return isDarkMode ? 'bg-gray-900/30 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Features Section */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Vehicle Features
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            {/* Category Navigation */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Features
                </button>
                {featureCategories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Features Display */}
            <div className="space-y-6">
              {activeCategory === 'all' ? (
                // Group by category when showing all
                featureCategories.map(category => {
                  const categoryFeatures = features.filter(f => f.category === category);
                  if (categoryFeatures.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-4">
                      <h4 className={`text-lg font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categoryFeatures.map(feature => (
                          <label
                            key={feature.name}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                              feature.checked
                                ? isDarkMode
                                  ? 'bg-blue-900/20 border-blue-600'
                                  : 'bg-blue-50 border-blue-300'
                                : isDarkMode
                                ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={feature.checked}
                              onChange={() => handleFeatureToggle(feature.name)}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium block truncate ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {feature.name}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                                getFeatureTypeColor(feature.type)
                              }`}>
                                {feature.type}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show single category
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredFeatures.map(feature => (
                    <label
                      key={feature.name}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        feature.checked
                          ? isDarkMode
                            ? 'bg-blue-900/20 border-blue-600'
                            : 'bg-blue-50 border-blue-300'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={feature.checked}
                        onChange={() => handleFeatureToggle(feature.name)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium block truncate ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {feature.name}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                          getFeatureTypeColor(feature.type)
                        }`}>
                          {feature.type}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Custom Features Section */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Custom Features
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="space-y-4">
              {customFeatures.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleCustomFeatureChange(index, e.target.value)}
                    placeholder="Enter custom feature"
                    className={`flex-1 px-3 py-2 border rounded-md transition-colors duration-200 ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                  {customFeatures.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCustomFeature(index)}
                      className="p-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addCustomFeature}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Feature
              </Button>
            </div>
          </Card>
        </div>

        {/* Status Message */}
        {saveStatus !== 'idle' && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            saveStatus === 'success' 
              ? isDarkMode ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200'
              : saveStatus === 'error'
              ? isDarkMode ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'
              : isDarkMode ? 'bg-blue-900/20 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {saveStatus === 'success' && <CheckCircle className="h-4 w-4" />}
            {saveStatus === 'error' && <AlertCircle className="h-4 w-4" />}
            {saveStatus === 'saving' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>}
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isLoading || saveStatus === 'saving'}
            className={`flex items-center gap-2 ${
              saveStatus === 'success' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved Successfully
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Update Features
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}