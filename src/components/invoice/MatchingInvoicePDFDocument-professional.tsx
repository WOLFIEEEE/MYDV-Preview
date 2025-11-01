/**
 * Professional Matching Invoice PDF Document
 * 
 * Features:
 * - Multi-page invoice layout with professional styling
 * - Background image support on all pages (watermark-style)
 * - Configurable background image opacity and source
 * - Uses company logo as background by default
 * - Century Gothic font family throughout
 * 
 * Background Image Configuration:
 * - Set GLOBAL_FORMAT_CONFIG.layout.backgroundImage.enabled to true/false
 * - Adjust opacity with GLOBAL_FORMAT_CONFIG.layout.backgroundImage.opacity
 * - Customize default image with GLOBAL_FORMAT_CONFIG.layout.backgroundImage.defaultPath
 */

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

// Global Formatting Configuration - Centralized styling for easy customization
const GLOBAL_FORMAT_CONFIG = {
  // Font Configuration
  fonts: {
    family: CENTURY_GOTHIC_FONT_FAMILY,
    sizes: {
      heading: 7,        // Main headings (section titles, invoice number, etc.)
      subheading: 7,     // Sub-headings and important labels
      normal: 7,         // Regular body text
      small: 7,          // Small text (footnotes, disclaimers)
      large: 7,          // Large text (company name, totals)
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
    accent: '#000000',       // Accent color (red for discounts)
    background: '#FFFFFF',   // Background color (white)
    border: '#e0e0e0',       // Light border color
    borderDark: '#d0d0d0',   // Darker border color
    tableBg: '#f5f5f5',      // Table header background
    tableAlt: '#f9f9f9',     // Alternate table row background
  },

  // Spacing Configuration
  spacing: {
    page: 20,              // Page padding (reduced from 15)
    sectionGap: 6,         // Gap between major sections (reduced from 10)
    itemGap: 4,            // Gap between items within sections (reduced from 6)
    lineGap: 2,            // Gap between lines (reduced from 3)
    smallGap: 1,           // Small gaps (reduced from 2)
    largeGap: 8,           // Large gaps (reduced from 15)
    headerGap: 8,          // Header section spacing (reduced from 12)
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
    signature: {
      width: 150,
      height: 60,
    },
    qrCode: {
      width: 60,
      height: 60,
    },
    backgroundImage: {
      enabled: true,       // Enable/disable background image
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
    warranty: {
      bulletIndent: 10,
      sectionSpacing: 8,
    },
    payment: {
      labelWidth: 200,
      rowSpacing: 2,
    }
  }
};

// Global Calculation Configuration - Centralized calculation logic for easy customization
const GLOBAL_CALCULATION_CONFIG = {
  // Currency Configuration
  currency: {
    symbol: '£',
    decimalPlaces: 2,
    locale: 'en-GB',
  },

  // Calculation Functions
  calculations: {
    // Format currency with consistent styling
    formatCurrency: (amount: number): string => {
      return `${GLOBAL_CALCULATION_CONFIG.currency.symbol}${amount.toFixed(GLOBAL_CALCULATION_CONFIG.currency.decimalPlaces)}`;
    },

    // Calculate discount amount from original and discounted prices
    calculateDiscountAmount: (originalPrice: number, discountedPrice: number): number => {
      return Math.max(0, originalPrice - discountedPrice);
    },

    // Calculate effective price (post-discount or original)
    calculateEffectivePrice: (originalPrice: number, discountedPrice?: number): number => {
      return discountedPrice || originalPrice || 0;
    },

    // Calculate addon discount - handles 100% discounts properly
    calculateAddonDiscount: (addon: any): number => {
      // If there's an explicit discount field, use it
      if (addon?.discount && addon.discount > 0) {
        return addon.discount;
      }
      
      // Calculate discount from cost vs postDiscountCost
      if (addon?.cost && addon.cost > 0) {
        const postDiscountCost = addon?.postDiscountCost || 0;
        const discountAmount = addon.cost - postDiscountCost;
        return Math.max(0, discountAmount);
      }
      
      return 0;
    },

    // Calculate addon effective cost
    calculateAddonEffectiveCost: (addon: any): number => {
      return addon?.postDiscountCost || addon?.cost || 0;
    },

    // Calculate subtotal for all items - EXCLUDES VAT (post-discount prices only)
    calculateSubtotal: (invoiceData: any): number => {
      // Always use post-discount prices (excluding VAT) for subtotal
      const vehiclePrice = invoiceData.pricing.salePricePostDiscount || 0;
      
      // For trade sales, exclude warranty and finance add-ons
      const warrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0);
      const enhancedWarrantyPrice = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0);
      const deliveryPrice = invoiceData.delivery?.postDiscountCost ?? invoiceData.pricing?.deliveryCostPostDiscount ?? invoiceData.delivery?.cost ?? 0;
      
      // Customer addons - use post-discount prices only (no VAT)
      const customerAddon1Cost = invoiceData.addons?.customer?.addon1?.postDiscountCost ?? invoiceData.addons?.customer?.addon1?.cost ?? 0;
      const customerAddon2Cost = invoiceData.addons?.customer?.addon2?.postDiscountCost ?? invoiceData.addons?.customer?.addon2?.cost ?? 0;
      const customerDynamicAddonsCost = (() => {
        let dynamicAddons = invoiceData.addons?.customer?.dynamicAddons;
        // Convert object format back to array if needed
        if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
          dynamicAddons = Object.values(dynamicAddons);
        }
        return Array.isArray(dynamicAddons) 
          ? dynamicAddons.reduce((sum: number, addon: any) => {
              return sum + (addon.postDiscountCost ?? addon.cost ?? 0);
            }, 0)
          : 0;
      })();
      
      // Finance addons - exclude for trade sales, use post-discount prices only
      const financeAddon1Cost = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.addons?.finance?.addon1?.postDiscountCost ?? invoiceData.addons?.finance?.addon1?.cost ?? 0);
      const financeAddon2Cost = invoiceData.saleType === 'Trade' ? 0 : (invoiceData.addons?.finance?.addon2?.postDiscountCost ?? invoiceData.addons?.finance?.addon2?.cost ?? 0);
      const financeDynamicAddonsCost = invoiceData.saleType === 'Trade' ? 0 : (() => {
        let dynamicAddons = invoiceData.addons?.finance?.dynamicAddons;
        // Convert object format back to array if needed
        if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
          dynamicAddons = Object.values(dynamicAddons);
        }
        return Array.isArray(dynamicAddons) 
          ? dynamicAddons.reduce((sum: number, addon: any) => {
              return sum + (addon.postDiscountCost ?? addon.cost ?? 0);
            }, 0)
          : 0;
      })();

      return vehiclePrice + warrantyPrice + enhancedWarrantyPrice + deliveryPrice + 
             customerAddon1Cost + customerAddon2Cost + customerDynamicAddonsCost +
             financeAddon1Cost + financeAddon2Cost + financeDynamicAddonsCost;
    },
    
    // Calculate total VAT from all items
    calculateTotalVAT: (invoiceData: any): number => {
      let totalVAT = 0;
      
      // Sale Price VAT
      if (invoiceData.pricing.applyVatToSalePrice) {
        totalVAT += invoiceData.pricing.salePriceVatAmount || 0;
      }
      
      // Warranty VAT (exclude for trade sales)
      if (invoiceData.saleType !== 'Trade' && invoiceData.pricing.applyVatToWarranty) {
        totalVAT += invoiceData.pricing.warrantyVatAmount || 0;
      }
      
      // Enhanced Warranty VAT (exclude for trade sales)
      if (invoiceData.saleType !== 'Trade' && invoiceData.pricing.applyVatToEnhancedWarranty) {
        totalVAT += invoiceData.pricing.enhancedWarrantyVatAmount || 0;
      }
      
      // Delivery VAT
      if (invoiceData.pricing.applyVatToDelivery) {
        totalVAT += invoiceData.pricing.deliveryVatAmount || 0;
      }
      
      // Customer Add-ons VAT
      if (invoiceData.addons?.customer?.addon1?.applyVat) {
        totalVAT += invoiceData.addons.customer.addon1.vatAmount || 0;
      }
      if (invoiceData.addons?.customer?.addon2?.applyVat) {
        totalVAT += invoiceData.addons.customer.addon2.vatAmount || 0;
      }
      
      // Dynamic Customer Add-ons VAT
      let dynamicCustomerAddons = invoiceData.addons?.customer?.dynamicAddons;
      if (dynamicCustomerAddons && !Array.isArray(dynamicCustomerAddons) && typeof dynamicCustomerAddons === 'object') {
        dynamicCustomerAddons = Object.values(dynamicCustomerAddons);
      }
      if (Array.isArray(dynamicCustomerAddons)) {
        dynamicCustomerAddons.forEach((addon: any) => {
          if (addon.applyVat) {
            totalVAT += addon.vatAmount || 0;
          }
        });
      }
      
      // Finance Add-ons VAT (only for Finance Company invoices, exclude for trade sales)
      if (invoiceData.saleType !== 'Trade' && invoiceData.invoiceTo === 'Finance Company') {
        if (invoiceData.addons?.finance?.addon1?.applyVat) {
          totalVAT += invoiceData.addons.finance.addon1.vatAmount || 0;
        }
        if (invoiceData.addons?.finance?.addon2?.applyVat) {
          totalVAT += invoiceData.addons.finance.addon2.vatAmount || 0;
        }
        
        // Dynamic Finance Add-ons VAT
        let dynamicFinanceAddons = invoiceData.addons?.finance?.dynamicAddons;
        if (dynamicFinanceAddons && !Array.isArray(dynamicFinanceAddons) && typeof dynamicFinanceAddons === 'object') {
          dynamicFinanceAddons = Object.values(dynamicFinanceAddons);
        }
        if (Array.isArray(dynamicFinanceAddons)) {
          dynamicFinanceAddons.forEach((addon: any) => {
            if (addon.applyVat) {
              totalVAT += addon.vatAmount || 0;
            }
          });
        }
      }
      
      return totalVAT;
    },

    // Calculate remaining balance
    calculateRemainingBalance: (invoiceData: any): number => {
      if (invoiceData.invoiceTo === 'Finance Company') {
        return invoiceData.payment.balanceToFinance || 0;
      }
      
      // For trade sales, calculate: Subtotal + VAT - All Payments
      if (invoiceData.saleType === 'Trade') {
        const subtotal = GLOBAL_CALCULATION_CONFIG.calculations.calculateSubtotal(invoiceData);
        const totalVAT = GLOBAL_CALCULATION_CONFIG.calculations.calculateTotalVAT(invoiceData);
        const totalIncludingVAT = subtotal + totalVAT;
        
        // Sum all payments
        const totalCardPayments = (invoiceData.payment?.breakdown?.cardPayments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        const totalBacsPayments = (invoiceData.payment?.breakdown?.bacsPayments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        const totalCashPayments = (invoiceData.payment?.breakdown?.cashPayments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        
        const totalDirectPayments = totalCardPayments + totalBacsPayments + totalCashPayments + (invoiceData.payment?.partExchange?.amountPaid || 0);
        const totalDepositPayments = (invoiceData.pricing?.amountPaidDepositCustomer || 0);
        const totalPayments = totalDirectPayments + totalDepositPayments;
        
        return Math.max(0, totalIncludingVAT - totalPayments);
      }
      
      // For retail customer invoices
      return invoiceData.payment.customerBalanceDue || 0;
    },

    // Format discount display
    formatDiscountDisplay: (discount: number): string => {
      return discount > 0 ? GLOBAL_CALCULATION_CONFIG.calculations.formatCurrency(discount) : '-';
    },

    // Calculate warranty discount - handles explicit discount or calculated discount
    calculateWarrantyDiscount: (invoiceData: any): number => {
      // Check for explicit warranty discount first
      if (invoiceData.pricing?.discountOnWarranty && invoiceData.pricing.discountOnWarranty > 0) {
        return invoiceData.pricing.discountOnWarranty;
      }
      
      // Calculate from warranty price vs post-discount price
      const warrantyPrice = invoiceData.pricing?.warrantyPrice || 0;
      const postDiscountPrice = invoiceData.pricing?.warrantyPricePostDiscount || 0;
      
      if (warrantyPrice > 0) {
        const discountAmount = warrantyPrice - postDiscountPrice;
        return Math.max(0, discountAmount);
      }
      
      return 0;
    },

    // Calculate enhanced warranty discount - handles explicit discount or calculated discount
    calculateEnhancedWarrantyDiscount: (invoiceData: any): number => {
      // Check for explicit enhanced warranty discount first
      if (invoiceData.pricing?.discountOnEnhancedWarranty && invoiceData.pricing.discountOnEnhancedWarranty > 0) {
        return invoiceData.pricing.discountOnEnhancedWarranty;
      }
      
      // Calculate from enhanced warranty price vs post-discount price
      const enhancedWarrantyPrice = invoiceData.pricing?.enhancedWarrantyPrice || 0;
      const postDiscountPrice = invoiceData.pricing?.enhancedWarrantyPricePostDiscount || 0;
      
      if (enhancedWarrantyPrice > 0) {
        const discountAmount = enhancedWarrantyPrice - postDiscountPrice;
        return Math.max(0, discountAmount);
      }
      
      return 0;
    },

    // Calculate delivery discount - handles explicit discount or calculated discount
    calculateDeliveryDiscount: (invoiceData: any): number => {
      // Check for explicit delivery discount first
      if (invoiceData.pricing?.discountOnDelivery && invoiceData.pricing.discountOnDelivery > 0) {
        return invoiceData.pricing.discountOnDelivery;
      }
      
      // Calculate from delivery cost vs post-discount cost
      const deliveryCost = invoiceData.delivery?.cost || 0;
      const deliveryDiscount = invoiceData.delivery?.discount || 0;
      const postDiscountCost = invoiceData.delivery?.postDiscountCost ?? invoiceData.pricing?.deliveryCostPostDiscount ?? 0;
      
      if (deliveryCost > 0) {
        // Use explicit discount if available, otherwise calculate from cost difference
        if (deliveryDiscount > 0) {
          return deliveryDiscount;
        }
        const discountAmount = deliveryCost - postDiscountCost;
        return Math.max(0, discountAmount);
      }
      
      return 0;
    },

    // Check if item has discount
    hasDiscount: (originalPrice: number, discountedPrice?: number, explicitDiscount?: number): boolean => {
      if (explicitDiscount && explicitDiscount > 0) return true;
      if (originalPrice && discountedPrice && originalPrice > discountedPrice) return true;
      return false;
    },
  },

  // VAT Configuration
  vat: {
    rate: 0, // 0% VAT for used cars
    calculate: (amount: number): number => {
      return amount * GLOBAL_CALCULATION_CONFIG.vat.rate;
    },
  },

  // Payment Configuration
  payment: {
    labelWidth: 200,
    // Default payment terms
    terms: {
      depositRequired: true,
      balanceOnCollection: true,
    },
  },
};

// Helper function to get formatted styles with global config (for future use)
// const getFormattedStyle = (baseStyle: any, overrides: any = {}) => ({
//   ...baseStyle,
//   fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
//   ...overrides
// });

// Professional black and white styles with optimal spacing
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.background,
    paddingTop: GLOBAL_FORMAT_CONFIG.spacing.page,
    paddingLeft: GLOBAL_FORMAT_CONFIG.spacing.page / 2,
    paddingRight: GLOBAL_FORMAT_CONFIG.spacing.page,
    paddingBottom: GLOBAL_FORMAT_CONFIG.spacing.page,
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
  
  // Page break control - keep small sections together
  avoidBreak: {
    // keepTogether and breakInside are not valid style properties in react-pdf
  },
  
  // Professional spacing between major sections (no borders)
  sectionSpacer: {
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    width: '100%',
  },
  
  // Small section wrapper (up to 8 lines)
  smallSection: {
    // keepTogether and breakInside are not valid style properties in react-pdf
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
  },
  
  // Header Section - professional black and white (no borders)
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
  
  // Invoice Info Section - professional
  invoiceInfoSection: {
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  invoiceNumber: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  invoiceDate: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  salePrice: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Badge styling - clean professional look
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  badge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.background,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  badgeBlue: {
    // Removed color styling - using standard badge
  },
  badgeGreen: {
    // Removed color styling - using standard badge
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
  
  // Vehicle Section - professional
  vehicleHeader: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    paddingVertical: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
  },
  vehicleDetails: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    lineHeight: 1.8,
    flex: 1,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  vehicleDetailsBold: {
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    flex: 1,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Finance Company
  financeCompanyName: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Discount Section - professional
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
  },
  
  // Warranty Section - professional black and white
  warrantyHeader: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  warrantyBadge: {
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.background,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    alignSelf: 'flex-start',
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  warrantyPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
  },
  warrantyPriceFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    paddingTop: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
  },
  warrantyDetails: {
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    lineHeight: 1.4,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Add-on Section - professional
  addonHeader: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  addonItem: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
  },
  
  // Delivery/Customer Section - professional
  customerHeader: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  customerName: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  customerDetails: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Payment Breakdown - professional
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  paymentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    paddingTop: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
  },
  
  // Finance Summary - professional
  financeSummary: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    lineHeight: 1.4,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    flexDirection: 'row',
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  financeSummaryBold: {
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
  },
  
  // Signature Section - professional
  signatureLine: {
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    height: 30,
  },
  signatureText: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  signatureContainer: {
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
  },
  signatureRow: {
    flexDirection: 'row',
    gap: 30, // More space between signature boxes
  },
  signatureBox: {
    flex: 1,
  },
  
  // Page styling for continuous flow
  pageTitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.sectionGap,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Terms Content - professional
  termsContent: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    lineHeight: 1.5,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  termsParagraph: {
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    lineHeight: GLOBAL_FORMAT_CONFIG.layout.lineHeight.relaxed,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  termsPlaceholder: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    fontStyle: 'italic',
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    textAlign: 'center',
    marginTop: 25,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Trade Disclaimer - professional black and white
  tradeDisclaimer: {
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.background,
    padding: 0,
    marginBottom: 20,
  },
  tradeDisclaimerTitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2,
    textTransform: 'uppercase',
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  tradeDisclaimerText: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    lineHeight: 1.5,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Checklist Styles - professional
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  checklistColumn: {
    flex: 1,
    minWidth: '45%',
  },
  checklistItem: {
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap + 1,
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Customer Acceptance - professional
  acceptanceBox: {
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.background,
    padding: 0,
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.largeGap,
  },
  acceptanceTitle: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
    textTransform: 'uppercase',
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  acceptanceItem: {
    fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.normal,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
    paddingLeft: GLOBAL_FORMAT_CONFIG.components.warranty.bulletIndent,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 6,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  
  // Table Styles for warranty coverage - professional (no borders)
  tableContainer: {
    marginTop: GLOBAL_FORMAT_CONFIG.spacing.sectionGap,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.sectionGap,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: GLOBAL_FORMAT_CONFIG.components.table.minHeight,
    marginBottom: GLOBAL_FORMAT_CONFIG.spacing.lineGap,
  },
  tableHeader: {
    backgroundColor: GLOBAL_FORMAT_CONFIG.colors.background,
    fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold,
    fontSize: 6,
  },
  tableCell: {
    flex: 1,
    padding: GLOBAL_FORMAT_CONFIG.components.table.cellPadding,
    fontSize: 6,
    color: GLOBAL_FORMAT_CONFIG.colors.primary,
    fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family,
  },
  tableCellLast: {
    // No special styling needed
  },
});

interface Props {
  invoiceData: ComprehensiveInvoiceData;
}

/**
 * Get background image source for PDF pages
 * 
 * Determines which background image to use based on configuration.
 * 
 * @param customSrc - Optional custom background image path
 * @param companyLogo - Company logo path from invoice data
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

export default function ProfessionalMatchingInvoicePDFDocument({ invoiceData }: Props) {
  // Helper functions - using global calculation configuration
  const formatCurrency = GLOBAL_CALCULATION_CONFIG.calculations.formatCurrency;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Helper function to check if VAT is applied to any item
  const hasVATApplied = (invoiceData: any): boolean => {
    return invoiceData.pricing.applyVatToSalePrice ||
           invoiceData.pricing.applyVatToWarranty ||
           invoiceData.pricing.applyVatToEnhancedWarranty ||
           invoiceData.pricing.applyVatToDelivery ||
           invoiceData.addons?.customer?.addon1?.applyVat ||
           invoiceData.addons?.customer?.addon2?.applyVat ||
           invoiceData.addons?.finance?.addon1?.applyVat ||
           invoiceData.addons?.finance?.addon2?.applyVat ||
           (Array.isArray(invoiceData.addons?.customer?.dynamicAddons) && invoiceData.addons.customer.dynamicAddons.some((addon: any) => addon.applyVat)) ||
           (Array.isArray(invoiceData.addons?.finance?.dynamicAddons) && invoiceData.addons.finance.dynamicAddons.some((addon: any) => addon.applyVat));
  };

  // Get background image source
  const backgroundImageSrc = getBackgroundImageSrc(undefined, invoiceData.companyInfo.logo);

    const renderCustomerName = (customer: any) => {
      let name = ''
      if (customer?.title) name += customer.title + ' ';
      if (customer?.firstName) name += customer.firstName + ' ';
      if (customer?.middleName) name += customer.middleName + ' ';
      if (customer?.lastName) name += customer.lastName + ' ';
      return name.trim() + (name.trim() ? ' - ' : '');
    }
  
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

  // Helper function to check conditions from JSON template (REMOVED - not used in static layout)

  // Helper function to get field values from invoice data (REMOVED - not used in static layout)

  // Helper function to evaluate rules (REMOVED - not used in static layout)

  // Function to render content after vehicle details based on JSON template (REMOVED - replaced with static layout)

  // Helper function to render HTML content with compact styling for terms and conditions
  const renderCompactHTMLContent = (htmlContent: string): React.ReactElement => {
    if (!htmlContent || !htmlContent.trim()) {
      return <Text style={styles.termsParagraph}>No content available</Text>;
    }
    
    // Simple HTML stripping for compact terms
    let processedContent = htmlContent;
    
    // Step 1: Pre-process to add line breaks for better structure
    processedContent = processedContent
      .replace(/<\/p>/gi, '</p>\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '</div>\n')
      .replace(/<\/li>/gi, '</li>\n');
    
    // Step 2: Convert strong tags to markdown while preserving content
    while (processedContent.includes('<strong>') || processedContent.includes('<b>')) {
      processedContent = processedContent
        .replace(/<strong>([^<]*)<\/strong>/gi, '**$1**')
        .replace(/<b>([^<]*)<\/b>/gi, '**$1**');
    }
    
    // Step 3: Convert list items
    processedContent = processedContent
      .replace(/<li[^>]*>/gi, '')
      .replace(/<\/li>/gi, '');
    
    // Step 4: Remove all other HTML tags
    processedContent = processedContent
      .replace(/<[^>]+>/g, '');
    
    // Step 5: Decode HTML entities
    const entities = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&lsquo;': "'",
      '&rsquo;': "'",
      '&ndash;': '–',
      '&mdash;': '—',
      '&hellip;': '…'
    };
    
    Object.entries(entities).forEach(([entity, replacement]) => {
      processedContent = processedContent.split(entity).join(replacement);
    });
    
    // Step 6: Clean up whitespace
    processedContent = processedContent
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+/gm, '')
      .trim();
    
    // Split into sections by double line breaks
    const sections = processedContent.split(/\n\s*\n/).filter(section => section.trim());
    
    return (
      <View style={{ marginVertical: 2 }}>
        {sections.map((section, sectionIndex) => {
          const lines = section.split('\n').filter(line => line.trim());
          
          return (
            <View key={sectionIndex} style={{ marginBottom: 4 }}>
              {lines.map((line, lineIndex) => {
                const trimmedLine = line.trim();
                
                // Check if this is a heading (starts and ends with **)
                const isHeading = trimmedLine.startsWith('**') && trimmedLine.endsWith('**');
                const isBold = trimmedLine.includes('**') && !isHeading;
                
                if (isHeading) {
                  const headingText = trimmedLine.replace(/\*\*/g, '');
                  return (
                    <Text key={lineIndex} style={[
                      styles.termsParagraph, 
                      { 
                        fontWeight: 'semibold',
                        fontSize: 6, // Smaller font for compact terms
                        marginBottom: 3,
                        lineHeight: 1.3 // Reduced line height
                      }
                    ]}>
                      {headingText}
                    </Text>
                  );
                }
                
                if (isBold) {
                  // Handle mixed semibold content
                  const parts = trimmedLine.split(/(\*\*.*?\*\*)/);
                  return (
                    <Text key={lineIndex} style={[
                      styles.termsParagraph, 
                      { 
                        marginBottom: 2,
                        lineHeight: 1.3, // Reduced line height
                        fontSize: 6 // Smaller font for compact terms
                      }
                    ]}>
                      {parts.map((part, partIndex) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <Text key={partIndex} style={{ fontWeight: 'semibold' }}>
                              {part.replace(/\*\*/g, '')}
                            </Text>
                          );
                        }
                        return part;
                      })}
                    </Text>
                  );
                }
                
                return (
                  <Text key={lineIndex} style={[
                    styles.termsParagraph, 
                    { 
                      marginBottom: 2,
                      lineHeight: 1.3, // Reduced line height
                      fontSize: 6 // Smaller font for compact terms
                    }
                  ]}>
                    {trimmedLine}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  // Helper function to render HTML content with enhanced structure preservation for PDF
  const renderHTMLContent = (htmlContent: string, customFontSize?: number): React.ReactElement => {
    const defaultFontSize = customFontSize || 6;
    
    if (!htmlContent || !htmlContent.trim()) {
      return <Text style={styles.termsParagraph}>No content available</Text>;
    }
    
    // DEBUG: Log what we're trying to parse
    console.log('🔍 PARSING HTML CONTENT:', {
      length: htmlContent.length,
      hasTable: htmlContent.includes('<table'),
      hasGrid: htmlContent.includes('grid'),
      hasDiv: htmlContent.includes('<div'),
      hasParagraph: htmlContent.includes('<p'),
      preview: htmlContent.substring(0, 300)
    });
    
    // First, let's check if this contains table/grid structures
    const hasTable = htmlContent.includes('<table') || htmlContent.includes('<tr>') || htmlContent.includes('<td>');
    const hasGrid = htmlContent.includes('grid') || htmlContent.includes('row') || htmlContent.includes('col-') || 
                   htmlContent.includes('d-flex') || htmlContent.includes('flex-');
    
    // If it has table structure, parse it differently
    if (hasTable) {
      console.log('📊 Using table content renderer');
      return renderTableContent(htmlContent, customFontSize);
    }
    
    // If it has grid classes, parse as grid
    if (hasGrid) {
      console.log('🔲 Using grid content renderer');
      return renderGridContent(htmlContent, customFontSize);
    }
    
    console.log('📝 Using simple HTML stripper for warranty content');
    
    // Simple approach: Process HTML line by line to handle complex nested structures
    let processedContent = htmlContent;
    
    // Step 1: Pre-process to add line breaks for better structure
    processedContent = processedContent
      .replace(/<\/p>/gi, '</p>\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '</div>\n')
      .replace(/<\/li>/gi, '</li>\n');
    
    // Step 2: Convert strong tags to markdown while preserving content
    // Use a loop to handle nested tags properly
    while (processedContent.includes('<strong>') || processedContent.includes('<b>')) {
      processedContent = processedContent
        .replace(/<strong>([^<]*)<\/strong>/gi, '**$1**')
        .replace(/<b>([^<]*)<\/b>/gi, '**$1**');
    }
    
    // Step 3: Convert italic tags
    while (processedContent.includes('<em>') || processedContent.includes('<i>')) {
      processedContent = processedContent
        .replace(/<em>([^<]*)<\/em>/gi, '*$1*')
        .replace(/<i>([^<]*)<\/i>/gi, '*$1*');
    }
    
    // Step 4: Convert list items
    processedContent = processedContent
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '');
    
    // Step 5: Remove all other HTML tags
    processedContent = processedContent
      .replace(/<[^>]+>/g, '');
    
    // Step 6: Decode HTML entities
    const entities = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&lsquo;': "'",
      '&rsquo;': "'",
      '&ndash;': '–',
      '&mdash;': '—',
      '&hellip;': '…',
      '&#8217;': "'",
      '&#8220;': '"',
      '&#8221;': '"'
    };
    
    Object.entries(entities).forEach(([entity, replacement]) => {
      processedContent = processedContent.split(entity).join(replacement);
    });
    
    // Step 7: Clean up whitespace
    processedContent = processedContent
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+/gm, '')
      .trim();
    
    // Split into sections by double line breaks
    const sections = processedContent.split(/\n\s*\n/).filter(section => section.trim());
    
    // DEBUG: Log processed content
    console.log('📋 PROCESSED CONTENT:', {
      originalLength: htmlContent.length,
      processedLength: processedContent.length,
      sectionsCount: sections.length,
      firstSection: sections[0]?.substring(0, 100),
      processedPreview: processedContent.substring(0, 300)
    });
    
    // If no sections were created, try to render the content as a single block
    if (sections.length === 0 && processedContent.trim()) {
      console.log('⚠️ No sections found, rendering as single block');
      return (
        <View style={{ marginVertical: 4 }}>
          <Text style={[styles.termsParagraph, { lineHeight: 1.6 , fontSize: defaultFontSize}]}>
            {processedContent}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={{ marginVertical: 4 }}>
        {sections.map((section, sectionIndex) => {
          const lines = section.split('\n').filter(line => line.trim());
          
          return (
            <View key={sectionIndex} style={{ marginBottom: 8 }}>
              {lines.map((line, lineIndex) => {
                const trimmedLine = line.trim();
                
                // Check if this is a heading (starts and ends with **)
                const isHeading = trimmedLine.startsWith('**') && trimmedLine.endsWith('**');
                const isBullet = trimmedLine.startsWith('•');
                const isBold = trimmedLine.includes('**') && !isHeading;
                
                if (isHeading) {
                  const headingText = trimmedLine.replace(/\*\*/g, '');
                  return (
                    <Text key={lineIndex} style={[
                      styles.termsParagraph, 
                      { 
                        fontWeight: 'semibold',
                        fontSize: defaultFontSize,
                        marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap,
                        marginTop: lineIndex === 0 ? 0 : 8
                      }
                    ]}>
                      {headingText}
                    </Text>
                  );
                }
                
                if (isBold) {
                  // Handle mixed semibold content
                  const parts = trimmedLine.split(/(\*\*.*?\*\*)/);
                  return (
                    <Text key={lineIndex} style={[
                      styles.termsParagraph, 
                      { 
                        marginBottom: 3,
                        lineHeight: 1.6,
                        paddingLeft: isBullet ? 10 : 0
                      }
                    ]}>
                      {parts.map((part, partIndex) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <Text key={partIndex} style={{ fontWeight: 'semibold' , fontSize: defaultFontSize }}>
                              {part.replace(/\*\*/g, '')}
                            </Text>
                          );
                        }
                        return part;
                      })}
                    </Text>
                  );
                }
                
                return (
                  <Text key={lineIndex} style={[
                    styles.termsParagraph, 
                    { 
                      marginBottom: 3,
                      lineHeight: 1.6,
                      paddingLeft: isBullet ? 10 : 0,
                      fontSize: defaultFontSize
                    }
                  ]}>
                    {trimmedLine}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };
  
  // Helper function to render table content with multiple tables support
  const renderTableContent = (htmlContent: string, customFontSize?: number) => {
    const defaultFontSize = customFontSize || 7;
    // Process the content before first table with compact styling
    const beforeFirstTable = htmlContent.split(/<h2[^>]*>/i)[0];
    const beforeContent = beforeFirstTable ? renderCompactHTMLContent(beforeFirstTable) : null;
    
    // Extract all sections from all tables
    const allSections: Array<{header: string, rows: string[], tableTitle?: string}> = [];
    
    // Split content by h2 headers to identify table sections
    const h2Sections = htmlContent.split(/<h2[^>]*>/i);
    
    // Process each section that starts with h2
    h2Sections.slice(1).forEach((section) => {
      // Extract the h2 title
      const titleMatch = section.match(/^([^<]*)<\/h2>/i);
      const tableTitle = titleMatch ? titleMatch[1].trim() : '';
      
      // Extract table content from this section
      const tableMatch = section.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
      if (!tableMatch) return;
      
      const tableContent = tableMatch[1];
      
      // Extract thead and tbody pairs
      const theadMatches = tableContent.match(/<thead[^>]*>[\s\S]*?<\/thead>/gi) || [];
      const tbodyMatches = tableContent.match(/<tbody[^>]*>[\s\S]*?<\/tbody>/gi) || [];
      
      // Process each thead/tbody pair
      theadMatches.forEach((thead, index) => {
        const headerMatch = thead.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
        const header = headerMatch ? headerMatch[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim() : '';
        
        const tbody = tbodyMatches[index] || '';
        const rowMatch = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
        const cells = rowMatch ? rowMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [] : [];
        
        const processedCells = cells.map(cell => {
          return cell
            .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<[^>]*>/g, '')
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .trim();
        });
        
        allSections.push({ 
          header, 
          rows: processedCells,
          tableTitle: index === 0 ? tableTitle : undefined // Only add title to first section of each table
        });
      });
    });
    
    // Dynamic section grouping to prevent awkward page breaks
    const calculateSectionHeight = (section: {header: string, rows: string[], tableTitle?: string}) => {
      const headerHeight = 20; // Reduced from 25 to 20 for 7px/9px font sizes
      const titleHeight = section.tableTitle ? 15 : 0; // Reduced from 20 to 15
      const maxItems = Math.max(...section.rows.map(cell => cell.split('\n').filter(item => item.trim()).length));
      const contentHeight = Math.max(30, maxItems * 10); // Reduced from 12px to 10px per line
      return headerHeight + titleHeight + contentHeight;
    };
    
    const groupSectionsForPages = () => {
      const maxPageHeight = 1000; // Optimized for A4 page to utilize more available space
      const tableHeaderHeight = 35;
      const groups: Array<{sections: typeof allSections, isFirstGroup: boolean, hasTableTitle?: boolean}> = [];
      
      let currentGroup: typeof allSections = [];
      let currentHeight = tableHeaderHeight;
      
      allSections.forEach((section) => {
        const sectionHeight = calculateSectionHeight(section);
        
        // If adding this section would exceed page height, start a new group
        if (currentHeight + sectionHeight > maxPageHeight && currentGroup.length > 0) {
          groups.push({ sections: currentGroup, isFirstGroup: groups.length === 0 });
          currentGroup = [section];
          currentHeight = tableHeaderHeight + sectionHeight;
        } else {
          currentGroup.push(section);
          currentHeight += sectionHeight;
        }
      });
      
      // Add the last group
      if (currentGroup.length > 0) {
        groups.push({ sections: currentGroup, isFirstGroup: groups.length === 0 });
      }
      
      return groups;
    };
    
    const sectionGroups = groupSectionsForPages();
    
    return (
      <View>
        {beforeContent}
        
        {sectionGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.avoidBreak}>
            {group.sections.map((section, sectionIndex) => (
              <View key={sectionIndex}>
                {/* Table title (only for first section of each table) */}
                {section.tableTitle && (
                  <View style={{ marginTop: 12, marginBottom: 6 }}>
                    <Text style={{ 
                      fontSize: defaultFontSize, // Heading size 
                      fontWeight: 'semibold', 
                      fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
                      textAlign: 'center'
                    }}>
                      {section.tableTitle}
                  </Text>
                  </View>
                )}
                
                {/* Table container with light border */}
                <View style={{ 
                  border: '1px solid #d0d0d0', 
                  marginTop: section.tableTitle ? 3 : 8, 
                  marginBottom: 6 
                }}>
                  {/* Section header */}
                  <View style={{ 
                    backgroundColor: '#f5f5f5', 
                    borderBottom: '1px solid #d0d0d0',
                    padding: 4
                  }}>
                    <Text style={{ fontSize: defaultFontSize, fontWeight: 'semibold', fontFamily: CENTURY_GOTHIC_FONT_FAMILY }}>
                      {section.header}
                    </Text>
                  </View>
                  
                  {/* Section content - two columns */}
                  <View style={{ 
                    flexDirection: 'row',
                    minHeight: 30
                  }}>
                    {section.rows.map((cellContent, cellIndex) => {
                      const items = cellContent.split('\n').filter(item => item.trim());
                      
                      return (
                        <View key={cellIndex} style={{ 
                          flex: 1,
                          padding: 6,
                          borderRight: cellIndex === 0 ? '1px solid #e8e8e8' : 'none'
                        }}>
                          <View style={{ flexDirection: 'column' }}>
                            {items.map((item, itemIndex) => (
                              <Text key={itemIndex} style={{ 
                                fontSize: defaultFontSize, 
                                marginBottom: 1,
                                lineHeight: 1.3,
                                fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
                                paddingLeft: 0,
                                textAlign: 'left'
                              }}>
                                {item.trim()}
                              </Text>
                            ))}
                          </View>
            </View>
          );
        })}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };
  
  // Helper function to render grid content with improved layout preservation
  const renderGridContent = (htmlContent: string, customFontSize?: number) => {
    const defaultFontSize = customFontSize || 7;
    // Enhanced regex to capture more grid patterns
    const rowMatches = htmlContent.match(/<div[^>]*(?:row|grid|d-flex|flex)[^>]*>(.*?)<\/div>/gi) || [];
    
    if (rowMatches.length === 0) {
      // Try to find any div containers that might contain structured content
      const divMatches = htmlContent.match(/<div[^>]*>(.*?)<\/div>/gi) || [];
      if (divMatches.length > 0) {
        return (
          <View style={{ marginVertical: 8 }}>
            {divMatches.map((div, divIndex) => {
              const divContent = div
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .trim();
              
              if (divContent) {
                return (
                  <Text key={divIndex} style={[styles.termsParagraph, { marginBottom: 4, lineHeight: 1.6 }]}>
                    {divContent}
                  </Text>
                );
              }
              return null;
            })}
          </View>
        );
      }
      
      // Fallback to simple text extraction with better formatting
      return renderHTMLContent(htmlContent, customFontSize);
    }
    
    return (
      <View style={{ marginVertical: 10 }}>
        {rowMatches.map((row, rowIndex) => {
          // Enhanced column matching to catch more patterns
          const colMatches = row.match(/<div[^>]*(?:col|column|flex-)[^>]*>(.*?)<\/div>/gi) || [];
          
          if (colMatches.length === 0) {
            // Try to extract content from the row directly
            const rowContent = row
              .replace(/<div[^>]*(?:row|grid|d-flex|flex)[^>]*>/gi, '')
              .replace(/<\/div>/gi, '')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<p[^>]*>/gi, '')
              .replace(/<\/p>/gi, '\n')
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .trim();
            
            if (rowContent) {
              // Split by newlines and render each as separate text
              const lines = rowContent.split('\n').filter(line => line.trim());
            return (
                <View key={rowIndex} style={{ marginBottom: 8 }}>
                  {lines.map((line, lineIndex) => (
                    <Text key={lineIndex} style={[styles.termsParagraph, { marginBottom: 3, lineHeight: 1.6 }]}>
                      {line.trim()}
              </Text>
                  ))}
                </View>
            );
            }
            return null;
          }
          
          // Render columns in a row layout
          return (
            <View key={rowIndex} style={{ 
              flexDirection: 'row',
              marginBottom: 8,
              alignItems: 'flex-start'
            }}>
              {colMatches.map((col, colIndex) => {
                const colContent = col
                  .replace(/<div[^>]*(?:col|column|flex-)[^>]*>/gi, '')
                  .replace(/<\/div>/gi, '')
                  .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<p[^>]*>/gi, '')
                  .replace(/<\/p>/gi, '\n')
                  .replace(/<[^>]*>/g, '')
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .trim();
                
                if (!colContent) return null;
                
                // Split content by newlines for better formatting
                const lines = colContent.split('\n').filter(line => line.trim());
                
                return (
                  <View key={colIndex} style={{ 
                    flex: 1,
                    paddingHorizontal: 4,
                    marginRight: colIndex < colMatches.length - 1 ? 8 : 0
                  }}>
                    {lines.map((line, lineIndex) => (
                      <Text key={lineIndex} style={{ 
                    fontSize: defaultFontSize,
                    color: '#000000',
                        fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
                        lineHeight: 1.6,
                        marginBottom: 2
                  }}>
                        {line.trim()}
                  </Text>
                    ))}
                  </View>
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
      case 'in-house-warranty': 
        // Show in-house warranty section only if warranty is enabled AND it's in-house
        return invoiceData.warranty.inHouse && 
               invoiceData.warranty.level && 
               invoiceData.warranty.level !== 'None Selected';
      case 'external-warranty': 
        // Show external warranty section only if warranty is enabled AND it's NOT in-house
        return !invoiceData.warranty.inHouse && 
               invoiceData.warranty.level && 
               invoiceData.warranty.level !== 'None Selected';
      default: return true;
    }
  };

  // Removed showDiscounts as it's not used in this component

  // Determine font size for main invoice based on sale type
  const mainInvoiceFontSize = (() => {
    if (invoiceData.saleType === 'Trade') return 10;
    if (invoiceData.invoiceTo === 'Customer') return 9;
    if (invoiceData.invoiceTo === 'Finance Company') return 8;
    return 9; // Default to retail customer size
  })();

  // Render content across multiple pages with proper page breaks
  return (
    <Document>
      {/* Page 1: Invoice Core Section */}
      <PageWithBackground style={[styles.page, styles.avoidBreak]}>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: GLOBAL_FORMAT_CONFIG.spacing.headerGap }}>
            {/* Left Side - Logo and Company Info */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Logo */}
                {invoiceData.companyInfo.logo && (
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
                      src={invoiceData.companyInfo.logo}
                    />
                  </View>
                )}
              
              {/* Company Details */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                  {invoiceData.companyInfo.address.street}
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                  {invoiceData.companyInfo.address.city}
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                  {invoiceData.companyInfo.address.postCode}
                </Text>
                  {invoiceData.companyInfo.vatNumber && (
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                    VAT No: {invoiceData.companyInfo.vatNumber}
                  </Text>
                )}
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2 }}>
                  {hasVATApplied(invoiceData) ? 'VAT INVOICE' : 'VAT MARGIN SCHEME'}
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                  {invoiceData.companyInfo.contact.phone}
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family }}>
                  {invoiceData.companyInfo.contact.email}
                </Text>
                </View>
              </View>
              
            {/* Right Side - Invoice Info */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                Invoice:
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2 }}>
                INV-{invoiceData.vehicle.registration}
              </Text>
              
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                Date:
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2 }}>
                {formatDate(invoiceData.invoiceDate)}
              </Text>
              
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                Sale Price:
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2 }}>
                {formatCurrency(invoiceData.pricing.salePricePostDiscount)}
              </Text>
              
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.smallGap }}>
                Remaining Balance:
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family }}>
                {formatCurrency(GLOBAL_CALCULATION_CONFIG.calculations.calculateRemainingBalance(invoiceData))}
              </Text>
              </View>
            </View>
            
          {/* Purchase Invoice Banner - Simplified */}
          <View style={{ 
            backgroundColor: GLOBAL_FORMAT_CONFIG.colors.tableBg, 
            padding: GLOBAL_FORMAT_CONFIG.spacing.itemGap + 2, 
            marginBottom: 2,
            alignItems: 'flex-end'
          }}>
            <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold }}>
              PURCHASE INVOICE
            </Text>
          </View>

          {/* Invoice To Section - No Background */}
          <View style={{ marginBottom: 2 }}>
            <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', marginBottom: mainInvoiceFontSize >= 9 ? 6 : 4 }}>
              INVOICE TO:
            </Text>
            {invoiceData.invoiceTo === 'Finance Company' ? (
              <>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', marginBottom: mainInvoiceFontSize >= 9 ? 4 : 3 }}>
                  {invoiceData.vehicle?.registration || 'REG'} - {
                    invoiceData.financeCompany?.name === 'Other' 
                      ? (invoiceData.financeCompany?.companyName || 'Finance Company')
                      : (invoiceData.financeCompany?.name || 'Finance Company')
                  }
                </Text>
              {invoiceData.financeCompany?.address?.firstLine && (
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: mainInvoiceFontSize >= 9 ? 4 : 3 }}>
                    {invoiceData.financeCompany?.address?.firstLine}
                  </Text>
                )}
              {invoiceData.financeCompany?.address?.countyPostCodeContact && (
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: mainInvoiceFontSize >= 9 ? 4 : 3 }}>
                    {invoiceData.financeCompany?.address?.countyPostCodeContact}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', marginBottom: mainInvoiceFontSize >= 9 ? 4 : 2 }}>
                  INV-{invoiceData.vehicle.registration} - {invoiceData.customer.title} {invoiceData.customer.firstName} {invoiceData.customer.lastName}
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: mainInvoiceFontSize >= 9 ? 4 : 2 }}>
                  {invoiceData.customer.address.firstLine}
                </Text>
                {invoiceData.customer.address.secondLine && (
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, marginBottom: mainInvoiceFontSize >= 9 ? 4 : 2 }}>
                    {invoiceData.customer.address.secondLine}
                  </Text>
                )}
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: mainInvoiceFontSize >= 9 ? 4 : 2 }}>
                  {invoiceData.customer.address.city}, {invoiceData.customer.address.postCode}
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: mainInvoiceFontSize >= 9 ? 4 : 2 }}>
                  Tel: {invoiceData.customer.contact.phone}
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: 0 }}>
                  Email: {invoiceData.customer.contact.email}
                </Text>
              </>
            )}
          </View>

          {/* Thin grey line separator below customer details */}
          <View style={{ 
            height: 1, 
            backgroundColor: '#d0d0d0', 
            marginTop: 4, 
            marginBottom: 4 
          }} />

           {/* Vehicle Information - Proper Table Structure */}
          <View style={styles.contentSection}>
             {/* Table Header */}
             <View style={{ 
               flexDirection: 'row', 
               borderBottom: '1px solid #000', 
               paddingBottom: 3, 
               marginBottom: 3 
             }}>
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', flex: 3, textAlign: 'left' }}>DESCRIPTION</Text>
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', flex: 1, textAlign: 'right' }}>RATE</Text>
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', flex: 1, textAlign: 'center' }}>QTY</Text>
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', flex: 1, textAlign: 'right' }}>DISCOUNT</Text>
               {hasVATApplied(invoiceData) && <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', flex: 1, textAlign: 'right' }}>VAT</Text>}
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', flex: 1, textAlign: 'right' }}>TOTAL</Text>
             </View>
            
             {/* Vehicle Row */}
             <View style={{ 
               flexDirection: 'row', 
               paddingVertical: 2,
               borderBottom: '1px solid #ccc',
               fontWeight: 'semibold'
             }}>
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                {invoiceData.vehicle?.make || ''} {invoiceData.vehicle?.model || ''} - {invoiceData.vehicle?.registration || ''}
              </Text>
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                 {formatCurrency(invoiceData.pricing.salePrice)}
               </Text>
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right', color: GLOBAL_FORMAT_CONFIG.colors.accent }}>
                 {GLOBAL_CALCULATION_CONFIG.calculations.formatDiscountDisplay(
                   GLOBAL_CALCULATION_CONFIG.calculations.calculateDiscountAmount(
                     invoiceData.pricing.salePrice || 0, 
                     invoiceData.pricing.salePricePostDiscount || 0
                   )
                 )}
               </Text>
               {hasVATApplied(invoiceData) && (
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                   {invoiceData.pricing.applyVatToSalePrice ? formatCurrency(invoiceData.pricing.salePriceVatAmount || 0) : '-'}
                 </Text>
               )}
               <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                 {formatCurrency(
                   invoiceData.pricing.applyVatToSalePrice 
                     ? (invoiceData.pricing.salePriceIncludingVat || invoiceData.pricing.salePricePostDiscount)
                     : invoiceData.pricing.salePricePostDiscount
                 )}
               </Text>
            </View>
            
            {/* Warranty Row - Only show for non-trade sales */}
            {invoiceData.saleType !== 'Trade' && invoiceData.warranty.level && invoiceData.warranty.level !== 'None Selected' && (
               <View style={{ 
                 flexDirection: 'row', 
                 paddingVertical: 2,
                 borderBottom: '1px solid #ccc'
               }}>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                  <Text style={{ fontWeight: 'semibold' }}>Warranty</Text> - {invoiceData.warranty.name || invoiceData.warranty.level}
                   {invoiceData.warranty.inHouse ? '\nIn-House Warranty: Yes' : ''}
                   {invoiceData.warranty.details ? `\n${invoiceData.warranty.details}` : ''}
                </Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                   {formatCurrency(invoiceData.pricing.warrantyPrice || 0)}
                 </Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right', color: GLOBAL_FORMAT_CONFIG.colors.accent }}>
                   {GLOBAL_CALCULATION_CONFIG.calculations.formatDiscountDisplay(
                     GLOBAL_CALCULATION_CONFIG.calculations.calculateWarrantyDiscount(invoiceData)
                   )}
                 </Text>
                 {hasVATApplied(invoiceData) && (
                   <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                     {invoiceData.pricing.applyVatToWarranty ? formatCurrency(invoiceData.pricing.warrantyVatAmount || 0) : '-'}
                   </Text>
                 )}
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                   {formatCurrency(
                     invoiceData.pricing.applyVatToWarranty
                       ? (invoiceData.pricing.warrantyIncludingVat ?? invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0)
                       : (invoiceData.pricing.warrantyPricePostDiscount ?? invoiceData.pricing.warrantyPrice ?? 0)
                   )}
                 </Text>
              </View>
            )}
            
            {/* Enhanced Warranty Row - Only show for non-trade sales */}
            {invoiceData.saleType !== 'Trade' && invoiceData.warranty.enhanced && invoiceData.warranty.enhancedLevel && (
               <View style={{ 
                 flexDirection: 'row', 
                 paddingVertical: 2,
                 borderBottom: '1px solid #ccc'
               }}>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                  <Text style={{ fontWeight: 'semibold' }}>Enhanced Warranty</Text> - {invoiceData.warranty.enhancedName || invoiceData.warranty.enhancedLevel}
                   {invoiceData.warranty.enhancedDetails && `\n${invoiceData.warranty.enhancedDetails}`}
                </Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                   {formatCurrency(invoiceData.pricing.enhancedWarrantyPrice || 0)}
                 </Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right', color: GLOBAL_FORMAT_CONFIG.colors.accent }}>
                   {GLOBAL_CALCULATION_CONFIG.calculations.formatDiscountDisplay(
                     GLOBAL_CALCULATION_CONFIG.calculations.calculateEnhancedWarrantyDiscount(invoiceData)
                   )}
                 </Text>
                 {hasVATApplied(invoiceData) && (
                   <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                     {invoiceData.pricing.applyVatToEnhancedWarranty ? formatCurrency(invoiceData.pricing.enhancedWarrantyVatAmount || 0) : '-'}
                   </Text>
                 )}
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                  {formatCurrency(
                    invoiceData.pricing.applyVatToEnhancedWarranty
                      ? (invoiceData.pricing.enhancedWarrantyIncludingVat ?? invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0)
                      : (invoiceData.pricing.enhancedWarrantyPricePostDiscount ?? invoiceData.pricing.enhancedWarrantyPrice ?? 0)
                  )}
                </Text>
              </View>
            )}
            
             {/* Customer Add-ons - Only show if pre-discount cost > 0 */}
             {invoiceData.addons?.customer?.enabled && (
               <>
                 {invoiceData.addons.customer.addon1 && (invoiceData.addons.customer.addon1?.cost || 0) > 0 && (
                   <View style={{ 
                     flexDirection: 'row', 
                     paddingVertical: 2,
                     borderBottom: '1px solid #ccc'
                   }}>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                       <Text style={{ fontWeight: 'semibold' }}>{invoiceData.addons.customer.addon1?.name}</Text> - Non Refundable
                     </Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                       {formatCurrency(invoiceData.addons.customer.addon1?.cost || 0)}
                     </Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right', color: GLOBAL_FORMAT_CONFIG.colors.accent }}>
                       {GLOBAL_CALCULATION_CONFIG.calculations.formatDiscountDisplay(
                         GLOBAL_CALCULATION_CONFIG.calculations.calculateAddonDiscount(invoiceData.addons.customer.addon1)
                       )}
                     </Text>
                     {hasVATApplied(invoiceData) && (
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {invoiceData.addons.customer.addon1.applyVat ? formatCurrency(invoiceData.addons.customer.addon1.vatAmount || 0) : '-'}
                       </Text>
                     )}
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                      {formatCurrency(
                        invoiceData.addons.customer.addon1.applyVat
                          ? (invoiceData.addons.customer.addon1.costIncludingVat ?? invoiceData.addons.customer.addon1.postDiscountCost ?? invoiceData.addons.customer.addon1.cost ?? 0)
                          : (invoiceData.addons.customer.addon1.postDiscountCost ?? invoiceData.addons.customer.addon1.cost ?? 0)
                      )}
            </Text>
            </View>
                 )}
                 {invoiceData.addons.customer.addon2 && (invoiceData.addons.customer.addon2?.cost || 0) > 0 && (
                   <View style={{ 
                     flexDirection: 'row', 
                     paddingVertical: 2,
                     borderBottom: '1px solid #ccc'
                   }}>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                       <Text style={{ fontWeight: 'semibold' }}>{invoiceData.addons.customer.addon2?.name}</Text> - Non Refundable
                     </Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                       {formatCurrency(invoiceData.addons.customer.addon2?.cost || 0)}
                     </Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right', color: GLOBAL_FORMAT_CONFIG.colors.accent }}>
                       {GLOBAL_CALCULATION_CONFIG.calculations.formatDiscountDisplay(
                         GLOBAL_CALCULATION_CONFIG.calculations.calculateAddonDiscount(invoiceData.addons.customer.addon2)
                       )}
                     </Text>
                     {hasVATApplied(invoiceData) && (
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {invoiceData.addons.customer.addon2.applyVat ? formatCurrency(invoiceData.addons.customer.addon2.vatAmount || 0) : '-'}
                       </Text>
                     )}
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                      {formatCurrency(
                        invoiceData.addons.customer.addon2.applyVat
                          ? (invoiceData.addons.customer.addon2.costIncludingVat ?? invoiceData.addons.customer.addon2.postDiscountCost ?? invoiceData.addons.customer.addon2.cost ?? 0)
                          : (invoiceData.addons.customer.addon2.postDiscountCost ?? invoiceData.addons.customer.addon2.cost ?? 0)
                      )}
                    </Text>
          </View>
                 )}
                 {(() => {
                   let dynamicAddons = invoiceData.addons.customer.dynamicAddons;
                   // Convert object format back to array if needed
                   if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                     dynamicAddons = Object.values(dynamicAddons);
                   }
                   // Filter to only show addons with pre-discount cost > 0
                   const filteredAddons = Array.isArray(dynamicAddons) 
                     ? dynamicAddons.filter(addon => (addon.cost || 0) > 0)
                     : [];
                   
                   return filteredAddons.map((addon, index) => (
                   <View key={`customer-dynamic-${index}`} style={{ 
                     flexDirection: 'row', 
                     paddingVertical: 5,
                     borderBottom: '1px solid #ccc'
                   }}>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                         <Text style={{ fontWeight: 'semibold' }}>{addon.name}</Text> - Non Refundable
                       </Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                       {formatCurrency(addon.cost || 0)}
                     </Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                     <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right', color: GLOBAL_FORMAT_CONFIG.colors.accent }}>
                       {GLOBAL_CALCULATION_CONFIG.calculations.formatDiscountDisplay(
                         GLOBAL_CALCULATION_CONFIG.calculations.calculateAddonDiscount(addon)
                       )}
                     </Text>
                     {hasVATApplied(invoiceData) && (
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {addon.applyVat ? formatCurrency(addon.vatAmount || 0) : '-'}
                       </Text>
                     )}
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                      {formatCurrency(
                        addon.applyVat
                          ? (addon.costIncludingVat ?? addon.postDiscountCost ?? addon.cost ?? 0)
                          : (addon.postDiscountCost ?? addon.cost ?? 0)
                      )}
                    </Text>
                  </View>
                  ));
                })()}
               </>
             )}
              
              {/* Finance Add-ons - Only show for non-trade sales and only if pre-discount cost > 0 */}
             {invoiceData.saleType !== 'Trade' && invoiceData.addons?.finance?.enabled && (
               <>
                  {invoiceData.addons.finance.addon1 && (invoiceData.addons.finance.addon1?.cost || 0) > 0 && (
                   <>
                     <View style={{ 
                       flexDirection: 'row', 
                       paddingVertical: 5
                     }}>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                         <Text style={{ fontWeight: 'semibold' }}>{invoiceData.addons.finance.addon1?.name}</Text> - Non Refundable
                       </Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {formatCurrency(invoiceData.addons.finance.addon1?.cost || 0)}
                       </Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {invoiceData.addons.finance.addon1?.discount && invoiceData.addons.finance.addon1.discount > 0
                           ? formatCurrency(invoiceData.addons.finance.addon1.discount)
                           : (invoiceData.addons.finance.addon1?.cost && invoiceData.addons.finance.addon1?.postDiscountCost && 
                              invoiceData.addons.finance.addon1.cost > invoiceData.addons.finance.addon1.postDiscountCost)
                             ? formatCurrency(invoiceData.addons.finance.addon1.cost - invoiceData.addons.finance.addon1.postDiscountCost)
                             : '-'
                         }
                       </Text>
                      {hasVATApplied(invoiceData) && (
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                          {invoiceData.addons.finance.addon1.applyVat ? formatCurrency(invoiceData.addons.finance.addon1.vatAmount || 0) : '-'}
                        </Text>
                      )}
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                        {formatCurrency(
                          invoiceData.addons.finance.addon1.applyVat
                            ? (invoiceData.addons.finance.addon1.costIncludingVat ?? invoiceData.addons.finance.addon1.postDiscountCost ?? invoiceData.addons.finance.addon1.cost ?? 0)
                            : (invoiceData.addons.finance.addon1.postDiscountCost ?? invoiceData.addons.finance.addon1.cost ?? 0)
                        )}
                      </Text>
                    </View>
                    <View style={{ 
                      flexDirection: 'row', 
                      paddingTop: 1,
                      paddingBottom: 2,
                      borderBottom: '1px solid #ccc'
                    }}>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, flex: 5, textAlign: 'left', fontStyle: 'italic', color: '#666' }}>
                        To be covered by Finance/included in Cash Price
                      </Text>
                    </View>
                   </>
                  )}
                  {invoiceData.addons.finance.addon2 && (invoiceData.addons.finance.addon2?.cost || 0) > 0 && (
                   <>
                     <View style={{ 
                       flexDirection: 'row', 
                       paddingVertical: 5
                     }}>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                         <Text style={{ fontWeight: 'semibold' }}>{invoiceData.addons.finance.addon2?.name}</Text> - Non Refundable
                       </Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {formatCurrency(invoiceData.addons.finance.addon2?.cost || 0)}
                       </Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {invoiceData.addons.finance.addon2?.discount && invoiceData.addons.finance.addon2.discount > 0
                           ? formatCurrency(invoiceData.addons.finance.addon2.discount)
                           : (invoiceData.addons.finance.addon2?.cost && invoiceData.addons.finance.addon2?.postDiscountCost && 
                              invoiceData.addons.finance.addon2.cost > invoiceData.addons.finance.addon2.postDiscountCost)
                             ? formatCurrency(invoiceData.addons.finance.addon2.cost - invoiceData.addons.finance.addon2.postDiscountCost)
                             : '-'
                         }
                       </Text>
                      {hasVATApplied(invoiceData) && (
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                          {invoiceData.addons.finance.addon2.applyVat ? formatCurrency(invoiceData.addons.finance.addon2.vatAmount || 0) : '-'}
                        </Text>
                      )}
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                        {formatCurrency(
                          invoiceData.addons.finance.addon2.applyVat
                            ? (invoiceData.addons.finance.addon2.costIncludingVat ?? invoiceData.addons.finance.addon2.postDiscountCost ?? invoiceData.addons.finance.addon2.cost ?? 0)
                            : (invoiceData.addons.finance.addon2.postDiscountCost ?? invoiceData.addons.finance.addon2.cost ?? 0)
                        )}
                      </Text>
                    </View>
                    <View style={{ 
                      flexDirection: 'row', 
                      paddingTop: 1,
                      paddingBottom: 2,
                      borderBottom: '1px solid #ccc'
                    }}>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, flex: 5, textAlign: 'left', fontStyle: 'italic', color: '#666' }}>
                        To be covered by Finance/included in Cash Price
                      </Text>
                    </View>
                   </>
                  )}
                 {(() => {
                   let dynamicAddons = invoiceData.addons.finance.dynamicAddons;
                   // Convert object format back to array if needed
                   if (dynamicAddons && !Array.isArray(dynamicAddons) && typeof dynamicAddons === 'object') {
                     dynamicAddons = Object.values(dynamicAddons);
                   }
                   // Filter to only show addons with pre-discount cost > 0
                   const filteredAddons = Array.isArray(dynamicAddons) 
                     ? dynamicAddons.filter(addon => (addon.cost || 0) > 0)
                     : [];
                   
                   return filteredAddons.map((addon, index) => (
                   <React.Fragment key={`finance-dynamic-${index}`}>
                     <View style={{ 
                       flexDirection: 'row', 
                       paddingVertical: 5
                     }}>
                         <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                           <Text style={{ fontWeight: 'semibold' }}>{addon.name}</Text> - Non Refundable
                         </Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {formatCurrency(addon.cost || 0)}
                       </Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                       <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                         {addon.discount && addon.discount > 0
                           ? formatCurrency(addon.discount)
                           : (addon.cost && addon.postDiscountCost && addon.cost > addon.postDiscountCost)
                             ? formatCurrency(addon.cost - addon.postDiscountCost)
                             : '-'
                         }
                       </Text>
                      {hasVATApplied(invoiceData) && (
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                          {addon.applyVat ? formatCurrency(addon.vatAmount || 0) : '-'}
                        </Text>
                      )}
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                        {formatCurrency(
                          addon.applyVat
                            ? (addon.costIncludingVat ?? addon.postDiscountCost ?? addon.cost ?? 0)
                            : (addon.postDiscountCost ?? addon.cost ?? 0)
                        )}
                      </Text>
                    </View>
                    <View style={{ 
                      flexDirection: 'row', 
                      paddingTop: 1,
                      paddingBottom: 2,
                      borderBottom: '1px solid #ccc'
                    }}>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, flex: 5, textAlign: 'left', fontStyle: 'italic', color: '#666' }}>
                        To be covered by Finance/included in Cash Price
                      </Text>
                    </View>
                  </React.Fragment>
                  ));
                })()}
               </>
             )}
             
             {/* Delivery Cost */}
              {invoiceData.delivery?.type === 'delivery' && ((invoiceData.delivery?.cost ?? 0) > 0 || (invoiceData.delivery?.discount ?? 0) > 0) && (
               <View style={{ 
                 flexDirection: 'row', 
                 paddingVertical: 5,
                 borderBottom: '1px solid #ccc'
               }}>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 3, textAlign: 'left' }}>
                   Cost of Delivery
                 </Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                   {formatCurrency(invoiceData.delivery?.cost || 0)}
                 </Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'center' }}>1</Text>
                 <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right', color: GLOBAL_FORMAT_CONFIG.colors.accent }}>
                   {GLOBAL_CALCULATION_CONFIG.calculations.formatDiscountDisplay(
                     GLOBAL_CALCULATION_CONFIG.calculations.calculateDeliveryDiscount(invoiceData)
                   )}
                 </Text>
                {hasVATApplied(invoiceData) && (
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, flex: 1, textAlign: 'right' }}>
                    {invoiceData.pricing.applyVatToDelivery ? formatCurrency(invoiceData.pricing.deliveryVatAmount || 0) : '-'}
                  </Text>
                )}
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, flex: 1, textAlign: 'right' }}>
                  {formatCurrency(
                    invoiceData.pricing.applyVatToDelivery
                      ? (invoiceData.pricing.deliveryIncludingVat ?? invoiceData.delivery?.postDiscountCost ?? invoiceData.pricing?.deliveryCostPostDiscount ?? invoiceData.delivery?.cost ?? 0)
                      : (invoiceData.delivery?.postDiscountCost ?? invoiceData.pricing?.deliveryCostPostDiscount ?? invoiceData.delivery?.cost ?? 0)
                  )}
                </Text>
                    </View>
                  )}
            
            {/* Vehicle Details - Multi-line format with generous spacing */}
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 2 }}>
                DERIVATIVE: {invoiceData.vehicle?.derivative || ''}
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 2 }}>
                MILEAGE: {invoiceData.vehicle?.mileage || ''}
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 2}}>
                ENGINE NO: {invoiceData.vehicle?.engineNumber || ''}
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 2 }}>
                ENGINE CAPACITY: {invoiceData.vehicle?.engineCapacity || ''}
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 2 }}>
                CHASSIS NO: {invoiceData.vehicle?.vin || ''}
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 2 }}>
                DATE FIRST REG UK: {formatDate(invoiceData.vehicle?.firstRegDate)}
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6 }}>
                COLOUR: {invoiceData.vehicle?.colour || ''}
              </Text>
                    </View>

            {/* Finance Company Section - Only for Finance Company Invoices */}
            {invoiceData.invoiceTo === 'Finance Company' && (
              <View style={{ marginTop: 0, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.sectionGap }}>
                {/* Finance Section Header */}

                {/* Single Column Layout - All Left Aligned */}
                <View style={{ marginLeft: 0 }}>
                  {/* Total Cash Price */}
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, lineHeight: 1.6, marginBottom: 8 }}>
                    TOTAL CASH PRICE: {formatCurrency(invoiceData.pricing.salePricePostDiscount)}
                  </Text>

                  {/* Amounts Due Header */}
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 8 }}>
                    <Text style={{ fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold }}>AMOUNTS DUE:</Text> DEPOSIT: {formatCurrency(((invoiceData.pricing?.compulsorySaleDepositFinance || 0) + (invoiceData.pricing?.voluntaryContribution || 0) || invoiceData.pricing.compulsorySaleDepositCustomer || 0))}, DELIVERY: {formatCurrency(invoiceData?.delivery?.cost || 0)}, DUE BY (Estimated): {formatDate(invoiceData.delivery?.date || invoiceData.invoiceDate)}
                  </Text>
                  
                  {/* Deposit */}
                  {/* <Text style={[styles.vehicleDetails, { lineHeight: 1.8, marginBottom: 8 }]}>
                    DEPOSIT:{formatCurrency(invoiceData.payment.breakdown.depositAmount || 0)}
                  </Text> */}
                  
                  {/* Delivery */}
                  {/* {invoiceData.delivery?.cost && invoiceData.delivery.cost > 0 && (
                    <Text style={[styles.vehicleDetails, { lineHeight: 1.8, marginBottom: 8 }]}>
                      DELIVERY: {formatCurrency(invoiceData.delivery.cost)}
                    </Text>
                  )} */}
                  

                  {/* Deposit Paid */}
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 8 }}>
                    <Text style={{ fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold }}>DEPOSIT PAID:</Text> {formatCurrency(
                      invoiceData.invoiceTo === 'Finance Company' 
                        ? (invoiceData.pricing?.totalFinanceDepositPaid || (invoiceData.pricing?.dealerDepositPaidCustomer || 0) + (invoiceData.pricing?.amountPaidDepositFinance || 0))
                        : (invoiceData.pricing?.amountPaidDepositCustomer || 0)
                    )} , REMAINING DEPOSIT: {formatCurrency(
                      Math.max(0, 
                        invoiceData.invoiceTo === 'Finance Company' 
                        ? ((invoiceData.pricing?.compulsorySaleDepositFinance || 0) + (invoiceData.pricing?.voluntaryContribution || 0) - (invoiceData.pricing?.totalFinanceDepositPaid || (invoiceData.pricing?.dealerDepositPaidCustomer || 0) + (invoiceData.pricing?.amountPaidDepositFinance || 0)))
                          : ((invoiceData.pricing?.compulsorySaleDepositCustomer || 0) - (invoiceData.pricing?.amountPaidDepositCustomer || 0))
                      )
                    )}
                  </Text>

                  {/* Part Exchange Section */}
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 8 }}>
                    PART EX: {formatCurrency(invoiceData.payment?.partExchange?.valueOfVehicle || 0)}
                    {(invoiceData.payment?.partExchange?.valueOfVehicle && invoiceData.payment.partExchange.valueOfVehicle > 0) && 
                      ` - DETAILS: ${invoiceData.payment?.partExchange?.makeAndModel || ''}-  ${invoiceData.payment?.partExchange?.vehicleRegistration || ''}`
                    }
                  </Text>

                  {/* Settlement - only show when part exchange is included */}
                  {invoiceData.payment?.partExchange?.included && (
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 8 }}>
                      SETTLEMENT: {formatCurrency(invoiceData.payment?.partExchange?.settlementAmount || 0)}
                    </Text>
                  )}

                  {/* Balance to Finance */}
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, lineHeight: 1.6, marginBottom: 0}}>
                    <Text >BALANCE TO FINANCE:</Text> {formatCurrency(invoiceData.payment.balanceToFinance || 0)} ,   DUE BY (Estimated): {formatDate(invoiceData.delivery?.date || invoiceData.invoiceDate)}
                  </Text>
                  
                </View>
              </View>
            )}
                    </View>

                    {invoiceData.saleType !== 'Trade' && invoiceData.warranty.level && invoiceData.warranty.level !== 'None Selected' && (
              <View style={{ borderTop: '1px solid #d0d0d0', paddingTop: 2, marginBottom: 2, borderBottom: '1px solid #d0d0d0', paddingBottom: 2 }}>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', marginBottom: 2 }}>
                  {invoiceData.warranty.inHouse ? 'IN HOUSE WARRANTY DISCLAIMER' : 'WARRANTY DISCLAIMER'}
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: 2 }}>
                  {invoiceData.warranty.inHouse 
                    ? '30 day complimentary (Engine and Gearbox) warranty - Customer must return the vehicle to dealer at own expense (Extendable on collection/delivery)'
                    : 'Third-party warranty terms and conditions apply as per the warranty provider.'
                  }
                </Text>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY }}>
                  I confirm that when purchasing the above vehicle, I have been offered various options for warranty cover 
                  and have chosen to opt for this level of cover. I am confirming my understanding of the above and that 
                  all the details listed are correct.
                </Text>
              </View>
            )}

                    <View style={{ marginTop: 0, marginBottom: 2 }}>
              {invoiceData.invoiceTo === 'Finance Company' && (
                <>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold', marginBottom: 2 }}>
                    CUSTOMER DETAILS
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: 1 }}>
                    {invoiceData.customer.title} {invoiceData.customer.firstName} {invoiceData.customer.lastName}
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: 1 }}>
                    {invoiceData.customer.address.firstLine} {invoiceData.customer.address.secondLine && invoiceData.customer.address.secondLine + ', '}
                    {invoiceData.customer.address.city}, {invoiceData.customer.address.county} {invoiceData.customer.address.postCode}, GB,
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: 1 }}>
                    Email: {invoiceData.customer.contact.email || 'N/A'} - Phone: {invoiceData.customer.contact.phone || 'N/A'}
                  </Text>
                </>
              )}
             
            </View>

          {/* Additional Information Section */}
          {invoiceData.additionalInformation && (
            <View style={{ marginTop: 2, marginBottom: 2, paddingTop: 2 }}>
              <Text style={{ 
                fontSize: mainInvoiceFontSize, 
                fontFamily: CENTURY_GOTHIC_FONT_FAMILY, 
                fontWeight: 'semibold',
                color: '#000000',
                marginBottom: 2 
              }}>
                ADDITIONAL COMMENTS:
              </Text>
              <Text style={{ 
                fontSize: mainInvoiceFontSize, 
                fontFamily: CENTURY_GOTHIC_FONT_FAMILY, 
                color: '#000000',
                lineHeight: 1.2 
              }}>
                {invoiceData.additionalInformation}
              </Text>
            </View>
          )}

          {/* Trade Sale Disclaimer */}
          {invoiceData.saleType === 'Trade' && (
            <View style={{ marginTop: 2, marginBottom: 2, paddingTop: 2 }}>
              <Text style={{ 
                fontSize: mainInvoiceFontSize, 
                fontFamily: CENTURY_GOTHIC_FONT_FAMILY, 
                fontWeight: 'semibold',
                color: '#000000',
                marginBottom: 2 
              }}>
                TRADE SALE DISCLAIMER
              </Text>
              <Text style={{ 
                fontSize: mainInvoiceFontSize, 
                fontFamily: CENTURY_GOTHIC_FONT_FAMILY, 
                color: '#000000',
                lineHeight: 1.2,
                textAlign: 'justify'
              }}>
                I confirm that, when purchasing the above vehicle, I have been advised that this purchase is a Trade-Sale and outside of the scope of the Consumer Protection provisions. Therefore, no warranty or post-sale liabilities will apply. By purchasing this vehicle, I am confirming my understanding of the above, that all of the details listed are correct and providing my consent for these conditions to be applied.
              </Text>
            </View>
            )}

          {/* Payment Breakdown Section */}
          <View style={{ 
            marginTop: 2, 
            marginBottom: 2, 
            borderTop: (invoiceData.saleType === 'Trade' || !invoiceData.warranty.level || invoiceData.warranty.level === 'None Selected') ? '1px solid #d0d0d0' : 'none', 
            paddingTop: 2 
          }}>
            <View style={{ marginBottom: 4 }}>
              {/* Header Row - Payment Breakdown and Subtotal in same row */}
              <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold' }}>
                    PAYMENT BREAKDOWN
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right' }}>
                    SUBTOTAL:
                  </Text>
                </View>
                <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                  {formatCurrency(GLOBAL_CALCULATION_CONFIG.calculations.calculateSubtotal(invoiceData))}
                </Text>
              </View>
              
              {/* Payment Items - Two Column Layout with right-aligned labels and right-aligned values */}
              <View style={{ marginLeft: 0 }}>
                <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', flex: 1 }}>
                    VAT ({hasVATApplied(invoiceData) ? '20%' : '0%'}):
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                    {formatCurrency(GLOBAL_CALCULATION_CONFIG.calculations.calculateTotalVAT(invoiceData))}
                  </Text>
                </View>
                
                {hasVATApplied(invoiceData) && (
                <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, textAlign: 'right', flex: 1 }}>
                    TOTAL INC VAT:
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                    {formatCurrency(GLOBAL_CALCULATION_CONFIG.calculations.calculateSubtotal(invoiceData) + GLOBAL_CALCULATION_CONFIG.calculations.calculateTotalVAT(invoiceData))}
                  </Text>
                </View>)}
                
                <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', flex: 1 }}>
                    DEPOSIT DUE:
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                  {formatCurrency(((invoiceData.pricing?.compulsorySaleDepositFinance || 0) + (invoiceData.pricing?.voluntaryContribution || 0) || invoiceData.pricing.compulsorySaleDepositCustomer || 0))}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                    DEPOSIT AMOUNT PAID:
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                    {(() => {
                      const depositPaid = invoiceData.invoiceTo === 'Finance Company' 
                        ? (invoiceData.pricing?.totalFinanceDepositPaid || (invoiceData.pricing?.dealerDepositPaidCustomer || 0) + (invoiceData.pricing?.amountPaidDepositFinance || 0))
                        : (invoiceData.pricing?.amountPaidDepositCustomer || 0);
                      return depositPaid > 0 ? formatCurrency(depositPaid) : 'NONE';
                    })()}
                  </Text>
                </View>

                {((invoiceData.pricing?.compulsorySaleDepositFinance || 0) + (invoiceData.pricing?.voluntaryContribution || 0) - (invoiceData.pricing?.amountPaidDepositFinance || 0)) > 0 && (
                  <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                          REMAINING DEPOSIT AMOUNT:
                        </Text>
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                          {formatCurrency((invoiceData.pricing?.compulsorySaleDepositFinance || 0) + (invoiceData.pricing?.voluntaryContribution || 0) - (invoiceData.pricing?.amountPaidDepositFinance || 0))}
                        </Text>
                      </View>
                  )}
                
                <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                    DATE OF COLLECTION (ESTIMATED):
                  </Text>
                  <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                    {formatDate(invoiceData.delivery?.date || invoiceData.invoiceDate)}
                  </Text>
                </View>
                
                {/* Finance Deposit Payment - Only show for Finance Company when deposit paid */}
                {invoiceData.invoiceTo === 'Finance Company' && (invoiceData.payment?.breakdown?.financeAmount || 0) > 0 && (
                  <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                      FINANCE DEPOSIT PAID:
                    </Text>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                      {formatCurrency(invoiceData.payment?.breakdown?.financeAmount || 0)} - {formatDate(invoiceData.payment?.breakdown?.depositDate || invoiceData.invoiceDate)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ 
            height: 1, 
            backgroundColor: '#d0d0d0', 
            marginTop: 'auto', 
            marginBottom: 4 ,
          }} />


                {/* Payment Received Section */}
                <View style={{ marginTop: 4, marginBottom: 4 }}>
                  {/* Header Row - Payments and Paid from Balance in same row */}
                  <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold' }}>
                        PAYMENTS
                      </Text>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right' }}>
                        PAID FROM BALANCE:
                      </Text>
                    </View>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                      {formatCurrency(
                        (invoiceData.payment?.partExchange?.amountPaid || 0) + 
                        // Sum all card payments
                        ((invoiceData.payment?.breakdown?.cardPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)) +
                        // Sum all BACS payments
                        ((invoiceData.payment?.breakdown?.bacsPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)) +
                        // Sum all cash payments
                        ((invoiceData.payment?.breakdown?.cashPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0)) +
                        // Add overpayment as Vehicle Reservation Fees ONLY when there's an overpayment (Finance)
                        (invoiceData.invoiceTo === 'Finance Company' && (invoiceData.pricing?.overpaymentsFinance || 0) > 0 ? (invoiceData.pricing?.overpaymentsFinance || 0) : 0) +
                        // Add overpayment as Additional Deposit Payment for Customer invoices
                        (invoiceData.invoiceTo === 'Customer' && (invoiceData.pricing?.overpaymentsCustomer || 0) > 0 ? (invoiceData.pricing?.overpaymentsCustomer || 0) : 0)
                      )}
                    </Text>
                  </View>

                {/* Cash Payments - Multiple Entries */}
                {(invoiceData.payment?.breakdown?.cashPayments || []).map((payment, index) => 
                  payment.amount > 0 && (
                    <View key={`cash-${index}`} style={{ flexDirection: 'row', marginBottom: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', fontSize: mainInvoiceFontSize, flex: 1 }}>
                        {/* Left side: Date */}
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'center', flex: 1 }}>
                          {formatDate(payment.date || invoiceData.invoiceDate)}
                        </Text>

                        {/* Right side: Cash + Amount + Date */}
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                          CASH PAYMENT 
                        </Text>
                      </View>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                        {formatCurrency(payment.amount)}
                      </Text>
                    </View>
                  )
                )}

                {/* Card Payments - Multiple Entries */}
                {(invoiceData.payment?.breakdown?.cardPayments || []).map((payment, index) => 
                  payment.amount > 0 && (
                    <View key={`card-${index}`} style={{ flexDirection: 'row', marginBottom: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', fontSize: mainInvoiceFontSize, flex: 1 }}>
                        {/* Left side: Date */}
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'center', flex: 1 }}>
                          {formatDate(payment.date || invoiceData.invoiceDate)}
                        </Text>

                        {/* Right side: Card + Amount + Date */}
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                          CARD PAYMENT
                        </Text>
                      </View>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                        {formatCurrency(payment.amount)}
                      </Text>
                    </View>
                  )
                )}

                {/* BACS Payments - Multiple Entries */}
                {(invoiceData.payment?.breakdown?.bacsPayments || []).map((payment, index) => 
                  payment.amount > 0 && (
                    <View key={`bacs-${index}`} style={{ flexDirection: 'row', marginBottom: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', fontSize: mainInvoiceFontSize, flex: 1 }}>
                        {/* Left side: Date */}
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'center', flex: 1 }}>
                          {formatDate(payment.date || invoiceData.invoiceDate)}
                        </Text>

                        {/* Right side: BACS + Amount + Date */}
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                          BACS PAYMENT
                        </Text>
                      </View>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                        {formatCurrency(payment.amount)}
                      </Text>
                    </View>
                  )
                )}

                {/* Finance Payment */}
                {(invoiceData.payment?.breakdown?.financeAmount || 0) > 0 && invoiceData.saleType === 'Trade' && invoiceData.invoiceTo === 'Finance Company' && (
                  <View style={{ flexDirection: 'row', marginBottom: 1 }}>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                      FINANCE:
                    </Text>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                      {formatCurrency(invoiceData.payment.breakdown.financeAmount)} - {formatDate(invoiceData.payment?.breakdown?.financeDate || invoiceData.invoiceDate)}
                    </Text>
                  </View>
                )}

                {/* Vehicle Reservation Fees (Overpayment) - Only show when there's an OVERPAYMENT in Finance Company invoices */}
                {invoiceData.invoiceTo === 'Finance Company' && (invoiceData.pricing?.overpaymentsFinance || 0) > 0 && (
                  <View style={{ flexDirection: 'row', marginBottom: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', fontSize: mainInvoiceFontSize, flex: 1 }}>
                      {/* Left side: Date */}
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'center', flex: 1 }}>
                        {invoiceData.payment?.breakdown?.depositDate ? formatDate(invoiceData.payment.breakdown.depositDate) : ''}
                      </Text>

                      {/* Right side: VEHICLE RESERVATION FEES label */}
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                        VEHICLE RESERVATION FEES:
                      </Text>
                    </View>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                      {formatCurrency(invoiceData.pricing?.overpaymentsFinance || 0)}
                    </Text>
                  </View>
                )}

                {/* Additional Deposit Payment (Overpayment) - Only show when there's an OVERPAYMENT in Customer invoices */}
                {invoiceData.invoiceTo === 'Customer' && (invoiceData.pricing?.overpaymentsCustomer || 0) > 0 && (
                  <View style={{ flexDirection: 'row', marginBottom: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', fontSize: mainInvoiceFontSize, flex: 1 }}>
                      {/* Left side: Date */}
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'center', flex: 1 }}>
                        {invoiceData.payment?.breakdown?.depositDate ? formatDate(invoiceData.payment.breakdown.depositDate) : ''}
                      </Text>

                      {/* Right side: ADDITIONAL DEPOSIT PAYMENT label */}
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                        ADDITIONAL DEPOSIT PAYMENT:
                      </Text>
                    </View>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                      {formatCurrency(invoiceData.pricing?.overpaymentsCustomer || 0)}
                    </Text>
                  </View>
                )}

                {/* Part Exchange Payment - LAST in payments section */}
                {(invoiceData.payment?.partExchange?.amountPaid || 0) > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', marginBottom: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', fontSize: mainInvoiceFontSize, flex: 1 }}>
                        {/* Left side: Date - only show if date exists */}
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'center', flex: 1 }}>
                          {invoiceData.payment?.breakdown?.partExDate ? formatDate(invoiceData.payment.breakdown.partExDate) : ''}
                        </Text>

                        {/* Right side: PART EXCHANGE label */}
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1 }}>
                          PART EXCHANGE:
                        </Text>
                      </View>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                        {formatCurrency(invoiceData.payment?.partExchange?.amountPaid || 0)}
                      </Text>
                    </View>
                    {/* Vehicle details on new line below */}
                    {(invoiceData.payment?.partExchange?.makeAndModel || invoiceData.payment?.partExchange?.vehicleRegistration) && (
                      <View style={{ flexDirection: 'row', marginBottom: 1 }}>
                        <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, textAlign: 'right', flex: 1, fontStyle: 'italic', color: '#000' }}>
                          {invoiceData.payment.partExchange.makeAndModel || ''} {invoiceData.payment.partExchange.makeAndModel && invoiceData.payment.partExchange.vehicleRegistration ? '-' : ''} {invoiceData.payment.partExchange.vehicleRegistration || ''}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* Deposit Payment */}
              </View>
              
              {/* Balance Due Section - Below Payment Breakdown */}
              <View style={{ marginTop: 0, paddingTop: 4, borderTop: '1px solid #d0d0d0' }}>
                {invoiceData.saleType !== 'Trade' && (
                  <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold }}>
                        {invoiceData.invoiceTo === 'Finance Company' ? 'FINANCE' : 'CUSTOMER'}
                      </Text>
                      <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, textAlign: 'right' }}>
                        {(() => {
                          // Check if there's unpaid deposit for Customer invoices (not Finance Company)
                          const hasUnpaidDeposit = invoiceData.invoiceTo === 'Customer' && 
                            (invoiceData.pricing?.outstandingDepositCustomer ?? 0) > 0;
                          
                          return hasUnpaidDeposit 
                            ? 'BALANCE DUE (including any unpaid deposit):' 
                            : 'BALANCE DUE:';
                        })()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                      {formatCurrency(GLOBAL_CALCULATION_CONFIG.calculations.calculateRemainingBalance(invoiceData))}
                    </Text>
                  </View>
                )}
                
                {/* Amount Due Section - Only for Finance Company or Trade */}
                {(invoiceData.invoiceTo === 'Finance Company' || invoiceData.saleType === 'Trade') && (
                  <View style={{ flexDirection: 'row', marginBottom: 1 }}>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, textAlign: 'right', flex: 1 }}>
                      {(() => {
                        // Check if there's unpaid deposit for Trade sales (not Finance Company)
                        const hasUnpaidDeposit = invoiceData.saleType === 'Trade' && 
                          (invoiceData.pricing?.outstandingDepositCustomer ?? 0) > 0;
                        
                        if (invoiceData.saleType === 'Trade') {
                          return hasUnpaidDeposit 
                            ? 'BALANCE DUE (including any unpaid deposit):' 
                            : 'BALANCE DUE:';
                        } else {
                          // Finance Company - no deposit text added
                          return 'AMOUNT DUE:';
                        }
                      })()}
                    </Text>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                      {formatCurrency(GLOBAL_CALCULATION_CONFIG.calculations.calculateRemainingBalance(invoiceData))}
                    </Text>
                  </View>
                )}
                
                {/* Due Date Section - Only show if balance due > 0 */}
                {GLOBAL_CALCULATION_CONFIG.calculations.calculateRemainingBalance(invoiceData) > 0 && (
                  <View style={{ flexDirection: 'row', marginBottom: 1 }}>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', flex: 1 }}>
                      DUE BY:
                    </Text>
                    <Text style={{ fontSize: mainInvoiceFontSize, fontFamily: GLOBAL_FORMAT_CONFIG.fonts.family, textAlign: 'right', marginLeft: 10, flex: 1 }}>
                      {formatDate(invoiceData.delivery?.date || invoiceData.invoiceDate)}
                    </Text>
                  </View>
                )}
              </View>

            

             

              <View style={{ 
            height: 1, 
            backgroundColor: '#d0d0d0', 
            marginTop: 2, 
            marginBottom: 4 ,
          }} />

              <View style={{ 
            flexDirection: 'row', 
            marginTop: 2,
            paddingTop: 0
          }}>
            {/* Left Column - Payment Information */}
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: mainInvoiceFontSize, 
                fontWeight: 'semibold', 
                fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
                marginBottom: 2
              }}>
                PAYMENT INFORMATION
              </Text>
              <Text style={{ fontSize: mainInvoiceFontSize, marginBottom: 1, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'normal' }}>
              {invoiceData.companyInfo.name}
            </Text>
              {invoiceData.companyInfo.payment?.bankSortCode && (
                <Text style={{ fontSize: mainInvoiceFontSize, marginBottom: 1, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'normal' }}>
                  {invoiceData.companyInfo.payment.bankSortCode}
                </Text>
              )}
              {invoiceData.companyInfo.payment?.bankAccountNumber && (
                <Text style={{ fontSize: mainInvoiceFontSize, marginBottom: 1, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'normal' }}>
                  {invoiceData.companyInfo.payment.bankAccountNumber}
                </Text>
              )}
              <Text style={{ fontSize: mainInvoiceFontSize, marginBottom: 1, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'normal' }}>
                Ref - INV-{invoiceData.vehicle.registration}
            </Text>
            </View>

            {/* Center Column - Thank You Message */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ 
                fontSize: mainInvoiceFontSize, 
                fontWeight: 'normal', 
                fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
                textAlign: 'center',
                lineHeight: 1.3
              }}>
                Thank you for choosing {invoiceData.companyInfo.name}
              </Text>
            </View>

            {/* Right Column - QR Code */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
              {invoiceData.companyInfo.qrCode ? (
                <Image
                  style={{ 
                    width: 40, 
                    height: 40,
                    objectFit: 'contain'
                  }}
                  src={invoiceData.companyInfo.qrCode}
                />
              ) : (
                <View style={{ 
                  width: 40, 
                  height: 40, 
                  border: '1px solid #ddd',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#f9f9f9'
                }}>
                  <Text style={{ 
                    fontSize: mainInvoiceFontSize, 
                    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
                    textAlign: 'center',
                    color: '#000',
                    fontWeight: 'normal'
                  }}>
                    QR Code{'\n'}Placeholder
                  </Text>
                </View>
              )}
            </View>
          </View>
            </View>
          </View>
           

          {/* Light Grey Separator */}
          
          
          {/* Payment Information, Thank You & QR Code - 3 Column Layout */}
         
      </PageWithBackground>

      {/* Page 2: Trade Disclaimer (for Trade Sales) */}
        {shouldShowSection('trade-disclaimer') && (
        <PageWithBackground style={styles.page}>
          <View style={styles.avoidBreak}>
            {/* Top information text */}
            <View style={{ marginBottom: 15 }}>
              <Text style={[styles.pageTitle, { fontSize: 10, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'normal', textAlign: 'left' }]}>
                This document contains key information provided as part of the sale
              </Text>
            </View>

            {/* Logo centered and big */}
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Image
                style={{ 
                  height: GLOBAL_FORMAT_CONFIG.layout.logo.height, 
                  width: GLOBAL_FORMAT_CONFIG.layout.logo.width, 
                  maxWidth: GLOBAL_FORMAT_CONFIG.layout.logo.maxWidth,
                  objectFit: 'contain' 
                }}
                src={invoiceData.companyInfo.logo}
              />
            </View>

               {/* Grey banner header */}
               <View style={{ backgroundColor: '#f5f5f5', padding: 8, marginBottom: 10 }}>
              <Text style={[styles.pageTitle, { fontSize: 10, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold' }]}>
              TRADE SALE DISCLAIMER
              </Text>
            </View>
            
             {/* Grey line separator */}
             <View style={{ height: 1, backgroundColor: '#cccccc', marginBottom: 10 }} />
            
            {/* Customer name */}
            <View style={{ marginBottom: 15 }}>
              <Text style={[styles.checklistItem, { textAlign: 'left', fontWeight: 'semibold', fontSize: 10, marginBottom: 8 }]}>
                {renderCustomerName(invoiceData.customer)}
                <Text style={{ fontWeight: 'semibold', fontSize: 10 }}>{invoiceData.vehicle?.make || ''} {invoiceData.vehicle?.model || ''}</Text> - <Text style={{ fontWeight: 'semibold', fontSize: 10 }}>{invoiceData.vehicle?.registration || ''}</Text>
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.checklistItem, { textAlign: 'left', fontSize: 10, marginBottom: 0 }]}>
                  DATE OF SALE:
                </Text>
                <Text style={[styles.checklistItem, { textAlign: 'right', fontSize: 10, marginBottom: 0 }]}>
                  {formatDate(invoiceData.sale.date)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.checklistItem, { textAlign: 'left', fontSize: 10, marginBottom: 0 }]}>
                  {invoiceData.delivery?.type === 'delivery' ? 'DATE OF DELIVERY:' : 'DATE OF COLLECTION:'}
                </Text>
                <Text style={[styles.checklistItem, { textAlign: 'right', fontSize: 10, marginBottom: 0 }]}>
                  {formatDate(invoiceData.delivery.date || '')}
                </Text>
              </View>
            </View>
            
            {/* Grey line separator */}
            <View style={{ height: 1, backgroundColor: '#cccccc', marginBottom: 10 }} />

            {invoiceData.terms.tradeTerms && (
              <View style={{ marginTop: 30, fontSize: 10 }}>
                {renderHTMLContent(invoiceData.terms.tradeTerms , 10)}
              </View>
            )}

            {/* Customer Signature Section - Part of Vehicle Checklist */}
            <View style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #d0d0d0', paddingBottom: 8, borderBottom: '1px solid #d0d0d0' }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 200, alignItems: 'center' }}>
                  {invoiceData.signature?.customerSignature ? (
                    <View style={{ alignItems: 'center' }}>
                      <Image
                        src={invoiceData.signature.customerSignature}
                        style={{ width: 150, height: 60, marginBottom: 6 }}
                      />
                      <Text style={{ fontSize: 12, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: 4 }}>
                        Customer Signature
                      </Text>
                      <Text style={{ marginTop: 32, fontSize: 10, fontFamily: CENTURY_GOTHIC_FONT_FAMILY }}>
                        Date: {invoiceData.signature?.dateOfSignature || '___________'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      {/* <View style={{ marginTop: 20, width: 150, height: 1, backgroundColor: '#000000', marginBottom: 8 }} /> */}
                      <Text style={{ marginTop: 25, fontSize: 10, fontFamily: CENTURY_GOTHIC_FONT_FAMILY }}>
                        Customer Signature: ___________________
                      </Text>
                      <Text style={{ marginTop: 36, fontSize: 10, fontFamily: CENTURY_GOTHIC_FONT_FAMILY }}>
                        Date: {invoiceData.signature?.dateOfSignature || '___________'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            

          </View>
        </PageWithBackground>
        )}

      {/* Page 2/3: Vehicle Checklist (for Retail Sales) */}
        {shouldShowSection('checklist') && (
        <PageWithBackground style={styles.page}>
          <View style={styles.avoidBreak}>
            {/* Top information text */}
            <View style={{ marginBottom: 15 }}>
              <Text style={[styles.pageTitle, { fontSize: 8, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'normal', textAlign: 'left' }]}>
                This document contains key information provided as part of the sale
              </Text>
            </View>

            {/* Logo centered and big */}
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Image
                style={{ 
                  height: GLOBAL_FORMAT_CONFIG.layout.logo.height, 
                  width: GLOBAL_FORMAT_CONFIG.layout.logo.width, 
                  maxWidth: GLOBAL_FORMAT_CONFIG.layout.logo.maxWidth,
                  objectFit: 'contain' 
                }}
                src={invoiceData.companyInfo.logo}
              />
            </View>

            {/* Grey banner header */}
            <View style={{ backgroundColor: '#f5f5f5', padding: 8, marginBottom: 10 }}>
              <Text style={[styles.pageTitle, { fontSize: 8, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold' }]}>
                VEHICLE CHECKLIST
              </Text>
            </View>
            
            {/* Grey line separator */}
            <View style={{ height: 1, backgroundColor: '#cccccc', marginBottom: 10 }} />
            
            {/* Customer name */}
            <View style={{ marginBottom: 5 }}>
              <Text style={[styles.checklistItem, { textAlign: 'left', fontWeight: 'semibold' }]}>
                Customer: {invoiceData.customer?.title || ''} {invoiceData.customer?.firstName || ''} {invoiceData.customer?.middleName ? invoiceData.customer.middleName + ' ' : ''}{invoiceData.customer?.lastName || ''} - <Text style={{ fontWeight: 'semibold' }}>{invoiceData.vehicle?.make || ''} {invoiceData.vehicle?.model || ''}</Text> - <Text style={{ fontWeight: 'semibold' }}>{invoiceData.vehicle?.registration || ''}</Text>
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.checklistItem, { textAlign: 'left' }]}>
                  DATE OF SALE:
                </Text>
                <Text style={[styles.checklistItem, { textAlign: 'right' }]}>
                  {formatDate(invoiceData.sale.date)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.checklistItem, { textAlign: 'left' }]}>
                  {invoiceData.delivery?.type === 'delivery' ? 'DATE OF DELIVERY:' : 'DATE OF COLLECTION:'}
                </Text>
                <Text style={[styles.checklistItem, { textAlign: 'right' }]}>
                  {formatDate(invoiceData.delivery.date || '')}
                </Text>
              </View>
            </View>
            
            {/* Grey line separator */}
            <View style={{ height: 1, backgroundColor: '#cccccc', marginBottom: 10 }} />

            
            {/* Two-column checklist layout with right-aligned labels and left-aligned values */}
            <View style={{ marginBottom: 20, paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  MILEAGE:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.mileage || invoiceData.vehicle.mileage} miles
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  CAMBELT/CHAIN CONFIRMATION:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.cambeltChainConfirmation === 'Yes' ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  FUEL TYPE:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.fuelType || invoiceData.vehicle.fuelType}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  NUMBER OF KEYS:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.numberOfKeys || '2'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  SERVICE BOOK:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.serviceHistoryRecord || 'Not Available'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  USER MANUAL:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.userManual === 'Present' || 
                   invoiceData.checklist?.userManual === 'Digital Copy Available' || 
                   invoiceData.checklist?.userManual === 'Yes' || 
                   invoiceData.checklist?.userManual === 'Digital' ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  WHEEL LOCKING NUT:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.wheelLockingNut === 'Present' || 
                   invoiceData.checklist?.wheelLockingNut === 'Yes' ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  VEHICLE INSPECTION & TEST DRIVE:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.vehicleInspectionTestDrive === 'Yes' ? 'YES' : 'NO'}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'right', paddingRight: 8, fontSize: 8 }]}>
                  DEALER PRE-SALE CHECK:
                </Text>
                <Text style={[styles.checklistItem, { flex: 1, textAlign: 'left', fontSize: 8 }]}>
                  {invoiceData.checklist?.dealerPreSaleCheck === 'Yes' ? 'YES' : 'NO'}
                </Text>
              </View>
            </View>

             {/* Vertical Separator */}
             <View style={{ 
              height: 2, 
              backgroundColor: '#d0d0d0', 
              marginTop: 20, 
              marginBottom: 15,
              marginHorizontal: 20
            }} />

            {/* Customer has accepted the IDD Section - Only for Finance Company Retail */}
            {invoiceData.saleType !== 'Trade' && invoiceData.invoiceTo === 'Finance Company' && (
              <View style={{ marginBottom: 15, paddingHorizontal: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.checklistItem, { 
                    fontSize: 8, 
                    fontWeight: 'semibold', 
                    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
                    textAlign: 'left' 
                  }]}>
                    Customer has accepted the IDD:
                  </Text>
                  <Text style={[styles.checklistItem, { 
                    fontSize: 8, 
                    fontWeight: 'normal', 
                    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
                    textAlign: 'right' 
                  }]}>
                    {invoiceData.customerAcceptedIdd || 'N/A'}
                  </Text>
                </View>
              </View>
            )}

            {/* Another Vertical Separator */}
            {invoiceData.saleType !== 'Trade' && invoiceData.invoiceTo === 'Finance Company' && (
            <View style={{ 
              height: 1, 
              backgroundColor: '#d0d0d0', 
              marginBottom: 8,
              marginHorizontal: 20
            }} /> )}


            <View style={{ marginTop: 30 }}>
              {invoiceData.terms.checklistTerms ? (
                <View>{renderHTMLContent(invoiceData.terms.checklistTerms , 8)}</View>
              ) : (
                <Text style={styles.termsPlaceholder}>
                  Standard vehicle handover checklist terms apply.
                </Text>
              )}
            </View>

           
            {/* Customer Signature Section - Part of Vehicle Checklist */}
            <View style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #d0d0d0', paddingBottom: 8, borderBottom: '1px solid #d0d0d0' }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 200, alignItems: 'center' }}>
                  {invoiceData.signature?.customerSignature ? (
                    <View style={{ alignItems: 'center' }}>
                      <Image
                        src={invoiceData.signature.customerSignature}
                        style={{ width: 150, height: 60, marginBottom: 8 }}
                      />
                      <Text style={{ fontSize: 12, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, marginBottom: 4 }}>
                        Customer Signature
                      </Text>
                      <Text style={{ marginTop: 32, fontSize: 8, fontFamily: CENTURY_GOTHIC_FONT_FAMILY }}>
                        Date: {invoiceData.signature?.dateOfSignature || '___________'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      {/* <View style={{ width: 150, height: 1, backgroundColor: '#000000', marginBottom: 8 }} /> */}
                      <Text style={{ marginTop: 25, fontSize: 8, fontFamily: CENTURY_GOTHIC_FONT_FAMILY }}>
                        Customer Signature: ___________________
                      </Text>
                      <Text style={{ marginTop: 36, fontSize: 8, fontFamily: CENTURY_GOTHIC_FONT_FAMILY }}>
                        Date: {invoiceData.signature?.dateOfSignature || '___________'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </PageWithBackground>
      )}

      {/* Page 3/4: Terms and Conditions */}
        {shouldShowSection('standard-terms') && (
        <PageWithBackground style={styles.page}>
          <View style={styles.avoidBreak}>
            {/* Grey banner header */}
            <View style={{ backgroundColor: '#f5f5f5', padding: 8, marginBottom: 10 }}>
              <Text style={[styles.pageTitle, { fontSize: 7, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold' }]}>
                TERMS AND CONDITIONS
            </Text>
            </View>
            <View style={styles.termsContent}>
              {invoiceData.terms.basicTerms ? (
                <View style={{ fontSize: 6 }}>{renderCompactHTMLContent(invoiceData.terms.basicTerms)}</View>
              ) : (
                <View>
                    <Text style={styles.termsParagraph}>No Terms and Conditions</Text>
                </View>
              )}
            </View>
          </View>
        </PageWithBackground>
      )}

      {/* Page 4/5: In-House Warranty */}
        {shouldShowSection('in-house-warranty') && invoiceData.saleType !== 'Trade' && (
        <PageWithBackground style={styles.page}>
            <View style={styles.avoidBreak}>
            {/* Grey banner header */}
            <View style={{ backgroundColor: '#f5f5f5', padding: 8, marginBottom: 10 }}>
              <Text style={[styles.pageTitle, { fontSize: 9, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold' }]}>
                IN-HOUSE ENGINE & TRANSMISSION WARRANTY
                </Text>
              </View>
              <View style={styles.termsContent}>
                {invoiceData.terms?.inHouseWarrantyTerms && invoiceData.terms.inHouseWarrantyTerms.trim() ? (
                  <View>
                    {/* Show that we have content */}
                    {renderHTMLContent(invoiceData.terms.inHouseWarrantyTerms , 7)}
                  </View>
                ) : (
                  <View>
                    <Text style={[styles.termsParagraph, { fontWeight: GLOBAL_FORMAT_CONFIG.fonts.weights.semibold, fontSize: GLOBAL_FORMAT_CONFIG.fonts.sizes.heading, marginBottom: GLOBAL_FORMAT_CONFIG.spacing.itemGap }]}>
                      WARRANTY COVERAGE
                    </Text>
                    <Text style={styles.termsParagraph}>
                      This warranty covers the engine and transmission components of your vehicle for the period specified in your invoice.
                    </Text>
                    
                    <Text style={[styles.termsParagraph, { fontWeight: 'semibold', fontSize: 9, marginBottom: 6, marginTop: 8 }]}>
                      WHAT IS COVERED
                    </Text>
                    <Text style={[styles.termsParagraph, { paddingLeft: 10 }]}>
                      • Engine block and internal components{'\n'}
                      • Transmission and gearbox{'\n'}
                      • Cooling system components{'\n'}
                      • Fuel system components
                    </Text>
                    
                    <Text style={[styles.termsParagraph, { fontWeight: 'semibold', fontSize: 9, marginBottom: 6, marginTop: 8 }]}>
                      WHAT IS NOT COVERED
                    </Text>
                    <Text style={[styles.termsParagraph, { paddingLeft: 10 }]}>
                      • Wear and tear items{'\n'}
                      • Damage due to misuse or neglect{'\n'}
                      • Consumable items (oil, filters, etc.){'\n'}
                      • Electrical components
                    </Text>
                    
                    <Text style={[styles.termsParagraph, { fontStyle: 'italic', marginTop: 12, textAlign: 'center', color: '#000' }]}>
                      [Full in-house warranty terms would be displayed here based on the custom terms stored in the database]
                    </Text>
                  </View>
                )}
                </View>
                </View>
        </PageWithBackground>
      )}

      {/* Page 5/6: External Warranty */}
        {shouldShowSection('external-warranty') && invoiceData.saleType !== 'Trade' && (
        <PageWithBackground style={styles.page}>
          <View style={styles.avoidBreak}>
            {/* Grey banner header */}
            <View style={{ backgroundColor: '#f5f5f5', padding: 8, marginBottom: 10 }}>
              <Text style={[styles.pageTitle, { fontSize: 9, fontFamily: CENTURY_GOTHIC_FONT_FAMILY, fontWeight: 'semibold' }]}>
                EXTERNAL WARRANTY{invoiceData.warranty.name ? ` — ${invoiceData.warranty.name.toUpperCase()}` : ''}
              </Text>
            </View>
            <View style={styles.termsContent}>
              {invoiceData.terms.thirdPartyTerms ? (
                <View>{renderHTMLContent(invoiceData.terms.thirdPartyTerms, 9)}</View>
              ) : (
                <View>
                  <Text style={styles.termsParagraph}>
                    No External Warranty
                  </Text>
                </View>
              )}
            </View>
          </View>
      </PageWithBackground>
      )}
    </Document>
  );
}
