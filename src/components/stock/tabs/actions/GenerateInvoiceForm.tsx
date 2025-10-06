"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowRight, Car, PoundSterling, Gauge } from "lucide-react";
import { StockItem } from "@/types/stock";

// Extended stock data to handle cache properties
interface ExtendedStockItem extends StockItem {
  forecourtPriceGBP?: number | string;
}

interface GenerateInvoiceFormProps {
  stockData: ExtendedStockItem;
  onSuccess?: () => void;
}

export default function GenerateInvoiceForm({ stockData }: GenerateInvoiceFormProps) {
  const router = useRouter();

  const handleGenerateInvoice = () => {
    // Navigate to the authenticated invoice form with stock data
    if (stockData?.metadata?.stockId) {
      router.push(`/mystock/${stockData.metadata.stockId}/invoice`);
    }
  };

  // Get forecourt price with multiple fallbacks
  const getForcourtPrice = () => {
    // Try multiple sources for forecourt price
    const price = 
      stockData?.adverts?.retailAdverts?.forecourtPrice?.amountGBP ||
      stockData?.adverts?.forecourtPrice?.amountGBP ||
      stockData?.forecourtPrice || // Flattened property from StockItem
      stockData?.forecourtPriceGBP || // From cache data
      stockData?.adverts?.retailAdverts?.totalPrice?.amountGBP ||
      stockData?.adverts?.retailAdverts?.suppliedPrice?.amountGBP ||
      0;
    
    return typeof price === 'string' ? parseFloat(price) : (price || 0);
  };

  const forecourtPrice = getForcourtPrice();

  return (
    <div className="flex justify-center items-center min-h-[400px] p-4">
      <Card className="w-full max-w-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Generate Invoice
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Create a professional invoice for this vehicle
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Vehicle Information Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {stockData?.vehicle?.make || stockData?.make || 'Unknown'} {stockData?.vehicle?.model || stockData?.model || 'Model'}
                </h3>
                
                {/* Vehicle Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">REG</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Registration</p>
                      <p className="font-semibold text-gray-900">
                        {stockData?.vehicle?.registration || stockData?.registration || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <Gauge className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Mileage</p>
                      <p className="font-semibold text-gray-900">
                        {(stockData?.vehicle?.odometerReadingMiles || stockData?.odometerReadingMiles || 0).toLocaleString()} miles
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <PoundSterling className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Forecourt Price</p>
                      <p className="font-bold text-green-600 text-lg">
                        {forecourtPrice > 0 ? `£${forecourtPrice.toLocaleString()}` : 'Price TBC'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Process Steps */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 text-center mb-4">Invoice Generation Process</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h5 className="font-medium text-gray-900 mb-1">Auto-Fill Vehicle Data</h5>
                <p className="text-sm text-gray-600">Vehicle information will be automatically populated</p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h5 className="font-medium text-gray-900 mb-1">Customer Details</h5>
                <p className="text-sm text-gray-600">Add customer and sale information</p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <h5 className="font-medium text-gray-900 mb-1">Generate PDF</h5>
                <p className="text-sm text-gray-600">Review and create professional invoice</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <Button 
              onClick={handleGenerateInvoice}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={!stockData?.metadata?.stockId}
            >
              <FileText className="w-5 h-5 mr-2" />
              Start Invoice Generation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            {!stockData?.metadata?.stockId && (
              <p className="text-center text-sm text-red-500 mt-2">
                Stock ID is required to generate invoice
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}