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

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 32,
    fontSize: 10,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  companyLogo: {
    width: 'auto', // Let width adjust automatically
    height: 80, // Increased to match other PDFs
    objectFit: 'contain',
    alignSelf: 'center', // Center the logo
  },
  companyDetails: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  companyText: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  invoiceTitle: {
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  invoiceTitleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  invoiceDates: {
    fontSize: 8,
    color: '#64748b',
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 24,
  },
  detailBox: {
    flex: 1,
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  detailBoxTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  detailName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  itemsTable: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
    minHeight: 32,
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
    paddingRight: 8,
  },
  tableCellRight: {
    fontSize: 8,
    color: '#374151',
    textAlign: 'right',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  totalsBox: {
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f8fafc',
    minWidth: 180,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 8,
  },
  totalsRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
    marginTop: 4,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  additionalInfo: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 8,
    color: '#64748b',
    lineHeight: 1.4,
    marginBottom: 12,
  },
  checklistSection: {
    marginBottom: 24,
  },
  checklistTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 6,
  },
  checklistBox: {
    width: 10,
    height: 10,
    border: '1px solid #374151',
    marginRight: 6,
    backgroundColor: '#ffffff',
  },
  checklistBoxChecked: {
    width: 10,
    height: 10,
    border: '1px solid #374151',
    marginRight: 6,
    backgroundColor: '#059669',
  },
  checklistText: {
    fontSize: 8,
    color: '#374151',
    flex: 1,
  },
  warrantySection: {
    marginBottom: 24,
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  warrantyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    textAlign: 'center',
  },
  warrantyText: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 6,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
    marginTop: 'auto',
  },
  pageBreak: {
    pageBreakBefore: 'always',
  },
});

interface ComprehensiveInvoicePDFDocumentProps {
  invoiceData: ComprehensiveInvoiceData;
}

const ComprehensiveInvoicePDFDocument: React.FC<ComprehensiveInvoicePDFDocumentProps> = ({ invoiceData }) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return `£${(amount || 0).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Calculate which pages should be shown based on invoice.md conditions
  const visiblePages = React.useMemo(() => {
    const pages = [
      { 
        id: 1, 
        title: 'Invoice Core', 
        visible: true // Page 1 is always visible
      },
      { 
        id: 2, 
        title: 'Checklist/Disclaimer', 
        visible: true // Page 2 is always visible (either checklist or trade disclaimer)
      },
      { 
        id: 3, 
        title: 'Standard T&Cs', 
        visible: invoiceData.saleType !== 'Trade' // HIDE when Trade Invoice
      },
      { 
        id: 4, 
        title: 'In-House Warranty (Engine)', 
        visible: invoiceData.invoiceType === 'Retail (Customer) Invoice' && invoiceData.warranty.inHouse
      },
      { 
        id: 5, 
        title: 'In-House Warranty (Policy)', 
        visible: invoiceData.invoiceType === 'Retail (Customer) Invoice' && invoiceData.warranty.inHouse
      },
      { 
        id: 6, 
        title: 'External Warranty', 
        visible: !invoiceData.warranty.inHouse && invoiceData.warranty.level !== 'None Selected'
      }
    ];

    return pages.filter(page => page.visible);
  }, [invoiceData.saleType, invoiceData.invoiceType, invoiceData.warranty.inHouse, invoiceData.warranty.level]);

  // Render Page 1 - Invoice Core
  const renderPage1 = () => (
    <Page size="A4" style={styles.page}>
      {/* Company Header */}
      <View style={styles.header}>
        <View style={styles.companyInfo}>
          {invoiceData.companyInfo?.logo && (
            <Image
              style={styles.companyLogo}
              src={invoiceData.companyInfo.logo}
            />
          )}
          <View style={styles.companyDetails}>
            <Text style={styles.companyName}>
              {invoiceData.companyInfo?.name || 'Your Company Name'}
            </Text>
            <Text style={styles.companyText}>
              {invoiceData.companyInfo?.address?.street || ''}
            </Text>
            <Text style={styles.companyText}>
              {invoiceData.companyInfo?.address?.city || ''} {invoiceData.companyInfo?.address?.postCode || ''}
            </Text>
            <Text style={styles.companyText}>
              {invoiceData.companyInfo?.contact?.phone || ''} | {invoiceData.companyInfo?.contact?.email || ''}
            </Text>
            {invoiceData.companyInfo?.vatNumber && (
              <Text style={styles.companyText}>
                VAT No: {invoiceData.companyInfo.vatNumber}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.invoiceTitle}>
          <Text style={styles.invoiceTitleText}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
          <Text style={styles.invoiceDates}>
            Date: {formatDate(invoiceData.invoiceDate)}
          </Text>
          <Text style={styles.invoiceDates}>
            Due: {formatDate(invoiceData.invoiceDate)}
          </Text>
        </View>
      </View>

      {/* Customer and Vehicle Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailBox}>
          <Text style={styles.detailBoxTitle}>Invoice To</Text>
          <Text style={styles.detailName}>
            {invoiceData.customer.firstName} {invoiceData.customer.lastName}
          </Text>
          <Text style={styles.detailText}>{invoiceData.customer.address.firstLine}</Text>
          {invoiceData.customer.address.secondLine && (
            <Text style={styles.detailText}>{invoiceData.customer.address.secondLine}</Text>
          )}
          <Text style={styles.detailText}>
            {invoiceData.customer.address.city} {invoiceData.customer.address.postCode}
          </Text>
          <Text style={styles.detailText}>{invoiceData.customer.contact.email}</Text>
          <Text style={styles.detailText}>{invoiceData.customer.contact.phone}</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.detailBoxTitle}>Vehicle Details</Text>
          <Text style={styles.detailName}>
            {invoiceData.vehicle.make} {invoiceData.vehicle.model}
          </Text>
          <Text style={styles.detailText}>{invoiceData.vehicle.registration}</Text>
          <Text style={styles.detailText}>Mileage: {invoiceData.vehicle.mileage} miles</Text>
          <Text style={styles.detailText}>Fuel: {invoiceData.vehicle.fuelType}</Text>
          <Text style={styles.detailText}>Colour: {invoiceData.vehicle.colour}</Text>
          {invoiceData.vehicle.vin && (
            <Text style={styles.detailText}>VIN: {invoiceData.vehicle.vin}</Text>
          )}
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.itemsTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Unit Price</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
        </View>
        
        {invoiceData.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
            <Text style={[styles.tableCellRight, { flex: 1 }]}>{formatCurrency(item.unitPrice)}</Text>
            <Text style={[styles.tableCellRight, { flex: 1 }]}>{formatCurrency(item.total)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(invoiceData.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>VAT (20%):</Text>
            <Text>{formatCurrency(invoiceData.vatAmount)}</Text>
          </View>
          <View style={styles.totalsRowTotal}>
            <Text>Total:</Text>
            <Text>{formatCurrency(invoiceData.totalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Additional Information */}
      {invoiceData.additionalInformation && (
        <View style={styles.additionalInfo}>
          <Text style={styles.infoTitle}>Additional Information</Text>
          <Text style={[styles.infoText, { color: '#666666' }]}>
            {invoiceData.additionalInformation}
          </Text>
        </View>
      )}

      {/* Payment Information */}
      {invoiceData.payment?.method && (
        <View style={styles.additionalInfo}>
          <Text style={styles.infoTitle}>Payment Information</Text>
          <Text style={styles.infoText}>
            Payment Method: {invoiceData.payment.method}
          </Text>
          {invoiceData.payment?.breakdown?.depositAmount && invoiceData.payment.breakdown.depositAmount > 0 && (
            <Text style={styles.infoText}>
              Deposit Paid: {formatCurrency(invoiceData.payment.breakdown.depositAmount)}
            </Text>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>
          Generated on {new Date().toLocaleDateString('en-GB')} at{' '}
          {new Date().toLocaleTimeString('en-GB', { hour12: false })}
        </Text>
      </View>
    </Page>
  );

  // Render Page 2 - Checklist or Trade Disclaimer
  const renderPage2 = () => (
    <Page size="A4" style={styles.page}>
      {invoiceData.saleType === 'Trade' ? (
        // Trade Sale Disclaimer
        <View>
          {/* Company Header */}
          <View style={[styles.companyInfo, { marginBottom: 20 }]}>
            {invoiceData.companyInfo?.logo && (
              <Image
                style={styles.companyLogo}
                src={invoiceData.companyInfo.logo}
              />
            )}
          </View>
          
          <Text style={styles.checklistTitle}>TRADE SALE DISCLAIMER</Text>
          <Text style={styles.infoText}>
            This vehicle is sold as a trade sale and is therefore exempt from certain consumer rights.
            The vehicle is sold as seen with all faults and no warranty is provided.
          </Text>
          <Text style={styles.infoText}>
            By purchasing this vehicle as a trade sale, you acknowledge that:
          </Text>
          <Text style={styles.infoText}>
            • The vehicle is sold without warranty{'\n'}
            • You have inspected the vehicle and are satisfied with its condition{'\n'}
            • No returns or exchanges will be accepted{'\n'}
            • The sale is final upon completion
          </Text>
        </View>
      ) : (
        // Vehicle Checklist
        <View>
          <Text style={styles.checklistTitle}>VEHICLE CHECKLIST</Text>
          <View style={styles.checklistGrid}>
            {invoiceData.checklist && Object.entries(invoiceData.checklist).map(([key, value]) => (
              <View key={key} style={styles.checklistItem}>
                <View style={value ? styles.checklistBoxChecked : styles.checklistBox}>
                  {value && <Text style={{ fontSize: 8, color: '#ffffff', textAlign: 'center' }}>✓</Text>}
                </View>
                <Text style={styles.checklistText}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.footer}>
        <Text>Page 2 of {visiblePages.length}</Text>
      </View>
    </Page>
  );

  // Render Page 3 - Standard Terms & Conditions
  const renderPage3 = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.checklistTitle}>TERMS & CONDITIONS</Text>
      <Text style={styles.infoText}>
        {invoiceData.terms?.basicTerms 
          ? htmlToTextForPDF(invoiceData.terms.basicTerms)
          : 'Standard terms and conditions apply to this sale.'
        }
      </Text>
      
      <View style={styles.footer}>
        <Text>Page 3 of {visiblePages.length}</Text>
      </View>
    </Page>
  );

  // Render Page 4 - In-House Warranty (Engine)
  const renderPage4 = () => (
    <Page size="A4" style={styles.page}>
      <View style={styles.warrantySection}>
        <Text style={styles.warrantyTitle}>IN-HOUSE WARRANTY - ENGINE & TRANSMISSION</Text>
        <Text style={styles.warrantyText}>
          This vehicle comes with our comprehensive in-house warranty covering:
        </Text>
        <Text style={styles.warrantyText}>
          • Engine components and systems{'\n'}
          • Transmission and drivetrain{'\n'}
          • Cooling system{'\n'}
          • Fuel system{'\n'}
          • Electrical systems related to engine operation
        </Text>
        <Text style={styles.warrantyText}>
          Warranty Period: {'12 months'}{'\n'}
          Mileage Limit: {'12,000 miles'}
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text>Page 4 of {visiblePages.length}</Text>
      </View>
    </Page>
  );

  // Render Page 5 - In-House Warranty (Policy)
  const renderPage5 = () => (
    <Page size="A4" style={styles.page}>
      <View style={styles.warrantySection}>
        <Text style={styles.warrantyTitle}>WARRANTY POLICY DETAILS</Text>
        <Text style={styles.warrantyText}>
          Terms and conditions of the in-house warranty:
        </Text>
        <Text style={styles.warrantyText}>
          1. Warranty is valid from the date of purchase{'\n'}
          2. Regular servicing must be maintained{'\n'}
          3. Warranty covers parts and labor{'\n'}
          4. Excludes wear and tear items{'\n'}
          5. Customer must notify us within 24 hours of any issues
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text>Page 5 of {visiblePages.length}</Text>
      </View>
    </Page>
  );

  // Render Page 6 - External Warranty
  const renderPage6 = () => (
    <Page size="A4" style={styles.page}>
      <View style={styles.warrantySection}>
        <Text style={styles.warrantyTitle}>EXTERNAL WARRANTY - EVOLUTION WARRANTIES</Text>
        <Text style={styles.warrantyText}>
          This vehicle is covered by an external warranty provided by Evolution Warranties.
        </Text>
        <Text style={styles.warrantyText}>
          Warranty Level: {invoiceData.warranty.level}{'\n'}
          Duration: {'12 months'}{'\n'}
          Coverage: {'Standard coverage'}
        </Text>
        <Text style={styles.warrantyText}>
          For warranty claims and support, please contact Evolution Warranties directly.
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text>Page 6 of {visiblePages.length}</Text>
      </View>
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

export default ComprehensiveInvoicePDFDocument;

