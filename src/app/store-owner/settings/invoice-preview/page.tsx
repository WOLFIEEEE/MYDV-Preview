"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Download, 
  Plus, 
  X, 
  FileText,
  Eye
} from "lucide-react";
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';

// Dynamically import PDF viewer wrapper to avoid SSR issues
const PDFViewerWrapper = dynamic(
  () => import('@/components/invoice/PDFViewerWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF preview...</p>
        </div>
      </div>
    )
  }
);

interface InvoiceItem {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  discount?: number | string; // Discount percentage (0-100)
  discountAmount?: number; // Calculated discount amount
  vatRate?: number | string; // Individual VAT rate (0-100)
  vatAmount?: number; // Calculated VAT amount for this item
  total: number;
  totalWithVat?: number; // Total including VAT for this item
}

interface Vehicle {
  stockId?: string;
  registration?: string;
  make?: string;
  model?: string;
  derivative?: string;
  year?: number;
  yearOfManufacture?: number;
  fuelType?: string;
  bodyType?: string;
  price?: number;
  forecourtPriceGBP?: number;
  mileage?: number;
  odometerReadingMiles?: number;
  vin?: string;
  colour?: string;
  displayName?: string;
}

interface Customer {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  displayName?: string;
  fullName?: string;
}

interface Business {
  id?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  companyNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  status?: string;
  notes?: string;
  businessSource?: string;
  preferredContactMethod?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

interface CompanyInfo {
  companyName?: string;
  companyLogo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  vatNumber?: string;
  companyNumber?: string;
  description?: string;
  // Payment information
  bankName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankIban?: string;
  bankSwiftCode?: string;
}

interface PaymentEntry {
  id: string;
  type: 'Card' | 'BACS' | 'Cash';
  amount: number | string;
  date: string;
  reference?: string;
}

interface DeliveryAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

interface InvoicePreviewData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceTitle?: string; // Make invoice title editable
  invoiceType?: 'purchase' | 'standard'; // Invoice type
  recipientType?: 'customer' | 'business' | 'myself'; // Recipient type
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number; // Global VAT rate (used when vatMode is 'global')
  vatAmount: number;
  total: number;
  vatMode: 'global' | 'individual'; // VAT calculation mode
  discountMode?: 'global' | 'individual'; // Discount calculation mode
  globalDiscountType?: 'percentage' | 'fixed'; // Global discount type
  globalDiscountValue?: number; // Global discount value
  globalDiscountAmount?: number; // Calculated global discount amount
  totalDiscount?: number; // Total discount amount
  subtotalAfterDiscount?: number; // Subtotal after discount
  paymentStatus?: 'unpaid' | 'partial' | 'paid'; // Payment status
  paymentType?: 'none' | 'percentage' | 'fixed'; // Payment amount type
  paymentValue?: number; // Payment amount or percentage
  paidAmount?: number; // Calculated paid amount
  outstandingBalance?: number; // Remaining balance
  payments?: PaymentEntry[]; // Multiple payment entries
  deliveryAddress?: DeliveryAddress; // Delivery address for purchase orders
  notes: string;
  terms: string;
  paymentInstructions: string;
  companyInfo: CompanyInfo | null;
  vehicle: Vehicle | null;
  customer: Customer | Business | null; // This can now hold customer or business data
}

export default function InvoicePreviewPage() {
  const router = useRouter();
  const [invoiceData, setInvoiceData] = useState<InvoicePreviewData | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const companyInfoLoaded = useRef(false);

  useEffect(() => {
    // Load invoice data from sessionStorage
    const storedData = sessionStorage.getItem('invoicePreviewData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log("🚀 ~ InvoicePreviewPage ~ parsedData:", parsedData)
        
        // Ensure numeric values are properly converted
        const sanitizedData = {
          ...parsedData,
          recipientType: parsedData.recipientType || 'customer', // Default to customer if not specified
          customer: {
            displayName: parsedData.customer?.displayName || parsedData.customer?.businessName || '',
            ...parsedData.customer,
          },
          items: parsedData.items?.map((item: InvoiceItem) => ({
            ...item,
            quantity: item.quantity === 0 || item.quantity === '0' ? '' : (item.quantity || ''),
            unitPrice: item.unitPrice === 0 || item.unitPrice === '0' ? '' : (item.unitPrice || ''),
            discount: item.discount === 0 || item.discount === '0' ? '' : (item.discount || ''),
            discountAmount: Number(item.discountAmount) || 0,
            vatRate: item.vatRate === 0 || item.vatRate === '0' ? 20 : (item.vatRate || 20), // Default to 20% VAT for individual items
            vatAmount: Number(item.vatAmount) || 0,
            total: Number(item.total) || 0,
            totalWithVat: Number(item.totalWithVat) || 0
          })) || [],
          payments: parsedData.payments?.map((payment: PaymentEntry) => ({
            ...payment,
            amount: payment.amount === 0 || payment.amount === '0' ? '' : (payment.amount || '')
          })) || [],
          subtotal: Number(parsedData.subtotal) || 0,
          vatRate: Number(parsedData.vatRate) || 20,
          vatAmount: Number(parsedData.vatAmount) || 0,
          total: Number(parsedData.total) || 0,
          vatMode: parsedData.vatMode || 'global', // Default to global VAT mode
          discountMode: parsedData.discountMode || 'global', // Default to global discount mode
          globalDiscountType: parsedData.globalDiscountType || 'percentage',
          globalDiscountValue: Number(parsedData.globalDiscountValue) || 0,
          globalDiscountAmount: Number(parsedData.globalDiscountAmount) || 0,
          totalDiscount: Number(parsedData.totalDiscount) || 0,
          subtotalAfterDiscount: Number(parsedData.subtotalAfterDiscount) || 0,
          paymentStatus: parsedData.paymentStatus || 'unpaid',
          paymentType: parsedData.paymentType || 'none',
          paymentValue: Number(parsedData.paymentValue) || 0,
          paidAmount: Number(parsedData.paidAmount) || 0,
          outstandingBalance: Number(parsedData.outstandingBalance) || 0
        };
        
        // Auto-add payment entry if payment status is partial/paid but no payments exist
        if ((sanitizedData.paymentStatus === 'partial' || sanitizedData.paymentStatus === 'paid') && 
            (!sanitizedData.payments || sanitizedData.payments.length === 0)) {
          const newPayment = {
            id: Date.now().toString(),
            type: 'Cash' as const,
            amount: '',
            date: new Date().toISOString().split('T')[0],
            reference: ''
          };
          sanitizedData.payments = [newPayment];
        }
        
        setInvoiceData(sanitizedData);
      } catch (error) {
        console.error('Error parsing invoice data:', error);
        router.push('/store-owner/settings');
      }
    } else {
      // No data found, redirect back to settings
      router.push('/store-owner/settings');
    }
  }, [router]);

  // Load company info if not available
  useEffect(() => {
    const loadCompanyInfo = async () => {
      if (invoiceData && (!invoiceData.companyInfo || !invoiceData.companyInfo.companyName) && !companyInfoLoaded.current) {
        companyInfoLoaded.current = true;
        try {
          const response = await fetch('/api/invoice-company-info');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.companyInfo) {
              setInvoiceData(prev => prev ? {
                ...prev,
                companyInfo: data.companyInfo
              } : null);
            }
          }
        } catch (error) {
          console.error('Error loading company info:', error);
        }
      }
    };

    if (invoiceData) {
      loadCompanyInfo();
    }
  }, [invoiceData]);

  const updateInvoiceData = (field: string, value: string | number) => {
    if (!invoiceData) return;
    
    setInvoiceData(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  const updateCompanyInfo = (field: keyof CompanyInfo, value: string | number) => {
    if (!invoiceData) return;
    
    setInvoiceData(prev => ({
      ...prev!,
      companyInfo: {
        ...prev!.companyInfo,
        [field]: value
      }
    }));
  };

  const updateCustomerInfo = (field: string, value: string | number) => {
    if (!invoiceData) return;
    
    setInvoiceData(prev => ({
      ...prev!,
      customer: {
        ...prev!.customer,
        [field]: value
      }
    }));
  };

  const updateVehicleInfo = (field: keyof Vehicle, value: string | number) => {
    if (!invoiceData) return;
    
    setInvoiceData(prev => ({
      ...prev!,
      vehicle: {
        ...prev!.vehicle,
        [field]: value
      }
    }));
  };

  const updateVatRate = (newVatRate: number) => {
    if (!invoiceData) return;
    
    if (invoiceData.vatMode === 'global') {
      const subtotal = invoiceData.subtotal;
      const vatAmount = subtotal * (newVatRate / 100);
      const total = subtotal + vatAmount;
      
      setInvoiceData(prev => ({
        ...prev!,
        vatRate: newVatRate,
        vatAmount,
        total
      }));
    } else {
      // In individual mode, update all items to use the new VAT rate
      const updatedItems = invoiceData.items.map(item => {
        const itemTotal = item.total; // Already includes discount
        const itemVatAmount = itemTotal * (newVatRate / 100);
        const itemTotalWithVat = itemTotal + itemVatAmount;
        
        return {
          ...item,
          vatRate: newVatRate,
          vatAmount: itemVatAmount,
          totalWithVat: itemTotalWithVat
        };
      });
      
      const subtotal = updatedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      const totalVatAmount = updatedItems.reduce((sum, item) => sum + (Number(item.vatAmount) || 0), 0);
      const total = subtotal + totalVatAmount;
      
      setInvoiceData(prev => ({
        ...prev!,
        vatRate: newVatRate,
        items: updatedItems,
        subtotal,
        vatAmount: totalVatAmount,
        total
      }));
    }
  };

  const toggleVatMode = () => {
    if (!invoiceData) return;
    
    const newVatMode = invoiceData.vatMode === 'global' ? 'individual' : 'global';
    
    if (newVatMode === 'individual') {
      // Convert to individual VAT mode - apply current global VAT rate to all items
      const updatedItems = invoiceData.items.map(item => {
        const itemTotal = item.total; // Already includes discount
        const itemVatAmount = itemTotal * (invoiceData.vatRate / 100);
        const itemTotalWithVat = itemTotal + itemVatAmount;
        
        return {
          ...item,
          vatRate: item.vatRate || invoiceData.vatRate,
          vatAmount: itemVatAmount,
          totalWithVat: itemTotalWithVat
        };
      });
      
      const subtotal = updatedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      const totalVatAmount = updatedItems.reduce((sum, item) => sum + (Number(item.vatAmount) || 0), 0);
      const total = subtotal + totalVatAmount;
      
      setInvoiceData(prev => ({
        ...prev!,
        vatMode: newVatMode,
        items: updatedItems,
        subtotal,
        vatAmount: totalVatAmount,
        total
      }));
    } else {
      // Convert to global VAT mode - recalculate using global VAT rate
      const subtotal = invoiceData.subtotal;
      const vatAmount = subtotal * (invoiceData.vatRate / 100);
      const total = subtotal + vatAmount;
      
      setInvoiceData(prev => ({
        ...prev!,
        vatMode: newVatMode,
        vatAmount,
        total
      }));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    if (!invoiceData) return;
    
    const updatedItems = [...invoiceData.items];
    
    // Ensure numeric fields are properly converted
    let processedValue = value;
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'vatRate') {
      processedValue = Number(value) || 0;
    }
    
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: processedValue
    };
    
    // Recalculate total for the item
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'vatRate') {
      const quantity = Number(updatedItems[index].quantity) || 1;
      const unitPrice = Number(updatedItems[index].unitPrice) || 0;
      const discount = Number(updatedItems[index].discount) || 0;
      const itemVatRate = Number(updatedItems[index].vatRate) || 0;
      
      // Calculate subtotal before discount
      const itemSubtotal = quantity * unitPrice;
      
      // Calculate discount amount
      const discountAmount = itemSubtotal * (discount / 100);
      updatedItems[index].discountAmount = discountAmount;
      
      // Calculate final total after discount (but before VAT)
      const itemTotal = itemSubtotal - discountAmount;
      updatedItems[index].total = itemTotal;
      
      // Calculate VAT for individual items if in individual mode
      if (invoiceData.vatMode === 'individual') {
        const itemVatAmount = itemTotal * (itemVatRate / 100);
        updatedItems[index].vatAmount = itemVatAmount;
        updatedItems[index].totalWithVat = itemTotal + itemVatAmount;
      }
    }
    
    // Recalculate invoice totals
    const subtotal = updatedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    let vatAmount: number;
    let total: number;
    
    if (invoiceData.vatMode === 'individual') {
      // Sum up individual VAT amounts
      vatAmount = updatedItems.reduce((sum, item) => sum + (Number(item.vatAmount) || 0), 0);
      total = subtotal + vatAmount;
    } else {
      // Use global VAT rate
      const vatRate = Number(invoiceData.vatRate) || 0;
      vatAmount = subtotal * (vatRate / 100);
      total = subtotal + vatAmount;
    }
    
    setInvoiceData(prev => ({
      ...prev!,
      items: updatedItems,
      subtotal,
      vatAmount,
      total
    }));
  };

  const addItem = () => {
    if (!invoiceData) return;
    
    const newItem: InvoiceItem = {
      description: '',
      quantity: '', // Use empty string as placeholder for easier editing
      unitPrice: '', // Use empty string as placeholder for easier editing
      discount: '', // Use empty string as placeholder for easier editing
      discountAmount: 0,
      vatRate: invoiceData.vatRate || 20, // Default to current global VAT rate
      vatAmount: 0,
      total: 0,
      totalWithVat: 0
    };
    
    setInvoiceData(prev => ({
      ...prev!,
      items: [...prev!.items, newItem]
    }));
  };

  const removeItem = (index: number) => {
    if (!invoiceData || invoiceData.items.length <= 1) return;
    
    const updatedItems = invoiceData.items.filter((_, i) => i !== index);
    const subtotal = updatedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    let vatAmount: number;
    let total: number;
    
    if (invoiceData.vatMode === 'individual') {
      // Sum up individual VAT amounts
      vatAmount = updatedItems.reduce((sum, item) => sum + (Number(item.vatAmount) || 0), 0);
      total = subtotal + vatAmount;
    } else {
      // Use global VAT rate
      const vatRate = Number(invoiceData.vatRate) || 0;
      vatAmount = subtotal * (vatRate / 100);
      total = subtotal + vatAmount;
    }
    
    setInvoiceData(prev => ({
      ...prev!,
      items: updatedItems,
      subtotal,
      vatAmount,
      total
    }));
  };

  // Payment management functions
  const addPayment = () => {
    if (!invoiceData) return;
    
    const newPayment: PaymentEntry = {
      id: Date.now().toString(),
      type: 'Cash',
      amount: '', // Use empty string as placeholder for easier editing
      date: new Date().toISOString().split('T')[0],
      reference: ''
    };
    
    setInvoiceData(prev => ({
      ...prev!,
      payments: [...(prev!.payments || []), newPayment]
    }));
  };

  const updatePayment = (id: string, field: keyof PaymentEntry, value: string | number) => {
    if (!invoiceData) return;
    
    const updatedPayments = (invoiceData.payments || []).map(payment => 
      payment.id === id ? { ...payment, [field]: value } : payment
    );
    
    setInvoiceData(prev => ({
      ...prev!,
      payments: updatedPayments
    }));
  };

  const removePayment = (id: string) => {
    if (!invoiceData) return;
    
    const updatedPayments = (invoiceData.payments || []).filter(payment => payment.id !== id);
    
    setInvoiceData(prev => ({
      ...prev!,
      payments: updatedPayments
    }));
  };

  // Delivery address management function
  const updateDeliveryAddress = (field: keyof DeliveryAddress, value: string | number) => {
    if (!invoiceData) return;
    
    setInvoiceData(prev => ({
      ...prev!,
      deliveryAddress: {
        ...prev!.deliveryAddress,
        [field]: value
      }
    }));
  };

  const saveInvoiceToDatabase = async () => {
    if (!invoiceData) return;

    try {
      // Prepare customer data based on recipient type
      let customerName = '';
      let customerEmail = '';
      let customerPhone = '';
      let customerAddress = null;

      if (invoiceData.recipientType === 'customer') {
        const customer = invoiceData.customer as Customer;
        if (customer?.firstName && customer?.lastName) {
          customerName = `${customer.firstName} ${customer.lastName}`.trim();
        }
        customerEmail = customer?.email || '';
        customerPhone = customer?.phone || '';
        customerAddress = customer ? {
          addressLine1: customer.addressLine1,
          addressLine2: customer.addressLine2,
          city: customer.city,
          county: customer.county,
          postcode: customer.postcode,
          country: customer.country
        } : null;
      } else if (invoiceData.recipientType === 'business') {
        const business = invoiceData.customer as Business;
        customerName = business?.businessName || '';
        customerEmail = business?.email || '';
        customerPhone = business?.phone || '';
        customerAddress = business ? {
          addressLine1: business.addressLine1,
          addressLine2: business.addressLine2,
          city: business.city,
          county: business.county,
          postcode: business.postcode,
          country: business.country
        } : null;
      } else if (invoiceData.recipientType === 'myself') {
        customerName = invoiceData.companyInfo?.companyName || '';
        customerEmail = invoiceData.companyInfo?.email || '';
        customerPhone = invoiceData.companyInfo?.phone || '';
        customerAddress = invoiceData.companyInfo ? {
          addressLine1: invoiceData.companyInfo.addressLine1,
          addressLine2: invoiceData.companyInfo.addressLine2,
          city: invoiceData.companyInfo.city,
          county: invoiceData.companyInfo.county,
          postcode: invoiceData.companyInfo.postcode,
          country: invoiceData.companyInfo.country
        } : null;
      }

      const saveData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        invoiceTitle: invoiceData.invoiceTitle || 'INVOICE',
        invoiceType: invoiceData.invoiceType || 'standard',
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        companyInfo: invoiceData.companyInfo,
        vehicleInfo: invoiceData.vehicle,
        deliveryAddress: invoiceData.deliveryAddress,
        items: invoiceData.items || [],
        subtotal: invoiceData.subtotal || 0,
        vatRate: invoiceData.vatRate || 20,
        vatAmount: invoiceData.vatAmount || 0,
        total: invoiceData.total || 0,
        vatMode: invoiceData.vatMode || 'global',
        discountMode: invoiceData.discountMode || 'global',
        globalDiscountType: invoiceData.globalDiscountType || 'percentage',
        globalDiscountValue: invoiceData.globalDiscountValue || 0,
        globalDiscountAmount: invoiceData.globalDiscountAmount || 0,
        totalDiscount: invoiceData.totalDiscount || 0,
        subtotalAfterDiscount: invoiceData.subtotalAfterDiscount || 0,
        paymentStatus: invoiceData.paymentStatus || 'unpaid',
        payments: invoiceData.payments || [],
        paidAmount: invoiceData.paidAmount || 0,
        outstandingBalance: invoiceData.outstandingBalance || 0,
        notes: invoiceData.notes || '',
        terms: invoiceData.terms || '',
        paymentInstructions: invoiceData.paymentInstructions || '',
        status: 'draft'
      };

      const response = await fetch('/api/custom-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      if (response.ok) {
        console.log('Invoice saved to database successfully');
      } else {
        throw new Error('Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      console.warn('Invoice could not be saved to database, but PDF generation will continue');
    }
  };

  const generateFinalPDF = async () => {
    console.log("🚀 ~ generateFinalPDF ~ invoiceData:", invoiceData)
    if (!invoiceData) return;
    
    setGeneratingPdf(true);
    try {
      // First, save the invoice to the database
      await saveInvoiceToDatabase();
      
      // Then generate the PDF
      const response = await fetch('/api/generate-invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${invoiceData.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        // Clear session storage and redirect back
        sessionStorage.removeItem('invoicePreviewData');
        // router.push('/store-owner/settings?tab=invoice-generator');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const goBack = () => {
    sessionStorage.removeItem('invoicePreviewData');
    router.push('/store-owner/settings?tab=invoice-generator');
  };

  // Reusable editable field component
  const EditableField = ({ 
    value, 
    onUpdate, 
    fieldKey, 
    type = "text", 
    placeholder = "Click to edit",
    className = "",
    displayValue,
    multiline = false
  }: {
    value: string | number | undefined;
    onUpdate: (value: string | number) => void;
    fieldKey: string;
    type?: string;
    placeholder?: string;
    className?: string;
    displayValue?: string;
    multiline?: boolean;
  }) => {
    const isEditing = editingField === fieldKey;
    
    if (multiline) {
      return isEditing ? (
        <Textarea
          value={value || ''}
          onChange={(e) => onUpdate(e.target.value)}
          onBlur={() => setEditingField(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditingField(null);
          }}
          autoFocus
          className={`border-blue-300 ${className}`}
          placeholder={placeholder}
        />
      ) : (
        <div
          onClick={() => setEditingField(fieldKey)}
          className={`cursor-pointer hover:bg-blue-50 p-2 rounded min-h-[2rem] flex items-center ${className}`}
        >
          {displayValue || value || placeholder}
        </div>
      );
    }
    
    return isEditing ? (
      <Input
        type={type}
        value={value === 0 ? '' : (value || '')}
        onChange={(e) => {
          if (type === 'number') {
            const val = e.target.value;
            if (val === '' || val === null || val === undefined) {
              onUpdate('');
            } else {
              const numVal = parseFloat(val);
              onUpdate(isNaN(numVal) ? '' : numVal);
            }
          } else {
            onUpdate(e.target.value);
          }
        }}
        onBlur={() => setEditingField(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') setEditingField(null);
        }}
        autoFocus
        className={`border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md transition-all ${className}`}
        placeholder={placeholder}
      />
    ) : (
      <div
        onClick={() => setEditingField(fieldKey)}
        className={`cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-200 p-2 rounded-md min-h-[2rem] flex items-center transition-all ${className}`}
      >
        {displayValue || value || placeholder}
      </div>
    );
  };

  if (!invoiceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
      <Header />
      
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="flex items-center space-x-2"
                style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Generator</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                  Professional Invoice Preview
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowPdfPreview(!showPdfPreview)}
                variant="outline"
                className="flex items-center space-x-2"
                style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}
              >
                <Eye className="h-4 w-4" />
                <span>{showPdfPreview ? 'Hide PDF Preview' : 'Show PDF Preview'}</span>
              </Button>
              <Button
                onClick={generateFinalPDF}
                disabled={generatingPdf}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}
              >
                {generatingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal/Overlay */}
      {showPdfPreview && invoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">PDF Preview</h2>
              <Button
                onClick={() => setShowPdfPreview(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 p-4">
              <PDFViewerWrapper invoiceData={invoiceData} />
            </div>
          </div>
        </div>
      )}

      {/* Professional Invoice Preview */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <Card className="bg-white shadow-2xl border-0 overflow-hidden rounded-lg">
          <CardContent className="p-0">
            {/* Professional Header Section - Matching PDF Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8 bg-white border-b border-slate-200">
              {/* Left Column - Logo and Company Info */}
              <div className="space-y-4">
                {/* Logo Section - More compact like PDF */}
                <div className="flex items-start space-x-3">
                  {invoiceData.companyInfo?.companyLogo && (
                    <div className="flex-shrink-0">
                      <Image
                        src={invoiceData.companyInfo.companyLogo}
                        alt="Company Logo"
                        width={60}
                        height={60}
                        className="w-15 h-15 object-contain bg-white"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <EditableField
                      value={invoiceData.companyInfo?.companyName}
                      onUpdate={(value) => updateCompanyInfo('companyName', value)}
                      fieldKey="company-name"
                      placeholder="Company Name"
                      className="text-lg font-bold text-slate-800 leading-tight mb-1"
                    />
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <EditableField
                        value={invoiceData.companyInfo?.addressLine1}
                        onUpdate={(value) => updateCompanyInfo('addressLine1', value)}
                        fieldKey="company-address1"
                        placeholder="Address Line 1"
                        className="block"
                      />
                      <EditableField
                        value={invoiceData.companyInfo?.city}
                        onUpdate={(value) => updateCompanyInfo('city', value)}
                        fieldKey="company-city"
                        placeholder="City"
                        className="block"
                      />
                      <div className="flex items-center space-x-1">
                        <EditableField
                          value={invoiceData.companyInfo?.county}
                          onUpdate={(value) => updateCompanyInfo('county', value)}
                          fieldKey="company-county"
                          placeholder="County"
                          className="flex-1"
                        />
                        <EditableField
                          value={invoiceData.companyInfo?.postcode}
                          onUpdate={(value) => updateCompanyInfo('postcode', value)}
                          fieldKey="company-postcode"
                          placeholder="Postcode"
                          className="w-16 font-semibold"
                        />
                      </div>
                      <EditableField
                        value={invoiceData.companyInfo?.phone}
                        onUpdate={(value) => updateCompanyInfo('phone', value)}
                        fieldKey="company-phone"
                        placeholder="Phone Number"
                        className="block"
                      />
                      <EditableField
                        value={invoiceData.companyInfo?.email}
                        onUpdate={(value) => updateCompanyInfo('email', value)}
                        fieldKey="company-email"
                        placeholder="Email Address"
                        className="block"
                      />
                      <EditableField
                        value={invoiceData.companyInfo?.vatNumber}
                        onUpdate={(value) => updateCompanyInfo('vatNumber', value)}
                        fieldKey="company-vat"
                        placeholder="VAT Number"
                        className="block font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Two Column Layout for Invoice and Deliver To */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {/* Invoice Details Section - Card Layout */}
                  <Card className="shadow-lg border-slate-200">
                    <CardHeader className="pb-6 pt-6">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Invoice Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-6">
                      {/* Invoice Details Table - 2 columns, 3 rows layout */}
                      <div className="space-y-4">
                        {/* Row 1 */}
                        <div className="grid grid-cols-2 gap-x-6">
                          <div className="flex flex-col">
                            <span className="text-slate-600 text-xs font-medium mb-1">Invoice Number</span>
                            <EditableField
                              value={invoiceData.invoiceNumber}
                              onUpdate={(value) => updateInvoiceData('invoiceNumber', value)}
                              fieldKey="invoice-number"
                              placeholder="INV-001"
                              className="font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded border"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-600 text-xs font-medium mb-1">Invoice Title</span>
                            <EditableField
                              value={invoiceData.invoiceTitle || 'INVOICE'}
                              onUpdate={(value) => updateInvoiceData('invoiceTitle', value)}
                              fieldKey="invoice-title"
                              placeholder="INVOICE"
                              className="font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded border"
                            />
                          </div>
                        </div>
                        
                        {/* Row 2 */}
                        <div className="grid grid-cols-2 gap-x-6">
                          <div className="flex flex-col">
                            <span className="text-slate-600 text-xs font-medium mb-1">Invoice Type</span>
                            <div className="font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded border">
                              {invoiceData.invoiceType === 'purchase' ? 'Purchase Invoice' : 'Standard Invoice'}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-600 text-xs font-medium mb-1">Invoice Date</span>
                            <EditableField
                              value={invoiceData.invoiceDate}
                              onUpdate={(value) => updateInvoiceData('invoiceDate', value)}
                              fieldKey="invoice-date"
                              type="date"
                              displayValue={new Date(invoiceData.invoiceDate).toLocaleDateString()}
                              className="font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded border"
                            />
                          </div>
                        </div>
                        
                        {/* Row 3 */}
                        <div className="grid grid-cols-2 gap-x-6">
                          <div className="flex flex-col">
                            <span className="text-slate-600 text-xs font-medium mb-1">Due Date</span>
                            <EditableField
                              value={invoiceData.dueDate}
                              onUpdate={(value) => updateInvoiceData('dueDate', value)}
                              fieldKey="due-date"
                              type="date"
                              displayValue={new Date(invoiceData.dueDate).toLocaleDateString()}
                              className="font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded border"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-600 text-xs font-medium mb-1">Payment Terms</span>
                            <div className="font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded border">
                              30 Days
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Deliver To Section */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                      {invoiceData.recipientType === 'customer' ? 'Deliver To' : 
                       invoiceData.recipientType === 'business' ? 'Business Recipient' : 
                       'Invoice To Self'}
                    </h3>
                    <div className="space-y-1 text-sm">
                      {invoiceData.recipientType === 'customer' ? (
                        <>
                          <div className="flex space-x-2">
                            <EditableField
                              value={(invoiceData.customer as Customer)?.firstName}
                              onUpdate={(value) => updateCustomerInfo('firstName', value)}
                              fieldKey="customer-firstName"
                              placeholder="First Name"
                              className="flex-1 font-semibold"
                            />
                            <EditableField
                              value={(invoiceData.customer as Customer)?.lastName}
                              onUpdate={(value) => updateCustomerInfo('lastName', value)}
                              fieldKey="customer-lastName"
                              placeholder="Last Name"
                              className="flex-1 font-semibold"
                            />
                          </div>
                        </>
                      ) : invoiceData.recipientType === 'business' ? (
                        <>
                          <EditableField
                            value={(invoiceData.customer as Business)?.businessName}
                            onUpdate={(value) => updateCustomerInfo('businessName', value)}
                            fieldKey="business-name"
                            placeholder="Business Name"
                            className="font-semibold"
                          />
                          <div className="flex space-x-2">
                            <EditableField
                              value={(invoiceData.customer as Business)?.vatNumber}
                              onUpdate={(value) => updateCustomerInfo('vatNumber', value)}
                              fieldKey="business-vat"
                              placeholder="VAT Number"
                              className="flex-1 text-slate-600"
                            />
                            <EditableField
                              value={(invoiceData.customer as Business)?.companyNumber}
                              onUpdate={(value) => updateCustomerInfo('companyNumber', value)}
                              fieldKey="business-company"
                              placeholder="Company Number"
                              className="flex-1 text-slate-600"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-slate-600">
                          Invoice recipient is the same as company information above.
                        </div>
                      )}
                      
                      {/* Common address fields for customer and business */}
                      {invoiceData.recipientType !== 'myself' && (
                        <>
                          <EditableField
                            value={invoiceData.customer?.addressLine1}
                            onUpdate={(value) => updateCustomerInfo('addressLine1', value)}
                            fieldKey="customer-address1"
                            placeholder="Address Line 1"
                            className="text-slate-600"
                          />
                          <div className="flex space-x-2">
                            <EditableField
                              value={invoiceData.customer?.city}
                              onUpdate={(value) => updateCustomerInfo('city', value)}
                              fieldKey="customer-city"
                              placeholder="City"
                              className="flex-1 text-slate-600"
                            />
                            <EditableField
                              value={invoiceData.customer?.postcode}
                              onUpdate={(value) => updateCustomerInfo('postcode', value)}
                              fieldKey="customer-postcode"
                              placeholder="Postcode"
                              className="w-20 font-semibold text-slate-600"
                            />
                          </div>
                        </>
                      )}
                      
                      {/* Delivery Address Section */}
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Delivery Address</div>
                        <EditableField
                          value={invoiceData.deliveryAddress?.addressLine1}
                          onUpdate={(value) => updateDeliveryAddress('addressLine1', value)}
                          fieldKey="delivery-address1"
                          placeholder="Delivery Address Line 1"
                          className="text-slate-600"
                        />
                        <EditableField
                          value={invoiceData.deliveryAddress?.addressLine2}
                          onUpdate={(value) => updateDeliveryAddress('addressLine2', value)}
                          fieldKey="delivery-address2"
                          placeholder="Address Line 2 (optional)"
                          className="text-slate-600"
                        />
                        <div className="flex space-x-2">
                          <EditableField
                            value={invoiceData.deliveryAddress?.city}
                            onUpdate={(value) => updateDeliveryAddress('city', value)}
                            fieldKey="delivery-city"
                            placeholder="City"
                            className="flex-1 text-slate-600"
                          />
                          <EditableField
                            value={invoiceData.deliveryAddress?.postcode}
                            onUpdate={(value) => updateDeliveryAddress('postcode', value)}
                            fieldKey="delivery-postcode"
                            placeholder="Postcode"
                            className="w-24 text-slate-600"
                          />
                        </div>
                        <EditableField
                          value={invoiceData.deliveryAddress?.county}
                          onUpdate={(value) => updateDeliveryAddress('county', value)}
                          fieldKey="delivery-county"
                          placeholder="County"
                          className="text-slate-600"
                        />
                        <EditableField
                          value={invoiceData.deliveryAddress?.country}
                          onUpdate={(value) => updateDeliveryAddress('country', value)}
                          fieldKey="delivery-country"
                          placeholder="Country"
                          className="text-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Purchase Invoice Header and Details - Matching PDF */}
              <div className="flex flex-col justify-start items-end">
                <div className="text-right w-full">
                  <div className="bg-white text-slate-800 p-4 mb-4">
                    <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                      PURCHASE INVOICE
                    </h1>
                  </div>
                  
                  {/* Invoice Details Box - Matching PDF */}
                  <div className="bg-slate-50 p-3 mb-3 text-left">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-600">PO #</span>
                        <span className="font-bold text-slate-800">{invoiceData.invoiceNumber.replace('INV-', '')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-600">Stock No.</span>
                        <span className="font-bold text-slate-800">235</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-600">Date:</span>
                        <span className="font-bold text-slate-800">{new Date(invoiceData.invoiceDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-600">Prepared by:</span>
                        <span className="font-bold text-slate-800">{invoiceData.companyInfo?.companyName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Purchase From Section - Matching PDF */}
                  <div className="bg-slate-50 p-3 text-right">
                    <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                      {invoiceData.recipientType === 'customer' ? 'PURCHASE FROM' : 
                       invoiceData.recipientType === 'business' ? 'BUSINESS' : 
                       'COMPANY INVOICE'}
                    </h3>
                    <div className="text-xs font-semibold text-slate-800 mb-1">
                      {invoiceData.recipientType === 'customer' ? (
                        <>
                          {(invoiceData.customer as Customer)?.firstName} {(invoiceData.customer as Customer)?.lastName}
                        </>
                      ) : invoiceData.recipientType === 'business' ? (
                        <>
                          {(invoiceData.customer as Business)?.businessName}
                        </>
                      ) : (
                        <>
                          {invoiceData.companyInfo?.companyName}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div>{invoiceData.customer?.addressLine1}</div>
                      <div>
                        {invoiceData.customer?.city}, {invoiceData.customer?.postcode}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Width Vehicle Details Grid - Matching PDF Table Layout */}
            <div className="p-6 lg:p-8 bg-white border-b border-slate-200">
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                  Vehicle Details
                </h2>
                <div className="w-12 h-0.5 bg-slate-600"></div>
              </div>
              
              <div className="bg-white border border-slate-200 overflow-hidden rounded-md">
                {/* Row 1: Reg No, MOT Expiry, Variant */}
                <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-200">
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Reg No.</span>
                      <EditableField
                        value={invoiceData.vehicle?.registration}
                        onUpdate={(value) => updateVehicleInfo('registration', value)}
                        fieldKey="vehicle-registration"
                        placeholder="Registration"
                        className="text-xs font-bold text-slate-800 uppercase"
                      />
                    </div>
                  </div>
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">MOT Expiry</span>
                      <span className="text-xs font-bold text-slate-800">03/09/2025</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Variant</span>
                      <EditableField
                        value={invoiceData.vehicle?.derivative}
                        onUpdate={(value) => updateVehicleInfo('derivative', value)}
                        fieldKey="vehicle-derivative"
                        placeholder="0.9 TCe ENERGY Dynamique MediaNav Euro 5 (s/s) 5dr"
                        className="text-xs font-bold text-slate-800 flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: First Registered, Make, Model */}
                <div className="grid grid-cols-3 border-b border-slate-200">
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">First Registered</span>
                      <span className="text-xs font-bold text-slate-800">03/09/2022</span>
                    </div>
                  </div>
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Make</span>
                      <EditableField
                        value={invoiceData.vehicle?.make}
                        onUpdate={(value) => updateVehicleInfo('make', value)}
                        fieldKey="vehicle-make"
                        placeholder="Vehicle Make"
                        className="text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Model</span>
                      <EditableField
                        value={invoiceData.vehicle?.model}
                        onUpdate={(value) => updateVehicleInfo('model', value)}
                        fieldKey="vehicle-model"
                        placeholder="Vehicle Model"
                        className="text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Build Year, Fuel Type, Ext. Colour */}
                <div className="grid grid-cols-3 border-b border-slate-200">
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Build Year</span>
                      <EditableField
                        value={invoiceData.vehicle?.year}
                        onUpdate={(value) => updateVehicleInfo('year', value)}
                        fieldKey="vehicle-year"
                        type="number"
                        placeholder="2022"
                        className="text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Fuel Type</span>
                      <EditableField
                        value={invoiceData.vehicle?.fuelType}
                        onUpdate={(value) => updateVehicleInfo('fuelType', value)}
                        fieldKey="vehicle-fuel"
                        placeholder="Fuel Type"
                        className="text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Ext. Colour</span>
                      <EditableField
                        value={invoiceData.vehicle?.colour}
                        onUpdate={(value) => updateVehicleInfo('colour', value)}
                        fieldKey="vehicle-colour"
                        placeholder="Colour"
                        className="text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Body Type, Transmission, Odometer */}
                <div className="grid grid-cols-3 border-b border-slate-200">
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Body Type</span>
                      <span className="text-xs font-bold text-slate-800">Saloon</span>
                    </div>
                  </div>
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Transmission</span>
                      <span className="text-xs font-bold text-slate-800">AUTO 7 GEARS</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Odometer</span>
                      <EditableField
                        value={invoiceData.vehicle?.mileage}
                        onUpdate={(value) => updateVehicleInfo('mileage', value)}
                        fieldKey="vehicle-mileage"
                        type="number"
                        placeholder="40500"
                        displayValue={invoiceData.vehicle?.mileage ? `${parseInt(String(invoiceData.vehicle.mileage)).toLocaleString()} MLS` : undefined}
                        className="text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Engine No., Chassis/VIN No., Stock No. */}
                <div className="grid grid-cols-3 border-b border-slate-200">
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Engine No.</span>
                      <span className="text-xs font-bold text-slate-800">DNFB108955</span>
                    </div>
                  </div>
                  <div className="p-3 border-r border-slate-200">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Chassis/VIN No.</span>
                      <EditableField
                        value={invoiceData.vehicle?.vin}
                        onUpdate={(value) => updateVehicleInfo('vin', value)}
                        fieldKey="vehicle-vin"
                        placeholder="VF12RFA1H49406992"
                        className="text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Stock No.</span>
                      <span className="text-xs font-bold text-slate-800">235</span>
                    </div>
                  </div>
                </div>

                {/* Row 6: Type */}
                <div className="grid grid-cols-1">
                  <div className="p-3">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold text-slate-500">Type</span>
                      <span className="text-xs font-bold text-slate-800">Used</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Professional Items Table - Matching PDF */}
            <div className="p-6 lg:p-8">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                      Invoice Items
                    </h2>
                    <div className="w-12 h-0.5 bg-slate-600"></div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm font-semibold text-slate-700" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>VAT Mode:</Label>
                      <Button
                        onClick={toggleVatMode}
                        size="sm"
                        variant={invoiceData.vatMode === 'individual' ? 'default' : 'outline'}
                        className="text-xs font-semibold"
                        style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}
                      >
                        {invoiceData.vatMode === 'individual' ? 'Individual' : 'Global'}
                      </Button>
                    </div>
                    <Button
                      onClick={addItem}
                      size="sm"
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                      style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Item</span>
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>Description</th>
                      <th className="px-4 py-3 text-center w-16 text-xs font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>Qty</th>
                      <th className="px-4 py-3 text-right w-24 text-xs font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>Unit Price</th>
                      {invoiceData.discountMode === 'individual' && (
                        <th className="px-4 py-3 text-center w-20 text-xs font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>Discount %</th>
                      )}
                      {invoiceData.vatMode === 'individual' && (
                        <th className="px-4 py-3 text-center w-16 text-xs font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>VAT %</th>
                      )}
                      <th className="px-4 py-3 text-right w-24 text-xs font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item, index) => (
                      <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} group relative hover:bg-blue-50 transition-colors border-b border-slate-100`}>
                        <td className="px-4 py-3">
                          {editingField === `description-${index}` ? (
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                              autoFocus
                              className="border-blue-300"
                            />
                          ) : (
                            <div
                              onClick={() => setEditingField(`description-${index}`)}
                              className="cursor-pointer hover:bg-blue-50 p-2 rounded min-h-[2rem] flex items-center"
                            >
                              {item.description || 'Click to edit description'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingField === `quantity-${index}` ? (
                            <Input
                              type="number"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                              autoFocus
                              className="border-blue-300 text-center"
                              placeholder="1"
                            />
                          ) : (
                            <div
                              onClick={() => setEditingField(`quantity-${index}`)}
                              className="cursor-pointer hover:bg-blue-50 p-2 rounded min-h-[2rem] flex items-center justify-center"
                            >
                              {item.quantity}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingField === `unitPrice-${index}` ? (
                            <Input
                              type="number"
                              value={item.unitPrice === 0 ? '' : item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                              autoFocus
                              className="border-blue-300 text-right"
                              placeholder="0.00"
                            />
                          ) : (
                            <div
                              onClick={() => setEditingField(`unitPrice-${index}`)}
                              className="cursor-pointer hover:bg-blue-50 p-2 rounded min-h-[2rem] flex items-center justify-end"
                            >
                              £{(Number(item.unitPrice) || 0).toFixed(2)}
                            </div>
                          )}
                        </td>
                        {invoiceData.discountMode === 'individual' && (
                          <td className="px-4 py-3 text-center">
                            {editingField === `discount-${index}` ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount === 0 ? '' : item.discount}
                                onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                onBlur={() => setEditingField(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                autoFocus
                                className="border-blue-300 text-center"
                                placeholder="0"
                              />
                            ) : (
                              <div
                                onClick={() => setEditingField(`discount-${index}`)}
                                className="cursor-pointer hover:bg-blue-50 p-2 rounded min-h-[2rem] flex items-center justify-center"
                              >
                                {(Number(item.discount) || 0).toFixed(1)}%
                              </div>
                            )}
                          </td>
                        )}
                        {invoiceData.vatMode === 'individual' && (
                          <td className="px-4 py-3 text-center">
                            {editingField === `vatRate-${index}` ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.vatRate === 0 ? '' : item.vatRate}
                                onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value) || 0)}
                                onBlur={() => setEditingField(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                autoFocus
                                className="border-blue-300 text-center"
                                placeholder="20"
                              />
                            ) : (
                              <div
                                onClick={() => setEditingField(`vatRate-${index}`)}
                                className="cursor-pointer hover:bg-blue-50 p-2 rounded min-h-[2rem] flex items-center justify-center"
                              >
                                {(Number(item.vatRate) || 0).toFixed(1)}%
                              </div>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-medium">
                          <div className="text-right">
                            {(() => {
                              // Calculate discount amounts for better logic
                              const originalPrice = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
                              const individualDiscountAmount = Number(item.discountAmount) || 0;
                              const globalDiscountAmount = invoiceData.discountMode === 'global' && invoiceData.totalDiscount && invoiceData.totalDiscount > 0 
                                ? originalPrice * (invoiceData.globalDiscountType === 'percentage' 
                                    ? (Number(invoiceData.globalDiscountValue) || 0) / 100
                                    : (Number(invoiceData.totalDiscount) || 0) / (Number(invoiceData.subtotal) || 1))
                                : 0;
                              
                              const hasIndividualDiscount = invoiceData.discountMode === 'individual' && individualDiscountAmount > 0.01;
                              const hasGlobalDiscount = invoiceData.discountMode === 'global' && globalDiscountAmount > 0.01;
                              const hasAnyDiscount = hasIndividualDiscount || hasGlobalDiscount;
                              
                              return (
                                <>
                                  {/* Show original price only if there's a meaningful discount */}
                                  {hasAnyDiscount && (
                                    <div className="text-xs text-red-600 line-through">
                                      £{originalPrice.toFixed(2)}
                                    </div>
                                  )}
                                  
                                  <div className="font-medium">
                                    £{(Number(item.total) || 0).toFixed(2)}
                                    {invoiceData.vatMode === 'individual' && item.vatAmount && item.vatAmount > 0 && (
                                      <span className="text-xs text-gray-500 block">
                                        +VAT: £{(Number(item.vatAmount) || 0).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Show discount savings only if meaningful */}
                                  {hasIndividualDiscount && (
                                    <div className="text-xs text-green-600">
                                      Saved: £{individualDiscountAmount.toFixed(2)}
                                    </div>
                                  )}
                                  
                                  {hasGlobalDiscount && (
                                    <div className="text-xs text-green-600">
                                      Discount: -£{globalDiscountAmount.toFixed(2)}
                                    </div>
                                  )}
                                  
                                  {invoiceData.vatMode === 'individual' && item.vatAmount && item.vatAmount > 0 && (
                                    <div className="text-xs font-semibold text-blue-600">
                                      Total: £{(Number(item.totalWithVat) || 0).toFixed(2)}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            
                            {/* Small remove icon */}
                            {invoiceData.items.length > 1 && (
                              <button
                                onClick={() => removeItem(index)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1"
                                title="Remove item"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Professional Totals Section - Matching PDF */}
            <div className="flex justify-end mb-6 px-6 lg:px-8">
              <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl">
                <Card className="bg-white border border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                      Invoice Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-xs font-semibold text-slate-600" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>Subtotal:</span>
                        <span className="text-xs font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>£{(Number(invoiceData.subtotal) || 0).toFixed(2)}</span>
                      </div>
                      {(invoiceData.totalDiscount && invoiceData.totalDiscount > 0) && (
                        <div className="flex justify-between py-2 text-red-600 border-b border-slate-200">
                          <span className="font-semibold" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                            Discount {invoiceData.discountMode === 'global' 
                              ? `(${invoiceData.globalDiscountType === 'percentage' 
                                  ? `${invoiceData.globalDiscountValue}%` 
                                  : `£${invoiceData.globalDiscountValue}`})` 
                              : '(Item-wise)'}:
                          </span>
                          <span className="font-bold" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>-£{(Number(invoiceData.totalDiscount) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {(invoiceData.totalDiscount && invoiceData.totalDiscount > 0) && (
                        <div className="flex justify-between py-2 border-b border-slate-200">
                          <span className="font-semibold text-slate-700" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>Subtotal after discount:</span>
                          <span className="font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>£{(Number(invoiceData.subtotalAfterDiscount) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-700" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>VAT</span>
                          {invoiceData.vatMode === 'global' && (
                            <>
                              <span className="text-slate-600">(</span>
                              <EditableField
                                value={invoiceData.vatRate}
                                onUpdate={(value) => updateVatRate(typeof value === 'string' ? parseFloat(value) || 0 : value)}
                                fieldKey="vat-rate"
                                type="number"
                                placeholder="20"
                                className="w-12 text-center font-semibold"
                              />
                              <span className="text-slate-600">%):</span>
                            </>
                          )}
                          {invoiceData.vatMode === 'individual' && (
                            <span className="text-slate-600">(Individual):</span>
                          )}
                        </div>
                        <span className="font-bold text-slate-800" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>£{(Number(invoiceData.vatAmount) || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 bg-slate-800 text-white px-3 mt-2">
                        <span className="text-sm font-bold" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>Total:</span>
                        <span className="text-sm font-bold" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>£{(Number(invoiceData.total) || 0).toFixed(2)}</span>
                      </div>
                      {/* Payment Summary from actual payment entries */}
                      {(invoiceData.payments || []).length > 0 && (
                        <>
                          <Separator />
                          <div className="text-sm font-medium text-gray-700 mb-2">Payment Information:</div>
                          <div className="space-y-2">
                            {['Card', 'BACS', 'Cash'].map(type => {
                              const typePayments = (invoiceData.payments || []).filter(p => p.type === type);
                              const total = typePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                              if (total > 0) {
                                return (
                                  <div key={type} className="flex justify-between text-green-600 text-sm">
                                    <span>{type} ({typePayments.length} payment{typePayments.length > 1 ? 's' : ''}):</span>
                                    <span className="font-medium">£{total.toFixed(2)}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                            <div className="flex justify-between font-semibold border-t border-slate-200 pt-2">
                              <span>Total Paid:</span>
                              <span className="text-green-600">£{(invoiceData.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Outstanding Balance:</span>
                              <span className={
                                (invoiceData.total - (invoiceData.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)) > 0 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }>
                                £{Math.max(0, invoiceData.total - (invoiceData.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)).toFixed(2)}
                              </span>
                            </div>
                            {(invoiceData.total - (invoiceData.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)) <= 0 && (
                              <div className="text-xs text-green-600 text-center mt-2">
                                ✓ Invoice Fully Paid
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Multiple Payments Management */}
                <Card className="shadow-lg border-slate-200">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                      <FileText className="h-5 w-5 mr-2 text-green-600" />
                      Payment Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 lg:p-8">
                    <div className="space-y-4">
                      {/* Payment Entries */}
                      <div className="space-y-3">
                        {(invoiceData.payments || []).map((payment) => (
                          <div key={payment.id} className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <select
                              value={payment.type}
                              onChange={(e) => updatePayment(payment.id, 'type', e.target.value as 'Card' | 'BACS' | 'Cash')}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all w-20 lg:w-24"
                            >
                              <option value="Card">Card</option>
                              <option value="BACS">BACS</option>
                              <option value="Cash">Cash</option>
                            </select>
                            <Input
                              type="number"
                              value={payment.amount === 0 ? '' : payment.amount}
                              onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-28 lg:w-32 text-sm"
                              step="0.01"
                            />
                            <Input
                              type="date"
                              value={payment.date}
                              onChange={(e) => updatePayment(payment.id, 'date', e.target.value)}
                              className="w-40 lg:w-44 text-sm"
                            />
                            <Input
                              type="text"
                              value={payment.reference || ''}
                              onChange={(e) => updatePayment(payment.id, 'reference', e.target.value)}
                              placeholder="Reference (optional)"
                              className="flex-1 min-w-[120px] text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removePayment(payment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add Payment Button */}
                      <Button
                        variant="outline"
                        onClick={addPayment}
                        className="w-full border-dashed border-green-300 text-green-600 hover:bg-green-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payment
                      </Button>
                      
                      {/* Payment Summary */}
                      {(invoiceData.payments || []).length > 0 && (
                        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-sm font-medium text-green-800 mb-2">Payment Summary:</div>
                          <div className="space-y-1 text-sm">
                            {['Card', 'BACS', 'Cash'].map(type => {
                              const typePayments = (invoiceData.payments || []).filter(p => p.type === type);
                              const total = typePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                              if (total > 0) {
                                return (
                                  <div key={type} className="flex justify-between">
                                    <span>{type} ({typePayments.length} payment{typePayments.length > 1 ? 's' : ''}):</span>
                                    <span className="font-medium">£{total.toFixed(2)}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                            <div className="flex justify-between font-bold text-green-700 border-t border-green-200 pt-1">
                              <span>Total Paid:</span>
                              <span>£{(invoiceData.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Professional Notes and Terms Section */}
            <div className="p-8 bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      Additional Notes
                    </h3>
                    <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"></div>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <EditableField
                      value={invoiceData.notes}
                      onUpdate={(value) => updateInvoiceData('notes', value)}
                      fieldKey="invoice-notes"
                      placeholder="Click to add additional notes..."
                      className="min-h-[120px] p-4 text-sm text-slate-700"
                      multiline={true}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      Terms & Conditions
                    </h3>
                    <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"></div>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <EditableField
                      value={invoiceData.terms}
                      onUpdate={(value) => updateInvoiceData('terms', value)}
                      fieldKey="invoice-terms"
                      placeholder="Click to add terms and conditions..."
                      className="min-h-[120px] p-4 text-sm text-slate-700"
                      multiline={true}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="mt-8">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center" style={{ fontFamily: '"Century Gothic", "CenturyGothic", "AppleGothic", sans-serif' }}>
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Payment Instructions
                  </h3>
                  <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"></div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                  <EditableField
                    value={invoiceData.paymentInstructions}
                    onUpdate={(value) => updateInvoiceData('paymentInstructions', value)}
                    fieldKey="invoice-payment-instructions"
                    placeholder="Click to add payment instructions..."
                    className="min-h-[100px] p-4 text-sm text-slate-700"
                    multiline={true}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
