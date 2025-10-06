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

// Clean professional styles matching the reference image
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 15,
    fontSize: 9,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
    color: '#333333',
  },

  // Clean Header Section - More compact and top-aligned
  headerSection: {
    flexDirection: 'row',
    padding: 8,
    paddingTop: 0,
    backgroundColor: '#ffffff',
    gap: 20,
    marginBottom: 10,
  },

  // Left Column - Logo and Company Info - More compact
  leftColumn: {
    flex: 1.2,
    gap: 10,
  },

  logoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  companyLogo: {
    width: 50,
    height: 50,
    objectFit: 'contain',
    backgroundColor: '#ffffff',
  },

  companyDetails: {
    flex: 1,
  },

  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  companyAddress: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.2,
  },

  // Two-column layout for Invoice and Deliver To - More compact
  invoiceDeliverRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  invoiceDeliverBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 8,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  invoiceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  invoiceLabel: {
    fontSize: 8,
    color: '#666666',
  },

  invoiceValue: {
    fontSize: 8,
    fontWeight: 'semibold',
    color: '#333333',
  },

  customerName: {
    fontSize: 9,
    fontWeight: 'semibold',
    color: '#333333',
    marginBottom: 4,
  },

  customerAddress: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.3,
  },

  // Right Column - Purchase Invoice Header and Details - Repositioned
  rightColumn: {
    flex: 0.8,
    alignItems: 'flex-end',
  },

  purchaseInvoiceHeader: {
    backgroundColor: '#ffffff',
    color: '#333333',
    padding: 8,
    marginBottom: 8,
    alignItems: 'flex-end',
    width: '100%',
  },

  purchaseInvoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
    textAlign: 'right',
  },

  purchaseInvoiceSubtitle: {
    fontSize: 7,
    color: '#666666',
    textAlign: 'right',
  },

  // Invoice details in top-right format
  invoiceDetailsBox: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    width: '100%',
    marginBottom: 6,
  },

  invoiceDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },

  invoiceDetailsLabel: {
    fontSize: 7,
    color: '#666666',
    fontWeight: 'bold',
  },

  invoiceDetailsValue: {
    fontSize: 7,
    color: '#333333',
    fontWeight: 'bold',
  },

  contactDetailsBox: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    width: '100%',
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },

  contactLabel: {
    fontSize: 8,
    fontWeight: 'semibold',
    color: '#333333',
    width: 30,
  },

  contactValue: {
    fontSize: 8,
    color: '#666666',
    flex: 1,
  },

  // Vehicle Details Grid Section - Ultra Compact Table Design
  vehicleSection: {
    padding: 6,
    backgroundColor: '#ffffff',
    marginBottom: 6,
  },

  vehicleSectionHeader: {
    marginBottom: 4,
  },

  vehicleTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  vehicleTitleIcon: {
    width: 12,
    height: 1,
    backgroundColor: '#666666',
  },

  // 6-column table grid
  vehicleTable: {
    backgroundColor: '#ffffff',
    border: '1px solid #e9ecef',
  },

  vehicleTableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f1f3f4',
  },

  // 3-column cell with horizontal layout and left alignment
  vehicleTableCell: {
    flex: 1,
    padding: 3,
    borderRight: '1px solid #f1f3f4',
    minHeight: 14,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },

  // Last cell in row (no right border)
  vehicleTableCellLast: {
    flex: 1,
    padding: 3,
    minHeight: 14,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },

  // Horizontal container for label and value with left alignment
  vehicleTableCellContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 2,
    paddingLeft: 3,
    width: '100%',
    flexWrap: 'wrap',
  },

  vehicleTableLabel: {
    fontSize: 5.5,
    fontWeight: 'bold',
    color: '#666666',
    lineHeight: 0.8,
  },

  vehicleTableValue: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#333333',
    lineHeight: 0.8,
    flexWrap: 'wrap',
    flexShrink: 1,
  },

  vehicleTableValueHighlight: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#333333',
    lineHeight: 0.8,
    flexWrap: 'wrap',
    flexShrink: 1,
  },

  // Items Table Section - More Compact
  itemsSection: {
    padding: 8,
    marginBottom: 6,
  },

  itemsSectionHeader: {
    marginBottom: 6,
  },

  itemsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 3,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  itemsTable: {
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderBottom: '1px solid #e9ecef',
  },

  tableHeaderCell: {
    flex: 1,
    color: '#333333',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1px solid #f1f3f4',
  },

  tableCell: {
    flex: 1,
    fontSize: 7,
    color: '#333333',
  },

  tableCellBold: {
    flex: 1,
    fontSize: 7,
    fontWeight: 'medium',
    color: '#333333',
  },

  // Totals Section - More Compact
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    paddingTop: 0,
  },

  totalsCard: {
    width: 200,
    backgroundColor: '#ffffff',
    padding: 8,
  },

  totalsHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottom: '1px solid #f1f3f4',
  },

  totalsLabel: {
    fontSize: 8,
    fontWeight: 'semibold',
    color: '#666666',
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  totalsValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  totalsFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#333333',
    color: '#ffffff',
    paddingHorizontal: 12,
    marginTop: 8,
  },

  totalsFinalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  totalsFinalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  // Notes and Terms Section - More Compact
  notesSection: {
    padding: 10,
    backgroundColor: '#ffffff',
  },

  notesGrid: {
    flexDirection: 'row',
    gap: 12,
  },

  notesColumn: {
    flex: 1,
  },

  notesColumnHeader: {
    marginBottom: 6,
  },

  notesColumnTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 3,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },

  notesColumnUnderline: {
    width: 20,
    height: 1,
    backgroundColor: '#666666',
  },

  notesBox: {
    backgroundColor: '#f8f9fa',
    padding: 6,
    minHeight: 40,
  },

  notesText: {
    fontSize: 7,
    color: '#666666',
    lineHeight: 1.3,
  },

  paymentInstructionsSection: {
    marginTop: 10,
  },

  paymentInstructionsBox: {
    backgroundColor: '#f8f9fa',
    padding: 6,
    minHeight: 35,
  },
});

interface ProfessionalInvoicePreviewPDFProps {
  invoiceData: ComprehensiveInvoiceData;
}

export default function ProfessionalInvoicePreviewPDF({ invoiceData }: ProfessionalInvoicePreviewPDFProps) {
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `£${(numAmount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Professional Header Section */}
        <View style={styles.headerSection}>
          {/* Left Column - Logo and Company Info */}
          <View style={styles.leftColumn}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              {invoiceData.companyInfo.logo && (
                /* eslint-disable-next-line jsx-a11y/alt-text */
                <Image
                  style={styles.companyLogo}
                  src={invoiceData.companyInfo.logo}
                />
              )}
              <View style={styles.companyDetails}>
                <Text style={styles.companyName}>
                  {invoiceData.companyInfo.name}
                </Text>
                <View style={styles.companyAddress}>
                  <Text>{invoiceData.companyInfo.address.street}</Text>
                  {invoiceData.companyInfo.address.city && (
                    <Text>{invoiceData.companyInfo.address.city}</Text>
                  )}
                  <Text>
                    {invoiceData.companyInfo.address.county} {invoiceData.companyInfo.address.postCode}
                  </Text>
                </View>
              </View>
            </View>

            {/* Two Column Layout for Invoice and Deliver To */}
            <View style={styles.invoiceDeliverRow}>
              {/* Invoice Section */}
              <View style={styles.invoiceDeliverBox}>
                <Text style={styles.sectionTitle}>Invoice</Text>
                <View style={styles.invoiceDetailRow}>
                  <Text style={styles.invoiceLabel}>Number:</Text>
                  <Text style={styles.invoiceValue}>{invoiceData.invoiceNumber}</Text>
                </View>
                <View style={styles.invoiceDetailRow}>
                  <Text style={styles.invoiceLabel}>Date:</Text>
                  <Text style={styles.invoiceValue}>{formatDate(invoiceData.invoiceDate)}</Text>
                </View>
                <View style={styles.invoiceDetailRow}>
                  <Text style={styles.invoiceLabel}>Due Date:</Text>
                  <Text style={styles.invoiceValue}>{formatDate(invoiceData.sale.date)}</Text>
                </View>
              </View>

              {/* Deliver To Section */}
              <View style={styles.invoiceDeliverBox}>
                <Text style={styles.sectionTitle}>Deliver To</Text>
                <Text style={styles.customerName}>
                  {invoiceData.customer.firstName} {invoiceData.customer.lastName}
                </Text>
                <View style={styles.customerAddress}>
                  <Text>{invoiceData.customer.address.firstLine}</Text>
                  <Text>
                    {invoiceData.customer.address.city} {invoiceData.customer.address.postCode}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column - Purchase Invoice Header and Details */}
          <View style={styles.rightColumn}>
            <View style={styles.purchaseInvoiceHeader}>
              <Text style={styles.purchaseInvoiceTitle}>PURCHASE INVOICE</Text>
            </View>

            {/* Invoice Details Box */}
            <View style={styles.invoiceDetailsBox}>
              <View style={styles.invoiceDetailsRow}>
                <Text style={styles.invoiceDetailsLabel}>PO #</Text>
                <Text style={styles.invoiceDetailsValue}>{invoiceData.invoiceNumber.replace('INV-', '')}</Text>
              </View>
              <View style={styles.invoiceDetailsRow}>
                <Text style={styles.invoiceDetailsLabel}>Stock No.</Text>
                <Text style={styles.invoiceDetailsValue}>235</Text>
              </View>
              <View style={styles.invoiceDetailsRow}>
                <Text style={styles.invoiceDetailsLabel}>Date:</Text>
                <Text style={styles.invoiceDetailsValue}>{formatDate(invoiceData.invoiceDate)}</Text>
              </View>
              <View style={styles.invoiceDetailsRow}>
                <Text style={styles.invoiceDetailsLabel}>Prepared by:</Text>
                <Text style={styles.invoiceDetailsValue}>{invoiceData.companyInfo.name}</Text>
              </View>
            </View>

            {/* Purchase From Section */}
            <View style={styles.contactDetailsBox}>
              <Text style={[styles.sectionTitle, { textAlign: 'right', marginBottom: 4 }]}>PURCHASE FROM</Text>
              <Text style={[styles.customerName, { textAlign: 'right' }]}>
                {invoiceData.customer.firstName} {invoiceData.customer.lastName}
              </Text>
              <View style={[styles.customerAddress, { alignItems: 'flex-end' }]}>
                <Text>{invoiceData.customer.address.firstLine}</Text>
                <Text>
                  {invoiceData.customer.address.city}, {invoiceData.customer.address.postCode}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Full Width Vehicle Details Grid */}
        <View style={styles.vehicleSection}>
          <View style={styles.vehicleSectionHeader}>
            <Text style={styles.vehicleTitle}>Vehicle Details</Text>
            <View style={styles.vehicleTitleIcon} />
          </View>

          <View style={styles.vehicleTable}>
            {/* First Row - 3 Columns */}
            <View style={styles.vehicleTableRow}>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Reg No.</Text>
                  <Text style={styles.vehicleTableValueHighlight}>{invoiceData.vehicle.registration}</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>MOT Expiry</Text>
                  <Text style={styles.vehicleTableValue}>03/09/2025</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCellLast}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Variant</Text>
                  <Text style={styles.vehicleTableValue}>{invoiceData.vehicle.derivative || '0.9 TCe ENERGY Dynamique MediaNav Euro 5 (s/s) 5dr'}</Text>
                </View>
              </View>
            </View>

            {/* Second Row - 3 Columns */}
            <View style={styles.vehicleTableRow}>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>First Registered</Text>
                  <Text style={styles.vehicleTableValue}>{formatDate(invoiceData.vehicle.firstRegDate) || '03/09/2022'}</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Make</Text>
                  <Text style={styles.vehicleTableValue}>{invoiceData.vehicle.make}</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCellLast}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Model</Text>
                  <Text style={styles.vehicleTableValue}>{invoiceData.vehicle.model}</Text>
                </View>
              </View>
            </View>

            {/* Third Row - 3 Columns */}
            <View style={styles.vehicleTableRow}>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Build Year</Text>
                  <Text style={styles.vehicleTableValue}>{invoiceData.vehicle.firstRegDate ? new Date(invoiceData.vehicle.firstRegDate).getFullYear() : '2022'}</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Fuel Type</Text>
                  <Text style={styles.vehicleTableValue}>{invoiceData.vehicle.fuelType}</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCellLast}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Ext. Colour</Text>
                  <Text style={styles.vehicleTableValue}>{invoiceData.vehicle.colour || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Fourth Row - 3 Columns */}
            <View style={styles.vehicleTableRow}>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Body Type</Text>
                  <Text style={styles.vehicleTableValue}>Saloon</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Transmission</Text>
                  <Text style={styles.vehicleTableValue}>AUTO 7 GEARS</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCellLast}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Odometer</Text>
                  <Text style={styles.vehicleTableValue}>
                    {invoiceData.vehicle.mileage ? `${parseInt(invoiceData.vehicle.mileage).toLocaleString()} MLS` : '40,500 MLS'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Fifth Row - 3 Columns */}
            <View style={styles.vehicleTableRow}>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Engine No.</Text>
                  <Text style={styles.vehicleTableValue}>{invoiceData.vehicle.engineNumber || 'DNFB108955'}</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCell}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Chassis/VIN No.</Text>
                  <Text style={styles.vehicleTableValue}>{invoiceData.vehicle.vin || 'VF12RFA1H49406992'}</Text>
                </View>
              </View>
              <View style={styles.vehicleTableCellLast}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Stock No.</Text>
                  <Text style={styles.vehicleTableValue}>235</Text>
                </View>
              </View>
            </View>

            {/* Sixth Row - 1 Column */}
            <View style={styles.vehicleTableRow}>
              <View style={styles.vehicleTableCellLast}>
                <View style={styles.vehicleTableCellContent}>
                  <Text style={styles.vehicleTableLabel}>Type</Text>
                  <Text style={styles.vehicleTableValue}>Used</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Professional Items Table */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsSectionHeader}>
            <Text style={styles.itemsTitle}>Invoice Items</Text>
            <View style={styles.vehicleTitleIcon} />
          </View>

          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Description</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: 'center', flex: 0.3 }]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: 'right', flex: 0.4 }]}>Unit Price</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: 'right', flex: 0.4 }]}>Total</Text>
            </View>
            {invoiceData.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.description}</Text>
                <Text style={[styles.tableCell, { textAlign: 'center', flex: 0.3 }]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, { textAlign: 'right', flex: 0.4 }]}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={[styles.tableCellBold, { textAlign: 'right', flex: 0.4 }]}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Professional Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsCard}>
            <Text style={styles.totalsHeader}>Invoice Summary</Text>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoiceData.subtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT ({invoiceData.vatMode === 'global' ? '20' : 'Individual'}%):</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoiceData.vatAmount)}</Text>
            </View>
            <View style={styles.totalsFinalRow}>
              <Text style={styles.totalsFinalLabel}>Total:</Text>
              <Text style={styles.totalsFinalValue}>{formatCurrency(invoiceData.totalAmount)}</Text>
            </View>
            
            {/* Payment Information */}
            {invoiceData.payment?.breakdown && (
              <>
                {(invoiceData.payment.breakdown.cardAmount > 0 || 
                  invoiceData.payment.breakdown.bacsAmount > 0 || 
                  invoiceData.payment.breakdown.cashAmount > 0) && (
                  <>
                    <View style={[styles.totalsRow, { borderTop: '1px solid #e9ecef', marginTop: 8, paddingTop: 8 }]}>
                      <Text style={[styles.totalsLabel, { fontSize: 9, fontWeight: 'bold' }]}>Payment Information:</Text>
                      <Text style={styles.totalsValue}></Text>
                    </View>
                    {invoiceData.payment.breakdown.cardAmount > 0 && (
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Card Payments:</Text>
                        <Text style={styles.totalsValue}>{formatCurrency(invoiceData.payment.breakdown.cardAmount)}</Text>
                      </View>
                    )}
                    {invoiceData.payment.breakdown.bacsAmount > 0 && (
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>BACS Payments:</Text>
                        <Text style={styles.totalsValue}>{formatCurrency(invoiceData.payment.breakdown.bacsAmount)}</Text>
                      </View>
                    )}
                    {invoiceData.payment.breakdown.cashAmount > 0 && (
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Cash Payments:</Text>
                        <Text style={styles.totalsValue}>{formatCurrency(invoiceData.payment.breakdown.cashAmount)}</Text>
                      </View>
                    )}
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { fontWeight: 'bold' }]}>Total Paid:</Text>
                      <Text style={[styles.totalsValue, { fontWeight: 'bold' }]}>
                        {formatCurrency(
                          invoiceData.payment.breakdown.cardAmount + 
                          invoiceData.payment.breakdown.bacsAmount + 
                          invoiceData.payment.breakdown.cashAmount
                        )}
                      </Text>
                    </View>
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { fontWeight: 'bold' }]}>Outstanding Balance:</Text>
                      <Text style={[styles.totalsValue, { fontWeight: 'bold' }]}>
                        {formatCurrency(invoiceData.payment.outstandingBalance)}
                      </Text>
                    </View>
                    {invoiceData.payment.outstandingBalance <= 0 && (
                      <View style={[styles.totalsRow, { justifyContent: 'center' }]}>
                        <Text style={[styles.totalsLabel, { fontSize: 7 }]}>✓ Invoice Fully Paid</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        </View>

        {/* Professional Notes and Terms Section */}
        <View style={styles.notesSection}>
          <View style={styles.notesGrid}>
            <View style={styles.notesColumn}>
              <View style={styles.notesColumnHeader}>
                <Text style={styles.notesColumnTitle}>Additional Notes</Text>
                <View style={styles.notesColumnUnderline} />
              </View>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{invoiceData.notes || 'No additional notes'}</Text>
              </View>
            </View>
            <View style={styles.notesColumn}>
              <View style={styles.notesColumnHeader}>
                <Text style={styles.notesColumnTitle}>Terms & Conditions</Text>
                <View style={styles.notesColumnUnderline} />
              </View>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{invoiceData.terms.basicTerms || 'Standard terms and conditions apply'}</Text>
              </View>
            </View>
          </View>

          {/* Payment Instructions */}
          <View style={styles.paymentInstructionsSection}>
            <View style={styles.notesColumnHeader}>
              <Text style={styles.notesColumnTitle}>Payment Instructions</Text>
              <View style={styles.notesColumnUnderline} />
            </View>
            <View style={styles.paymentInstructionsBox}>
              <Text style={styles.notesText}>{invoiceData.additionalInformation || 'Please contact us for payment instructions'}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
