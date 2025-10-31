'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Shield, Activity, BarChart3 } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import Footer from '@/components/shared/Footer';

interface DVLAStats {
  totalVehicles: number;
  withDVLAData: number;
  needingRefresh: number;
  validMOT: number;
  expiredMOT: number;
  unknownMOT: number;
}

interface ProcessingResult {
  processed: number;
  updated: number;
  errors: number;
  details: Array<{
    stockId: string;
    registration: string;
    success: boolean;
    motStatus?: string;
    motExpiryDate?: string;
    error?: string;
  }>;
}

export default function DVLASyncPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [stats, setStats] = useState<DVLAStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [batchSize, setBatchSize] = useState(3);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        if (isLoaded && !isSignedIn) {
          router.replace('/sign-in');
        }
        return;
      }

      // Check admin access
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
      const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
      
      const isUserAdmin = adminEmails.includes(userEmail);
      
      console.log('🔍 DVLA Sync admin access check:');
      console.log('📧 User email:', userEmail);
      console.log('📋 Admin emails:', adminEmails);
      console.log('✅ Is user admin?', isUserAdmin);
      
      if (!isUserAdmin) {
        setIsAdmin(false);
        setTimeout(() => {
          router.push('/store-owner/dashboard');
        }, 3000);
        return;
      }
      
      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminAccess();
  }, [isLoaded, isSignedIn, user, router]);

  // Fetch current statistics (admin endpoint for all dealers)
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/admin/dvla/batch-process');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data?.stats) {
        setStats(data.data.stats);
        setLastUpdated(new Date());
        console.log('📊 Stats refreshed:', data.data.stats);
      } else {
        console.error('Error fetching stats:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't throw, just log the error so the UI doesn't break
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch stats when admin access is confirmed
  useEffect(() => {
    if (isAdmin && !loading) {
      fetchStats();
    }
  }, [isAdmin, loading, fetchStats]);

  // Auto-refresh stats at intervals
  useEffect(() => {
    if (!isAdmin || !autoRefresh || isProcessing) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing stats...');
      fetchStats();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isAdmin, autoRefresh, refreshInterval, isProcessing, fetchStats]);

  // Process a single batch (admin endpoint for all dealers)
  const processBatch = async (forceRefresh = false) => {
    try {
      const response = await fetch('/api/admin/dvla/batch-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'batch',
          forceRefresh,
          batchSize
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setResults(prev => [...prev, data.data]);
        setTotalProcessed(prev => prev + data.data.processed);
        console.log(`✅ Batch processed: ${data.data.processed} vehicles, ${data.data.updated} updated, ${data.data.errors} errors`);
        return data.data;
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      throw error;
    }
  };

  // Process all vehicles
  const processAllVehicles = async (forceRefresh = false) => {
    setIsProcessing(true);
    setResults([]);
    setTotalProcessed(0);

    try {
      let continuProcessing = true;
      let batchCount = 0;
      let consecutiveEmptyBatches = 0;
      const processedRegistrations = new Set<string>(); // Track processed vehicles for force refresh

      while (continuProcessing && batchCount < 100) { // Safety limit
        console.log(`Processing batch ${batchCount + 1} (forceRefresh: ${forceRefresh})...`);
        
        const result = await processBatch(forceRefresh);
        batchCount++;

        // Track processed registrations for force refresh to avoid reprocessing
        if (forceRefresh && result.details) {
          result.details.forEach((detail: { stockId: string; registration: string; success: boolean; motStatus?: string; motExpiryDate?: string; error?: string }) => {
            if (detail.registration) {
              processedRegistrations.add(detail.registration.toUpperCase().replace(/\s/g, ''));
            }
          });
        }

        // If no vehicles were processed, check if we should continue
        if (result.processed === 0) {
          consecutiveEmptyBatches++;
          // For force refresh, continue until we get 2 consecutive empty batches
          // (since all vehicles might have been processed in previous batches)
          // For normal refresh, stop immediately
          if (forceRefresh) {
            if (consecutiveEmptyBatches >= 2) {
              console.log('✅ No more vehicles to process (2 consecutive empty batches)');
              continuProcessing = false;
            }
          } else {
            console.log('✅ No more vehicles need refresh');
            continuProcessing = false;
          }
        } else {
          consecutiveEmptyBatches = 0; // Reset counter if we processed vehicles
        }

        // Wait 10 seconds between batches to respect rate limits and avoid timeouts
        if (continuProcessing) {
          console.log(`⏳ Waiting 10 seconds before next batch... (Total processed: ${totalProcessed})`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      console.log(`✅ Processing complete. Total batches: ${batchCount}, Total vehicles processed: ${totalProcessed}`);
      
      // Refresh stats when done with a small delay to ensure DB is updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchStats();
      
    } catch (error) {
      console.error('Error processing vehicles:', error);
      alert(`Error processing vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate progress percentage
  const getProgress = () => {
    if (!stats) return 0;
    return Math.round((stats.withDVLAData / stats.totalVehicles) * 100);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
          <div className="mt-6 space-y-2">
            <p className="text-xl font-semibold text-slate-700 dark:text-white">
              Loading DVLA Sync
            </p>
            <p className="text-sm text-slate-500 dark:text-white">
              Verifying admin access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 border-0 shadow-xl rounded-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
              Access Restricted
            </h1>
            <p className="text-slate-600 dark:text-white mb-4">
              Administrative privileges required to access DVLA sync
            </p>
            <p className="text-sm text-slate-500 dark:text-white">
              Redirecting to store owner dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <AdminHeader />
      
      <div className="pt-16">
        <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">DVLA MOT Data Sync (Admin)</h1>
          <p className="text-muted-foreground">
            Sync MOT status and expiry dates for ALL vehicles across ALL dealers from DVLA
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {autoRefresh && ` • Auto-refreshing every ${refreshInterval}s`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
          </div>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm dark:bg-slate-800"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={120}>2m</option>
            </select>
          )}
          <Button 
            onClick={fetchStats} 
            disabled={isLoadingStats}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>
        </div>
      </div>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Live Vehicle Counts & Status
              </CardTitle>
              <CardDescription>
                Real-time overview of MOT data coverage across ALL dealers in the database
              </CardDescription>
            </div>
            {autoRefresh && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-4 w-4 animate-pulse text-green-600" />
                <span>Live</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading statistics...</p>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="text-3xl font-bold">{stats.totalVehicles.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Vehicles</div>
                  <div className="text-xs text-muted-foreground mt-1">All active vehicles</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="text-3xl font-bold text-green-600">{stats.withDVLAData.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">With MOT Data</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.totalVehicles > 0 
                      ? `${Math.round((stats.withDVLAData / stats.totalVehicles) * 100)}% coverage`
                      : '0% coverage'}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="text-3xl font-bold text-amber-600">{stats.needingRefresh.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">Need Processing</div>
                  <div className="text-xs text-muted-foreground mt-1">Pending refresh</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="text-3xl font-bold text-red-600">{stats.expiredMOT.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">Expired MOT</div>
                  <div className="text-xs text-muted-foreground mt-1">Requires attention</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Data Coverage Progress</span>
                  <span className="font-bold">{getProgress()}%</span>
                </div>
                <Progress value={getProgress()} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 vehicles</span>
                  <span>{stats.totalVehicles.toLocaleString()} vehicles</span>
                </div>
              </div>

              {/* MOT Status Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <Badge variant="secondary" className="p-3 justify-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-bold text-lg">{stats.validMOT.toLocaleString()}</div>
                    <div className="text-xs">Valid MOT</div>
                  </div>
                </Badge>
                <Badge variant="destructive" className="p-3 justify-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-bold text-lg">{stats.expiredMOT.toLocaleString()}</div>
                    <div className="text-xs">Expired MOT</div>
                  </div>
                </Badge>
                <Badge variant="outline" className="p-3 justify-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-bold text-lg">{stats.unknownMOT.toLocaleString()}</div>
                    <div className="text-xs">Unknown Status</div>
                  </div>
                </Badge>
              </div>

              {/* Additional Stats */}
              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Without DVLA Data: </span>
                    <span className="font-semibold">
                      {(stats.totalVehicles - stats.withDVLAData).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Up to Date: </span>
                    <span className="font-semibold text-green-600">
                      {(stats.withDVLAData - stats.needingRefresh).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Button onClick={fetchStats} disabled={isLoadingStats}>
                {isLoadingStats ? 'Loading...' : 'Load Statistics'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Process Vehicles</CardTitle>
          <CardDescription>
            Fetch MOT data from DVLA for ALL vehicles across ALL dealers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Batch Size:</label>
            <select 
              value={batchSize} 
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="border rounded px-2 py-1"
              disabled={isProcessing}
            >
              <option value={3}>3 vehicles</option>
              <option value={5}>5 vehicles</option>
              <option value={10}>10 vehicles</option>
            </select>
            <span className="text-sm text-muted-foreground">
              Smaller batches are safer for rate limits
            </span>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={() => processAllVehicles(false)}
              disabled={isProcessing || !stats || stats.needingRefresh === 0}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing... ({totalProcessed} done)
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Process Pending Vehicles ({stats?.needingRefresh || 0})
                </>
              )}
            </Button>

            <Button 
              onClick={() => processAllVehicles(true)}
              disabled={isProcessing}
              variant="outline"
            >
              Force Refresh All
            </Button>
          </div>

          {isProcessing && (
            <div className="text-sm text-muted-foreground">
              ⚠️ This may take several minutes. Please don&apos;t close this page.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              Results from the latest processing session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Batch {index + 1}</h4>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{result.processed} processed</Badge>
                      <Badge variant="default">{result.updated} updated</Badge>
                      {result.errors > 0 && (
                        <Badge variant="destructive">{result.errors} errors</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {result.details.slice(0, 6).map((detail, i) => (
                      <div key={i} className={`p-2 rounded ${detail.success ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="font-medium">{detail.registration}</div>
                        <div className="text-xs">
                          {detail.success ? (
                            <>MOT: {detail.motStatus} ({detail.motExpiryDate})</>
                          ) : (
                            <>Error: {detail.error}</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
