'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

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
  const [stats, setStats] = useState<DVLAStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [batchSize, setBatchSize] = useState(3);

  // Fetch current statistics
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/dvla/batch-process');
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Process a single batch
  const processBatch = async (forceRefresh = false) => {
    try {
      const response = await fetch('/api/dvla/batch-process', {
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

      const data = await response.json();
      if (data.success) {
        setResults(prev => [...prev, data.data]);
        setTotalProcessed(prev => prev + data.data.processed);
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

      while (continuProcessing && batchCount < 50) { // Safety limit
        console.log(`Processing batch ${batchCount + 1}...`);
        
        const result = await processBatch(forceRefresh);
        batchCount++;

        // If no vehicles were processed, we're done
        if (result.processed === 0) {
          continuProcessing = false;
        }

        // Wait 10 seconds between batches to respect rate limits and avoid timeouts
        if (continuProcessing) {
          console.log('⏳ Waiting 10 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      // Refresh stats when done
      await fetchStats();
      
    } catch (error) {
      console.error('Error processing vehicles:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate progress percentage
  const getProgress = () => {
    if (!stats) return 0;
    return Math.round((stats.withDVLAData / stats.totalVehicles) * 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DVLA MOT Data Sync</h1>
          <p className="text-muted-foreground">
            Sync MOT status and expiry dates for all vehicles from DVLA
          </p>
        </div>
        <Button 
          onClick={fetchStats} 
          disabled={isLoadingStats}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>
            Overview of MOT data coverage in your vehicle database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalVehicles}</div>
                  <div className="text-sm text-muted-foreground">Total Vehicles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.withDVLAData}</div>
                  <div className="text-sm text-muted-foreground">With MOT Data</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.needingRefresh}</div>
                  <div className="text-sm text-muted-foreground">Need Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.expiredMOT}</div>
                  <div className="text-sm text-muted-foreground">Expired MOT</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{getProgress()}%</span>
                </div>
                <Progress value={getProgress()} className="h-2" />
              </div>

              <div className="flex gap-2">
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Valid: {stats.validMOT}
                </Badge>
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Expired: {stats.expiredMOT}
                </Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Unknown: {stats.unknownMOT}
                </Badge>
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
            Fetch MOT data from DVLA for your vehicles
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
              ⚠️ This may take several minutes. Please don't close this page.
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
  );
}
