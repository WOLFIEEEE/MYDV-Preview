"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LicensePlate from "@/components/ui/license-plate";
import { useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery';
import { 
  Undo, 
  Save, 
  RotateCcw,
  PoundSterling,
  Sparkles,
  Calculator,
  AlertCircle,
  Plus,
  Trash2
} from "lucide-react";

interface ReturnCostsFormProps {
  stockData: any;
  onSuccess?: () => void;
}

export default function ReturnCostsForm({ stockData, onSuccess }: ReturnCostsFormProps) {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    // Stock identification fields
    stockReference: stockData?.metadata?.stockId || '',
    registration: stockData?.vehicle?.registration || ''
  });

  // Dynamic cost entries
  const [vatableCosts, setVatableCosts] = useState<Array<{id: number, description: string, price: string}>>([]);
  
  const [nonVatableCosts, setNonVatableCosts] = useState<Array<{id: number, description: string, price: string}>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Functions to handle dynamic cost entries
  const addVatableCost = () => {
    const newId = vatableCosts.length > 0 ? Math.max(...vatableCosts.map(c => c.id)) + 1 : 1;
    setVatableCosts([...vatableCosts, { id: newId, description: '', price: '' }]);
  };

  const removeVatableCost = (id: number) => {
    setVatableCosts(vatableCosts.filter(cost => cost.id !== id));
  };

  const updateVatableCost = (id: number, field: 'description' | 'price', value: string) => {
    setVatableCosts(vatableCosts.map(cost => 
      cost.id === id ? { ...cost, [field]: value } : cost
    ));
  };

  const addNonVatableCost = () => {
    const newId = nonVatableCosts.length > 0 ? Math.max(...nonVatableCosts.map(c => c.id)) + 1 : 1;
    setNonVatableCosts([...nonVatableCosts, { id: newId, description: '', price: '' }]);
  };

  const removeNonVatableCost = (id: number) => {
    setNonVatableCosts(nonVatableCosts.filter(cost => cost.id !== id));
  };

  const updateNonVatableCost = (id: number, field: 'description' | 'price', value: string) => {
    setNonVatableCosts(nonVatableCosts.map(cost => 
      cost.id === id ? { ...cost, [field]: value } : cost
    ));
  };

  const inputBaseClass = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-red-500/20'
  }`;

  const labelClass = `block text-sm font-semibold mb-3 ${
    isDarkMode ? 'text-white' : 'text-slate-700'
  }`;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  // Load existing data on component mount
  useEffect(() => {
    const loadReturnCostsData = async () => {
      if (!stockData?.metadata?.stockId) return;
      
      try {
        const response = await fetch(`/api/stock-actions/return-costs?stockId=${stockData.metadata.stockId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const data = result.data;
            setFormData({
              stockReference: data.stockReference || stockData?.metadata?.stockId || '',
              registration: data.registration || stockData?.vehicle?.registration || ''
            });
            
            // Load dynamic cost arrays
            if (data.vatableCosts && Array.isArray(data.vatableCosts) && data.vatableCosts.length > 0) {
              setVatableCosts(data.vatableCosts);
            }
            if (data.nonVatableCosts && Array.isArray(data.nonVatableCosts) && data.nonVatableCosts.length > 0) {
              setNonVatableCosts(data.nonVatableCosts);
            }
          }
        }
      } catch (error) {
        console.error('Error loading return costs data:', error);
      }
    };

    loadReturnCostsData();
  }, [stockData?.metadata?.stockId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const apiData = {
        stockId: stockData?.metadata?.stockId,
        vatableCosts: vatableCosts,
        nonVatableCosts: nonVatableCosts,
        stockReference: formData.stockReference,
        registration: formData.registration
      };

      console.log('📝 Saving return costs:', apiData);

      const response = await fetch('/api/stock-actions/return-costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Return costs saved successfully:', result.data);
        alert('Return costs saved successfully!');
        
        // Invalidate inventory cache to reflect updated return costs
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
        console.log('🔄 Inventory cache invalidated - return costs will reflect in inventory table');
        
        // Call onSuccess callback to refresh action statuses
        if (onSuccess) {
          console.log('🔄 Calling onSuccess callback to refresh action statuses');
          onSuccess();
        }
      } else {
        console.error('❌ API Error:', result.error);
        alert(`Failed to save return costs: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error saving return costs:', error);
      alert('Error saving return costs. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      stockReference: stockData?.metadata?.stockId || '',
      registration: stockData?.vehicle?.registration || ''
    });
    setVatableCosts([]);
    setNonVatableCosts([]);
  };

  return (
    <div className="w-full p-4 space-y-4 bg-gradient-to-br from-red-100/80 via-rose-100/60 to-pink-100/80">
      {/* Header */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-2xl blur-xl opacity-20 ${
          isDarkMode ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-red-400 to-orange-500'
        }`} />
        
        <div className={`relative p-4 rounded-xl border backdrop-blur-sm ${
          isDarkMode 
                      ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-red-100/80 border-rose-300/50 shadow-pink-200/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30' 
                  : 'bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/50'
              }`}>
                <Undo className={`h-6 w-6 ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-slate-100 to-slate-300 bg-clip-text text-transparent' 
                    : 'from-slate-800 to-slate-600 bg-clip-text text-transparent'
                }`}>
                  Return Costs
                </h2>
                <p className={`text-sm flex items-center mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Process return costs and refunds
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Total Return Amount
              </div>
              <div className={`text-2xl font-bold ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                £{(
                  vatableCosts.reduce((sum, cost) => sum + (parseFloat(cost.price) || 0), 0) +
                  nonVatableCosts.reduce((sum, cost) => sum + (parseFloat(cost.price) || 0), 0)
                ).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Stock Identification Fields */}
        <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
          isDarkMode 
                      ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-red-100/80 border-rose-300/50 shadow-pink-200/40'
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>Stock ID</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.stockReference}
                  readOnly
                  className={`${inputBaseClass} cursor-not-allowed pr-10`}
                  placeholder="Stock ID"
                />
                <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center ${isDarkMode ? 'text-white' : 'text-slate-400'}`}>
                  🔒
                </div>
              </div>
            </div>
            
            <div>
              <div className="space-y-2">
                <label className={`block text-sm font-semibold mb-0 ml-4 pl-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>Registration</label>
                <div className="flex justify-start">
                  <LicensePlate 
                    registration={formData.registration || 'N/A'} 
                    size="xl" 
                    className="" 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className={`mt-4 text-xs flex items-center ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
            <AlertCircle className="h-3 w-3 mr-1" />
            These fields are automatically populated and cannot be modified
          </div>
        </Card>

        {/* Return Costs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vatable Costs */}
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
                        ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-red-100/80 border-rose-300/50 shadow-pink-200/40'
          }`}>
            <div className={`p-4 rounded-xl mb-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 flex items-center justify-between`}>
              <div>
                <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Vatable Return Costs
                </h4>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  Subtotal: £{vatableCosts.reduce((sum, cost) => sum + (parseFloat(cost.price) || 0), 0).toFixed(2)}
                </p>
              </div>
              <Button
                type="button"
                onClick={addVatableCost}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-4">
              {vatableCosts.length === 0 ? (
                <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                  <p>No return costs added yet. Click "Add" to add your first cost entry.</p>
                </div>
              ) : (
                vatableCosts.map((cost, index) => (
                <div key={cost.id} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Return Cost {index + 1}
                    </h5>
                    <Button
                      type="button"
                      onClick={() => removeVatableCost(cost.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={cost.description}
                        onChange={(e) => updateVatableCost(cost.id, 'description', e.target.value)}
                        className={inputBaseClass}
                        placeholder="Enter cost description"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        Price (£)
                      </label>
                      <div className="relative">
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          £
                        </div>
                        <input
                          type="number"
                          value={cost.price}
                          onChange={(e) => updateVatableCost(cost.id, 'price', e.target.value)}
                          className={`${inputBaseClass} pl-8`}
                          placeholder="0.00"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </Card>

          {/* Non-Vatable Costs */}
          <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
            isDarkMode 
                        ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-red-100/80 border-rose-300/50 shadow-pink-200/40'
          }`}>
            <div className={`p-4 rounded-xl mb-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 flex items-center justify-between`}>
              <div>
                <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Non-Vatable Return Costs
                </h4>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  Subtotal: £{nonVatableCosts.reduce((sum, cost) => sum + (parseFloat(cost.price) || 0), 0).toFixed(2)}
                </p>
              </div>
              <Button
                type="button"
                onClick={addNonVatableCost}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-4">
              {nonVatableCosts.length === 0 ? (
                <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                  <p>No return costs added yet. Click "Add" to add your first cost entry.</p>
                </div>
              ) : (
                nonVatableCosts.map((cost, index) => (
                <div key={cost.id} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Return Cost {index + 1}
                    </h5>
                    <Button
                      type="button"
                      onClick={() => removeNonVatableCost(cost.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={cost.description}
                        onChange={(e) => updateNonVatableCost(cost.id, 'description', e.target.value)}
                        className={inputBaseClass}
                        placeholder="Enter cost description"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                        Price (£)
                      </label>
                      <div className="relative">
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          £
                        </div>
                        <input
                          type="number"
                          value={cost.price}
                          onChange={(e) => updateNonVatableCost(cost.id, 'price', e.target.value)}
                          className={`${inputBaseClass} pl-8`}
                          placeholder="0.00"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-200/20">
          <Button
            type="submit"
            disabled={isSubmitting}
            className={`flex items-center justify-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isSubmitting 
                ? 'scale-95' 
                : 'hover:scale-105 hover:shadow-lg'
            } ${
              isDarkMode
                        ? 'bg-red-400 hover:bg-red-500 text-white shadow-lg shadow-red-300/15'
        : 'bg-red-400 hover:bg-red-500 text-white shadow-lg shadow-red-300/15'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                Processing Return...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Return Costs
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={resetForm}
            variant="outline"
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
              isDarkMode
                ? 'border-slate-600 bg-slate-800/50 text-slate-100 hover:bg-slate-700/50 hover:border-slate-500 hover:text-white'
                : 'border-slate-300 bg-white/50 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
            }`}
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Reset Form
          </Button>
        </div>


      </form>
    </div>
  );
}