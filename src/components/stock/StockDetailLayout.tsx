"use client";

import { useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useTheme } from "@/contexts/ThemeContext";
import { stockQueryKeys } from "@/hooks/useStockDataQuery";
import { useDirectBrochureDownload } from "@/hooks/useDirectBrochureDownload";
import StockHeader from "./StockHeader";
import SideTabNavigation from "./SideTabNavigation";
import TopActionNavigation from "./TopActionNavigation";
import OverviewTab from "./tabs/OverviewTab";
import VehicleTab from "./tabs/VehicleTab";
import GalleryTab from "./tabs/GalleryTab";
import FeaturesTab from "./tabs/FeaturesTab";
import AdvertsTab from "./tabs/AdvertsTab";
import AdvertiserTab from "./tabs/AdvertiserTab";
import HistoryTab from "./tabs/HistoryTab";
import ValuationsTab from "./tabs/ValuationsTab";
import MetricsTab from "./tabs/MetricsTab";
import MetadataTab from "./tabs/MetadataTab";
// import JsonTab from "./tabs/JsonTab"; // Hidden as requested
import EditInventoryForm from "./tabs/actions/EditInventoryForm";
import AddChecklistForm from "./tabs/actions/AddChecklistForm";
import AddCostsForm from "./tabs/actions/AddCostsForm";
import ReturnCostsForm from "./tabs/actions/ReturnCostsForm";
import SaleDetailsForm from "./tabs/actions/SaleDetailsForm";
import ServiceDetailsForm from "./tabs/actions/ServiceDetailsForm";
import DetailedMarginsForm from "./tabs/actions/DetailedMarginsForm";
import GenerateInvoiceForm from "./tabs/actions/GenerateInvoiceForm";
import BrochureDownloadModal from "./BrochureDownloadModal";

interface StockDetailLayoutProps {
  stockData: any;
  stockId?: string;
  onOpenDocuments?: () => void;
  registration?: string;
  vehicleTitle?: string;
}

export type TabType = 
  | "overview" 
  | "vehicle" 
  | "gallery" 
  | "features" 
  | "adverts" 
  | "advertiser" 
  | "history" 
  | "valuations" 
  | "metrics" 
  | "metadata" 
  // | "json" // Hidden as requested
  | "edit-inventory"
  | "add-checklist" 
  | "add-costs"
  | "return-costs"
  | "sale-details"
  | "service-details"
  | "detailed-margins"
  | "generate-invoice";

export default function StockDetailLayout({ stockData, stockId, onOpenDocuments, registration, vehicleTitle }: StockDetailLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const { isDarkMode } = useTheme();
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  
  // Centralized brochure download state and logic
  const { downloadBrochure, isGenerating: isBrochureGenerating } = useDirectBrochureDownload();

  // Generate user-specific cache ID - only when user is loaded and authenticated
  const userCacheId = user?.id && isLoaded ? `user_${user.id}` : null;

  // Define which tabs are action tabs
  const actionTabs: TabType[] = [
    "edit-inventory",
    "add-checklist", 
    "add-costs",
    "return-costs",
    "sale-details",
    "detailed-margins",
    "generate-invoice"
  ];

  const isActionTab = actionTabs.includes(activeTab);

  // Function to refresh action statuses and invalidate stock cache
  const refreshActionStatuses = () => {
    console.log('🔄 [StockDetailLayout] Refreshing action statuses and invalidating stock cache');
    setRefreshTrigger(prev => prev + 1);
    
    // Invalidate stock cache to refresh the main stock list
    queryClient.invalidateQueries({ queryKey: stockQueryKeys.all });
    
    // Also invalidate the specific stock detail if we have the stockId and user context
    if (stockId && userCacheId) {
      queryClient.invalidateQueries({ queryKey: stockQueryKeys.detail(stockId, userCacheId) });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab stockData={stockData} stockId={stockId} onOpenDocuments={onOpenDocuments} />;
      case "vehicle":
        return <VehicleTab stockData={stockData} />;
      case "gallery":
        return <GalleryTab 
          stockData={stockData} 
          downloadBrochure={downloadBrochure}
          isBrochureGenerating={isBrochureGenerating}
        />;
      case "features":
        return <FeaturesTab stockData={stockData} />;
      case "adverts":
        return <AdvertsTab stockData={stockData} />;
      case "advertiser":
        return <AdvertiserTab stockData={stockData} />;
      case "history":
        return <HistoryTab stockData={stockData} />;
      case "valuations":
        return <ValuationsTab stockData={stockData} />;
      case "metrics":
        return <MetricsTab stockData={stockData} />;
      case "metadata":
        return <MetadataTab stockData={stockData} />;
      // case "json": // Hidden as requested
      //   return <JsonTab stockData={stockData} />;
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
        return <OverviewTab stockData={stockData} />;
    }
  };

  return (
    <div className="w-full">
      {/* Top Action Navigation - Always visible */}
      <TopActionNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stockId={stockId}
        stockData={stockData}
        refreshTrigger={refreshTrigger}
        onOpenBrochureModal={() => setShowBrochureModal(true)}
        downloadBrochure={downloadBrochure}
        isBrochureGenerating={isBrochureGenerating}
      />

      {/* Main Layout with Enhanced Design - Full Width */}
      <div className="flex min-h-screen">
        {/* Enhanced Side Tab Navigation - Collapsible & Sticky */}
        <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} sticky top-32 h-[calc(100vh-8rem)] bg-slate-800 border-r border-gray-700 transition-all duration-300 ease-in-out`}>
          <SideTabNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            showActionTabs={false}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Enhanced Main Content Area - Full Width */}
        <div className={`flex-1 transition-all duration-300 ${
          isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className="min-h-screen">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Brochure Download Modal */}
      <BrochureDownloadModal
        isOpen={showBrochureModal}
        onClose={() => setShowBrochureModal(false)}
        stockData={stockData}
      />
    </div>
  );
}