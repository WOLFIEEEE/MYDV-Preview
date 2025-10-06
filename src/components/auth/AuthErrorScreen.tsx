"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Key, 
  Settings, 
  RefreshCw, 
  Home, 
  Mail, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Wifi
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { AuthTestResult } from '@/app/api/auth/test/route';

interface AuthErrorScreenProps {
  error: NonNullable<AuthTestResult['error']>;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function AuthErrorScreen({ error, onRetry, isRetrying = false }: AuthErrorScreenProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();

  // Get appropriate icon and colors based on error type
  const getErrorConfig = () => {
    switch (error.type) {
      case 'NO_STORE_CONFIG':
        return {
          icon: Settings,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
      case 'MISSING_KEYS':
        return {
          icon: Key,
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        };
      case 'INVALID_KEYS':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      case 'KEYS_NOT_ACTIVATED':
        return {
          icon: Clock,
          iconColor: 'text-orange-500',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800'
        };
      case 'NETWORK_ERROR':
        return {
          icon: Wifi,
          iconColor: 'text-purple-500',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800'
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800'
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      <div className="w-full max-w-2xl">
        <Card className={`${config.bgColor} ${config.borderColor} border-2 shadow-xl`}>
          <CardHeader className="text-center pb-4">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full ${config.bgColor} flex items-center justify-center`}>
              <IconComponent className={`w-10 h-10 ${config.iconColor}`} />
            </div>
            <CardTitle className={`text-2xl font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {error.title}
            </CardTitle>
            <p className={`text-lg ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              {error.message}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Error Details */}
            <div className={`p-4 rounded-lg border ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-gray-300' 
                : 'bg-white border-gray-200 text-gray-700'
            }`}>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Details
              </h3>
              <p className="text-sm leading-relaxed">{error.details}</p>
            </div>

            {/* Suggestions */}
            <div className={`p-4 rounded-lg border ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <CheckCircle className="w-4 h-4 text-green-500" />
                What you can do:
              </h3>
              <ul className="space-y-2">
                {error.suggestions.map((suggestion, index) => (
                  <li key={index} className={`text-sm flex items-start gap-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0"></span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {onRetry && (
                <Button 
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Testing...' : 'Test Again'}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.open('mailto:support@yourdomain.com', '_blank')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>

            {/* Additional Help */}
            <div className={`text-center pt-4 border-t ${
              isDarkMode ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <p className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-600'
              }`}>
                Need immediate help? 
                <button 
                  onClick={() => window.open('https://yourdomain.com/help', '_blank')}
                  className="ml-1 text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
                >
                  Visit our help center
                  <ExternalLink className="w-3 h-3" />
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
