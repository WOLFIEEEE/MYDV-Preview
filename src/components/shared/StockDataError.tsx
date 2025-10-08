"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  RefreshCw, 
  Mail, 
  Settings,
  Database,
  Wifi,
  Server
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface StockDataErrorProps {
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function StockDataError({ error, onRetry, isRetrying = false }: StockDataErrorProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();

  // Determine error type and appropriate message
  const getErrorInfo = (errorMessage: string) => {
    // NEW: Handle dealer not found error (can come from different sources)
    if (errorMessage.includes('DEALER_NOT_FOUND') || 
        errorMessage.includes('Registration Incomplete') ||
        errorMessage.includes('dealer account registration is not complete')) {
      return {
        type: 'dealer_not_found',
        title: 'Registration Incomplete',
        message: 'Your dealer account is not fully set up.',
        details: 'Please complete your dealer registration to access your stock data. If you recently registered, please wait a moment and try refreshing. Contact support if this issue persists.',
        icon: AlertTriangle,
        color: 'orange',
        showContactAdmin: true
      };
    }

    // NEW: Handle advertiser ID required error
    if (errorMessage.includes('ADVERTISER_ID_REQUIRED') || 
        errorMessage.includes('Advertiser ID Required') ||
        errorMessage.includes('configure your advertiser ID')) {
      return {
        type: 'advertiser_id_required',
        title: 'Advertiser ID Required',
        message: 'Please configure your AutoTrader Advertiser ID to access your stock.',
        details: 'Go to Settings and enter your AutoTrader Advertiser ID. You can find this in your AutoTrader account settings.',
        icon: Settings,
        color: 'blue',
        showContactAdmin: false
      };
    }

    // IMPROVED: More specific no data message
    if (errorMessage.includes('NO_STOCK_DATA_AVAILABLE') || errorMessage.includes('Empty response')) {
      return {
        type: 'no_data',
        title: 'No Stock Data Available',
        message: 'Unable to load stock data at this time.',
        details: 'This could be a temporary issue. Please try refreshing. If the problem persists, verify your Advertiser ID configuration in Settings.',
        icon: Database,
        color: 'blue',
        showContactAdmin: true
      };
    }
    
    if (errorMessage.includes('Rate limited')) {
      return {
        type: 'rate_limit',
        title: 'Too Many Requests',
        message: 'Please wait a moment before trying again.',
        details: 'We\'ve detected multiple rapid requests. This helps ensure system stability for all users.',
        icon: AlertTriangle,
        color: 'orange',
        showContactAdmin: false
      };
    }
    
    if (errorMessage.includes('Invalid Advertiser Configuration') || errorMessage.includes('advertiser ID')) {
      return {
        type: 'config_error',
        title: 'Advertiser ID Configuration Error',
        message: 'Your Advertiser ID configuration appears to be incorrect.',
        details: 'Please verify your Advertiser ID in the settings or contact support for assistance.',
        icon: Settings,
        color: 'orange',
        showContactAdmin: true
      };
    }
    
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return {
        type: 'network_error',
        title: 'Network Connection Issue',
        message: 'Unable to connect to the stock data service.',
        details: 'Please check your internet connection and try again.',
        icon: Wifi,
        color: 'red',
        showContactAdmin: false
      };
    }
    
    if (errorMessage.includes('server') || errorMessage.includes('503') || errorMessage.includes('502')) {
      return {
        type: 'server_error',
        title: 'Service Temporarily Unavailable',
        message: 'The stock data service is temporarily unavailable.',
        details: 'Please try again in a few moments. If the problem persists, contact support.',
        icon: Server,
        color: 'red',
        showContactAdmin: true
      };
    }
    
    // Default error
    return {
      type: 'generic_error',
      title: 'Stock Data Error',
      message: 'An error occurred while loading your stock data.',
      details: errorMessage,
      icon: AlertTriangle,
      color: 'red',
      showContactAdmin: true
    };
  };

  const errorInfo = getErrorInfo(error);
  const IconComponent = errorInfo.icon;

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          iconBg: isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100',
          iconColor: 'text-blue-500',
          titleColor: isDarkMode ? 'text-blue-400' : 'text-blue-700'
        };
      case 'orange':
        return {
          iconBg: isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100',
          iconColor: 'text-orange-500',
          titleColor: isDarkMode ? 'text-orange-400' : 'text-orange-700'
        };
      case 'red':
      default:
        return {
          iconBg: isDarkMode ? 'bg-red-500/20' : 'bg-red-100',
          iconColor: 'text-red-500',
          titleColor: isDarkMode ? 'text-red-400' : 'text-red-700'
        };
    }
  };

  const colorClasses = getColorClasses(errorInfo.color);

  const handleContactAdmin = () => {
    const subject = encodeURIComponent(`Stock Data Issue - ${errorInfo.title}`);
    const body = encodeURIComponent(
      `Hello Admin,\n\nI'm experiencing an issue with my stock data:\n\nError Type: ${errorInfo.title}\nDetails: ${errorInfo.details}\nError Message: ${error}\n\nPlease assist me in resolving this issue.\n\nThank you.`
    );
    window.open(`mailto:admin@mydealershipview.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className={`min-h-[400px] flex items-center justify-center p-4`}>
      <Card className={`max-w-2xl w-full ${
        isDarkMode 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200/50'
      } shadow-lg`}>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-6">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-full ${colorClasses.iconBg} flex items-center justify-center`}>
              <IconComponent className={`w-8 h-8 ${colorClasses.iconColor}`} />
            </div>

            {/* Title */}
            <h2 className={`text-2xl font-bold ${colorClasses.titleColor}`}>
              {errorInfo.title}
            </h2>

            {/* Message */}
            <p className={`text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {errorInfo.message}
            </p>

            {/* Details */}
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} max-w-md`}>
              {errorInfo.details}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              {/* Show "Go to Settings" button for advertiser ID required error */}
              {errorInfo.type === 'advertiser_id_required' && (
                <Button 
                  onClick={() => router.push('/store-owner/store-config')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Go to Settings
                </Button>
              )}

              {/* Show retry button for most errors */}
              {onRetry && errorInfo.type !== 'advertiser_id_required' && (
                <Button 
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>
              )}

              {errorInfo.showContactAdmin && (
                <Button 
                  onClick={handleContactAdmin}
                  variant="outline"
                  className={`${
                    isDarkMode 
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Admin
                </Button>
              )}
            </div>

            {/* Contact Info */}
            {errorInfo.showContactAdmin && (
              <div className={`mt-6 p-4 rounded-lg ${
                isDarkMode ? 'bg-slate-700/30' : 'bg-slate-50'
              } border-l-4 ${
                errorInfo.color === 'blue' ? 'border-blue-500' : 
                errorInfo.color === 'orange' ? 'border-orange-500' : 'border-red-500'
              }`}>
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <strong>Need Help?</strong> Contact our support team at{' '}
                  <a 
                    href="mailto:admin@mydealershipview.com"
                    className={`${colorClasses.titleColor} hover:underline font-medium`}
                  >
                    admin@mydealershipview.com
                  </a>
                </p>
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Include this error message in your email for faster resolution.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
