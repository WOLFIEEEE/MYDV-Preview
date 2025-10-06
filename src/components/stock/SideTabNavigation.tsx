"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from '@clerk/nextjs';
import { 
  Info,
  Car,
  Images,
  CheckCircle,
  Megaphone,
  UserCheck,
  History,
  BarChart3,
  TrendingUp,
  Database,
  Code,
  Package,
  ClipboardCheck,
  PoundSterling,
  Undo,
  Handshake,
  PiggyBank,
  FileText,
  ArrowRight,
  ChevronLeft,
  Wrench
} from "lucide-react";
import { TabType } from "./StockDetailLayout";

interface SideTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showActionTabs?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const viewTabs = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "vehicle", label: "Vehicle", icon: Car },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "features", label: "Features", icon: CheckCircle },
  { id: "adverts", label: "Listing Details", icon: Megaphone },
  { id: "advertiser", label: "Retailer Information", icon: UserCheck },
  { id: "history", label: "Vehicle History", icon: History },
  { id: "valuations", label: "Valuations", icon: BarChart3 },
  { id: "metrics", label: "Advert Statistics", icon: TrendingUp },
  { id: "metadata", label: "Detailed Information", icon: Database },
  { id: "json", label: "Raw JSON", icon: Code },
] as const;

const actionTabs = [
  { id: "edit-inventory", label: "Purchase Info", icon: Package },
  { id: "add-checklist", label: "Checklist", icon: ClipboardCheck },
  { id: "add-costs", label: "Costs", icon: PoundSterling },
  { id: "return-costs", label: "Return Costs", icon: Undo },
  { id: "sale-details", label: "Sale Details", icon: Handshake },
 
  { id: "detailed-margins", label: "Detailed Margins", icon: PiggyBank },
  { id: "generate-invoice", label: "Create Invoice", icon: FileText },
  { id: "service-details", label: "Service Details", icon: Wrench },
] as const;

export default function SideTabNavigation({ 
  activeTab, 
  onTabChange, 
  showActionTabs = true, 
  isCollapsed = false,
  onToggleCollapse 
}: SideTabNavigationProps) {
  const { user } = useUser();

  // Check user role for permissions
  const userRole = user?.publicMetadata?.role as string;
  const userType = user?.publicMetadata?.userType as string;
  const isTeamMember = userType === 'team_member' && userRole !== 'store_owner_admin';

  // Filter action tabs based on user role - hide detailed margins from employees and sales reps
  const filteredActionTabs = actionTabs.filter(tab => {
    if (tab.id === 'detailed-margins' && isTeamMember) {
      return false; // Hide detailed margins from team members (except store_owner_admin)
    }
    return true;
  });
  const { isDarkMode } = useTheme();

  const renderTabSection = (tabs: readonly any[], title: string, description: string, showToggle = false) => (
    <div className="mb-4">
      {!isCollapsed && (
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              {title}
            </h3>
            {showToggle && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                            className="p-1.5 rounded-md transition-colors duration-200 hover:bg-slate-700 text-white hover:text-white"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-xs mt-1 text-gray-300">
            {description}
          </p>
        </div>
      )}

      {/* Show expand button when collapsed - only for first section */}
      {isCollapsed && showToggle && onToggleCollapse && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg transition-colors duration-200 hover:bg-slate-700 text-white hover:text-white"
            title="Expand sidebar"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav className="space-y-1">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          const isServiceDetails = tab.id === 'service-details';
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as TabType)}
              title={isCollapsed ? tab.label : undefined}
              className={`group w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'} text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${
                isServiceDetails
                  ? isActive
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25'
                    : 'bg-purple-600/70 text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:shadow-md'
                  : isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white hover:shadow-md'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${
                  isServiceDetails ? 'bg-pink-400' : 'bg-blue-400'
                }`} />
              )}
              
              {/* Icon with enhanced styling */}
              <div className={`flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} p-1 rounded-lg transition-all duration-200 ${
                isActive
                  ? isServiceDetails
                    ? 'bg-purple-500/20 text-purple-200'
                    : 'bg-blue-500/20 text-blue-300'
                  : 'text-gray-400 group-hover:text-gray-300'
              }`}>
                <IconComponent className="h-4 w-4" />
              </div>
              
              {/* Label - hidden when collapsed */}
              {!isCollapsed && (
                isServiceDetails ? (
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs font-semibold">Service</span>
                    <span className="text-xs font-semibold">Details</span>
                  </div>
                ) : (
                  <span className="truncate">{tab.label}</span>
                )
              )}
              
              {/* Active glow effect */}
              {isActive && (
                <div className={`absolute inset-0 rounded-lg opacity-10 ${
                  isServiceDetails ? 'bg-purple-400' : 'bg-blue-400'
                }`} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-full'} h-full flex flex-col transition-all duration-300 ease-in-out bg-slate-800`}>
      <div className={`flex-1 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-4'}`}>
        {/* Vehicle Details Section */}
        {renderTabSection(viewTabs, "Vehicle Details", "Explore all aspects of this vehicle", true)}
        
        {/* Stock Actions Section - Only show if showActionTabs is true */}
        {showActionTabs && (
          <>
            {/* Divider */}
            {!isCollapsed && <div className="border-t my-3 border-gray-700" />}
            
            {/* Stock Actions Section */}
            {renderTabSection(filteredActionTabs, "Stock Actions", "Manage inventory and sales actions")}
          </>
        )}
      </div>
    </div>
  );
}