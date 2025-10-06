'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MultiPageInvoiceEditor from '@/components/invoice/MultiPageInvoiceEditor'
import { toast } from 'sonner'

export default function EnterpriseInvoiceEditorPage() {
  const router = useRouter()
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load data from sessionStorage
    const loadInitialData = () => {
      try {
        const storedData = sessionStorage.getItem('enterpriseInvoiceData')
        if (storedData) {
          const parsedData = JSON.parse(storedData)
          setInitialData(parsedData)
        } else {
          // For testing purposes, use default test data
          const testData = {
            // Vehicle Information
            vehicleRegistration: 'AB12 CDE',
            make: 'BMW',
            model: 'X5',
            colour: 'Black',
            salePrice: 35000,
            dateOfSale: '2024-01-15',
            
            // Customer Information
            customerName: 'John Smith',
            customerAddress: '123 Main Street, London, SW1A 1AA',
            customerPhone: '07123 456789',
            customerEmail: 'john.smith@email.com',
            
            // Invoice Details
            invoiceNumber: 'INV-2024-001',
            saleType: 'Retail',
            invoiceTo: 'Customer',
            
            // Financial Information
            subtotalCustomer: 35000,
            vatCommercial: 7000,
            remainingBalanceIncVat: 42000,
            amountPaidDepositCustomer: 5000,
            remainingBalance: 37000,
            
            // Additional Information
            additionalInformation: 'Vehicle includes extended warranty and service package.'
          }
          setInitialData(testData)
          console.log('Using test data for enterprise invoice editor')
        }
      } catch (error) {
        console.error('Failed to load invoice data:', error)
        // Use test data as fallback
        const testData = {
          vehicleRegistration: 'TEST123',
          make: 'Test',
          model: 'Vehicle',
          customerName: 'Test Customer',
          invoiceNumber: 'TEST-001'
        }
        setInitialData(testData)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [router])

  const handleSave = async (data: Record<string, any>) => {
    try {
      // Update sessionStorage with new data
      sessionStorage.setItem('enterpriseInvoiceData', JSON.stringify(data))
      
      // Here you could also save to your database
      // await saveInvoiceToDatabase(data)
      
      toast.success('Invoice data saved successfully')
    } catch (error) {
      console.error('Failed to save invoice:', error)
      toast.error('Failed to save invoice')
      throw error
    }
  }

  const handleClose = () => {
    // Clear stored data and navigate back
    sessionStorage.removeItem('enterpriseInvoiceData')
    router.push('/invoice')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading Enterprise Invoice Editor...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">No Data Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>No invoice data was found. Please start from the invoice form.</p>
            <Button onClick={() => router.push('/invoice')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoice Form
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoice Form
              </Button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Multi-Page Invoice Editor
                </h1>
                <p className="text-sm text-gray-500">
                  Complete invoice with checklist and terms & conditions
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                First2Page Template
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <MultiPageInvoiceEditor
          initialData={initialData}
          onSave={handleSave}
          onClose={handleClose}
        />
      </div>
    </div>
  )
}
