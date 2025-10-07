/**
 * Browser Compatibility and Error Handling for Stock Data
 * 
 * Handles browser-specific issues that can cause "No Stock Data Available" errors:
 * - Safari's strict cookie policies
 * - Chrome's memory limitations
 * - Firefox's fetch timeout issues
 * - Mobile browser constraints
 */

interface BrowserInfo {
  name: string;
  version: string;
  isMobile: boolean;
  supportsWebWorkers: boolean;
  cookieSupport: boolean;
}

class BrowserCompatibilityManager {
  private static browserInfo: BrowserInfo | null = null;

  /**
   * Detect browser and capabilities
   */
  static detectBrowser(): BrowserInfo {
    if (this.browserInfo) return this.browserInfo;

    if (typeof window === 'undefined') {
      // Server-side fallback
      return {
        name: 'server',
        version: '1.0',
        isMobile: false,
        supportsWebWorkers: false,
        cookieSupport: true
      };
    }

    const userAgent = navigator.userAgent;
    let name = 'unknown';
    let version = '0';

    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      name = 'chrome';
      version = userAgent.match(/Chrome\/(\d+)/)?.[1] || '0';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'safari';
      version = userAgent.match(/Version\/(\d+)/)?.[1] || '0';
    } else if (userAgent.includes('Firefox')) {
      name = 'firefox';
      version = userAgent.match(/Firefox\/(\d+)/)?.[1] || '0';
    } else if (userAgent.includes('Edg')) {
      name = 'edge';
      version = userAgent.match(/Edg\/(\d+)/)?.[1] || '0';
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const supportsWebWorkers = typeof Worker !== 'undefined';
    
    // Test cookie support
    let cookieSupport = false;
    try {
      document.cookie = 'test=1; SameSite=Lax';
      cookieSupport = document.cookie.includes('test=1');
      document.cookie = 'test=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch {
      cookieSupport = false;
    }

    this.browserInfo = {
      name,
      version,
      isMobile,
      supportsWebWorkers,
      cookieSupport
    };

    return this.browserInfo;
  }

  /**
   * Get browser-specific fetch configuration
   */
  static getFetchConfig(): RequestInit {
    const browser = this.detectBrowser();
    const config: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Safari-specific configurations
    if (browser.name === 'safari') {
      config.credentials = 'same-origin'; // Safari is strict about cross-origin cookies
      config.cache = 'no-cache'; // Safari aggressive caching issues
    }

    // Mobile browser optimizations
    if (browser.isMobile) {
      // Shorter timeout for mobile networks
      // Note: AbortController timeout should be handled by caller
      config.keepalive = false; // Disable keepalive on mobile to prevent connection issues
    }

    // Firefox-specific configurations
    if (browser.name === 'firefox') {
      // Firefox has different timeout behavior
      config.cache = 'no-store'; // Prevent Firefox caching issues
    }

    return config;
  }

  /**
   * Check if browser has known limitations that could cause stock data issues
   */
  static checkBrowserLimitations(): { hasLimitations: boolean; issues: string[] } {
    const browser = this.detectBrowser();
    const issues: string[] = [];

    // Safari cookie issues
    if (browser.name === 'safari' && !browser.cookieSupport) {
      issues.push('Safari cookie restrictions detected - authentication may fail');
    }

    // Mobile memory constraints
    if (browser.isMobile) {
      issues.push('Mobile browser detected - reduced memory available for large datasets');
    }

    // Old browser versions
    const version = parseInt(browser.version);
    if (browser.name === 'chrome' && version < 90) {
      issues.push('Outdated Chrome version - may have fetch API limitations');
    } else if (browser.name === 'safari' && version < 14) {
      issues.push('Outdated Safari version - may have authentication issues');
    } else if (browser.name === 'firefox' && version < 88) {
      issues.push('Outdated Firefox version - may have network timeout issues');
    }

    // Check for private/incognito mode (affects storage and cookies)
    if (this.isPrivateMode()) {
      issues.push('Private browsing mode detected - authentication and caching may be limited');
    }

    return {
      hasLimitations: issues.length > 0,
      issues
    };
  }

  /**
   * Detect private/incognito mode
   */
  private static isPrivateMode(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      // Test localStorage availability (disabled in private mode in some browsers)
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      
      // Test indexedDB (also disabled in private mode)
      if (!window.indexedDB) return true;
      
      return false;
    } catch {
      return true; // Likely private mode
    }
  }

  /**
   * Get recommended retry strategy based on browser
   */
  static getRetryStrategy(): { maxRetries: number; baseDelay: number; timeoutMs: number } {
    const browser = this.detectBrowser();

    // Mobile browsers - more conservative
    if (browser.isMobile) {
      return {
        maxRetries: 2,
        baseDelay: 2000,
        timeoutMs: 15000
      };
    }

    // Safari - needs different handling
    if (browser.name === 'safari') {
      return {
        maxRetries: 3,
        baseDelay: 1500,
        timeoutMs: 20000
      };
    }

    // Default for modern browsers
    return {
      maxRetries: 3,
      baseDelay: 1000,
      timeoutMs: 30000
    };
  }

  /**
   * Apply browser-specific workarounds for fetch requests
   */
  static async enhancedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const browser = this.detectBrowser();
    const browserConfig = this.getFetchConfig();
    const retryStrategy = this.getRetryStrategy();

    // Merge configurations
    const finalOptions: RequestInit = {
      ...browserConfig,
      ...options,
      headers: {
        ...browserConfig.headers,
        ...options.headers
      }
    };

    // Safari-specific: Add cache-busting for problematic requests
    if (browser.name === 'safari' && !url.includes('?')) {
      url += `?_t=${Date.now()}`;
    } else if (browser.name === 'safari' && url.includes('?')) {
      url += `&_t=${Date.now()}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryStrategy.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), retryStrategy.timeoutMs);

        const response = await fetch(url, {
          ...finalOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error');
        
        // Don't retry on abort (user-initiated or timeout)
        if (lastError.name === 'AbortError') {
          throw new Error(`Request timeout after ${retryStrategy.timeoutMs}ms (browser: ${browser.name})`);
        }

        // Don't retry on the last attempt
        if (attempt === retryStrategy.maxRetries) {
          break;
        }

        // Browser-specific retry delays
        const delay = retryStrategy.baseDelay * Math.pow(2, attempt - 1);
        console.warn(`🔄 Browser-aware retry ${attempt}/${retryStrategy.maxRetries} after ${delay}ms (${browser.name})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Fetch failed after ${retryStrategy.maxRetries} attempts (browser: ${browser.name}): ${lastError?.message}`);
  }

  /**
   * Get diagnostic information for troubleshooting
   */
  static getDiagnosticInfo(): {
    browser: BrowserInfo;
    limitations: { hasLimitations: boolean; issues: string[] };
    retryStrategy: { maxRetries: number; baseDelay: number; timeoutMs: number };
    userAgent: string;
    timestamp: string;
  } {
    const browser = this.detectBrowser();
    const limitations = this.checkBrowserLimitations();
    const retryStrategy = this.getRetryStrategy();

    return {
      browser,
      limitations,
      retryStrategy,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      timestamp: new Date().toISOString()
    };
  }
}

export { BrowserCompatibilityManager, type BrowserInfo };
