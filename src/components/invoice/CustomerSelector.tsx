import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Plus, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';

interface CustomerSelectorProps {
  onCustomerSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
  onCreateNew: () => void;
}

export default function CustomerSelector({ 
  onCustomerSelect, 
  selectedCustomer, 
  onCreateNew 
}: CustomerSelectorProps) {
  const { isDarkMode } = useTheme();
  const { customers, loading, error, searchCustomers } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query)
    );
  });

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // Debounce search API calls
    const timeoutId = setTimeout(() => {
      if (query.length > 0) {
        searchCustomers(query);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchQuery(`${customer.firstName} ${customer.lastName} (${customer.email})`);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCustomers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredCustomers.length) {
          handleCustomerSelect(filteredCustomers[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Clear selection
  const handleClear = () => {
    onCustomerSelect(null);
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search query when selected customer changes externally
  useEffect(() => {
    if (selectedCustomer) {
      setSearchQuery(`${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.email})`);
    } else {
      setSearchQuery('');
    }
  }, [selectedCustomer]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Customer Selection
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCreateNew}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </Button>
      </div>

      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search existing customers by name, email, or phone..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            className={`w-full pl-10 pr-10 py-3 border-2 rounded-lg text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
              isDarkMode 
                ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500' 
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
            }`}
          />
          {selectedCustomer && (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className={`absolute z-50 w-full mt-1 max-h-60 overflow-auto border rounded-lg shadow-lg ${
            isDarkMode 
              ? 'border-slate-600 bg-slate-800' 
              : 'border-gray-200 bg-white'
          }`}>
            {loading && (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading customers...
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 text-center">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {!loading && !error && filteredCustomers.length === 0 && (
              <div className="p-4 text-center">
                <User className={`w-8 h-8 mx-auto mb-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {searchQuery ? 'No customers found matching your search.' : 'No customers found.'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCreateNew}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create New Customer
                </Button>
              </div>
            )}

            {!loading && !error && filteredCustomers.map((customer, index) => (
              <div
                key={customer.id}
                onClick={() => handleCustomerSelect(customer)}
                className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                  index === highlightedIndex
                    ? isDarkMode 
                      ? 'bg-slate-700' 
                      : 'bg-blue-50'
                    : isDarkMode
                      ? 'hover:bg-slate-700'
                      : 'hover:bg-gray-50'
                } ${
                  isDarkMode ? 'border-slate-600' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {customer.email}
                    </p>
                    {customer.phone && (
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {customer.phone}
                      </p>
                    )}
                  </div>
                  {selectedCustomer?.id === customer.id && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div className={`p-4 rounded-lg border ${
          isDarkMode 
            ? 'border-green-600 bg-green-900/20' 
            : 'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className={`text-sm font-medium ${
              isDarkMode ? 'text-green-400' : 'text-green-700'
            }`}>
              Customer Selected
            </span>
          </div>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {selectedCustomer.firstName} {selectedCustomer.lastName} - {selectedCustomer.email}
          </p>
          <p className={`text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Customer information will be automatically populated in the form below.
          </p>
        </div>
      )}
    </div>
  );
}
