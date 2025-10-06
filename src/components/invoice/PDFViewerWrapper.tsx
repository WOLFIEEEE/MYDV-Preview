"use client";

import { useState, useEffect } from 'react';

interface PDFViewerWrapperProps {
  invoiceData: any;
}

export default function PDFViewerWrapper({ invoiceData }: PDFViewerWrapperProps) {
  const [PDFViewer, setPDFViewer] = useState<any>(null);
  const [InvoicePDFDocument, setInvoicePDFDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        const [pdfModule, documentModule] = await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/invoice/InvoicePDFDocument')
        ]);

        setPDFViewer(() => pdfModule.PDFViewer);
        setInvoicePDFDocument(() => documentModule.default);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF components:', err);
        setError('Failed to load PDF viewer');
        setLoading(false);
      }
    };

    loadComponents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF preview...</p>
        </div>
      </div>
    );
  }

  if (error || !PDFViewer || !InvoicePDFDocument) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600">Error loading PDF preview</p>
          <p className="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <PDFViewer width="100%" height="100%" showToolbar={true}>
      <InvoicePDFDocument invoiceData={invoiceData} />
    </PDFViewer>
  );
}
