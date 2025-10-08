"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, FileText, Upload, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface UploadFile {
  file: File;
  preview?: string;
  type: 'photo' | 'document';
}

export default function QRUploadPage() {
  const params = useParams();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const stockId = params.stockId as string;

  const [uploadType, setUploadType] = useState<'photo' | 'document' | null>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
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

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('stockId', stockId);
      formData.append('uploadSource', 'qr_code');

      files.forEach((fileData, index) => {
        formData.append(`file_${index}`, fileData.file);
        formData.append(`fileType_${index}`, fileData.type);
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
        setUploadStatus('success');
        setUploadMessage(`Successfully uploaded ${files.length} ${uploadType}(s)!`);
        setFiles([]);
        
        // Auto-redirect after success
        setTimeout(() => {
          router.push(`/mystock/${stockId}`);
        }, 3000);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className={`${
              isDarkMode 
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Upload Files
            </h1>
            <p className={`text-sm ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Stock ID: {stockId}
            </p>
          </div>
        </div>

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
                  <p className={`text-xs mt-1 ${
                    isDarkMode ? 'text-green-500' : 'text-green-500'
                  }`}>
                    Redirecting to vehicle details...
                  </p>
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
                className={`w-full h-20 text-lg ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Camera className="h-8 w-8 mr-3" />
                <div className="text-left">
                  <div>Photos</div>
                  <div className="text-sm opacity-80">For vehicle listings</div>
                </div>
              </Button>

              <Button
                onClick={() => setUploadType('document')}
                variant="outline"
                className={`w-full h-20 text-lg ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileText className="h-8 w-8 mr-3" />
                <div className="text-left">
                  <div>Documents</div>
                  <div className="text-sm opacity-80">For vehicle archive</div>
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
              {/* File Input */}
              <div>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept={uploadType === 'photo' ? 'image/*' : '*'}
                  onChange={handleFileSelect}
                  className="hidden"
                  {...(isMobile && uploadType === 'photo' ? { capture: 'environment' } : {})}
                />
                <label
                  htmlFor="file-upload"
                  className={`block w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDarkMode 
                      ? 'border-slate-600 hover:border-slate-500 bg-slate-700/30 hover:bg-slate-700/50' 
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-center">
                    <Upload className={`h-12 w-12 mx-auto mb-4 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                    <p className={`text-lg font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {isMobile && uploadType === 'photo' ? 'Take Photo or Choose Files' : 'Choose Files'}
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

              {/* File Preview */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <h3 className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Selected Files ({files.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {files.map((fileData, index) => (
                      <div
                        key={index}
                        className={`relative p-3 rounded-lg border ${
                          isDarkMode ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        {fileData.preview ? (
                          <img
                            src={fileData.preview}
                            alt={fileData.file.name}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className={`w-full h-24 flex items-center justify-center rounded mb-2 ${
                            isDarkMode ? 'bg-slate-600' : 'bg-slate-200'
                          }`}>
                            <FileText className={`h-8 w-8 ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`} />
                          </div>
                        )}
                        <p className={`text-xs truncate ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          {fileData.file.name}
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
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
