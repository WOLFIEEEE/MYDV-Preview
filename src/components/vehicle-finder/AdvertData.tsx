"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface AdvertDataProps {
  defaultExpanded?: boolean;
  onDataChange?: (data: {
    forecourtPrice?: string;
    forecourtPriceVatStatus?: string;
    attentionGrabber?: string;
    description?: string;
  }) => void;
  initialData?: {
    forecourtPrice?: string;
    forecourtPriceVatStatus?: string;
    attentionGrabber?: string;
    description?: string;
  };
}

export default function AdvertData({ 
  defaultExpanded = false,
  onDataChange,
  initialData 
}: AdvertDataProps) {
  const { isDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [formData, setFormData] = useState({
    forecourtPrice: initialData?.forecourtPrice || "",
    forecourtPriceVatStatus: initialData?.forecourtPriceVatStatus || "No VAT",
    attentionGrabber: initialData?.attentionGrabber || "",
    description: initialData?.description || ""
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

  const handleSaveTemplate = () => {
    // Mock save template functionality
    console.log("Saving template:", formData.description);
  };

  const handleEditTemplates = () => {
    // Mock edit templates functionality
    console.log("Opening template editor");
  };

  const handleInsertTemplate = () => {
    // Mock insert template functionality
    const template = "This exceptional vehicle comes with full service history and is in pristine condition. Features include premium interior, advanced safety systems, and excellent fuel economy. Perfect for both city driving and long journeys.";
    const updatedData = {
      ...formData,
      description: template
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
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <Megaphone className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Adverts Data
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
            {/* Pricing Information */}
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Pricing Information
              </h4>
              <div className="max-w-md">
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Listing Price (£)
                </label>
                <input
                  type="text"
                  value={formData.forecourtPrice}
                  onChange={(e) => handleInputChange('forecourtPrice', e.target.value)}
                  placeholder="e.g. 10498"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              
              <div className="max-w-md">
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  VAT Status
                </label>
                <select
                  value={formData.forecourtPriceVatStatus}
                  onChange={(e) => handleInputChange('forecourtPriceVatStatus', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="No VAT">No VAT</option>
                  <option value="Ex VAT">Ex VAT</option>
                  <option value="Inc VAT">Inc VAT</option>
                </select>
              </div>
            </div>

            {/* Advert Details */}
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Advert Details
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Attention Grabber
                  </label>
                  <input
                    type="text"
                    value={formData.attentionGrabber}
                    onChange={(e) => handleInputChange('attentionGrabber', e.target.value)}
                    placeholder="e.g. Low Mileage, One Owner"
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter vehicle description here..."
                    maxLength={4000}
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <small className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                      {formData.description.length}/4000 characters
                    </small>
                  </div>
                </div>

                {/* Template Controls */}
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <select 
                      className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode 
                          ? 'bg-slate-700 border-slate-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Insert description template…</option>
                      <option value="cars">Cars</option>
                      <option value="vans">Vans</option>
                    </select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleInsertTemplate}
                    >
                      Insert
                    </Button>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSaveTemplate}
                    >
                      Save as Template
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleEditTemplates}
                    >
                      Edit Templates
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Collection Notice */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <p className={`text-sm text-center ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                ✓ Advert data will be included when adding to stock
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
