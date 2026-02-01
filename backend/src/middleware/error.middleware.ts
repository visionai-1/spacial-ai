/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { sendError, ErrorCodes } from '../utils';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Not Found handler - for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): Response {
  return sendError(
    res,
    ErrorCodes.NOT_FOUND,
    `Route ${req.method} ${req.path} not found`,
    404
  );
}

/**
 * Global error handler
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Handle validation errors (from zod or similar)
  if (err.name === 'ZodError') {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      err
    );
    return;
  }

  // Handle AWS SDK errors
  if (err.name?.includes('Exception') || err.name?.includes('Error')) {
    const awsErrorName = err.name;
    
    if (awsErrorName.includes('NotFound')) {
      sendError(res, ErrorCodes.NOT_FOUND, 'Resource not found', 404);
      return;
    }
    
    if (awsErrorName.includes('AccessDenied') || awsErrorName.includes('Forbidden')) {
      sendError(res, ErrorCodes.ACCESS_DENIED, 'Access denied', 403);
      return;
    }
    
    if (awsErrorName.includes('Throttl')) {
      sendError(res, ErrorCodes.INTERNAL_ERROR, 'Service temporarily unavailable', 503);
      return;
    }
  }

  // Handle syntax errors in JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid JSON in request body', 400);
    return;
  }

  // Default to internal server error
  sendError(
    res,
    ErrorCodes.INTERNAL_ERROR,
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    500
  );
};
