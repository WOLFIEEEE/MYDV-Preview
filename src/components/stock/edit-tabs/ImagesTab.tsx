"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  uploadMultipleImages, 
  updateStockImages, 
  extractImageIdsFromStock,
  validateImageFiles,
  type ImageUploadResult,
  type BatchImageUploadResult,
  type StockImageUpdateResult
} from "@/lib/imageManagement";
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Trash2, 
  RotateCw,
  Download,
  Eye,
  Plus,
  Edit3,
  Save,
  RotateCcw,
  Crop,
  Sun,
  Contrast,
  Palette,
  Check,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Grid2X2,
  LayoutGrid,
  Square,
  Star,
  Crown,
  GripVertical,
  Move,
  ImagePlus
} from "lucide-react";
import { ImageEditorDialog } from './ImageEditorDialog';

interface ImageEdits {
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  scale: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}



interface CurrentImage {
  id: string;
  url: string;
  name: string;
  size: string;
  order: number;
  isPrimary?: boolean;
  isNew?: boolean; // To distinguish newly uploaded images
  originalImageId?: string; // For tracking original image IDs
  edits?: ImageEdits; // For newly uploaded images that can be edited
  edited?: boolean; // Track if image has been edited
}

interface ImagesTabProps {
  stockData: any;
  stockId?: string;
  advertiserId?: string;
}

type GridSize = 'small' | 'medium' | 'large' | 'extra-large';

interface GridConfig {
  size: GridSize;
  label: string;
  cols: string;
  itemHeight: string;
  icon: React.ReactNode;
}

// Helper function to process image edits (rotation, cropping, filters)
async function processImageEdits(imageUrl: string, edits: ImageEdits): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate canvas size based on rotation
        const angle = (edits.rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));
        
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        // Calculate rotated dimensions
        const rotatedWidth = originalWidth * cos + originalHeight * sin;
        const rotatedHeight = originalWidth * sin + originalHeight * cos;
        
        // Apply scale
        const scale = edits.scale / 100;
        canvas.width = rotatedWidth * scale;
        canvas.height = rotatedHeight * scale;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply filters
        ctx.filter = `brightness(${edits.brightness}%) contrast(${edits.contrast}%) saturate(${edits.saturation}%)`;
        
        // Move to center for rotation
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Apply rotation
        ctx.rotate(angle);
        
        // Apply scale
        ctx.scale(scale, scale);
        
        // Calculate crop dimensions
        const cropX = (edits.cropX / 100) * originalWidth;
        const cropY = (edits.cropY / 100) * originalHeight;
        const cropWidth = (edits.cropWidth / 100) * originalWidth;
        const cropHeight = (edits.cropHeight / 100) * originalHeight;
        
        // Draw the image with cropping
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight, // Source crop
          -cropWidth / 2, -cropHeight / 2, cropWidth, cropHeight // Destination
        );
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('✅ Image processing complete:', {
              originalSize: `${originalWidth}x${originalHeight}`,
              processedSize: `${canvas.width}x${canvas.height}`,
              edits
            });
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/jpeg', 0.9);
        
      } catch (error) {
        console.error('Error processing image:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for processing'));
    };
    
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
  });
}

export default function ImagesTab({ stockData, stockId, advertiserId }: ImagesTabProps) {
  const { isDarkMode } = useTheme();
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [showDeletedPreview, setShowDeletedPreview] = useState(false);
  const [currentImages, setCurrentImages] = useState<CurrentImage[]>([]);
  const [gridSize, setGridSize] = useState<GridSize>('medium');
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [viewingImage, setViewingImage] = useState<CurrentImage | null>(null);
  const [newlyUploadedImages, setNewlyUploadedImages] = useState<CurrentImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<CurrentImage | null>(null);
  const [uploadProgressTotal, setUploadProgressTotal] = useState(0);
  const [uploadProgressCurrent, setUploadProgressCurrent] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gridConfigs: GridConfig[] = [
    {
      size: 'small',
      label: 'Small',
      cols: 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10',
      itemHeight: 'h-20',
      icon: <Grid3X3 className="w-4 h-4" />
    },
    {
      size: 'medium',
      label: 'Medium',
      cols: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
      itemHeight: 'h-24',
      icon: <Grid2X2 className="w-4 h-4" />
    },
    {
      size: 'large',
      label: 'Large',
      cols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
      itemHeight: 'h-32',
      icon: <LayoutGrid className="w-4 h-4" />
    },
    {
      size: 'extra-large',
      label: 'Extra Large',
      cols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      itemHeight: 'h-40',
      icon: <Square className="w-4 h-4" />
    }
  ];

  const currentGridConfig = gridConfigs.find(config => config.size === gridSize) || gridConfigs[1];

  // Helper function to process AutoTrader image URLs
  const processImageUrl = (url: string): string => {
    if (!url) return '';
    
    // Handle AutoTrader URLs with {resize} placeholder
    if (url.includes('{resize}')) {
      // Use the working AutoTrader format: w200h200 (as shown in your example)
      return url.replace('{resize}', 'w200h200');
    }
    
    return url;
  };

  // Load current images from stock data
  useEffect(() => {
    if (stockData?.media?.images && Array.isArray(stockData.media.images)) {
      const imageList = stockData.media.images
        .filter((img: any) => img && img.href) // Filter out invalid images
        .map((img: any, index: number) => {
          const processedUrl = processImageUrl(img.href);
          
          return {
            id: img.imageId || img.id || `current-${index}`,
            url: processedUrl,
            name: `Vehicle Image ${index + 1}`,
            size: '2.1 MB', // Mock size
            order: index,
            isPrimary: index === 0
          };
        });
      setCurrentImages(imageList);
    }
  }, [stockData]);

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedImage(imageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedImage) return;

    // Combine and filter all images (both current and new)
    const allImages = [...currentImages, ...newlyUploadedImages]
      .filter(img => !deletedImages.includes(img.id))
      .sort((a, b) => a.order - b.order);
    
    const draggedIndex = allImages.findIndex(img => img.id === draggedImage);
    
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedImage(null);
      setDragOverIndex(null);
      return;
    }

    // Create reordered array
    const reorderedImages = [...allImages];
    const draggedImageObj = reorderedImages[draggedIndex];
    
    // Remove from old position and insert at new position
    reorderedImages.splice(draggedIndex, 1);
    reorderedImages.splice(dropIndex, 0, draggedImageObj);
    
    // Update order and primary status for all images
    const updatedImages = reorderedImages.map((img, index) => ({
      ...img,
      order: index,
      isPrimary: index === 0
    }));

    // Separate back into current and new images arrays
    const updatedCurrentImages = updatedImages.filter(img => !img.isNew);
    const updatedNewImages = updatedImages.filter(img => img.isNew);

    setCurrentImages(updatedCurrentImages);
    setNewlyUploadedImages(updatedNewImages);
    setDraggedImage(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedImage(null);
    setDragOverIndex(null);
  };

  const moveImageToFirst = (imageId: string) => {
    const allImages = [...currentImages, ...newlyUploadedImages];
    const imageIndex = allImages.findIndex(img => img.id === imageId);
    if (imageIndex <= 0) return;

    const newImages = [...allImages];
    const imageObj = newImages[imageIndex];
    
    // Remove from current position
    newImages.splice(imageIndex, 1);
    // Insert at beginning
    newImages.unshift(imageObj);
    
    // Update order and primary status
    const updatedImages = newImages.map((img, index) => ({
      ...img,
      order: index,
      isPrimary: index === 0
    }));

    // Separate back into current and newly uploaded
    const existingImages = updatedImages.filter(img => !img.isNew);
    const newImages_uploaded = updatedImages.filter(img => img.isNew);
    
    setCurrentImages(existingImages);
    setNewlyUploadedImages(newImages_uploaded);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate files first
    const { valid, invalid } = validateImageFiles(files);
    
    if (invalid.length > 0) {
      setUploadErrors(invalid.map(({ file, error }) => `${file.name}: ${error}`));
      // Still process valid files if any
    } else {
      setUploadErrors([]);
    }
    
    valid.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const allCurrentImages = [...currentImages, ...newlyUploadedImages];
        const newOrder = allCurrentImages.length + index;
        
        const newImage: CurrentImage = {
          id: Math.random().toString(36).substr(2, 9),
          url: e.target?.result as string,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          order: newOrder,
          isPrimary: allCurrentImages.length === 0 && index === 0, // First image overall is primary
          isNew: true,
          originalImageId: undefined, // Will be set when uploaded to API
          edited: false,
          edits: {
            rotation: 0,
            brightness: 100,
            contrast: 100,
            saturation: 100,
            scale: 100,
            cropX: 0,
            cropY: 0,
            cropWidth: 100,
            cropHeight: 100
          }
        };
        
        setNewlyUploadedImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };



  const deleteCurrentImage = (imageId: string) => {
    setDeletedImages(prev => [...prev, imageId]);
  };

  const restoreDeletedImage = (imageId: string) => {
    setDeletedImages(prev => prev.filter(id => id !== imageId));
  };

  const getDeletedImageById = (imageId: string) => {
    return currentImages.find(img => img.id === imageId);
  };

  const removeNewImage = (imageId: string) => {
    setNewlyUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const updateImageEdits = (imageId: string, edits: Partial<ImageEdits>) => {
    setNewlyUploadedImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              edited: true,
              edits: { ...img.edits!, ...edits }
            }
          : img
      )
    );
  };

  const resetImageEdits = (imageId: string) => {
    setNewlyUploadedImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              edited: false,
              edits: {
                rotation: 0,
                brightness: 100,
                contrast: 100,
                saturation: 100,
                scale: 100,
                cropX: 0,
                cropY: 0,
                cropWidth: 100,
                cropHeight: 100
              }
            }
          : img
      )
    );
  };

  const getImageStyle = (edits: ImageEdits) => {
    return {
      transform: `rotate(${edits.rotation}deg) scale(${edits.scale / 100})`,
      filter: `brightness(${edits.brightness}%) contrast(${edits.contrast}%) saturate(${edits.saturation}%)`,
      clipPath: `inset(${edits.cropY}% ${100 - edits.cropX - edits.cropWidth}% ${100 - edits.cropY - edits.cropHeight}% ${edits.cropX}%)`
    };
  };

  const openImageEditor = (image: CurrentImage) => {
    setImageToEdit(image);
    setImageEditorOpen(true);
  };

  const handleImageEditorSave = (editedImageData: any) => {
    if (!imageToEdit) return;

    // Create a new image object with the edited data
    const editedImage: CurrentImage = {
      ...imageToEdit,
      url: editedImageData.url,
      name: `${editedImageData.originalName}_edited`,
      edited: true,
      isNew: true,
      edits: {
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        scale: 100,
        cropX: 0,
        cropY: 0,
        cropWidth: 100,
        cropHeight: 100
      }
    };

    // Replace the original image with the edited version
    if (imageToEdit.isNew) {
      // If it's a newly uploaded image, replace it in newlyUploadedImages
      console.log('🔄 Replacing newly uploaded image with edited version:', imageToEdit.id);
      setNewlyUploadedImages(prev => 
        prev.map(img => img.id === imageToEdit.id ? editedImage : img)
      );
    } else {
      // If it's an existing image, mark the original as deleted and add the edited version
      console.log('🔄 Marking existing image as deleted and adding edited version:', imageToEdit.id);
      setDeletedImages(prev => [...prev, imageToEdit.id]);
      setNewlyUploadedImages(prev => [...prev, editedImage]);
    }
  };

  const handleSaveImages = async () => {
    // Validation
    if (!stockId || !advertiserId) {
      setUploadErrors(['Stock ID and Advertiser ID are required for saving images']);
      return;
    }

    setIsSaving(true);
    setUploadErrors([]);
    setSaveSuccess(false);
    setUploadStatus('Preparing to save images...');
    
    try {
      // 1. Get all images in the user's desired order (existing + new, excluding deleted)
      const allImagesInOrder = [...currentImages, ...newlyUploadedImages]
        .filter(img => !deletedImages.includes(img.id))
        .sort((a, b) => a.order - b.order);
      
      console.log('📋 Final image order:', allImagesInOrder.map(img => ({
        id: img.id,
        name: img.name,
        order: img.order,
        isNew: img.isNew,
        isPrimary: img.isPrimary
      })));
      
      // 2. Separate existing and new images while preserving order
      const existingImagesInOrder = allImagesInOrder.filter(img => !img.isNew);
      const newImagesInOrder = allImagesInOrder.filter(img => img.isNew);
      
      // 3. Process edited images and convert new images to File objects
      const processedNewImages: { file: File; originalImage: CurrentImage; orderIndex: number }[] = [];
      
      for (const newImage of newImagesInOrder) {
        try {
          let imageBlob: Blob;
          
          // Check if image has been edited and needs processing
          if (newImage.edited && newImage.edits) {
            console.log(`🎨 Processing edited image: ${newImage.name}`, newImage.edits);
            imageBlob = await processImageEdits(newImage.url, newImage.edits);
          } else {
            // Use original image
            const response = await fetch(newImage.url);
            imageBlob = await response.blob();
          }
          
          const file = new File([imageBlob], newImage.name, { type: imageBlob.type || 'image/jpeg' });
          const orderIndex = allImagesInOrder.findIndex(img => img.id === newImage.id);
          
          processedNewImages.push({
            file,
            originalImage: newImage,
            orderIndex
          });
          
        } catch (error) {
          console.error('Error processing image:', error);
          setUploadErrors(prev => [...prev, `Failed to process ${newImage.name}`]);
        }
      }
      
      if (processedNewImages.length === 0 && existingImagesInOrder.length === 0) {
        setUploadStatus('No images to save');
        return;
      }
      
      // 4. Upload new images if any
      const uploadResults: { imageId: string; orderIndex: number; originalImage: CurrentImage }[] = [];
      
      if (processedNewImages.length > 0) {
        setUploadStatus(`Uploading ${processedNewImages.length} new images...`);
        setUploadProgressTotal(processedNewImages.length);
        setUploadProgressCurrent(0);
        
        // Upload images one by one to maintain order mapping
        for (let i = 0; i < processedNewImages.length; i++) {
          const { file, originalImage, orderIndex } = processedNewImages[i];
          
          setUploadProgressCurrent(i + 1);
          setUploadStatus(`Uploading image ${i + 1}/${processedNewImages.length}: ${file.name}`);
          
          try {
            const uploadResult = await uploadMultipleImages(
              [file],
              advertiserId,
              '/api'
            );
            
            if (uploadResult.uploadedImages.length > 0 && uploadResult.uploadedImages[0].imageId) {
              uploadResults.push({
                imageId: uploadResult.uploadedImages[0].imageId,
                orderIndex,
                originalImage
              });
              console.log(`✅ Uploaded ${file.name} -> ${uploadResult.uploadedImages[0].imageId} at position ${orderIndex}`);
            } else {
              setUploadErrors(prev => [...prev, `Failed to upload ${file.name}: No image ID returned`]);
            }
            
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            setUploadErrors(prev => [...prev, `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`]);
          }
        }
        
        console.log('📸 Upload results:', uploadResults);
      }
      
      // 5. Build final image array in correct order
      const finalImageIds: string[] = [];
      const imageIdMap = new Map<number, string>();
      
      // Map existing images to their positions
      existingImagesInOrder.forEach(img => {
        const orderIndex = allImagesInOrder.findIndex(item => item.id === img.id);
        const imageId = img.originalImageId || img.id;
        imageIdMap.set(orderIndex, imageId);
      });
      
      // Map uploaded images to their positions
      uploadResults.forEach(({ imageId, orderIndex }) => {
        imageIdMap.set(orderIndex, imageId);
      });
      
      // Build final array in order
      for (let i = 0; i < allImagesInOrder.length; i++) {
        const imageId = imageIdMap.get(i);
        if (imageId) {
          finalImageIds.push(imageId);
        }
      }
      
      console.log('🎯 Final image IDs in order:', finalImageIds);
      console.log('👑 Primary image (first):', finalImageIds[0]);
      
      if (finalImageIds.length === 0) {
        setUploadStatus('No images to save to stock');
        return;
      }
      
      // 6. Update stock with all image IDs in correct order
      setUploadStatus(`Updating stock with ${finalImageIds.length} images in correct order...`);
      
      // Use the updateStockImages function but pass the complete ordered array
      const updateResult = await updateStockImages(
        stockId,
        advertiserId,
        finalImageIds, // Pass all images as "new" to ensure correct order
        [], // No separate existing images since we're managing order ourselves
        '/api'
      );
      
      if (updateResult.success) {
        // 7. Update local state after successful save
        const updatedImages = allImagesInOrder.map((img, index) => {
          const isNewImage = img.isNew;
          const uploadResult = uploadResults.find(result => result.originalImage.id === img.id);
          
          return {
            ...img,
            originalImageId: isNewImage && uploadResult ? uploadResult.imageId : (img.originalImageId || img.id),
            isNew: false, // No longer new after save
            order: index, // Ensure order is sequential
            isPrimary: index === 0 // First image is primary
          };
        });
        
        setCurrentImages(updatedImages);
      setNewlyUploadedImages([]);
      setDeletedImages([]);
        setSaveSuccess(true);
        setUploadStatus(`Successfully saved ${finalImageIds.length} images in correct order! Primary image: ${allImagesInOrder[0]?.name}`);
        
        console.log('✅ Images saved successfully with correct ordering');
        
      } else {
        setUploadErrors(prev => [...prev, updateResult.error || 'Failed to update stock']);
        setUploadStatus('Failed to update stock with images');
      }
      
    } catch (error) {
      console.error('❌ Error saving images:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadErrors(prev => [...prev, `Save failed: ${errorMessage}`]);
      setUploadStatus('Save operation failed');
    } finally {
      setIsSaving(false);
      setUploadProgressTotal(0);
      setUploadProgressCurrent(0);
      
      // Clear status after a delay
      setTimeout(() => {
        setUploadStatus('');
      }, 5000);
    }
  };

  // Image View Dialog Component
  const ImageViewDialog = ({ image, isOpen, onClose }: { image: CurrentImage | null, isOpen: boolean, onClose: () => void }) => {
    if (!isOpen || !image) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-10"
          >
            <X className="w-4 h-4" />
          </Button>
          
          {/* Image */}
          <div className="relative">
            <img
              src={image.url}
              alt={image.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black bg-opacity-50 text-white p-3 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{image.name}</h3>
                    <p className="text-sm opacity-75">{image.size}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {image.isPrimary && (
                      <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full flex items-center">
                        <Crown className="w-3 h-3 mr-1" />
                        Primary
                      </div>
                    )}
                    {image.isNew && (
                      <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                        <ImagePlus className="w-3 h-3 mr-1" />
                        New
                      </div>
                    )}
                    <span className="text-xs opacity-75">#{image.order + 1}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditingPanel = ({ imageId }: { imageId: string }) => {
    const image = newlyUploadedImages.find(img => img.id === imageId);
    if (!image || !image.edits) return null;

    return (
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mt-4`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Edit Image: {image.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Preview */}
          <div className="flex justify-center mb-4">
            <div className="relative w-80 h-60 border rounded-lg overflow-hidden bg-gray-100">
              <img
                src={image.url}
                alt="Preview"
                className="w-full h-full object-cover transition-all duration-300"
                style={getImageStyle(image.edits)}
              />
            </div>
          </div>

          {/* Editing Controls */}
          <div className="space-y-6">
            {/* Rotation and Scale Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Rotation
                </label>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateImageEdits(image.id, { rotation: image.edits!.rotation - 90 })}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} min-w-[40px] text-center`}>
                    {image.edits.rotation}°
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateImageEdits(image.id, { rotation: image.edits!.rotation + 90 })}
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Scale
                </label>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateImageEdits(image.id, { scale: Math.max(50, image.edits!.scale - 10) })}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} min-w-[40px] text-center`}>
                    {image.edits.scale}%
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateImageEdits(image.id, { scale: Math.min(200, image.edits!.scale + 10) })}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Crop Controls */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                <Crop className="w-4 h-4 inline mr-2" />
                Crop (X: {image.edits.cropX}%, Y: {image.edits.cropY}%, W: {image.edits.cropWidth}%, H: {image.edits.cropHeight}%)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                    X Position: {image.edits.cropX}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={100 - image.edits.cropWidth}
                    value={image.edits.cropX}
                    onChange={(e) => updateImageEdits(image.id, { cropX: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                    Y Position: {image.edits.cropY}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={100 - image.edits.cropHeight}
                    value={image.edits.cropY}
                    onChange={(e) => updateImageEdits(image.id, { cropY: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                    Width: {image.edits.cropWidth}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max={100 - image.edits.cropX}
                    value={image.edits.cropWidth}
                    onChange={(e) => updateImageEdits(image.id, { cropWidth: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                    Height: {image.edits.cropHeight}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max={100 - image.edits.cropY}
                    value={image.edits.cropHeight}
                    onChange={(e) => updateImageEdits(image.id, { cropHeight: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Color Adjustments */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  <Sun className="w-4 h-4 inline mr-2" />
                  Brightness: {image.edits.brightness}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={image.edits.brightness}
                  onChange={(e) => updateImageEdits(image.id, { brightness: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  <Contrast className="w-4 h-4 inline mr-2" />
                  Contrast: {image.edits.contrast}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={image.edits.contrast}
                  onChange={(e) => updateImageEdits(image.id, { contrast: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  <Palette className="w-4 h-4 inline mr-2" />
                  Saturation: {image.edits.saturation}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={image.edits.saturation}
                  onChange={(e) => updateImageEdits(image.id, { saturation: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => resetImageEdits(image.id)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditingImage(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setEditingImage(null)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Grid Size Controls */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Image View Settings
            </CardTitle>
            <div className="flex items-center space-x-2">
              {gridConfigs.map((config) => (
                <Button
                  key={config.size}
                  variant={gridSize === config.size ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGridSize(config.size)}
                  className="flex items-center space-x-1"
                >
                  {config.icon}
                  <span className="hidden sm:inline">{config.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Images */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Current Images ({currentImages.filter(img => !deletedImages.includes(img.id)).length})
            </CardTitle>
            <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Drag to reorder • First image is primary
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {[...currentImages, ...newlyUploadedImages].filter(img => !deletedImages.includes(img.id)).length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No images uploaded yet</p>
            </div>
          ) : (
            <div className={`grid ${currentGridConfig.cols} gap-3`}>
              {[...currentImages, ...newlyUploadedImages]
                .filter(img => !deletedImages.includes(img.id))
                .sort((a, b) => a.order - b.order)
                .map((image, index) => (
                  <div 
                    key={image.id} 
                    className={`relative group cursor-move transition-all duration-200 ${
                      draggedImage === image.id ? 'opacity-50 scale-95' : ''
                    } ${
                      dragOverIndex === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, image.id)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Badges - positioned to not interfere with drag handle */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col space-y-1 max-w-[calc(100%-5rem)]">
                      {image.isPrimary && (
                        <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full flex items-center shadow-lg">
                          <Crown className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Primary</span>
                        </div>
                      )}
                      {image.isNew && (
                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center shadow-lg">
                          <ImagePlus className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">New</span>
                        </div>
                      )}
                    </div>

                    {/* Drag Handle */}
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className={`p-1 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                        <GripVertical className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    <div className={`${currentGridConfig.itemHeight} bg-gray-100 rounded-lg overflow-hidden ${image.isNew ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={image.isNew && image.edits ? getImageStyle(image.edits) : undefined}
                        loading="lazy"
                      />
                    </div>

                    {/* Edit Indicator for new images - positioned at bottom left to not overlap */}
                    {image.isNew && image.edited && (
                      <div className="absolute bottom-2 left-2 z-10">
                        <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center shadow-lg">
                          <Edit3 className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Edited</span>
                        </div>
                      </div>
                    )}

                    {/* Hover Actions - Optimized for both 3 and 4 button layouts */}
                    <div className="absolute inset-0 bg-transparent transition-all duration-200 rounded-lg">
                      {/* Control buttons - dynamically sized based on number of buttons */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {(() => {
                          const buttons = [];
                          const hasEditButton = image.isNew;
                          const hasPrimaryButton = !image.isPrimary;
                          const buttonCount = 2 + (hasEditButton ? 1 : 0) + (hasPrimaryButton ? 1 : 0); // Eye + Delete + Edit? + Primary?
                          
                          // Dynamic spacing based on button count
                          const spacing = buttonCount === 4 ? "space-x-1" : "space-x-2";
                          const buttonSize = buttonCount === 4 ? "h-7 w-7" : "h-8 w-8";
                          const iconSize = buttonCount === 4 ? "w-3.5 h-3.5" : "w-4 h-4";
                          const padding = buttonCount === 4 ? "p-1.5" : "p-2";

                          return (
                            <div className={`flex ${spacing} bg-black bg-opacity-50 backdrop-blur-sm rounded-lg ${padding} shadow-xl`}>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingImage(image);
                                }}
                                className={`${buttonSize} p-0 bg-white/90 hover:bg-white border-0 shadow-md`}
                                title="View Image"
                              >
                                <Eye className={`${iconSize} text-gray-700`} />
                              </Button>
                              {hasEditButton && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openImageEditor(image);
                                  }}
                                  title="Edit Image"
                                  className={`${buttonSize} p-0 bg-white/90 hover:bg-white border-0 shadow-md`}
                                >
                                  <Edit3 className={`${iconSize} text-blue-600`} />
                                </Button>
                              )}
                              {hasPrimaryButton && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveImageToFirst(image.id);
                                  }}
                                  title="Make Primary"
                                  className={`${buttonSize} p-0 bg-white/90 hover:bg-white border-0 shadow-md`}
                                >
                                  <Star className={`${iconSize} text-yellow-600`} />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (image.isNew) {
                                    removeNewImage(image.id);
                                  } else {
                                    deleteCurrentImage(image.id);
                                  }
                                }}
                                className={`${buttonSize} p-0 bg-red-500/90 hover:bg-red-500 border-0 shadow-md`}
                                title="Delete Image"
                              >
                                <Trash2 className={`${iconSize} text-white`} />
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Image Info - with proper spacing and no overlap */}
                    <div className="mt-3 px-1">
                      <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-700'} leading-tight`}>
                        {image.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} truncate`}>
                          {image.size}
                        </p>
                        <div className="flex items-center space-x-2">
                          {image.isNew && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>
                              New
                            </span>
                          )}
                          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} flex-shrink-0`}>
                            #{image.order + 1}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Save Button and Status - Moved to bottom for better UX */}
          {(newlyUploadedImages.length > 0 || deletedImages.length > 0) && (
            <div className="mt-6 space-y-3">
              {/* Image Order Preview */}
              <div className={`text-xs p-3 rounded border ${
                isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                
              </div>

              {/* Upload Progress */}
              {isSaving && uploadProgressTotal > 0 && (
                <div className="space-y-2">
                  <Progress 
                    value={(uploadProgressCurrent / uploadProgressTotal) * 100} 
                    className="w-full"
                  />
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    {uploadStatus}
                  </p>
                </div>
              )}

              {/* Status Message */}
              {uploadStatus && !isSaving && (
                <div className={`text-sm p-3 rounded-lg ${
                  saveSuccess 
                    ? isDarkMode ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200'
                    : isDarkMode ? 'bg-blue-900/20 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {uploadStatus}
                </div>
              )}

              {/* Validation Errors */}
              {(!stockId || !advertiserId) && (
                <div className={`text-sm p-3 rounded-lg ${
                  isDarkMode ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  ⚠️ Stock ID and Advertiser ID are required to save images. Please ensure these are provided.
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleSaveImages}
                  disabled={isSaving || !stockId || !advertiserId}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                  size="lg"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                      Saving Images...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-3" />
                      Save Changes ({newlyUploadedImages.length} new, {deletedImages.length} deleted)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deleted Images Preview */}
      {deletedImages.length > 0 && (
        <Card className={`border-red-200 ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`text-lg ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
                Deleted Images ({deletedImages.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeletedPreview(!showDeletedPreview)}
              >
                {showDeletedPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </CardHeader>
          {showDeletedPreview && (
            <CardContent>
              <div className={`grid ${currentGridConfig.cols} gap-3`}>
                {deletedImages.map(imageId => {
                  const image = getDeletedImageById(imageId);
                  if (!image) return null;
                  return (
                    <div key={imageId} className="relative group">
                      <div className={`${currentGridConfig.itemHeight} bg-gray-100 rounded-lg overflow-hidden opacity-60`}>
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute inset-0 bg-red-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => restoreDeletedImage(imageId)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                      </div>
                      <div className="mt-2">
                        <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                          {image.name}
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-400'}`}>
                          {image.size}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Add New Images */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <CardTitle className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Add New Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Select Multiple Images
            </Button>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Supports JPEG, PNG, WebP files up to 10MB each. New images will appear in the main grid above.
            </p>
            
            {/* File Validation Errors */}
            {uploadErrors.length > 0 && (
              <div className={`mt-4 p-3 rounded-lg ${
                isDarkMode ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <h4 className="font-medium mb-2">⚠️ File Upload Issues:</h4>
                <ul className="text-sm space-y-1">
                  {uploadErrors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadErrors([])}
                  className="mt-2"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Errors
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Editing Panel */}
      {editingImage && (
        <EditingPanel imageId={editingImage} />
      )}

      {/* Image View Dialog */}
      <ImageViewDialog 
        image={viewingImage}
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
      />

      {/* Image Editor Dialog */}
      {imageEditorOpen && imageToEdit && (
        <ImageEditorDialog
          isOpen={imageEditorOpen}
          onClose={() => {
            setImageEditorOpen(false);
            setImageToEdit(null);
          }}
          imageUrl={imageToEdit.url}
          imageName={imageToEdit.name}
          onSave={handleImageEditorSave}
        />
      )}
    </div>
  );
}