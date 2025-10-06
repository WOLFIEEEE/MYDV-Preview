"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Circle, 
  Settings, 
  Star, 
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Feature {
  name: string;
  genericName?: string;
  type: 'Standard' | 'Optional';
  category: string;
  basicPrice: number;
  vatPrice: number;
  factoryCodes?: string[];
  rarityRating?: number | null;
  valueRating?: number | null;
}

interface VehicleFeaturesProps {
  vehicleData: {
    registration?: string;
    features?: Feature[];
    [key: string]: unknown;
  };
  onFeaturesChange?: (selectedFeatures: Feature[]) => void;
  className?: string;
}

export default function VehicleFeatures({ 
  vehicleData, 
  onFeaturesChange, 
  className = "" 
}: VehicleFeaturesProps) {
  const { isDarkMode } = useTheme();
  const [selectedOptionalFeatures, setSelectedOptionalFeatures] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Extract features from vehicle data with memoization
  const allFeatures = useMemo(() => {
    // Debug: Log what VehicleFeatures component receives
    console.log('🎯 VehicleFeatures Component - Received Data:', {
      hasVehicleData: !!vehicleData,
      vehicleDataKeys: vehicleData ? Object.keys(vehicleData) : [],
      hasFeatures: !!vehicleData?.features,
      featuresType: typeof vehicleData?.features,
      featuresLength: vehicleData?.features?.length || 0,
      featuresIsArray: Array.isArray(vehicleData?.features),
      registration: vehicleData?.registration
    });
    
    return vehicleData.features || [];
  }, [vehicleData.features]);
  
  const standardFeatures = useMemo(() => 
    allFeatures.filter(f => f.type === 'Standard'), 
    [allFeatures]
  );
  
  const optionalFeatures = useMemo(() => 
    allFeatures.filter(f => f.type === 'Optional'), 
    [allFeatures]
  );

  // Group features by category with memoization
  const groupedStandardFeatures = useMemo(() => {
    return standardFeatures.reduce((acc, feature) => {
      const category = feature.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(feature);
      return acc;
    }, {} as Record<string, Feature[]>);
  }, [standardFeatures]);

  const groupedOptionalFeatures = useMemo(() => {
    return optionalFeatures.reduce((acc, feature) => {
      const category = feature.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(feature);
      return acc;
    }, {} as Record<string, Feature[]>);
  }, [optionalFeatures]);

  // Memoize the selected features calculation
  const selectedFeatures = useMemo(() => {
    // Always include all standard features
    const standardFeaturesArray = standardFeatures;
    
    // Include only selected optional features
    const selectedOptionalFeaturesArray = optionalFeatures.filter(feature => 
      selectedOptionalFeatures.has(feature.name)
    );
    
    // Combine both arrays
    return [...standardFeaturesArray, ...selectedOptionalFeaturesArray];
  }, [standardFeatures, optionalFeatures, selectedOptionalFeatures]);

  // Get selected features for parent component with useCallback to prevent infinite re-renders
  const stableOnFeaturesChange = useCallback(onFeaturesChange || (() => {}), [onFeaturesChange]);
  
  useEffect(() => {
    // Debug: Log selected features being passed to parent
    console.log('🎯 VehicleFeatures - Passing to parent:', {
      totalFeatures: selectedFeatures.length,
      standardCount: standardFeatures.length,
      optionalSelectedCount: selectedOptionalFeatures.size,
      selectedFeatureNames: selectedFeatures.map(f => f.name),
      standardFeatureNames: standardFeatures.map(f => f.name),
      selectedOptionalNames: Array.from(selectedOptionalFeatures)
    });
    
    stableOnFeaturesChange(selectedFeatures);
  }, [selectedFeatures, stableOnFeaturesChange, standardFeatures, selectedOptionalFeatures]);

  const toggleOptionalFeature = (featureName: string) => {
    const newSelected = new Set(selectedOptionalFeatures);
    if (newSelected.has(featureName)) {
      newSelected.delete(featureName);
    } else {
      newSelected.add(featureName);
    }
    setSelectedOptionalFeatures(newSelected);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAllOptionalFeatures = () => {
    setSelectedOptionalFeatures(new Set(optionalFeatures.map(f => f.name)));
  };

  const clearAllOptionalFeatures = () => {
    setSelectedOptionalFeatures(new Set());
  };

  const renderFeatureItem = (feature: Feature, isOptional: boolean = false) => {
    const isSelected = isOptional ? selectedOptionalFeatures.has(feature.name) : true;
    
    return (
      <div
        key={feature.name}
        className={`flex items-start gap-2 p-3 rounded-lg transition-all duration-200 ${
          isOptional 
            ? `cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : ''
              }`
            : 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
        }`}
        onClick={isOptional ? () => toggleOptionalFeature(feature.name) : undefined}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isOptional ? (
            isSelected ? (
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Circle className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            )
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-medium text-sm leading-tight ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                {feature.name}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge 
                  variant={feature.type === 'Standard' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {feature.type}
                </Badge>
                
                {feature.rarityRating && feature.rarityRating > 7 && (
                  <Star className="w-3 h-3 text-amber-500" />
                )}
              </div>
            </div>
            {feature.genericName && feature.genericName !== feature.name && (
              <p className={`text-xs ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                {feature.genericName}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCategorySection = (
    title: string, 
    features: Record<string, Feature[]>, 
    isOptional: boolean = false
  ) => {
    const categories = Object.keys(features);
    const visibleCategories = showAllCategories ? categories : categories.slice(0, 3);
    
    if (categories.length === 0) {
      return (
        <div className={`text-center py-8 ${
          isDarkMode ? 'text-white' : 'text-slate-500'
        }`}>
          <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No {title.toLowerCase()} available for this vehicle</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {visibleCategories.map(category => {
          const categoryFeatures = features[category];
          const isExpanded = expandedCategories.has(category);
          const visibleFeatures = isExpanded ? categoryFeatures : categoryFeatures.slice(0, 6);
          
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  {category} ({categoryFeatures.length})
                </h4>
                {categoryFeatures.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategory(category)}
                    className="text-xs"
                  >
                    {isExpanded ? (
                      <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
                    ) : (
                      <>Show All <ChevronDown className="w-3 h-3 ml-1" /></>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleFeatures.map(feature => renderFeatureItem(feature, isOptional))}
              </div>
            </div>
          );
        })}
        
        {categories.length > 3 && (
          <Button
            variant="outline"
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="w-full"
          >
            {showAllCategories ? (
              <>Show Less Categories <ChevronUp className="w-4 h-4 ml-2" /></>
            ) : (
              <>Show All {categories.length} Categories <ChevronDown className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        )}
      </div>
    );
  };

  if (allFeatures.length === 0) {
    return (
      <Card className={`${className} ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Vehicle Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-center py-8 ${
            isDarkMode ? 'text-white' : 'text-slate-500'
          }`}>
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No feature information available for this vehicle</p>
            <p className="text-sm mt-1">Features will be loaded when available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Vehicle Features
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {standardFeatures.length} Standard (Auto-included)
            </Badge>
            {optionalFeatures.length > 0 && (
              <Badge variant="secondary">
                {selectedOptionalFeatures.size}/{optionalFeatures.length} Optional Selected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Standard Features Info */}
        <div className={`p-4 rounded-lg border ${
          isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <h3 className={`font-semibold ${
                isDarkMode ? 'text-green-200' : 'text-green-800'
              }`}>
                Standard Features Included
              </h3>
              <p className={`text-sm ${
                isDarkMode ? 'text-green-300' : 'text-green-700'
              }`}>
                {standardFeatures.length} standard features will be automatically added to your vehicle
              </p>
            </div>
          </div>
        </div>

        {/* Optional Features Section */}
        {optionalFeatures.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                Optional Features
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllOptionalFeatures}
                  disabled={selectedOptionalFeatures.size === optionalFeatures.length}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllOptionalFeatures}
                  disabled={selectedOptionalFeatures.size === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>
            {renderCategorySection("optional features", groupedOptionalFeatures, true)}
          </div>
        ) : (
          <div className={`text-center py-8 ${
            isDarkMode ? 'text-white' : 'text-slate-500'
          }`}>
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No optional features available for this vehicle</p>
          </div>
        )}

        {/* Summary */}
        <div className={`p-4 rounded-lg ${
          isDarkMode ? 'bg-slate-700' : 'bg-slate-50'
        }`}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                Standard Features (Auto-included):
              </span>
              <span className={`font-semibold ${
                isDarkMode ? 'text-green-200' : 'text-green-800'
              }`}>
                {standardFeatures.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                Optional Features Selected:
              </span>
              <span className={`font-semibold ${
                isDarkMode ? 'text-blue-200' : 'text-blue-800'
              }`}>
                {selectedOptionalFeatures.size}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  Total Features:
                </span>
                <span className={`font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  {standardFeatures.length + selectedOptionalFeatures.size}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
