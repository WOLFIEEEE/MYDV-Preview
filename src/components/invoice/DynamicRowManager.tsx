'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Minus, 
  GripVertical, 
  Eye, 
  EyeOff,
  Copy,
  Trash2,
  Settings
} from 'lucide-react'
import { EditableField } from '@/types/template'

interface DynamicRow {
  id: string
  type: 'addon' | 'payment' | 'custom'
  title: string
  fields: EditableField[]
  visible: boolean
  canDelete: boolean
}

interface DynamicRowManagerProps {
  title: string
  rows: DynamicRow[]
  onRowsChange: (rows: DynamicRow[]) => void
  allowedRowTypes?: string[]
  maxRows?: number
}

export default function DynamicRowManager({
  title,
  rows,
  onRowsChange,
  allowedRowTypes = ['addon', 'payment', 'custom'],
  maxRows = 10
}: DynamicRowManagerProps) {
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRowType, setNewRowType] = useState<string>('')
  const [newRowTitle, setNewRowTitle] = useState('')

  // Add new row
  const addRow = (type: string, title: string) => {
    const newRow: DynamicRow = {
      id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as 'addon' | 'payment' | 'custom',
      title: title || `New ${type}`,
      visible: true,
      canDelete: true,
      fields: generateFieldsForRowType(type)
    }

    onRowsChange([...rows, newRow])
    setShowAddForm(false)
    setNewRowType('')
    setNewRowTitle('')
  }

  // Generate fields based on row type
  const generateFieldsForRowType = (type: string): EditableField[] => {
    switch (type) {
      case 'addon':
        return [
          {
            id: 'addonName',
            name: 'addonName',
            type: 'text',
            label: 'Add-on Name',
            value: '',
            required: true,
            placeholder: 'Enter add-on name'
          },
          {
            id: 'addonCost',
            name: 'addonCost',
            type: 'currency',
            label: 'Cost',
            value: '',
            required: true,
            placeholder: '0.00'
          },
          {
            id: 'addonDescription',
            name: 'addonDescription',
            type: 'textarea',
            label: 'Description',
            value: '',
            placeholder: 'Optional description'
          }
        ]
      
      case 'payment':
        return [
          {
            id: 'paymentType',
            name: 'paymentType',
            type: 'select',
            label: 'Payment Type',
            value: '',
            options: ['Deposit', 'Part Payment', 'Final Payment', 'Refund'],
            required: true
          },
          {
            id: 'paymentAmount',
            name: 'paymentAmount',
            type: 'currency',
            label: 'Amount',
            value: '',
            required: true
          },
          {
            id: 'paymentDate',
            name: 'paymentDate',
            type: 'date',
            label: 'Payment Date',
            value: '',
            required: true
          },
          {
            id: 'paymentMethod',
            name: 'paymentMethod',
            type: 'select',
            label: 'Payment Method',
            value: '',
            options: ['Cash', 'Card', 'Bank Transfer', 'Cheque', 'Finance'],
            required: true
          }
        ]
      
      case 'custom':
        return [
          {
            id: 'customLabel',
            name: 'customLabel',
            type: 'text',
            label: 'Label',
            value: '',
            required: true,
            placeholder: 'Enter field label'
          },
          {
            id: 'customValue',
            name: 'customValue',
            type: 'text',
            label: 'Value',
            value: '',
            placeholder: 'Enter value'
          }
        ]
      
      default:
        return []
    }
  }

  // Remove row
  const removeRow = (rowId: string) => {
    onRowsChange(rows.filter(row => row.id !== rowId))
  }

  // Toggle row visibility
  const toggleRowVisibility = (rowId: string) => {
    onRowsChange(
      rows.map(row =>
        row.id === rowId ? { ...row, visible: !row.visible } : row
      )
    )
  }

  // Duplicate row
  const duplicateRow = (rowId: string) => {
    const rowToDuplicate = rows.find(row => row.id === rowId)
    if (!rowToDuplicate) return

    const duplicatedRow: DynamicRow = {
      ...rowToDuplicate,
      id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${rowToDuplicate.title} (Copy)`,
      fields: rowToDuplicate.fields.map(field => ({
        ...field,
        id: `${field.id}_copy_${Date.now()}`
      }))
    }

    onRowsChange([...rows, duplicatedRow])
  }

  // Update field value
  const updateFieldValue = (rowId: string, fieldId: string, value: any) => {
    onRowsChange(
      rows.map(row =>
        row.id === rowId
          ? {
              ...row,
              fields: row.fields.map(field =>
                field.id === fieldId ? { ...field, value } : field
              )
            }
          : row
      )
    )
  }

  // Drag and drop handlers
  const handleDragStart = (rowId: string) => {
    setDraggedRowId(rowId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault()
    
    if (!draggedRowId || draggedRowId === targetRowId) {
      setDraggedRowId(null)
      return
    }

    const draggedIndex = rows.findIndex(row => row.id === draggedRowId)
    const targetIndex = rows.findIndex(row => row.id === targetRowId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedRowId(null)
      return
    }

    const newRows = [...rows]
    const [draggedRow] = newRows.splice(draggedIndex, 1)
    newRows.splice(targetIndex, 0, draggedRow)

    onRowsChange(newRows)
    setDraggedRowId(null)
  }

  // Render field input
  const renderFieldInput = (row: DynamicRow, field: EditableField) => {
    const value = field.value
    const onChange = (newValue: any) => updateFieldValue(row.id, field.id, newValue)

    switch (field.type) {
      case 'select':
        return (
          <Select value={value} onValueChange={onChange}>
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
      
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={2}
          />
        )
      
      case 'currency':
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => {
              const numValue = e.target.value.replace(/[£$,]/g, '')
              onChange(numValue)
            }}
            placeholder={field.placeholder}
          />
        )
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {title}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {rows.length} / {maxRows} rows
            </Badge>
            
            {rows.length < maxRows && (
              <Button
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Row
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Row Form */}
        {showAddForm && (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Row Type</Label>
                  <Select value={newRowType} onValueChange={setNewRowType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select row type" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRowTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Row Title</Label>
                  <Input
                    value={newRowTitle}
                    onChange={(e) => setNewRowTitle(e.target.value)}
                    placeholder="Enter row title"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addRow(newRowType, newRowTitle)}
                  disabled={!newRowType}
                >
                  Add Row
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Rows */}
        {rows.map((row, index) => (
          <Card
            key={row.id}
            className={`transition-all duration-200 ${
              !row.visible ? 'opacity-50' : ''
            } ${draggedRowId === row.id ? 'scale-105 shadow-lg' : ''}`}
            draggable
            onDragStart={() => handleDragStart(row.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, row.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                  <Badge variant="outline" className="text-xs">
                    {row.type}
                  </Badge>
                  <span className="font-medium">{row.title}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleRowVisibility(row.id)}
                    className="h-6 w-6 p-0"
                  >
                    {row.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateRow(row.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  
                  {row.canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRow(row.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {row.visible && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {row.fields.map(field => (
                    <div key={field.id} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {renderFieldInput(row, field)}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No rows added yet. Click "Add Row" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


