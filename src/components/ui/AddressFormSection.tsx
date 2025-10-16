"use client";

import AddressAutocomplete from './AddressAutocomplete';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface AddressComponents {
  firstLine: string;
  secondLine?: string;
  city: string;
  county: string;
  postCode: string;
  country: string;
}

interface AddressFormSectionProps {
  address: {
    firstLine: string;
    secondLine?: string;
    city?: string;
    county?: string;
    postCode: string;
    country: string;
  };
  onAddressChange: (field: string, value: string) => void;
  className?: string;
  title?: string;
  showTitle?: boolean;
}

// Simple FormInput component for this specific use case
const SimpleFormInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required = false 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string; 
  required?: boolean; 
}) => {
  const { isDarkMode } = useTheme();
  
  const inputClassName = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-blue-500/20'
  }`;

  return (
    <div className="space-y-2">
      <Label className={`block text-sm font-semibold ${
        isDarkMode ? 'text-white' : 'text-slate-700'
      }`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );
};

export default function AddressFormSection({
  address,
  onAddressChange,
  className = "",
  title = "Address Information",
  showTitle = true
}: AddressFormSectionProps) {
  const { isDarkMode } = useTheme();

  const handleAutocompleteSelect = (addressComponents: AddressComponents) => {
    // Auto-fill all address fields when user selects from dropdown
    onAddressChange('firstLine', addressComponents.firstLine);
    onAddressChange('secondLine', addressComponents.secondLine || '');
    onAddressChange('city', addressComponents.city);
    onAddressChange('county', addressComponents.county);
    onAddressChange('postCode', addressComponents.postCode);
    onAddressChange('country', addressComponents.country);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <h4 className={`font-medium flex items-center ${
          isDarkMode ? 'text-white' : 'text-slate-900'
        }`}>
          <MapPin className="h-4 w-4 mr-2" />
          {title}
        </h4>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Address Line 1 with Autocomplete */}
        <div className="md:col-span-2">
          <AddressAutocomplete
            label="Address Line 1"
            value={address.firstLine}
            onChange={(value: string) => onAddressChange('firstLine', value)}
            onAddressSelect={handleAutocompleteSelect}
            placeholder="Start typing your address..."
            required
          />
        </div>

        {/* Address Line 2 - Manual input */}
        <div className="md:col-span-2">
          <SimpleFormInput
            label="Address Line 2"
            value={address.secondLine || ''}
            onChange={(value: string) => onAddressChange('secondLine', value)}
            placeholder="Apartment, suite, unit, etc. (optional)"
          />
        </div>

        {/* City */}
        <SimpleFormInput
          label="City"
          value={address.city || ''}
          onChange={(value: string) => onAddressChange('city', value)}
          placeholder="City"
        />

        {/* County */}
        <SimpleFormInput
          label="County"
          value={address.county || ''}
          onChange={(value: string) => onAddressChange('county', value)}
          placeholder="County"
        />

        {/* Post Code */}
        <SimpleFormInput
          label="Post Code"
          value={address.postCode}
          onChange={(value: string) => onAddressChange('postCode', value)}
          placeholder="Post Code"
          required
        />

        {/* Country */}
        <SimpleFormInput
          label="Country"
          value={address.country}
          onChange={(value: string) => onAddressChange('country', value)}
          placeholder="Country"
        />
      </div>
    </div>
  );
}