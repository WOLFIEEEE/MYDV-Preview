"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, CheckCircle, AlertCircle } from "lucide-react";
import { updateAdvertiserInfo, getAdvertiserId, showNotification, type AdvertiserData } from "@/lib/stockEditingApi";

interface AdvertiserTabProps {
  stockData: any;
  stockId?: string;
  onSave?: (data: any) => void;
}

export default function AdvertiserTab({ stockData, stockId, onSave }: AdvertiserTabProps) {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    segment: '',
    website: '',
    phone: '',
    location: {
      addressLineOne: '',
      town: '',
      county: '',
      region: '',
      postCode: '',
      latitude: '',
      longitude: ''
    },
    advertStrapline: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Populate form data from stock data
  useEffect(() => {
    if (stockData?.advertiser) {
      const advertiser = stockData.advertiser;
      setFormData({
        name: advertiser.name || '',
        segment: advertiser.segment || '',
        website: advertiser.website || '',
        phone: advertiser.phone || '',
        location: {
          addressLineOne: advertiser.location?.addressLineOne || '',
          town: advertiser.location?.town || '',
          county: advertiser.location?.county || '',
          region: advertiser.location?.region || '',
          postCode: advertiser.location?.postCode || '',
          latitude: advertiser.location?.latitude?.toString() || '',
          longitude: advertiser.location?.longitude?.toString() || ''
        },
        advertStrapline: advertiser.advertStrapline || ''
      });
    }
  }, [stockData]);

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('location.')) {
      const locationField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Updating advertiser:', formData);
      
      // TODO: Implement API call
      if (onSave) {
        onSave(formData);
      }

      alert('Advertiser details updated successfully!');
    } catch (error) {
      console.error('Error updating advertiser:', error);
      alert('Failed to update advertiser details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const FormField = ({ 
    label, 
    field, 
    type = "text", 
    placeholder = "",
    required = false,
    step
  }: {
    label: string;
    field: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    step?: string;
  }) => {
    const value = field.includes('.') 
      ? formData.location[field.split('.')[1] as keyof typeof formData.location]
      : formData[field as keyof typeof formData];

    return (
      <div className="space-y-2">
        <label htmlFor={field} className={`block text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={type}
          id={field}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
            isDarkMode
              ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          }`}
        />
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Advertiser Details Section */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Advertiser Details
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Name"
                field="name"
                placeholder="Enter advertiser name"
                required
              />
              
              <FormField
                label="Segment"
                field="segment"
                placeholder="e.g., Independent, Franchise"
              />
              
              <FormField
                label="Website"
                field="website"
                type="url"
                placeholder="https://example.com"
              />
              
              <FormField
                label="Phone"
                field="phone"
                type="tel"
                placeholder="Enter phone number"
              />
            </div>

            {/* Location Fields */}
            <div className="mt-6">
              <h4 className={`text-lg font-medium mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Location
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Address Line One"
                  field="location.addressLineOne"
                  placeholder="Street address"
                />
                
                <FormField
                  label="Town"
                  field="location.town"
                  placeholder="Town/City"
                />
                
                <FormField
                  label="County"
                  field="location.county"
                  placeholder="County"
                />
                
                <FormField
                  label="Region"
                  field="location.region"
                  placeholder="Region"
                />
                
                <FormField
                  label="Post Code"
                  field="location.postCode"
                  placeholder="Post code"
                />
                
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Latitude"
                    field="location.latitude"
                    type="number"
                    placeholder="Latitude"
                  />
                  
                  <FormField
                    label="Longitude"
                    field="location.longitude"
                    type="number"
                    placeholder="Longitude"
                  />
                </div>
              </div>
            </div>

            {/* Advert Strapline */}
            <div className="mt-6">
              <FormField
                label="Advert Strapline"
                field="advertStrapline"
                placeholder="Enter advert strapline"
              />
            </div>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Updating...' : 'Update Advertiser'}
          </Button>
        </div>
      </form>
    </div>
  );
}