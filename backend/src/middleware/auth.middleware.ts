/**
 * Authentication Middleware
 * 
 * This middleware extracts user information from the request.
 * In production, this would validate JWT tokens from AWS Cognito.
 */

import { Request, Response, NextFunction } from 'express';
import { sendError, ErrorCodes } from '../utils';

/**
 * Extended Request type with user context
 */
export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail?: string;
  userRoles?: string[];
}

/**
 * Authentication middleware
 * 
 * For development: extracts user ID from header or uses default
 * For production: would validate JWT from Authorization header
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // In production, you would:
  // 1. Extract the JWT from Authorization header
  // 2. Verify the token with AWS Cognito
  // 3. Extract user claims from the token
  
  // For development/demo purposes, use header or default
  const userId = req.headers['x-user-id'] as string || 'demo-user';
  const userEmail = req.headers['x-user-email'] as string;
  
  // Attach user info to request
  (req as AuthenticatedRequest).userId = userId;
  if (userEmail) {
    (req as AuthenticatedRequest).userEmail = userEmail;
  }
  
  next();
}

/**
 * Optional auth middleware - doesn't fail if no auth present
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  (req as AuthenticatedRequest).userId = userId;
  next();
}

/**
 * Require authentication middleware
 * Use this when authentication is strictly required
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  const authHeader = req.headers.authorization;
  
  // For development, allow x-user-id header
  if (process.env.NODE_ENV !== 'production') {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      (req as AuthenticatedRequest).userId = userId;
      return next();
    }
  }
  
  // Check for Bearer token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(
      res,
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      401
    );
  }
  
  // In production, validate the JWT here
  // const token = authHeader.substring(7);
  // const decoded = await verifyToken(token);
  
  // For now, just pass through with demo user
  (req as AuthenticatedRequest).userId = 'demo-user';
  next();
}
