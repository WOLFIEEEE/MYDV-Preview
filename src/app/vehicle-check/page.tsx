"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, CheckCircle, XCircle, AlertTriangle, Save, Car, Wrench } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import BackToStockButton from "@/components/shared/BackToStockButton";

export default function VehicleCheckPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  
  const [checkItems, setCheckItems] = useState([
    { id: 'exterior', name: 'Exterior Condition', status: 'pending', notes: '' },
    { id: 'interior', name: 'Interior Condition', status: 'pending', notes: '' },
    { id: 'engine', name: 'Engine Performance', status: 'pending', notes: '' },
    { id: 'transmission', name: 'Transmission', status: 'pending', notes: '' },
    { id: 'brakes', name: 'Brake System', status: 'pending', notes: '' },
    { id: 'suspension', name: 'Suspension', status: 'pending', notes: '' },
    { id: 'electrical', name: 'Electrical Systems', status: 'pending', notes: '' },
    { id: 'tires', name: 'Tire Condition', status: 'pending', notes: '' },
    { id: 'safety', name: 'Safety Features', status: 'pending', notes: '' },
    { id: 'documentation', name: 'Documentation', status: 'pending', notes: '' },
  ]);

  const [overallNotes, setOverallNotes] = useState('');

  const updateCheckItem = (id: string, field: string, value: string) => {
    setCheckItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <Search className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800 border-green-200';
      case 'fail': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return isDarkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const handleSave = () => {
    const checkData = {
      items: checkItems,
      overallNotes,
      completedAt: new Date().toISOString()
    };
    console.log("Saving vehicle check data:", checkData);
    router.back();
  };

  const completedItems = checkItems.filter(item => item.status !== 'pending').length;
  const progressPercentage = (completedItems / checkItems.length) * 100;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="flex items-center gap-4 mb-6">
          <BackToStockButton>
            Back to My Stock
          </BackToStockButton>
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Vehicle Check
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
              Comprehensive vehicle inspection checklist
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Car className="w-5 h-5" />
                  Inspection Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className={`w-full h-3 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div 
                        className="h-3 bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                    {completedItems}/{checkItems.length} Complete
                  </span>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                  Complete all inspection items to generate the final report
                </p>
              </CardContent>
            </Card>

            {/* Check Items */}
            <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Wrench className="w-5 h-5" />
                  Inspection Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {checkItems.map((item) => (
                  <div key={item.id} className={`p-4 rounded-lg border ${
                    isDarkMode ? 'border-slate-700 bg-slate-700/30' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {item.name}
                          </h4>
                          <select
                            value={item.status}
                            onChange={(e) => updateCheckItem(item.id, 'status', e.target.value)}
                            className={`px-3 py-1 rounded-md border text-sm ${getStatusColor(item.status)}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="pass">Pass</option>
                            <option value="warning">Warning</option>
                            <option value="fail">Fail</option>
                          </select>
                        </div>
                        <textarea
                          value={item.notes}
                          onChange={(e) => updateCheckItem(item.id, 'notes', e.target.value)}
                          placeholder="Add inspection notes..."
                          rows={2}
                          className={`w-full px-3 py-2 text-sm rounded-md border ${
                            isDarkMode 
                              ? 'bg-slate-600 border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                          } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Overall Notes */}
            <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader>
                <CardTitle className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Overall Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  placeholder="Add overall assessment notes and recommendations..."
                  rows={4}
                  className={`w-full px-3 py-2 rounded-md border ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
              </CardContent>
            </Card>
          </div>

          {/* Action Card */}
          <div>
            <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader>
                <CardTitle className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleSave}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={completedItems === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Inspection
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.back()}
                  className={`w-full ${
                    isDarkMode 
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader>
                <CardTitle className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Pass</span>
                  <span className="text-sm font-medium text-green-600">
                    {checkItems.filter(item => item.status === 'pass').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Warning</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {checkItems.filter(item => item.status === 'warning').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Fail</span>
                  <span className="text-sm font-medium text-red-600">
                    {checkItems.filter(item => item.status === 'fail').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>Pending</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                    {checkItems.filter(item => item.status === 'pending').length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 