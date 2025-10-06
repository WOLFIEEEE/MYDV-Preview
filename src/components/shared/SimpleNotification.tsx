"use client";

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from "@/contexts/ThemeContext";
import { Card } from "@/components/ui/card";
import type { LoadingState } from '@/hooks/useOptimizedStockData';

interface SimpleNotificationProps {
  loadingState: LoadingState;
  isRefreshing: boolean;
  totalItems?: number;
  className?: string;
}

export default function SimpleNotification({
  loadingState,
  isRefreshing,
  totalItems = 0,
  className = ""
}: SimpleNotificationProps) {
  const { isDarkMode } = useTheme();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('info');

  // Show notifications only for important user-facing events
  useEffect(() => {
    let message = '';
    let type: 'success' | 'error' | 'info' = 'info';
    let shouldShow = false;

    switch (loadingState) {
      case 'complete':
        if (!isRefreshing && totalItems > 0) {
          message = 'Stock data updated';
          type = 'success';
          shouldShow = true;
          // Auto-hide success message after 2 seconds
          setTimeout(() => setShowNotification(false), 2000);
        }
        break;
      case 'error':
        message = 'Failed to update stock data';
        type = 'error';
        shouldShow = true;
        // Auto-hide error message after 4 seconds
        setTimeout(() => setShowNotification(false), 4000);
        break;
    }

    if (shouldShow && message !== notificationMessage) {
      setNotificationMessage(message);
      setNotificationType(type);
      setShowNotification(true);
    }
  }, [loadingState, isRefreshing, totalItems, notificationMessage]);

  // Don't show anything if no notification
  if (!showNotification || !notificationMessage) {
    return null;
  }

  const getIcon = () => {
    switch (notificationType) {
      case 'success':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      default:
        return RefreshCw;
    }
  };

  const getColors = () => {
    switch (notificationType) {
      case 'success':
        return {
          icon: isDarkMode ? 'text-green-400' : 'text-green-600',
          bg: isDarkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200',
          text: isDarkMode ? 'text-green-100' : 'text-green-800'
        };
      case 'error':
        return {
          icon: isDarkMode ? 'text-red-400' : 'text-red-600',
          bg: isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200',
          text: isDarkMode ? 'text-red-100' : 'text-red-800'
        };
      default:
        return {
          icon: isDarkMode ? 'text-blue-400' : 'text-blue-600',
          bg: isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
          text: isDarkMode ? 'text-blue-100' : 'text-blue-800'
        };
    }
  };

  const Icon = getIcon();
  const colors = getColors();

  return (
    <div className={`fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300 ${className}`}>
      <Card className={`px-4 py-3 shadow-lg border backdrop-blur-sm ${colors.bg}`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${colors.icon}`} />
          <span className={`text-sm font-medium ${colors.text}`}>
            {notificationMessage}
          </span>
          <button
            onClick={() => setShowNotification(false)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              isDarkMode 
                ? 'text-slate-400 hover:bg-slate-700/50' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            ×
          </button>
        </div>
      </Card>
    </div>
  );
}
