"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PoundSterling, 
  TrendingUp, 
  Calendar, 
  Download, 
  Plus, 
  Trash2,
  Edit,
  Save,
  X,
  Building,
  Shield,
  Users,
  Megaphone,
  Wrench,
  Briefcase,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calculator,
  Info
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from '@clerk/nextjs';

interface DealershipCost {
  id: number;
  description: string;
  amount: string;
  hasVat: boolean;
  vatAmount: string | null;
  totalAmount: string;
  costType: 'recurring' | 'one_time' | 'miscellaneous';
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual' | null;
  category: string;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  status: 'active' | 'inactive' | 'completed';
  notes: string | null;
  isPaid: boolean;
  paidDate: string | null;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CostCategory {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
}

interface CostTotals {
  frequency: string | null;
  costType: string;
  total: number;
  count: number;
}

export default function EnhancedCostTracking() {
  const { isDarkMode } = useTheme();
  const { userId } = useAuth();

  const [costs, setCosts] = useState<DealershipCost[]>([]);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [totals, setTotals] = useState<CostTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [addingCost, setAddingCost] = useState(false);
  const [deletingCost, setDeletingCost] = useState<number | null>(null);
  const [editingCost, setEditingCost] = useState<DealershipCost | null>(null);
  const [projectionsExpanded, setProjectionsExpanded] = useState(false);

  // Export functionality - exports Excel file with what users see on screen
  const exportData = () => {
    // Create CSV content (Excel-compatible)
    const csvContent = generateCSVContent();
    
    // Create and download the file
    const blob = new Blob([csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealership-costs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate CSV content that matches what users see
  const generateCSVContent = () => {
    const lines: string[] = [];
    
    // Report Header
    lines.push('Dealership Cost Management Report');
    lines.push(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
    lines.push('');

    // Safety check for projections
    if (!projections) {
      lines.push('Error: No projection data available');
      return lines.join('\n');
    }
    
    // Cost Projections Summary (Always visible)
    lines.push('COST PROJECTIONS SUMMARY');
    lines.push('Period,Amount');
    lines.push(`Quarterly (Next 3 months),£${projections.quarterly.toFixed(2)}`);
    lines.push(`Annual (Next 12 months),£${projections.yearly.toFixed(2)}`);
    lines.push('');
    
    // Detailed Breakdown (Only if expanded)
    if (projectionsExpanded) {
      lines.push('DETAILED PROJECTION BREAKDOWN');
      lines.push('');
      
      lines.push('Quarterly Breakdown');
      lines.push('Cost Type,Effective Amount');
      lines.push(`Weekly Costs,£${projections.breakdown.quarterly.weekly.toFixed(2)}`);
      lines.push(`Monthly Costs,£${projections.breakdown.quarterly.monthly.toFixed(2)}`);
      lines.push(`Annual Costs (÷4),£${projections.breakdown.quarterly.annual.toFixed(2)}`);
      lines.push('');
      
      lines.push('Annual Breakdown');
      lines.push('Cost Type,Effective Amount');
      lines.push(`Weekly Costs,£${projections.breakdown.yearly.weekly.toFixed(2)}`);
      lines.push(`Monthly Costs,£${projections.breakdown.yearly.monthly.toFixed(2)}`);
      lines.push(`Annual Costs,£${projections.breakdown.yearly.annual.toFixed(2)}`);
      lines.push('');
    }
    
    // Cost Items by Frequency
    const frequencies = [
      { key: 'weekly', label: 'WEEKLY COSTS' },
      { key: 'monthly', label: 'MONTHLY COSTS' },
      { key: 'annual', label: 'ANNUAL COSTS' },
      { key: 'one_time', label: 'ONE-TIME COSTS' },
      { key: 'miscellaneous', label: 'MISCELLANEOUS COSTS' }
    ];
    
    // Safety check for costs array
    if (!costs || !Array.isArray(costs)) {
      lines.push('No cost data available');
      return lines.join('\n');
    }
    
    frequencies.forEach(({ key, label }) => {
      let filteredCosts: DealershipCost[] = [];
      
      if (key === 'one_time') {
        filteredCosts = costs.filter(cost => cost.costType === 'one_time');
      } else if (key === 'miscellaneous') {
        filteredCosts = costs.filter(cost => cost.costType === 'miscellaneous');
      } else {
        filteredCosts = costs.filter(cost => cost.frequency === key);
      }
      
      if (filteredCosts.length > 0) {
        lines.push(label);
        
        // Header row
        const headers = ['Description', 'Category', 'Base Amount', 'VAT', 'Total Amount', 'Status'];
        if (filteredCosts.some(cost => cost.startDate && cost.endDate)) {
          headers.push('Period');
        }
        if (filteredCosts.some(cost => cost.dueDate)) {
          headers.push('Due Date');
        }
        if (filteredCosts.some(cost => cost.notes)) {
          headers.push('Notes');
        }
        lines.push(headers.join(','));
        
        // Data rows
        filteredCosts.forEach(cost => {
          const row = [
            `"${cost.description}"`,
            `"${cost.category}"`,
            `£${parseFloat(cost.amount).toFixed(2)}`,
            cost.hasVat ? `£${parseFloat(cost.vatAmount || '0').toFixed(2)}` : '£0.00',
            `£${parseFloat(cost.totalAmount).toFixed(2)}`,
            cost.status
          ];
          
          if (filteredCosts.some(c => c.startDate && c.endDate)) {
            if (cost.startDate && cost.endDate) {
              row.push(`"${new Date(cost.startDate).toLocaleDateString()} - ${new Date(cost.endDate).toLocaleDateString()}"`);
            } else {
              row.push('');
            }
          }
          
          if (filteredCosts.some(c => c.dueDate)) {
            if (cost.dueDate) {
              row.push(`"${new Date(cost.dueDate).toLocaleDateString()}"`);
            } else {
              row.push('');
            }
          }
          
          if (filteredCosts.some(c => c.notes)) {
            if (cost.notes) {
              row.push(`"${cost.notes.replace(/"/g, '""')}"`);
            } else {
              row.push('');
            }
          }
          
          lines.push(row.join(','));
        });
        
        // Subtotal
        const subtotal = filteredCosts.reduce((sum, cost) => sum + parseFloat(cost.totalAmount), 0);
        lines.push(`SUBTOTAL,,,,,£${subtotal.toFixed(2)}`);
        lines.push('');
      }
    });
    
    // Summary Totals
    lines.push('SUMMARY TOTALS');
    lines.push('Frequency,Count,Total Amount');
    
    if (totals && totals.length > 0) {
      totals.forEach(total => {
        const frequency = total.frequency || 'Unknown';
        const totalAmount = typeof total.total === 'number' ? total.total : parseFloat(String(total.total || '0'));
        const count = typeof total.count === 'number' ? total.count : parseInt(String(total.count || '0'));
        lines.push(`${frequency.charAt(0).toUpperCase() + frequency.slice(1)},${count},£${totalAmount.toFixed(2)}`);
      });
    } else {
      lines.push('No summary data available');
    }
    
    return lines.join('\n');
  };

  const [newCost, setNewCost] = useState<{
    description: string;
    amount: string;
    hasVat: boolean;
    costType: 'recurring' | 'one_time' | 'miscellaneous';
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual' | null;
    category: string;
    startDate: string;
    endDate: string;
    dueDate: string;
    notes: string;
    paymentMethod: string;
  }>({
    description: '',
    amount: '',
    hasVat: false,
    costType: 'recurring',
    frequency: 'monthly',
    category: '',
    startDate: '',
    endDate: '',
    dueDate: '',
    notes: '',
    paymentMethod: ''
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const [costsRes, categoriesRes] = await Promise.all([
        fetch('/api/dealership-costs'),
        fetch('/api/cost-categories')
      ]);

      if (costsRes.ok) {
        const costsData = await costsRes.json();
        setCosts(costsData.costs || []);
        setTotals(costsData.totals || []);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add new cost with optimistic update
  const addCost = async (costData = newCost) => {
    if (!costData.description || !costData.amount || !costData.category) return;
    if (addingCost) return; // Prevent double submission

    setAddingCost(true);

    // Utility function to round currency values to 2 decimal places
    const roundToCurrency = (amount: number): number => {
      return Math.round(amount * 100) / 100;
    };

    // Calculate VAT and total for optimistic update
    const numAmount = parseFloat(costData.amount);
    const vatAmount = costData.hasVat ? roundToCurrency(numAmount * 0.2) : 0;
    const totalAmount = roundToCurrency(numAmount + vatAmount);

    // Create optimistic cost item
    const optimisticCost: DealershipCost = {
      id: Date.now(), // Temporary ID
      description: costData.description,
      amount: numAmount.toString(),
      hasVat: costData.hasVat,
      vatAmount: vatAmount > 0 ? vatAmount.toString() : null,
      totalAmount: totalAmount.toString(),
      costType: costData.costType,
      frequency: costData.frequency,
      category: costData.category,
      startDate: costData.startDate || null,
      endDate: costData.endDate || null,
      dueDate: costData.dueDate || null,
      status: 'active',
      notes: costData.notes || null,
      isPaid: false,
      paidDate: null,
      paymentMethod: costData.paymentMethod || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistically update the UI
    setCosts(prev => [...prev, optimisticCost]);
    
    // Update totals optimistically
    setTotals(prev => {
      const existingTotal = prev.find(t => t.frequency === costData.frequency && t.costType === costData.costType);
      if (existingTotal) {
        return prev.map(t => 
          t.frequency === costData.frequency && t.costType === costData.costType
            ? { ...t, total: t.total + totalAmount, count: t.count + 1 }
            : t
        );
      } else {
        return [...prev, {
          frequency: costData.frequency,
          costType: costData.costType,
          total: totalAmount,
          count: 1
        }];
      }
    });

    // Store the current cost data before resetting form
    const costDataToSend = { ...costData };

    // Reset form immediately
    setNewCost({
      description: '',
      amount: '',
      hasVat: false,
      costType: 'recurring',
      frequency: 'monthly',
      category: '',
      startDate: '',
      endDate: '',
      dueDate: '',
      notes: '',
      paymentMethod: ''
    });
    setShowAddForm(null);

    try {
      const response = await fetch('/api/dealership-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costDataToSend)
      });

      if (response.ok) {
        const result = await response.json();
        // Update the optimistic item with real data from server
        setCosts(prev => prev.map(cost => 
          cost.id === optimisticCost.id ? result.cost : cost
        ));
      } else {
        // Revert optimistic update on error
        setCosts(prev => prev.filter(cost => cost.id !== optimisticCost.id));
        setTotals(prev => {
          const existingTotal = prev.find(t => t.frequency === costDataToSend.frequency && t.costType === costDataToSend.costType);
          if (existingTotal && existingTotal.count > 1) {
            return prev.map(t => 
              t.frequency === costDataToSend.frequency && t.costType === costDataToSend.costType
                ? { ...t, total: t.total - totalAmount, count: t.count - 1 }
                : t
            );
          } else {
            return prev.filter(t => !(t.frequency === costDataToSend.frequency && t.costType === costDataToSend.costType));
          }
        });
        console.error('Failed to add cost');
      }
    } catch (error) {
      // Revert optimistic update on error
      setCosts(prev => prev.filter(cost => cost.id !== optimisticCost.id));
      setTotals(prev => {
        const existingTotal = prev.find(t => t.frequency === costDataToSend.frequency && t.costType === costDataToSend.costType);
        if (existingTotal && existingTotal.count > 1) {
          return prev.map(t => 
            t.frequency === costDataToSend.frequency && t.costType === costDataToSend.costType
              ? { ...t, total: t.total - totalAmount, count: t.count - 1 }
              : t
          );
        } else {
          return prev.filter(t => !(t.frequency === costDataToSend.frequency && t.costType === costDataToSend.costType));
        }
      });
      console.error('Error adding cost:', error);
    } finally {
      setAddingCost(false);
    }
  };

  // Delete cost with optimistic update
  const deleteCost = async (id: number) => {
    if (deletingCost === id) return; // Prevent double deletion
    
    // Find the cost to delete for rollback purposes
    const costToDelete = costs.find(cost => cost.id === id);
    if (!costToDelete) return;

    setDeletingCost(id);

    // Optimistically remove from UI
    setCosts(prev => prev.filter(cost => cost.id !== id));
    
    // Update totals optimistically
    const totalAmount = parseFloat(costToDelete.totalAmount);
    setTotals(prev => {
      const existingTotal = prev.find(t => t.frequency === costToDelete.frequency && t.costType === costToDelete.costType);
      if (existingTotal && existingTotal.count > 1) {
        return prev.map(t => 
          t.frequency === costToDelete.frequency && t.costType === costToDelete.costType
            ? { ...t, total: t.total - totalAmount, count: t.count - 1 }
            : t
        );
      } else {
        return prev.filter(t => !(t.frequency === costToDelete.frequency && t.costType === costToDelete.costType));
      }
    });

    try {
      const response = await fetch(`/api/dealership-costs/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setCosts(prev => [...prev, costToDelete]);
        setTotals(prev => {
          const existingTotal = prev.find(t => t.frequency === costToDelete.frequency && t.costType === costToDelete.costType);
          if (existingTotal) {
            return prev.map(t => 
              t.frequency === costToDelete.frequency && t.costType === costToDelete.costType
                ? { ...t, total: t.total + totalAmount, count: t.count + 1 }
                : t
            );
          } else {
            return [...prev, {
              frequency: costToDelete.frequency,
              costType: costToDelete.costType,
              total: totalAmount,
              count: 1
            }];
          }
        });
        console.error('Failed to delete cost');
      }
    } catch (error) {
      // Revert optimistic update on error
      setCosts(prev => [...prev, costToDelete]);
      setTotals(prev => {
        const existingTotal = prev.find(t => t.frequency === costToDelete.frequency && t.costType === costToDelete.costType);
        if (existingTotal) {
          return prev.map(t => 
            t.frequency === costToDelete.frequency && t.costType === costToDelete.costType
              ? { ...t, total: t.total + totalAmount, count: t.count + 1 }
              : t
          );
        } else {
          return [...prev, {
            frequency: costToDelete.frequency,
            costType: costToDelete.costType,
            total: totalAmount,
            count: 1
          }];
        }
      });
      console.error('Error deleting cost:', error);
    } finally {
      setDeletingCost(null);
    }
  };

  // Update existing cost
  const updateCost = async (updatedCost: DealershipCost) => {
    const originalCost = costs.find(c => c.id === updatedCost.id);
    if (!originalCost) return;

    // Optimistically update the UI
    setCosts(prev => prev.map(cost => 
      cost.id === updatedCost.id ? updatedCost : cost
    ));

    // Update totals optimistically
    const originalTotal = parseFloat(originalCost.totalAmount);
    const newTotal = parseFloat(updatedCost.totalAmount);
    const totalDifference = newTotal - originalTotal;

    setTotals(prev => prev.map(t => 
      t.frequency === updatedCost.frequency && t.costType === updatedCost.costType
        ? { ...t, total: t.total + totalDifference }
        : t
    ));

    setEditingCost(null);

    try {
      const response = await fetch(`/api/dealership-costs/${updatedCost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: updatedCost.description,
          amount: updatedCost.amount,
          hasVat: updatedCost.hasVat,
          category: updatedCost.category,
          notes: updatedCost.notes,
          startDate: updatedCost.startDate,
          endDate: updatedCost.endDate,
          dueDate: updatedCost.dueDate,
          paymentMethod: updatedCost.paymentMethod
        })
      });

      if (response.ok) {
        const result = await response.json();
        setCosts(prev => prev.map(cost => 
          cost.id === updatedCost.id ? result.cost : cost
        ));
      } else {
        // Revert on error
        setCosts(prev => prev.map(cost => 
          cost.id === updatedCost.id ? originalCost : cost
        ));
        setTotals(prev => prev.map(t => 
          t.frequency === updatedCost.frequency && t.costType === updatedCost.costType
            ? { ...t, total: t.total - totalDifference }
            : t
        ));
        console.error('Failed to update cost');
      }
    } catch (error) {
      // Revert on error
      setCosts(prev => prev.map(cost => 
        cost.id === updatedCost.id ? originalCost : cost
      ));
      setTotals(prev => prev.map(t => 
        t.frequency === updatedCost.frequency && t.costType === updatedCost.costType
          ? { ...t, total: t.total - totalDifference }
          : t
      ));
      console.error('Error updating cost:', error);
    }
  };

  // Calculate totals by frequency
  const getTotalByFrequency = (frequency: string | null) => {
    const total = totals
      .filter(t => t.frequency === frequency)
      .reduce((sum, t) => {
        // Ensure t.total is a number (it might come as string from API)
        const amount = typeof t.total === 'string' ? parseFloat(t.total) : (t.total || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    return total || 0; // Ensure we always return a number
  };

  // Get costs by frequency
  const getCostsByFrequency = (frequency: string | null) => {
    return costs.filter(cost => cost.frequency === frequency && cost.costType === 'recurring');
  };

  // Get one-time and miscellaneous costs
  const getOneTimeCosts = () => {
    return costs.filter(cost => cost.costType === 'one_time' || cost.costType === 'miscellaneous');
  };

  // Calculate effective cost based on date range and frequency
  const calculateEffectiveCost = (cost: DealershipCost, projectionStartDate: Date, projectionEndDate: Date) => {
    const amount = parseFloat(cost.totalAmount);
    
    // Calculate the projection period in days
    const projectionDays = Math.max(1, (projectionEndDate.getTime() - projectionStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // For recurring costs, calculate based on frequency
    if (cost.costType === 'recurring' && cost.frequency) {
      let effectiveAmount = 0;
      
      switch (cost.frequency) {
        case 'weekly':
          // Calculate number of weeks in projection period
          const weekMultiplier = Math.ceil(projectionDays / 7);
          effectiveAmount = amount * weekMultiplier;
          console.log(`Cost "${cost.description}" (weekly): ${weekMultiplier} weeks × £${amount.toFixed(2)} = £${effectiveAmount.toFixed(2)}`);
          break;
        case 'monthly':
          // Calculate number of months in projection period
          const monthMultiplier = Math.ceil(projectionDays / 30.44); // Average days per month
          effectiveAmount = amount * monthMultiplier;
          console.log(`Cost "${cost.description}" (monthly): ${monthMultiplier} months × £${amount.toFixed(2)} = £${effectiveAmount.toFixed(2)}`);
          break;
        case 'quarterly':
          // Calculate number of quarters in projection period
          const quarterMultiplier = Math.ceil(projectionDays / 91.31); // Average days per quarter
          effectiveAmount = amount * quarterMultiplier;
          console.log(`Cost "${cost.description}" (quarterly): ${quarterMultiplier} quarters × £${amount.toFixed(2)} = £${effectiveAmount.toFixed(2)}`);
          break;
        case 'annual':
          // For annual costs, use simple logic:
          // - Yearly projection: show exact annual amount
          // - Quarterly projection: divide by 4
          if (projectionDays >= 300) {
            // Yearly projection - use full annual amount
            effectiveAmount = amount;
            console.log(`Cost "${cost.description}" (annual): Yearly projection - using full amount £${amount.toFixed(2)}`);
          } else {
            // Quarterly projection - divide by 4
            effectiveAmount = amount / 4;
            console.log(`Cost "${cost.description}" (annual): Quarterly projection - £${amount.toFixed(2)} ÷ 4 = £${effectiveAmount.toFixed(2)}`);
          }
          break;
        default:
          effectiveAmount = amount;
          console.log(`Cost "${cost.description}" (unknown frequency): Using full amount £${amount.toFixed(2)}`);
      }
      
      return effectiveAmount;
    }
    
    // For one-time costs with date ranges, use proportional calculation
    if (!cost.startDate || !cost.endDate) {
      console.log(`Cost "${cost.description}": One-time cost, using full amount £${amount.toFixed(2)}`);
      return amount;
    }

    // Parse dates and handle timezone issues
    const costStartDate = new Date(cost.startDate + 'T00:00:00');
    const costEndDate = new Date(cost.endDate + 'T23:59:59');
    
    console.log(`Cost "${cost.description}":`, {
      originalStart: cost.startDate,
      originalEnd: cost.endDate,
      parsedStart: costStartDate.toISOString(),
      parsedEnd: costEndDate.toISOString(),
      projectionStart: projectionStartDate.toISOString(),
      projectionEnd: projectionEndDate.toISOString()
    });
    
    // Calculate overlap between cost period and projection period
    const overlapStart = new Date(Math.max(costStartDate.getTime(), projectionStartDate.getTime()));
    const overlapEnd = new Date(Math.min(costEndDate.getTime(), projectionEndDate.getTime()));
    
    // If no overlap, return 0
    if (overlapStart >= overlapEnd) {
      console.log(`Cost "${cost.description}": No overlap, returning 0`);
      return 0;
    }
    
    // Calculate the proportion of the cost period that overlaps with projection period
    const totalCostDays = Math.max(1, (costEndDate.getTime() - costStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const overlapDays = Math.max(1, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
    
    const proportion = overlapDays / totalCostDays;
    const effectiveAmount = amount * proportion;
    
    console.log(`Cost "${cost.description}": One-time proportional calculation`, {
      totalDays: Math.ceil(totalCostDays),
      overlapDays: Math.ceil(overlapDays),
      proportion: proportion.toFixed(4),
      originalAmount: amount.toFixed(2),
      effectiveAmount: effectiveAmount.toFixed(2)
    });
    
    return effectiveAmount;
  };

  // Get effective total by frequency with date consideration
  const getEffectiveTotalByFrequency = (frequency: string, projectionStartDate: Date, projectionEndDate: Date) => {
    const frequencyCosts = getCostsByFrequency(frequency);
    return frequencyCosts.reduce((total, cost) => {
      return total + calculateEffectiveCost(cost, projectionStartDate, projectionEndDate);
    }, 0);
  };

  // Get detailed cost breakdown for projections
  const getDetailedCostBreakdown = (frequency: string, projectionStartDate: Date, projectionEndDate: Date) => {
    const frequencyCosts = getCostsByFrequency(frequency);
    return frequencyCosts.map(cost => {
      const originalAmount = parseFloat(cost.totalAmount);
      const effectiveAmount = calculateEffectiveCost(cost, projectionStartDate, projectionEndDate);
      const isProrated = cost.startDate && cost.endDate && effectiveAmount !== originalAmount;
      
      let proratedInfo = null;
      if (isProrated) {
        const costStartDate = new Date(cost.startDate! + 'T00:00:00');
        const costEndDate = new Date(cost.endDate! + 'T23:59:59');
        const overlapStart = new Date(Math.max(costStartDate.getTime(), projectionStartDate.getTime()));
        const overlapEnd = new Date(Math.min(costEndDate.getTime(), projectionEndDate.getTime()));
        const totalDays = Math.max(1, (costEndDate.getTime() - costStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const overlapDays = Math.max(1, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
        const percentage = (overlapDays / totalDays) * 100;
        
        proratedInfo = {
          originalAmount,
          overlapDays: Math.ceil(overlapDays),
          totalDays: Math.ceil(totalDays),
          percentage,
          periodStart: overlapStart,
          periodEnd: overlapEnd,
          costStart: costStartDate,
          costEnd: costEndDate
        };
      }
      
      return {
        cost,
        effectiveAmount,
        originalAmount,
        isProrated,
        proratedInfo
      };
    });
  };

  // Calculate projections with detailed breakdown
  const calculateProjections = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    // Calculate quarter end (3 months from now)
    const quarterEnd = new Date(now);
    quarterEnd.setMonth(quarterEnd.getMonth() + 3);
    quarterEnd.setHours(23, 59, 59, 999); // End of the day
    
    // Calculate year end (12 months from now)
    const yearEnd = new Date(now);
    yearEnd.setFullYear(yearEnd.getFullYear() + 1);
    yearEnd.setHours(23, 59, 59, 999); // End of the day
    
    const quarterDays = Math.ceil((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const yearDays = Math.ceil((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('Projection periods:', {
      now: now.toISOString(),
      quarterEnd: quarterEnd.toISOString(),
      yearEnd: yearEnd.toISOString(),
      quarterDays,
      yearDays
    });

    // Get detailed breakdowns for each frequency
    const quarterlyDetails = {
      weekly: getDetailedCostBreakdown('weekly', now, quarterEnd),
      monthly: getDetailedCostBreakdown('monthly', now, quarterEnd),
      annual: getDetailedCostBreakdown('annual', now, quarterEnd) // Use quarterEnd for quarterly projection
    };

    const yearlyDetails = {
      weekly: getDetailedCostBreakdown('weekly', now, yearEnd),
      monthly: getDetailedCostBreakdown('monthly', now, yearEnd),
      annual: getDetailedCostBreakdown('annual', now, yearEnd)
    };

    // Calculate totals
    const quarterlyTotals = {
      weekly: quarterlyDetails.weekly.reduce((sum, item) => sum + item.effectiveAmount, 0),
      monthly: quarterlyDetails.monthly.reduce((sum, item) => sum + item.effectiveAmount, 0),
      annual: quarterlyDetails.annual.reduce((sum, item) => sum + item.effectiveAmount, 0)
    };

    const yearlyTotals = {
      weekly: yearlyDetails.weekly.reduce((sum, item) => sum + item.effectiveAmount, 0),
      monthly: yearlyDetails.monthly.reduce((sum, item) => sum + item.effectiveAmount, 0),
      annual: yearlyDetails.annual.reduce((sum, item) => {
        console.log(`Annual cost item: "${item.cost.description}" - Original: £${item.originalAmount.toFixed(2)}, Effective: £${item.effectiveAmount.toFixed(2)}`);
        return sum + item.effectiveAmount;
      }, 0)
    };

    return {
      quarterly: quarterlyTotals.weekly + quarterlyTotals.monthly + quarterlyTotals.annual,
      yearly: yearlyTotals.weekly + yearlyTotals.monthly + yearlyTotals.annual,
      breakdown: {
        quarterly: quarterlyTotals,
        yearly: yearlyTotals
      },
      details: {
        quarterly: quarterlyDetails,
        yearly: yearlyDetails
      }
    };
  };

  // Get category info
  const getCategoryInfo = (categoryName: string) => {
    return categories.find(cat => cat.name === categoryName) || {
      name: categoryName,
      color: '#6B7280',
      icon: 'MoreHorizontal'
    };
  };

  // Icon mapping
  const getIcon = (iconName: string | null) => {
    const iconMap: { [key: string]: any } = {
      Building,
      Shield,
      Users,
      Megaphone,
      Wrench,
      Briefcase,
      MoreHorizontal
    };
    return iconMap[iconName || 'MoreHorizontal'] || MoreHorizontal;
  };

  // Render cost form
  const renderCostForm = (frequency: string | null, title: string) => (
    <div className={`p-4 rounded-lg border-2 border-dashed ${isDarkMode ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-slate-50/50'}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Description</Label>
            <Input
              placeholder="Enter cost description"
              value={newCost.description}
              onChange={(e) => setNewCost(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={newCost.category}
              onValueChange={(value) => setNewCost(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Amount (£)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={newCost.amount}
              onChange={(e) => setNewCost(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div>
            <Label>VAT</Label>
            <Select
              value={newCost.hasVat.toString()}
              onValueChange={(value) => setNewCost(prev => ({ ...prev, hasVat: value === 'true' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No VAT</SelectItem>
                <SelectItem value="true">Include VAT (20%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select
              value={newCost.paymentMethod}
              onValueChange={(value) => setNewCost(prev => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="direct_debit">Direct Debit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {frequency && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'} mb-3`}>
                📅 Schedule Settings (Optional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date (Optional)</Label>
                  <Input
                    type="date"
                    value={newCost.startDate}
                    onChange={(e) => setNewCost(prev => ({ ...prev, startDate: e.target.value }))}
                    placeholder="When does this cost begin?"
                  />
                </div>
                <div>
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={newCost.endDate}
                    onChange={(e) => setNewCost(prev => ({ ...prev, endDate: e.target.value }))}
                    placeholder="When does this cost end?"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!frequency && (
          <div className="border-t pt-4">
            <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'} mb-3`}>
              📅 Due Date (Optional)
            </h4>
            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={newCost.dueDate}
                onChange={(e) => setNewCost(prev => ({ ...prev, dueDate: e.target.value }))}
                placeholder="When is this cost due?"
              />
            </div>
          </div>
        )}

        <div>
          <Label>Notes (Optional)</Label>
          <Textarea
            placeholder="Additional notes..."
            value={newCost.notes}
            onChange={(e) => setNewCost(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              const updatedCostData = {
                ...newCost,
                frequency: frequency as 'weekly' | 'monthly' | 'quarterly' | 'annual' | null,
                costType: (frequency ? 'recurring' : 'one_time') as 'recurring' | 'one_time' | 'miscellaneous'
              };
              addCost(updatedCostData);
            }}
            disabled={!newCost.description || !newCost.amount || !newCost.category || addingCost}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {addingCost ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {addingCost ? 'Adding...' : `Add ${title} Cost`}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAddForm(null)}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  // Render cost item
  const renderCostItem = (cost: DealershipCost) => {
    const categoryInfo = getCategoryInfo(cost.category);
    const IconComponent = getIcon(categoryInfo.icon);

    // If this cost is being edited, show edit form
    if (editingCost && editingCost.id === cost.id) {
      return (
        <div key={cost.id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Description</Label>
                <Input
                  value={editingCost.description}
                  onChange={(e) => setEditingCost(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={editingCost.category}
                  onValueChange={(value) => setEditingCost(prev => prev ? { ...prev, category: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Amount (£)</Label>
                <Input
                  type="number"
                  value={editingCost.amount}
                  onChange={(e) => {
                    const amount = e.target.value;
                    const numAmount = parseFloat(amount);
                    const vatAmount = editingCost.hasVat ? numAmount * 0.2 : 0;
                    const totalAmount = numAmount + vatAmount;
                    
                    setEditingCost(prev => prev ? { 
                      ...prev, 
                      amount,
                      vatAmount: vatAmount > 0 ? vatAmount.toString() : null,
                      totalAmount: totalAmount.toString()
                    } : null);
                  }}
                />
              </div>
              <div>
                <Label>VAT</Label>
                <Select
                  value={editingCost.hasVat.toString()}
                  onValueChange={(value) => {
                    const hasVat = value === 'true';
                    const numAmount = parseFloat(editingCost.amount);
                    const vatAmount = hasVat ? numAmount * 0.2 : 0;
                    const totalAmount = numAmount + vatAmount;
                    
                    setEditingCost(prev => prev ? { 
                      ...prev, 
                      hasVat,
                      vatAmount: vatAmount > 0 ? vatAmount.toString() : null,
                      totalAmount: totalAmount.toString()
                    } : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No VAT</SelectItem>
                    <SelectItem value="true">Include VAT (20%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date (Optional)</Label>
                <Input
                  type="date"
                  value={editingCost.startDate || ''}
                  onChange={(e) => setEditingCost(prev => prev ? { ...prev, startDate: e.target.value || null } : null)}
                />
              </div>
              <div>
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={editingCost.endDate || ''}
                  onChange={(e) => setEditingCost(prev => prev ? { ...prev, endDate: e.target.value || null } : null)}
                />
              </div>
            </div>

            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={editingCost.dueDate || ''}
                onChange={(e) => setEditingCost(prev => prev ? { ...prev, dueDate: e.target.value || null } : null)}
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={editingCost.notes || ''}
                onChange={(e) => setEditingCost(prev => prev ? { ...prev, notes: e.target.value } : null)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => updateCost(editingCost)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingCost(null)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={cost.id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${categoryInfo.color}20` }}
            >
              <IconComponent 
                className="w-5 h-5" 
                style={{ color: categoryInfo.color }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {cost.description}
                </h4>
                <Badge 
                  variant="secondary" 
                  style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
                >
                  {cost.category}
                </Badge>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'} mb-2`}>
                £{parseFloat(cost.amount).toFixed(2)}
                {cost.hasVat && cost.vatAmount && ` + VAT (£${parseFloat(cost.vatAmount).toFixed(2)})`}
                <span className="font-semibold ml-2">
                  Total: £{parseFloat(cost.totalAmount).toFixed(2)}
                </span>
              </p>
              {cost.notes && (
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'} mb-2`}>
                  {cost.notes}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs">
                {cost.frequency && (
                  <span className={`${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                    {cost.frequency.charAt(0).toUpperCase() + cost.frequency.slice(1)}
                  </span>
                )}
                {cost.startDate && cost.endDate && (
                  <span className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                    Period: {new Date(cost.startDate).toLocaleDateString()} - {new Date(cost.endDate).toLocaleDateString()}
                  </span>
                )}
                {cost.dueDate && (
                  <span className={`${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                    Due: {new Date(cost.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingCost(cost)}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteCost(cost.id)}
              disabled={deletingCost === cost.id}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {deletingCost === cost.id ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render cost section
  const renderCostSection = (frequency: string | null, title: string, costs: DealershipCost[]) => (
    <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-sm`}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {title} Costs
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              £{getTotalByFrequency(frequency).toFixed(2)}
            </span>
            <Button
              size="sm"
              onClick={() => setShowAddForm(frequency)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {showAddForm === frequency && renderCostForm(frequency, title)}
          
          {costs.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No {title.toLowerCase()} costs added yet</p>
            </div>
          ) : (
            costs.map(renderCostItem)
          )}
        </div>
      </CardContent>
    </Card>
  );

  const projections = calculateProjections();

  // Skeleton loading component
  const SkeletonLoader = () => (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Projections Card Skeleton */}
      <div className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-sm rounded-lg border p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Cost Sections Skeleton - Weekly and Monthly in same row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((index) => (
          <div key={index} className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-sm rounded-lg border`}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((itemIndex) => (
                  <div key={itemIndex} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                          </div>
                          <div className="h-4 w-60 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                          <div className="flex items-center gap-4">
                            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                              <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Annual Section Skeleton */}
      <div className="grid grid-cols-1 gap-6">
        <div className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-sm rounded-lg border`}>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2].map((itemIndex) => (
                <div key={itemIndex} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                        </div>
                        <div className="h-4 w-52 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                        <div className="flex items-center gap-4">
                          <div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* One-time & Miscellaneous Section Skeleton */}
      <div className="grid grid-cols-1 gap-6">
        <div className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-sm rounded-lg border`}>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                      <div className="flex items-center gap-4">
                        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                          <div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Skeleton */}
      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full mt-0.5"></div>
          <div className="flex-1">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
            <div className="space-y-1">
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg ${isDarkMode ? 'shadow-green-500/20' : 'shadow-green-500/30'}`}>
            <PoundSterling className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Dealership Cost Management
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'} mt-1`}>
              Track recurring, one-time, and miscellaneous business costs
            </p>
          </div>
        </div>
        <Button 
          onClick={exportData}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 px-6 py-2"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Enhanced Projections Card */}
      <Card className={`${isDarkMode ? 'bg-gradient-to-br from-slate-800/60 to-slate-700/40 border-slate-600/50' : 'bg-gradient-to-br from-white to-slate-50/80 border-slate-200/60'} backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300`}>
        <CardHeader className="pb-4">
          <CardTitle 
            className={`flex items-center justify-between cursor-pointer group ${isDarkMode ? 'text-white' : 'text-slate-900'} hover:${isDarkMode ? 'text-white' : 'text-slate-800'} transition-colors duration-200`}
            onClick={() => setProjectionsExpanded(!projectionsExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'} group-hover:${isDarkMode ? 'bg-blue-500/30' : 'bg-blue-500/20'} transition-colors duration-200`}>
                <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <div className="text-lg font-semibold">Cost Projections</div>
                <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                  Click to {projectionsExpanded ? 'hide' : 'view'} detailed breakdown
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className={`text-sm font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>Quarterly</div>
                <div className={`text-xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>£{projections.quarterly.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>Annual</div>
                <div className={`text-xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>£{projections.yearly.toFixed(2)}</div>
              </div>
              <div className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-slate-100 hover:bg-slate-200'} transition-colors duration-200`}>
                {projectionsExpanded ? (
                  <ChevronUp className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-600'}`} />
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        {projectionsExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-8">
              {/* Enhanced Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-orange-700/50' : 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/60'} border backdrop-blur-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-500/10'}`}>
                        <Calculator className={`w-5 h-5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                      </div>
                      <span className={`font-semibold text-lg ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        Quarterly Projection
                      </span>
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${isDarkMode ? 'text-orange-300' : 'text-orange-700'} mb-2`}>
                    £{projections.quarterly.toFixed(2)}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    Next 3 months projected costs
                  </div>
                </div>
                
                <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/50' : 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/60'} border backdrop-blur-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'}`}>
                        <Calendar className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <span className={`font-semibold text-lg ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        Annual Projection
                      </span>
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'} mb-2`}>
                    £{projections.yearly.toFixed(2)}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    Next 12 months projected costs
                  </div>
                </div>
              </div>

              {/* Detailed Calculation Breakdown */}
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'} border`}>
                <div className="flex items-center gap-2 mb-4">
                  <Info className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Calculation Breakdown
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* Quarterly Calculation */}
                  <div>
                    <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                      Quarterly Projection (£{projections.quarterly.toFixed(2)})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className={`p-3 rounded ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Weekly Costs</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          £{projections.breakdown.quarterly.weekly.toFixed(2)}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                          Effective quarterly amount
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Monthly Costs</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          £{projections.breakdown.quarterly.monthly.toFixed(2)}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                          Effective quarterly amount
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Annual Costs</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          £{projections.breakdown.quarterly.annual.toFixed(2)}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                          Quarterly portion (÷4)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Annual Calculation */}
                  <div>
                    <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                      Annual Projection (£{projections.yearly.toFixed(2)})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className={`p-3 rounded ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Weekly Costs</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          £{projections.breakdown.yearly.weekly.toFixed(2)}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                          Effective annual amount
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Monthly Costs</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          £{projections.breakdown.yearly.monthly.toFixed(2)}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                          Effective annual amount
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>Annual Costs</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          £{projections.breakdown.yearly.annual.toFixed(2)}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                          Direct annual costs
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* Enhanced Formula Explanation */}
                  <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60'} border backdrop-blur-sm`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'}`}>
                        <Info className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <h5 className={`font-semibold text-lg ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        How We Calculate Projections
                      </h5>
                    </div>
                    
                    <div className={`${isDarkMode ? 'text-blue-200' : 'text-blue-700'} space-y-3`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-800/30' : 'bg-blue-100/50'}`}>
                          <div className="font-semibold mb-2">🔄 Frequency-Based Calculations</div>
                          <div className="text-sm space-y-1">
                            <div>• Weekly costs × number of weeks in period</div>
                            <div>• Monthly costs × number of months in period</div>
                            <div>• Annual costs: full amount (yearly) or ÷4 (quarterly)</div>
                          </div>
                        </div>
                        
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-800/30' : 'bg-blue-100/50'}`}>
                          <div className="font-semibold mb-2">🧮 Smart Formulas</div>
                          <div className="text-sm space-y-1">
                            <div>• <strong>Quarterly:</strong> (Weekly × 13) + (Monthly × 3) + (Annual × 0.25)</div>
                            <div>• <strong>Yearly:</strong> (Weekly × 52) + (Monthly × 12) + (Annual × 1)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`text-xs mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-blue-800/20 text-blue-300' : 'bg-blue-100/30 text-blue-600'} space-y-1`}>
                      <div>💡 <strong>Note:</strong> One-time and miscellaneous costs are excluded from projections</div>
                      <div>📊 Recurring costs are multiplied by their frequency within the projection period</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Improved Layout: Weekly and Monthly in same row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCostSection('weekly', 'Weekly', getCostsByFrequency('weekly'))}
        {renderCostSection('monthly', 'Monthly', getCostsByFrequency('monthly'))}
      </div>

      {/* Annual costs below */}
      <div className="grid grid-cols-1 gap-6">
        {renderCostSection('annual', 'Annual', getCostsByFrequency('annual'))}
      </div>

      {/* One-time and Miscellaneous costs */}
      <div className="grid grid-cols-1 gap-6">
        {renderCostSection(null, 'One-time & Miscellaneous', getOneTimeCosts())}
      </div>

      {/* Disclaimer */}
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'} border`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`} />
          <div>
            <p className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'} font-medium mb-1`}>
              Important Note
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
              These dealership operating costs are separate from vehicle-specific costs and stock management expenses. 
              Use the export function to generate reports for accounting purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
