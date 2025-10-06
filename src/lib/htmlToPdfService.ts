/**
 * HTML to PDF Service for Enterprise Invoice Editor
 * Converts the editable HTML invoice directly to PDF
 */

export interface PDFOptions {
  filename?: string
  format?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  scale?: number
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
}

/**
 * Convert HTML element to PDF using browser's print functionality
 */
export async function convertHTMLElementToPDF(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  const {
    filename = 'invoice.pdf',
    format = 'A4',
    orientation = 'portrait',
    margins = {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    scale = 1,
    displayHeaderFooter = false,
    headerTemplate = '',
    footerTemplate = ''
  } = options

  try {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups.')
    }

    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement
    
    // Remove any editing indicators or interactive elements
    const editableElements = clonedElement.querySelectorAll('[contenteditable], input, select, textarea')
    editableElements.forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        const span = document.createElement('span')
        span.textContent = (el as HTMLInputElement).value || (el as HTMLElement).textContent || ''
        span.className = (el as HTMLElement).className
        el.parentNode?.replaceChild(span, el)
      } else {
        el.removeAttribute('contenteditable')
        el.classList.remove('hover:bg-blue-50', 'cursor-pointer', 'border-blue-500')
      }
    })

    // Create the HTML document for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
          <style>
            * {
              box-sizing: border-box;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: 'Roboto', Arial, sans-serif;
              font-size: 10px;
              color: #141414;
              line-height: 1.4;
              background: white;
            }
            
            .invoice-container {
              max-width: none;
              margin: 0;
              padding: 20px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
            }
            
            th, td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
            }
            
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            
            .text-right {
              text-align: right;
            }
            
            .text-center {
              text-align: center;
            }
            
            .font-semibold {
              font-weight: 600;
            }
            
            .font-bold {
              font-weight: bold;
            }
            
            .bg-gray-200 {
              background-color: #e5e7eb;
            }
            
            .bg-gray-100 {
              background-color: #f3f4f6;
            }
            
            .bg-gray-50 {
              background-color: #f9fafb;
            }
            
            .border {
              border: 1px solid #d1d5db;
            }
            
            .border-gray-300 {
              border-color: #d1d5db;
            }
            
            .border-gray-400 {
              border-color: #9ca3af;
            }
            
            .border-b {
              border-bottom: 1px solid;
            }
            
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-6 { margin-bottom: 24px; }
            .mt-8 { margin-top: 32px; }
            
            .p-2 { padding: 8px; }
            .p-4 { padding: 16px; }
            
            .text-xs { font-size: 9px; }
            .text-sm { font-size: 11px; }
            
            .text-gray-600 { color: #4b5563; }
            
            .space-y-1 > * + * { margin-top: 4px; }
            
            .flex {
              display: flex;
            }
            
            .justify-between {
              justify-content: space-between;
            }
            
            .items-start {
              align-items: flex-start;
            }
            
            .flex-1 {
              flex: 1;
            }
            
            img {
              max-width: 100%;
              height: auto;
            }
            
            /* Print-specific styles */
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              
              .invoice-container {
                padding: 0;
              }
              
              /* Ensure page breaks work properly */
              .page-break {
                page-break-before: always;
              }
              
              /* Hide any remaining interactive elements */
              button, input, select, textarea {
                display: none !important;
              }
            }
            
            /* Page size and margins */
            @page {
              size: ${format} ${orientation};
              margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            ${clonedElement.innerHTML}
          </div>
          
          <script>
            // Auto-print when the page loads
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
            
            // Handle print dialog events
            window.onbeforeprint = function() {
              console.log('Preparing to print...');
            };
            
            window.onafterprint = function() {
              console.log('Print dialog closed');
              window.close();
            };
          </script>
        </body>
      </html>
    `

    // Write the content to the print window
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Focus the print window
    printWindow.focus()

  } catch (error) {
    console.error('Error converting HTML to PDF:', error)
    throw error
  }
}

/**
 * Alternative PDF generation using modern browser APIs
 */
export async function generatePDFFromHTML(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<Blob> {
  const {
    format = 'A4',
    orientation = 'portrait',
    margins = {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  } = options

  // Check if the browser supports the modern approach
  if ('showSaveFilePicker' in window) {
    try {
      // Use the File System Access API for modern browsers
      return await generatePDFModern(element, options)
    } catch (error) {
      console.warn('Modern PDF generation failed, falling back to print method:', error)
    }
  }

  // Fallback to print method
  await convertHTMLElementToPDF(element, options)
  return new Blob() // Return empty blob as the print method handles the download
}

/**
 * Modern PDF generation using File System Access API
 */
async function generatePDFModern(
  element: HTMLElement,
  options: PDFOptions
): Promise<Blob> {
  // This would require a more sophisticated implementation
  // For now, we'll use the print method as it's more universally supported
  throw new Error('Modern PDF generation not yet implemented')
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Prepare element for PDF generation by cleaning up interactive elements
 */
export function prepareElementForPDF(element: HTMLElement): HTMLElement {
  const cloned = element.cloneNode(true) as HTMLElement
  
  // Remove interactive classes and attributes
  const interactiveElements = cloned.querySelectorAll('[contenteditable], .cursor-pointer, .hover\\:bg-blue-50')
  interactiveElements.forEach(el => {
    el.removeAttribute('contenteditable')
    el.classList.remove('cursor-pointer', 'hover:bg-blue-50', 'hover:border', 'hover:border-blue-200')
    
    // Remove click handlers
    const newEl = el.cloneNode(true)
    el.parentNode?.replaceChild(newEl, el)
  })
  
  // Convert input fields to text
  const inputs = cloned.querySelectorAll('input, select, textarea')
  inputs.forEach(input => {
    const span = document.createElement('span')
    span.textContent = (input as HTMLInputElement).value || ''
    span.className = (input as HTMLElement).className
    input.parentNode?.replaceChild(span, input)
  })
  
  return cloned
}

/**
 * Validate HTML element before PDF generation
 */
export function validateElementForPDF(element: HTMLElement): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check if element exists
  if (!element) {
    errors.push('No element provided for PDF generation')
    return { isValid: false, errors }
  }
  
  // Check if element has content
  if (!element.innerHTML.trim()) {
    errors.push('Element has no content to convert to PDF')
  }
  
  // Check for required invoice fields
  const requiredFields = ['invoiceNumber', 'dateOfSale', 'vehicleRegistration']
  requiredFields.forEach(field => {
    const fieldElement = element.querySelector(`[data-field="${field}"]`)
    if (!fieldElement || !fieldElement.textContent?.trim()) {
      errors.push(`Required field missing: ${field}`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}


