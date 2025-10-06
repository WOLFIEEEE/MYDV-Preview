'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Download, 
  Eye, 
  Save, 
  Plus, 
  Minus, 
  RefreshCw,
  FileText,
  Settings,
  Calculator,
  Truck,
  Shield,
  CreditCard,
  User,
  Building2
} from 'lucide-react'
import { TemplateParser, FieldFormatter } from '@/lib/templateParser'
import { 
  EditableField, 
  EditableSection, 
  InvoiceEditorState, 
  FINANCE_COMPANIES,
  FinanceCompany 
} from '@/types/template'
import { generateDynamicInvoicePDF } from '@/lib/dynamicPdfService'
import { toast } from 'sonner'

interface DynamicInvoiceEditorProps {
  initialData?: Record<string, any>
  onSave?: (data: Record<string, any>) => void
  onClose?: () => void
}

export default function DynamicInvoiceEditor({ 
  initialData = {}, 
  onSave, 
  onClose 
}: DynamicInvoiceEditorProps) {
  const [editorState, setEditorState] = useState<InvoiceEditorState>({
    formData: initialData,
    visibleSections: [],
    template: { container: {}, rows: {} },
    isDirty: false,
    errors: {}
  })
  
  const [templateParser, setTemplateParser] = useState<TemplateParser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('basic')
  const [previewMode, setPreviewMode] = useState(false)

  // Initialize template parser
  useEffect(() => {
    const initializeTemplate = async () => {
      try {
        setIsLoading(true)
        
        // Load First2Page.json template
        const response = await fetch('/First2Page.json')
        if (!response.ok) {
          throw new Error('Failed to load template')
        }
        
        const templateJson = await response.text()
        const parser = new TemplateParser(templateJson, initialData)
        
        setTemplateParser(parser)
        updateEditorState(parser, initialData, true)
        
      } catch (error) {
        console.error('Failed to initialize template:', error)
        toast.error('Failed to load invoice template')
      } finally {
        setIsLoading(false)
      }
    }

    initializeTemplate()
  }, [])

  // Update editor state when form data changes
  const updateEditorState = useCallback((parser: TemplateParser, formData: Record<string, any>, regenerateSections: boolean = false) => {
    parser.updateFormData(formData)
    
    if (regenerateSections) {
      const visibleRows = parser.getVisibleRows()
      const sections = generateEditableSections(formData, visibleRows)
      
      setEditorState(prev => ({
        ...prev,
        formData,
        visibleSections: sections,
        template: parser.exportTemplate() as any,
        isDirty: true
      }))
    } else {
      // Only update form data and field values without regenerating sections
      setEditorState(prev => ({
        ...prev,
        formData,
        visibleSections: prev.visibleSections.map(section => ({
          ...section,
          fields: section.fields.map(field => ({
            ...field,
            value: formData[field.name] ?? field.value,
            condition: field.condition !== undefined ? 
              (field.name === 'enhancedWarrantyLevel' || field.name === 'enhancedWarrantyPrice' || field.name === 'enhancedWarrantyDetails') ?
                formData.enhancedWarranty === 'Yes' || formData.enhancedWarranty === true :
                field.condition : undefined
          }))
        })),
        template: parser.exportTemplate() as any,
        isDirty: true
      }))
    }
  }, [])

  // Generate editable sections from template structure (memoized)
  const generateEditableSections = useCallback((formData: Record<string, any>, visibleRows: any[]): EditableSection[] => {
    const sections: EditableSection[] = [
      {
        id: 'basic',
        title: 'Basic Information',
        visible: true,
        fields: [
          {
            id: 'invoiceNumber',
            name: 'invoiceNumber',
            type: 'text',
            label: 'Invoice Number',
            value: formData.invoiceNumber || '',
            required: true,
            placeholder: 'INV-001'
          },
          {
            id: 'dateOfSale',
            name: 'dateOfSale',
            type: 'date',
            label: 'Date of Sale',
            value: formData.dateOfSale || '',
            required: true
          },
          {
            id: 'invoiceTo',
            name: 'invoiceTo',
            type: 'select',
            label: 'Invoice To',
            value: formData.invoiceTo || 'Customer',
            options: ['Customer', 'Finance Company'],
            required: true
          },
          {
            id: 'saleType',
            name: 'saleType',
            type: 'select',
            label: 'Sale Type',
            value: formData.saleType || 'Retail',
            options: ['Retail', 'Trade', 'Commercial'],
            required: true
          },
          {
            id: 'invoiceType',
            name: 'invoiceType',
            type: 'select',
            label: 'Invoice Type',
            value: formData.invoiceType || 'Standard',
            options: ['Standard', 'Trade Invoice'],
            required: true
          }
        ]
      },
      {
        id: 'customer',
        title: 'Customer Information',
        visible: true,
        fields: [
          {
            id: 'title',
            name: 'title',
            type: 'select',
            label: 'Title',
            value: formData.title || '',
            options: ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr']
          },
          {
            id: 'firstName',
            name: 'firstName',
            type: 'text',
            label: 'First Name',
            value: formData.firstName || '',
            required: true
          },
          {
            id: 'lastName',
            name: 'lastName',
            type: 'text',
            label: 'Last Name',
            value: formData.lastName || '',
            required: true
          },
          {
            id: 'email',
            name: 'email',
            type: 'text',
            label: 'Email',
            value: formData.email || '',
            validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$', message: 'Invalid email format' }
          },
          {
            id: 'phone',
            name: 'phone',
            type: 'text',
            label: 'Phone Number',
            value: formData.phone || ''
          },
          {
            id: 'address',
            name: 'address',
            type: 'textarea',
            label: 'Address',
            value: formData.address || '',
            placeholder: 'Street Address\nCity\nPostcode'
          }
        ]
      },
      {
        id: 'vehicle',
        title: 'Vehicle Information',
        visible: true,
        fields: [
          {
            id: 'vehicleRegistration',
            name: 'vehicleRegistration',
            type: 'text',
            label: 'Vehicle Registration',
            value: formData.vehicleRegistration || '',
            required: true
          },
          {
            id: 'make',
            name: 'make',
            type: 'text',
            label: 'Make',
            value: formData.make || '',
            required: true
          },
          {
            id: 'model',
            name: 'model',
            type: 'text',
            label: 'Model',
            value: formData.model || '',
            required: true
          },
          {
            id: 'derivative',
            name: 'derivative',
            type: 'text',
            label: 'Derivative',
            value: formData.derivative || ''
          },
          {
            id: 'vin',
            name: 'vin',
            type: 'text',
            label: 'VIN',
            value: formData.vin || ''
          },
          {
            id: 'mileage',
            name: 'mileage',
            type: 'number',
            label: 'Mileage',
            value: formData.mileage || ''
          },
          {
            id: 'colour',
            name: 'colour',
            type: 'text',
            label: 'Colour',
            value: formData.colour || ''
          }
        ]
      },
      {
        id: 'pricing',
        title: 'Pricing & Discounts',
        visible: true,
        fields: [
          {
            id: 'salePrice',
            name: 'salePrice',
            type: 'currency',
            label: 'Sale Price',
            value: formData.salePrice || '',
            required: true
          },
          {
            id: 'discountOnSalePrice',
            name: 'discountOnSalePrice',
            type: 'currency',
            label: 'Discount on Sale Price',
            value: formData.discountOnSalePrice || ''
          },
          {
            id: 'warrantyPrice',
            name: 'warrantyPrice',
            type: 'currency',
            label: 'Warranty Price',
            value: formData.warrantyPrice || ''
          },
          {
            id: 'discountOnWarranty',
            name: 'discountOnWarranty',
            type: 'currency',
            label: 'Discount on Warranty',
            value: formData.discountOnWarranty || ''
          }
        ]
      }
    ]

    // Add finance company section if invoice is for finance company and not a trade sale
    if (formData.invoiceTo === 'Finance Company' && formData.saleType !== 'Trade') {
      sections.push({
        id: 'finance',
        title: 'Finance Company',
        visible: true,
        fields: [
          {
            id: 'financeCompany',
            name: 'financeCompany',
            type: 'select',
            label: 'Finance Company',
            value: formData.financeCompany || '',
            options: FINANCE_COMPANIES.map(fc => fc.name),
            required: true
          }
        ]
      })
    }

    // Add warranty & add-ons section (always visible, but warranty fields conditional)
    const isTradeInvoice = formData.saleType === 'Trade' || 
                          formData.invoiceType === 'Trade Invoice' ||
                          (formData.invoiceType && formData.invoiceType.toLowerCase().includes('trade'))
    
    sections.push({
      id: 'warranty',
      title: 'Warranty & Add-ons',
      visible: true,
      fields: [
        {
          id: 'warrantyLevel',
          name: 'warrantyLevel',
          type: 'select',
          label: 'Warranty Level',
          value: formData.warrantyLevel || '',
          options: ['30 Days', '3 Months', '6 Months', '12 Months', '24 Months', '36 Months'],
          condition: !isTradeInvoice
        },
        {
          id: 'inHouse',
          name: 'inHouse',
          type: 'boolean',
          label: 'In-House Warranty',
          value: formData.inHouse === 'Yes' || formData.inHouse === true,
          condition: !isTradeInvoice
        },
        {
          id: 'warrantyDetails',
          name: 'warrantyDetails',
          type: 'textarea',
          label: 'Warranty Details',
          value: formData.warrantyDetails || '',
          condition: !isTradeInvoice
        },
        {
          id: 'enhancedWarranty',
          name: 'enhancedWarranty',
          type: 'boolean',
          label: 'Enhanced/Upgraded Warranty',
          value: formData.enhancedWarranty === 'Yes' || formData.enhancedWarranty === true,
          condition: !isTradeInvoice
        },
        {
          id: 'enhancedWarrantyLevel',
          name: 'enhancedWarrantyLevel',
          type: 'select',
          label: 'Enhanced Warranty Level',
          value: formData.enhancedWarrantyLevel || '',
          options: ['3 Months Enhanced', '6 Months Enhanced', '12 Months Enhanced', '18 Months Enhanced', '24 Months Enhanced', '36 Months Enhanced', '48 Months Enhanced'],
          condition: !isTradeInvoice && (formData.enhancedWarranty === 'Yes' || formData.enhancedWarranty === true)
        },
        {
          id: 'enhancedWarrantyPrice',
          name: 'enhancedWarrantyPrice',
          type: 'currency',
          label: 'Enhanced Warranty Price',
          value: formData.enhancedWarrantyPrice || '',
          condition: !isTradeInvoice && (formData.enhancedWarranty === 'Yes' || formData.enhancedWarranty === true)
        },
        {
          id: 'enhancedWarrantyDetails',
          name: 'enhancedWarrantyDetails',
          type: 'textarea',
          label: 'Enhanced Warranty Details',
          value: formData.enhancedWarrantyDetails || '',
          condition: !isTradeInvoice && (formData.enhancedWarranty === 'Yes' || formData.enhancedWarranty === true)
        }
      ]
    })

    // Add delivery section
    sections.push({
      id: 'delivery',
      title: 'Delivery & Collection',
      visible: true,
      fields: [
        {
          id: 'deliveryMethod',
          name: 'deliveryMethod',
          type: 'select',
          label: 'Delivery Method',
          value: formData.deliveryMethod || 'Collection',
          options: ['Collection', 'Delivery']
        },
        {
          id: 'deliveryCost',
          name: 'deliveryCost',
          type: 'currency',
          label: 'Delivery Cost',
          value: formData.deliveryCost || ''
        },
        {
          id: 'deliveryDate',
          name: 'deliveryDate',
          type: 'date',
          label: 'Delivery/Collection Date',
          value: formData.deliveryDate || ''
        }
      ]
    })

    // Add add-ons section
    sections.push({
      id: 'addons',
      title: 'Add-ons & Extras',
      visible: true,
      canAddRows: true,
      fields: [
        {
          id: 'financeAddonsEnabled',
          name: 'financeAddonsEnabled',
          type: 'boolean',
          label: 'Finance Add-ons Enabled',
          value: formData.financeAddonsEnabled || false,
          condition: !isTradeInvoice
        },
        {
          id: 'customerAddonsEnabled',
          name: 'customerAddonsEnabled',
          type: 'boolean',
          label: 'Customer Add-ons Enabled',
          value: formData.customerAddonsEnabled || false
        }
      ]
    })

    return sections
  }, [])

  // Handle field value change (optimized to prevent re-renders)
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    // Convert boolean values to string format for backward compatibility
    let processedValue = value
    if (typeof value === 'boolean') {
      // For warranty-related boolean fields, convert to 'Yes'/'No' strings
      if (fieldName === 'inHouse' || fieldName === 'enhancedWarranty') {
        processedValue = value ? 'Yes' : 'No'
      }
    }
    
    const newFormData = { ...editorState.formData, [fieldName]: processedValue }
    
    // Only regenerate sections if it's a field that affects conditional visibility
    const conditionalFields = ['invoiceTo', 'saleType', 'enhancedWarranty', 'warrantyLevel']
    const shouldRegenerateSections = conditionalFields.includes(fieldName)
    
    if (templateParser) {
      updateEditorState(templateParser, newFormData, shouldRegenerateSections)
    }
  }, [editorState.formData, templateParser, updateEditorState])

  // Handle save
  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave(editorState.formData)
      }
      
      setEditorState(prev => ({ ...prev, isDirty: false }))
      toast.success('Invoice saved successfully')
    } catch (error) {
      console.error('Failed to save invoice:', error)
      toast.error('Failed to save invoice')
    }
  }

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    if (!templateParser) return

    try {
      setIsLoading(true)
      const pdfBytes = await generateDynamicInvoicePDF(
        templateParser.exportTemplate(),
        editorState.formData
      )
      
      // Download PDF
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${editorState.formData.invoiceNumber || 'draft'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('PDF generated successfully')
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsLoading(false)
    }
  }

  // Render field based on type (memoized to prevent re-renders)
  const renderField = useCallback((field: EditableField) => {
    const commonProps = {
      id: field.id,
      value: field.value,
      onChange: (e: any) => handleFieldChange(field.name, e.target?.value ?? e),
      placeholder: field.placeholder
    }

    switch (field.type) {
      case 'select':
        return (
          <Select value={field.value} onValueChange={(value) => handleFieldChange(field.name, value)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'boolean':
        return (
          <Switch
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
          />
        )
      
      case 'textarea':
        return <Textarea {...commonProps} rows={3} />
      
      case 'currency':
        return (
          <Input
            {...commonProps}
            type="text"
            value={FieldFormatter.formatCurrency(field.value)}
            onChange={(e) => {
              // Allow more flexible input handling
              const value = e.target.value.replace(/[£$,]/g, '');
              handleFieldChange(field.name, value);
            }}
            // Prevent input restrictions that cause one-digit-at-a-time issues
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              const inputEvent = e.nativeEvent as InputEvent;
              // Allow normal typing behavior
              if (target.value === '£0.00' && inputEvent.data !== '0') {
                target.setSelectionRange(target.value.length, target.value.length);
              }
            }}
          />
        )
      
      case 'date':
        return <Input {...commonProps} type="date" />
      
      case 'number':
        return <Input {...commonProps} type="number" />
      
      default:
        return <Input {...commonProps} type="text" />
    }
  }, [handleFieldChange])

  // Memoize visible sections to prevent unnecessary re-renders
  const memoizedSections = useMemo(() => {
    return editorState.visibleSections
  }, [editorState.visibleSections])

  // Memoized field component to prevent individual field re-renders
  const MemoizedFieldComponent = useMemo(() => {
    return React.memo(({ field }: { field: EditableField }) => (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id} className="flex items-center gap-2">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        {renderField(field)}
        {editorState.errors[field.name] && (
          <p className="text-sm text-red-500">{editorState.errors[field.name]}</p>
        )}
      </div>
    ))
  }, [renderField, editorState.errors])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading invoice editor...</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Invoice Editor</h1>
          <p className="text-muted-foreground">
            Edit and customize your invoice with conditional business logic
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!editorState.isDirty}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          
          <Button onClick={handleGeneratePDF} disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <Badge variant={editorState.isDirty ? "destructive" : "default"}>
          {editorState.isDirty ? 'Unsaved Changes' : 'Saved'}
        </Badge>
        
        <Separator orientation="vertical" className="h-4" />
        
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
           <FileText className="h-4 w-4" />
           {memoizedSections.length} sections visible
         </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings className="h-4 w-4" />
          {Object.keys(editorState.formData).length} fields configured
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Invoice Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="basic" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Basic
                  </TabsTrigger>
                  <TabsTrigger value="customer" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Customer
                  </TabsTrigger>
                  <TabsTrigger value="vehicle" className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Vehicle
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Pricing
                  </TabsTrigger>
                  <TabsTrigger value="warranty" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Warranty
                  </TabsTrigger>
                  <TabsTrigger value="delivery" className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Delivery
                  </TabsTrigger>
                </TabsList>

                 {memoizedSections.map(section => (
                  <TabsContent key={section.id} value={section.id} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.fields
                        .filter(field => !field.condition || field.condition)
                        .map(field => (
                          <MemoizedFieldComponent key={field.id} field={field} />
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2 text-sm">
                  <div className="font-semibold">Invoice #{editorState.formData.invoiceNumber || 'DRAFT'}</div>
                  <div>Customer: {editorState.formData.firstName} {editorState.formData.lastName}</div>
                  <div>Vehicle: {editorState.formData.make} {editorState.formData.model}</div>
                  <div>Registration: {editorState.formData.vehicleRegistration}</div>
                  <div>Sale Price: {FieldFormatter.formatCurrency(editorState.formData.salePrice)}</div>
                  
                  {editorState.formData.invoiceTo === 'Finance Company' && (
                    <div className="mt-4 p-2 bg-blue-50 rounded">
                      <div className="font-semibold text-blue-800">Finance Company Invoice</div>
                      <div className="text-blue-600">{editorState.formData.financeCompany}</div>
                    </div>
                  )}
                  
                  {editorState.formData.discountOnSalePrice && (
                    <div className="mt-2 p-2 bg-green-50 rounded">
                      <div className="font-semibold text-green-800">Discount Applied</div>
                      <div className="text-green-600">
                        -{FieldFormatter.formatCurrency(editorState.formData.discountOnSalePrice)}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


