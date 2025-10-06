'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  Image, 
  File,
  Plus,
  RefreshCw,
  X
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import DocumentUpload from '@/components/shared/DocumentUpload';
import LicensePlate from '@/components/ui/license-plate';

interface VehicleDocument {
  id: string;
  dealerId: string;
  stockId?: string;
  registration: string;
  documentName: string;
  documentType: string;
  description?: string;
  fileName: string;
  supabaseFileName: string;
  publicUrl: string;
  fileSize: number;
  mimeType: string;
  tags?: string[];
  isRequired: boolean;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  expiryDate?: string;
  documentDate?: string;
  uploadedBy: string;
  uploadSource: string;
  status: string;
  visibility: string;
  metadata?: any;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentCategory {
  id: string;
  dealerId?: string;
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

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockId: string;
  registration: string;
  vehicleTitle?: string;
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  stockId,
  registration,
  vehicleTitle = 'Vehicle'
}: DocumentViewerModalProps) {
  const { isDarkMode } = useTheme();
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Load documents when modal opens
  useEffect(() => {
    if (isOpen && stockId) {
      loadDocuments();
      loadCategories();
    }
  }, [isOpen, stockId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        stockId: stockId,
        status: 'active'
      });

      const response = await fetch(`/api/vehicle-documents?${params}`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data.documents);
      } else {
        console.error('Error loading documents:', data.message);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/document-categories?activeOnly=true');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data.categories);
      } else {
        console.error('Error loading categories:', data.message);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const response = await fetch('/api/vehicle-documents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocuments)
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('Documents deleted successfully:', data.message);
        setSelectedDocuments(new Set());
        setShowDeleteDialog(false);
        loadDocuments();
      } else {
        console.error('Failed to delete documents:', data.message);
        alert(`Failed to delete documents: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting documents:', error);
      alert('An error occurred while deleting documents. Please try again.');
    }
  };

  const handleSelectDocument = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedDocuments);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getCategoryDisplayName = (categoryName: string) => {
    const category = categories.find(cat => cat.categoryName === categoryName);
    return category?.displayName || categoryName;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-6xl max-h-[90vh] rounded-lg shadow-xl flex flex-col ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Vehicle Documents
            </h2>
            <div className="flex items-center gap-3">
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {vehicleTitle}
              </p>
              <LicensePlate registration={registration} size="md" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={loadDocuments}
              variant="outline"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Documents
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className={`px-6 py-4 border-b ${
          isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <FileText className="w-5 h-5" />
              <span className="text-sm">
                <strong className="font-bold">{documents.length}</strong> Documents
              </span>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        {selectedDocuments.size > 0 && (
          <div className={`px-6 py-3 border-b flex items-center gap-4 ${
            isDarkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <span className="text-sm font-medium">
              {selectedDocuments.size} document(s) selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2">
                  <TableHead className="w-12 font-semibold">
                    <Checkbox
                      checked={documents.length > 0 && selectedDocuments.size === documents.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-left">Document</TableHead>
                  <TableHead className="font-semibold text-center">Type</TableHead>
                  <TableHead className="font-semibold text-center">Size</TableHead>
                  <TableHead className="font-semibold text-center">Uploaded</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        Loading documents...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">No documents found</h3>
                        <p className="text-muted-foreground mb-4">Upload documents for this vehicle to get started</p>
                        <Button
                          onClick={() => setShowUploadDialog(true)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Documents
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50 transition-colors duration-200">
                      <TableCell className="py-4">
                        <Checkbox
                          checked={selectedDocuments.has(doc.id)}
                          onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                            {getFileIcon(doc.mimeType)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{doc.documentName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{doc.fileName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge variant="secondary" className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                          {getCategoryDisplayName(doc.documentType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span className="text-sm font-medium px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/vehicle-documents/${doc.id}/download`);
                                const data = await response.json();
                                if (data.success) {
                                  window.open(data.data.downloadUrl, '_blank');
                                } else {
                                  console.error('Failed to get download URL:', data.message);
                                }
                              } catch (error) {
                                console.error('Error opening document:', error);
                              }
                            }}
                            title="View Document"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200"
                            onClick={async () => {
                              try {
                                const link = document.createElement('a');
                                link.href = `/api/vehicle-documents/${doc.id}/download-file`;
                                link.download = doc.fileName;
                                link.style.display = 'none';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              } catch (error) {
                                console.error('Error downloading document:', error);
                              }
                            }}
                            title="Download Document"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Documents</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedDocuments.size} document(s)? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSelected}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upload Dialog */}
        {showUploadDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Upload Documents</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadDialog(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <DocumentUpload
                registration={registration}
                stockId={stockId}
                uploadSource="add_to_stock"
                onUploadComplete={(documents) => {
                  console.log('Documents uploaded:', documents);
                  setShowUploadDialog(false);
                  loadDocuments();
                }}
                onUploadError={(error) => {
                  console.error('Upload error:', error);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

