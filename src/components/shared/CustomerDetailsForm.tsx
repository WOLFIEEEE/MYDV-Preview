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
  Calendar,
  Building,
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Save,
  RotateCcw,
  X
} from "lucide-react";

interface CustomerData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  
  // Address Information
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  
  // Marketing and Sales
  marketingConsent: boolean;
  salesConsent: boolean;
  gdprConsent: boolean;
  consentDate: string;
  
  // Additional Information
  customerType: string;
  enquiryType: string;
  notes: string;
}

interface CustomerDetailsFormProps {
  onSuccess?: (customer?: any) => void;
  editCustomer?: any; // Customer data for editing mode
  isEditMode?: boolean;
  onClose?: () => void;
}

export default function CustomerDetailsForm({ onSuccess, editCustomer, isEditMode = false, onClose }: CustomerDetailsFormProps) {
  const { isDarkMode } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function to format date for HTML date input
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    
    try {
      // Handle different date formats
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateString);
        return '';
      }
      
      // Return in YYYY-MM-DD format for HTML date input
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return '';
    }
  };

  // Initialize form data with sessionStorage persistence (only for create mode)
  const getInitialFormData = (): CustomerData => {
    if (isEditMode) {
      // In edit mode, use the editCustomer data
      return {
        firstName: editCustomer?.firstName || '',
        lastName: editCustomer?.lastName || '',
        email: editCustomer?.email || '',
        phone: editCustomer?.phone || '',
        dateOfBirth: formatDateForInput(editCustomer?.dateOfBirth),
        addressLine1: editCustomer?.addressLine1 || '',
        addressLine2: editCustomer?.addressLine2 || '',
        city: editCustomer?.city || '',
        county: editCustomer?.county || '',
        postcode: editCustomer?.postcode || '',
        country: editCustomer?.country || 'United Kingdom',
        marketingConsent: editCustomer?.marketingConsent || false,
        salesConsent: editCustomer?.salesConsent || false,
        gdprConsent: editCustomer?.gdprConsent || false,
        consentDate: editCustomer?.consentDate || '',
        customerType: editCustomer?.tags?.[0] || 'individual',
        enquiryType: editCustomer?.enquiryType || '',
        notes: editCustomer?.notes || ''
      };
    } else {
      // Try to load saved data from sessionStorage
      try {
        const savedData = sessionStorage.getItem('customer-form-data');
        if (savedData) {
          return JSON.parse(savedData);
        }
      } catch (error) {
        console.warn('Failed to load customer form data from sessionStorage:', error);
      }
      
      // Return default values if no saved data
      return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        county: '',
        postcode: '',
        country: 'United Kingdom',
        marketingConsent: false,
        salesConsent: false,
        gdprConsent: false,
        consentDate: '',
        customerType: 'individual',
        enquiryType: '',
        notes: ''
      };
    }
  };

  const [formData, setFormData] = useState<CustomerData>(getInitialFormData);

  // Handle page refresh detection and cleanup
  useEffect(() => {
    if (!isEditMode) {
      const handleBeforeUnload = () => {
        // Set a flag to detect page refresh vs navigation
        sessionStorage.setItem('customer-page-refreshed', 'true');
      };

      const handlePageLoad = () => {
        // Check if this was a page refresh
        const wasRefreshed = sessionStorage.getItem('customer-page-refreshed') === 'true';
        if (wasRefreshed) {
          // Clear form data on refresh
          sessionStorage.removeItem('customer-form-data');
          sessionStorage.removeItem('customer-page-refreshed');
          // Reset form to empty state
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            county: '',
            postcode: '',
            country: 'United Kingdom',
            marketingConsent: false,
            salesConsent: false,
            gdprConsent: false,
            consentDate: '',
            customerType: 'individual',
            enquiryType: '',
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

  const handleInputChange = (field: keyof CustomerData, value: any) => {
    const newFormData = {
      ...formData,
      [field]: value
    };
    
    setFormData(newFormData);
    
    // Save to sessionStorage (only in create mode)
    if (!isEditMode) {
      try {
        sessionStorage.setItem('customer-form-data', JSON.stringify(newFormData));
      } catch (error) {
        console.warn('Failed to save customer form data to sessionStorage:', error);
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
        sessionStorage.setItem('customer-form-data', JSON.stringify(newFormData));
      } catch (error) {
        console.warn('Failed to save customer form data to sessionStorage:', error);
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
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
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
    if (!formData.gdprConsent) {
      newErrors.gdprConsent = 'GDPR consent is required to proceed';
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
      const customerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth || null,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        county: formData.county,
        postcode: formData.postcode,
        country: formData.country,
        marketingConsent: formData.marketingConsent,
        salesConsent: formData.salesConsent,
        gdprConsent: formData.gdprConsent,
        notes: formData.notes,
        customerSource: 'manual_entry',
        preferredContactMethod: 'email',
        status: 'active',
        tags: formData.customerType ? [formData.customerType] : null,
        enquiryType: formData.enquiryType,
      };

      // Submit to API
      const url = isEditMode ? `/api/customers/${editCustomer.id}` : '/api/customers';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'save'} customer`);
      }

      const savedCustomer = await response.json();
      console.log(`Customer ${isEditMode ? 'updated' : 'saved'} successfully:`, savedCustomer);
      
      alert(`Customer details ${isEditMode ? 'updated' : 'saved'} successfully!`);
      
      if (isEditMode) {
        // In edit mode, close the modal and call success callback
        onClose?.();
        onSuccess?.(savedCustomer);
      } else {
        // In create mode, keep form data populated after successful submission
        // Don't reset the form - let user see the submitted data
        onSuccess?.();
      }
      
    } catch (error) {
      console.error('Error saving customer data:', error);
      alert(error instanceof Error ? error.message : 'Failed to save customer details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    const resetData = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
      marketingConsent: false,
      salesConsent: false,
      gdprConsent: false,
      consentDate: '',
      customerType: 'individual',
      enquiryType: 'general',
      notes: ''
    };
    
    setFormData(resetData);
    setErrors({});
    
    // Clear sessionStorage (only in create mode)
    if (!isEditMode) {
      try {
        sessionStorage.removeItem('customer-form-data');
        sessionStorage.removeItem('customer-page-refreshed');
      } catch (error) {
        console.warn('Failed to clear customer form data from sessionStorage:', error);
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
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {isEditMode ? 'Edit Customer Details' : 'Customer Details Management'}
                </CardTitle>
                <p className={`text-sm mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  {isEditMode ? 'Update customer information with GDPR compliance' : 'Add and manage customer information with GDPR compliance'}
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
            
            {/* Personal Information Section */}
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'
            }`}>
              <h3 className={`text-lg font-bold mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>
                    <User className="inline h-4 w-4 mr-2" />
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`${inputBaseClass} ${errors.firstName ? 'border-red-500' : ''}`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    <User className="inline h-4 w-4 mr-2" />
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`${inputBaseClass} ${errors.lastName ? 'border-red-500' : ''}`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
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
                    placeholder="Enter email address"
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
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    <Calendar className="inline h-4 w-4 mr-2" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className={inputBaseClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <Building className="inline h-4 w-4 mr-2" />
                    Customer Type
                  </label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => handleInputChange('customerType', e.target.value)}
                    className={inputBaseClass}
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                    <option value="trade">Trade</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    <Search className="inline h-4 w-4 mr-2" />
                    Customer Enquiry Type
                  </label>
                  <input
                    type="text"
                    value={formData.enquiryType}
                    onChange={(e) => handleInputChange('enquiryType', e.target.value)}
                    className={inputBaseClass}
                    placeholder="Enter enquiry type"
                  />
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
                title="Address Information"
              />
            </div>

            {/* Marketing and GDPR Consent Section */}
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50/50'
            }`}>
              <h3 className={`text-lg font-bold mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <Shield className="inline h-5 w-5 mr-2" />
                Marketing & GDPR Consent
              </h3>
              
              <div className="space-y-6">
                {/* GDPR Consent - Required */}
                <div className={`p-4 rounded-lg border-2 ${
                  errors.gdprConsent 
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' 
                    : formData.gdprConsent 
                      ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20'
                      : isDarkMode ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-white'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative mt-1">
                      <input
                        type="checkbox"
                        checked={formData.gdprConsent}
                        onChange={(e) => handleInputChange('gdprConsent', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.gdprConsent
                          ? 'bg-green-600 border-green-600'
                          : isDarkMode ? 'border-slate-500 bg-slate-700' : 'border-slate-300 bg-white'
                      }`}>
                        {formData.gdprConsent && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        GDPR Data Processing Consent *
                      </span>
                      <p className={`text-sm mt-1 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        I consent to the processing of my personal data for the purposes of managing my customer relationship, 
                        vehicle sales, and related services in accordance with GDPR regulations.
                      </p>
                    </div>
                  </label>
                  {errors.gdprConsent && (
                    <p className="text-red-500 text-xs mt-2 ml-8">{errors.gdprConsent}</p>
                  )}
                </div>

                {/* Marketing Consent - Optional */}
                <div className={`p-4 rounded-lg border-2 ${
                  formData.marketingConsent 
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                    : isDarkMode ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-white'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative mt-1">
                      <input
                        type="checkbox"
                        checked={formData.marketingConsent}
                        onChange={(e) => handleInputChange('marketingConsent', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.marketingConsent
                          ? 'bg-blue-600 border-blue-600'
                          : isDarkMode ? 'border-slate-500 bg-slate-700' : 'border-slate-300 bg-white'
                      }`}>
                        {formData.marketingConsent && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        Marketing Communications Consent
                      </span>
                      <p className={`text-sm mt-1 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        I consent to receive marketing communications including newsletters, promotions, and vehicle offers via email and SMS.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Sales Consent - Optional */}
                <div className={`p-4 rounded-lg border-2 ${
                  formData.salesConsent 
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20'
                    : isDarkMode ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-white'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative mt-1">
                      <input
                        type="checkbox"
                        checked={formData.salesConsent}
                        onChange={(e) => handleInputChange('salesConsent', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.salesConsent
                          ? 'bg-purple-600 border-purple-600'
                          : isDarkMode ? 'border-slate-500 bg-slate-700' : 'border-slate-300 bg-white'
                      }`}>
                        {formData.salesConsent && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        Sales Contact Consent
                      </span>
                      <p className={`text-sm mt-1 ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        I consent to be contacted by sales representatives regarding vehicle purchases, trade-ins, and related services.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
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
                <label className={labelClass}>Customer Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className={`${inputBaseClass} min-h-[100px] resize-vertical`}
                  placeholder="Enter any additional notes about the customer..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-transparent border-t-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Update Customer Details' : 'Save Customer Details'}
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
