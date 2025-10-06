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

// Optimized compact styles for professional PDF layout with continuous flow
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontSize: 8,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
    lineHeight: 1.2,
  },
  
  // Page break control
  avoidBreak: {
    // keepTogether is not a valid style property in react-pdf
  },
  
  // Add spacing between major sections instead of page breaks
  sectionSpacer: {
    marginTop: 20,
    marginBottom: 20,
  },
  
  // Header Section - compact version
  headerContainer: {
    border: '1px solid #cbd5e1',
    padding: 10,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companySection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  companyLogo: {
    height: 40,
    width: 'auto',
    marginBottom: 8,
    objectFit: 'contain',
    alignSelf: 'flex-start',
    marginLeft: 0,
    marginRight: 'auto',
  },
  logoContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    flexDirection: 'row',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  companyDetails: {
    fontSize: 8,
    color: '#475569',
    marginTop: 4,
    alignItems: 'flex-start',
    width: '100%',
  },
  companyDetailLine: {
    marginBottom: 1,
  },
  
  // Invoice Info Section - compact
  invoiceInfoSection: {
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 8,
    marginBottom: 2,
  },
  salePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 4,
  },
  
  // Badge styling - compact
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgeBlue: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  badgeGreen: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  
  // Content sections - compact
  contentSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },
  
  // Vehicle Section - compact
  vehicleHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  vehicleDetails: {
    fontSize: 7,
    color: '#64748b',
    lineHeight: 1.2,
  },
  vehicleDetailsBold: {
    fontWeight: 'bold',
  },
  
  // Finance Company
  financeCompanyName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  
  // Discount Section - compact
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  
  // Warranty Section - compact
  warrantyHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  warrantyBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  warrantyPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  warrantyPriceFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontWeight: 'bold',
  },
  warrantyDetails: {
    marginTop: 4,
    fontSize: 7,
    color: '#64748b',
    lineHeight: 1.3,
  },
  
  // Add-on Section - compact
  addonHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#374151',
  },
  addonItem: {
    fontSize: 8,
    marginBottom: 2,
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  
  // Delivery/Customer Section - compact
  customerHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  customerName: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerDetails: {
    fontSize: 8,
    marginBottom: 1,
    color: '#4b5563',
  },
  
  // Payment Breakdown - compact
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  paymentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
    marginTop: 4,
  },
  
  // Finance Summary - compact
  financeSummary: {
    fontSize: 8,
    lineHeight: 1.3,
    marginBottom: 2,
    flexDirection: 'row',
  },
  financeSummaryBold: {
    fontWeight: 'bold',
  },
  
  // Signature Section - compact
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    marginBottom: 2,
    height: 30,
  },
  signatureText: {
    fontSize: 7,
    color: '#64748b',
  },
  signatureContainer: {
    marginTop: 16,
  },
  signatureRow: {
    flexDirection: 'row',
    gap: 20,
  },
  signatureBox: {
    flex: 1,
  },
  
  // Page styling for continuous flow
  pageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  
  // Terms Content - compact
  termsContent: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  termsParagraph: {
    marginBottom: 6,
    fontSize: 8,
    lineHeight: 1.4,
  },
  termsPlaceholder: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
  },
  
  // Trade Disclaimer - compact
  tradeDisclaimer: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    padding: 12,
    marginBottom: 16,
  },
  tradeDisclaimerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 6,
  },
  tradeDisclaimerText: {
    fontSize: 8,
    color: '#7f1d1d',
    lineHeight: 1.4,
  },
  
  // Checklist Styles - compact
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checklistColumn: {
    flex: 1,
    minWidth: '45%',
  },
  checklistItem: {
    marginBottom: 3,
    fontSize: 8,
  },
  checklistBox: {
    width: 8,
    height: 8,
    border: '1px solid #6b7280',
    marginRight: 4,
    // display: 'inline-block' is not supported in react-pdf
  },
  
  // Customer Acceptance - compact
  acceptanceBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #0284c7',
    padding: 8,
    marginTop: 12,
  },
  acceptanceTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  acceptanceItem: {
    fontSize: 7,
    marginBottom: 2,
    paddingLeft: 8,
  },
  
  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
  
  // Table Styles for warranty coverage
  tableContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 20,
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 7,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
});

interface Props {
  invoiceData: ComprehensiveInvoiceData;
}

export default function OptimizedMatchingInvoicePDFDocument({ invoiceData }: Props) {
  // Helper functions
  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Helper function to render HTML content with basic structure preservation for PDF
  const renderHTMLContent = (htmlContent: string): React.ReactElement => {
    if (!htmlContent) return <Text style={styles.termsParagraph}>No content available</Text>;
    
    // First, let's check if this contains table/grid structures
    const hasTable = htmlContent.includes('<table') || htmlContent.includes('<tr>') || htmlContent.includes('<td>');
    const hasGrid = htmlContent.includes('grid') || htmlContent.includes('row') || htmlContent.includes('col-');
    
    // If it has table structure, parse it differently
    if (hasTable) {
      return renderTableContent(htmlContent);
    }
    
    // If it has grid classes, parse as grid
    if (hasGrid) {
      return renderGridContent(htmlContent);
    }
    
    // Otherwise, do simple text extraction with better formatting
    const cleanText = htmlContent
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
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .trim();
    
    const paragraphs = cleanText.split(/\n+/).filter(p => p.trim());
    
    return (
      <View>
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.termsParagraph}>
            {paragraph.trim()}
          </Text>
        ))}
      </View>
    );
  };
  
  // Helper function to render table content
  const renderTableContent = (htmlContent: string) => {
    const rowMatches = htmlContent.match(/<tr[^>]*>(.*?)<\/tr>/gi) || [];
    
    return (
      <View style={{ marginVertical: 8 }}>
        {rowMatches.map((row, rowIndex) => {
          const cellMatches = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi) || [];
          const isHeader = row.includes('<th');
          
          return (
            <View key={rowIndex} style={{ 
              flexDirection: 'row', 
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: isHeader ? '#f8fafc' : 'transparent'
            }}>
              {cellMatches.map((cell, cellIndex) => {
                const cellContent = cell
                  .replace(/<[^>]*>/g, '')
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .trim();
                
                return (
                  <Text key={cellIndex} style={{ 
                    flex: 1, 
                    padding: 6,
                    fontSize: 8,
                    fontWeight: isHeader ? 'bold' : 'normal',
                    borderRight: cellIndex < cellMatches.length - 1 ? '1px solid #e2e8f0' : 'none'
                  }}>
                    {cellContent}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };
  
  // Helper function to render grid content
  const renderGridContent = (htmlContent: string) => {
    const rowMatches = htmlContent.match(/<div[^>]*(?:row|grid)[^>]*>(.*?)<\/div>/gi) || [];
    
    if (rowMatches.length === 0) {
      return renderHTMLContent(htmlContent.replace(/grid|row|col-/g, ''));
    }
    
    return (
      <View style={{ marginVertical: 8 }}>
        {rowMatches.map((row, rowIndex) => {
          const colMatches = row.match(/<div[^>]*col[^>]*>(.*?)<\/div>/gi) || [];
          
          if (colMatches.length === 0) {
            const rowContent = row
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .trim();
            
            return (
              <Text key={rowIndex} style={styles.termsParagraph}>
                {rowContent}
              </Text>
            );
          }
          
          return (
            <View key={rowIndex} style={{ 
              flexDirection: 'row',
              marginBottom: 4
            }}>
              {colMatches.map((col, colIndex) => {
                const colContent = col
                  .replace(/<[^>]*>/g, '')
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .trim();
                
                return (
                  <Text key={colIndex} style={{ 
                    flex: 1,
                    paddingHorizontal: 4,
                    fontSize: 8
                  }}>
                    {colContent}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  // Calculate which sections should be shown
  const shouldShowSection = (sectionId: string) => {
    switch (sectionId) {
      case 'trade-disclaimer': return invoiceData.saleType === 'Trade';
      case 'checklist': return invoiceData.saleType !== 'Trade';
      case 'standard-terms': return invoiceData.saleType !== 'Trade';
      case 'in-house-warranty': return invoiceData.invoiceType === 'Retail (Customer) Invoice' && invoiceData.warranty.inHouse;
      case 'external-warranty': return !invoiceData.warranty.inHouse && invoiceData.warranty.level !== 'None Selected';
      default: return true;
    }
  };

  const showDiscounts = (invoiceData.pricing.discountOnSalePrice && invoiceData.pricing.discountOnSalePrice > 0) ||
                       (invoiceData.pricing.discountOnWarranty && invoiceData.pricing.discountOnWarranty > 0);

  // Render all content in a single page with continuous flow
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Invoice Core Section */}
        <View style={styles.avoidBreak}>
          {/* Company Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerRow}>
              <View style={styles.companySection}>
                {invoiceData.companyInfo.logo && (
                  <View style={styles.logoContainer}>
                    <Image
                      style={styles.companyLogo}
                      src={invoiceData.companyInfo.logo}
                    />
                  </View>
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

          {/* Vehicle Information */}
          <View style={styles.contentSection}>
            <Text style={styles.vehicleHeader}>
              {invoiceData.vehicle.make} {invoiceData.vehicle.model} – {invoiceData.vehicle.registration}
            </Text>
            <View style={styles.vehicleRow}>
              <Text>Qty: 1</Text>
              <Text>Rate: {formatCurrency(invoiceData.pricing.salePrice)}</Text>
              {showDiscounts && invoiceData.pricing.discountOnSalePrice && (
                <Text>Discount: {formatCurrency(invoiceData.pricing.discountOnSalePrice || 0)}</Text>
              )}
              <Text style={styles.vehicleDetailsBold}>Final: {formatCurrency(invoiceData.pricing.salePricePostDiscount)}</Text>
            </View>
            <Text style={styles.vehicleDetails}>
              {invoiceData.vehicle.derivative} · {invoiceData.vehicle.mileage} miles · 
              Engine: {invoiceData.vehicle.engineNumber} · {invoiceData.vehicle.engineCapacity} · 
              VIN: {invoiceData.vehicle.vin} · First Reg: {formatDate(invoiceData.vehicle.firstRegDate)} · 
              Colour: {invoiceData.vehicle.colour}
            </Text>
          </View>

          {/* Warranty Section */}
          {invoiceData.warranty.level !== 'None Selected' && (
            <View style={styles.contentSection}>
              <Text style={styles.warrantyHeader}>WARRANTY PROTECTION</Text>
              <Text style={styles.warrantyBadge}>
                {invoiceData.warranty.inHouse ? 'IN-HOUSE WARRANTY' : 'THIRD PARTY WARRANTY'}
              </Text>
              
              <View style={styles.warrantyPriceRow}>
                <Text>Warranty Level: {invoiceData.warranty.level}</Text>
                <Text>Price: {formatCurrency(invoiceData.pricing.warrantyPrice || 0)}</Text>
              </View>
              
              {showDiscounts && invoiceData.pricing.discountOnWarranty && invoiceData.pricing.discountOnWarranty > 0 && (
                <View style={styles.warrantyPriceRow}>
                  <Text>Discount Applied:</Text>
                  <Text>-{formatCurrency(invoiceData.pricing.discountOnWarranty || 0)}</Text>
                </View>
              )}
              
              <View style={styles.warrantyPriceFinal}>
                <Text>Final Warranty Price:</Text>
                <Text>{formatCurrency(invoiceData.pricing.warrantyPricePostDiscount || 0)}</Text>
              </View>
              
              {invoiceData.warranty.details && (
                <Text style={styles.warrantyDetails}>
                  {invoiceData.warranty.details}
                </Text>
              )}
            </View>
          )}

          {/* Add-ons Section */}
          {(invoiceData.addons.finance.enabled || invoiceData.addons.customer.enabled) && (
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>ADD-ONS & EXTRAS</Text>
              
              {/* Finance Add-ons */}
              {invoiceData.addons.finance.enabled && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.addonHeader}>Finance Add-ons:</Text>
                  {invoiceData.addons.finance.addon1 && (
                    <View style={styles.addonRow}>
                      <Text style={styles.addonItem}>{invoiceData.addons.finance.addon1.name}</Text>
                      <Text>{formatCurrency(invoiceData.addons.finance.addon1?.cost || 0)}</Text>
                    </View>
                  )}
                  {invoiceData.addons.finance.addon2 && (
                    <View style={styles.addonRow}>
                      <Text style={styles.addonItem}>{invoiceData.addons.finance.addon2.name}</Text>
                      <Text>{formatCurrency(invoiceData.addons.finance.addon2?.cost || 0)}</Text>
                    </View>
                  )}
                  {invoiceData.addons.finance.dynamicAddons?.map((addon, index) => (
                    <View key={index} style={styles.addonRow}>
                      <Text style={styles.addonItem}>{addon.name}</Text>
                      <Text>{formatCurrency(addon?.cost || 0)}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Customer Add-ons */}
              {invoiceData.addons.customer.enabled && (
                <View>
                  <Text style={styles.addonHeader}>Customer Add-ons:</Text>
                  {invoiceData.addons.customer.addon1 && (
                    <View style={styles.addonRow}>
                      <Text style={styles.addonItem}>{invoiceData.addons.customer.addon1.name}</Text>
                      <Text>{formatCurrency(invoiceData.addons.customer.addon1?.cost || 0)}</Text>
                    </View>
                  )}
                  {invoiceData.addons.customer.addon2 && (
                    <View style={styles.addonRow}>
                      <Text style={styles.addonItem}>{invoiceData.addons.customer.addon2.name}</Text>
                      <Text>{formatCurrency(invoiceData.addons.customer.addon2?.cost || 0)}</Text>
                    </View>
                  )}
                  {invoiceData.addons.customer.dynamicAddons?.map((addon, index) => (
                    <View key={index} style={styles.addonRow}>
                      <Text style={styles.addonItem}>{addon.name}</Text>
                      <Text>{formatCurrency(addon?.cost || 0)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Payment Breakdown */}
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>PAYMENT BREAKDOWN</Text>
            
            {invoiceData.payment.breakdown.cashAmount > 0 && (
              <View style={styles.paymentRow}>
                <Text>Cash Payment:</Text>
                <Text>{formatCurrency(invoiceData.payment.breakdown.cashAmount)}</Text>
              </View>
            )}
            
            {invoiceData.payment.breakdown.cardAmount > 0 && (
              <View style={styles.paymentRow}>
                <Text>Card Payment:</Text>
                <Text>{formatCurrency(invoiceData.payment.breakdown.cardAmount)}</Text>
              </View>
            )}
            
            {invoiceData.payment.breakdown.bacsAmount > 0 && (
              <View style={styles.paymentRow}>
                <Text>BACS Payment:</Text>
                <Text>{formatCurrency(invoiceData.payment.breakdown.bacsAmount)}</Text>
              </View>
            )}
            
            {invoiceData.payment.breakdown.financeAmount > 0 && (
              <View style={styles.paymentRow}>
                <Text>Finance Amount:</Text>
                <Text>{formatCurrency(invoiceData.payment.breakdown.financeAmount)}</Text>
              </View>
            )}
            
            {invoiceData.payment.breakdown.depositAmount > 0 && (
              <View style={styles.paymentRow}>
                <Text>Deposit Paid:</Text>
                <Text>{formatCurrency(invoiceData.payment.breakdown.depositAmount)}</Text>
              </View>
            )}
            
            {invoiceData.payment.partExchange?.included && (
              <View style={styles.paymentRow}>
                <Text>Part Exchange ({invoiceData.payment.partExchange.vehicleRegistration}):</Text>
                <Text>{formatCurrency(invoiceData.payment.partExchange.valueOfVehicle || 0)}</Text>
              </View>
            )}
            
            <View style={styles.paymentTotal}>
              <Text>Total Paid:</Text>
              <Text>{formatCurrency(
                invoiceData.payment.breakdown.cashAmount +
                invoiceData.payment.breakdown.cardAmount +
                invoiceData.payment.breakdown.bacsAmount +
                invoiceData.payment.breakdown.financeAmount +
                invoiceData.payment.breakdown.depositAmount +
                (invoiceData.payment.partExchange?.valueOfVehicle || 0)
              )}</Text>
            </View>
          </View>

          {/* Customer Information */}
          {invoiceData.invoiceTo === 'Customer' && (
            <View style={styles.contentSection}>
              <Text style={styles.customerHeader}>CUSTOMER INFORMATION</Text>
              <Text style={styles.customerName}>
                {invoiceData.customer.title} {invoiceData.customer.firstName} {invoiceData.customer.lastName}
              </Text>
              <Text style={styles.customerDetails}>{invoiceData.customer.address.firstLine}</Text>
              {invoiceData.customer.address.secondLine && (
                <Text style={styles.customerDetails}>{invoiceData.customer.address.secondLine}</Text>
              )}
              <Text style={styles.customerDetails}>
                {invoiceData.customer.address.city}, {invoiceData.customer.address.postCode}
              </Text>
              <Text style={styles.customerDetails}>Tel: {invoiceData.customer.contact.phone}</Text>
              <Text style={styles.customerDetails}>Email: {invoiceData.customer.contact.email}</Text>
            </View>
          )}

          {/* Finance Company Summary */}
          {invoiceData.invoiceTo === 'Finance Company' && (
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>FINANCE SUMMARY</Text>
              <View style={styles.financeSummary}>
                <Text>Balance to Finance Company: </Text>
                <Text style={styles.financeSummaryBold}>{formatCurrency(invoiceData.payment.balanceToFinance || 0)}</Text>
              </View>
              <View style={styles.financeSummary}>
                <Text>Customer Deposit Required: </Text>
                <Text style={styles.financeSummaryBold}>{formatCurrency(invoiceData.pricing.compulsorySaleDepositFinance || 0)}</Text>
              </View>
              <View style={styles.financeSummary}>
                <Text>Customer Deposit Paid: </Text>
                <Text style={styles.financeSummaryBold}>{formatCurrency(invoiceData.pricing.amountPaidDepositFinance || 0)}</Text>
              </View>
              <View style={styles.financeSummary}>
                <Text>Outstanding Customer Balance: </Text>
                <Text style={styles.financeSummaryBold}>{formatCurrency(invoiceData.payment.customerBalanceDue || 0)}</Text>
              </View>
            </View>
          )}

          {/* Signature Section */}
          <View style={[styles.signatureContainer, styles.avoidBreak]}>
            <View style={styles.signatureRow}>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureText}>Customer Signature</Text>
              </View>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureText}>Date</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Add section spacer */}
        <View style={styles.sectionSpacer} />

        {/* Trade Disclaimer or Checklist */}
        {shouldShowSection('trade-disclaimer') && (
          <View style={styles.avoidBreak}>
            <View style={styles.tradeDisclaimer}>
              <Text style={styles.tradeDisclaimerTitle}>TRADE SALE DISCLAIMER</Text>
              <Text style={styles.tradeDisclaimerText}>
                This vehicle is sold as a TRADE SALE. The buyer acknowledges that:
              </Text>
              <Text style={styles.tradeDisclaimerText}>
                • No warranty is provided with this sale
              </Text>
              <Text style={styles.tradeDisclaimerText}>
                • The vehicle is sold as seen and approved by the buyer
              </Text>
              <Text style={styles.tradeDisclaimerText}>
                • The buyer has been advised to conduct their own inspection
              </Text>
              <Text style={styles.tradeDisclaimerText}>
                • All statutory rights under consumer protection laws do not apply
              </Text>
            </View>
            {invoiceData.terms.tradeTerms && (
              <View style={{ marginTop: 24 }}>
                {renderHTMLContent(invoiceData.terms.tradeTerms)}
              </View>
            )}
          </View>
        )}

        {shouldShowSection('checklist') && (
          <View style={styles.avoidBreak}>
            <Text style={styles.pageTitle}>VEHICLE CHECKLIST & ACKNOWLEDGMENT</Text>
            
            <View style={styles.checklistGrid}>
              <View style={styles.checklistColumn}>
                <Text style={styles.checklistItem}>
                  [✓] Mileage: {invoiceData.checklist.mileage} miles
                </Text>
                <Text style={styles.checklistItem}>
                  [{invoiceData.checklist.cambeltChainConfirmation === 'Yes' ? '✓' : ' '}] Cambelt/Chain within service schedule
                </Text>
                <Text style={styles.checklistItem}>
                  [✓] Fuel Type: {invoiceData.checklist.fuelType}
                </Text>
                <Text style={styles.checklistItem}>
                  [✓] Number of Keys: {invoiceData.checklist.numberOfKeys}
                </Text>
              </View>
              
              <View style={styles.checklistColumn}>
                <Text style={styles.checklistItem}>
                  [{invoiceData.checklist.serviceHistoryRecord === 'Yes' ? '✓' : ' '}] Service History Record Present
                </Text>
                <Text style={styles.checklistItem}>
                  [{invoiceData.checklist.userManual === 'Yes' ? '✓' : ' '}] User Manual Present
                </Text>
                <Text style={styles.checklistItem}>
                  [{invoiceData.checklist.wheelLockingNut === 'Yes' ? '✓' : ' '}] Wheel Locking Nut Present
                </Text>
                <Text style={styles.checklistItem}>
                  [{invoiceData.checklist.vehicleInspectionTestDrive === 'Yes' ? '✓' : ' '}] Vehicle Inspection & Test Drive
                </Text>
              </View>
            </View>

            <View style={styles.acceptanceBox}>
              <Text style={styles.acceptanceTitle}>CUSTOMER ACCEPTANCE</Text>
              <Text style={styles.acceptanceItem}>• I have been provided information on the warranty options available</Text>
              <Text style={styles.acceptanceItem}>• I have inspected the vehicle and am satisfied with its condition</Text>
              <Text style={styles.acceptanceItem}>• I acknowledge receipt of all items marked present above</Text>
              <Text style={styles.acceptanceItem}>• I have been given the opportunity to test drive the vehicle</Text>
              <Text style={styles.acceptanceItem}>• I accept the terms and conditions of sale</Text>
            </View>

            <View style={{ marginTop: 24 }}>
              {invoiceData.terms.checklistTerms ? (
                <View>{renderHTMLContent(invoiceData.terms.checklistTerms)}</View>
              ) : (
                <Text style={styles.termsPlaceholder}>
                  Standard vehicle handover checklist terms apply.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Add section spacer only if there are more sections */}
        {(shouldShowSection('standard-terms') || shouldShowSection('in-house-warranty') || shouldShowSection('external-warranty')) && (
          <View style={styles.sectionSpacer} />
        )}

        {/* Standard Terms */}
        {shouldShowSection('standard-terms') && (
          <View style={styles.avoidBreak}>
            <Text style={styles.pageTitle}>
              {invoiceData.companyInfo.name.toUpperCase()} STANDARD LIMITED TERMS AND CONDITIONS
            </Text>
            <View style={styles.termsContent}>
              {invoiceData.terms.basicTerms ? (
                <View>{renderHTMLContent(invoiceData.terms.basicTerms)}</View>
              ) : (
                <View>
                  <Text style={styles.termsParagraph}>
                    1. These terms and conditions apply to all vehicle sales.
                  </Text>
                  <Text style={styles.termsParagraph}>
                    2. Payment is due in full before delivery of the vehicle.
                  </Text>
                  <Text style={styles.termsParagraph}>
                    3. Title to the vehicle remains with the seller until full payment is received.
                  </Text>
                  <Text style={styles.termsParagraph}>
                    4. All vehicles are sold with any existing manufacturer's warranty remaining.
                  </Text>
                  <Text style={styles.termsParagraph}>
                    5. The buyer acknowledges they have inspected the vehicle and are satisfied with its condition.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Add section spacer */}
        {(shouldShowSection('in-house-warranty') || shouldShowSection('external-warranty')) && (
          <View style={styles.sectionSpacer} />
        )}

        {/* In-House Warranty */}
        {shouldShowSection('in-house-warranty') && (
          <>
            <View style={styles.avoidBreak}>
              <Text style={styles.pageTitle}>IN-HOUSE ENGINE & TRANSMISSION WARRANTY</Text>
              <View style={styles.termsContent}>
                {invoiceData.terms.inHouseWarrantyTerms ? (
                  <View>{renderHTMLContent(invoiceData.terms.inHouseWarrantyTerms)}</View>
                ) : (
                  <View>
                    <Text style={styles.termsParagraph}>
                      This warranty covers major engine and transmission components for the period specified.
                    </Text>
                    <Text style={styles.termsParagraph}>
                      Coverage includes: engine block, cylinder head, internal engine components, gearbox casing, and internal gearbox components.
                    </Text>
                    <Text style={styles.termsParagraph}>
                      Exclusions: wear and tear items, consumables, and damage due to lack of maintenance.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.sectionSpacer} />

            <View style={styles.avoidBreak}>
              <Text style={styles.pageTitle}>IN-HOUSE WARRANTY POLICY DETAILS</Text>
              
              {/* Warranty Coverage Table */}
              <View style={{ border: '1px solid #cbd5e1', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, fontWeight: 'bold', borderRight: '1px solid #cbd5e1' }}>Component</Text>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, fontWeight: 'bold', borderRight: '1px solid #cbd5e1' }}>Coverage Period</Text>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, fontWeight: 'bold' }}>Conditions</Text>
                </View>
                
                <View style={{ flexDirection: 'row', borderBottom: '1px solid #cbd5e1' }}>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, borderRight: '1px solid #cbd5e1' }}>Engine Block</Text>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, borderRight: '1px solid #cbd5e1' }}>{invoiceData.warranty.level}</Text>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10 }}>Subject to regular servicing</Text>
                </View>
                
                <View style={{ flexDirection: 'row', borderBottom: '1px solid #cbd5e1' }}>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, borderRight: '1px solid #cbd5e1' }}>Transmission</Text>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, borderRight: '1px solid #cbd5e1' }}>{invoiceData.warranty.level}</Text>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10 }}>Subject to regular servicing</Text>
                </View>
                
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, borderRight: '1px solid #cbd5e1' }}>Cooling System</Text>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10, borderRight: '1px solid #cbd5e1' }}>{invoiceData.warranty.level}</Text>
                  <Text style={{ flex: 1, padding: 8, fontSize: 10 }}>Excludes wear items</Text>
                </View>
              </View>

              <View style={styles.termsContent}>
                <Text style={styles.termsParagraph}>
                  <Text style={{ fontWeight: 'bold' }}>Claims Procedure:</Text> In the event of a claim, contact our service department immediately. 
                  Do not proceed with any repairs without prior authorization.
                </Text>
                <Text style={styles.termsParagraph}>
                  <Text style={{ fontWeight: 'bold' }}>Service Requirements:</Text> Vehicle must be serviced according to manufacturer's schedule. 
                  Proof of servicing must be retained.
                </Text>
                <Text style={styles.termsParagraph}>
                  <Text style={{ fontWeight: 'bold' }}>Warranty Transfer:</Text> This warranty is transferable to subsequent owners within the warranty period.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* External Warranty */}
        {shouldShowSection('external-warranty') && (
          <View style={styles.avoidBreak}>
            <Text style={styles.pageTitle}>EXTERNAL WARRANTY — EVOLUTION WARRANTIES</Text>
            <View style={styles.termsContent}>
              {invoiceData.terms.thirdPartyTerms ? (
                <View>{renderHTMLContent(invoiceData.terms.thirdPartyTerms)}</View>
              ) : (
                <View>
                  <Text style={styles.termsParagraph}>
                    Your vehicle is covered by an Evolution Warranty for {invoiceData.warranty.level}.
                  </Text>
                  <Text style={styles.termsParagraph}>
                    <Text style={{ fontWeight: 'bold' }}>What's Covered:</Text> Comprehensive coverage including engine, transmission, 
                    electrical systems, air conditioning, and more. Please refer to your warranty booklet for full details.
                  </Text>
                  <Text style={styles.termsParagraph}>
                    <Text style={{ fontWeight: 'bold' }}>Claims:</Text> Contact Evolution Warranties directly on 0333 077 8585. 
                    Authorization must be obtained before any repair work is undertaken.
                  </Text>
                  <Text style={styles.termsParagraph}>
                    <Text style={{ fontWeight: 'bold' }}>Service Requirements:</Text> Regular servicing in line with manufacturer's 
                    recommendations is required to maintain warranty validity.
                  </Text>
                  <Text style={styles.termsParagraph}>
                    Full terms and conditions are provided in your Evolution Warranty documentation pack.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
