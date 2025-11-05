"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { updateStockAdverts, getAdvertiserId, showNotification, type AdvertsUpdateData } from "@/lib/stockEditingApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, AlertTriangle, X } from "lucide-react";

interface EditListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockData: any;
  stockId?: string;
  onSave?: (data: any) => void;
}

const statusDescriptions = {
  'DUE_IN': 'A vehicle purchased and due to be added to physical stock.',
  'FORECOURT': 'An active or Live advert.',
  'SALE_IN_PROGRESS': 'Deposit has been taken to start the Sale process',
  'ARCHIVED': 'An inactive listing. Vehicles in stock but not listed in an active/live advert',
  'WASTEBIN': 'Vehicles removed from stock',
  'SOLD': 'A vehicle that has been sold and is no longer available for listing.'
};

export default function EditListingModal({ isOpen, onClose, stockData, stockId, onSave }: EditListingModalProps) {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    lifecycleState: 'FORECOURT',
    forecourtPrice: '',
    forecourtPriceVatStatus: 'No VAT', // Default to No VAT when not defined
    reservationStatus: '',
    attentionGrabber: '',
    description: '',
    description2: '',
    autotraderAdvert: 'NOT_PUBLISHED',
    advertiserAdvert: 'NOT_PUBLISHED',
    locatorAdvert: 'NOT_PUBLISHED',
    exportAdvert: 'NOT_PUBLISHED',
    profileAdvert: 'NOT_PUBLISHED',
    displayOptions: {
      excludePreviousOwners: false,
      excludeStrapline: false,
      excludeMot: false,
      excludeWarranty: false,
      excludeInteriorDetails: false,
      excludeTyreCondition: false,
      excludeBodyCondition: false,
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Populate form data from stock data
  useEffect(() => {
    if (stockData) {
      const metadata = stockData.metadata || {};
      const adverts = stockData.adverts?.retailAdverts || {};
      const price = adverts.forecourtPrice || stockData.price || {};
      
      setFormData(prev => ({
        ...prev,
        lifecycleState: metadata.lifecycleState || 'FORECOURT',
        forecourtPrice: stockData.adverts?.forecourtPrice?.amountGBP?.toString() || '',
        forecourtPriceVatStatus: stockData.adverts?.forecourtPriceVatStatus || 'No VAT',
        reservationStatus: stockData.adverts?.reservationStatus || '',
        attentionGrabber: adverts.attentionGrabber || '',
        description: adverts.description || '',
        description2: adverts.description2 || '',
        autotraderAdvert: adverts.autotraderAdvert?.status || 'NOT_PUBLISHED',
        advertiserAdvert: adverts.advertiserAdvert?.status || 'NOT_PUBLISHED',
        locatorAdvert: adverts.locatorAdvert?.status || 'NOT_PUBLISHED',
        exportAdvert: adverts.exportAdvert?.status || 'NOT_PUBLISHED',
        profileAdvert: adverts.profileAdvert?.status || 'NOT_PUBLISHED',
      }));
    }
  }, [stockData]);

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('displayOptions.')) {
      const optionField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        displayOptions: {
          ...prev.displayOptions,
          [optionField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveStatus('saving');

    try {
      console.log('Updating adverts:', formData);
      
      if (!stockId) {
        setSaveStatus('error');
        setSaveMessage('Stock ID is required');
        return;
      }

      const advertiserId = getAdvertiserId(stockData);
      if (!advertiserId) {
        setSaveStatus('error');
        setSaveMessage('Advertiser ID is required');
        return;
      }

      setSaveStatus('saving');
      setSaveMessage('Saving advert details...');
      
      // Prepare the API payload using the correct structure for adverts endpoint
      const updateData: AdvertsUpdateData = {
        metadata: {
          lifecycleState: formData.lifecycleState
        },
        adverts: {
          // Main advert fields
          ...(formData.forecourtPrice && {
            forecourtPrice: {
              amountGBP: parseFloat(formData.forecourtPrice)
            }
          }),
          forecourtPriceVatStatus: formData.forecourtPriceVatStatus,
          attentionGrabber: formData.attentionGrabber,
          reservationStatus: formData.reservationStatus,
          
          retailAdverts: {
            description: formData.description,
            description2: formData.description2,
            ...(formData.forecourtPrice && {
              suppliedPrice: {
                amountGBP: parseFloat(formData.forecourtPrice)
              }
            }),
            vatStatus: formData.forecourtPriceVatStatus,
            attentionGrabber: formData.attentionGrabber,
            displayOptions: {
              excludePreviousOwners: formData.displayOptions.excludePreviousOwners,
              excludeStrapline: formData.displayOptions.excludeStrapline,
              excludeMot: formData.displayOptions.excludeMot,
              excludeWarranty: formData.displayOptions.excludeWarranty,
              excludeInteriorDetails: formData.displayOptions.excludeInteriorDetails,
              excludeTyreCondition: formData.displayOptions.excludeTyreCondition,
              excludeBodyCondition: formData.displayOptions.excludeBodyCondition
            },
            // Channel statuses - if SOLD or DELETED, force NOT_PUBLISHED, otherwise use form values
            autotraderAdvert: { 
              status: (formData.lifecycleState === 'SOLD' || formData.lifecycleState === 'DELETED') 
                ? 'NOT_PUBLISHED' 
                : formData.autotraderAdvert 
            },
            advertiserAdvert: { 
              status: (formData.lifecycleState === 'SOLD' || formData.lifecycleState === 'DELETED') 
                ? 'NOT_PUBLISHED' 
                : formData.advertiserAdvert 
            },
            locatorAdvert: { 
              status: (formData.lifecycleState === 'SOLD' || formData.lifecycleState === 'DELETED') 
                ? 'NOT_PUBLISHED' 
                : formData.locatorAdvert 
            },
            exportAdvert: { 
              status: (formData.lifecycleState === 'SOLD' || formData.lifecycleState === 'DELETED') 
                ? 'NOT_PUBLISHED' 
                : formData.exportAdvert 
            },
            profileAdvert: { 
              status: (formData.lifecycleState === 'SOLD' || formData.lifecycleState === 'DELETED') 
                ? 'NOT_PUBLISHED' 
                : formData.profileAdvert 
            }
          }
        }
      };

      console.log('📡 Calling updateStockAdverts with payload:', JSON.stringify(updateData, null, 2));
      console.log('📊 Current stock data for comparison:', {
        currentLifecycleState: stockData?.metadata?.lifecycleState,
        currentForecourtPrice: stockData?.adverts?.forecourtPrice?.amountGBP,
        currentVatStatus: stockData?.adverts?.forecourtPriceVatStatus,
        currentAttentionGrabber: stockData?.adverts?.retailAdverts?.attentionGrabber,
        currentDescription: stockData?.adverts?.retailAdverts?.description
      });

      const result = await updateStockAdverts(stockId, advertiserId, updateData);
      
      if (result.success) {
        setSaveStatus('success');
        setSaveMessage(result.message || 'Advert details updated successfully!');
        showNotification(result.message || 'Advert details updated successfully!', 'success');
        
        if (onSave) {
          onSave(formData);
        }

        // Close modal after successful save
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // Handle "No changes detected" as a special case
        if (result.message === 'No changes detected') {
          setSaveStatus('success');
          setSaveMessage('No changes were needed - all values are already up to date!');
          showNotification('No changes were needed - all values are already up to date!', 'info');
        } else {
          setSaveStatus('error');
          setSaveMessage(result.message || 'Failed to update advert details');
          showNotification(result.message || 'Failed to update advert details', 'error');
        }
      }
    } catch (error) {
      console.error('❌ Error updating adverts:', error);
      setSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : 'Failed to update listing details');
    } finally {
      setIsLoading(false);
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    }
  };

  const getStatusDescription = () => {
    const fullStatus = {
      'DUE_IN': 'Purchased – Due In',
      'FORECOURT': 'Listed – Forecourt',
      'SALE_IN_PROGRESS': 'Deposit Taken – Sale in progress',
      'ARCHIVED': 'Archived',
      'WASTEBIN': 'Bin – Wastebin',
      'SOLD': 'Sold'
    }[formData.lifecycleState] || '';
    
    const statusLabel = fullStatus.split('–')[0].trim();
    const description = statusDescriptions[formData.lifecycleState as keyof typeof statusDescriptions] || '';
    
    return `${statusLabel}: ${description}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-2xl shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Edit Listing Details
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              Update advertising and listing information for Stock ID: {stockId?.slice(-8)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">{/* Vehicle Status Section */}
        <div className="space-y-6">
          <div className="space-y-4">
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Vehicle Status
            </label>
            <select
              value={formData.lifecycleState}
              onChange={(e) => handleInputChange('lifecycleState', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            >
              <option value="DUE_IN">Purchased – Due In</option>
              <option value="FORECOURT">Listed – Forecourt</option>
              <option value="SALE_IN_PROGRESS">Deposit Taken – Sale in progress</option>
              <option value="ARCHIVED">Archived</option>
              <option value="WASTEBIN">Bin – Wastebin</option>
              <option value="SOLD">Sold</option>
            </select>

            <div className={`p-3 border-l-4 border-blue-500 rounded ${
              isDarkMode ? 'bg-gray-800' : 'bg-blue-50'
            }`}>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                <strong>{getStatusDescription()}</strong>
              </p>
            </div>

            <div className={`p-3 border-l-4 border-orange-500 rounded ${
              isDarkMode ? 'bg-gray-800' : 'bg-orange-50'
            }`}>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                <strong>Note:</strong> Vehicle Status controls the advert status. Please use the channel selection below to publish the advert on the channels required.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Information Section */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Pricing Information
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Listing Price (£)
                </label>
                <input
                  type="number"
                  value={formData.forecourtPrice}
                  onChange={(e) => handleInputChange('forecourtPrice', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
              </div>
              
              <div className="space-y-4">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  VAT Status
                </label>
                <select
                  value={formData.forecourtPriceVatStatus}
                  onChange={(e) => handleInputChange('forecourtPriceVatStatus', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                >
                  <option value="No VAT">No VAT</option>
                  <option value="Ex VAT">Ex VAT</option>
                  <option value="Inc VAT">Inc VAT</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Reservation Status
              </label>
              <input
                type="text"
                value={formData.reservationStatus}
                onChange={(e) => handleInputChange('reservationStatus', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
              />
            </div>
          </Card>
        </div>

        {/* Listing Content Section */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Listing Content
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Attention Grabber
                </label>
                <input
                  type="text"
                  value={formData.attentionGrabber}
                  onChange={(e) => handleInputChange('attentionGrabber', e.target.value)}
                  maxLength={30}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  <small className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formData.attentionGrabber.length}/30 characters
                  </small>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter vehicle description here..."
                  maxLength={4000}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 resize-vertical ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500'
                  }`}
                />
                <div className="flex justify-between items-center mt-2">
                  <small className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formData.description.length}/4000 characters
                  </small>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Description 2
                </label>
                <textarea
                  value={formData.description2}
                  onChange={(e) => handleInputChange('description2', e.target.value)}
                  placeholder="Enter additional vehicle description here..."
                  maxLength={4000}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 resize-vertical ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500'
                  }`}
                />
                <div className="flex justify-between items-center mt-2">
                  <small className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formData.description2.length}/4000 characters
                  </small>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Listing Status by Channel Section */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Listing Status (By Channel)
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="space-y-6">
              {/* Autotrader */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Autotrader
                </label>
                <select
                  value={formData.autotraderAdvert}
                  onChange={(e) => handleInputChange('autotraderAdvert', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="NOT_PUBLISHED">Not Published</option>
                </select>
                
                <div className={`mt-2 p-3 border border-orange-400 rounded-md flex items-start gap-2 ${
                  isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50'
                }`}>
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className={`text-sm ${
                    isDarkMode ? 'text-orange-300' : 'text-orange-700'
                  }`}>
                    Cannot publish to Autotrader as limit has been reached. Remove existing listings to publish new stock.
                  </p>
                </div>
                
                <p className={`text-xs mt-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-500'
                }`}>
                  Active and searchable on autotrader.co.uk. (if advertising limit is not reached)
                </p>
              </div>

              {/* Retailer Website */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Retailer Website
                </label>
                <select
                  value={formData.advertiserAdvert}
                  onChange={(e) => handleInputChange('advertiserAdvert', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="NOT_PUBLISHED">Not Published</option>
                </select>
                <p className={`text-xs mt-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-500'
                }`}>
                  Advertise on own website.
                </p>
              </div>

              {/* Third Parties */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Third Parties Linked
                </label>
                <select
                  value={formData.exportAdvert}
                  onChange={(e) => handleInputChange('exportAdvert', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="NOT_PUBLISHED">Not Published</option>
                </select>
                <p className={`text-xs mt-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-500'
                }`}>
                  Export from Auto Trader to other 3rd parties.
                </p>
              </div>

              {/* Retailer Store */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Retailer Store
                </label>
                <select
                  value={formData.profileAdvert}
                  onChange={(e) => handleInputChange('profileAdvert', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="NOT_PUBLISHED">Not Published</option>
                </select>
                <p className={`text-xs mt-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-500'
                }`}>
                  Retail Store page on autotrader.co.uk.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Display Options Section */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Display Options
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(formData.displayOptions).map(([key, value]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => handleInputChange(`displayOptions.${key}`, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                  />
                  <span className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/exclude/i, 'Hide')}
                  </span>
                </label>
              ))}
            </div>
            <p className={`text-xs mt-4 ${
              isDarkMode ? 'text-white' : 'text-gray-500'
            }`}>
              These options control what information is displayed in your vehicle listings.
            </p>
          </Card>
        </div>

        {/* Status Message */}
        {saveStatus !== 'idle' && saveMessage && (
          <div className={`p-4 rounded-lg border ${
            saveStatus === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
              : saveStatus === 'error'
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
              : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {saveStatus === 'success' && <span className="text-green-600 dark:text-green-400">✅</span>}
              {saveStatus === 'error' && <span className="text-red-600 dark:text-red-400">❌</span>}
              {saveStatus === 'saving' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              <span className="font-medium">{saveMessage}</span>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Updating...' : 'Update Adverts'}
          </Button>
        </div>
      </form>
        </div>

        {/* Footer */}
        <div className={`flex justify-end p-6 border-t ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="text-xs text-gray-500">
            Stock ID: {stockId}
          </div>
        </div>
      </div>
    </div>
  );
}