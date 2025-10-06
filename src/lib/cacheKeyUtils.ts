/**
 * Cache Key Utilities for User-Specific Data Isolation
 * 
 * This module provides utilities to create consistent, user-specific cache keys
 * that prevent cross-user data leakage in React Query cache.
 */

import { useUser } from '@clerk/nextjs';

/**
 * Generate a unique user identifier for cache keys
 * Uses Clerk user ID as the primary identifier with email as fallback
 */
export function generateUserCacheId(user: any): string {
  if (!user) {
    throw new Error('User is required for cache key generation');
  }
  
  // Primary: Use Clerk user ID
  if (user.id) {
    return `user_${user.id}`;
  }
  
  // Fallback: Use email address
  const email = user.emailAddresses?.[0]?.emailAddress;
  if (email) {
    return `email_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
  
  throw new Error('Unable to generate user cache ID - no user ID or email found');
}

/**
 * Generate a dealer-specific cache key that includes user context
 * This prevents team members from seeing each other's cached data
 */
export function generateDealerCacheId(dealerId: string, userId?: string): string {
  if (!dealerId) {
    throw new Error('Dealer ID is required for dealer cache key generation');
  }
  
  // Include user ID in dealer cache key for additional isolation
  if (userId) {
    return `dealer_${dealerId}_user_${userId}`;
  }
  
  return `dealer_${dealerId}`;
}

/**
 * Hook to get user-specific cache identifier
 */
export function useUserCacheId(): string | null {
  const { user } = useUser();
  
  try {
    return user ? generateUserCacheId(user) : null;
  } catch (error) {
    console.error('Error generating user cache ID:', error);
    return null;
  }
}

/**
 * Validate that a cache key includes user identification
 */
export function validateUserSpecificCacheKey(cacheKey: readonly unknown[]): boolean {
  const keyString = JSON.stringify(cacheKey);
  return keyString.includes('user_') || keyString.includes('email_') || keyString.includes('dealer_');
}

/**
 * Create a user-scoped cache key array
 */
export function createUserScopedCacheKey(
  baseKey: readonly string[],
  userCacheId: string | null,
  additionalKeys: readonly unknown[] = []
): readonly unknown[] {
  if (!userCacheId) {
    throw new Error('User cache ID is required for user-scoped cache keys');
  }
  
  return [...baseKey, userCacheId, ...additionalKeys].filter(Boolean);
}

/**
 * Create a dealer-scoped cache key array with user context
 */
export function createDealerScopedCacheKey(
  baseKey: readonly string[],
  dealerId: string,
  userCacheId: string | null,
  additionalKeys: readonly unknown[] = []
): readonly unknown[] {
  const dealerCacheId = generateDealerCacheId(dealerId, userCacheId || undefined);
  return [...baseKey, dealerCacheId, ...additionalKeys].filter(Boolean);
}

/**
 * Extract user ID from cache key for debugging
 */
export function extractUserIdFromCacheKey(cacheKey: readonly unknown[]): string | null {
  const keyString = JSON.stringify(cacheKey);
  
  // Extract user ID from user_ pattern
  const userMatch = keyString.match(/user_([a-zA-Z0-9_-]+)/);
  if (userMatch) {
    return userMatch[1];
  }
  
  // Extract from email_ pattern
  const emailMatch = keyString.match(/email_([a-zA-Z0-9_]+)/);
  if (emailMatch) {
    return emailMatch[1];
  }
  
  return null;
}

