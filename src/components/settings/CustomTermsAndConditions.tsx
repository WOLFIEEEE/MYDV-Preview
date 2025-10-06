"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  RefreshCw, 
  FileText, 
  Shield, 
  Building, 
  Users,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit3,
  ArrowLeftRight
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import dynamic from 'next/dynamic';

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

interface CustomTermsData {
  checklistTerms: string;
  basicTerms: string;
  inHouseWarrantyTerms: string;
  thirdPartyTerms: string;
  tradeTerms: string;
}

interface CustomTermsAndConditionsProps {
  dealerId: string;
}

const defaultTerms = {
  checklistTerms: '',
  basicTerms: '',
  inHouseWarrantyTerms: '',
  thirdPartyTerms: '',
  tradeTerms: ''
};

export default function CustomTermsAndConditions({ dealerId }: CustomTermsAndConditionsProps) {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState("checklist");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState<Record<string, boolean>>({
    checklist: false,
    basic: false,
    inHouse: false,
    thirdParty: false,
    trade: false
  });

  const [termsData, setTermsData] = useState<CustomTermsData>({
    checklistTerms: '',
    basicTerms: '',
    inHouseWarrantyTerms: '',
    thirdPartyTerms: '',
    tradeTerms: ''
  });

  // Load existing terms on component mount
  useEffect(() => {
    const loadTerms = async () => {
      try {
        const response = await fetch(`/api/custom-terms?dealerId=${dealerId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Use empty strings as defaults, only populate if data exists in database
            setTermsData({
              checklistTerms: result.data.checklistTerms || '',
              basicTerms: result.data.basicTerms || '',
              inHouseWarrantyTerms: result.data.inHouseWarrantyTerms || '',
              thirdPartyTerms: result.data.thirdPartyTerms || '',
              tradeTerms: result.data.tradeTerms || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading terms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (dealerId) {
      loadTerms();
    }
  }, [dealerId]);

  const handleTermsChange = (field: keyof CustomTermsData, value: string) => {
    setTermsData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/custom-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealerId,
          ...termsData
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          alert('✅ Terms and conditions saved successfully!');
        } else {
          throw new Error(result.error || 'Failed to save');
        }
      } else {
        throw new Error('Failed to save terms');
      }
    } catch (error) {
      console.error('Error saving terms:', error);
      alert('❌ Failed to save terms and conditions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = (field: keyof CustomTermsData) => {
    if (confirm('Are you sure you want to clear this section? This action cannot be undone.')) {
      setTermsData(prev => ({
        ...prev,
        [field]: ''
      }));
      setHasUnsavedChanges(true);
    }
  };

  const togglePreview = (section: string) => {
    setPreviewMode(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const termsConfig = [
    {
      id: 'checklist',
      title: 'Checklist Terms & Conditions',
      description: 'Terms related to vehicle inspection checklist and pre-sale requirements',
      icon: FileText,
      color: 'blue',
      field: 'checklistTerms' as keyof CustomTermsData
    },
    {
      id: 'basic',
      title: 'Basic Terms & Conditions',
      description: 'General sale terms, payment conditions, and customer obligations',
      icon: Building,
      color: 'green',
      field: 'basicTerms' as keyof CustomTermsData
    },
    {
      id: 'inHouse',
      title: 'In-House Warranty Terms',
      description: 'Terms for dealership-provided warranty coverage and claims process',
      icon: Shield,
      color: 'purple',
      field: 'inHouseWarrantyTerms' as keyof CustomTermsData
    },
    {
      id: 'thirdParty',
      title: 'Third-Party Terms & Conditions',
      description: 'External warranty provider terms and extended protection plans',
      icon: Users,
      color: 'orange',
      field: 'thirdPartyTerms' as keyof CustomTermsData
    },
    {
      id: 'trade',
      title: 'Trade Terms & Conditions',
      description: 'Trade-in, part exchange, and vehicle valuation terms',
      icon: ArrowLeftRight,
      color: 'indigo',
      field: 'tradeTerms' as keyof CustomTermsData
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className={`${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Loading terms and conditions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Custom Terms & Conditions</h2>
          <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Customize your terms and conditions for different aspects of your business
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastSaved && (
            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
              <CheckCircle className="w-4 h-4 text-green-500" />
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
          
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
          
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Terms Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          {termsConfig.map((config) => (
            <TabsTrigger key={config.id} value={config.id} className="flex items-center gap-2">
              <config.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{config.title.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {termsConfig.map((config) => (
          <TabsContent key={config.id} value={config.id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${config.color}-100`}>
                      <config.icon className={`w-5 h-5 text-${config.color}-600`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.title}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePreview(config.id)}
                      className="flex items-center gap-2"
                    >
                      {previewMode[config.id] ? (
                        <>
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Preview
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReset(config.field)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="min-h-[400px]">
                    <MDEditor
                      value={termsData[config.field]}
                      onChange={(value) => handleTermsChange(config.field, value || '')}
                      preview={previewMode[config.id] ? 'preview' : 'edit'}
                      hideToolbar={previewMode[config.id]}
                      data-color-mode={isDarkMode ? 'dark' : 'light'}
                      height={400}
                    />
                  </div>
                  
                  <div className={`flex items-center justify-between text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    <span>
                      Characters: {termsData[config.field].length.toLocaleString()}
                    </span>
                    <span>
                      Words: {termsData[config.field].split(/\s+/).filter(word => word.length > 0).length.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Usage Information */}
      <Card className={`${isDarkMode ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200'}`}>
        <CardHeader className="pb-4">
          <CardTitle className={`text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <AlertCircle className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            Usage Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Where These Terms Apply:</h4>
              <ul className={`space-y-2 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                <li className="flex items-start gap-2">
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Invoice generation and PDF documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Customer agreements and contracts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Warranty documentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Vehicle handover paperwork</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Markdown Features Supported:</h4>
              <ul className={`space-y-2 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                <li className="flex items-start gap-2">
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Headers, lists, and formatting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Tables and links</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Bold, italic, and code blocks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Line breaks and spacing</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
