"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useUser } from '@clerk/nextjs';
import { 
  Package,
  ClipboardCheck,
  PoundSterling,
  Undo,
  Handshake,
  PiggyBank,
  FileText,
  ChevronDown,
  ArrowLeft,
  Eye,
  CheckCircle2,
  Clock,
  Wrench
} from "lucide-react";
import { TabType } from "./StockDetailLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import DepositDetailsModal from "./DepositDetailsModal";

interface TopActionNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  stockId?: string;
  stockData?: any;
  refreshTrigger?: number;
}

type CompletionStatus = 'completed' | 'pending';

const actionTabs = [
  { id: "edit-inventory", label: "Purchase Info", shortLabel: "Purchase", icon: Package, color: "blue" },
  { id: "add-checklist", label: "Checklist", shortLabel: "Checklist", icon: ClipboardCheck, color: "blue" },
  { id: "add-costs", label: "Costs", shortLabel: "Costs", icon: PoundSterling, color: "blue" },
  { id: "return-costs", label: "Return Costs", shortLabel: "Returns", icon: Undo, color: "blue" },
  { id: "sale-details", label: "Sale Details", shortLabel: "Sale", icon: Handshake, color: "blue" },
 
  { id: "detailed-margins", label: "Margins", shortLabel: "Margins", icon: PiggyBank, color: "blue" },
  { id: "generate-invoice", label: "Create Invoice", shortLabel: "Invoice", icon: FileText, color: "blue" },
  { id: "service-details", label: "Service Details", shortLabel: "Service", icon: Wrench, color: "purple" },
] as const;

export default function TopActionNavigation({ activeTab, onTabChange, stockId, stockData, refreshTrigger }: TopActionNavigationProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [actionStatuses, setActionStatuses] = useState<Record<string, CompletionStatus>>({});
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [isDepositTaken, setIsDepositTaken] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Check user role for permissions
  const userRole = user?.publicMetadata?.role as string;
  const userType = user?.publicMetadata?.userType as string;
  const isTeamMember = userType === 'team_member' && userRole !== 'store_owner_admin';

  // Filter tabs based on user role - hide detailed margins from employees and sales reps
  const filteredActionTabs = actionTabs.filter(tab => {
    if (tab.id === 'detailed-margins' && isTeamMember) {
      return false; // Hide detailed margins from team members (except store_owner_admin)
    }
    return true;
  });

  // Load action statuses when component mounts or stockData changes
  useEffect(() => {
    if (stockData?.stockId || stockData?.metadata?.stockId) {
      loadActionStatuses();
      loadDepositStatus();
    }
  }, [stockData?.stockId, stockData?.metadata?.stockId]);

  // Reload action statuses when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && (stockData?.stockId || stockData?.metadata?.stockId)) {
      console.log('🔄 [TopActionNavigation] Refreshing statuses due to trigger:', refreshTrigger);
      loadActionStatuses();
      loadDepositStatus();
    }
  }, [refreshTrigger]);

  const loadActionStatuses = async () => {
    const currentStockId = stockData?.stockId || stockData?.metadata?.stockId || stockId;
    if (!currentStockId) return;

    console.log('🔄 [TopActionNavigation] Loading action statuses for stock ID:', currentStockId);
    setIsLoadingStatuses(true);
    
    try {
      // Load statuses for each action type with individual error handling
      const statusPromises = [
        checkInventoryDetailsStatus(currentStockId).catch(e => { console.log('❌ Purchase info check failed:', e); return 'pending'; }),
        checkChecklistStatus(currentStockId).catch(e => { console.log('❌ Checklist check failed:', e); return 'pending'; }),
        checkCostsStatus(currentStockId).catch(e => { console.log('❌ Costs check failed:', e); return 'pending'; }),
        checkReturnCostsStatus(currentStockId).catch(e => { console.log('❌ Return costs check failed:', e); return 'pending'; }),
        checkSaleDetailsStatus(currentStockId).catch(e => { console.log('❌ Sale details check failed:', e); return 'pending'; }),
        checkDetailedMarginsStatus(currentStockId).catch(e => { console.log('❌ Margins check failed:', e); return 'pending'; })
      ];

      const results = await Promise.all(statusPromises);
      
      const newStatuses: Record<string, CompletionStatus> = {
        'edit-inventory': results[0] as CompletionStatus,
        'add-checklist': results[1] as CompletionStatus,
        'add-costs': results[2] as CompletionStatus,
        'return-costs': results[3] as CompletionStatus,
        'sale-details': results[4] as CompletionStatus,
        'detailed-margins': results[5] as CompletionStatus,
        'generate-invoice': 'pending' // Default for invoice
      };
      
      console.log('✅ [TopActionNavigation] Action statuses loaded:', newStatuses);
      setActionStatuses(newStatuses);
      
      // Check if all statuses are pending (might indicate API issues)
      const allPending = Object.values(newStatuses).every(status => status === 'pending');
      if (allPending) {
        console.log('⚠️ All statuses are pending - this might indicate API issues or no data entered yet');
        console.log('💡 Check the individual API responses above for more details');
      }
    } catch (error) {
      console.error('❌ Error loading action statuses:', error);
      // Set all to pending as fallback
      setActionStatuses({
        'edit-inventory': 'pending',
        'add-checklist': 'pending',
        'add-costs': 'pending',
        'return-costs': 'pending',
        'sale-details': 'pending',
        'detailed-margins': 'pending',
        'generate-invoice': 'pending'
      });
    } finally {
      setIsLoadingStatuses(false);
    }
  };

  // Load deposit status from sale details
  const loadDepositStatus = async () => {
    const currentStockId = stockData?.stockId || stockData?.metadata?.stockId || stockId;
    if (!currentStockId) return;

    try {
      const response = await fetch(`/api/stock-actions/sale-details?stockId=${currentStockId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setIsDepositTaken(result.data.depositPaid || false);
        }
      }
    } catch (error) {
      console.error('Error loading deposit status:', error);
    }
  };

  // Handle deposit toggle
  const handleDepositToggle = async (value: boolean) => {
    setIsDepositTaken(value);
    if (value) {
      // Immediately save the deposit status as true when toggled on
      await updateDepositStatus(true);
      // Then open the modal to optionally fill in details
      setIsDepositModalOpen(true);
    } else {
      // If turning off, reset deposit status without modal
      await updateDepositStatus(false);
    }
  };

  // Handle modal close - keep toggle state as is (don't reset)
  const handleModalClose = () => {
    setIsDepositModalOpen(false);
    // Don't reset toggle - it should stay as the user set it
    // Only refresh to ensure we have the latest data
    loadDepositStatus();
  };

  // Update deposit status in database
  const updateDepositStatus = async (depositPaid: boolean) => {
    const currentStockId = stockData?.stockId || stockData?.metadata?.stockId || stockId;
    if (!currentStockId) return;

    try {
      const apiData = {
        stockId: currentStockId,
        stockReference: currentStockId,
        registration: stockData?.vehicle?.registration || '',
        depositPaid
      };

      const response = await fetch('/api/stock-actions/sale-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ Deposit status updated successfully');
      } else {
        console.error('❌ Failed to update deposit status:', result.error);
      }
    } catch (error) {
      console.error('❌ Error updating deposit status:', error);
    }
  };

  // Status checking functions
  const checkInventoryDetailsStatus = async (stockId: string): Promise<CompletionStatus> => {
    try {
      console.log('🔍 [TopActionNavigation] Checking inventory details for:', stockId);
      const response = await fetch(`/api/stock-actions/inventory-details?stockId=${stockId}`);
      console.log('📡 [TopActionNavigation] Inventory details API response status:', response.status);
      
      if (!response.ok) {
        console.log('❌ [TopActionNavigation] Inventory details API failed with status:', response.status);
        return 'pending';
      }
      
      const result = await response.json();
      console.log('📦 [TopActionNavigation] Inventory details API result:', result);
      
      if (result.success && result.data) {
        const data = result.data;
        console.log('📋 [TopActionNavigation] Inventory details data:', data);
        
        // Check for required fields with flexible field names
        const stockRef = data.stockReference || data.stockId;
        const reg = data.registration;
        const purchaseDate = data.dateOfPurchase || data.purchaseDate;
        const cost = data.costOfPurchase || data.purchaseCost || data.cost;
        
        const hasRequiredFields = !!(stockRef && reg && purchaseDate && cost);
        const hasValidCost = cost && cost.toString().trim() !== '' && parseFloat(cost) > 0;
        
        const status = hasRequiredFields && hasValidCost ? 'completed' : 'pending';
        console.log('✅ [TopActionNavigation] Inventory details status:', status, { stockRef, reg, purchaseDate, cost, hasRequiredFields, hasValidCost });
        
        return status;
      }
      
      console.log('⚠️ [TopActionNavigation] No inventory details data found');
      return 'pending';
    } catch (error) {
      console.error('❌ [TopActionNavigation] Error checking inventory details:', error);
      return 'pending';
    }
  };

  const checkChecklistStatus = async (stockId: string): Promise<CompletionStatus> => {
    try {
      const response = await fetch(`/api/stock-actions/vehicle-checklist?stockId=${stockId}`);
      if (!response.ok) return 'pending';
      const result = await response.json();
      if (result.success && result.data) {
        const completionPercentage = result.data.completionPercentage || 0;
        return completionPercentage === 100 ? 'completed' : 'pending';
      }
      return 'pending';
    } catch {
      return 'pending';
    }
  };

  const checkCostsStatus = async (stockId: string): Promise<CompletionStatus> => {
    try {
      console.log('🔍 [TopActionNavigation] Checking costs for:', stockId);
      const response = await fetch(`/api/stock-actions/vehicle-costs?stockId=${stockId}`);
      console.log('📡 [TopActionNavigation] Costs API response status:', response.status);
      
      if (!response.ok) {
        console.log('❌ [TopActionNavigation] Costs API failed with status:', response.status);
        return 'pending';
      }
      
      const result = await response.json();
      console.log('📦 [TopActionNavigation] Costs API result:', result);
      
      if (result.success && result.data) {
        const costsData = result.data;
        console.log('📋 [TopActionNavigation] Costs data:', costsData);
        
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
        console.log('✅ [TopActionNavigation] Costs status:', status, { hasFixedCosts, hasOtherCosts });
        
        return status;
      }
      
      console.log('⚠️ [TopActionNavigation] No costs data found');
      return 'pending';
    } catch (error) {
      console.error('❌ [TopActionNavigation] Error checking costs:', error);
      return 'pending';
    }
  };

  const checkReturnCostsStatus = async (stockId: string): Promise<CompletionStatus> => {
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

  const checkSaleDetailsStatus = async (stockId: string): Promise<CompletionStatus> => {
    try {
      console.log('🔍 [TopActionNavigation] Checking sale details for:', stockId);
      const response = await fetch(`/api/stock-actions/sale-details?stockId=${stockId}`);
      console.log('📡 [TopActionNavigation] Sale details API response status:', response.status);
      
      if (!response.ok) {
        console.log('❌ [TopActionNavigation] Sale details API failed with status:', response.status);
        return 'pending';
      }
      
      const result = await response.json();
      console.log('📦 [TopActionNavigation] Sale details API result:', result);
      
      if (result.success && result.data) {
        const saleData = result.data;
        console.log('📋 [TopActionNavigation] Sale details data:', saleData);
        
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
        console.log('✅ [TopActionNavigation] Sale details status:', status, { 
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
      
      console.log('⚠️ [TopActionNavigation] No sale details data found');
      return 'pending';
    } catch (error) {
      console.error('❌ [TopActionNavigation] Error checking sale details:', error);
      return 'pending';
    }
  };

  const checkDetailedMarginsStatus = async (stockId: string): Promise<CompletionStatus> => {
    try {
      console.log('🔍 [TopActionNavigation] Checking detailed margins for:', stockId);
      
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
          console.log('📦 [TopActionNavigation] Purchase price check:', { purchasePrice, hasPurchasePrice });
        }
      }
      
      // Check sale price from sale details
      if (saleResponse.ok) {
        const saleResult = await saleResponse.json();
        if (saleResult.success && saleResult.data) {
          const salePrice = saleResult.data.salePrice || saleResult.data.price || saleResult.data.amount;
          hasSalePrice = salePrice && parseFloat(salePrice) > 0;
          console.log('💰 [TopActionNavigation] Sale price check:', { salePrice, hasSalePrice });
        }
      }
      
      const status = hasPurchasePrice && hasSalePrice ? 'completed' : 'pending';
      console.log('✅ [TopActionNavigation] Detailed margins status:', status, { hasPurchasePrice, hasSalePrice });
      
      return status;
    } catch (error) {
      console.error('❌ [TopActionNavigation] Error checking detailed margins:', error);
      return 'pending';
    }
  };

  // Get status display for a tab
  const getStatusDisplay = (tabId: string) => {
    const status = actionStatuses[tabId] || 'pending';
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
          color: 'text-green-600'
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-orange-600" />,
          color: 'text-orange-600'
        };
    }
  };

  // Check if we're currently on an action tab
  const isActionTab = actionTabs.some(tab => tab.id === activeTab);

  const getTabColorClasses = (color: string, isActive: boolean) => {
    // Since we now have a consistent dark background (bg-slate-800), 
    // we always use white text for visibility in both light and dark modes
    const colorMap = {
      blue: {
        active: 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/25',
        inactive: 'text-white border-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-300 bg-slate-700/50'
      },
      green: {
        active: 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-600/25',
        inactive: 'text-white border-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-300 bg-slate-700/50'
      },
      yellow: {
        active: 'bg-yellow-600 text-white border-yellow-500 shadow-lg shadow-yellow-600/25',
        inactive: 'text-white border-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-300 bg-slate-700/50'
      },
      orange: {
        active: 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/25',
        inactive: 'text-white border-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-300 bg-slate-700/50'
      },
      purple: {
        active: 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/25',
        inactive: 'text-white border-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-300 bg-slate-700/50'
      },
      indigo: {
        active: 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25',
        inactive: 'text-white border-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-300 bg-slate-700/50'
      }
    };

    return colorMap[color as keyof typeof colorMap]?.[isActive ? 'active' : 'inactive'] || colorMap.blue[isActive ? 'active' : 'inactive'];
  };

  const currentActionTab = actionTabs.find(tab => tab.id === activeTab);

  return (
    <div className="sticky top-16 z-30 border-b bg-slate-800 border-slate-500 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Stock Actions Header - Parent element styling */}
        <div className="relative bg-gradient-to-r from-slate-800 via-slate-750 to-slate-800 border-b border-slate-400/40">
          {/* Decorative top border */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-300/50 to-transparent"></div>
          
          <div className="flex items-center justify-center py-2 px-4">
            <div className="text-center relative">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-white/5 rounded-lg blur-lg"></div>
              
              {/* Content */}
              <div className="relative">
                <div className="flex items-center justify-center mb-0.5">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent w-8"></div>
                  <div className="mx-2 w-1.5 h-1.5 bg-slate-300/60 rounded-full"></div>
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent w-8"></div>
                </div>
                
                <h2 className="text-lg font-bold text-white tracking-wide drop-shadow-sm">
                  Stock Actions
                </h2>
              
                
                <div className="flex items-center justify-center mt-0.5">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent w-12"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative bottom border with connecting lines */}
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-px bg-gradient-to-r from-slate-400/20 via-slate-300/60 to-slate-400/20"></div>
            <div className="flex justify-center">
              <div className="w-px h-2 bg-gradient-to-b from-slate-300/60 to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center py-3 overflow-x-auto relative">
          {/* Connecting line from header */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-px h-2 bg-gradient-to-b from-slate-300/40 to-transparent"></div>
          {/* Back to View Button - Only show when on action tab */}
          {isActionTab && (
            <button
              onClick={() => onTabChange('overview')}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 mr-6 text-white border-slate-400 hover:bg-slate-500 hover:text-white hover:border-slate-300 bg-slate-700/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden lg:inline"></span>
              <span className="lg:hidden">View</span>
            </button>
          )}

          {/* Flex spacer to center the action tabs */}
          <div className="flex-1"></div>

          {/* Stock Action Tabs - Centered with visual grouping */}
          <div className="relative">
            {/* Background container for visual grouping */}
            <div className="absolute inset-0 bg-slate-700/20 rounded-xl border border-slate-400/20 backdrop-blur-sm"></div>
            
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-slate-300/30 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-slate-300/30 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-slate-300/30 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-slate-300/30 rounded-br-lg"></div>
            
            <div className="relative flex items-center gap-1 p-2">
            {/* Deposit Toggle - Left of Purchase Info */}
            <div className="flex items-center mr-3">
              <div className="flex flex-col items-center space-y-1">
                <label className="text-xs font-medium text-white">
                  Deposit Taken
                </label>
                <button
                  type="button"
                  onClick={() => handleDepositToggle(!isDepositTaken)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    isDepositTaken
                      ? 'bg-green-600'
                      : isDarkMode
                        ? 'bg-slate-600'
                        : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${
                      isDepositTaken ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            {/* Visual separator */}
            <div className="mx-2 flex flex-col items-center">
              <div className="w-px h-3 bg-gradient-to-b from-transparent via-slate-300/40 to-transparent"></div>
              <div className="w-1 h-1 bg-slate-300/30 rounded-full my-0.5"></div>
              <div className="w-px h-3 bg-gradient-to-b from-transparent via-slate-300/40 to-transparent"></div>
            </div>
            
            {filteredActionTabs.map((tab, index) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            const isServiceDetails = tab.id === 'service-details';
            
            return (
              <div key={tab.id} className="flex items-center">
                <button
                  onClick={() => onTabChange(tab.id as TabType)}
                  className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                    isServiceDetails 
                      ? `${isActive 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500 shadow-lg shadow-purple-600/25' 
                          : 'text-white border-purple-400 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white hover:border-purple-300 bg-purple-600/70'
                        }` 
                      : `whitespace-nowrap ${getTabColorClasses(tab.color, isActive)}`
                  }`}
                >
                  <div className="flex items-center">
                    <IconComponent className="h-4 w-4 mr-2" />
                    {isServiceDetails ? (
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs font-semibold">Service</span>
                        <span className="text-xs font-semibold">Details</span>
                      </div>
                    ) : (
                      <>
                        <span className="hidden lg:inline">{tab.label}</span>
                        <span className="lg:hidden">{tab.shortLabel}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Status indicator */}
                  <div className="ml-1.5 flex-shrink-0">
                    {isLoadingStatuses ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                    ) : (
                      getStatusDisplay(tab.id).icon
                    )}
                  </div>
                </button>
                
                {/* Visual separator between buttons */}
                {index < actionTabs.length - 1 && (
                  <div className="mx-1 flex flex-col items-center">
                    <div className="w-px h-3 bg-gradient-to-b from-transparent via-slate-300/40 to-transparent"></div>
                    <div className="w-1 h-1 bg-slate-300/30 rounded-full my-0.5"></div>
                    <div className="w-px h-3 bg-gradient-to-b from-transparent via-slate-300/40 to-transparent"></div>
                  </div>
                )}
              </div>
            );
          })}
            </div>
          </div>

          {/* Flex spacer to center the action tabs */}
          <div className="flex-1"></div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden py-3">
          {/* Deposit Toggle for Mobile */}
          <div className="mb-3">
            <div className={`p-3 rounded-lg border ${
              isDarkMode 
                ? 'bg-slate-800/50 border-slate-600/50' 
                : 'bg-white/50 border-slate-200/50'
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">
                  Deposit Taken
                </label>
                <button
                  type="button"
                  onClick={() => handleDepositToggle(!isDepositTaken)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    isDepositTaken
                      ? 'bg-green-600'
                      : isDarkMode
                        ? 'bg-slate-600'
                        : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      isDepositTaken ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
          
          {/* Back Button - Only show when on action tab */}
          {isActionTab && (
            <div className="mb-3">
              <Button
                variant="outline"
                onClick={() => onTabChange('overview')}
                className="flex items-center bg-slate-700/50 border-slate-400 text-white hover:bg-slate-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Vehicle View
              </Button>
            </div>
          )}

          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full justify-between bg-slate-700/50 border-slate-400 text-white hover:bg-slate-500"
            >
              <div className="flex items-center">
                {currentActionTab && (
                  <>
                    <currentActionTab.icon className="h-4 w-4 mr-2" />
                    <span>{currentActionTab.label}</span>
                  </>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                isMobileMenuOpen ? 'transform rotate-180' : ''
              }`} />
            </Button>

            {/* Mobile Dropdown */}
            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-50 bg-slate-700/90 border-slate-400 backdrop-blur-sm">
                <div className="py-1">
                  
                  {filteredActionTabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isServiceDetails = tab.id === 'service-details';
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          onTabChange(tab.id as TabType);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                          isServiceDetails
                            ? isActive
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'bg-purple-600/70 text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500'
                            : isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-white hover:bg-slate-500 hover:text-white'
                        }`}
                      >
                        <IconComponent className="h-4 w-4 mr-3" />
                        {isServiceDetails ? (
                          <div className="flex flex-col items-start flex-1 text-left leading-tight">
                            <span className="text-xs font-semibold">Service</span>
                            <span className="text-xs font-semibold">Details</span>
                          </div>
                        ) : (
                          <span className="flex-1 text-left">{tab.label}</span>
                        )}
                        
                        {/* Status indicator */}
                        <div className="ml-1.5 flex-shrink-0">
                          {isLoadingStatuses ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                          ) : (
                            getStatusDisplay(tab.id).icon
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Deposit Details Modal */}
      <DepositDetailsModal
        isOpen={isDepositModalOpen}
        onClose={handleModalClose}
        stockId={stockId}
        stockData={stockData}
        onSuccess={() => {
          setIsDepositModalOpen(false);
          loadDepositStatus();
          loadActionStatuses();
        }}
      />
    </div>
  );
}