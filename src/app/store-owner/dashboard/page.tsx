"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Car,
  Package, 
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Clock,
  AlertCircle,
  FileText,
  Settings,
  Eye,
  ShoppingCart,
  PoundSterling,
  Receipt,
  ChevronDown,
  X
} from "lucide-react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { createOrGetDealer } from "@/lib/database";
import { useOptimizedDashboardAnalytics } from "@/hooks/useOptimizedDashboardAnalytics";
import { useAuthTest } from "@/hooks/useAuthTest";
import { useCacheManagement } from "@/hooks/useCacheManagement";
import AuthErrorScreen from "@/components/auth/AuthErrorScreen";
import DashboardSkeleton from "@/components/shared/DashboardSkeleton";
import ProgressiveLoader from "@/components/shared/ProgressiveLoader";

// Currency formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format percentage
const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// Format number with commas
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-GB').format(num);
};

export default function EnhancedStoreOwnerDashboard() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [inventoryDropdownOpen, setInventoryDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshSkeleton, setShowRefreshSkeleton] = useState(false); // Show skeleton during forced refresh
  const [refreshError, setRefreshError] = useState<string | null>(null); // Track refresh errors
  const [userRole, setUserRole] = useState<string>('');
  const [userType, setUserType] = useState<string>('');
  const [initializationComplete, setInitializationComplete] = useState(false); // FIXED: Prevent multiple initializations
  const roleChangeInProgress = useRef(false); // FIXED: Prevent concurrent role changes
  const dealerCreationInProgress = useRef(false); // NEW: Prevent multiple dealer creation calls
  const initializationStarted = useRef(false); // FIXED: Add flag to prevent multiple initialization attempts
  const initializationTimeout = useRef<NodeJS.Timeout | null>(null); // FIXED: Add timeout to prevent infinite loading
  
  // Fetch real dashboard analytics using optimized hook for instant cache display
  const { 
    data: analytics, 
    loading: analyticsLoading, 
    error: analyticsError, 
    loadingState,
    cacheStatus,
    refetch: refetchAnalytics
  } = useOptimizedDashboardAnalytics();
  
  // Test AutoTrader authentication - only run after initialization is complete
  const { data: authTest, isLoading: authTestLoading, refetch: refetchAuthTest } = useAuthTest(initializationComplete);
  
  // Initialize cache management for user isolation
  useCacheManagement();

  // Helper functions for inventory management actions
  const handleInventoryAction = (action: string) => {
    setInventoryDropdownOpen(false);
    
    switch (action) {
      case 'view-all':
        router.push('/inventory');
        break;
      case 'view-mystock':
        router.push('/mystock');
        break;
      default:
        break;
    }
  };

  // Authentication check - FIXED: Removed initializationComplete from dependencies to prevent loops
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
    
    // FIXED: Prevent multiple initialization runs
    if (initializationComplete) {
      console.log('🛡️ Dashboard already initialized, ensuring loading is false...');
      setLoading(false);
      return;
    }
    
    if (initializationStarted.current) {
      console.log('🛡️ Dashboard initialization in progress, waiting...');
      return;
    }
    
    // Mark initialization as started
    initializationStarted.current = true;
    
    // FIXED: Set a timeout to prevent infinite loading (30 seconds max)
    initializationTimeout.current = setTimeout(() => {
      if (!initializationComplete) {
        console.log('⏰ Dashboard initialization timeout - forcing completion');
        setLoading(false);
        setInitializationComplete(true);
      }
    }, 30000); // 30 seconds timeout
    
    const initializeDashboard = async () => {
      try {
        if (user) {
          // Get user metadata to determine role and type
          const role = user.publicMetadata?.role as string || '';
          const type = user.publicMetadata?.userType as string || '';
          
          console.log('🔍 === DASHBOARD USER AUTHENTICATION ===');
          console.log('👤 User ID:', user.id);
          console.log('👤 User role:', role);
          console.log('🏷️ User type:', type);
          console.log('📧 User email:', user.emailAddresses[0]?.emailAddress);
          console.log('📋 Full metadata:', user.publicMetadata);
          console.log('=== END USER AUTH ===');
          
          // Handle role-based logic
          let finalRole = role;
          let finalType = type;
          
          // If no metadata is set, treat as store owner (fallback for existing users)
          if (!role && !type) {
            console.log('⚠️ No role/type metadata found - defaulting to store_owner');
            finalRole = 'store_owner';
            finalType = 'store_owner';
          }
          
          // If type is team_member but no role, default to employee
          if (type === 'team_member' && !role) {
            console.log('⚠️ Team member without role - defaulting to employee');
            finalRole = 'employee';
          }
          
          // Role validation complete
          console.log('✅ Role assignment validated:', { role: finalRole, type: finalType });
          
          setUserRole(finalRole);
          setUserType(finalType);
          
          console.log('🎯 Final role assignment:', { role: finalRole, type: finalType });
          
          // CRITICAL: Check if user is a team member via API call (server-side)
          console.log('🔍 Checking if user is a team member in database...');
          let isTeamMemberInDB = false;
          try {
            const response = await fetch('/api/check-team-member', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.emailAddresses[0]?.emailAddress || '' })
            });
            const result = await response.json();
            isTeamMemberInDB = result.isTeamMember || false;
            console.log('📋 Team member check result:', { isTeamMemberInDB, email: user.emailAddresses[0]?.emailAddress });
          } catch (apiError) {
            console.error('❌ Error checking team member status via API:', apiError);
            // Fallback: if API fails, rely on metadata only
            isTeamMemberInDB = false;
          }
          
          // Check if user is admin (admin emails should NOT have dealer records)
          const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
          const userEmail = user.emailAddresses[0]?.emailAddress || '';
          const isAdmin = adminEmails.includes(userEmail);
          
          // Determine if user needs dealer record (Store Owner OR Dealer Admin, but NOT team members or admins)
          const needsDealerRecord = (
            (finalType === 'store_owner' || 
            !finalType || 
            finalRole === 'store_owner_admin') &&
            finalType !== 'team_member' && // Explicitly exclude team members by metadata
            !isTeamMemberInDB && // CRITICAL: Also exclude if found in team_members table
            !isAdmin // CRITICAL: Exclude admin emails from dealer creation
          );
          

          
          console.log('🔍 Admin check:', { userEmail, isAdmin, adminEmails });
          console.log('🏢 Needs dealer record:', needsDealerRecord);
          
          if (needsDealerRecord) {
            // CRITICAL: Prevent multiple dealer creation calls
            if (dealerCreationInProgress.current) {
              console.log('🚫 Dealer creation already in progress - skipping dealer creation but completing initialization');
              // Don't return early - still complete the initialization
            } else {
            
            dealerCreationInProgress.current = true;
            
            try {
              console.log('🔄 Creating/getting dealer record...');
              const userName = user.fullName || 
                              `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                              user.emailAddresses[0]?.emailAddress?.split('@')[0] || 
                              'Store Owner';
              
              await createOrGetDealer(
                user.id,
                userName,
                user.emailAddresses[0]?.emailAddress || ''
              );
              console.log('✅ Dealer record creation/retrieval completed');
            } catch (dealerError) {
              // FIXED: Handle dealer creation errors properly
              console.error('❌ Error creating/getting dealer record:', dealerError);
              // Continue with initialization even if dealer creation fails
              // This handles cases like admin emails that shouldn't have dealer records
            } finally {
              dealerCreationInProgress.current = false;
            }
            }
          } else {
            console.log('👥 Team member - no dealer record needed');
          }
          
          setLoading(false);
          setInitializationComplete(true); // FIXED: Mark initialization as complete
          
          // FIXED: Clear timeout on successful completion
          if (initializationTimeout.current) {
            clearTimeout(initializationTimeout.current);
            initializationTimeout.current = null;
          }
        } else {
          // FIXED: Handle case when user is null or undefined
          console.log('⚠️ User object is null/undefined - completing initialization anyway');
          setLoading(false);
          setInitializationComplete(true);
          
          // FIXED: Clear timeout
          if (initializationTimeout.current) {
            clearTimeout(initializationTimeout.current);
            initializationTimeout.current = null;
          }
        }
      } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        setLoading(false);
        setInitializationComplete(true); // FIXED: Mark as complete even on error
        
        // FIXED: Clear timeout on error
        if (initializationTimeout.current) {
          clearTimeout(initializationTimeout.current);
          initializationTimeout.current = null;
        }
      }
    };

    // Only run initialization once when conditions are met
    if (!initializationComplete && !initializationStarted.current) {
      initializeDashboard();
    }
    
    // FIXED: Cleanup timeout on unmount
    return () => {
      if (initializationTimeout.current) {
        clearTimeout(initializationTimeout.current);
        initializationTimeout.current = null;
      }
    };
  }, [isLoaded, isSignedIn, user, router]); // FIXED: Removed initializationComplete from dependencies to prevent infinite loops

  // FIXED: Ensure loading is set to false when initialization is complete
  useEffect(() => {
    if (initializationComplete && loading) {
      console.log('🔧 Initialization complete but loading still true - fixing...');
      setLoading(false);
    }
  }, [initializationComplete, loading]);

  // FIXED: Fallback to ensure loading is disabled when Clerk is loaded and user is available
  useEffect(() => {
    if (isLoaded && user && loading && !initializationStarted.current) {
      console.log('🔧 Clerk loaded and user available but initialization never started - forcing completion...');
      setLoading(false);
      setInitializationComplete(true);
    }
  }, [isLoaded, user, loading]);

  // FIXED: Ensure loading disappears when analytics data is successfully loaded
  useEffect(() => {
    if (analytics && loading && isLoaded && user) {
      console.log('🔧 Analytics data loaded but still showing loading screen - fixing...');
      setLoading(false);
      setInitializationComplete(true);
    }
  }, [analytics, loading, isLoaded, user, initializationComplete]);

  // Automatic role change detection
  useEffect(() => {
    if (!user || !isLoaded) return;

    const checkRoleChanges = () => {
      // FIXED: Prevent concurrent role change processing
      if (roleChangeInProgress.current) {
        console.log('🛡️ Role change already in progress, skipping...');
        return;
      }
      
      const currentRole = user.publicMetadata?.role as string || '';
      const currentType = user.publicMetadata?.userType as string || '';
      
      // Only update if there's an actual change
      if (currentRole !== userRole || currentType !== userType) {
        roleChangeInProgress.current = true; // FIXED: Mark as in progress
        console.log('🔄 Automatic role change detected:', {
          roleChange: { from: userRole, to: currentRole },
          typeChange: { from: userType, to: currentType }
        });
        
        setUserRole(currentRole);
        setUserType(currentType);
        
        // FIXED: Only reload for ACTUAL role changes, not initial setup
        // Prevent reload when transitioning from empty state to default role
        const isInitialRoleSetup = (userRole === '' && (currentRole === 'store_owner' || currentRole === 'employee'));
        const isSignificantRoleChange = currentRole !== userRole && userRole !== '' && !isInitialRoleSetup;
        
        if (isSignificantRoleChange) {
          console.log('🔄 Significant role change detected - reloading for clean state...');
          console.log('📊 Role change details:', {
            from: userRole,
            to: currentRole,
            isInitialSetup: isInitialRoleSetup,
            shouldReload: isSignificantRoleChange
          });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          console.log('✅ Role change handled without reload:', {
            from: userRole,
            to: currentRole,
            isInitialSetup: isInitialRoleSetup,
            shouldReload: isSignificantRoleChange
          });
        }
        
        // FIXED: Reset the progress flag after processing
        setTimeout(() => {
          roleChangeInProgress.current = false;
        }, 100);
      }
    };

    // Check immediately
    checkRoleChanges();

    // FIXED: Reduce frequency to prevent excessive checking
    // Set up periodic checking every 30 seconds instead of 5 seconds
    const interval = setInterval(checkRoleChanges, 30000);

    return () => clearInterval(interval);
  }, [user?.id, user?.publicMetadata, isLoaded, userRole, userType, user]); // FIXED: Keep dependencies but prevent infinite loop with guards

  // Extract data from analytics - focus on data completeness
  const hasInventory = analytics?.summary?.hasInventory || false;
  
  // Inventory data
  const totalInventory = analytics?.inventory?.overview?.totalVehicles || 0;
  const totalInventoryValue = analytics?.inventory?.overview?.totalValue || 0;
  const avgInventoryPrice = analytics?.inventory?.overview?.averagePrice || 0;
  const avgDaysInStock = analytics?.inventory?.overview?.averageDaysInStock || 0;
  const avgYear = analytics?.inventory?.overview?.averageYear || 0;
  
  // Data completeness overview
  const missingDataOverview = analytics?.dataCompleteness?.overview || {
    totalStock: 0,
    missingChecklist: 0,
    missingSaleDetails: 0,
    missingCosts: 0,
    missingMargins: 0,
    missingInventoryDetails: 0,
    missingInvoices: 0
  };
  

  const handleRefresh = async () => {
    setRefreshing(true);
    setShowRefreshSkeleton(true); // Show skeleton loading - hide old data
    setRefreshError(null); // Clear any previous errors
    console.log('🔄 Dashboard refresh - fetching fresh data from AutoTrader...');
    
    try {
      // Force refresh from AutoTrader API - GUARANTEED FRESH DATA
      console.log('📡 Calling stock refresh API to fetch fresh data from AutoTrader...');
      const refreshResponse = await fetch('/api/stock/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageSize: 100 // Fetch all data
        })
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Refresh failed with status: ${refreshResponse.status}`);
      }

      const refreshData = await refreshResponse.json();
      console.log('✅ Fresh data fetched from AutoTrader:', {
        totalResults: refreshData.data?.pagination?.totalResults,
        refreshedAt: refreshData.data?.cache?.refreshedAt,
        forceRefresh: refreshData.data?.cache?.forceRefresh
      });

      // Re-check user metadata automatically
      if (user) {
        const role = user.publicMetadata?.role as string || '';
        const type = user.publicMetadata?.userType as string || '';
        
        console.log('🔄 Checking latest metadata:', { role, type });
        
        // Check if role has changed
        const roleChanged = role !== userRole;
        const typeChanged = type !== userType;
        
        if (roleChanged || typeChanged) {
          console.log('🎭 Role/type change detected during refresh:', { 
            roleChange: { from: userRole, to: role },
            typeChange: { from: userType, to: type }
          });
          
          // Update state immediately
          setUserRole(role);
          setUserType(type);
          
          // FIXED: Only reload for ACTUAL role changes, not initial setup
          const isInitialRoleSetup = (userRole === '' && (role === 'store_owner' || role === 'employee'));
          const isSignificantRoleChange = roleChanged && userRole !== '' && !isInitialRoleSetup;
          
          if (isSignificantRoleChange) {
            console.log('🔄 Significant role change during refresh - reloading for clean state...');
            console.log('📊 Refresh role change details:', {
              from: userRole,
              to: role,
              isInitialSetup: isInitialRoleSetup,
              shouldReload: isSignificantRoleChange
            });
            // Give a brief moment for state updates, then reload
            setTimeout(() => {
              window.location.reload();
            }, 500);
            return;
          } else {
            console.log('✅ Role change during refresh handled without reload:', {
              from: userRole,
              to: role,
              isInitialSetup: isInitialRoleSetup,
              shouldReload: isSignificantRoleChange
            });
          }
        }
      }
      
      // Refresh analytics data after fresh stock data is fetched
      console.log('🔄 Refreshing dashboard analytics with fresh data...');
      await refetchAnalytics();
      console.log('✅ Dashboard analytics refreshed with fresh data');
      setRefreshError(null); // Clear any errors
      
    } catch (error) {
      console.error('❌ Error during stock refresh:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data from AutoTrader';
      setRefreshError(errorMessage);
      
      // Fallback to regular analytics refresh if stock refresh fails
      try {
        console.log('⚠️ Falling back to cached analytics data...');
        await refetchAnalytics();
        console.log('✅ Dashboard analytics refreshed (fallback - using cached data)');
      } catch (fallbackError) {
        console.error('❌ Fallback refresh also failed:', fallbackError);
      }
    } finally {
      setRefreshing(false);
      // Delay hiding skeleton slightly to show the data has loaded
      setTimeout(() => setShowRefreshSkeleton(false), 300);
    }
  };

  // Authentication error state - show error screen if auth test fails
  if (initializationComplete && authTest && !authTest.authenticated && authTest.error) {
    return (
      <AuthErrorScreen 
        error={authTest.error}
        onRetry={() => refetchAuthTest()}
        isRetrying={authTestLoading}
      />
    );
  }

  // Show skeleton loading for initial load only (when no cached data exists)
  if ((!isLoaded || loading) && loadingState === 'initial') {
    return (
      <>
        <Header />
        <DashboardSkeleton />
        <Footer />
      </>
    );
  }

  // Show skeleton loading during FORCED REFRESH (user clicked refresh button)
  // This provides clean loading experience - no stale data shown
  if (showRefreshSkeleton) {
    return (
      <>
        <Header />
        <div className="pt-16 min-h-screen bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-full px-4 lg:px-6 xl:px-8 py-4">
            {/* Refresh message banner */}
            <div className="mb-6 p-4 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <div>
                <p className="font-semibold">Refreshing from AutoTrader...</p>
                <p className="text-sm opacity-80">Fetching latest vehicle data and updating analytics (this may take 8-12 seconds)</p>
              </div>
            </div>
            
            <DashboardSkeleton showWelcomeHeader={false} />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Progressive loading - show layout first, then data
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white">
              Loading Dashboard
            </h3>
            <p className="text-slate-500 dark:text-white">
              Preparing your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard layout even if analytics are still loading
  const showProgressiveLoading = (analyticsLoading && loadingState === 'initial') || authTestLoading;

  // Error state
  if (analyticsError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white">
              Error Loading Dashboard
            </h3>
            <p className="text-slate-500 dark:text-white">
              Failed to load analytics data. Please try refreshing.
            </p>
            <Button onClick={handleRefresh} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Current user state
  console.log('📊 Dashboard loaded:', { role: userRole, type: userType });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      
      <div className="pt-16 pb-6">
        <ProgressiveLoader
          loadingState={loadingState}
          hasData={analytics?.summary?.hasInventory || false}
          fallback={
            <DashboardSkeleton 
              showWelcomeHeader={false} // Header is already rendered above
            />
          }
        >
        {/* Enhanced Professional Header */}
        <section className="w-full">
          <div className="container mx-auto max-w-full px-4 lg:px-6 xl:px-8 py-4">
            
            {/* Refresh Error Notification - Shows when refresh fails but cached data is displayed */}
            {refreshError && (
              <div className="mb-6 p-4 rounded-lg border bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-300">
                      Refresh Failed
                    </p>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80">
                      {refreshError} - Showing cached data instead. Please try refreshing again later.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Try Again
                  </Button>
                  <button
                    onClick={() => setRefreshError(null)}
                    className="p-1 rounded-md transition-colors hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30 dark:text-red-400"
                    aria-label="Dismiss error"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Welcome Header Section - Full Width */}
            <div className="w-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-black rounded-2xl shadow-xl border border-slate-600 dark:border-slate-700 mb-2">
              <div className="p-4 md:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-white/20 dark:bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 dark:border-white/20">
                        <BarChart3 className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                          Welcome, {user?.firstName || user?.fullName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User'}!
                        </h1>
                        <p className="text-slate-200 dark:text-white text-base md:text-lg leading-relaxed">
                          Track and manage your inventory data completeness across all stock actions
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          {userType === 'team_member' && userRole !== 'store_owner_admin' && (
                            <div className="px-3 py-1 bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-full backdrop-blur-sm">
                              <span className="text-white text-sm font-medium">
                                {userRole === 'sales' ? '💼 Sales Team' : '👤 Staff Member'}
                              </span>
                            </div>
                          )}
                          {userRole === 'store_owner_admin' && (
                            <div className="px-3 py-1 bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-full backdrop-blur-sm">
                              <span className="text-white text-sm font-medium">
                                👑 Dealer Admin
                              </span>
                            </div>
                          )}
                          <div className="px-3 py-1 bg-green-500/20 dark:bg-green-400/20 border border-green-300/50 dark:border-green-400/30 rounded-full backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-white">
                              <div className="w-2 h-2 bg-green-300 dark:bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-sm font-medium">Live Data</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                    <Button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/40 backdrop-blur-sm transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Enhanced Business Intelligence Section */}
        <section className="py-6 px-4 lg:px-6 xl:px-8">
          <div className="container mx-auto max-w-full">
            
            {/* Data Completeness Overview Cards */}
            {showProgressiveLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-4">
                {/* Loading skeleton cards */}
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <CardContent className="p-3">
                      <div className="animate-pulse">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                          <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : hasInventory && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-4">
                {[
                  {
                    title: "Total Inventory",
                    value: formatNumber(totalInventory),
                    change: `${formatCurrency(totalInventoryValue)} value`,
                    changeType: 'neutral',
                    icon: Car,
                    color: "blue",
                    description: "Vehicles in stock"
                  },
                  {
                    title: "Missing Checklists",
                    value: formatNumber(missingDataOverview.missingChecklist),
                    change: `${formatPercentage((totalInventory - missingDataOverview.missingChecklist) / totalInventory * 100)} complete`,
                    changeType: missingDataOverview.missingChecklist === 0 ? 'positive' : missingDataOverview.missingChecklist < totalInventory * 0.2 ? 'neutral' : 'negative',
                    icon: FileText,
                    color: missingDataOverview.missingChecklist === 0 ? "emerald" : missingDataOverview.missingChecklist < totalInventory * 0.2 ? "orange" : "red",
                    description: "Vehicles without checklists"
                  },
                  {
                    title: "Missing Purchase Info",
                    value: formatNumber(missingDataOverview.missingInventoryDetails),
                    change: `${formatPercentage((totalInventory - missingDataOverview.missingInventoryDetails) / totalInventory * 100)} complete`,
                    changeType: missingDataOverview.missingInventoryDetails === 0 ? 'positive' : missingDataOverview.missingInventoryDetails < totalInventory * 0.2 ? 'neutral' : 'negative',
                    icon: ShoppingCart,
                    color: missingDataOverview.missingInventoryDetails === 0 ? "emerald" : missingDataOverview.missingInventoryDetails < totalInventory * 0.2 ? "orange" : "red",
                    description: "Vehicles without purchase details"
                  },
                  {
                    title: "Missing Costs",
                    value: formatNumber(missingDataOverview.missingCosts),
                    change: `${formatPercentage((totalInventory - missingDataOverview.missingCosts) / totalInventory * 100)} complete`,
                    changeType: missingDataOverview.missingCosts === 0 ? 'positive' : missingDataOverview.missingCosts < totalInventory * 0.2 ? 'neutral' : 'negative',
                    icon: PoundSterling,
                    color: missingDataOverview.missingCosts === 0 ? "emerald" : missingDataOverview.missingCosts < totalInventory * 0.2 ? "orange" : "red",
                    description: "Vehicles without cost information"
                  },
                  {
                    title: "Missing Sale Details",
                    value: formatNumber(missingDataOverview.missingSaleDetails),
                    change: `${formatPercentage(analytics?.dataCompleteness?.byDataType?.find(item => item.type === 'Sale Details')?.percentage || 0)} complete`,
                    changeType: missingDataOverview.missingSaleDetails === 0 ? 'positive' : missingDataOverview.missingSaleDetails < (analytics?.dataCompleteness?.byDataType?.find(item => item.type === 'Sale Details')?.complete || 0) * 0.2 ? 'neutral' : 'negative',
                    icon: Receipt,
                    color: missingDataOverview.missingSaleDetails === 0 ? "emerald" : missingDataOverview.missingSaleDetails < (analytics?.dataCompleteness?.byDataType?.find(item => item.type === 'Sale Details')?.complete || 0) * 0.2 ? "orange" : "red",
                    description: "Sold vehicles without sale information"
                  },

                ].map((metric, index) => {
                const colorClasses = {
                  emerald: 'from-emerald-500 to-emerald-600 text-white',
                  blue: 'from-blue-500 to-blue-600 text-white',
                  purple: 'from-purple-500 to-purple-600 text-white',
                  orange: 'from-orange-500 to-orange-600 text-white',
                  red: 'from-red-500 to-red-600 text-white'
                };
                
                const changeColorClasses = {
                  positive: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
                  negative: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
                  neutral: 'text-slate-600 dark:text-white bg-slate-50 dark:bg-slate-700'
                };

                // Map card titles to their respective routes
                const getCardRoute = (title: string) => {
                  switch (title) {
                    case "Total Inventory":
                      return "/inventory";
                    case "Missing Checklists":
                      return "/stock-actions/checklist";
                    case "Missing Purchase Info":
                      return "/stock-actions/purchase-info";
                    case "Missing Costs":
                      return "/stock-actions/costs";
                    case "Missing Sale Details":
                      return "/stock-actions/sale-details";
                    default:
                      return null;
                  }
                };

                const handleCardClick = (title: string) => {
                  const route = getCardRoute(title);
                  if (route) {
                    router.push(route);
                  }
                };

                const isClickable = getCardRoute(metric.title) !== null;
                
                return (
                  <Card 
                    key={index} 
                    className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 group ${isClickable ? 'cursor-pointer hover:scale-105' : ''}`}
                    onClick={() => isClickable && handleCardClick(metric.title)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[metric.color as keyof typeof colorClasses]} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                          {React.createElement(metric.icon, { className: "w-5 h-5" })}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${changeColorClasses[metric.changeType as keyof typeof changeColorClasses]}`}>
                          {metric.changeType === 'positive' && <ArrowUp className="w-3 h-3 inline mr-1" />}
                          {metric.changeType === 'negative' && <ArrowDown className="w-3 h-3 inline mr-1" />}
                          {metric.change}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-white mb-1 font-medium">{metric.title}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">{metric.value}</p>
                        <p className="text-xs text-slate-500 dark:text-white">{metric.description}</p>
                        {isClickable && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium">Click to manage →</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            )}
            
            {/* Quick Stats Row - Only show if we have inventory */}
            {hasInventory && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-6 h-6 text-blue-500" />
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-white">Avg Vehicle Age</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{new Date().getFullYear() - avgYear} years</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-6 h-6 text-purple-500" />
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-white">Avg Days in Stock</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(avgDaysInStock)} days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-white">Average Price</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(avgInventoryPrice)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Analytics Charts - Only show relevant sections */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              
              {/* Inventory Breakdown Chart - Always show if we have inventory */}
              {hasInventory && (
                <Card className="xl:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                            Inventory by Make
                          </CardTitle>
                          <CardDescription className="text-slate-600 dark:text-white text-sm">
                            Vehicle distribution by manufacturer
                          </CardDescription>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {analytics?.inventory.byMake && analytics.inventory.byMake.length > 0 ? (
                      <div className="space-y-4">
                        {analytics.inventory.byMake.slice(0, 8).map((make, index) => {
                          const maxCount = Math.max(...analytics.inventory.byMake.map(m => m.count));
                          const percentage = maxCount > 0 ? (make.count / maxCount) * 100 : 0;
                          const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'];
                          
                          return (
                            <div key={index} className="relative">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${colors[index % colors.length]}`}>
                                    {make.make.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">{make.make}</p>
                                    <p className="text-xs text-slate-500 dark:text-white">{formatNumber(make.count)} vehicles</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(make.totalValue)}</p>
                                  <p className="text-xs text-slate-500 dark:text-white">{formatCurrency(make.avgPrice)} avg</p>
                                </div>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-1000 ${colors[index % colors.length]}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-white">
                        <div className="text-center">
                          <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No inventory breakdown available</p>
                          <p className="text-sm">Add vehicles to see distribution</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Inventory Status Chart - Only show if we have inventory */}
              {hasInventory && (
                <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                          <PieChart className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                            Inventory Status
                          </CardTitle>
                          <CardDescription className="text-slate-600 dark:text-white text-sm">
                            Current stock distribution
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu open={inventoryDropdownOpen} onOpenChange={setInventoryDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Settings className="w-3 h-3 mr-1" />
                            Manage
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Inventory Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleInventoryAction('view-all')}>
                            <Eye className="w-4 h-4 mr-2" />
                            View All Inventory
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleInventoryAction('view-mystock')}>
                            <Package className="w-4 h-4 mr-2" />
                            My Stock
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {analytics?.inventory.byStatus && analytics.inventory.byStatus.length > 0 ? (
                    <>
                      <div className="flex items-center justify-center mb-6">
                        {/* Enhanced Donut Chart */}
                        <div className="relative w-40 h-40">
                          <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 42 42">
                            {/* Background circle */}
                            <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="1.5" className="dark:stroke-slate-700"/>
                            
                            {/* Dynamic status segments */}
                            {analytics.inventory.byStatus.map((statusItem, index) => {
                              const percentage = totalInventory > 0 ? (statusItem.count / totalInventory) * 100 : 0;
                              const strokeDasharray = `${percentage} ${100 - percentage}`;
                              const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
                              const offset = analytics.inventory.byStatus
                                .slice(0, index)
                                .reduce((sum, item) => sum + (totalInventory > 0 ? (item.count / totalInventory) * 100 : 0), 0);
                              
                              return (
                                <circle
                                  key={index}
                                  cx="21"
                                  cy="21"
                                  r="15.91549430918954"
                                  fill="transparent"
                                  stroke={colors[index % colors.length]}
                                  strokeWidth="6"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={25 - offset}
                                  className="transition-all duration-1000 hover:stroke-8"
                                />
                              );
                            })}
                          </svg>
                          
                          {/* Enhanced Center content */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center bg-white dark:bg-slate-800 rounded-full w-20 h-20 flex items-center justify-center shadow-xl border-4 border-slate-100 dark:border-slate-700">
                              <div>
                                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(totalInventory)}</p>
                                <p className="text-xs text-slate-500 dark:text-white font-medium">Total</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Enhanced Legend */}
                      <div className="space-y-3">
                        {analytics.inventory.byStatus.map((statusItem, index) => {
                          const percentage = totalInventory > 0 ? (statusItem.count / totalInventory) * 100 : 0;
                          const colors = [
                            { bg: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-900/20' },
                            { bg: 'bg-blue-500', text: 'text-blue-700', bgLight: 'bg-blue-50', bgDark: 'bg-blue-900/20' },
                            { bg: 'bg-amber-500', text: 'text-amber-700', bgLight: 'bg-amber-50', bgDark: 'bg-amber-900/20' },
                            { bg: 'bg-red-500', text: 'text-red-700', bgLight: 'bg-red-50', bgDark: 'bg-red-900/20' },
                            { bg: 'bg-purple-500', text: 'text-purple-700', bgLight: 'bg-purple-50', bgDark: 'bg-purple-900/20' }
                          ];
                          const colorSet = colors[index % colors.length];
                          
                          return (
                            <div key={index} className={`flex items-center justify-between p-3 ${colorSet.bgLight} dark:${colorSet.bgDark} rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-sm transition-shadow duration-200`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${colorSet.bg}`}></div>
                                <span className={`text-sm font-medium ${colorSet.text} dark:text-white capitalize`}>{statusItem.status}</span>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(statusItem.count)}</span>
                                  <span className={`text-xs ${colorSet.text} dark:text-white font-medium`}>
                                    ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-white">{formatCurrency(statusItem.value)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                                      ) : (
                      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-white">
                        <div className="text-center">
                          <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No status data available</p>
                          <p className="text-sm">Vehicle status will appear here</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Data Sections - Only show what we have */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              


            </div>
            
            {/* No Data State - Show if we have no data at all */}
            {!hasInventory && (
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <CardContent className="p-12">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                      <BarChart3 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Welcome to Your Dashboard
                    </h3>
                    <p className="text-slate-600 dark:text-white mb-6 max-w-md mx-auto">
                      Your dashboard will populate with data as you add inventory, make sales, and track costs. Start by adding some vehicles to your inventory.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Car className="w-4 h-4 mr-2" />
                        Add Inventory
                      </Button>
                      <Button variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        View Guide
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
        </ProgressiveLoader>
      </div>
      
      <Footer />

    </div>
  );
} 