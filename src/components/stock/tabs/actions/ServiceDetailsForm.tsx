"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LicensePlate from "@/components/ui/license-plate";
import { useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery';
import { 
  Wrench, 
  Save, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Hash,
  FileText,
  StickyNote,
  RotateCcw
} from "lucide-react";
import VehicleKanbanTasks from "../../VehicleKanbanTasks";

interface ServiceDetailsFormProps {
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

export default function ServiceDetailsForm({ stockData, onSuccess }: ServiceDetailsFormProps) {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    // Stock identification fields
    stockReference: stockData?.metadata?.stockId || '',
    registration: stockData?.vehicle?.registration || '',
    serviceHistory: 'full', // 'full', 'part', 'limited'
    numberOfServices: '',
    lastServiceDate: '',
    majorServiceWork: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load existing data on component mount
  useEffect(() => {
    const loadServiceDetailsData = async () => {
      if (!stockData?.metadata?.stockId) return;
      
      try {
        console.log('📖 Loading service details for stock ID:', stockData.metadata.stockId);
        const response = await fetch(`/api/stock-actions/service-details?stockId=${stockData.metadata.stockId}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('📦 Service details API response:', result);
          
          if (result.success && result.data) {
            const data = result.data;
            console.log('📋 Setting form data with:', data);
            setFormData({
              stockReference: data.stockReference || stockData?.metadata?.stockId || '',
              registration: data.registration || stockData?.vehicle?.registration || '',
              serviceHistory: data.serviceHistory || 'full',
              numberOfServices: data.numberOfServices?.toString() || '',
              lastServiceDate: data.lastServiceDate || '', // Already in YYYY-MM-DD format
              majorServiceWork: data.majorServiceWork || '',
              notes: data.notes || ''
            });
          } else {
            console.log('📋 No existing service details found, using defaults');
            // Set default values when no data exists
            setFormData({
              stockReference: stockData?.metadata?.stockId || '',
              registration: stockData?.vehicle?.registration || '',
              serviceHistory: 'full',
              numberOfServices: '',
              lastServiceDate: '',
              majorServiceWork: '',
              notes: ''
            });
          }
        } else {
          console.warn('⚠️ Service details API returned error status:', response.status);
          // Set default values on API error
          setFormData({
            stockReference: stockData?.metadata?.stockId || '',
            registration: stockData?.vehicle?.registration || '',
            serviceHistory: 'full',
            numberOfServices: '',
            lastServiceDate: '',
            majorServiceWork: '',
            notes: ''
          });
        }
      } catch (error) {
        console.error('❌ Error loading service details data:', error);
        // Set default values on error
        setFormData({
          stockReference: stockData?.metadata?.stockId || '',
          registration: stockData?.vehicle?.registration || '',
          serviceHistory: 'full',
          numberOfServices: '',
          lastServiceDate: '',
          majorServiceWork: '',
          notes: ''
        });
      }
    };

    loadServiceDetailsData();
  }, [stockData?.metadata?.stockId, stockData?.vehicle?.registration]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setSubmitStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stockData?.metadata?.stockId) {
      alert('Stock ID is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      console.log('🚀 Submitting service details for stock ID:', stockData.metadata.stockId);
      console.log('📦 Form data being sent:', formData);
      
      const response = await fetch('/api/stock-actions/service-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockId: stockData.metadata.stockId,
          ...formData
        }),
      });

      const result = await response.json();
      console.log('📡 API Response:', result);

      if (response.ok && result.success) {
        console.log('✅ Service details saved successfully');
        setSubmitStatus('success');
        
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({
          queryKey: inventoryQueryKeys.all
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error('❌ Server error:', result.error || result.details);
        setSubmitStatus('error');
        alert(`Error: ${result.error || result.details || 'Failed to save service details'}`);
      }
    } catch (error) {
      console.error('❌ Network/Submit error:', error);
      setSubmitStatus('error');
      alert('Failed to save service details. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      stockReference: stockData?.metadata?.stockId || '',
      registration: stockData?.vehicle?.registration || '',
      serviceHistory: 'full',
      numberOfServices: '',
      lastServiceDate: '',
      majorServiceWork: '',
      notes: ''
    });
    setSubmitStatus('idle');
  };

  return (
    <div className={`flex gap-6 p-6 lg:p-8 max-w-7xl mx-auto min-h-[calc(100vh-8rem)] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Left side - Service Details (60%) */}
      <div className="flex-1 w-3/5 space-y-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <div className={`p-3 rounded-xl ${
            isDarkMode 
              ? 'bg-orange-500/20 text-orange-400' 
              : 'bg-orange-50 text-orange-600'
          }`}>
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Service Details</h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Record service history and maintenance information
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Stock Information Card */}
          <Card className={`p-6 ${
            isDarkMode 
              ? 'bg-gray-800/50 border-gray-700' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Stock Reference
                </p>
                <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formData.stockReference}
                </p>
              </div>
              {formData.registration && (
                <LicensePlate 
                  registration={formData.registration}
                  size="sm"
                />
              )}
            </div>
          </Card>

          {/* Service History Section */}
          <Card className={`p-8 ${
            isDarkMode 
              ? 'bg-gray-800/50 border-gray-700' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center mb-6">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Service History
              </h3>

              {/* Service History Type */}
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Service History Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.serviceHistory}
                  onChange={(e) => handleInputChange('serviceHistory', e.target.value)}
                  onFocus={() => setFocusedField('serviceHistory')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                    focusedField === 'serviceHistory'
                      ? isDarkMode
                        ? 'border-blue-500 bg-gray-700 text-white ring-2 ring-blue-500/20'
                        : 'border-blue-500 bg-white text-gray-900 ring-2 ring-blue-500/20'
                      : isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                  }`}
                >
                  <option value="full">Full</option>
                  <option value="part">Part</option>
                  <option value="limited">Limited</option>
              </select>
            </div>

            {/* Number of Services */}
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Hash className="h-4 w-4 inline mr-1" />
                Number of Services
              </label>
              <input
                type="number"
                min="0"
                value={formData.numberOfServices}
                onChange={(e) => handleInputChange('numberOfServices', e.target.value)}
                onFocus={() => setFocusedField('numberOfServices')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter number of services"
                className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                  focusedField === 'numberOfServices'
                    ? isDarkMode
                      ? 'border-blue-500 bg-gray-700 text-white ring-2 ring-blue-500/20'
                      : 'border-blue-500 bg-white text-gray-900 ring-2 ring-blue-500/20'
                    : isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                }`}
              />
            </div>

            {/* Last Service Date */}
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Calendar className="h-4 w-4 inline mr-1" />
                Last Service Date
              </label>
              <input
                type="date"
                value={formData.lastServiceDate}
                onChange={(e) => handleInputChange('lastServiceDate', e.target.value)}
                onFocus={() => setFocusedField('lastServiceDate')}
                onBlur={() => setFocusedField(null)}
                className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                  focusedField === 'lastServiceDate'
                    ? isDarkMode
                      ? 'border-blue-500 bg-gray-700 text-white ring-2 ring-blue-500/20'
                      : 'border-blue-500 bg-white text-gray-900 ring-2 ring-blue-500/20'
                    : isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                }`}
              />
            </div>

            {/* Major Service Work */}
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <FileText className="h-4 w-4 inline mr-1" />
                Major Service Work Completed
                <span className={`text-xs ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  (max 300 characters)
                </span>
              </label>
              <textarea
                value={formData.majorServiceWork}
                onChange={(e) => handleInputChange('majorServiceWork', e.target.value)}
                onFocus={() => setFocusedField('majorServiceWork')}
                onBlur={() => setFocusedField(null)}
                maxLength={300}
                rows={3}
                placeholder="Describe major service work completed (e.g., timing belt replacement, brake service, etc.)"
                className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 resize-none ${
                  focusedField === 'majorServiceWork'
                    ? isDarkMode
                      ? 'border-blue-500 bg-gray-700 text-white ring-2 ring-blue-500/20'
                      : 'border-blue-500 bg-white text-gray-900 ring-2 ring-blue-500/20'
                    : isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                }`}
              />
              <div className={`text-xs mt-1 text-right ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formData.majorServiceWork.length}/300 characters
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <StickyNote className="h-4 w-4 inline mr-1" />
                Notes
                <span className={`text-xs ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  (max 1000 characters)
                </span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                onFocus={() => setFocusedField('notes')}
                onBlur={() => setFocusedField(null)}
                maxLength={1000}
                rows={4}
                placeholder="Additional notes or observations about the vehicle's service history..."
                className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 resize-none ${
                  focusedField === 'notes'
                    ? isDarkMode
                      ? 'border-blue-500 bg-gray-700 text-white ring-2 ring-blue-500/20'
                      : 'border-blue-500 bg-white text-gray-900 ring-2 ring-blue-500/20'
                    : isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                }`}
              />
              <div className={`text-xs mt-1 text-right ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formData.notes.length}/1000 characters
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 px-8 py-4 text-white font-medium rounded-xl transition-all duration-200 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : submitStatus === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : submitStatus === 'error'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : submitStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Saved Successfully
              </>
            ) : submitStatus === 'error' ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Save Failed - Retry
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Service Details
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
            className={`px-8 py-4 font-medium rounded-xl transition-all duration-200 ${
              isDarkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Form
          </Button>
        </div>
      </form>
      </div>

      {/* Right side - Vehicle Kanban Tasks (40%) */}
      <div className="w-2/5 min-w-0 flex flex-col min-h-[calc(100vh-10rem)]">
        <VehicleKanbanTasks 
          stockId={stockData?.metadata?.stockId || ''} 
          registration={formData.registration}
        />
      </div>
    </div>
  );
}
