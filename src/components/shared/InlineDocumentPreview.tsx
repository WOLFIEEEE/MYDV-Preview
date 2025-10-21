"use client";

import React, { useState } from 'react';
import { X, Download, Eye, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

interface InlineDocumentPreviewProps {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  height?: string;
}

export default function InlineDocumentPreview({ 
  fileUrl, 
  fileName, 
  onClose,
  showCloseButton = false,
  height = "400px"
}: InlineDocumentPreviewProps) {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Determine file type from URL or fileName
  const getFileType = (url: string, name?: string): 'pdf' | 'image' | 'unknown' => {
    const fileExtension = (name || url).toLowerCase().split('.').pop();
    
    if (fileExtension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension || '')) return 'image';
    
    // Check MIME type from URL if possible
    if (url.includes('pdf')) return 'pdf';
    if (url.includes('image') || url.includes('jpg') || url.includes('png')) return 'image';
    
    return 'unknown';
  };

  const fileType = getFileType(fileUrl, fileName);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'driving-license';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const renderFileContent = () => {
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <AlertCircle className={`w-12 h-12 ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
          <div className="text-center">
            <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Unable to Display File
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
              The file could not be loaded. You can still download it using the button below.
            </p>
          </div>
        </div>
      );
    }

    switch (fileType) {
      case 'pdf':
        return (
          <div className="w-full h-full relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-0 rounded-lg"
              title="PDF Viewer"
              onLoad={() => setIsLoading(false)}
              onError={() => handleImageError()}
            />
          </div>
        );

      case 'image':
        return (
          <div className="flex items-center justify-center h-full">
            {isLoading && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            )}
            <img
              src={fileUrl}
              alt={fileName || 'Driving License'}
              className={`max-w-full max-h-full object-contain rounded-lg shadow-lg ${
                isLoading ? 'hidden' : 'block'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <FileText className={`w-12 h-12 ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                File Preview Not Available
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                This file type cannot be previewed in the browser. Please download it to view.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`relative w-full rounded-lg border overflow-hidden ${
      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`} style={{ height }}>
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${
        isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
      }`}>
        <div className="flex items-center space-x-2">
          {fileType === 'pdf' ? (
            <FileText className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
          ) : fileType === 'image' ? (
            <ImageIcon className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
          ) : (
            <Eye className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
          )}
          <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {fileName || 'Driving License'}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className={`h-7 px-2 text-xs ${
              isDarkMode 
                ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300 border-blue-800/50'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 border-blue-200'
            }`}
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          
          {showCloseButton && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`h-7 w-7 p-0 ${
                isDarkMode 
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-300'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-700'
              }`}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-hidden ${
        isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50/30'
      }`} style={{ height: `calc(${height} - 60px)` }}>
        {renderFileContent()}
      </div>
    </div>
  );
}
