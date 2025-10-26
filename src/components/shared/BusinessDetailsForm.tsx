"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddressFormSection from "@/components/shared/AddressFormSection";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  Hash,
  FileText,
  Shield,
  CheckCircle,
  XCircle,
  Save,
  RotateCcw,
  X
} from "lucide-react";

interface BusinessData {
  // Business Information
  businessName: string;
  email: string;
  phone: string;
  vatNumber: string;
  companyNumber: string;
  
  // Address Information
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  
  // Additional Information
  businessSource: string;
  preferredContactMethod: string;
  notes: string;
}

interface BusinessDetailsFormProps {
  onSuccess?: (business?: any) => void;
  editBusiness?: any; // Business data for editing mode
  isEditMode?: boolean;
  onClose?: () => void;
}

export default function BusinessDetailsForm({ onSuccess, editBusiness, isEditMode = false, onClose }: BusinessDetailsFormProps) {
  const { isDarkMode } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data with sessionStorage persistence (only for create mode)
  const getInitialFormData = (): BusinessData => {
    if (isEditMode) {
      // In edit mode, use the editBusiness data
      return {
        businessName: editBusiness?.businessName || '',
        email: editBusiness?.email || '',
        phone: editBusiness?.phone || '',
        vatNumber: editBusiness?.vatNumber || '',
        companyNumber: editBusiness?.companyNumber || '',
        addressLine1: editBusiness?.addressLine1 || '',
        addressLine2: editBusiness?.addressLine2 || '',
        city: editBusiness?.city || '',
        county: editBusiness?.county || '',
        postcode: editBusiness?.postcode || '',
        country: editBusiness?.country || 'United Kingdom',
        businessSource: editBusiness?.businessSource || 'manual_entry',
        preferredContactMethod: editBusiness?.preferredContactMethod || 'email',
        notes: editBusiness?.notes || ''
      };
    } else {
      // Try to load saved data from sessionStorage
      try {
        const savedData = sessionStorage.getItem('business-form-data');
        if (savedData) {
          return JSON.parse(savedData);
        }
      } catch (error) {
        console.warn('Failed to load business form data from sessionStorage:', error);
      }
      
      // Return default values if no saved data
      return {
        businessName: '',
        email: '',
        phone: '',
        vatNumber: '',
        companyNumber: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        county: '',
        postcode: '',
        country: 'United Kingdom',
        businessSource: 'manual_entry',
        preferredContactMethod: 'email',
        notes: ''
      };
    }
  };

  const [formData, setFormData] = useState<BusinessData>(getInitialFormData);

  // Handle page refresh detection and cleanup
  useEffect(() => {
    if (!isEditMode) {
      const handleBeforeUnload = () => {
        // Set a flag to detect page refresh vs navigation
        sessionStorage.setItem('business-page-refreshed', 'true');
      };

      const handlePageLoad = () => {
        // Check if this was a page refresh
        const wasRefreshed = sessionStorage.getItem('business-page-refreshed') === 'true';
        if (wasRefreshed) {
          // Clear form data on refresh
          sessionStorage.removeItem('business-form-data');
          sessionStorage.removeItem('business-page-refreshed');
          // Reset form to empty state
          setFormData({
            businessName: '',
            email: '',
            phone: '',
            vatNumber: '',
            companyNumber: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            county: '',
            postcode: '',
            country: 'United Kingdom',
            businessSource: 'manual_entry',
            preferredContactMethod: 'email',
            notes: ''
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

  const handleInputChange = (field: keyof BusinessData, value: any) => {
    const newFormData = {
      ...formData,
      [field]: value
    };
    
    setFormData(newFormData);
    
    // Save to sessionStorage (only in create mode)
    if (!isEditMode) {
      try {
        sessionStorage.setItem('business-form-data', JSON.stringify(newFormData));
      } catch (error) {
        console.warn('Failed to save business form data to sessionStorage:', error);
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
        sessionStorage.setItem('business-form-data', JSON.stringify(newFormData));
      } catch (error) {
        console.warn('Failed to save business form data to sessionStorage:', error);
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

    // Required fields validation
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address line 1 is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const businessData = {
        businessName: formData.businessName,
        email: formData.email,
        phone: formData.phone,
        vatNumber: formData.vatNumber || null,
        companyNumber: formData.companyNumber || null,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        county: formData.county,
        postcode: formData.postcode,
        country: formData.country,
        notes: formData.notes,
        businessSource: formData.businessSource || 'manual_entry',
        preferredContactMethod: formData.preferredContactMethod || 'email',
        status: 'active',
        tags: null,
        customFields: null,
      };

      // Submit to API
      const url = isEditMode ? `/api/businesses/${editBusiness.id}` : '/api/businesses';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'save'} business`);
      }

      const savedBusiness = await response.json();
      console.log(`Business ${isEditMode ? 'updated' : 'saved'} successfully:`, savedBusiness);
      
      alert(`Business details ${isEditMode ? 'updated' : 'saved'} successfully!`);
      
      if (isEditMode) {
        // In edit mode, close the modal and call success callback
        onClose?.();
        onSuccess?.(savedBusiness);
      } else {
        // In create mode, keep form data populated after successful submission
        // Don't reset the form - let user see the submitted data
        onSuccess?.();
      }
      
    } catch (error) {
      console.error('Error saving business data:', error);
      alert(error instanceof Error ? error.message : 'Failed to save business details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    const resetData = {
      businessName: '',
      email: '',
      phone: '',
      vatNumber: '',
      companyNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
      businessSource: 'manual_entry',
      preferredContactMethod: 'email',
      notes: ''
    };
    
    setFormData(resetData);
    setErrors({});
    
    // Clear sessionStorage (only in create mode)
    if (!isEditMode) {
      try {
        sessionStorage.removeItem('business-form-data');
        sessionStorage.removeItem('business-page-refreshed');
      } catch (error) {
        console.warn('Failed to clear business form data from sessionStorage:', error);
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

  return (
    <>
      <Card className={`${
        isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
      } shadow-xl`}>
        <CardHeader className="pb-6 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {isEditMode ? 'Edit Business Details' : 'Business Details Management'}
                </CardTitle>
                <p className={`text-sm mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  {isEditMode ? 'Update business information and contact details' : 'Add and manage business information and contact details'}
                </p>
              </div>
            </div>
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
            
            {/* Business Information Section */}
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'
            }`}>
              <h3 className={`text-lg font-bold mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Business Information
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                  <label className={labelClass}>
                    <Building className="inline h-4 w-4 mr-2" />
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className={`${inputBaseClass} ${errors.businessName ? 'border-red-500' : ''}`}
                    placeholder="Enter business name"
                  />
                  {errors.businessName && (
                    <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    <Mail className="inline h-4 w-4 mr-2" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`${inputBaseClass} ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="Enter business email address"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    <Phone className="inline h-4 w-4 mr-2" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`${inputBaseClass} ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="Enter business phone number"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    <Hash className="inline h-4 w-4 mr-2" />
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                    className={inputBaseClass}
                    placeholder="Enter VAT registration number"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <FileText className="inline h-4 w-4 mr-2" />
                    Company Number
                  </label>
                  <input
                    type="text"
                    value={formData.companyNumber}
                    onChange={(e) => handleInputChange('companyNumber', e.target.value)}
                    className={inputBaseClass}
                    placeholder="Enter company registration number"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <Mail className="inline h-4 w-4 mr-2" />
                    Preferred Contact Method
                  </label>
                  <select
                    value={formData.preferredContactMethod}
                    onChange={(e) => handleInputChange('preferredContactMethod', e.target.value)}
                    className={inputBaseClass}
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    <Building className="inline h-4 w-4 mr-2" />
                    Business Source
                  </label>
                  <select
                    value={formData.businessSource}
                    onChange={(e) => handleInputChange('businessSource', e.target.value)}
                    className={inputBaseClass}
                  >
                    <option value="manual_entry">Manual Entry</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="referral">Referral</option>
                    <option value="online">Online</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="advertisement">Advertisement</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'
            }`}>
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
                showTitle={true}
                title="Business Address Information"
              />
            </div>

            {/* Additional Notes Section */}
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'
            }`}>
              <h3 className={`text-lg font-bold mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Additional Notes
              </h3>
              
              <div>
                <label className={labelClass}>Business Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className={`${inputBaseClass} min-h-[100px] resize-vertical`}
                  placeholder="Enter any additional notes about the business..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-transparent border-t-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Update Business Details' : 'Save Business Details'}
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
