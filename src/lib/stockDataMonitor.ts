/**
 * Stock Data Monitor - Comprehensive monitoring and debugging for stock data issues
 * 
 * This utility helps track and diagnose "No Stock Data Available" errors by:
 * 1. Monitoring data fetch patterns
 * 2. Tracking authentication states
 * 3. Detecting race conditions
 * 4. Providing diagnostic information
 */

interface StockDataEvent {
  timestamp: Date;
  userId: string;
  eventType: 'fetch_start' | 'fetch_success' | 'fetch_error' | 'auth_change' | 'cache_hit' | 'cache_miss';
  details: any;
  requestId?: string;
}

interface DiagnosticInfo {
  userId: string;
  lastSuccessfulFetch: Date | null;
  consecutiveErrors: number;
  lastError: string | null;
  authenticationStatus: 'unknown' | 'authenticated' | 'unauthenticated' | 'expired';
  advertiserIdStatus: 'unknown' | 'configured' | 'missing' | 'invalid';
  cacheStatus: 'unknown' | 'fresh' | 'stale' | 'empty';
  recentEvents: StockDataEvent[];
}

class StockDataMonitor {
  private static instance: StockDataMonitor;
  private events: Map<string, StockDataEvent[]> = new Map();
  private diagnostics: Map<string, DiagnosticInfo> = new Map();
  private readonly MAX_EVENTS_PER_USER = 50;
  private readonly MAX_DIAGNOSTIC_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): StockDataMonitor {
    if (!StockDataMonitor.instance) {
      StockDataMonitor.instance = new StockDataMonitor();
    }
    return StockDataMonitor.instance;
  }

  /**
   * Record a stock data event
   */
  recordEvent(userId: string, eventType: StockDataEvent['eventType'], details: any, requestId?: string): void {
    const event: StockDataEvent = {
      timestamp: new Date(),
      userId,
      eventType,
      details,
      requestId
    };

    // Add to events list
    if (!this.events.has(userId)) {
      this.events.set(userId, []);
    }
    
    const userEvents = this.events.get(userId)!;
    userEvents.push(event);
    
    // Keep only recent events
    if (userEvents.length > this.MAX_EVENTS_PER_USER) {
      userEvents.shift();
    }

    // Update diagnostics
    this.updateDiagnostics(userId, event);

    // Log important events
    if (eventType === 'fetch_error') {
      console.warn('📊 StockDataMonitor: Error recorded for user', userId, details);
    }
  }

  /**
   * Update diagnostic information based on events
   */
  private updateDiagnostics(userId: string, event: StockDataEvent): void {
    if (!this.diagnostics.has(userId)) {
      this.diagnostics.set(userId, {
        userId,
        lastSuccessfulFetch: null,
        consecutiveErrors: 0,
        lastError: null,
        authenticationStatus: 'unknown',
        advertiserIdStatus: 'unknown',
        cacheStatus: 'unknown',
        recentEvents: []
      });
    }

    const diag = this.diagnostics.get(userId)!;
    
    // Update based on event type
    switch (event.eventType) {
      case 'fetch_success':
        diag.lastSuccessfulFetch = event.timestamp;
        diag.consecutiveErrors = 0;
        diag.lastError = null;
        break;
        
      case 'fetch_error':
        diag.consecutiveErrors++;
        diag.lastError = event.details.error || 'Unknown error';
        
        // Analyze error type
        if (diag.lastError) {
          const errorMessage = diag.lastError.toLowerCase();
          if (errorMessage.includes('advertiser') || errorMessage.includes('configuration')) {
            diag.advertiserIdStatus = 'invalid';
          } else if (errorMessage.includes('auth') || errorMessage.includes('401') || errorMessage.includes('403')) {
            diag.authenticationStatus = 'expired';
          }
        }
        break;
        
      case 'auth_change':
        diag.authenticationStatus = event.details.isAuthenticated ? 'authenticated' : 'unauthenticated';
        break;
        
      case 'cache_hit':
        diag.cacheStatus = event.details.isStale ? 'stale' : 'fresh';
        break;
        
      case 'cache_miss':
        diag.cacheStatus = 'empty';
        break;
    }

    // Update recent events
    diag.recentEvents = this.events.get(userId)?.slice(-10) || [];
  }

  /**
   * Get diagnostic information for a user
   */
  getDiagnostics(userId: string): DiagnosticInfo | null {
    return this.diagnostics.get(userId) || null;
  }

  /**
   * Check if user is experiencing issues
   */
  isUserExperiencingIssues(userId: string): boolean {
    const diag = this.getDiagnostics(userId);
    if (!diag) return false;

    // Consider user as having issues if:
    // 1. Multiple consecutive errors
    // 2. No successful fetch in last hour
    // 3. Authentication or configuration issues
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hasRecentSuccess = diag.lastSuccessfulFetch && diag.lastSuccessfulFetch > oneHourAgo;
    
    return (
      diag.consecutiveErrors >= 3 ||
      !hasRecentSuccess ||
      diag.authenticationStatus === 'expired' ||
      diag.advertiserIdStatus === 'invalid'
    );
  }

  /**
   * Get suggested actions for resolving issues
   */
  getSuggestedActions(userId: string): string[] {
    const diag = this.getDiagnostics(userId);
    if (!diag) return [];

    const actions: string[] = [];

    if (diag.authenticationStatus === 'expired') {
      actions.push('Re-authenticate with your account');
    }

    if (diag.advertiserIdStatus === 'invalid') {
      actions.push('Check your Advertiser ID configuration in settings');
    }

    if (diag.consecutiveErrors >= 5) {
      actions.push('Contact support - multiple consecutive errors detected');
    }

    if (diag.cacheStatus === 'empty' && diag.consecutiveErrors > 0) {
      actions.push('Try refreshing the page or clearing browser cache');
    }

    if (actions.length === 0 && this.isUserExperiencingIssues(userId)) {
      actions.push('Wait a few minutes and try again');
      actions.push('Check your internet connection');
    }

    return actions;
  }

  /**
   * Generate a diagnostic report for debugging
   */
  generateDiagnosticReport(userId: string): string {
    const diag = this.getDiagnostics(userId);
    if (!diag) return 'No diagnostic data available for this user.';

    const report = [
      `=== Stock Data Diagnostic Report for User: ${userId} ===`,
      `Generated: ${new Date().toISOString()}`,
      '',
      `Last Successful Fetch: ${diag.lastSuccessfulFetch?.toISOString() || 'Never'}`,
      `Consecutive Errors: ${diag.consecutiveErrors}`,
      `Last Error: ${diag.lastError || 'None'}`,
      `Authentication Status: ${diag.authenticationStatus}`,
      `Advertiser ID Status: ${diag.advertiserIdStatus}`,
      `Cache Status: ${diag.cacheStatus}`,
      '',
      `Recent Events (last 10):`,
      ...diag.recentEvents.map(event => 
        `  ${event.timestamp.toISOString()} - ${event.eventType}: ${JSON.stringify(event.details)}`
      ),
      '',
      `Suggested Actions:`,
      ...this.getSuggestedActions(userId).map(action => `  - ${action}`),
      '',
      `Is Experiencing Issues: ${this.isUserExperiencingIssues(userId) ? 'YES' : 'NO'}`
    ];

    return report.join('\n');
  }

  /**
   * Clean up old diagnostic data
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - this.MAX_DIAGNOSTIC_AGE_MS);
    
    for (const [userId, events] of this.events.entries()) {
      const recentEvents = events.filter(event => event.timestamp > cutoff);
      if (recentEvents.length === 0) {
        this.events.delete(userId);
        this.diagnostics.delete(userId);
      } else {
        this.events.set(userId, recentEvents);
      }
    }
  }
}

// Export singleton instance
export const stockDataMonitor = StockDataMonitor.getInstance();

// Auto-cleanup every hour
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    stockDataMonitor.cleanup();
  }, 60 * 60 * 1000);
}
