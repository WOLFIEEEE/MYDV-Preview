import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { VehicleJobCard } from '@/db/schema';
import { 
  registerCenturyGothicFonts, 
  CENTURY_GOTHIC_FONT_FAMILY
} from '@/lib/fonts';

// Register Century Gothic fonts
registerCenturyGothicFonts();

// Company info interface that matches ComprehensiveInvoiceData structure exactly
interface CompanyInfo {
  name: string;
  address: {
    street: string;
    city: string;
    county: string;
    postCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  vatNumber: string;
  registrationNumber?: string;
  logo?: string;
}

interface JobCardPDFData extends VehicleJobCard {
  assignedUserName?: string;
  stockDetails?: {
    make: string;
    model: string;
    derivative?: string;
    year: number;
    colour: string;
    mileage: number;
    vin: string;
    engineSize: string;
    fuelType: string;
    bodyType?: string;
    doors?: number;
    seats?: number;
    transmission?: string;
    forecourtPrice?: number;
    totalPrice?: number;
    lifecycleState?: string;
    ownershipCondition?: string;
  };
  companyInfo?: CompanyInfo;
}

// Global formatting configuration matching the professional invoice
const GLOBAL_FORMAT_CONFIG = {
  fonts: {
    family: CENTURY_GOTHIC_FONT_FAMILY,
    sizes: {
      heading: 10,        // Section titles
      subheading: 9,      // Sub-headings
      normal: 8,          // Regular body text
      small: 7,           // Small text
      large: 12,          // Large text (company name, main title)
    },
    weights: {
      normal: 'normal',
      semibold: 'semibold',
    }
  },
  colors: {
    primary: '#000000',
    secondary: '#444444',
    border: '#e0e0e0',
    borderDark: '#d0d0d0',
    tableBg: '#f5f5f5',
    tableAlt: '#f9f9f9',
  },
  spacing: {
    page: 15,
    sectionGap: 8,
    itemGap: 6,
    lineGap: 3,
    smallGap: 2,
  },
  layout: {
    lineHeight: {
      normal: 1.2,
      compact: 1.1,
      tight: 1.0,
    },
    borders: {
      thin: '1px solid',
      thick: '2px solid',
    },
    logo: {
      height: 60,
      width: 'auto',
    },
  },
};

// Job categories mapping
const JOB_CATEGORIES_DISPLAY = {
  'service_ex_vat': 'Service (Ex VAT)',
  'parts_ex_vat': 'Parts (Ex VAT)',
  'repairs_ex_vat': 'Repairs (Ex VAT)',
  'dents_ex_vat': 'Dent Repairs (Ex VAT)',
  'bodyshop_ex_vat': 'Bodyshop (Ex VAT)',
  'service_inc_vat': 'Service (Inc VAT)',
  'parts_inc_vat': 'Parts (Inc VAT)',
  'repairs_inc_vat': 'Repairs (Inc VAT)',
  'dents_inc_vat': 'Dent Repairs (Inc VAT)',
  'bodyshop_inc_vat': 'Bodyshop (Inc VAT)',
  'multiple_jobs': 'Multiple Job Types'
};

const PRIORITY_DISPLAY = {
  'low': { label: 'Low', color: '#22c55e' },
  'medium': { label: 'Medium', color: '#eab308' },
  'high': { label: 'High', color: '#f97316' },
  'urgent': { label: 'Urgent', color: '#ef4444' }
};

const STATUS_DISPLAY = {
  'todo': 'To Do',
  'in_progress': 'In Progress',
  'due_collection': 'Due Collection',
  'done': 'Done'
};

// Styles following the professional invoice pattern
const styles = StyleSheet.create({
  page: {
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    padding: GLOBAL_FORMAT_CONFIG.spacing.page,
    lineHeight: GLOBAL_FORMAT_CONFIG.layout.lineHeight.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
  },

  // Header Section - professional layout like invoice
  headerContainer: {
    padding: 0,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2,
    paddingBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    borderBottom: `${GLOBAL_FORMAT_CONFIG.layout.borders.thin} ${GLOBAL_FORMAT_CONFIG.colors.border}`,
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
    height: GLOBAL_FORMAT_CONFIG.layout.logo.height,
    width: GLOBAL_FORMAT_CONFIG.layout.logo.width,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    objectFit: 'contain',
    alignSelf: 'flex-start',
  },
  companyName: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.large,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    textAlign: 'left',
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  companyDetails: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    lineHeight: GLOBAL_FORMAT_CONFIG.layout.lineHeight.compact,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  companyDetailLine: {
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
  },

  // Job Card Info Section
  jobCardInfoSection: {
    textAlign: 'right',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  jobCardTitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.large,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  jobCardDetail: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.small,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  jobCardDetailBold: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.small,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },

  // Section styles
  sectionContainer: {
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.sectionGap,
  },
  sectionTitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },

  // Table styles
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: GLOBAL_FORMAT_CONFIG.colors.border,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  } as any,
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableRowAlt: {
    margin: 'auto',
    flexDirection: 'row',
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.tableAlt,
  },
  tableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: GLOBAL_FORMAT_CONFIG.colors.border,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.tableBg,
    padding: 4,
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: GLOBAL_FORMAT_CONFIG.colors.border,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 4,
  },
  tableCellHeader: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  tableCell: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  tableCellBold: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },

  // Vehicle info table
  vehicleInfoRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: GLOBAL_FORMAT_CONFIG.colors.border,
  },
  vehicleInfoLabel: {
    width: '25%',
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
    paddingHorizontal: 4,
  },
  vehicleInfoValue: {
    width: '25%',
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
    paddingHorizontal: 4,
  },

  // Notes section
  notesContainer: {
    border: `${GLOBAL_FORMAT_CONFIG.layout.borders.thin} ${GLOBAL_FORMAT_CONFIG.colors.border}`,
    padding: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    minHeight: 50,
  },
  notesText: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
    lineHeight: GLOBAL_FORMAT_CONFIG.layout.lineHeight.normal,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: GLOBAL_FORMAT_CONFIG.spacing.page,
    right: GLOBAL_FORMAT_CONFIG.spacing.page,
    borderTop: `${GLOBAL_FORMAT_CONFIG.layout.borders.thin} ${GLOBAL_FORMAT_CONFIG.colors.border}`,
    paddingTop: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.small,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
    fontStyle: 'italic',
  },
});

// Helper functions
const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Job Card PDF Document Component
interface JobCardPDFDocumentProps {
  jobCardData: JobCardPDFData;
}

export default function JobCardPDFDocument({ jobCardData }: JobCardPDFDocumentProps) {
  const companyInfo: CompanyInfo = jobCardData.companyInfo || {
    name: 'Your Company Name',
    address: {
      street: '',
      city: '',
      county: '',
      postCode: '',
      country: 'United Kingdom'
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    vatNumber: '',
    registrationNumber: '',
    logo: ''
  };

  const priority = PRIORITY_DISPLAY[jobCardData.priority as keyof typeof PRIORITY_DISPLAY] || { label: jobCardData.priority || 'Medium', color: '#444' };
  const status = STATUS_DISPLAY[jobCardData.status as keyof typeof STATUS_DISPLAY] || jobCardData.status;

  const jobsToProcess = jobCardData.jobs && Array.isArray(jobCardData.jobs) && jobCardData.jobs.length > 0 
    ? jobCardData.jobs 
    : [{
        jobCategory: jobCardData.jobCategory,
        jobType: jobCardData.jobType,
        estimatedHours: jobCardData.estimatedHours,
        totalCost: jobCardData.estimatedCost ? parseFloat(jobCardData.estimatedCost) : 0
      }];

  const totalHours = jobsToProcess.reduce((sum: number, job: any) => sum + (job.estimatedHours || 0), 0);
  const totalCost = jobsToProcess.reduce((sum: number, job: any) => sum + (job.totalCost || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
          {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            {/* Left side - Company Info */}
            <View style={styles.companySection}>
              {/* Company Logo */}
              {companyInfo.logo && (
                <Image
                  style={styles.companyLogo}
                  src={companyInfo.logo}
                />
              )}
              
              <Text style={styles.companyName}>{companyInfo.name}</Text>
              <View style={styles.companyDetails}>
                {/* Address - match invoice format exactly */}
                {companyInfo.address.street && (
                  <Text style={styles.companyDetailLine}>{companyInfo.address.street}</Text>
                )}
                {companyInfo.address.city && (
                  <Text style={styles.companyDetailLine}>{companyInfo.address.city}</Text>
                )}
                {companyInfo.address.county && (
                  <Text style={styles.companyDetailLine}>{companyInfo.address.county}</Text>
                )}
                {companyInfo.address.postCode && (
                  <Text style={styles.companyDetailLine}>{companyInfo.address.postCode}</Text>
                )}
                {companyInfo.vatNumber && (
                  <Text style={styles.companyDetailLine}>VAT No: {companyInfo.vatNumber}</Text>
                )}
                {companyInfo.contact.phone && (
                  <Text style={styles.companyDetailLine}>{companyInfo.contact.phone}</Text>
                )}
                {companyInfo.contact.email && (
                  <Text style={styles.companyDetailLine}>{companyInfo.contact.email}</Text>
                )}
              </View>
            </View>

            {/* Right side - Job Card Info */}
            <View style={styles.jobCardInfoSection}>
              <Text style={styles.jobCardTitle}>VEHICLE JOB CARD</Text>
              <Text style={styles.jobCardDetailBold}>Job Card ID: {jobCardData.id.substring(0, 8)}</Text>
              <Text style={styles.jobCardDetail}>Priority: {priority.label.toUpperCase()}</Text>
              <Text style={styles.jobCardDetail}>Status: {status.toUpperCase()}</Text>
              <Text style={styles.jobCardDetail}>Due Date: {jobCardData.dueDate ? formatDate(jobCardData.dueDate) : 'Not Set'}</Text>
              <Text style={styles.jobCardDetail}>Generated: {new Date().toLocaleString('en-GB')}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
          
          {jobCardData.stockDetails ? (
            <View>
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Registration:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.registration}</Text>
                <Text style={styles.vehicleInfoLabel}>Stock ID:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockId}</Text>
              </View>
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Make:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockDetails.make}</Text>
                <Text style={styles.vehicleInfoLabel}>Model:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockDetails.model}</Text>
              </View>
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Year:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockDetails.year}</Text>
                <Text style={styles.vehicleInfoLabel}>Mileage:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockDetails.mileage?.toLocaleString()} miles</Text>
              </View>
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Colour:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockDetails.colour}</Text>
                <Text style={styles.vehicleInfoLabel}>Fuel Type:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockDetails.fuelType}</Text>
              </View>
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Engine:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockDetails.engineSize || 'N/A'}</Text>
                <Text style={styles.vehicleInfoLabel}>Transmission:</Text>
                <Text style={styles.vehicleInfoValue}>{jobCardData.stockDetails.transmission || 'N/A'}</Text>
              </View>
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>VIN:</Text>
                <Text style={[styles.vehicleInfoValue, { width: '75%' }]}>{jobCardData.stockDetails.vin}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.vehicleInfoRow}>
              <Text style={styles.vehicleInfoLabel}>Registration:</Text>
              <Text style={styles.vehicleInfoValue}>{jobCardData.registration}</Text>
              <Text style={styles.vehicleInfoLabel}>Stock ID:</Text>
              <Text style={styles.vehicleInfoValue}>{jobCardData.stockId}</Text>
            </View>
          )}
        </View>

        {/* Job Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>JOB DETAILS</Text>
          
          {/* Assignment info */}
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>Assigned to:</Text>
            <Text style={styles.vehicleInfoValue}>{jobCardData.assignedUserName || 'Unassigned'}</Text>
            <Text style={styles.vehicleInfoLabel}>Created:</Text>
            <Text style={styles.vehicleInfoValue}>{formatDate(jobCardData.createdAt)}</Text>
          </View>

          {/* Jobs table */}
          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableRow}>
              <View style={[styles.tableColHeader, { width: '8%' }]}>
                <Text style={styles.tableCellHeader}>#</Text>
              </View>
              <View style={[styles.tableColHeader, { width: '42%' }]}>
                <Text style={styles.tableCellHeader}>JOB DESCRIPTION</Text>
              </View>
              <View style={[styles.tableColHeader, { width: '25%' }]}>
                <Text style={styles.tableCellHeader}>CATEGORY</Text>
              </View>
              <View style={[styles.tableColHeader, { width: '12%' }]}>
                <Text style={styles.tableCellHeader}>HOURS</Text>
              </View>
              <View style={[styles.tableColHeader, { width: '13%' }]}>
                <Text style={styles.tableCellHeader}>COST (£)</Text>
              </View>
            </View>

            {/* Table rows */}
            {jobsToProcess.map((job: any, index: number) => {
              const category = JOB_CATEGORIES_DISPLAY[job.jobCategory as keyof typeof JOB_CATEGORIES_DISPLAY] || job.jobCategory;
              const hours = job.estimatedHours || 0;
              const cost = job.totalCost || 0;

              return (
                <View key={index} style={index % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
                  <View style={[styles.tableCol, { width: '8%' }]}>
                    <Text style={styles.tableCell}>{index + 1}</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '42%' }]}>
                    <Text style={styles.tableCell}>{job.jobType}</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '25%' }]}>
                    <Text style={styles.tableCell}>{category}</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '12%' }]}>
                    <Text style={styles.tableCell}>{hours > 0 ? hours.toString() : '-'}</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '13%' }]}>
                    <Text style={styles.tableCell}>{cost > 0 ? cost.toFixed(2) : '-'}</Text>
                  </View>
                </View>
              );
            })}

            {/* Total row */}
            <View style={[styles.tableRow, { backgroundColor: GLOBAL_FORMAT_CONFIG.colors.tableBg }]}>
              <View style={[styles.tableCol, { width: '8%' }]}>
                <Text style={styles.tableCellBold}></Text>
              </View>
              <View style={[styles.tableCol, { width: '42%' }]}>
                <Text style={styles.tableCellBold}></Text>
              </View>
              <View style={[styles.tableCol, { width: '25%' }]}>
                <Text style={styles.tableCellBold}>TOTAL:</Text>
              </View>
              <View style={[styles.tableCol, { width: '12%' }]}>
                <Text style={styles.tableCellBold}>{totalHours > 0 ? totalHours.toString() : '-'}</Text>
              </View>
              <View style={[styles.tableCol, { width: '13%' }]}>
                <Text style={styles.tableCellBold}>{totalCost > 0 ? totalCost.toFixed(2) : '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Work Instructions Section */}
        {jobCardData.garageDetails && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>WORK INSTRUCTIONS & NOTES</Text>
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{jobCardData.garageDetails}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This job card is for internal workshop use only.</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
