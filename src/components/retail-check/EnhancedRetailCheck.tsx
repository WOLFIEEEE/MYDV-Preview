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
  TrendingDown,
  PoundSterling,
  RefreshCw,
  Settings,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Shield,
  AlertTriangle,
  FileText,
  BarChart3,
  Users,
  Target,
  Calculator
} from "lucide-react";
import { RetailCheckData, VehicleInfo } from "@/types/retail-check";
import VehicleCheckOverview from "./VehicleCheckOverview";
import ValuationPanel from "./ValuationPanel";
import TrendedValuationChart from "./TrendedValuationChart";
import EnhancedPriceCalculator from "./EnhancedPriceCalculator";
import ImprovedEnhancedVehicleMetrics from "./ImprovedEnhancedVehicleMetrics";
import CompetitionTable from "./CompetitionTable";

interface FlowData {
  type: 'stock' | 'vehicle-finder' | 'taxonomy';
  stockId?: string;
  registration?: string;
  vrm?: string;
  derivativeId?: string;
  mileage?: number;
}

interface EnhancedVehicleCheck {
  status: 'passed' | 'warning' | 'failed';
  stolen: boolean;
  scrapped: boolean;
  written_off: boolean;
  imported: boolean;
  exported: boolean;
  highRisk: boolean;
  mileageDiscrepancy: boolean;
  outstandingFinance: boolean;
  previousKeepers: number;
  lastMOT?: {
    date: string;
    result: 'pass' | 'fail';
    mileage: number;
  };
  advisories: string[];
  recalls: string[];
}

interface EnhancedRetailCheckData {
  vehicleInfo: VehicleInfo;
  valuations: {
    retailValue: number;
    partExValue: number;
    tradeValue: number;
    forecourtPrice?: number;
  };
  timestamp: string;
  source: string;
  vehicleCheck?: EnhancedVehicleCheck;
  trendedValuations?: {
    period: string;
    data: Array<{
      date: string;
      retailValue: number;
      tradeValue: number;
      partExValue: number;
    }>;
  };
  competition?: {
    totalCompetitors: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    marketPosition: number;
    competitors: Array<{
      id: string;
      make: string;
      model: string;
      year: number;
      mileage: number;
      price: number;
      distance: number;
      dealer: string;
      location: string;
    }>;
  };
  priceCalculation?: {
    suggestedRetailPrice: number;
    margin: number;
    costs: number;
    targetBuyPrice: number;
    pricePosition: number;
  };
}

export default function EnhancedRetailCheck() {
  const { isDarkMode } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [retailCheckData, setRetailCheckData] = useState<EnhancedRetailCheckData | null>(null);
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
      // Vehicle Finder flow (has registration/vrm)
      flow = {
        type: 'vehicle-finder',
        vrm: vrm || undefined,
        registration: registration || vrm || undefined,
        derivativeId: derivativeId || undefined, // Include derivativeId if available
        mileage
      };
    } else if (derivativeId) {
      // Taxonomy Valuation flow (derivativeId only, no registration)
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

    console.log('🔍 Retail check flow detected:', flow);
    setFlowData(flow);
    loadRetailCheckData(flow);
  }, [searchParams]);

  const loadRetailCheckData = async (flow: FlowData) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get basic retail check data
      const retailResponse = await fetch('/api/retail-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: flow.type,
          ...(flow.stockId && { stockId: flow.stockId }),
          ...(flow.registration && { registration: flow.registration }),
          ...(flow.vrm && { vrm: flow.vrm }),
          ...(flow.derivativeId && { derivativeId: flow.derivativeId }),
          ...(flow.mileage && { mileage: flow.mileage }),
          check: true // Enable vehicle check
        })
      });

      if (!retailResponse.ok) {
        throw new Error(`Retail check failed: ${retailResponse.status}`);
      }

      const retailData = await retailResponse.json();
      
      if (!retailData.success) {
        throw new Error(retailData.error?.message || 'Retail check failed');
      }

      let enhancedData: EnhancedRetailCheckData = retailData.data;

      // Step 2: Load trended valuations if we have derivative info
      if (enhancedData.vehicleInfo?.derivativeId || flow.derivativeId) {
        try {
          // Prepare proper request for trended valuations API
          const derivativeId = flow.derivativeId || enhancedData.vehicleInfo?.derivativeId;
          const vehicleYear = enhancedData.vehicleInfo?.year || new Date().getFullYear();
          const mileage = enhancedData.vehicleInfo?.mileage || 0;
          
          // Calculate first registration date (assume January 1st of vehicle year)
          const firstRegistrationDate = `${vehicleYear}-01-01`;
          
          console.log('📈 Requesting trended valuations for:', {
            derivativeId,
            firstRegistrationDate,
            odometerReadingMiles: mileage,
            registration: enhancedData.vehicleInfo?.registration
          });

          if (!derivativeId) {
            console.warn('⚠️ No derivativeId available, skipping trended valuations');
          } else {
            // Include standard features for accurate valuation
            const allFeatures = enhancedData.vehicleInfo?.apiResponse?.features || [];
            const standardFeatures = allFeatures.filter((feature: any) => 
              feature.type === 'Standard' || feature.type === 'standard'
            ).map((feature: any) => ({ name: feature.name })) || [];

            console.log('🔧 Including standard features in trended valuations:', {
              totalFeatures: allFeatures.length,
              standardFeatures: standardFeatures.length,
              standardFeatureNames: standardFeatures.map((f: { name: string }) => f.name)
            });

            const trendedResponse = await fetch('/api/retail-check/trended-valuations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                derivativeId: derivativeId,
                firstRegistrationDate: firstRegistrationDate,
                odometerReadingMiles: mileage,
                registration: enhancedData.vehicleInfo?.registration,
                features: standardFeatures,
                conditionRating: 'GOOD'
              })
            });

            if (trendedResponse.ok) {
              const trendedData = await trendedResponse.json();
              console.log('✅ Trended valuations response:', trendedData);
              
              if (trendedData.success && trendedData.data) {
                // Transform API response to match our component interface
                const apiData = trendedData.data;
                enhancedData.trendedValuations = {
                  period: `${apiData.metadata?.weeks_of_data || 26} weeks`,
                  data: apiData.labels.map((label: string, index: number) => ({
                    date: apiData.metadata?.start_date ? 
                      new Date(new Date(apiData.metadata.start_date).getTime() + (index * 7 * 24 * 60 * 60 * 1000)).toISOString() :
                      new Date().toISOString(),
                    retailValue: apiData.retail[index] || 0,
                    tradeValue: apiData.trade[index] || 0,
                    partExValue: apiData.partex[index] || 0
                  }))
                };
                
                console.log('✅ Transformed trended data:', enhancedData.trendedValuations);
              }
            } else {
              const errorData = await trendedResponse.json().catch(() => null);
              console.warn('⚠️ Trended valuations API returned error:', {
                status: trendedResponse.status,
                statusText: trendedResponse.statusText,
                error: errorData
              });
              // Gracefully skip trended valuations if API fails
              enhancedData.trendedValuations = undefined;
            }
          }
        } catch (trendedError) {
          console.warn('⚠️ Failed to load trended valuations (continuing without):', trendedError);
          // Gracefully skip trended valuations if API fails
          enhancedData.trendedValuations = undefined;
        }
      } else {
        console.log('📈 No derivative ID available, skipping trended valuations');
        // Skip trended valuations when no derivative ID
        enhancedData.trendedValuations = undefined;
      }

      // Step 3: Load competition data
      try {
        // Prepare competition request - prefer competitors URL if available
        const competitionRequest = enhancedData.vehicleInfo?.competitorsUrl 
          ? {
              // Use direct competitors URL from AutoTrader (preferred)
              vehicle: {
                competitorsUrl: enhancedData.vehicleInfo.competitorsUrl,
                make: enhancedData.vehicleInfo.make,
                model: enhancedData.vehicleInfo.model,
                year: enhancedData.vehicleInfo.year,
                mileage: enhancedData.vehicleInfo.mileage
              }
            }
          : {
              // Fallback to manual search parameters
              vehicle: {
                make: enhancedData.vehicleInfo?.make,
                model: enhancedData.vehicleInfo?.model,
                year: enhancedData.vehicleInfo?.year || 2020,
                mileage: enhancedData.vehicleInfo?.mileage || 0
              },
              filters: {
                max_distance: 50,
                year_range: {
                  min: (enhancedData.vehicleInfo?.year || 2020) - 2,
                  max: (enhancedData.vehicleInfo?.year || 2020) + 2
                },
                mileage_variance: 30 // 30% variance
              }
            };

        console.log('🏁 Competition request:', competitionRequest);

        const competitionResponse = await fetch('/api/retail-check/competition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(competitionRequest)
        });

        if (competitionResponse.ok) {
          const competitionData = await competitionResponse.json();
          if (competitionData.success) {
            // Use market_analysis data with camelCase aliases for compatibility
            enhancedData.competition = {
              ...competitionData.data.market_analysis,
              competitors: competitionData.data.competitors
            };
            console.log('✅ Competition data loaded:', {
              totalCompetitors: enhancedData.competition?.totalCompetitors || 0,
              averagePrice: enhancedData.competition?.averagePrice || 0
            });
          } else {
            console.warn('⚠️ Competition API returned unsuccessful response:', competitionData);
          }
        } else {
          const errorData = await competitionResponse.json().catch(() => null);
          console.warn('⚠️ Competition API returned error:', {
            status: competitionResponse.status,
            statusText: competitionResponse.statusText,
            error: errorData
          });
        }
      } catch (competitionError) {
        console.warn('⚠️ Failed to load competition data (continuing without):', competitionError);
      }

      // Step 4: Calculate pricing
      try {
        const priceResponse = await fetch('/api/retail-check/calculate-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            retail_value: enhancedData.valuations?.retailValue || 0,
            part_ex_value: enhancedData.valuations?.partExValue || 0,
            trade_value: enhancedData.valuations?.tradeValue || 0,
            vehicle_age: new Date().getFullYear() - (enhancedData.vehicleInfo?.year || 2020),
            mileage: enhancedData.vehicleInfo?.mileage || 0,
            competitor_prices: enhancedData.competition?.competitors?.map(c => c.price) || [],
            market_position: enhancedData.competition?.marketPosition || 50
          })
        });

        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          if (priceData.success) {
            enhancedData.priceCalculation = priceData.data;
            console.log('✅ Price calculation completed:', {
              suggestedRetailPrice: priceData.data.suggestedRetailPrice || 0,
              margin: priceData.data.margin || 0
            });
          } else {
            console.warn('⚠️ Price calculation API returned unsuccessful response:', priceData);
          }
        } else {
          const errorData = await priceResponse.json().catch(() => null);
          console.warn('⚠️ Price calculation API returned error:', {
            status: priceResponse.status,
            statusText: priceResponse.statusText,
            error: errorData
          });
        }
      } catch (priceError) {
        console.warn('⚠️ Failed to calculate pricing (continuing without):', priceError);
      }

      setRetailCheckData(enhancedData);
    } catch (err) {
      console.error('Error loading retail check data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load retail check data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (flowData) {
      loadRetailCheckData(flowData);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getBadgeInfo = (type: string) => {
    const badges = {
      'stock': { label: 'My Stock', color: 'bg-blue-500' },
      'vehicle-finder': { label: 'Vehicle Finder', color: 'bg-green-500' },
      'taxonomy': { label: 'Taxonomy Valuation', color: 'bg-purple-500' }
    };
    return badges[type as keyof typeof badges] || { label: 'Unknown', color: 'bg-gray-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
              <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Performing comprehensive retail check...
              </p>
              <p className={`text-sm mt-2 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                This may take a few moments
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md text-center">
              <CardContent className="p-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold mb-2">Error</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleRefresh} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                  <Button onClick={handleBack} variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!retailCheckData || !flowData) {
    return null;
  }

  const badgeInfo = getBadgeInfo(flowData.type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={handleBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Retail Check Report
                </h1>
                <Badge className={`${badgeInfo.color} text-white`}>
                  {badgeInfo.label}
                </Badge>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Comprehensive analysis for {retailCheckData.vehicleInfo?.make} {retailCheckData.vehicleInfo?.model}
              </p>
            </div>
          </div>
          
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Vehicle Check Overview */}
          <div className="lg:col-span-1">
            <VehicleCheckOverview 
              vehicleInfo={retailCheckData.vehicleInfo}
              vehicleCheck={retailCheckData.vehicleCheck}
              isDarkMode={isDarkMode}
              flowType={flowData.type}
              vehicleImage={retailCheckData.vehicleInfo?.images?.[0]}
            />
          </div>

          {/* Right Column - Valuations */}
          <div className="lg:col-span-2 space-y-6">
            <ValuationPanel 
              valuations={retailCheckData.valuations}
              vehicleInfo={retailCheckData.vehicleInfo}
              isDarkMode={isDarkMode}
              stockId={flowData?.stockId}
            />
            
            {retailCheckData.trendedValuations && (
              <TrendedValuationChart 
                trendedData={retailCheckData.trendedValuations}
                isDarkMode={isDarkMode}
                currentRetailValue={retailCheckData.valuations?.retailValue}
                currentPartExValue={retailCheckData.valuations?.partExValue}
                currentTradeValue={retailCheckData.valuations?.tradeValue}
                currentStockPrice={retailCheckData.vehicleInfo?.forecourtPrice} // Add stock price
              />
            )}
          </div>
        </div>

        {/* Bottom Section - Always Show Both */}
        <div className="space-y-12">
          {/* Price Calculator Section */}
          <div className="relative">
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Purchase Price Calculator
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} mt-1`}>
                  Calculate optimal pricing strategy and target buy price based on market data
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                Step 1
              </div>
            </div>
            
            <EnhancedPriceCalculator 
              vehicleInfo={retailCheckData.vehicleInfo}
              valuations={retailCheckData.valuations}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Enhanced Vehicle Metrics Section */}
          <div className="relative">
            <ImprovedEnhancedVehicleMetrics 
              vehicleInfo={retailCheckData.vehicleInfo}
              isDarkMode={isDarkMode}
              onMetricsUpdate={(metrics) => {
                console.log('Enhanced metrics updated:', metrics);
                // You can store this in state if needed for other components
              }}
            />
          </div>

          {/* Visual Separator */}
          <div className="relative">
            <div className={`absolute inset-0 flex items-center ${isDarkMode ? '' : ''}`}>
              <div className={`w-full border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-4 py-2 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-white text-gray-500 border border-gray-200'}`}>
                Market Analysis
              </span>
            </div>
          </div>

          {/* Competition Analysis Section - Only show for Stock and Vehicle Finder flows */}
          {(flowData.type === 'stock' || flowData.type === 'vehicle-finder') && (
            <>
              {retailCheckData.competition && (
                <div className="relative">
                  {/* Section Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Competition Analysis
                      </h2>
                      <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} mt-1`}>
                        Market positioning and competitor comparison within your area
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                      Step 2
                    </div>
                  </div>
                  
                  <CompetitionTable 
                    competitionData={retailCheckData.competition}
                    vehicleInfo={retailCheckData.vehicleInfo}
                    isDarkMode={isDarkMode}
                  />
                </div>
              )}

              {/* No Competition Data Fallback */}
              {!retailCheckData.competition && (
                <div className="relative">
                  {/* Section Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Competition Analysis
                      </h2>
                      <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} mt-1`}>
                        Market positioning and competitor comparison
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                      Step 2
                    </div>
                  </div>
                  
                  <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <CardContent className="p-12">
                      <div className="text-center">
                        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto mb-4">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Competition Data Loading
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} max-w-md mx-auto`}>
                          We're gathering competitor information for this vehicle. This helps you understand market positioning and pricing strategy.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          {/* Taxonomy Flow - Show Alternative Message */}
          {flowData.type === 'taxonomy' && (
            <div className="relative">
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Technical Specifications
                  </h2>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'} mt-1`}>
                    Detailed technical information and derivative specifications
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                  Taxonomy
                </div>
              </div>
              
              <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vehicle Specifications */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Vehicle Details
                      </h3>
                      <div className="space-y-3">
                        {retailCheckData.vehicleInfo?.make && (
                          <div className="flex justify-between">
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Make:</span>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {retailCheckData.vehicleInfo.make}
                            </span>
                          </div>
                        )}
                        {retailCheckData.vehicleInfo?.model && (
                          <div className="flex justify-between">
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Model:</span>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {retailCheckData.vehicleInfo.model}
                            </span>
                          </div>
                        )}
                        {retailCheckData.vehicleInfo?.derivative && (
                          <div className="flex justify-between">
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Derivative:</span>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {retailCheckData.vehicleInfo.derivative}
                            </span>
                          </div>
                        )}
                        {retailCheckData.vehicleInfo?.year && (
                          <div className="flex justify-between">
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Year:</span>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {retailCheckData.vehicleInfo.year}
                            </span>
                          </div>
                        )}
                        {flowData.mileage && (
                          <div className="flex justify-between">
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mileage:</span>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {flowData.mileage.toLocaleString()} miles
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data Availability Notice */}
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Data Availability
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Technical Specifications
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Market Valuations
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Vehicle Metrics
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Vehicle History (requires registration)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Competition Analysis (requires registration)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Vehicle Images (requires registration)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="flex items-start gap-3">
                      <Info className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <div>
                        <h4 className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                          Taxonomy Flow Information
                        </h4>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                          This analysis is based on derivative specifications only. For complete vehicle history, 
                          competition analysis, and images, please use the Vehicle Finder with a registration number.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

