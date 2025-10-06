'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Download, 
  Save, 
  Eye, 
  EyeOff,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  FileText,
  CheckSquare,
  ScrollText,
  Plus,
  Minus
} from 'lucide-react'
import { TemplateParser } from '@/lib/templateParser'
import { convertHTMLElementToPDF, validateElementForPDF } from '@/lib/htmlToPdfService'
import { 
  mapChecklistToTemplate, 
  mapTermsToTemplate, 
  validateChecklist, 
  generateChecklistSummary,
  DEFAULT_CHECKLIST_VALUES 
} from '@/lib/checklistMapper'
import { toast } from 'sonner'

interface MultiPageInvoiceEditorProps {
  initialData?: Record<string, any>
  onSave?: (data: Record<string, any>) => void
  onClose?: () => void
}

interface ChecklistItem {
  id: string
  label: string
  value: string
  options?: string[]
  type: 'select' | 'text' | 'number'
}

interface TermsSection {
  id: string
  title: string
  content: string
  isEditable: boolean
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'mileage',
    label: 'Mileage',
    value: '',
    type: 'number'
  },
  {
    id: 'cambeltChainConfirmation',
    label: 'Cambelt / Chain Confirmation',
    value: '',
    options: ['Yes', 'No'],
    type: 'select'
  },
  {
    id: 'fuelTypeChecklist',
    label: 'Fuel Type',
    value: '',
    options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Other'],
    type: 'select'
  },
  {
    id: 'numberOfKeys',
    label: 'Number of Keys',
    value: '',
    options: ['1', '2', '3+', 'Unknown'],
    type: 'select'
  },
  {
    id: 'serviceHistoryRecord',
    label: 'Service History Record',
    value: '',
    options: ['Full Service History', 'Partial Service History', 'No Service History', 'Unknown'],
    type: 'select'
  },
  {
    id: 'userManual',
    label: 'User Manual',
    value: '',
    options: ['Present', 'Not Present', 'Digital Copy Available'],
    type: 'select'
  },
  {
    id: 'serviceHistory',
    label: 'Service History',
    value: '',
    options: ['Complete', 'Incomplete', 'Not Available'],
    type: 'select'
  },
  {
    id: 'wheelLockingNut',
    label: 'Wheel Locking Nut',
    value: '',
    options: ['Present', 'Not Present', 'N/A'],
    type: 'select'
  },
  {
    id: 'dealerPreSaleCheck',
    label: 'Dealer Pre-Sale Full Vehicle Health Check',
    value: '',
    options: ['Completed', 'Not Completed', 'Partial'],
    type: 'select'
  },
  {
    id: 'vehicleInspectionTestDrive',
    label: 'Vehicle Inspection / Test Drive',
    value: '',
    options: ['Completed', 'Not Completed', 'Customer Declined'],
    type: 'select'
  }
]

const DEFAULT_TERMS: TermsSection[] = [
  {
    id: 'consumer-rights',
    title: 'Consumer Rights & Inspection',
    content: `Customers are encouraged to inspect and test drive vehicles before purchase and to read all documentation, such as Checklists and Disclaimers which provide an overview of the vehicle and are to be considered as part of the sales terms and conditions.

The above is in accordance with the Consumer Rights Act and does not affect any of the rights you have as a consumer.`,
    isEditable: true
  },
  {
    id: 'return-policy',
    title: 'Return Policy',
    content: `Please configure your return policy terms in the database. This content should come from your custom terms settings.`,
    isEditable: true
  },
  {
    id: 'trade-terms',
    title: 'Trade Sale Terms',
    content: `This vehicle is sold as a Trade - Sale and it has been clearly communicated that no warranty or aftercare terms apply and that it is outside of the scope of the Consumer Protection provisions.

Declaration

I confirm that, when purchasing the above vehicle, I have been advised that this purchase is a Trade-Sale and outside of the scope of the Consumer Protection provisions. Therefore, no warranty or post-sale liabilities will apply and the 'standard' Bluebell Motorhouse Limited Terms and Conditions are replaced with these 'Trade' Terms and Conditions.

By purchasing this vehicle, I am confirming my understanding of the above, that all of the details listed are correct and providing my consent for these conditions to be applied.`,
    isEditable: true
  },
  {
    id: 'contact',
    title: 'Contact Information',
    content: 'For any queries or issues, please contact us at urue@gmail.com',
    isEditable: true
  }
]

export default function MultiPageInvoiceEditor({ 
  initialData = {}, 
  onSave, 
  onClose 
}: MultiPageInvoiceEditorProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData)
  const [templateParser, setTemplateParser] = useState<TemplateParser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(CHECKLIST_ITEMS)
  const [termsSection, setTermsSection] = useState<TermsSection[]>(DEFAULT_TERMS)
  const [editingTermsId, setEditingTermsId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState<string>('')
  const invoiceRef = useRef<HTMLDivElement>(null)

  // Define pages dynamically based on sale type
  const allPages = [
    {
      id: 'invoice',
      title: 'Invoice Editor',
      icon: FileText,
      description: 'Edit invoice content and layout'
    },
    {
      id: 'checklist',
      title: 'Vehicle Checklist',
      icon: CheckSquare,
      description: 'Complete vehicle inspection checklist'
    },
    {
      id: 'terms',
      title: 'Terms & Conditions',
      icon: ScrollText,
      description: 'Review and customize terms and conditions'
    }
  ]

  // Filter pages based on sale type - hide checklist for trade sales
  const pages = useMemo(() => {
    const isTradeInvoice = formData.invoiceType === 'Trade Invoice' || 
                          formData.saleType === 'Trade' ||
                          (formData.invoiceType && formData.invoiceType.toLowerCase().includes('trade'))
    
    if (isTradeInvoice) {
      return allPages.filter(page => page.id !== 'checklist')
    }
    
    return allPages
  }, [formData.invoiceType, formData.saleType])

  // Reset current page if it becomes invalid due to filtering
  useEffect(() => {
    if (currentPage >= pages.length) {
      setCurrentPage(0)
    }
  }, [pages.length, currentPage])

  // Initialize template parser
  useEffect(() => {
    const initializeTemplate = async () => {
      try {
        setIsLoading(true)
        
        const response = await fetch('/First2Page.json')
        if (!response.ok) {
          throw new Error(`Failed to load template: ${response.status} ${response.statusText}`)
        }
        
        const templateJson = await response.text()
        const parser = new TemplateParser(templateJson, initialData)
        
        setTemplateParser(parser)
        
        // Initialize checklist with existing data or defaults
        const updatedChecklist = checklistItems.map(item => ({
          ...item,
          value: initialData[item.id] || DEFAULT_CHECKLIST_VALUES[item.id as keyof typeof DEFAULT_CHECKLIST_VALUES] || ''
        }))
        setChecklistItems(updatedChecklist)
        
      } catch (error) {
        console.error('Failed to initialize template:', error)
        toast.error('Failed to load invoice template')
      } finally {
        setIsLoading(false)
      }
    }

    initializeTemplate()
  }, [])

  // Update form data
  const updateFormData = useCallback((field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    
    if (templateParser) {
      templateParser.updateFormData(newData)
    }
  }, [formData, templateParser])

  // Update checklist item
  const updateChecklistItem = (id: string, value: string) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === id ? { ...item, value } : item
    ))
    updateFormData(id, value)
  }

  // Update terms section
  const updateTermsSection = (id: string, content: string) => {
    setTermsSection(prev => prev.map(section => 
      section.id === id ? { ...section, content } : section
    ))
    updateFormData(`terms_${id}`, content)
  }

  // Save all data
  const handleSave = async () => {
    try {
      const checklistData = checklistItems.reduce((acc, item) => ({
        ...acc,
        [item.id]: item.value
      }), {})
      
      const termsData = termsSection.reduce((acc, section) => ({
        ...acc,
        [section.id]: section.content
      }), {})

      // Map checklist and terms to template format
      const templateChecklistData = mapChecklistToTemplate(checklistData)
      const templateTermsData = mapTermsToTemplate({
        customerAcceptedIdd: formData.customerAcceptedIdd,
        termsOfServiceInHouse: formData.termsOfServiceInHouse,
        termsOfServiceTrade: formData.termsOfServiceTrade
      })

      const allData = {
        ...formData,
        ...templateChecklistData,
        ...templateTermsData,
        checklist: checklistData,
        terms: termsData
      }

      if (onSave) {
        await onSave(allData)
      }
      
      // Update template parser with new data
      if (templateParser) {
        templateParser.updateFormData(allData)
      }
      
      toast.success('Invoice data saved successfully')
    } catch (error) {
      console.error('Failed to save invoice:', error)
      toast.error('Failed to save invoice')
    }
  }

  // Generate PDF
  const handleGeneratePDF = async () => {
    if (!invoiceRef.current) return

    setIsGeneratingPDF(true)
    try {
      // Validate the element first
      const isValid = validateElementForPDF(invoiceRef.current)
      if (!isValid) {
        throw new Error('Invoice content is not ready for PDF generation')
      }

      // Generate PDF
      const pdfBytes = await convertHTMLElementToPDF(invoiceRef.current, {
        filename: `invoice_${formData.invoiceNumber || 'draft'}_${new Date().toISOString().split('T')[0]}.pdf`,
        format: 'A4',
        margins: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      })

      toast.success('PDF generated successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGeneratingPDF(false)
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
              className="inline-flex h-auto min-h-[1.5rem] p-1 border-2 border-blue-500 w-auto min-w-[150px]"
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
        className="cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-200 rounded px-1 py-0.5 inline-block min-w-[50px] min-h-[1.2rem]"
        title="Click to edit"
      >
        {displayValue}
      </span>
    )
  }

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

  // Render Invoice Page with inline editing
  const renderInvoicePage = () => {
    if (!templateParser) return <div>Loading template...</div>

    const visibleRows = templateParser.getVisibleRows()

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Invoice Editor</h2>
          <p className="text-gray-600">Click on any field in the invoice to edit it directly</p>
        </div>
        
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div 
              ref={invoiceRef}
              className="invoice-content bg-white space-y-4"
              style={{ 
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                lineHeight: '1.4',
                color: '#333'
              }}
            >
              {/* Company Header */}
              <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {renderEditableField('companyName', formData.companyName || 'Your Company Name', 'text')}
                </h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>{renderEditableField('companyAddress', formData.companyAddress || 'Company Address', 'text')}</div>
                  <div>{renderEditableField('companyPhone', formData.companyPhone || 'Phone Number', 'text')}</div>
                  <div>{renderEditableField('companyEmail', formData.companyEmail || 'Email Address', 'text')}</div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Invoice To:</h3>
                  <div className="space-y-2">
                    <div><strong>Customer:</strong> {renderEditableField('customerName', formData.customerName || '', 'text')}</div>
                    <div><strong>Address:</strong> {renderEditableField('customerAddress', formData.customerAddress || '', 'textarea')}</div>
                    <div><strong>Phone:</strong> {renderEditableField('customerPhone', formData.customerPhone || '', 'text')}</div>
                    <div><strong>Email:</strong> {renderEditableField('customerEmail', formData.customerEmail || '', 'text')}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Invoice Details:</h3>
                  <div className="space-y-2">
                    <div><strong>Invoice #:</strong> {renderEditableField('invoiceNumber', formData.invoiceNumber || '', 'text')}</div>
                    <div><strong>Date:</strong> {renderEditableField('invoiceDate', formData.invoiceDate || '', 'date')}</div>
                    <div><strong>Due Date:</strong> {renderEditableField('dueDate', formData.dueDate || '', 'date')}</div>
                    <div><strong>Invoice Type:</strong> {renderEditableField('invoiceType', formData.invoiceType || 'Customer', 'select', ['Customer', 'Trade Invoice', 'Finance Company'])}</div>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="border border-gray-300 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Vehicle Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><strong>Registration:</strong> {renderEditableField('vehicleRegistration', formData.vehicleRegistration || '', 'text')}</div>
                  <div><strong>Make:</strong> {renderEditableField('vehicleMake', formData.vehicleMake || '', 'text')}</div>
                  <div><strong>Model:</strong> {renderEditableField('vehicleModel', formData.vehicleModel || '', 'text')}</div>
                  <div><strong>Year:</strong> {renderEditableField('vehicleYear', formData.vehicleYear || '', 'text')}</div>
                  <div><strong>Mileage:</strong> {renderEditableField('vehicleMileage', formData.vehicleMileage || '', 'text')}</div>
                  <div><strong>Fuel Type:</strong> {renderEditableField('fuelType', formData.fuelType || '', 'select', ['Petrol', 'Diesel', 'Hybrid', 'Electric'])}</div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Invoice Items</h3>
                <table className="w-full border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Quantity</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Unit Price</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">
                        Vehicle Sale - {renderEditableField('vehicleDescription', formData.vehicleDescription || `${formData.vehicleMake || ''} ${formData.vehicleModel || ''}`, 'text')}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">1</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        £{renderEditableField('salePrice', formData.salePrice || '0.00', 'currency')}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        £{formData.salePrice || '0.00'}
                      </td>
                    </tr>
                    {formData.warrantyPrice && parseFloat(formData.warrantyPrice) > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">
                          Extended Warranty
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right">1</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">
                          £{renderEditableField('warrantyPrice', formData.warrantyPrice || '0.00', 'currency')}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right">
                          £{formData.warrantyPrice || '0.00'}
                        </td>
                      </tr>
                    )}
                    {formData.deliveryCost && parseFloat(formData.deliveryCost) > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">
                          Delivery
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right">1</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">
                          £{renderEditableField('deliveryCost', formData.deliveryCost || '0.00', 'currency')}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right">
                          £{formData.deliveryCost || '0.00'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Cash Payment:</span>
                      <span>£{renderEditableField('amountPaidCash', formData.amountPaidCash || '0.00', 'currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card/BACS Payment:</span>
                      <span>£{renderEditableField('amountPaidCardBacs', formData.amountPaidCardBacs || '0.00', 'currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Part Exchange:</span>
                      <span>£{renderEditableField('amountPaidPartExchange', formData.amountPaidPartExchange || '0.00', 'currency')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Total Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>£{formData.subtotalCustomer || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (20%):</span>
                      <span>£{formData.vatCommercial || '0.00'}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>£{formData.remainingBalanceIncVat || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mt-6 pt-4 border-t border-gray-300">
                <h3 className="font-semibold text-gray-800 mb-3">Additional Information</h3>
                <div className="text-sm">
                  {renderEditableField('additionalComments', formData.additionalComments || 'Click to add additional comments...', 'textarea')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render Checklist Page
  const renderChecklistPage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Vehicle Inspection Checklist</h2>
        <p className="text-gray-600">Complete the vehicle inspection checklist below</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Pre-Sale Vehicle Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {checklistItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {item.label}
                </label>
                {item.type === 'select' && item.options ? (
                  <Select 
                    value={item.value} 
                    onValueChange={(value) => updateChecklistItem(item.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${item.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {item.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={item.type === 'number' ? 'number' : 'text'}
                    value={item.value}
                    onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                    placeholder={`Enter ${item.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Checklist Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mb-4">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    item.value ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className={item.value ? 'text-green-700' : 'text-gray-500'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            
            {(() => {
              const checklistData = checklistItems.reduce((acc, item) => ({
                ...acc,
                [item.id]: item.value
              }), {})
              const validation = validateChecklist(checklistData)
              
              return (
                <div className={`p-3 rounded-lg ${
                  validation.isComplete 
                    ? 'bg-green-100 border border-green-300' 
                    : 'bg-yellow-100 border border-yellow-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      validation.isComplete ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {generateChecklistSummary(checklistData)}
                    </span>
                    <span className={`text-sm ${
                      validation.isComplete ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {validation.completionPercentage}% Complete
                    </span>
                  </div>
                  {!validation.isComplete && validation.missingFields.length > 0 && (
                    <div className="mt-2 text-sm text-yellow-700">
                      Missing fields: {validation.missingFields.join(', ')}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render Terms Page
  const renderTermsPage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Terms & Conditions</h2>
        <p className="text-gray-600">Review and customize the terms and conditions for this sale</p>
      </div>

      <div className="space-y-4">
        {termsSection.map((section) => (
          <Card key={section.id} className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  {section.title}
                </span>
                {section.isEditable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTermsId(
                      editingTermsId === section.id ? null : section.id
                    )}
                  >
                    {editingTermsId === section.id ? 'Done' : 'Edit'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingTermsId === section.id ? (
                <Textarea
                  value={section.content}
                  onChange={(e) => updateTermsSection(section.id, e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Enter terms and conditions..."
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {section.content}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Terms Application</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* IDD Acceptance - Only show for non-trade sales */}
          {formData.saleType !== 'Trade' && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="customer-accepted-idd"
                checked={formData.customerAcceptedIdd === 'Yes'}
                onCheckedChange={(checked) => 
                  updateFormData('customerAcceptedIdd', checked ? 'Yes' : 'No')
                }
              />
              <label htmlFor="customer-accepted-idd" className="text-sm font-medium">
                Customer has accepted the IDD (Important Delivery Details)
              </label>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="terms-in-house"
              checked={formData.termsOfServiceInHouse}
              onCheckedChange={(checked) => 
                updateFormData('termsOfServiceInHouse', checked)
              }
            />
            <label htmlFor="terms-in-house" className="text-sm font-medium">
              Apply In-House Terms of Service
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="terms-trade"
              checked={formData.termsOfServiceTrade}
              onCheckedChange={(checked) => 
                updateFormData('termsOfServiceTrade', checked)
              }
            />
            <label htmlFor="terms-trade" className="text-sm font-medium">
              Apply Trade Sale Terms and Conditions
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading Enterprise Invoice Editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div>
            <h1 className="text-xl font-semibold">Multi-Page Invoice Editor</h1>
            <p className="text-sm text-gray-500">Complete invoice with checklist and terms</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save All
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
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Page Navigation */}
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {pages.map((page, index) => {
                const Icon = page.icon
                return (
                  <Button
                    key={page.id}
                    variant={currentPage === index ? 'default' : 'ghost'}
                    onClick={() => setCurrentPage(index)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {page.title}
                  </Button>
                )
              })}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <span className="text-sm text-gray-500">
                {currentPage + 1} of {pages.length}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                disabled={currentPage === pages.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            {pages[currentPage]?.description}
          </div>
        </CardContent>
      </Card>

      {/* Page Content */}
      <div className="min-h-[600px]">
        {pages[currentPage]?.id === 'invoice' && renderInvoicePage()}
        {pages[currentPage]?.id === 'checklist' && renderChecklistPage()}
        {pages[currentPage]?.id === 'terms' && renderTermsPage()}
      </div>
    </div>
  )
}
