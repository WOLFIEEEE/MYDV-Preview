"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, CheckCircle2, Gauge } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface SearchFormProps {
  onSearch: (registrationNumber: string, mileage: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function SearchForm({ onSearch, isLoading, error }: SearchFormProps) {
  const { isDarkMode } = useTheme();
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [mileage, setMileage] = useState("");
  const [isValidReg, setIsValidReg] = useState(false);

  const validateRegistration = (reg: string) => {
    // Comprehensive UK registration validation
    const cleanReg = reg.replace(/\s/g, '').toUpperCase();
    
    // Current format (2001 onwards): AB12 CDE
    const currentFormat = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/;
    
    // Prefix format (1983-2001): A123 BCD
    const prefixFormat = /^[A-Z][0-9]{1,3}[A-Z]{3}$/;
    
    // Suffix format (1963-1983): ABC 123D
    const suffixFormat = /^[A-Z]{1,3}[0-9]{1,4}[A-Z]$/;
    
    // Dateless format (pre-1963): ABC 123
    const datelessFormat = /^[A-Z]{1,3}[0-9]{1,4}$/;
    
    // Northern Ireland format: ABC 1234
    const niFormat = /^[A-Z]{1,3}[0-9]{1,4}$/;
    
    // Personal/Cherished plates: Various formats
    const personalFormat = /^[A-Z0-9]{1,7}$/;
    
    return currentFormat.test(cleanReg) || 
           prefixFormat.test(cleanReg) || 
           suffixFormat.test(cleanReg) || 
           datelessFormat.test(cleanReg) || 
           niFormat.test(cleanReg) || 
           (personalFormat.test(cleanReg) && cleanReg.length >= 2);
  };

  const handleRegistrationChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setRegistrationNumber(upperValue);
    setIsValidReg(validateRegistration(upperValue));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReg = registrationNumber.trim().replace(/\s/g, '');
    if (cleanReg && validateRegistration(cleanReg)) {
      onSearch(cleanReg, mileage.trim());
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Registration and Mileage in Same Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Registration Input with Validation - Plate Background */}
          <div className="space-y-1">
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Vehicle Registration *
            </label>
            <div className="relative">
              <div 
                className={`relative overflow-hidden rounded-lg h-16 w-80 border-2 transition-all duration-300 cursor-text ${
                  registrationNumber && isValidReg
                    ? 'border-green-500'
                    : registrationNumber && !isValidReg
                    ? 'border-red-500'
                    : 'border-transparent'
                }`}
                onClick={() => document.getElementById('registration-input')?.focus()}
              >
                {/* UK License Plate Background Image */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: "url('/Vehicle Registration.jpeg')",
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
                
                {/* Visible input positioned over the license plate */}
                <input
                  id="registration-input"
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => handleRegistrationChange(e.target.value)}
                  className="absolute z-10 bg-transparent border-none outline-none font-mono text-xl font-black tracking-[0.2em] text-black cursor-text"
                  style={{
                    textShadow: '1px 1px 2px rgba(255,255,255,0.9)',
                    letterSpacing: '0.2em',
                    left: '25px', // Start where yellow plate begins
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 'calc(100% - 60px)', // Leave space for validation icon
                    height: '24px',
                    textAlign: 'center'
                  }}
                  placeholder=""
                  required
                  disabled={isLoading}
                />
                
                {registrationNumber && (
                  <div className="absolute right-2 top-2 z-20">
                    {isValidReg ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 drop-shadow-lg bg-white rounded-full" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 drop-shadow-lg bg-white rounded-full" />
                    )}
                  </div>
                )}
              </div>
            </div>
            {registrationNumber && !isValidReg && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Invalid UK registration
              </p>
            )}
          </div>

          {/* Mileage Input with Odometer Icon */}
          <div className="space-y-1">
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Mileage (optional)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                <Gauge className={`w-5 h-5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="50,000"
                className={`w-full p-3 pl-11 pr-4 rounded-lg border-2 transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                } outline-none`}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Search Button */}
        <Button
          type="submit"
          disabled={isLoading || !registrationNumber.trim() || !isValidReg}
          className={`w-full py-3 text-base font-semibold rounded-lg transition-all duration-300 ${
            isLoading || !registrationNumber.trim() || !isValidReg
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-lg'
          } ${
            isDarkMode
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          } text-white`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search Vehicle
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
