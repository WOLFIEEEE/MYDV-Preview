import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { ComprehensiveInvoiceData } from '@/app/api/invoice-data/route';
import { 
  registerCenturyGothicFonts, 
  CENTURY_GOTHIC_FONT_FAMILY
} from '@/lib/fonts';

// Register Century Gothic fonts
registerCenturyGothicFonts();
// Removed htmlToText import as module doesn't exist

// Simple HTML to text conversion for PDF
const htmlToTextForPDF = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

// Enhanced styles that more closely match the live preview
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 32,
    fontSize: 10,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
    lineHeight: 1.4,
  },
  
  // Header Section - matches live preview styling exactly
  headerContainer: {
    border: '2px solid #cbd5e1', // matches border-2 border-slate-300
    padding: 16, // matches p-4
    marginBottom: 24, // matches mb-6
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companySection: {
    flex: 1,
    alignItems: 'center', // Center all content including logo
  },
  companyLogo: {
    height: 80, // Increased to match professional PDF
    width: 'auto', // maintain aspect ratio
    marginBottom: 16, // matches mb-4
    objectFit: 'contain',
    alignSelf: 'center', // Center the logo
  },
  companyName: {
    fontSize: 24, // matches text-2xl
    fontWeight: 'bold',
    color: '#0f172a', // matches text-slate-900
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 14, // matches text-sm
    color: '#475569', // matches text-slate-600
    lineHeight: 1.4,
    marginTop: 8,
  },
  companyDetailLine: {
    marginBottom: 2,
  },
  
  // Invoice Info Section
  invoiceInfoSection: {
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 18, // matches text-lg
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 14, // matches text-sm
    marginBottom: 4,
  },
  salePrice: {
    fontSize: 20, // matches text-xl
    fontWeight: 'bold',
    color: '#2563eb', // matches text-blue-600
    marginTop: 8,
  },
  
  // Badge styling
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeBlue: {
    backgroundColor: '#dbeafe', // matches bg-blue-100
    color: '#1e40af', // matches text-blue-800
  },
  badgeGreen: {
    backgroundColor: '#dcfce7', // matches bg-green-100
    color: '#166534', // matches text-green-800
  },
  
  // Content Sections
  contentSection: {
    border: '1px solid #cbd5e1', // matches border border-slate-300
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18, // matches text-lg
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  
  // Vehicle Header Section
  vehicleHeader: {
    fontSize: 18, // matches text-lg
    fontWeight: 'bold',
    marginBottom: 8,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleDetails: {
    fontSize: 14, // matches text-sm
    color: '#475569', // matches text-slate-600
    lineHeight: 1.4,
  },
  
  // Finance Company Section
  financeCompanySection: {
    marginBottom: 24,
  },
  financeCompanyName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  // Discount Section
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  
  // Warranty Section
  warrantyHighlight: {
    backgroundColor: '#eff6ff', // matches bg-blue-50
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  warrantyText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  warrantyPrice: {
    marginTop: 8,
  },
  warrantyPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  warrantyPriceFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontWeight: 'bold',
  },
  warrantyDetails: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
  },
  warrantyDetailsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  // Add-ons Section
  addonSubsection: {
    marginBottom: 16,
  },
  addonTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  
  // Delivery/Customer Section
  depositInfo: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  depositInfoBlue: {
    backgroundColor: '#eff6ff', // matches bg-blue-50
  },
  depositInfoGreen: {
    backgroundColor: '#f0fdf4', // matches bg-green-50
  },
  depositTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  // Payment Breakdown
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 8,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 8,
  },
  
  // Finance Summary
  financeSummaryText: {
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  financeSummaryBold: {
    fontWeight: 'bold',
  },
  
  // Customer Details
  customerName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    lineHeight: 1.4,
  },
  customerContact: {
    marginTop: 8,
  },
  
  // Thank You Section
  thankYouSection: {
    textAlign: 'center',
  },
  thankYouTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  
  // Page 2+ Styles
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // Trade Disclaimer
  tradeNotice: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tradeParagraph: {
    marginBottom: 16,
    lineHeight: 1.5,
  },
  tradeBullets: {
    marginLeft: 16,
    lineHeight: 1.5,
  },
  
  // Checklist Styles
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  checklistColumn: {
    flex: 1,
    minWidth: '45%',
  },
  checklistSubsection: {
    marginBottom: 24,
  },
  checklistSubtitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  checklistItem: {
    marginBottom: 4,
  },
  
  // Signature Section
  signatureSection: {
    marginTop: 32,
    border: '1px solid #cbd5e1',
    padding: 24,
  },
  signatureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  signatureBlock: {
    marginBottom: 24,
  },
  signatureBlockTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  signatureBox: {
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  signaturePlaceholder: {
    color: '#64748b',
  },
  signatureLines: {
    marginTop: 16,
  },
  signatureLine: {
    marginBottom: 16,
  },
  signatureLineLabel: {
    marginBottom: 8,
  },
  signatureLineUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    height: 32,
    width: '100%',
  },
  signatureLineUnderlineShort: {
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    height: 32,
    width: 192, // matches w-48
  },
  
  // Terms & Conditions
  termsContent: {
    fontSize: 10,
    lineHeight: 1.6,
  },
  termsParagraph: {
    marginBottom: 16,
  },
  termsPlaceholder: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  
  // Warranty Pages
  warrantySection: {
    marginBottom: 24,
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  warrantyPageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 16,
    textAlign: 'center',
  },
  warrantyPageText: {
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  warrantyList: {
    marginLeft: 16,
    marginBottom: 12,
  },
  warrantyListItem: {
    marginBottom: 4,
  },
  
  // Warranty Table
  warrantyTable: {
    marginBottom: 24,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  tableCellLast: {
    flex: 1,
    padding: 8,
    fontSize: 10,
  },
  
  // Footer
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
  },
});

interface EnhancedInvoicePDFDocumentProps {
  invoiceData: ComprehensiveInvoiceData;
}

const EnhancedInvoicePDFDocument: React.FC<EnhancedInvoicePDFDocumentProps> = ({ invoiceData }) => {
  // Format currency to match live preview
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  // Format date to match live preview
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Calculate visible pages (same logic as live preview) - NO HOOKS for server-side rendering
  const visiblePages = (() => {
    const pages = [
      { 
        id: 1, 
        title: 'Invoice Core', 
        description: 'Main invoice, vehicle, customer, payment details',
        visible: true
      },
      { 
        id: 2, 
        title: 'Checklist/Disclaimer', 
        description: invoiceData.saleType === 'Trade' ? 'Trade sale disclaimer' : 'Vehicle checklist',
        visible: true
      },
      { 
        id: 3, 
        title: 'Standard T&Cs', 
        description: 'Standard retail terms and conditions',
        visible: invoiceData.saleType !== 'Trade'
      },
      { 
        id: 4, 
        title: 'In-House Warranty (Engine)', 
        description: 'In-house warranty: Engine & Transmission',
        visible: invoiceData.invoiceType === 'Retail (Customer) Invoice' && invoiceData.warranty.inHouse
      },
      { 
        id: 5, 
        title: 'In-House Warranty (Policy)', 
        description: 'In-house warranty: Policy details table',
        visible: invoiceData.invoiceType === 'Retail (Customer) Invoice' && invoiceData.warranty.inHouse
      },
      { 
        id: 6, 
        title: 'External Warranty', 
        description: 'External warranty information (Evolution Warranties)',
        visible: !invoiceData.warranty.inHouse && invoiceData.warranty.level !== 'None Selected'
      }
    ];

    return pages.filter(page => page.visible);
  })();

  // Check if discounts should be shown (matches live preview logic)
  const showDiscounts = (invoiceData.pricing.discountOnSalePrice && invoiceData.pricing.discountOnSalePrice > 0) ||
                       (invoiceData.pricing.discountOnWarranty && invoiceData.pricing.discountOnWarranty > 0);

  // Render Page 1 - Invoice Core (Enhanced to match live preview exactly)
  const renderPage1 = () => (
    <Page size="A4" style={styles.page}>
      {/* Company Header - matches live preview border-2 border-slate-300 p-4 mb-6 */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={styles.companySection}>
            {invoiceData.companyInfo.logo && (
              <Image
                style={styles.companyLogo}
                src={invoiceData.companyInfo.logo}
              />
            )}
            <Text style={styles.companyName}>
              {invoiceData.companyInfo.name}
            </Text>
            <View style={styles.companyDetails}>
              <Text style={styles.companyDetailLine}>{invoiceData.companyInfo.address.street}</Text>
              <Text style={styles.companyDetailLine}>{invoiceData.companyInfo.address.city}, {invoiceData.companyInfo.address.postCode}</Text>
              <Text style={styles.companyDetailLine}>Tel: {invoiceData.companyInfo.contact.phone}</Text>
              <Text style={styles.companyDetailLine}>Email: {invoiceData.companyInfo.contact.email}</Text>
              {invoiceData.companyInfo.vatNumber && (
                <Text style={styles.companyDetailLine}>VAT: {invoiceData.companyInfo.vatNumber}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.invoiceInfoSection}>
            <Text style={styles.invoiceNumber}>Invoice #: {invoiceData.invoiceNumber}</Text>
            <Text style={styles.invoiceDate}>Date: {formatDate(invoiceData.invoiceDate)}</Text>
            <Text style={styles.salePrice}>
              Sale Price: {formatCurrency(invoiceData.pricing.salePricePostDiscount)}
            </Text>
          </View>
        </View>
        
        {/* Remaining Balance Badge */}
        <View style={styles.badgeContainer}>
          {invoiceData.invoiceTo === 'Finance Company' ? (
            <View style={[styles.badge, styles.badgeBlue]}>
              <Text>Remaining Balance: {formatCurrency(invoiceData.payment.balanceToFinance || 0)}</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeGreen]}>
              <Text>Remaining Balance: {formatCurrency(invoiceData.payment.customerBalanceDue || 0)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Invoice To (Finance Company) */}
      {invoiceData.invoiceTo === 'Finance Company' && (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>INVOICE TO</Text>
              <Text style={styles.financeCompanyName}>
                {invoiceData.vehicle?.registration || 'REG'} - {
                  invoiceData.financeCompany?.name === 'Other' 
                    ? (invoiceData.financeCompany?.companyName || 'Finance Company')
                    : (invoiceData.financeCompany?.name || 'Finance Company')
                }
              </Text>
          {invoiceData.financeCompany?.companyName && invoiceData.financeCompany?.name !== 'Other' && (
            <Text>{invoiceData.financeCompany.companyName}</Text>
          )}
          {invoiceData.financeCompany?.address?.firstLine && (
            <Text>{invoiceData.financeCompany.address.firstLine}</Text>
          )}
          {invoiceData.financeCompany?.address?.countyPostCodeContact && (
            <Text>{invoiceData.financeCompany.address.countyPostCodeContact}</Text>
          )}
        </View>
      )}

      {/* Vehicle Header & Line */}
      <View style={styles.contentSection}>
        <Text style={styles.vehicleHeader}>
          {invoiceData.vehicle.make} {invoiceData.vehicle.model} – {invoiceData.vehicle.registration}
        </Text>
        <View style={styles.vehicleRow}>
          <Text>Qty: 1</Text>
          <Text>Rate: {formatCurrency(invoiceData.pricing.salePrice)}</Text>
          {showDiscounts && invoiceData.pricing.discountOnSalePrice && (
            <Text>Discount: {formatCurrency(invoiceData.pricing.discountOnSalePrice)}</Text>
          )}
          <Text style={{ fontWeight: 'bold' }}>Final: {formatCurrency(invoiceData.pricing.salePricePostDiscount)}</Text>
        </View>
        <Text style={styles.vehicleDetails}>
          {invoiceData.vehicle.derivative} · {invoiceData.vehicle.mileage} miles · 
          Engine: {invoiceData.vehicle.engineNumber} · {invoiceData.vehicle.engineCapacity} · 
          VIN: {invoiceData.vehicle.vin} · First Reg: {formatDate(invoiceData.vehicle.firstRegDate)} · 
          Colour: {invoiceData.vehicle.colour}
        </Text>
      </View>

      {/* Discount Section (conditional) */}
      {showDiscounts && (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>DISCOUNTS APPLIED</Text>
          {invoiceData.pricing.discountOnSalePrice && invoiceData.pricing.discountOnSalePrice > 0 && (
            <View style={styles.discountRow}>
              <Text>Discount on Sale Price:</Text>
              <Text>{formatCurrency(invoiceData.pricing.discountOnSalePrice)}</Text>
            </View>
          )}
          {invoiceData.pricing.discountOnWarranty && invoiceData.pricing.discountOnWarranty > 0 && (
            <View style={styles.discountRow}>
              <Text>Discount on Warranty:</Text>
              <Text>{formatCurrency(invoiceData.pricing.discountOnWarranty)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Warranty Block */}
      {invoiceData.warranty.level !== 'None Selected' && (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>WARRANTY</Text>
          <View style={styles.discountRow}>
            <Text style={{ fontWeight: 'bold' }}>Type: </Text>
            <Text>{invoiceData.warranty.inHouse ? 'In-House Warranty' : 'External Warranty'}</Text>
          </View>
          <View style={styles.discountRow}>
            <Text style={{ fontWeight: 'bold' }}>Level: </Text>
            <Text>{invoiceData.warranty.level}</Text>
          </View>
          {invoiceData.warranty.inHouse && (
            <View style={styles.warrantyHighlight}>
              <Text style={styles.warrantyText}>
                {invoiceData.warranty.level === '3 Months' ? 
                  '3 Month In-House Warranty Included' : 
                  '30 Day In-House Warranty Included'
                }
              </Text>
            </View>
          )}
          {invoiceData.pricing.warrantyPrice && invoiceData.pricing.warrantyPrice > 0 && (
            <View style={styles.warrantyPrice}>
              <View style={styles.warrantyPriceRow}>
                <Text>Warranty Price:</Text>
                <Text>{formatCurrency(invoiceData.pricing.warrantyPrice)}</Text>
              </View>
              {invoiceData.pricing.discountOnWarranty && invoiceData.pricing.discountOnWarranty > 0 && (
                <View style={styles.warrantyPriceRow}>
                  <Text>Discount:</Text>
                  <Text>-{formatCurrency(invoiceData.pricing.discountOnWarranty)}</Text>
                </View>
              )}
              <View style={styles.warrantyPriceFinal}>
                <Text>Final Price:</Text>
                <Text>{formatCurrency(invoiceData.pricing.warrantyPricePostDiscount || invoiceData.pricing.warrantyPrice)}</Text>
              </View>
            </View>
          )}
          {invoiceData.warranty.details && (
            <View style={styles.warrantyDetails}>
              <Text style={styles.warrantyDetailsTitle}>Warranty Details for Customer:</Text>
              <Text>{invoiceData.warranty.details}</Text>
            </View>
          )}
        </View>
      )}

      {/* Add-ons/Extras */}
      {(invoiceData.addons.finance.enabled || invoiceData.addons.customer.enabled) && (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>ADD-ONS / EXTRAS</Text>
          
          {invoiceData.addons.finance.enabled && (
            <View style={styles.addonSubsection}>
              <Text style={styles.addonTitle}>Finance Add-ons</Text>
              {invoiceData.addons.finance.addon1 && (
                <View style={styles.addonRow}>
                  <Text>{invoiceData.addons.finance.addon1.name}</Text>
                  <Text>{formatCurrency(invoiceData.addons.finance.addon1.cost)}</Text>
                </View>
              )}
              {invoiceData.addons.finance.addon2 && (
                <View style={styles.addonRow}>
                  <Text>{invoiceData.addons.finance.addon2.name}</Text>
                  <Text>{formatCurrency(invoiceData.addons.finance.addon2.cost)}</Text>
                </View>
              )}
            </View>
          )}
          
          {invoiceData.addons.customer.enabled && (
            <View>
              <Text style={styles.addonTitle}>Customer Add-ons</Text>
              {invoiceData.addons.customer.addon1 && (
                <View style={styles.addonRow}>
                  <Text>{invoiceData.addons.customer.addon1.name}</Text>
                  <Text>{formatCurrency(invoiceData.addons.customer.addon1.cost)}</Text>
                </View>
              )}
              {invoiceData.addons.customer.addon2 && (
                <View style={styles.addonRow}>
                  <Text>{invoiceData.addons.customer.addon2.name}</Text>
                  <Text>{formatCurrency(invoiceData.addons.customer.addon2.cost)}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Delivery/Collection & Deposits */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>
          {invoiceData.delivery.type === 'Delivery' ? 'DELIVER TO: CUSTOMER DETAILS' : 'CUSTOMER DETAILS'}
        </Text>
        
        {/* Deposit Information */}
        {invoiceData.invoiceTo === 'Finance Company' ? (
          <View style={[styles.depositInfo, styles.depositInfoBlue]}>
            <Text style={styles.depositTitle}>Finance Deposit Information</Text>
            {(invoiceData.pricing.amountPaidDepositFinance || 0) < 0.01 ? (
              <View>
                <Text>DEPOSIT DUE: {formatCurrency(invoiceData.pricing.compulsorySaleDepositFinance || 0)}</Text>
                <Text>DATE OF {invoiceData.delivery.type.toUpperCase()}: {formatDate(invoiceData.delivery.date || '')}</Text>
                {invoiceData.delivery.type === 'Delivery' && (
                  <Text>COST OF DELIVERY: {formatCurrency(invoiceData.delivery.cost || 0)}</Text>
                )}
              </View>
            ) : (
              <View>
                <Text>DEPOSIT AMOUNT PAID: {formatCurrency(invoiceData.pricing.amountPaidDepositFinance || 0)}</Text>
                <Text>DATE OF {invoiceData.delivery.type.toUpperCase()}: {formatDate(invoiceData.delivery.date || '')}</Text>
                {invoiceData.delivery.type === 'Delivery' && (
                  <Text>COST OF DELIVERY: {formatCurrency(invoiceData.delivery.cost || 0)}</Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.depositInfo, styles.depositInfoGreen]}>
            <Text style={styles.depositTitle}>Customer Deposit Information</Text>
            {(invoiceData.pricing.amountPaidDepositCustomer || 0) > 0.01 && (
              <Text>DEPOSIT PAID: {formatDate(invoiceData.signature.dateOfSignature || '')}</Text>
            )}
          </View>
        )}
      </View>

      {/* Payment Breakdown */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>PAYMENT BREAKDOWN</Text>
        
        {invoiceData.saleType === 'Commercial' ? (
          <View>
            <View style={styles.paymentRow}>
              <Text>SUBTOTAL:</Text>
              <Text>{formatCurrency(invoiceData.pricing.salePricePostDiscount)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text>VAT (Commercial):</Text>
              <Text>{formatCurrency(invoiceData.pricing.salePricePostDiscount * 0.2)}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.paymentTotal}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(invoiceData.pricing.salePricePostDiscount * 1.2)}</Text>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.paymentRow}>
              <Text>SUBTOTAL:</Text>
              <Text>{formatCurrency(invoiceData.pricing.salePricePostDiscount)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text>VAT (0%):</Text>
              <Text>£0.00</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.paymentTotal}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(invoiceData.pricing.salePricePostDiscount)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Finance Summary */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>FINANCE SUMMARY</Text>
        <View>
          <Text style={styles.financeSummaryText}>
            <Text style={styles.financeSummaryBold}>TOTAL CASH PRICE:</Text> {formatCurrency(invoiceData.pricing.salePricePostDiscount)}
          </Text>
          <Text style={styles.financeSummaryText}>
            <Text style={styles.financeSummaryBold}>AMOUNTS DUE:</Text> 
            {' '}Compulsory Deposit {formatCurrency(invoiceData.pricing.compulsorySaleDepositFinance || invoiceData.pricing.compulsorySaleDepositCustomer || 0)}, 
            {' '}Delivery {formatCurrency(invoiceData.delivery.cost || 0)}, 
            {' '}Due By {formatDate(invoiceData.delivery.date || '')}
          </Text>
          {(invoiceData.pricing.amountPaidDepositFinance || invoiceData.pricing.amountPaidDepositCustomer) && (
            <Text style={styles.financeSummaryText}>
              <Text style={styles.financeSummaryBold}>DEPOSIT PAID:</Text> {formatCurrency(invoiceData.pricing.amountPaidDepositFinance || invoiceData.pricing.amountPaidDepositCustomer || 0)} 
              {' '}ON {formatDate(invoiceData.signature.dateOfSignature || '')}
            </Text>
          )}
          {invoiceData.payment.partExchange?.included && (
            <Text style={styles.financeSummaryText}>
              <Text style={styles.financeSummaryBold}>PART-EX:</Text> {formatCurrency(invoiceData.payment.partExchange.amountPaid || 0)}, 
              {' '}{invoiceData.payment.partExchange.makeAndModel}, 
              {' '}{invoiceData.payment.partExchange.vehicleRegistration}, 
              {' '}Settlement {formatCurrency(invoiceData.payment.partExchange.settlementAmount || 0)}
            </Text>
          )}
          <Text style={styles.financeSummaryText}>
            <Text style={styles.financeSummaryBold}>BALANCE TO FINANCE:</Text> {formatCurrency(invoiceData.payment.balanceToFinance || invoiceData.payment.customerBalanceDue || 0)}
          </Text>
        </View>
      </View>

      {/* Customer Details */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>CUSTOMER POSTAL DETAILS</Text>
        <View style={styles.customerAddress}>
          <Text style={styles.customerName}>
            {invoiceData.customer.title} {invoiceData.customer.firstName} {invoiceData.customer.middleName} {invoiceData.customer.lastName}
          </Text>
          <Text>{invoiceData.customer.address.firstLine}</Text>
          {invoiceData.customer.address.secondLine && <Text>{invoiceData.customer.address.secondLine}</Text>}
          {invoiceData.customer.address.city && <Text>{invoiceData.customer.address.city}</Text>}
          {invoiceData.customer.address.county && <Text>{invoiceData.customer.address.county}</Text>}
          <Text>{invoiceData.customer.address.postCode}</Text>
          <Text>{invoiceData.customer.address.country}</Text>
          <View style={styles.customerContact}>
            <Text>Tel: {invoiceData.customer.contact.phone}</Text>
            <Text>Email: {invoiceData.customer.contact.email}</Text>
          </View>
        </View>
      </View>

      {/* Bank Details & Thank You */}
      <View style={[styles.contentSection, styles.thankYouSection]}>
        <Text style={styles.thankYouTitle}>THANK YOU FOR YOUR BUSINESS</Text>
        <Text>Bank Details: [Bank information would go here]</Text>
        <Text style={{ marginTop: 8 }}>[QR Code would be displayed here]</Text>
      </View>

      {/* Footer */}
      <Text style={styles.pageFooter}>
        Page 1 of {visiblePages.length}
      </Text>
    </Page>
  );

  // Render Page 2 - Checklist or Trade Disclaimer (Enhanced to match live preview)
  const renderPage2 = () => (
    <Page size="A4" style={styles.page}>
      {invoiceData.saleType === 'Trade' ? (
        // Trade Sale Disclaimer
        <View>
          <Text style={styles.pageTitle}>TRADE SALE DISCLAIMER</Text>
          <View style={styles.contentSection}>
            <Text style={styles.tradeNotice}>IMPORTANT NOTICE - TRADE SALE</Text>
            <Text style={styles.tradeParagraph}>
              This vehicle is sold as a trade sale and is not covered by consumer protection legislation. 
              The vehicle is sold as seen with no warranty or guarantee provided.
            </Text>
            <Text style={styles.tradeParagraph}>
              The buyer acknowledges that they have inspected the vehicle and are satisfied with its condition. 
              No consumer aftercare or statutory rights apply to this sale.
            </Text>
            <Text style={styles.tradeBullets}>
              • The vehicle is sold without warranty{'\n'}
              • You have inspected the vehicle and are satisfied with its condition{'\n'}
              • No returns or exchanges will be accepted{'\n'}
              • The sale is final upon completion
            </Text>
            <View style={{ marginTop: 24 }}>
              <Text style={styles.termsPlaceholder}>
                {invoiceData.terms.tradeTerms || 'Trade terms and conditions would be displayed here.'}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        // Vehicle Checklist (Retail)
        <View>
          <Text style={styles.pageTitle}>VEHICLE CHECKLIST</Text>
          <View style={styles.contentSection}>
            {/* Two-column checklist layout with right-aligned labels and left-aligned values */}
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  MILEAGE:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.mileage || invoiceData.vehicle.mileage} miles
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  CAMBELT/CHAIN CONFIRMATION:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.cambeltChainConfirmation ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  FUEL TYPE:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.fuelType || invoiceData.vehicle.fuelType}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  NUMBER OF KEYS:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.numberOfKeys || '2'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  SERVICE HISTORY RECORD PRESENT:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.serviceHistoryRecord ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  USER MANUAL:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.userManual ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  WHEEL LOCKING NUT:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.wheelLockingNut ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  VEHICLE INSPECTION & TEST DRIVE:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.vehicleInspectionTestDrive ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>
                  DEALER PRE-SALE CHECK:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left' }]}>
                  {invoiceData.checklist?.dealerPreSaleCheck ? 'YES' : 'NO'}
                </Text>
              </View>
            </View>
            
            <View style={{ marginTop: 24 }}>
              <Text style={styles.termsPlaceholder}>
                {invoiceData.terms.checklistTerms 
                  ? htmlToTextForPDF(invoiceData.terms.checklistTerms)
                  : 'Vehicle checklist terms and conditions would be displayed here.'
                }
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Signature Blocks */}
      <View style={styles.signatureSection}>
        <Text style={styles.signatureTitle}>SIGNATURE & DATES</Text>
        
        {invoiceData.signature.customerSignature || invoiceData.signature.customerAvailableForSignature === 'Yes' ? (
          // Digital signature block
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureBlockTitle}>Digital Signature (Captured)</Text>
            {invoiceData.signature.customerSignature ? (
              <View style={styles.signatureBox}>
                <Text>Customer Signature: [Digital signature would be displayed here]</Text>
                <Text style={{ marginTop: 8, fontSize: 12 }}>Date: {formatDate(invoiceData.signature.dateOfSignature || '')}</Text>
              </View>
            ) : (
              <View style={styles.signatureBox}>
                <Text style={styles.signaturePlaceholder}>Digital signature to be captured</Text>
              </View>
            )}
          </View>
        ) : null}
        
        {!invoiceData.signature.customerSignature || invoiceData.signature.customerAvailableForSignature === 'No' ? (
          // Wet ink signature lines
          <View>
            <Text style={styles.signatureBlockTitle}>Wet Ink Signature</Text>
            <View style={styles.signatureLines}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLineLabel}>Customer Signature:</Text>
                <View style={styles.signatureLineUnderline} />
              </View>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLineLabel}>Date:</Text>
                <View style={styles.signatureLineUnderlineShort} />
              </View>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLineLabel}>Dealer Signature:</Text>
                <View style={styles.signatureLineUnderline} />
              </View>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLineLabel}>Date:</Text>
                <View style={styles.signatureLineUnderlineShort} />
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* Footer */}
      <Text style={styles.pageFooter}>
        Page 2 of {visiblePages.length}
      </Text>
    </Page>
  );

  // Render Page 3 - Standard T&Cs (Enhanced to match live preview)
  const renderPage3 = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.pageTitle}>
        {invoiceData.companyInfo.name.toUpperCase()} STANDARD LIMITED TERMS AND CONDITIONS
      </Text>
      <View style={styles.termsContent}>
        {invoiceData.terms.basicTerms ? (
          <Text>{htmlToTextForPDF(invoiceData.terms.basicTerms)}</Text>
        ) : (
          <View>
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>1. The Agreement</Text> - These terms and conditions form the basis of the agreement between the customer and the dealer...</Text>
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>2. Payment Terms</Text> - Payment must be made in accordance with the agreed terms...</Text>
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>3. Delivery</Text> - The vehicle will be delivered or made available for collection on the agreed date...</Text>
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>4. Warranty</Text> - The warranty terms are as specified in the invoice...</Text>
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>5. Consumer Rights</Text> - Your statutory rights are not affected by these terms...</Text>
            <Text style={styles.termsPlaceholder}>[Full terms and conditions would be displayed here based on the custom terms stored in the database]</Text>
          </View>
        )}
      </View>
      
      {/* Footer */}
      <Text style={styles.pageFooter}>
        Page 3 of {visiblePages.length}
      </Text>
    </Page>
  );

  // Render Page 4 - In-House Warranty Engine & Transmission
  const renderPage4 = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.pageTitle}>IN-HOUSE ENGINE & TRANSMISSION WARRANTY</Text>
      <View style={styles.termsContent}>
        {invoiceData.terms.inHouseWarrantyTerms ? (
          <Text>{htmlToTextForPDF(invoiceData.terms.inHouseWarrantyTerms)}</Text>
        ) : (
          <View>
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>WARRANTY COVERAGE</Text></Text>
            <Text style={styles.termsParagraph}>This warranty covers the engine and transmission components of your vehicle for the period specified in your invoice.</Text>
            
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>WHAT IS COVERED</Text></Text>
            <View style={styles.warrantyList}>
              <Text style={styles.warrantyListItem}>• Engine block and internal components</Text>
              <Text style={styles.warrantyListItem}>• Transmission and gearbox</Text>
              <Text style={styles.warrantyListItem}>• Cooling system components</Text>
              <Text style={styles.warrantyListItem}>• Fuel system components</Text>
            </View>
            
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>WHAT IS NOT COVERED</Text></Text>
            <View style={styles.warrantyList}>
              <Text style={styles.warrantyListItem}>• Wear and tear items</Text>
              <Text style={styles.warrantyListItem}>• Damage due to misuse or neglect</Text>
              <Text style={styles.warrantyListItem}>• Consumable items (oil, filters, etc.)</Text>
              <Text style={styles.warrantyListItem}>• Electrical components</Text>
            </View>
            
            <Text style={styles.termsPlaceholder}>[Full in-house warranty terms would be displayed here based on the custom terms stored in the database]</Text>
          </View>
        )}
      </View>
      
      {/* Footer */}
      <Text style={styles.pageFooter}>
        Page 4 of {visiblePages.length}
      </Text>
    </Page>
  );

  // Render Page 5 - In-House Warranty Policy Details
  const renderPage5 = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.pageTitle}>IN-HOUSE WARRANTY POLICY DETAILS</Text>
      
      {/* Warranty Table */}
      <View style={styles.warrantyTable}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.tableCell}>Component</Text>
          <Text style={styles.tableCell}>Coverage Period</Text>
          <Text style={styles.tableCellLast}>Conditions</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Engine Block</Text>
          <Text style={styles.tableCell}>{invoiceData.warranty.level}</Text>
          <Text style={styles.tableCellLast}>Subject to regular servicing</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Transmission</Text>
          <Text style={styles.tableCell}>{invoiceData.warranty.level}</Text>
          <Text style={styles.tableCellLast}>Subject to regular servicing</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Cooling System</Text>
          <Text style={styles.tableCell}>{invoiceData.warranty.level}</Text>
          <Text style={styles.tableCellLast}>Excludes wear items</Text>
        </View>
      </View>
      
      {/* Policy Details */}
      <View style={styles.termsContent}>
        <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>CLAIMS PROCEDURE</Text></Text>
        <Text style={styles.termsParagraph}>To make a warranty claim, contact us immediately when a fault is discovered. Do not attempt repairs without prior authorization.</Text>
        
        <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>LIMITATIONS</Text></Text>
        <Text style={styles.termsParagraph}>This warranty is limited to the repair or replacement of defective parts. Labor costs are included for covered components only.</Text>
        
        <View style={{ marginTop: 24, textAlign: 'center' }}>
          <Text style={styles.termsPlaceholder}>[Warranty policy image or additional details would be displayed here]</Text>
        </View>
      </View>
      
      {/* Footer */}
      <Text style={styles.pageFooter}>
        Page 5 of {visiblePages.length}
      </Text>
    </Page>
  );

  // Render Page 6 - External Warranty
  const renderPage6 = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.pageTitle}>EXTERNAL WARRANTY — EVOLUTION WARRANTIES</Text>
      <View style={styles.termsContent}>
        {invoiceData.terms.thirdPartyTerms ? (
          <Text>{invoiceData.terms.thirdPartyTerms}</Text>
        ) : (
          <View>
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>WARRANTY INFORMATION</Text></Text>
            <Text style={styles.termsParagraph}>Your vehicle is covered by an external warranty provided by Evolution Warranties, one of the UK's leading warranty providers.</Text>
            
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>COVERAGE DETAILS</Text></Text>
            <Text style={styles.termsParagraph}>Level: {invoiceData.warranty.level}</Text>
            <Text style={styles.termsParagraph}>This warranty provides comprehensive coverage for mechanical and electrical components as detailed in your warranty handbook.</Text>
            
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>CLAIMS PROCESS</Text></Text>
            <Text style={styles.termsParagraph}>To make a claim, contact Evolution Warranties directly on their claims hotline. You will need your warranty certificate and vehicle details.</Text>
            
            <Text style={styles.termsParagraph}><Text style={{ fontWeight: 'bold' }}>IMPORTANT NOTES</Text></Text>
            <View style={styles.warrantyList}>
              <Text style={styles.warrantyListItem}>• Regular servicing is required to maintain warranty validity</Text>
              <Text style={styles.warrantyListItem}>• Claims are subject to terms and conditions in your warranty handbook</Text>
              <Text style={styles.warrantyListItem}>• Some components may have specific coverage limitations</Text>
            </View>
            
            <Text style={styles.termsPlaceholder}>[Full external warranty terms would be displayed here based on the custom terms stored in the database]</Text>
          </View>
        )}
        
        <View style={{ marginTop: 32, textAlign: 'center', fontSize: 8, color: '#6b7280' }}>
          <Text>Evolution Warranties Ltd | Registered in England | Company Registration: [Number]</Text>
          <Text>Last Updated: {formatDate(new Date().toISOString())}</Text>
        </View>
      </View>
      
      {/* Footer */}
      <Text style={styles.pageFooter}>
        Page 6 of {visiblePages.length}
      </Text>
    </Page>
  );

  return (
    <Document>
      {visiblePages.map((page) => {
        switch (page.id) {
          case 1:
            return renderPage1();
          case 2:
            return renderPage2();
          case 3:
            return renderPage3();
          case 4:
            return renderPage4();
          case 5:
            return renderPage5();
          case 6:
            return renderPage6();
          default:
            return null;
        }
      })}
    </Document>
  );
};

export default EnhancedInvoicePDFDocument;
