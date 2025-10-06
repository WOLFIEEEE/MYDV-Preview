import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
});

const TestDocument = () => (
  React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.section },
        React.createElement(Text, {}, 'Test PDF Generation')
      )
    )
  )
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Testing PDF generation...');
    
    const pdfBuffer = await renderToBuffer(TestDocument());
    
    console.log('✅ Test PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error generating test PDF:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate test PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

