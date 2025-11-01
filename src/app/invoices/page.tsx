'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Search,
  FileText,
  Calendar,
  User,
  Car,
  PoundSterling,
  Loader2,
  RefreshCw,
  Edit3,
  Download,
  Trash2,
  CheckCircle2,
  X
} from 'lucide-react';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';

interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  stockId: string;
  customerName: string;
  vehicleRegistration: string;
  saleType: string;
  invoiceType: string;
  invoiceTo?: string;
  totalAmount: string;
  remainingBalance?: string;
  isPaid?: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [togglingPaidId, setTogglingPaidId] = useState<string | null>(null);

  // Load saved invoices
  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/invoices/list');
      const result = await response.json();

      if (result.success) {
        setInvoices(result.invoices);
      } else {
        throw new Error(result.error || 'Failed to load invoices');
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Filter invoices based on search
  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.customerName.toLowerCase().includes(searchLower) ||
      invoice.vehicleRegistration.toLowerCase().includes(searchLower)
    );
  });

  // Open invoice in editor
  const openInvoice = (invoice: SavedInvoice) => {
    // Create temporary storage for the invoice ID
    const tempId = `invoice_${invoice.id}_${Date.now()}`;
    sessionStorage.setItem(tempId, invoice.id);
    
    // Navigate to dynamic editor with the temp ID
    router.push(`/dynamic-invoice-editor?tempId=${tempId}&invoiceId=${invoice.id}`);
  };

  // Download PDF for invoice
  const downloadInvoicePDF = async (invoice: SavedInvoice) => {
    setDownloadingInvoiceId(invoice.id);
    try {
      // First, get the full invoice data
      const response = await fetch(`/api/invoices/${invoice.id}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch invoice data');
      }
      
      const invoiceData = result.invoice;
      
      // Generate PDF using the same API as dynamic editor
      const pdfResponse = await fetch('/api/dynamic-invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob();
        const url = URL.createObjectURL(blob);
        
        // Create filename: VehicleReg-FirstName-LastName with fallbacks (matching dynamic invoice editor)
        const vehicleReg = invoiceData.vehicle?.registration || 'VEHICLE';
        const firstName = invoiceData.customer?.firstName || 'Customer';
        const lastName = invoiceData.customer?.lastName || 'Name';
        const filename = `${vehicleReg}-${firstName}-${lastName}.pdf`;
        
        // Download the PDF
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        // Show success feedback
        console.log('✅ PDF downloaded successfully:', filename);
      } else {
        const errorData = await pdfResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${pdfResponse.status}: ${pdfResponse.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      alert(`❌ Failed to download PDF\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`);
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  // Toggle paid status
  const togglePaidStatus = async (invoice: SavedInvoice, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    setTogglingPaidId(invoice.id);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPaid: !invoice.isPaid }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update payment status');
      }

      // Update the invoice in local state
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv.id === invoice.id 
            ? { ...inv, isPaid: !inv.isPaid } 
            : inv
        )
      );
      
      console.log('✅ Payment status updated:', invoice.invoiceNumber);

    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      alert(`❌ Failed to update payment status\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`);
    } finally {
      setTogglingPaidId(null);
    }
  };

  // Delete invoice
  const deleteInvoice = async (invoice: SavedInvoice) => {
    setDeletingInvoiceId(invoice.id);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete invoice');
      }

      // Remove the invoice from the local state
      setInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== invoice.id));
      
      // Show success message
      console.log('✅ Invoice deleted successfully:', result.deletedInvoice.invoiceNumber);

    } catch (error) {
      console.error('❌ Error deleting invoice:', error);
      alert(`❌ Failed to delete invoice\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`);
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get badge variant based on sale type
  const getSaleTypeBadgeVariant = (saleType: string) => {
    switch (saleType.toLowerCase()) {
      case 'trade': return 'secondary';
      case 'retail': return 'default';
      case 'commercial': return 'outline';
      default: return 'default';
    }
  };

  // Get invoice type label with proper formatting
  const getInvoiceTypeLabel = (invoice: SavedInvoice) => {
    const saleType = invoice.saleType?.toLowerCase();
    const invoiceTo = invoice.invoiceTo;
    
    // Retail sales - check invoiceTo
    if (saleType === 'retail') {
      if (invoiceTo === 'Finance Company') {
        return 'Finance Invoice';
      } else if (invoiceTo === 'Customer') {
        return 'Retail Customer Invoice';
      } else {
        // Fallback if invoiceTo is missing (old invoices)
        return invoice.invoiceType?.includes('Finance') ? 'Finance Invoice' : 'Retail Customer Invoice';
      }
    }
    
    // Trade sales
    if (saleType === 'trade') {
      return 'Trade Invoice';
    }
    
    // Commercial sales
    if (saleType === 'commercial') {
      return 'Commercial Invoice';
    }
    
    // Fallback
    return invoice.invoiceType || 'Invoice';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="pt-16">
        <main className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Saved Invoices
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your saved invoice documents
            </p>
          </div>

          {/* Search and Actions */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by invoice number, customer name, or registration..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={loadInvoices}
                  variant="outline"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Invoice Documents ({filteredInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={loadInvoices} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No invoices found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Paid</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Invoice Type</TableHead>
                        <TableHead>Remaining Balance</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${invoice.isPaid ? 'bg-green-100/60 dark:bg-green-900/30' : ''}`}>
                          {/* Paid Toggle - First Column */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => togglePaidStatus(invoice, e)}
                              disabled={togglingPaidId === invoice.id}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 ${
                                invoice.isPaid 
                                  ? 'bg-green-700 shadow-sm' 
                                  : 'bg-gray-200 dark:bg-gray-700'
                              } ${togglingPaidId === invoice.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {togglingPaidId === invoice.id ? (
                                <Loader2 className="h-4 w-4 absolute left-1/2 -translate-x-1/2 animate-spin text-white" />
                              ) : (
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    invoice.isPaid ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              )}
                            </button>
                          </TableCell>
                          
                          <TableCell className="font-medium">
                            INV-{invoice.vehicleRegistration}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="truncate">{invoice.customerName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-gray-400" />
                              {invoice.vehicleRegistration}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSaleTypeBadgeVariant(invoice.saleType)} className="whitespace-nowrap">
                              {getInvoiceTypeLabel(invoice)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <PoundSterling className="h-4 w-4 text-gray-400" />
                              <span className={invoice.isPaid ? 'line-through text-gray-400' : 'font-medium'}>
                                {invoice.remainingBalance || invoice.totalAmount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="h-4 w-4" />
                              {formatDate(invoice.updatedAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="h-4 w-4" />
                              {formatDate(invoice.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => openInvoice(invoice)}
                                size="sm"
                                className="flex items-center"
                              >
                                <Edit3 className="h-4 w-4 mr-1" />
                                Open
                              </Button>
                              <Button
                                onClick={() => downloadInvoicePDF(invoice)}
                                size="sm"
                                variant="outline"
                                className="flex items-center"
                                disabled={downloadingInvoiceId === invoice.id}
                              >
                                {downloadingInvoiceId === invoice.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Downloading...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                  </>
                                )}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="flex items-center"
                                    disabled={deletingInvoiceId === invoice.id}
                                  >
                                    {deletingInvoiceId === invoice.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                      </>
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete invoice <strong>{invoice.invoiceNumber}</strong> for customer <strong>{invoice.customerName}</strong>?
                                      <br /><br />
                                      This action cannot be undone and will permanently remove the invoice from your records.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteInvoice(invoice)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete Invoice
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
