/**
 * Standardized Error Handling
 * 
 * All API errors follow this structure:
 * {
 *   error: {
 *     message: string,
 *     code: string,
 *     details?: any
 *   }
 * }
 */

export class ApiError extends Error {
  constructor(
    public message: string,
    public code: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Common error types
 */

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string | number) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      429,
      retryAfter ? { retryAfter } : undefined
    );
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(service: string, details?: any) {
    super(
      `Service unavailable: ${service}`,
      'SERVICE_UNAVAILABLE',
      503,
      details
    );
  }
}

/**
 * Format error response
 */
export function formatError(error: any) {
  if (error instanceof ApiError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
      },
    };
  }

  // Unknown error - don't expose internal details
  console.error('Unhandled error:', error);
  return {
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };
}
