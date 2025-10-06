"use client";


import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Package, 
  ClipboardCheck, 
  PoundSterling, 
  Undo, 
  Handshake, 
  PiggyBank,
  FileText,
  ShoppingBag,
  Building,
  ArrowRightLeft
} from "lucide-react";

interface StockActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockId: string;
}

export default function StockActionsModal({ isOpen, onClose, stockId }: StockActionsModalProps) {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const inventoryActions = [
    {
      icon: Package,
      label: "Purchase Info",
      action: () => console.log("Edit inventory for", stockId),
      color: "blue"
    },
    {
      icon: ClipboardCheck,
      label: "Checklist",
      action: () => console.log("Add checklist for", stockId),
      color: "green"
    }
  ];

  const financialActions = [
    {
      icon: PoundSterling,
      label: "Costs",
      action: () => console.log("Add costs for", stockId),
      color: "blue"
    },
    {
      icon: Undo,
      label: "Return Costs",
      action: () => console.log("Return costs for", stockId),
      color: "orange"
    },
    {
      icon: Handshake,
      label: "Sale Details",
      action: () => console.log("Sale details for", stockId),
      color: "purple"
    },
    {
      icon: PiggyBank,
      label: "Detailed Margins",
      action: () => console.log("Detailed margins for", stockId),
      color: "indigo"
    }
  ];

  const invoiceActions = [
    {
      icon: ShoppingBag,
      label: "Retail Invoice",
      action: () => console.log("Generate retail invoice for", stockId),
      color: "blue"
    },
    {
      icon: Building,
      label: "Finance Invoice",
      action: () => console.log("Generate finance invoice for", stockId),
      color: "green"
    },
    {
      icon: ArrowRightLeft,
      label: "Trade Invoice",
      action: () => console.log("Generate trade invoice for", stockId),
      color: "purple"
    }
  ];

  const getActionButtonClass = (color: string) => {
    const baseClass = `group relative flex flex-col items-center p-2 sm:p-3 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer min-w-[90px] min-h-[70px]`;
    
    const colorClasses = {
      blue: isDarkMode ? 'border-slate-600 bg-slate-800/60 hover:bg-slate-700/60 text-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800',
      green: isDarkMode ? 'border-slate-600 bg-slate-800/60 hover:bg-slate-700/60 text-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800',
      yellow: isDarkMode ? 'border-slate-600 bg-slate-800/60 hover:bg-slate-700/60 text-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800',
      orange: isDarkMode ? 'border-slate-600 bg-slate-800/60 hover:bg-slate-700/60 text-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800',
      purple: isDarkMode ? 'border-slate-600 bg-slate-800/60 hover:bg-slate-700/60 text-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800',
      indigo: isDarkMode ? 'border-slate-600 bg-slate-800/60 hover:bg-slate-700/60 text-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800',
      neutral: isDarkMode ? 'border-slate-600 bg-slate-900/60 hover:bg-slate-800/60 text-white' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-800',
    };

    return `${baseClass} ${colorClasses[color as keyof typeof colorClasses]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-2xl shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Stock Actions
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              Manage and perform actions for Stock ID: {stockId.slice(-8)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 max-h-[calc(90vh-120px)] overflow-y-auto">
          
          {/* Inventory Management Section */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Package className="h-5 w-5 mr-2" />
              Inventory Management
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {inventoryActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={getActionButtonClass(action.color)}
                >
                  <action.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Financial Management Section */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <PoundSterling className="h-5 w-5 mr-2" />
              Financial Management
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {financialActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={getActionButtonClass(action.color)}
                >
                  <action.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Generator Section */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <FileText className="h-5 w-5 mr-2" />
              Invoice
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => invoiceActions[0].action()} // Use the first invoice action (Retail Invoice)
                className={getActionButtonClass('neutral')}
              >
                <FileText className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium text-center">Generate Invoice</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end p-6 border-t ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}