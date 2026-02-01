/**
 * Request Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { sendError, ErrorCodes } from '../utils';

/**
 * Create a validation middleware for request body
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          'Invalid request body',
          400,
          error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      throw error;
    }
  };
}

/**
 * Create a validation middleware for query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          'Invalid query parameters',
          400,
          error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      throw error;
    }
  };
}

/**
 * Create a validation middleware for URL parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          'Invalid URL parameters',
          400,
          error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      throw error;
    }
  };
}

// ==================== Common Schemas ====================

/**
 * Upload file request schema
 */
export const uploadFileSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
});

/**
 * Create project request schema
 */
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

/**
 * Update project request schema
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
});

/**
 * List query parameters schema
 */
export const listQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  lastKey: z.string().optional(),
  status: z.string().optional(),
  fileType: z.string().optional(),
});

/**
 * UUID parameter schema
 */
export const uuidParamSchema = z.object({
  projectId: z.string().uuid().optional(),
  fileId: z.string().uuid().optional(),
});
