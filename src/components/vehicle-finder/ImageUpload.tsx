"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Images, Upload, X, Eye, Edit, Trash2, GripVertical, ArrowUpDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ImageEditorDialog } from "@/components/stock/edit-tabs/ImageEditorDialog";

interface ImageUploadProps {
  onImagesChange?: (images: File[]) => void;
  maxImages?: number;
  maxSizePerImage?: number; // in MB
}

export default function ImageUpload({ 
  onImagesChange, 
  maxImages = 20, 
  maxSizePerImage = 20 
}: ImageUploadProps) {
  const { isDarkMode } = useTheme();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');
  const [editingImageName, setEditingImageName] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safety cleanup effect to prevent stuck dialogs
  useEffect(() => {
    // If dialog is supposed to be open but we don't have valid editing data, close it
    if (isEditorOpen && (editingImageIndex === null || !editingImageUrl || !editingImageName)) {
      console.warn('⚠️ Image editor in inconsistent state, closing...');
      closeImageEditor();
    }
  }, [isEditorOpen, editingImageIndex, editingImageUrl, editingImageName]);

  // Cleanup URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
    };
  }, []);

  // Reset editor state when images change externally
  useEffect(() => {
    if (isEditorOpen && editingImageIndex !== null) {
      if (editingImageIndex >= selectedImages.length) {
        console.warn('⚠️ Editing index out of bounds after image changes, closing editor');
        closeImageEditor();
      }
    }
  }, [selectedImages.length, isEditorOpen, editingImageIndex]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return;
      }

      // Validate file size
      if (file.size > maxSizePerImage * 1024 * 1024) {
        alert(`${file.name} is larger than ${maxSizePerImage}MB`);
        return;
      }

      // Check if we're not exceeding max images
      if (selectedImages.length + validFiles.length >= maxImages) {
        alert(`Maximum ${maxImages} images allowed`);
        return;
      }

      validFiles.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    });

    if (validFiles.length > 0) {
      const updatedImages = [...selectedImages, ...validFiles];
      const updatedPreviews = [...previewUrls, ...newPreviewUrls];
      
      setSelectedImages(updatedImages);
      setPreviewUrls(updatedPreviews);
      onImagesChange?.(updatedImages);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedImages(updatedImages);
    setPreviewUrls(updatedPreviews);
    onImagesChange?.(updatedImages);
  };

  const clearAllImages = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviewUrls([]);
    onImagesChange?.([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openImageEditor = (index: number) => {
    // Validate index bounds
    if (index < 0 || index >= selectedImages.length || index >= previewUrls.length) {
      console.error('Invalid image index for editing:', index);
      alert('Unable to open image editor. Please try again.');
      return;
    }

    // Validate that we have valid data
    if (!previewUrls[index] || !selectedImages[index]) {
      console.error('Missing image data for editing at index:', index);
      alert('Image data not available for editing. Please try again.');
      return;
    }

    // Close any existing editor first
    if (isEditorOpen) {
      closeImageEditor();
      // Small delay to ensure state is properly reset
      setTimeout(() => {
        setEditingImageIndex(index);
        setEditingImageUrl(previewUrls[index]);
        setEditingImageName(selectedImages[index].name);
        setIsEditorOpen(true);
      }, 100);
    } else {
      setEditingImageIndex(index);
      setEditingImageUrl(previewUrls[index]);
      setEditingImageName(selectedImages[index].name);
      setIsEditorOpen(true);
    }

    console.log('🖼️ Opening image editor for:', selectedImages[index].name);
  };

  const closeImageEditor = () => {
    console.log('🔒 Closing image editor');
    setIsEditorOpen(false);
    setEditingImageIndex(null);
    setEditingImageUrl('');
    setEditingImageName('');
  };

  const handleImageSave = async (editedImageData: any) => {
    if (editingImageIndex === null) {
      console.warn('No image selected for editing');
      return;
    }

    try {
      // Validate editedImageData
      if (!editedImageData || !editedImageData.blob || !editedImageData.url) {
        throw new Error('Invalid edited image data received');
      }

      // Convert blob to File with proper error handling
      const editedFile = new File([editedImageData.blob], editedImageData.originalName, {
        type: editedImageData.blob.type || 'image/jpeg',
        lastModified: Date.now(),
      });

      // Validate arrays are still in sync
      if (editingImageIndex >= selectedImages.length || editingImageIndex >= previewUrls.length) {
        throw new Error('Image index out of bounds');
      }

      // Update the selected images and preview URLs
      const updatedImages = [...selectedImages];
      const updatedPreviews = [...previewUrls];
      
      // Revoke old URL to prevent memory leaks
      if (previewUrls[editingImageIndex]) {
        URL.revokeObjectURL(previewUrls[editingImageIndex]);
      }
      
      // Update with edited image
      updatedImages[editingImageIndex] = editedFile;
      updatedPreviews[editingImageIndex] = editedImageData.url;
      
      // Update state in correct order
      setSelectedImages(updatedImages);
      setPreviewUrls(updatedPreviews);
      
      // Notify parent component
      onImagesChange?.(updatedImages);
      
      console.log('✅ Image edited successfully:', editedFile.name);
      
      // Note: Don't call closeImageEditor() here as the ImageEditorDialog will call onClose() automatically after onSave()
    } catch (error) {
      console.error('❌ Error saving edited image:', error);
      
      // More user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save edited image: ${errorMessage}. Please try again.`);
      
      // Don't close the editor on error, let user try again
    }
  };

  // Drag and drop reordering functions
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Required for Firefox
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleImageDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder the arrays
    const newImages = [...selectedImages];
    const newPreviews = [...previewUrls];
    
    // Remove the dragged items
    const draggedImage = newImages.splice(draggedIndex, 1)[0];
    const draggedPreview = newPreviews.splice(draggedIndex, 1)[0];
    
    // Insert at new position
    newImages.splice(dropIndex, 0, draggedImage);
    newPreviews.splice(dropIndex, 0, draggedPreview);
    
    setSelectedImages(newImages);
    setPreviewUrls(newPreviews);
    onImagesChange?.(newImages);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newImages = [...selectedImages];
    const newPreviews = [...previewUrls];
    
    // Remove the item from the original position
    const movedImage = newImages.splice(fromIndex, 1)[0];
    const movedPreview = newPreviews.splice(fromIndex, 1)[0];
    
    // Insert at new position
    newImages.splice(toIndex, 0, movedImage);
    newPreviews.splice(toIndex, 0, movedPreview);
    
    setSelectedImages(newImages);
    setPreviewUrls(newPreviews);
    onImagesChange?.(newImages);
  };

  const simulateUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    setIsUploading(false);
    alert('Images uploaded successfully!');
  };

  return (
    <>
    <Card className={`border shadow-lg rounded-xl ${
      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
            <Images className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Vehicle Images
          </h3>
        </div>
        
        <div className="space-y-4">
          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Upload images of the vehicle (max {maxSizePerImage}MB each, JPEG format, up to {maxImages} images)
            <br />
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              ✨ Click edit to add overlays • Drag images to reorder them as you prefer!
            </span>
          </p>
          
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : isDarkMode
                  ? 'border-slate-600 bg-slate-700/50'
                  : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
              }`}>
                <Upload className="w-6 h-6 text-gray-500" />
              </div>
              
              <div>
                <p className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Drop images here or click to browse
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Supports JPEG, PNG, WebP formats
                </p>
              </div>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="mx-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Images
              </Button>
            </div>
          </div>

          {/* Image Counter and Reorder Info */}
          {selectedImages.length > 0 && (
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-4 text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-600'
              }`}>
                <div className="flex items-center gap-2">
                  <Images className="w-4 h-4" />
                  <span>{selectedImages.length} images selected</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Drag to reorder</span>
                </div>
              </div>
              
              <Button
                onClick={clearAllImages}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          )}

          {/* Image Previews with Drag & Drop */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {previewUrls.map((url, index) => (
                <div 
                  key={index} 
                  className={`relative group cursor-move transition-all duration-200 ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  } ${
                    dragOverIndex === index ? 'scale-105 ring-2 ring-blue-500 ring-opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleImageDragStart(e, index)}
                  onDragOver={(e) => handleImageDragOver(e, index)}
                  onDragLeave={handleImageDragLeave}
                  onDrop={(e) => handleImageDrop(e, index)}
                  onDragEnd={handleImageDragEnd}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 relative">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Drag Handle */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className={`p-1 rounded ${
                        isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
                      } bg-opacity-90 shadow-sm`}>
                        <GripVertical className="w-3 h-3" />
                      </div>
                    </div>
                    
                    {/* Image Number Badge */}
                    <div className="absolute top-2 right-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
                      } bg-opacity-90 shadow-sm`}>
                        {index + 1}
                      </div>
                    </div>
                  </div>
                  
                  {/* Image Controls */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(url, '_blank')}
                      className="p-2"
                      title="View Image"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openImageEditor(index)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white"
                      title="Edit Image"
                      disabled={isEditorOpen}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(index)}
                      className="p-2"
                      title="Remove Image"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Image Info */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className={`text-xs px-2 py-1 rounded truncate ${
                      isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
                    } bg-opacity-90`}>
                      {selectedImages[index]?.name}
                    </div>
                  </div>
                  
                  {/* Quick Reorder Buttons */}
                  {selectedImages.length > 1 && (
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      {index > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => moveImage(index, index - 1)}
                          className="p-1 w-6 h-6"
                          title="Move Up"
                        >
                          <span className="text-xs">↑</span>
                        </Button>
                      )}
                      {index < selectedImages.length - 1 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => moveImage(index, index + 1)}
                          className="p-1 w-6 h-6"
                          title="Move Down"
                        >
                          <span className="text-xs">↓</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>
                  Uploading images...
                </span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Reordering Instructions */}
          {selectedImages.length > 1 && (
            <div className={`p-4 rounded-xl ${
              isDarkMode ? 'bg-slate-800/50' : 'bg-blue-50'
            } border ${isDarkMode ? 'border-slate-700' : 'border-blue-200'}`}>
              <h4 className={`font-semibold mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                📸 Image Ordering Tips:
              </h4>
              <ul className={`text-xs space-y-1 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                <li>• <strong>Drag & Drop:</strong> Click and drag any image to reorder them</li>
                <li>• <strong>Quick Buttons:</strong> Use ↑↓ arrows on hover for precise positioning</li>
                <li>• <strong>First Image:</strong> The first image will be the main display photo</li>
                <li>• <strong>Order Matters:</strong> Images will be uploaded in the order shown</li>
              </ul>
            </div>
          )}

          {/* Upload Button */}
          {selectedImages.length > 0 && !isUploading && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={simulateUpload}
                className="px-8"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''} in Order
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Image Editor Dialog */}
    {isEditorOpen && editingImageUrl && editingImageName && editingImageIndex !== null && (
      <ImageEditorDialog
        isOpen={isEditorOpen}
        onClose={closeImageEditor}
        imageUrl={editingImageUrl}
        imageName={editingImageName}
        onSave={handleImageSave}
      />
    )}
  </>
  );
}
