"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LicensePlate from "@/components/ui/license-plate";
import { useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery';
import {
  Package,
  Save,
  RotateCcw,
  AlertCircle,
  Calendar,
  PoundSterling,
  Hash,
  CheckCircle2,
  Sparkles,
  Banknote,
  Calculator,
  Building2
} from "lucide-react";

interface EditInventoryFormProps {
  stockData: any;
  onSuccess?: () => void;
}

export default function EditInventoryForm({ stockData, onSuccess }: EditInventoryFormProps) {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    stockReference: stockData?.metadata?.stockId || '',
    registration: stockData?.vehicle?.registration || '',
    dateOfPurchase: '',
    costOfPurchase: '',
    purchaseFrom: '',
    fundingAmount: '',
    fundingSourceId: '',
    businessAmount: '',
    vatScheme: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fundSources, setFundSources] = useState<Array<{ id: string, fundName: string }>>([]);

  // Load existing data on component mount
  useEffect(() => {
    const loadInventoryDetailsData = async () => {
      if (!stockData?.metadata?.stockId) return;

      try {
        const response = await fetch(`/api/stock-actions/inventory-details?stockId=${stockData.metadata.stockId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const data = result.data;
            setFormData({
              stockReference: data.stockReference || stockData?.metadata?.stockId || '',
              registration: data.registration || stockData?.vehicle?.registration || '',
              dateOfPurchase: data.dateOfPurchase ? new Date(data.dateOfPurchase).toISOString().split('T')[0] : '',
              costOfPurchase: data.costOfPurchase || '',
              purchaseFrom: data.purchaseFrom || '',
              fundingAmount: data.fundingAmount || '',
              fundingSourceId: data.fundingSourceId || '',
              businessAmount: data.businessAmount || '',
              vatScheme: data.vatScheme || null
            });
          } else {
            setFormData(prev => {
              return {
                ...prev,
                vatScheme: result.vatScheme || null
              };
            });
          }
        }
      } catch (error) {
        console.error('Error loading inventory details data:', error);
      }
    };

    const loadFundSources = async () => {
      try {
        const response = await fetch('/api/fund-sources');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setFundSources(result.data.filter((source: any) => source.status === 'active'));
          }
        }
      } catch (error) {
        console.error('Error loading fund sources:', error);
      }
    };

    loadInventoryDetailsData();
    loadFundSources();
  }, [stockData?.metadata?.stockId]);

  const getVatQualificationStatus = (vatScheme: string | null): string => {
    if (!vatScheme || vatScheme === null) return 'Non-Qualifying';
    return 'Qualifying';
  };

  const handleInputChange = (field: string, value: string | null) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Auto-calculate business amount when cost or funding amount changes
      if (field === 'costOfPurchase' || field === 'fundingAmount') {
        const costOfPurchase = parseFloat(field === 'costOfPurchase' ? value! : prev.costOfPurchase) || 0;
        const fundingAmount = parseFloat(field === 'fundingAmount' ? value! : prev.fundingAmount) || 0;
        newData.businessAmount = (costOfPurchase - fundingAmount).toString();
      }

      return newData;
    });
  };



  const vatSchemeOptions = [
    { value: null, label: 'None paid', description: '' },
    { value: 'includes', label: 'Paid inclusive', description: '' },
    { value: 'excludes', label: 'Paid exclusive', description: '' }
  ];

  // Calculate Gross Purchase Cost
  const calculateGrossPurchaseCost = () => {
    const costOfPurchase = parseFloat(formData.costOfPurchase) || 0;
    if (!formData.vatScheme || formData.vatScheme === 'includes') {
      return costOfPurchase; // No VAT or includes VAT = same as cost of purchase
    } else if (formData.vatScheme === 'excludes') {
      return costOfPurchase * 1.2; // Excludes VAT = 120% of cost of purchase
    }
    return costOfPurchase;
  };

  // Calculate Net Purchase Cost
  const calculateNetPurchaseCost = () => {
    const costOfPurchase = parseFloat(formData.costOfPurchase) || 0;
    if (!formData.vatScheme || formData.vatScheme === 'excludes') {
      return costOfPurchase; // No VAT or excludes VAT = same as cost of purchase
    } else if (formData.vatScheme === 'includes') {
      return (costOfPurchase / 6) * 5; // Includes VAT = cost of purchase / 6 * 5
    }
    return costOfPurchase;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const apiData = {
        stockId: formData.stockReference,
        stockReference: formData.stockReference,
        registration: formData.registration,
        dateOfPurchase: formData.dateOfPurchase,
        costOfPurchase: formData.costOfPurchase,
        purchaseFrom: formData.purchaseFrom,
        fundingAmount: formData.fundingAmount,
        fundingSourceId: formData.fundingSourceId,
        businessAmount: formData.businessAmount,
        vatScheme: formData.vatScheme || null
      };

      console.log('📝 Saving inventory details:', apiData);

      const response = await fetch('/api/stock-actions/inventory-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Inventory details saved successfully:', result.data);

        // Show success message with fund transaction info if applicable
        let successMessage = 'Inventory details updated successfully!';
        if (result.fundTransaction) {
          successMessage += `\n\n💰 Fund transaction created:\n- Amount: £${result.fundTransaction.amount}\n- Type: ${result.fundTransaction.transactionType}\n- Status: ${result.fundTransaction.status}`;
        }

        alert(successMessage);

        // Invalidate inventory cache to reflect updated inventory details
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
        console.log('🔄 Inventory cache invalidated - inventory details will reflect in inventory table');

        // Call onSuccess callback to invalidate inventory cache
        if (onSuccess) {
          console.log('🔄 Calling onSuccess callback to refresh inventory cache');
          onSuccess();
        }
      } else {
        console.error('❌ API Error:', result.error);
        alert(`Failed to save inventory details: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error updating inventory:', error);
      alert('Failed to update inventory details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      stockReference: stockData?.metadata?.stockId || '',
      registration: stockData?.vehicle?.registration || '',
      dateOfPurchase: '',
      costOfPurchase: '',
      purchaseFrom: '',
      fundingAmount: '',
      fundingSourceId: '',
      businessAmount: '',
      vatScheme: null
    });
  };

  const inputBaseClass = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${isDarkMode
    ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-blue-500/20'
    }`;

  const labelClass = `block text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-700'
    }`;

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-emerald-100/80 via-teal-100/60 to-cyan-100/80">
      {/* Enhanced Header with Gradient */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-2xl blur-xl opacity-20 ${isDarkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-400 to-purple-500'
          }`} />

        <div className={`relative p-6 rounded-2xl border backdrop-blur-sm ${isDarkMode
          ? 'bg-slate-900/80 border-slate-700/50'
          : 'bg-emerald-100/70 border-teal-300/60 shadow-cyan-200/50'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${isDarkMode
                ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30'
                : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200/50'
                }`}>
                <Package className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold bg-gradient-to-r ${isDarkMode
                  ? 'from-slate-100 to-slate-300 bg-clip-text text-transparent'
                  : 'from-slate-800 to-slate-600 bg-clip-text text-transparent'
                  }`}>
                  Purchase Info
                </h2>
                <p className={`text-sm flex items-center mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Update inventory information for this vehicle
                </p>
              </div>
              {/* VAT Status Badge */}
              <div className="flex items-center">
                <div className={`px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
                  isDarkMode
                      ? 'bg-gray-500/20 text-gray-300 border-gray-500/40 shadow-lg shadow-gray-500/10'
                      : 'bg-gray-50 text-gray-700 border-gray-300 shadow-lg shadow-gray-200/50'
                }`}>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      'bg-gray-500'
                    }`} />
                    <span className="font-medium">
                      VAT Status: {getVatQualificationStatus(formData.vatScheme)}
                    </span>
                  </div>
                  <div className={`text-xs mt-0.5 opacity-75 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {formData.vatScheme ? 
                      formData.vatScheme === 'includes' ? 'Price includes VAT' : 'Price excludes VAT'
                      : ''
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Form */}
      <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${isDarkMode
        ? 'bg-slate-900/50 border-slate-700/50'
        : 'bg-emerald-100/80 border-teal-300/50 shadow-cyan-200/40'
        }`}>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stock ID and Registration Combined Field */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stock ID */}
                <div className="group">
                  <label className={labelClass}>
                    Stock ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.stockReference}
                      readOnly
                      className={`${inputBaseClass} ${isDarkMode
                        ? 'bg-slate-800/30 border-slate-700/30 text-slate-400'
                        : 'bg-slate-100/50 border-slate-200/50 text-slate-600'
                        } cursor-not-allowed pr-10`}
                      placeholder="Stock ID"
                    />
                    <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center ${isDarkMode ? 'text-white' : 'text-slate-400'
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
            </div>

            {/* Date of Purchase */}
            <div className="relative">
              <label className={labelClass}>
                <Calendar className="inline h-4 w-4 mr-2" />
                Date of Purchase
              </label>
              <div className="relative group">
                <input
                  type="date"
                  value={formData.dateOfPurchase}
                  onChange={(e) => handleInputChange('dateOfPurchase', e.target.value)}
                  onFocus={() => setFocusedField('dateOfPurchase')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${focusedField === 'dateOfPurchase'
                    ? 'ring-2 ring-blue-500/20 border-blue-500 scale-[1.02]'
                    : ''
                    }`}
                />
                <div className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-200 ${focusedField === 'dateOfPurchase'
                  ? isDarkMode
                    ? 'shadow-lg shadow-blue-500/20'
                    : 'shadow-lg shadow-blue-500/10'
                  : ''
                  }`} />
              </div>
            </div>

<div className="flex gap-4 items-start">

            {/* Cost of Purchase */}
            <div className="relative w-1/2">
              <label className={labelClass}>
                <PoundSterling className="inline h-4 w-4 mr-2" />
                Cost of Purchase
              </label>
              <div className="relative group">
                <input
                  type="number"
                  step="0.01"
                  value={formData.costOfPurchase}
                  onChange={(e) => handleInputChange('costOfPurchase', e.target.value)}
                  onFocus={() => setFocusedField('costOfPurchase')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} pl-10 ${focusedField === 'costOfPurchase'
                    ? 'ring-2 ring-blue-500/20 border-blue-500 scale-[1.02]'
                    : ''
                    }`}
                  placeholder="Enter purchase cost"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-200' : 'text-slate-500'
                  }`}>
                  £
                </div>
                <div className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-200 ${focusedField === 'costOfPurchase'
                  ? isDarkMode
                    ? 'shadow-lg shadow-blue-500/20'
                    : 'shadow-lg shadow-blue-500/10'
                  : ''
                  }`} />
              </div>
            </div>
            {/* VAT Scheme Selection */}
                  <div className="mb-6 w-1/2">
                    <label className={labelClass}>
                      <PoundSterling className="inline h-4 w-4 mr-2" />
                      VAT Qualifying
                    </label>
                    <select
                      value={formData.vatScheme || ''}
                      onChange={(e) => handleInputChange('vatScheme', e.target.value || null)}
                      onFocus={() => setFocusedField('vatScheme')}
                      onBlur={() => setFocusedField(null)}
                      className={`${inputBaseClass} ${focusedField === 'vatScheme' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                        }`}
                    >
                      {vatSchemeOptions.map((option) => (
                        <option key={option.value || 'null'} value={option.value || ''}>
                          {option.label} {option.description && ` - ${option.description}`}
                        </option>
                      ))}
                    </select>
                    <div className={`mt-1 text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'
                      }`}>
                      Select how VAT is handled for this vehicle's sale price
                    </div>
                  </div>
            </div>

            {/* Purchase From */}
            <div className="relative">
              <label className={labelClass}>
                <Building2 className="inline h-4 w-4 mr-2" />
                Purchase From
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={formData.purchaseFrom}
                  onChange={(e) => handleInputChange('purchaseFrom', e.target.value)}
                  onFocus={() => setFocusedField('purchaseFrom')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${focusedField === 'purchaseFrom'
                    ? 'ring-2 ring-blue-500/20 border-blue-500 scale-[1.02]'
                    : ''
                    }`}
                  placeholder="Enter seller/dealer name"
                />
                <div className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-200 ${focusedField === 'purchaseFrom'
                  ? isDarkMode
                    ? 'shadow-lg shadow-blue-500/20'
                    : 'shadow-lg shadow-blue-500/10'
                  : ''
                  }`} />
              </div>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'
                }`}>
                Name of the seller, dealer, or auction house
              </p>
            </div>

            {/* Funding Amount */}
            <div className="relative">
              <label className={labelClass}>
                <Banknote className="inline h-4 w-4 mr-2" />
                Funding Amount
              </label>
              <div className="relative group">
                <input
                  type="number"
                  step="0.01"
                  value={formData.fundingAmount}
                  onChange={(e) => handleInputChange('fundingAmount', e.target.value)}
                  onFocus={() => setFocusedField('fundingAmount')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} pl-10 ${focusedField === 'fundingAmount'
                    ? 'ring-2 ring-blue-500/20 border-blue-500 scale-[1.02]'
                    : ''
                    }`}
                  placeholder="Enter funding amount"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-200' : 'text-slate-500'
                  }`}>
                  £
                </div>
                <div className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-200 ${focusedField === 'fundingAmount'
                  ? isDarkMode
                    ? 'shadow-lg shadow-blue-500/20'
                    : 'shadow-lg shadow-blue-500/10'
                  : ''
                  }`} />
              </div>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'
                }`}>
                Amount funded from external financing source
              </p>
            </div>

            {/* Funding Source */}
            <div className="relative">
              <label className={labelClass}>
                <Hash className="inline h-4 w-4 mr-2" />
                Funding Source
              </label>
              <div className="relative group">
                <select
                  value={formData.fundingSourceId}
                  onChange={(e) => handleInputChange('fundingSourceId', e.target.value)}
                  onFocus={() => setFocusedField('fundingSourceId')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${focusedField === 'fundingSourceId'
                    ? 'ring-2 ring-blue-500/20 border-blue-500 scale-[1.02]'
                    : ''
                    }`}
                >
                  <option value="">Select funding source (optional)</option>
                  {fundSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.fundName}
                    </option>
                  ))}
                </select>
                <div className={`absolute inset-0 rounded-xl pointer-events-none transition-all duration-200 ${focusedField === 'fundingSourceId'
                  ? isDarkMode
                    ? 'shadow-lg shadow-blue-500/20'
                    : 'shadow-lg shadow-blue-500/10'
                  : ''
                  }`} />
              </div>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'
                }`}>
                Select the source of funding for this purchase
              </p>
            </div>

            {/* Business Amount (Read-only, calculated) */}
            <div className="relative">
              <label className={labelClass}>
                <Calculator className="inline h-4 w-4 mr-2" />
                Business Amount
              </label>
              <div className="relative group">
                <input
                  type="number"
                  value={formData.businessAmount}
                  readOnly
                  className={`${inputBaseClass} pl-10 ${isDarkMode
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-400'
                    : 'bg-slate-100/50 border-slate-200/50 text-slate-600'
                    } cursor-not-allowed`}
                  placeholder="Calculated automatically"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                  £
                </div>
                <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center ${isDarkMode ? 'text-slate-300' : 'text-slate-400'
                  }`}>
                  🔒
                </div>
              </div>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'
                }`}>
                Automatically calculated: Cost of Purchase - Funding Amount
              </p>
            </div>

            {/* Gross Purchase Cost (Read-only, calculated) */}
            <div className="relative">
              <label className={labelClass}>
                <Calculator className="inline h-4 w-4 mr-2" />
                Gross Purchase Cost
              </label>
              <div className="relative group">
                <input
                  type="number"
                  value={calculateGrossPurchaseCost().toFixed(2)}
                  readOnly
                  className={`${inputBaseClass} pl-10 pr-12 ${isDarkMode
                    ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-600/40 text-blue-300'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300/60 text-blue-700'
                    } cursor-not-allowed ring-1 ${isDarkMode ? 'ring-blue-500/20' : 'ring-blue-200/50'
                    }`}
                  placeholder="Calculated automatically"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}>
                  £
                </div>
                <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}>
                  <Calculator className="h-3 w-3" />
                </div>
              </div>
              <p className={`text-xs mt-1 flex items-center ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600/80'
                }`}>
                Cost of purchase including any VAT where applicable
              </p>
            </div>

            {/* Net Purchase Cost (Read-only, calculated) */}
            <div className="relative">
              <label className={labelClass}>
                <Calculator className="inline h-4 w-4 mr-2" />
                Net Purchase Cost
              </label>
              <div className="relative group">
                <input
                  type="number"
                  value={calculateNetPurchaseCost().toFixed(2)}
                  readOnly
                  className={`${inputBaseClass} pl-10 pr-12 ${isDarkMode
                    ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-600/40 text-blue-300'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300/60 text-blue-700'
                    } cursor-not-allowed ring-1 ${isDarkMode ? 'ring-blue-500/20' : 'ring-blue-200/50'
                    }`}
                  placeholder="Calculated automatically"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}>
                  £
                </div>
                <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}>
                  <Calculator className="h-3 w-3" />
                </div>
              </div>
              <p className={`text-xs mt-1 flex items-center ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600/80'
                }`}>
                Cost of purchase excluding any VAT where applicable
              </p>
            </div>

          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-200/20">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center justify-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${isSubmitting
                ? 'scale-95'
                : 'hover:scale-105 hover:shadow-lg'
                } ${isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-3" />
                  Save Changes
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${isDarkMode
                ? 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-slate-100 hover:border-slate-500 hover:text-white'
                : 'border-slate-300 bg-white/50 hover:bg-slate-50 text-slate-700 hover:border-slate-400'
                }`}
            >
              <RotateCcw className="h-5 w-5 mr-3" />
              Reset Form
            </Button>
          </div>
        </form>
      </Card>

      {/* Enhanced Info Card */}
      <Card className={`p-6 rounded-2xl border-l-4 ${isDarkMode
        ? 'border-l-blue-500 bg-gradient-to-r from-blue-900/20 to-purple-900/10 border-slate-700/50'
        : 'border-l-blue-500 bg-gradient-to-r from-blue-50/80 to-purple-50/50 border-slate-200/50'
        }`}>
        <div className="flex items-start space-x-4">
          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100/80'
            }`}>
            <AlertCircle className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-sm mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'
              }`}>
              Inventory Update Notice
            </h3>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-blue-200/80' : 'text-blue-700/80'
              }`}>
              Changes to inventory details will be reflected across all related systems and reports.
              Ensure all information is accurate before saving.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}