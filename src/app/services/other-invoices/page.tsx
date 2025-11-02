"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Download,
  Calendar
} from 'lucide-react';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import InvoiceGeneratorModal from '@/components/settings/AddInvoiceModal';

interface CustomInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  invoiceTitle?: string;
  invoiceType: 'purchase' | 'standard';
  customerName?: string;
  customerEmail?: string;
  total: string | number; // Database returns decimal as string
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export default function OtherInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<CustomInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch invoices
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/custom-invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      } else {
        console.error('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    setIsOpen(true)
    // router.push('/store-owner/settings?tab=invoice-generator');
  };

  const handleEditInvoice = async (invoiceId: string) => {
    try {
      // Fetch the invoice data
      const response = await fetch(`/api/custom-invoices/${invoiceId}`);
      if (response.ok) {
        const { invoice } = await response.json();
        
        // Store the invoice data in sessionStorage for the preview page
        sessionStorage.setItem('invoicePreviewData', JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          invoiceTitle: invoice.invoiceTitle || 'INVOICE',
          invoiceType: invoice.invoiceType || 'standard',
          
          // Customer data
          customer: {
            name: invoice.customerName || '',
            email: invoice.customerEmail || '',
            phone: invoice.customerPhone || '',
            address: invoice.customerAddress || {}
          },
          
          // Company info
          company: invoice.companyInfo || {},
          
          // Vehicle info
          vehicle: invoice.vehicleInfo || {},
          
          // Delivery address (for purchase invoices)
          deliveryAddress: invoice.deliveryAddress || {},
          
          // Invoice items
          items: invoice.items || [],
          
          // Financial data
          subtotal: invoice.subtotal || 0,
          vatRate: invoice.vatRate || 20,
          vatAmount: invoice.vatAmount || 0,
          total: invoice.total || 0,
          vatMode: invoice.vatMode || 'global',
          discountMode: invoice.discountMode || 'global',
          globalDiscountType: invoice.globalDiscountType || 'percentage',
          globalDiscountValue: invoice.globalDiscountValue || 0,
          globalDiscountAmount: invoice.globalDiscountAmount || 0,
          totalDiscount: invoice.totalDiscount || 0,
          subtotalAfterDiscount: invoice.subtotalAfterDiscount || 0,
          
          // Payment data
          paymentStatus: invoice.paymentStatus || 'unpaid',
          payments: invoice.payments || [],
          paidAmount: invoice.paidAmount || 0,
          outstandingBalance: invoice.outstandingBalance || 0,
          
          // Additional info
          notes: invoice.notes || '',
          terms: invoice.terms || '',
          paymentInstructions: invoice.paymentInstructions || '',
          
          // Mark as editing existing invoice
          isEditing: true,
          editingInvoiceId: invoiceId
        }));
        
        // Redirect to invoice preview page
        router.push('/store-owner/settings/invoice-preview');
      } else {
        alert('Failed to load invoice data');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Error loading invoice data');
    }
  };

  const handleDownloadPDF = (invoiceId: string) => {
    // TODO: Implement PDF download functionality
    console.log('Download PDF:', invoiceId);
  };

  // Filter invoices based on search query
  const filteredInvoices = invoices.filter(invoice => 
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="pt-16">
        <main className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                  <FileText className="h-8 w-8 text-blue-600" />
                  Other Invoices
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your custom invoices created with the invoice generator
                </p>
              </div>
              <button
                onClick={handleCreateInvoice}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery
                    ? 'No invoices match your search query.'
                    : 'Get started by creating your first custom invoice.'}
                </p>
                <button
                  onClick={handleCreateInvoice}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {invoice.invoiceNumber}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {invoice.invoiceTitle}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {invoice.customerName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.customerEmail || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.invoiceType === 'purchase' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {invoice.invoiceType === 'purchase' ? 'Purchase' : 'Standard'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          £{Number(invoice.total || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleEditInvoice(invoice.id)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1 rounded-md border border-blue-200 hover:border-blue-300 transition-colors"
                              title="Edit Invoice"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="text-sm">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(invoice.id)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 px-3 py-1 rounded-md border border-green-200 hover:border-green-300 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                              <span className="text-sm">Download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <InvoiceGeneratorModal dealerId="" isOpen={isOpen} onClose={() => setIsOpen(false)} />
      
      <Footer />
    </div>
  );
}
