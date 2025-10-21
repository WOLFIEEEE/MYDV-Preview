"use client";

import React, { useState } from 'react';
import { X, Download, Eye, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface FileViewerProps {
  fileUrl: string;
  fileName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FileViewer({ fileUrl, fileName, isOpen, onClose }: FileViewerProps) {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!isOpen) return null;

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
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertCircle className={`w-16 h-16 ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
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
          <div className="w-full h-full min-h-[600px] relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full min-h-[600px] border-0 rounded-lg"
              title="PDF Viewer"
              onLoad={() => setIsLoading(false)}
              onError={() => handleImageError()}
            />
          </div>
        );

      case 'image':
        return (
          <div className="flex items-center justify-center p-4">
            {isLoading && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            )}
            <img
              src={fileUrl}
              alt={fileName || 'Driving License'}
              className={`max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg ${
                isLoading ? 'hidden' : 'block'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <FileText className={`w-16 h-16 ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-6xl h-full max-h-[90vh] mx-4 rounded-xl shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <div className="flex items-center space-x-3">
            {fileType === 'pdf' ? (
              <FileText className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
            ) : fileType === 'image' ? (
              <ImageIcon className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
            ) : (
              <Eye className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
            )}
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {fileName || 'Driving License'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300 border border-blue-800/50'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 border border-blue-200'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-300'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-auto ${
          isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50/30'
        }`}>
          {renderFileContent()}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${
          isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
              File Type: {fileType.toUpperCase()} • 
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`ml-1 hover:underline ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Open in New Tab
              </a>
            </div>
            
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-800'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
