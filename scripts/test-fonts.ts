#!/usr/bin/env tsx

/**
 * Font Test Script
 * 
 * This script tests the Century Gothic font implementation by generating
 * a test PDF and verifying that fonts are properly registered.
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { writeFileSync } from 'fs';
import { join } from 'path';
import CenturyGothicTestPDF from '../src/components/test/CenturyGothicTestPDF';
import { areFontsRegistered } from '../src/lib/fonts';

async function testFonts() {
  console.log('🎨 Century Gothic Font Test Script');
  console.log('================================');
  
  try {
    // Check if fonts are registered
    console.log('📋 Checking font registration...');
    const fontsRegistered = areFontsRegistered();
    console.log(`   Fonts registered: ${fontsRegistered ? '✅ Yes' : '❌ No'}`);
    
    // Generate test PDF
    console.log('📄 Generating test PDF...');
    const startTime = Date.now();
    
    const pdfBuffer = await renderToBuffer(React.createElement(CenturyGothicTestPDF));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`   PDF generated successfully in ${duration}ms`);
    console.log(`   PDF size: ${pdfBuffer.length} bytes`);
    
    // Save PDF to file
    const outputPath = join(process.cwd(), 'century-gothic-test-output.pdf');
    writeFileSync(outputPath, pdfBuffer);
    console.log(`   PDF saved to: ${outputPath}`);
    
    // Verify PDF content
    if (pdfBuffer.length > 0) {
      console.log('✅ Font test completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Open the generated PDF file to verify font rendering');
      console.log('2. Check that text displays in Century Gothic (not Arial/Helvetica)');
      console.log('3. Verify all font weights and styles are working');
      console.log('4. Test the web interface at /test/fonts');
    } else {
      console.log('❌ PDF generation failed - empty buffer');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Font test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Ensure font files exist in public/fonts/');
    console.log('2. Check that @react-pdf/renderer is properly installed');
    console.log('3. Verify font registration is working');
    console.log('4. Check console for additional error messages');
    
    process.exit(1);
  }
}

// Run the test
testFonts().catch(console.error);
