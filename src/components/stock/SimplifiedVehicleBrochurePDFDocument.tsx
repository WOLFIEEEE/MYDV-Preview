import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// Define styles for the PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 15, // Reduced from 20
    fontFamily: 'Helvetica',
  },
  
  // Company header styles
  headerContainer: {
    marginBottom: 12, // Reduced from 20
    paddingBottom: 10, // Reduced from 15
    borderBottom: '3px solid #2563eb',
    backgroundColor: '#f8f9fa',
    padding: 12, // Reduced from 15
    borderRadius: 10,
  },
  
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  
  companyLogo: {
    width: 80,
    height: 80,
    marginRight: 20,
    objectFit: 'contain',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    border: '2px solid #e5e7eb',
    padding: 6,
    // Add subtle shadow effect for premium look
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  companyDetails: {
    flex: 1,
  },
  
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  companyAddress: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 3,
    fontWeight: '500',
  },
  
  companyContact: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
  
  // Title styles
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 5,
  },
  
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  
  // Hero image styles
  heroImageContainer: {
    marginBottom: 10, // Reduced from 15
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  
  heroImage: {
    width: '100%',
    height: 180, // Reduced from 200
    objectFit: 'contain',
    borderRadius: 8,
  },
  
  // Dynamic grid layout for vehicle attributes
  attributesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10, // Consistent spacing
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'flex-start', // Align items to start
    alignContent: 'flex-start', // Prevent extra spacing
  },
  
  gridItem: {
    width: '16.66%', // 6 items per row (100% / 6)
    padding: 3,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 50,
    maxHeight: 50, // Prevent height variations
    justifyContent: 'center',
  },
  
  gridLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 3,
    maxWidth: '100%', // Prevent overflow
    overflow: 'hidden',
  },
  
  gridValue: {
    fontSize: 9,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '600',
    maxWidth: '100%', // Prevent overflow
    overflow: 'hidden',
  },
  
  // Section styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  
  descriptionSection: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeft: '4px solid #2563eb',
  },
  
  description: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  
  // Image grid styles for page 2
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 3,
    padding: 0,
  },
  
  gridImageContainer: {
    width: '24%',
    padding: 0,
    marginBottom: 3,
  },
  
  gridImage: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
    borderRadius: 4,
    border: '1px solid #e5e7eb',
  },
  
  // Features styles - made compact for first page
  featuresSection: {
    marginBottom: 8, // Reduced for first page
    padding: 10, // Reduced for first page
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeft: '4px solid #10b981',
  },
  
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  featureItem: {
    fontSize: 9, // Reduced for first page
    color: '#374151',
    width: '50%',
    marginBottom: 3, // Reduced for first page
    paddingRight: 8, // Reduced for first page
  },
  
  // Enhanced footer styles for second page
  footer: {
    marginTop: 'auto',
    paddingTop: 12,
    borderTop: '2px solid #2563eb',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  
  footerCompanyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  
  footerText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 2,
  },
  
  footerBrochureInfo: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

interface SimplifiedVehicleBrochurePDFDocumentProps {
  stockData: any;
  processedImages: Array<{ original: any; base64: string }>;
  includeFeatures?: boolean;
  photoFilter?: string;
  companyInfo?: any;
}

const SimplifiedVehicleBrochurePDFDocument: React.FC<SimplifiedVehicleBrochurePDFDocumentProps> = ({
  stockData, 
  processedImages,
  includeFeatures = true,
  photoFilter = 'all',
  companyInfo
}) => {
  const vehicle = stockData?.vehicle || {};
  const adverts = stockData?.adverts || {};
  const features = stockData?.features || [];

  // Vehicle details
  const vehicleTitle = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle Details';
  const registration = vehicle.registration || vehicle.plate || 'N/A';

  // Extract price with better parsing
  const extractPrice = (priceStr: string | number): number | null => {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return null;
    
    const cleanStr = priceStr.toString().replace(/[£,\s]/g, '');
    const price = parseFloat(cleanStr);
    return isNaN(price) ? null : price;
  };

  const priceAmount = extractPrice(adverts?.retailAdverts?.askingPrice) || 
                     extractPrice(adverts?.retailAdverts?.totalPrice) ||
                     extractPrice(adverts?.retailAdverts?.suppliedPrice);
  
  const price = priceAmount ? `£${priceAmount.toLocaleString()}` : null;

  // Prepare vehicle attributes for 6x6 grid (36 total attributes)
  const vehicleAttributes = [
    { label: 'MAKE', value: vehicle.make || null },
    { label: 'MODEL', value: vehicle.model || null },
    { label: 'YEAR', value: vehicle.yearOfManufacture || null },
    { label: 'REG', value: vehicle.registration || null },
    { label: 'MILEAGE', value: vehicle.odometerReadingMiles ? `${vehicle.odometerReadingMiles.toLocaleString()}` : null },
    { label: 'FUEL', value: vehicle.fuelType || null },
    { label: 'TRANSMISSION', value: vehicle.transmissionType || null },
    { label: 'BODY TYPE', value: vehicle.bodyType || null },
    { label: 'COLOUR', value: vehicle.colour || null },
    { label: 'DOORS', value: vehicle.doors || null },
    { label: 'SEATS', value: vehicle.seats || null },
    { label: 'ENGINE CC', value: vehicle.engineCapacityCC ? `${vehicle.engineCapacityCC}CC` : null },
    { label: 'ENGINE SIZE', value: vehicle.engineCapacity ? `${vehicle.engineCapacity}L` : null },
    { label: 'POWER BHP', value: vehicle.enginePowerBHP ? `${vehicle.enginePowerBHP}` : null },
    { label: 'POWER KW', value: vehicle.enginePowerKW ? `${vehicle.enginePowerKW}kW` : null },
    { label: 'TORQUE', value: vehicle.engineTorqueNM ? `${vehicle.engineTorqueNM}Nm` : null },
    { label: 'CO2 EMISSIONS', value: vehicle.co2EmissionGPKM ? `${vehicle.co2EmissionGPKM}g/km` : null },
    { label: 'FUEL ECONOMY', value: vehicle.fuelEconomyNEDCCombinedMPG ? `${vehicle.fuelEconomyNEDCCombinedMPG}mpg` : null },
    { label: 'DRIVETRAIN', value: vehicle.drivetrain || null },
    { label: 'PREVIOUS OWNERS', value: vehicle.owners || null },
    { label: 'SERVICE HISTORY', value: vehicle.serviceHistoryType || null },
    { label: 'MOT EXPIRY', value: vehicle.motExpiryDate ? new Date(vehicle.motExpiryDate).toLocaleDateString() : null },
    { label: 'TAX BAND', value: vehicle.taxBand || null },
    { label: 'INSURANCE GROUP', value: vehicle.insuranceGroup || null },
    { label: 'BOOT SPACE', value: vehicle.bootSpaceSeatsUpLitres ? `${vehicle.bootSpaceSeatsUpLitres}L` : null },
    { label: 'KERB WEIGHT', value: vehicle.kerbWeightKG ? `${vehicle.kerbWeightKG}kg` : null },
    { label: 'MAX SPEED', value: vehicle.maxSpeedMPH ? `${vehicle.maxSpeedMPH}mph` : null },
    { label: '0-60 TIME', value: vehicle.accelerationZeroToSixtyMPH ? `${vehicle.accelerationZeroToSixtyMPH}s` : null },
    { label: 'CYLINDERS', value: vehicle.engineCylinders || null },
    { label: 'VALVES', value: vehicle.engineValves || null },
    { label: 'GEARS', value: vehicle.gears || null },
    { label: 'WHEEL SIZE', value: vehicle.wheelSizeInches ? `${vehicle.wheelSizeInches}"` : null },
    { label: 'TYRE SIZE', value: vehicle.tyreSizeFront || null },
    { label: 'FUEL TANK', value: vehicle.fuelTankCapacityLitres ? `${vehicle.fuelTankCapacityLitres}L` : null },
    { label: 'VIN', value: vehicle.vin || null },
    { label: 'PRICE', value: price || null }
  ].filter(attr => attr.value !== null); // Only show attributes with actual data

  // Use only the attributes that have data - no padding to 36
  const gridAttributes = vehicleAttributes;

  // Use actual descriptions from adverts data, showing both when available
  const getVehicleDescription = () => {
    const description1 = adverts.retailAdverts?.description;
    const description2 = adverts.retailAdverts?.description2;

    const descriptions = [];

    if (description1 && description1.trim()) {
      descriptions.push(description1.trim());
    }

    if (description2 && description2.trim() && description2.trim() !== description1?.trim()) {
      descriptions.push(description2.trim());
    }

    if (descriptions.length > 0) {
      return descriptions.join('\n\n');
    }

    return 'No vehicle description';
  };

  return (
    <Document>
      {/* PAGE 1: Company Info + First Image + Vehicle Attributes Grid */}
      <Page size="A4" style={styles.page}>
        {/* Company Header */}
        {companyInfo && (
          <View style={styles.headerContainer}>
            <View style={styles.companyHeader}>
              {companyInfo.logo && (
                <Image src={companyInfo.logo} style={styles.companyLogo} />
              )}
              <View style={styles.companyDetails}>
                <Text style={styles.companyName}>{companyInfo.name}</Text>
                <Text style={styles.companyAddress}>
                  {[
                    companyInfo.address?.street,
                    companyInfo.address?.city,
                    companyInfo.address?.postCode
                  ].filter(Boolean).join(', ')}
                </Text>
                <Text style={styles.companyContact}>
                  {[
                    companyInfo.contact?.phone,
                    companyInfo.contact?.email
                  ].filter(Boolean).join(' | ')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Vehicle Title */}
        <View style={{ marginBottom: 10, textAlign: 'center' }}>
          <Text style={styles.title}>{vehicleTitle}</Text>
          <Text style={styles.subtitle}>Registration: {registration}</Text>
        </View>

        {/* First Image (Hero) */}
        {processedImages.length > 0 && (
          <View style={styles.heroImageContainer}>
            <Image
              src={processedImages[0].base64}
              style={styles.heroImage}
            />
          </View>
        )}

        {/* Vehicle Attributes - Dynamic Grid */}
        <View style={styles.attributesGrid}>
          {gridAttributes.map((attr, index) => (
            <View key={index} style={styles.gridItem}>
              <Text style={styles.gridLabel}>{attr.label}</Text>
              <Text style={styles.gridValue}>{attr.value}</Text>
            </View>
          ))}
        </View>

        {/* Key Features Section - Added to first page */}
        {includeFeatures && features.length > 0 && (
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Key Features</Text>
            <View style={styles.featuresList}>
              {features.slice(0, 8).map((feature: any, index: number) => (
                <Text key={index} style={styles.featureItem}>
                  • {feature.name || feature}
                </Text>
              ))}
            </View>
          </View>
        )}
      </Page>

      {/* PAGE 2: Additional Images + Description + Features */}
      <Page size="A4" style={styles.page}>
        {/* Additional Images Grid */}
        {processedImages.length > 1 && (
          <>
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Additional Images</Text>
            </View>
            <View style={styles.imageGrid}>
              {processedImages.slice(1, 9).map((img, index) => (
                <View key={index} style={styles.gridImageContainer}>
                  <Image
                    src={img.base64}
                    style={styles.gridImage}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Vehicle Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Vehicle Description</Text>
          <Text style={styles.description}>{getVehicleDescription()}</Text>
        </View>

        {/* Enhanced Business Footer */}
        <View style={styles.footer}>
          {companyInfo && (
            <>
              <Text style={styles.footerCompanyName}>{companyInfo.name}</Text>
              <Text style={styles.footerText}>
                {[
                  companyInfo.address?.street,
                  companyInfo.address?.city,
                  companyInfo.address?.postCode
                ].filter(Boolean).join(', ')}
              </Text>
              <Text style={styles.footerText}>
                Tel: {companyInfo.contact?.phone || 'N/A'} | Email: {companyInfo.contact?.email || 'N/A'}
              </Text>
              {companyInfo.vatNumber && (
                <Text style={styles.footerText}>
                  {companyInfo.registrationNumber && `Company Number: ${companyInfo.registrationNumber} | `}
                  VAT Number: {companyInfo.vatNumber}
                </Text>
              )}
            </>
          )}
          <Text style={styles.footerBrochureInfo}>
            Vehicle brochure featuring {Math.min(processedImages.length, 9)} high-quality images | Generated on {new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default SimplifiedVehicleBrochurePDFDocument;