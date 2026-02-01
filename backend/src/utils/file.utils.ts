/**
 * Utility functions for file operations
 */

import path from 'path';
import { ALLOWED_MIME_TYPES, S3_CONFIG } from '../config/aws.config';

/**
 * Extract file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return ext || '';
}

/**
 * Check if a MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Check if file size is within limits
 */
export function isFileSizeAllowed(fileSize: number): boolean {
  return fileSize > 0 && fileSize <= S3_CONFIG.maxFileSize;
}

/**
 * Get MIME type category (for grouping)
 */
export function getMimeTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('gzip')) return 'archive';
  return 'other';
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  const baseName = path.basename(fileName);
  
  // Replace special characters but keep extension
  const ext = path.extname(baseName);
  const nameWithoutExt = path.basename(baseName, ext);
  
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200); // Limit length
  
  return sanitized + ext.toLowerCase();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file upload request
 */
export function validateUploadRequest(
  fileName: string,
  fileType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: 'File name is required' };
  }

  if (!fileType || fileType.trim().length === 0) {
    return { valid: false, error: 'File type is required' };
  }

  if (!isAllowedMimeType(fileType)) {
    return { valid: false, error: `File type '${fileType}' is not allowed` };
  }

  if (!fileSize || fileSize <= 0) {
    return { valid: false, error: 'File size must be greater than 0' };
  }

  if (!isFileSizeAllowed(fileSize)) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${formatFileSize(S3_CONFIG.maxFileSize)}`,
    };
  }

  return { valid: true };
}
