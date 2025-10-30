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
            // Shorter cache times to ensure fresh data from database
            staleTime: 10 * 1000, // 10 seconds - data considered fresh for only 10 seconds
            gcTime: 5 * 60 * 1000, // 5 minutes - keep in memory cache for 5 minutes
            retry: (failureCount, error: any) => {
              // Don't retry on client errors (4xx) or auth errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Retry up to 2 times for server errors
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
            // Enable refetch to ensure fresh data
            refetchOnWindowFocus: true, // Refetch when user returns to tab
            refetchOnReconnect: true,
            refetchOnMount: true, // Always check for fresh data on mount
            // No automatic background refresh
            refetchInterval: false,
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