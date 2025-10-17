"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Download, 
  Image as ImageIcon, 
  FileText, 
  Camera,
  Car,
  Home,
  Settings,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import SimplifiedVehicleBrochurePDFDocument from './SimplifiedVehicleBrochurePDFDocument';
import { useImageProcessor } from '@/hooks/useImageProcessor';

interface BrochureDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockData: any;
}

export default function BrochureDownloadModal({ 
  isOpen, 
  onClose, 
  stockData 
}: BrochureDownloadModalProps) {
  const { isDarkMode } = useTheme();
  const [photoFilter, setPhotoFilter] = useState<'all' | 'exterior' | 'interior'>('all');
  const [includeFeatures, setIncludeFeatures] = useState(true);
  const [shouldAutoDownload, setShouldAutoDownload] = useState(false);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const media = stockData?.media || {};
  const images = media.images || [];
  const vehicle = stockData?.vehicle || {};
  const features = stockData?.features || [];
  
  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';
  const registration = vehicle.registration || vehicle.plate || 'N/A';

  // Use the image processor hook
  const { 
    processedImages, 
    companyInfo,
    isProcessing, 
    isReady, 
    processImages,
    filteredImages,
    cleanup
  } = useImageProcessor(images, photoFilter);

  // Auto-download when images are ready and user initiated download
  useEffect(() => {
    if (shouldAutoDownload && isReady && processedImages.length > 0 && downloadLinkRef.current) {
      console.log('🚀 Auto-downloading PDF...');
      // Small delay to ensure PDF is fully rendered
      setTimeout(() => {
        downloadLinkRef.current?.click();
        setShouldAutoDownload(false);
      }, 500);
    }
  }, [shouldAutoDownload, isReady, processedImages.length]);

  // Handle modal close with cleanup
  const handleClose = () => {
    cleanup(); // Cancel any ongoing processing
    setShouldAutoDownload(false);
    onClose();
  };

  // Get counts for each filter (excluding promotional images)
  const getNonPromotionalImages = (images: any[]) => {
    return images.filter(image => {
      const classification = image.classificationTags?.[0]?.label?.toLowerCase() || '';
      const isPromotional = classification.includes('promotional') || 
                           classification.includes('promo') || 
                           classification.includes('branding') || 
                           classification.includes('dealer') || 
                           classification.includes('logo') ||
                           classification.includes('default') ||
                           classification.includes('fallback');
      return !isPromotional;
    });
  };

  const nonPromotionalImages = getNonPromotionalImages(images);
  const allCount = nonPromotionalImages.length;
  
  const exteriorCount = nonPromotionalImages.filter((image: any) => {
    const classificationTag = image.classificationTags?.[0];
    const label = classificationTag?.label?.toLowerCase() || '';
    const category = classificationTag?.category?.toLowerCase() || '';
    
    // ONLY include images with category "Exterior" but exclude wheels
    const isWheel = label.includes('wheel');
    const isExterior = category === 'exterior';
    
    return isExterior && !isWheel;
  }).length;
  
  const interiorCount = nonPromotionalImages.filter((image: any) => {
    const classification = image.classificationTags?.[0]?.label?.toLowerCase() || '';
    return classification.includes('interior') || 
           classification.includes('dashboard') || 
           classification.includes('seat') ||
           classification.includes('cabin');
  }).length;

  const handleDownloadStart = async () => {
    if (isProcessing) return; // Prevent multiple clicks
    setShouldAutoDownload(true); // Flag for auto-download after processing
    await processImages();
  };

  const generateFileName = () => {
    const make = vehicle.make || '';
    const model = vehicle.model || '';
    const reg = registration !== 'N/A' ? registration : '';
    const date = new Date().toISOString().split('T')[0];
    
    return `${make}_${model}_${reg}_brochure_${date}.pdf`.replace(/\s+/g, '_').toLowerCase();
  };

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`max-w-md ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Download className="h-5 w-5 text-blue-600" />
              Download Brochure
            </DialogTitle>
          </DialogHeader>

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 rounded-lg">
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} max-w-xs mx-4 text-center shadow-2xl`}>
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-600" />
                <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Processing Images
                </h3>
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Converting {filteredImages.length} images...
                </p>
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Please wait, this ensures optimal PDF quality
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
           {/* Photo Filter Options - Compact */}
           <div className="space-y-3">
             <Label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
               Photo Selection
             </Label>
             <RadioGroup value={photoFilter} onValueChange={(value: 'all' | 'exterior' | 'interior') => setPhotoFilter(value)}>
               <div className="grid grid-cols-3 gap-2">
                 <div className={`p-3 rounded border cursor-pointer transition-colors ${
                   photoFilter === 'all' 
                     ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                     : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                 }`}>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="all" id="all" />
                     <Label htmlFor="all" className="cursor-pointer text-xs">
                       <div className="text-center">
                         <ImageIcon className="h-4 w-4 mx-auto mb-1" />
                         <div className="font-medium">All</div>
                         <div className="text-xs text-gray-500">{allCount}</div>
                       </div>
                     </Label>
                   </div>
                 </div>
 
                 <div className={`p-3 rounded border cursor-pointer transition-colors ${
                   photoFilter === 'exterior' 
                     ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                     : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                 }`}>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="exterior" id="exterior" />
                     <Label htmlFor="exterior" className="cursor-pointer text-xs">
                       <div className="text-center">
                         <Car className="h-4 w-4 mx-auto mb-1 text-green-600" />
                         <div className="font-medium">Exterior</div>
                         <div className="text-xs text-gray-500">{exteriorCount}</div>
                       </div>
                     </Label>
                   </div>
                 </div>
 
                 <div className={`p-3 rounded border cursor-pointer transition-colors ${
                   photoFilter === 'interior' 
                     ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                     : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                 }`}>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="interior" id="interior" />
                     <Label htmlFor="interior" className="cursor-pointer text-xs">
                       <div className="text-center">
                         <Home className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                         <div className="font-medium">Interior</div>
                         <div className="text-xs text-gray-500">{interiorCount}</div>
                       </div>
                     </Label>
                   </div>
                 </div>
               </div>
             </RadioGroup>
           </div>
 
           {/* Features Toggle - Compact */}
           <div className="flex items-center space-x-2">
             <Checkbox 
               id="features" 
               checked={includeFeatures}
               onCheckedChange={(checked) => setIncludeFeatures(checked === true)}
             />
             <Label htmlFor="features" className={`text-sm cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
               Include features ({features.length} available)
             </Label>
           </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            
            {filteredImages.length > 0 ? (
              <>
                {isReady && processedImages.length > 0 ? (
                  <PDFDownloadLink
                    document={
                      <SimplifiedVehicleBrochurePDFDocument
                        stockData={stockData}
                        processedImages={processedImages}
                        includeFeatures={includeFeatures}
                        photoFilter={photoFilter}
                        companyInfo={companyInfo}
                      />
                    }
                    fileName={generateFileName()}
                    className="flex-1"
                  >
                    {({ loading, url }) => (
                      <a
                        ref={downloadLinkRef}
                        href={url || '#'}
                        download={generateFileName()}
                        style={{ display: 'none' }}
                      >
                        Hidden Download Link
                      </a>
                    )}
                  </PDFDownloadLink>
                ) : null}
                
                <Button 
                  className="flex-1"
                  onClick={handleDownloadStart}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {shouldAutoDownload ? 'Processing & Downloading...' : 'Processing Images...'}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Brochure
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                className="flex-1"
                disabled
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                No Images Available
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
