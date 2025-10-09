"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { crossPageSyncService } from '@/lib/crossPageSyncService';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 24-hour cache configuration to match backend
            staleTime: 24 * 60 * 60 * 1000, // 24 hours - match backend cache duration
            gcTime: 48 * 60 * 60 * 1000, // 48 hours - match MAX_CACHE_AGE_HOURS
            retry: (failureCount, error: any) => {
              // Don't retry on client errors (4xx) or auth errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Retry up to 2 times for server errors
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
            // Prevent excessive refetching for better performance
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: false, // Use cached data on mount
            // No automatic background refresh - only manual refresh or 24h expiry
            refetchInterval: false, // Disabled - rely on 24h cache expiry
            refetchIntervalInBackground: false,
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  // Initialize cross-page sync service
  useEffect(() => {
    crossPageSyncService.initialize(queryClient);
    console.log('🔄 Cross-page sync service initialized with QueryClient');
    
    return () => {
      crossPageSyncService.cleanup();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}