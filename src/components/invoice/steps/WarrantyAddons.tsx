import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'
import { Plus, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function WarrantyAddons({ formData, updateFormData, errors }: Props) {
  const { isDarkMode } = useTheme()
  
  const handleInputChange = (field: keyof FormData, value: any) => {
    // Initialize dynamic arrays when toggling add-ons on
    if (field === 'addonsToFinance' && value === 'Yes' && (!formData.financeAddonsArray || formData.financeAddonsArray.length === 0)) {
      updateFormData({ 
        [field]: value,
        financeAddonsArray: [{ name: '', cost: 0 }] // Initialize with one empty add-on
      })
    } else if (field === 'customerAddons' && value === 'Yes' && (!formData.customerAddonsArray || formData.customerAddonsArray.length === 0)) {
      updateFormData({ 
        [field]: value,
        customerAddonsArray: [{ name: '', cost: 0 }] // Initialize with one empty add-on
      })
    } else {
      updateFormData({ [field]: value })
    }
  }

  // Helper functions for managing finance add-ons array
  const addFinanceAddon = () => {
    const newAddons = [...(formData.financeAddonsArray || []), { name: '', cost: 0 }]
    updateFormData({ financeAddonsArray: newAddons })
  }

  const removeFinanceAddon = (index: number) => {
    const newAddons = (formData.financeAddonsArray || []).filter((_, i) => i !== index)
    updateFormData({ financeAddonsArray: newAddons })
  }

  const updateFinanceAddon = (index: number, field: 'name' | 'cost', value: string | number) => {
    const newAddons = [...(formData.financeAddonsArray || [])]
    if (newAddons[index]) {
      newAddons[index] = { ...newAddons[index], [field]: value }
      updateFormData({ financeAddonsArray: newAddons })
    }
  }

  // Helper functions for managing customer add-ons array
  const addCustomerAddon = () => {
    const newAddons = [...(formData.customerAddonsArray || []), { name: '', cost: 0 }]
    updateFormData({ customerAddonsArray: newAddons })
  }

  const removeCustomerAddon = (index: number) => {
    const newAddons = (formData.customerAddonsArray || []).filter((_, i) => i !== index)
    updateFormData({ customerAddonsArray: newAddons })
  }

  const updateCustomerAddon = (index: number, field: 'name' | 'cost', value: string | number) => {
    const newAddons = [...(formData.customerAddonsArray || [])]
    if (newAddons[index]) {
      newAddons[index] = { ...newAddons[index], [field]: value }
      updateFormData({ customerAddonsArray: newAddons })
    }
  }

  const isTradeHidden = formData.saleType === 'Trade'
  const isFinanceAddonsVisible = formData.addonsToFinance === 'Yes'
  const isCustomerAddonsVisible = formData.customerAddons === 'Yes'
  const isWarrantyLevelSelected = formData.warrantyLevel && formData.warrantyLevel !== '' && formData.warrantyLevel !== 'None Selected'
  const isEnhancedWarrantyVisible = formData.enhancedWarranty === 'Yes'

  return (
    <div className="space-y-6">
      {/* Warranty Section - Hidden for Trade sales */}
      {!isTradeHidden && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Warranty Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warranty Level - input_41 */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Warranty Level
              </label>
              <select
                value={formData.warrantyLevel}
                onChange={(e) => handleInputChange('warrantyLevel', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              >
                <option value="">-</option>
                <option value="30 Days">30 Days</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="12 Months">12 Months</option>
                <option value="24 Months">24 Months</option>
                <option value="36 Months">36 Months</option>
                <option value="None Selected">None Selected</option>
              </select>
            </div>

            {/* Custom Warranty Name - Appears when warranty level is selected */}
            {isWarrantyLevelSelected && (
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Warranty Name
                </label>
                <input
                  type="text"
                  value={formData.warrantyName}
                  onChange={(e) => handleInputChange('warrantyName', e.target.value)}
                  placeholder="e.g., Premium Extended Warranty, Comprehensive Coverage"
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Custom name for this warranty (optional)
                </p>
              </div>
            )}

            {/* In House - input_44 (Toggle Switch) */}
            <div className="space-y-2">
              <Label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                In House Warranty
              </Label>
              <div className="flex items-center space-x-3">
                <Switch
                  checked={formData.inHouse === 'Yes'}
                  onCheckedChange={(checked) => handleInputChange('inHouse', checked ? 'Yes' : 'No')}
                />
                <Label className={`text-sm ${
                  isDarkMode ? 'text-slate-300' : 'text-gray-600'
                }`}>
                  {formData.inHouse === 'Yes' ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>

          {/* Warranty Price - input_45 */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Warranty Price
            </label>
            <input
              type="number"
              value={formData.warrantyPrice || ''}
              onChange={(e) => handleInputChange('warrantyPrice', parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            />
          </div>

          {/* Warranty Details for Customer - input_112 - Only show when warranty level is selected and not "None Selected" */}
          {isWarrantyLevelSelected && (
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Warranty Details for Customer
              </label>
              <textarea
                value={formData.warrantyDetails}
                onChange={(e) => handleInputChange('warrantyDetails', e.target.value)}
                rows={10}
                cols={50}
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>
          )}
        </div>
      )}

      {/* Enhanced/Upgraded Warranty Section - Hidden for Trade sales */}
      {!isTradeHidden && isWarrantyLevelSelected && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Enhanced Warranty Options
          </h3>
          
          {/* Enhanced Warranty Option - Toggle Switch */}
          <div className="space-y-2">
            <Label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Enhanced/Upgraded Warranty
            </Label>
            <div className="flex items-center space-x-3">
              <Switch
                checked={formData.enhancedWarranty === 'Yes'}
                onCheckedChange={(checked) => handleInputChange('enhancedWarranty', checked ? 'Yes' : 'No')}
              />
              <Label className={`text-sm ${
                isDarkMode ? 'text-slate-300' : 'text-gray-600'
              }`}>
                {formData.enhancedWarranty === 'Yes' ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          </div>

          {/* Enhanced Warranty Level and Name - Only show when enhanced warranty is Yes */}
          {isEnhancedWarrantyVisible && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Enhanced Warranty Level
                </label>
                <select
                  value={formData.enhancedWarrantyLevel}
                  onChange={(e) => handleInputChange('enhancedWarrantyLevel', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <option value="">-</option>
                  <option value="3 Months Enhanced">3 Months Enhanced</option>
                  <option value="6 Months Enhanced">6 Months Enhanced</option>
                  <option value="12 Months Enhanced">12 Months Enhanced</option>
                  <option value="18 Months Enhanced">18 Months Enhanced</option>
                  <option value="24 Months Enhanced">24 Months Enhanced</option>
                  <option value="36 Months Enhanced">36 Months Enhanced</option>
                  <option value="48 Months Enhanced">48 Months Enhanced</option>
                </select>
              </div>

              {/* Enhanced Warranty Name - Show when enhanced warranty is visible */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Enhanced Warranty Name (Custom)
                </label>
                <input
                  type="text"
                  value={formData.enhancedWarrantyName || ''}
                  onChange={(e) => handleInputChange('enhancedWarrantyName', e.target.value)}
                  placeholder="Enter custom enhanced warranty name..."
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Optional: Override the enhanced warranty level with a custom name
                </p>
              </div>
            </div>
          )}

          {/* Enhanced Warranty Price - Only show when enhanced warranty is Yes */}
          {isEnhancedWarrantyVisible && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Enhanced Warranty Price (£)
                </label>
                <input
                  type="number"
                  value={formData.enhancedWarrantyPrice || ''}
                  onChange={(e) => handleInputChange('enhancedWarrantyPrice', parseFloat(e.target.value) || 0)}
                  min="0"
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Enhanced Warranty Details - Only show when enhanced warranty is Yes */}
          {isEnhancedWarrantyVisible && (
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Enhanced Warranty Details
              </label>
              <textarea
                value={formData.enhancedWarrantyDetails}
                onChange={(e) => handleInputChange('enhancedWarrantyDetails', e.target.value)}
                rows={6}
                cols={50}
                placeholder="Enter details about the enhanced warranty coverage..."
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              />
            </div>
          )}
        </div>
      )}

      {/* Finance Add-ons Section - Only show for Finance Company invoices */}
      {formData.invoiceTo === 'Finance Company' && (
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Finance Add-ons
          </h3>

        {/* Add-ons to Finance - input_46 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Add-ons to Finance
          </label>
          <select
            value={formData.addonsToFinance}
            onChange={(e) => handleInputChange('addonsToFinance', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {/* Finance Add-on Fields - Shown when addonsToFinance = 'Yes' */}
        {isFinanceAddonsVisible && (
          <div className="space-y-6">
            {/* Finance Add-on 1 (Always shown first) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Finance Add-on 1
                </label>
                <input
                  type="text"
                  value={formData.financeAddon1}
                  onChange={(e) => handleInputChange('financeAddon1', e.target.value)}
                  placeholder="e.g., Gap Insurance, Extended Warranty"
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Finance Add-on 1 Cost
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.financeAddon1Cost || ''}
                  onChange={(e) => handleInputChange('financeAddon1Cost', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* Dynamic Finance Add-ons Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className={`text-md font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Additional Finance Add-ons
                </h4>
                <button
                  type="button"
                  onClick={addFinanceAddon}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Add Finance Add-on
                </button>
              </div>

              {/* Dynamic Finance Add-ons List */}
              {(formData.financeAddonsArray || []).map((addon, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-2 border-dashed rounded-lg">
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Finance Add-on {index + 2}
                    </label>
                    <input
                      type="text"
                      value={addon.name}
                      onChange={(e) => updateFinanceAddon(index, 'name', e.target.value)}
                      placeholder="e.g., Mechanical Breakdown Insurance"
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Cost (£)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addon.cost || ''}
                      onChange={(e) => updateFinanceAddon(index, 'cost', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeFinanceAddon(index)}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        isDarkMode 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {(formData.financeAddonsArray || []).length === 0 && (
                <div className={`text-center py-8 border-2 border-dashed rounded-lg ${
                  isDarkMode ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'
                }`}>
                  <p>No additional finance add-ons yet.</p>
                  <p className="text-sm mt-1">Click "Add Finance Add-on" to add more.</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      )}

      {/* Customer Add-ons Section */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Customer Add-ons
        </h3>

        {/* Customer Add-ons - input_52 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Customer Add-ons
          </label>
          <select
            value={formData.customerAddons}
            onChange={(e) => handleInputChange('customerAddons', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {/* Customer Add-on Fields - Shown when customerAddons = 'Yes' */}
        {isCustomerAddonsVisible && (
          <div className="space-y-6">
            {/* Customer Add-on 1 (Always shown first) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Customer Add-on 1
                </label>
                <input
                  type="text"
                  value={formData.customerAddon1}
                  onChange={(e) => handleInputChange('customerAddon1', e.target.value)}
                  placeholder="e.g., Paint Protection, Tinted Windows"
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  Customer Add-on 1 Cost
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.customerAddon1Cost || ''}
                  onChange={(e) => handleInputChange('customerAddon1Cost', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    isDarkMode 
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* Dynamic Customer Add-ons Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className={`text-md font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Additional Customer Add-ons
                </h4>
                <button
                  type="button"
                  onClick={addCustomerAddon}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Add Customer Add-on
                </button>
              </div>

              {/* Dynamic Customer Add-ons List */}
              {(formData.customerAddonsArray || []).map((addon, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-2 border-dashed rounded-lg">
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Customer Add-on {index + 2}
                    </label>
                    <input
                      type="text"
                      value={addon.name}
                      onChange={(e) => updateCustomerAddon(index, 'name', e.target.value)}
                      placeholder="e.g., Ceramic Coating, Dash Cam"
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Cost (£)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addon.cost || ''}
                      onChange={(e) => updateCustomerAddon(index, 'cost', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode 
                          ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeCustomerAddon(index)}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        isDarkMode 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {(formData.customerAddonsArray || []).length === 0 && (
                <div className={`text-center py-8 border-2 border-dashed rounded-lg ${
                  isDarkMode ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'
                }`}>
                  <p>No additional customer add-ons yet.</p>
                  <p className="text-sm mt-1">Click "Add Customer Add-on" to add more.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Apply Discounts - input_66 */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Apply Discounts?
        </label>
        <select
          value={formData.applyDiscounts}
          onChange={(e) => handleInputChange('applyDiscounts', e.target.value)}
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
      </div>

    </div>
  )
}