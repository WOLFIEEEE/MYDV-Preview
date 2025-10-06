// Standardized error handling for AutoTrader API responses

export const ErrorType = {
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION', 
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export interface AutoTraderWarning {
  type: 'ERROR' | 'WARNING' | 'INFO';
  feature?: string;
  message: string;
}

export interface AutoTraderErrorResponse {
  warnings?: AutoTraderWarning[];
  vehicle?: null;
  [key: string]: unknown;
}

export interface StandardizedError {
  type: ErrorType;
  message: string;
  details?: string;
  autoTraderWarnings?: AutoTraderWarning[];
  autoTraderError?: any; // Full AutoTrader error object for detailed parsing
  httpStatus: number;
  timestamp: string;
  endpoint?: string;
}

/**
 * Parse AutoTrader API error responses and standardize them
 */
export async function parseAutoTraderError(
  response: Response,
  endpoint?: string
): Promise<StandardizedError> {
  const timestamp = new Date().toISOString();
  
  try {
    // Try to parse as JSON first
    const errorData: AutoTraderErrorResponse = await response.clone().json();
    
    // Extract AutoTrader warnings
    const autoTraderWarnings = errorData.warnings || [];
    const primaryWarning = autoTraderWarnings.find(w => w.type === 'ERROR') || autoTraderWarnings[0];
    
    // Determine error type based on status and content
    let errorType: ErrorType;
    let message: string;
    
    if (response.status === 401 || response.status === 403) {
      errorType = ErrorType.AUTHENTICATION;
      message = 'Authentication failed - check API credentials';
    } else if (response.status === 404) {
      errorType = ErrorType.NOT_FOUND;
      message = primaryWarning?.message || 'Resource not found';
    } else if (response.status === 400) {
      errorType = ErrorType.VALIDATION;
      message = primaryWarning?.message || 'Invalid request parameters';
    } else if (response.status === 429) {
      errorType = ErrorType.RATE_LIMIT;
      message = 'API rate limit exceeded';
    } else if (response.status >= 500) {
      errorType = ErrorType.SERVER_ERROR;
      message = 'AutoTrader API server error';
    } else {
      errorType = ErrorType.UNKNOWN;
      message = primaryWarning?.message || 'Unknown error occurred';
    }
    
    return {
      type: errorType,
      message,
      details: primaryWarning?.feature ? `Feature: ${primaryWarning.feature}` : undefined,
      autoTraderWarnings,
      httpStatus: mapToClientHttpStatus(response.status, errorType),
      timestamp,
      endpoint
    };
    
  } catch {
    // Fallback to text if JSON parsing fails
    const errorText = await response.text();
    
    let errorType: ErrorType;
    if (response.status === 401 || response.status === 403) {
      errorType = ErrorType.AUTHENTICATION;
    } else if (response.status === 404) {
      errorType = ErrorType.NOT_FOUND;
    } else if (response.status >= 500) {
      errorType = ErrorType.SERVER_ERROR;
    } else {
      errorType = ErrorType.NETWORK_ERROR;
    }
    
    return {
      type: errorType,
      message: `HTTP ${response.status}: ${response.statusText}`,
      details: errorText,
      httpStatus: mapToClientHttpStatus(response.status, errorType),
      timestamp,
      endpoint
    };
  }
}

/**
 * Map AutoTrader HTTP status to appropriate client-facing status
 */
function mapToClientHttpStatus(autoTraderStatus: number, errorType: ErrorType): number {
  switch (errorType) {
    case ErrorType.VALIDATION:
      return 400; // Bad Request
    case ErrorType.AUTHENTICATION:
      return 401; // Unauthorized
    case ErrorType.NOT_FOUND:
      return 404; // Not Found
    case ErrorType.RATE_LIMIT:
      return 429; // Too Many Requests
    case ErrorType.SERVER_ERROR:
      return 502; // Bad Gateway (AutoTrader is down)
    case ErrorType.NETWORK_ERROR:
      return 503; // Service Unavailable
    default:
      return autoTraderStatus; // Pass through for unknown cases
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: StandardizedError) {
  return {
    success: false,
    error: {
      type: error.type,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      ...(error.endpoint && { endpoint: error.endpoint }),
      ...(error.autoTraderWarnings && { 
        autoTraderWarnings: error.autoTraderWarnings 
      }),
      ...(error.autoTraderError && { 
        autoTraderError: error.autoTraderError 
      })
    }
  };
}

/**
 * Handle internal server errors consistently
 */
export function createInternalErrorResponse(error: unknown, endpoint?: string): StandardizedError {
  return {
    type: ErrorType.SERVER_ERROR,
    message: 'Internal server error',
    details: error instanceof Error ? error.message : 'Unknown error',
    httpStatus: 500,
    timestamp: new Date().toISOString(),
    endpoint
  };
}

/**
 * Success response wrapper
 */
export function createSuccessResponse<T>(data: T, endpoint?: string) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(endpoint && { endpoint })
  };
} 