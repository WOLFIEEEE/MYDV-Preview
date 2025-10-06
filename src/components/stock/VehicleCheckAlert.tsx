"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, AlertTriangle, Shield, Eye, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
interface VehicleCheckAlertProps {
  stockData: {
    registration?: string;
    vehicle?: {
      registration?: string;
    };
    stockId?: string;
  };
  isInline?: boolean;
}

interface VehicleCheckSummary {
  overallStatus: 'clean' | 'issues' | 'warnings' | 'unavailable';
  statusMessage: string;
  checks: Array<{
    label: string;
    status: 'pass' | 'fail' | 'warning';
    passed: boolean;
  }>;
  hasData: boolean;
}

export default function VehicleCheckAlert({ stockData, isInline = false }: VehicleCheckAlertProps) {
  const { isDarkMode } = useTheme();
  const [checkSummary, setCheckSummary] = useState<VehicleCheckSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get registration from either direct property or nested vehicle object
  const registration = stockData?.registration || stockData?.vehicle?.registration;

  useEffect(() => {
    const fetchVehicleCheckSummary = async () => {
      if (!registration) {
        setCheckSummary({
          overallStatus: 'unavailable',
          statusMessage: 'Vehicle check cannot be performed - no registration number available',
          checks: [],
          hasData: false
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          registration: registration.toUpperCase()
        });

        const response = await fetch(`/api/vehicle-check?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch vehicle check data');
        }

        if (data.success && data.data) {
          const vehicleCheckData = data.data;
          const summary = processVehicleCheckSummary(vehicleCheckData);
          setCheckSummary(summary);
        } else {
          setCheckSummary({
            overallStatus: 'unavailable',
            statusMessage: 'Vehicle check data not available for this registration',
            checks: [],
            hasData: false
          });
        }
      } catch (error) {
        console.error('Vehicle check error:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch vehicle check data');
        setCheckSummary({
          overallStatus: 'unavailable',
          statusMessage: 'Unable to perform vehicle check at this time',
          checks: [],
          hasData: false
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicleCheckSummary();
  }, [registration]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processVehicleCheckSummary = (data: any): VehicleCheckSummary => {
    const checks: Array<{
      label: string;
      status: 'pass' | 'fail' | 'warning';
      passed: boolean;
    }> = [];
    let hasIssues = false;
    let hasWarnings = false;

    // Check for stolen status
    if (data.sections?.vehicleDetails?.stolen !== undefined) {
      const isStolen = data.sections.vehicleDetails.stolen;
      checks.push({
        label: 'Stolen Check',
        status: isStolen ? 'fail' : 'pass' as const,
        passed: !isStolen
      });
      if (isStolen) hasIssues = true;
    }

    // Check for scrapped status
    if (data.sections?.vehicleDetails?.scrapped !== undefined) {
      const isScrapped = data.sections.vehicleDetails.scrapped;
      checks.push({
        label: 'Scrapped Check',
        status: isScrapped ? 'fail' : 'pass' as const,
        passed: !isScrapped
      });
      if (isScrapped) hasIssues = true;
    }

    // Check for finance
    if (data.sections?.finance) {
      const hasFinance = data.sections.finance.privateFinance || data.sections.finance.tradeFinance;
      checks.push({
        label: 'Finance Check',
        status: hasFinance ? 'warning' : 'pass' as const,
        passed: !hasFinance
      });
      if (hasFinance) hasWarnings = true;
    }

    // Check for high risk markers
    if (data.sections?.highRiskMarkers) {
      const hasRiskMarkers = data.sections.highRiskMarkers.hasMarkers;
      checks.push({
        label: 'Risk Markers',
        status: hasRiskMarkers ? 'fail' : 'pass' as const,
        passed: !hasRiskMarkers
      });
      if (hasRiskMarkers) hasIssues = true;
    }

    // Check for mileage discrepancy
    if (data.sections?.vehicleDetails?.mileageDiscrepancy !== undefined) {
      const hasMileageIssue = data.sections.vehicleDetails.mileageDiscrepancy;
      checks.push({
        label: 'Mileage Check',
        status: hasMileageIssue ? 'warning' : 'pass' as const,
        passed: !hasMileageIssue
      });
      if (hasMileageIssue) hasWarnings = true;
    }

    // Check for insurance write-off
    if (data.sections?.vehicleDetails?.insuranceWriteoffCategory) {
      const hasWriteOff = data.sections.vehicleDetails.insuranceWriteoffCategory !== null;
      checks.push({
        label: 'Insurance Write-off',
        status: hasWriteOff ? 'fail' : 'pass' as const,
        passed: !hasWriteOff
      });
      if (hasWriteOff) hasIssues = true;
    }

    // Determine overall status
    let overallStatus: 'clean' | 'issues' | 'warnings' = 'clean';
    let statusMessage = 'All vehicle checks passed successfully';

    if (hasIssues) {
      overallStatus = 'issues';
      statusMessage = 'Some vehicle checks have failed. Please review the full detailed report for complete information.';
    } else if (hasWarnings) {
      overallStatus = 'warnings';
      statusMessage = 'Vehicle checks completed with some warnings. Review recommended.';
    }

    return {
      overallStatus,
      statusMessage,
      checks,
      hasData: true
    };
  };

  const handleViewFullReport = () => {
    if (!registration) return;
    
    const cleanRegistration = registration.replace(/[^A-Z0-9]/gi, '');
    const url = `/mystock/vehicle-history-check?registration=${cleanRegistration}`;
    window.open(url, '_blank');
  };

  const getAlertStyles = () => {
    if (!checkSummary) return '';

    switch (checkSummary.overallStatus) {
      case 'clean':
        return isDarkMode 
          ? 'bg-green-900/20 border-l-green-500 border border-green-800' 
          : 'bg-green-50 border-l-green-500 border border-green-200';
      case 'warnings':
        return isDarkMode 
          ? 'bg-yellow-900/20 border-l-yellow-500 border border-yellow-800' 
          : 'bg-yellow-50 border-l-yellow-500 border border-yellow-200';
      case 'issues':
        return isDarkMode 
          ? 'bg-red-900/20 border-l-red-500 border border-red-800' 
          : 'bg-red-50 border-l-red-500 border border-red-200';
      case 'unavailable':
        return isDarkMode 
          ? 'bg-gray-900/20 border-l-gray-500 border border-gray-800' 
          : 'bg-gray-50 border-l-gray-500 border border-gray-200';
      default:
        return '';
    }
  };

  const getIconAndColors = () => {
    if (!checkSummary) return { icon: AlertCircle, textColor: 'text-gray-500', iconColor: 'text-gray-400' };

    switch (checkSummary.overallStatus) {
      case 'clean':
        return {
          icon: CheckCircle,
          textColor: isDarkMode ? 'text-green-300' : 'text-green-800',
          iconColor: 'text-green-500',
          subtextColor: isDarkMode ? 'text-green-200' : 'text-green-700'
        };
      case 'warnings':
        return {
          icon: AlertTriangle,
          textColor: isDarkMode ? 'text-yellow-300' : 'text-yellow-800',
          iconColor: 'text-yellow-500',
          subtextColor: isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
        };
      case 'issues':
        return {
          icon: AlertCircle,
          textColor: isDarkMode ? 'text-red-300' : 'text-red-800',
          iconColor: 'text-red-500',
          subtextColor: isDarkMode ? 'text-red-200' : 'text-red-700'
        };
      case 'unavailable':
        return {
          icon: Shield,
          textColor: isDarkMode ? 'text-white' : 'text-gray-800',
          iconColor: 'text-gray-500',
          subtextColor: isDarkMode ? 'text-white' : 'text-gray-700'
        };
      default:
        return { icon: AlertCircle, textColor: 'text-gray-500', iconColor: 'text-gray-400' };
    }
  };

  const getAlertTitle = () => {
    if (!checkSummary) return 'Vehicle Check';

    switch (checkSummary.overallStatus) {
      case 'clean':
        return 'Vehicle Check Passed';
      case 'warnings':
        return 'Vehicle Check Warnings';
      case 'issues':
        return 'Vehicle Check Alert';
      case 'unavailable':
        return 'Vehicle Check Unavailable';
      default:
        return 'Vehicle Check';
    }
  };

  // Inline rendering for header badges
  if (isInline) {
    if (!registration && !isLoading) {
      return null; // Don't show anything if no registration in inline mode
    }

    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
            isDarkMode 
              ? 'bg-blue-900/30 text-blue-300 border border-blue-700'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking...
          </div>
        </div>
      );
    }

    if (error || !checkSummary) {
      return (
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
            isDarkMode 
              ? 'bg-gray-900/30 text-gray-300 border border-gray-700'
              : 'bg-gray-50 text-gray-700 border border-gray-200'
          }`}>
            <Shield className="h-4 w-4" />
            Check Unavailable
          </div>
        </div>
      );
    }

    const { icon: Icon, textColor, iconColor } = getIconAndColors();
    
    return (
      <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
          checkSummary.overallStatus === 'clean'
            ? isDarkMode 
              ? 'bg-green-900/30 text-green-300 border border-green-700'
              : 'bg-green-50 text-green-700 border border-green-200'
            : checkSummary.overallStatus === 'warnings'
            ? isDarkMode 
              ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            : checkSummary.overallStatus === 'issues'
            ? isDarkMode 
              ? 'bg-red-900/30 text-red-300 border border-red-700'
              : 'bg-red-50 text-red-700 border border-red-200'
            : isDarkMode
              ? 'bg-gray-900/30 text-gray-300 border border-gray-700'
              : 'bg-gray-50 text-gray-700 border border-gray-200'
        }`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {checkSummary.overallStatus === 'clean' ? 'Check Passed' :
           checkSummary.overallStatus === 'warnings' ? 'Check Warnings' :
           checkSummary.overallStatus === 'issues' ? 'Check Issues' :
           'Check Unavailable'}
        </div>
        
        {checkSummary.hasData && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewFullReport}
            className="flex items-center gap-2 px-3 py-1 h-auto text-sm"
          >
            <Eye className="h-4 w-4" />
            View Full Report
          </Button>
        )}
      </div>
    );
  }

  // Don't render if no registration and no loading state
  if (!registration && !isLoading) {
    return (
      <div className={`mt-4 p-4 rounded-lg border-l-4 ${
        isDarkMode 
          ? 'bg-gray-900/20 border-l-gray-500 border border-gray-800' 
          : 'bg-gray-50 border-l-gray-500 border border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-gray-500 mr-3" />
            <div>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Vehicle Check Unavailable
              </span>
              <span className="mx-2 text-gray-400">|</span>
              <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Vehicle check cannot be performed - no registration number available for this stock item.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`mt-4 p-4 rounded-lg border-l-4 ${
        isDarkMode 
          ? 'bg-blue-900/20 border-l-blue-500 border border-blue-800' 
          : 'bg-blue-50 border-l-blue-500 border border-blue-200'
      }`}>
        <div className="flex items-center">
          <Loader2 className="h-5 w-5 text-blue-500 mr-3 animate-spin" />
          <div>
            <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              Performing Vehicle Check
            </span>
            <span className="mx-2 text-blue-400">|</span>
            <span className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
              Checking vehicle history for {registration}...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mt-4 p-4 rounded-lg border-l-4 ${
        isDarkMode 
          ? 'bg-red-900/20 border-l-red-500 border border-red-800' 
          : 'bg-red-50 border-l-red-500 border border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <span className={`font-medium ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
                Vehicle Check Error
              </span>
              <span className="mx-2 text-red-400">|</span>
              <span className={`text-sm ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                {error}
              </span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4"
            onClick={() => window.location.reload()}
          >
            Retry Check
          </Button>
        </div>
      </div>
    );
  }

  if (!checkSummary) return null;

  const { icon: Icon, textColor, iconColor, subtextColor } = getIconAndColors();

  return (
    <div className={`mt-4 p-4 rounded-lg border-l-4 ${getAlertStyles()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Icon className={`h-5 w-5 ${iconColor} mr-3`} />
          <div>
            <span className={`font-medium ${textColor}`}>
              {getAlertTitle()}
            </span>
            <span className="mx-2 text-gray-400">|</span>
            <span className={`text-sm ${subtextColor}`}>
              {checkSummary.statusMessage}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {checkSummary.hasData && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleViewFullReport}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Full Report
            </Button>
          )}
        </div>
      </div>
      
      {/* Show check summary if available */}
      {checkSummary.hasData && checkSummary.checks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {checkSummary.checks.slice(0, 4).map((check, index) => (
              <div 
                key={index}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  check.status === 'pass' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : check.status === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                {check.status === 'pass' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : check.status === 'warning' ? (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {check.label}
              </div>
            ))}
            {checkSummary.checks.length > 4 && (
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-white">
                +{checkSummary.checks.length - 4} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
