'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Filter, 
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
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
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

function DocumentsContent() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [registrationFilter, setRegistrationFilter] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const itemsPerPage = 20;

  // Load documents and categories
  useEffect(() => {
    if (isSignedIn && isLoaded) {
      loadDocuments();
      loadCategories();
    }
  }, [currentPage, searchTerm, registrationFilter, documentTypeFilter, statusFilter, isSignedIn, isLoaded]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        status: statusFilter
      });

      if (searchTerm) params.append('search', searchTerm);
      if (registrationFilter) params.append('registration', registrationFilter);
      if (documentTypeFilter && documentTypeFilter !== 'all') params.append('documentType', documentTypeFilter);

      const response = await fetch(`/api/vehicle-documents?${params}`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data.documents);
        setTotalPages(data.data.pagination.totalPages);
        setTotalDocuments(data.data.pagination.total);
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

  // Show loading state if not loaded
  if (!isLoaded) {
    return (
      <>
        <div className={`min-h-screen transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <Header />
          <div className="pt-16 flex items-center justify-center min-h-screen">
            <Card className={`w-full max-w-md ${
              isDarkMode 
                ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm' 
                : 'bg-white/80 border-slate-200/50 backdrop-blur-sm'
            }`}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`} />
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                    Checking authentication...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <>
        <div className={`min-h-screen transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
        }`}>
          <Header />
          <div className="pt-16 flex items-center justify-center min-h-screen">
            <Card className={`w-full max-w-md ${
              isDarkMode 
                ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm' 
                : 'bg-white/80 border-slate-200/50 backdrop-blur-sm'
            }`}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className={`w-12 h-12 mx-auto mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`} />
                  <h2 className={`text-xl font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Access Document Archive
                  </h2>
                  <p className={`text-sm mb-6 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                    Please sign in to manage your vehicle documents
                  </p>
                  <Button onClick={() => router.push('/sign-in')} className="w-full">
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className={`min-h-screen transition-all duration-500 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
          : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
      }`}>
        <Header />
        
        <div className="pt-16">
          {/* Page Header */}
          <section className="py-8 sm:py-12">
            <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg ${
                    isDarkMode ? 'shadow-blue-500/20' : 'shadow-blue-500/30'
                  }`}>
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className={`text-3xl sm:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Document Archive
                      </h1>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'} mt-1`}>
                      Manage and organize all your vehicle documentation
                    </p>
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
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 px-6 py-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Documents
                  </Button>
                </div>
              </div>

              {/* Stats Card */}
              <div className="mb-8">
                <Card className={`${
                  isDarkMode 
                    ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm' 
                    : 'bg-white/80 border-slate-200/50 backdrop-blur-sm'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center ${
                          isDarkMode ? 'shadow-blue-500/20' : 'shadow-blue-500/30'
                        }`}>
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {totalDocuments}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                            Total Documents
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
          
          {/* Main Content */}
          <section>
            <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 pb-8">
              {/* Filters */}
              <Card className={`mb-8 ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm' 
                  : 'bg-white/80 border-slate-200/50 backdrop-blur-sm'
              }`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <Filter className="w-5 h-5" />
                    Search & Filter Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="search">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Search documents..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="registration">Registration</Label>
                      <Input
                        id="registration"
                        placeholder="Vehicle registration"
                        value={registrationFilter}
                        onChange={(e) => setRegistrationFilter(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="document-type">Document Type</Label>
                      <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.categoryName}>
                              {category.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions Bar */}
              {selectedDocuments.size > 0 && (
                <div className="flex items-center gap-4 mb-4 p-4 bg-muted rounded-lg">
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

              {/* Documents Table */}
              <Card className={`${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm' 
                  : 'bg-white/80 border-slate-200/50 backdrop-blur-sm'
              }`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <FileText className="w-5 h-5" />
                    Documents ({totalDocuments})
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                          <TableHead className="font-semibold text-center">Registration</TableHead>
                          <TableHead className="font-semibold text-center">Type</TableHead>
                          <TableHead className="font-semibold text-center">Size</TableHead>
                          <TableHead className="font-semibold text-center">Uploaded</TableHead>
                          <TableHead className="font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="flex items-center justify-center">
                                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                                Loading documents...
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : documents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="text-center">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium mb-2">No documents found</h3>
                                <p className="text-muted-foreground">Upload some documents to get started</p>
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
                                <LicensePlate 
                                  registration={doc.registration} 
                                  size="lg"
                                />
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
                                        // Create a link that points directly to our download endpoint
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalDocuments)} of {totalDocuments} documents
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
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
                uploadSource="manual"
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
      
      <Footer />
    </>
  );
}

export default function DocumentsPage() {
  return <DocumentsContent />;
}