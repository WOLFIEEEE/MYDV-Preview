import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import type { AuthTestResult } from '@/app/api/auth/test/route';

// Query keys for React Query - USER-SPECIFIC to prevent cross-user data leakage
export const authTestQueryKeys = {
  all: ['authTest'] as const,
  test: (userId?: string) => [...authTestQueryKeys.all, 'test', userId].filter(Boolean),
};

// Fetch function for authentication test
async function fetchAuthTest(userId?: string): Promise<AuthTestResult> {
  console.log('\n🔐 ===== REACT QUERY: TESTING AUTOTRADER AUTHENTICATION =====');
  console.log('📡 Request URL:', '/api/auth/test');
  console.log('👤 User ID:', userId);
  console.log('🔑 Cache Key:', JSON.stringify(authTestQueryKeys.test(userId)));
  
  const response = await fetch('/api/auth/test', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result: AuthTestResult = await response.json();
  
  console.log('\n🔐 ===== REACT QUERY: RECEIVED AUTH TEST RESPONSE =====');
  console.log('✅ Response success:', result.success);
  console.log('🔑 Authenticated:', result.authenticated);
  
  if (result.error) {
    console.log('❌ Auth error type:', result.error.type);
    console.log('📋 Error title:', result.error.title);
    console.log('💬 Error message:', result.error.message);
  }
  
  if (result.storeInfo) {
    console.log('🏪 Store info:', result.storeInfo);
  }

  // Always return the result - don't throw errors for auth failures
  // The component will handle the authentication state
  return result;
}

// Hook for testing AutoTrader authentication
export function useAuthTest(enabled: boolean = true) {
  const { user } = useUser();
  const userId = user?.id;

  return useQuery({
    queryKey: authTestQueryKeys.test(userId),
    queryFn: () => fetchAuthTest(userId),
    enabled: enabled && !!userId, // Only run when enabled AND user is available
    staleTime: 2 * 60 * 1000, // 2 minutes - auth status can change
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on client-side errors or auth failures
      // Only retry on network/server errors
      if (error?.status && error.status < 500) {
        console.log('🚫 Not retrying auth test - client error');
        return false;
      }
      // Only retry once for server errors
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}
