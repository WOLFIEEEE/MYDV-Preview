"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { 
  Car,
  Images,
  CheckCircle,
  Megaphone,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface EditSideNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const editTabs = [
  { id: "vehicle", label: "Vehicle", icon: Car },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "features", label: "Features", icon: CheckCircle },
  { id: "adverts", label: "Listing Details", icon: Megaphone },
  { id: "advertiser", label: "Retailer Information", icon: UserCheck },
];

export default function EditSideNavigation({ 
  activeTab, 
  onTabChange, 
  isCollapsed = false,
  onToggleCollapse 
}: EditSideNavigationProps) {
  const { isDarkMode } = useTheme();

  const renderTabSection = () => (
    <div className="space-y-1">
      {editTabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`group w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-gray-200 hover:bg-gray-700/50 hover:text-white hover:shadow-md'
            }`}
            title={isCollapsed ? tab.label : undefined}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-blue-400" />
            )}
            
            {/* Icon with enhanced styling */}
            <div className={`flex-shrink-0 p-1 rounded-lg transition-all duration-200 ${
              isCollapsed ? 'mr-0' : 'mr-3'
            } ${
              isActive
                ? 'bg-blue-500/20'
                : 'group-hover:bg-gray-600/50'
            }`}>
              <IconComponent className={`h-4 w-4 transition-transform duration-200 ${
                isActive ? 'scale-110' : 'group-hover:scale-105'
              }`} />
            </div>
            
            {/* Label */}
            {!isCollapsed && (
              <span className="truncate">{tab.label}</span>
            )}
            
            {/* Active glow effect */}
            {isActive && (
              <div className="absolute inset-0 rounded-xl opacity-20 bg-gradient-to-r from-blue-400/20 to-blue-600/20" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} h-full flex flex-col transition-all duration-300 ease-in-out`}>
      <div className={`flex-1 ${isCollapsed ? 'px-2 py-4' : 'px-4 py-6'}`}>
        {/* Header */}
        {!isCollapsed && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Edit Details
              </h3>
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-md transition-colors duration-200 hover:bg-gray-700 text-gray-400 hover:text-white"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-sm mt-1 text-gray-400">
              Manage vehicle information and settings
            </p>
          </div>
        )}

        {/* Collapse button for collapsed state */}
        {isCollapsed && onToggleCollapse && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-md transition-colors duration-200 hover:bg-gray-700 text-gray-400 hover:text-white"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Edit Tabs Section */}
        {renderTabSection()}
      </div>
    </div>
  );
}