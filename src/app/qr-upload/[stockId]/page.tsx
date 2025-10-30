"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, FileText, Upload, ArrowLeft, CheckCircle, AlertCircle, GripVertical, RotateCcw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import LicensePlate from '@/components/ui/license-plate';
import { useQueryClient } from '@tanstack/react-query';

interface UploadFile {
  file: File;
  preview?: string;
  type: 'photo' | 'document';
}

export default function QRUploadPage() {
  const params = useParams();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const stockId = params.stockId as string;

  const [uploadType, setUploadType] = useState<'photo' | 'document' | null>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    currentStep: number;
    totalSteps: number;
    currentFile: number;
    totalFiles: number;
    stepName: string;
    fileName: string;
    details: string;
  }>({
    currentStep: 0,
    totalSteps: 0,
    currentFile: 0,
    totalFiles: 0,
    stepName: '',
    fileName: '',
    details: ''
  });
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState<string>('');
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  // Fetch vehicle registration from stock data
  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        setIsLoadingVehicle(true);
        // We'll use a public endpoint to get basic vehicle info for QR uploads
        const response = await fetch(`/api/stock/${stockId}/basic-info`);
        if (response.ok) {
          const data = await response.json();
          setVehicleRegistration(data.registration || 'N/A');
        } else {
          console.warn('Could not fetch vehicle registration');
          setVehicleRegistration('N/A');
        }
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
        setVehicleRegistration('N/A');
      } finally {
        setIsLoadingVehicle(false);
      }
    };

    if (stockId) {
      fetchVehicleData();
    }
  }, [stockId]);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: UploadFile[] = selectedFiles.map(file => ({
      file,
      type: uploadType!,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    
    // Add some visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
    
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current++;
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      dragCounter.current = 0;
      return;
    }

    setFiles(prev => {
      const newFiles = [...prev];
      const draggedFile = newFiles[draggedIndex];
      
      // Remove the dragged item
      newFiles.splice(draggedIndex, 1);
      
      // Insert at new position (direct insertion)
      newFiles.splice(dropIndex, 0, draggedFile);
      
      return newFiles;
    });

    // Reset drag state
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    setTouchStartIndex(index);
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsLongPress(false);
    
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      setDraggedIndex(index);
      // Add haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 300); // 300ms for faster long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isLongPress || draggedIndex === null) return;
    
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    
    // Find element under touch point
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const fileItem = elementBelow?.closest('[data-file-index]');
    
    if (fileItem) {
      const index = parseInt(fileItem.getAttribute('data-file-index') || '0');
      if (index !== draggedIndex) {
        setDragOverIndex(index);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    if (isLongPress && draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      // Perform the reorder
      setFiles(prev => {
        const newFiles = [...prev];
        const draggedFile = newFiles[draggedIndex];
        
        // Remove the dragged item
        newFiles.splice(draggedIndex, 1);
        
        // Insert at new position (direct insertion)
        newFiles.splice(dragOverIndex, 0, draggedFile);
        
        return newFiles;
      });
    }
    
    // Reset all touch states
    setTouchStartIndex(null);
    setTouchStartPos(null);
    setIsLongPress(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Reset order function
  const resetOrder = () => {
    // This could restore original upload order if needed
    // For now, we'll just show a visual indication that order was reset
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus('idle');
    
    // Initialize progress
    const totalSteps = uploadType === 'photo' ? 4 : 3;
    setUploadProgress({
      currentStep: 1,
      totalSteps,
      currentFile: 0,
      totalFiles: files.length,
      stepName: 'Preparing upload',
      fileName: '',
      details: 'Organizing files and preparing data...'
    });

    try {
      // Step 1: Prepare data
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      
      setUploadProgress(prev => ({
        ...prev,
        currentStep: 2,
        stepName: 'Uploading files',
        details: 'Uploading to secure storage...'
      }));

      const formData = new FormData();
      formData.append('stockId', stockId);
      formData.append('uploadSource', 'qr_code');
      
      // Add registration for document uploads
      if (uploadType === 'document' && vehicleRegistration && vehicleRegistration !== 'N/A') {
        formData.append('registration', vehicleRegistration);
      }

      files.forEach((fileData, index) => {
        formData.append(`file_${index}`, fileData.file);
        formData.append(`fileType_${index}`, fileData.type);
        
        // For document uploads, add required metadata
        if (uploadType === 'document') {
          formData.append(`documentName_${index}`, `QR Upload - ${fileData.file.name}`);
          formData.append(`documentType_${index}`, 'general');
          formData.append(`description_${index}`, `Uploaded via QR code for stock ${stockId}`);
        }
        
        // Update progress for each file
        setUploadProgress(prev => ({
          ...prev,
          currentFile: index + 1,
          fileName: fileData.file.name,
          details: `Uploading ${fileData.file.name}...`
        }));
      });

      // Choose the appropriate upload endpoint based on file type
      const endpoint = uploadType === 'photo' 
        ? '/api/stock-images/upload'
        : '/api/vehicle-documents/upload';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Log AutoTrader image IDs if available
        if (result.autoTraderImageIds?.length > 0) {
          console.log(`✅ AutoTrader IDs: [${result.autoTraderImageIds.join(', ')}] for stock ${result.stockId}`);
        }

        // Step 3: Processing complete
        setUploadProgress(prev => ({
          ...prev,
          currentStep: 3,
          stepName: 'Processing complete',
          fileName: '',
          details: `Successfully processed ${files.length} ${uploadType}(s)`
        }));

        // Step 4: AutoTrader integration (if applicable)
        if (uploadType === 'photo' && result.autoTraderImageIds?.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          setUploadProgress(prev => ({
            ...prev,
            currentStep: 4,
            stepName: 'AutoTrader integration',
            details: `Added ${result.autoTraderImageIds.length} images to AutoTrader listing`
          }));
          
        }

        await new Promise(resolve => setTimeout(resolve, 800)); // Show completion

        setUploadStatus('success');
        const successMessage = `Successfully uploaded ${files.length} ${uploadType}(s)! Your files have been added to the vehicle.${
          result.autoTraderImageIds?.length > 0 ? ` (${result.autoTraderImageIds.length} images also added to AutoTrader)` : ''
        }`;
        setUploadMessage(successMessage);
        setFiles([]);
        
        // CRITICAL FIX: Invalidate React Query cache to refresh data everywhere
        // This ensures My Stock page and other pages immediately show the updated images
        try {
          console.log('🔄 Invalidating stock cache after QR upload...');
          
          // Invalidate ALL stock-related queries to refresh data everywhere
          await queryClient.invalidateQueries({ queryKey: ['stock'] });
          await queryClient.invalidateQueries({ queryKey: ['stock-detail', stockId] });
          
          console.log('✅ Stock cache invalidated successfully');
        } catch (cacheError) {
          console.error('⚠️ Failed to invalidate cache after upload:', cacheError);
          // Don't fail the upload if cache invalidation fails
        }
        
        // No auto-redirect - user stays on page
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset progress
      setUploadProgress({
        currentStep: 0,
        totalSteps: 0,
        currentFile: 0,
        totalFiles: 0,
        stepName: '',
        fileName: '',
        details: ''
      });
    }
  };

  const resetUpload = () => {
    setUploadType(null);
    setFiles([]);
    setUploadStatus('idle');
    setUploadMessage('');
  };

  return (
    <div className={`min-h-screen ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
    }`}>
      <div className={`container mx-auto px-4 ${isMobile ? 'py-4' : 'py-8'} max-w-2xl`}>
        {/* Header */}
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            📱 Quick Upload
          </h1>
          <p className={`${isMobile ? 'text-base' : 'text-lg'} ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Add photos & documents instantly
          </p>
          
          {/* Vehicle Registration Plate */}
          <div className="flex flex-col items-center gap-2 mt-4">
            {isLoadingVehicle ? (
              <div className={`animate-pulse bg-slate-300 rounded h-9 w-40 ${
                isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
              }`} />
            ) : vehicleRegistration && vehicleRegistration !== 'N/A' ? (
              <LicensePlate 
                registration={vehicleRegistration} 
                size={isMobile ? "md" : "lg"} 
              />
            ) : (
              <p className={`text-sm ${
                isDarkMode ? 'text-slate-500' : 'text-slate-500'
              }`}>
                Vehicle: {stockId.slice(-8)}
              </p>
            )}
          </div>
        </div>

        {/* Interactive Loading Dialog */}
        {isUploading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className={`w-full max-w-md ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <CardHeader className="pb-4">
                <CardTitle className={`text-center ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Uploading {uploadType === 'photo' ? 'Photos' : 'Documents'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                      Step {uploadProgress.currentStep} of {uploadProgress.totalSteps}
                    </span>
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                      {Math.round((uploadProgress.currentStep / uploadProgress.totalSteps) * 100)}%
                    </span>
                  </div>
                  <div className={`w-full bg-slate-200 rounded-full h-2 ${
                    isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                  }`}>
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${(uploadProgress.currentStep / uploadProgress.totalSteps) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Current Step */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {uploadProgress.stepName}
                    </h3>
                  </div>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {uploadProgress.details}
                  </p>
                </div>

                {/* File Progress */}
                {uploadProgress.totalFiles > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                        Files
                      </span>
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                        {uploadProgress.currentFile} of {uploadProgress.totalFiles}
                      </span>
                    </div>
                    <div className={`w-full bg-slate-200 rounded-full h-1.5 ${
                      isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                    }`}>
                      <div 
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(uploadProgress.currentFile / uploadProgress.totalFiles) * 100}%` 
                        }}
                      />
                    </div>
                    {uploadProgress.fileName && (
                      <p className={`text-xs truncate ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {uploadProgress.fileName}
                      </p>
                    )}
                  </div>
                )}

                {/* Steps Indicator */}
                <div className="flex justify-center space-x-2">
                  {Array.from({ length: uploadProgress.totalSteps }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i + 1 <= uploadProgress.currentStep
                          ? 'bg-blue-600'
                          : i + 1 === uploadProgress.currentStep + 1
                          ? 'bg-blue-300 animate-pulse'
                          : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus === 'success' && (
          <Card className={`mb-6 border-green-500 ${
            isDarkMode ? 'bg-green-900/20' : 'bg-green-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className={`font-medium ${
                    isDarkMode ? 'text-green-300' : 'text-green-700'
                  }`}>
                    Upload Successful!
                  </p>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {uploadMessage}
                  </p>
                  <Button
                    onClick={resetUpload}
                    variant="outline"
                    size="sm"
                    className={`mt-3 ${
                      isDarkMode 
                        ? 'border-green-600 text-green-300 hover:bg-green-800' 
                        : 'border-green-600 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    Upload More Files
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {uploadStatus === 'error' && (
          <Card className={`mb-6 border-red-500 ${
            isDarkMode ? 'bg-red-900/20' : 'bg-red-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className={`font-medium ${
                    isDarkMode ? 'text-red-300' : 'text-red-700'
                  }`}>
                    Upload Failed
                  </p>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {uploadMessage}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Type Selection */}
        {!uploadType && uploadStatus !== 'success' && (
          <Card className={`${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <CardHeader>
              <CardTitle className={`text-center ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                What would you like to upload?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setUploadType('photo')}
                className={`w-full ${isMobile ? 'h-16' : 'h-20'} ${isMobile ? 'text-base' : 'text-lg'} ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Camera className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} mr-3`} />
                <div className="text-left">
                  <div>📸 {isMobile ? 'Add Photos' : 'Photos'}</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} opacity-80`}>
                    {isMobile ? 'Camera or gallery options' : 'For vehicle listings'}
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => setUploadType('document')}
                variant="outline"
                className={`w-full ${isMobile ? 'h-16' : 'h-20'} ${isMobile ? 'text-base' : 'text-lg'} ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileText className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} mr-3`} />
                <div className="text-left">
                  <div>📄 {isMobile ? 'Add Documents' : 'Documents'}</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} opacity-80`}>
                    {isMobile ? 'PDFs & images' : 'For vehicle archive'}
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* File Upload Interface */}
        {uploadType && uploadStatus !== 'success' && (
          <Card className={`${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className={`flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {uploadType === 'photo' ? <Camera className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  Upload {uploadType === 'photo' ? 'Photos' : 'Documents'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetUpload}
                  className={`${
                    isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'
                  }`}
                >
                  Change Type
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Input - Mobile Photo Options */}
              {isMobile && uploadType === 'photo' ? (
                <div className="space-y-4">
                  {/* Camera Option */}
                  <div>
                    <input
                      type="file"
                      id="camera-upload"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="camera-upload"
                      className={`block w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        isDarkMode 
                          ? 'border-blue-600 hover:border-blue-500 bg-blue-900/20 hover:bg-blue-900/30' 
                          : 'border-blue-400 hover:border-blue-500 bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <div className="text-center">
                        <Camera className={`h-10 w-10 mx-auto mb-3 ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                        <p className={`text-base font-medium ${
                          isDarkMode ? 'text-blue-300' : 'text-blue-700'
                        }`}>
                          📷 Take Photo
                        </p>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          Open camera to capture
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Gallery Option */}
                  <div>
                    <input
                      type="file"
                      id="gallery-upload"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="gallery-upload"
                      className={`block w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        isDarkMode 
                          ? 'border-slate-600 hover:border-slate-500 bg-slate-700/30 hover:bg-slate-700/50' 
                          : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-center">
                        <Upload className={`h-10 w-10 mx-auto mb-3 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`} />
                        <p className={`text-base font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          📁 Choose from Gallery
                        </p>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          Select from photo library
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                /* Desktop/Document Upload */
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept={uploadType === 'photo' ? 'image/*' : '*'}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`block w-full ${isMobile ? 'p-6' : 'p-8'} border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isDarkMode 
                        ? 'border-slate-600 hover:border-slate-500 bg-slate-700/30 hover:bg-slate-700/50' 
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-center">
                      <Upload className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} mx-auto mb-4 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`} />
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        Choose Files
                      </p>
                      <p className={`text-sm mt-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {uploadType === 'photo' 
                          ? 'Select multiple photos to upload' 
                          : 'Select documents to upload'
                        }
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* File Preview with Drag & Drop */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      Selected Files ({files.length})
                    </h3>
                    {files.length > 1 && (
                      <div className="flex items-center gap-2">
                        <p className={`text-xs ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {isMobile ? 'Hold to drag' : 'Drag to reorder'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetOrder}
                          className={`h-6 px-2 ${
                            isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'
                          }`}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {files.map((fileData, index) => (
                      <div
                        key={index}
                        data-file-index={index}
                        draggable={!isMobile}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onTouchStart={(e) => isMobile ? handleTouchStart(e, index) : undefined}
                        onTouchMove={(e) => isMobile ? handleTouchMove(e) : undefined}
                        onTouchEnd={(e) => isMobile ? handleTouchEnd(e) : undefined}
                        className={`relative p-1 rounded-md border transition-all duration-100 select-none aspect-square will-change-transform ${
                          isMobile ? 'cursor-pointer' : 'cursor-move'
                        } ${
                          draggedIndex === index
                            ? isDarkMode 
                              ? 'border-blue-500 bg-blue-900/20 shadow-lg scale-105 z-10' 
                              : 'border-blue-400 bg-blue-50 shadow-lg scale-105 z-10'
                            : dragOverIndex === index
                            ? isDarkMode 
                              ? 'border-green-500 bg-green-900/20 shadow-md scale-102' 
                              : 'border-green-400 bg-green-50 shadow-md scale-102'
                            : isDarkMode 
                              ? 'border-slate-600 bg-slate-700/30 hover:border-slate-500' 
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {/* Drag Handle - Smaller */}
                        <div className={`absolute top-0.5 left-0.5 p-0.5 rounded ${
                          isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600'
                        }`}>
                          <GripVertical className="h-2 w-2" />
                        </div>

                        {/* Order Number - Smaller */}
                        <div className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold transition-all duration-150 ${
                          draggedIndex === index
                            ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                            : isDarkMode ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Long Press Indicator for Mobile - Smaller */}
                        {isMobile && touchStartIndex === index && !isLongPress && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-md">
                            <div className="w-4 h-4 rounded-full bg-blue-500 animate-ping opacity-60"></div>
                          </div>
                        )}

                        {/* File Preview - Fixed Overflow */}
                        <div className="absolute inset-2 flex flex-col overflow-hidden rounded-sm">
                          {fileData.preview ? (
                            <img
                              src={fileData.preview}
                              alt={fileData.file.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              style={{ maxWidth: '100%', maxHeight: '100%' }}
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isDarkMode ? 'bg-slate-600' : 'bg-slate-200'
                            }`}>
                              <FileText className={`h-4 w-4 ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                              }`} />
                            </div>
                          )}
                          {/* File name - only show on hover for space */}
                          <div className={`absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 opacity-0 hover:opacity-100 transition-opacity duration-200 truncate`}>
                            {fileData.file.name}
                          </div>
                        </div>

                        {/* Remove Button - Smaller */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full p-0 shadow-sm text-xs"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Reorder Instructions */}
                  {files.length > 1 && (
                    <div className={`text-center p-3 rounded-lg ${
                      isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'
                    }`}>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        💡 {isMobile 
                          ? 'Hold any image for 0.3s to drag and reorder. First image = main photo.' 
                          : 'Drag and drop images to reorder. First image = main photo for your listing.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Button */}
              {files.length > 0 && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className={`w-full ${
                    isDarkMode 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {files.length} {uploadType}(s)
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
