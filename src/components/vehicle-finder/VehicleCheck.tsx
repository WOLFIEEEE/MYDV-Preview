"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ChevronDown, ChevronUp, ExternalLink, FileText, Loader2, Eye } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import { navigateToRetailCheck, extractRetailCheckParams } from "@/lib/utils/retailCheckNavigation";
import { AUTOTRADER_CONFIG } from "@/lib/autoTraderConfig";
import VehicleDetailsDialog from "./VehicleDetailsDialog";

interface VehicleCheckProps {
  vehicleData: {
    registration: string;
    mileage: string;
  };
}

interface ProcessedVehicleCheck {
  vehicle: {
    title: string;
    registration: string;
    year: string;
    make: string;
    model: string;
    derivative: string;
    colour: string;
    fuelType: string;
    transmissionType: string;
    owners: number;
    vin?: string;
    engineNumber?: string;
    bodyType: string;
    engineCapacityCC: number;
    co2Emissions: number;
    firstRegistrationDate: string;
  };
  checkSummary: {
    overallStatus: 'clean' | 'issues' | 'warnings';
    statusMessage: string;
    checks: Array<{
      label: string;
      status: 'pass' | 'fail' | 'warning';
      passed: boolean;
    }>;
  };
  sections: {
    previousKeepers: {
      mostRecent: {
        numberOfPreviousKeepers: number;
        dateOfLastKeeperChange: string | null;
      };
      allChanges: Array<{
        date: string;
        [key: string]: any;
      }>;
    };
    finance: {
      privateFinance: boolean;
      tradeFinance: boolean;
      agreements: Array<{
        agreementId?: string;
        company?: string;
        type?: string;
        startDate?: string;
        term?: string | number;
        contact?: string;
        telephoneNumber?: string;
      }>;
    };
    highRiskMarkers: {
      hasMarkers: boolean;
      markers: Array<{
        startDate?: string;
        type?: string;
        extraInfo?: string;
        company?: string;
        telephoneNumber?: string;
        reference?: string;
      }>;
    };
    previousSearches: {
      mostRecent: {
        date: string;
        typeOfBusiness: string;
      } | null;
      allSearches: Array<{
        performed: string;
        typeOfBusiness: string;
      }>;
    };
    vehicleDetails: {
      make: string;
      model: string;
      registration: string;
      vin?: string;
      engineNumber?: string;
      bodyType: string;
      colour: string;
      firstRegistrationDate: string;
      yearOfManufacture: string;
      numberOfPreviousOwners: number;
      engineCapacity: string;
      fuelType: string;
      transmission: string;
      co2Emissions: string;
    };
    policeMarkers: {
      stolenMarker: boolean;
      details: {
        recordedDate: string | null;
        policeForce: string | null;
        telephoneNumber: string | null;
      };
    };
    v5cLogbook: {
      mostRecent: {
        dateOfMostRecentRecord: string;
      } | null;
      allRecords: Array<{
        issuedDate: string;
      }>;
    };
    plateChanges: {
      hasChanges: boolean;
      mostRecent: {
        date: string;
        currentRegistration: string;
        previousRegistration: string;
      } | null;
      allChanges: Array<{
        date: string;
        currentRegistration: string;
        previousRegistration: string;
      }>;
    };
    colourChanges: {
      hasChanges: boolean;
      changes: Array<{
        startDate?: string;
        date?: string;
        currentColour?: string;
        previousColour?: string | null;
      }>;
    };
    insuranceHistory: {
      hasHistory: boolean;
      claims: Array<{
        type: string;
        lossDate: string;
        removedDate: string | null;
      }>;
    };
    odometerReadings: {
      hasReadings: boolean;
      readings: Array<{
        performed: string;
        source: string;
        odometerReadingMiles: number;
      }>;
      mostRecent: {
        performed: string;
        source: string;
        odometerReadingMiles: number;
      } | null;
    };
    scrapExportData: {
      scrapped: boolean;
      exported: boolean;
      imported: boolean;
    };
  };
}

export default function VehicleCheck({ vehicleData }: VehicleCheckProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const { setPreviousPath } = useNavigationHistory();
  const [checkData, setCheckData] = useState<ProcessedVehicleCheck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    risk: true,
    finance: true,
    history: true,
    discrepancies: true,
    changes: true,
    activity: true,
    insurance: true
  });

  // Dialog state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    data: any[];
    dataType: 'keeperChanges' | 'v5cs' | 'previousSearches' | 'financeAgreements' | 'plateChanges' | 'colourChanges' | 'odometerReadings' | 'highRiskMarkers' | 'insuranceHistory';
  }>({
    isOpen: false,
    title: '',
    data: [],
    dataType: 'keeperChanges'
  });

  // Fetch vehicle check data when component mounts or registration changes
  useEffect(() => {
    const fetchVehicleCheck = async () => {
      if (!vehicleData.registration) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          registration: vehicleData.registration.toUpperCase()
        });
        
        const response = await fetch(`/api/vehicle-check?${params.toString()}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch vehicle check data');
        }
        
        if (data.success && data.data) {
          setCheckData(data.data);
        } else {
          throw new Error('No vehicle check data found');
        }
      } catch (error) {
        console.error('Vehicle check error:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch vehicle check data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVehicleCheck();
  }, [vehicleData.registration]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRetailCheck = () => {
    const params = extractRetailCheckParams(vehicleData);
    
    navigateToRetailCheck(params, router, {
      onError: (errorMessage) => {
        console.error('Retail check navigation failed:', errorMessage);
        setError(errorMessage);
      },
      onSuccess: (url) => {
        console.log('Successfully navigating to retail check:', url);
        // Store current path for back navigation
        setPreviousPath(window.location.pathname + window.location.search);
      }
    });
  };

  const handleViewFullReport = () => {
    const cleanRegistration = vehicleData.registration.replace(/[^A-Z0-9]/gi, '');
    
    // Store current path as previous path for back navigation
    setPreviousPath(window.location.pathname + window.location.search);
    
    // Navigate to the full vehicle check page
    const vehicleCheckUrl = `/mystock/vehicle-check?registration=${cleanRegistration}`;
    router.push(vehicleCheckUrl);
  };

  const handleDownloadPDF = () => {
    // Use the report URL from the API response if available
    const reportUrl = checkData?.sections?.policeMarkers?.details ? 
      AUTOTRADER_CONFIG.VEHICLE_CHECK_URL : 
      AUTOTRADER_CONFIG.VEHICLE_CHECK_SAMPLE_URL;
    window.open(reportUrl, '_blank');
  };

  const openDetailsDialog = (
    title: string, 
    data: any[], 
    dataType: 'keeperChanges' | 'v5cs' | 'previousSearches' | 'financeAgreements' | 'plateChanges' | 'colourChanges' | 'odometerReadings' | 'highRiskMarkers' | 'insuranceHistory'
  ) => {
    setDialogState({
      isOpen: true,
      title,
      data,
      dataType
    });
  };

  const closeDetailsDialog = () => {
    setDialogState({
      isOpen: false,
      title: '',
      data: [],
      dataType: 'keeperChanges'
    });
  };

  const SectionHeader = ({ title, icon: Icon, section }: { title: string; icon: any; section: string }) => (
    <div 
      className={`flex items-center justify-between cursor-pointer p-4 rounded-lg transition-all duration-200 ${
        isDarkMode 
          ? 'hover:bg-slate-700/50 border border-slate-700' 
          : 'hover:bg-gray-50 border border-gray-200'
      }`}
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
        }`}>
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
          {title}
        </h4>
      </div>
      <div className={`p-1 rounded-full transition-transform duration-200 ${
        expandedSections[section] ? 'rotate-180' : 'rotate-0'
      } ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-white" />
      </div>
    </div>
  );

  const DataField = ({ label, value, type = 'default', onClick }: { 
    label: string; 
    value: string | number; 
    type?: 'default' | 'success' | 'warning' | 'info' | 'clickable';
    onClick?: () => void;
  }) => {
    const getValueColor = () => {
      switch (type) {
        case 'success': return 'text-green-600 dark:text-green-400';
        case 'warning': return 'text-orange-600 dark:text-orange-400';
        case 'info': return 'text-blue-600 dark:text-blue-400';
        case 'clickable': return 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline';
        default: return isDarkMode ? 'text-white' : 'text-black';
      }
    };

    const getBadgeStyle = () => {
      switch (type) {
        case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'warning': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
        case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        default: return isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-100 text-black';
      }
    };

    return (
      <div className={`p-4 rounded-lg border transition-all duration-200 ${
        isDarkMode 
          ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      >
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          {label}
        </label>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {value === '-' ? (
              <span className={`font-medium ${isDarkMode ? 'text-gray-500' : 'text-black'}`}>-</span>
            ) : type === 'success' || type === 'warning' || type === 'info' ? (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getBadgeStyle()}`}>
                {value}
              </span>
            ) : (
              <span className={`font-semibold ${getValueColor()}`}>
                {value}
              </span>
            )}
          </div>
          {onClick && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs px-3 py-1 h-7"
            >
              View Details
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card className={`w-full border shadow-lg rounded-xl ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Vehicle Check Information
            </h3>
          </div>
          
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Loading vehicle check data...
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className={`w-full border shadow-lg rounded-xl ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Vehicle Check Information
            </h3>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            isDarkMode 
              ? 'bg-red-900/20 border-red-700 text-red-300' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <p className="font-medium">Failed to load vehicle check data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show no data state
  if (!checkData) {
    return (
      <Card className={`w-full border shadow-lg rounded-xl ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900">
              <Shield className="w-6 h-6 text-gray-600 dark:text-white" />
            </div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Vehicle Check Information
            </h3>
          </div>
          
          <div className="text-center py-8">
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              No vehicle check data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className={`w-full border shadow-lg rounded-xl ${
      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <CardContent className="p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className={`p-3 rounded-xl ${
            checkData.checkSummary.overallStatus === 'clean' 
              ? 'bg-green-100 dark:bg-green-900/30'
              : checkData.checkSummary.overallStatus === 'issues'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-orange-100 dark:bg-orange-900/30'
          }`}>
            <Shield className={`w-7 h-7 ${
              checkData.checkSummary.overallStatus === 'clean' 
                ? 'text-green-600 dark:text-green-400'
                : checkData.checkSummary.overallStatus === 'issues'
                ? 'text-red-600 dark:text-red-400'
                : 'text-orange-600 dark:text-orange-400'
            }`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Vehicle Check Information
            </h3>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              checkData.checkSummary.overallStatus === 'clean' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                : checkData.checkSummary.overallStatus === 'issues'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
            }`}>
              {checkData.checkSummary.statusMessage}
            </div>
          </div>
        </div>
        
        <div className="space-y-8">
          {/* Risk Assessment */}
          <div className="space-y-4">
            <SectionHeader title="Risk Assessment" icon={Shield} section="risk" />
            {expandedSections.risk && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pl-0 sm:pl-8">
                <DataField 
                  label="High Risk" 
                  value={checkData.sections.highRiskMarkers.hasMarkers ? "Yes" : "No"} 
                  type={checkData.sections.highRiskMarkers.hasMarkers ? "warning" : "success"} 
                />
                <DataField 
                  label="Insurance Write-off Category" 
                  value={checkData.checkSummary.checks.find(c => c.label.includes('Insurance'))?.status === 'pass' ? '-' : 'Category Found'} 
                />
                <DataField 
                  label="Previous Owners" 
                  value={checkData.sections.vehicleDetails.numberOfPreviousOwners.toString()} 
                />
              </div>
            )}
          </div>

          {/* Finance Information */}
          <div className="space-y-4">
            <SectionHeader title="Finance Information" icon={Shield} section="finance" />
            {expandedSections.finance && (
              <div className="pl-0 sm:pl-8 space-y-6">
                <div className={`p-4 rounded-lg border ${
                  !checkData.sections.finance.privateFinance && !checkData.sections.finance.tradeFinance
                    ? isDarkMode 
                      ? 'bg-green-900/20 border-green-700 text-green-300' 
                      : 'bg-green-50 border-green-200 text-green-700'
                    : isDarkMode 
                      ? 'bg-red-900/20 border-red-700 text-red-300' 
                      : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <p className="font-medium">
                    {!checkData.sections.finance.privateFinance && !checkData.sections.finance.tradeFinance
                      ? "There is no outstanding finance recorded on this vehicle."
                      : "Outstanding finance found on this vehicle."
                    }
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DataField 
                    label="Private Finance" 
                    value={checkData.sections.finance.privateFinance ? "Yes" : "No"} 
                    type={checkData.sections.finance.privateFinance ? "warning" : "success"} 
                  />
                  <DataField 
                    label="Trade Finance" 
                    value={checkData.sections.finance.tradeFinance ? "Yes" : "No"} 
                    type={checkData.sections.finance.tradeFinance ? "warning" : "success"} 
                  />
                  <DataField 
                    label="Finance Agreements" 
                    value={checkData.sections.finance.agreements.length > 0 
                      ? `${checkData.sections.finance.agreements.length} agreement${checkData.sections.finance.agreements.length > 1 ? 's' : ''} found`
                      : "No finance agreements recorded"
                    }
                    onClick={checkData.sections.finance.agreements.length > 0 ? () => openDetailsDialog(
                      'Finance Agreements',
                      checkData.sections.finance.agreements,
                      'financeAgreements'
                    ) : undefined}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vehicle History */}
          <div className="space-y-4">
            <SectionHeader title="Vehicle History" icon={Shield} section="history" />
            {expandedSections.history && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pl-0 sm:pl-8">
                <DataField 
                  label="Reported Scrapped" 
                  value={checkData.sections.scrapExportData.scrapped ? "Yes" : "No"} 
                  type={checkData.sections.scrapExportData.scrapped ? "warning" : "success"} 
                />
                <DataField 
                  label="Reported Stolen" 
                  value={checkData.sections.policeMarkers.stolenMarker ? "Yes" : "No"} 
                  type={checkData.sections.policeMarkers.stolenMarker ? "warning" : "success"} 
                />
                <DataField 
                  label="Imported" 
                  value={checkData.sections.scrapExportData.imported ? "Yes" : "No"} 
                  type={checkData.sections.scrapExportData.imported ? "info" : "success"} 
                />
                <DataField 
                  label="Exported" 
                  value={checkData.sections.scrapExportData.exported ? "Yes" : "No"} 
                  type={checkData.sections.scrapExportData.exported ? "info" : "success"} 
                />
              </div>
            )}
          </div>

          {/* Data Discrepancies */}
          <div className="space-y-4">
            <SectionHeader title="Data Discrepancies" icon={Shield} section="discrepancies" />
            {expandedSections.discrepancies && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pl-0 sm:pl-8">
                <DataField 
                  label="Mileage Discrepancy" 
                  value={checkData.sections.odometerReadings.hasReadings ? "Check readings" : "No"} 
                  type={checkData.sections.odometerReadings.hasReadings ? "info" : "success"} 
                />
                <DataField 
                  label="Registration Changed" 
                  value={checkData.sections.plateChanges.hasChanges ? "Yes" : "No"} 
                  type={checkData.sections.plateChanges.hasChanges ? "info" : "success"} 
                />
                <DataField 
                  label="Colour Changed" 
                  value={checkData.sections.colourChanges.hasChanges ? "Yes" : "No"} 
                  type={checkData.sections.colourChanges.hasChanges ? "info" : "success"} 
                />
              </div>
            )}
          </div>

          {/* Historical Changes */}
          <div className="space-y-4">
            <SectionHeader title="Historical Changes" icon={Shield} section="changes" />
            {expandedSections.changes && (
              <div className="grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 pl-0 sm:pl-8">
                <div className={`p-4 rounded-lg border transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Keeper Changes
                  </label>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {checkData.sections.previousKeepers.allChanges.length} keeper change{checkData.sections.previousKeepers.allChanges.length !== 1 ? 's' : ''}
                    </span>
                    {checkData.sections.previousKeepers.allChanges.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs px-3 py-1 h-7"
                        onClick={() => openDetailsDialog(
                          'Keeper Change Records',
                          checkData.sections.previousKeepers.allChanges,
                          'keeperChanges'
                        )}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
                <DataField 
                  label="Plate Changes" 
                  value={checkData.sections.plateChanges.hasChanges 
                    ? `${checkData.sections.plateChanges.allChanges.length} change${checkData.sections.plateChanges.allChanges.length > 1 ? 's' : ''} recorded`
                    : "No plate changes recorded"
                  }
                  onClick={checkData.sections.plateChanges.hasChanges ? () => openDetailsDialog(
                    'Registration Plate Changes',
                    checkData.sections.plateChanges.allChanges,
                    'plateChanges'
                  ) : undefined}
                />
                <DataField 
                  label="Colour Changes" 
                  value={checkData.sections.colourChanges.hasChanges 
                    ? `${checkData.sections.colourChanges.changes.length} change${checkData.sections.colourChanges.changes.length > 1 ? 's' : ''} recorded`
                    : "No colour changes recorded"
                  }
                  onClick={checkData.sections.colourChanges.hasChanges ? () => openDetailsDialog(
                    'Vehicle Colour Changes',
                    checkData.sections.colourChanges.changes,
                    'colourChanges'
                  ) : undefined}
                />
                <div className={`p-4 rounded-lg border transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    V5C Documents
                  </label>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {checkData.sections.v5cLogbook.allRecords.length} V5C document{checkData.sections.v5cLogbook.allRecords.length !== 1 ? 's' : ''}
                    </span>
                    {checkData.sections.v5cLogbook.allRecords.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs px-3 py-1 h-7"
                        onClick={() => openDetailsDialog(
                          'V5C Document History',
                          checkData.sections.v5cLogbook.allRecords,
                          'v5cs'
                        )}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search & Activity History */}
          <div className="space-y-4">
            <SectionHeader title="Search & Activity History" icon={Shield} section="activity" />
            {expandedSections.activity && (
              <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6 pl-0 sm:pl-8">
                <div className={`p-4 rounded-lg border transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Previous Searches
                  </label>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {checkData.sections.previousSearches.allSearches.length} previous search{checkData.sections.previousSearches.allSearches.length !== 1 ? 'es' : ''}
                    </span>
                    {checkData.sections.previousSearches.allSearches.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs px-3 py-1 h-7"
                        onClick={() => openDetailsDialog(
                          'Previous Search History',
                          checkData.sections.previousSearches.allSearches,
                          'previousSearches'
                        )}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
                <DataField 
                  label="Odometer Readings" 
                  value={checkData.sections.odometerReadings.hasReadings 
                    ? `${checkData.sections.odometerReadings.readings.length} reading${checkData.sections.odometerReadings.readings.length > 1 ? 's' : ''} recorded`
                    : "No odometer readings recorded"
                  }
                  onClick={checkData.sections.odometerReadings.hasReadings ? () => openDetailsDialog(
                    'Odometer Reading History',
                    checkData.sections.odometerReadings.readings,
                    'odometerReadings'
                  ) : undefined}
                />
              </div>
            )}
          </div>

          {/* Risk & Insurance Information */}
          <div className="space-y-4">
            <SectionHeader title="Risk & Insurance Information" icon={Shield} section="insurance" />
            {expandedSections.insurance && (
              <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6 pl-0 sm:pl-8">
                <DataField 
                  label="High Risk Markers" 
                  value={checkData.sections.highRiskMarkers.hasMarkers 
                    ? `${checkData.sections.highRiskMarkers.markers.length} marker${checkData.sections.highRiskMarkers.markers.length > 1 ? 's' : ''} found`
                    : "No high risk markers recorded"
                  }
                  onClick={checkData.sections.highRiskMarkers.hasMarkers ? () => openDetailsDialog(
                    'High Risk Markers',
                    checkData.sections.highRiskMarkers.markers,
                    'highRiskMarkers'
                  ) : undefined}
                />
                <DataField 
                  label="Insurance History" 
                  value={checkData.sections.insuranceHistory.hasHistory 
                    ? `${checkData.sections.insuranceHistory.claims.length} claim${checkData.sections.insuranceHistory.claims.length > 1 ? 's' : ''} found`
                    : "No insurance records recorded"
                  }
                  onClick={checkData.sections.insuranceHistory.hasHistory ? () => openDetailsDialog(
                    'Insurance Claim History',
                    checkData.sections.insuranceHistory.claims,
                    'insuranceHistory'
                  ) : undefined}
                />
                <DataField 
                  label="Police Stolen Marker" 
                  value={checkData.sections.policeMarkers.stolenMarker 
                    ? `Recorded: ${checkData.sections.policeMarkers.details.recordedDate || 'Date unknown'}`
                    : "No data available"
                  } 
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-8 space-y-6 border-t border-gray-200 dark:border-slate-700">
            <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Full Vehicle Check Report (PDF)
                </label>
                <Button 
                  onClick={handleDownloadPDF}
                  className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-3 py-3 text-base font-medium"
                >
                  <FileText className="w-5 h-5" />
                  Download PDF Report
                </Button>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Download the complete vehicle check report as PDF
                </p>
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Detailed Vehicle Check
                </label>
                <Button 
                  onClick={handleViewFullReport}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3 py-3 text-base font-medium"
                >
                  <Eye className="w-5 h-5" />
                  View Full Report
                </Button>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  View comprehensive vehicle check details
                </p>
              </div>
              
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Retail Check
                </label>
                <Button 
                  onClick={handleRetailCheck}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-3 py-3 text-base font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  Perform Retail Check
                </Button>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Opens retail check in a new window with current vehicle details
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Details Dialog */}
    <VehicleDetailsDialog
      isOpen={dialogState.isOpen}
      onClose={closeDetailsDialog}
      title={dialogState.title}
      data={dialogState.data}
      dataType={dialogState.dataType}
    />
  </>
  );
}
