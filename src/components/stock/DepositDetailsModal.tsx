"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import { 
  X, 
  Calendar, 
  PoundSterling, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Save,
  Sparkles
} from "lucide-react";

interface DepositDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockId?: string;
  stockData?: any;
  onSuccess?: () => void;
}

interface DepositData {
  requiredDeposit: string;
  depositAmount: string;
  depositDate: string;
  // Customer details from sale details
  firstName: string;
  lastName: string;
  emailAddress: string;
  contactNumber: string;
  addressFirstLine: string;
  addressPostCode: string;
}

export default function DepositDetailsModal({ 
  isOpen, 
  onClose, 
  stockId, 
  stockData, 
  onSuccess 
}: DepositDetailsModalProps) {
  const { isDarkMode } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [depositData, setDepositData] = useState<DepositData>({
    requiredDeposit: '',
    depositAmount: '',
    depositDate: new Date().toISOString().split('T')[0],
    firstName: '',
    lastName: '',
    emailAddress: '',
    contactNumber: '',
    addressFirstLine: '',
    addressPostCode: ''
  });

  // Load existing sale details data when modal opens
  useEffect(() => {
    if (isOpen && (stockId || stockData?.metadata?.stockId)) {
      loadSaleDetailsData();
    }
  }, [isOpen, stockId, stockData?.metadata?.stockId]);

  const loadSaleDetailsData = async () => {
    const currentStockId = stockId || stockData?.metadata?.stockId;
    if (!currentStockId) return;
    
    try {
      const response = await fetch(`/api/stock-actions/sale-details?stockId=${currentStockId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const saleData = result.data;
          setDepositData(prev => ({
            ...prev,
            // Pre-fill with existing deposit data if available - convert numbers to strings for inputs
            requiredDeposit: saleData.requiredAmount ? String(saleData.requiredAmount) : '',
            depositAmount: saleData.depositAmount ? String(saleData.depositAmount) : '',
            depositDate: saleData.depositDate ? new Date(saleData.depositDate).toISOString().split('T')[0] : prev.depositDate,
            // Pre-fill customer details from sale details
            firstName: saleData.firstName || '',
            lastName: saleData.lastName || '',
            emailAddress: saleData.emailAddress || saleData.customerEmail || '',
            contactNumber: saleData.contactNumber || saleData.customerPhone || '',
            addressFirstLine: saleData.addressFirstLine || saleData.customerAddress || '',
            addressPostCode: saleData.addressPostCode || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error loading sale details data:', error);
    }
  };

  const handleInputChange = (field: keyof DepositData, value: string) => {
    setDepositData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle address selection from Google Maps
  const handleAddressSelect = (parsedAddress: any) => {
    setDepositData(prev => ({
      ...prev,
      addressFirstLine: parsedAddress.streetName + (parsedAddress.streetNumber ? ` ${parsedAddress.streetNumber}` : ''),
      addressPostCode: parsedAddress.postcode
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const currentStockId = stockId || stockData?.metadata?.stockId;
      if (!currentStockId) {
        throw new Error('Stock ID is required');
      }

      // Update the sale details with deposit information and customer details
      const apiData = {
        stockId: currentStockId,
        stockReference: currentStockId,
        registration: stockData?.vehicle?.registration || '',
        // Always save deposit data regardless of depositPaid status
        requiredAmount: depositData.requiredDeposit || null,
        depositAmount: depositData.depositAmount || null,
        depositDate: depositData.depositDate || null,
        // Set depositPaid to true only if deposit amount is provided, otherwise preserve existing state
        depositPaid: depositData.depositAmount ? true : undefined, // undefined means don't update this field
        firstName: depositData.firstName || null,
        lastName: depositData.lastName || null,
        emailAddress: depositData.emailAddress || null,
        contactNumber: depositData.contactNumber || null,
        addressFirstLine: depositData.addressFirstLine || null,
        addressPostCode: depositData.addressPostCode || null
      };

      console.log('📝 Saving deposit details:', apiData);

      const response = await fetch('/api/stock-actions/sale-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Deposit details saved successfully:', result.data);
        alert('Deposit details saved successfully!');
        
        // Call onSuccess callback to refresh action statuses
        if (onSuccess) {
          console.log('🔄 Calling onSuccess callback to refresh action statuses');
          onSuccess();
        }
        
        onClose();
      } else {
        console.error('❌ API Error:', result.error);
        alert(`Failed to save deposit details: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error saving deposit details:', error);
      alert('Failed to save deposit details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputBaseClass = `w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-indigo-500/20'
  }`;

  const labelClass = `block text-sm font-semibold mb-2 ${
    isDarkMode ? 'text-white' : 'text-slate-700'
  }`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pt-20 z-[60]">
      <div className={`w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-xl border shadow-2xl ${
        isDarkMode 
          ? 'bg-slate-900/95 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${
          isDarkMode 
            ? 'bg-slate-900/80 border-slate-700/50' 
            : 'bg-white/80 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30' 
                  : 'bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/50'
              }`}>
                <PoundSterling className={`h-4 w-4 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  Deposit Details
                </h2>
                <p className={`text-xs ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Manage deposit and customer information
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' 
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
              }`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Deposit Information */}
          <div className={`p-3 rounded-lg border ${
            isDarkMode 
              ? 'bg-slate-800/30 border-slate-700/50' 
              : 'bg-slate-50/50 border-slate-200/50'
          }`}>
            <h3 className={`text-base font-semibold mb-3 flex items-center ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>
              <PoundSterling className="h-4 w-4 mr-2" />
              Deposit Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>
                  Required Deposit
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depositData.requiredDeposit}
                  onChange={(e) => handleInputChange('requiredDeposit', e.target.value)}
                  placeholder="£0.00"
                  className={inputBaseClass}
                />
              </div>
              
              <div>
                <label className={labelClass}>
                  Deposit Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depositData.depositAmount}
                  onChange={(e) => handleInputChange('depositAmount', e.target.value)}
                  placeholder="£0.00"
                  className={inputBaseClass}
                />
              </div>
              
              <div>
                <label className={labelClass}>
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date of Deposit
                </label>
                <input
                  type="date"
                  value={depositData.depositDate}
                  onChange={(e) => handleInputChange('depositDate', e.target.value)}
                  className={inputBaseClass}
                />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className={`p-3 rounded-lg border ${
            isDarkMode 
              ? 'bg-slate-800/30 border-slate-700/50' 
              : 'bg-slate-50/50 border-slate-200/50'
          }`}>
            <h3 className={`text-base font-semibold mb-3 flex items-center ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>
              <User className="h-4 w-4 mr-2" />
              Customer Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  First Name
                </label>
                <input
                  type="text"
                  value={depositData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  className={inputBaseClass}
                />
              </div>
              
              <div>
                <label className={labelClass}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={depositData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  className={inputBaseClass}
                />
              </div>
              
              <div>
                <label className={labelClass}>
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={depositData.emailAddress}
                  onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                  placeholder="customer@example.com"
                  className={inputBaseClass}
                />
              </div>
              
              <div>
                <label className={labelClass}>
                  <Phone className="h-4 w-4 inline mr-1" />
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={depositData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  placeholder="Enter phone number"
                  className={inputBaseClass}
                />
              </div>
              
              {/* Address Search with Google Maps */}
              <div className="sm:col-span-2">
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  placeholder="Start typing a UK address..."
                  label="Search Address"
                  showLabel={true}
                />
              </div>
              
              <div>
                <label className={labelClass}>
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Address
                </label>
                <input
                  type="text"
                  value={depositData.addressFirstLine}
                  onChange={(e) => handleInputChange('addressFirstLine', e.target.value)}
                  placeholder="Enter address"
                  className={inputBaseClass}
                />
              </div>
              
              <div>
                <label className={labelClass}>
                  Post Code
                </label>
                <input
                  type="text"
                  value={depositData.addressPostCode}
                  onChange={(e) => handleInputChange('addressPostCode', e.target.value)}
                  placeholder="Enter post code"
                  className={inputBaseClass}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-6 ${
                isDarkMode 
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Deposit Details'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
