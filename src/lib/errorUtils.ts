/**
 * Utility functions for handling and formatting errors consistently across the application
 */

/**
 * Extract meaningful error message from database errors without exposing full SQL queries
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  
  if (error instanceof Error) {
    const message = error.message;
    
    // Handle database constraint violations
    if (message.includes('duplicate key value violates unique constraint')) {
      return 'Duplicate key constraint violation - record already exists';
    }
    
    if (message.includes('violates foreign key constraint')) {
      return 'Foreign key constraint violation - referenced record not found';
    }
    
    if (message.includes('violates not-null constraint')) {
      return 'Not-null constraint violation - required field is missing';
    }
    
    if (message.includes('violates check constraint')) {
      return 'Check constraint violation - invalid data format';
    }
    
    // Handle connection errors
    if (message.includes('connection') || message.includes('timeout')) {
      return 'Database connection error';
    }
    
    // Handle permission errors
    if (message.includes('permission denied') || message.includes('access denied')) {
      return 'Database permission denied';
    }
    
    // For SQL query errors, extract just the constraint/error type without the full query
    if (message.includes('Failed query:')) {
      const parts = message.split('Failed query:');
      if (parts.length > 1) {
        // Look for constraint violations or specific error types in the query part
        const queryPart = parts[1];
        if (queryPart.includes('duplicate key')) {
          return 'Database insert failed: Duplicate key violation';
        }
        if (queryPart.includes('foreign key')) {
          return 'Database insert failed: Foreign key constraint violation';
        }
        if (queryPart.includes('not-null')) {
          return 'Database insert failed: Required field missing';
        }
        if (queryPart.includes('check constraint')) {
          return 'Database insert failed: Data validation error';
        }
        // Generic database query failure
        return 'Database query execution failed';
      }
    }
    
    // Handle Clerk API errors
    if (message.includes('ClerkAPIResponseError') || message.includes('Clerk')) {
      return 'Clerk authentication service error';
    }
    
    // Handle AutoTrader API errors
    if (message.includes('AutoTrader') || message.includes('HTTP 4') || message.includes('HTTP 5')) {
      return 'External API error';
    }
    
    // Return the original message if it's not too long
    if (message.length <= 200) {
      return message;
    }
    
    // Truncate very long messages
    return message.substring(0, 200) + '... (truncated)';
  }
  
  // Handle non-Error objects
  if (typeof error === 'string') {
    return error.length <= 200 ? error : error.substring(0, 200) + '... (truncated)';
  }
  
  return 'Unknown error type';
}

/**
 * Log error with consistent formatting and appropriate level of detail
 */
export function logError(context: string, error: unknown, additionalInfo?: Record<string, any>): void {
  const errorMessage = extractErrorMessage(error);
  const timestamp = new Date().toISOString();
  
  console.error(`❌ ${context}:`, errorMessage);
  
  // Always log debugging details (but truncate massive SQL queries)
  if (error instanceof Error) {
    console.error('🔍 Debug details:', {
      name: error.name,
      message: error.message.length > 500 ? error.message.substring(0, 500) + '... (truncated)' : error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack trace
      timestamp
    });
  } else {
    console.error('🔍 Debug details:', { 
      error: error, 
      type: typeof error,
      timestamp
    });
  }
  
  if (additionalInfo && Object.keys(additionalInfo).length > 0) {
    console.error(`📋 Additional context:`, additionalInfo);
  }
}

/**
 * Create a user-friendly error message for API responses
 */
export function createUserFriendlyErrorMessage(error: unknown): string {
  const errorMessage = extractErrorMessage(error);
  
  // Map technical errors to user-friendly messages
  if (errorMessage.includes('Duplicate key')) {
    return 'This record already exists. Please check your data and try again.';
  }
  
  if (errorMessage.includes('Foreign key')) {
    return 'Referenced data not found. Please ensure all required information is valid.';
  }
  
  if (errorMessage.includes('Not-null constraint')) {
    return 'Required information is missing. Please fill in all required fields.';
  }
  
  if (errorMessage.includes('Database connection')) {
    return 'Service temporarily unavailable. Please try again in a moment.';
  }
  
  if (errorMessage.includes('permission denied')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (errorMessage.includes('Clerk authentication')) {
    return 'Authentication error. Please sign in again.';
  }
  
  if (errorMessage.includes('External API')) {
    return 'External service error. Please try again later.';
  }
  
  // Default user-friendly message
  return 'An error occurred while processing your request. Please try again.';
}
