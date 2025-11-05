"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LicensePlate from "@/components/ui/license-plate";
import { Listbox } from '@headlessui/react';
import { useUser } from '@clerk/nextjs';
import { createOrGetDealer } from '@/lib/database';
import { useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery';
import { 
  ClipboardCheck, 
  Save, 
  RotateCcw, 
  BookOpen,
  Key,
  Settings,
  Shield,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from "lucide-react";

interface AddChecklistFormProps {
  stockData?: {
    metadata?: {
      stockId?: string;
    };
    vehicle?: {
      registration?: string;
    };
  };
  onSuccess?: () => void;
}

interface ChecklistItem {
  field: string;
  label: string;
  icon: any;
  placeholder: string;
  description: string;
  type?: 'text' | 'dropdown';
  options?: string[];
}

export default function AddChecklistForm({ stockData, onSuccess }: AddChecklistFormProps) {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [formData, setFormData] = useState({
    registration: stockData?.vehicle?.registration || '',
    userManual: "",
    numberOfKeys: "",
    serviceBook: "",
    wheelLockingNut: "",
    cambeltChainConfirmation: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Custom questions state
  const [customQuestions, setCustomQuestions] = useState<Array<{
    id: string;
    question: string;
    type: 'text' | 'dropdown' | 'yes_no';
    options?: string[];
    required: boolean;
  }>>([]);
  const [customQuestionsEnabled, setCustomQuestionsEnabled] = useState(true);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [dealerId, setDealerId] = useState<string>('');

  // Get dealer ID on component mount
  useEffect(() => {
    const getDealerId = async () => {
      if (!user?.id) return;
      
      try {
        const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User';
        const userEmail = user.emailAddresses[0]?.emailAddress || '';
        const dealer = await createOrGetDealer(user.id, userName, userEmail);
        setDealerId(dealer.id);
        console.log('✅ Dealer ID set for checklist form:', dealer.id);
      } catch (error) {
        console.error('❌ Error getting dealer ID:', error);
        // Fallback to hardcoded ID
        setDealerId(''); // Will be handled by API authentication
      }
    };

    if (user?.id) {
      getDealerId();
    }
  }, [user?.id]);

  // Load existing data and custom questions when dealer ID is available
  useEffect(() => {
    const loadData = async () => {
      if (!stockData?.metadata?.stockId || !dealerId) return;
      
      try {
        // Load existing checklist data
        console.log('🔍 Loading checklist data for dealer:', dealerId);
        const checklistResponse = await fetch(`/api/stock-actions/vehicle-checklist?stockId=${stockData.metadata.stockId}&dealerId=${dealerId}`);
        if (checklistResponse.ok) {
          const result = await checklistResponse.json();
          if (result.success && result.data) {
            setFormData({
              registration: stockData?.vehicle?.registration || '',
              userManual: result.data.userManual || "",
              numberOfKeys: result.data.numberOfKeys || "",
              serviceBook: result.data.serviceBook || "",
              wheelLockingNut: result.data.wheelLockingNut || "",
              cambeltChainConfirmation: result.data.cambeltChainConfirmation || ""
            });
            
            // Load custom answers from metadata
            if (result.data.metadata?.customAnswers) {
              setCustomAnswers(result.data.metadata.customAnswers);
            }
          }
        }

        // Load custom questions for this dealer
        console.log('🔍 Loading custom questions for dealer:', dealerId);
        const questionsResponse = await fetch(`/api/custom-checklist-questions?dealerId=${dealerId}`);
        if (questionsResponse.ok) {
          const questionsResult = await questionsResponse.json();
          if (questionsResult.success && questionsResult.data) {
            setCustomQuestions(questionsResult.data.questions || []);
            setCustomQuestionsEnabled(questionsResult.data.customQuestionsEnabled !== false); // Default to true
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [stockData?.metadata?.stockId, dealerId]);



  const handleChange = (field: keyof typeof formData, value: string) => {
    console.log('🔄 Updating field:', field, 'with value:', value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('📝 New form data:', newData);
      return newData;
    });
  };

  const handleCustomAnswerChange = (questionId: string, value: string) => {
    setCustomAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/stock-actions/vehicle-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockId: stockData?.metadata?.stockId || 'test123',
          dealerId: dealerId,
          ...formData,
          metadata: {
            customAnswers: customAnswers
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert("Checklist saved successfully!");
          
          // Invalidate inventory cache to reflect updated checklist status
          queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
          console.log('🔄 Inventory cache invalidated - checklist status will reflect in inventory table');
          
          // Call onSuccess callback to invalidate inventory cache
          if (onSuccess) {
            console.log('🔄 Calling onSuccess callback to refresh inventory cache');
            onSuccess();
          }
        } else {
          throw new Error(result.error || 'Failed to save checklist');
        }
      } else {
        throw new Error('Failed to save checklist');
      }
    } catch (err) {
      console.error("Checklist save error", err);
      alert("Failed to save checklist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      registration: stockData?.vehicle?.registration || '',
      userManual: "",
      numberOfKeys: "",
      serviceBook: "",
      wheelLockingNut: "",
      cambeltChainConfirmation: ""
    });
  };

  const inputBaseClass = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-emerald-500/20'
  }`;

  const labelClass = `block text-sm font-semibold mb-3 ${
    isDarkMode ? 'text-white' : 'text-slate-700'
  }`;

  const checklistItems = [
    {
      field: 'userManual',
      label: 'User Manual',
      icon: BookOpen,
      placeholder: 'Select status',
      description: 'Vehicle user manual status',
      type: 'dropdown',
      options: ['Yes', 'No', 'Digital']
    },
    {
      field: 'numberOfKeys',
      label: 'Number of Keys',
      icon: Key,
      placeholder: 'Enter number of keys',
      description: 'Total keys provided with vehicle',
      type: 'text'
    },
    {
      field: 'serviceBook',
      label: 'Service Book',
      icon: ClipboardCheck,
      placeholder: 'Enter service book details',
      description: 'Service history documentation',
      type: 'text'
    },
    {
      field: 'wheelLockingNut',
      label: 'Wheel Locking Nut',
      icon: Shield,
      placeholder: 'Select status',
      description: 'Wheel security locking nut key',
      type: 'dropdown',
      options: ['Yes', 'No']
    },
    {
      field: 'cambeltChainConfirmation',
      label: 'Cambelt/Chain Confirmation',
      icon: Settings,
      placeholder: 'Select status',
      description: 'Timing belt or chain service status',
      type: 'dropdown',
      options: ['Yes', 'No']
    }
  ];

  // Use the same 5 fields as the backend calculation for consistency
  const checklistFields = ['userManual', 'numberOfKeys', 'serviceBook', 'wheelLockingNut', 'cambeltChainConfirmation'];
  const completedItems = checklistFields.filter(field => {
    const value = formData[field as keyof typeof formData];
    return value && typeof value === 'string' && value.trim() !== '';
  }).length;
  const totalItems = checklistFields.length;
  const progressPercentage = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-rose-100/80 via-pink-100/60 to-purple-100/80">
      {/* Enhanced Header with Gradient */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-2xl blur-xl opacity-20 ${
          isDarkMode ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
        }`} />
        
        <div className={`relative p-6 rounded-2xl border backdrop-blur-sm ${
          isDarkMode 
            ? 'bg-slate-900/80 border-slate-700/50' 
            : 'bg-rose-100/70 border-pink-300/60 shadow-purple-200/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30' 
                  : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50'
              }`}>
                <ClipboardCheck className={`h-6 w-6 ${
                  isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-slate-100 to-slate-300 bg-clip-text text-transparent' 
                    : 'from-slate-800 to-slate-600 bg-clip-text text-transparent'
                }`}>
                  Checklist
                </h2>
                <p className={`text-sm flex items-center mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Complete vehicle inspection checklist
                </p>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="text-right">
              <div className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-slate-700'
              }`}>
                Progress: {completedItems}/{totalItems}
              </div>
              <div className={`w-24 h-2 rounded-full mt-2 ${
                isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm relative z-20 ${
          isDarkMode 
                      ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-rose-100/80 border-pink-300/50 shadow-purple-200/40'
        }`} style={{ overflow: 'visible' }}>
          {/* Stock ID and Registration Combined Field */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stock ID */}
              <div className="group">
                <label className={labelClass}>
                  Stock ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={stockData?.metadata?.stockId || ''}
                    readOnly
                    className={`${inputBaseClass} ${
                      isDarkMode 
                        ? 'bg-slate-800/30 border-slate-700/30 text-slate-400' 
                        : 'bg-slate-100/50 border-slate-200/50 text-slate-600'
                    } cursor-not-allowed pr-10`}
                    placeholder="Stock ID"
                  />
                  <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center ${
                    isDarkMode ? 'text-white' : 'text-slate-400'
                  }`}>
                    🔒
                  </div>
                </div>
              </div>
              
              {/* Registration */}
              <div className="group">
                <div className="space-y-2">
                  <label className={`${labelClass} mb-0 block ml-4 pl-2`}>
                    Registration
                  </label>
                  <div className="flex justify-start">
                    <LicensePlate 
                      registration={formData.registration || 'N/A'} 
                      size="xl" 
                      className="" 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={`mt-2 text-xs flex items-center ${
              isDarkMode ? 'text-white' : 'text-slate-500'
            }`}>
              <AlertCircle className="h-3 w-3 mr-1" />
              These fields are automatically populated and cannot be modified
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ overflow: 'visible' }}>
            {checklistItems.map((item, index) => {
              const IconComponent = item.icon;
              const isCompleted = formData[item.field as keyof typeof formData].trim() !== '';
              
              return (
                <div key={item.field} className={`relative ${
                  index === checklistItems.length - 1 && checklistItems.length % 2 === 1 
                    ? 'lg:col-span-2' 
                    : ''
                }`} style={{ overflow: 'visible' }}>
                  <label className={labelClass}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <IconComponent className="inline h-4 w-4 mr-2" />
                        {item.label}
                      </div>
                      {isCompleted && (
                        <CheckCircle2 className={`h-4 w-4 ${
                          isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                        }`} />
                      )}
                    </div>
                  </label>
                  
                  <div className="relative" style={{ overflow: 'visible' }}>
                    {item.type === 'dropdown' ? (
                      <Listbox
                        value={formData[item.field as keyof typeof formData]}
                        onChange={(value) => handleChange(item.field as keyof typeof formData, value)}
                      >
                        <div className="relative" style={{ overflow: 'visible' }}>
                          <Listbox.Button
                            onFocus={() => setFocusedField(item.field)}
                            onBlur={() => setFocusedField(null)}
                            className={`${inputBaseClass} flex items-center justify-between ${
                              focusedField === item.field 
                                ? 'ring-2 ring-emerald-500/20 border-emerald-500' 
                                : ''
                            } ${
                              isCompleted 
                                ? isDarkMode 
                                  ? 'border-emerald-500/50 bg-emerald-900/10' 
                                  : 'border-emerald-500/50 bg-emerald-50/50'
                                : ''
                            } ${
                              focusedField === item.field 
                                ? isDarkMode 
                                  ? 'shadow-lg shadow-emerald-500/20' 
                                  : 'shadow-lg shadow-emerald-500/10'
                                : ''
                            }`}
                          >
                            <span className={formData[item.field as keyof typeof formData] ? '' : 'text-slate-500'}>
                              {formData[item.field as keyof typeof formData] || item.placeholder}
                            </span>
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          </Listbox.Button>
                          
                          <Listbox.Options className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg ${
                            item.field === 'cambeltChainConfirmation' ? 'z-[9999]' : 'z-50'
                          } ${
                            isDarkMode 
                              ? 'bg-slate-800 border-slate-700' 
                              : 'bg-white border-slate-200'
                          }`}>
                            {item.options?.map((option) => (
                              <Listbox.Option
                                key={option}
                                value={option}
                                className={({ active, selected }) =>
                                  `cursor-pointer px-3 py-2 text-sm ${
                                    active 
                                      ? isDarkMode 
                                        ? 'bg-slate-700 text-slate-100' 
                                        : 'bg-emerald-50 text-slate-900'
                                      : isDarkMode 
                                        ? 'text-slate-100' 
                                        : 'text-slate-900'
                                  } ${
                                    selected 
                                      ? isDarkMode 
                                        ? 'bg-emerald-900/30 text-emerald-300' 
                                        : 'bg-emerald-100 text-emerald-700'
                                      : ''
                                  } first:rounded-t-lg last:rounded-b-lg`
                                }
                              >
                                {option}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </div>
                      </Listbox>
                    ) : (
                      <input
                        type="text"
                        value={formData[item.field as keyof typeof formData]}
                        onChange={(e) => handleChange(item.field as keyof typeof formData, e.target.value)}
                        onFocus={() => setFocusedField(item.field)}
                        onBlur={() => setFocusedField(null)}
                        className={`${inputBaseClass} ${
                          focusedField === item.field 
                            ? 'ring-2 ring-emerald-500/20 border-emerald-500' 
                            : ''
                        } ${
                          isCompleted 
                            ? isDarkMode 
                              ? 'border-emerald-500/50 bg-emerald-900/10' 
                              : 'border-emerald-500/50 bg-emerald-50/50'
                            : ''
                        } ${
                          focusedField === item.field 
                            ? isDarkMode 
                              ? 'shadow-lg shadow-emerald-500/20' 
                              : 'shadow-lg shadow-emerald-500/10'
                            : ''
                        }`}
                        placeholder={item.placeholder}
                      />
                    )}
                  </div>
                  
                  <p className={`mt-2 text-xs ${
                    isDarkMode ? 'text-white' : 'text-slate-500'
                  }`}>
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Custom Questions Section */}
        {customQuestionsEnabled && customQuestions.length > 0 && (
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm relative z-10 ${
            isDarkMode 
                        ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-rose-100/80 border-pink-300/50 shadow-purple-200/40'
          }`}>
            <div className="mb-6">
              <h3 className={`text-xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Additional Questions
              </h3>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Custom questions specific to your dealership
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {customQuestions.map((question, index) => {
                const isCompleted = customAnswers[question.id]?.trim() !== '';
                
                return (
                  <div key={question.id} className={`relative ${
                    index === customQuestions.length - 1 && customQuestions.length % 2 === 1 
                      ? 'lg:col-span-2' 
                      : ''
                  }`}>
                    <label className={`block text-sm font-semibold mb-3 ${
                      isDarkMode ? 'text-white' : 'text-slate-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span>{question.question}</span>
                          {question.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </div>
                        {isCompleted && (
                          <CheckCircle2 className={`h-4 w-4 ${
                            isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                          }`} />
                        )}
                      </div>
                    </label>
                    
                    <div className="relative">
                      {question.type === 'dropdown' ? (
                        <Listbox
                          value={customAnswers[question.id] || ''}
                          onChange={(value) => handleCustomAnswerChange(question.id, value)}
                        >
                          <div className="relative">
                            <Listbox.Button
                              onFocus={() => setFocusedField(question.id)}
                              onBlur={() => setFocusedField(null)}
                              className={`${inputBaseClass} flex items-center justify-between ${
                                focusedField === question.id 
                                  ? 'ring-2 ring-emerald-500/20 border-emerald-500' 
                                  : ''
                              } ${
                                isCompleted 
                                  ? isDarkMode 
                                    ? 'border-emerald-500/50 bg-emerald-900/10' 
                                    : 'border-emerald-500/50 bg-emerald-50/50'
                                  : ''
                              } ${
                                focusedField === question.id 
                                  ? isDarkMode 
                                    ? 'shadow-lg shadow-emerald-500/20' 
                                    : 'shadow-lg shadow-emerald-500/10'
                                  : ''
                              }`}
                            >
                              <span className={customAnswers[question.id] ? '' : 'text-slate-500'}>
                                {customAnswers[question.id] || 'Select an option'}
                              </span>
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            </Listbox.Button>
                            
                            <Listbox.Options className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-50 ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-700' 
                                : 'bg-white border-slate-200'
                            }`}>
                              {question.options?.map((option) => (
                                <Listbox.Option
                                  key={option}
                                  value={option}
                                  className={({ active, selected }) =>
                                    `cursor-pointer px-3 py-2 text-sm ${
                                      active 
                                        ? isDarkMode 
                                          ? 'bg-slate-700 text-slate-100' 
                                          : 'bg-emerald-50 text-slate-900'
                                        : isDarkMode 
                                          ? 'text-slate-100' 
                                          : 'text-slate-900'
                                    } ${
                                      selected 
                                        ? isDarkMode 
                                          ? 'bg-emerald-900/30 text-emerald-300' 
                                          : 'bg-emerald-100 text-emerald-700'
                                        : ''
                                    } first:rounded-t-lg last:rounded-b-lg`
                                  }
                                >
                                  {option}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </div>
                        </Listbox>
                      ) : question.type === 'yes_no' ? (
                        <Listbox
                          value={customAnswers[question.id] || ''}
                          onChange={(value) => handleCustomAnswerChange(question.id, value)}
                        >
                          <div className="relative">
                            <Listbox.Button
                              onFocus={() => setFocusedField(question.id)}
                              onBlur={() => setFocusedField(null)}
                              className={`${inputBaseClass} flex items-center justify-between ${
                                focusedField === question.id 
                                  ? 'ring-2 ring-emerald-500/20 border-emerald-500' 
                                  : ''
                              } ${
                                isCompleted 
                                  ? isDarkMode 
                                    ? 'border-emerald-500/50 bg-emerald-900/10' 
                                    : 'border-emerald-500/50 bg-emerald-50/50'
                                  : ''
                              } ${
                                focusedField === question.id 
                                  ? isDarkMode 
                                    ? 'shadow-lg shadow-emerald-500/20' 
                                    : 'shadow-lg shadow-emerald-500/10'
                                  : ''
                              }`}
                            >
                              <span className={customAnswers[question.id] ? '' : 'text-slate-500'}>
                                {customAnswers[question.id] || 'Select Yes or No'}
                              </span>
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            </Listbox.Button>
                            
                            <Listbox.Options className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-50 ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-700' 
                                : 'bg-white border-slate-200'
                            }`}>
                              <Listbox.Option
                                value="Yes"
                                className={({ active, selected }) =>
                                  `cursor-pointer px-3 py-2 text-sm rounded-t-lg ${
                                    active 
                                      ? isDarkMode 
                                        ? 'bg-slate-700 text-slate-100' 
                                        : 'bg-emerald-50 text-slate-900'
                                      : isDarkMode 
                                        ? 'text-slate-100' 
                                        : 'text-slate-900'
                                  } ${
                                    selected 
                                      ? isDarkMode 
                                        ? 'bg-emerald-900/30 text-emerald-300' 
                                        : 'bg-emerald-100 text-emerald-700'
                                      : ''
                                  }`
                                }
                              >
                                Yes
                              </Listbox.Option>
                              <Listbox.Option
                                value="No"
                                className={({ active, selected }) =>
                                  `cursor-pointer px-3 py-2 text-sm rounded-b-lg ${
                                    active 
                                      ? isDarkMode 
                                        ? 'bg-slate-700 text-slate-100' 
                                        : 'bg-emerald-50 text-slate-900'
                                      : isDarkMode 
                                        ? 'text-slate-100' 
                                        : 'text-slate-900'
                                  } ${
                                    selected 
                                      ? isDarkMode 
                                        ? 'bg-emerald-900/30 text-emerald-300' 
                                        : 'bg-emerald-100 text-emerald-700'
                                      : ''
                                  }`
                                }
                              >
                                No
                              </Listbox.Option>
                            </Listbox.Options>
                          </div>
                        </Listbox>
                      ) : (
                        <input
                          type="text"
                          value={customAnswers[question.id] || ''}
                          onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                          onFocus={() => setFocusedField(question.id)}
                          onBlur={() => setFocusedField(null)}
                          className={`${inputBaseClass} ${
                            focusedField === question.id 
                              ? 'ring-2 ring-emerald-500/20 border-emerald-500' 
                              : ''
                          } ${
                            isCompleted 
                              ? isDarkMode 
                                ? 'border-emerald-500/50 bg-emerald-900/10' 
                                : 'border-emerald-500/50 bg-emerald-50/50'
                              : ''
                          } ${
                            focusedField === question.id 
                              ? isDarkMode 
                                ? 'shadow-lg shadow-emerald-500/20' 
                                : 'shadow-lg shadow-emerald-500/10'
                              : ''
                          }`}
                          placeholder="Enter your answer"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Enhanced Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200/20">
          <Button
            type="submit"
            disabled={isSubmitting}
            className={`flex items-center justify-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isSubmitting 
                ? 'scale-95' 
                : 'hover:scale-105 hover:shadow-lg'
            } ${
              isDarkMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                Saving Checklist...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-3" />
                Save Checklist
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
              isDarkMode
                ? 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-slate-100 hover:border-slate-500 hover:text-white'
                : 'border-slate-300 bg-white/50 hover:bg-slate-50 text-slate-700 hover:border-slate-400'
            }`}
          >
            <RotateCcw className="h-5 w-5 mr-3" />
            Reset Form
          </Button>
        </div>
      </form>

      {/* Enhanced Completion Status Card */}
      {completedItems > 0 && (
        <Card className={`p-6 rounded-2xl border-l-4 ${
          completedItems === totalItems
            ? isDarkMode 
              ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-900/20 to-teal-900/10 border-slate-700/50' 
              : 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-slate-200/50'
            : isDarkMode 
              ? 'border-l-amber-500 bg-gradient-to-r from-amber-900/20 to-orange-900/10 border-slate-700/50' 
              : 'border-l-amber-500 bg-gradient-to-r from-amber-50/80 to-orange-50/50 border-slate-200/50'
        }`}>
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-lg ${
              completedItems === totalItems
                ? isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100/80'
                : isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100/80'
            }`}>
              {completedItems === totalItems ? (
                <CheckCircle2 className={`h-5 w-5 ${
                  isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                }`} />
              ) : (
                <ClipboardCheck className={`h-5 w-5 ${
                  isDarkMode ? 'text-amber-400' : 'text-amber-600'
                }`} />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-sm mb-2 ${
                completedItems === totalItems
                  ? isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                  : isDarkMode ? 'text-amber-300' : 'text-amber-800'
              }`}>
                {completedItems === totalItems 
                  ? 'Checklist Complete!' 
                  : `Checklist Progress: ${Math.round(progressPercentage)}%`
                }
              </h3>
              <p className={`text-sm leading-relaxed ${
                completedItems === totalItems
                  ? isDarkMode ? 'text-emerald-200/80' : 'text-emerald-700/80'
                  : isDarkMode ? 'text-amber-200/80' : 'text-amber-700/80'
              }`}>
                {completedItems === totalItems 
                  ? 'All checklist items have been completed. Vehicle inspection is ready for review.'
                  : `${completedItems} of ${totalItems} items completed. Continue filling out the remaining checklist items.`
                }
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}