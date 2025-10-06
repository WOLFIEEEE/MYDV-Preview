import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'
import { PREDEFINED_FINANCE_COMPANIES, CUSTOM_FINANCE_COMPANY_ID, getFinanceCompanyById } from '@/lib/financeCompanies'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function FinanceCompanyDetails({ formData, updateFormData }: Props) {
  const { isDarkMode } = useTheme()
  
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  // Handle finance company selection and auto-populate address
  const handleFinanceCompanyChange = (companyId: string) => {
    handleInputChange('financeCompany', companyId);
    
    if (companyId && companyId !== CUSTOM_FINANCE_COMPANY_ID) {
      const company = getFinanceCompanyById(companyId);
      if (company) {
        // Auto-populate the address fields
        const addressLine1 = company.address.line1;
        const addressLine2 = company.address.line2 ? `\n${company.address.line2}` : '';
        const cityCounty = company.address.county 
          ? `${company.address.city}, ${company.address.county}` 
          : company.address.city;
        const contactInfo = [];
        if (company.address.phone) contactInfo.push(company.address.phone);
        if (company.address.email) contactInfo.push(company.address.email);
        
        updateFormData({
          financeCompany: companyId,
          financeCompanyName: company.fullName,
          financeStreetAddress: `${addressLine1}${addressLine2}`,
          financeCountyPostCode: `${cityCounty}\n${company.address.postcode}${contactInfo.length > 0 ? '\n' + contactInfo.join('\n') : ''}`
        });
      }
    } else if (companyId === CUSTOM_FINANCE_COMPANY_ID) {
      // Clear fields for custom entry - but don't set financeCompany to 'custom'
      // Instead, we'll use the financeCompanyName field for the actual company name
      updateFormData({
        financeCompany: companyId, // This is just for UI state
        financeCompanyName: '',
        financeStreetAddress: '',
        financeCountyPostCode: ''
      });
    }
  }

  // This component is only shown when invoiceTo === 'Finance Company'
  if (formData.invoiceTo !== 'Finance Company') {
    return null
  }

  return (
    <div className="space-y-6">

      {/* Finance Company - input_17 */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          Finance Company
        </label>
        <select
          value={formData.financeCompany}
          onChange={(e) => handleFinanceCompanyChange(e.target.value)}
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
              : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
          }`}
        >
          <option value="">Select Finance Company</option>
          {PREDEFINED_FINANCE_COMPANIES.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
          <option value={CUSTOM_FINANCE_COMPANY_ID}>Other (Custom)</option>
        </select>
      </div>

      {/* Finance Company Name - input_18 - Only show when "Custom" is selected */}
      {formData.financeCompany === CUSTOM_FINANCE_COMPANY_ID && (
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Finance Company Name
          </label>
          <input
            type="text"
            value={formData.financeCompanyName}
            onChange={(e) => handleInputChange('financeCompanyName', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>
      )}

      {/* Street Address - input_19 - Only show when "Custom" is selected */}
      {formData.financeCompany === CUSTOM_FINANCE_COMPANY_ID && (
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Street Address
          </label>
          <input
            type="text"
            value={formData.financeStreetAddress}
            onChange={(e) => handleInputChange('financeStreetAddress', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>
      )}

      {/* County, Post Code and Contact Details - input_20 - Only show when "Custom" is selected */}
      {formData.financeCompany === CUSTOM_FINANCE_COMPANY_ID && (
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            County, Post Code and Contact Details
          </label>
          <input
            type="text"
            value={formData.financeCountyPostCode}
            onChange={(e) => handleInputChange('financeCountyPostCode', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
          <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
            Include any Contact Numbers and/or Email Address
          </p>
        </div>
      )}

      {/* Show address fields for predefined companies (editable) */}
      {formData.financeCompany && formData.financeCompany !== CUSTOM_FINANCE_COMPANY_ID && (
        <>
          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Finance Company Name
            </label>
            <input
              type="text"
              value={formData.financeCompanyName}
              onChange={(e) => handleInputChange('financeCompanyName', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
              placeholder="Auto-populated from selection"
            />
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Street Address
            </label>
            <textarea
              value={formData.financeStreetAddress}
              onChange={(e) => handleInputChange('financeStreetAddress', e.target.value)}
              rows={2}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
              placeholder="Auto-populated from selection"
            />
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              County, Post Code and Contact Details
            </label>
            <textarea
              value={formData.financeCountyPostCode}
              onChange={(e) => handleInputChange('financeCountyPostCode', e.target.value)}
              rows={3}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none ${
                isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
              placeholder="Auto-populated from selection"
            />
            <p className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
              Include any Contact Numbers and/or Email Address
            </p>
          </div>
        </>
      )}

      {/* Finance Company Summary */}
      <div className={`rounded-lg p-4 border-2 ${
        isDarkMode 
          ? 'bg-slate-800/50 border-slate-600' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`text-sm font-medium mb-3 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Finance Company Summary
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Selected Company:</span>
            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {formData.financeCompany ? (
                formData.financeCompany === CUSTOM_FINANCE_COMPANY_ID ? 
                  (formData.financeCompanyName || 'Custom Company (Enter name above)') : 
                  getFinanceCompanyById(formData.financeCompany)?.name || formData.financeCompany
              ) : 'Not selected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Company Name:</span>
            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {formData.financeCompanyName || 'Not provided'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Address:</span>
            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {formData.financeStreetAddress || 'Not provided'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>Contact Details:</span>
            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {formData.financeCountyPostCode || 'Not provided'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}