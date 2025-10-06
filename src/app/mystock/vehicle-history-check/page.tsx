"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, CheckCircle, XCircle, AlertTriangle, RefreshCw, FileText, Car, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";

// Types for the processed vehicle check data
interface KeeperChange {
  date: string;
  numberOfPreviousKeepers: number;
}

interface SearchRecord {
  date: string;
  typeOfBusiness: string;
}

interface V5cRecord {
  issuedDate: string;
}

interface PlateChange {
  date: string;
  currentRegistration: string;
  previousRegistration: string;
}

interface VehicleCheckData {
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
      allChanges: Array<KeeperChange>;
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
      allSearches: Array<SearchRecord>;
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
      allRecords: Array<V5cRecord>;
    };
    plateChanges: {
      hasChanges: boolean;
      mostRecent: {
        date: string;
        currentRegistration: string;
        previousRegistration: string;
      } | null;
      allChanges: Array<PlateChange>;
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
  lastUpdated: string;
}

function VehicleHistoryCheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useTheme();
  
  const [registration, setRegistration] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleCheckData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  // Get registration from URL parameters and auto-search if provided
  useEffect(() => {
    const regFromUrl = searchParams.get('registration');
    if (regFromUrl) {
      setRegistration(regFromUrl.toUpperCase());
      // Auto-trigger search if registration is provided via URL
      setTimeout(() => {
        handleSearchWithRegistration(regFromUrl);
      }, 100);
    }
  }, [searchParams]);

  const handleSearchWithRegistration = async (regNumber: string) => {
    if (!regNumber.trim()) {
      setError('Please enter a registration number');
      return;
    }

    setLoading(true);
    setError(null);
    setVehicleData(null);

    try {
      const response = await fetch(`/api/vehicle-check?registration=${encodeURIComponent(regNumber.trim())}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch vehicle check data');
      }

      if (result.success && result.data) {
        setVehicleData(result.data);
      } else {
        throw new Error('No vehicle data found');
      }
    } catch (err) {
      console.error('Vehicle check error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while checking the vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await handleSearchWithRegistration(registration);
  };

  // Toggle function for expandable sections
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleRefresh = () => {
    if (registration) {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getOverallStatusIcon = (status: 'clean' | 'issues' | 'warnings') => {
    switch (status) {
      case 'clean': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'issues': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warnings': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'}`}>
      <Header />
      
      <main className="w-full px-4 py-8 mt-16">
        <div className="cam-vehicle-check-container w-full">
          {/* Header with back button and controls */}
          <div className="cam-header-controls flex items-center justify-between mb-6">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.back()}
              className={`cam-back-btn flex items-center gap-2 ${
                isDarkMode 
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </Button>
            <div className="cam-header-actions flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading || !vehicleData}
                className={`cam-refresh-btn flex items-center gap-2 ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button 
                variant="outline"
                size="sm"
                disabled={!vehicleData}
                className={`cam-pdf-btn ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate PDF report
              </Button>
            </div>
          </div>

          {/* Search Section */}
          <Card className={`mb-8 shadow-xl ${isDarkMode ? 'bg-slate-800/90 border-slate-700/50 backdrop-blur-sm' : 'bg-white/90 border-slate-200/50 backdrop-blur-sm'}`}>
            <CardHeader className="pb-4">
              <CardTitle className={`flex items-center gap-3 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <Car className="w-6 h-6 text-blue-500" />
                </div>
                Vehicle History Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                    placeholder="Enter registration number (e.g., RX18GKN)"
                    className={`w-full px-4 py-3 rounded-lg border-2 font-mono font-semibold text-lg transition-all duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:bg-slate-700 focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500'
                    } focus:ring-4 focus:ring-blue-500/20 focus:outline-none`}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={loading || !registration.trim()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Check Vehicle
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                  isDarkMode 
                    ? 'bg-red-900/20 border-red-500 text-red-300' 
                    : 'bg-red-50 border-red-500 text-red-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <div id="cam-check-loading" className="cam-loading-state">
              <Card className={`shadow-xl ${isDarkMode ? 'bg-slate-800/90 border-slate-700/50 backdrop-blur-sm' : 'bg-white/90 border-slate-200/50 backdrop-blur-sm'}`}>
                <CardContent className="cam-loading-content flex flex-col items-center justify-center py-16">
                  <div className="cam-spinner relative">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
                    <RefreshCw className="w-12 h-12 animate-spin text-blue-500 relative z-10" />
                  </div>
                  <p className={`mt-6 text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                    Loading vehicle check data for <span className="font-mono font-bold text-blue-500">{registration}</span>…
                  </p>
                  <div className={`mt-2 text-sm ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                    This may take a few moments
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results */}
          {vehicleData && !loading && (
            <div id="cam-check-results" className="cam-check-results">
              {/* Vehicle Header */}
              <div className="cam-vehicle-header mb-8">
                <Card className={`shadow-xl ${isDarkMode ? 'bg-gradient-to-r from-slate-800/90 to-slate-700/90 border-slate-700/50 backdrop-blur-sm' : 'bg-gradient-to-r from-white/90 to-slate-50/90 border-slate-200/50 backdrop-blur-sm'}`}>
                  <CardContent className="pt-8 pb-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h1 className={`cam-vehicle-title text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {vehicleData.vehicle.title}
                        </h1>
                        <div className="cam-vehicle-meta flex flex-wrap gap-3 mb-4">
                          <span className={`cam-registration px-4 py-2 rounded-lg font-mono font-bold text-lg shadow-md ${
                            isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                          }`}>
                            {vehicleData.vehicle.registration}
                          </span>
                          <span className={`px-3 py-2 rounded-lg font-medium ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                            {vehicleData.vehicle.year}
                          </span>
                          <span className={`px-3 py-2 rounded-lg font-medium ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                            {vehicleData.vehicle.fuelType}
                          </span>
                          <span className={`px-3 py-2 rounded-lg font-medium ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                            {vehicleData.vehicle.transmissionType}
                          </span>
                          <span className={`px-3 py-2 rounded-lg font-medium ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                            {vehicleData.vehicle.colour}
                          </span>
                          <span className={`px-3 py-2 rounded-lg font-medium ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                            {vehicleData.vehicle.owners} owners
                          </span>
                        </div>
                      </div>
                      <div className={`text-right ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>
                        <div className="text-sm font-medium mb-1">Last Updated</div>
                        <div className="text-lg font-semibold">{formatDate(vehicleData.lastUpdated)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="cam-report-layout grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Left Column */}
                <div className="cam-left-column xl:col-span-3 space-y-8">
                  {/* Check Summary */}
                  <div className="cam-section cam-check-summary">
                    <Card className={`shadow-lg ${isDarkMode ? 'bg-slate-800/90 border-slate-700/50 backdrop-blur-sm' : 'bg-white/90 border-slate-200/50 backdrop-blur-sm'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Vehicle check report summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`cam-summary-status flex items-center gap-3 mb-6 p-4 rounded-lg ${
                          vehicleData.checkSummary.overallStatus === 'clean' 
                            ? 'bg-green-50 border border-green-200' 
                            : vehicleData.checkSummary.overallStatus === 'issues'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}>
                          <div className="cam-status-icon">
                            {getOverallStatusIcon(vehicleData.checkSummary.overallStatus)}
                          </div>
                          <span className={`font-medium ${
                            vehicleData.checkSummary.overallStatus === 'clean' 
                              ? 'text-green-800' 
                              : vehicleData.checkSummary.overallStatus === 'issues'
                              ? 'text-red-800'
                              : 'text-yellow-800'
                          }`}>
                            {vehicleData.checkSummary.statusMessage}
                          </span>
                        </div>
                        <div className="cam-check-items space-y-3">
                          {vehicleData.checkSummary.checks.map((check, index) => (
                            <div key={index} className={`cam-check-item flex items-center gap-3 p-3 rounded-lg ${
                              check.status === 'pass' 
                                ? isDarkMode ? 'bg-green-900/20' : 'bg-green-50'
                                : check.status === 'fail'
                                ? isDarkMode ? 'bg-red-900/20' : 'bg-red-50'
                                : isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'
                            }`}>
                              <div className="cam-check-icon">
                                {getStatusIcon(check.status)}
                              </div>
                              <span className={`cam-check-label ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                {check.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Previous Keepers */}
                  <div className="cam-section cam-previous-keepers">
                    <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Previous keepers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`cam-subsection-title text-xs font-semibold mb-3 ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          MOST RECENT RECORDING
                        </div>
                        <div className="cam-data-table space-y-2">
                          <div className="cam-data-row flex justify-between">
                            <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                              Number of previous keepers
                            </div>
                            <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {vehicleData.sections.previousKeepers.mostRecent.numberOfPreviousKeepers}
                            </div>
                          </div>
                          {vehicleData.sections.previousKeepers.mostRecent.dateOfLastKeeperChange && (
                            <div className="cam-data-row flex justify-between">
                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                Date of last keeper change
                              </div>
                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {formatDate(vehicleData.sections.previousKeepers.mostRecent.dateOfLastKeeperChange)}
                              </div>
                            </div>
                          )}
                        </div>
                        {vehicleData.sections.previousKeepers.allChanges.length > 1 && (
                          <div className="cam-show-all mt-6">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => toggleSection('previousKeepers')}
                              className={`cam-show-all-btn flex items-center gap-2 transition-all duration-200 ${
                                isDarkMode 
                                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500' 
                                  : 'border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                              }`}
                            >
                              {expandedSections.previousKeepers ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  Show all ({vehicleData.sections.previousKeepers.allChanges.length})
                                </>
                              )}
                            </Button>
                            {expandedSections.previousKeepers && (
                              <div className="mt-4 space-y-3">
                                {vehicleData.sections.previousKeepers.allChanges.slice(1).map((change, index) => (
                                  <div key={index} className={`p-4 rounded-lg border ${
                                    isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                                  }`}>
                                    <div className="cam-data-table space-y-2">
                                      <div className="cam-data-row flex justify-between">
                                        <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                          Date of change
                                        </div>
                                        <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                          {formatDate(change.date)}
                                        </div>
                                      </div>
                                      <div className="cam-data-row flex justify-between">
                                        <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                          Previous keepers
                                        </div>
                                        <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                          {change.numberOfPreviousKeepers}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Finance Information */}
                  <div className="cam-section cam-finance-data">
                    <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Finance information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="cam-finance-status space-y-3 mb-4">
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.finance.privateFinance ? 'fail' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.finance.privateFinance ? 'Outstanding private finance found' : 'No outstanding private finance'}
                            </span>
                          </div>
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.finance.tradeFinance ? 'warning' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.finance.tradeFinance ? 'Outstanding trade finance found' : 'No outstanding trade finance'}
                            </span>
                          </div>
                        </div>
                        {vehicleData.sections.finance.agreements.length > 0 && (
                          <>
                            <div className={`cam-subsection-title text-xs font-semibold mb-3 ${
                              isDarkMode ? 'text-white' : 'text-slate-500'
                            }`}>
                              MOST RECENT AGREEMENT
                            </div>
                            <div className="cam-data-table space-y-2">
                              {vehicleData.sections.finance.agreements[0].agreementId && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Agreement ID
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.finance.agreements[0].agreementId}
                                  </div>
                                </div>
                              )}
                              {vehicleData.sections.finance.agreements[0].company && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Company
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.finance.agreements[0].company}
                                  </div>
                                </div>
                              )}
                              {vehicleData.sections.finance.agreements[0].type && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Type
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.finance.agreements[0].type}
                                  </div>
                                </div>
                              )}
                              {vehicleData.sections.finance.agreements[0].startDate && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Start Date
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {formatDate(vehicleData.sections.finance.agreements[0].startDate)}
                                  </div>
                                </div>
                              )}
                              {vehicleData.sections.finance.agreements[0].term && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Term
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.finance.agreements[0].term}
                                  </div>
                                </div>
                              )}
                              {vehicleData.sections.finance.agreements[0].telephoneNumber && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Contact Number
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.finance.agreements[0].telephoneNumber}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* High Risk Markers */}
                  <div className="cam-section cam-high-risk-markers">
                    <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          High risk markers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="cam-risk-status">
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.highRiskMarkers.hasMarkers ? 'fail' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.highRiskMarkers.hasMarkers ? 'High risk markers found' : 'No high risk markers'}
                            </span>
                          </div>
                        </div>
                        {vehicleData.sections.highRiskMarkers.hasMarkers && vehicleData.sections.highRiskMarkers.markers.length > 0 && (
                          <>
                            <div className={`cam-subsection-title text-xs font-semibold mb-3 mt-4 ${
                              isDarkMode ? 'text-white' : 'text-slate-500'
                            }`}>
                              RISK MARKERS
                            </div>
                            <div className="cam-data-table space-y-2">
                              {vehicleData.sections.highRiskMarkers.markers[0].startDate && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Start Date
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {formatDate(vehicleData.sections.highRiskMarkers.markers[0].startDate)}
                                  </div>
                                </div>
                              )}
                              {vehicleData.sections.highRiskMarkers.markers[0].type && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Type
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.highRiskMarkers.markers[0].type}
                                  </div>
                                </div>
                              )}
                              {vehicleData.sections.highRiskMarkers.markers[0].telephoneNumber && (
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Contact Number
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.highRiskMarkers.markers[0].telephoneNumber}
                                  </div>
                                </div>
                              )}
                            </div>
                            {vehicleData.sections.highRiskMarkers.markers.length > 1 && (
                              <div className="cam-show-all mt-6">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => toggleSection('highRiskMarkers')}
                                  className={`cam-show-all-btn flex items-center gap-2 transition-all duration-200 ${
                                    isDarkMode 
                                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500' 
                                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                                  }`}
                                >
                                  {expandedSections.highRiskMarkers ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      Show all ({vehicleData.sections.highRiskMarkers.markers.length})
                                    </>
                                  )}
                                </Button>
                                {expandedSections.highRiskMarkers && (
                                  <div className="mt-4 space-y-3">
                                    {vehicleData.sections.highRiskMarkers.markers.slice(1).map((marker, index) => (
                                      <div key={index} className={`p-4 rounded-lg border ${
                                        isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                                      }`}>
                                        <div className="cam-data-table space-y-2">
                                          <div className="cam-data-row flex justify-between">
                                            <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                              Type
                                            </div>
                                            <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                              {marker.type}
                                            </div>
                                          </div>
                                          <div className="cam-data-row flex justify-between">
                                            <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                              Date
                                            </div>
                                            <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                              {formatDate(marker.startDate || '')}
                                            </div>
                                          </div>
                                          {marker.telephoneNumber && (
                                            <div className="cam-data-row flex justify-between">
                                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                                Contact
                                              </div>
                                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {marker.telephoneNumber}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Insurance History */}
                  {vehicleData.sections.insuranceHistory && (
                    <div className="cam-section cam-insurance-history">
                      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <CardHeader>
                          <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Insurance history
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="cam-insurance-status">
                            <div className="cam-info-item flex items-center gap-3">
                              <div className="cam-info-icon">
                                {getStatusIcon(vehicleData.sections.insuranceHistory.hasHistory ? 'warning' : 'pass')}
                              </div>
                              <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                                {vehicleData.sections.insuranceHistory.hasHistory ? 'Insurance claims found' : 'No insurance claims found'}
                              </span>
                            </div>
                          </div>
                          {vehicleData.sections.insuranceHistory.hasHistory && vehicleData.sections.insuranceHistory.claims.length > 0 && (
                            <>
                              <div className={`cam-subsection-title text-xs font-semibold mb-3 mt-4 ${
                                isDarkMode ? 'text-white' : 'text-slate-500'
                              }`}>
                                MOST RECENT CLAIM
                              </div>
                              <div className="cam-data-table space-y-2">
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Claim Type
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Category {vehicleData.sections.insuranceHistory.claims[0].type}
                                  </div>
                                </div>
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Loss Date
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {formatDate(vehicleData.sections.insuranceHistory.claims[0].lossDate)}
                                  </div>
                                </div>
                                {vehicleData.sections.insuranceHistory.claims[0].removedDate && (
                                  <div className="cam-data-row flex justify-between">
                                    <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                      Removed Date
                                    </div>
                                    <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                      {formatDate(vehicleData.sections.insuranceHistory.claims[0].removedDate)}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {vehicleData.sections.insuranceHistory.claims.length > 1 && (
                                <div className="cam-show-all mt-6">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => toggleSection('insuranceHistory')}
                                    className={`cam-show-all-btn flex items-center gap-2 transition-all duration-200 ${
                                      isDarkMode 
                                        ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500' 
                                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                                    }`}
                                  >
                                    {expandedSections.insuranceHistory ? (
                                      <>
                                        <ChevronUp className="w-4 h-4" />
                                        Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4" />
                                        Show all ({vehicleData.sections.insuranceHistory.claims.length})
                                      </>
                                    )}
                                  </Button>
                                  {expandedSections.insuranceHistory && (
                                    <div className="mt-4 space-y-3">
                                      {vehicleData.sections.insuranceHistory.claims.slice(1).map((claim, index) => (
                                        <div key={index} className={`p-4 rounded-lg border ${
                                          isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                          <div className="cam-data-table space-y-2">
                                            <div className="cam-data-row flex justify-between">
                                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                                Type
                                              </div>
                                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {claim.type}
                                              </div>
                                            </div>
                                            <div className="cam-data-row flex justify-between">
                                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                                Loss Date
                                              </div>
                                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {formatDate(claim.lossDate)}
                                              </div>
                                            </div>
                                            {claim.removedDate && (
                                              <div className="cam-data-row flex justify-between">
                                                <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                                  Removed Date
                                                </div>
                                                <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                  {formatDate(claim.removedDate)}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Odometer Readings */}
                  {vehicleData.sections.odometerReadings && (
                    <div className="cam-section cam-odometer-readings">
                      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <CardHeader>
                          <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Mileage history
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="cam-odometer-status">
                            <div className="cam-info-item flex items-center gap-3">
                              <div className="cam-info-icon">
                                {getStatusIcon(vehicleData.sections.odometerReadings.hasReadings ? 'pass' : 'warning')}
                              </div>
                              <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                                {vehicleData.sections.odometerReadings.hasReadings ? 'Mileage records available' : 'No mileage records found'}
                              </span>
                            </div>
                          </div>
                          {vehicleData.sections.odometerReadings.mostRecent && (
                            <>
                              <div className={`cam-subsection-title text-xs font-semibold mb-3 mt-4 ${
                                isDarkMode ? 'text-white' : 'text-slate-500'
                              }`}>
                                MOST RECENT READING
                              </div>
                              <div className="cam-data-table space-y-2">
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Date
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {formatDate(vehicleData.sections.odometerReadings.mostRecent.performed)}
                                  </div>
                                </div>
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Mileage
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.odometerReadings.mostRecent.odometerReadingMiles.toLocaleString()} miles
                                  </div>
                                </div>
                                <div className="cam-data-row flex justify-between">
                                  <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                    Source
                                  </div>
                                  <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {vehicleData.sections.odometerReadings.mostRecent.source}
                                  </div>
                                </div>
                              </div>
                              {vehicleData.sections.odometerReadings.readings.length > 1 && (
                                <div className="cam-show-all mt-6">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => toggleSection('odometerReadings')}
                                    className={`cam-show-all-btn flex items-center gap-2 transition-all duration-200 ${
                                      isDarkMode 
                                        ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500' 
                                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                                    }`}
                                  >
                                    {expandedSections.odometerReadings ? (
                                      <>
                                        <ChevronUp className="w-4 h-4" />
                                        Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4" />
                                        Show all ({vehicleData.sections.odometerReadings.readings.length})
                                      </>
                                    )}
                                  </Button>
                                  {expandedSections.odometerReadings && (
                                    <div className="mt-4 space-y-3">
                                      {vehicleData.sections.odometerReadings.readings.slice(1).map((reading, index) => (
                                        <div key={index} className={`p-4 rounded-lg border ${
                                          isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                          <div className="cam-data-table space-y-2">
                                            <div className="cam-data-row flex justify-between">
                                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                                Date
                                              </div>
                                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {formatDate(reading.performed)}
                                              </div>
                                            </div>
                                            <div className="cam-data-row flex justify-between">
                                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                                Mileage
                                              </div>
                                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {reading.odometerReadingMiles.toLocaleString()} miles
                                              </div>
                                            </div>
                                            <div className="cam-data-row flex justify-between">
                                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                                Source
                                              </div>
                                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {reading.source}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Previous Searches */}
                  {vehicleData.sections.previousSearches.mostRecent && (
                    <div className="cam-section cam-previous-searches">
                      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <CardHeader>
                          <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Previous searches
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`cam-subsection-title text-xs font-semibold mb-3 ${
                            isDarkMode ? 'text-white' : 'text-slate-500'
                          }`}>
                            MOST RECENT SEARCH
                          </div>
                          <div className="cam-data-table space-y-2">
                            <div className="cam-data-row flex justify-between">
                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                Date
                              </div>
                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {formatDate(vehicleData.sections.previousSearches.mostRecent.date)}
                              </div>
                            </div>
                            <div className="cam-data-row flex justify-between">
                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                Type of Business
                              </div>
                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {vehicleData.sections.previousSearches.mostRecent.typeOfBusiness}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="cam-right-column space-y-8">
                  {/* Vehicle Details */}
                  <div className="cam-section cam-vehicle-details">
                    <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Registered vehicle details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`cam-details-description text-sm mb-4 ${
                          isDarkMode ? 'text-white' : 'text-slate-600'
                        }`}>
                          Check the details below match the V5C logbook, vehicle appearance and vehicle information.
                        </div>
                        <div className="cam-details-table space-y-3">
                          {Object.entries({
                            'Make': vehicleData.sections.vehicleDetails.make,
                            'Model': vehicleData.sections.vehicleDetails.model,
                            'VRM': vehicleData.sections.vehicleDetails.registration,
                            'VIN': vehicleData.sections.vehicleDetails.vin,
                            'Engine number': vehicleData.sections.vehicleDetails.engineNumber,
                            'Body type': vehicleData.sections.vehicleDetails.bodyType,
                            'Colour': vehicleData.sections.vehicleDetails.colour,
                            'Date first registered': formatDate(vehicleData.sections.vehicleDetails.firstRegistrationDate),
                            'Year of manufacture': vehicleData.sections.vehicleDetails.yearOfManufacture,
                            'Number of previous owners': vehicleData.sections.vehicleDetails.numberOfPreviousOwners.toString(),
                            'Engine capacity': vehicleData.sections.vehicleDetails.engineCapacity,
                            'Fuel type': vehicleData.sections.vehicleDetails.fuelType,
                            'Transmission': vehicleData.sections.vehicleDetails.transmission,
                            'CO2 emissions': vehicleData.sections.vehicleDetails.co2Emissions
                          }).map(([label, value]) => (
                            value && (
                              <div key={label} className="cam-detail-row flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <div className={`cam-detail-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                  {label}
                                </div>
                                <div className={`cam-detail-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {value}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Police Markers */}
                  <div className="cam-section cam-police-markers">
                    <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Police markers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="cam-police-status">
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.policeMarkers.stolenMarker ? 'fail' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.policeMarkers.stolenMarker ? 'Stolen marker found' : 'No stolen marker'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* V5C Logbook */}
                  {vehicleData.sections.v5cLogbook.mostRecent && (
                    <div className="cam-section cam-v5c-logbook">
                      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <CardHeader>
                          <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            V5C logbook data
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`cam-v5c-date-badge text-xs font-semibold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-500'
                          }`}>
                            V5C issue date
                          </div>
                          <div className={`cam-subsection-title text-xs font-semibold mb-3 ${
                            isDarkMode ? 'text-white' : 'text-slate-500'
                          }`}>
                            MOST RECENT RECORDING
                          </div>
                          <div className="cam-data-table">
                            <div className="cam-data-row flex justify-between">
                              <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                Date of most recent record
                              </div>
                              <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {formatDate(vehicleData.sections.v5cLogbook.mostRecent.dateOfMostRecentRecord)}
                              </div>
                            </div>
                          </div>
                          {vehicleData.sections.v5cLogbook.allRecords.length > 1 && (
                            <div className="cam-show-all mt-6">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => toggleSection('v5cLogbook')}
                                className={`cam-show-all-btn flex items-center gap-2 transition-all duration-200 ${
                                  isDarkMode 
                                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500' 
                                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                                }`}
                              >
                                {expandedSections.v5cLogbook ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    Show all ({vehicleData.sections.v5cLogbook.allRecords.length})
                                  </>
                                )}
                              </Button>
                              {expandedSections.v5cLogbook && (
                                <div className="mt-4 space-y-3">
                                  {vehicleData.sections.v5cLogbook.allRecords.slice(1).map((record, index) => (
                                    <div key={index} className={`p-4 rounded-lg border ${
                                      isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                      <div className="cam-data-table space-y-2">
                                        <div className="cam-data-row flex justify-between">
                                          <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                            Issue Date
                                          </div>
                                          <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {formatDate(record.issuedDate)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Plate Changes */}
                  <div className="cam-section cam-plate-changes">
                    <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Plate changes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="cam-plate-status">
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.plateChanges.hasChanges ? 'warning' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.plateChanges.hasChanges ? 'Plate changes recorded' : 'No recorded plate changes'}
                            </span>
                          </div>
                        </div>
                        {vehicleData.sections.plateChanges.mostRecent && (
                          <>
                            <div className={`cam-subsection-title text-xs font-semibold mb-3 mt-4 ${
                              isDarkMode ? 'text-white' : 'text-slate-500'
                            }`}>
                              MOST RECENT CHANGE
                            </div>
                            <div className="cam-data-table space-y-2">
                              <div className="cam-data-row flex justify-between">
                                <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                  Date
                                </div>
                                <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {formatDate(vehicleData.sections.plateChanges.mostRecent.date)}
                                </div>
                              </div>
                              <div className="cam-data-row flex justify-between">
                                <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                  Current Registration
                                </div>
                                <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {vehicleData.sections.plateChanges.mostRecent.currentRegistration}
                                </div>
                              </div>
                              <div className="cam-data-row flex justify-between">
                                <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                  Previous Registration
                                </div>
                                <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {vehicleData.sections.plateChanges.mostRecent.previousRegistration}
                                </div>
                              </div>
                            </div>
                            {vehicleData.sections.plateChanges.allChanges.length > 1 && (
                              <div className="cam-show-all mt-6">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => toggleSection('plateChanges')}
                                  className={`cam-show-all-btn flex items-center gap-2 transition-all duration-200 ${
                                    isDarkMode 
                                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500' 
                                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                                  }`}
                                >
                                  {expandedSections.plateChanges ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      Show all ({vehicleData.sections.plateChanges.allChanges.length})
                                    </>
                                  )}
                                </Button>
                                {expandedSections.plateChanges && (
                                  <div className="mt-4 space-y-3">
                                    {vehicleData.sections.plateChanges.allChanges.slice(1).map((change, index) => (
                                      <div key={index} className={`p-4 rounded-lg border ${
                                        isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                                      }`}>
                                        <div className="cam-data-table space-y-2">
                                          <div className="cam-data-row flex justify-between">
                                            <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                              Date
                                            </div>
                                            <div className={`cam-data-value font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                              {formatDate(change.date)}
                                            </div>
                                          </div>
                                          <div className="cam-data-row flex justify-between">
                                            <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                              Current Registration
                                            </div>
                                            <div className={`cam-data-value font-medium font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                              {change.currentRegistration}
                                            </div>
                                          </div>
                                          <div className="cam-data-row flex justify-between">
                                            <div className={`cam-data-label ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                                              Previous Registration
                                            </div>
                                            <div className={`cam-data-value font-medium font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                              {change.previousRegistration}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Colour Changes */}
                  <div className="cam-section cam-colour-changes">
                    <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Colour changes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="cam-colour-status">
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.colourChanges.hasChanges ? 'warning' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.colourChanges.hasChanges ? 'Colour changes recorded' : 'No colour changes recorded'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Scrap and Export Data */}
                  <div className="cam-section cam-scrap-export-data">
                    <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <CardHeader>
                        <CardTitle className={`cam-section-title ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Scrap and export data
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="cam-scrap-export-status space-y-3">
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.scrapExportData.scrapped ? 'fail' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.scrapExportData.scrapped ? 'Vehicle recorded as scrapped' : 'Vehicle not recorded as scrapped'}
                            </span>
                          </div>
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.scrapExportData.exported ? 'fail' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.scrapExportData.exported ? 'Vehicle recorded as exported' : 'Vehicle not recorded as exported'}
                            </span>
                          </div>
                          <div className="cam-info-item flex items-center gap-3">
                            <div className="cam-info-icon">
                              {getStatusIcon(vehicleData.sections.scrapExportData.imported ? 'warning' : 'pass')}
                            </div>
                            <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>
                              {vehicleData.sections.scrapExportData.imported ? 'Vehicle recorded as imported' : 'Vehicle not recorded as imported'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function VehicleHistoryCheckPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <main className="w-full px-4 py-8 mt-16">
          <div className="w-full">
            <Card className="shadow-xl bg-white/90 dark:bg-slate-800/90 border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <RefreshCw className="w-12 h-12 animate-spin text-blue-500" />
                <p className="mt-6 text-lg font-medium text-slate-600 dark:text-white">
                  Loading vehicle check page...
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <VehicleHistoryCheckContent />
    </Suspense>
  );
}
