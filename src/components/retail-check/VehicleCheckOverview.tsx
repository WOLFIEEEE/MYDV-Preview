"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Car, 
  Calendar,
  Gauge,
  FileText,
  AlertCircle,
  Info,
  ImageIcon
} from "lucide-react";
import { VehicleInfo } from "@/types/retail-check";

interface VehicleCheckData {
  status: 'passed' | 'warning' | 'failed';
  stolen: boolean;
  scrapped: boolean;
  written_off: boolean;
  imported: boolean;
  exported: boolean;
  highRisk: boolean;
  mileageDiscrepancy: boolean;
  outstandingFinance: boolean;
  previousKeepers: number;
  lastMOT?: {
    date: string;
    result: 'pass' | 'fail';
    mileage: number;
  };
  advisories: string[];
  recalls: string[];
}

interface VehicleCheckOverviewProps {
  vehicleInfo?: VehicleInfo;
  vehicleCheck?: VehicleCheckData;
  isDarkMode: boolean;
  vehicleImage?: string; // Optional vehicle image URL
  flowType?: 'stock' | 'vehicle-finder' | 'taxonomy';
}

export default function VehicleCheckOverview({ vehicleInfo, vehicleCheck, isDarkMode, vehicleImage, flowType }: VehicleCheckOverviewProps) {
  if (!vehicleInfo) {
    return (
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">No vehicle information available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Information */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Car className="w-5 h-5" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle Image */}
          <div className="relative w-full h-48 mb-6 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600">
            {vehicleImage ? (
              <>
                <img 
                  src={vehicleImage} 
                  alt={`${vehicleInfo.make} ${vehicleInfo.model}`}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Gradient overlay for better text readability if needed */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Enhanced placeholder for vehicle image */}
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                    <Car className={`w-10 h-10 ${isDarkMode ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    {vehicleInfo.make} {vehicleInfo.model}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                Make & Model
              </p>
              <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehicleInfo.make} {vehicleInfo.model}
              </p>
            </div>
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                Registration
              </p>
              <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehicleInfo.registration}
              </p>
            </div>
          </div>

          {vehicleInfo.derivative && (
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                Derivative
              </p>
              <p className={`${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {vehicleInfo.derivative}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Year</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {vehicleInfo.year}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-gray-400" />
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Mileage</p>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {vehicleInfo.mileage?.toLocaleString() || 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Fuel</p>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehicleInfo.fuelType || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Check Results - Only show for Stock and Vehicle Finder flows */}
      {vehicleCheck && (flowType === 'stock' || flowType === 'vehicle-finder') && (
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Shield className="w-5 h-5" />
              Vehicle Check
              <Badge className={
                vehicleCheck.status === 'passed' 
                  ? 'bg-green-500' 
                  : vehicleCheck.status === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }>
                {vehicleCheck.status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Security Checks */}
            <div className="space-y-3">
              <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Security & Legal
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Stolen Check</span>
                  {vehicleCheck.stolen ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Scrapped</span>
                  {vehicleCheck.scrapped ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Written Off</span>
                  {vehicleCheck.written_off ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Outstanding Finance</span>
                  {vehicleCheck.outstandingFinance ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>High Risk</span>
                  {vehicleCheck.highRisk ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            {/* History Information */}
            <div className="space-y-3">
              <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                History
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Previous Keepers
                  </p>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {vehicleCheck.previousKeepers}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                    Mileage Check
                  </p>
                  <div className="flex items-center gap-1">
                    {vehicleCheck.mileageDiscrepancy ? (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-500 text-sm">Discrepancy</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-500 text-sm">Verified</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MOT Information */}
            {vehicleCheck.lastMOT && (
              <div className="space-y-3">
                <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Last MOT
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Date
                    </p>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(vehicleCheck.lastMOT.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      Result
                    </p>
                    <div className="flex items-center gap-1">
                      {vehicleCheck.lastMOT.result === 'pass' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-500 text-sm">Pass</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-500 text-sm">Fail</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advisories */}
            {vehicleCheck.advisories && vehicleCheck.advisories.length > 0 && (
              <div className="space-y-2">
                <h4 className={`font-medium flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Info className="w-4 h-4" />
                  Advisories ({vehicleCheck.advisories.length})
                </h4>
                <div className="space-y-1">
                  {vehicleCheck.advisories.slice(0, 3).map((advisory, index) => (
                    <p key={index} className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      • {advisory}
                    </p>
                  ))}
                  {vehicleCheck.advisories.length > 3 && (
                    <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                      +{vehicleCheck.advisories.length - 3} more advisories
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recalls */}
            {vehicleCheck.recalls && vehicleCheck.recalls.length > 0 && (
              <div className="space-y-2">
                <h4 className={`font-medium flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Recalls ({vehicleCheck.recalls.length})
                </h4>
                <div className="space-y-1">
                  {vehicleCheck.recalls.map((recall, index) => (
                    <p key={index} className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                      • {recall}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Taxonomy Flow - Show Data Limitations Notice */}
      {flowType === 'taxonomy' && (
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Info className="w-5 h-5" />
              Data Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <Info className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    Taxonomy Analysis
                  </h4>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    This analysis is based on derivative specifications only. Vehicle history, 
                    security checks, and images require a registration number.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Technical specifications available
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Market valuations available
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-gray-400" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Vehicle history not available
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-gray-400" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Security checks not available
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
