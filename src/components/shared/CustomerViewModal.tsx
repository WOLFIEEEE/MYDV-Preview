"use client";

import React from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Building, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  marketingConsent: boolean;
  salesConsent: boolean;
  gdprConsent: boolean;
  consentDate: string | null;
  notes: string | null;
  customerSource: string | null;
  preferredContactMethod: string;
  status: string;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerViewModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerViewModal({ customer, isOpen, onClose }: CustomerViewModalProps) {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCustomerTypeColor = (tags: string[] | null) => {
    if (!tags || tags.length === 0) return isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
    
    const primaryTag = tags[0];
    switch (primaryTag) {
      case 'individual':
        return isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
      case 'business':
        return isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
      case 'trade':
        return isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700';
      default:
        return isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex-shrink-0 flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
              customer.tags && customer.tags.includes('individual') ? 'bg-blue-600' :
              customer.tags && customer.tags.includes('business') ? 'bg-green-600' : 'bg-purple-600'
            }`}>
              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {customer.firstName} {customer.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCustomerTypeColor(customer.tags)}`}>
                  {customer.tags && customer.tags.length > 0 ? customer.tags[0].charAt(0).toUpperCase() + customer.tags[0].slice(1) : 'Individual'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-300'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <User className="w-5 h-5 mr-2 text-orange-600" />
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>Email</span>
                  </div>
                  <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {customer.email}
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-orange-600" />
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>Phone</span>
                  </div>
                  <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {customer.phone}
                  </p>
                </div>

                {customer.dateOfBirth && (
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      <span className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>Date of Birth</span>
                    </div>
                    <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatDate(customer.dateOfBirth)}
                    </p>
                  </div>
                )}

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-orange-600" />
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>Status</span>
                  </div>
                  <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'} capitalize`}>
                    {customer.status}
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>Preferred Contact</span>
                  </div>
                  <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'} capitalize`}>
                    {customer.preferredContactMethod}
                  </p>
                </div>

                {customer.customerSource && (
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="w-4 h-4 text-orange-600" />
                      <span className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-slate-600'
                      }`}>Customer Source</span>
                    </div>
                    <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'} capitalize`}>
                      {customer.customerSource}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            {(customer.addressLine1 || customer.city || customer.postcode) && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                  Address Information
                </h3>
                
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  {customer.addressLine1 && (
                    <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {customer.addressLine1}
                    </p>
                  )}
                  {customer.addressLine2 && (
                    <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {customer.addressLine2}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {customer.city && (
                      <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {customer.city}
                      </span>
                    )}
                    {customer.county && (
                      <span className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                        {customer.county}
                      </span>
                    )}
                    {customer.postcode && (
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {customer.postcode}
                      </span>
                    )}
                  </div>
                  {customer.country && (
                    <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
                      {customer.country}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Consent Information */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <Building className="w-5 h-5 mr-2 text-orange-600" />
                Consent & Preferences
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {customer.gdprConsent ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>GDPR Consent</span>
                  </div>
                  <p className={`text-sm ${
                    customer.gdprConsent 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {customer.gdprConsent ? 'Granted' : 'Not Granted'}
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {customer.marketingConsent ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>Marketing</span>
                  </div>
                  <p className={`text-sm ${
                    customer.marketingConsent 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {customer.marketingConsent ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {customer.salesConsent ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>Sales</span>
                  </div>
                  <p className={`text-sm ${
                    customer.salesConsent 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {customer.salesConsent ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {customer.notes && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Notes
                </h3>
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <p className={`${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                    {customer.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Record Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>Created</span>
                  </div>
                  <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatDate(customer.createdAt)}
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>Last Updated</span>
                  </div>
                  <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatDate(customer.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 flex justify-end p-6 border-t ${
          isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
        }`}>
          <Button
            onClick={onClose}
            className={`px-6 py-2 ${
              isDarkMode 
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-800'
            }`}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
