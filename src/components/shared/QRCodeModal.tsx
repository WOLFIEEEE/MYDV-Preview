"use client";

import { QrCode, X } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockId: string;
  registration?: string;
  vehicleTitle?: string;
}

export default function QRCodeModal({ 
  isOpen, 
  onClose, 
  stockId, 
  registration, 
  vehicleTitle 
}: QRCodeModalProps) {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl ${
        isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
              }`}>
                <QrCode className={`h-5 w-5 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Upload QR Code
                </h2>
                {vehicleTitle && (
                  <p className={`text-sm ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {vehicleTitle} - {registration || stockId.slice(-8)}
                  </p>
                )}
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

          {/* Content */}
          <div className="py-4">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - QR Code */}
              <div className="flex flex-col items-center">
                <QRCodeGenerator 
                  stockId={stockId}
                  registration={registration}
                  size={200}
                  className="w-full"
                />
              </div>

              {/* Right Column - Instructions */}
              <div className="flex flex-col justify-center">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  <h4 className={`font-medium mb-3 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    How to use:
                  </h4>
                  <ul className={`text-sm space-y-2 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">1.</span>
                      <span>Scan the QR code with any smartphone camera</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">2.</span>
                      <span>Choose to upload photos or documents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">3.</span>
                      <span>Files automatically link to this vehicle</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">4.</span>
                      <span>Photos can be edited and added to listings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">5.</span>
                      <span>Documents go to the vehicle's archive</span>
                    </li>
                  </ul>
                </div>

                {/* Additional Info */}
                <div className={`mt-4 p-3 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-blue-900/20 border-blue-700/50 text-blue-300' 
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <p className="text-sm font-medium mb-1">💡 Pro Tip:</p>
                  <p className="text-xs">
                    You can print this QR code and stick it on the vehicle for easy access during inspections.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
