import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { 
  registerCenturyGothicFonts, 
  CENTURY_GOTHIC_FONT_FAMILY,
  centuryGothicStyles_predefined,
  getCenturyGothicStyle 
} from '@/lib/fonts';

// Register fonts before creating the document
registerCenturyGothicFonts();

// Define styles using Century Gothic
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 12,
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
  },
  sectionTitle: {
    ...centuryGothicStyles_predefined.heading,
    fontSize: 16,
    color: '#1e40af',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5,
  },
  testRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    ...centuryGothicStyles_predefined.semibold,
    fontSize: 10,
    width: 120,
    color: '#374151',
  },
  sample: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
  },
  header: {
    ...centuryGothicStyles_predefined.title,
    fontSize: 24,
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
  },
  description: {
    ...centuryGothicStyles_predefined.body,
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 1.4,
  },
  footer: {
    ...centuryGothicStyles_predefined.bodyLight,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

/**
 * Test PDF Component for Century Gothic Fonts
 * 
 * This component demonstrates all Century Gothic font variants
 * and serves as a test to ensure fonts are properly registered and working.
 */
const CenturyGothicTestPDF: React.FC = () => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.header}>Century Gothic Font Test</Text>
        
        <Text style={styles.description}>
          This document demonstrates all Century Gothic font variants available in the system.
          Each style shows the font weight, style, and a sample text to verify proper rendering.
        </Text>

        {/* Font Weight Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Weights</Text>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Thin (100):</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('thin')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Light (300):</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('light')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Regular (400):</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('normal')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>SemiBold (600):</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('semibold')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Bold (700):</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('bold')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>ExtraBold (800):</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('extrabold')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Black (900):</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('black')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
        </View>

        {/* Font Style Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Styles</Text>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Regular Italic:</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('normal', 'italic')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>SemiBold Italic:</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('semibold', 'italic')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>ExtraBold Italic:</Text>
            <Text style={[styles.sample, getCenturyGothicStyle('extrabold', 'italic')]}>
              The quick brown fox jumps over the lazy dog
            </Text>
          </View>
        </View>

        {/* Predefined Styles Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Predefined Styles</Text>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Title:</Text>
            <Text style={[styles.sample, centuryGothicStyles_predefined.title]}>
              Invoice Title Example
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Heading:</Text>
            <Text style={[styles.sample, centuryGothicStyles_predefined.heading]}>
              Section Heading Example
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Subheading:</Text>
            <Text style={[styles.sample, centuryGothicStyles_predefined.subheading]}>
              Subsection Heading Example
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Body:</Text>
            <Text style={[styles.sample, centuryGothicStyles_predefined.body]}>
              Regular body text for invoices and documents
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Body Italic:</Text>
            <Text style={[styles.sample, centuryGothicStyles_predefined.bodyItalic]}>
              Italic body text for emphasis or notes
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>Body Light:</Text>
            <Text style={[styles.sample, centuryGothicStyles_predefined.bodyLight]}>
              Light body text for secondary information
            </Text>
          </View>
        </View>

        {/* Size Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Sizes</Text>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>8pt:</Text>
            <Text style={[styles.sample, { fontSize: 8 }]}>
              Small text for fine print and footnotes
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>10pt:</Text>
            <Text style={[styles.sample, { fontSize: 10 }]}>
              Standard body text size for invoices
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>12pt:</Text>
            <Text style={[styles.sample, { fontSize: 12 }]}>
              Medium text for important information
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>14pt:</Text>
            <Text style={[styles.sample, { fontSize: 14 }]}>
              Large text for headings
            </Text>
          </View>
          
          <View style={styles.testRow}>
            <Text style={styles.label}>18pt:</Text>
            <Text style={[styles.sample, { fontSize: 18 }]}>
              Extra large for titles
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Century Gothic Font Test - Generated on {new Date().toLocaleDateString('en-GB')} at{' '}
          {new Date().toLocaleTimeString('en-GB', { hour12: false })}
        </Text>
      </Page>
    </Document>
  );
};

export default CenturyGothicTestPDF;
