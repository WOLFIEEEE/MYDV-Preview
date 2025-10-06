import { generate } from '@pdfme/generator'
import { text, image, line } from '@pdfme/schemas'
import { TemplateParser, FieldFormatter } from './templateParser'

/**
 * Dynamic PDF Service for First2Page template system
 * Generates PDFs with conditional business logic
 */

interface PDFElement {
  type: 'text' | 'image' | 'line' | 'signature'
  content: string
  position: { x: number; y: number }
  width: number
  height: number
  style?: Record<string, any>
}

interface PDFPage {
  elements: PDFElement[]
  pageNumber: number
}

/**
 * Generate PDF using dynamic template with conditional logic
 */
export async function generateDynamicInvoicePDF(
  templateJson: string,
  formData: Record<string, any>
): Promise<Uint8Array> {
  try {
    // Parse template with form data
    const parser = new TemplateParser(templateJson, formData)
    const visibleRows = parser.getVisibleRows()
    const containerStyles = parser.getContainerStyles()

    // Convert template to PDFme format
    const pdfmeTemplate = await convertToPDFmeTemplate(visibleRows, containerStyles, formData)
    
    // Generate PDF
    const plugins = { text, image, line }
    const pdf = await generate({
      template: pdfmeTemplate,
      inputs: [{}], // Data is already embedded in template
      plugins
    })

    return pdf
  } catch (error) {
    console.error('Error generating dynamic PDF:', error)
    throw error
  }
}

/**
 * Convert First2Page template to PDFme format
 */
async function convertToPDFmeTemplate(
  visibleRows: any[],
  containerStyles: Record<string, string>,
  formData: Record<string, any>
): Promise<any> {
  const schemas: any[] = []
  let currentY = parseFloat(containerStyles['padding-top'] || '20')
  
  // Process each visible row
  for (const row of visibleRows) {
    const rowElements = await processRow(row, currentY, formData)
    schemas.push(...rowElements)
    
    // Calculate next Y position
    const rowHeight = calculateRowHeight(row)
    currentY += rowHeight + 5 // Add spacing between rows
  }

  return {
    schemas: [schemas],
    basePdf: {
      width: 210, // A4 width in mm
      height: 297, // A4 height in mm
      padding: [20, 10, 20, 10]
    }
  }
}

/**
 * Process a single row and convert to PDFme elements
 */
async function processRow(
  row: any,
  startY: number,
  formData: Record<string, any>
): Promise<any[]> {
  const elements: any[] = []
  const columnCount = Object.keys(row.columns || {}).length
  const pageWidth = 170 // Available width after padding
  const columnWidth = pageWidth / Math.max(columnCount, 1)

  let columnIndex = 0
  
  for (const [colKey, column] of Object.entries(row.columns || {})) {
    const columnX = 20 + (columnIndex * columnWidth) // Start from left margin
    
    for (const [elemKey, element] of Object.entries((column as any).elements || {})) {
      const pdfElement = await convertElementToPDFme(
        element as any,
        columnX,
        startY,
        columnWidth,
        formData
      )
      
      if (pdfElement) {
        elements.push(pdfElement)
      }
    }
    
    columnIndex++
  }

  return elements
}

/**
 * Convert template element to PDFme format
 */
async function convertElementToPDFme(
  element: any,
  x: number,
  y: number,
  width: number,
  formData: Record<string, any>
): Promise<any | null> {
  const elementId = `elem_${Math.random().toString(36).substr(2, 9)}`
  
  switch (element.type) {
    case 'text':
      return {
        [elementId]: {
          type: 'text',
          content: processTextContent(element, formData),
          position: { x, y },
          width,
          height: calculateTextHeight(element),
          fontSize: parseFloat(element.inner_style?.['.text-content']?.['font-size'] || '10'),
          fontColor: element.inner_style?.['.text-content']?.color || '#000000',
          alignment: element.container_style?.['text-align'] || 'left',
          fontName: 'Roboto'
        }
      }
    
    case 'image':
      return {
        [elementId]: {
          type: 'image',
          content: element.inner_attr?.img?.src || '',
          position: { x, y },
          width: Math.min(width, 50),
          height: 30
        }
      }
    
    case 'divider':
      return {
        [elementId]: {
          type: 'line',
          position: { x, y },
          width,
          height: 1,
          color: element.inner_style?.['.builder-hr']?.['background-color'] || '#000000'
        }
      }
    
    case 'signature':
      const signatureData = formData[element.inner_attr?.img?.['data-field']?.replace(/[{}]/g, '') || '']
      return {
        [elementId]: {
          type: signatureData ? 'image' : 'text',
          content: signatureData || 'Signature: _________________',
          position: { x, y },
          width,
          height: 20,
          fontSize: 10,
          fontColor: '#000000'
        }
      }
    
    default:
      return null
  }
}

/**
 * Process text content and replace field placeholders
 */
function processTextContent(element: any, formData: Record<string, any>): string {
  let content = element.inner_attr?.['.text-content']?.html || 
                element.inner_attr?.['.text-content-data']?.html_hide || ''
  
  // Remove HTML tags
  content = content.replace(/<[^>]*>/g, '')
  
  // Replace field placeholders
  content = content.replace(/\{([^}]+)\}/g, (match: string, fieldRef: string) => {
    const fieldName = fieldRef.split(':')[0].trim()
    const value = getFieldValue(fieldName, formData)
    return formatFieldValue(fieldName, value)
  })
  
  return content
}

/**
 * Get field value from form data
 */
function getFieldValue(fieldName: string, formData: Record<string, any>): any {
  // Field name mapping
  const fieldMapping: Record<string, string> = {
    'Invoice Number': 'invoiceNumber',
    'Date of Sale': 'dateOfSale',
    'Sale Price': 'salePrice',
    'Sale Price Post-Discount': 'salePricePostDiscount',
    'Vehicle Registration': 'vehicleRegistration',
    'Make': 'make',
    'Model': 'model',
    'First Name': 'firstName',
    'Last Name': 'lastName',
    'Title': 'title',
    'Email Address': 'email',
    'Contact Number': 'phone',
    'Warranty Level': 'warrantyLevel',
    'Warranty Price': 'warrantyPrice',
    'In House': 'inHouse',
    'Delivery Cost': 'deliveryCost',
    'Finance Company': 'financeCompany',
    'Discount on Sale Price': 'discountOnSalePrice',
    'Discount on Warranty Price': 'discountOnWarranty',
    'Balance to Finance': 'balanceToFinance',
    'Customer Balance Due': 'customerBalanceDue',
    'Mileage': 'mileage',
    'Colour': 'colour',
    'VIN': 'vin',
    'Derivative': 'derivative'
  }

  const mappedKey = fieldMapping[fieldName] || fieldName.toLowerCase().replace(/\s+/g, '')
  return formData[mappedKey] || ''
}

/**
 * Format field value based on field type
 */
function formatFieldValue(fieldName: string, value: any): string {
  // Currency fields
  if (fieldName.toLowerCase().includes('price') || 
      fieldName.toLowerCase().includes('cost') || 
      fieldName.toLowerCase().includes('balance')) {
    return FieldFormatter.formatCurrency(value)
  }
  
  // Date fields
  if (fieldName.toLowerCase().includes('date')) {
    return FieldFormatter.formatDate(value)
  }
  
  // Boolean fields
  if (fieldName.toLowerCase().includes('house') || 
      fieldName.toLowerCase().includes('available')) {
    return FieldFormatter.formatBoolean(value)
  }
  
  return FieldFormatter.formatText(value)
}

/**
 * Calculate text height based on content and font size
 */
function calculateTextHeight(element: any): number {
  const fontSize = parseFloat(element.inner_style?.['.text-content']?.['font-size'] || '10')
  const content = element.inner_attr?.['.text-content']?.html || ''
  const lineCount = (content.match(/<br>/g) || []).length + 1
  
  return Math.max(fontSize * 0.35 * lineCount, 8) // Convert pt to mm approximately
}

/**
 * Calculate row height
 */
function calculateRowHeight(row: any): number {
  let maxHeight = 0
  
  for (const column of Object.values(row.columns || {})) {
    for (const element of Object.values((column as any).elements || {})) {
      const elementHeight = calculateTextHeight(element as any)
      maxHeight = Math.max(maxHeight, elementHeight)
    }
  }
  
  return Math.max(maxHeight, 10)
}

/**
 * Calculate totals and derived values
 */
export function calculateInvoiceTotals(formData: Record<string, any>): Record<string, any> {
  const salePrice = parseFloat(String(formData.salePrice || '0').replace(/[£$,]/g, ''))
  const discountOnSalePrice = parseFloat(String(formData.discountOnSalePrice || '0').replace(/[£$,]/g, ''))
  const warrantyPrice = parseFloat(String(formData.warrantyPrice || '0').replace(/[£$,]/g, ''))
  const discountOnWarranty = parseFloat(String(formData.discountOnWarranty || '0').replace(/[£$,]/g, ''))
  const deliveryCost = parseFloat(String(formData.deliveryCost || '0').replace(/[£$,]/g, ''))
  
  const salePricePostDiscount = salePrice - discountOnSalePrice
  const warrantyPricePostDiscount = warrantyPrice - discountOnWarranty
  const subtotal = salePricePostDiscount + warrantyPricePostDiscount + deliveryCost
  
  // VAT calculation - Used cars are VAT-exempt regardless of sale type
  const vatRate = 0.00 // Used cars are VAT-exempt (0% VAT)
  const vatAmount = subtotal * vatRate
  const total = subtotal + vatAmount
  
  return {
    ...formData,
    salePricePostDiscount,
    warrantyPricePostDiscount,
    subtotal,
    vatAmount,
    total,
    balanceToFinance: formData.invoiceTo === 'Finance Company' ? total : 0,
    customerBalanceDue: formData.invoiceTo === 'Customer' ? total : 0
  }
}

/**
 * Validate form data before PDF generation
 */
export function validateInvoiceData(formData: Record<string, any>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields
  const requiredFields = [
    'invoiceNumber',
    'dateOfSale',
    'firstName',
    'lastName',
    'vehicleRegistration',
    'make',
    'model',
    'salePrice'
  ]
  
  for (const field of requiredFields) {
    if (!formData[field] || String(formData[field]).trim() === '') {
      errors.push(`${field} is required`)
    }
  }
  
  // Validate email format
  if (formData.email && !/^[^@]+@[^@]+\.[^@]+$/.test(formData.email)) {
    errors.push('Invalid email format')
  }
  
  // Validate numeric fields
  const numericFields = ['salePrice', 'warrantyPrice', 'deliveryCost']
  for (const field of numericFields) {
    if (formData[field] && isNaN(parseFloat(String(formData[field]).replace(/[£$,]/g, '')))) {
      errors.push(`${field} must be a valid number`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

