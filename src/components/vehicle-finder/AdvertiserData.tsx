"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface AdvertiserDataProps {
  defaultExpanded?: boolean;
  onDataChange?: (data: {
    advertiserId?: string;
    name?: string;
    website?: string;
    phone?: string;
    strapline?: string;
    addressLine1?: string;
    town?: string;
    county?: string;
    postcode?: string;
  }) => void;
  initialData?: {
    advertiserId?: string;
    name?: string;
    website?: string;
    phone?: string;
    strapline?: string;
    addressLine1?: string;
    town?: string;
    county?: string;
    postcode?: string;
  };
}

export default function AdvertiserData({ 
  defaultExpanded = false, 
  onDataChange,
  initialData 
}: AdvertiserDataProps) {
  const { isDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [formData, setFormData] = useState({
    advertiserId: initialData?.advertiserId || "10028737",
    name: initialData?.name || "",
    website: initialData?.website || "",
    phone: initialData?.phone || "",
    strapline: initialData?.strapline || "",
    addressLine1: initialData?.addressLine1 || "",
    town: initialData?.town || "",
    county: initialData?.county || "",
    postcode: initialData?.postcode || ""
  });

  const handleInputChange = (field: string, value: string) => {
    const updatedData = {
      ...formData,
      [field]: value
    };
    setFormData(updatedData);
    
    // Notify parent component of data changes
    onDataChange?.(updatedData);
  };

  return (
    <Card className={`border shadow-lg rounded-xl ${
      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <CardContent className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <Building className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Advertiser Data
            </h3>
          </div>
          <Button variant="ghost" size="sm" className="p-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="mt-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Basic Information
              </h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Advertiser ID
                  </label>
                  <input
                    type="text"
                    value={formData.advertiserId}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-md ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-gray-400' 
                        : 'bg-gray-100 border-gray-300 text-gray-600'
                    } cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Advertiser Name"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="http://www.example.com"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(01234) 567890"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Advert Strapline
                </label>
                <input
                  type="text"
                  value={formData.strapline}
                  onChange={(e) => handleInputChange('strapline', e.target.value)}
                  placeholder="Call to arrange viewing"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Location
              </h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                    placeholder="123 Street"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Town
                  </label>
                  <input
                    type="text"
                    value={formData.town}
                    onChange={(e) => handleInputChange('town', e.target.value)}
                    placeholder="Town"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    County
                  </label>
                  <input
                    type="text"
                    value={formData.county}
                    onChange={(e) => handleInputChange('county', e.target.value)}
                    placeholder="County"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => handleInputChange('postcode', e.target.value)}
                    placeholder="AB1 2CD"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Data Collection Notice */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <p className={`text-sm text-center ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                ✓ Advertiser data will be included when adding to stock
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
