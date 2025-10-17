import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { currentUser } from '@clerk/nextjs/server';
import ProfessionalMatchingInvoicePDFDocument from '@/components/invoice/MatchingInvoicePDFDocument-professional';
import { ComprehensiveInvoiceData } from '@/app/api/invoice-data/route';

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the invoice data from request body
    const invoiceData: ComprehensiveInvoiceData = await request.json();

    if (!invoiceData) {
      return NextResponse.json(
        { success: false, error: 'Invoice data is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Generating COMPACT PDF for invoice:', invoiceData.invoiceNumber);
    console.log('📊 Invoice data preview:', {
      invoiceNumber: invoiceData.invoiceNumber,
      saleType: invoiceData.saleType,
      invoiceType: invoiceData.invoiceType,
      customerName: `${invoiceData.customer.firstName} ${invoiceData.customer.lastName}`,
      vehicleReg: invoiceData.vehicle.registration,
      salePrice: invoiceData.pricing.salePrice,
      warrantyInHouse: invoiceData.warranty.inHouse,
      warrantyLevel: invoiceData.warranty.level
    });

    // DEBUG: Check warranty terms data
    console.log('🔍 WARRANTY TERMS DEBUG:', {
      hasTermsObject: !!invoiceData.terms,
      hasInHouseWarrantyTerms: !!invoiceData.terms?.inHouseWarrantyTerms,
      inHouseWarrantyTermsLength: invoiceData.terms?.inHouseWarrantyTerms?.length || 0,
      inHouseWarrantyTermsPreview: invoiceData.terms?.inHouseWarrantyTerms?.substring(0, 100) + '...',
      allTermsKeys: invoiceData.terms ? Object.keys(invoiceData.terms) : 'No terms object'
    });

    // Calculate which pages will be included (for logging)
    const visiblePages = [
      { id: 1, title: 'Invoice Core', visible: true },
      { id: 2, title: 'Checklist/Disclaimer', visible: true },
      { id: 3, title: 'Standard T&Cs', visible: invoiceData.saleType !== 'Trade' },
      { id: 4, title: 'In-House Warranty (Engine)', visible: invoiceData.invoiceType === 'Retail (Customer) Invoice' && invoiceData.warranty.inHouse },
      { id: 5, title: 'In-House Warranty (Policy)', visible: invoiceData.invoiceType === 'Retail (Customer) Invoice' && invoiceData.warranty.inHouse },
      { id: 6, title: 'External Warranty', visible: !invoiceData.warranty.inHouse && invoiceData.warranty.level !== 'None Selected' }
    ].filter(page => page.visible);

    console.log('📄 PDF will include pages:', visiblePages.map(p => `${p.id}: ${p.title}`).join(', '));

    // Generate PDF buffer using compact matching component for exact preview compatibility
    const pdfBuffer = await renderToBuffer(
      ProfessionalMatchingInvoicePDFDocument({ invoiceData })
    );

    console.log('✅ COMPACT PDF generated successfully:', {
      invoiceNumber: invoiceData.invoiceNumber,
      bufferSize: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
      totalPages: visiblePages.length,
      optimization: 'Compact layout with reduced fonts and spacing',
      timestamp: new Date().toISOString()
    });

    // Create filename
    const filename = `${invoiceData.invoiceNumber}_${invoiceData.vehicle.registration}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Return PDF as response with Safari-compatible headers
    // @ts-ignore
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Safari-specific headers
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff',
        // CORS headers for blob URL support
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    
    // Detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET method for testing/debugging
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Dynamic Invoice PDF Generation API is ready',
    endpoint: '/api/dynamic-invoice-pdf',
    methods: ['POST'],
    description: 'Send ComprehensiveInvoiceData in POST body to generate PDF',
    timestamp: new Date().toISOString()
  });
}
