"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Car, 
  Calendar, 
  Gauge, 
  TrendingUp,
  PoundSterling,
  RefreshCw,
  Settings,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";
import { RetailCheckData } from "@/types/retail-check";

interface FlowData {
  type: 'stock' | 'vehicle-finder' | 'taxonomy';
  stockId?: string;
  registration?: string;
  vrm?: string;
  derivativeId?: string;
  mileage?: number;
}

export default function RetailCheckContent() {
  const { isDarkMode } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [retailCheckData, setRetailCheckData] = useState<RetailCheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Determine which flow we're in based on URL parameters
    const stockId = searchParams.get('stockId');
    const registration = searchParams.get('registration');
    const vrm = searchParams.get('vrm');
    const derivativeId = searchParams.get('derivativeId');
    const mileageParam = searchParams.get('mileage');
    const mileage = mileageParam ? parseInt(mileageParam) : undefined;

    let flow: FlowData;

    if (stockId) {
      // My Stock flow
      flow = {
        type: 'stock',
        stockId,
        registration: registration || undefined,
        mileage
      };
    } else if (vrm || registration) {
      // Vehicle Finder flow
      flow = {
        type: 'vehicle-finder',
        vrm: vrm || undefined,
        registration: registration || vrm || undefined,
        mileage
      };
    } else if (derivativeId) {
      // Taxonomy Valuation flow
      flow = {
        type: 'taxonomy',
        derivativeId,
        mileage
      };
    } else {
      setError('No valid parameters provided for retail check');
      setLoading(false);
      return;
    }

    setFlowData(flow);
    loadRetailCheckData(flow);
  }, [searchParams]);

  const loadRetailCheckData = async (flow: FlowData) => {
    setLoading(true);
    setError(null);

    try {
      // Prepare API request based on flow type
      const requestBody = {
        flow: flow.type,
        ...(flow.stockId && { stockId: flow.stockId }),
        ...(flow.registration && { registration: flow.registration }),
        ...(flow.vrm && { vrm: flow.vrm }),
        ...(flow.derivativeId && { derivativeId: flow.derivativeId }),
        ...(flow.mileage && { mileage: flow.mileage })
      };

      console.log('🔍 Making retail check API request:', requestBody);

      const response = await fetch('/api/retail-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `API request failed: ${response.status}`);
      }

      if (data.success && data.data) {
        setRetailCheckData(data.data);
      } else {
        throw new Error('No retail check data received from API');
      }
    } catch (err) {
      console.error('Error loading retail check data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load retail check data');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getFlowBadge = () => {
    if (!flowData) return null;

    const badges = {
      'stock': { label: 'My Stock', color: 'bg-blue-500' },
      'vehicle-finder': { label: 'Vehicle Finder', color: 'bg-green-500' },
      'taxonomy': { label: 'Taxonomy Valuation', color: 'bg-purple-500' }
    };

    const badge = badges[flowData.type];
    return (
      <Badge className={`${badge.color} text-white`}>
        {badge.label}
      </Badge>
    );
  };

  const getFlowInfo = () => {
    if (!flowData) return null;

    const info = [];
    if (flowData.stockId) info.push(`Stock ID: ${flowData.stockId}`);
    if (flowData.registration) info.push(`Registration: ${flowData.registration}`);
    if (flowData.vrm) info.push(`VRM: ${flowData.vrm}`);
    if (flowData.derivativeId) info.push(`Derivative ID: ${flowData.derivativeId}`);
    if (flowData.mileage) info.push(`Mileage: ${flowData.mileage.toLocaleString()} miles`);

    return info.join(' • ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="container mx-auto p-6 pt-24">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
              <CardContent className="p-8">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-semibold mb-2">Loading Retail Check</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing vehicle data and market conditions...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="container mx-auto p-6 pt-24">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
              <CardContent className="p-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold mb-2">Error</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!retailCheckData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      <div className="container mx-auto p-6 pt-24">
        {/* Header */}
        <div className="mb-6">
          <Button onClick={handleBack} variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between mb-4">
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Retail Check
              </h1>
              {getFlowBadge()}
            </div>
            
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              {getFlowInfo()}
            </p>

            {/* Vehicle Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-blue-600" />
                <div>
                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Vehicle</div>
                  <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {retailCheckData.vehicleInfo.make} {retailCheckData.vehicleInfo.model}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Year</div>
                  <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {retailCheckData.vehicleInfo.year}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Gauge className="w-5 h-5 text-blue-600" />
                <div>
                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Mileage</div>
                  <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {retailCheckData.vehicleInfo.mileage.toLocaleString()} miles
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-600" />
                <div>
                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Registration</div>
                  <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {retailCheckData.vehicleInfo.registration}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Valuations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { key: 'retailValue', label: 'Retail Value', icon: TrendingUp, primary: true },
            { key: 'partExValue', label: 'Part Exchange', icon: RefreshCw },
            { key: 'tradeValue', label: 'Trade Value', icon: Settings },
            { key: 'forecourtPrice', label: 'Forecourt Price', icon: PoundSterling }
          ].map(({ key, label, icon: Icon, primary }) => {
            const value = retailCheckData.valuations?.[key as keyof typeof retailCheckData.valuations];
            
            return (
              <Card
                key={key}
                className={`transition-all duration-300 hover:scale-105 ${
                  primary
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0'
                    : isDarkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-white'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`w-6 h-6 ${primary ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${primary ? 'text-white' : isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    £{(value || 0).toLocaleString()}
                  </div>
                  <div className={`text-sm ${primary ? 'text-blue-100' : isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    {label}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Market Analysis & Vehicle Check */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Market Analysis */}
          <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
            <CardHeader>
              <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                Market Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Competitors</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {retailCheckData.marketAnalysis?.competitorCount || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Average Price</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  £{retailCheckData.marketAnalysis?.averagePrice?.toLocaleString() || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Price Range</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {retailCheckData.marketAnalysis?.priceRange ? 
                    `£${retailCheckData.marketAnalysis.priceRange.min.toLocaleString()} - £${retailCheckData.marketAnalysis.priceRange.max.toLocaleString()}` : 
                    'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Market Position</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {retailCheckData.marketAnalysis?.marketPosition ? `${retailCheckData.marketAnalysis.marketPosition}%` : 'N/A'}
                </span>
              </div>
              {retailCheckData.marketAnalysis?.daysToSell && (
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Est. Days to Sell</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    {retailCheckData.marketAnalysis.daysToSell} days
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Check */}
          {retailCheckData.vehicleCheck && (
            <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  Vehicle Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Overall Status</span>
                  <Badge className={
                    retailCheckData.vehicleCheck.status === 'passed' 
                      ? 'bg-green-500' 
                      : retailCheckData.vehicleCheck.status === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }>
                    {retailCheckData.vehicleCheck.status.toUpperCase()}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Stolen Check</span>
                    {retailCheckData.vehicleCheck.stolen ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Scrapped</span>
                    {retailCheckData.vehicleCheck.scrapped ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Write Off</span>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      {retailCheckData.vehicleCheck.writeOff}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Finance</span>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      {retailCheckData.vehicleCheck.finance}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>High Risk</span>
                    {retailCheckData.vehicleCheck.highRisk ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Price Calculator */}
        <Card className={isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}>
          <CardHeader>
            <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              Price Calculator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  £{retailCheckData.calculator?.retailPrice?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Retail Price</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {retailCheckData.calculator?.pricePosition ? `${retailCheckData.calculator.pricePosition}%` : 'N/A'}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Price Position</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  £{retailCheckData.calculator?.margin?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Margin</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  £{retailCheckData.calculator?.costs?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Costs</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  £{retailCheckData.calculator?.targetBuyPrice?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Target Buy Price</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
