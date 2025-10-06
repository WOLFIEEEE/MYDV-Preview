'use server';

import { getAllDealers } from '@/lib/database';

export interface DealerUser {
  id: string;
  clerkUserId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

// Cache to reduce frequent database calls
let dealersCache: DealerUser[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function fetchDealers(): Promise<DealerUser[]> {
  try {
    // Quick check to prevent unnecessary calls during sign-out
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin/dashboard') {
      return [];
    }

    // Check if cache is still valid
    const now = Date.now();
    if (dealersCache && (now - lastCacheTime) < CACHE_DURATION) {
      return dealersCache;
    }
    
    // Fetch dealers from database
    const dealers = await getAllDealers();

    // Get admin emails to filter them out from dealer list
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];

    // Transform the data to match the expected interface and filter out admin emails
    const transformedDealers = dealers
      .filter((dealer: { email: string }) => !adminEmails.includes(dealer.email))
      .map((dealer: {
        id: string;
        clerkUserId: string;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
      }) => ({
        id: dealer.id,
        clerkUserId: dealer.clerkUserId,
        name: dealer.name,
        email: dealer.email,
        role: dealer.role,
        createdAt: dealer.createdAt.toISOString(),
      }));

    // Update cache
    dealersCache = transformedDealers;
    lastCacheTime = now;

    return transformedDealers;
  } catch (error) {
    console.error('Error fetching dealers:', error);
    throw error;
  }
} 