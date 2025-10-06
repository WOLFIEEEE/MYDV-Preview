import { useState, useCallback } from 'react';

interface AddressData {
  street: string;
  address2?: string;
  city: string;
  county: string;
  postCode: string;
  country: string;
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

interface UseAddressAutocompleteProps {
  initialAddress?: Partial<AddressData>;
  onAddressChange?: (address: AddressData) => void;
}

export function useAddressAutocomplete({ 
  initialAddress = {}, 
  onAddressChange 
}: UseAddressAutocompleteProps = {}) {
  const [addressData, setAddressData] = useState<AddressData>({
    street: initialAddress.street || '',
    address2: initialAddress.address2 || '',
    city: initialAddress.city || '',
    county: initialAddress.county || '',
    postCode: initialAddress.postCode || '',
    country: initialAddress.country || 'United Kingdom'
  });

  const [searchQuery, setSearchQuery] = useState('');

  const handleAddressSelect = useCallback((parsedAddress: ParsedAddress) => {
    const newAddressData: AddressData = {
      street: parsedAddress.streetName + (parsedAddress.streetNumber ? ` ${parsedAddress.streetNumber}` : ''),
      address2: addressData.address2, // Keep existing address2
      city: parsedAddress.city,
      county: parsedAddress.county,
      postCode: parsedAddress.postcode,
      country: parsedAddress.country || 'United Kingdom'
    };

    setAddressData(newAddressData);
    setSearchQuery(parsedAddress.fullAddress);
    
    if (onAddressChange) {
      onAddressChange(newAddressData);
    }
  }, [addressData.address2, onAddressChange]);

  const updateAddressField = useCallback((field: keyof AddressData, value: string) => {
    const newAddressData = { ...addressData, [field]: value };
    setAddressData(newAddressData);
    
    if (onAddressChange) {
      onAddressChange(newAddressData);
    }
  }, [addressData, onAddressChange]);

  const resetAddress = useCallback(() => {
    const emptyAddress: AddressData = {
      street: '',
      address2: '',
      city: '',
      county: '',
      postCode: '',
      country: 'United Kingdom'
    };
    setAddressData(emptyAddress);
    setSearchQuery('');
    
    if (onAddressChange) {
      onAddressChange(emptyAddress);
    }
  }, [onAddressChange]);

  return {
    addressData,
    searchQuery,
    setSearchQuery,
    handleAddressSelect,
    updateAddressField,
    resetAddress
  };
}
