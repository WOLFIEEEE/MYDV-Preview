"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Square, Eye, EyeOff, ChevronUp, ChevronDown, Download, Undo, Redo, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, Copy, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';

// Custom CSS for better range sliders
const rangeSliderStyles = `
  .range-slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  
  .range-slider::-webkit-slider-track {
    background: #d1d5db;
    height: 8px;
    border-radius: 4px;
  }
  
  .range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    background: #3b82f6;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
  
  .range-slider::-moz-range-track {
    background: #d1d5db;
    height: 8px;
    border-radius: 4px;
    border: none;
  }
  
  .range-slider::-moz-range-thumb {
    background: #3b82f6;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }
  
  .range-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
  
  .dark .range-slider::-webkit-slider-track {
    background: #374151;
  }
  
  .dark .range-slider::-moz-range-track {
    background: #374151;
  }
`;

// Types for our editor
interface TemplateImage {
  id: string;
  name: string;
  fileName: string;
  url: string;
  type: string;
  category: string;
  description: string;
  tags: string[];
}

interface OverlayLayer {
  id: string;
  templateId: string;
  templateUrl: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  zIndex: number;
}

interface EditedImageData {
  blob: Blob;
  url: string;
  overlayLayers: OverlayLayer[];
  originalName: string;
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
}

interface ImageEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  onSave: (editedImageData: EditedImageData) => void;
}

export const ImageEditorDialog: React.FC<ImageEditorDialogProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  onSave
}) => {
  const { isDarkMode } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templates, setTemplates] = useState<TemplateImage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateImage | null>(null);
  const [overlayLayers, setOverlayLayers] = useState<OverlayLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateCategories, setTemplateCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<OverlayLayer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartData, setResizeStartData] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  
  // Performance optimization for smooth dragging/resizing
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<Partial<OverlayLayer> | null>(null);
  
  // Template upload states
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const templateUploadRef = useRef<HTMLInputElement>(null);
  
  // Image loading states
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  
  // Enhanced resize interaction states
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Fetch templates on component mount
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Load original image with fallback handling for AutoTrader images
  // Load image via server proxy to ensure CORS-free canvas operations
  const loadImageForEditing = async (url: string): Promise<HTMLImageElement> => {
    return new Promise(async (resolve, reject) => {
      try {
        // If already a blob URL, use it directly
        if (url.startsWith('blob:') || url.startsWith('data:')) {
          const img = new window.Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load blob image'));
          img.src = url;
          return;
        }

        // For external URLs, use server proxy
        console.log('🔄 Loading image via server proxy for CORS-free editing:', url.substring(0, 100) + '...');

        const response = await fetch('/api/proxy-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl: url }),
        });

        if (!response.ok) {
          throw new Error(`Server proxy failed: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const img = new window.Image();
        img.onload = () => {
          URL.revokeObjectURL(blobUrl); // Clean up
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl); // Clean up
          reject(new Error('Failed to load proxied image'));
        };
        img.src = blobUrl;

      } catch (error) {
        console.error('❌ Failed to load image for editing:', error);
        reject(error);
      }
    });
  };

  useEffect(() => {
    if (imageUrl && isOpen) {
      console.log('🖼️ Loading image in editor:', imageUrl.substring(0, 100) + '...');

      setIsLoadingImage(true);
      setImageLoadError(null);
      setOriginalImage(null);

      loadImageForEditing(imageUrl)
        .then((img) => {
          console.log('✅ Image loaded successfully in editor:', {
            dimensions: `${img.width}x${img.height}`,
            url: imageUrl.substring(0, 100) + '...',
            isExternal: !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')
          });
          setOriginalImage(img);
          setCanvasSize({ width: img.width, height: img.height });
          setIsLoadingImage(false);
          setImageLoadError(null);
        })
        .catch((error) => {
          console.error('❌ Failed to load image in editor:', error);
          setIsLoadingImage(false);
          setImageLoadError('Failed to load image for editing. The image may be from an external source.');
          setOriginalImage(null);
        });
    } else {
      setIsLoadingImage(false);
      setImageLoadError(null);
      setOriginalImage(null);
    }
  }, [imageUrl, isOpen]);


  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size only if it changed to prevent unnecessary redraws
    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw original image
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    // Draw overlay layers in order of z-index
    const sortedLayers = [...overlayLayers]
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    sortedLayers.forEach(layer => {
      const templateImg = new window.Image();
      templateImg.crossOrigin = 'anonymous';
      templateImg.onload = () => {
        ctx.save();
        
        // Set opacity
        ctx.globalAlpha = layer.opacity;
        
        // Translate to center point for rotation
        const centerX = layer.x + layer.width / 2;
        const centerY = layer.y + layer.height / 2;
        ctx.translate(centerX, centerY);
        
        // Rotate
        ctx.rotate((layer.rotation * Math.PI) / 180);
        
        // Draw template image
        ctx.drawImage(
          templateImg,
          -layer.width / 2,
          -layer.height / 2,
          layer.width,
          layer.height
        );
        
        ctx.restore();
      };
      templateImg.src = layer.templateUrl;
    });

    // Draw selection border and resize handles after all layers (outside the loop)
    const selectedLayerData = overlayLayers.find(l => l.id === selectedLayer);
    if (selectedLayerData && selectedLayerData.visible) {
      ctx.save();
      
      // Draw selection border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectedLayerData.x,
        selectedLayerData.y,
        selectedLayerData.width,
        selectedLayerData.height
      );
      ctx.setLineDash([]);
      
      // Draw resize handles with enhanced visibility - different sizes for corners vs edges
      const cornerHandleSize = 24; // Much larger corner handles for diagonal resize
      const edgeHandleSize = 18; // Larger edge handles for better visibility
      
      // Add a stronger shadow for better visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      
      // Define corner handles (diagonal resize) - make these much more prominent
      const cornerHandles = [
        { x: selectedLayerData.x - cornerHandleSize / 2, y: selectedLayerData.y - cornerHandleSize / 2, type: 'nw' },
        { x: selectedLayerData.x + selectedLayerData.width - cornerHandleSize / 2, y: selectedLayerData.y - cornerHandleSize / 2, type: 'ne' },
        { x: selectedLayerData.x - cornerHandleSize / 2, y: selectedLayerData.y + selectedLayerData.height - cornerHandleSize / 2, type: 'sw' },
        { x: selectedLayerData.x + selectedLayerData.width - cornerHandleSize / 2, y: selectedLayerData.y + selectedLayerData.height - cornerHandleSize / 2, type: 'se' }
      ];
      
      // Define edge handles (single-direction resize) - smaller and only show when hovered
      const edgeHandles = [
        { x: selectedLayerData.x + selectedLayerData.width / 2 - edgeHandleSize / 2, y: selectedLayerData.y - edgeHandleSize / 2, type: 'n' },
        { x: selectedLayerData.x + selectedLayerData.width - edgeHandleSize / 2, y: selectedLayerData.y + selectedLayerData.height / 2 - edgeHandleSize / 2, type: 'e' },
        { x: selectedLayerData.x + selectedLayerData.width / 2 - edgeHandleSize / 2, y: selectedLayerData.y + selectedLayerData.height - edgeHandleSize / 2, type: 's' },
        { x: selectedLayerData.x - edgeHandleSize / 2, y: selectedLayerData.y + selectedLayerData.height / 2 - edgeHandleSize / 2, type: 'w' }
      ];
      
      // Draw corner handles first (they're always visible and more prominent)
      cornerHandles.forEach(handle => {
        const isHovered = hoveredHandle === handle.type;
        const currentSize = isHovered ? cornerHandleSize + 8 : cornerHandleSize;
        const adjustedX = handle.x - (isHovered ? 4 : 0);
        const adjustedY = handle.y - (isHovered ? 4 : 0);
        
        // Special styling for corner handles - make them more distinctive
        if (isHovered) {
          ctx.fillStyle = '#dc2626'; // Red for hovered corners (more prominent)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
        } else {
          ctx.fillStyle = '#1d4ed8'; // Darker blue for corners (more prominent than edges)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
        }
        
        // Draw rounded rectangle with larger radius for corners
        const radius = 4;
        ctx.beginPath();
        ctx.roundRect(adjustedX, adjustedY, currentSize, currentSize, radius);
        ctx.fill();
        ctx.stroke();
        
        // Add diagonal resize indicator
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Draw small diagonal lines to indicate resize direction
        const centerX = adjustedX + currentSize / 2;
        const centerY = adjustedY + currentSize / 2;
        const lineLength = isHovered ? 6 : 4;
        
        if (handle.type === 'nw' || handle.type === 'se') {
          ctx.moveTo(centerX - lineLength, centerY - lineLength);
          ctx.lineTo(centerX + lineLength, centerY + lineLength);
        } else {
          ctx.moveTo(centerX - lineLength, centerY + lineLength);
          ctx.lineTo(centerX + lineLength, centerY - lineLength);
        }
        ctx.stroke();
      });
      
      // Draw edge handles only when hovered (cleaner interface)
      edgeHandles.forEach(handle => {
        const isHovered = hoveredHandle === handle.type;
        
        // Always draw edge handles for better usability
        {
          const currentSize = isHovered ? edgeHandleSize + 6 : edgeHandleSize;
          const adjustedX = isHovered ? handle.x - 3 : handle.x;
          const adjustedY = isHovered ? handle.y - 3 : handle.y;
          
          if (isHovered) {
            ctx.fillStyle = '#1d4ed8'; // Darker blue for hover
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
          } else {
            ctx.fillStyle = '#3b82f6'; // Lighter blue for normal state
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
          }
          
          // Draw rounded rectangle
          const radius = 2;
          ctx.beginPath();
          ctx.roundRect(adjustedX, adjustedY, currentSize, currentSize, radius);
          ctx.fill();
          ctx.stroke();
          
          // Add directional indicator for edge handles
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const centerX = adjustedX + currentSize / 2;
          const centerY = adjustedY + currentSize / 2;
          const lineLength = 4;
          
          if (handle.type === 'n' || handle.type === 's') {
            // Vertical line for north/south handles
            ctx.moveTo(centerX, centerY - lineLength);
            ctx.lineTo(centerX, centerY + lineLength);
          } else {
            // Horizontal line for east/west handles
            ctx.moveTo(centerX - lineLength, centerY);
            ctx.lineTo(centerX + lineLength, centerY);
          }
          ctx.stroke();
        }
      });
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.restore();
    }
  }, [originalImage, canvasSize, overlayLayers, selectedLayer, hoveredHandle]);

  // Redraw canvas when layers change
  useEffect(() => {
    if (originalImage) {
      redrawCanvas();
    }
  }, [overlayLayers, originalImage, selectedLayer, redrawCanvas]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch('/api/templates/images');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
        
        // Extract unique categories
        const categories = [...new Set(data.templates.map((t: TemplateImage) => t.category))];
        setTemplateCategories(['all', ...categories.filter(cat => typeof cat === 'string')]);
      } else {
        console.error('Failed to fetch templates:', data.message);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const addHistory = useCallback((layers: OverlayLayer[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(layers)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setOverlayLayers(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setOverlayLayers(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [historyIndex, history]);

  const updateSelectedLayer = useCallback((updates: Partial<OverlayLayer>) => {
    if (!selectedLayer) return;

    const newLayers = overlayLayers.map(layer =>
      layer.id === selectedLayer ? { ...layer, ...updates } : layer
    );
    setOverlayLayers(newLayers);
    addHistory(newLayers);
    }, [selectedLayer, overlayLayers, addHistory]);
  
  // Throttled update function for smooth dragging/resizing
  const updateSelectedLayerThrottled = useCallback((updates: Partial<OverlayLayer>) => {
    if (!selectedLayer) return;
    
    // Store the pending update
    pendingUpdateRef.current = { ...pendingUpdateRef.current, ...updates };
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Schedule update on next animation frame for smooth 60fps updates
    animationFrameRef.current = requestAnimationFrame(() => {
      const now = performance.now();
      
      // Throttle to ~60fps (16ms) for smooth performance
      if (now - lastUpdateTimeRef.current >= 16) {
        if (pendingUpdateRef.current) {
          updateSelectedLayer(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
          lastUpdateTimeRef.current = now;
        }
      } else {
        // Re-schedule if we're updating too frequently
        animationFrameRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            updateSelectedLayer(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
            lastUpdateTimeRef.current = performance.now();
          }
        });
      }
    });
  }, [selectedLayer, updateSelectedLayer]);
  
  const deleteLayer = useCallback((layerId: string) => {
    const newLayers = overlayLayers.filter(layer => layer.id !== layerId);
    setOverlayLayers(newLayers);
    setSelectedLayer(null);
    addHistory(newLayers);
  }, [overlayLayers, addHistory]);

  const duplicateLayer = useCallback((layerId: string) => {
    const layerToDuplicate = overlayLayers.find(layer => layer.id === layerId);
    if (!layerToDuplicate) return;

    const newLayer: OverlayLayer = {
      ...layerToDuplicate,
      id: `layer_${Date.now()}`,
      name: `${layerToDuplicate.name} Copy`,
      x: layerToDuplicate.x + 20,
      y: layerToDuplicate.y + 20,
      zIndex: Math.max(...overlayLayers.map(l => l.zIndex)) + 1
    };

    const newLayers = [...overlayLayers, newLayer];
    setOverlayLayers(newLayers);
    setSelectedLayer(newLayer.id);
    addHistory(newLayers);
  }, [overlayLayers, addHistory]);

  const exportEditedImage = useCallback((format: 'png' | 'jpeg' | 'webp' = 'png', quality: number = 1) => {
    if (!originalImage) return;

    const mimeType = `image/${format}`;
    
    console.log('📤 Exporting edited image:', {
      format,
      quality,
      overlayCount: overlayLayers.length,
      canvasSize: `${canvasSize.width}x${canvasSize.height}`
    });
    
    // Create a clean export canvas without resize handles or selection borders
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    
    if (!exportCtx) {
      console.error('❌ Could not get export canvas context');
      setImageLoadError('Failed to export edited image. Please try again.');
      return;
    }

    // Set canvas size
    exportCanvas.width = canvasSize.width;
    exportCanvas.height = canvasSize.height;

    // Clear canvas
    exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw original image
    exportCtx.drawImage(originalImage, 0, 0, canvasSize.width, canvasSize.height);

    // Draw overlay layers in order of z-index (without selection borders or handles)
    const sortedLayers = [...overlayLayers]
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    let loadedCount = 0;
    const totalLayers = sortedLayers.length;

    if (totalLayers === 0) {
      // No overlays, export immediately
      exportCanvas.toBlob((blob) => {
        if (blob) {
          console.log('✅ Image exported successfully:', {
            size: `${(blob.size / 1024).toFixed(2)} KB`,
            type: blob.type
          });
          
          const editedImageData: EditedImageData = {
            blob,
            url: URL.createObjectURL(blob),
            overlayLayers: overlayLayers,
            originalName: imageName,
            format,
            quality
          };
          onSave(editedImageData);
          onClose();
        } else {
          console.error('❌ Failed to create blob from canvas');
          setImageLoadError('Failed to export edited image. Please try again.');
        }
      }, mimeType, quality);
      return;
    }

    // Load and draw each overlay layer
    sortedLayers.forEach(layer => {
      const templateImg = new window.Image();
      templateImg.crossOrigin = 'anonymous';
      templateImg.onload = () => {
        exportCtx.save();
        
        // Set opacity
        exportCtx.globalAlpha = layer.opacity;
        
        // Translate to center point for rotation
        const centerX = layer.x + layer.width / 2;
        const centerY = layer.y + layer.height / 2;
        exportCtx.translate(centerX, centerY);
        
        // Rotate
        exportCtx.rotate((layer.rotation * Math.PI) / 180);
        
        // Draw template image
        exportCtx.drawImage(
          templateImg,
          -layer.width / 2,
          -layer.height / 2,
          layer.width,
          layer.height
        );
        
        exportCtx.restore();
        
        loadedCount++;
        
        // Export when all layers are loaded
        if (loadedCount === totalLayers) {
          exportCanvas.toBlob((blob) => {
            if (blob) {
              console.log('✅ Image exported successfully:', {
                size: `${(blob.size / 1024).toFixed(2)} KB`,
                type: blob.type,
                layersIncluded: totalLayers
              });
              
              const editedImageData: EditedImageData = {
                blob,
                url: URL.createObjectURL(blob),
                overlayLayers: overlayLayers,
                originalName: imageName,
                format,
                quality
              };
              onSave(editedImageData);
              onClose();
            } else {
              console.error('❌ Failed to create blob from canvas');
              setImageLoadError('Failed to export edited image. Please try again.');
            }
          }, mimeType, quality);
        }
      };
      
      templateImg.onerror = () => {
        console.error('❌ Failed to load template image for export:', layer.templateUrl);
        loadedCount++;
        
        // Continue export even if some layers fail
        if (loadedCount === totalLayers) {
          exportCanvas.toBlob((blob) => {
            if (blob) {
              console.log('✅ Image exported successfully (some layers failed):', {
                size: `${(blob.size / 1024).toFixed(2)} KB`,
                type: blob.type
              });
              
              const editedImageData: EditedImageData = {
                blob,
                url: URL.createObjectURL(blob),
                overlayLayers: overlayLayers,
                originalName: imageName,
                format,
                quality
              };
              onSave(editedImageData);
              onClose();
            } else {
              console.error('❌ Failed to create blob from canvas');
              setImageLoadError('Failed to export edited image. Please try again.');
            }
          }, mimeType, quality);
        }
      };
      
      templateImg.src = layer.templateUrl;
    });
  }, [originalImage, overlayLayers, canvasSize, imageName, onSave, onClose]);

  const addTemplateOverlay = (template: TemplateImage) => {
    // Load the template image to get its original dimensions
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('📐 Template image loaded:', {
        name: template.name,
        originalSize: `${img.width}x${img.height}`,
        aspectRatio: (img.width / img.height).toFixed(2)
      });

      // Calculate optimal size while maintaining aspect ratio
      const originalAspectRatio = img.width / img.height;
      
      // Set a more generous size (40% of canvas width or height, whichever is smaller)
      // Ensure overlays are visible and usable
      const maxSize = Math.min(canvasSize.width, canvasSize.height) * 0.40;
      
      // Also set a minimum size to ensure overlays are never too small
      const minSize = 150; // Minimum 150px for usability
      
      let overlayWidth, overlayHeight;
      
      // If the image is wider than it is tall
      if (originalAspectRatio > 1) {
        // Start with maxSize but ensure it's at least minSize
        overlayWidth = Math.max(Math.min(maxSize, img.width), minSize);
        overlayHeight = overlayWidth / originalAspectRatio;
        
        // If height becomes too small, adjust based on minimum height
        if (overlayHeight < minSize / 2) {
          overlayHeight = minSize / 2;
          overlayWidth = overlayHeight * originalAspectRatio;
        }
      } else {
        // If the image is taller than it is wide or square
        overlayHeight = Math.max(Math.min(maxSize, img.height), minSize);
        overlayWidth = overlayHeight * originalAspectRatio;
        
        // If width becomes too small, adjust based on minimum width
        if (overlayWidth < minSize / 2) {
          overlayWidth = minSize / 2;
          overlayHeight = overlayWidth / originalAspectRatio;
        }
      }

      // Center the overlay on the canvas
      const x = (canvasSize.width - overlayWidth) / 2;
      const y = (canvasSize.height - overlayHeight) / 2;

      const newLayer: OverlayLayer = {
        id: `layer_${Date.now()}`,
        templateId: template.id,
        templateUrl: template.url,
        name: template.name,
        x: x,
        y: y,
        width: overlayWidth,
        height: overlayHeight,
        rotation: 0,
        opacity: 1,
        visible: true,
        zIndex: overlayLayers.length
      };

      console.log('✅ Overlay added with preserved aspect ratio:', {
        name: template.name,
        originalSize: `${img.width}x${img.height}`,
        overlaySize: `${overlayWidth.toFixed(0)}x${overlayHeight.toFixed(0)}`,
        aspectRatioPreserved: Math.abs(originalAspectRatio - (overlayWidth / overlayHeight)) < 0.01,
        position: `${x.toFixed(0)}, ${y.toFixed(0)}`,
        maxSize: maxSize.toFixed(0),
        minSize: minSize,
        canvasSize: `${canvasSize.width}x${canvasSize.height}`
      });

      const newLayers = [...overlayLayers, newLayer];
      setOverlayLayers(newLayers);
      setSelectedLayer(newLayer.id);
      addHistory(newLayers);
    };

    img.onerror = () => {
      console.error('❌ Failed to load template image:', template.url);
      
      // Fallback to original behavior if image fails to load
      const newLayer: OverlayLayer = {
        id: `layer_${Date.now()}`,
        templateId: template.id,
        templateUrl: template.url,
        name: template.name,
        x: canvasSize.width * 0.1,
        y: canvasSize.height * 0.1,
        width: canvasSize.width * 0.3,
        height: canvasSize.height * 0.3,
        rotation: 0,
        opacity: 1,
        visible: true,
        zIndex: overlayLayers.length
      };

      const newLayers = [...overlayLayers, newLayer];
      setOverlayLayers(newLayers);
      setSelectedLayer(newLayer.id);
      addHistory(newLayers);
    };

    img.src = template.url;
  };

  // Add template overlay at original size (1:1 scale)
  const addTemplateOverlayOriginalSize = (template: TemplateImage) => {
    // Load the template image to get its original dimensions
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('📐 Template image loaded at original size:', {
        name: template.name,
        originalSize: `${img.width}x${img.height}`,
        aspectRatio: (img.width / img.height).toFixed(2)
      });

      // Use original dimensions (1:1 scale)
      const overlayWidth = img.width;
      const overlayHeight = img.height;

      // Center the overlay on the canvas
      const x = (canvasSize.width - overlayWidth) / 2;
      const y = (canvasSize.height - overlayHeight) / 2;

      const newLayer: OverlayLayer = {
        id: `layer_${Date.now()}`,
        templateId: template.id,
        templateUrl: template.url,
        name: `${template.name} (Original Size)`,
        x: x,
        y: y,
        width: overlayWidth,
        height: overlayHeight,
        rotation: 0,
        opacity: 1,
        visible: true,
        zIndex: overlayLayers.length
      };

      console.log('✅ Overlay added at original size:', {
        name: template.name,
        originalSize: `${img.width}x${img.height}`,
        overlaySize: `${overlayWidth}x${overlayHeight}`,
        scale: '1:1',
        position: `${x.toFixed(0)}, ${y.toFixed(0)}`
      });

      const newLayers = [...overlayLayers, newLayer];
      setOverlayLayers(newLayers);
      setSelectedLayer(newLayer.id);
      addHistory(newLayers);
    };

    img.onerror = () => {
      console.error('❌ Failed to load template image for original size:', template.url);
    };

    img.src = template.url;
  };

  // Template upload functionality
  const handleTemplateUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploadingTemplate(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`);
          continue;
        }
        
        // Validate file size (max 5MB for templates)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is larger than 5MB`);
          continue;
        }

        // Create URL for the uploaded template
        const templateUrl = URL.createObjectURL(file);
        
        // Create a custom template object
        const customTemplate: TemplateImage = {
          id: `custom_${Date.now()}_${i}`,
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
          fileName: file.name,
          url: templateUrl,
          type: 'custom',
          category: 'custom',
          description: 'User uploaded template',
          tags: ['custom', 'uploaded']
        };

        // Add to templates list
        setTemplates(prev => [...prev, customTemplate]);
        
        // Update categories if 'custom' doesn't exist
        setTemplateCategories(prev => {
          if (!prev.includes('custom')) {
            return [...prev, 'custom'];
          }
          return prev;
        });
        
        // Automatically select the custom category
        setSelectedCategory('custom');
        
        // Automatically add the template to canvas
        addTemplateOverlay(customTemplate);
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      alert('Failed to upload template. Please try again.');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const moveLayerUp = (layerId: string) => {
    const newLayers = overlayLayers.map(layer => {
      if (layer.id === layerId) {
        return { ...layer, zIndex: layer.zIndex + 1 };
      }
      return layer;
    });
    setOverlayLayers(newLayers);
    addHistory(newLayers);
  };

  const moveLayerDown = (layerId: string) => {
    const newLayers = overlayLayers.map(layer => {
      if (layer.id === layerId && layer.zIndex > 0) {
        return { ...layer, zIndex: layer.zIndex - 1 };
      }
      return layer;
    });
    setOverlayLayers(newLayers);
    addHistory(newLayers);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser shortcuts when editor is open
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            exportEditedImage();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'd':
            e.preventDefault();
            if (selectedLayer) {
              duplicateLayer(selectedLayer);
            }
            break;
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Delete' && selectedLayer) {
        e.preventDefault();
        deleteLayer(selectedLayer);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedLayer, exportEditedImage, undo, redo, duplicateLayer, deleteLayer, onClose]);

  // Canvas interaction handlers
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getLayerAt = (x: number, y: number): OverlayLayer | null => {
    // Check layers from top to bottom (highest z-index first)
    const sortedLayers = [...overlayLayers]
      .filter(layer => layer.visible)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const layer of sortedLayers) {
      if (x >= layer.x && x <= layer.x + layer.width &&
          y >= layer.y && y <= layer.y + layer.height) {
        return layer;
      }
    }
    return null;
  };

  const getResizeHandle = (x: number, y: number, layer: OverlayLayer): string | null => {
    const cornerHitArea = 48; // Even larger hit area for diagonal corners
    const edgeHitArea = 32; // Larger hit area for edges
    
    // Check corner handles first (diagonal resize) - prioritize these with larger hit areas
    const corners = [
      { handle: 'nw', x: layer.x - cornerHitArea / 2, y: layer.y - cornerHitArea / 2, width: cornerHitArea, height: cornerHitArea },
      { handle: 'ne', x: layer.x + layer.width - cornerHitArea / 2, y: layer.y - cornerHitArea / 2, width: cornerHitArea, height: cornerHitArea },
      { handle: 'sw', x: layer.x - cornerHitArea / 2, y: layer.y + layer.height - cornerHitArea / 2, width: cornerHitArea, height: cornerHitArea },
      { handle: 'se', x: layer.x + layer.width - cornerHitArea / 2, y: layer.y + layer.height - cornerHitArea / 2, width: cornerHitArea, height: cornerHitArea }
    ];
    
    for (const corner of corners) {
      if (x >= corner.x && x <= corner.x + corner.width && 
          y >= corner.y && y <= corner.y + corner.height) {
        return corner.handle;
      }
    }
    
    // Check edge handles with smaller hit areas (only if not in corner zones)
    const edges = [
      { handle: 'n', x: layer.x + layer.width / 2 - edgeHitArea / 2, y: layer.y - edgeHitArea / 2, width: edgeHitArea, height: edgeHitArea },
      { handle: 'e', x: layer.x + layer.width - edgeHitArea / 2, y: layer.y + layer.height / 2 - edgeHitArea / 2, width: edgeHitArea, height: edgeHitArea },
      { handle: 's', x: layer.x + layer.width / 2 - edgeHitArea / 2, y: layer.y + layer.height - edgeHitArea / 2, width: edgeHitArea, height: edgeHitArea },
      { handle: 'w', x: layer.x - edgeHitArea / 2, y: layer.y + layer.height / 2 - edgeHitArea / 2, width: edgeHitArea, height: edgeHitArea }
    ];
    
    for (const edge of edges) {
      if (x >= edge.x && x <= edge.x + edge.width && 
          y >= edge.y && y <= edge.y + edge.height) {
        return edge.handle;
      }
    }
    
    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    const layer = getLayerAt(coords.x, coords.y);
    
    if (layer) {
      setSelectedLayer(layer.id);
      
      // Check if clicking on a resize handle
      const handle = getResizeHandle(coords.x, coords.y, layer);
      
      if (handle) {
        // Start resizing
        setIsResizing(true);
        setResizeHandle(handle);
        setResizeStartData({
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          mouseX: coords.x,
          mouseY: coords.y
        });
        
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = getResizeCursor(handle);
        }
      } else {
        // Start dragging
        setIsDragging(true);
        setDragOffset({
          x: coords.x - layer.x,
          y: coords.y - layer.y
        });
        
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = 'grabbing';
        }
      }
    } else {
      setSelectedLayer(null);
    }
  };

  const getResizeCursor = (handle: string): string => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nw-resize';
      case 'ne':
      case 'sw':
        return 'ne-resize';
      case 'n':
      case 's':
        return 'n-resize';
      case 'e':
      case 'w':
        return 'e-resize';
      default:
        return 'default';
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e);
    
    if (isResizing && selectedLayer && resizeHandle && resizeStartData) {
      // Handle resizing with preview
      const deltaX = coords.x - resizeStartData.mouseX;
      const deltaY = coords.y - resizeStartData.mouseY;
      
      let newX = resizeStartData.x;
      let newY = resizeStartData.y;
      let newWidth = resizeStartData.width;
      let newHeight = resizeStartData.height;
      
      switch (resizeHandle) {
        case 'nw':
          newX = resizeStartData.x + deltaX;
          newY = resizeStartData.y + deltaY;
          newWidth = resizeStartData.width - deltaX;
          newHeight = resizeStartData.height - deltaY;
          break;
        case 'ne':
          newY = resizeStartData.y + deltaY;
          newWidth = resizeStartData.width + deltaX;
          newHeight = resizeStartData.height - deltaY;
          break;
        case 'sw':
          newX = resizeStartData.x + deltaX;
          newWidth = resizeStartData.width - deltaX;
          newHeight = resizeStartData.height + deltaY;
          break;
        case 'se':
          newWidth = resizeStartData.width + deltaX;
          newHeight = resizeStartData.height + deltaY;
          break;
        case 'n':
          newY = resizeStartData.y + deltaY;
          newHeight = resizeStartData.height - deltaY;
          break;
        case 's':
          newHeight = resizeStartData.height + deltaY;
          break;
        case 'w':
          newX = resizeStartData.x + deltaX;
          newWidth = resizeStartData.width - deltaX;
          break;
        case 'e':
          newWidth = resizeStartData.width + deltaX;
          break;
      }
      
      // Apply constraints
      const minSize = 20; // Increased minimum size for better usability
      newWidth = Math.max(minSize, Math.min(canvasSize.width, newWidth));
      newHeight = Math.max(minSize, Math.min(canvasSize.height, newHeight));
      newX = Math.max(0, Math.min(canvasSize.width - newWidth, newX));
      newY = Math.max(0, Math.min(canvasSize.height - newHeight, newY));
      
      // Set resize preview for visual feedback
      setResizePreview({ x: newX, y: newY, width: newWidth, height: newHeight });
      
        // Update the layer with throttling for smooth performance
        updateSelectedLayerThrottled({ x: newX, y: newY, width: newWidth, height: newHeight });
      
    } else if (isDragging && selectedLayer) {
      // Handle dragging
      const selectedLayerData = overlayLayers.find(l => l.id === selectedLayer);
      if (selectedLayerData) {
        const newX = Math.max(0, Math.min(canvasSize.width - selectedLayerData.width, coords.x - dragOffset.x));
        const newY = Math.max(0, Math.min(canvasSize.height - selectedLayerData.height, coords.y - dragOffset.y));
        
          updateSelectedLayerThrottled({ x: newX, y: newY });
      }
    } else {
      // Update cursor and hover states based on what's under the mouse
      const layer = getLayerAt(coords.x, coords.y);
      if (layer && selectedLayer === layer.id) {
        const handle = getResizeHandle(coords.x, coords.y, layer);
        if (handle) {
          const newCursor = getResizeCursor(handle);
          if (canvas.style.cursor !== newCursor) {
            canvas.style.cursor = newCursor;
          }
          // Update hovered handle for visual feedback
          if (hoveredHandle !== handle) {
            setHoveredHandle(handle);
          }
        } else {
          // Over the selected layer but not on a handle - show grab cursor
          if (canvas.style.cursor !== 'grab') {
            canvas.style.cursor = 'grab';
          }
          // Clear hovered handle when not over a handle
          if (hoveredHandle) {
            setHoveredHandle(null);
          }
        }
      } else if (layer) {
        // Over a different layer - show grab cursor
        if (canvas.style.cursor !== 'grab') {
          canvas.style.cursor = 'grab';
        }
        if (hoveredHandle) {
          setHoveredHandle(null);
        }
      } else {
        // Not over any layer - show default cursor
        if (canvas.style.cursor !== 'default') {
          canvas.style.cursor = 'default';
        }
        if (hoveredHandle) {
          setHoveredHandle(null);
        }
      }
    }
  };

  const handleCanvasMouseUp = () => {
    // Ensure any pending updates are applied immediately
    if (pendingUpdateRef.current) {
      updateSelectedLayer(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    
    // Cancel any pending animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (isDragging) {
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
    }
    
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStartData(null);
      setResizePreview(null); // Clear resize preview
    }
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  };

  const handleCanvasMouseLeave = () => {
    // Clear hover state when mouse leaves canvas
    setHoveredHandle(null);
    handleCanvasMouseUp();
  };

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Enhanced keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts (work regardless of selected layer)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            exportEditedImage();
            break;
          case 'd':
            e.preventDefault();
            if (selectedLayer) {
              duplicateLayer(selectedLayer);
            }
            break;
          default:
            break;
        }
        return;
      }

      // Layer-specific shortcuts
      if (!selectedLayer) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        return;
      }
      
      const moveAmount = e.shiftKey ? 10 : 1;
      const selectedLayerData = overlayLayers.find(layer => layer.id === selectedLayer);
      if (!selectedLayerData) return;

      const updates: Partial<OverlayLayer> = {};

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          updates.x = Math.max(0, selectedLayerData.x - moveAmount);
          break;
        case 'ArrowRight':
          e.preventDefault();
          updates.x = Math.min(canvasSize.width - selectedLayerData.width, selectedLayerData.x + moveAmount);
          break;
        case 'ArrowUp':
          e.preventDefault();
          updates.y = Math.max(0, selectedLayerData.y - moveAmount);
          break;
        case 'ArrowDown':
          e.preventDefault();
          updates.y = Math.min(canvasSize.height - selectedLayerData.height, selectedLayerData.y + moveAmount);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          deleteLayer(selectedLayer);
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedLayer(null);
          break;
        case 'r':
          e.preventDefault();
          updateSelectedLayer({ rotation: (selectedLayerData.rotation + 90) % 360 });
          break;
        case 'v':
          e.preventDefault();
          updateSelectedLayer({ visible: !selectedLayerData.visible });
          break;
        case '=':
        case '+':
          e.preventDefault();
          updateSelectedLayer({ 
            width: Math.min(canvasSize.width, selectedLayerData.width + 10),
            height: Math.min(canvasSize.height, selectedLayerData.height + 10)
          });
          break;
        case '-':
          e.preventDefault();
          updateSelectedLayer({ 
            width: Math.max(10, selectedLayerData.width - 10),
            height: Math.max(10, selectedLayerData.height - 10)
          });
          break;
        default:
          return;
      }

      if (Object.keys(updates).length > 0) {
        updateSelectedLayer(updates);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedLayer, overlayLayers, canvasSize, isOpen, undo, redo, exportEditedImage, onClose, deleteLayer, duplicateLayer, updateSelectedLayer]);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Add double-click to fit layer to content
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    const layer = getLayerAt(coords.x, coords.y);
    
    if (layer) {
      // Reset layer to default size and position
      updateSelectedLayer({
        x: canvasSize.width * 0.1,
        y: canvasSize.height * 0.1,
        width: canvasSize.width * 0.3,
        height: canvasSize.height * 0.3,
        rotation: 0
      });
    }
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setCanvasOffset({ x: 0, y: 0 });
  };



  const downloadImage = (format: 'png' | 'jpeg' | 'webp' = 'png', quality: number = 1) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mimeType = `image/${format}`;
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${imageName.replace(/\.[^/.]+$/, '')}_edited.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, mimeType, quality);
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const selectedLayerData = overlayLayers.find(layer => layer.id === selectedLayer);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: rangeSliderStyles }} />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-[98vw] max-h-[98vh] h-[95vh] w-[95vw] p-0 overflow-hidden"
          onInteractOutside={(e) => {
            // Prevent closing when clicking on canvas or editor elements
            e.preventDefault();
          }}
        >
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <DialogTitle className="text-xl font-semibold">
              Edit Image: {imageName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex h-full overflow-hidden">
            {/* Left Panel - Templates */}
            <div className={`w-80 min-w-[320px] ${
              isDarkMode 
                ? 'bg-slate-800/50 border-slate-700/30' 
                : 'bg-gray-50/50 border-gray-200/30'
            } border-r flex flex-col`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`w-2 h-2 rounded-full bg-blue-500`}></div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Template Library
                  </h3>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-3`}>
                  Add professional overlays to your image
                </p>
                
                {/* Category Filter */}
                <div className="relative">
                  <label className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-1 block`}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    } outline-none`}
                  >
                    {templateCategories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Templates' : category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload Template Button */}
                <div className="mt-3">
                  <input
                    ref={templateUploadRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleTemplateUpload(e.target.files)}
                    className="hidden"
                  />
                  <Button
                    onClick={() => templateUploadRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className={`w-full ${isDarkMode ? 'border-green-500 text-green-400 hover:bg-green-500/10' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
                    disabled={isUploadingTemplate}
                  >
                    {isUploadingTemplate ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Custom Template
                      </>
                    )}
                  </Button>
                  <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} mt-1`}>
                    Upload your own images as templates (max 5MB each)
                  </p>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingTemplates ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mb-4"></div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Loading templates...
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} mt-1`}>
                      Please wait while we fetch your templates
                    </p>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className={`w-16 h-16 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
                      <ImageIcon className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} text-center`}>
                      No templates found
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} mt-1 text-center`}>
                      Try selecting a different category
                    </p>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {filteredTemplates.map(template => (
                        <div
                          key={template.id}
                          className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] ${
                            selectedTemplate?.id === template.id
                              ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                              : isDarkMode 
                                ? 'border-gray-600 hover:border-gray-500 hover:shadow-lg' 
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                          }`}
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <div className="aspect-square overflow-hidden">
                            <Image
                              src={template.url}
                              alt={template.name}
                              width={150}
                              height={150}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addTemplateOverlay(template);
                                }}
                                className="bg-white/90 text-gray-900 hover:bg-white shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                              <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                                {template.name}
                              </p>
                              {template.category === 'custom' && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-medium">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} truncate mt-0.5`}>
                              {template.category === 'custom' ? 'User uploaded' : template.category}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center Panel - Canvas */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Minimalistic Toolbar */}
              <div className={`px-4 py-3 border-b ${
                isDarkMode 
                  ? 'border-slate-700/50 bg-slate-800/30' 
                  : 'border-gray-200/50 bg-white/30'
              } flex items-center justify-between`}>
                <div className="flex items-center space-x-3">
                  {/* History Controls */}
                  <div className="flex items-center space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={undo} 
                      disabled={historyIndex <= 0}
                      className={`${historyIndex <= 0 ? 'opacity-50' : ''}`}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={redo} 
                      disabled={historyIndex >= history.length - 1}
                      className={`${historyIndex >= history.length - 1 ? 'opacity-50' : ''}`}
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className={`h-4 w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                  
                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={zoomOut}
                      disabled={zoomLevel <= 0.1}
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <div className={`px-2 py-1 text-xs font-mono ${isDarkMode ? 'text-white' : 'text-gray-700'} min-w-[50px] text-center`}>
                      {Math.round(zoomLevel * 100)}%
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={zoomIn}
                      disabled={zoomLevel >= 3}
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={resetZoom}
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className={`h-4 w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                  
                  {/* Layer Info */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${overlayLayers.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      {overlayLayers.length} layer{overlayLayers.length !== 1 ? 's' : ''}
                    </span>
                    {selectedLayer && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => duplicateLayer(selectedLayer)}
                        title="Duplicate Layer (Ctrl+D)"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => downloadImage('png')} 
                    variant="outline"
                    size="sm"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => exportEditedImage()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                    size="sm"
                    title="Save Changes (Ctrl+S)"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Canvas Area */}
              <div className={`flex-1 overflow-auto p-6 flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-slate-900/30' 
                  : 'bg-gray-50/30'
              }`}>
                <div className="relative">
                  {originalImage ? (
                    <div className="relative">
                      <canvas
                        ref={canvasRef}
                        className={`border-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} shadow-2xl rounded-lg max-w-full max-h-full select-none transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '65vh',
                          transform: `scale(${zoomLevel}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                          transformOrigin: 'center center'
                        }}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseLeave}
                        onDoubleClick={handleCanvasDoubleClick}
                      />
                      
                      {/* Help overlay when no layers */}
                      {overlayLayers.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className={`text-center p-6 rounded-lg ${isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'} backdrop-blur-sm shadow-lg`}>
                            <ImageIcon className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-white' : 'text-gray-400'}`} />
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'} mb-1`}>
                              Add templates to get started
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                              Click templates from the left panel to add overlay layers
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Drag feedback */}
                      {isDragging && selectedLayer && (
                        <div className="absolute top-4 left-4 pointer-events-none">
                          <div className={`px-3 py-1 rounded-lg ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'} shadow-lg text-sm`}>
                            Dragging layer...
                          </div>
                        </div>
                      )}
                      
                      {/* Resize feedback */}
                      {isResizing && resizePreview && (
                        <div className="absolute top-4 right-4 pointer-events-none">
                          <div className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'} shadow-lg text-sm font-mono`}>
                            <div>Size: {Math.round(resizePreview.width)} × {Math.round(resizePreview.height)}</div>
                            <div>Position: {Math.round(resizePreview.x)}, {Math.round(resizePreview.y)}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Handle hover tooltip */}
                      {hoveredHandle && !isResizing && !isDragging && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
                          <div className={`px-4 py-2 rounded-lg ${
                            ['nw', 'ne', 'sw', 'se'].includes(hoveredHandle) 
                              ? isDarkMode ? 'bg-red-900 text-red-300 border border-red-700' : 'bg-red-100 text-red-800 border border-red-300'
                              : isDarkMode ? 'bg-blue-900 text-blue-300 border border-blue-700' : 'bg-blue-100 text-blue-700 border border-blue-300'
                          } shadow-lg text-sm font-medium`}>
                            {['nw', 'ne', 'sw', 'se'].includes(hoveredHandle) ? (
                              <div className="text-center">
                                <div className="font-bold">🔄 DIAGONAL RESIZE</div>
                                <div className="text-xs mt-1">
                                  {hoveredHandle.toUpperCase()} corner - Drag to resize proportionally
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div>↔️ {hoveredHandle.toUpperCase()} edge resize</div>
                                <div className="text-xs mt-1">Drag to resize in one direction</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Canvas Loading/Error Overlay */}
                      {(isLoadingImage || imageLoadError || !originalImage) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <div className="text-center p-4">
                            {isLoadingImage ? (
                              <>
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                                  Loading image...
                                </p>
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Trying different sizes if needed
                                </p>
                              </>
                            ) : imageLoadError ? (
                              <>
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-red-500" />
                                </div>
                                <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                  Failed to load image
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} max-w-xs`}>
                                  {imageLoadError}
                                </p>
                                <Button
                                  onClick={() => {
                                    setImageLoadError(null);
                                    setIsLoadingImage(true);
                                    // Trigger reload by updating the effect dependency
                                    const img = new window.Image();
                                    img.crossOrigin = 'anonymous';
                                    img.onload = () => {
                                      setOriginalImage(img);
                                      setCanvasSize({ width: img.width, height: img.height });
                                      setIsLoadingImage(false);
                                    };
                                    img.onerror = () => {
                                      setIsLoadingImage(false);
                                      setImageLoadError('Image still cannot be loaded');
                                    };
                                    img.src = imageUrl;
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="mt-3"
                                >
                                  Try Again
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                                  Preparing image...
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`w-96 h-64 border-2 border-dashed ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'} rounded-lg flex items-center justify-center`}>
                      <div className="text-center">
                        <ImageIcon className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-white' : 'text-gray-400'}`} />
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                          Loading image...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Layer Management */}
            <div className={`w-80 min-w-[320px] ${
              isDarkMode 
                ? 'bg-slate-800/50 border-slate-700/30' 
                : 'bg-gray-50/50 border-gray-200/30'
            } border-l flex flex-col`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full bg-purple-500`}></div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Layers
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                      {overlayLayers.length}
                    </span>
                  </div>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Manage overlay layers and properties
                </p>
              </div>

              {/* Layers List */}
              <div className="flex-1 overflow-y-auto">
                {overlayLayers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className={`w-16 h-16 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
                      <Square className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} text-center`}>
                      No layers yet
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} mt-1 text-center`}>
                      Add templates from the left panel to create overlay layers
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {overlayLayers
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map(layer => (
                        <div
                          key={layer.id}
                          className={`group relative rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                            selectedLayer === layer.id 
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg' 
                              : isDarkMode 
                                ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50' 
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                          onClick={() => setSelectedLayer(layer.id)}
                        >
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSelectedLayer({ visible: !layer.visible });
                                  }}
                                  className={`p-1 h-6 w-6 ${layer.visible ? 'text-blue-500' : 'text-gray-400'}`}
                                >
                                  {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </Button>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                                    {layer.name}
                                  </p>
                                  <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'} mt-0.5`}>
                                    Z-Index: {layer.zIndex} • Opacity: {Math.round(layer.opacity * 100)}%
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateLayer(layer.id);
                                  }}
                                  className="p-1 h-6 w-6"
                                  title="Duplicate Layer"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveLayerUp(layer.id);
                                  }}
                                  className="p-1 h-6 w-6"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveLayerDown(layer.id);
                                  }}
                                  className="p-1 h-6 w-6"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteLayer(layer.id);
                                  }}
                                  className="p-1 h-6 w-6 text-red-500 hover:text-red-600"
                                  title="Delete Layer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Layer Properties */}
              {selectedLayerData && (
                <div className={`border-t ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Layer Properties
                      </h4>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Resize Tip */}
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          💡 <strong>Tip:</strong> Drag the blue handles around the selected layer to resize it visually on the canvas.
                        </p>
                      </div>

                      {/* Position Controls */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-1 block`}>
                            Position X
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={Math.max(0, canvasSize.width - selectedLayerData.width)}
                            value={Math.round(selectedLayerData.x)}
                            onChange={(e) => updateSelectedLayer({ x: Number(e.target.value) })}
                            className={`w-full p-2 text-sm rounded border ${
                              isDarkMode 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-1 block`}>
                            Position Y
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={Math.max(0, canvasSize.height - selectedLayerData.height)}
                            value={Math.round(selectedLayerData.y)}
                            onChange={(e) => updateSelectedLayer({ y: Number(e.target.value) })}
                            className={`w-full p-2 text-sm rounded border ${
                              isDarkMode 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                        </div>
                      </div>

                      {/* Size Controls - Use drag handles on canvas for resizing */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-1 block`}>
                            Width
                          </label>
                          <input
                            type="number"
                            min="10"
                            max={canvasSize.width}
                            value={Math.round(selectedLayerData.width)}
                            onChange={(e) => updateSelectedLayer({ width: Number(e.target.value) })}
                            className={`w-full p-2 text-sm rounded border ${
                              isDarkMode 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-1 block`}>
                            Height
                          </label>
                          <input
                            type="number"
                            min="10"
                            max={canvasSize.height}
                            value={Math.round(selectedLayerData.height)}
                            onChange={(e) => updateSelectedLayer({ height: Number(e.target.value) })}
                            className={`w-full p-2 text-sm rounded border ${
                              isDarkMode 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                        </div>
                      </div>

                      {/* Rotation & Opacity */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-1 block`}>
                            Rotation (°)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="360"
                            value={Math.round(selectedLayerData.rotation)}
                            onChange={(e) => updateSelectedLayer({ rotation: Number(e.target.value) })}
                            className={`w-full p-2 text-sm rounded border ${
                              isDarkMode 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-1 block`}>
                            Opacity (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={Math.round(selectedLayerData.opacity * 100)}
                            onChange={(e) => updateSelectedLayer({ opacity: Number(e.target.value) / 100 })}
                            className={`w-full p-2 text-sm rounded border ${
                              isDarkMode 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            } outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'} mb-2`}>
                          Quick Actions
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateSelectedLayer({ rotation: 0, opacity: 1 })}
                            className="text-xs"
                          >
                            Reset Transform
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateSelectedLayer({ 
                              x: canvasSize.width * 0.1, 
                              y: canvasSize.height * 0.1,
                              width: canvasSize.width * 0.3,
                              height: canvasSize.height * 0.3
                            })}
                            className="text-xs"
                          >
                            Reset Size
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageEditorDialog;