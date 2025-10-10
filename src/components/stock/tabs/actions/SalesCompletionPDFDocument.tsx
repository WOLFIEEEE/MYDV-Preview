import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { 
  registerCenturyGothicFonts, 
  CENTURY_GOTHIC_FONT_FAMILY
} from '@/lib/fonts';

// Register Century Gothic fonts
registerCenturyGothicFonts();

// Global Formatting Configuration - Centralized styling for easy customization
const GLOBAL_FORMAT_CONFIG = {
  // Font Configuration
  fonts: {
    family: CENTURY_GOTHIC_FONT_FAMILY,
    sizes: {
      heading: 12,        // Main headings (section titles, etc.)
      subheading: 11,     // Sub-headings and important labels
      normal: 11,         // Regular body text
      small: 10,          // Small text (footnotes, disclaimers)
      large: 13,          // Large text (company name, totals)
    },
    weights: {
      normal: 'normal',
      semibold: 'semibold',
    }
  },

  // Color Configuration
  colors: {
    primary: '#000000',      // Main text color (black)
    secondary: '#000000',    // Secondary text color (black)
    accent: '#000000',       // Accent color
    background: '#FFFFFF',   // Background color (white)
    border: '#e0e0e0',       // Light border color
    borderDark: '#d0d0d0',   // Darker border color
    tableBg: '#f5f5f5',      // Table header background
    tableAlt: '#f9f9f9',     // Alternate table row background
  },

  // Spacing Configuration
  spacing: {
    page: 15,              // Page padding (increased for more top space)
    sectionGap: 8,         // Gap between major sections
    itemGap: 6,            // Gap between items within sections
    lineGap: 3,            // Gap between lines
    smallGap: 2,           // Small gaps
    largeGap: 12,          // Large gaps
    headerGap: 12,         // Header section spacing
  },

  // Layout Configuration
  layout: {
    lineHeight: {
      normal: 1.1,         // Normal line height
      relaxed: 1.6,        // Relaxed line height for readability
      compact: 1.3,        // Compact line height
      tight: 1.0,          // Tight line height
    },
    borders: {
      thin: '1px solid',
      thick: '2px solid',
    },
    logo: {
      height: 80,
      width: 'auto',
      maxWidth: 120, // Limit maximum width to prevent layout issues with wide logos
    },
    backgroundImage: {
      enabled: false,       // Enable/disable background image
      opacity: 0.05,       // Background image opacity (very light)
      position: 'absolute', // Position type
      width: '100%',       // Full width
      height: '100%',      // Full height
      zIndex: -1,          // Behind all content
      defaultPath: '/companylogo.png', // Default background image path
      useCompanyLogo: true, // Use company logo as background if no custom path
    }
  },

  // Component-specific styling
  components: {
    table: {
      cellPadding: 4,
      headerPadding: 4,
      minHeight: 25,
      borderRadius: 0,
    },
  }
};

// Professional black and white styles with optimal spacing
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.background,
    padding: GLOBAL_FORMAT_CONFIG.spacing.page,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
    lineHeight: GLOBAL_FORMAT_CONFIG.layout.lineHeight.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    position: 'relative', // Enable positioning for background image
    zIndex: 1, // Ensure content appears above background
  },
  
  // Background image style
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: GLOBAL_FORMAT_CONFIG.layout.backgroundImage.opacity,
    zIndex: -1,
    objectFit: 'contain',
  },
  
  // Header Section - professional black and white (no borders)
  headerContainer: {
    padding: 0,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2,
    paddingBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    borderBottomWidth: 1,
    borderBottomColor: GLOBAL_FORMAT_CONFIG.colors.border,
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
    maxWidth: GLOBAL_FORMAT_CONFIG.layout.logo.maxWidth,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2,
    objectFit: 'contain',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    flexDirection: 'row',
  },
  companyName: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
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
  
  // Completion Info Section - professional
  completionInfoSection: {
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  completionTitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  completionSubtitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  registrationNumber: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Content sections - professional spacing
  contentSection: {
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.sectionGap,
  },
  sectionTitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    textTransform: 'uppercase',
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Details Section - professional
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  detailLabel: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  detailValue: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Checklist Styles - professional
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  checklistItem: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 35,
  },
  checklistLabel: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: '#374151',
    flex: 1,
    marginRight: 12,
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
  },
  checklistStatus: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 3,
    width: 60,
    height: '100%',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusYes: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusNo: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  
  // Additional Text Section - professional
  additionalTextContainer: {
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.largeGap,
    padding: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.tableAlt,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: GLOBAL_FORMAT_CONFIG.colors.border,
  },
  additionalTextTitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  additionalTextContent: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    lineHeight: GLOBAL_FORMAT_CONFIG.layout.lineHeight.relaxed,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.small,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
});

// Types
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
    website: string;
  };
  vatNumber: string;
  registrationNumber: string;
  logo: string;
}

interface CompletionData {
  wheelNuts: boolean;
  tyrePressures: boolean;
  tyreSensors: boolean;
  oilLevel: boolean;
  coolantLevel: boolean;
  screenWash: boolean;
  lockingNutGloveBox: boolean;
  bookPackGloveBox: boolean;
  inflationKit: boolean;
  keyBatteries: boolean;
  batteryTest: boolean;
  testDriver: boolean;
  adequateDriveAwayFuel: boolean;
  additionalText: string;
  completionDate: string;
}

interface SalesCompletionPDFData {
  stockId: string;
  registration: string;
  saleDate: string;
  customerName: string;
  companyInfo: CompanyInfo;
  completionData: CompletionData;
}

// Checklist items configuration
const CHECKLIST_ITEMS = [
  { key: 'wheelNuts', label: 'Wheel nuts' },
  { key: 'tyrePressures', label: 'Tyre pressures' },
  { key: 'tyreSensors', label: 'Tyre Sensors' },
  { key: 'oilLevel', label: 'Oil level' },
  { key: 'coolantLevel', label: 'Coolant level' },
  { key: 'screenWash', label: 'Screen wash' },
  { key: 'lockingNutGloveBox', label: 'Locking nut – glove box' },
  { key: 'bookPackGloveBox', label: 'Book pack – glove box' },
  { key: 'inflationKit', label: 'Inflation kit' },
  { key: 'keyBatteries', label: 'Key batteries' },
  { key: 'batteryTest', label: 'Battery Test' },
  { key: 'testDriver', label: 'Test Driver' },
  { key: 'adequateDriveAwayFuel', label: 'Adequate Drive Away Fuel' },
];

/**
 * Get background image source for PDF pages
 * 
 * Determines which background image to use based on configuration.
 * 
 * @param customSrc - Optional custom background image path
 * @param companyLogo - Company logo path from completion data
 * @returns Image source URL or null if disabled
 */
const getBackgroundImageSrc = (customSrc?: string, companyLogo?: string): string | null => {
  // Only return image if background image is enabled
  if (!GLOBAL_FORMAT_CONFIG.layout.backgroundImage.enabled) {
    return null;
  }

  // Determine which image to use
  let imageSrc = customSrc;
  
  if (!imageSrc && GLOBAL_FORMAT_CONFIG.layout.backgroundImage.useCompanyLogo && companyLogo) {
    imageSrc = companyLogo;
  }
  
  if (!imageSrc) {
    imageSrc = GLOBAL_FORMAT_CONFIG.layout.backgroundImage.defaultPath;
  }

  return imageSrc || null;
};

// Sales Completion PDF Document Component
interface SalesCompletionPDFDocumentProps {
  completionData: SalesCompletionPDFData;
}

export default function SalesCompletionPDFDocument({ completionData }: SalesCompletionPDFDocumentProps) {
  const companyInfo = completionData.companyInfo;
  const completion = completionData.completionData;

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Calculate completion percentage
  const completedItems = CHECKLIST_ITEMS.filter(item => completion[item.key as keyof CompletionData]).length;
  const completionPercentage = Math.round((completedItems / CHECKLIST_ITEMS.length) * 100);

  // Get background image source
  const backgroundImageSrc = getBackgroundImageSrc(undefined, companyInfo.logo);
  
  // Create page wrapper component with background
  const PageWithBackground = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    const pageStyle = Array.isArray(style) ? style : [style];
    
    return (
      <Page size="A4" style={pageStyle}>
        {backgroundImageSrc && (
          <Image
            style={styles.backgroundImage}
            src={backgroundImageSrc}
            fixed
          />
        )}
        <View style={{ position: 'relative', flex: 1 }}>
          {children}
        </View>
      </Page>
    );
  };

  return (
    <Document>
      <PageWithBackground style={styles.page}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            {/* Left Side - Logo and Company Info */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Logo */}
              {companyInfo.logo && (
                <View style={{ 
                  marginRight: GLOBAL_FORMAT_CONFIG.spacing.largeGap + 5,
                  maxWidth: GLOBAL_FORMAT_CONFIG.layout.logo.maxWidth + 10, // Add some padding
                  flexShrink: 0 // Prevent shrinking
                }}>
                  <Image
                    style={{ 
                      height: GLOBAL_FORMAT_CONFIG.layout.logo.height, 
                      width: GLOBAL_FORMAT_CONFIG.layout.logo.width, 
                      maxWidth: GLOBAL_FORMAT_CONFIG.layout.logo.maxWidth,
                      objectFit: 'contain' 
                    }}
                    src={companyInfo.logo}
                  />
                </View>
              )}
              
              {/* Company Details */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                  {companyInfo.address.street}
                </Text>
                <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                  {companyInfo.address.city}
                </Text>
                <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                  {companyInfo.address.postCode}
                </Text>
                {companyInfo.vatNumber && (
                  <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2 }}>
                    VAT No: {companyInfo.vatNumber}
                  </Text>
                )}
                <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                  {companyInfo.contact.phone}
                </Text>
                <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family }}>
                  {companyInfo.contact.email}
                </Text>
              </View>
            </View>
            
            {/* Right Side - Completion Info */}
            <View style={styles.completionInfoSection}>
              <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: 'bold', marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                Sales Completion:
              </Text>
              <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2 }}>
                Vehicle Sales Checklist
              </Text>
              
              <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                Registration:
              </Text>
              <Text style={{ fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family }}>
                {completionData.registration}
              </Text>
            </View>
          </View>
        </View>

        {/* Details Section - Compact */}
        <View style={styles.contentSection}>
          {completionData.customerName && (
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Customer:</Text>
              <Text style={styles.detailValue}>{completionData.customerName}</Text>
            </View>
          )}
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Sale Date:</Text>
            <Text style={styles.detailValue}>{formatDate(completionData.saleDate)}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Completion Date:</Text>
            <Text style={styles.detailValue}>{formatDate(completion.completionDate)}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Completion Status:</Text>
            <Text style={styles.detailValue}>{completionPercentage}% Complete ({completedItems}/{CHECKLIST_ITEMS.length} items)</Text>
          </View>
        </View>

        {/* Checklist Section */}
        <View style={styles.contentSection}>
          <Text style={[styles.sectionTitle, { fontWeight: 'bold' }]}>Vehicle Sales Checklist</Text>
          <View style={styles.checklistGrid}>
            {CHECKLIST_ITEMS.map((item) => {
              const isCompleted = completion[item.key as keyof CompletionData];
              return (
                <View key={item.key} style={styles.checklistItem}>
                  <Text style={styles.checklistLabel}>{item.label}</Text>
                  <Text style={[
                    styles.checklistStatus,
                    isCompleted ? styles.statusYes : styles.statusNo
                  ]}>
                    {isCompleted ? 'YES' : 'NO'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Additional Text Section */}
        {completion.additionalText && (
          <View style={styles.additionalTextContainer}>
            <Text style={styles.additionalTextTitle}>Additional Notes</Text>
            <Text style={styles.additionalTextContent}>{completion.additionalText}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          Generated on {formatDate(new Date().toISOString())} | Sales Completion Document
        </View>
      </PageWithBackground>
    </Document>
  );
}