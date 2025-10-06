'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, Edit3, Eye, Car } from 'lucide-react'
import { generateInvoicePDF, downloadPDF } from '@/lib/pdfService'
import { StockDetailData } from '@/types/stock'

interface InvoiceFormData {
  // Step 1: Vehicle & Sale Information
  saleType: string
  invoiceNumber: string
  invoiceTo: 'Finance Company' | 'Customer'
  vehicleRegistration: string
  make: string
  model: string
  colour: string
  derivative: string
  mileage: number
  engineNumber: string
  engineCapacity: string
  vin: string
  firstRegDate: string
  fuelType: string
  salePrice: number
  dateOfSale: string
  monthOfSale: string
  quarterOfSale: number
  costOfPurchase: number
  dateOfPurchase: string
  daysInStock: number

  // Step 2: Customer Details
  title: string
  firstName: string
  middleName: string
  surname: string
  address: {
    street: string
    address2: string
    city: string
    county: string
    postCode: string
    country: string
  }
  contactNumber: string
  emailAddress: string

  // Additional fields for calculations
  subtotal?: number
  amountPaid?: number
  remainingBalance?: number
  [key: string]: string | number | object | undefined
}

export default function StockInvoiceEditor() {
  const router = useRouter()
  const params = useParams()
  const { isSignedIn, isLoaded } = useAuth()
  const stockId = params.stockId as string

  const [stockData, setStockData] = useState<StockDetailData | null>(null)
  const [invoiceData, setInvoiceData] = useState<InvoiceFormData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  // Load stock data and invoice data
  useEffect(() => {
    const loadData = async () => {
      if (!stockId) return

      try {
        // Load stock data
        const stockResponse = await fetch(`/api/stock/${stockId}`)
        if (stockResponse.ok) {
          const stockResult = await stockResponse.json()
          if (stockResult.success) {
            setStockData(stockResult.data)
          }
        }

        // Load form data from sessionStorage (if coming from invoice form)
        const storedData = sessionStorage.getItem('invoiceFormData')
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData)
            setInvoiceData(parsedData)
          } catch (error) {
            console.error('Error parsing stored invoice data:', error)
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [stockId])

  // Convert form data to InvoiceTemplate format
  const convertToTemplateFormat = (data: InvoiceFormData) => {
    const formatCurrency = (value: number | string) => {
      if (typeof value === 'string') return value
      if (value === 0 || value == null) return '£0.00'
      return `£${value.toFixed(2)}`
    }

    // Return data in the format expected by InvoiceTemplate
    return {
      // Company Details (defaults)
      companyName: 'MWA Autos Ltd',
      companyAddress: '3 Elson Street',
      companyCity: 'Nottingham',
      companyPostcode: 'NG7 7HQ',
      companyEmail: 'info@mwaautosltd.co.uk',
      companyPhone: '0115 784 4104',
      companyNumber: 'Company No: 12345678',
      vatNumber: 'VAT No 431024648',

      // Invoice Details
      invoiceNumber: data.invoiceNumber || '',
      dateOfSale: data.dateOfSale || '',
      salePrice: formatCurrency(data.salePrice || 0),
      salePricePostDiscount: formatCurrency(data.salePrice || 0),
      balanceToFinance: formatCurrency(data.remainingBalance || 0),
      customerBalanceDue: formatCurrency(data.remainingBalance || 0),

      // Vehicle Details
      vehicleRegistration: data.vehicleRegistration || '',
      make: data.make || '',
      model: data.model || '',
      derivative: data.derivative || '',
      mileage: data.mileage?.toString() || '0',
      engineNumber: data.engineNumber || '',
      engineCapacity: data.engineCapacity || '',
      vin: data.vin || '',
      firstRegDate: data.firstRegDate || '',
      colour: data.colour || '',

      // Customer Details
      title: data.title || '',
      firstName: data.firstName || '',
      middleName: data.middleName || '',
      surname: data.surname || '',
      streetAddress: data.address?.street || '',
      addressLine2: data.address?.address2 || '',
      city: data.address?.city || '',
      county: data.address?.county || '',
      postCode: data.address?.postCode || '',
      contactNumber: data.contactNumber || '',
      emailAddress: data.emailAddress || '',

      // Finance Details
      invoiceTo: data.invoiceTo || 'Customer',
      financeCompany: '',
      financeCompanyName: '',
      financeCompanyAddress: '',
      financeCompanyDetails: '',

      // Warranty Details
      warrantyLevel: 'Standard',
      warrantyPrice: '£0.00',
      warrantyPricePostDiscount: '£0.00',
      inHouse: 'Yes' as const,
      warrantyDetails: '',

      // Discounts
      discountOnSalePrice: '£0.00',
      discountOnWarranty: '£0.00',

      // Add-ons
      financeAddon1: '',
      financeAddon1Cost: '£0.00',
      financeAddon2: '',
      financeAddon2Cost: '£0.00',
      customerAddon1: '',
      customerAddon1Cost: '£0.00',
      customerAddon2: '',
      customerAddon2Cost: '£0.00',

      // Delivery
      collectionDelivery: 'Collection' as const,
      deliveryCost: '£0.00',
      dateOfCollectionDelivery: '',

      // Deposits and Payments
      compulsorySaleDepositFinance: '£0.00',
      compulsorySaleDepositNonFinance: '£0.00',
      amountPaidInDepositF: '£0.00',
      amountPaidInDepositC: '£0.00',
      depositDateF: '',
      depositDateC: '',
      outstandingDepositAmountF: '£0.00',

      // Part Exchange
      amountPaidInPartExchange: '£0.00',
      pxMakeAndModel: '',
      pxVehicleRegistration: '',
      settlementAmount: '£0.00',

      // Additional Information
      additionalInformation: '',
      saleType: (data.saleType as 'Retail' | 'Trade' | 'Commercial') || 'Retail',
      subtotal: formatCurrency(data.subtotal || 0),
      vatCommercial: '£0.00',
      subtotalF: formatCurrency(data.subtotal || 0),
      remainingBalance: formatCurrency(data.remainingBalance || 0)
    }
  }

  const handleGeneratePDF = async () => {
    if (!invoiceData) return
    
    setIsGeneratingPDF(true)
    try {
      // Add the fourth page content to the invoice data
      const fourthPageContent = `VEHICLE CHECKLIST AND TERMS\n\nThis invoice represents the complete transaction details for the vehicle purchase. All terms and conditions have been agreed upon by both parties.\n\nVehicle Inspection Completed: Yes\nAll Documentation Verified: Yes\nPayment Terms Agreed: Yes\n\nCustomer Signature: _________________\nDealer Signature: _________________\nDate: ${new Date().toLocaleDateString()}`;
      const dataWithFourthPage = { ...invoiceData, page4: fourthPageContent };

      const pdfBytes = await generateInvoicePDF(dataWithFourthPage)
      downloadPDF(pdfBytes, `invoice_${invoiceData.invoiceNumber}_${stockData?.vehicle?.registration || 'vehicle'}.pdf`)
      alert('✅ Professional Invoice PDF Generated and Downloaded!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('❌ Error generating PDF. Please check your popup blocker settings and try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleBackToStock = () => {
    router.push(`/mystock/${stockId}`)
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 animate-spin rounded-full border-4 border-transparent border-t-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading invoice editor...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                No Invoice Data Found
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-gray-600 mb-6">
                No invoice data found for this vehicle. Please generate an invoice from the stock actions first.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleBackToStock} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Stock
                </Button>
                <Button onClick={() => router.push(`/mystock/${stockId}/invoice`)}>
                  Generate Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-6 h-6 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Invoice Editor</h1>
              </div>
              <p className="text-gray-600">
                {stockData?.vehicle?.make} {stockData?.vehicle?.model} - {stockData?.vehicle?.registration}
              </p>
              <p className="text-sm text-gray-500">
                Review and edit your invoice before generating the final PDF
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleBackToStock}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Stock
              </Button>
              
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isEditing ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Preview Mode
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    Edit Mode
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-transparent border-t-white" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <InvoiceTemplate 
              initialData={convertToTemplateFormat(invoiceData)}
              onDataChange={(data) => {
                // Update only the fields that can be safely updated
                if (invoiceData) {
                  const safeUpdates: Partial<InvoiceFormData> = {
                    invoiceNumber: data.invoiceNumber || invoiceData.invoiceNumber,
                    firstName: data.firstName || invoiceData.firstName,
                    surname: data.surname || invoiceData.surname,
                    make: data.make || invoiceData.make,
                    model: data.model || invoiceData.model,
                    vehicleRegistration: data.vehicleRegistration || invoiceData.vehicleRegistration,
                    dateOfSale: data.dateOfSale || invoiceData.dateOfSale,
                  };
                  const updatedData = { ...invoiceData, ...safeUpdates };
                  setInvoiceData(updatedData);
                  sessionStorage.setItem('invoiceFormData', JSON.stringify(updatedData));
                }
              }}
              isEditable={isEditing}
            />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}
