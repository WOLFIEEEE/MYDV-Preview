"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LicensePlate from "@/components/ui/license-plate";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import { useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery';
import { 
  Handshake, 
  Save, 
  User,
  Calendar,
  PoundSterling,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Shield,
  Truck,
  AlertTriangle,
  Sparkles,
  Building,
  Calculator,
  AlertCircle,
  Download
} from "lucide-react";

interface SaleDetailsFormProps {
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

interface YesNoToggleProps {
  label?: string;
  value: boolean;
  onChange: (val: boolean) => void;
}

function YesNoToggle({ label, value, onChange }: YesNoToggleProps) {
  const { isDarkMode } = useTheme();
  
  return (
    <div>
      {label && (
        <label className={`block text-sm font-semibold mb-3 ${
          isDarkMode ? 'text-white' : 'text-slate-700'
        }`}>
          {label}
        </label>
      )}
      <div className={`inline-flex rounded-xl border overflow-hidden transition-all duration-200 ${
        isDarkMode ? 'border-slate-600' : 'border-slate-300'
      }`}>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
            value
              ? isDarkMode 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'bg-indigo-600 text-white shadow-lg'
              : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-4 py-2 text-sm font-medium border-l transition-all duration-200 ${
            isDarkMode ? 'border-slate-600' : 'border-slate-300'
          } ${
            !value
              ? isDarkMode 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'bg-indigo-600 text-white shadow-lg'
              : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function SaleDetailsForm({ stockData, onSuccess }: SaleDetailsFormProps) {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  // Helper functions for date calculations
  const getMonthFromDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getQuarterFromDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const quarter = Math.ceil(month / 3);
    const year = date.getFullYear();
    return `Q${quarter} ${year}`;
  };
  
  const [formData, setFormData] = useState({
    // Stock identification fields
    stockReference: stockData?.metadata?.stockId || '',
    registration: stockData?.vehicle?.registration || '',
    saleDate: new Date().toISOString().split('T')[0],
    monthOfSale: getMonthFromDate(new Date().toISOString().split('T')[0]),
    quarterOfSale: getQuarterFromDate(new Date().toISOString().split('T')[0]),
    salePrice: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    salesPersonId: '',
    paymentMethod: 'cash',
    financeProvider: '',
    warrantyType: 'none',
    warrantyMonths: '',
    deliveryType: 'collection', // 'delivery' or 'collection'
    deliveryPrice: '',
    deliveryDate: '',
    deliveryAddress: '',
    notes: '',
    documentationComplete: false,
    keyHandedOver: false,
    customerSatisfied: false,
    // Payment breakdown fields
          cashAmount: '',
      bacsAmount: '',
      financeAmount: '',
      depositAmount: '',
      partExAmount: '',
      cardAmount: '',
      requiredAmount: '',
    // Extended customer info
    firstName: '',
    lastName: '',
    emailAddress: '',
    contactNumber: '',
    addressFirstLine: '',
    addressPostCode: '',
    vulnerabilityMarker: false,
    depositPaid: false,
    vehiclePurchased: false,
    enquiry: false,
    gdprConsent: false,
    salesMarketingConsent: false,
    // Conditional vulnerability follow-ups
    requiresAdditionalSupport: false,
    preferredContactTime: '',
    vulnerabilityNotes: '',
    // New completion checklist fields
    wheelNuts: false,
    tyrePressures: false,
    tyreSensors: false,
    oilLevel: false,
    coolantLevel: false,
    screenWash: false,
    lockingNutGloveBox: false,
    bookPackGloveBox: false,
    inflationKit: false,
    keyBatteries: false,
    batteryTest: false,
    testDriver: false,
        adequateDriveAwayFuel: false,
        washerJets: false,
        wipers: false,
        bulbs: false,
        additionalText: '',
        completionDate: ''
  });

    const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('basic');

  // Load existing data on component mount
  useEffect(() => {
    const loadSaleDetailsData = async () => {
      if (!stockData?.metadata?.stockId) return;
      
      try {
        const response = await fetch(`/api/stock-actions/sale-details?stockId=${stockData.metadata.stockId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const data = result.data;
            setFormData({
              stockReference: data.stockReference || stockData?.metadata?.stockId || '',
              registration: data.registration || stockData?.vehicle?.registration || '',
              saleDate: data.saleDate ? new Date(data.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              monthOfSale: data.monthOfSale || getMonthFromDate(data.saleDate ? new Date(data.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
              quarterOfSale: data.quarterOfSale || getQuarterFromDate(data.saleDate ? new Date(data.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
              salePrice: data.salePrice || '',
              customerName: data.customerName || '',
              customerEmail: data.customerEmail || '',
              customerPhone: data.customerPhone || '',
              customerAddress: data.customerAddress || '',
              salesPersonId: data.salesPersonId || '',
              paymentMethod: data.paymentMethod || 'cash',
              financeProvider: data.financeProvider || '',
              warrantyType: data.warrantyType || 'none',
              warrantyMonths: data.warrantyMonths?.toString() || '',
              deliveryType: data.deliveryType || 'collection',
              deliveryPrice: data.deliveryPrice?.toString() || '',
              deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString().split('T')[0] : '',
              deliveryAddress: data.deliveryAddress || '',
              notes: data.notes || '',
              documentationComplete: data.documentationComplete || false,
              keyHandedOver: data.keyHandedOver || false,
              customerSatisfied: data.customerSatisfied || false,
              cashAmount: data.cashAmount || '',
              bacsAmount: data.bacsAmount || '',
              financeAmount: data.financeAmount || '',
              depositAmount: data.depositAmount || '',
              partExAmount: data.partExAmount || '',
              cardAmount: data.cardAmount || '',
              requiredAmount: data.requiredAmount || '',
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              emailAddress: data.emailAddress || '',
              contactNumber: data.contactNumber || '',
              addressFirstLine: data.addressFirstLine || '',
              addressPostCode: data.addressPostCode || '',
              vulnerabilityMarker: data.vulnerabilityMarker || false,
              depositPaid: data.depositPaid || false,
              vehiclePurchased: data.vehiclePurchased || false,
              enquiry: data.enquiry || false,
              gdprConsent: data.gdprConsent || false,
              salesMarketingConsent: data.salesMarketingConsent || false,
              requiresAdditionalSupport: data.requiresAdditionalSupport || false,
              preferredContactTime: data.preferredContactTime || '',
              vulnerabilityNotes: data.vulnerabilityNotes || '',
              // New completion checklist fields
              wheelNuts: data.wheelNuts || false,
              tyrePressures: data.tyrePressures || false,
              tyreSensors: data.tyreSensors || false,
              oilLevel: data.oilLevel || false,
              coolantLevel: data.coolantLevel || false,
              screenWash: data.screenWash || false,
              lockingNutGloveBox: data.lockingNutGloveBox || false,
              bookPackGloveBox: data.bookPackGloveBox || false,
              inflationKit: data.inflationKit || false,
              keyBatteries: data.keyBatteries || false,
              batteryTest: data.batteryTest || false,
              testDriver: data.testDriver || false,
              adequateDriveAwayFuel: data.adequateDriveAwayFuel || false,
              washerJets: data.washerJets || false,
              wipers: data.wipers || false,
              bulbs: data.bulbs || false,
              additionalText: data.additionalText || '',
              completionDate: data.completionDate ? new Date(data.completionDate).toISOString().split('T')[0] : ''
            });
          }
        }
      } catch (error) {
        console.error('Error loading sale details data:', error);
      }
    };

    loadSaleDetailsData();
  }, [stockData?.metadata?.stockId]);

  const paymentMethods = [
    { value: 'cash', label: 'Cash Payment', icon: PoundSterling },
    { value: 'finance', label: 'Finance', icon: CreditCard },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
    { value: 'card', label: 'Card Payment', icon: CreditCard },
    { value: 'mixed', label: 'Mixed Payment', icon: Calculator }
  ];

  const warrantyTypes = [
    { value: 'none', label: 'Non Selected' },
    { value: 'in_house', label: 'In House Warranty' },
    { value: 'third_party', label: 'Third Party Warranty' }
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Auto-update month and quarter when sale date changes
      if (field === 'saleDate' && typeof value === 'string') {
        newData.monthOfSale = getMonthFromDate(value);
        newData.quarterOfSale = getQuarterFromDate(value);
      }
      
      return newData;
    });
  };

  // Handle address selection from Google Maps
  const handleAddressSelect = (parsedAddress: any) => {
    setFormData(prev => ({
      ...prev,
      addressFirstLine: parsedAddress.streetName + (parsedAddress.streetNumber ? ` ${parsedAddress.streetNumber}` : ''),
      addressPostCode: parsedAddress.postcode
    }));
  };

  const calculateTotalSaleValue = () => {
    const salePrice = parseFloat(formData.salePrice) || 0;
    const deliveryPrice = parseFloat(formData.deliveryPrice) || 0;
    return salePrice + deliveryPrice;
  };

  const calculatePaymentBreakdownTotal = () => {
    const cash = parseFloat(formData.cashAmount as string) || 0;
    const bacs = parseFloat(formData.bacsAmount as string) || 0;
    const finance = parseFloat(formData.financeAmount as string) || 0;
    const deposit = parseFloat(formData.depositAmount as string) || 0;
    const partEx = parseFloat(formData.partExAmount as string) || 0;
    const card = parseFloat(formData.cardAmount as string) || 0;
    return cash + bacs + finance + deposit + partEx + card;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Send clean data without trying to convert dates on frontend
      const apiData = {
        stockId: formData.stockReference,
        stockReference: formData.stockReference,
        registration: formData.registration,
        saleDate: formData.saleDate || new Date().toISOString().split('T')[0], // Send as string
        monthOfSale: formData.monthOfSale,
        quarterOfSale: formData.quarterOfSale,
        salePrice: formData.salePrice,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || null,
        customerPhone: formData.customerPhone || null,
        customerAddress: formData.customerAddress || null,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        emailAddress: formData.emailAddress || null,
        contactNumber: formData.contactNumber || null,
        addressFirstLine: formData.addressFirstLine || null,
        addressPostCode: formData.addressPostCode || null,
        salesPersonId: formData.salesPersonId || null,
        paymentMethod: formData.paymentMethod || 'cash',
        financeProvider: formData.financeProvider || null,
        cashAmount: formData.cashAmount || null,
        bacsAmount: formData.bacsAmount || null,
        financeAmount: formData.financeAmount || null,
        depositAmount: formData.depositAmount || null,
        partExAmount: formData.partExAmount || null,
        cardAmount: formData.cardAmount || null,
        requiredAmount: formData.requiredAmount || null,
        warrantyType: formData.warrantyType || 'none',
        warrantyMonths: formData.warrantyMonths ? parseInt(formData.warrantyMonths) : null,
        deliveryType: formData.deliveryType || 'collection',
        deliveryPrice: formData.deliveryPrice || null,
        deliveryDate: formData.deliveryDate || null, // Send as string or null
        deliveryAddress: formData.deliveryAddress || null,
        documentationComplete: formData.documentationComplete || false,
        keyHandedOver: formData.keyHandedOver || false,
        customerSatisfied: formData.customerSatisfied || false,
        vulnerabilityMarker: formData.vulnerabilityMarker || false,
        depositPaid: formData.depositPaid || false,
        vehiclePurchased: formData.vehiclePurchased || false,
        enquiry: formData.enquiry || false,
        gdprConsent: formData.gdprConsent || false,
        salesMarketingConsent: formData.salesMarketingConsent || false,
        requiresAdditionalSupport: formData.requiresAdditionalSupport || false,
        preferredContactTime: formData.preferredContactTime || null,
        vulnerabilityNotes: formData.vulnerabilityNotes || null,
        notes: formData.notes || null,
        // New completion checklist fields
        wheelNuts: formData.wheelNuts || false,
        tyrePressures: formData.tyrePressures || false,
        tyreSensors: formData.tyreSensors || false,
        oilLevel: formData.oilLevel || false,
        coolantLevel: formData.coolantLevel || false,
        screenWash: formData.screenWash || false,
        lockingNutGloveBox: formData.lockingNutGloveBox || false,
        bookPackGloveBox: formData.bookPackGloveBox || false,
        inflationKit: formData.inflationKit || false,
        keyBatteries: formData.keyBatteries || false,
        batteryTest: formData.batteryTest || false,
        testDriver: formData.testDriver || false,
        adequateDriveAwayFuel: formData.adequateDriveAwayFuel || false,
        washerJets: formData.washerJets || false,
        wipers: formData.wipers || false,
        bulbs: formData.bulbs || false,
        additionalText: formData.additionalText || null,
        completionDate: formData.completionDate || null
      };

      console.log('📝 Saving sale details:', apiData);

      const response = await fetch('/api/stock-actions/sale-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Sale details saved successfully:', result.data);
        alert('Sale details saved successfully!');
        
        // Invalidate inventory cache to reflect updated sale status
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
        console.log('🔄 Inventory cache invalidated - sale status will reflect in inventory table');
        
        // Call onSuccess callback to refresh action statuses
        if (onSuccess) {
          console.log('🔄 Calling onSuccess callback to refresh action statuses');
          onSuccess();
        }
      } else {
        console.error('❌ API Error:', result.error);
        alert(`Failed to save sale details: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error saving sale details:', error);
      alert('Failed to save sale details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      // First save the form data
      await handleSubmit(new Event('submit') as any);
      
      // Then generate and download PDF
      const response = await fetch('/api/stock-actions/sale-details/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockId: formData.stockReference,
          registration: formData.registration,
          saleDate: formData.saleDate,
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          completionData: {
            wheelNuts: formData.wheelNuts,
            tyrePressures: formData.tyrePressures,
            tyreSensors: formData.tyreSensors,
            oilLevel: formData.oilLevel,
            coolantLevel: formData.coolantLevel,
            screenWash: formData.screenWash,
            lockingNutGloveBox: formData.lockingNutGloveBox,
            bookPackGloveBox: formData.bookPackGloveBox,
            inflationKit: formData.inflationKit,
            keyBatteries: formData.keyBatteries,
            batteryTest: formData.batteryTest,
            testDriver: formData.testDriver,
            adequateDriveAwayFuel: formData.adequateDriveAwayFuel,
            washerJets: formData.washerJets,
            wipers: formData.wipers,
            bulbs: formData.bulbs,
            additionalText: formData.additionalText,
            completionDate: formData.completionDate
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-completion-${formData.registration || formData.stockReference}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('Sales completion PDF exported successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to export PDF: ${error.error}`);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };


  const inputBaseClass = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-indigo-500/20'
  }`;

  const labelClass = `block text-sm font-semibold mb-3 ${
    isDarkMode ? 'text-white' : 'text-slate-700'
  }`;

  const sections = [
    { id: 'basic', label: 'Sale Info', icon: Calendar },
    { id: 'delivery', label: 'Delivery/Collection', icon: Truck },
    { id: 'customer', label: 'Customer', icon: User },
    { id: 'payment', label: 'Payment', icon: PoundSterling },
    { id: 'completion', label: 'Completion', icon: CheckCircle }
  ];

  const totalSaleValue = calculateTotalSaleValue();
  const paymentBreakdownTotal = calculatePaymentBreakdownTotal();
  const paymentDifference = totalSaleValue - paymentBreakdownTotal;

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-indigo-100/80 via-purple-100/60 to-pink-100/80">
      {/* Enhanced Header */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-2xl blur-xl opacity-20 ${
          isDarkMode ? 'bg-gradient-to-r from-indigo-600 to-blue-600' : 'bg-gradient-to-r from-indigo-400 to-blue-500'
        }`} />
        
        <div className={`relative p-4 rounded-xl border backdrop-blur-sm ${
          isDarkMode 
            ? 'bg-slate-900/80 border-slate-700/50' 
            : 'bg-indigo-100/70 border-purple-300/60 shadow-pink-200/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30' 
                  : 'bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/50'
              }`}>
                <Handshake className={`h-5 w-5 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-slate-100 to-slate-300 bg-clip-text text-transparent' 
                    : 'from-slate-800 to-slate-600 bg-clip-text text-transparent'
                }`}>
                  Sale Details
                </h2>
                <p className={`text-sm flex items-center mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Complete vehicle sale information
                </p>
              </div>
            </div>
            
            {/* Sale Value Display */}
            {totalSaleValue > 0 && (
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-slate-700'
                }`}>
                  Subtotal
                </div>
                <div className={`text-2xl font-bold ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`}>
                  £{totalSaleValue.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const IconComponent = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                  activeSection === section.id
                    ? isDarkMode
                      ? 'bg-indigo-600 text-white shadow-lg scale-105'
                      : 'bg-indigo-600 text-white shadow-lg scale-105'
                  : isDarkMode
                    ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
                    : 'bg-white/50 text-slate-700 hover:bg-slate-100/50 border border-slate-200/50'
              }`}
            >
              <IconComponent className="h-4 w-4 mr-2" />
              {section.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information Section */}
        {activeSection === 'basic' && (
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
                          ? 'bg-slate-900/50 border-slate-700/50' 
            : 'bg-indigo-100/80 border-purple-300/50 shadow-pink-200/40'
          }`}>
            <div className={`p-3 rounded-lg mb-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Sale Information
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                Core sale details, pricing and warranty<br></br>
                Final Prices and/or Discounts can be updated when the sale invoice is generated
              </p>
            </div>

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
                      value={formData.stockReference}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Sale Date
                </label>
                <input
                  type="date"
                  value={formData.saleDate}
                  onChange={(e) => handleInputChange('saleDate', e.target.value)}
                  onFocus={() => setFocusedField('saleDate')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'saleDate' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Month of Sale
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.monthOfSale}
                    readOnly
                    className={`${inputBaseClass} ${
                      isDarkMode 
                        ? 'bg-slate-800/30 border-slate-700/30 text-slate-400' 
                        : 'bg-slate-100/50 border-slate-200/50 text-slate-600'
                    } cursor-not-allowed pr-10`}
                    placeholder="Month will be calculated from sale date"
                  />
                  <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center ${
                    isDarkMode ? 'text-white' : 'text-slate-400'
                  }`}>
                    🔒
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Quarter of Sale
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.quarterOfSale}
                    readOnly
                    className={`${inputBaseClass} ${
                      isDarkMode 
                        ? 'bg-slate-800/30 border-slate-700/30 text-slate-400' 
                        : 'bg-slate-100/50 border-slate-200/50 text-slate-600'
                    } cursor-not-allowed pr-10`}
                    placeholder="Quarter will be calculated from sale date"
                  />
                  <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center ${
                    isDarkMode ? 'text-white' : 'text-slate-400'
                  }`}>
                    🔒
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <PoundSterling className="inline h-4 w-4 mr-2" />
                  Sale Price (£)
                </label>
                <div className="relative">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-slate-500'
                  }`}>
                    £
                  </div>
                  <input
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) => handleInputChange('salePrice', e.target.value)}
                    onFocus={() => setFocusedField('salePrice')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputBaseClass} pl-8 ${
                      focusedField === 'salePrice' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                    }`}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <Shield className="inline h-4 w-4 mr-2" />
                  Warranty Type
                </label>
                <select
                  value={formData.warrantyType}
                  onChange={(e) => handleInputChange('warrantyType', e.target.value)}
                  onFocus={() => setFocusedField('warrantyType')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'warrantyType' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                >
                  {warrantyTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </Card>
        )}

        {/* Customer Information Section */}
        {activeSection === 'customer' && (
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
                          ? 'bg-slate-900/50 border-slate-700/50' 
            : 'bg-indigo-100/80 border-purple-300/50 shadow-pink-200/40'
          }`}>
            <div className={`p-3 rounded-lg mb-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Customer Information
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                Customer details and contact information
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  <User className="inline h-4 w-4 mr-2" />
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'firstName' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                  placeholder="Customer's first name"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <User className="inline h-4 w-4 mr-2" />
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'lastName' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                  placeholder="Customer's last name"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                  onFocus={() => setFocusedField('emailAddress')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'emailAddress' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Phone className="inline h-4 w-4 mr-2" />
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  onFocus={() => setFocusedField('contactNumber')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'contactNumber' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                  placeholder="Phone number"
                />
              </div>

              {/* Address Search with Google Maps */}
              <div className="lg:col-span-2">
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  placeholder="Start typing a UK address..."
                  label="Search Address"
                  showLabel={true}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <MapPin className="inline h-4 w-4 mr-2" />
                  Address First Line
                </label>
                <input
                  type="text"
                  value={formData.addressFirstLine}
                  onChange={(e) => handleInputChange('addressFirstLine', e.target.value)}
                  onFocus={() => setFocusedField('addressFirstLine')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'addressFirstLine' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <MapPin className="inline h-4 w-4 mr-2" />
                  Post Code
                </label>
                <input
                  type="text"
                  value={formData.addressPostCode}
                  onChange={(e) => handleInputChange('addressPostCode', e.target.value)}
                  onFocus={() => setFocusedField('addressPostCode')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'addressPostCode' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                  placeholder="Post code"
                />
              </div>

              {/* Customer Flags */}
              <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <YesNoToggle
                  label="Vulnerability Marker"
                  value={formData.vulnerabilityMarker}
                  onChange={(val) => handleInputChange('vulnerabilityMarker', val)}
                />
                <YesNoToggle
                  label="GDPR Consent"
                  value={formData.gdprConsent}
                  onChange={(val) => handleInputChange('gdprConsent', val)}
                />
                <YesNoToggle
                  label="Marketing Consent"
                  value={formData.salesMarketingConsent}
                  onChange={(val) => handleInputChange('salesMarketingConsent', val)}
                />
                <YesNoToggle
                  label="Enquiry"
                  value={formData.enquiry}
                  onChange={(val) => handleInputChange('enquiry', val)}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Payment Section */}
        {activeSection === 'payment' && (
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
                          ? 'bg-slate-900/50 border-slate-700/50' 
            : 'bg-indigo-100/80 border-purple-300/50 shadow-pink-200/40'
          }`}>
            <div className={`p-3 rounded-lg mb-4 bg-gradient-to-r from-orange-500/10 to-red-500/10`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Payment Details
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                Payment method and breakdown
              </p>
            </div>

            <div className="space-y-6">
              {/* Required Deposit and Amount Paid in Deposit - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <PoundSterling className="inline h-4 w-4 mr-2" />
                    Required Deposit (£)
                  </label>
                  <p className={`text-sm mb-3 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Mandatory dealership pre-sale deposit
                  </p>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>£</div>
                    <input
                      type="number"
                      value={formData.requiredAmount}
                      onChange={(e) => handleInputChange('requiredAmount', e.target.value)}
                      className={`${inputBaseClass} pl-8`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    <PoundSterling className="inline h-4 w-4 mr-2" />
                    Amount Paid in Deposit (£)
                  </label>
                  <p className={`text-sm mb-3 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Deposit amount paid by the customer
                  </p>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>£</div>
                    <input
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) => handleInputChange('depositAmount', e.target.value)}
                      className={`${inputBaseClass} pl-8`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Cash Amount (£)</label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>£</div>
                    <input
                      type="number"
                      value={formData.cashAmount}
                      onChange={(e) => handleInputChange('cashAmount', e.target.value)}
                      className={`${inputBaseClass} pl-8`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>BACS Amount (£)</label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>£</div>
                    <input
                      type="number"
                      value={formData.bacsAmount}
                      onChange={(e) => handleInputChange('bacsAmount', e.target.value)}
                      className={`${inputBaseClass} pl-8`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Finance Amount (£)</label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>£</div>
                    <input
                      type="number"
                      value={formData.financeAmount}
                      onChange={(e) => handleInputChange('financeAmount', e.target.value)}
                      className={`${inputBaseClass} pl-8`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Part Exchange Amount (£)</label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>£</div>
                    <input
                      type="number"
                      value={formData.partExAmount}
                      onChange={(e) => handleInputChange('partExAmount', e.target.value)}
                      className={`${inputBaseClass} pl-8`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Card Payment Amount (£)</label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>£</div>
                    <input
                      type="number"
                      value={formData.cardAmount}
                      onChange={(e) => handleInputChange('cardAmount', e.target.value)}
                      className={`${inputBaseClass} pl-8`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Total Field - Read Only */}
                <div className="lg:col-span-2">
                  <label className={`${labelClass} flex items-center`}>
                    <Calculator className="inline h-4 w-4 mr-2" />
                    Total (£)
                  </label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>£</div>
                    <input
                      type="text"
                      value={calculatePaymentBreakdownTotal().toFixed(2)}
                      readOnly
                      className={`${inputBaseClass} pl-8 cursor-not-allowed ${
                        isDarkMode 
                          ? 'bg-slate-800/30 border-slate-600/50 text-slate-300' 
                          : 'bg-slate-100/70 border-slate-300/70 text-slate-600'
                      }`}
                    />
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-400'
                    }`}>
                      Auto-calculated
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              {paymentBreakdownTotal > 0 && (
                <div className={`p-4 rounded-xl ${
                  Math.abs(paymentDifference) < 0.01
                    ? isDarkMode ? 'bg-green-900/20' : 'bg-green-50'
                    : isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>
                      Payment Breakdown Total:
                    </span>
                    <span className={`font-bold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      £{paymentBreakdownTotal.toFixed(2)}
                    </span>
                  </div>
                  {Math.abs(paymentDifference) >= 0.01 && (
                    <div className={`text-sm mt-1 ${
                      isDarkMode ? 'text-amber-400' : 'text-amber-700'
                    }`}>
                      Difference: £{Math.abs(paymentDifference).toFixed(2)} 
                      {paymentDifference > 0 ? ' remaining' : ' overpaid'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Delivery/Collection Section */}
        {activeSection === 'delivery' && (
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
                          ? 'bg-slate-900/50 border-slate-700/50' 
            : 'bg-indigo-100/80 border-purple-300/50 shadow-pink-200/40'
          }`}>
            <div className={`p-3 rounded-lg mb-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Delivery/Collection
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                Choose delivery or collection and set delivery details
              </p>
            </div>

            <div className="space-y-6">
              {/* Delivery/Collection Toggle */}
              <div>
                <label className={labelClass}>
                  <Truck className="inline h-4 w-4 mr-2" />
                  Delivery/Collection Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange('deliveryType', 'collection')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      formData.deliveryType === 'collection'
                        ? isDarkMode
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-blue-500 bg-blue-50 text-blue-600'
                        : isDarkMode
                          ? 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Collection</div>
                      <div className="text-sm opacity-75">Customer collects vehicle</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleInputChange('deliveryType', 'delivery')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      formData.deliveryType === 'delivery'
                        ? isDarkMode
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-blue-500 bg-blue-50 text-blue-600'
                        : isDarkMode
                          ? 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Delivery</div>
                      <div className="text-sm opacity-75">Deliver to customer</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Delivery-specific fields */}
              {formData.deliveryType === 'delivery' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      <PoundSterling className="inline h-4 w-4 mr-2" />
                      Delivery Price (£)
                    </label>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`}>
                        £
                      </div>
                      <input
                        type="number"
                        value={formData.deliveryPrice}
                        onChange={(e) => handleInputChange('deliveryPrice', e.target.value)}
                        onFocus={() => setFocusedField('deliveryPrice')}
                        onBlur={() => setFocusedField(null)}
                        className={`${inputBaseClass} pl-8 ${
                          focusedField === 'deliveryPrice' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                        }`}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Calendar className="inline h-4 w-4 mr-2" />
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      onFocus={() => setFocusedField('deliveryDate')}
                      onBlur={() => setFocusedField(null)}
                      className={`${inputBaseClass} ${
                        focusedField === 'deliveryDate' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                      }`}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className={labelClass}>
                      <MapPin className="inline h-4 w-4 mr-2" />
                      Delivery Address
                    </label>
                    <textarea
                      value={formData.deliveryAddress}
                      onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                      onFocus={() => setFocusedField('deliveryAddress')}
                      onBlur={() => setFocusedField(null)}
                      className={`${inputBaseClass} ${
                        focusedField === 'deliveryAddress' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                      }`}
                      placeholder="Full delivery address (if different from customer address)"
                      rows={3}
                    />
                  </div>

                </div>
              )}

              <div className="lg:col-span-2">
                <label className={labelClass}>
                  <AlertTriangle className="inline h-4 w-4 mr-2" />
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  onFocus={() => setFocusedField('notes')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'notes' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                  placeholder="Any additional notes or special requirements"
                  rows={4}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Completion Section */}
        {activeSection === 'completion' && (
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
                          ? 'bg-slate-900/50 border-slate-700/50' 
            : 'bg-indigo-100/80 border-purple-300/50 shadow-pink-200/40'
          }`}>
            <div className={`p-3 rounded-lg mb-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10`}>
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Sale Completion
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                Final completion checklist
              </p>
            </div>

            {/* Vehicle Registration Display */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Vehicle Registration
                  </h4>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Vehicle being sold
                  </p>
                </div>
                <div className="flex justify-end">
                  <LicensePlate 
                    registration={formData.registration || 'N/A'} 
                    size="lg" 
                    className="" 
                  />
                </div>
              </div>
            </div>

            {/* New Completion Checklist */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <YesNoToggle
                  label="Wheel nuts"
                  value={formData.wheelNuts}
                  onChange={(val) => handleInputChange('wheelNuts', val)}
                />
                <YesNoToggle
                  label="Tyre pressures"
                  value={formData.tyrePressures}
                  onChange={(val) => handleInputChange('tyrePressures', val)}
                />
                <YesNoToggle
                  label="Tyre Sensors"
                  value={formData.tyreSensors}
                  onChange={(val) => handleInputChange('tyreSensors', val)}
                />
                <YesNoToggle
                  label="Oil level"
                  value={formData.oilLevel}
                  onChange={(val) => handleInputChange('oilLevel', val)}
                />
                <YesNoToggle
                  label="Coolant level"
                  value={formData.coolantLevel}
                  onChange={(val) => handleInputChange('coolantLevel', val)}
                />
                <YesNoToggle
                  label="Screen wash"
                  value={formData.screenWash}
                  onChange={(val) => handleInputChange('screenWash', val)}
                />
                <YesNoToggle
                  label="Locking nut – glove box"
                  value={formData.lockingNutGloveBox}
                  onChange={(val) => handleInputChange('lockingNutGloveBox', val)}
                />
                <YesNoToggle
                  label="Book pack – glove box"
                  value={formData.bookPackGloveBox}
                  onChange={(val) => handleInputChange('bookPackGloveBox', val)}
                />
                <YesNoToggle
                  label="Inflation kit"
                  value={formData.inflationKit}
                  onChange={(val) => handleInputChange('inflationKit', val)}
                />
                <YesNoToggle
                  label="Key batteries"
                  value={formData.keyBatteries}
                  onChange={(val) => handleInputChange('keyBatteries', val)}
                />
                <YesNoToggle
                  label="Battery Test"
                  value={formData.batteryTest}
                  onChange={(val) => handleInputChange('batteryTest', val)}
                />
              <YesNoToggle
                label="Test Drive"
                value={formData.testDriver}
                onChange={(val) => handleInputChange('testDriver', val)}
              />
                <YesNoToggle
                  label="Adequate Drive Away Fuel"
                  value={formData.adequateDriveAwayFuel}
                  onChange={(val) => handleInputChange('adequateDriveAwayFuel', val)}
                />
                <YesNoToggle
                  label="Washer Jets"
                  value={formData.washerJets}
                  onChange={(val) => handleInputChange('washerJets', val)}
                />
                <YesNoToggle
                  label="Wipers"
                  value={formData.wipers}
                  onChange={(val) => handleInputChange('wipers', val)}
                />
                <YesNoToggle
                  label="Bulbs"
                  value={formData.bulbs}
                  onChange={(val) => handleInputChange('bulbs', val)}
                />
              </div>

              {/* Additional Text Field */}
              <div>
                <label className={labelClass}>
                  <AlertTriangle className="inline h-4 w-4 mr-2" />
                  Additional Text
                </label>
                <textarea
                  value={formData.additionalText}
                  onChange={(e) => handleInputChange('additionalText', e.target.value)}
                  onFocus={() => setFocusedField('additionalText')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'additionalText' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                  placeholder="Any additional notes or comments"
                  rows={3}
                />
              </div>

              {/* Completion Date Field */}
              <div>
                <label className={labelClass}>
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Completion Date
                </label>
                <input
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) => handleInputChange('completionDate', e.target.value)}
                  onFocus={() => setFocusedField('completionDate')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputBaseClass} ${
                    focusedField === 'completionDate' ? 'ring-2 ring-indigo-500/20 border-indigo-500 scale-[1.02]' : ''
                  }`}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-200/20">
          <Button
            type="submit"
            disabled={isSubmitting}
            className={`flex items-center justify-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isSubmitting 
                ? 'scale-95' 
                : 'hover:scale-105 hover:shadow-lg'
            } ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                Saving Sale Details...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-3" />
                Save Sale Details
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting || isSubmitting}
            className={`flex items-center justify-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isExporting 
                ? 'scale-95' 
                : 'hover:scale-105 hover:shadow-lg'
            } ${
              isDarkMode
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
            }`}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                Exporting PDF...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-3" />
                Export Completion PDF
              </>
            )}
          </Button>

        </div>
      </form>

    </div>
  );
}