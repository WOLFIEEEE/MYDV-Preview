"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useStockDetailQuery } from "@/hooks/useStockDataQuery";
import { useQueryClient } from "@tanstack/react-query";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import TopActionNavigation from "@/components/stock/TopActionNavigation";
import EditSideNavigation from "@/components/stock/EditSideNavigation";
import VehicleDetailsTab from "@/components/stock/edit-tabs/VehicleDetailsTab";
import ImagesTab from "@/components/stock/edit-tabs/ImagesTab";
import FeaturesTab from "@/components/stock/edit-tabs/FeaturesTab";
import AdvertsTab from "@/components/stock/edit-tabs/AdvertsTab";
import AdvertiserTab from "@/components/stock/edit-tabs/AdvertiserTab";
import EditInventoryForm from "@/components/stock/tabs/actions/EditInventoryForm";
import AddChecklistForm from "@/components/stock/tabs/actions/AddChecklistForm";
import AddCostsForm from "@/components/stock/tabs/actions/AddCostsForm";
import ReturnCostsForm from "@/components/stock/tabs/actions/ReturnCostsForm";
import SaleDetailsForm from "@/components/stock/tabs/actions/SaleDetailsForm";
import ServiceDetailsForm from "@/components/stock/tabs/actions/ServiceDetailsForm";
import DetailedMarginsForm from "@/components/stock/tabs/actions/DetailedMarginsForm";
import GenerateInvoiceForm from "@/components/stock/tabs/actions/GenerateInvoiceForm";
import VehicleCheckAlert from "@/components/stock/VehicleCheckAlert";
import { 
  ArrowLeft, 
  Home, 
  Car, 
  ChevronRight, 
  Edit3,
  Clock,
  MapPin,
  ShoppingCart,
  PoundSterling,
  CheckCircle,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LicensePlate from "@/components/ui/license-plate";
import Link from "next/link";
import { getAdvertiserId } from "@/lib/stockEditingApi";

import type { EditTabType } from "@/types/stock";

export default function EditStockPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const stockId = params.stockId as string;
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<EditTabType>("vehicle");
  const [activeActionTab, setActiveActionTab] = useState<EditTabType>("edit-inventory");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showActionTabs, setShowActionTabs] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states for stock actions
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'purchased' | 'deposit' | 'sold' | 'delete' | null;
    status: 'loading' | 'success' | 'error' | null;
    message: string;
    vehicleName: string;
    step: 'confirming' | 'fetching-config' | 'updating-stock' | 'completed';
  }>({
    isOpen: false,
    type: null,
    status: null,
    message: '',
    vehicleName: '',
    step: 'confirming'
  });

  // Use React Query for caching stock detail data
  // RACE CONDITION FIX: Check user?.id to ensure Clerk is fully initialized
  const { 
    data: stockData, 
    loading, 
    error, 
    refetch 
  } = useStockDetailQuery(stockId, isLoaded && isSignedIn && !!user?.id);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Function to refresh action statuses and invalidate caches
  const refreshActionStatuses = async () => {
    console.log('🔄 Refreshing action statuses and invalidating caches...');
    
    // Increment refresh trigger for local UI updates
    setRefreshTrigger(prev => prev + 1);
    
    // CRITICAL FIX: Invalidate React Query cache to refresh data everywhere
    // This ensures My Stock page and other pages immediately show the updated data
    try {
      // Refetch current stock detail
      await refetch();
      
      // Invalidate ALL stock-related queries to refresh data everywhere
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-detail', stockId] });
      
      console.log('✅ Stock cache invalidated successfully');
    } catch (error) {
      console.error('⚠️ Failed to invalidate cache after action:', error);
      // Don't fail the action if cache invalidation fails
    }
  };

  // Get vehicle name for display
  const getVehicleName = () => {
    if (!stockData) return 'Vehicle';
    const make = stockData.vehicle?.make || stockData.make || 'Unknown';
    const model = stockData.vehicle?.model || stockData.model || '';
    return `${make} ${model}`.trim();
  };

  // Stock action handlers
  const handlePurchasedAction = () => {
    const vehicleName = getVehicleName();
    setActionModal({
      isOpen: true,
      type: 'purchased',
      status: 'loading',
      message: `Mark "${vehicleName}" as purchased (due in)?`,
      vehicleName,
      step: 'confirming'
    });
  };

  const handleDepositAction = () => {
    const vehicleName = getVehicleName();
    setActionModal({
      isOpen: true,
      type: 'deposit',
      status: 'loading',
      message: `Mark deposit as taken for "${vehicleName}"?`,
      vehicleName,
      step: 'confirming'
    });
  };

  const handleSoldAction = () => {
    const vehicleName = getVehicleName();
    setActionModal({
      isOpen: true,
      type: 'sold',
      status: 'loading',
      message: `Mark "${vehicleName}" as sold?`,
      vehicleName,
      step: 'confirming'
    });
  };

  const handleDeleteAction = () => {
    const vehicleName = getVehicleName();
    setActionModal({
      isOpen: true,
      type: 'delete',
      status: 'loading',
      message: `Are you sure you want to delete "${vehicleName}"? This action cannot be undone.`,
      vehicleName,
      step: 'confirming'
    });
  };

  // Execute the actual stock action (using same approach as My Stock page)
  const executeStockAction = async (actionType: 'purchased' | 'deposit' | 'sold' | 'delete') => {
    try {
      const vehicleName = getVehicleName();
      
      // Step 1: Fetching configuration
      setActionModal(prev => ({
        ...prev,
        step: 'fetching-config',
        message: 'Fetching store configuration...'
      }));

      const advertiserId = getAdvertiserId(stockData);
      if (!advertiserId) {
        throw new Error('Advertiser ID not found in stock data. Please contact support.');
      }

      // Step 2: Updating stock
      const actionMessages = {
        purchased: `Marking ${vehicleName} as purchased (due in)...`,
        deposit: `Marking deposit as taken for ${vehicleName}...`,
        sold: `Marking ${vehicleName} as sold and unpublishing from all channels...`,
        delete: `Deleting ${vehicleName} and unpublishing from all channels...`
      };

      setActionModal(prev => ({
        ...prev,
        step: 'updating-stock',
        message: actionMessages[actionType]
      }));

      // Prepare payload based on action type (same as My Stock page)
      let payload: any;
      
      if (actionType === 'purchased') {
        // DUE_IN lifecycle state
        payload = {
          metadata: { lifecycleState: 'DUE_IN' }
        };
      } else if (actionType === 'deposit') {
        // SALE_IN_PROGRESS lifecycle state with required reservationStatus
        payload = {
          metadata: { lifecycleState: 'SALE_IN_PROGRESS' },
          adverts: {
            reservationStatus: 'Reserved'
          }
        };
      } else if (actionType === 'sold') {
        // SOLD with unpublished adverts and soldDate
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        payload = {
          metadata: { lifecycleState: 'SOLD' },
          adverts: {
            retailAdverts: {
              autotraderAdvert: { status: "NOT_PUBLISHED" },
              advertiserAdvert: { status: "NOT_PUBLISHED" },
              locatorAdvert: { status: "NOT_PUBLISHED" },
              exportAdvert: { status: "NOT_PUBLISHED" },
              profileAdvert: { status: "NOT_PUBLISHED" }
            },
            soldDate: currentDate
          }
        };
      } else if (actionType === 'delete') {
        // DELETED with unpublished adverts
        payload = {
          metadata: { lifecycleState: 'DELETED' },
          adverts: {
            retailAdverts: {
              autotraderAdvert: { status: "NOT_PUBLISHED" },
              advertiserAdvert: { status: "NOT_PUBLISHED" },
              locatorAdvert: { status: "NOT_PUBLISHED" },
              exportAdvert: { status: "NOT_PUBLISHED" },
              profileAdvert: { status: "NOT_PUBLISHED" }
            }
          }
        };
      }

      // Make direct API call (same as My Stock page)
      const response = await fetch(`/api/stock/${stockId}?advertiserId=${advertiserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        // Step 3: Success
        const successMessages = {
          purchased: `${vehicleName} has been successfully marked as purchased (due in).`,
          deposit: `Deposit has been successfully marked as taken for ${vehicleName}.`,
          sold: `${vehicleName} has been successfully marked as sold and unpublished from all channels.`,
          delete: `${vehicleName} has been successfully deleted and unpublished from all channels.`
        };

        setActionModal(prev => ({
          ...prev,
          step: 'completed',
          status: 'success',
          message: successMessages[actionType]
        }));
        
        // Refresh data and handle navigation
        setTimeout(() => {
          if (actionType === 'delete') {
            router.push('/mystock'); // Redirect to stock list for delete
          } else {
            refetch(); // Refresh the data for other actions
          }
        }, 2000);
      } else {
        // Parse error details (same as My Stock page)
        let errorMessage = `Failed to ${actionType === 'purchased' ? 'mark as purchased' : 
                                      actionType === 'deposit' ? 'mark deposit as taken' :
                                      actionType === 'sold' ? 'mark as sold' : 'delete'} stock`;
        
        // Extract specific error messages from AutoTrader warnings
        if (result.data?.warnings && Array.isArray(result.data.warnings)) {
          const errorWarnings = result.data.warnings.filter((w: any) => w.type === 'ERROR');
          if (errorWarnings.length > 0) {
            errorMessage = errorWarnings.map((w: any) => w.message).join(', ');
          }
        } else if (result.message) {
          errorMessage = result.message;
        }
        
        // Make error messages more user-friendly
        if (errorMessage.includes('SOLD can not have active adverts') || 
            errorMessage.includes('DELETED can not have active adverts')) {
          errorMessage = `Cannot complete action: This vehicle has active advertisements that must be unpublished first. Please try again or contact support if the issue persists.`;
        } else if (errorMessage.includes('Bad Request') || errorMessage.includes('400')) {
          errorMessage = 'Invalid request: Please check the vehicle status and try again. If the problem continues, contact support.';
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(`Error executing ${actionType} action:`, error);
      setActionModal(prev => ({
        ...prev,
        step: 'completed',
        status: 'error',
        message: error instanceof Error ? error.message : `Failed to ${actionType} stock`
      }));
    }
  };

  const renderTabContent = () => {
    // Check if we're showing action tabs
    if (showActionTabs) {
      switch (activeActionTab) {
        case "edit-inventory":
          return <EditInventoryForm stockData={stockData} onSuccess={refreshActionStatuses} />;
        case "add-checklist":
          return <AddChecklistForm stockData={stockData} onSuccess={refreshActionStatuses} />;
        case "add-costs":
          return <AddCostsForm stockData={stockData} onSuccess={refreshActionStatuses} />;
        case "return-costs":
          return <ReturnCostsForm stockData={stockData} onSuccess={refreshActionStatuses} />;
        case "sale-details":
          return <SaleDetailsForm stockData={stockData} onSuccess={refreshActionStatuses} />;
        case "service-details":
          return <ServiceDetailsForm stockData={stockData} onSuccess={refreshActionStatuses} />;
        case "detailed-margins":
          return <DetailedMarginsForm stockData={stockData} onSuccess={refreshActionStatuses} />;
        case "generate-invoice":
          return <GenerateInvoiceForm stockData={stockData} onSuccess={refreshActionStatuses} />;
        default:
          return <EditInventoryForm stockData={stockData} onSuccess={refreshActionStatuses} />;
      }
    }
    
    // Show edit tabs
    switch (activeTab) {
      case "vehicle":
        return <VehicleDetailsTab stockData={stockData} stockId={stockId} onSave={refreshActionStatuses} />;
      case "gallery":
        return <ImagesTab 
          stockData={stockData} 
          stockId={stockId}
          advertiserId={stockData?.advertiser?.advertiserId || stockData?.metadata?.advertiserId}
        />;
      case "features":
        return <FeaturesTab stockData={stockData} stockId={stockId} onSave={refreshActionStatuses} />;
      case "adverts":
        return <AdvertsTab stockData={stockData} stockId={stockId} onSave={refreshActionStatuses} />;
      case "advertiser":
        return <AdvertiserTab stockData={stockData} stockId={stockId} onSave={refreshActionStatuses} />;
      default:
        return <VehicleDetailsTab stockData={stockData} onSave={refreshActionStatuses} />;
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button onClick={() => router.push('/mystock')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stock List
            </Button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-red-800">Error Loading Stock</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button onClick={() => router.push('/mystock')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stock List
            </Button>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-yellow-800">Stock Not Found</h2>
            <p className="text-yellow-600">The requested stock item could not be found.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Extract vehicle details for display
  const vehicle = stockData?.vehicle || {};
  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Details';
  const registration = vehicle.registration || vehicle.plate || 'N/A';
  const year = vehicle.yearOfManufacture || 'N/A';
  const mileage = vehicle.odometerReadingMiles ? `${vehicle.odometerReadingMiles.toLocaleString()} miles` : 'N/A';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      {/* Enhanced Page Header with Breadcrumbs */}
      <div className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="pt-24 pb-6">
            <nav className="flex items-center space-x-2 text-sm">
              <Link 
                href="/" 
                className={`flex items-center hover:text-blue-600 transition-colors ${
                  isDarkMode ? 'text-white hover:text-blue-400' : 'text-gray-500'
                }`}
              >
                <Home className="h-4 w-4 mr-1" />
                Home
              </Link>
              <ChevronRight className={`h-4 w-4 ${isDarkMode ? 'text-white' : 'text-gray-400'}`} />
              <Link 
                href="/mystock" 
                className={`flex items-center hover:text-blue-600 transition-colors ${
                  isDarkMode ? 'text-white hover:text-blue-400' : 'text-gray-500'
                }`}
              >
                <Car className="h-4 w-4 mr-1" />
                My Stock
              </Link>

            </nav>
          </div>

          {/* Page Header */}
          <div className="pb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Vehicle Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <Button 
                    onClick={() => router.push(`/mystock/${stockId}`)} 
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                  
                  {registration !== 'N/A' && (
                    <LicensePlate 
                      registration={registration} 
                      size="md" 
                    />
                  )}
                  
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isDarkMode 
                      ? 'bg-green-900/30 text-green-300 border border-green-700'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    <Edit3 className="h-3 w-3 mr-1 inline" />
                    EDITING
                  </div>
                </div>

                <h1 className={`text-3xl lg:text-4xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Edit {vehicleTitle}
                </h1>
                
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  {year !== 'N/A' && (
                    <div className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      <Clock className="h-4 w-4 mr-1" />
                      {year}
                    </div>
                  )}
                  {mileage !== 'N/A' && (
                    <div className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      <MapPin className="h-4 w-4 mr-1" />
                      {mileage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Action Buttons */}
      <div className={`border-b ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handlePurchasedAction}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              Purchased
            </Button>
            
            <Button
              onClick={handleDepositAction}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <PoundSterling className="h-4 w-4" />
              Deposit Taken
            </Button>
            
            <Button
              onClick={handleSoldAction}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="h-4 w-4" />
              Mark as Sold
            </Button>
            
            <Button
              onClick={handleDeleteAction}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Stock
            </Button>
          </div>
        </div>
      </div>

      {/* Vehicle Check Alert */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <VehicleCheckAlert stockData={stockData} />
      </div>

      {/* Top Action Navigation */}
      <TopActionNavigation 
        activeTab={showActionTabs ? activeActionTab : activeTab}
        onTabChange={(tab) => {
          const actionTabs = ["edit-inventory", "add-checklist", "add-costs", "return-costs", "sale-details", "service-details", "detailed-margins", "generate-invoice"];
          if (actionTabs.includes(tab)) {
            setActiveActionTab(tab as EditTabType);
            setShowActionTabs(true);
          } else {
            setActiveTab(tab as EditTabType);
            setShowActionTabs(false);
          }
        }}
        stockId={stockId}
        stockData={stockData}
        refreshTrigger={refreshTrigger}
        downloadBrochure={async () => {
          console.log('Brochure download not available in edit mode');
        }}
        isBrochureGenerating={false}
      />

      {/* Main Layout with Side Navigation */}
      <div className="flex min-h-screen">
        {/* Side Navigation */}
          <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} sticky top-32 h-[calc(100vh-8rem)] bg-slate-800 border-r border-slate-500 shadow-lg`}>
          {!showActionTabs ? (
            <EditSideNavigation 
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab as EditTabType);
                setShowActionTabs(false);
              }}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          ) : (
            <div className={`${isSidebarCollapsed ? 'px-2 py-4' : 'px-4 py-6'} h-full flex flex-col`}>
                {!isSidebarCollapsed && (
                  <div className="mb-6 relative">
                    {/* Decorative top border */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-300/30 to-transparent"></div>
                    
                    <div className="pt-4 pb-3 px-4 bg-gradient-to-r from-slate-600/50 to-slate-700/50 border-b border-slate-500/30">
                      <div className="text-center relative">
                        {/* Background decoration */}
                        <div className="absolute inset-0 bg-white/5 rounded-lg blur-lg"></div>
                        
                        <div className="relative">
                          <div className="flex items-center justify-center mb-1">
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent w-6"></div>
                            <div className="mx-2 w-1 h-1 bg-slate-300/40 rounded-full"></div>
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent w-6"></div>
                          </div>
                          
                          <h3 className="text-lg font-bold text-white tracking-wide drop-shadow-sm">
                            Stock Actions
                          </h3>
                          <p className="text-xs text-slate-200/70 mt-0.5 font-medium">
                            Manage stock operations and tasks
                          </p>
                          
                          <div className="flex items-center justify-center mt-1">
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-300/30 to-transparent w-8"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  <Button
                    onClick={() => setShowActionTabs(false)}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    ← Back to Edit Tabs
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className={`transition-all duration-300 ${
            isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <div className="min-h-screen">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />

      {/* Stock Action Modal */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-xl shadow-2xl border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                {actionModal.type === 'purchased' ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                ) : actionModal.type === 'deposit' ? (
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <PoundSterling className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                ) : actionModal.type === 'sold' ? (
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div>
                  <h3 className={`font-semibold text-lg ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {actionModal.type === 'purchased' ? 'Mark as Purchased' :
                     actionModal.type === 'deposit' ? 'Deposit Taken' :
                     actionModal.type === 'sold' ? 'Mark as Sold' : 'Delete Stock'}
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-gray-500'
                  }`}>
                    {actionModal.vehicleName}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {/* Progress Steps */}
              {actionModal.step !== 'confirming' && (
                <div className="mb-6">
                  <div className="relative">
                    <div className={`w-full h-2 rounded-full ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${
                          actionModal.step === 'completed'
                            ? actionModal.status === 'success'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                        style={{
                          width: actionModal.step === 'fetching-config' ? '33%' :
                                 actionModal.step === 'updating-stock' ? '66%' :
                                 actionModal.step === 'completed' ? '100%' : '0%'
                        }}
                      />
                    </div>
                    {/* Progress dots */}
                    <div className="absolute top-0 left-0 w-full h-2 flex justify-between items-center">
                      <div className={`w-3 h-3 rounded-full border-2 -mt-0.5 ${
                        ['fetching-config', 'updating-stock', 'completed'].includes(actionModal.step)
                          ? 'bg-blue-500 border-blue-500'
                          : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                      }`} />
                      <div className={`w-3 h-3 rounded-full border-2 -mt-0.5 ${
                        ['updating-stock', 'completed'].includes(actionModal.step)
                          ? 'bg-blue-500 border-blue-500'
                          : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                      }`} />
                      <div className={`w-3 h-3 rounded-full border-2 -mt-0.5 ${
                        actionModal.step === 'completed'
                          ? actionModal.status === 'success'
                            ? 'bg-green-500 border-green-500'
                            : 'bg-red-500 border-red-500'
                          : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                      }`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="mb-6">
                <div className="flex items-start gap-3">
                  {actionModal.step !== 'confirming' && actionModal.step !== 'completed' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    {actionModal.message}
                  </p>
                </div>
              </div>

              {/* AutoTrader Disclaimer (only show on success) */}
              {actionModal.status === 'success' && (
                <div className={`p-4 rounded-lg border-l-4 border-blue-500 mb-6 ${
                  isDarkMode ? 'bg-blue-900/20 border-blue-400' : 'bg-blue-50'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className={`text-xs leading-relaxed ${
                      isDarkMode ? 'text-blue-200' : 'text-blue-800'
                    }`}>
                      Changes won&apos;t reflect on your dashboard immediately. AutoTrader typically takes 15-20 minutes to process updates. To maintain accuracy, we display the exact data received from AutoTrader. Updated information will appear once AutoTrader processes and confirms your changes on their end.
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                {actionModal.step === 'confirming' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => executeStockAction(actionModal.type!)}
                      className={`flex-1 ${
                        actionModal.type === 'purchased'
                          ? 'bg-green-600 hover:bg-green-700'
                          : actionModal.type === 'deposit'
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : actionModal.type === 'sold'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-red-600 hover:bg-red-700'
                      } text-white`}
                    >
                      {actionModal.type === 'purchased' ? 'Mark as Purchased' :
                       actionModal.type === 'deposit' ? 'Mark Deposit Taken' :
                       actionModal.type === 'sold' ? 'Mark as Sold' : 'Delete Stock'}
                    </Button>
                  </>
                ) : actionModal.step === 'completed' ? (
                  <Button
                    onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-full"
                    variant={actionModal.status === 'success' ? 'default' : 'outline'}
                  >
                    {actionModal.status === 'success' ? 'Done' : 'Close'}
                  </Button>
                ) : (
                  <div className="w-full text-center">
                    <p className={`text-xs ${
                      isDarkMode ? 'text-white' : 'text-gray-400'
                    }`}>
                      Please wait while we process your request...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}