'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import InvoiceForm from '@/components/invoice/InvoiceForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Car, FileText } from 'lucide-react'
import { StockDetailData } from '@/types/stock'

export default function StockInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const { isSignedIn, isLoaded } = useAuth()
  const stockId = params.stockId as string

  const [stockData, setStockData] = useState<StockDetailData | null>(null)
  const [saleDetailsData, setSaleDetailsData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  // Load stock data and sale details
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

        // Load sale details data (if exists)
        const saleDetailsResponse = await fetch(`/api/stock-actions/sale-details?stockId=${stockId}`)
        if (saleDetailsResponse.ok) {
          const saleDetailsResult = await saleDetailsResponse.json()
          if (saleDetailsResult.success && saleDetailsResult.data) {
            console.log('📋 Sale details loaded for auto-population:', saleDetailsResult.data)
            setSaleDetailsData(saleDetailsResult.data)
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
            <p className="text-gray-600">Loading invoice form...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!stockData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Stock Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-gray-600 mb-6">
                Unable to load stock data for this vehicle.
              </p>
              <Button onClick={handleBackToStock} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My Stock
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  console.log('🧾 Rendering invoice form for stock:', {stockData})
  console.log('🧾 Sale details for auto-population:', {saleDetailsData})

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="w-full pt-16">
        {/* Compact Header Section */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Generate Invoice</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Car className="w-4 h-4" />
                    <span>
                      {stockData.vehicle?.make} {stockData.vehicle?.model} - {stockData.vehicle?.registration}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleBackToStock}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Stock
            </Button>
          </div>
        </div>

        {/* Invoice Form - Full Width */}
        <div className="px-4 py-4">
          <InvoiceForm stockData={stockData} stockActionsData={saleDetailsData} />
        </div>
      </div>
      
      <Footer />
    </div>
  )
}
