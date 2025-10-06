"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X,
  Save,
  Plus,
  Trash2,
  Key,
  Building,
  Upload,
  Star,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Globe,
  FileText,
  Check,
  AlertCircle
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth, useUser } from '@clerk/nextjs';

interface ClientOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OnboardingFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Company Information
  companyName: string;
  businessType: string;
  establishedYear: string;
  registrationNumber: string;
  vatNumber: string;
  
  // Address Information
  addressStreet: string;
  addressCity: string;
  addressCounty: string;
  addressPostCode: string;
  addressCountry: string;
  
  // Contact Information
  contactWebsite: string;
  contactFax: string;
  
  // AutoTrader Configuration
  advertisementIds: string[];
  primaryAdvertisementId: string;
  autotraderIntegrationId: string;
  
  // Company Logo
  companyLogo: string;
  
  // Additional Information
  numberOfVehicles: string;
  currentSystem: string;
  description: string;
  notes: string;
}

export default function ClientOnboardingModal({ isOpen, onClose, onSuccess }: ClientOnboardingModalProps) {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [onboardingResult, setOnboardingResult] = useState<any>(null);
  const [formData, setFormData] = useState<OnboardingFormData>({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Company Information
    companyName: '',
    businessType: '',
    establishedYear: '',
    registrationNumber: '',
    vatNumber: '',
    
    // Address Information
    addressStreet: '',
    addressCity: '',
    addressCounty: '',
    addressPostCode: '',
    addressCountry: 'United Kingdom',
    
    // Contact Information
    contactWebsite: '',
    contactFax: '',
    
    // AutoTrader Configuration
    advertisementIds: [''],
    primaryAdvertisementId: '',
    autotraderIntegrationId: '',
    
    // Company Logo
    companyLogo: '',
    
    // Additional Information
    numberOfVehicles: '',
    currentSystem: '',
    description: '',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const steps = [
    {
      id: 1,
      title: "Personal Information",
      description: "Basic contact details",
      icon: User,
      fields: ['firstName', 'lastName', 'email', 'phone']
    },
    {
      id: 2,
      title: "Company Details",
      description: "Business information",
      icon: Building,
      fields: ['companyName', 'businessType', 'establishedYear', 'registrationNumber', 'vatNumber']
    },
    {
      id: 3,
      title: "Address & Contact",
      description: "Location and contact info",
      icon: MapPin,
      fields: ['addressStreet', 'addressCity', 'addressCounty', 'addressPostCode', 'contactWebsite']
    },
    {
      id: 4,
      title: "AutoTrader Setup",
      description: "Advertisement configuration",
      icon: Key,
      fields: ['advertisementIds', 'primaryAdvertisementId', 'autotraderIntegrationId']
    },
    {
      id: 5,
      title: "Additional Details",
      description: "Final configuration",
      icon: FileText,
      fields: ['numberOfVehicles', 'currentSystem', 'description', 'companyLogo']
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAdvertisementIdChange = (index: number, value: string) => {
    const newIds = [...formData.advertisementIds];
    newIds[index] = value;
    setFormData(prev => ({ ...prev, advertisementIds: newIds }));
  };

  const addAdvertisementId = () => {
    setFormData(prev => ({
      ...prev,
      advertisementIds: [...prev.advertisementIds, '']
    }));
  };

  const removeAdvertisementId = (index: number) => {
    if (formData.advertisementIds.length > 1) {
      const newIds = formData.advertisementIds.filter((_, i) => i !== index);
      setFormData(prev => ({ 
        ...prev, 
        advertisementIds: newIds,
        primaryAdvertisementId: prev.primaryAdvertisementId === prev.advertisementIds[index] ? '' : prev.primaryAdvertisementId
      }));
    }
  };

  const setPrimaryAdId = (adId: string) => {
    setFormData(prev => ({ ...prev, primaryAdvertisementId: adId }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData(prev => ({ ...prev, companyLogo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    const step = steps.find(s => s.id === stepNumber);
    if (!step) return true;

    const errors: Record<string, string> = {};
    const requiredFields = step.fields;

    requiredFields.forEach(field => {
      if (field === 'advertisementIds') {
        const validAdIds = formData.advertisementIds.filter(id => id.trim() !== '');
        if (validAdIds.length === 0) {
          errors[field] = 'At least one advertisement ID is required';
        }
      } else if (field === 'email') {
        if (!formData[field as keyof OnboardingFormData]) {
          errors[field] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors[field] = 'Please enter a valid email address';
        }
      } else if (['firstName', 'lastName', 'companyName'].includes(field)) {
        if (!formData[field as keyof OnboardingFormData]) {
          errors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCompleteOnboarding = async () => {
    if (!user?.id) return;
    
    // Validate all steps
    let allValid = true;
    for (let i = 1; i <= steps.length; i++) {
      if (!validateStep(i)) {
        allValid = false;
        setCurrentStep(i);
        break;
      }
    }

    if (!allValid) {
      alert('Please complete all required fields before submitting.');
      return;
    }

    setLoading(true);
    try {
      // Filter out empty advertisement IDs
      const validAdIds = formData.advertisementIds.filter(id => id.trim() !== '');
      const primaryAdId = formData.primaryAdvertisementId || validAdIds[0] || '';

      const onboardingData = {
        // Personal Information
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        
        // Company Information
        companyName: formData.companyName,
        businessType: formData.businessType,
        establishedYear: formData.establishedYear,
        registrationNumber: formData.registrationNumber,
        vatNumber: formData.vatNumber,
        
        // Address Information
        addressStreet: formData.addressStreet,
        addressCity: formData.addressCity,
        addressCounty: formData.addressCounty,
        addressPostCode: formData.addressPostCode,
        addressCountry: formData.addressCountry,
        
        // Contact Information
        contactWebsite: formData.contactWebsite,
        contactFax: formData.contactFax,
        
        // AutoTrader Configuration
        advertisementIds: validAdIds,
        primaryAdvertisementId: primaryAdId,
        autotraderIntegrationId: formData.autotraderIntegrationId,
        
        // Company Logo
        companyLogo: formData.companyLogo,
        
        // Additional Information
        numberOfVehicles: formData.numberOfVehicles,
        currentSystem: formData.currentSystem,
        description: formData.description,
        notes: formData.notes,
        
        // Metadata
        createdBy: user.id,
        createdAt: new Date().toISOString()
      };

      console.log('🔄 Submitting client onboarding data:', onboardingData);

      const response = await fetch('/api/admin/onboard-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Client onboarded successfully:', result);
        
        setOnboardingResult(result);
        setLoading(false);
        setShowSuccessDialog(true);
      } else {
        const errorText = await response.text();
        console.error('❌ Onboarding failed:', errorText);
        
        let errorMessage = 'Failed to onboard client';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        alert(`❌ ${errorMessage}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error submitting onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Onboarding submission failed: ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setOnboardingResult(null);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = steps.find(s => s.id === currentStep);
  const StepIcon = currentStepData?.icon || User;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card className={`shadow-2xl border-0 ${
          isDarkMode 
            ? 'bg-slate-800/95 backdrop-blur-lg' 
            : 'bg-white/95 backdrop-blur-lg'
        }`}>
          <CardHeader className="relative border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className={`absolute right-6 top-6 p-2 rounded-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
            
            <CardTitle className={`text-2xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Client Onboarding
            </CardTitle>
            <p className={`text-base transition-colors duration-300 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Complete client setup and configuration
            </p>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mt-6">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                    currentStep === step.id
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : currentStep > step.id
                        ? 'border-green-500 bg-green-500 text-white'
                        : isDarkMode
                          ? 'border-slate-600 text-slate-400'
                          : 'border-slate-300 text-slate-500'
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      currentStep > step.id
                        ? 'bg-green-500'
                        : isDarkMode
                          ? 'bg-slate-600'
                          : 'bg-slate-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Current Step Info */}
            <div className="mt-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Step {currentStep}: {currentStepData?.title}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {currentStepData?.description}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.firstName
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : isDarkMode 
                              ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter first name"
                      />
                      {validationErrors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.lastName
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : isDarkMode 
                              ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter last name"
                      />
                      {validationErrors.lastName && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            validationErrors.email
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : isDarkMode 
                                ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                                : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                          }`}
                          placeholder="Enter email address"
                        />
                      </div>
                      {validationErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode 
                              ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                          }`}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Company Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Company Name *
                    </label>
                    <div className="relative">
                      <Building className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.companyName
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : isDarkMode 
                              ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter company name"
                      />
                    </div>
                    {validationErrors.companyName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.companyName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Business Type
                      </label>
                      <select
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="">Select business type</option>
                        <option value="independent">Independent Dealer</option>
                        <option value="franchise">Franchise Dealer</option>
                        <option value="supermarket">Car Supermarket</option>
                        <option value="auction">Auction House</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Established Year
                      </label>
                      <div className="relative">
                        <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="number"
                          name="establishedYear"
                          value={formData.establishedYear}
                          onChange={handleInputChange}
                          min="1900"
                          max={new Date().getFullYear()}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode 
                              ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                          }`}
                          placeholder="e.g. 2020"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Company Registration Number
                      </label>
                      <input
                        type="text"
                        name="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="e.g. 12345678"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        VAT Number
                      </label>
                      <input
                        type="text"
                        name="vatNumber"
                        value={formData.vatNumber}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="e.g. GB123456789"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Address & Contact */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Street Address
                    </label>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        name="addressStreet"
                        value={formData.addressStreet}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter street address"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        City
                      </label>
                      <input
                        type="text"
                        name="addressCity"
                        value={formData.addressCity}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter city"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        County
                      </label>
                      <input
                        type="text"
                        name="addressCounty"
                        value={formData.addressCounty}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter county"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Post Code
                      </label>
                      <input
                        type="text"
                        name="addressPostCode"
                        value={formData.addressPostCode}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter post code"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Country
                      </label>
                      <select
                        name="addressCountry"
                        value={formData.addressCountry}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Ireland">Ireland</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Website
                      </label>
                      <div className="relative">
                        <Globe className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="url"
                          name="contactWebsite"
                          value={formData.contactWebsite}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode 
                              ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                          }`}
                          placeholder="https://www.example.com"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Fax Number
                      </label>
                      <input
                        type="tel"
                        name="contactFax"
                        value={formData.contactFax}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter fax number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: AutoTrader Setup */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h4 className={`text-md font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Advertisement IDs *
                    </h4>
                    <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Configure advertisement IDs for this dealer. The first ID will be primary unless specified otherwise.
                    </p>
                    
                    {formData.advertisementIds.map((adId, index) => (
                      <div key={index} className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={adId}
                            onChange={(e) => handleAdvertisementIdChange(index, e.target.value)}
                            placeholder={`Advertisement ID ${index + 1}`}
                            className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isDarkMode 
                                ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                                : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                            }`}
                          />
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPrimaryAdId(adId)}
                          disabled={!adId.trim()}
                          className={`${
                            formData.primaryAdvertisementId === adId
                              ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                              : isDarkMode 
                                ? 'border-slate-600 hover:bg-slate-700' 
                                : 'border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${formData.primaryAdvertisementId === adId ? 'fill-current' : ''}`} />
                        </Button>
                        
                        {formData.advertisementIds.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAdvertisementId(index)}
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {validationErrors.advertisementIds && (
                      <p className="text-red-500 text-xs mb-2">{validationErrors.advertisementIds}</p>
                    )}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addAdvertisementId}
                      className={isDarkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-50'}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Advertisement ID
                    </Button>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      AutoTrader Integration ID
                    </label>
                    <div className="relative">
                      <Key className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        name="autotraderIntegrationId"
                        value={formData.autotraderIntegrationId}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Enter integration ID (optional)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Additional Details */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Number of Vehicles
                      </label>
                      <select
                        name="numberOfVehicles"
                        value={formData.numberOfVehicles}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="">Select range</option>
                        <option value="1-10">1-10 vehicles</option>
                        <option value="11-50">11-50 vehicles</option>
                        <option value="51-100">51-100 vehicles</option>
                        <option value="101-500">101-500 vehicles</option>
                        <option value="500+">500+ vehicles</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-700'
                      }`}>
                        Current System
                      </label>
                      <input
                        type="text"
                        name="currentSystem"
                        value={formData.currentSystem}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                        placeholder="Current management system"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Company Logo
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      {formData.companyLogo && (
                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                          <img 
                            src={formData.companyLogo} 
                            alt="Company Logo Preview" 
                            className="max-w-32 max-h-16 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Business Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                        isDarkMode 
                          ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                          : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                      }`}
                      placeholder="Brief description of the business..."
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      Additional Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      className={`w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                        isDarkMode 
                          ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400' 
                          : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500'
                      }`}
                      placeholder="Any additional notes or requirements..."
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className={`flex-1 py-3 ${
                      isDarkMode 
                        ? 'border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700' 
                        : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Previous
                  </Button>
                )}
                
                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating Client...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Save className="w-4 h-4" />
                        <span>Complete Onboarding</span>
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          
          {/* Success Dialog */}
          <div className="relative w-full max-w-md">
            <Card className={`shadow-2xl border-0 ${
              isDarkMode 
                ? 'bg-slate-800/95 backdrop-blur-lg' 
                : 'bg-white/95 backdrop-blur-lg'
            }`}>
              <CardContent className="p-8 text-center">
                {/* Success Icon */}
                <div className="w-16 h-16 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                
                {/* Success Message */}
                <h3 className={`text-xl font-bold mb-3 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Client Onboarded Successfully! 🎉
                </h3>
                
                <p className={`text-sm mb-6 leading-relaxed ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  <strong>{onboardingResult?.data?.dealer?.name}</strong> has been successfully onboarded. 
                  A Clerk invitation has been sent to <strong>{onboardingResult?.data?.dealer?.email}</strong> 
                  to complete their account setup.
                </p>

                {/* Details */}
                <div className={`text-xs p-4 rounded-lg mb-6 ${
                  isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                }`}>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Company:</span>
                      <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
                        {onboardingResult?.data?.storeConfig?.storeName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Dealer ID:</span>
                      <span className={`font-mono text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {onboardingResult?.data?.dealer?.id?.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Invitation:</span>
                      <span className={`text-xs ${
                        onboardingResult?.data?.invitation?.success 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {onboardingResult?.data?.invitation?.success ? '✅ Sent' : '⚠️ Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (onboardingResult?.data?.invitation?.invitationUrl) {
                        navigator.clipboard.writeText(onboardingResult.data.invitation.invitationUrl);
                        alert('Invitation link copied to clipboard!');
                      }
                    }}
                    disabled={!onboardingResult?.data?.invitation?.invitationUrl}
                    className={`flex-1 text-xs ${
                      isDarkMode 
                        ? 'border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700' 
                        : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Copy Invite Link
                  </Button>
                  
                  <Button
                    onClick={handleSuccessDialogClose}
                    className="flex-1 text-xs bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  >
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          
          {/* Loading Content */}
          <div className="relative">
            <Card className={`shadow-2xl border-0 ${
              isDarkMode 
                ? 'bg-slate-800/95 backdrop-blur-lg' 
                : 'bg-white/95 backdrop-blur-lg'
            }`}>
              <CardContent className="p-12 text-center">
                {/* Animated Loading Icon */}
                <div className="w-16 h-16 mx-auto mb-6 relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                </div>
                
                {/* Loading Message */}
                <h3 className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Creating Client Account...
                </h3>
                
                <p className={`text-sm ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Setting up dealer configuration and sending invitation
                </p>
                
                {/* Progress Steps */}
                <div className="mt-6 space-y-2">
                  <div className={`text-xs flex items-center justify-center gap-2 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Creating dealer record...
                  </div>
                  <div className={`text-xs flex items-center justify-center gap-2 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Configuring store settings...
                  </div>
                  <div className={`text-xs flex items-center justify-center gap-2 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    Sending Clerk invitation...
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
