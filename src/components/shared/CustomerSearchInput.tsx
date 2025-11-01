"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Search, User, Mail, Phone, MapPin, X } from "lucide-react";

interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  marketingConsent: boolean;
  salesConsent: boolean;
  gdprConsent: boolean;
  status: string;
  tags: string[] | null;
}

interface CustomerSearchInputProps {
  onCustomerSelect: (customer: Customer) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomerSearchInput({ 
  onCustomerSelect, 
  placeholder = "Search customers by name or email...",
  className = ""
}: CustomerSearchInputProps) {
  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch customers from API
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = customers.filter(customer => {
      // Safely handle null/undefined values
      const firstName = customer.firstName || '';
      const lastName = customer.lastName || '';
      const email = customer.email || '';
      
      return firstName.toLowerCase().includes(term) ||
        lastName.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        `${firstName} ${lastName}`.toLowerCase().includes(term);
    }).slice(0, 8); // Limit to 8 suggestions

    setFilteredCustomers(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  }, [searchTerm, customers]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    const firstName = customer.firstName || '';
    const lastName = customer.lastName || '';
    setSearchTerm(`${firstName} ${lastName}`.trim());
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onCustomerSelect(customer);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredCustomers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCustomers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCustomers.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredCustomers.length) {
          handleCustomerSelect(filteredCustomers[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  };

  // Get customer type color
  const getCustomerTypeColor = (tags: string[] | null) => {
    const primaryTag = tags && tags.length > 0 ? tags[0] : 'individual';
    switch (primaryTag) {
      case 'individual':
        return isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700';
      case 'business':
        return isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700';
      case 'trade':
        return isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700';
      default:
        return isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`} />
        <input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredCustomers.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className={`w-full pl-10 pr-10 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none ${
            isDarkMode
              ? 'bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder-slate-400 hover:bg-slate-800/70 hover:border-slate-600'
              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-500 hover:bg-white hover:border-slate-300 focus:bg-white focus:ring-blue-500/20'
          }`}
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className={`absolute top-full left-0 right-0 mt-1 p-3 border rounded-lg shadow-lg z-50 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className={`ml-2 text-sm ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Loading customers...
            </span>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredCustomers.length > 0 && !isLoading && (
        <div
          ref={suggestionsRef}
          className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          {filteredCustomers.map((customer, index) => (
            <div
              key={customer.id}
              onClick={() => handleCustomerSelect(customer)}
              className={`p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                index === selectedIndex
                  ? isDarkMode ? 'bg-slate-700' : 'bg-blue-50'
                  : isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
              } ${
                isDarkMode ? 'border-slate-700' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${
                  customer.tags && customer.tags.includes('individual') ? 'bg-blue-600' :
                  customer.tags && customer.tags.includes('business') ? 'bg-green-600' : 'bg-purple-600'
                }`}>
                  {(customer.firstName || '').charAt(0) || '?'}{(customer.lastName || '').charAt(0) || ''}
                </div>
                
                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {customer.firstName || ''} {customer.lastName || ''}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCustomerTypeColor(customer.tags)}`}>
                      {customer.tags && customer.tags.length > 0 ? customer.tags[0].charAt(0).toUpperCase() + customer.tags[0].slice(1) : 'Individual'}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-xs ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      {customer.phone && (
                        <div className={`flex items-center gap-2 ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.city && customer.postcode && (
                        <div className={`flex items-center gap-2 ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{customer.city}, {customer.postcode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showSuggestions && filteredCustomers.length === 0 && searchTerm.trim() && !isLoading && (
        <div className={`absolute top-full left-0 right-0 mt-1 p-4 border rounded-lg shadow-lg z-50 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-center">
            <User className={`w-5 h-5 mr-2 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`} />
            <span className={`text-sm ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              No customers found matching "{searchTerm}"
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
