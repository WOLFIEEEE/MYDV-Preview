"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Copy, QrCode, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import QRCodeGenerator from './QRCodeGenerator';

interface InlineQRCodeProps {
  stockId: string;
  registration?: string;
  vehicleTitle?: string;
  onClose?: () => void;
  className?: string;
}

export default function InlineQRCode({ 
  stockId, 
  registration, 
  vehicleTitle,
  onClose,
  className = "" 
}: InlineQRCodeProps) {
  const { isDarkMode } = useTheme();

  return (
    <Card className={`${className} ${
      isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <CardContent className="p-6">
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QrCode className={`h-5 w-5 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`} />
            <h3 className={`font-semibold ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Upload QR Code
            </h3>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`h-8 w-8 p-0 ${
                isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Vehicle Info */}
        {vehicleTitle && (
          <div className={`mb-4 text-center ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            <h4 className="font-medium text-base">
              {vehicleTitle}
            </h4>
            {registration && (
              <p className="text-sm mt-1">
                Registration: {registration}
              </p>
            )}
          </div>
        )}

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <QRCodeGenerator 
            stockId={stockId}
            registration={registration}
            size={180}
            className=""
          />
        </div>

        {/* Instructions */}
        <div className={`p-4 rounded-lg ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'
        }`}>
          <h4 className={`font-medium mb-2 text-sm ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            How to use:
          </h4>
          <ul className={`text-xs space-y-1 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            <li>• Scan with any smartphone camera</li>
            <li>• Choose photos or documents to upload</li>
            <li>• Files automatically link to this vehicle</li>
            <li>• Photos can be edited and added to listings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
