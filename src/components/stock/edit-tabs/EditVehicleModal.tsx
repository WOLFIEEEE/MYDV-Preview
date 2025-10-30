"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, RotateCcw, CheckCircle, AlertCircle, X } from "lucide-react";
import { updateVehicleDetails, getAdvertiserId, showNotification, type VehicleUpdateData } from "@/lib/stockEditingApi";

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockData: any;
  stockId?: string;
  onSave?: (data: any) => void;
}

export default function EditVehicleModal({ isOpen, onClose, stockData, stockId, onSave }: EditVehicleModalProps) {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;
  const [formData, setFormData] = useState({
    registration: '',
    make: '',
    model: '',
    bodyType: '',
    colour: '',
    plate: '',
    yearOfRegistration: '',
    odometerReadingMiles: '',
    fuelType: '',
    transmission: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Populate form data from stock data
  useEffect(() => {
    if (stockData?.vehicle) {
      const vehicle = stockData.vehicle;
      setFormData({
        registration: vehicle.registration || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        bodyType: vehicle.bodyType || '',
        colour: vehicle.colour || '',
        plate: vehicle.plate || '',
        yearOfRegistration: vehicle.yearOfManufacture || vehicle.yearOfRegistration || '',
        odometerReadingMiles: vehicle.odometerReadingMiles || '',
        fuelType: vehicle.fuelType || '',
        transmission: vehicle.transmissionType || vehicle.transmission || '',
      });
    }
  }, [stockData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    setSaveMessage('Saving vehicle details...');
    setIsLoading(true);
    
    try {
      // Prepare the update data
      const updateData: VehicleUpdateData = {
        vehicle: {
          registration: formData.registration,
          colour: formData.colour,
          odometerReadingMiles: formData.odometerReadingMiles ? parseInt(formData.odometerReadingMiles) : undefined,
          plate: formData.plate,
          yearOfRegistration: formData.yearOfRegistration,
        }
      };

      // Remove empty/undefined values
      if (updateData.vehicle) {
        Object.keys(updateData.vehicle).forEach(key => {
          if (updateData.vehicle![key as keyof typeof updateData.vehicle] === '' || 
              updateData.vehicle![key as keyof typeof updateData.vehicle] === undefined) {
            delete updateData.vehicle![key as keyof typeof updateData.vehicle];
          }
        });
      }

      const result = await updateVehicleDetails(stockId, advertiserId, updateData);
      
      if (result.success) {
        setSaveStatus('success');
        setSaveMessage(result.message || 'Vehicle details updated successfully!');
        showNotification(result.message || 'Vehicle details updated successfully!', 'success');
        
        if (onSave) {
          onSave(formData);
        }

        // Close modal after successful save
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setSaveStatus('error');
        setSaveMessage(result.message || 'Failed to update vehicle details');
        showNotification(result.message || 'Failed to update vehicle details', 'error');
      }
    } catch (error) {
      console.error('Error updating vehicle details:', error);
      setSaveStatus('error');
      setSaveMessage('An unexpected error occurred. Please try again.');
      showNotification('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsLoading(false);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 5000);
    }
  };

  const FormField = ({ 
    label, 
    field, 
    type = "text", 
    readonly = false, 
    placeholder = "" 
  }: {
    label: string;
    field: string;
    type?: string;
    readonly?: boolean;
    placeholder?: string;
  }) => (
    <div className="cam-form-group">
      <label htmlFor={field} className={`block text-sm font-medium mb-2 ${
        isDarkMode ? 'text-white' : 'text-gray-700'
      }`}>
        {label}
      </label>
      <input
        type={type}
        id={field}
        value={formData[field as keyof typeof formData]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        readOnly={readonly}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md transition-colors duration-200 ${
          readonly
            ? isDarkMode
              ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
            : isDarkMode
            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`}
      />
      {readonly && (
        <span className={`text-xs mt-1 ${
          isDarkMode ? 'text-white' : 'text-gray-500'
        }`}>
          Read Only
        </span>
      )}
      {!readonly && (
        <span className={`text-xs mt-1 ${
          isDarkMode ? 'text-green-400' : 'text-green-600'
        }`}>
          Editable
        </span>
      )}
    </div>
  );

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
              Edit Vehicle Details
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
              Update vehicle information for Stock ID: {stockId?.slice(-8)}
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
          <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Details Section */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Vehicle Details
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Registration */}
              <div className="cam-form-group">
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Registration
                </label>
                
                {/* Editable License Plate */}
                <div 
                  style={{ 
                    position: 'relative',
                    width: '224px',
                    height: '56px',
                    marginLeft: '-10px'
                  }}
                >
                  <img
                    src="/Vehicle Registration.jpeg"
                    alt="UK License Plate"
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      width: '224px',
                      height: '56px',
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                  />
                  <input
                    type="text"
                    value={formData.registration}
                    onChange={(e) => handleInputChange('registration', e.target.value.toUpperCase())}
                    placeholder="ENTER REG"
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      zIndex: 10,
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      color: 'black',
                      fontSize: '18px',
                      textAlign: 'center',
                      letterSpacing: '0.1em',
                      width: '224px',
                      height: '56px',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                </div>
                <span className={`text-xs mt-2 block ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                  Click on the plate to edit
                </span>
              </div>
              
              <FormField
                label="Make"
                field="make"
                readonly={true}
              />
              
              <FormField
                label="Model"
                field="model"
                readonly={true}
              />
              
              <FormField
                label="Body Type"
                field="bodyType"
                readonly={true}
              />
              
              <FormField
                label="Colour"
                field="colour"
                placeholder="Enter colour"
              />
              
              <FormField
                label="Plate"
                field="plate"
                readonly={true}
              />
              
              <FormField
                label="Year of Registration"
                field="yearOfRegistration"
                type="number"
                readonly={true}
              />
              
              <FormField
                label="Mileage (miles)"
                field="odometerReadingMiles"
                type="number"
                placeholder="Enter mileage"
              />
              
              <FormField
                label="Fuel Type"
                field="fuelType"
                readonly={true}
              />
              
              <FormField
                label="Transmission"
                field="transmission"
                readonly={true}
              />
            </div>
          </Card>
        </div>

        {/* Valuation Results Section (Placeholder) */}
        <div className="space-y-6">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Vehicle Valuation
          </h3>
          
          <Card className={`p-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-center py-8 ${
              isDarkMode ? 'text-white' : 'text-gray-500'
            }`}>
              <p>Valuation data will be populated here via JavaScript</p>
            </div>
          </Card>
        </div>

        {/* Status Message */}
        {saveStatus !== 'idle' && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            saveStatus === 'success' 
              ? isDarkMode ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200'
              : saveStatus === 'error'
              ? isDarkMode ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'
              : isDarkMode ? 'bg-blue-900/20 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {saveStatus === 'success' && <CheckCircle className="h-4 w-4" />}
            {saveStatus === 'error' && <AlertCircle className="h-4 w-4" />}
            {saveStatus === 'saving' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>}
            <span>{saveMessage}</span>
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
            disabled={isLoading || saveStatus === 'saving'}
            className={`flex items-center gap-2 ${
              saveStatus === 'success' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved Successfully
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Update Vehicle Details
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Reset form to original data
              if (stockData?.vehicle) {
                const vehicle = stockData.vehicle;
                setFormData({
                  registration: vehicle.registration || '',
                  make: vehicle.make || '',
                  model: vehicle.model || '',
                  bodyType: vehicle.bodyType || '',
                  colour: vehicle.colour || '',
                  plate: vehicle.plate || '',
                  yearOfRegistration: vehicle.yearOfManufacture || vehicle.yearOfRegistration || '',
                  odometerReadingMiles: vehicle.odometerReadingMiles || '',
                  fuelType: vehicle.fuelType || '',
                  transmission: vehicle.transmissionType || vehicle.transmission || '',
                });
              }
            }}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
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