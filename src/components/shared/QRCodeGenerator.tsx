"use client";

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Download, Copy, QrCode } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface QRCodeGeneratorProps {
  stockId: string;
  registration?: string;
  size?: number;
  className?: string;
}

export default function QRCodeGenerator({ 
  stockId, 
  registration, 
  size = 256, 
  className = "" 
}: QRCodeGeneratorProps) {
  const { isDarkMode } = useTheme();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Generate the upload URL
  const uploadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/qr-upload/${stockId}`;

  useEffect(() => {
    generateQRCode();
  }, [stockId, isDarkMode]);

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      setError('');

      const dataUrl = await QRCode.toDataURL(uploadUrl, {
        width: size,
        margin: 2,
        color: {
          dark: isDarkMode ? '#ffffff' : '#000000',
          light: isDarkMode ? '#1e293b' : '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });

      setQrCodeDataUrl(dataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `QR-${registration || stockId}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(uploadUrl);
      // You could add a toast notification here
      console.log('URL copied to clipboard');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
          isDarkMode ? 'border-white' : 'border-gray-900'
        }`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className} ${
        isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-600'
      } rounded-lg p-4`} style={{ width: size, height: size }}>
        <div className="text-center">
          <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="text-center">
        {/* QR Code Image */}
        <div className={`inline-block p-4 rounded-lg ${
          isDarkMode ? 'bg-slate-800' : 'bg-white'
        } shadow-lg`}>
          <img 
            src={qrCodeDataUrl} 
            alt={`QR Code for ${registration || stockId}`}
            className="block"
            style={{ width: size, height: size }}
          />
        </div>

        {/* Vehicle Info */}
        <div className={`mt-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          <p className="text-sm font-medium">
            {registration ? `Vehicle: ${registration}` : `Stock ID: ${stockId}`}
          </p>
          <p className="text-xs mt-1">
            Scan to upload photos & documents
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadQRCode}
            className={`${
              isDarkMode 
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className={`${
              isDarkMode 
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy URL
          </Button>
        </div>

        {/* URL Display */}
        <div className={`mt-4 p-3 rounded-lg text-xs font-mono break-all ${
          isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
        }`}>
          {uploadUrl}
        </div>
      </div>
    </div>
  );
}
