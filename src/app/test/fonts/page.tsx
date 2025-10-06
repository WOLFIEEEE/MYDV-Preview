'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Eye, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Font Test Page
 * 
 * This page allows testing of Century Gothic fonts in PDF generation.
 * It provides options to preview and download a test PDF that demonstrates
 * all font variants and styles.
 */
export default function FontTestPage() {
  const [PDFViewer, setPDFViewer] = useState<any>(null);
  const [PDFDownloadLink, setPDFDownloadLink] = useState<any>(null);
  const [CenturyGothicTestPDF, setCenturyGothicTestPDF] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        const [pdfModule, testPDFModule] = await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/test/CenturyGothicTestPDF')
        ]);

        setPDFViewer(() => pdfModule.PDFViewer);
        setPDFDownloadLink(() => pdfModule.PDFDownloadLink);
        setCenturyGothicTestPDF(() => testPDFModule.default);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF components:', err);
        setError('Failed to load PDF components');
        setLoading(false);
      }
    };

    loadComponents();
  }, []);

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading font test components...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !PDFViewer || !PDFDownloadLink || !CenturyGothicTestPDF) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error Loading Font Test
            </CardTitle>
            <CardDescription>
              Failed to load the font test components. Please check the console for more details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Error: {error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Century Gothic Font Test
          </h1>
          <p className="text-gray-600">
            Test and verify that all Century Gothic font variants are properly registered and working in PDF generation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Font Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Font Information
              </CardTitle>
              <CardDescription>
                Century Gothic font variants available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Regular:</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
                <div className="flex justify-between">
                  <span>Italic:</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
                <div className="flex justify-between">
                  <span>Light:</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
                <div className="flex justify-between">
                  <span>Thin:</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
                <div className="flex justify-between">
                  <span>SemiBold:</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
                <div className="flex justify-between">
                  <span>SemiBold Italic:</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
                <div className="flex justify-between">
                  <span>Black:</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
                <div className="flex justify-between">
                  <span>ExtraBold Italic:</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Test Actions</CardTitle>
              <CardDescription>
                Preview or download the font test PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={handlePreview} 
                  className="w-full"
                  variant="default"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Font Test PDF
                </Button>
                
                {PDFDownloadLink && CenturyGothicTestPDF && (
                  <PDFDownloadLink
                    document={<CenturyGothicTestPDF />}
                    fileName="century-gothic-font-test.pdf"
                    className="w-full"
                  >
                    {({ loading: downloadLoading }: { loading: boolean }) => (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        disabled={downloadLoading}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {downloadLoading ? 'Generating PDF...' : 'Download Font Test PDF'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Preview */}
        {showPreview && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>PDF Preview</CardTitle>
                  <CardDescription>
                    Century Gothic font test document preview
                  </CardDescription>
                </div>
                <Button onClick={handleClosePreview} variant="outline" size="sm">
                  Close Preview
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden" style={{ height: '800px' }}>
                <PDFViewer width="100%" height="100%" showToolbar={true}>
                  <CenturyGothicTestPDF />
                </PDFViewer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>
              How to use this font test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">1. Preview the PDF</h4>
                <p className="text-gray-600">
                  Click "Preview Font Test PDF" to view the test document in your browser. 
                  This will show all Century Gothic font variants and styles.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Download for Testing</h4>
                <p className="text-gray-600">
                  Click "Download Font Test PDF" to save the test document to your computer. 
                  Open it in a PDF viewer to verify font rendering.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Verify Font Rendering</h4>
                <p className="text-gray-600">
                  Check that all font weights and styles display correctly. 
                  If any fonts appear as fallback fonts (like Arial or Helvetica), 
                  there may be an issue with font registration.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4. Implementation</h4>
                <p className="text-gray-600">
                  Once verified, the fonts can be used in your invoice PDFs by importing 
                  the font utilities from <code className="bg-gray-100 px-1 rounded">@/lib/fonts</code>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
