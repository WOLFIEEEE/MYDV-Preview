'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Download, 
  Save, 
  Eye, 
  EyeOff,
  RefreshCw,
  ArrowLeft,
  Plus,
  Minus
} from 'lucide-react'
import { TemplateParser } from '@/lib/templateParser'
import { convertHTMLElementToPDF, validateElementForPDF } from '@/lib/htmlToPdfService'
import { toast } from 'sonner'

interface EditableInvoiceHTMLProps {
  initialData?: Record<string, any>
  onSave?: (data: Record<string, any>) => void
  onClose?: () => void
}

interface EditableField {
  id: string
  value: string
  type: 'text' | 'currency' | 'date' | 'select' | 'textarea'
  options?: string[]
  placeholder?: string
}

interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  type: 'vehicle' | 'warranty' | 'delivery' | 'addon' | 'custom'
}

export default function EditableInvoiceHTML({ 
  initialData = {}, 
  onSave, 
  onClose 
}: EditableInvoiceHTMLProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData)
  const [templateParser, setTemplateParser] = useState<TemplateParser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState<string>('')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const invoiceRef = useRef<HTMLDivElement>(null)

  // Initialize template parser
  useEffect(() => {
    const initializeTemplate = async () => {
      try {
        setIsLoading(true)
        
        const response = await fetch('/First2Page.json')
        if (!response.ok) {
          throw new Error('Failed to load template')
        }
        
        const templateJson = await response.text()
        const parser = new TemplateParser(templateJson, initialData)
        
        setTemplateParser(parser)
        initializeLineItems(initialData)
        
      } catch (error) {
        console.error('Failed to initialize template:', error)
        toast.error('Failed to load invoice template')
      } finally {
        setIsLoading(false)
      }
    }

    initializeTemplate()
  }, [])

  // Initialize line items from form data
  const initializeLineItems = (data: Record<string, any>) => {
    const items: InvoiceLineItem[] = []

    // Vehicle line item
    if (data.make && data.model) {
      items.push({
        id: 'vehicle',
        description: `${data.make} ${data.model} ${data.derivative || ''}`.trim(),
        quantity: 1,
        unitPrice: parseFloat(data.salePrice || '0'),
        discount: parseFloat(data.discountOnSalePrice || '0'),
        total: parseFloat(data.salePricePostDiscount || data.salePrice || '0'),
        type: 'vehicle'
      })
    }

    // Warranty line item
    if (data.warrantyPrice && parseFloat(data.warrantyPrice) > 0) {
      items.push({
        id: 'warranty',
        description: `${data.warrantyLevel || 'Warranty'} ${data.inHouse ? '(In-House)' : ''}`,
        quantity: 1,
        unitPrice: parseFloat(data.warrantyPrice || '0'),
        discount: parseFloat(data.discountOnWarranty || '0'),
        total: parseFloat(data.warrantyPricePostDiscount || data.warrantyPrice || '0'),
        type: 'warranty'
      })
    }

    // Delivery line item
    if (data.deliveryMethod === 'Delivery' && data.deliveryCost && parseFloat(data.deliveryCost) > 0) {
      items.push({
        id: 'delivery',
        description: 'Delivery',
        quantity: 1,
        unitPrice: parseFloat(data.deliveryCost || '0'),
        discount: 0,
        total: parseFloat(data.deliveryCost || '0'),
        type: 'delivery'
      })
    }

    // Add-on line items
    if (data.financeAddon1) {
      items.push({
        id: 'finance_addon_1',
        description: data.financeAddon1,
        quantity: 1,
        unitPrice: parseFloat(data.financeAddon1Cost || '0'),
        discount: 0,
        total: parseFloat(data.financeAddon1Cost || '0'),
        type: 'addon'
      })
    }

    if (data.financeAddon2) {
      items.push({
        id: 'finance_addon_2',
        description: data.financeAddon2,
        quantity: 1,
        unitPrice: parseFloat(data.financeAddon2Cost || '0'),
        discount: 0,
        total: parseFloat(data.financeAddon2Cost || '0'),
        type: 'addon'
      })
    }

    if (data.customerAddon1) {
      items.push({
        id: 'customer_addon_1',
        description: data.customerAddon1,
        quantity: 1,
        unitPrice: parseFloat(data.customerAddon1Cost || '0'),
        discount: 0,
        total: parseFloat(data.customerAddon1Cost || '0'),
        type: 'addon'
      })
    }

    if (data.customerAddon2) {
      items.push({
        id: 'customer_addon_2',
        description: data.customerAddon2,
        quantity: 1,
        unitPrice: parseFloat(data.customerAddon2Cost || '0'),
        discount: 0,
        total: parseFloat(data.customerAddon2Cost || '0'),
        type: 'addon'
      })
    }

    setLineItems(items)
  }

  // Update form data
  const updateFormData = useCallback((field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    
    if (templateParser) {
      templateParser.updateFormData(newData)
    }
  }, [formData, templateParser])

  // Start editing a field
  const startEditing = (fieldId: string, currentValue: string) => {
    setEditingField(fieldId)
    setTempValue(currentValue)
  }

  // Save field edit
  const saveFieldEdit = (fieldId: string) => {
    updateFormData(fieldId, tempValue)
    setEditingField(null)
    setTempValue('')
  }

  // Cancel field edit
  const cancelFieldEdit = () => {
    setEditingField(null)
    setTempValue('')
  }

  // Handle key press in editing
  const handleKeyPress = (e: React.KeyboardEvent, fieldId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveFieldEdit(fieldId)
    } else if (e.key === 'Escape') {
      cancelFieldEdit()
    }
  }

  // Generate PDF
  const handleGeneratePDF = async () => {
    if (!invoiceRef.current) {
      toast.error('Invoice content not ready for PDF generation')
      return
    }

    try {
      setIsGeneratingPDF(true)
      
      // Validate the invoice content
      const validation = validateElementForPDF(invoiceRef.current)
      if (!validation.isValid) {
        toast.error(`Cannot generate PDF: ${validation.errors.join(', ')}`)
        return
      }
      
      // Generate PDF from HTML
      await convertHTMLElementToPDF(invoiceRef.current, {
        filename: `invoice-${formData.invoiceNumber || 'draft'}.pdf`,
        format: 'A4',
        orientation: 'portrait',
        margins: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      })
      
      toast.success('PDF generated successfully')
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      toast.error('Failed to generate PDF. Please check your browser settings and allow popups.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Save data
  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave(formData)
      }
      toast.success('Invoice saved successfully')
    } catch (error) {
      console.error('Failed to save invoice:', error)
      toast.error('Failed to save invoice')
    }
  }

  // Render editable field
  const renderEditableField = (fieldId: string, value: string, type: 'text' | 'currency' | 'date' | 'select' | 'textarea' = 'text', options?: string[]) => {
    const isEditing = editingField === fieldId
    const displayValue = value || 'Click to edit'
    
    if (isEditing) {
      switch (type) {
        case 'select':
          return (
            <Select 
              value={tempValue} 
              onValueChange={(val) => {
                setTempValue(val)
                saveFieldEdit(fieldId)
              }}
            >
              <SelectTrigger className="inline-flex h-auto min-h-[1.5rem] p-1 border-2 border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options?.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        
        case 'textarea':
          return (
            <Textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, fieldId)}
              onBlur={() => saveFieldEdit(fieldId)}
              className="inline-flex min-h-[1.5rem] p-1 border-2 border-blue-500 resize-none"
              rows={2}
              autoFocus
            />
          )
        
        case 'currency':
          return (
            <Input
              type="text"
              value={tempValue}
              onChange={(e) => {
                // Allow more flexible input handling
                const value = e.target.value.replace(/[^0-9.-]/g, '');
                setTempValue(value);
              }}
              onKeyDown={(e) => handleKeyPress(e, fieldId)}
              onBlur={() => saveFieldEdit(fieldId)}
              className="inline-flex h-auto min-h-[1.5rem] p-1 border-2 border-blue-500 w-auto min-w-[100px]"
              placeholder="0.00"
              autoFocus
              // Prevent input restrictions that cause one-digit-at-a-time issues
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                const inputEvent = e.nativeEvent as InputEvent;
                // Allow normal typing behavior
                if (target.value === '0' && inputEvent.data !== '0') {
                  target.setSelectionRange(target.value.length, target.value.length);
                }
              }}
            />
          )
        
        case 'date':
          return (
            <Input
              type="date"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, fieldId)}
              onBlur={() => saveFieldEdit(fieldId)}
              className="inline-flex h-auto min-h-[1.5rem] p-1 border-2 border-blue-500 w-auto"
              autoFocus
            />
          )
        
        default:
          return (
            <Input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, fieldId)}
              onBlur={() => saveFieldEdit(fieldId)}
              className="inline-flex h-auto min-h-[1.5rem] p-1 border-2 border-blue-500 w-auto min-w-[100px]"
              autoFocus
            />
          )
      }
    }

    return (
      <span
        onClick={() => startEditing(fieldId, value)}
        className={`inline-block min-w-[50px] min-h-[1.2rem] px-1 py-0.5 rounded cursor-pointer transition-colors ${
          value 
            ? 'hover:bg-blue-50 hover:border hover:border-blue-200' 
            : 'bg-gray-100 text-gray-500 hover:bg-blue-50 border border-dashed border-gray-300'
        }`}
        title="Click to edit"
      >
        {type === 'currency' && value ? `£${parseFloat(value || '0').toFixed(2)}` : displayValue}
      </span>
    )
  }

  // Format currency
  const formatCurrency = (value: any) => {
    const num = parseFloat(String(value || '0').replace(/[£$,]/g, ''))
    return isNaN(num) ? '£0.00' : `£${num.toFixed(2)}`
  }

  // Add new line item
  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `custom_${Date.now()}`,
      description: 'New Item',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
      type: 'custom'
    }
    setLineItems([...lineItems, newItem])
  }

  // Remove line item
  const removeLineItem = (itemId: string) => {
    setLineItems(lineItems.filter(item => item.id !== itemId))
  }

  // Update line item
  const updateLineItem = (itemId: string, field: keyof InvoiceLineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value }
        
        // Recalculate total when quantity, unitPrice, or discount changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
          const quantity = field === 'quantity' ? parseFloat(value) : item.quantity
          const unitPrice = field === 'unitPrice' ? parseFloat(value) : item.unitPrice
          const discount = field === 'discount' ? parseFloat(value) : item.discount
          
          updatedItem.total = (quantity * unitPrice) - discount
        }
        
        return updatedItem
      }
      return item
    }))
  }

  // Calculate totals from line items
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
    const vatRate = formData.saleType === 'Commercial' ? 0.20 : 0.00
    const vatAmount = subtotal * vatRate
    const total = subtotal + vatAmount
    
    return {
      subtotal,
      vatAmount,
      total
    }
  }

  const totals = calculateTotals()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading invoice editor...</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div>
            <h1 className="text-xl font-semibold">Enterprise Invoice Editor</h1>
            <p className="text-sm text-gray-500">Click on any field to edit directly</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          
          <Button onClick={handleGeneratePDF} disabled={isGeneratingPDF}>
            {isGeneratingPDF ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Invoice HTML Preview */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div 
            ref={invoiceRef}
            className="bg-white p-8"
            style={{
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: '10px',
              color: '#141414',
              lineHeight: '1.4'
            }}
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-6">
              {/* Company Logo & Details */}
              <div className="flex-1">
                <img 
                  src="https://bluebell.mydealershipview.com/wp-content/uploads/2025/06/Screenshot-2025-06-24-at-11.02.06.png" 
                  alt="Company Logo" 
                  className="w-32 h-auto mb-4"
                />
                <div className="text-xs leading-relaxed">
                  <div>Bluebell Motorhouse</div>
                  <div>Unit 3, Factory Street</div>
                  <div>Bradford</div>
                  <div>BD4 9NW</div>
                  <br />
                  <div>Info@bluebellmotorhouse.co.uk</div>
                  <div>07841 525 069</div>
                  <div>Company No: 12068920</div>
                  <div>VAT No: 39092 0568</div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="text-right">
                <div className="text-sm font-semibold mb-2">Invoice:</div>
                <div className="mb-4" data-field="invoiceNumber">
                  {renderEditableField('invoiceNumber', formData.invoiceNumber, 'text')}
                </div>
                
                <div className="text-sm font-semibold mb-2">Date:</div>
                <div className="mb-4" data-field="dateOfSale">
                  {renderEditableField('dateOfSale', formData.dateOfSale, 'date')}
                </div>
                
                <div className="text-sm font-semibold mb-2">Sale Price:</div>
                <div>
                  {renderEditableField('salePrice', formData.salePrice, 'currency')}
                </div>
              </div>
            </div>

            {/* Finance Company Balance (Conditional) */}
            {formData.invoiceTo === 'Finance Company' && (
              <div className="text-right mb-4">
                <div className="text-sm font-semibold">Remaining Balance:</div>
                <div>{formatCurrency(totals.total)}</div>
              </div>
            )}

            {/* Customer Balance (Conditional) */}
            {formData.invoiceTo === 'Customer' && (
              <div className="text-right mb-4">
                <div className="text-sm font-semibold">Remaining Balance:</div>
                <div>{formatCurrency(totals.total)}</div>
              </div>
            )}

            {/* Purchase Invoice Header */}
            <div className="bg-gray-200 p-2 text-center font-bold text-sm mb-4">
              PURCHASE INVOICE
            </div>

            {/* Invoice To Section - Conditional based on Finance Company */}
            <div className="mb-6">
              {formData.financeCompany === 'Jigsaw Finance' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold" data-field="vehicleRegistration">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - Jigsaw Finance
                  </div>
                  <div>Genesis Centre, Innovation Way</div>
                  <div>Stoke on Trent. ST6 4BF</div>
                  <div>01782432262</div>
                  <div>payouts@jigsawfinance.com</div>
                </div>
              )}

              {formData.financeCompany === 'Car Loans 365' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - Car Loans 365
                  </div>
                  <div>HT Finance Limited (T/A Car Loans 365)</div>
                  <div>Statham House, Talbot Road</div>
                  <div>Old Trafford</div>
                  <div>M32 0FP</div>
                </div>
              )}

              {formData.financeCompany === 'Close Brothers Finance' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - Close Brothers Finance
                  </div>
                  <div>10 Crown Place</div>
                  <div>London</div>
                  <div>EC2A 4FT</div>
                </div>
              )}

              {formData.financeCompany === 'Zuto Finance' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - ZUTO Finance
                  </div>
                  <div>Winterton House, Winterton Way</div>
                  <div>Macclesfield, Cheshire. SK11 OLP</div>
                  <div>01625 61 99 44</div>
                </div>
              )}

              {formData.financeCompany === 'Car Finance 247' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - Car Finance 24/7
                  </div>
                  <div>Universal Square, Block 5 Devonshire Street</div>
                  <div>Manchester. M12 6JH</div>
                </div>
              )}

              {formData.financeCompany === 'Oodle Finance' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - Oodle Car Finance
                  </div>
                  <div>Floor 19, City Tower</div>
                  <div>New York Street, Manchester</div>
                  <div>M1 4BT</div>
                </div>
              )}

              {formData.financeCompany === 'Blue Motor Finance' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - Blue Motor Finance
                  </div>
                  <div>Darenth House, 84 Main Rd</div>
                  <div>Sundridge, Sevenoaks</div>
                  <div>TN14 6ER</div>
                </div>
              )}

              {formData.financeCompany === 'Car Loans UK' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - Car Loans UK
                  </div>
                  <div>BMG FG (UK) LTD</div>
                  <div>Wellington Road North, Stockport, Cheshire, SK4 1LW</div>
                </div>
              )}

              {formData.financeCompany === 'CarMoney' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - CarMoney
                  </div>
                  <div>Pioneer House, 2 Renshaw Pl</div>
                  <div>Eurocentral, Motherwell</div>
                  <div>ML1 4UF</div>
                </div>
              )}

              {formData.financeCompany === 'Other' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')} - {renderEditableField('financeCompanyName', formData.financeCompanyName, 'text')}
                  </div>
                  <div>{renderEditableField('financeStreetAddress', formData.financeStreetAddress, 'text')}</div>
                  <div>{renderEditableField('financeCountyPostCode', formData.financeCountyPostCode, 'text')}</div>
                </div>
              )}

              {/* Customer Invoice */}
              {formData.invoiceTo === 'Customer' && (
                <div>
                  <div className="font-semibold text-sm mb-2">INVOICE TO:</div>
                  <div className="font-bold">
                    {renderEditableField('title', formData.title, 'select', ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr'])} {renderEditableField('firstName', formData.firstName, 'text')} {renderEditableField('lastName', formData.lastName, 'text')}
                  </div>
                  <div>{renderEditableField('address', formData.address, 'textarea')}</div>
                  <div>{renderEditableField('email', formData.email, 'text')}</div>
                  <div>{renderEditableField('phone', formData.phone, 'text')}</div>
                </div>
              )}
            </div>

            {/* Vehicle Details Section */}
            <div className="border border-gray-300 mb-6">
              <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-300">
                <span className="font-semibold text-sm">Invoice Items</span>
                <Button
                  size="sm"
                  onClick={addLineItem}
                  className="flex items-center gap-1 h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-3 w-3" />
                  Add Item
                </Button>
              </div>
              
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-center">Qty</th>
                    <th className="border border-gray-300 p-2 text-right">Unit Price</th>
                    {lineItems.some(item => item.discount > 0) && (
                      <th className="border border-gray-300 p-2 text-right">Discount</th>
                    )}
                    <th className="border border-gray-300 p-2 text-right">Total</th>
                    <th className="border border-gray-300 p-2 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Dynamic Line Items */}
                  {lineItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-gray-300 p-2">
                        {item.type === 'vehicle' ? (
                          <div>
                            <div className="font-semibold">
                              <span 
                                onClick={() => startEditing(`item_${item.id}_description`, item.description)}
                                className="cursor-pointer hover:bg-blue-50 px-1 rounded"
                              >
                                {item.description}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              <div>Registration: {renderEditableField('vehicleRegistration', formData.vehicleRegistration, 'text')}</div>
                              <div>VIN: {renderEditableField('vin', formData.vin, 'text')}</div>
                              <div>Mileage: {renderEditableField('mileage', formData.mileage, 'text')}</div>
                              <div>Colour: {renderEditableField('colour', formData.colour, 'text')}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="font-semibold">
                            {editingField === `item_${item.id}_description` ? (
                              <Input
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => {
                                  updateLineItem(item.id, 'description', tempValue)
                                  setEditingField(null)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateLineItem(item.id, 'description', tempValue)
                                    setEditingField(null)
                                  }
                                }}
                                className="text-xs h-6"
                                autoFocus
                              />
                            ) : (
                              <span 
                                onClick={() => {
                                  setEditingField(`item_${item.id}_description`)
                                  setTempValue(item.description)
                                }}
                                className="cursor-pointer hover:bg-blue-50 px-1 rounded"
                              >
                                {item.description}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      
                      <td className="border border-gray-300 p-2 text-center">
                        {editingField === `item_${item.id}_quantity` ? (
                          <Input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => {
                              updateLineItem(item.id, 'quantity', parseFloat(tempValue) || 1)
                              setEditingField(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateLineItem(item.id, 'quantity', parseFloat(tempValue) || 1)
                                setEditingField(null)
                              }
                            }}
                            className="text-xs h-6 w-16 text-center"
                            autoFocus
                          />
                        ) : (
                          <span 
                            onClick={() => {
                              setEditingField(`item_${item.id}_quantity`)
                              setTempValue(String(item.quantity))
                            }}
                            className="cursor-pointer hover:bg-blue-50 px-1 rounded"
                          >
                            {item.quantity}
                          </span>
                        )}
                      </td>
                      
                      <td className="border border-gray-300 p-2 text-right">
                        {editingField === `item_${item.id}_unitPrice` ? (
                          <Input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value.replace(/[^0-9.]/g, ''))}
                            onBlur={() => {
                              updateLineItem(item.id, 'unitPrice', parseFloat(tempValue) || 0)
                              setEditingField(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateLineItem(item.id, 'unitPrice', parseFloat(tempValue) || 0)
                                setEditingField(null)
                              }
                            }}
                            className="text-xs h-6 w-20 text-right"
                            autoFocus
                          />
                        ) : (
                          <span 
                            onClick={() => {
                              setEditingField(`item_${item.id}_unitPrice`)
                              setTempValue(String(item.unitPrice))
                            }}
                            className="cursor-pointer hover:bg-blue-50 px-1 rounded"
                          >
                            {formatCurrency(item.unitPrice)}
                          </span>
                        )}
                      </td>
                      
                      {lineItems.some(item => item.discount > 0) && (
                        <td className="border border-gray-300 p-2 text-right">
                          {editingField === `item_${item.id}_discount` ? (
                            <Input
                              type="text"
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value.replace(/[^0-9.]/g, ''))}
                              onBlur={() => {
                                updateLineItem(item.id, 'discount', parseFloat(tempValue) || 0)
                                setEditingField(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateLineItem(item.id, 'discount', parseFloat(tempValue) || 0)
                                  setEditingField(null)
                                }
                              }}
                              className="text-xs h-6 w-20 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              onClick={() => {
                                setEditingField(`item_${item.id}_discount`)
                                setTempValue(String(item.discount))
                              }}
                              className="cursor-pointer hover:bg-blue-50 px-1 rounded"
                            >
                              {formatCurrency(item.discount)}
                            </span>
                          )}
                        </td>
                      )}
                      
                      <td className="border border-gray-300 p-2 text-right">
                        {formatCurrency(item.total)}
                      </td>
                      
                      <td className="border border-gray-300 p-2 text-center">
                        {item.type === 'custom' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLineItem(item.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Subtotal Row */}
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 p-2 font-semibold" colSpan={lineItems.some(item => item.discount > 0) ? 5 : 4}>
                      SUBTOTAL
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-semibold">
                      {formatCurrency(totals.subtotal)}
                    </td>
                  </tr>

                  {/* VAT Row (if applicable) */}
                  {totals.vatAmount > 0 && (
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 font-semibold" colSpan={lineItems.some(item => item.discount > 0) ? 5 : 4}>
                        VAT (20%)
                      </td>
                      <td className="border border-gray-300 p-2 text-right font-semibold">
                        {formatCurrency(totals.vatAmount)}
                      </td>
                    </tr>
                  )}

                  {/* Total Row */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 p-2" colSpan={lineItems.some(item => item.discount > 0) ? 5 : 4}>
                      TOTAL
                    </td>
                    <td className="border border-gray-300 p-2 text-right">
                      {formatCurrency(totals.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Additional Information (Conditional) */}
            {formData.additionalComments && (
              <div className="mb-6">
                <div className="font-semibold text-sm mb-2">Additional Information:</div>
                <div>{renderEditableField('additionalComments', formData.additionalComments, 'textarea')}</div>
              </div>
            )}

            {/* Signature Section (Conditional) */}
            {formData.customerAvailableForSignature && (
              <div className="mt-8 flex justify-between">
                <div>
                  <div className="font-semibold text-sm mb-2">Customer Signature:</div>
                  <div className="border-b border-gray-400 w-48 h-12 mb-2"></div>
                  <div className="text-xs">
                    {renderEditableField('firstName', formData.firstName, 'text')} {renderEditableField('lastName', formData.lastName, 'text')}
                  </div>
                  <div className="text-xs">Date: {renderEditableField('dateOfSale', formData.dateOfSale, 'date')}</div>
                </div>
                
                <div>
                  <div className="font-semibold text-sm mb-2">Dealer Signature:</div>
                  <div className="border-b border-gray-400 w-48 h-12 mb-2"></div>
                  <div className="text-xs">Authorized Representative</div>
                  <div className="text-xs">Date: {renderEditableField('dateOfSale', formData.dateOfSale, 'date')}</div>
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="mt-8 text-xs text-gray-600">
              <div className="font-semibold mb-2">Terms and Conditions:</div>
              <div className="space-y-1">
                <div>• This invoice is subject to our standard terms and conditions of sale.</div>
                <div>• Payment is due within 30 days of invoice date unless otherwise agreed.</div>
                <div>• All warranties are subject to manufacturer terms and conditions.</div>
                {formData.saleType === 'Trade' && (
                  <div>• This is a trade sale and consumer rights do not apply.</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
