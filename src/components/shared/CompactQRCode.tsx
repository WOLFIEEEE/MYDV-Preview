"use client";

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface CompactQRCodeProps {
  stockId: string;
  registration?: string;
  vehicleTitle?: string;
  className?: string;
}

export default function CompactQRCode({ 
  stockId, 
  registration, 
  vehicleTitle,
  className = "" 
}: CompactQRCodeProps) {
  const { isDarkMode } = useTheme();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Generate the upload URL
  const uploadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/qr-upload/${stockId}`;

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(uploadUrl, {
          width: 80,
          margin: 1,
          color: {
            dark: isDarkMode ? '#ffffff' : '#000000',
            light: isDarkMode ? '#1e293b' : '#ffffff'
          },
          errorCorrectionLevel: 'M'
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };
    generateQRCode();
  }, [stockId, isDarkMode, uploadUrl]);

  return (
    <Card className={`${className} ${
      isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <CardContent className="p-3">
        {/* Horizontal Layout - QR Code and Details Side by Side */}
        <div className="flex items-center gap-3">
          {/* QR Code - Left Side */}
          {qrCodeDataUrl && (
            <div className="flex-shrink-0">
              <img 
                src={qrCodeDataUrl} 
                alt={`QR Code for ${registration || stockId}`}
                className="block rounded"
                style={{ width: '80px', height: '80px' }}
              />
            </div>
          )}

          {/* Details - Right Side */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <QrCode className={`h-3.5 w-3.5 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`} />
              <h3 className={`font-semibold text-xs ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Upload QR
              </h3>
            </div>

            {/* Compact Instructions */}
            <div className={`space-y-0.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <p className="text-xs leading-tight">
                Scan to upload photos & docs
              </p>
              <p className="text-xs leading-tight">
                Files auto-link to this vehicle
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
