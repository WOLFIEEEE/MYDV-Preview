import { Font } from '@react-pdf/renderer';
import path from 'path';

/**
 * Font Registration Utility for Century Gothic Fonts
 * 
 * This utility registers all Century Gothic font variants for use in React PDF documents.
 * The fonts are loaded from the public/fonts directory and registered with appropriate
 * font weights and styles for comprehensive typography support.
 * 
 * Also registers Helvetica as a fallback font for compatibility.
 */

// Font family name constants
export const CENTURY_GOTHIC_FONT_FAMILY = 'Century Gothic';
export const HELVETICA_FONT_FAMILY = 'Helvetica';

// Font registration status
let fontsRegistered = false;
let helveticaRegistered = false;

/**
 * Get font source path based on environment
 */
function getFontPath(filename: string): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use relative path
    return `/fonts/centurygothic/${filename}`;
  } else {
    // Node.js environment - use absolute path
    return path.join(process.cwd(), 'public', 'fonts', 'centurygothic', filename);
  }
}

/**
 * Register Helvetica as a fallback font using Century Gothic files
 * This ensures compatibility with components that still reference Helvetica
 */
export function registerHelveticaFallback(): void {
  if (helveticaRegistered) {
    console.log('Helvetica fallback already registered');
    return;
  }

  try {
    // Register Helvetica using Century Gothic files as fallback
    // Use a simpler registration to avoid font conflicts
    Font.register({
      family: HELVETICA_FONT_FAMILY,
      src: getFontPath('CenturyGothicPaneuropeanRegular.ttf'),
    });

    helveticaRegistered = true;
    console.log('Helvetica fallback registered successfully using Century Gothic Regular');
  } catch (error) {
    console.error('Error registering Helvetica fallback:', error);
    // Don't throw error for fallback registration failure
    console.warn('Continuing without Helvetica fallback - components should use Century Gothic directly');
  }
}

/**
 * Register all Century Gothic font variants
 * This function should be called once before generating any PDFs
 */
export function registerCenturyGothicFonts(): void {
  if (fontsRegistered) {
    console.log('Century Gothic fonts already registered');
    return;
  }

  try {
    // Register Century Gothic font family with all variants
    Font.register({
      family: CENTURY_GOTHIC_FONT_FAMILY,
      fonts: [
        // Thin variants
        {
          src: getFontPath('CenturyGothicPaneuropeanThin.ttf'),
          fontWeight: 100,
          fontStyle: 'normal',
        },
        {
          src: getFontPath('CenturyGothicPaneuropeanThinItalic.ttf'),
          fontWeight: 100,
          fontStyle: 'italic',
        },
        // Light variants
        {
          src: getFontPath('CenturyGothicPaneuropeanLight.ttf'),
          fontWeight: 300,
          fontStyle: 'normal',
        },
        {
          src: getFontPath('CenturyGothicPaneuropeanLightItalic.ttf'),
          fontWeight: 300,
          fontStyle: 'italic',
        },
        // Regular variants
        {
          src: getFontPath('CenturyGothicPaneuropeanRegular.ttf'),
          fontWeight: 400,
          fontStyle: 'normal',
        },
        {
          src: getFontPath('CenturyGothicPaneuropeanItalic.ttf'),
          fontWeight: 400,
          fontStyle: 'italic',
        },
        // SemiBold variants
        {
          src: getFontPath('CenturyGothicPaneuropeanSemiBold.ttf'),
          fontWeight: 600,
          fontStyle: 'normal',
        },
        {
          src: getFontPath('CenturyGothicPaneuropeanSemiBoldItalic.ttf'),
          fontWeight: 600,
          fontStyle: 'italic',
        },
        // Bold variants (now we have proper bold files!)
        {
          src: getFontPath('CenturyGothicPaneuropeanBold.ttf'),
          fontWeight: 700,
          fontStyle: 'normal',
        },
        {
          src: getFontPath('CenturyGothicPaneuropeanBoldItalic.ttf'),
          fontWeight: 700,
          fontStyle: 'italic',
        },
        // ExtraBold variants
        {
          src: getFontPath('CenturyGothicPaneuropeanExtraBold.ttf'),
          fontWeight: 800,
          fontStyle: 'normal',
        },
        {
          src: getFontPath('CenturyGothicPaneuropeanExtraBoldItalic.ttf'),
          fontWeight: 800,
          fontStyle: 'italic',
        },
        // Black variants
        {
          src: getFontPath('CenturyGothicPaneuropeanBlack.ttf'),
          fontWeight: 900,
          fontStyle: 'normal',
        },
        {
          src: getFontPath('CenturyGothicPaneuropeanBlackItalic.ttf'),
          fontWeight: 900,
          fontStyle: 'italic',
        },
      ],
    });

    fontsRegistered = true;
    console.log('Century Gothic fonts registered successfully');
    
    // Also register Helvetica fallback for compatibility (non-blocking)
    try {
      registerHelveticaFallback();
    } catch {
      console.warn('Helvetica fallback registration failed, but continuing with Century Gothic');
    }
  } catch (error) {
    console.error('Error registering Century Gothic fonts:', error);
    throw new Error('Failed to register Century Gothic fonts');
  }
}

/**
 * Get font weight mapping for Century Gothic variants
 * Using consistent numeric values for better React PDF compatibility
 */
export const centuryGothicWeights = {
  thin: 100,
  light: 300,
  normal: 400,
  regular: 400,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

/**
 * Get font style mapping for Century Gothic variants
 */
export const centuryGothicStyles = {
  normal: 'normal' as const,
  italic: 'italic' as const,
} as const;

/**
 * Helper function to get Century Gothic font style object
 * @param weight - Font weight (thin, light, normal, semibold, bold, extrabold, black)
 * @param style - Font style (normal, italic)
 * @returns Style object for React PDF
 */
export function getCenturyGothicStyle(
  weight: keyof typeof centuryGothicWeights = 'normal',
  style: keyof typeof centuryGothicStyles = 'normal'
) {
  return {
    fontFamily: CENTURY_GOTHIC_FONT_FAMILY,
    fontWeight: centuryGothicWeights[weight],
    fontStyle: centuryGothicStyles[style],
  };
}

/**
 * Predefined Century Gothic styles for common use cases
 * Now with complete italic support for all weights!
 */
export const centuryGothicStyles_predefined = {
  // Headers
  title: getCenturyGothicStyle('black', 'normal'),
  titleItalic: getCenturyGothicStyle('black', 'italic'),
  heading: getCenturyGothicStyle('bold', 'normal'),
  headingItalic: getCenturyGothicStyle('bold', 'italic'),
  subheading: getCenturyGothicStyle('semibold', 'normal'),
  subheadingItalic: getCenturyGothicStyle('semibold', 'italic'),
  
  // Body text
  body: getCenturyGothicStyle('normal', 'normal'),
  bodyItalic: getCenturyGothicStyle('normal', 'italic'),
  bodyLight: getCenturyGothicStyle('light', 'normal'),
  bodyLightItalic: getCenturyGothicStyle('light', 'italic'),
  bodyThin: getCenturyGothicStyle('thin', 'normal'),
  bodyThinItalic: getCenturyGothicStyle('thin', 'italic'),
  
  // Emphasis
  bold: getCenturyGothicStyle('bold', 'normal'),
  boldItalic: getCenturyGothicStyle('bold', 'italic'),
  semibold: getCenturyGothicStyle('semibold', 'normal'),
  semiboldItalic: getCenturyGothicStyle('semibold', 'italic'),
  extrabold: getCenturyGothicStyle('extrabold', 'normal'),
  extraboldItalic: getCenturyGothicStyle('extrabold', 'italic'),
  
  // Legacy aliases for backward compatibility
  lightItalic: getCenturyGothicStyle('light', 'italic'),
};

/**
 * Check if Century Gothic fonts are registered
 */
export function areFontsRegistered(): boolean {
  return fontsRegistered;
}

/**
 * Check if Helvetica fallback is registered
 */
export function isHelveticaRegistered(): boolean {
  return helveticaRegistered;
}

/**
 * Register all fonts (Century Gothic + Helvetica fallback)
 * This is the main function to call for complete font setup
 */
export function registerAllFonts(): void {
  registerCenturyGothicFonts();
  if (!helveticaRegistered) {
    registerHelveticaFallback();
  }
}

/**
 * Reset font registration status (useful for testing)
 */
export function resetFontRegistration(): void {
  fontsRegistered = false;
  helveticaRegistered = false;
}
