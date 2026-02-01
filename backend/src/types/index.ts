/**
 * Central export file for all types
 */

export * from './file.types';
export * from './project.types';

/**
 * Common API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  lastKey?: string;
}

/**
 * User context from authentication
 */
export interface UserContext {
  userId: string;
  email?: string;
  roles?: string[];
}
