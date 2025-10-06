import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { 
  registerCenturyGothicFonts, 
  CENTURY_GOTHIC_FONT_FAMILY,
  centuryGothicStyles_predefined,
  getCenturyGothicStyle 
} from '@/lib/fonts';

// Register Century Gothic fonts
registerCenturyGothicFonts();

// Define styles for the PDF using Century Gothic
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 10,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
  },
  companyLogo: {
    width: 'auto', // Let width adjust automatically
    height: 80, // Increased and standardized
    objectFit: 'contain',
    alignSelf: 'center', // Center the logo
  },
  companyDetails: {
    flexDirection: 'column',
  },
  companyName: {
    ...centuryGothicStyles_predefined.title,
    fontSize: 24,
    color: '#1e40af',
    marginBottom: 6,
  },
  companyText: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 3,
  },
  invoiceTitle: {
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  invoiceTitleText: {
    ...centuryGothicStyles_predefined.title,
    fontSize: 32,
    color: '#1e40af',
    marginBottom: 6,
  },
  invoiceNumber: {
    ...centuryGothicStyles_predefined.heading,
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  invoiceDates: {
    fontSize: 9,
    color: '#64748b',
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 30,
  },
  detailBox: {
    flex: 1,
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 15,
    backgroundColor: '#f8fafc',
  },
  detailBoxTitle: {
    ...centuryGothicStyles_predefined.heading,
    fontSize: 12,
    color: '#374151',
    marginBottom: 10,
  },
  detailName: {
    ...centuryGothicStyles_predefined.semibold,
    fontSize: 11,
    color: '#111827',
    marginBottom: 6,
  },
  detailInfo: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 3,
  },
  itemsSection: {
    marginBottom: 30,
  },
  itemsSectionTitle: {
    ...centuryGothicStyles_predefined.heading,
    fontSize: 14,
    color: '#374151',
    marginBottom: 15,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '18%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    backgroundColor: '#374151',
    padding: 8,
  },
  tableCol: {
    width: '18%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 8,
  },
  tableColDescription: {
    width: '46%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 8,
  },
  tableColHeaderDescription: {
    width: '46%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    backgroundColor: '#374151',
    padding: 8,
  },
  tableColHeaderDescriptionSmall: {
    width: '28%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    backgroundColor: '#374151',
    padding: 8,
  },
  tableColDescriptionSmall: {
    width: '28%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 8,
  },
  // Additional column styles for different combinations
  tableColSmall: {
    width: '12%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    padding: 8,
  },
  tableColHeaderSmall: {
    width: '12%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
    backgroundColor: '#374151',
    padding: 8,
  },
  tableCellHeader: {
    ...centuryGothicStyles_predefined.semibold,
    fontSize: 9,
    color: '#ffffff',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
  },
  tableCellRight: {
    fontSize: 8,
    color: '#374151',
    textAlign: 'right',
  },
  tableCellCenter: {
    fontSize: 8,
    color: '#374151',
    textAlign: 'center',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 30,
  },
  totalsBox: {
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 15,
    backgroundColor: '#f8fafc',
    minWidth: 200,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 9,
  },
  totalsRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
    marginTop: 6,
    fontSize: 12,
    ...centuryGothicStyles_predefined.bold,
    color: '#1e40af',
  },
  additionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 30,
  },
  infoSection: {
    flex: 1,
  },
  infoSectionFull: {
    width: '100%',
    marginTop: 15,
  },
  infoTitle: {
    ...centuryGothicStyles_predefined.heading,
    fontSize: 12,
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.4,
  },
  vatSubtext: {
    fontSize: 6,
    color: '#64748b',
    lineHeight: 1.2,
  },
  paymentSectionTitle: {
    ...centuryGothicStyles_predefined.semibold,
    fontSize: 10,
    color: '#374151',
  },
  paidAmount: {
    color: '#059669', // Green color for paid amounts
  },
  outstandingAmount: {
    color: '#dc2626', // Red color for outstanding amounts
  },
  totalsRowOutstanding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 10,
    ...centuryGothicStyles_predefined.semibold,
  },
  paidStatusText: {
    fontSize: 9,
    color: '#059669',
    ...centuryGothicStyles_predefined.semibold,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
});

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  totalWithVat?: number;
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
}

interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceTitle?: string;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  vatMode: 'global' | 'individual';
  discountMode?: 'global' | 'individual';
  globalDiscountType?: 'percentage' | 'fixed';
  globalDiscountValue?: number;
  globalDiscountAmount?: number;
  totalDiscount?: number;
  subtotalAfterDiscount?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  paymentType?: 'none' | 'percentage' | 'fixed';
  paymentValue?: number;
  paidAmount?: number;
  outstandingBalance?: number;
  notes: string;
  terms: string;
  paymentInstructions: string;
  companyInfo: CompanyInfo | null;
  vehicle: Vehicle | null;
  customer: Customer | null;
}

interface InvoicePDFDocumentProps {
  invoiceData: InvoicePDFData;
}

const InvoicePDFDocument: React.FC<InvoicePDFDocumentProps> = ({ invoiceData }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    return `£${(amount || 0).toFixed(2)}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {invoiceData.companyInfo?.companyLogo && (
              <Image
                style={styles.companyLogo}
                src={invoiceData.companyInfo.companyLogo}
              />
            )}
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>
                {invoiceData.companyInfo?.companyName || 'Your Company Name'}
              </Text>
              {invoiceData.companyInfo?.addressLine1 && (
                <Text style={styles.companyText}>
                  {invoiceData.companyInfo.addressLine1}
                  {invoiceData.companyInfo.city && `, ${invoiceData.companyInfo.city}`}
                  {invoiceData.companyInfo.postcode && `, ${invoiceData.companyInfo.postcode}`}
                </Text>
              )}
              {invoiceData.companyInfo?.email && (
                <Text style={styles.companyText}>
                  {invoiceData.companyInfo.email}
                  {invoiceData.companyInfo.phone && ` | ${invoiceData.companyInfo.phone}`}
                </Text>
              )}
              {invoiceData.companyInfo?.vatNumber && (
                <Text style={styles.companyText}>
                  VAT No: {invoiceData.companyInfo.vatNumber}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.invoiceTitleText}>{invoiceData.invoiceTitle || 'INVOICE'}</Text>
            <Text style={styles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
            <View style={styles.invoiceDates}>
              <Text>Date: {formatDate(invoiceData.invoiceDate)}</Text>
              <Text>Due: {formatDate(invoiceData.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Customer and Vehicle Details */}
        <View style={styles.detailsSection}>
          {/* Customer Info */}
          <View style={styles.detailBox}>
            <Text style={styles.detailBoxTitle}>Bill To:</Text>
            <Text style={styles.detailName}>
              {invoiceData.customer?.firstName} {invoiceData.customer?.lastName}
            </Text>
            {invoiceData.customer?.addressLine1 && (
              <Text style={styles.detailInfo}>{invoiceData.customer.addressLine1}</Text>
            )}
            {invoiceData.customer?.addressLine2 && (
              <Text style={styles.detailInfo}>{invoiceData.customer.addressLine2}</Text>
            )}
            {invoiceData.customer?.city && invoiceData.customer?.postcode && (
              <Text style={styles.detailInfo}>
                {invoiceData.customer.city}, {invoiceData.customer.postcode}
              </Text>
            )}
            {invoiceData.customer?.email && (
              <Text style={styles.detailInfo}>{invoiceData.customer.email}</Text>
            )}
            {invoiceData.customer?.phone && (
              <Text style={styles.detailInfo}>{invoiceData.customer.phone}</Text>
            )}
          </View>

          {/* Vehicle Info */}
          {invoiceData.vehicle && (
            <View style={styles.detailBox}>
              <Text style={styles.detailBoxTitle}>Vehicle Details:</Text>
              <Text style={styles.detailName}>
                {invoiceData.vehicle.make} {invoiceData.vehicle.model}
                {(invoiceData.vehicle.year || invoiceData.vehicle.yearOfManufacture) && 
                  ` (${invoiceData.vehicle.year || invoiceData.vehicle.yearOfManufacture})`}
              </Text>
              {invoiceData.vehicle.registration && (
                <Text style={styles.detailInfo}>{invoiceData.vehicle.registration}</Text>
              )}
              {invoiceData.vehicle.derivative && (
                <Text style={styles.detailInfo}>Variant: {invoiceData.vehicle.derivative}</Text>
              )}
              {invoiceData.vehicle.vin && (
                <Text style={styles.detailInfo}>VIN: {invoiceData.vehicle.vin}</Text>
              )}
              {invoiceData.vehicle.fuelType && (
                <Text style={styles.detailInfo}>Fuel: {invoiceData.vehicle.fuelType}</Text>
              )}
              {invoiceData.vehicle.colour && (
                <Text style={styles.detailInfo}>Colour: {invoiceData.vehicle.colour}</Text>
              )}
              {(invoiceData.vehicle.mileage || invoiceData.vehicle.odometerReadingMiles) && (
                <Text style={styles.detailInfo}>
                  Mileage: {((invoiceData.vehicle.mileage || invoiceData.vehicle.odometerReadingMiles) || 0).toLocaleString()} miles
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>Items:</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <View style={(invoiceData.vatMode === 'individual' || invoiceData.discountMode === 'individual') ? styles.tableColHeaderDescriptionSmall : styles.tableColHeaderDescription}>
                <Text style={styles.tableCellHeader}>Description</Text>
              </View>
              <View style={(invoiceData.vatMode === 'individual' || invoiceData.discountMode === 'individual') ? styles.tableColHeaderSmall : styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Qty</Text>
              </View>
              <View style={(invoiceData.vatMode === 'individual' || invoiceData.discountMode === 'individual') ? styles.tableColHeaderSmall : styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Unit Price</Text>
              </View>
              {invoiceData.discountMode === 'individual' && (
                <View style={styles.tableColHeaderSmall}>
                  <Text style={styles.tableCellHeader}>Discount %</Text>
                </View>
              )}
              {invoiceData.vatMode === 'individual' && (
                <View style={styles.tableColHeaderSmall}>
                  <Text style={styles.tableCellHeader}>VAT %</Text>
                </View>
              )}
              <View style={(invoiceData.vatMode === 'individual' || invoiceData.discountMode === 'individual') ? styles.tableColHeaderSmall : styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Total</Text>
              </View>
            </View>
            
            {/* Table Rows */}
            {invoiceData.items.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <View style={(invoiceData.vatMode === 'individual' || invoiceData.discountMode === 'individual') ? styles.tableColDescriptionSmall : styles.tableColDescription}>
                  <Text style={styles.tableCell}>{item.description}</Text>
                </View>
                <View style={(invoiceData.vatMode === 'individual' || invoiceData.discountMode === 'individual') ? styles.tableColSmall : styles.tableCol}>
                  <Text style={styles.tableCellCenter}>{item.quantity}</Text>
                </View>
                <View style={(invoiceData.vatMode === 'individual' || invoiceData.discountMode === 'individual') ? styles.tableColSmall : styles.tableCol}>
                  <Text style={styles.tableCellRight}>{formatCurrency(item.unitPrice)}</Text>
                </View>
                {invoiceData.discountMode === 'individual' && (
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellCenter}>
                      {item.discount ? `${item.discount.toFixed(1)}%` : '0.0%'}
                    </Text>
                  </View>
                )}
                {invoiceData.vatMode === 'individual' && (
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellCenter}>
                      {item.vatRate ? `${item.vatRate.toFixed(1)}%` : '0.0%'}
                    </Text>
                  </View>
                )}
                <View style={(invoiceData.vatMode === 'individual' || invoiceData.discountMode === 'individual') ? styles.tableColSmall : styles.tableCol}>
                  <Text style={styles.tableCellRight}>
                    {formatCurrency(item.total)}
                    {/* Individual discount breakdown */}
                    {invoiceData.discountMode === 'individual' && item.discountAmount && item.discountAmount > 0 && (
                      <Text style={styles.vatSubtext}>
                        {"\n"}Discount: -{formatCurrency(item.discountAmount)}
                      </Text>
                    )}
                    {/* Global discount breakdown per item */}
                    {invoiceData.discountMode === 'global' && invoiceData.totalDiscount && invoiceData.totalDiscount > 0 && (
                      <Text style={styles.vatSubtext}>
                        {"\n"}Discount: -{formatCurrency(
                          (item.quantity * item.unitPrice) * 
                          (invoiceData.globalDiscountType === 'percentage' 
                            ? (invoiceData.globalDiscountValue || 0) / 100
                            : (invoiceData.totalDiscount || 0) / (invoiceData.subtotal || 1)
                          )
                        )}
                      </Text>
                    )}
                    {invoiceData.vatMode === 'individual' && item.vatAmount && item.vatAmount > 0 && (
                      <Text style={styles.vatSubtext}>
                        {"\n"}+VAT: {formatCurrency(item.vatAmount)}
                        {"\n"}Total: {formatCurrency(item.totalWithVat || 0)}
                      </Text>
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(invoiceData.subtotal)}</Text>
            </View>
            {invoiceData.totalDiscount && invoiceData.totalDiscount > 0 && (
              <View style={styles.totalsRow}>
                <Text>
                  Discount {invoiceData.discountMode === 'global' 
                    ? `(${invoiceData.globalDiscountType === 'percentage' 
                        ? `${invoiceData.globalDiscountValue}%` 
                        : `£${invoiceData.globalDiscountValue}`})` 
                    : '(Item-wise)'}:
                </Text>
                <Text>-{formatCurrency(invoiceData.totalDiscount)}</Text>
              </View>
            )}
            {invoiceData.totalDiscount && invoiceData.totalDiscount > 0 && (
              <View style={styles.totalsRow}>
                <Text>Subtotal after discount:</Text>
                <Text>{formatCurrency(invoiceData.subtotalAfterDiscount || 0)}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text>
                VAT {invoiceData.vatMode === 'global' ? `(${invoiceData.vatRate}%)` : '(Individual)'}:
              </Text>
              <Text>{formatCurrency(invoiceData.vatAmount)}</Text>
            </View>
            <View style={styles.totalsRowTotal}>
              <Text>Total:</Text>
              <Text>{formatCurrency(invoiceData.total)}</Text>
            </View>
            
            {/* Payment Information */}
            {invoiceData.paymentStatus && invoiceData.paymentStatus !== 'unpaid' && (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.paymentSectionTitle}>Payment Information:</Text>
                  <Text></Text>
                </View>
                {invoiceData.paidAmount && invoiceData.paidAmount > 0 && (
                  <View style={styles.totalsRow}>
                    <Text>
                      Amount Paid {invoiceData.paymentStatus === 'partial' 
                        ? `(${invoiceData.paymentType === 'percentage' 
                            ? `${invoiceData.paymentValue}%` 
                            : `£${invoiceData.paymentValue}`})` 
                        : '(Full)'}:
                    </Text>
                    <Text style={styles.paidAmount}>{formatCurrency(invoiceData.paidAmount)}</Text>
                  </View>
                )}
                <View style={styles.totalsRowOutstanding}>
                  <Text>Outstanding Balance:</Text>
                  <Text style={invoiceData.outstandingBalance && invoiceData.outstandingBalance > 0 ? styles.outstandingAmount : styles.paidAmount}>
                    {formatCurrency(invoiceData.outstandingBalance || 0)}
                  </Text>
                </View>
                {invoiceData.paymentStatus === 'paid' && (
                  <View style={styles.totalsRow}>
                    <Text style={styles.paidStatusText}>✓ Invoice Fully Paid</Text>
                    <Text></Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.additionalInfo}>
          {invoiceData.notes && (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Notes:</Text>
              <Text style={styles.infoText}>{invoiceData.notes}</Text>
            </View>
          )}
          {invoiceData.terms && (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Terms & Conditions:</Text>
              <Text style={styles.infoText}>{invoiceData.terms}</Text>
            </View>
          )}
        </View>

        {invoiceData.paymentInstructions && (
          <View style={styles.infoSectionFull}>
            <Text style={styles.infoTitle}>Payment Information:</Text>
            <Text style={styles.infoText}>{invoiceData.paymentInstructions}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {new Date().toLocaleDateString('en-GB')} at{' '}
            {new Date().toLocaleTimeString('en-GB', { hour12: false })}
          </Text>
          <Text>
            © {new Date().getFullYear()} {invoiceData.companyInfo?.companyName || 'Your Company'}. All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDFDocument;
