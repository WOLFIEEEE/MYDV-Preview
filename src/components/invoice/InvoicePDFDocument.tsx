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
  totalLabel: {
    fontSize: 10,
    color: '#374151',
  },
  totalValue: {
    fontSize: 10,
    color: '#374151',
  },
  totalLabelMain: {
    fontSize: 12,
    color: '#111827',
    ...centuryGothicStyles_predefined.semibold,
  },
  totalValueMain: {
    fontSize: 12,
    color: '#111827',
    ...centuryGothicStyles_predefined.semibold,
  },
  balanceDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 8,
    marginTop: 8,
    borderRadius: 4,
  },
  balanceDueLabel: {
    fontSize: 11,
    color: '#ffffff',
    ...centuryGothicStyles_predefined.semibold,
  },
  balanceDueValue: {
    fontSize: 11,
    color: '#ffffff',
    ...centuryGothicStyles_predefined.semibold,
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
}

interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceTitle?: string;
  recipientType?: 'customer' | 'business' | 'myself';
  // Optional parties (for purchase invoices)
  deliverToType?: 'customer' | 'business' | 'myself';
  deliverTo?: Customer | Business | null;
  purchaseFromType?: 'customer' | 'business' | 'myself';
  purchaseFrom?: Customer | Business | null;
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
  customer: Customer | Business | null;
}

interface InvoicePDFDocumentProps {
  invoiceData: InvoicePDFData;
}

const InvoicePDFDocument: React.FC<InvoicePDFDocumentProps> = ({ invoiceData }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    // return `£${(amount || 0).toFixed(2)}`;
    return `£${(amount || 0)}`;
  };

  // Support both server-mapped parties (deliverTo/purchaseFrom) and client preview fields (deliverToData/purchaseFromData)
  const deliverTo = (invoiceData as any).deliverTo || (invoiceData as any).deliverToData || null;
  const purchaseFrom = (invoiceData as any).purchaseFrom || (invoiceData as any).purchaseFromData || null;

  // Helper function to safely check if an object has businessName property
  const isBusiness = (party: any): boolean => {
    return party && typeof party === 'object' && 'businessName' in party;
  };

  // Helper function to safely check if an object has firstName property  
  const isCustomer = (party: any): boolean => {
    return party && typeof party === 'object' && 'firstName' in party;
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
            <Text style={styles.invoiceTitleText}>
              {(invoiceData as any).invoiceType === 'purchase' ? 'PURCHASE INVOICE' : (invoiceData.invoiceTitle || 'INVOICE')}
            </Text>
            <Text style={styles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
            <View style={styles.invoiceDates}>
              <Text>Date: {formatDate(invoiceData.invoiceDate)}</Text>
              <Text>Due: {formatDate(invoiceData.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Customer and Vehicle Details */}
        <View style={styles.detailsSection}>
          {/* Invoice To and Deliver To Info */}
          <View style={styles.detailBox}>
            <Text style={styles.detailBoxTitle}>Invoice To:</Text>
            
            {/* Render content based on recipient type */}
            {invoiceData.recipientType === 'myself' && invoiceData.companyInfo && (
              <>
                <Text style={styles.detailName}>
                  {invoiceData.companyInfo.companyName}
                </Text>
                {invoiceData.companyInfo.addressLine1 && (
                  <Text style={styles.detailInfo}>{invoiceData.companyInfo.addressLine1}</Text>
                )}
                {invoiceData.companyInfo.addressLine2 && (
                  <Text style={styles.detailInfo}>{invoiceData.companyInfo.addressLine2}</Text>
                )}
                {invoiceData.companyInfo.city && invoiceData.companyInfo.postcode && (
                  <Text style={styles.detailInfo}>
                    {invoiceData.companyInfo.city}, {invoiceData.companyInfo.postcode}
                  </Text>
                )}
                {invoiceData.companyInfo.email && (
                  <Text style={styles.detailInfo}>Email: {invoiceData.companyInfo.email}</Text>
                )}
                {invoiceData.companyInfo.phone && (
                  <Text style={styles.detailInfo}>Phone: {invoiceData.companyInfo.phone}</Text>
                )}
                {invoiceData.companyInfo.vatNumber && (
                  <Text style={styles.detailInfo}>VAT: {invoiceData.companyInfo.vatNumber}</Text>
                )}
                {invoiceData.companyInfo.companyNumber && (
                  <Text style={styles.detailInfo}>Company No: {invoiceData.companyInfo.companyNumber}</Text>
                )}
              </>
            )}

            {invoiceData.recipientType === 'business' && invoiceData.customer && (
              <>
                <Text style={styles.detailName}>
                  {(invoiceData.customer as Business).businessName}
                </Text>
                {invoiceData.customer.addressLine1 && (
                  <Text style={styles.detailInfo}>{invoiceData.customer.addressLine1}</Text>
                )}
                {invoiceData.customer.addressLine2 && (
                  <Text style={styles.detailInfo}>{invoiceData.customer.addressLine2}</Text>
                )}
                {invoiceData.customer.city && invoiceData.customer.postcode && (
                  <Text style={styles.detailInfo}>
                    {invoiceData.customer.city}, {invoiceData.customer.postcode}
                  </Text>
                )}
                {invoiceData.customer.email && (
                  <Text style={styles.detailInfo}>Email: {invoiceData.customer.email}</Text>
                )}
                {invoiceData.customer.phone && (
                  <Text style={styles.detailInfo}>Phone: {invoiceData.customer.phone}</Text>
                )}
                {(invoiceData.customer as Business).vatNumber && (
                  <Text style={styles.detailInfo}>VAT Number: {(invoiceData.customer as Business).vatNumber}</Text>
                )}
                {(invoiceData.customer as Business).companyNumber && (
                  <Text style={styles.detailInfo}>Company Number: {(invoiceData.customer as Business).companyNumber}</Text>
                )}
              </>
            )}

            {invoiceData.recipientType === 'customer' && invoiceData.customer && (
              <>
                <Text style={styles.detailName}>
                  {(invoiceData.customer as Customer).firstName} {(invoiceData.customer as Customer).lastName}
                </Text>
                {invoiceData.customer.addressLine1 && (
                  <Text style={styles.detailInfo}>{invoiceData.customer.addressLine1}</Text>
                )}
                {invoiceData.customer.addressLine2 && (
                  <Text style={styles.detailInfo}>{invoiceData.customer.addressLine2}</Text>
                )}
                {invoiceData.customer.city && invoiceData.customer.postcode && (
                  <Text style={styles.detailInfo}>
                    {invoiceData.customer.city}, {invoiceData.customer.postcode}
                  </Text>
                )}
                {invoiceData.customer.email && (
                  <Text style={styles.detailInfo}>Email: {invoiceData.customer.email}</Text>
                )}
                {invoiceData.customer.phone && (
                  <Text style={styles.detailInfo}>Phone: {invoiceData.customer.phone}</Text>
                )}
              </>
            )}

            {/* Deliver To (for purchase invoices only) */}
            {(invoiceData as any).invoiceType === 'purchase' && deliverTo && (
              <>
                <Text style={[styles.detailBoxTitle, { marginTop: 10 }]}>Deliver To:</Text>
                {/* Treat deliverTo as business or customer */}
                {isBusiness(deliverTo) ? (
                  <>
                    <Text style={styles.detailName}>{(deliverTo as Business).businessName}</Text>
                    {(deliverTo as Business).addressLine1 && (
                      <Text style={styles.detailInfo}>{(deliverTo as Business).addressLine1}</Text>
                    )}
                    {(deliverTo as Business).city && (deliverTo as Business).postcode && (
                      <Text style={styles.detailInfo}>
                        {(deliverTo as Business).city}, {(deliverTo as Business).postcode}
                      </Text>
                    )}
                    {(deliverTo as Business).email && (
                      <Text style={styles.detailInfo}>Email: {(deliverTo as Business).email}</Text>
                    )}
                    {(deliverTo as Business).phone && (
                      <Text style={styles.detailInfo}>Phone: {(deliverTo as Business).phone}</Text>
                    )}
                    {(deliverTo as Business).vatNumber && (
                      <Text style={styles.detailInfo}>VAT: {(deliverTo as Business).vatNumber}</Text>
                    )}
                  </>
                ) : isCustomer(deliverTo) ? (
                  <>
                    <Text style={styles.detailName}>{(deliverTo as Customer).firstName} {(deliverTo as Customer).lastName}</Text>
                    {(deliverTo as Customer).addressLine1 && (
                      <Text style={styles.detailInfo}>{(deliverTo as Customer).addressLine1}</Text>
                    )}
                    {(deliverTo as Customer).city && (deliverTo as Customer).postcode && (
                      <Text style={styles.detailInfo}>
                        {(deliverTo as Customer).city}, {(deliverTo as Customer).postcode}
                      </Text>
                    )}
                    {(deliverTo as Customer).email && (
                      <Text style={styles.detailInfo}>Email: {(deliverTo as Customer).email}</Text>
                    )}
                    {(deliverTo as Customer).phone && (
                      <Text style={styles.detailInfo}>Phone: {(deliverTo as Customer).phone}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.detailName}>Same as Invoice To</Text>
                )}
              </>
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

          {/* Purchase From (for purchase invoices only) */}
          {(invoiceData as any).invoiceType === 'purchase' && purchaseFrom && (
            <View style={styles.detailBox}>
              <Text style={styles.detailBoxTitle}>Purchase From:</Text>
              {isBusiness(purchaseFrom) ? (
                <>
                  <Text style={styles.detailName}>{(purchaseFrom as Business).businessName}</Text>
                  {(purchaseFrom as Business).addressLine1 && (
                    <Text style={styles.detailInfo}>{(purchaseFrom as Business).addressLine1}</Text>
                  )}
                  {(purchaseFrom as Business).city && (purchaseFrom as Business).postcode && (
                    <Text style={styles.detailInfo}>
                      {(purchaseFrom as Business).city}, {(purchaseFrom as Business).postcode}
                    </Text>
                  )}
                  {(purchaseFrom as Business).email && (
                    <Text style={styles.detailInfo}>Email: {(purchaseFrom as Business).email}</Text>
                  )}
                  {(purchaseFrom as Business).phone && (
                    <Text style={styles.detailInfo}>Phone: {(purchaseFrom as Business).phone}</Text>
                  )}
                  {(purchaseFrom as Business).vatNumber && (
                    <Text style={styles.detailInfo}>VAT: {(purchaseFrom as Business).vatNumber}</Text>
                  )}
                </>
              ) : isCustomer(purchaseFrom) ? (
                <>
                  <Text style={styles.detailName}>{(purchaseFrom as Customer).firstName} {(purchaseFrom as Customer).lastName}</Text>
                  {(purchaseFrom as Customer).addressLine1 && (
                    <Text style={styles.detailInfo}>{(purchaseFrom as Customer).addressLine1}</Text>
                  )}
                  {(purchaseFrom as Customer).city && (purchaseFrom as Customer).postcode && (
                    <Text style={styles.detailInfo}>
                      {(purchaseFrom as Customer).city}, {(purchaseFrom as Customer).postcode}
                    </Text>
                  )}
                  {(purchaseFrom as Customer).email && (
                    <Text style={styles.detailInfo}>Email: {(purchaseFrom as Customer).email}</Text>
                  )}
                  {(purchaseFrom as Customer).phone && (
                    <Text style={styles.detailInfo}>Phone: {(purchaseFrom as Customer).phone}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.detailName}>Company Purchase</Text>
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
              <View style={styles.tableColHeaderDescriptionSmall}>
                <Text style={styles.tableCellHeader}>Description</Text>
              </View>
              <View style={styles.tableColHeaderSmall}>
                <Text style={styles.tableCellHeader}>Qty</Text>
              </View>
              <View style={styles.tableColHeaderSmall}>
                <Text style={styles.tableCellHeader}>Unit Price</Text>
              </View>
              <View style={styles.tableColHeaderSmall}>
                <Text style={styles.tableCellHeader}>VAT %</Text>
              </View>
              <View style={styles.tableColHeaderSmall}>
                <Text style={styles.tableCellHeader}>VAT Amount</Text>
              </View>
              <View style={styles.tableColHeaderSmall}>
                <Text style={styles.tableCellHeader}>Total (Inc VAT)</Text>
              </View>
            </View>
            
            {/* Table Rows */}
            {invoiceData.items.map((item, index) => {
              const vatAmount = (item.total * (Number(item.vatRate) || 0)) / 100;
              const totalWithVat = item.total + vatAmount;
              
              return (
                <View style={styles.tableRow} key={index}>
                  <View style={styles.tableColDescriptionSmall}>
                    <Text style={styles.tableCell}>{item.description}</Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellCenter}>{item.quantity}</Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellRight}>{formatCurrency(item.unitPrice)}</Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellCenter}>
                      {(Number(item.vatRate) || 0).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellRight}>
                      {formatCurrency(vatAmount)}
                    </Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellRight}>
                      {formatCurrency(totalWithVat)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoiceData.subtotal)}</Text>
            </View>
            
            {invoiceData.totalDiscount && invoiceData.totalDiscount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalLabel}>
                  Discount {invoiceData.discountMode === 'global' 
                    ? `(${invoiceData.globalDiscountType === 'percentage' 
                        ? `${invoiceData.globalDiscountValue}%` 
                        : `£${invoiceData.globalDiscountValue}`})` 
                    : '(Item-wise)'}:
                </Text>
                <Text style={styles.totalValue}>-{formatCurrency(invoiceData.totalDiscount)}</Text>
              </View>
            )}
            
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>
                VAT {invoiceData.vatMode === 'global' ? `(${invoiceData.vatRate}%)` : '(Individual)'}:
              </Text>
              <Text style={styles.totalValue}>{formatCurrency(invoiceData.vatAmount)}</Text>
            </View>
            
            <View style={styles.totalsRowTotal}>
              <Text style={styles.totalLabelMain}>Total Incl VAT:</Text>
              <Text style={styles.totalValueMain}>{formatCurrency(invoiceData.total)}</Text>
            </View>
            
            {/* Payment Information Section */}
            {(invoiceData.paymentStatus && invoiceData.paymentStatus !== 'unpaid') || 
             (invoiceData.paidAmount && invoiceData.paidAmount > 0) ? (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalLabel}>Payments Received:</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(invoiceData.paidAmount || 0)}
                  </Text>
                </View>
                
                <View style={styles.balanceDue}>
                  <Text style={styles.balanceDueLabel}>Balance Due:</Text>
                  <Text style={styles.balanceDueValue}>
                    {formatCurrency(invoiceData.outstandingBalance || invoiceData.total)}
                  </Text>
                </View>
                
                {invoiceData.paymentStatus === 'paid' && invoiceData.outstandingBalance === 0 && (
                  <View style={styles.totalsRow}>
                    <Text style={styles.paidStatusText}>✓ Invoice Fully Paid</Text>
                    <Text></Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.balanceDue}>
                <Text style={styles.balanceDueLabel}>Balance Due:</Text>
                <Text style={styles.balanceDueValue}>{formatCurrency(invoiceData.total)}</Text>
              </View>
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
