"use client";

import { useState, useEffect } from 'react';
import { ComprehensiveInvoiceData } from "@/app/api/invoice-data/route";

interface InvoicePDFPreviewWrapperProps {
  invoiceData: ComprehensiveInvoiceData;
  className?: string;
}

export default function InvoicePDFPreviewWrapper(props: InvoicePDFPreviewWrapperProps) {
  const [Component, setComponent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        const module = await import('./InvoicePDFPreview');
        setComponent(() => module.default);
        setLoading(false);
      } catch (err) {
        console.error('Error loading InvoicePDFPreview:', err);
        setError('Failed to load PDF preview');
        setLoading(false);
      }
    };

    loadComponent();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !Component) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600">Error loading PDF preview</p>
          <p className="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return <Component {...props} />;
}
