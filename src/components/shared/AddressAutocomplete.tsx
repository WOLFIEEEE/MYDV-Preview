'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface AddressPrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceDetails {
  address_components: AddressComponent[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface ParsedAddress {
  streetNumber: string;
  streetName: string;
  city: string;
  county: string;
  country: string;
  postcode: string;
  fullAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  showLabel?: boolean;
  initialValue?: string;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  onAddressSelect,
  placeholder = "Start typing an address...",
  className = "",
  label = "Search Address",
  showLabel = true,
  initialValue = "",
  disabled = false
}: AddressAutocompleteProps) {
  const { isDarkMode } = useTheme();
  const [query, setQuery] = useState(initialValue);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update query when initialValue changes
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const searchAddresses = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      setShowNoResults(false);
      return;
    }

    setLoading(true);
    setShowNoResults(false);
    
    try {
      const response = await fetch(`/api/address/autocomplete?input=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.status === 'OK') {
        const predictions = data.predictions || [];
        setPredictions(predictions);
        setShowPredictions(predictions.length > 0);
        setShowNoResults(predictions.length === 0 && searchQuery.trim().length >= 3);
      } else {
        setPredictions([]);
        setShowPredictions(false);
        
        // Handle different API error statuses
        if (data.status === 'ZERO_RESULTS') {
          // Show no results message for user
          setShowNoResults(true);
          console.log('No address matches found for:', searchQuery);
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          console.warn('Google Maps API quota exceeded');
          setShowNoResults(false);
        } else if (data.status === 'REQUEST_DENIED') {
          console.error('Google Maps API request denied - check API key and permissions');
          setShowNoResults(false);
        } else if (data.status === 'INVALID_REQUEST') {
          console.error('Invalid request to Google Maps API');
          setShowNoResults(false);
        } else {
          console.error('Address API Error:', data.status, data.error_message || 'Unknown error');
          setShowNoResults(false);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setPredictions([]);
      setShowPredictions(false);
      setShowNoResults(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 300);
  };

  // Get place details and parse address
  const getPlaceDetails = async (placeId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/address/details?place_id=${placeId}`);
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const placeDetails: PlaceDetails = data.result;
        const parsedAddress = parseAddressComponents(placeDetails);
        
        setQuery(parsedAddress.fullAddress);
        setShowPredictions(false);
        setShowNoResults(false);
        onAddressSelect(parsedAddress);
      } else {
        console.error('Place details error:', data.status, data.error_message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Parse address components into structured format
  const parseAddressComponents = (placeDetails: PlaceDetails): ParsedAddress => {
    const components = placeDetails.address_components;
    
    const getComponent = (types: string[]) => {
      const component = components.find(comp => 
        types.some(type => comp.types.includes(type))
      );
      return component?.long_name || '';
    };

    // Enhanced postcode extraction - try multiple postcode types
    const getPostcode = () => {
      // First try full postal_code
      let postcode = getComponent(['postal_code']);
      
      // If no full postcode, try postal_code_prefix (like SE1, NW1, etc.)
      if (!postcode) {
        postcode = getComponent(['postal_code_prefix']);
      }
      
      // If still no postcode, try to extract from formatted_address
      if (!postcode && placeDetails.formatted_address) {
        // UK postcode regex pattern (e.g., "SW1A 1AA", "M1 1AA", "B33 8TH")
        const postcodeMatch = placeDetails.formatted_address.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})\b/i);
        if (postcodeMatch) {
          postcode = postcodeMatch[1];
        } else {
          // Try to match postal code prefix pattern (e.g., "SE1", "NW1")
          const prefixMatch = placeDetails.formatted_address.match(/\b([A-Z]{1,2}[0-9][A-Z]?)\b/i);
          if (prefixMatch) {
            postcode = prefixMatch[1];
          }
        }
      }
      
      return postcode;
    };

    return {
      streetNumber: getComponent(['street_number']),
      streetName: getComponent(['route']),
      city: getComponent(['postal_town', 'locality']),
      county: getComponent(['administrative_area_level_2']),
      country: getComponent(['country']),
      postcode: getPostcode(),
      fullAddress: placeDetails.formatted_address,
      coordinates: {
        lat: placeDetails.geometry.location.lat,
        lng: placeDetails.geometry.location.lng
      }
    };
  };

  // Handle prediction selection
  const handlePredictionSelect = (prediction: AddressPrediction) => {
    getPlaceDetails(prediction.place_id);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setShowPredictions(false);
    setPredictions([]);
    setShowNoResults(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const baseInputClass = `w-full px-4 py-3 pr-20 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
    isDarkMode 
      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500 placeholder-slate-400' 
      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 placeholder-gray-500'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  const labelClass = `text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`;

  return (
    <div className={`space-y-2 ${className}`} ref={dropdownRef}>
      {showLabel && (
        <label className={labelClass}>
          <MapPin className="inline h-4 w-4 mr-2" />
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          disabled={disabled}
          className={baseInputClass}
          autoComplete="off"
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          {query && !disabled && (
            <button
              type="button"
              onClick={clearSearch}
              className={`p-1 rounded-full hover:bg-gray-100 ${isDarkMode ? 'hover:bg-slate-700' : ''}`}
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <Search className="h-4 w-4 text-gray-400" />
        </div>

        {/* Predictions dropdown */}
        {(showPredictions && predictions.length > 0) && !disabled && (
          <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-600' 
              : 'bg-white border-gray-300'
          }`}>
            {predictions.map((prediction) => (
              <div
                key={prediction.place_id}
                className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-slate-700 border-slate-600 text-slate-100' 
                    : 'hover:bg-gray-50 border-gray-100 text-gray-900'
                }`}
                onClick={() => handlePredictionSelect(prediction)}
              >
                <div className="font-medium text-sm">
                  {prediction.structured_formatting.main_text}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  {prediction.structured_formatting.secondary_text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {showNoResults && !disabled && (
          <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-600' 
              : 'bg-white border-gray-300'
          }`}>
            <div className={`px-4 py-3 text-center ${
              isDarkMode ? 'text-white' : 'text-gray-500'
            }`}>
              <div className="text-sm">No UK addresses found</div>
              <div className="text-xs mt-1">
                Try including a house number or check your spelling
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
