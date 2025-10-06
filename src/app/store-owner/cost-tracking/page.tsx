"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PoundSterling, 
  TrendingUp, 
  Calendar, 
  Download, 
  Plus, 
  Trash2
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";

interface CostItem {
  id: string;
  description: string;
  amount: number;
  hasVat: boolean;
  vatAmount?: number;
}

interface CostData {
  weekly: CostItem[];
  monthly: CostItem[];
  annual: CostItem[];
}

export default function CostTrackingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { isDarkMode } = useTheme();

  const [costs, setCosts] = useState<CostData>({
    weekly: [],
    monthly: [],
    annual: []
  });

  const [newCost, setNewCost] = useState({
    weekly: { description: '', amount: '', hasVat: false },
    monthly: { description: '', amount: '', hasVat: false },
    annual: { description: '', amount: '', hasVat: false }
  });

  // Show loading state if not loaded yet
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  const addCostItem = (period: 'weekly' | 'monthly' | 'annual') => {
    const cost = newCost[period];
    if (!cost.description || !cost.amount) return;

    const amount = parseFloat(cost.amount);
    const vatAmount = cost.hasVat ? amount * 0.2 : 0;

    const newItem: CostItem = {
      id: Date.now().toString(),
      description: cost.description,
      amount: amount,
      hasVat: cost.hasVat,
      vatAmount: vatAmount
    };

    setCosts(prev => ({
      ...prev,
      [period]: [...prev[period], newItem]
    }));

    setNewCost(prev => ({
      ...prev,
      [period]: { description: '', amount: '', hasVat: false }
    }));
  };

  const removeCostItem = (period: 'weekly' | 'monthly' | 'annual', id: string) => {
    setCosts(prev => ({
      ...prev,
      [period]: prev[period].filter(item => item.id !== id)
    }));
  };

  const calculateTotal = (items: CostItem[]) => {
    return items.reduce((total, item) => total + item.amount + (item.vatAmount || 0), 0);
  };

  const calculateProjections = () => {
    const weeklyTotal = calculateTotal(costs.weekly);
    const monthlyTotal = calculateTotal(costs.monthly);
    const annualTotal = calculateTotal(costs.annual);

    return {
      quarterly: (weeklyTotal * 13) + (monthlyTotal * 3) + (annualTotal / 4),
      yearly: (weeklyTotal * 52) + (monthlyTotal * 12) + annualTotal
    };
  };

  const exportData = () => {
    const data = {
      costs,
      projections: calculateProjections(),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealership-costs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCostSection = (period: 'weekly' | 'monthly' | 'annual', title: string) => (
    <Card className={`${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-sm`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          <Calendar className="w-5 h-5" />
          {title} Costs Total £
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Cost Items */}
          {costs[period].map((item) => (
            <div key={item.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {item.description}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                    £{item.amount.toFixed(2)} {item.hasVat && `+ VAT (£${item.vatAmount?.toFixed(2)})`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCostItem(period, item.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add New Cost Form */}
          <div className={`p-4 rounded-lg border-2 border-dashed ${isDarkMode ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-slate-50/50'}`}>
            <div className="space-y-3">
              <div>
                <Label htmlFor={`${period}-description`}>Add Cost Description</Label>
                <Input
                  id={`${period}-description`}
                  placeholder="Enter cost description"
                  value={newCost[period].description}
                  onChange={(e) => setNewCost(prev => ({
                    ...prev,
                    [period]: { ...prev[period], description: e.target.value }
                  }))}
                />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label htmlFor={`${period}-amount`}>Amount (£)</Label>
                  <Input
                    id={`${period}-amount`}
                    type="number"
                    placeholder="0.00"
                    value={newCost[period].amount}
                    onChange={(e) => setNewCost(prev => ({
                      ...prev,
                      [period]: { ...prev[period], amount: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label>ADD VAT</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant={newCost[period].hasVat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewCost(prev => ({
                        ...prev,
                        [period]: { ...prev[period], hasVat: true }
                      }))}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant={!newCost[period].hasVat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewCost(prev => ({
                        ...prev,
                        [period]: { ...prev[period], hasVat: false }
                      }))}
                    >
                      No
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => addCostItem(period)}
                  disabled={!newCost[period].description || !newCost[period].amount}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Total {title} Cost:
              </span>
              <span className={`text-xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                £{calculateTotal(costs[period]).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const projections = calculateProjections();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <Header />
      
      <div className="pt-16">
        {/* Header Section */}
        <section className="py-8 sm:py-12">
          <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg ${isDarkMode ? 'shadow-green-500/20' : 'shadow-green-500/30'}`}>
                  <PoundSterling className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-3xl sm:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Dealership Costs
                  </h1>
                  <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'} mt-1`}>
                    Track and manage your dealership operating costs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={exportData}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 px-6 py-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Button
                </Button>
              </div>
            </div>

            {/* Projections Card */}
            <Card className={`mb-8 ${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-sm`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <TrendingUp className="w-5 h-5" />
                  Cost Projections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'} border`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        Quarterly Projection:
                      </span>
                      <span className={`text-xl font-bold ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                        £{projections.quarterly.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        Annual Projection:
                      </span>
                      <span className={`text-xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        £{projections.yearly.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cost Tracking Sections */}
        <section>
          <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {renderCostSection('weekly', 'Weekly')}
              {renderCostSection('monthly', 'Monthly')}
              {renderCostSection('annual', 'Annual')}
            </div>

            {/* Disclaimer */}
            <div className={`mt-8 p-4 rounded-lg ${isDarkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'} border`}>
              <p className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                <strong>Note:</strong> These costs are not added/included in the Stock Management costs screens or exports. 
                Please download these separately if required.
              </p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
