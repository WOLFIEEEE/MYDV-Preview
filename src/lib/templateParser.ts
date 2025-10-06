import { First2PageTemplate, TemplateRow, TemplateElement, ConditionalLogic } from '@/types/template'

/**
 * Template Parser for First2Page.json
 * Converts the complex template structure into editable format
 */
export class TemplateParser {
  private template: First2PageTemplate
  private formData: Record<string, any>

  constructor(templateJson: string, formData: Record<string, any> = {}) {
    // Parse the JSON structure
    this.template = JSON.parse(templateJson)
    this.formData = formData
  }

  /**
   * Evaluate conditional logic
   */
  private evaluateCondition(condition: string): boolean {
    if (!condition) return true

    try {
      // URL decode the condition
      const decoded = decodeURIComponent(condition)
      const conditionObj: ConditionalLogic = JSON.parse(decoded)

      return this.evaluateConditionalLogic(conditionObj)
    } catch (error) {
      console.warn('Failed to evaluate condition:', condition, error)
      return true
    }
  }

  /**
   * Evaluate conditional logic object
   */
  private evaluateConditionalLogic(logic: ConditionalLogic): boolean {
    const { type, logic: logicType, conditional } = logic

    const results = conditional.map(cond => {
      const fieldValue = this.getFieldValue(cond.name)
      return this.evaluateRule(fieldValue, cond.rule, cond.value)
    })

    const conditionResult = logicType === 'all' 
      ? results.every(r => r)
      : results.some(r => r)

    return type === 'show' ? conditionResult : !conditionResult
  }

  /**
   * Get field value from form data
   */
  private getFieldValue(fieldName: string): any {
    // Extract field name from {Field Name:ID} format
    const match = fieldName.match(/\{([^:]+)(?::\d+)?\}/)
    if (!match) return ''

    const cleanFieldName = match[1].trim()
    
    // Map common field names to form data keys
    const fieldMapping: Record<string, string> = {
      'Invoice To': 'invoiceTo',
      'Finance Company': 'financeCompany',
      'Sale Type': 'saleType',
      'Invoice Type': 'invoiceType',
      'Discount On Sale Price': 'discountOnSalePrice',
      'Discount On Warranty': 'discountOnWarranty',
      'In house?': 'inHouse',
      'In House': 'inHouse',
      'Warranty Level': 'warrantyLevel',
      'Collection/Delivery': 'deliveryMethod',
      'Delivery Options': 'deliveryMethod',
      'Amount Paid in Deposit (F)': 'financeDepositAmount',
      'Amount Paid in Deposit (C)': 'customerDepositAmount',
      'Customer Signature': 'customerSignature',
      'Customer Available for Signature': 'customerAvailableForSignature',
      'Extras/Addons - Finance': 'financeAddonsEnabled',
      'Extras/Addons - Non-Finance': 'customerAddonsEnabled',
      'Finance add-on 1': 'financeAddon1',
      'Finance add-on 2': 'financeAddon2',
      'Customer add-on 1': 'customerAddon1',
      'Customer add-on 2': 'customerAddon2',
      'Left to Pay CUST': 'customerRemainingBalance',
      'Additional Comments/Information': 'additionalComments',
      'Warranty details for Customer': 'warrantyDetails'
    }

    const mappedKey = fieldMapping[cleanFieldName] || cleanFieldName.toLowerCase().replace(/\s+/g, '')
    return this.formData[mappedKey] || ''
  }

  /**
   * Evaluate individual rule
   */
  private evaluateRule(fieldValue: any, rule: string, compareValue: any): boolean {
    const value = String(fieldValue || '').trim()
    const compare = String(compareValue || '').trim()

    switch (rule) {
      case 'is':
        return value === compare
      case 'isnot':
        return value !== compare
      case 'contains':
        return value.includes(compare)
      case 'greater_than':
        const numValue = parseFloat(value.replace(/[£$,]/g, ''))
        const numCompare = parseFloat(compare.replace(/[£$,]/g, ''))
        return !isNaN(numValue) && !isNaN(numCompare) && numValue > numCompare
      case 'less_than':
        const numValue2 = parseFloat(value.replace(/[£$,]/g, ''))
        const numCompare2 = parseFloat(compare.replace(/[£$,]/g, ''))
        return !isNaN(numValue2) && !isNaN(numCompare2) && numValue2 < numCompare2
      default:
        return true
    }
  }

  /**
   * Get visible rows based on conditions
   */
  public getVisibleRows(): TemplateRow[] {
    const visibleRows: TemplateRow[] = []

    Object.entries(this.template.rows).forEach(([rowIndex, row]) => {
      if (this.evaluateCondition(row.condition || '')) {
        visibleRows.push({
          ...row,
          index: parseInt(rowIndex),
          elements: this.getVisibleElements(row)
        })
      }
    })

    return visibleRows
  }

  /**
   * Get visible elements within a row
   */
  private getVisibleElements(row: any): TemplateElement[] {
    const elements: TemplateElement[] = []

    Object.entries(row.columns || {}).forEach(([colIndex, column]: [string, any]) => {
      Object.entries(column.elements || {}).forEach(([elemIndex, element]: [string, any]) => {
        if (this.evaluateCondition(element.condition || '')) {
          elements.push({
            ...element,
            columnIndex: parseInt(colIndex),
            elementIndex: parseInt(elemIndex)
          })
        }
      })
    })

    return elements
  }

  /**
   * Get all form fields referenced in the template
   */
  public getFormFields(): string[] {
    const fields = new Set<string>()
    const templateStr = JSON.stringify(this.template)
    
    // Extract all field references in {Field Name:ID} format
    const fieldMatches = templateStr.match(/\{[^}]+\}/g) || []
    
    fieldMatches.forEach(match => {
      const fieldName = match.replace(/\{([^:]+)(?::\d+)?\}/, '$1').trim()
      if (fieldName && !fieldName.includes('"')) {
        fields.add(fieldName)
      }
    })

    return Array.from(fields).sort()
  }

  /**
   * Update form data and re-evaluate
   */
  public updateFormData(newData: Record<string, any>): void {
    this.formData = { ...this.formData, ...newData }
  }

  /**
   * Get current form data
   */
  public getFormData(): Record<string, any> {
    return { ...this.formData }
  }

  /**
   * Get template container styles
   */
  public getContainerStyles(): Record<string, string> {
    return this.template.container || {}
  }

  /**
   * Add new row to template
   */
  public addRow(afterIndex: number, rowData: Partial<TemplateRow>): void {
    const rows = this.template.rows
    const maxIndex = Math.max(...Object.keys(rows).map(k => parseInt(k)))
    const newIndex = maxIndex + 1

    // Shift existing rows if needed
    const sortedIndices = Object.keys(rows).map(k => parseInt(k)).sort((a, b) => b - a)
    
    for (const index of sortedIndices) {
      if (index > afterIndex) {
        rows[index + 1] = rows[index]
        delete rows[index]
      }
    }

    // Add new row
    rows[afterIndex + 1] = {
      style: rowData.style || {},
      attr: rowData.attr || {},
      type: rowData.type || 'row1',
      columns: rowData.columns || {},
      condition: rowData.condition || ''
    }
  }

  /**
   * Remove row from template
   */
  public removeRow(rowIndex: number): void {
    const rows = this.template.rows
    delete rows[rowIndex]

    // Reindex remaining rows
    const sortedIndices = Object.keys(rows).map(k => parseInt(k)).sort((a, b) => a - b)
    const newRows: Record<string, any> = {}

    sortedIndices.forEach((oldIndex, newIndex) => {
      newRows[newIndex] = rows[oldIndex]
    })

    this.template.rows = newRows
  }

  /**
   * Export template as JSON
   */
  public exportTemplate(): string {
    return JSON.stringify(JSON.stringify(this.template))
  }

  /**
   * Generate HTML from template rows
   */
  public generateHTML(): string {
    const visibleRows = this.getVisibleRows()
    const containerStyles = this.getContainerStyles()
    
    let html = '<div class="invoice-template" style="'
    
    // Apply container styles
    Object.entries(containerStyles).forEach(([key, value]) => {
      html += `${key}: ${value}; `
    })
    
    html += '">'
    
    // Process each visible row
    visibleRows.forEach(row => {
      html += this.generateRowHTML(row)
    })
    
    html += '</div>'
    
    return html
  }

  /**
   * Generate HTML for a single row
   */
  private generateRowHTML(row: TemplateRow): string {
    let rowHtml = '<div class="template-row" style="'
    
    // Apply row styles
    if (row.style) {
      Object.entries(row.style).forEach(([key, value]) => {
        rowHtml += `${key}: ${value}; `
      })
    }
    
    rowHtml += '">'
    
    // Process elements in the row
    if (row.elements && row.elements.length > 0) {
      row.elements.forEach(element => {
        rowHtml += this.generateElementHTML(element)
      })
    }
    
    rowHtml += '</div>'
    
    return rowHtml
  }

  /**
   * Generate HTML for a single element
   */
  private generateElementHTML(element: TemplateElement): string {
    let elementHtml = '<div class="template-element" style="'
    
    // Apply element styles
    if (element.container_style) {
      Object.entries(element.container_style).forEach(([key, value]) => {
        elementHtml += `${key}: ${value}; `
      })
    }
    
    elementHtml += '">'
    
    // Process element content
    let content = ''
    
    // Check for text content
    if (element.inner_attr) {
      const textContent = element.inner_attr['.text-content']?.html || 
                         element.inner_attr['.text-content-data']?.html_hide || ''
      
      if (textContent) {
        content = this.processTextContent(textContent)
      }
    }
    
    // If no content found, use empty content
    if (!content) {
      content = ''
    }
    
    elementHtml += content
    elementHtml += '</div>'
    
    return elementHtml
  }

  /**
   * Process text content and replace field placeholders
   */
  private processTextContent(content: string): string {
    // Replace field placeholders with actual values
    return content.replace(/\{([^}]+)\}/g, (match, fieldRef) => {
      const fieldName = fieldRef.split(':')[0].trim()
      const value = this.getFieldValue(`{${fieldRef}}`)
      return this.formatFieldValue(fieldName, value)
    })
  }

  /**
   * Format field value for display
   */
  private formatFieldValue(fieldName: string, value: any): string {
    if (value === null || value === undefined || value === '') {
      return ''
    }
    
    const str = String(value)
    
    // Format currency fields
    if (fieldName.toLowerCase().includes('price') || 
        fieldName.toLowerCase().includes('cost') || 
        fieldName.toLowerCase().includes('amount') ||
        fieldName.toLowerCase().includes('deposit') ||
        fieldName.toLowerCase().includes('balance')) {
      const num = parseFloat(str.replace(/[£$,]/g, ''))
      return isNaN(num) ? str : `£${num.toFixed(2)}`
    }
    
    // Format date fields
    if (fieldName.toLowerCase().includes('date')) {
      const date = new Date(str)
      return isNaN(date.getTime()) ? str : date.toLocaleDateString('en-GB')
    }
    
    // Format boolean fields
    if (str.toLowerCase() === 'true' || str.toLowerCase() === 'false') {
      return str.toLowerCase() === 'true' ? 'Yes' : 'No'
    }
    
    return str
  }
}

/**
 * Field value formatter for display
 */
export class FieldFormatter {
  static formatCurrency(value: any): string {
    const num = parseFloat(String(value || '0').replace(/[£$,]/g, ''))
    return isNaN(num) ? '£0.00' : `£${num.toFixed(2)}`
  }

  static formatDate(value: any): string {
    if (!value) return ''
    const date = new Date(value)
    return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-GB')
  }

  static formatBoolean(value: any): string {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    const str = String(value || '').toLowerCase()
    return ['true', 'yes', '1'].includes(str) ? 'Yes' : 'No'
  }

  static formatText(value: any): string {
    return String(value || '').trim()
  }
}

