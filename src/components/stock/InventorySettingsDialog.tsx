"use client";

import { useState } from "react";
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
  Star,
  Layers,
  ArrowLeft,
  ChevronRight
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

interface InventorySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stockData: any;
}

type FormType = 
  | 'purchase-info' 
  | 'checklist' 
  | 'costs' 
  | 'return-costs' 
  | 'sale-details' 
  | 'detailed-margins'
  | 'invoice';

export default function InventorySettingsDialog({ isOpen, onClose, stockData }: InventorySettingsDialogProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<FormType | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

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
          badge: "Core"
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
          badge: "Essential"
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
          badge: "Finance"
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
          badge: "Returns"
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
          badge: "Analytics"
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
          badge: "Sales"
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
          special: true
        }
      ]
    }
  ];

  const handleActionClick = (actionId: FormType) => {
    // For all forms including invoice, show them in the dialog
    setActiveForm(actionId);
  };

  const handleBackToActions = () => {
    setActiveForm(null);
  };

  const renderForm = () => {
    if (!activeForm) return null;

    switch (activeForm) {
      case 'purchase-info':
        return <EditInventoryForm stockData={stockData} />;
      case 'checklist':
        return <AddChecklistForm stockData={stockData} />;
      case 'costs':
        return <AddCostsForm stockData={stockData} />;
      case 'return-costs':
        return <ReturnCostsForm stockData={stockData} />;
      case 'sale-details':
        return <SaleDetailsForm stockData={stockData} />;
      case 'detailed-margins':
        return <DetailedMarginsForm stockData={stockData} />;
      case 'invoice':
        return <GenerateInvoiceForm stockData={stockData} saleDetailsData={null} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl border overflow-hidden ${
        isDarkMode 
          ? 'bg-slate-900/95 border-slate-700/50 backdrop-blur-xl' 
          : 'bg-white/95 border-slate-200/50 backdrop-blur-xl'
      }`}>
        
        {/* Premium Header with Gradient */}
        <div className={`relative overflow-hidden ${
          isDarkMode ? 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-700' : 'bg-gradient-to-r from-slate-50 via-white to-slate-50'
        }`}>
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-teal-500/20 animate-pulse"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
          </div>
          
          <div className="relative flex items-center justify-between p-4 border-b border-slate-200/20">
            <div className="flex items-center gap-4">
              {/* Compact Icon */}
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              
              <div>
                <h2 className={`text-2xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {activeForm ? 'Stock Action Form' : 'Stock Actions Hub'}
                </h2>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  {activeForm 
                    ? 'Complete the form below to proceed' 
                    : `Advanced management for ${stockData?.registration || 'vehicle'}`
                  }
                </p>
                {!activeForm && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Premium Actions
                      </span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                      Choose an action below
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {activeForm && (
                <Button
                  onClick={handleBackToActions}
                  variant="outline"
                  size="sm"
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500' 
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Actions
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className={`w-10 h-10 rounded-lg transition-all duration-300 hover:scale-105 ${
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

        {/* Optimized Content Area */}
        <div className="p-4 max-h-[calc(90vh-140px)] overflow-y-auto">
          {activeForm ? (
            // Show the selected form with optimized spacing
            <div className="animate-in slide-in-from-right-8 duration-500 ease-out">
              <div className={`rounded-xl p-3 ${
                isDarkMode 
                  ? 'bg-slate-800/50 border border-slate-700/50' 
                  : 'bg-slate-50/50 border border-slate-200/50'
              }`}>
                {renderForm()}
              </div>
            </div>
          ) : (
            // Show premium action categories
            <div className="animate-in fade-in-0 duration-500 space-y-6">
              {actionCategories.map((category, categoryIndex) => (
                <div key={category.title} className="space-y-3">
                  {/* Compact Category Header */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center shadow-lg`}>
                      <category.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {category.title}
                      </h3>
                      <p className={`text-xs font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>
                        {category.subtitle}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      isDarkMode 
                        ? 'bg-slate-700/60 text-slate-300' 
                        : 'bg-slate-100/60 text-slate-700'
                    }`}>
                      {category.actions.length} Actions
                    </div>
                  </div>

                  {/* Ultra Compact Action Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {category.actions.map((action, actionIndex) => (
                      <button
                        key={action.id}
                        onClick={() => handleActionClick(action.id)}
                        onMouseEnter={() => setHoveredAction(action.id)}
                        onMouseLeave={() => setHoveredAction(null)}
                        className={`group relative overflow-hidden p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 ${
                          isDarkMode
                            ? 'border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-800/30 hover:border-slate-600/70'
                            : 'border-slate-200/60 bg-gradient-to-br from-white/90 to-slate-50/50 hover:border-slate-300/70'
                        } ${action.special ? 'ring-1 ring-rose-500/30' : ''}`}
                        style={{
                          boxShadow: hoveredAction === action.id 
                            ? `0 8px 20px -4px rgba(0, 0, 0, 0.12), 0 0 15px ${action.shadowColor}` 
                            : '0 2px 8px -1px rgba(0, 0, 0, 0.06)'
                        }}
                      >
                        {/* Subtle Background Effects */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-3`}></div>
                        </div>

                        {/* Special Badge for Invoice */}
                        {action.special && (
                          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500">
                          </div>
                        )}

                        <div className="relative z-10 space-y-2">
                          {/* Ultra Compact Icon and Badge */}
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${action.iconBg} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                              <action.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              isDarkMode 
                                ? 'bg-slate-700/50 text-slate-400' 
                                : 'bg-slate-100/50 text-slate-600'
                            }`}>
                              {action.badge}
                            </div>
                          </div>

                          {/* Ultra Compact Content */}
                          <div className="space-y-0.5">
                            <h4 className={`text-xs font-semibold leading-tight ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {action.label}
                            </h4>
                            <p className={`text-xs leading-tight line-clamp-2 ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              {action.description}
                            </p>
                          </div>

                          {/* Minimal Action Indicator */}
                          <div className="flex items-center justify-end">
                            <ChevronRight className={`w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 ${
                              isDarkMode ? 'text-white' : 'text-slate-500'
                            }`} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Premium Footer */}
              <div className={`mt-12 p-6 rounded-2xl border ${
                isDarkMode 
                  ? 'bg-slate-800/30 border-slate-700/50' 
                  : 'bg-slate-50/30 border-slate-200/50'
              }`}>
                <div className="flex items-center justify-center gap-4">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`}>
                    Premium stock management tools at your fingertips
                  </span>
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}