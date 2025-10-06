import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import CenturyGothicTestPDF from '@/components/test/CenturyGothicTestPDF';

/**
 * API Route to test Century Gothic font PDF generation
 * 
 * This endpoint generates a test PDF with Century Gothic fonts
 * and returns it as a downloadable file.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Generating Century Gothic test PDF...');
    
    // Generate the PDF buffer
    const pdfBuffer = await renderToBuffer(React.createElement(CenturyGothicTestPDF));
    
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    // Return the PDF as a response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="century-gothic-test.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating Century Gothic test PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for testing with custom parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Generating Century Gothic test PDF with parameters:', body);
    
    // Generate the PDF buffer
    const pdfBuffer = await renderToBuffer(React.createElement(CenturyGothicTestPDF));
    
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    // Return the PDF as a response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="century-gothic-test.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating Century Gothic test PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
