"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LicensePlate from "@/components/ui/license-plate";
import { useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '@/hooks/useInventoryDataQuery';
import { 
  PoundSterling, 
  Save, 
  RotateCcw,
  Plus,
  Trash2,
  Calculator,
  ChevronDown,
  Truck,
  Car,
  Wrench,
  Hammer,
  Palette,
  FileText,
  Sparkles,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface AddCostsFormProps {
  stockData?: {
    metadata?: {
      stockId?: string;
    };
    vehicle?: {
      registration?: string;
    };
  };
  onSuccess?: () => void;
  isEditMode?: boolean; // New prop to indicate if we're editing existing costs
}

type CategoryKey = 'service' | 'parts' | 'repairs' | 'dents' | 'bodyshop';
type GroupKey = 'exVat' | 'incVat';

interface GroupedCostItem {
  description: string;
  amount: string;
}

type GroupedCostsState = Record<GroupKey, Record<CategoryKey, GroupedCostItem[]>>;

const createInitialGroupedCosts = (): GroupedCostsState => {
  const createCategoryItems = () => ({
    service: [],
    parts: [],
    repairs: [],
    dents: [],
    bodyshop: []
  });

  return {
    exVat: createCategoryItems(),
    incVat: createCategoryItems()
  };
};

export default function AddCostsForm({ stockData, onSuccess, isEditMode = false }: AddCostsFormProps) {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  
  // Stock identification fields
  const [stockFields] = useState({
    stockReference: stockData?.metadata?.stockId || '',
    registration: stockData?.vehicle?.registration || ''
  });
  
  // Fixed top-level costs
  const [fixedCosts, setFixedCosts] = useState({
    transportIn: '',
    transportOut: '',
    mot: ''
  });

  // Sub-parts for categories under EX VAT and INC VAT
  const [groupedCosts, setGroupedCosts] = useState<GroupedCostsState>(createInitialGroupedCosts());

  // Collapsible state: Use simple object for state management
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const toggleExpanded = useCallback((group: GroupKey, category: CategoryKey) => {
    const sectionKey = `${group}-${category}`;
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);

  const isExpanded = useCallback((group: GroupKey, category: CategoryKey) => {
    const sectionKey = `${group}-${category}`;
    return Boolean(expandedSections[sectionKey]);
  }, [expandedSections]);



  const addGroupedItem = useCallback((group: GroupKey, category: CategoryKey) => {
    setGroupedCosts(prev => {
      const newState = { ...prev };
      newState[group] = { ...prev[group] };
      newState[group][category] = [...prev[group][category], { description: '', amount: '' }];
      return newState;
    });
  }, []);

  const updateGroupedItem = useCallback((
    group: GroupKey,
    category: CategoryKey,
    index: number,
    field: keyof GroupedCostItem,
    value: string
  ) => {
    setGroupedCosts(prev => {
      const list = [...prev[group][category]];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [group]: { ...prev[group], [category]: list } };
    });
  }, []);

  const removeGroupedItem = useCallback((group: GroupKey, category: CategoryKey, index: number) => {
    setGroupedCosts(prev => {
      const list = [...prev[group][category]];
      list.splice(index, 1);
      return { 
        ...prev, 
        [group]: { 
          ...prev[group], 
          [category]: list 
        } 
      };
    });
  }, []);

  const sumGrouped = useCallback((group: GroupKey) => {
    const categories: CategoryKey[] = ['service','parts','repairs','dents','bodyshop'];
    return categories.reduce((sum, cat) => {
      const arr = groupedCosts[group][cat];
      return sum + arr.reduce((s, v) => s + (parseFloat(v.amount) || 0), 0);
    }, 0);
  }, [groupedCosts]);

  const sumCategory = useCallback((group: GroupKey, category: CategoryKey) => {
    return groupedCosts[group][category].reduce((s, v) => s + (parseFloat(v.amount) || 0), 0);
  }, [groupedCosts]);

  const sumFixedCosts = useCallback(() => {
    return Object.values(fixedCosts).reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0);
  }, [fixedCosts]);

    const calculateTotal = () => {
    const fixedTop = [fixedCosts.transportIn, fixedCosts.transportOut, fixedCosts.mot]
      .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

    return fixedTop + sumGrouped('exVat') + sumGrouped('incVat');
  };

  // Load existing data on component mount
  useEffect(() => {
    const loadVehicleCostsData = async () => {
      if (!stockData?.metadata?.stockId) return;
      
      try {
        const response = await fetch(`/api/stock-actions/vehicle-costs?stockId=${stockData.metadata.stockId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const data = result.data;
            
            // Load fixed costs
            setFixedCosts({
              transportIn: data.transportIn || '',
              transportOut: data.transportOut || '',
              mot: data.mot || ''
            });
            
            // Load grouped costs from JSON fields
            if (data.exVatCosts || data.incVatCosts) {
              const loadedGroupedCosts: GroupedCostsState = {
                exVat: data.exVatCosts || {
                  service: [],
                  parts: [],
                  repairs: [],
                  dents: [],
                  bodyshop: []
                },
                incVat: data.incVatCosts || {
                  service: [],
                  parts: [],
                  repairs: [],
                  dents: [],
                  bodyshop: []
                }
              };
              setGroupedCosts(loadedGroupedCosts);
            }
          }
        }
      } catch (error) {
        console.error('Error loading vehicle costs data:', error);
      }
    };

    loadVehicleCostsData();
  }, [stockData?.metadata?.stockId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const apiData = {
        stockId: stockFields.stockReference,
        stockReference: stockFields.stockReference,
        registration: stockFields.registration,
        fixedCosts,
        groupedCosts,
        replaceMode: true // Always use replace mode to prevent unexpected cost merging
      };

      console.log('📝 Saving vehicle costs:', apiData);

      const response = await fetch('/api/stock-actions/vehicle-costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Vehicle costs saved successfully:', result.data);
        
        // Invalidate inventory cache to reflect updated costs
        queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
        console.log('🔄 Inventory cache invalidated - costs will reflect in inventory table');
        
        alert('Costs saved successfully!');
        // Call onSuccess callback to invalidate inventory cache
        if (onSuccess) {
          console.log('🔄 Calling onSuccess callback to refresh inventory cache');
          onSuccess();
        }
      } else {
        console.error('❌ API Error:', result.error);
        alert(`Failed to save costs: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error saving costs:', error);
      alert('Failed to save costs');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFixedCosts({ transportIn: '', transportOut: '', mot: '' });
    setGroupedCosts(createInitialGroupedCosts());
  };

  const handleFixedChange = (field: keyof typeof fixedCosts, value: string) => {
    setFixedCosts(prev => ({ ...prev, [field]: value }));
  };

  const inputBaseClass = `w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
    isDarkMode 
      ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600' 
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-blue-500/20'
  }`;

  const labelClass = `block text-sm font-semibold mb-3 ${
    isDarkMode ? 'text-white' : 'text-slate-700'
  }`;

  const categoryIcons = {
    service: Wrench,
    parts: Car,
    repairs: Hammer,
    dents: FileText,
    bodyshop: Palette
  };

  const fixedCostItems = [
    { field: 'transportIn' as keyof typeof fixedCosts, label: 'Transport In', icon: Truck },
    { field: 'transportOut' as keyof typeof fixedCosts, label: 'Transport Out', icon: Truck },
    { field: 'mot' as keyof typeof fixedCosts, label: 'MOT', icon: FileText }
  ];

  const renderGroupedSection = (group: GroupKey, title: string, subtitle?: string, gradientClass?: string) => {
    const cats: { key: CategoryKey; label: string }[] = [
      { key: 'service', label: 'Service' },
      { key: 'parts', label: 'Parts' },
      { key: 'repairs', label: 'Repairs' },
      { key: 'dents', label: 'Dents' },
      { key: 'bodyshop', label: 'Bodyshop' }
    ];

    return (
      <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
        isDarkMode 
          ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-violet-100/80 border-blue-300/50 shadow-cyan-200/40'
      }`}>
        {/* Section Header */}
        <div className={`p-4 rounded-xl mb-6 ${gradientClass || 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h4>
              {subtitle && (
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  {subtitle}
                </p>
              )}
            </div>
            <div className={`text-right ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
              <div className="text-sm font-medium">Subtotal</div>
              <div className="text-xl font-bold text-blue-500">
                £{sumGrouped(group).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {cats.map(({ key, label }) => {
            const IconComponent = categoryIcons[key];
            const categoryTotal = sumCategory(group, key);
            const hasItems = groupedCosts[group][key].some(item => item.description || item.amount);

            return (
              <div
                key={`${group}-${key}`}
                className={`rounded-xl border transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' 
                    : 'bg-violet-100/60 border-blue-300/60 hover:border-cyan-300/70'
                } ${hasItems ? 'ring-1 ring-blue-500/20' : ''}`}
              >
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(group, key)}
                  className={`w-full p-4 rounded-t-xl transition-all duration-200 hover:bg-opacity-80 ${
                    isExpanded(group, key)
                      ? isDarkMode 
                                    ? 'bg-blue-900/20'
            : 'bg-blue-50/80'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100/80'
                      }`}>
                        <IconComponent className={`h-4 w-4 ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="text-left">
                        <div className={`text-sm font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                          {label}
                        </div>
                        <div className={`text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          £{categoryTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-200 ${
                        isExpanded(group, key) ? 'rotate-180' : ''
                      } ${isDarkMode ? 'text-white' : 'text-slate-600'}`}
                    />
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded(group, key) && (
                  <div className="p-4 pt-2 space-y-4">
                    {groupedCosts[group][key].length === 0 ? (
                      /* Show only Add button when no items exist */
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addGroupedItem(group, key)}
                        className={`w-full py-3 rounded-xl border-2 border-dashed transition-all duration-200 hover:scale-[1.02] ${
                          isDarkMode
                            ? 'border-slate-600 text-slate-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5'
                            : 'border-slate-300 text-slate-600 hover:border-blue-500/50 hover:text-blue-600 hover:bg-blue-50/50'
                        }`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add {label} Item
                      </Button>
                    ) : (
                      /* Show items and add button when items exist */
                      <>
                        {groupedCosts[group][key].map((item, idx) => (
                          <div key={`${group}-${key}-item-${idx}`} className="space-y-3">
                            <div className="relative">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateGroupedItem(group, key, idx, 'description', e.target.value)}
                                onFocus={() => setFocusedField(`${group}-${key}-${idx}-desc`)}
                                onBlur={() => setFocusedField(null)}
                                className={`${inputBaseClass} ${
                                  focusedField === `${group}-${key}-${idx}-desc` ? 'ring-2 ring-blue-500/20 border-blue-500 scale-[1.02]' : ''
                                }`}
                                placeholder={`${label} description`}
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="relative flex-1">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                                  isDarkMode ? 'text-white' : 'text-slate-500'
                                }`}>
                                  £
                                </div>
                                <input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => updateGroupedItem(group, key, idx, 'amount', e.target.value)}
                                  onFocus={() => setFocusedField(`${group}-${key}-${idx}-amount`)}
                                  onBlur={() => setFocusedField(null)}
                                  className={`${inputBaseClass} pl-8 ${
                                    focusedField === `${group}-${key}-${idx}-amount` ? 'ring-2 ring-blue-500/20 border-blue-500 scale-[1.02]' : ''
                                  }`}
                                  placeholder="0.00"
                                  min="0"
                                />
                              </div>
                              
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeGroupedItem(group, key, idx)}
                                className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                                  isDarkMode
                                    ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                                    : 'border-red-300 text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Add Item Button */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addGroupedItem(group, key)}
                          className={`w-full mt-3 py-2 rounded-xl border-2 border-dashed transition-all duration-200 hover:scale-[1.02] ${
                            isDarkMode
                              ? 'border-slate-600 text-slate-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5'
                              : 'border-slate-300 text-slate-600 hover:border-blue-500/50 hover:text-blue-600 hover:bg-blue-50/50'
                          }`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add {label} Item
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const totalCosts = calculateTotal();

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-violet-100/80 via-blue-100/60 to-cyan-100/80">
      {/* Enhanced Header */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-2xl blur-xl opacity-20 ${
          isDarkMode ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-blue-400 to-indigo-500'
        }`} />
        
        <div className={`relative p-4 rounded-xl border backdrop-blur-sm ${
          isDarkMode 
            ? 'bg-slate-900/80 border-slate-700/50' 
            : 'bg-violet-100/70 border-blue-300/60 shadow-cyan-200/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${
                isDarkMode 
                          ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30'
        : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50'
              }`}>
                <PoundSterling className={`h-6 w-6 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-slate-100 to-slate-300 bg-clip-text text-transparent' 
                    : 'from-slate-800 to-slate-600 bg-clip-text text-transparent'
                }`}>
                  Costs
                </h2>
                <p className={`text-sm flex items-center mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Track all expenses related to this vehicle
                </p>
              </div>
            </div>
            
            {/* Total Cost Display */}
            <div className="text-right">
              <div className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-slate-700'
              }`}>
                Total Costs
              </div>
              <div className={`text-2xl font-bold flex items-center ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                <TrendingUp className="h-5 w-5 mr-2" />
                £{totalCosts.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Stock ID and Registration Combined Field */}
        <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
          isDarkMode 
                      ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-violet-100/80 border-blue-300/50 shadow-cyan-200/40'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stock ID */}
            <div className="group">
              <label className={labelClass}>
                Stock ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={stockFields.stockReference}
                  readOnly
                  className={`${inputBaseClass} ${
                    isDarkMode 
                      ? 'bg-slate-800/30 border-slate-700/30 text-slate-400' 
                      : 'bg-violet-100/40 border-blue-300/50 text-slate-600'
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
                    registration={stockFields.registration || 'N/A'} 
                    size="xl" 
                    className="" 
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={`mt-2 text-xs flex items-center ${
            isDarkMode ? 'text-white' : 'text-slate-500'
          }`}>
            <AlertCircle className="h-3 w-3 mr-1" />
            These fields are automatically populated and cannot be modified
          </div>
        </Card>

        {/* Fixed Costs Section */}
        <Card className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
          isDarkMode 
                      ? 'bg-slate-900/50 border-slate-700/50' 
          : 'bg-violet-100/80 border-blue-300/50 shadow-cyan-200/40'
        }`}>
          <div className={`p-4 rounded-xl mb-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Fixed Costs
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  Standard transportation and testing costs
                </p>
              </div>
              <div className={`text-right ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                <div className="text-sm font-medium">Subtotal</div>
                <div className="text-xl font-bold text-blue-500">
                  £{sumFixedCosts().toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {fixedCostItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <div key={item.field} className="relative">
                  <label className={labelClass}>
                    <IconComponent className="inline h-4 w-4 mr-2" />
                    {item.label}
                  </label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      £
                    </div>
                    <input
                      type="number"
                      value={fixedCosts[item.field]}
                      onChange={(e) => handleFixedChange(item.field, e.target.value)}
                      onFocus={() => setFocusedField(item.field)}
                      onBlur={() => setFocusedField(null)}
                      className={`${inputBaseClass} pl-8 ${
                        focusedField === item.field ? 'ring-2 ring-blue-500/20 border-blue-500 scale-[1.02]' : ''
                      }`}
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* INC VAT Section */}
        {renderGroupedSection(
          'incVat', 
          'INC VAT Costs', 
          'All prices including VAT',
          'bg-gradient-to-r from-green-500/10 to-emerald-500/10'
        )}

        {/* EX VAT Section */}
        {renderGroupedSection(
          'exVat', 
          'EX VAT Costs', 
          'All prices excluding VAT',
          'bg-gradient-to-r from-purple-500/10 to-indigo-500/10'
        )}

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
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                Saving Costs...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-3" />
                Save All Costs
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
              isDarkMode
                ? 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-slate-100 hover:border-slate-500 hover:text-white'
                : 'border-blue-300/70 bg-violet-100/60 hover:bg-blue-100/70 text-slate-700 hover:border-cyan-300/80'
            }`}
          >
            <RotateCcw className="h-5 w-5 mr-3" />
            Reset All
          </Button>
        </div>
      </form>

      {/* Cost Summary Card */}
      {totalCosts > 0 && (
        <Card className={`p-4 rounded-xl border-l-4 ${
          isDarkMode 
            ? 'border-l-blue-500 bg-gradient-to-r from-blue-900/20 to-indigo-900/10 border-slate-700/50' 
            : 'border-l-blue-500 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-slate-200/50'
        }`}>
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100/80'
            }`}>
              <Calculator className={`h-5 w-5 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-sm mb-2 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-800'
              }`}>
                Cost Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Fixed Costs: </span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    £{[fixedCosts.transportIn, fixedCosts.transportOut, fixedCosts.mot]
                      .reduce((sum, v) => sum + (parseFloat(v) || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>EX VAT: </span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    £{sumGrouped('exVat').toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>INC VAT: </span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    £{sumGrouped('incVat').toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}