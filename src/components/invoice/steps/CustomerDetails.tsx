import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { FormData } from '../InvoiceForm'
import AddressFormSection from '@/components/shared/AddressFormSection'
import CustomerSelector from '../CustomerSelector'
import { Customer } from '@/hooks/useCustomers'

interface Props {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function CustomerDetails({ formData, updateFormData, errors }: Props) {
  const { isDarkMode } = useTheme()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  // Auto-show manual entry if customer data is already populated from sale details
  const [showManualEntry, setShowManualEntry] = useState(() => {
    return !!(formData.firstName || formData.surname || formData.emailAddress)
  })
  
  // Watch for customer data being populated (e.g., from sale details) and auto-show form
  useEffect(() => {
    if ((formData.firstName || formData.surname || formData.emailAddress) && !showManualEntry) {
      console.log('👤 Customer data detected, auto-showing manual entry form')
      setShowManualEntry(true)
    }
  }, [formData.firstName, formData.surname, formData.emailAddress, showManualEntry])
  
  const handleInputChange = (field: keyof FormData, value: any) => {
    updateFormData({ [field]: value })
  }

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    
    if (customer) {
      // Auto-populate form fields with customer data
      updateFormData({
        firstName: customer.firstName,
        surname: customer.lastName,
        emailAddress: customer.email,
        contactNumber: customer.phone,
        address: {
          street: customer.addressLine1,
          address2: customer.addressLine2 || '',
          city: customer.city,
          county: customer.county,
          postCode: customer.postcode,
          country: customer.country || 'United Kingdom'
        }
      })
      setShowManualEntry(true)
    } else {
      // Clear form when no customer selected
      setShowManualEntry(true)
    }
  }

  const handleCreateNewCustomer = () => {
    setSelectedCustomer(null)
    setShowManualEntry(true)
    // Clear form fields for new customer entry
    updateFormData({
      title: '',
      firstName: '',
      middleName: '',
      surname: '',
      emailAddress: '',
      contactNumber: '',
      address: {
        street: '',
        address2: '',
        city: '',
        county: '',
        postCode: '',
        country: 'United Kingdom'
      }
    })
  }

  const handleAddressChange = (address: { street: string; address2?: string; city: string; county: string; postCode: string; country: string }) => {
    // Convert AddressData to FormData['address'] format
    const formattedAddress: FormData['address'] = {
      street: address.street,
      address2: address.address2 || '', // Convert optional to required with empty string default
      city: address.city,
      county: address.county,
      postCode: address.postCode,
      country: address.country
    }
    updateFormData({ address: formattedAddress })
  }

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <CustomerSelector
        onCustomerSelect={handleCustomerSelect}
        selectedCustomer={selectedCustomer}
        onCreateNew={handleCreateNewCustomer}
      />

      {/* Manual Entry Form - Show when customer selected or creating new */}
      {showManualEntry && (
        <div className="space-y-6">
          <div className={`border-t pt-6 ${
            isDarkMode ? 'border-gray-600' : 'border-gray-200'
          }`}>
            <h4 className={`text-md font-medium mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {selectedCustomer ? 'Review & Edit Customer Details' : 'Enter New Customer Details'}
            </h4>
          </div>

          {/* Name Fields - Matching Gravity Forms layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Title - input_9 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>

        {/* First Name - input_10 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              errors.firstName 
                ? 'border-red-500' 
                : isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName}</p>
          )}
        </div>

        {/* Middle Name - input_11 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Middle Name
          </label>
          <input
            type="text"
            value={formData.middleName}
            onChange={(e) => handleInputChange('middleName', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>

        {/* Surname - input_12 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Surname
          </label>
          <input
            type="text"
            value={formData.surname}
            onChange={(e) => handleInputChange('surname', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              errors.surname 
                ? 'border-red-500' 
                : isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
          {errors.surname && (
            <p className="text-xs text-red-500">{errors.surname}</p>
          )}
        </div>
      </div>

      {/* Address Section - input_13 (Complex field) */}
      <fieldset className="space-y-4">
        <AddressFormSection
          addressData={{
            street: formData.address.street,
            address2: formData.address.address2 || undefined, // Convert empty string to undefined for optional field
            city: formData.address.city,
            county: formData.address.county,
            postCode: formData.address.postCode,
            country: formData.address.country
          }}
          onAddressChange={handleAddressChange}
          errors={errors}
          fieldPrefix="address"
          showTitle={true}
          title="Address"
        />
      </fieldset>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Number - input_14 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Contact Number
          </label>
          <input
            type="text"
            value={formData.contactNumber}
            onChange={(e) => handleInputChange('contactNumber', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
        </div>

        {/* Email Address - input_15 */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-700'
          }`}>
            Email Address
          </label>
          <input
            type="email"
            value={formData.emailAddress}
            onChange={(e) => handleInputChange('emailAddress', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              errors.emailAddress 
                ? 'border-red-500' 
                : isDarkMode 
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
          {errors.emailAddress && (
            <p className="text-xs text-red-500">{errors.emailAddress}</p>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  )
}