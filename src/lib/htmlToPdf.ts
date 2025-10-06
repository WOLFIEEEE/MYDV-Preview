/**
 * HTML to PDF conversion utility using browser's native print functionality
 * This approach doesn't require external services and works entirely client-side
 */

export interface PDFOptions {
  filename?: string;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  scale?: number;
}

export class HTMLToPDFConverter {
  private static defaultOptions: PDFOptions = {
    filename: 'invoice.pdf',
    format: 'A4',
    orientation: 'portrait',
    margins: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    scale: 1
  };

  /**
   * Convert HTML element to PDF using browser's print functionality
   */
  static async convertToPDF(element: HTMLElement, options: PDFOptions = {}): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check popup blocker settings.');
    }

    try {
      // Get the HTML content
      const htmlContent = element.innerHTML;
      
      // Create the print document
      const printDocument = this.createPrintDocument(htmlContent, opts);
      
      // Write to the print window
      printWindow.document.write(printDocument);
      printWindow.document.close();
      
      // Wait for content to load
      await this.waitForContentLoad(printWindow);
      
      // Focus and print
      printWindow.focus();
      
      // Use a small delay to ensure everything is rendered
      setTimeout(() => {
        printWindow.print();
        
        // Close the window after printing (optional)
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 250);
      
    } catch (error) {
      printWindow.close();
      throw error;
    }
  }

  /**
   * Create a complete HTML document for printing
   */
  private static createPrintDocument(content: string, options: PDFOptions): string {
    const { format, orientation, margins, scale } = options;
    
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${options.filename || 'Invoice'}</title>
          <style>
            /* Reset and base styles */
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Roboto', 'Arial', sans-serif;
              font-size: 10px;
              color: #141414;
              background-color: #ffffff;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* Page setup */
            @page {
              size: ${format} ${orientation};
              margin: ${margins?.top || '20mm'} ${margins?.right || '20mm'} ${margins?.bottom || '20mm'} ${margins?.left || '20mm'};
            }
            
            /* Print-specific styles */
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .no-print {
                display: none !important;
              }
              
              .page-break {
                page-break-before: always;
              }
              
              .avoid-break {
                page-break-inside: avoid;
              }
            }
            
            /* Invoice-specific styles */
            .invoice-container {
              max-width: 100%;
              margin: 0 auto;
              transform: scale(${scale || 1});
              transform-origin: top left;
            }
            
            /* Grid system */
            .grid {
              display: grid;
              gap: 1rem;
            }
            
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
            .grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
            .grid-cols-8 { grid-template-columns: repeat(8, minmax(0, 1fr)); }
            
            .col-span-1 { grid-column: span 1 / span 1; }
            .col-span-2 { grid-column: span 2 / span 2; }
            .col-span-3 { grid-column: span 3 / span 3; }
            .col-span-4 { grid-column: span 4 / span 4; }
            .col-span-5 { grid-column: span 5 / span 5; }
            
            .gap-2 { gap: 0.5rem; }
            .gap-4 { gap: 1rem; }
            .gap-8 { gap: 2rem; }
            
            /* Spacing */
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-8 { margin-bottom: 2rem; }
            
            .p-2 { padding: 0.5rem; }
            .p-4 { padding: 1rem; }
            .p-8 { padding: 2rem; }
            
            .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            
            /* Text alignment */
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            /* Background colors */
            .bg-gray { background-color: #f4f4f4; }
            .header-row { background-color: #e0e0e0; }
            
            /* Borders and dividers */
            .divider {
              height: 1px;
              background-color: #000000;
              margin: 4px 0;
            }
            
            .divider-light {
              height: 0.5px;
              background-color: #939393;
              margin: 1px 0;
            }
            
            /* Typography */
            .font-bold { font-weight: bold; }
            .font-cengothic { font-family: 'Century Gothic', sans-serif; }
            
            /* Images */
            img {
              max-width: 100%;
              height: auto;
            }
            
            /* Tables */
            table {
              width: 100%;
              border-collapse: collapse;
            }
            
            /* Remove interactive elements for print */
            .editable-field {
              border: none !important;
              background: transparent !important;
              cursor: default !important;
            }
            
            .editable-field:hover {
              background: transparent !important;
              border: none !important;
            }
            
            /* Ensure proper spacing */
            br {
              line-height: 1.6;
            }
            
            /* QR Code placeholder */
            .qr-placeholder {
              width: 80px;
              height: 80px;
              border: 1px solid #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              text-align: center;
              background-color: #f9f9f9;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            ${content}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Wait for content to load in the print window
   */
  private static waitForContentLoad(printWindow: Window): Promise<void> {
    return new Promise((resolve) => {
      if (printWindow.document.readyState === 'complete') {
        resolve();
      } else {
        printWindow.addEventListener('load', () => resolve());
      }
    });
  }

  /**
   * Generate PDF using modern browser APIs (if available)
   * This is a fallback method for browsers that support it
   */
  static async generatePDFBlob(element: HTMLElement, options: PDFOptions = {}): Promise<Blob | null> {
    // Check if the browser supports the modern print API
    if ('showSaveFilePicker' in window) {
      try {
        // This is experimental and may not work in all browsers
        const canvas = await this.htmlToCanvas(element);
        return this.canvasToPDF(canvas, options);
      } catch (error) {
        console.warn('Modern PDF generation failed, falling back to print method:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Convert HTML element to canvas (experimental)
   */
  private static async htmlToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
    // This would require html2canvas library or similar
    // For now, we'll throw an error to indicate it's not implemented
    throw new Error('Canvas conversion not implemented. Use convertToPDF method instead.');
  }

  /**
   * Convert canvas to PDF blob (experimental)
   */
  private static canvasToPDF(canvas: HTMLCanvasElement, options: PDFOptions): Blob {
    // This would require jsPDF or similar library
    // For now, we'll throw an error to indicate it's not implemented
    throw new Error('Canvas to PDF conversion not implemented. Use convertToPDF method instead.');
  }
}

// Export convenience function
export const convertHTMLToPDF = (element: HTMLElement, options?: PDFOptions) => {
  return HTMLToPDFConverter.convertToPDF(element, options);
};

export default HTMLToPDFConverter;
