import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { storeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAutoTraderToken } from '@/lib/autoTraderAuth';
import { getStoreConfigForUser } from '@/lib/storeConfigHelper';
// Removed: import { getAutoTraderBaseUrlForServer } from '@/lib/autoTraderConfig';

// ============================================
// AUTHENTICATION FLOW (Team Member Support)
// ============================================
// This API uses the PROPER authentication flow using getStoreConfigForUser helper:
//
// 1. Get clerkUserId from auth() - identifies the authenticated user ✅
// 2. Use getStoreConfigForUser(userId, email) helper which:
//    a) First checks if user is a TEAM MEMBER ✅
//       - If yes: Gets store owner's dealer ID from teamMembers table
//       - Then gets store owner's email from dealers table
//       - Finally gets store config using store owner's email
//    b) If not team member: Gets store config directly by clerkUserId ✅
// 3. Use the returned storeOwnerEmail for AutoTrader authentication ✅
//
// This ensures:
// ✅ Team members use their store owner's credentials (proper delegation)
// ✅ Store owners use their own credentials
// ✅ Consistent with StockCacheService and other AutoTrader APIs
// ✅ Proper user isolation and security
//
// Example flow:
// Team Member → teamMembers.storeOwnerId → dealers.email → storeConfig → AutoTrader API
// Store Owner → storeConfig (direct) → AutoTrader API
//
// ============================================

// Server-side cache for AutoTrader limits with TTL
interface CachedLimits {
  data: any;
  expiresAt: number;
  lastUpdated: Date;
}

const limitsCache = new Map<string, CachedLimits>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Prevent memory leaks

// Clean up expired cache entries periodically
function cleanupExpiredCache() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of limitsCache.entries()) {
    if (value.expiresAt < now) {
      limitsCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
  }
}

// Cleanup every 10 minutes
setInterval(cleanupExpiredCache, 10 * 60 * 1000);

export async function GET() {
  try {
    console.log('🔍 AutoTrader Limits API: Starting request');
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ AutoTrader Limits API: No user ID found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    console.log('✅ AutoTrader Limits API: User authenticated:', userId);

    // Check cache first
    const cacheKey = `limits_${userId}`;
    const cached = limitsCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      console.log('✅ Returning cached AutoTrader limits', {
        age: Math.round((Date.now() - cached.lastUpdated.getTime()) / 1000),
        expiresIn: Math.round((cached.expiresAt - Date.now()) / 1000)
      });
      
      return NextResponse.json({
        ...cached.data,
        fromCache: true,
        cachedAt: cached.lastUpdated.toISOString()
      });
    }
    
    console.log('🔄 Cache miss or expired, fetching fresh data...');

    // Get store configuration using the proper helper (handles both store owners and team members)
    console.log('🏪 AutoTrader Limits API: Getting store configuration...');
    
    // We need a temporary email to pass to getStoreConfigForUser
    // It will be overridden by the store owner's email if user is a team member
    const tempResult = await db
      .select({ email: storeConfig.email })
      .from(storeConfig)
      .where(eq(storeConfig.clerkUserId, userId))
      .limit(1);
    
    const userEmail = tempResult.length > 0 ? tempResult[0].email : '';
    
    // Use the proper helper that handles team members
    const configResult = await getStoreConfigForUser(userId, userEmail);
    
    if (!configResult.success || !configResult.storeConfig) {
      console.error('❌ AutoTrader Limits API: Failed to get store configuration:', configResult.error);
      return NextResponse.json(
        { success: false, error: configResult.error || 'Store configuration not found - Please contact support' },
        { status: 404 }
      );
    }

    let advertiserId = configResult.storeConfig.advertisementId;
    const storeOwnerEmail = configResult.storeOwnerEmail;
    
    if (!advertiserId) {
      console.error('❌ AutoTrader Limits API: No advertiser ID configured');
      return NextResponse.json(
        { success: false, error: 'Advertiser ID not configured - Please contact support' },
        { status: 400 }
      );
    }

    if (!storeOwnerEmail) {
      console.error('❌ AutoTrader Limits API: No email found for authentication');
      return NextResponse.json(
        { success: false, error: 'Store owner email not found - Please contact support' },
        { status: 400 }
      );
    }

    // Handle case where advertiserId might be stored as JSON array
    if (typeof advertiserId === 'string' && advertiserId.startsWith('[')) {
      try {
        const parsed = JSON.parse(advertiserId);
        if (Array.isArray(parsed) && parsed.length > 0) {
          advertiserId = parsed[0];
          console.log('🔄 AutoTrader Limits API: Parsed advertiser ID from array:', advertiserId);
        }
      } catch (e) {
        console.warn('⚠️ AutoTrader Limits API: Failed to parse advertiser ID as JSON, using as-is' , e);
      }
    }

    console.log('✅ AutoTrader Limits API: Final advertiser ID:', advertiserId);
    console.log('✅ AutoTrader Limits API: Using email for auth:', storeOwnerEmail);

    // Get AutoTrader token for API calls (using store owner's email for auth)
    console.log('🔑 AutoTrader Limits API: Getting AutoTrader token...');
    const authResult = await getAutoTraderToken(storeOwnerEmail);
    if (!authResult.success) {
      console.error('❌ AutoTrader Limits API: AutoTrader authentication failed:', authResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to authenticate with AutoTrader - Please check your API credentials' },
        { status: 401 }
      );
    }

    console.log('✅ AutoTrader Limits API: AutoTrader token obtained');

    // Fetch advertiser data with allowances from AutoTrader API
    const baseUrl = process.env.NEXT_PUBLIC_AUTOTRADER_API_BASE_URL;
    const advertiserUrl = `${baseUrl}/advertisers?autotraderAdvertAllowances=true`;

    console.log('📡 AutoTrader Limits API: Fetching advertiser data from:', advertiserUrl);

    const response = await fetch(advertiserUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authResult.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ AutoTrader Limits API: Failed to fetch advertiser data:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: `Failed to fetch advertiser data from AutoTrader (${response.status})` },
        { status: response.status }
      );
    }

    const advertiserData = await response.json();
    console.log('✅ AutoTrader Limits API: Advertiser data received');
    
    // Find the specific advertiser and calculate limits
    let totalLimit = 0;
    let allowancesData = null;

    console.log('🔍 AutoTrader Limits API: Processing advertiser data...');

    if (advertiserData.results && Array.isArray(advertiserData.results)) {
      console.log('📊 AutoTrader Limits API: Found', advertiserData.results.length, 'advertisers');
      
      // Debug: Log all advertiser IDs to see what's available
      const availableAdvertiserIds = advertiserData.results.map((adv: { advertiserId: string }) => adv.advertiserId);
      console.log('🔍 AutoTrader Limits API: Available advertiser IDs:', availableAdvertiserIds);
      console.log('🎯 AutoTrader Limits API: Looking for advertiser ID:', advertiserId);
      
      const advertiser = advertiserData.results.find((adv: { 
        advertiserId: string;
        autotraderAdvertAllowances?: Array<{
          type?: string;
          vehicleTypes?: string[];
          capacity?: string | number;
        }>;
      }) => adv.advertiserId === advertiserId);
      
      if (advertiser) {
        console.log('✅ AutoTrader Limits API: Found matching advertiser');
        
        if (advertiser.autotraderAdvertAllowances) {
          allowancesData = advertiser.autotraderAdvertAllowances;
          console.log('📋 AutoTrader Limits API: Processing', allowancesData.length, 'allowances');
          
          // Calculate total limit based on Standard and Bargain allowances for Car and Van
          advertiser.autotraderAdvertAllowances.forEach((allowance: {
            type?: string;
            vehicleTypes?: string[];
            capacity?: string | number;
          }, index: number) => {
            console.log(`🔍 AutoTrader Limits API: Allowance ${index + 1}:`, {
              type: allowance.type,
              vehicleTypes: allowance.vehicleTypes,
              capacity: allowance.capacity
            });
            
            if (
              allowance.type && 
              (allowance.type === 'Standard' || allowance.type === 'Bargain') &&
              allowance.vehicleTypes && 
              Array.isArray(allowance.vehicleTypes) &&
              allowance.vehicleTypes.includes('Car') &&
              allowance.vehicleTypes.includes('Van') &&
              allowance.capacity
            ) {
              const capacity = parseInt(String(allowance.capacity)) || 0;
              totalLimit += capacity;
              console.log(`✅ AutoTrader Limits API: Added ${capacity} to total limit (${allowance.type})`);
            } else {
              console.log(`❌ AutoTrader Limits API: Allowance ${index + 1} doesn't meet criteria`);
            }
          });
        } else {
          console.warn('⚠️ AutoTrader Limits API: No allowances found for advertiser');
        }
      } else {
        console.error('❌ AutoTrader Limits API: Advertiser not found in results');
      }
    } else {
      console.error('❌ AutoTrader Limits API: Invalid advertiser data structure');
    }

    console.log('📊 AutoTrader Limits API: Final calculated limit:', totalLimit);

    const responseData = {
      success: true,
      data: {
        advertiserId,
        listingCount: totalLimit,
        allowances: allowancesData,
        lastUpdated: new Date().toISOString()
      },
      fromCache: false
    };

    // Cache the result
    const cacheEntry: CachedLimits = {
      data: responseData,
      expiresAt: Date.now() + CACHE_TTL,
      lastUpdated: new Date()
    };
    
    limitsCache.set(cacheKey, cacheEntry);
    console.log('✅ Cached AutoTrader limits for', CACHE_TTL / 1000, 'seconds');
    
    // Enforce max cache size to prevent memory leaks
    if (limitsCache.size > MAX_CACHE_SIZE) {
      console.warn('⚠️ Cache size exceeded, cleaning oldest entries...');
      const sortedEntries = Array.from(limitsCache.entries())
        .sort((a, b) => a[1].lastUpdated.getTime() - b[1].lastUpdated.getTime());
      
      // Remove oldest 10% of entries
      const removeCount = Math.floor(MAX_CACHE_SIZE * 0.1);
      for (let i = 0; i < removeCount; i++) {
        limitsCache.delete(sortedEntries[i][0]);
      }
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching AutoTrader limits:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
