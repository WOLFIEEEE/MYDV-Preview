"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Calendar, User, FileText, Search, AlertTriangle, Shield, Info } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import LicensePlate from "@/components/ui/license-plate";

interface VehicleDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  dataType: 'keeperChanges' | 'v5cs' | 'previousSearches' | 'financeAgreements' | 'plateChanges' | 'colourChanges' | 'odometerReadings' | 'highRiskMarkers' | 'insuranceHistory';
}

export default function VehicleDetailsDialog({ 
  isOpen, 
  onClose, 
  title, 
  data, 
  dataType 
}: VehicleDetailsDialogProps) {
  const { isDarkMode } = useTheme();

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key to close dialog
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (dataType) {
      case 'keeperChanges': return User;
      case 'v5cs': return FileText;
      case 'previousSearches': return Search;
      case 'financeAgreements': return AlertTriangle;
      case 'plateChanges': return Info;
      case 'colourChanges': return Info;
      case 'odometerReadings': return Info;
      case 'highRiskMarkers': return Shield;
      case 'insuranceHistory': return AlertTriangle;
      default: return Info;
    }
  };

  const Icon = getIcon();

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not available';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const renderKeeperChanges = () => (
    <div className="space-y-4">
      {data.map((change, index) => (
        <Card key={index} className={`${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Date of Change</label>
                <p className="font-semibold">{formatDate(change.date)}</p>
              </div>
              {change.keeperType && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Keeper Type</label>
                  <p className="font-semibold">{change.keeperType}</p>
                </div>
              )}
              {change.previousKeeper && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Previous Keeper</label>
                  <p className="font-semibold">{change.previousKeeper}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderV5Cs = () => (
    <div className="space-y-4">
      {data.map((v5c, index) => (
        <Card key={index} className={`${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Issue Date</label>
                <p className="font-semibold">{formatDate(v5c.issuedDate)}</p>
              </div>
              {v5c.documentType && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Document Type</label>
                  <p className="font-semibold">{v5c.documentType}</p>
                </div>
              )}
              {v5c.reason && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Reason</label>
                  <p className="font-semibold">{v5c.reason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPreviousSearches = () => (
    <div className="space-y-4">
      {data.map((search, index) => (
        <Card key={index} className={`${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Search Date</label>
                <p className="font-semibold">{formatDate(search.performed)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Business Type</label>
                <p className="font-semibold">{search.typeOfBusiness || 'Not specified'}</p>
              </div>
              {search.searchType && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Search Type</label>
                  <p className="font-semibold">{search.searchType}</p>
                </div>
              )}
              {search.company && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Company</label>
                  <p className="font-semibold">{search.company}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderFinanceAgreements = () => (
    <div className="space-y-4">
      {data.map((agreement, index) => (
        <Card key={index} className={`${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              {agreement.agreementId && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Agreement ID</label>
                  <p className="font-semibold font-mono text-sm">{agreement.agreementId}</p>
                </div>
              )}
              {agreement.company && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Finance Company</label>
                  <p className="font-semibold">{agreement.company}</p>
                </div>
              )}
              {agreement.type && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Agreement Type</label>
                  <p className="font-semibold">{agreement.type}</p>
                </div>
              )}
              {agreement.startDate && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Start Date</label>
                  <p className="font-semibold">{formatDate(agreement.startDate)}</p>
                </div>
              )}
              {agreement.term && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Term</label>
                  <p className="font-semibold">{agreement.term}</p>
                </div>
              )}
              {agreement.contact && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Contact</label>
                  <p className="font-semibold">{agreement.contact}</p>
                </div>
              )}
              {agreement.telephoneNumber && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Contact Number</label>
                  <p className="font-semibold">{agreement.telephoneNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPlateChanges = () => (
    <div className="space-y-4">
      {data.map((change, index) => (
        <Card key={index} className={`${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Change Date</label>
                <p className="font-semibold">{formatDate(change.date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Current Registration</label>
                <div className="mt-1">
                  <LicensePlate 
                    registration={change.currentRegistration} 
                    size="sm" 
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-white">Previous Registration</label>
                <div className="mt-1">
                  <LicensePlate 
                    registration={change.previousRegistration} 
                    size="sm" 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderColourChanges = () => (
    <div className="space-y-4">
      {data.map((change, index) => (
        <Card key={index} className={`${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Change Date</label>
                <p className="font-semibold">{formatDate(change.date || change.startDate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Current Colour</label>
                <p className="font-semibold">{change.currentColour || 'Not specified'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-white">Previous Colour</label>
                <p className="font-semibold">{change.previousColour || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderOdometerReadings = () => (
    <div className="space-y-4">
      {data.map((reading, index) => (
        <Card key={index} className={`${
          isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Reading Date</label>
                <p className="font-semibold">{formatDate(reading.performed)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Mileage</label>
                <p className="font-semibold">{reading.odometerReadingMiles?.toLocaleString()} miles</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Source</label>
                <p className="font-semibold">{reading.source}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderHighRiskMarkers = () => (
    <div className="space-y-4">
      {data.map((marker, index) => (
        <Card key={index} className={`border-orange-200 ${
          isDarkMode ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              {marker.startDate && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Start Date</label>
                  <p className="font-semibold">{formatDate(marker.startDate)}</p>
                </div>
              )}
              {marker.type && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Marker Type</label>
                  <p className="font-semibold text-orange-700 dark:text-orange-300">{marker.type}</p>
                </div>
              )}
              {marker.company && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Company</label>
                  <p className="font-semibold">{marker.company}</p>
                </div>
              )}
              {marker.telephoneNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Contact Number</label>
                  <p className="font-semibold">{marker.telephoneNumber}</p>
                </div>
              )}
              {marker.reference && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Reference</label>
                  <p className="font-semibold font-mono text-sm">{marker.reference}</p>
                </div>
              )}
              {marker.extraInfo && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Additional Information</label>
                  <p className="font-semibold">{marker.extraInfo}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderInsuranceHistory = () => (
    <div className="space-y-4">
      {data.map((claim, index) => (
        <Card key={index} className={`border-red-200 ${
          isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
        }`}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Claim Type</label>
                <p className="font-semibold text-red-700 dark:text-red-300">{claim.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-white">Loss Date</label>
                <p className="font-semibold">{formatDate(claim.lossDate)}</p>
              </div>
              {claim.removedDate && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-white">Removed Date</label>
                  <p className="font-semibold">{formatDate(claim.removedDate)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderContent = () => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            No data available
          </p>
        </div>
      );
    }

    switch (dataType) {
      case 'keeperChanges': return renderKeeperChanges();
      case 'v5cs': return renderV5Cs();
      case 'previousSearches': return renderPreviousSearches();
      case 'financeAgreements': return renderFinanceAgreements();
      case 'plateChanges': return renderPlateChanges();
      case 'colourChanges': return renderColourChanges();
      case 'odometerReadings': return renderOdometerReadings();
      case 'highRiskMarkers': return renderHighRiskMarkers();
      case 'insuranceHistory': return renderInsuranceHistory();
      default: return (
        <div className="text-center py-8">
          <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Data type not supported
          </p>
        </div>
      );
    }
  };

  // Use portal to render outside the normal DOM tree
  const dialogContent = (
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl ${
          isDarkMode ? 'bg-slate-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
              }`}>
                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className={`text-xl ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {title}
                </CardTitle>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  {data?.length || 0} record{(data?.length || 0) !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-6">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render using portal to ensure it's on top
  return typeof window !== 'undefined' ? createPortal(dialogContent, document.body) : null;
}
