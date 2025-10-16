"use client";

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface AddressPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressComponents {
  firstLine: string;
  secondLine?: string;
  city: string;
  county: string;
  postCode: string;
  country: string;
}

interface AddressAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: AddressComponents) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  label = "Address Line 1",
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  required = false,
  className = "",
  disabled = false
}: AddressAutocompleteProps) {
  const { isDarkMode } = useTheme();
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search for address predictions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value.length >= 3) {
        fetchPredictions(value);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  // Fetch address predictions from your API
  const fetchPredictions = async (input: string) => {
    if (input.length < 3) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/address/autocomplete?input=${encodeURIComponent(input)}`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      
      const data = await response.json();
      
      if (data.predictions && Array.isArray(data.predictions)) {
        setPredictions(data.predictions.slice(0, 5)); // Limit to 5 suggestions
        setShowDropdown(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Get detailed address information from place ID
  const getAddressDetails = async (placeId: string) => {
    try {
      const response = await fetch(`/api/address/details?place_id=${placeId}`);
      
      if (!response.ok) throw new Error('Failed to fetch place details');
      
      const data = await response.json();
      
      if (data.result && data.result.address_components) {
        return parseAddressComponents(data.result.address_components, data.result.formatted_address);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
    
    return null;
  };

  // Parse Google's address components into our format
  const parseAddressComponents = (components: any[], formattedAddress: string): AddressComponents => {
    const addressMap: { [key: string]: string } = {};
    
    components.forEach((component: any) => {
      const types = component.types;
      const value = component.long_name;
      
      if (types.includes('street_number')) {
        addressMap.street_number = value;
      } else if (types.includes('route')) {
        addressMap.route = value;
      } else if (types.includes('subpremise')) {
        addressMap.subpremise = value;
      } else if (types.includes('postal_town') || types.includes('locality')) {
        addressMap.city = value;
      } else if (types.includes('administrative_area_level_2')) {
        addressMap.county = value;
      } else if (types.includes('postal_code')) {
        addressMap.postCode = value;
      } else if (types.includes('country')) {
        addressMap.country = value;
      }
    });

    // Construct the first line (street number + route)
    let firstLine = '';
    if (addressMap.street_number && addressMap.route) {
      firstLine = `${addressMap.street_number} ${addressMap.route}`;
    } else if (addressMap.route) {
      firstLine = addressMap.route;
    } else {
      // Fallback: use the first part of formatted address
      firstLine = formattedAddress.split(',')[0] || '';
    }

    return {
      firstLine: firstLine.trim(),
      secondLine: addressMap.subpremise || '',
      city: addressMap.city || '',
      county: addressMap.county || '',
      postCode: addressMap.postCode || '',
      country: addressMap.country || 'United Kingdom'
    };
  };

  // Handle prediction selection
  const handlePredictionSelect = async (prediction: AddressPrediction) => {
    onChange(prediction.structured_formatting.main_text);
    setShowDropdown(false);
    setPredictions([]);
    
    // Get detailed address information
    if (onAddressSelect) {
      const addressDetails = await getAddressDetails(prediction.place_id);
      if (addressDetails) {
        onAddressSelect(addressDetails);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handlePredictionSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const inputClassName = `w-full px-4 py-3 pr-10 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-blue-500/20'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  const dropdownClassName = `absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border rounded-xl shadow-lg backdrop-blur-sm ${
    isDarkMode 
      ? 'bg-slate-800/95 border-slate-700/50' 
      : 'bg-white/95 border-slate-200'
  }`;

  return (
    <div ref={containerRef} className="relative space-y-2">
      {label && (
        <Label className={`block text-sm font-semibold ${
          isDarkMode ? 'text-white' : 'text-slate-700'
        }`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <MapPin className="h-4 w-4" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClassName} pl-10`}
        />
        
        {isLoading && (
          <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown with predictions */}
      {showDropdown && predictions.length > 0 && (
        <div ref={dropdownRef} className={dropdownClassName}>
          {predictions.map((prediction, index) => (
            <div
              key={prediction.place_id}
              onClick={() => handlePredictionSelect(prediction)}
              className={`px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                index === selectedIndex
                  ? isDarkMode 
                    ? 'bg-slate-700/50 border-slate-600/50' 
                    : 'bg-blue-50 border-blue-200/50'
                  : isDarkMode
                    ? 'hover:bg-slate-700/30 border-slate-700/30'
                    : 'hover:bg-slate-50 border-slate-200/30'
              }`}
            >
              <div className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {prediction.structured_formatting.main_text}
              </div>
              <div className={`text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {prediction.structured_formatting.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}