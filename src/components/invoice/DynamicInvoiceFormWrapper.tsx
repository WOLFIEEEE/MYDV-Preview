"use client";

import { useState, useEffect } from 'react';
import { ComprehensiveInvoiceData } from "@/app/api/invoice-data/route";

interface DynamicInvoiceFormWrapperProps {
  invoiceData: ComprehensiveInvoiceData;
  onUpdate: (updates: Partial<ComprehensiveInvoiceData>) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DynamicInvoiceFormWrapper(props: DynamicInvoiceFormWrapperProps) {
  const [Component, setComponent] = useState<React.ComponentType<DynamicInvoiceFormWrapperProps> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        const dynamicModule = await import('./DynamicInvoiceForm');
        setComponent(() => dynamicModule.default);
        setLoading(false);
      } catch (err) {
        console.error('Error loading DynamicInvoiceForm:', err);
        setError('Failed to load invoice form');
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
          <p className="text-red-600">Error loading invoice form</p>
          <p className="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return <Component {...props} />;
}
