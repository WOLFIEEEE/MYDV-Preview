import React, { useEffect, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function ChecklistValidation({ formData, updateFormData, errors }: Props) {
  const { isDarkMode } = useTheme()
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false)
  
  // Save checklist data to database
  const saveChecklistData = async (updatedData: Partial<FormData>) => {
    if (!formData.stockId) {
      console.log('❌ [CHECKLIST SAVE] No stockId available, skipping save')
      return
    }

    try {
      console.log('💾 [CHECKLIST SAVE] Saving checklist data for stockId:', formData.stockId)
      
      const checklistData = {
        stockId: formData.stockId,
        numberOfKeys: updatedData.numberOfKeys || formData.numberOfKeys || '',
        userManual: updatedData.userManual || formData.userManual || '',
        serviceBook: updatedData.serviceHistoryRecord || formData.serviceHistoryRecord || '', // Maps to serviceBook field
        wheelLockingNut: updatedData.wheelLockingNut || formData.wheelLockingNut || '',
        cambeltChainConfirmation: updatedData.cambeltChainConfirmation || formData.cambeltChainConfirmation || '',
        metadata: {
          mileage: updatedData.mileage || formData.mileage || '',
          fuelType: formData.fuelTypeChecklist || '', // This comes from stock data
          // Note: dealerPreSaleCheck and vehicleInspectionTestDrive are invoice-specific
          // and should not be saved in the vehicle checklist
        }
      }

      const response = await fetch('/api/stock-actions/vehicle-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checklistData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ [CHECKLIST SAVE] Checklist data saved successfully:', result)
      } else {
        const error = await response.json()
        console.error('❌ [CHECKLIST SAVE] Failed to save checklist data:', error)
      }
    } catch (error) {
      console.error('❌ [CHECKLIST SAVE] Error saving checklist data:', error)
    }
  }
  
  const handleInputChange = (field: keyof FormData, value: any) => {
    console.log(`🔄 [CHECKLIST] Field changed: ${field} = ${value}`)
    const updates = { [field]: value }
    updateFormData(updates)
    
    // Save checklist data to database when changes are made (debounced)
    setTimeout(() => {
      saveChecklistData(updates)
    }, 500) // 500ms debounce to avoid too many API calls
  }

  // Pre-populate checklist data from database when component mounts
  useEffect(() => {
    const loadChecklistData = async () => {
      console.log('🔍 [CHECKLIST DEBUG] Starting loadChecklistData...')
      console.log('🔍 [CHECKLIST DEBUG] formData.stockId:', formData.stockId)
      console.log('🔍 [CHECKLIST DEBUG] formData.mileage:', formData.mileage)
      console.log('🔍 [CHECKLIST DEBUG] Full formData:', formData)
      
      // Only load if we have a stock ID and haven't already populated the data
      if (!formData.stockId) {
        console.log('❌ [CHECKLIST DEBUG] No stockId found, skipping checklist load')
        return
      }
      
      // Check if checklist fields are already populated (skip if most fields are filled)
      // Note: fuelTypeChecklist is excluded as it's always populated from stock data
      const checklistFieldsPopulated = [
        formData.numberOfKeys,
        formData.userManual,
        formData.serviceHistoryRecord,
        formData.wheelLockingNut,
        formData.cambeltChainConfirmation
      ].filter(field => field && field.trim() !== '').length
      
      if (checklistFieldsPopulated >= 3) {
        console.log('❌ [CHECKLIST DEBUG] Checklist fields already populated, skipping checklist load. Populated fields:', checklistFieldsPopulated)
        return
      }
      
      console.log('✅ [CHECKLIST DEBUG] Conditions met, loading checklist data...')
      setIsLoadingChecklist(true)
      
      try {
        const apiUrl = `/api/stock-actions/vehicle-checklist?stockId=${formData.stockId}`
        console.log('🔍 [CHECKLIST DEBUG] Fetching from:', apiUrl)
        
        const response = await fetch(apiUrl)
        console.log('🔍 [CHECKLIST DEBUG] Response status:', response.status)
        console.log('🔍 [CHECKLIST DEBUG] Response ok:', response.ok)
        
        if (response.ok) {
          const result = await response.json()
          console.log('🔍 [CHECKLIST DEBUG] API Response:', result)
          
          if (result.success && result.data) {
            const checklistData = result.data
            console.log('🔍 [CHECKLIST DEBUG] Checklist data found:', checklistData)
            
            // Pre-populate form fields with checklist data
            const updates: Partial<FormData> = {}
            
            // Map database fields to form fields
            if (checklistData.numberOfKeys) {
              updates.numberOfKeys = checklistData.numberOfKeys
              console.log('🔍 [CHECKLIST DEBUG] Mapping numberOfKeys:', checklistData.numberOfKeys)
            }
            if (checklistData.userManual) {
              updates.userManual = checklistData.userManual
              console.log('🔍 [CHECKLIST DEBUG] Mapping userManual:', checklistData.userManual)
            }
            if (checklistData.serviceBook) {
              updates.serviceHistoryRecord = checklistData.serviceBook
              console.log('🔍 [CHECKLIST DEBUG] Mapping serviceBook to serviceHistoryRecord (text field):', checklistData.serviceBook)
            }
            if (checklistData.wheelLockingNut) {
              updates.wheelLockingNut = checklistData.wheelLockingNut
              console.log('🔍 [CHECKLIST DEBUG] Mapping wheelLockingNut:', checklistData.wheelLockingNut)
            }
            if (checklistData.cambeltChainConfirmation) {
              updates.cambeltChainConfirmation = checklistData.cambeltChainConfirmation
              console.log('🔍 [CHECKLIST DEBUG] Mapping cambeltChainConfirmation:', checklistData.cambeltChainConfirmation)
            }
            
            // Map metadata fields
            if (checklistData.metadata) {
              const metadata = checklistData.metadata as any
              console.log('🔍 [CHECKLIST DEBUG] Metadata found:', metadata)
              
              // Note: dealerPreSaleCheck and vehicleInspectionTestDrive are NOT auto-populated
              // These should be manually set by the user for each invoice
              if (metadata.dealerPreSaleCheck) {
                console.log('🔍 [CHECKLIST DEBUG] Found metadata.dealerPreSaleCheck but skipping auto-population:', metadata.dealerPreSaleCheck)
              }
              if (metadata.vehicleInspectionTestDrive) {
                console.log('🔍 [CHECKLIST DEBUG] Found metadata.vehicleInspectionTestDrive but skipping auto-population:', metadata.vehicleInspectionTestDrive)
              }
              // Note: fuelType is populated from stock data, not checklist metadata
              if (metadata.fuelType) {
                console.log('🔍 [CHECKLIST DEBUG] Found metadata.fuelType but skipping (using stock data instead):', metadata.fuelType)
              }
              if (metadata.mileage) {
                updates.mileage = parseInt(metadata.mileage) || 0
                console.log('🔍 [CHECKLIST DEBUG] Mapping metadata.mileage:', metadata.mileage, '→', updates.mileage)
              }
            } else {
              console.log('⚠️ [CHECKLIST DEBUG] No metadata found in checklist data')
            }
            
            console.log('🔍 [CHECKLIST DEBUG] Final updates object:', updates)
            
            // Update form data with pre-populated values
            if (Object.keys(updates).length > 0) {
              console.log('✅ [CHECKLIST DEBUG] Updating form data with', Object.keys(updates).length, 'fields')
              updateFormData(updates)
            } else {
              console.log('⚠️ [CHECKLIST DEBUG] No updates to apply - all fields were empty')
            }
          } else {
            console.log('⚠️ [CHECKLIST DEBUG] API response missing success/data:', result)
          }
        } else {
          const errorText = await response.text()
          console.log('❌ [CHECKLIST DEBUG] API request failed:', response.status, errorText)
        }
      } catch (error) {
        console.error('❌ [CHECKLIST DEBUG] Error loading checklist data:', error)
      } finally {
        setIsLoadingChecklist(false)
        console.log('🔍 [CHECKLIST DEBUG] Loading complete')
      }
    }

    loadChecklistData()
  }, [formData.stockId, formData.numberOfKeys, formData.userManual, formData.serviceHistoryRecord, updateFormData])

  // If this is a Trade sale, show a message explaining that checklist is not required
  if (formData.saleType === 'Trade') {
    return (
      <div className="space-y-6">
        <div className={`rounded-lg p-6 border-2 ${
          isDarkMode 
            ? 'bg-yellow-900/20 border-yellow-700/50' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className={`h-6 w-6 ${
                isDarkMode ? 'text-yellow-400' : 'text-yellow-500'
              }`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-medium ${
                isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
              }`}>
                Checklist Not Required for Trade Sales
              </h3>
              <div className={`mt-2 text-sm ${
                isDarkMode ? 'text-yellow-200' : 'text-yellow-700'
              }`}>
                <p className="mb-3">
                  Vehicle checklist validation is not required for Trade sales. Trade sales are sold &quot;as seen&quot; 
                  with all faults and do not require detailed vehicle inspection documentation.
                </p>
                <p>
                  The final invoice will include a Trade Sale Disclaimer instead of the vehicle checklist.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-lg p-4 border-2 ${
        isDarkMode 
          ? 'bg-green-900/20 border-green-700/50' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              isDarkMode ? 'text-green-400' : 'text-green-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              isDarkMode ? 'text-green-300' : 'text-green-800'
            }`}>
              Final Checklist Validation
            </h3>
            <div className={`mt-2 text-sm ${
              isDarkMode ? 'text-green-200' : 'text-green-700'
            }`}>
              <p>
                Complete this final checklist to ensure all vehicle and sale information is accurate before submission.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoadingChecklist && (
        <div className={`rounded-lg p-4 border-2 ${
          isDarkMode 
            ? 'bg-blue-900/20 border-blue-700/50' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <div className="ml-3">
              <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                Loading checklist data from database...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Information Validation */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Vehicle Information Validation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mileage - input_101 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Mileage
            </label>
            <input
              type="number"
              value={formData.mileage || ''}
              onChange={(e) => handleInputChange('mileage', parseInt(e.target.value) || 0)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Cam Stock Data
            </p>
          </div>

          {/* Cambelt / Chain Confirmation - input_105 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Cambelt / Chain Confirmation
            </label>
            <select
              value={formData.cambeltChainConfirmation}
              onChange={(e) => handleInputChange('cambeltChainConfirmation', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            >
              <option value="">-</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Checklist Data
            </p>
          </div>

          {/* Fuel Type - input_103 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Fuel Type
            </label>
            <input
              type="text"
              value={formData.fuelTypeChecklist || 'Not specified'}
              onChange={() => {}} // Read-only - populated from stock data
              disabled={true}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800/50 text-slate-300 cursor-not-allowed' 
                  : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
              }`}
            />
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              From stock data (read-only)
            </p>
          </div>

          {/* Number of Keys - input_104 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Number of Keys
            </label>
            <input
              type="number"
              value={formData.numberOfKeys}
              onChange={(e) => handleInputChange('numberOfKeys', e.target.value)}
              placeholder="Enter number of keys"
              min="0"
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Checklist Data
            </p>
          </div>
        </div>
      </div>

      {/* Service and Documentation */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Service and Documentation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Service History Record - input_106 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Service History Record
            </label>
            <input
              type="text"
              value={formData.serviceHistoryRecord}
              onChange={(e) => handleInputChange('serviceHistoryRecord', e.target.value)}
              placeholder="Enter service history details..."
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Service book/maintenance record details (maps to serviceBook field)
            </p>
          </div>

          {/* User Manual - input_107 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              User Manual
            </label>
            <select
              value={formData.userManual}
              onChange={(e) => handleInputChange('userManual', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            >
              <option value="">-</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Digital">Digital</option>
            </select>
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Owner's manual availability
            </p>
          </div>
        </div>

      </div>

      {/* Vehicle Components and Checks */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Vehicle Components and Checks
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Wheel Locking Nut - input_109 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Wheel Locking Nut
            </label>
            <select
              value={formData.wheelLockingNut}
              onChange={(e) => handleInputChange('wheelLockingNut', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            >
              <option value="">-</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Wheel locking nut key availability
            </p>
          </div>

          {/* Dealer Pre-Sale Full Vehicle Health Check - input_110 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Dealer Pre-Sale Full Vehicle Health Check
            </label>
            <select
              value={formData.dealerPreSaleCheck}
              onChange={(e) => handleInputChange('dealerPreSaleCheck', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            >
              <option value="">-</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Pre-sale inspection status
            </p>
          </div>
        </div>

        {/* Vehicle Inspection / Test drive - input_111 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Vehicle Inspection / Test drive
          </label>
          <select
            value={formData.vehicleInspectionTestDrive}
            onChange={(e) => handleInputChange('vehicleInspectionTestDrive', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          >
            <option value="">-</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            Customer inspection and test drive status
          </p>
        </div>
      </div>

      {/* Checklist Summary */}
      <div className={`rounded-lg p-4 border-2 ${
        isDarkMode 
          ? 'bg-slate-800/50 border-slate-600' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`text-sm font-medium mb-3 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Checklist Completion Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Vehicle Information:
            </h4>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Mileage:</span>
              <span className={formData.mileage ? 'text-green-500' : 'text-red-500'}>
                {formData.mileage ? '✓ Complete' : '✗ Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Cambelt/Chain:</span>
              <span className={formData.cambeltChainConfirmation ? 'text-green-500' : 'text-red-500'}>
                {formData.cambeltChainConfirmation ? '✓ Complete' : '✗ Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Number of Keys:</span>
              <span className={formData.numberOfKeys ? 'text-green-500' : 'text-red-500'}>
                {formData.numberOfKeys ? '✓ Complete' : '✗ Pending'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Documentation & Checks:
            </h4>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>User Manual:</span>
              <span className={formData.userManual ? 'text-green-500' : 'text-red-500'}>
                {formData.userManual ? '✓ Complete' : '✗ Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Pre-Sale Check:</span>
              <span className={formData.dealerPreSaleCheck ? 'text-green-500' : 'text-red-500'}>
                {formData.dealerPreSaleCheck ? '✓ Complete' : '✗ Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Test Drive:</span>
              <span className={formData.vehicleInspectionTestDrive ? 'text-green-500' : 'text-red-500'}>
                {formData.vehicleInspectionTestDrive ? '✓ Complete' : '✗ Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Final Validation Notice */}
      <div className={`rounded-lg p-4 border-2 ${
        isDarkMode 
          ? 'bg-blue-900/20 border-blue-700/50' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              isDarkMode ? 'text-blue-300' : 'text-blue-800'
            }`}>
              Ready for Submission
            </h3>
            <div className={`mt-2 text-sm ${
              isDarkMode ? 'text-blue-200' : 'text-blue-700'
            }`}>
              <p>
                Please review all information entered throughout this form before submitting. 
                Once submitted, this invoice will be processed and may require additional approval for modifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}