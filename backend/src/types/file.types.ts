/**
 * File-related TypeScript interfaces for the File Management Service
 */

/**
 * File metadata stored in DynamoDB
 */
export interface FileMetadata {
  PK: string; // PROJECT#{projectId}
  SK: string; // FILE#{fileId}
  fileId: string;
  projectId: string;
  fileName: string;
  fileType: string; // MIME type (e.g., 'image/png')
  fileExtension: string; // File extension (e.g., '.png')
  fileSize: number; // Size in bytes
  s3Key: string; // S3 object key
  uploadedBy: string; // User ID
  uploadedAt: string; // ISO timestamp
  status: FileStatus;
}

/**
 * File status enum
 */
export type FileStatus = 'pending' | 'uploaded' | 'deleted';

/**
 * Request body for initiating a file upload
 */
export interface UploadFileRequest {
  fileName: string;
  fileType: string; // MIME type
  fileSize: number;
}

/**
 * Response for upload request with presigned URL
 */
export interface UploadFileResponse {
  fileId: string;
  uploadUrl: string;
  expiresIn: number; // seconds
}

/**
 * Response for download request with presigned URL
 */
export interface DownloadFileResponse {
  fileId: string;
  fileName: string;
  downloadUrl: string;
  expiresIn: number;
}

/**
 * Query parameters for listing files
 */
export interface ListFilesQuery {
  fileType?: string; // Filter by MIME type
  status?: FileStatus;
  limit?: number;
  lastKey?: string; // For pagination
}

/**
 * Response for listing files
 */
export interface ListFilesResponse {
  files: FileMetadata[];
  nextKey?: string; // For pagination
  totalCount?: number;
}

/**
 * File metadata for creation (without keys)
 */
export interface CreateFileMetadata {
  fileId: string;
  projectId: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileSize: number;
  s3Key: string;
  uploadedBy: string;
}

/**
 * Confirm upload request body
 */
export interface ConfirmUploadRequest {
  fileId: string;
}
