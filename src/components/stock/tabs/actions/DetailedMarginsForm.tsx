"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LicensePlate from "@/components/ui/license-plate";
import { useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery';
import { 
  PiggyBank, 
  Save, 
  RotateCcw,
  TrendingUp,
  TrendingDown,
  PoundSterling,
  Calculator,
  BarChart3,
  Sparkles,
  Target,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { formatCurrency, formatPercentage, type DetailedMarginCalculations } from '@/lib/marginCalculations';

interface DetailedMarginsFormProps {
  stockData?: {
    metadata?: {
      stockId?: string;
    };
    vehicle?: {
      registration?: string;
    };
  };
  onSuccess?: () => void;
}

export default function DetailedMarginsForm({ stockData, onSuccess }: DetailedMarginsFormProps) {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  
  const [calculations, setCalculations] = useState<DetailedMarginCalculations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCommercialPurchase, setIsCommercialPurchase] = useState(false);

  const inputBaseClass = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-blue-500/20'
  }`;

  const labelClass = `block text-sm font-semibold mb-3 ${
    isDarkMode ? 'text-white' : 'text-slate-700'
  }`;

  // Load and calculate margins on component mount and when commercial status changes
  const loadMarginCalculations = useCallback(async () => {
    if (!stockData?.metadata?.stockId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/stock-actions/detailed-margins?stockId=${stockData.metadata.stockId}&isCommercialPurchase=${isCommercialPurchase}`
      );
      const result = await response.json();
      
      if (result.success) {
        if (result.data) {
          setCalculations(result.data);
          console.log('✅ Margin calculations loaded:', result.data);
        } else {
          setError(result.message || 'Vehicle data incomplete. Please ensure purchase info, costs, and sale details are filled.');
        }
      } else {
        setError(result.error || 'Failed to calculate margins');
      }
    } catch (error) {
      console.error('❌ Error loading margin calculations:', error);
      setError('Failed to load margin calculations');
    } finally {
      setIsLoading(false);
    }
  }, [stockData?.metadata?.stockId, isCommercialPurchase]);

  // Load calculations on component mount and when dependencies change
  useEffect(() => {
    loadMarginCalculations();
  }, [loadMarginCalculations]);

  const handleRecalculate = async () => {
    await loadMarginCalculations();
  };

  const handleCommercialToggle = (checked: boolean) => {
    setIsCommercialPurchase(checked);
  };

  return (
    <div className="w-full p-4 space-y-4 bg-gradient-to-br from-amber-100/80 via-yellow-100/60 to-orange-100/80">
      {/* Enhanced Header */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-2xl blur-xl opacity-20 ${
          isDarkMode ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gradient-to-r from-blue-400 to-cyan-500'
        }`} />
        
        <div className={`relative p-6 rounded-2xl border backdrop-blur-sm ${
          isDarkMode 
                      ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-amber-100/80 border-yellow-300/50 shadow-orange-200/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30' 
                  : 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200/50'
              }`}>
                <PiggyBank className={`h-6 w-6 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-slate-100 to-slate-300 bg-clip-text text-transparent' 
                    : 'from-slate-800 to-slate-600 bg-clip-text text-transparent'
                }`}>
                  Detailed Margins
                </h2>
                <p className={`text-sm flex items-center mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Calculate comprehensive profit margins and VAT
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Net Profit
              </div>
              <div className={`text-2xl font-bold ${
                calculations && calculations.netProfit >= 0
                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                  : isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {calculations ? formatCurrency(calculations.netProfit) : '£0.00'}
              </div>
              {calculations && (
                <div className={`text-xs mt-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {calculations.profitCategory} • {formatPercentage(calculations.netMarginPercent)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Controls and Status */}
        <Card className={`p-6 rounded-2xl border shadow-lg backdrop-blur-sm ${
          isDarkMode 
            ? 'bg-slate-900/50 border-slate-700/50' 
            : 'bg-amber-100/80 border-yellow-300/50 shadow-orange-200/40'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stock ID */}
            <div className="group">
              <label className={labelClass}>
                Stock ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={stockData?.metadata?.stockId || ''}
                  readOnly
                  className={`${inputBaseClass} ${
                    isDarkMode 
                      ? 'bg-slate-800/30 border-slate-700/30 text-slate-400' 
                      : 'bg-slate-100/50 border-slate-200/50 text-slate-600'
                  } cursor-not-allowed pr-10`}
                  placeholder="Stock ID"
                />
                <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center ${
                  isDarkMode ? 'text-white' : 'text-slate-400'
                }`}>
                  🔒
                </div>
              </div>
            </div>
            
            {/* Registration */}
            <div className="group">
              <div className="space-y-2">
                <label className={`${labelClass} mb-0 block ml-4 pl-2`}>
                  Registration
                </label>
                <div className="flex justify-start">
                  <LicensePlate 
                    registration={calculations?.registration || stockData?.vehicle?.registration || 'N/A'} 
                    size="xl" 
                    className="" 
                  />
                </div>
              </div>
            </div>

            {/* Commercial Purchase Toggle */}
            <div className="group">
              <label className={labelClass}>
                Purchase Type
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleCommercialToggle(!isCommercialPurchase)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isCommercialPurchase 
                      ? 'bg-blue-600' 
                      : isDarkMode ? 'bg-slate-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isCommercialPurchase ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                  {isCommercialPurchase ? 'Vat Qualifying' : 'Marginal'}
                </span>
              </div>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="mt-6 pt-4 border-t border-slate-200/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {isLoading && (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      Calculating margins...
                    </span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-500">{error}</span>
                  </div>
                )}
                {calculations && !isLoading && !error && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      Calculations up to date
                    </span>
                  </div>
                )}
              </div>
              <Button
                type="button"
                onClick={handleRecalculate}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className={`${
                  isDarkMode
                    ? 'border-slate-600 bg-slate-800/50 text-slate-100 hover:bg-slate-700/50'
                    : 'border-slate-300 bg-white/50 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Recalculate
              </Button>
            </div>
          </div>
        </Card>



        {/* VAT Calculations Section */}
        {calculations && (
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-slate-900/50 border-slate-700/50' 
              : 'bg-amber-100/80 border-yellow-300/50 shadow-orange-200/40'
          }`}>
            <div className={`p-4 rounded-xl mb-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10`}>
              <div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  VAT Calculations
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  Automatically calculated VAT breakdown
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Outlay on Vehicle
                  </span>
                  <Calculator className="h-4 w-4 text-blue-500" />
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(calculations.outlayOnVehicle)}
                </div>
              
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                    VAT on Spend
                  </span>
                  <PoundSterling className="h-4 w-4 text-green-500" />
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(calculations.vatOnSpend)}
                </div>
               
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    VAT on Purchase
                  </span>
                  <Target className="h-4 w-4 text-purple-500" />
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(calculations.vatOnPurchase)}
                </div>
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {isCommercialPurchase ? 'Purchase price ÷ 6' : 'Private purchase'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                    VAT on Sale Price
                  </span>
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(calculations.vatOnSalePrice)}
                </div>
              
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                    VAT to Pay
                  </span>
                  <BarChart3 className="h-4 w-4 text-red-500" />
                </div>
                <div className={`text-xl font-bold ${
                  calculations.vatToPay >= 0 
                    ? isDarkMode ? 'text-white' : 'text-slate-900'
                    : 'text-red-500'
                }`}>
                  {formatCurrency(calculations.vatToPay)}
                </div>
              
              </div>
            </div>
          </Card>
        )}

        {/* Profit Calculations Section */}
        {calculations && (
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-slate-900/50 border-slate-700/50' 
              : 'bg-amber-100/80 border-yellow-300/50 shadow-orange-200/40'
          }`}>
            <div className={`p-4 rounded-xl mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10`}>
              <div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Profit Calculations
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  Comprehensive profit analysis and margins
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    Gross Profit
                  </span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className={`text-xl font-bold ${
                  calculations.grossProfit >= 0 
                    ? isDarkMode ? 'text-white' : 'text-slate-900'
                    : 'text-red-500'
                }`}>
                  {formatCurrency(calculations.grossProfit)}
                </div>
             
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-teal-300' : 'text-teal-700'}`}>
                    Net Profit
                  </span>
                  <Target className="h-4 w-4 text-teal-500" />
                </div>
                <div className={`text-xl font-bold ${
                  calculations.netProfit >= 0 
                    ? isDarkMode ? 'text-white' : 'text-slate-900'
                    : 'text-red-500'
                }`}>
                  {formatCurrency(calculations.netProfit)}
                </div>
              
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                    Margin Pre-VAT
                  </span>
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                </div>
                <div className={`text-xl font-bold ${
                  calculations.profitMarginPreVat >= 0 
                    ? isDarkMode ? 'text-white' : 'text-slate-900'
                    : 'text-red-500'
                }`}>
                  {formatCurrency(calculations.profitMarginPreVat)}
                </div>
             
              </div>

              <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                    Margin Post-VAT
                  </span>
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </div>
                <div className={`text-xl font-bold ${
                  calculations.profitMarginPostVat >= 0 
                    ? isDarkMode ? 'text-white' : 'text-slate-900'
                    : 'text-red-500'
                }`}>
                  {formatCurrency(calculations.profitMarginPostVat)}
                </div>
               
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="mt-8 pt-6 border-t border-slate-200/20">
              <h4 className={`text-md font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Performance Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatPercentage(calculations.grossMarginPercent)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Gross Margin %
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatPercentage(calculations.netMarginPercent)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Net Margin %
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {calculations.daysInStock}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Days in Stock
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrency(calculations.profitPerDay)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Profit per Day
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Summary Card */}
        {calculations && (
          <Card className={`p-6 rounded-2xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-slate-900/50 border-slate-700/50' 
              : 'bg-amber-100/80 border-yellow-300/50 shadow-orange-200/40'
          }`}>
            <div className="text-center">
            
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                  All calculations are up to date and reflect current vehicle data
                </span>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}