'use client';

import { useTheme } from '@/contexts/ThemeContext';
import AddressAutocomplete from './AddressAutocomplete';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';

interface AddressData {
  street: string;
  address2?: string;
  city: string;
  county: string;
  postCode: string;
  country: string;
}

interface AddressFormSectionProps {
  addressData: AddressData;
  onAddressChange: (address: AddressData) => void;
  errors?: Record<string, string>;
  fieldPrefix?: string;
  showTitle?: boolean;
  title?: string;
  className?: string;
  disabled?: boolean;
}

export default function AddressFormSection({
  addressData,
  onAddressChange,
  errors = {},
  fieldPrefix = 'address',
  showTitle = true,
  title = "Address",
  className = "",
  disabled = false
}: AddressFormSectionProps) {
  const { isDarkMode } = useTheme();
  
  const {
    searchQuery,
    handleAddressSelect,
    updateAddressField
  } = useAddressAutocomplete({
    initialAddress: addressData,
    onAddressChange
  });

  const getFieldError = (field: string) => {
    return errors[`${fieldPrefix}.${field}`] || errors[field];
  };

  const inputBaseClass = `w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
    isDarkMode 
      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500 placeholder-slate-400' 
      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 placeholder-gray-500'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  const labelClass = `text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`;

  const getInputClass = (field: string) => {
    const hasError = getFieldError(field);
    return `${inputBaseClass} ${hasError ? 'border-red-500' : ''}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <legend className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {title}
        </legend>
      )}
      
      {/* Address Search */}
      <AddressAutocomplete
        onAddressSelect={handleAddressSelect}
        placeholder="Try including house number for better postcode results..."
        initialValue={searchQuery}
        disabled={disabled}
        showLabel={true}
        label="Search Address"
      />
      
      {/* Helpful tip */}
      <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} mt-1`}>
        💡 Tip: Type at least 3 characters. Include a house number (e.g., "123 Abbey Road London") for more accurate postcode results
      </div>

      {/* Manual Address Fields */}
      <div className="space-y-4">
        {/* Street Address */}
        <div className="space-y-2">
          <label className={labelClass}>
            Street Address *
          </label>
          <input
            type="text"
            value={addressData.street}
            onChange={(e) => updateAddressField('street', e.target.value)}
            className={getInputClass('street')}
            placeholder="123 Main Street"
            disabled={disabled}
          />
          {getFieldError('street') && (
            <p className="text-xs text-red-500">{getFieldError('street')}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="space-y-2">
          <label className={labelClass}>
            Address Line 2
          </label>
          <input
            type="text"
            value={addressData.address2 || ''}
            onChange={(e) => updateAddressField('address2', e.target.value)}
            className={inputBaseClass}
            placeholder="Apartment, suite, etc."
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* City */}
          <div className="space-y-2">
            <label className={labelClass}>
              City *
            </label>
            <input
              type="text"
              value={addressData.city}
              onChange={(e) => updateAddressField('city', e.target.value)}
              className={getInputClass('city')}
              placeholder="London"
              disabled={disabled}
            />
            {getFieldError('city') && (
              <p className="text-xs text-red-500">{getFieldError('city')}</p>
            )}
          </div>

          {/* County */}
          <div className="space-y-2">
            <label className={labelClass}>
              County
            </label>
            <input
              type="text"
              value={addressData.county}
              onChange={(e) => updateAddressField('county', e.target.value)}
              className={inputBaseClass}
              placeholder="Greater London"
              disabled={disabled}
            />
          </div>

          {/* Post Code */}
          <div className="space-y-2">
            <label className={labelClass}>
              Post Code *
            </label>
            <input
              type="text"
              value={addressData.postCode}
              onChange={(e) => updateAddressField('postCode', e.target.value)}
              className={getInputClass('postCode')}
              placeholder="SW1A 1AA"
              disabled={disabled}
            />
            {getFieldError('postCode') && (
              <p className="text-xs text-red-500">{getFieldError('postCode')}</p>
            )}
          </div>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <label className={labelClass}>
            Country
          </label>
          <input
            type="text"
            value={addressData.country}
            onChange={(e) => updateAddressField('country', e.target.value)}
            className={`${inputBaseClass} ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}
            disabled={true}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
