"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Settings,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Archive,
  Share2,
  Download,
  FileText,
  AlertCircle,
  X
} from "lucide-react";

interface StockSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stockId: string;
  stockData?: any;
}

export default function StockSettingsDialog({ 
  isOpen, 
  onClose, 
  stockId, 
  stockData 
}: StockSettingsDialogProps) {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAction = async (action: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API calls
      console.log(`Performing action: ${action} on stock ${stockId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message or handle the action
      alert(`${action} completed successfully!`);
      
      onClose();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const vehicle = stockData?.vehicle || {};
  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md shadow-2xl ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
              }`}>
                <Settings className={`h-5 w-5 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Stock Settings
                </h2>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-gray-600'
                }`}>
                  {vehicleTitle} - {vehicle.registration || stockId.slice(-8)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {/* View Actions */}
            <div className="space-y-1">
              <p className={`text-xs font-medium uppercase tracking-wide ${
                isDarkMode ? 'text-white' : 'text-gray-500'
              }`}>
                View & Edit
              </p>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open(`/mystock/${stockId}`, '_blank')}
                disabled={isLoading}
              >
                <Eye className="h-4 w-4 mr-3" />
                View Details
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open(`/mystock/edit/${stockId}`, '_blank')}
                disabled={isLoading}
              >
                <Edit3 className="h-4 w-4 mr-3" />
                Edit Stock
              </Button>
            </div>

            {/* Export Actions */}
            <div className="space-y-1 pt-4">
              <p className={`text-xs font-medium uppercase tracking-wide ${
                isDarkMode ? 'text-white' : 'text-gray-500'
              }`}>
                Export & Share
              </p>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAction('Export PDF')}
                disabled={isLoading}
              >
                <FileText className="h-4 w-4 mr-3" />
                Export as PDF
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAction('Download Images')}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-3" />
                Download Images
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAction('Share')}
                disabled={isLoading}
              >
                <Share2 className="h-4 w-4 mr-3" />
                Share Stock
              </Button>
            </div>

            {/* Stock Management */}
            <div className="space-y-1 pt-4">
              <p className={`text-xs font-medium uppercase tracking-wide ${
                isDarkMode ? 'text-white' : 'text-gray-500'
              }`}>
                Stock Management
              </p>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAction('Duplicate')}
                disabled={isLoading}
              >
                <Copy className="h-4 w-4 mr-3" />
                Duplicate Stock
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAction('Archive')}
                disabled={isLoading}
              >
                <Archive className="h-4 w-4 mr-3" />
                Archive Stock
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="space-y-1 pt-4">
              <p className={`text-xs font-medium uppercase tracking-wide ${
                isDarkMode ? 'text-red-400' : 'text-red-500'
              }`}>
                Danger Zone
              </p>
              
              <Button
                variant="outline"
                className={`w-full justify-start border-red-200 text-red-600 hover:bg-red-50 ${
                  isDarkMode ? 'border-red-800 text-red-400 hover:bg-red-900/20' : ''
                }`}
                onClick={() => {
                  if (confirm('Are you sure you want to delete this stock? This action cannot be undone.')) {
                    handleAction('Delete');
                  }
                }}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Delete Stock
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Processing...
                </>
              ) : (
                'Close'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}