"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { CheckCircle, ChevronDown, ChevronUp, Star } from "lucide-react";

interface FeaturesTabProps {
  stockData: any;
}

interface FeaturesByCategory {
  [category: string]: any[];
}

export default function FeaturesTab({ stockData }: FeaturesTabProps) {
  const { isDarkMode } = useTheme();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const features = stockData.features || [];
  const highlights = stockData.highlights || [];

  // Group features by category
  const featuresByCategory: FeaturesByCategory = features.reduce((acc: FeaturesByCategory, feature: any) => {
    const category = feature.category || 'Other Features';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {});

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Features & Highlights</h2>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Vehicle Highlights */}
        {highlights.length > 0 && (
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-sm`}>
            <h3 className="text-lg font-semibold mb-4">
              Vehicle Highlights ({highlights.length})
            </h3>
            <ul className="space-y-2">
              {highlights.map((highlight: any, index: number) => (
                <li key={index} className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-2 fill-current" />
                  <span className={isDarkMode ? 'text-white' : 'text-gray-700'}>
                    {highlight.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feature Categories */}
        {Object.keys(featuresByCategory).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
              <div
                key={category}
                className={`border rounded-lg ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                } shadow-sm`}
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className={`w-full flex items-center justify-between p-4 text-left hover:bg-opacity-50 transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <h4 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {category} <span className="text-sm font-normal">({categoryFeatures.length})</span>
                  </h4>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className={`h-5 w-5 ${
                      isDarkMode ? 'text-white' : 'text-gray-500'
                    }`} />
                  ) : (
                    <ChevronDown className={`h-5 w-5 ${
                      isDarkMode ? 'text-white' : 'text-gray-500'
                    }`} />
                  )}
                </button>

                {/* Category Content */}
                {expandedCategories.has(category) && (
                  <div className={`px-4 pb-4 border-t ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {categoryFeatures.map((feature: any, index: number) => (
                        <div
                          key={index}
                          className={`flex items-center p-2 rounded-lg ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span className={`text-sm ${
                            isDarkMode ? 'text-white' : 'text-gray-700'
                          }`}>
                            {feature.name}
                          </span>
                          {feature.rarityRating && (
                            <span className={`ml-2 px-1 py-0.5 text-xs rounded ${
                              feature.rarityRating === 'Rare'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {feature.rarityRating}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={`p-8 text-center rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-sm`}>
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Features Listed</h3>
            <p className="text-gray-500 dark:text-white">
              No features have been specified for this vehicle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}