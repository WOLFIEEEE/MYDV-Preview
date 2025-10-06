"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Calendar,
  Clock,
  MapPin,
  Upload,
  Save,
  RotateCcw,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  CreditCard,
  Search,
  X
} from "lucide-react";
import IDUploadComponent from "@/components/shared/IDUploadComponent";
import AddressFormSection from "@/components/shared/AddressFormSection";

interface TestDriveData {
  // Vehicle Information
  vehicleRegistration: string;
  
  // Address Information (Same as ID)
  addressSameAsId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  
  // ID Upload
  drivingLicenseFile: File | null;
  drivingLicenseFileUrl: string | null;
}

interface TestDriveEntryFormProps {
  onSuccess?: (testDrive?: any) => void;
  editTestDrive?: any; // Test drive data for editing mode
  isEditMode?: boolean;
  onClose?: () => void;
}

export default function TestDriveEntryForm({ onSuccess, editTestDrive, isEditMode = false, onClose }: TestDriveEntryFormProps) {
  const { isDarkMode } = useTheme();
  const { isSignedIn, userId, isLoaded } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data with sessionStorage persistence (only for create mode)
  const getInitialFormData = (): TestDriveData => {
    if (isEditMode) {
      // In edit mode, use the editTestDrive data
      return {
        vehicleRegistration: editTestDrive?.vehicleRegistration || '',
        addressSameAsId: editTestDrive?.addressSameAsId || '',
        addressLine1: editTestDrive?.addressLine1 || '',
        addressLine2: editTestDrive?.addressLine2 || '',
        city: editTestDrive?.city || '',
        county: editTestDrive?.county || '',
        postcode: editTestDrive?.postcode || '',
        country: editTestDrive?.country || 'United Kingdom',
        drivingLicenseFile: null,
        drivingLicenseFileUrl: editTestDrive?.drivingLicenseFile || null
      };
    } else {
      // Try to load saved data from sessionStorage
      try {
        const savedData = sessionStorage.getItem('testdrive-form-data');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          // Ensure File objects are not restored (they can't be serialized)
          return {
            ...parsed,
            drivingLicenseFile: null
          };
        }
      } catch (error) {
        console.warn('Failed to load test drive form data from sessionStorage:', error);
      }
      
      // Return default values if no saved data
      return {
        vehicleRegistration: '',
        addressSameAsId: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        county: '',
        postcode: '',
        country: 'United Kingdom',
        drivingLicenseFile: null,
        drivingLicenseFileUrl: null
      };
    }
  };

  const [formData, setFormData] = useState<TestDriveData>(getInitialFormData);

  // Handle page refresh detection and cleanup
  useEffect(() => {
    if (!isEditMode) {
      const handleBeforeUnload = () => {
        // Set a flag to detect page refresh vs navigation
        sessionStorage.setItem('testdrive-page-refreshed', 'true');
      };

      const handlePageLoad = () => {
        // Check if this was a page refresh
        const wasRefreshed = sessionStorage.getItem('testdrive-page-refreshed') === 'true';
        if (wasRefreshed) {
          // Clear form data on refresh
          sessionStorage.removeItem('testdrive-form-data');
          sessionStorage.removeItem('testdrive-page-refreshed');
          // Reset form to empty state
          setFormData({
            vehicleRegistration: '',
            addressSameAsId: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            county: '',
            postcode: '',
            country: 'United Kingdom',
            drivingLicenseFile: null,
            drivingLicenseFileUrl: null
          });
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Check on component mount
      handlePageLoad();

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isEditMode]);

  const handleInputChange = (field: keyof TestDriveData, value: any) => {
    const newFormData = {
      ...formData,
      [field]: value
    };
    
    setFormData(newFormData);
    
    // Save to sessionStorage (only in create mode)
    if (!isEditMode) {
      try {
        // Don't save File objects to sessionStorage as they can't be serialized
        const dataToSave = {
          ...newFormData,
          drivingLicenseFile: null
        };
        sessionStorage.setItem('testdrive-form-data', JSON.stringify(dataToSave));
      } catch (error) {
        console.warn('Failed to save test drive form data to sessionStorage:', error);
      }
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle address selection from Google Maps
  const handleAddressChange = (address: any) => {
    const newFormData = {
      ...formData,
      addressLine1: address.street,
      addressLine2: address.address2 || formData.addressLine2,
      city: address.city,
      county: address.county,
      postcode: address.postCode,
      country: address.country
    };
    
    setFormData(newFormData);
    
    // Save to sessionStorage (only in create mode)
    if (!isEditMode) {
      try {
        const dataToSave = {
          ...newFormData,
          drivingLicenseFile: null
        };
        sessionStorage.setItem('testdrive-form-data', JSON.stringify(dataToSave));
      } catch (error) {
        console.warn('Failed to save test drive form data to sessionStorage:', error);
      }
    }
    
    // Clear address-related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.addressLine1;
      delete newErrors.city;
      delete newErrors.postcode;
      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Vehicle Information validation
    if (!formData.vehicleRegistration.trim()) {
      newErrors.vehicleRegistration = 'Vehicle registration is required';
    }

    // Address validation
    if (!formData.addressSameAsId) {
      newErrors.addressSameAsId = 'Please select whether address is same as ID';
    }
    
    // Only validate address fields if user selected "no" (different address)
    if (formData.addressSameAsId === 'no') {
      if (!formData.addressLine1.trim()) {
        newErrors.street = 'Street address is required';
        newErrors.addressLine1 = 'Address line 1 is required';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!formData.postcode.trim()) {
        newErrors.postCode = 'Post code is required';
        newErrors.postcode = 'Postcode is required';
      }
    }

    // ID Upload validation
    if (!formData.drivingLicenseFileUrl) {
      newErrors.drivingLicenseFile = 'Driving license upload is required';
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      
      console.log('Form data before validation:', formData);
      console.log('Authentication status:', { isSignedIn, userId });
      
      // Check authentication status
      if (!isSignedIn || !userId) {
        console.error('User is not authenticated', { isSignedIn, userId });
        alert('You must be signed in to submit a test drive entry. Please sign in and try again.');
        return;
      }
      
      // Add safety check for formData
      if (!formData) {
        console.error('Form data is null or undefined');
        alert('Form data is not available. Please refresh the page and try again.');
        return;
      }
      
      let validationResult;
      try {
        validationResult = validateForm();
      } catch (validationError) {
        console.error('Error during form validation:', validationError);
        alert('An error occurred during form validation. Please check your input and try again.');
        return;
      }
      
      if (!validationResult) {
        console.log('Form validation failed');
        return;
      }
      
      console.log('Form validation passed');

      try {
        setIsSubmitting(true);
        console.log('Set isSubmitting to true');
      } catch (stateError) {
        console.error('Error setting isSubmitting state:', stateError);
        alert('Error updating form state. Please try again.');
        return;
      }
      
      // Prepare data for API with error handling
      let testDriveData;
      try {
        console.log('Preparing test drive data...');
        console.log('Raw form data:', formData);


        testDriveData = {
          vehicleRegistration: formData.vehicleRegistration || '',
          vehicleMake: '', // Default empty value for removed field
          vehicleModel: '', // Default empty value for removed field
          vehicleYear: null, // Default null value for removed field
          testDriveDate: new Date().toISOString().split('T')[0], // Default to current date
          testDriveTime: '09:00', // Default time
          estimatedDuration: 30, // Default 30 minutes
          customerName: '', // Default empty value for removed field
          customerEmail: '', // Default empty value for removed field
          customerPhone: null, // Default null value for removed field
          addressSameAsId: formData.addressSameAsId || '',
          addressLine1: formData.addressLine1 || '',
          addressLine2: formData.addressLine2 || '',
          city: formData.city || '',
          county: formData.county || '',
          postcode: formData.postcode || '',
          country: formData.country || 'United Kingdom',
          drivingLicenseFile: formData.drivingLicenseFileUrl || null,
          status: 'scheduled',
          notes: null,
        };
        
        console.log('Test drive data prepared successfully:', testDriveData);
      } catch (dataError) {
        console.error('Error preparing form data:', dataError);
        console.error('Data error details:', {
          type: typeof dataError,
          message: dataError instanceof Error ? dataError.message : 'Unknown error',
          stack: dataError instanceof Error ? dataError.stack : 'No stack trace'
        });
        
        let errorMessage = 'Error preparing form data. Please check your input and try again.';
        if (dataError instanceof Error) {
          errorMessage = dataError.message;
        }
        
        alert(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Submit to API
      console.log(`${isEditMode ? 'Updating' : 'Submitting'} test drive data:`, testDriveData);
      
      const url = isEditMode ? `/api/test-drives/${editTestDrive.id}` : '/api/test-drives';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testDriveData),
      });
      
      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `Failed to ${isEditMode ? 'update' : 'save'} test drive entry`;
        
        // Handle specific HTTP status codes
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please sign out and sign back in, then try again.';
          console.error('401 Unauthorized - Authentication issue detected');
        } else if (response.status === 403) {
          errorMessage = 'Access denied. You do not have permission to perform this action.';
        } else if (response.status === 400) {
          // Try to get specific validation error
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || 'Invalid data provided. Please check your input.';
          } catch (parseError) {
            errorMessage = 'Invalid data provided. Please check your input.';
          }
        } else {
          // For other errors, try to parse the response
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const savedTestDrive = await response.json();
      console.log(`Test drive entry ${isEditMode ? 'updated' : 'saved'} successfully:`, savedTestDrive);
      
      alert(`Test drive entry ${isEditMode ? 'updated' : 'saved'} successfully!`);
      
      if (isEditMode) {
        // In edit mode, close the modal and call success callback
        onClose?.();
        onSuccess?.(savedTestDrive);
      } else {
        // In create mode, keep form data populated after successful submission
        // Don't reset the form - let user see the submitted data
        onSuccess?.();
      }
      
    } catch (error) {
      console.error('Error saving test drive entry:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      let errorMessage = `Failed to ${isEditMode ? 'update' : 'save'} test drive entry. Please try again.`;
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error message:', error.message);
      } else if (typeof error === 'string') {
        errorMessage = error;
        console.error('String error:', error);
      } else {
        console.error('Unknown error type:', error);
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    const resetData = {
      vehicleRegistration: '',
      addressSameAsId: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
      drivingLicenseFile: null,
      drivingLicenseFileUrl: null
    };
    
    setFormData(resetData);
    setErrors({});
    
    // Clear sessionStorage (only in create mode)
    if (!isEditMode) {
      try {
        sessionStorage.removeItem('testdrive-form-data');
        sessionStorage.removeItem('testdrive-page-refreshed');
      } catch (error) {
        console.warn('Failed to clear test drive form data from sessionStorage:', error);
      }
    }
  };

  const inputBaseClass = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-blue-500/20'
  }`;

  const labelClass = `block text-sm font-semibold mb-3 ${
    isDarkMode ? 'text-white' : 'text-slate-700'
  }`;

  // Show loading state while authentication is being checked
  if (!isLoaded) {
    return (
      <Card className={`w-full max-w-4xl mx-auto ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
      } shadow-xl`}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Car className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Loading...
          </h2>
          <p className={`${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Checking authentication status...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show authentication message if user is not signed in
  if (!isSignedIn) {
    return (
      <Card className={`w-full max-w-4xl mx-auto ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
      } shadow-xl`}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Authentication Required
          </h2>
          <p className={`${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Please sign in to access the Test Drive Entry form.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`${
        isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
      } shadow-xl`}>
      <CardHeader className="pb-6 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {isEditMode ? 'Edit Test Drive Entry' : 'Test Drive Entry Management'}
              </CardTitle>
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                {isEditMode ? 'Update test drive appointment details' : 'Schedule and manage customer test drives with ID verification'}
              </p>
            </div>
          </div>
          
          {/* Close Button - Top Right */}
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className={`p-2 ${
                isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Vehicle Information Section */}
          <div className={`p-6 rounded-xl ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'
          }`}>
            <h3 className={`text-lg font-bold mb-6 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <Car className="inline h-5 w-5 mr-2" />
              Vehicle Information
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>
                  Vehicle Registration *
                </label>
                <input
                  type="text"
                  value={formData.vehicleRegistration}
                  onChange={(e) => handleInputChange('vehicleRegistration', e.target.value.toUpperCase())}
                  className={`${inputBaseClass} ${errors.vehicleRegistration ? 'border-red-500' : ''}`}
                  placeholder="e.g., AB12 CDE"
                />
                {errors.vehicleRegistration && (
                  <p className="text-red-500 text-xs mt-1">{errors.vehicleRegistration}</p>
                )}
              </div>

            </div>
          </div>


          {/* Address Information Section */}
          <div className={`p-6 rounded-xl ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'
          }`}>
            <h3 className={`text-lg font-bold mb-6 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <MapPin className="inline h-5 w-5 mr-2" />
              Address Information
            </h3>
            
            <div className="space-y-6">
              {/* Address Same as ID Dropdown */}
              <div>
                <label className={labelClass}>
                  Is your address the same as on your ID? *
                </label>
                <select
                  value={formData.addressSameAsId}
                  onChange={(e) => handleInputChange('addressSameAsId', e.target.value)}
                  className={`${inputBaseClass} ${errors.addressSameAsId ? 'border-red-500' : ''}`}
                >
                  <option value="">Please select</option>
                  <option value="yes">Yes - Address is same as on ID</option>
                  <option value="no">No - Different address</option>
                </select>
                {errors.addressSameAsId && (
                  <p className="text-red-500 text-xs mt-1">{errors.addressSameAsId}</p>
                )}
                <p className={`text-xs mt-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  If "Yes", no need to enter address details below
                </p>
              </div>

              {/* Conditional Address Fields with Google API Integration */}
              {formData.addressSameAsId === 'no' && (
                <div className="mt-6">
                  <AddressFormSection
                    addressData={{
                      street: formData.addressLine1,
                      address2: formData.addressLine2,
                      city: formData.city,
                      county: formData.county,
                      postCode: formData.postcode,
                      country: formData.country
                    }}
                    onAddressChange={handleAddressChange}
                    errors={errors}
                    fieldPrefix=""
                    showTitle={false}
                    className="space-y-4"
                  />
                </div>
              )}

              {/* Information Message for "Yes" selection */}
              {formData.addressSameAsId === 'yes' && (
                <div className={`p-4 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-green-900/20 border-green-800/50 text-green-300' 
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Address confirmed as same as ID. No additional address details required.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ID Upload Section */}
          <div className={`p-6 rounded-xl ${
            isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'
          }`}>
            <h3 className={`text-lg font-bold mb-6 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <CreditCard className="inline h-5 w-5 mr-2" />
              Driving License Verification
            </h3>
            
            <div className="space-y-6">
              <IDUploadComponent
                onFileSelect={(file: File | null) => handleInputChange('drivingLicenseFile', file)}
                onFileUpload={(fileUrl: string | null) => handleInputChange('drivingLicenseFileUrl', fileUrl)}
                error={errors.drivingLicenseFile}
                existingFileUrl={formData.drivingLicenseFileUrl}
              />
            </div>
          </div>


          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-transparent border-t-white mr-2" />
                  {isEditMode ? 'Updating Test Drive Entry...' : 'Saving Test Drive Entry...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Update Test Drive Entry' : 'Save Test Drive Entry'}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={isEditMode ? onClose : handleReset}
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-slate-100 hover:border-slate-500 hover:text-white'
                  : 'border-slate-300 bg-white/50 hover:bg-slate-50 text-slate-700 hover:border-slate-400'
              }`}
            >
              <RotateCcw className="h-5 w-5 mr-3" />
              {isEditMode ? 'Cancel' : 'Reset Form'}
            </Button>
          </div>
          </form>
        </CardContent>
      </Card>

    </>
  );
}
