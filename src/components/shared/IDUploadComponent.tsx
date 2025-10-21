"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  X, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Download,
  CreditCard,
  Shield
} from "lucide-react";
import FileViewer from './FileViewer';

interface IDUploadComponentProps {
  onFileSelect: (file: File | null) => void;
  onFileUpload?: (fileUrl: string | null) => void;
  error?: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
  existingFileUrl?: string | null;
}

export default function IDUploadComponent({ 
  onFileSelect, 
  onFileUpload,
  error,
  acceptedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
  maxFileSize = 10, // 10MB default
  existingFileUrl
}: IDUploadComponentProps) {
  const { isDarkMode } = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(existingFileUrl || null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update uploadedFileUrl when existingFileUrl prop changes
  useEffect(() => {
    setUploadedFileUrl(existingFileUrl || null);
  }, [existingFileUrl]);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      return `Invalid file type. Please upload: ${acceptedFileTypes.map(type => 
        type.split('/')[1].toUpperCase()
      ).join(', ')} files only.`;
    }

    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSize) {
      return `File size too large. Maximum size allowed is ${maxFileSize}MB.`;
    }

    return null;
  };

  const uploadFileToServer = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      setUploadError('');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/license', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      return result.fileUrl;
    } catch (error) {
      console.error('File upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError('');
    setSelectedFile(file);
    onFileSelect(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Upload file to server if onFileUpload callback is provided
    if (onFileUpload) {
      const fileUrl = await uploadFileToServer(file);
      setUploadedFileUrl(fileUrl);
      onFileUpload(fileUrl);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setUploadError('');
    setUploadedFileUrl(null);
    onFileSelect(null);
    if (onFileUpload) {
      onFileUpload(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Eye className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  // Handle opening file viewer
  const handleViewFile = (fileUrl: string, fileName?: string) => {
    setCurrentFileUrl(fileUrl);
    setCurrentFileName(fileName || 'Driving License');
    setFileViewerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
          isDragging
            ? isDarkMode 
              ? 'border-blue-400 bg-blue-900/20' 
              : 'border-blue-500 bg-blue-50'
            : error || uploadError
              ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20'
              : selectedFile
                ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20'
                : isDarkMode
                  ? 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
                  : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-100/50'
        } cursor-pointer`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="text-center">
          {selectedFile || uploadedFileUrl ? (
            <div className="space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-green-900/30' : 'bg-green-100'
              }`}>
                <CheckCircle className={`w-8 h-8 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {selectedFile ? 'File Uploaded Successfully' : 'Driving License Available'}
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Click to replace or drag a new file
                </p>
                {uploadedFileUrl && !selectedFile && (
                  <div className="flex justify-center mt-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = uploadedFileUrl;
                        link.download = 'driving-license';
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isDarkMode 
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : existingFileUrl ? (
            <div className="space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
              }`}>
                <FileText className={`w-8 h-8 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Existing File
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Click to replace or drag a new file
                </p>
                <div className="flex justify-center mt-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const link = document.createElement('a');
                      link.href = existingFileUrl;
                      link.download = 'driving-license';
                      link.style.display = 'none';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                    }`}
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                error || uploadError
                  ? isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                  : isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                {error || uploadError ? (
                  <AlertTriangle className={`w-8 h-8 ${
                    isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`} />
                ) : (
                  <Upload className={`w-8 h-8 ${
                    isDarkMode ? 'text-white' : 'text-slate-500'
                  }`} />
                )}
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Upload Driving License *
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  Drag and drop your file here, or click to browse
                </p>
                <p className={`text-xs mt-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  Supported formats: JPG, PNG, PDF • Max size: {maxFileSize}MB
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(error || uploadError) && (
        <div className={`p-3 rounded-lg border ${
          isDarkMode 
            ? 'bg-red-900/20 border-red-800/50 text-red-300' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{error || uploadError}</span>
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <Card className={`${
          isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedFile.type.startsWith('image/')
                    ? isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                    : isDarkMode ? 'bg-slate-600' : 'bg-slate-200'
                }`}>
                  {getFileIcon(selectedFile.type)}
                </div>
                <div>
                  <h4 className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {selectedFile.name}
                  </h4>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-slate-500'
                  }`}>
                    {formatFileSize(selectedFile.size)} • {selectedFile.type.split('/')[1].toUpperCase()}
                  </p>
                  {isUploading && (
                    <p className={`text-xs ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Uploading...
                    </p>
                  )}
                  {uploadedFileUrl && !isUploading && (
                    <p className={`text-xs ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      ✓ Uploaded successfully
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {preview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(preview, '_blank');
                    }}
                    className={`${
                      isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className={`text-red-600 hover:text-red-700 ${
                    isDarkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-50'
                  }`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <div className={`p-4 rounded-lg border ${
        isDarkMode 
          ? 'bg-blue-900/20 border-blue-800/50' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start gap-3">
          <Shield className={`w-5 h-5 mt-0.5 ${
            isDarkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <div>
            <h4 className={`font-medium text-sm ${
              isDarkMode ? 'text-blue-300' : 'text-blue-800'
            }`}>
              Security & Privacy Notice
            </h4>
            <p className={`text-xs mt-1 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-700'
            }`}>
              Your driving license information is encrypted and stored securely. We only use this information 
              for identity verification and test drive authorization purposes in compliance with GDPR regulations.
            </p>
          </div>
        </div>
      </div>

      {/* File Viewer */}
      <FileViewer
        fileUrl={currentFileUrl}
        fileName={currentFileName}
        isOpen={fileViewerOpen}
        onClose={() => setFileViewerOpen(false)}
      />
    </div>
  );
}
