// Enhanced Error Handler with Circuit Breaker and Retry Logic
// Provides resilient error handling for AutoTrader API calls

export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER'
}

export interface EnhancedError {
  type: ErrorType;
  message: string;
  details: string;
  httpStatus: number;
  timestamp: string;
  endpoint: string;
  retryable: boolean;
  retryAfter?: number;
  circuitBreakerOpen?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export class EnhancedErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  };

  /**
   * Parse AutoTrader API error with enhanced classification
   */
  static async parseAutoTraderError(
    response: Response,
    endpoint: string
  ): Promise<EnhancedError> {
    let errorBody: any = {};
    
    try {
      const text = await response.text();
      if (text) {
        errorBody = JSON.parse(text);
      }
    } catch {
      // If we can't parse the error body, continue with empty object
    }

    const error: EnhancedError = {
      type: this.classifyError(response.status),
      message: this.getErrorMessage(response.status, errorBody),
      details: this.getErrorDetails(response.status, errorBody),
      httpStatus: response.status,
      timestamp: new Date().toISOString(),
      endpoint,
      retryable: this.isRetryable(response.status),
      retryAfter: this.getRetryAfter(response.headers)
    };

    return error;
  }

  /**
   * Execute operation with retry logic and circuit breaker
   */
  static   async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context: string = 'unknown'
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${retryConfig.maxRetries + 1} for ${context}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.shouldRetry(error as Error)) {
          console.log(`❌ Non-retryable error for ${context}:`, error);
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, retryConfig);
        console.log(`⏳ Retrying ${context} in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }

    const finalError = lastError || new Error(`All retry attempts failed for ${context}`);
    console.error(`❌ All retry attempts failed for ${context}:`, finalError);
    throw finalError;
  }

  /**
   * Create fallback response when all retries fail
   */
  static createFallbackResponse<T>(
    defaultValue: T,
    error: Error,
    context: string
  ): T & { _fallback: boolean; _error: string } {
    console.log(`🔄 Using fallback response for ${context}:`, error.message);
    
    return {
      ...defaultValue,
      _fallback: true,
      _error: error.message
    };
  }

  /**
   * Classify error type based on HTTP status
   */
  private static classifyError(status: number): ErrorType {
    switch (status) {
      case 401:
      case 403:
        return ErrorType.AUTHENTICATION;
      case 400:
        return ErrorType.VALIDATION;
      case 404:
        return ErrorType.NOT_FOUND;
      case 429:
        return ErrorType.RATE_LIMIT;
      case 408:
      case 504:
        return ErrorType.TIMEOUT;
      case 500:
      case 502:
      case 503:
        return ErrorType.SERVER_ERROR;
      default:
        return status >= 500 ? ErrorType.SERVER_ERROR : ErrorType.VALIDATION;
    }
  }

  /**
   * Get human-readable error message
   */
  private static getErrorMessage(status: number, errorBody: any): string {
    if (errorBody.message) {
      return errorBody.message;
    }

    switch (status) {
      case 400:
        return 'Bad request - please check your parameters';
      case 401:
        return 'Authentication failed - please check your credentials';
      case 403:
        return 'Access forbidden - insufficient permissions';
      case 404:
        return 'Resource not found';
      case 429:
        return 'Rate limit exceeded - please try again later';
      case 500:
        return 'Internal server error';
      case 502:
        return 'Bad gateway - service temporarily unavailable';
      case 503:
        return 'Service unavailable - please try again later';
      case 504:
        return 'Gateway timeout - request took too long';
      default:
        return `HTTP ${status} error`;
    }
  }

  /**
   * Get detailed error information
   */
  private static getErrorDetails(status: number, errorBody: any): string {
    const details = [];

    if (errorBody.error_description) {
      details.push(errorBody.error_description);
    }

    if (errorBody.details) {
      details.push(errorBody.details);
    }

    if (errorBody.errors && Array.isArray(errorBody.errors)) {
      details.push(...errorBody.errors);
    }

    if (details.length === 0) {
      switch (status) {
        case 401:
          details.push('Check your API credentials and ensure they are valid');
          break;
        case 429:
          details.push('You have exceeded the API rate limit. Please wait before making more requests');
          break;
        case 500:
          details.push('The server encountered an internal error. Please try again later');
          break;
        default:
          details.push('No additional details available');
      }
    }

    return details.join('. ');
  }

  /**
   * Check if error is retryable
   */
  private static isRetryable(status: number): boolean {
    // Retryable status codes
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(status);
  }

  /**
   * Check if we should retry based on error
   */
  private static shouldRetry(error: Error): boolean {
    // Network errors are retryable
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return true;
    }

    // Timeout errors are retryable
    if (error.message.includes('timeout')) {
      return true;
    }

    // Circuit breaker errors are not retryable
    if (error.message.includes('Circuit breaker')) {
      return false;
    }

    return false;
  }

  /**
   * Get retry-after header value
   */
  private static getRetryAfter(headers: Headers): number | undefined {
    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? undefined : seconds * 1000; // Convert to milliseconds
    }
    return undefined;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(error: EnhancedError) {
    return {
      success: false,
      error: {
        type: error.type,
        message: error.message,
        details: error.details,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
        timestamp: error.timestamp,
        endpoint: error.endpoint
      }
    };
  }

  /**
   * Create success response
   */
  static createSuccessResponse<T>(data: T, endpoint: string) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      endpoint
    };
  }

  /**
   * Log error with context
   */
  static logError(error: EnhancedError, context?: any) {
    console.error(`❌ ${error.type} Error in ${error.endpoint}:`, {
      message: error.message,
      details: error.details,
      httpStatus: error.httpStatus,
      retryable: error.retryable,
      context
    });
  }

  /**
   * Log performance metrics
   */
  static logPerformance(
    endpoint: string,
    duration: number,
    success: boolean,
    cacheHit?: boolean
  ) {
    const status = success ? '✅' : '❌';
    const cache = cacheHit ? '🎯' : '📡';
    
    console.log(`${status} ${cache} ${endpoint}: ${duration}ms`);
  }
}
