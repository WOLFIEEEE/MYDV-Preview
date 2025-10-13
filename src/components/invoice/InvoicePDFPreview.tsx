"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ComprehensiveInvoiceData } from "@/app/api/invoice-data/route";
import Image from 'next/image';

interface InvoicePDFPreviewProps {
  invoiceData: ComprehensiveInvoiceData;
  className?: string;
}

export default function InvoicePDFPreview({ invoiceData, className = '' }: InvoicePDFPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Local calculation functions to match PDF
  const calculateSubtotal = (invoiceData: ComprehensiveInvoiceData): number => {
    const vehiclePrice = invoiceData.pricing.salePricePostDiscount || 0;
    
    // For trade sales, exclude warranty and finance add-ons
    const warrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0);
    const enhancedWarrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0);
    const deliveryPrice = invoiceData.delivery?.postDiscountCost ?? invoiceData.pricing?.deliveryCostPostDiscount ?? invoiceData.delivery?.cost ?? 0;
    
    // Customer addons
    const customerAddon1Cost = invoiceData.addons?.customer?.addon1?.postDiscountCost ?? invoiceData.addons?.customer?.addon1?.cost ?? 0;
    const customerAddon2Cost = invoiceData.addons?.customer?.addon2?.postDiscountCost ?? invoiceData.addons?.customer?.addon2?.cost ?? 0;
    const customerDynamicAddonsCost = (() => {
      let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
      // Convert object format back to array if needed
      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
        dynamicAddons = Object.values(dynamicAddons);
      }
      return Array.isArray(dynamicAddons) 
        ? dynamicAddons.reduce((sum: number, addon: { postDiscountCost?: number; cost?: number }) => 
            sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0)
        : 0;
    })();
    
    // Finance addons - exclude for trade sales and only include for Finance Company invoices
    const financeAddon1Cost = (invoiceData.saleType === 'Trade' || invoiceData.invoiceTo !== 'Finance Company') ? 0 : (invoiceData.addons?.finance?.addon1?.postDiscountCost ?? invoiceData.addons?.finance?.addon1?.cost ?? 0);
    const financeAddon2Cost = (invoiceData.saleType === 'Trade' || invoiceData.invoiceTo !== 'Finance Company') ? 0 : (invoiceData.addons?.finance?.addon2?.postDiscountCost ?? invoiceData.addons?.finance?.addon2?.cost ?? 0);
    const financeDynamicAddonsCost = (invoiceData.saleType === 'Trade' || invoiceData.invoiceTo !== 'Finance Company') ? 0 : (() => {
      let dynamicAddons = invoiceData.addons?.finance?.dynamicAddons;
      // Convert object format back to array if needed
      if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
        dynamicAddons = Object.values(dynamicAddons);
      }
      return Array.isArray(dynamicAddons) 
        ? dynamicAddons.reduce((sum: number, addon: { postDiscountCost?: number; cost?: number }) => 
            sum + (addon.postDiscountCost ?? addon.cost ?? 0), 0)
        : 0;
    })();

    // Settlement amount - only for finance company invoices with part exchange
    const settlementAmount = invoiceData.invoiceTo === 'Finance Company' && invoiceData.payment?.partExchange?.included 
      ? (invoiceData.payment?.partExchange?.settlementAmount ?? 0) 
      : 0;

    return vehiclePrice + warrantyPrice + enhancedWarrantyPrice + deliveryPrice + 
           customerAddon1Cost + customerAddon2Cost + customerDynamicAddonsCost +
           financeAddon1Cost + financeAddon2Cost + financeDynamicAddonsCost + settlementAmount;
  };

  const calculateVAT = (amount: number): number => {
    return amount * 0; // 0% VAT for used cars
  };

  const calculateRemainingBalance = (invoiceData: ComprehensiveInvoiceData): number => {
    if (invoiceData.invoiceTo === 'Finance Company') {
      return invoiceData.payment.balanceToFinance ?? 0;
    }
    
    // For trade sales, calculate: Subtotal (including delivery) - All Payments
    if (invoiceData.saleType === 'Trade') {
      const subtotal = calculateSubtotal(invoiceData);
      
      // Sum all payments
      const totalCardPayments = (invoiceData.payment?.breakdown?.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalBacsPayments = (invoiceData.payment?.breakdown?.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalCashPayments = (invoiceData.payment?.breakdown?.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
      
      const totalDirectPayments = totalCardPayments + totalBacsPayments + totalCashPayments + (invoiceData.payment?.partExchange?.amountPaid ?? 0);
      const totalDepositPayments = (invoiceData.pricing?.amountPaidDepositCustomer ?? 0);
      const totalPayments = totalDirectPayments + totalDepositPayments;
      
      return Math.max(0, subtotal - totalPayments);
    }
    
    // For retail customer invoices - check multiple possible locations
    return invoiceData.payment.customerBalanceDue ?? invoiceData.payment.outstandingBalance ?? 0;
  };

  // Helper function to render HTML content with proper formatting for preview
  const renderHTMLContentForPreview = (htmlContent: string, fontSize: number = 12) => {
    if (!htmlContent) return null;
    
    return (
      <div 
        className="invoice-pdf-preview-content leading-relaxed text-gray-700"
        style={{
          fontSize: `${fontSize}px`, // Use proper font size matching PDF
          lineHeight: '1.4', // Better line height for readability
          fontFamily: 'Century Gothic, Arial, sans-serif',
          color: '#374151' // Force gray-700 color regardless of theme
        }}
        dangerouslySetInnerHTML={{ __html: `
          <style>
            .invoice-pdf-preview-content * { color: #374151 !important; } /* Force all text to be dark gray */
            .invoice-pdf-preview-content table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: ${fontSize}px; }
            .invoice-pdf-preview-content th { background-color: #f3f4f6; padding: 8px; border: 1px solid #d1d5db; font-weight: bold; text-align: left; font-size: ${fontSize + 2}px; color: #374151 !important; }
            .invoice-pdf-preview-content td { padding: 8px; border: 1px solid #d1d5db; font-size: ${fontSize}px; color: #374151 !important; }
            .invoice-pdf-preview-content h1, .invoice-pdf-preview-content h2, .invoice-pdf-preview-content h3 { font-weight: bold; margin: 16px 0 8px 0; font-family: 'Century Gothic', Arial, sans-serif; color: #374151 !important; }
            .invoice-pdf-preview-content h1 { font-size: ${fontSize + 4}px; }
            .invoice-pdf-preview-content h2 { font-size: ${fontSize + 2}px; }
            .invoice-pdf-preview-content h3 { font-size: ${fontSize}px; }
            .invoice-pdf-preview-content p { margin-bottom: 8px; font-size: ${fontSize}px; line-height: 1.4; font-family: 'Century Gothic', Arial, sans-serif; color: #374151 !important; }
            .invoice-pdf-preview-content ul { margin-left: 16px; margin-bottom: 8px; }
            .invoice-pdf-preview-content li { margin-bottom: 4px; font-size: ${fontSize}px; line-height: 1.4; font-family: 'Century Gothic', Arial, sans-serif; color: #374151 !important; }
            .invoice-pdf-preview-content strong, .invoice-pdf-preview-content b { font-weight: bold; color: #374151 !important; }
            .invoice-pdf-preview-content br { line-height: 1.4; }
            .invoice-pdf-preview-content div { font-size: ${fontSize}px; line-height: 1.4; font-family: 'Century Gothic', Arial, sans-serif; color: #374151 !important; }
          </style>
          ${htmlContent}
        ` }}
      />
    );
  };

  // Calculate which pages should be shown based on invoice.md conditions
  const visiblePages = useMemo(() => {
    const pages = [
      { 
        id: 1, 
        title: 'Invoice Core', 
        description: 'Main invoice, vehicle, customer, payment details',
        visible: true // Page 1 is always visible
      },
      { 
        id: 2, 
        title: 'Checklist/Disclaimer', 
        description: invoiceData.saleType === 'Trade' ? 'Trade sale disclaimer' : 'Vehicle checklist',
        visible: true // Page 2 is always visible (either checklist or trade disclaimer)
      },
      { 
        id: 3, 
        title: 'Standard T&Cs', 
        description: 'Standard retail terms and conditions',
        visible: invoiceData.saleType !== 'Trade' // HIDE when Trade Invoice
      },
      { 
        id: 4, 
        title: 'In-House Warranty (Engine)', 
        description: 'In-house warranty: Engine & Transmission',
        visible: invoiceData.invoiceType === 'Retail (Customer) Invoice' && invoiceData.warranty.inHouse
      },
      { 
        id: 6, 
        title: 'External Warranty', 
        description: `External warranty information (${invoiceData.warranty.name || ''})`,
        visible: !invoiceData.warranty.inHouse && invoiceData.warranty.level !== 'None Selected'
      }
    ];

    return pages.filter(page => page.visible);
  }, [invoiceData.saleType, invoiceData.invoiceType, invoiceData.warranty.inHouse, invoiceData.warranty.level, invoiceData.warranty.name]);

  const totalPages = visiblePages.length;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };


  // Render Page 1 - Invoice Core
  const renderPage1 = () => (
    <div className="bg-white w-full max-w-[310mm] mx-auto shadow-lg min-h-[1000px] pdf-content-container invoice-pdf-light-theme" style={{ 
      fontFamily: 'Century Gothic, Arial, sans-serif', 
      fontSize: '7px', 
      lineHeight: '1.1',
      padding: '10px', // Match PDF page padding
      isolation: 'isolate' // Prevent CSS leakage
    }}>
      {/* Company Header - Exact PDF Layout */}
      <div style={{ marginBottom: '8px' }}>
        <div className="flex justify-between items-start" style={{ marginBottom: '8px' }}>
          {/* Left Side - Logo and Company Info Side by Side */}
          <div className="flex-1 flex items-start" style={{ gap: '13px' }}>
            {/* Logo */}
            {invoiceData.companyInfo.logo && (
              <div style={{ marginRight: '13px' }}>
                <img 
                  src={invoiceData.companyInfo.logo} 
                  alt="Company Logo" 
                  style={{ 
                    height: '80px', 
                    width: 'auto', 
                    objectFit: 'contain' 
                  }}
                />
              </div>
            )}
            
            {/* Company Details */}
            <div className="flex-1">
              <div style={{ fontSize: '7px', color: '#000', marginBottom: '1px' }}>
                {invoiceData.companyInfo.address.street}
              </div>
              <div style={{ fontSize: '7px', color: '#000', marginBottom: '1px' }}>
                {invoiceData.companyInfo.address.city}
              </div>
              <div style={{ fontSize: '7px', color: '#000', marginBottom: '1px' }}>
                {invoiceData.companyInfo.address.postCode}
              </div>
              {invoiceData.companyInfo.vatNumber && (
                <div style={{ fontSize: '7px', color: '#000', marginBottom: '6px' }}>
                  VAT No: {invoiceData.companyInfo.vatNumber}
                </div>
              )}
              <div style={{ fontSize: '7px', color: '#000', marginBottom: '1px' }}>
                {invoiceData.companyInfo.contact.phone}
              </div>
              <div style={{ fontSize: '7px', color: '#000' }}>
                {invoiceData.companyInfo.contact.email}
              </div>
            </div>
          </div>
          
          {/* Right Side - Invoice Info */}
          <div className="text-right flex-shrink-0">
            <div style={{ fontSize: '7px', fontWeight: 'bold', marginBottom: '1px' }}>
              Invoice:
            </div>
            <div style={{ fontSize: '7px', marginBottom: '6px' }}>
              {invoiceData.invoiceNumber}
            </div>
            
            <div style={{ fontSize: '7px', fontWeight: 'bold', marginBottom: '1px' }}>
              Date:
            </div>
            <div style={{ fontSize: '7px', marginBottom: '6px' }}>
              {formatDate(invoiceData.invoiceDate)}
            </div>
            
            <div style={{ fontSize: '7px', fontWeight: 'bold', marginBottom: '1px' }}>
              Sale Price:
            </div>
            <div style={{ fontSize: '7px', marginBottom: '6px' }}>
              {formatCurrency(invoiceData.pricing.salePricePostDiscount)}
            </div>
            
            <div style={{ fontSize: '7px', fontWeight: 'bold', marginBottom: '1px' }}>
              Remaining Balance:
            </div>
            <div style={{ fontSize: '7px' }}>
              {formatCurrency(invoiceData.invoiceTo === 'Finance Company' 
                ? (invoiceData.payment.balanceToFinance || 0)
                : (invoiceData.payment.customerBalanceDue || 0)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Invoice Banner - Match PDF */}
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '6px', 
        marginBottom: '2px',
        textAlign: 'right'
      }}>
        <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#000' }}>
          PURCHASE INVOICE
        </div>
      </div>

      {/* Invoice To Section - Match PDF */}
      <div style={{ marginBottom: '2px' }}>
        <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}>
          INVOICE TO:
        </div>
        {invoiceData.invoiceTo === 'Finance Company' ? (
          <div>
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
              {invoiceData.vehicle?.registration || 'REG'} - {
                invoiceData.financeCompany?.name === 'Other' 
                  ? (invoiceData.financeCompany?.companyName || 'Finance Company')
                  : (invoiceData.financeCompany?.name || 'Finance Company')
              }
            </div>
            {invoiceData.financeCompany?.address?.firstLine && (
              <div style={{ fontSize: '7px' }}>
                {invoiceData.financeCompany.address.firstLine}
              </div>
            )}
            {invoiceData.financeCompany?.address?.countyPostCodeContact && (
              <div style={{ fontSize: '7px' }}>
                {invoiceData.financeCompany.address.countyPostCodeContact}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>
              {invoiceData.invoiceNumber} - {invoiceData.customer.firstName} {invoiceData.customer.lastName}
            </div>
            <div style={{ fontSize: '7px' }}>
              {invoiceData.customer.address.firstLine}
            </div>
            {invoiceData.customer.address.secondLine && (
              <div style={{ fontSize: '7px' }}>
                {invoiceData.customer.address.secondLine}
              </div>
            )}
            <div style={{ fontSize: '7px' }}>
              {invoiceData.customer.address.city}, {invoiceData.customer.address.postCode}
            </div>
            <div style={{ fontSize: '7px' }}>
              Tel: {invoiceData.customer.contact.phone}
            </div>
            <div style={{ fontSize: '7px' }}>
              Email: {invoiceData.customer.contact.email}
            </div>
          </div>
        )}
      </div>

      {/* Thin grey line separator below customer details */}
      <div style={{ 
        height: '1px', 
        backgroundColor: '#d0d0d0', 
        marginTop: '4px', 
        marginBottom: '4px' 
      }} />

      {/* Vehicle Information Table - Match PDF Structure */}
      <div style={{ marginBottom: '6px' }}>
        {/* Table Header */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #000', 
          paddingBottom: '3px', 
          marginBottom: '3px' 
        }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', flex: '3', textAlign: 'left' }}>DESCRIPTION</div>
          <div style={{ fontSize: '7px', fontWeight: 'bold', flex: '1', textAlign: 'right' }}>RATE</div>
          <div style={{ fontSize: '7px', fontWeight: 'bold', flex: '1', textAlign: 'center' }}>QTY</div>
          <div style={{ fontSize: '7px', fontWeight: 'bold', flex: '1', textAlign: 'right' }}>DISCOUNT</div>
          <div style={{ fontSize: '7px', fontWeight: 'bold', flex: '1', textAlign: 'right' }}>TOTAL</div>
        </div>
        {/* Vehicle Row */}
        <div style={{ 
          display: 'flex', 
          paddingTop: '2px',
          paddingBottom: '2px',
          borderBottom: '1px solid #ccc',
          fontWeight: '600'
        }}>
          <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
            {invoiceData.vehicle.make} {invoiceData.vehicle.model} - {invoiceData.vehicle.registration}
          </div>
          <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
            {formatCurrency(invoiceData.pricing.salePrice)}
          </div>
          <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
          <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
            {invoiceData.pricing.discountOnSalePrice ? formatCurrency(invoiceData.pricing.discountOnSalePrice) : '-'}
          </div>
          <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
            {formatCurrency(invoiceData.pricing.salePricePostDiscount)}
          </div>
        </div>
        
        {/* Warranty Row - Only show for non-trade sales */}
        {invoiceData.saleType !== 'Trade' && invoiceData.warranty.level !== 'None Selected' && (
          <div style={{ 
            display: 'flex', 
            paddingTop: '2px',
            paddingBottom: '2px',
            borderBottom: '1px solid #ccc'
          }}>
            <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
              <span style={{ fontWeight: '600' }}>Warranty</span> - {invoiceData.warranty.name || invoiceData.warranty.level}
              {invoiceData.warranty.inHouse && (
                <div style={{ fontSize: '7px', color: '#000' }}>In-House Warranty: Yes</div>
              )}
              {invoiceData.warranty.details && (
                <div style={{ fontSize: '7px', color: '#000', marginTop: '2px' }}>{invoiceData.warranty.details}</div>
              )}
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
              {formatCurrency(invoiceData.pricing.warrantyPrice || 0)}
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
              {invoiceData.pricing.discountOnWarranty ? formatCurrency(invoiceData.pricing.discountOnWarranty) : '-'}
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
              {formatCurrency(invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0)}
            </div>
          </div>
        )}

        {/* Enhanced Warranty Row - Only show for non-trade sales */}
        {invoiceData.saleType !== 'Trade' && invoiceData.warranty.enhanced && invoiceData.warranty.enhancedLevel && (
          <div style={{ 
            display: 'flex', 
            paddingTop: '2px',
            paddingBottom: '2px',
            borderBottom: '1px solid #ccc'
          }}>
            <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
              <span style={{ fontWeight: '600' }}>Enhanced Warranty</span> - {invoiceData.warranty.enhancedName || invoiceData.warranty.enhancedLevel}
              {invoiceData.warranty.enhancedDetails && (
                <div style={{ fontSize: '7px', color: '#000', marginTop: '2px' }}>{invoiceData.warranty.enhancedDetails}</div>
              )}
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
              {formatCurrency(invoiceData.pricing.enhancedWarrantyPrice || 0)}
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
              {invoiceData.pricing.discountOnEnhancedWarranty ? formatCurrency(invoiceData.pricing.discountOnEnhancedWarranty) : '-'}
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
              {formatCurrency(invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0)}
            </div>
          </div>
        )}

        {/* Customer Add-ons */}
        {invoiceData.addons?.customer?.enabled && (
          <>
            {invoiceData.addons.customer.addon1 && (
              <div style={{ 
                display: 'flex', 
                paddingTop: '2px',
                paddingBottom: '2px',
                borderBottom: '1px solid #ccc'
              }}>
                <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
                  <span style={{ fontWeight: '600' }}>{invoiceData.addons.customer.addon1.name}</span> - Non Refundable
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
                  {formatCurrency(invoiceData.addons.customer.addon1.cost || 0)}
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
                  {invoiceData.addons.customer.addon1.discount ? formatCurrency(invoiceData.addons.customer.addon1.discount) : '-'}
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency(invoiceData.addons.customer.addon1.postDiscountCost ?? invoiceData.addons.customer.addon1.cost ?? 0)}
                </div>
              </div>
            )}
            {invoiceData.addons.customer.addon2 && (
              <div style={{ 
                display: 'flex', 
                paddingTop: '2px',
                paddingBottom: '2px',
                borderBottom: '1px solid #ccc'
              }}>
                <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
                  <span style={{ fontWeight: '600' }}>{invoiceData.addons.customer.addon2.name}</span> - Non Refundable
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
                  {formatCurrency(invoiceData.addons.customer.addon2.cost || 0)}
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
                  {invoiceData.addons.customer.addon2.discount ? formatCurrency(invoiceData.addons.customer.addon2.discount) : '-'}
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency(invoiceData.addons.customer.addon2.postDiscountCost ?? invoiceData.addons.customer.addon2.cost ?? 0)}
                </div>
              </div>
            )}
            {/* Dynamic Customer Add-ons */}
            {(() => {
              let dynamicAddons = invoiceData.addons.customer.dynamicAddons;
              // Convert object format back to array if needed
              if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                dynamicAddons = Object.values(dynamicAddons);
              }
              return dynamicAddons && Array.isArray(dynamicAddons) && dynamicAddons.map((addon, index) => (
              <div key={`customer-dynamic-${index}`} style={{ 
                display: 'flex', 
                paddingTop: '2px',
                paddingBottom: '2px',
                borderBottom: '1px solid #ccc'
              }}>
                <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
                  <span style={{ fontWeight: '600' }}>{addon.name}</span> - Non Refundable
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
                  {formatCurrency(addon.cost || 0)}
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
                  {addon.discount ? formatCurrency(addon.discount) : '-'}
                </div>
                <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency(addon.postDiscountCost ?? addon.cost ?? 0)}
                </div>
              </div>
              ));
            })()}
          </>
        )}

        {/* Finance Add-ons - Only show for non-trade sales AND Finance Company invoices */}
        {invoiceData.saleType !== 'Trade' && invoiceData.invoiceTo === 'Finance Company' && invoiceData.addons?.finance?.enabled && (
          <>
            {invoiceData.addons.finance.addon1 && (
              <>
                <div style={{ 
                  display: 'flex', 
                  paddingTop: '2px',
                  paddingBottom: '2px'
                }}>
                  <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
                    <span style={{ fontWeight: '600' }}>{invoiceData.addons.finance.addon1.name}</span> - Non Refundable
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
                    {formatCurrency(invoiceData.addons.finance.addon1.cost || 0)}
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
                    {invoiceData.addons.finance.addon1.discount ? formatCurrency(invoiceData.addons.finance.addon1.discount) : '-'}
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(invoiceData.addons.finance.addon1.postDiscountCost ?? invoiceData.addons.finance.addon1.cost ?? 0)}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  paddingTop: '1px',
                  paddingBottom: '2px',
                  borderBottom: '1px solid #ccc'
                }}>
                  <div style={{ fontSize: '7px', flex: '5', textAlign: 'left', fontStyle: 'italic', color: '#666' }}>
                    To be covered by Finance/included in Cash Price
                  </div>
                </div>
              </>
            )}
            {invoiceData.addons.finance.addon2 && (
              <>
                <div style={{ 
                  display: 'flex', 
                  paddingTop: '2px',
                  paddingBottom: '2px'
                }}>
                  <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
                    <span style={{ fontWeight: '600' }}>{invoiceData.addons.finance.addon2.name}</span> - Non Refundable
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
                    {formatCurrency(invoiceData.addons.finance.addon2.cost || 0)}
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
                    {invoiceData.addons.finance.addon2.discount ? formatCurrency(invoiceData.addons.finance.addon2.discount) : '-'}
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(invoiceData.addons.finance.addon2.postDiscountCost ?? invoiceData.addons.finance.addon2.cost ?? 0)}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  paddingTop: '1px',
                  paddingBottom: '2px',
                  borderBottom: '1px solid #ccc'
                }}>
                  <div style={{ fontSize: '7px', flex: '5', textAlign: 'left', fontStyle: 'italic', color: '#666' }}>
                    To be covered by Finance/included in Cash Price
                  </div>
                </div>
              </>
            )}
            {/* Dynamic Finance Add-ons */}
            {(() => {
              let dynamicAddons = invoiceData.addons.finance.dynamicAddons;
              // Convert object format back to array if needed
              if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                dynamicAddons = Object.values(dynamicAddons);
              }
              return dynamicAddons && Array.isArray(dynamicAddons) && dynamicAddons.map((addon, index) => (
              <div key={`finance-dynamic-${index}`}>
                <div style={{ 
                  display: 'flex', 
                  paddingTop: '2px',
                  paddingBottom: '2px'
                }}>
                  <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
                    <span style={{ fontWeight: '600' }}>{addon.name}</span> - Non Refundable
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
                    {formatCurrency(addon.cost || 0)}
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
                    {addon.discount ? formatCurrency(addon.discount) : '-'}
                  </div>
                  <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(addon.postDiscountCost ?? addon.cost ?? 0)}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  paddingTop: '1px',
                  paddingBottom: '2px',
                  borderBottom: '1px solid #ccc'
                }}>
                  <div style={{ fontSize: '7px', flex: '5', textAlign: 'left', fontStyle: 'italic', color: '#666' }}>
                    To be covered by Finance/included in Cash Price
                  </div>
                </div>
              </div>
              ));
            })()}
          </>
        )}

        {/* Delivery Cost */}
        {((invoiceData.pricing?.deliveryCost ?? invoiceData.delivery?.cost ?? 0) > 0 || (invoiceData.pricing?.discountOnDelivery ?? invoiceData.delivery?.discount ?? 0) > 0) && (
          <div style={{ 
            display: 'flex', 
            paddingTop: '2px',
            paddingBottom: '2px',
            borderBottom: '1px solid #ccc'
          }}>
            <div style={{ fontSize: '7px', flex: '3', textAlign: 'left' }}>
              Delivery Cost
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right' }}>
              {formatCurrency(invoiceData.pricing?.deliveryCost ?? invoiceData.delivery?.cost ?? 0)}
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'center' }}>1</div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', color: '#000' }}>
              {(invoiceData.pricing?.discountOnDelivery ?? invoiceData.delivery?.discount ?? 0) > 0 ? formatCurrency(invoiceData.pricing?.discountOnDelivery ?? invoiceData.delivery?.discount ?? 0) : '-'}
            </div>
            <div style={{ fontSize: '7px', flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
              {formatCurrency(invoiceData.pricing?.deliveryCostPostDiscount ?? invoiceData.delivery?.postDiscountCost ?? invoiceData.pricing?.deliveryCost ?? invoiceData.delivery?.cost ?? 0)}
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Details - Match PDF format exactly */}
      <div style={{ fontSize: '7px', marginTop: '8px', marginBottom: '8px' }}>
        <div style={{ lineHeight: '1.6', marginBottom: '8px' }}>
          DERIVATIVE: {invoiceData.vehicle.derivative}
        </div>
        <div style={{ lineHeight: '1.6', marginBottom: '8px' }}>
          MILEAGE: {invoiceData.vehicle.mileage}
        </div>
        <div style={{ lineHeight: '1.6', marginBottom: '8px' }}>
          ENGINE NO: {invoiceData.vehicle.engineNumber}
        </div>
        <div style={{ lineHeight: '1.6', marginBottom: '8px' }}>
          ENGINE CAPACITY: {invoiceData.vehicle.engineCapacity}
        </div>
        <div style={{ lineHeight: '1.6', marginBottom: '8px' }}>
          CHASSIS NO: {invoiceData.vehicle.vin}
        </div>
        <div style={{ lineHeight: '1.6', marginBottom: '8px' }}>
          DATE FIRST REG UK: {formatDate(invoiceData.vehicle.firstRegDate)}
        </div>
        <div style={{ lineHeight: '1.6' }}>
          COLOUR: {invoiceData.vehicle.colour}
        </div>
      </div>

      {/* Finance Company Section - Only for Finance Company Invoices */}
      {invoiceData.invoiceTo === 'Finance Company' && (
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          
          {/* Total Cash Price */}
          <div style={{ fontSize: '7px', fontWeight: 'bold', lineHeight: '1.6', marginBottom: '8px' }}>
            TOTAL CASH PRICE: {formatCurrency(invoiceData.pricing.salePricePostDiscount)}
          </div>

          {/* Amounts Due */}
          <div style={{ fontSize: '7px', lineHeight: '1.6', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>AMOUNTS DUE:</span> DEPOSIT: {formatCurrency(
              invoiceData.invoiceTo === 'Finance Company' 
                ? (invoiceData.pricing?.compulsorySaleDepositFinance || 0)
                : (invoiceData.pricing?.compulsorySaleDepositCustomer || 0)
            )}, DELIVERY: {formatCurrency(invoiceData?.delivery?.postDiscountCost || invoiceData?.delivery?.cost || 0)}, DUE BY (Estimated): {formatDate(invoiceData.delivery?.date || invoiceData.invoiceDate)}
          </div>
          
          {/* Deposit Paid */}
          <div style={{ fontSize: '7px', lineHeight: '1.6', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>DEPOSIT PAID:</span> {formatCurrency(
              invoiceData.invoiceTo === 'Finance Company' 
                ? (invoiceData.pricing?.totalFinanceDepositPaid || (invoiceData.pricing?.dealerDepositPaidCustomer || 0) + (invoiceData.pricing?.amountPaidDepositFinance || 0))
                : (invoiceData.pricing?.amountPaidDepositCustomer || 0)
            )} , REMAINING DEPOSIT: {formatCurrency(
              Math.max(0, 
                invoiceData.invoiceTo === 'Finance Company' 
                  ? ((invoiceData.pricing?.compulsorySaleDepositFinance || 0) - (invoiceData.pricing?.totalFinanceDepositPaid || (invoiceData.pricing?.dealerDepositPaidCustomer || 0) + (invoiceData.pricing?.amountPaidDepositFinance || 0)))
                  : ((invoiceData.pricing?.compulsorySaleDepositCustomer || 0) - (invoiceData.pricing?.amountPaidDepositCustomer || 0))
              )
            )}
          </div>

          {/* Part Exchange Section */}
          <div style={{ fontSize: '7px', lineHeight: '1.6', marginBottom: '8px' }}>
            PART EX: {formatCurrency(invoiceData.payment?.partExchange?.valueOfVehicle || 0)}
            {(invoiceData.payment?.partExchange?.valueOfVehicle && invoiceData.payment.partExchange.valueOfVehicle > 0) && 
              ` - DETAILS:  ${invoiceData.payment?.partExchange?.makeAndModel || ''} - ${invoiceData.payment?.partExchange?.vehicleRegistration || ''}`
            }
          </div>

          {/* Settlement - only show when part exchange is included */}
          {invoiceData.payment?.partExchange?.included && (
            <div style={{ fontSize: '7px', lineHeight: '1.6', marginBottom: '8px' }}>
              SETTLEMENT: {formatCurrency(invoiceData.payment?.partExchange?.settlementAmount || 0)}
            </div>
          )}

          {/* Balance to Finance */}
          <div style={{ fontSize: '7px', lineHeight: '1.6', marginBottom: '0' }}>
            BALANCE TO FINANCE: {formatCurrency(invoiceData.payment.balanceToFinance || 0)} ,   DUE BY (Estimated): {formatDate(invoiceData.delivery?.date || invoiceData.invoiceDate)}
          </div>
        </div>
      )}

      {/* Warranty Disclaimer Section - Only show if warranty is selected */}
      {invoiceData.warranty.level && invoiceData.warranty.level !== 'None Selected' && (
        <div style={{ 
          borderTop: '1px solid #d0d0d0', 
          paddingTop: '2px', 
          marginBottom: '2px', 
          borderBottom: '1px solid #d0d0d0', 
          paddingBottom: '2px' 
        }}>
          <div style={{ fontSize: '7px', fontWeight: 'bold', marginBottom: '2px' }}>
            {invoiceData.warranty.inHouse ? 'IN HOUSE WARRANTY DISCLAIMER' : 'WARRANTY DISCLAIMER'}
          </div>
          <div style={{ fontSize: '7px', marginBottom: '2px' }}>
            {invoiceData.warranty.inHouse 
              ? '30 day complimentary (Engine and Gearbox) warranty - Customer must return the vehicle to dealer at own expense (Extendable on collection/delivery)'
              : 'Third-party warranty terms and conditions apply as per the warranty provider.'
            }
          </div>
          <div style={{ fontSize: '7px' }}>
            I confirm that when purchasing the above vehicle, I have been offered various options for warranty cover 
            and have chosen to opt for this level of cover. I am confirming my understanding of the above and that 
            all the details listed are correct.
          </div>
        </div>
      )}

      {/* Customer Details - Match PDF */}
      {invoiceData.saleType === 'Retail' && invoiceData.invoiceTo === 'Finance Company' && (
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>
            CUSTOMER DETAILS
          </div>
          <div style={{ fontSize: '7px', marginBottom: '1px' }}>
            {invoiceData.customer.title} {invoiceData.customer.firstName} {invoiceData.customer.lastName}
          </div>
          <div style={{ fontSize: '7px', marginBottom: '1px' }}>
            {invoiceData.customer.address.firstLine}{invoiceData.customer.address.secondLine && `, ${invoiceData.customer.address.secondLine}`}
          </div>
          <div style={{ fontSize: '7px', marginBottom: '1px' }}>
            {invoiceData.customer.address.city}
          </div>
          <div style={{ fontSize: '7px' }}>
            {invoiceData.customer.address.county}, {invoiceData.customer.address.postCode}
          </div>
        </div>
      )}

      {/* Additional Information Section */}
      {invoiceData.additionalInformation && (
        <div style={{ 
          marginTop: '2px', 
          marginBottom: '2px', 
          paddingTop: '2px' 
        }}>
          <div style={{ 
            fontSize: '7px', 
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: '2px' 
          }}>
            ADDITIONAL COMMENTS:
          </div>
          <div style={{ 
            fontSize: '7px', 
            color: '#000000',
            lineHeight: '1.2' 
          }}>
            {invoiceData.additionalInformation}
          </div>
        </div>
      )}

      {/* Trade Sale Disclaimer */}
      {invoiceData.saleType === 'Trade' && (
        <div style={{ 
          marginTop: '2px', 
          marginBottom: '2px', 
          paddingTop: '2px' 
        }}>
          <div style={{ 
            fontSize: '7px', 
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: '2px' 
          }}>
            TRADE SALE DISCLAIMER
          </div>
          <div style={{ 
            fontSize: '7px', 
            color: '#000000',
            lineHeight: '1.2',
            textAlign: 'justify'
          }}>
            I confirm that, when purchasing the above vehicle, I have been advised that this purchase is a Trade-Sale and outside of the scope of the Consumer Protection provisions. Therefore, no warranty or post-sale liabilities will apply. By purchasing this vehicle, I am confirming my understanding of the above, that all of the details listed are correct and providing my consent for these conditions to be applied.
          </div>
        </div>
      )}

      {/* Payment Breakdown Section - Match PDF */}
      <div style={{ 
        marginTop: '2px', 
        marginBottom: '2px', 
        borderTop: '1px solid #d0d0d0', 
        paddingTop: '2px' 
      }}>
        <div style={{ marginBottom: '4px' }}>
          {/* Header Row - Payment Breakdown and Subtotal in same row */}
          <div style={{ display: 'flex', marginBottom: '2px' }}>
            <div style={{ flex: '1', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '7px', fontWeight: 'bold' }}>
                PAYMENT BREAKDOWN
              </div>
              <div style={{ fontSize: '7px', textAlign: 'right' }}>
                SUBTOTAL:
              </div>
            </div>
            <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
              {formatCurrency(calculateSubtotal(invoiceData))}
            </div>
          </div>
          
          {/* Payment Items - Two Column Layout with right-aligned labels and right-aligned values */}
          <div style={{ marginLeft: '0' }}>
            <div style={{ display: 'flex', marginBottom: '2px' }}>
              <div style={{ fontSize: '7px', textAlign: 'right', flex: '1' }}>
                VAT (0%):
              </div>
              <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                {formatCurrency(calculateVAT(calculateSubtotal(invoiceData)))}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '2px' }}>
              <div style={{ fontSize: '7px', textAlign: 'right', flex: '1' }}>
                DEPOSIT DUE:
              </div>
              <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                {/* {formatCurrency(invoiceData.pricing?.compulsorySaleDepositCustomer || invoiceData.pricing?.compulsorySaleDepositFinance || 0)} */}
                {formatCurrency((invoiceData.pricing?.compulsorySaleDepositFinance || 0) + (invoiceData.pricing?.voluntaryContribution || 0))}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '2px' }}>
              <div style={{ fontSize: '7px', textAlign: 'right', flex: '1' }}>
                DEPOSIT AMOUNT PAID:
              </div>
              <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                {(() => {
                  const depositPaid = invoiceData.invoiceTo === 'Finance Company' 
                    ? (invoiceData.pricing?.totalFinanceDepositPaid || (invoiceData.pricing?.dealerDepositPaidCustomer || 0) + (invoiceData.pricing?.amountPaidDepositFinance || 0))
                    : (invoiceData.pricing?.amountPaidDepositCustomer || 0);
                  return depositPaid > 0 ? formatCurrency(depositPaid) : 'NONE';
                })()}
              </div>
            </div>


            {((invoiceData.pricing?.compulsorySaleDepositFinance || 0) + (invoiceData.pricing?.voluntaryContribution || 0) - (invoiceData.pricing?.amountPaidDepositFinance || 0)) > 0 && <div style={{ display: 'flex', marginBottom: '2px' }}>
              <div style={{ fontSize: '7px', textAlign: 'right', flex: '1' }}>
                REMAINING DEPOSIT AMOUNT:
              </div>
              <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                {formatCurrency((invoiceData.pricing?.compulsorySaleDepositFinance || 0) + (invoiceData.pricing?.voluntaryContribution || 0) - (invoiceData.pricing?.amountPaidDepositFinance || 0))}
              </div>
            </div>}


            <div style={{ display: 'flex', marginBottom: '2px' }}>
              <div style={{ fontSize: '7px', textAlign: 'right', flex: '1' }}>
                DATE OF COLLECTION (ESTIMATED):
              </div>
              <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                {formatDate(invoiceData.delivery?.date || invoiceData.invoiceDate)}
              </div>
            </div>
            
            {/* Finance Deposit Payment - Only show for Finance Company when deposit paid */}
            {invoiceData.invoiceTo === 'Finance Company' && (invoiceData.payment?.breakdown?.financeAmount || 0) > 0 && (
              <div style={{ display: 'flex', marginBottom: '2px' }}>
                <div style={{ fontSize: '7px', textAlign: 'right', flex: '1' }}>
                  FINANCE DEPOSIT PAID:
                </div>
                <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                  {formatCurrency(invoiceData.payment?.breakdown?.financeAmount || 0)} - {formatDate(invoiceData.payment?.breakdown?.depositDate || invoiceData.invoiceDate)}
                </div>
              </div>
            )}
          </div>

          {/* Separator Line */}
          <div style={{ 
            height: '1px', 
            backgroundColor: '#d0d0d0', 
            marginTop: 'auto', 
            marginBottom: '4px' 
          }} />

          {/* Payment Received Section */}
          <div style={{ marginTop: '4px', marginBottom: '4px' }}>
            {/* Header Row - Payments and Paid from Balance in same row */}
            <div style={{ display: 'flex', marginBottom: '2px' }}>
              <div style={{ flex: '1', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '7px', fontWeight: 'bold' }}>
                  PAYMENTS
                </div>
                <div style={{ fontSize: '7px', textAlign: 'right' }}>
                  PAID FROM BALANCE:
                </div>
              </div>
              <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                {formatCurrency(
                  (invoiceData.payment?.partExchange?.amountPaid || 0) + 
                  // Sum all card payments
                  ((invoiceData.payment?.breakdown?.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)) +
                  // Sum all BACS payments
                  ((invoiceData.payment?.breakdown?.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)) +
                  // Sum all cash payments
                  ((invoiceData.payment?.breakdown?.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)) +
                  // Add overpayment as Vehicle Reservation Fees ONLY when there's an overpayment (Finance)
                  (invoiceData.invoiceTo === 'Finance Company' && (invoiceData.pricing?.overpaymentsFinance || 0) > 0 ? (invoiceData.pricing?.overpaymentsFinance || 0) : 0) +
                  // (invoiceData.invoiceTo === 'Finance Company' && (invoiceData.pricing?.overpaymentsFinance || 0) > 0 ? (invoiceData.pricing?.overpaymentsFinance || 0) : 0) +
                  // Add overpayment as Additional Deposit Payment for Customer invoices
                  (invoiceData.invoiceTo === 'Customer' && (invoiceData.pricing?.overpaymentsCustomer || 0) > 0 ? (invoiceData.pricing?.overpaymentsCustomer || 0) : 0)
                )}
              </div>
            </div>

            {/* Cash Payments - Multiple Entries */}
            {/* Cash Payments - Multiple Entries */}
            {(invoiceData.payment?.breakdown?.cashPayments || []).map((payment, index) => 
              payment.amount > 0 && (
                <div key={`cash-${index}`} style={{ display: 'flex', marginBottom: '1px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px', flex: '1' }}>
                    {/* Left side: Date */}
                    <div style={{ textAlign: 'center', flex: '1' }}>
                      {formatDate(payment.date || invoiceData.invoiceDate)}
                    </div>

                    {/* Right side: Cash + Amount + Date */}
                    <div style={{ textAlign: 'right', flex: '1' }}>
                      CASH PAYMENT
                    </div>
                  </div>
                  <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
              )
            )}

            {/* Card Payments - Multiple Entries */}
            {(invoiceData.payment?.breakdown?.cardPayments || []).map((payment, index) => 
              payment.amount > 0 && (
                <div key={`card-${index}`} style={{ display: 'flex', marginBottom: '1px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px', flex: '1' }}>
                    {/* Left side: Date */}
                    <div style={{ textAlign: 'center', flex: '1' }}>
                      {formatDate(payment.date || invoiceData.invoiceDate)}
                    </div>

                    {/* Right side: Card + Amount + Date */}
                    <div style={{ textAlign: 'right', flex: '1' }}>
                      CARD PAYMENT
                    </div>
                  </div>
                  <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
              )
            )}

            {/* BACS Payments - Multiple Entries */}
            {(invoiceData.payment?.breakdown?.bacsPayments || []).map((payment, index) => 
              payment.amount > 0 && (
                <div key={`bacs-${index}`} style={{ display: 'flex', marginBottom: '1px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px', flex: '1' }}>
                    {/* Left side: Date */}
                    <div style={{ textAlign: 'center', flex: '1' }}>
                      {formatDate(payment.date || invoiceData.invoiceDate)}
                    </div>

                    {/* Right side: BACS + Amount + Date */}
                    <div style={{ textAlign: 'right', flex: '1' }}>
                      BACS PAYMENT
                    </div>
                  </div>
                  <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
              )
            )}

            {/* Vehicle Reservation Fees (Overpayment) - Only show when there's an OVERPAYMENT in Finance Company invoices */}
            {invoiceData.invoiceTo === 'Finance Company' && (invoiceData.pricing?.overpaymentsFinance || 0) > 0 && (
              <div style={{ display: 'flex', marginBottom: '1px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px', flex: '1' }}>
                  {/* Left side: Date */}
                  <div style={{ textAlign: 'center', flex: '1' }}>
                    {invoiceData.payment?.breakdown?.depositDate ? formatDate(invoiceData.payment.breakdown.depositDate) : ''}
                  </div>

                  {/* Right side: VEHICLE RESERVATION FEES label */}
                  <div style={{ textAlign: 'right', flex: '1' }}>
                    VEHICLE RESERVATION FEES:
                  </div>
                </div>
                <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                  {formatCurrency(invoiceData.pricing?.overpaymentsFinance || 0)}
                </div>
              </div>
            )}

            {/* Additional Deposit Payment (Overpayment) - Only show when there's an OVERPAYMENT in Customer invoices */}
            {invoiceData.invoiceTo === 'Customer' && (invoiceData.pricing?.overpaymentsCustomer || 0) > 0 && (
              <div style={{ display: 'flex', marginBottom: '1px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px', flex: '1' }}>
                  {/* Left side: Date */}
                  <div style={{ textAlign: 'center', flex: '1' }}>
                    {invoiceData.payment?.breakdown?.depositDate ? formatDate(invoiceData.payment.breakdown.depositDate) : ''}
                  </div>

                  {/* Right side: ADDITIONAL DEPOSIT PAYMENT label */}
                  <div style={{ textAlign: 'right', flex: '1' }}>
                    ADDITIONAL DEPOSIT PAYMENT:
                  </div>
                </div>
                <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                  {formatCurrency(invoiceData.pricing?.overpaymentsCustomer || 0)}
                </div>
              </div>
            )}

            {/* Part Exchange Payment - LAST in payment section */}
            {(invoiceData.payment?.partExchange?.amountPaid || 0) > 0 && (
              <>
                <div style={{ display: 'flex', marginBottom: '1px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px', flex: '1' }}>
                    {/* Left side: Date - only show if date exists */}
                    <div style={{ textAlign: 'center', flex: '1' }}>
                      {invoiceData.payment?.breakdown?.partExDate ? formatDate(invoiceData.payment.breakdown.partExDate) : ''}
                    </div>

                    {/* Right side: PART EXCHANGE label */}
                    <div style={{ textAlign: 'right', flex: '1' }}>
                      PART EXCHANGE:
                    </div>
                  </div>
                  <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                    {formatCurrency(invoiceData.payment?.partExchange?.amountPaid || 0)}
                  </div>
                </div>
                {/* Vehicle details on new line below */}
                {(invoiceData.payment?.partExchange?.makeAndModel || invoiceData.payment?.partExchange?.vehicleRegistration) && (
                  <div style={{ display: 'flex', marginBottom: '1px' }}>
                    <div style={{ fontSize: '6px', textAlign: 'right', flex: '1', fontStyle: 'italic', color: '#666' }}>
                      {invoiceData.payment.partExchange.makeAndModel || ''} {invoiceData.payment.partExchange.makeAndModel && invoiceData.payment.partExchange.vehicleRegistration ? '-' : ''} {invoiceData.payment.partExchange.vehicleRegistration || ''}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Finance Payment */}
            {/* {(invoiceData.payment?.breakdown?.financeAmount || 0) > 0 && invoiceData.saleType !== 'Trade' && invoiceData.invoiceTo === 'Finance Company' && (
              // <div style={{ display: 'flex', marginBottom: '1px' }}>
              //   <div style={{ fontSize: '7px', textAlign: 'right', flex: '1' }}>
              //     FINANCE:
              //   </div>
              //   <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
              //     {formatCurrency(invoiceData.payment.breakdown.financeAmount)} - {formatDate(invoiceData.payment?.breakdown?.financeDate || invoiceData.invoiceDate)}
              //   </div>
              // </div>
            )} */}
          </div>
          
          {/* Balance Due Section - Below Payment Breakdown */}
          <div style={{ marginTop: '0', paddingTop: '4px', borderTop: '1px solid #d0d0d0' }}>
            {invoiceData.saleType !== 'Trade' && (
              <div style={{ display: 'flex', marginBottom: '2px' }}>
                <div style={{ flex: '1', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '7px', fontWeight: 'bold' }}>
                    {invoiceData.invoiceTo === 'Finance Company' ? 'FINANCE' : 'CUSTOMER'}
                  </div>
                  <div style={{ fontSize: '7px', fontWeight: 'bold', textAlign: 'right' }}>
                    {(() => {
                      // Check if there's unpaid deposit for Customer invoices (not Finance Company)
                      const hasUnpaidDeposit = invoiceData.invoiceTo === 'Customer' && 
                        (invoiceData.pricing?.outstandingDepositCustomer ?? 0) > 0;
                      
                      return hasUnpaidDeposit 
                        ? 'BALANCE DUE (including any unpaid deposit):' 
                        : 'BALANCE DUE:';
                    })()}
                  </div>
                </div>
                <div style={{ fontSize: '7px', fontWeight: 'bold', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                  {formatCurrency(calculateRemainingBalance(invoiceData))}
                </div>
              </div>
            )}
            
            {/* Amount Due Section */}
            {(invoiceData.invoiceTo === 'Finance Company' || invoiceData.saleType === 'Trade') && (
              <div style={{ display: 'flex', marginBottom: '1px' }}>
                <div style={{ fontSize: '7px', fontWeight: 'bold', textAlign: 'right', flex: '1' }}>
                  {(() => {
                    // Check if there's unpaid deposit for Trade sales (not Finance Company)
                    const hasUnpaidDeposit = invoiceData.saleType === 'Trade' && 
                      (invoiceData.pricing?.outstandingDepositCustomer ?? 0) > 0;
                    
                    if (invoiceData.saleType === 'Trade') {
                      return hasUnpaidDeposit 
                        ? 'BALANCE DUE (including any unpaid deposit):' 
                        : 'BALANCE DUE:';
                    } else {
                      // Finance Company - no deposit text added
                      return 'AMOUNT DUE:';
                    }
                  })()}
                </div>
                <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                  {formatCurrency(calculateRemainingBalance(invoiceData))}
                </div>
              </div>
            )}
            
            {/* Due Date Section - Only show if balance due > 0 */}
            {calculateRemainingBalance(invoiceData) > 0 && (
              <div style={{ display: 'flex', marginBottom: '1px' }}>
                <div style={{ fontSize: '7px', textAlign: 'right', flex: '1' }}>
                  DUE BY:
                </div>
                <div style={{ fontSize: '7px', textAlign: 'right', marginLeft: '10px', flex: '1' }}>
                  {formatDate(invoiceData.delivery?.date || invoiceData.invoiceDate)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Information, Thank You & QR Code - 3 Column Layout (matching PDF) */}
      <div style={{ display: 'flex', marginTop: '16px', marginBottom: '16px' }}>
        {/* Left Column - Payment Information */}
        <div style={{ flex: '1' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>
            PAYMENT INFORMATION
          </div>
          <div style={{ fontSize: '7px' }}>
            {invoiceData.companyInfo.name}
          </div>
          {invoiceData.companyInfo.payment?.bankSortCode && (
            <div style={{ fontSize: '7px' }}>
              {invoiceData.companyInfo.payment.bankSortCode}
            </div>
          )}
          {invoiceData.companyInfo.payment?.bankAccountNumber && (
            <div style={{ fontSize: '7px' }}>
              {invoiceData.companyInfo.payment.bankAccountNumber}
            </div>
          )}
          <div style={{ fontSize: '7px' }}>
            Ref - {invoiceData.invoiceNumber}
          </div>
        </div>

        {/* Middle Column - Thank You */}
        <div style={{ flex: '1', textAlign: 'center' }}>
          <div style={{ fontSize: '7px', textAlign: 'center' }}>
            Thank you for choosing {invoiceData.companyInfo.name}
          </div>
        </div>

        {/* Right Column - QR Code */}
        <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {invoiceData.companyInfo.qrCode ? (
            <Image 
              src={invoiceData.companyInfo.qrCode} 
              alt="QR Code" 
              width={60}
              height={60}
              style={{ 
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{ 
              width: '60px', 
              height: '60px', 
              border: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{ 
                fontSize: '7px', 
                textAlign: 'center',
                color: '#000',
                fontWeight: 'normal'
              }}>
                QR Code
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Page 2 - Checklist or Trade Disclaimer
  const renderPage2 = () => (
    <div className="bg-white w-full max-w-[310mm] mx-auto shadow-lg min-h-[1000px] pdf-content-container invoice-pdf-light-theme" style={{ 
      fontFamily: 'Century Gothic, Arial, sans-serif', 
      fontSize: '7px', 
      lineHeight: '1.1',
      padding: '10px', // Match PDF page padding
      isolation: 'isolate' // Prevent CSS leakage
    }}>
      {invoiceData.saleType === 'Trade' ? (
        // Trade Sale Disclaimer - Matching Professional PDF Format
        <div>
          {/* Top information text */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '8px', fontWeight: 'normal', textAlign: 'left' }}>
              This document contains key information provided as part of the sale
            </div>
          </div>

          {/* Logo centered and big */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            {invoiceData.companyInfo?.logo && (
              <img
                src={invoiceData.companyInfo.logo}
                alt="Company Logo"
                style={{ 
                  height: '60px', 
                  width: 'auto', 
                  objectFit: 'contain' 
                }}
              />
            )}
          </div>

          {/* Grey banner header */}
          <div style={{ backgroundColor: '#f5f5f5', padding: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
              TRADE SALE DISCLAIMER
            </div>
          </div>
          
          {/* Grey line separator */}
          <div style={{ height: '1px', backgroundColor: '#cccccc', marginBottom: '10px' }}></div>
          
          {/* Customer details */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ textAlign: 'left', fontWeight: '600', fontSize: '10px', marginBottom: '8px' }}>
              {invoiceData.customer?.title} {invoiceData.customer?.firstName} {invoiceData.customer?.middleName ? invoiceData.customer.middleName + ' ' : ''}{invoiceData.customer?.lastName} - <span style={{ fontWeight: '600', fontSize: '10px' }}>{invoiceData.vehicle?.make} {invoiceData.vehicle?.model}</span> - <span style={{ fontWeight: '600', fontSize: '10px' }}>{invoiceData.vehicle?.registration}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ textAlign: 'left', fontSize: '10px' }}>
                DATE OF SALE:
              </div>
              <div style={{ textAlign: 'right', fontSize: '10px' }}>
                {invoiceData.sale?.date ? new Date(invoiceData.sale.date).toLocaleDateString('en-GB') : ''}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ textAlign: 'left', fontSize: '10px' }}>
                {invoiceData.delivery?.type === 'delivery' ? 'DATE OF DELIVERY:' : 'DATE OF COLLECTION:'}
              </div>
              <div style={{ textAlign: 'right', fontSize: '10px' }}>
                {invoiceData.delivery?.date ? new Date(invoiceData.delivery.date).toLocaleDateString('en-GB') : ''}
              </div>
            </div>
          </div>
          
          {/* Grey line separator */}
          <div style={{ height: '1px', backgroundColor: '#cccccc', marginBottom: '10px' }}></div>

          {/* Trade terms content */}
          {invoiceData.terms?.tradeTerms && (
            <div style={{ marginTop: '30px', fontSize: '12px', lineHeight: '1.5' }}>
              {invoiceData.terms.tradeTerms}
            </div>
          )}

          {/* Customer Signature Section */}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #d0d0d0', paddingBottom: '8px', borderBottom: '1px solid #d0d0d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '200px', textAlign: 'center' }}>
                {invoiceData.signature?.customerSignature ? (
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={invoiceData.signature.customerSignature}
                      alt="Customer Signature"
                      style={{ width: '150px', height: '60px', marginBottom: '8px' }}
                    />
                    <div style={{ fontSize: '7px', marginBottom: '4px', fontFamily: 'Century Gothic, Arial, sans-serif' }}>
                      Customer Signature
                    </div>
                    <div style={{ fontSize: '7px', fontFamily: 'Century Gothic, Arial, sans-serif' }}>
                      Date: {invoiceData.signature?.dateOfSignature || '___________'}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '150px', height: '1px', backgroundColor: '#000000', marginBottom: '8px', margin: '0 auto 8px auto' }}></div>
                    <div style={{ fontSize: '7px', marginBottom: '4px', fontFamily: 'Century Gothic, Arial, sans-serif' }}>
                      Customer Signature
                    </div>
                    <div style={{ fontSize: '7px', fontFamily: 'Century Gothic, Arial, sans-serif' }}>
                      Date: {invoiceData.signature?.dateOfSignature || '___________'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Vehicle Checklist (Retail)
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center' }}>
            VEHICLE CHECKLIST
          </div>
          
          {/* Vehicle Details - Two Column Layout (matching PDF) */}
          <div style={{ marginBottom: '16px', paddingLeft: '20px', paddingRight: '20px' }}>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                MILEAGE:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.mileage || invoiceData.vehicle.mileage} miles
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                CAMBELT/CHAIN CONFIRMATION:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.cambeltChainConfirmation === 'Yes' ? 'YES' : 'NO'}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                FUEL TYPE:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.fuelType || invoiceData.vehicle.fuelType}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                NUMBER OF KEYS:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.numberOfKeys || '2'}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                SERVICE BOOK:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.serviceHistoryRecord || 'Not Available'}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                USER MANUAL:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.userManual === 'Present' || invoiceData.checklist?.userManual === 'Digital Copy Available' ? 'YES' : 'NO'}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                WHEEL LOCKING NUT:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.wheelLockingNut === 'Present' ? 'YES' : 'NO'}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                VEHICLE INSPECTION & TEST DRIVE:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.vehicleInspectionTestDrive === 'Yes' ? 'YES' : 'NO'}
              </div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ flex: '1', textAlign: 'right', paddingRight: '8px', fontSize: '7px' }}>
                DEALER PRE-SALE CHECK:
              </div>
              <div style={{ flex: '1', textAlign: 'left', fontSize: '7px' }}>
                {invoiceData.checklist?.dealerPreSaleCheck === 'Yes' ? 'YES' : 'NO'}
              </div>
            </div>
          </div>

          {/* Vertical Separator */}
          <div style={{ 
            height: '2px', 
            backgroundColor: '#d0d0d0', 
            marginTop: '20px', 
            marginBottom: '15px',
            marginLeft: '20px',
            marginRight: '20px'
          }} />

          {/* Customer has accepted the IDD Section - Only for Finance Company Retail */}
          {invoiceData.invoiceTo === 'Finance Company' && (
            <div style={{ marginBottom: '15px', paddingLeft: '20px', paddingRight: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ 
                  fontSize: '9px', 
                  fontWeight: 'bold',
                  textAlign: 'left' 
                }}>
                  Customer has accepted the IDD:
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  fontWeight: 'normal',
                  textAlign: 'right' 
                }}>
                  {invoiceData.customerAcceptedIdd || 'N/A'}
                </div>
              </div>
            </div>
          )}

          {/* Another Vertical Separator */}
          <div style={{ 
            height: '1px', 
            backgroundColor: '#d0d0d0', 
            marginBottom: '8px',
            marginLeft: '20px',
            marginRight: '20px'
          }} />

          {/* Dynamic Checklist Terms from Database */}
          {invoiceData.terms.checklistTerms && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '7px', lineHeight: '1.4' }}>
                {renderHTMLContentForPreview(invoiceData.terms.checklistTerms, 10)}
              </div>
            </div>
          )}

<div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #d0d0d0', paddingBottom: '8px', borderBottom: '1px solid #d0d0d0' }}>
        <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '16px' }}>SIGNATURE & DATES</div>
        
        {invoiceData.signature.customerSignature || invoiceData.signature.customerAvailableForSignature === 'Yes' ? (
          // Digital signature block
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '8px' }}>Customer Signature</div>
            {invoiceData.signature.customerSignature ? (
              <div style={{ padding: '16px' }}>
                <img 
                  src={invoiceData.signature.customerSignature} 
                  alt="Customer Signature" 
                  style={{ width: '150px', height: '60px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '7px' }}>
                  Date: {formatDate(invoiceData.signature.dateOfSignature || '')}
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '7px', color: '#000' }}>Digital signature to be captured</div>
              </div>
            )}
          </div>
        ) : null}
        
        {!invoiceData.signature.customerSignature || invoiceData.signature.customerAvailableForSignature === 'No' ? (
          // Wet ink signature lines
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '16px' }}>Wet Ink Signature</div>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>Customer Signature:</div>
                <div style={{ borderBottom: '1px solid #999', height: '32px', width: '100%' }}></div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>Date:</div>
                <div style={{ borderBottom: '1px solid #999', height: '32px', width: '192px' }}></div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>Dealer Signature:</div>
                <div style={{ borderBottom: '1px solid #999', height: '32px', width: '100%' }}></div>
              </div>
              <div>
                <div style={{ marginBottom: '8px' }}>Date:</div>
                <div style={{ borderBottom: '1px solid #999', height: '32px', width: '192px' }}></div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
        </div>
      )}

      {/* Signature Blocks */}
      
    </div>
  );

  // Render Page 3 - Standard T&Cs (only for non-Trade)
  const renderPage3 = () => (
    <div className="bg-white p-8 w-full max-w-[310mm] mx-auto shadow-lg min-h-[1000px] pdf-content-container invoice-pdf-light-theme" style={{ isolation: 'isolate' }}>
      <h2 style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center' }}>
        {invoiceData.companyInfo.name.toUpperCase()} STANDARD LIMITED TERMS AND CONDITIONS
      </h2>
      <div style={{ fontSize: '7px', lineHeight: '1.4' }}>
        {invoiceData.terms.basicTerms ? (
          <div>{renderHTMLContentForPreview(invoiceData.terms.basicTerms, 10)}</div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-500 italic text-center">
              No custom terms and conditions have been configured in the database.
              <br />
              Please add your terms and conditions in the store settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Render Page 4 - In-House Warranty Engine & Transmission
  const renderPage4 = () => {
    if (invoiceData.saleType === 'Trade') return null;
    
    return (
      <div className="bg-white p-8 w-full max-w-[310mm] mx-auto shadow-lg min-h-[1000px] pdf-content-container invoice-pdf-light-theme" style={{ isolation: 'isolate' }}>
        <h2 style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center' }}>IN-HOUSE ENGINE & TRANSMISSION WARRANTY</h2>
        <div style={{ fontSize: '7px', lineHeight: '1.4' }}>
          {invoiceData.terms.inHouseWarrantyTerms ? (
            <div>{renderHTMLContentForPreview(invoiceData.terms.inHouseWarrantyTerms, 10)}</div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-500 italic text-center">
                No custom in-house warranty terms have been configured in the database.
                <br />
                Please add your warranty terms in the store settings.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Page 5 - In-House Warranty Policy Details (REMOVED - matches PDF)
  const renderPage5 = () => null;

  // Render Page 6 - External Warranty
  const renderPage6 = () => {
    if (invoiceData.saleType === 'Trade') return null;
    
    return (
      <div className="bg-white p-8 w-full max-w-[310mm] mx-auto shadow-lg min-h-[1000px] pdf-content-container invoice-pdf-light-theme" style={{ isolation: 'isolate' }}>
        <h2 style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center' }}>EXTERNAL WARRANTY{invoiceData.warranty.name ? ` — ${invoiceData.warranty.name.toUpperCase()}` : ''}</h2>
        <div style={{ fontSize: '7px', lineHeight: '1.4' }}>
          {invoiceData.terms.thirdPartyTerms ? (
            <div>{renderHTMLContentForPreview(invoiceData.terms.thirdPartyTerms, 10)}</div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-500 italic text-center">
                No custom third-party warranty terms have been configured in the database.
                <br />
                Please add your external warranty terms in the store settings.
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '7px', color: '#000' }}>
            <p>{invoiceData.warranty.name ? `${invoiceData.warranty.name} Ltd` : 'Evolution Warranties Ltd'} | Registered in England | Company Registration: [Number]</p>
            <p>Last Updated: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>
    );
  };

  // Render current page
  const renderCurrentPage = () => {
    const currentPageData = visiblePages[currentPage - 1];
    if (!currentPageData) return null;

    switch (currentPageData.id) {
      case 1: return renderPage1();
      case 2: return renderPage2();
      case 3: return renderPage3();
      case 4: return renderPage4();
      case 5: return renderPage5();
      case 6: return renderPage6();
      default: return null;
    }
  };

  return (
    <div className={`safari-preview-wrapper ${className}`} style={{ isolation: 'isolate' }}>
      {/* Add inline styles to force light theme for PDF content */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .invoice-pdf-light-theme,
          .invoice-pdf-light-theme * {
            color: #374151 !important;
          }
          .invoice-pdf-light-theme {
            background-color: #ffffff !important;
          }
          .invoice-pdf-light-theme .bg-white {
            background-color: #ffffff !important;
          }
          .invoice-pdf-light-theme .text-black {
            color: #000000 !important;
          }
          .invoice-pdf-light-theme .text-gray-700 {
            color: #374151 !important;
          }
          .invoice-pdf-light-theme .text-gray-600 {
            color: #4b5563 !important;
          }
          .invoice-pdf-light-theme .text-slate-600 {
            color: #475569 !important;
          }
          /* Override any dark mode text colors specifically for PDF preview */
          .dark .invoice-pdf-light-theme,
          .dark .invoice-pdf-light-theme * {
            color: #374151 !important;
            background-color: inherit !important;
          }
          .dark .invoice-pdf-light-theme {
            background-color: #ffffff !important;
          }
        `
      }} />
      
      {/* Preview Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50 dark:bg-slate-800 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {visiblePages[currentPage - 1]?.title}: {visiblePages[currentPage - 1]?.description}
          </div>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-400">
          Auto-sized to fit
        </div>
      </div>

      {/* Page Visibility Indicators */}
      <div className="flex items-center justify-center p-2 border-b bg-slate-50 dark:bg-slate-800">
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5, 6].map((pageNum) => {
            const pageData = visiblePages.find(p => p.id === pageNum);
            const isVisible = !!pageData;
            const isCurrent = currentPage === visiblePages.findIndex(p => p.id === pageNum) + 1;
            
            return (
              <div
                key={pageNum}
                className={`w-2 h-2 rounded-full ${
                  isVisible 
                    ? isCurrent 
                      ? 'bg-blue-600' 
                      : 'bg-green-500'
                    : 'bg-slate-300'
                }`}
                title={`Page ${pageNum}: ${isVisible ? 'Visible' : 'Hidden'}`}
              />
            );
          })}
        </div>
      </div>

      {/* PDF Preview Area */}
      <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-4 min-h-0">
        <div className="min-h-full flex justify-center items-start">
          <div className="invoice-pdf-preview-wrapper w-full max-w-6xl min-h-[1000px]" style={{ 
            isolation: 'isolate',
            contain: 'style layout'
          }}>
            {renderCurrentPage()}
          </div>
        </div>
      </div>
    </div>
  );
}
