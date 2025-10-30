"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Camera, Video, RotateCw, Maximize, Image, Eye, Download, Edit3 } from "lucide-react";
import DataGrid from "../shared/DataGrid";
import Link from "next/link";

interface GalleryTabProps {
  stockData: any;
  stockId?: string;
  downloadBrochure: (options: { stockData: any }) => Promise<void>;
  isBrochureGenerating: boolean;
}

export default function GalleryTab({ stockData, stockId, downloadBrochure, isBrochureGenerating }: GalleryTabProps) {
  const { isDarkMode } = useTheme();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const media = stockData.media || {};
  const images = media.images || [];
  const vehicle = stockData.vehicle || {};
  
  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

  const mediaInfoItems = [
    { label: 'Total Images', value: images.length },
    { label: 'Video Available', value: media.video?.href ? 'Yes' : 'No' },
    { label: 'Spin Available', value: media.spin?.href ? 'Yes' : 'No' },
  ];

  return (
    <div className="h-full">
      {images.length > 0 ? (
        <div className="h-full flex flex-col">
                  {/* Enhanced Section Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 lg:px-8 py-8 border-b ${
          isDarkMode 
            ? 'border-gray-700 bg-gradient-to-r from-gray-900/50 to-gray-800/30' 
            : 'border-gray-200 bg-gradient-to-r from-white to-gray-50/80'
        }`}>
            <div>
              <h2 className={`text-3xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Camera className="h-8 w-8 text-blue-600" />
                Image Gallery
              </h2>
              <p className={`text-sm mt-2 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                <span className="flex items-center gap-1">
                  <Image className="h-4 w-4" />
                  {images.length} image{images.length !== 1 ? 's' : ''} available
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  Viewing {selectedImageIndex + 1} of {images.length}
                </span>
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm" className={`transition-all duration-200 ${
                isDarkMode 
                  ? 'hover:bg-blue-900/30 hover:border-blue-500/50 hover:text-blue-300' 
                  : 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}>
                                  <Maximize className="h-4 w-4 mr-1" />
                  Fullscreen
              </Button>
              <Button variant="outline" size="sm" className={`transition-all duration-200 ${
                isDarkMode 
                  ? 'hover:bg-green-900/30 hover:border-green-500/50 hover:text-green-300' 
                  : 'hover:bg-green-50 hover:border-green-300 hover:text-green-700'
              }`} onClick={async () => {
                console.log('🖱️ Gallery brochure download button clicked');
                try {
                  await downloadBrochure({ stockData });
                } catch (error) {
                  console.error('❌ Error in gallery brochure download:', error);
                }
              }} disabled={isBrochureGenerating}>
                <Download className="h-4 w-4 mr-1" />
                {isBrochureGenerating ? 'Generating...' : 'Download Brochure'}
              </Button>
              {/* Edit Stock Button */}
              {stockId && (
                <Link href={`/mystock/edit/${stockId}`}>
                  <Button variant="outline" size="sm">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Main Gallery - Fixed Height Container */}
          <div className="flex-1 flex flex-col">
            {/* Enhanced Main Image Display */}
            <div className={`relative bg-gradient-to-br ${
              isDarkMode ? 'from-gray-900 to-black' : 'from-gray-100 to-gray-200'
            } rounded-xl mx-4 sm:mx-6 lg:mx-8 my-6 overflow-hidden shadow-2xl`} 
            style={{ height: 'calc(100vh - 400px)', minHeight: '400px', maxHeight: '600px' }}>
              <img
                src={images[selectedImageIndex]?.href?.replace('{resize}', 'w1920h1080') || '/placeholder-car.png'}
                alt={`${vehicleTitle} - Image ${selectedImageIndex + 1}`}
                className="w-full h-full object-contain transition-all duration-300 hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-car.png';
                }}
              />
              
              {/* Enhanced Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1)}
                    className={`absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full transition-all duration-200 hover:scale-110 shadow-lg ${
                      isDarkMode 
                        ? 'bg-gray-800/80 hover:bg-gray-700/90 text-white border border-gray-600' 
                        : 'bg-white/90 hover:bg-white text-gray-800 border border-gray-300'
                    } backdrop-blur-sm`}
                  >
                    <span className="text-xl">←</span>
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex(selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1)}
                    className={`absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full transition-all duration-200 hover:scale-110 shadow-lg ${
                      isDarkMode 
                        ? 'bg-gray-800/80 hover:bg-gray-700/90 text-white border border-gray-600' 
                        : 'bg-white/90 hover:bg-white text-gray-800 border border-gray-300'
                    } backdrop-blur-sm`}
                  >
                    <span className="text-xl">→</span>
                  </button>
                </>
              )}
              
              {/* Enhanced Image Label */}
              {images[selectedImageIndex]?.classificationTags?.[0]?.label && (
                <div className="absolute bottom-6 left-6">
                  <span className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg backdrop-blur-md ${
                    isDarkMode 
                      ? 'bg-gray-800/80 text-white border border-gray-600' 
                      : 'bg-white/90 text-gray-800 border border-gray-300'
                  }`}>
                    🏷️ {images[selectedImageIndex].classificationTags[0].label}
                  </span>
                </div>
              )}

              {/* Enhanced Image Counter */}
              <div className="absolute top-6 right-6">
                <span className={`flex items-center px-4 py-2 rounded-xl text-sm font-semibold shadow-lg backdrop-blur-md ${
                  isDarkMode 
                    ? 'bg-gray-800/80 text-white border border-gray-600' 
                    : 'bg-white/90 text-gray-800 border border-gray-300'
                }`}>
                  <Camera className="h-4 w-4 mr-1" />
                  {selectedImageIndex + 1} / {images.length}
                </span>
              </div>
            </div>

                      {/* Enhanced Thumbnails Section */}
          {images.length > 1 && (
            <div className={`px-6 sm:px-8 lg:px-10 py-8 border-t ${
              isDarkMode ? 'border-gray-700 bg-gradient-to-b from-gray-800 to-gray-800/80' : 'border-gray-200 bg-gradient-to-b from-gray-50 to-white'
            }`}>
              <div className="mb-6">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  🖼️ All Images ({images.length})
                </h3>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Click any thumbnail to view the full image
                </p>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-x-4 gap-y-4">
                {images.map((image: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-110 hover:rotate-1 group ${
                      selectedImageIndex === index
                        ? isDarkMode 
                          ? 'border-blue-400 shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/30' 
                          : 'border-blue-500 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/30'
                        : isDarkMode
                        ? 'border-gray-600 hover:border-gray-400' 
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={image.href?.replace('{resize}', 'w200h200') || '/placeholder-car.png'}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-car.png';
                      }}
                    />
                    {selectedImageIndex === index && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <span className="text-white font-bold text-xs bg-blue-500 px-2 py-1 rounded-full">
                          ✓
                        </span>
                      </div>
                    )}
                    <div className={`absolute bottom-1 right-1 text-xs font-bold px-1.5 py-0.5 rounded ${
                      isDarkMode ? 'bg-gray-800/80 text-white' : 'bg-white/80 text-gray-800'
                    }`}>
                      {index + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

                  {/* Enhanced Media Information Footer */}
        <div className={`px-4 sm:px-6 lg:px-8 py-6 border-t ${
          isDarkMode ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/90' : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'
        }`}>
            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium ${
                  isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  <Camera className="h-4 w-4 mr-1" />
                  {images.length} Photo{images.length !== 1 ? 's' : ''}
                </span>
                {media.video?.href && (
                  <span className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium ${
                    isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                  }`}>
                    <Video className="h-4 w-4 mr-1" />
                    Video Available
                  </span>
                )}
                {media.spin?.href && (
                  <span className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium ${
                    isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <RotateCw className="h-4 w-4 mr-1" />
                    360° View Available
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedImageIndex(0)}
                    disabled={selectedImageIndex === 0}
                    className={`transition-all duration-200 ${
                      selectedImageIndex === 0 
                        ? 'opacity-50 cursor-not-allowed' 
                        : isDarkMode 
                          ? 'hover:bg-gray-700/50' 
                          : 'hover:bg-gray-100'
                    }`}
                  >
                    ⏮️ First
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedImageIndex(images.length - 1)}
                    disabled={selectedImageIndex === images.length - 1}
                    className={`transition-all duration-200 ${
                      selectedImageIndex === images.length - 1 
                        ? 'opacity-50 cursor-not-allowed' 
                        : isDarkMode 
                          ? 'hover:bg-gray-700/50' 
                          : 'hover:bg-gray-100'
                    }`}
                  >
                    Last ⏭️
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <Image className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">No Images Available</h3>
            <p className="text-gray-500 dark:text-white max-w-md">
              No images have been uploaded for this vehicle yet. Images will appear here once they are available.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}