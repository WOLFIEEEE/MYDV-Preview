'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  X, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  FileText,
  Image,
  FileImage
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentCategory {
  id: string;
  categoryName: string;
  displayName: string;
  description?: string;
  isRequired: boolean;
  hasExpiry: boolean;
  acceptsMultiple: boolean;
  allowedMimeTypes: string[];
  maxFileSizeMb: number;
  isSystem: boolean;
}

interface UploadedFile {
  file: File;
  id: string;
  documentName: string;
  documentType: string;
  description?: string;
  expiryDate?: string;
  documentDate?: string;
  preview?: string;
}

interface DocumentUploadProps {
  registration?: string; // Make optional for manual uploads
  stockId?: string;
  uploadSource?: 'manual' | 'add_to_stock' | 'bulk_upload';
  onUploadComplete?: (documents: any[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  compact?: boolean; // For integration into forms
}

export default function DocumentUpload({
  registration,
  stockId,
  uploadSource = 'manual',
  onUploadComplete,
  onUploadError,
  className,
  compact = false
}: DocumentUploadProps) {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [currentRegistration, setCurrentRegistration] = useState(registration || '');
  const [registrationSuggestions, setRegistrationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced search for registration suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentRegistration.length >= 2 && (!registration || uploadSource === 'manual')) {
        fetchRegistrationSuggestions(currentRegistration);
      } else {
        setRegistrationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 150); // Faster response time

    return () => clearTimeout(timeoutId);
  }, [currentRegistration, registration, uploadSource]);

  // Load document categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/document-categories');
        const data = await response.json();
        
        if (data.success) {
          setCategories(data.data.categories);
        } else {
          console.error('Failed to load categories:', data.message);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Fetch registration suggestions from inventory
  const fetchRegistrationSuggestions = async (query: string) => {
    if (query.length < 2) {
      setRegistrationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`/api/stock?search=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.stock) {
        const registrations = data.data.stock
          .map((item: any) => item.registration)
          .filter((reg: string) => reg && reg.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5); // Limit to 5 suggestions
        
        setRegistrationSuggestions(registrations);
        setShowSuggestions(registrations.length > 0);
      }
    } catch (error) {
      console.error('Error fetching registration suggestions:', error);
      setRegistrationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      documentName: file.name.split('.')[0],
      documentType: 'other', // Default to 'other'
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke object URLs to prevent memory leaks
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  const updateFileDetails = (fileId: string, updates: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates } : f
    ));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="w-4 h-4" />;
    if (mimeType === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFiles = () => {
    const errors: string[] = [];

    files.forEach(file => {
      if (!file.documentName.trim()) {
        errors.push(`Document name is required for ${file.file.name}`);
      }
      if (!file.documentType) {
        errors.push(`Document type is required for ${file.file.name}`);
      }

      const category = categories.find(cat => cat.categoryName === file.documentType);
      if (category) {
        if (!category.allowedMimeTypes.includes(file.file.type)) {
          errors.push(`File type ${file.file.type} not allowed for ${category.displayName}`);
        }
        if (file.file.size > category.maxFileSizeMb * 1024 * 1024) {
          errors.push(`File ${file.file.name} exceeds maximum size of ${category.maxFileSizeMb}MB`);
        }
      }
    });

    return errors;
  };

  const handleUpload = async () => {
    if (!currentRegistration.trim()) {
      onUploadError?.('Please enter a vehicle registration number first');
      return;
    }

    if (files.length === 0) {
      onUploadError?.('Please select at least one file to upload');
      return;
    }

    const validationErrors = validateFiles();
    if (validationErrors.length > 0) {
      onUploadError?.(validationErrors.join(', '));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      // Add metadata
      formData.append('registration', currentRegistration.trim().toUpperCase());
      if (stockId) formData.append('stockId', stockId);
      formData.append('uploadSource', uploadSource);

      // Add files and their metadata
      files.forEach((fileData, index) => {
        formData.append(`file_${index}`, fileData.file);
        formData.append(`documentName_${index}`, fileData.documentName);
        formData.append(`documentType_${index}`, fileData.documentType);
        if (fileData.description) formData.append(`description_${index}`, fileData.description);
        if (fileData.expiryDate) formData.append(`expiryDate_${index}`, fileData.expiryDate);
        if (fileData.documentDate) formData.append(`documentDate_${index}`, fileData.documentDate);
      });

      // Simulate progress (since we can't track real upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/vehicle-documents/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        onUploadComplete?.(data.data.documents);
        setFiles([]); // Clear files after successful upload
        setUploadProgress(0);
      } else {
        throw new Error(data.message || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      onUploadError?.(error.message || 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  if (loadingCategories) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading document categories...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-4" : undefined}>
        <CardTitle className={compact ? "text-lg" : "text-xl"}>
          Upload Vehicle Documents
        </CardTitle>
        {!compact && currentRegistration && (
          <p className="text-sm text-muted-foreground">
            Upload documents for vehicle registration: <strong>{currentRegistration}</strong>
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Registration Input - Show when registration is not provided or for manual uploads */}
        {(!registration || uploadSource === 'manual') && (
          <div className="space-y-2 relative">
            <Label htmlFor="registration">Vehicle Registration Number *</Label>
            <div className="relative">
              <Input
                id="registration"
                placeholder="e.g., AB12 CDE"
                value={currentRegistration}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setCurrentRegistration(value);
                  if (value.length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
                onFocus={() => {
                  if (registrationSuggestions.length > 0 && currentRegistration.length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow clicking on them
                  setTimeout(() => setShowSuggestions(false), 300);
                }}
                className={cn(
                  "font-mono transition-all duration-200",
                  currentRegistration.length >= 2 && currentRegistration.length <= 8 
                    ? "border-green-500 focus:border-green-600" 
                    : currentRegistration.length > 0 
                    ? "border-amber-500 focus:border-amber-600" 
                    : ""
                )}
                required
                autoComplete="off"
                maxLength={8}
              />
              
              {/* Registration Suggestions Dropdown */}
              {showSuggestions && registrationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                  <div className="p-2 text-xs text-muted-foreground border-b">
                    Found {registrationSuggestions.length} matching registration{registrationSuggestions.length !== 1 ? 's' : ''}
                  </div>
                  {registrationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-3 py-2.5 text-left hover:bg-muted focus:bg-muted focus:outline-none transition-colors font-mono text-sm flex items-center justify-between group"
                      onClick={() => {
                        setCurrentRegistration(suggestion);
                        setShowSuggestions(false);
                      }}
                      onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                    >
                      <span className="font-semibold">{suggestion}</span>
                      <CheckCircle className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the vehicle registration number that these documents belong to. Start typing to see suggestions from your inventory.
            </p>
            
            {/* Registration Status Message */}
            {currentRegistration.trim() ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-2">
                <CheckCircle className="w-4 h-4" />
                Registration selected: <span className="font-mono font-semibold">{currentRegistration}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mt-2">
                <AlertCircle className="w-4 h-4" />
                Please enter a vehicle registration to continue
              </div>
            )}
          </div>
        )}
        {/* File Drop Zone */}
        <div
          {...(currentRegistration.trim() ? getRootProps() : {})}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            !currentRegistration.trim() 
              ? "border-gray-200 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60"
              : isDragActive 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 cursor-pointer" 
                : "border-gray-300 hover:border-gray-400 cursor-pointer",
            compact && "p-4"
          )}
        >
          {currentRegistration.trim() && <input {...getInputProps()} />}
          <Upload className={cn(
            "mx-auto mb-2", 
            compact ? "w-6 h-6" : "w-8 h-8",
            !currentRegistration.trim() && "text-gray-400"
          )} />
          <p className={cn(
            compact ? "text-sm" : undefined,
            !currentRegistration.trim() && "text-gray-500"
          )}>
            {!currentRegistration.trim() 
              ? "Enter a registration number first to upload files"
              : isDragActive 
                ? "Drop files here..." 
                : "Drag & drop files here, or click to select"
            }
          </p>
          <p className={cn(
            "text-xs mt-1",
            !currentRegistration.trim() ? "text-gray-400" : "text-muted-foreground"
          )}>
            Supports PDF, Images, Word docs (max 20MB each)
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Files to Upload ({files.length})</h4>
            
            {files.map((fileData) => {
              const category = categories.find(cat => cat.categoryName === fileData.documentType);
              
              return (
                <Card key={fileData.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {/* File Preview/Icon */}
                    <div className="flex-shrink-0">
                      {fileData.preview ? (
                        <img 
                          src={fileData.preview} 
                          alt="Preview" 
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center">
                          {getFileIcon(fileData.file.type)}
                        </div>
                      )}
                    </div>

                    {/* File Details Form */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{fileData.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(fileData.file.size)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileData.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`name-${fileData.id}`} className="text-xs">
                            Document Name *
                          </Label>
                          <Input
                            id={`name-${fileData.id}`}
                            value={fileData.documentName}
                            onChange={(e) => updateFileDetails(fileData.id, { documentName: e.target.value })}
                            placeholder="Enter document name"
                            className="h-8"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`type-${fileData.id}`} className="text-xs">
                            Document Type *
                          </Label>
                          <Select
                            value={fileData.documentType}
                            onValueChange={(value) => updateFileDetails(fileData.id, { documentType: value })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.categoryName}>
                                  <div className="flex items-center gap-2">
                                    {category.displayName}
                                    {category.isRequired && (
                                      <Badge variant="secondary" className="text-xs">Required</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {category?.hasExpiry && (
                          <div>
                            <Label htmlFor={`expiry-${fileData.id}`} className="text-xs">
                              Expiry Date
                            </Label>
                            <Input
                              id={`expiry-${fileData.id}`}
                              type="date"
                              value={fileData.expiryDate || ''}
                              onChange={(e) => updateFileDetails(fileData.id, { expiryDate: e.target.value })}
                              className="h-8"
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor={`date-${fileData.id}`} className="text-xs">
                            Document Date
                          </Label>
                          <Input
                            id={`date-${fileData.id}`}
                            type="date"
                            value={fileData.documentDate || ''}
                            onChange={(e) => updateFileDetails(fileData.id, { documentDate: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`desc-${fileData.id}`} className="text-xs">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id={`desc-${fileData.id}`}
                          value={fileData.description || ''}
                          onChange={(e) => updateFileDetails(fileData.id, { description: e.target.value })}
                          placeholder="Add description or notes..."
                          className="h-16 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading documents...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <Button 
            onClick={handleUpload} 
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {files.length} Document{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
