"use client";

import { ReactNode } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import type { LoadingState } from '@/hooks/useOptimizedStockData';

interface ProgressiveLoaderProps {
  loadingState: LoadingState;
  hasData: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/**
 * Progressive loader that shows content immediately when cached data exists,
 * with subtle indicators for background refresh states
 */
export default function ProgressiveLoader({
  loadingState,
  hasData,
  children,
  fallback,
  className = ""
}: ProgressiveLoaderProps) {
  const { isDarkMode } = useTheme();

  // Show fallback only for initial loading when no data exists
  if (loadingState === 'initial' && !hasData && fallback) {
    return <>{fallback}</>;
  }

  // For all other states, show the content with optional loading overlay
  return (
    <div className={`relative ${className}`}>
      {/* Content - always show if we have data */}
      <div className={`transition-opacity duration-300 ${
        loadingState === 'refreshing' && hasData ? 'opacity-95' : 'opacity-100'
      }`}>
        {children}
      </div>

      {/* Very subtle loading indicator for background refresh - minimal visual impact */}
      {loadingState === 'refreshing' && hasData && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden opacity-30">
          <div className={`h-full animate-pulse ${
            isDarkMode 
              ? 'bg-gradient-to-r from-transparent via-blue-400/20 to-transparent' 
              : 'bg-gradient-to-r from-transparent via-blue-500/20 to-transparent'
          }`} />
        </div>
      )}
    </div>
  );
}

// Hook for progressive loading states
export function useProgressiveLoading(loadingState: LoadingState, hasData: boolean) {
  return {
    showContent: hasData || loadingState !== 'initial',
    showSkeleton: loadingState === 'initial' && !hasData,
    isRefreshing: loadingState === 'refreshing' && hasData,
    hasError: loadingState === 'error',
    isComplete: loadingState === 'complete'
  };
}
