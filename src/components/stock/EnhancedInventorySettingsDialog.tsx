"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Package, 
  ClipboardCheck, 
  PoundSterling, 
  Undo, 
  Handshake, 
  TrendingUp, 
  ShoppingBag,
  Sparkles,
  Layers,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Eye,
  BarChart3
} from "lucide-react";
import { useRouter } from "next/navigation";

// Import the existing stock action forms
import EditInventoryForm from "@/components/stock/tabs/actions/EditInventoryForm";
import AddChecklistForm from "@/components/stock/tabs/actions/AddChecklistForm";
import AddCostsForm from "@/components/stock/tabs/actions/AddCostsForm";
import ReturnCostsForm from "@/components/stock/tabs/actions/ReturnCostsForm";
import SaleDetailsForm from "@/components/stock/tabs/actions/SaleDetailsForm";
import DetailedMarginsForm from "@/components/stock/tabs/actions/DetailedMarginsForm";
import GenerateInvoiceForm from "@/components/stock/tabs/actions/GenerateInvoiceForm";

interface StockData {
  stockId?: string;
  registration?: string;
  vehicle?: {
    registration?: string;
  };
  metadata?: {
    stockId?: string;
  };
}

interface EnhancedInventorySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stockData: StockData;
}

type FormType = 
  | 'purchase-info' 
  | 'checklist' 
  | 'costs' 
  | 'return-costs'
  | 'sale-details' 
  | 'detailed-margins'
  | 'invoice';

type CompletionStatus = 'completed' | 'pending';


export default function EnhancedInventorySettingsDialog({ 
  isOpen, 
  onClose, 
  stockData 
}: EnhancedInventorySettingsDialogProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<FormType | null>(null);
  const [actionStatuses, setActionStatuses] = useState<Record<FormType, CompletionStatus>>({
    'purchase-info': 'pending',
    'checklist': 'pending', 
    'costs': 'pending',
    'return-costs': 'pending',
    'sale-details': 'pending',
    'detailed-margins': 'pending',
    'invoice': 'pending'
  });
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);

  const loadActionStatuses = useCallback(async () => {
    const stockId = stockData?.stockId || stockData?.metadata?.stockId;
    if (!stockId) {
      return;
    }

    setIsLoadingStatuses(true);
    
    try {
      // Load statuses for each action type
      const statusPromises = [
        checkInventoryDetailsStatus(),
        checkChecklistStatus(),
        checkCostsStatus(),
        checkReturnCostsStatus(),
        checkSaleDetailsStatus(),
        checkDetailedMarginsStatus()
      ];

      const results = await Promise.all(statusPromises);
      
      const newStatuses: Record<FormType, CompletionStatus> = {
        'purchase-info': results[0],
        'checklist': results[1],
        'costs': results[2],
        'return-costs': results[3],
        'sale-details': results[4],
        'detailed-margins': results[5],
        'invoice': 'pending' as CompletionStatus
      };
      
      setActionStatuses(newStatuses);
    } catch (error) {
      console.error('Error loading action statuses:', error);
    } finally {
      setIsLoadingStatuses(false);
    }
  }, [stockData?.stockId, stockData?.metadata?.stockId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load completion statuses on mount and when stock changes
  useEffect(() => {
    if (isOpen && (stockData?.stockId || stockData?.metadata?.stockId)) {
      // Reset state immediately when stock changes
      setActiveForm(null); // Close any open forms
      setViewMode('overview'); // Reset to overview mode
      setActionStatuses({
        'purchase-info': 'pending',
        'checklist': 'pending', 
        'costs': 'pending',
        'return-costs': 'pending',
        'sale-details': 'pending',
        'detailed-margins': 'pending',
        'invoice': 'pending'
      });
      
      // Then load the actual statuses
      loadActionStatuses();
    }
  }, [isOpen, stockData?.stockId, stockData?.metadata?.stockId, loadActionStatuses]);

  const checkInventoryDetailsStatus = async (): Promise<CompletionStatus> => {
    const stockId = stockData?.stockId || stockData?.metadata?.stockId;
    try {
      console.log('🔍 [EnhancedInventorySettingsDialog] Checking inventory details for:', stockId);
      const response = await fetch(`/api/stock-actions/inventory-details?stockId=${stockId}`);
      console.log('📡 [EnhancedInventorySettingsDialog] Inventory details API response status:', response.status);
      
      if (!response.ok) {
        console.log('❌ [EnhancedInventorySettingsDialog] Inventory details API failed with status:', response.status);
        return 'pending';
      }
      
      const result = await response.json();
      console.log('📦 [EnhancedInventorySettingsDialog] Inventory details API result:', result);
      
      if (result.success && result.data) {
        const data = result.data;
        console.log('📋 [EnhancedInventorySettingsDialog] Inventory details data:', data);
        
        // Check for required fields with flexible field names
        const stockRef = data.stockReference || data.stockId;
        const reg = data.registration;
        const purchaseDate = data.dateOfPurchase || data.purchaseDate;
        const cost = data.costOfPurchase || data.purchaseCost || data.cost;
        
        const hasRequiredFields = !!(stockRef && reg && purchaseDate && cost);
        const hasValidCost = cost && cost.toString().trim() !== '' && parseFloat(cost) > 0;
        
        const status = hasRequiredFields && hasValidCost ? 'completed' : 'pending';
        console.log('✅ [EnhancedInventorySettingsDialog] Inventory details status:', status, { stockRef, reg, purchaseDate, cost, hasRequiredFields, hasValidCost });
        
        return status;
      }
      
      console.log('⚠️ [EnhancedInventorySettingsDialog] No inventory details data found');
      return 'pending';
    } catch (error) {
      console.error('❌ [EnhancedInventorySettingsDialog] Error checking inventory details:', error);
      return 'pending';
    }
  };

  const checkChecklistStatus = async (): Promise<CompletionStatus> => {
    const stockId = stockData?.stockId || stockData?.metadata?.stockId;
    try {
      const response = await fetch(`/api/stock-actions/vehicle-checklist?stockId=${stockId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const completionPercentage = result.data.completionPercentage || 0;
          return completionPercentage === 100 ? 'completed' : 'pending';
        }
      }
      return 'pending';
    } catch {
      return 'pending';
    }
  };

  const checkCostsStatus = async (): Promise<CompletionStatus> => {
    const stockId = stockData?.stockId || stockData?.metadata?.stockId;
    try {
      console.log('🔍 [EnhancedInventorySettingsDialog] Checking costs for:', stockId);
      const response = await fetch(`/api/stock-actions/vehicle-costs?stockId=${stockId}`);
      console.log('📡 [EnhancedInventorySettingsDialog] Costs API response status:', response.status);
      
      if (!response.ok) {
        console.log('❌ [EnhancedInventorySettingsDialog] Costs API failed with status:', response.status);
        return 'pending';
      }
      
      const result = await response.json();
      console.log('📦 [EnhancedInventorySettingsDialog] Costs API result:', result);
      
      if (result.success && result.data) {
        const costsData = result.data;
        console.log('📋 [EnhancedInventorySettingsDialog] Costs data:', costsData);
        
        // Check for any cost entries with more flexible validation
        const hasFixedCosts = (costsData.transportIn && parseFloat(costsData.transportIn) > 0) ||
                             (costsData.transportOut && parseFloat(costsData.transportOut) > 0) ||
                             (costsData.mot && parseFloat(costsData.mot) > 0);
        
        // Check for any other numeric cost fields
        const hasOtherCosts = Object.keys(costsData).some(key => {
          if (['stockReference', 'registration', 'groupedCosts', 'stockId', 'dealerId', 'id', 'createdAt', 'updatedAt'].includes(key)) return false;
          const value = costsData[key];
          return value && !isNaN(parseFloat(value)) && parseFloat(value) > 0;
        });
        
        const status = hasFixedCosts || hasOtherCosts ? 'completed' : 'pending';
        console.log('✅ [EnhancedInventorySettingsDialog] Costs status:', status, { hasFixedCosts, hasOtherCosts });
        
        return status;
      }
      
      console.log('⚠️ [EnhancedInventorySettingsDialog] No costs data found');
      return 'pending';
    } catch (error) {
      console.error('❌ [EnhancedInventorySettingsDialog] Error checking costs:', error);
      return 'pending';
    }
  };

  const checkReturnCostsStatus = async (): Promise<CompletionStatus> => {
    const stockId = stockData?.stockId || stockData?.metadata?.stockId;
    try {
      const response = await fetch(`/api/stock-actions/return-costs?stockId=${stockId}`);
      if (!response.ok) return 'pending';
      const result = await response.json();
      if (result.success && result.data) {
        const returnCostsData = result.data;
        const hasVatableCosts = returnCostsData.vatableCosts && returnCostsData.vatableCosts.length > 0;
        const hasNonVatableCosts = returnCostsData.nonVatableCosts && returnCostsData.nonVatableCosts.length > 0;
        return hasVatableCosts || hasNonVatableCosts ? 'completed' : 'pending';
      }
      return 'pending';
    } catch {
      return 'pending';
    }
  };

  const checkSaleDetailsStatus = async (): Promise<CompletionStatus> => {
    const stockId = stockData?.stockId || stockData?.metadata?.stockId;
    try {
      console.log('🔍 [EnhancedInventorySettingsDialog] Checking sale details for:', stockId);
      const response = await fetch(`/api/stock-actions/sale-details?stockId=${stockId}`);
      console.log('📡 [EnhancedInventorySettingsDialog] Sale details API response status:', response.status);
      
      if (!response.ok) {
        console.log('❌ [EnhancedInventorySettingsDialog] Sale details API failed with status:', response.status);
        return 'pending';
      }
      
      const result = await response.json();
      console.log('📦 [EnhancedInventorySettingsDialog] Sale details API result:', result);
      
      if (result.success && result.data) {
        const saleData = result.data;
        console.log('📋 [EnhancedInventorySettingsDialog] Sale details data:', saleData);
        
        // Check for required fields based on actual database schema and form data
        const customerName = saleData.customerName;
        const firstName = saleData.firstName;
        const lastName = saleData.lastName;
        const salePrice = saleData.salePrice || saleData.price || saleData.amount;
        const saleDate = saleData.saleDate || saleData.date;
        
        // Customer name validation - check customerName OR firstName OR lastName
        const hasCustomerName = (customerName && customerName.toString().trim() !== '') || 
                               (firstName && firstName.toString().trim() !== '') || 
                               (lastName && lastName.toString().trim() !== '');
        const hasValidPrice = salePrice && parseFloat(salePrice) > 0;
        const hasSaleDate = saleDate && saleDate.toString().trim() !== '';
        
        const status = hasCustomerName && hasValidPrice && hasSaleDate ? 'completed' : 'pending';
        console.log('✅ [EnhancedInventorySettingsDialog] Sale details status:', status, { 
          customerName,
          firstName, 
          lastName, 
          salePrice, 
          saleDate, 
          hasCustomerName, 
          hasValidPrice, 
          hasSaleDate 
        });
        
        return status;
      }
      
      console.log('⚠️ [EnhancedInventorySettingsDialog] No sale details data found');
      return 'pending';
    } catch (error) {
      console.error('❌ [EnhancedInventorySettingsDialog] Error checking sale details:', error);
      return 'pending';
    }
  };

  const checkDetailedMarginsStatus = async (): Promise<CompletionStatus> => {
    const stockId = stockData?.stockId || stockData?.metadata?.stockId;
    try {
      console.log('🔍 [EnhancedInventorySettingsDialog] Checking detailed margins for:', stockId);
      
      // Check both purchase price (from inventory details) and sale price (from sale details)
      const [inventoryResponse, saleResponse] = await Promise.all([
        fetch(`/api/stock-actions/inventory-details?stockId=${stockId}`),
        fetch(`/api/stock-actions/sale-details?stockId=${stockId}`)
      ]);
      
      let hasPurchasePrice = false;
      let hasSalePrice = false;
      
      // Check purchase price from inventory details
      if (inventoryResponse.ok) {
        const inventoryResult = await inventoryResponse.json();
        if (inventoryResult.success && inventoryResult.data) {
          const purchasePrice = inventoryResult.data.costOfPurchase || inventoryResult.data.purchaseCost || inventoryResult.data.cost;
          hasPurchasePrice = purchasePrice && parseFloat(purchasePrice) > 0;
          console.log('📦 [EnhancedInventorySettingsDialog] Purchase price check:', { purchasePrice, hasPurchasePrice });
        }
      }
      
      // Check sale price from sale details
      if (saleResponse.ok) {
        const saleResult = await saleResponse.json();
        if (saleResult.success && saleResult.data) {
          const salePrice = saleResult.data.salePrice || saleResult.data.price || saleResult.data.amount;
          hasSalePrice = salePrice && parseFloat(salePrice) > 0;
          console.log('💰 [EnhancedInventorySettingsDialog] Sale price check:', { salePrice, hasSalePrice });
        }
      }
      
      const status = hasPurchasePrice && hasSalePrice ? 'completed' : 'pending';
      console.log('✅ [EnhancedInventorySettingsDialog] Detailed margins status:', status, { hasPurchasePrice, hasSalePrice });
      
      return status;
    } catch (error) {
      console.error('❌ [EnhancedInventorySettingsDialog] Error checking detailed margins:', error);
      return 'pending';
    }
  };

  if (!isOpen) return null;

  const actionCategories = [
    {
      title: "Vehicle Management",
      subtitle: "Core vehicle operations",
      icon: Package,
      gradient: "from-blue-600 via-blue-500 to-cyan-500",
      actions: [
        {
          id: 'purchase-info' as FormType,
          icon: Package,
          label: "Purchase Information",
          description: "Manage acquisition details & documentation",
          gradient: "from-blue-500 to-cyan-500",
          iconBg: "from-blue-500 to-blue-600",
          shadowColor: "blue-500/40",
          category: "primary",
          badge: "Core",
          status: actionStatuses['purchase-info'] || 'pending'
        },
        {
          id: 'checklist' as FormType,
          icon: ClipboardCheck,
          label: "Vehicle Checklist",
          description: "Complete inspection & quality checks",
          gradient: "from-emerald-500 to-teal-500",
          iconBg: "from-emerald-500 to-emerald-600",
          shadowColor: "emerald-500/40",
          category: "primary",
          badge: "Essential",
          status: actionStatuses['checklist'] || 'pending'
        }
      ]
    },
    {
      title: "Financial Operations",
      subtitle: "Cost management & analysis",
      icon: PoundSterling,
      gradient: "from-purple-600 via-purple-500 to-pink-500",
      actions: [
        {
          id: 'costs' as FormType,
          icon: PoundSterling,
          label: "Add Costs",
          description: "Record expenses & additional charges",
          gradient: "from-purple-500 to-pink-500",
          iconBg: "from-purple-500 to-purple-600",
          shadowColor: "purple-500/40",
          category: "secondary",
          badge: "Finance",
          status: actionStatuses['costs'] || 'pending'
        },
        {
          id: 'return-costs' as FormType,
          icon: Undo,
          label: "Return Costs",
          description: "Process refunds & cost reversals",
          gradient: "from-amber-500 to-orange-500",
          iconBg: "from-amber-500 to-amber-600",
          shadowColor: "amber-500/40",
          category: "secondary",
          badge: "Returns",
          status: actionStatuses['return-costs'] || 'pending'
        },
        {
          id: 'detailed-margins' as FormType,
          icon: TrendingUp,
          label: "Detailed Margins",
          description: "Analyze profitability & ROI metrics",
          gradient: "from-indigo-500 to-purple-500",
          iconBg: "from-indigo-500 to-indigo-600",
          shadowColor: "indigo-500/40",
          category: "analytics",
          badge: "Analytics",
          status: actionStatuses['detailed-margins'] || 'pending'
        }
      ]
    },
    {
      title: "Sales & Documentation",
      subtitle: "Transaction processing",
      icon: Handshake,
      gradient: "from-teal-600 via-teal-500 to-cyan-500",
      actions: [
        {
          id: 'sale-details' as FormType,
          icon: Handshake,
          label: "Sale Details",
          description: "Record transaction & customer info",
          gradient: "from-teal-500 to-cyan-500",
          iconBg: "from-teal-500 to-teal-600",
          shadowColor: "teal-500/40",
          category: "sales",
          badge: "Sales",
          status: actionStatuses['sale-details'] || 'pending'
        },
        {
          id: 'invoice' as FormType,
          icon: ShoppingBag,
          label: "Generate Invoice",
          description: "Create professional invoices",
          gradient: "from-rose-500 to-pink-500",
          iconBg: "from-rose-500 to-rose-600",
          shadowColor: "rose-500/40",
          category: "documentation",
          badge: "Invoice",
          special: true,
          status: 'pending'
        }
      ]
    }
  ];

  const getStatusDisplay = (status: CompletionStatus) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          text: 'Completed',
          textColor: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          darkBgColor: 'dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400'
        };
      default: // 'pending'
        return {
          icon: <Clock className="w-4 h-4 text-orange-600" />,
          text: 'Pending',
          textColor: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          darkBgColor: 'dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400'
        };
    }
  };

  const getStatusColor = (status: CompletionStatus) => {
    switch (status) {
      case 'completed':
        return 'border-green-500/30 bg-green-500/10';
      default: // 'pending'
        return 'border-orange-500/30 bg-orange-500/10';
    }
  };

  const handleActionClick = (actionId: FormType) => {
    // For all forms including invoice, show them in the dialog
    setActiveForm(actionId);
  };

  const handleBackToActions = () => {
    setActiveForm(null);
    // Reload statuses when returning to overview
    loadActionStatuses();
  };

  const renderForm = () => {
    if (!activeForm) return null;

    const handleFormSuccess = () => {
      console.log('🔄 Form submitted successfully, refreshing statuses');
      loadActionStatuses(); // Refresh statuses after form submission
    };

    switch (activeForm) {
      case 'purchase-info':
        return <EditInventoryForm stockData={stockData} onSuccess={handleFormSuccess} />;
      case 'checklist':
        return <AddChecklistForm stockData={stockData} onSuccess={handleFormSuccess} />;
      case 'costs':
        return <AddCostsForm stockData={stockData} onSuccess={handleFormSuccess} />;
      case 'return-costs':
        return <ReturnCostsForm stockData={stockData} onSuccess={handleFormSuccess} />;
      case 'sale-details':
        return <SaleDetailsForm stockData={stockData} onSuccess={handleFormSuccess} />;
      case 'detailed-margins':
        return <DetailedMarginsForm stockData={stockData} onSuccess={handleFormSuccess} />;
      case 'invoice':
        return <GenerateInvoiceForm stockData={stockData} saleDetailsData={null} onSuccess={handleFormSuccess} />;
      default:
        return null;
    }
  };

  const completedCount = Object.values(actionStatuses).filter(status => status === 'completed').length;
  const totalActions = Object.keys(actionStatuses).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl border overflow-hidden ${
        isDarkMode 
          ? 'bg-slate-900/95 border-slate-700/50 backdrop-blur-xl' 
          : 'bg-white/95 border-slate-200/50 backdrop-blur-xl'
      }`}>
        
        {/* Compact Header */}
        <div className={`relative overflow-hidden ${
          isDarkMode ? 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-700' : 'bg-gradient-to-r from-slate-50 via-white to-slate-50'
        }`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-teal-500/20 animate-pulse"></div>
          </div>
          
          <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-slate-200/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {activeForm ? 'Stock Action Form' : 'Stock Actions Hub'}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {activeForm 
                      ? 'Complete the form below' 
                      : `${stockData?.registration || stockData?.vehicle?.registration || 'Vehicle'} Management`
                    }
                  </p>
                  {!activeForm && (
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                        isLoadingStatuses
                          ? (isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200')
                          : completedCount === totalActions
                          ? (isDarkMode ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-50 text-green-600 border-green-200')
                          : (isDarkMode ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-50 text-orange-600 border-orange-200')
                      }`}>
                        {isLoadingStatuses ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : completedCount === totalActions ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>All Completed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>{completedCount}/{totalActions} Complete</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!activeForm && (
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode('overview')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === 'overview'
                        ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                        : (isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('detailed')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === 'detailed'
                        ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                        : (isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {activeForm && (
                <Button
                  onClick={handleBackToActions}
                  variant="outline"
                  size="sm"
                  className={`transition-all duration-300 hover:scale-105 ${
                    isDarkMode 
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className={`w-10 h-10 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400' 
                    : 'border-slate-300 text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                }`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area - Optimized for viewport */}
        <div className="h-[calc(95vh-120px)] overflow-y-auto p-4 sm:p-6">
          {activeForm ? (
            // Form View
            <div className="animate-in slide-in-from-right-8 duration-300 ease-out">
              <div className={`rounded-xl p-4 sm:p-6 ${
                isDarkMode 
                  ? 'bg-slate-800/50 border border-slate-700/50' 
                  : 'bg-slate-50/50 border border-slate-200/50'
              }`}>
                {renderForm()}
              </div>
            </div>
          ) : viewMode === 'overview' ? (
            // Overview Mode - Compact Grid
            <div className="animate-in fade-in-0 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {actionCategories.flatMap(category => 
                  category.actions.map((action) => {
                    const statusDisplay = getStatusDisplay((action.status as CompletionStatus) || 'pending');
                    return (
                      <div
                        key={action.id}
                        onClick={() => handleActionClick(action.id)}
                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          getStatusColor((action.status as CompletionStatus) || 'pending')
                        } ${
                          isDarkMode 
                            ? 'bg-slate-800/30 hover:bg-slate-800/50' 
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                      >
                        {/* Status Badge with Text */}
                        <div className="absolute top-3 right-3">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium ${
                            isLoadingStatuses
                              ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600')
                              : statusDisplay.bgColor + ' ' + statusDisplay.darkBgColor + ' ' + statusDisplay.textColor
                          }`}>
                            {isLoadingStatuses ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>Loading</span>
                              </>
                            ) : (
                              <>
                                {statusDisplay.icon}
                                <span>{statusDisplay.text}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.iconBg} flex items-center justify-center mb-4 shadow-lg`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* Content - Adjusted spacing to avoid overlap */}
                        <div className="pr-24">
                          <h3 className={`font-semibold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {action.label}
                          </h3>
                          <p className={`text-sm mb-3 ${
                            isDarkMode ? 'text-white' : 'text-slate-600'
                          }`}>
                            {action.description}
                          </p>
                        </div>
                        
                        {/* Badge - Positioned at bottom */}
                        <div className="flex justify-between items-center mt-4">
                          <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                            isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {action.badge}
                          </div>
                          <ChevronRight className={`w-4 h-4 ${
                            isDarkMode ? 'text-white' : 'text-slate-500'
                          }`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            // Detailed Mode - Categories
            <div className="animate-in fade-in-0 duration-300 space-y-6">
              {actionCategories.map((category) => (
                <div key={category.title} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {category.title}
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                        {category.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.actions.map((action) => {
                      const statusDisplay = getStatusDisplay((action.status as CompletionStatus) || 'pending');
                      return (
                        <div
                          key={action.id}
                          onClick={() => handleActionClick(action.id)}
                          className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                            isDarkMode 
                              ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600' 
                              : 'bg-white/80 border-slate-200/50 hover:border-slate-300'
                          }`}
                        >
                          {/* Status Badge with Text */}
                          <div className="absolute top-3 right-3">
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium ${
                              isLoadingStatuses
                                ? (isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600')
                                : statusDisplay.bgColor + ' ' + statusDisplay.darkBgColor + ' ' + statusDisplay.textColor
                            }`}>
                              {isLoadingStatuses ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  <span className="hidden sm:inline">Loading</span>
                                </>
                              ) : (
                                <>
                                  {statusDisplay.icon}
                                  <span className="hidden sm:inline">{statusDisplay.text}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-3 pr-20">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.iconBg} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                              <action.icon className="w-5 h-5 text-white" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {action.label}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {action.badge}
                                </span>
                              </div>
                              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                {action.description}
                              </p>
                            </div>
                          </div>
                          
                          {/* Arrow positioned at bottom right */}
                          <div className="absolute bottom-3 right-3">
                            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                              isDarkMode ? 'text-white' : 'text-slate-500'
                            }`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
