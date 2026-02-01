/**
 * Files Controller - Handles file upload, download, list, and delete operations
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { s3Service } from '../services/s3.service';
import { dynamoDBService } from '../services/dynamodb.service';
import {
  sendSuccess,
  sendError,
  ErrorCodes,
  validateUploadRequest,
  getFileExtension,
  sanitizeFileName,
} from '../utils';
import {
  UploadFileRequest,
  UploadFileResponse,
  DownloadFileResponse,
  ListFilesResponse,
  FileStatus,
} from '../types';

/**
 * Request upload URL for a new file
 * POST /projects/:projectId/files
 */
export async function requestUpload(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId } = req.params;
    const { fileName, fileType, fileSize } = req.body as UploadFileRequest;

    // Get user ID from auth context (default for demo)
    const userId = (req as Request & { userId?: string }).userId || 'demo-user';

    // Validate request
    const validation = validateUploadRequest(fileName, fileType, fileSize);
    if (!validation.valid) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, validation.error!, 400);
    }

    // Validate project exists (optional - can be removed if projects are created on-demand)
    // const project = await dynamoDBService.getProjectById(userId, projectId);
    // if (!project) {
    //   return sendError(res, ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404);
    // }

    // Generate file ID
    const fileId = uuidv4();
    const sanitizedFileName = sanitizeFileName(fileName);
    const fileExtension = getFileExtension(sanitizedFileName);

    // Generate presigned upload URL
    const { uploadUrl, s3Key, expiresIn } = await s3Service.generateUploadUrl(
      projectId,
      fileId,
      sanitizedFileName,
      fileType,
      fileSize
    );

    // Create file metadata record (status: pending)
    await dynamoDBService.createFileMetadata({
      fileId,
      projectId,
      fileName: sanitizedFileName,
      fileType,
      fileExtension,
      fileSize,
      s3Key,
      uploadedBy: userId,
    });

    const response: UploadFileResponse = {
      fileId,
      uploadUrl,
      expiresIn,
    };

    return sendSuccess(res, response, 201);
  } catch (error) {
    console.error('Error requesting upload:', error);
    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      'Failed to generate upload URL',
      500
    );
  }
}

/**
 * Confirm file upload completed
 * POST /projects/:projectId/files/:fileId/confirm
 */
export async function confirmUpload(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId, fileId } = req.params;
    const userId = (req as Request & { userId?: string }).userId || 'demo-user';

    // Get file metadata
    const fileMetadata = await dynamoDBService.getFileById(projectId, fileId);
    if (!fileMetadata) {
      return sendError(res, ErrorCodes.FILE_NOT_FOUND, 'File not found', 404);
    }

    // Verify file exists in S3
    const exists = await s3Service.objectExists(fileMetadata.s3Key);
    if (!exists) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'File has not been uploaded to storage',
        400
      );
    }

    // Update status to uploaded
    const updatedFile = await dynamoDBService.updateFileStatus(
      projectId,
      fileId,
      'uploaded'
    );

    // Update project stats
    await dynamoDBService.updateProjectStats(
      userId,
      projectId,
      1,
      fileMetadata.fileSize
    ).catch(() => {
      // Ignore if project doesn't exist (optional feature)
    });

    return sendSuccess(res, updatedFile);
  } catch (error) {
    console.error('Error confirming upload:', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to confirm upload', 500);
  }
}

/**
 * Get download URL for a file
 * GET /projects/:projectId/files/:fileId
 */
export async function getDownloadUrl(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId, fileId } = req.params;

    // Get file metadata
    const fileMetadata = await dynamoDBService.getFileById(projectId, fileId);
    if (!fileMetadata) {
      return sendError(res, ErrorCodes.FILE_NOT_FOUND, 'File not found', 404);
    }

    // Check if file is deleted
    if (fileMetadata.status === 'deleted') {
      return sendError(res, ErrorCodes.FILE_NOT_FOUND, 'File has been deleted', 404);
    }

    // Generate presigned download URL
    const { downloadUrl, expiresIn } = await s3Service.generateDownloadUrl(
      fileMetadata.s3Key,
      fileMetadata.fileName
    );

    const response: DownloadFileResponse = {
      fileId: fileMetadata.fileId,
      fileName: fileMetadata.fileName,
      downloadUrl,
      expiresIn,
    };

    return sendSuccess(res, response);
  } catch (error) {
    console.error('Error getting download URL:', error);
    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      'Failed to generate download URL',
      500
    );
  }
}

/**
 * Get file metadata
 * GET /projects/:projectId/files/:fileId/metadata
 */
export async function getFileMetadata(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId, fileId } = req.params;

    const fileMetadata = await dynamoDBService.getFileById(projectId, fileId);
    if (!fileMetadata) {
      return sendError(res, ErrorCodes.FILE_NOT_FOUND, 'File not found', 404);
    }

    if (fileMetadata.status === 'deleted') {
      return sendError(res, ErrorCodes.FILE_NOT_FOUND, 'File has been deleted', 404);
    }

    return sendSuccess(res, fileMetadata);
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to get file metadata', 500);
  }
}

/**
 * List files in a project
 * GET /projects/:projectId/files
 */
export async function listFiles(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId } = req.params;
    const { fileType, status, limit, lastKey } = req.query;

    const options: {
      fileType?: string;
      status?: FileStatus;
      limit?: number;
      lastKey?: Record<string, unknown>;
    } = {};

    if (fileType && typeof fileType === 'string') {
      options.fileType = fileType;
    }

    if (status && typeof status === 'string') {
      options.status = status as FileStatus;
    }

    if (limit) {
      options.limit = Math.min(parseInt(limit as string, 10) || 50, 100);
    }

    if (lastKey && typeof lastKey === 'string') {
      try {
        options.lastKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
      } catch {
        // Ignore invalid lastKey
      }
    }

    const result = await dynamoDBService.getFilesByProject(projectId, options);

    const response: ListFilesResponse = {
      files: result.files,
      nextKey: result.lastKey
        ? Buffer.from(JSON.stringify(result.lastKey)).toString('base64')
        : undefined,
    };

    return sendSuccess(res, response);
  } catch (error) {
    console.error('Error listing files:', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to list files', 500);
  }
}

/**
 * Delete a file (soft delete)
 * DELETE /projects/:projectId/files/:fileId
 */
export async function deleteFile(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId, fileId } = req.params;
    const userId = (req as Request & { userId?: string }).userId || 'demo-user';
    const hardDelete = req.query.hard === 'true';

    // Get file metadata
    const fileMetadata = await dynamoDBService.getFileById(projectId, fileId);
    if (!fileMetadata) {
      return sendError(res, ErrorCodes.FILE_NOT_FOUND, 'File not found', 404);
    }

    if (fileMetadata.status === 'deleted' && !hardDelete) {
      return sendError(res, ErrorCodes.FILE_NOT_FOUND, 'File already deleted', 404);
    }

    if (hardDelete) {
      // Hard delete: remove from S3 and DynamoDB
      await s3Service.deleteObject(fileMetadata.s3Key);
      await dynamoDBService.hardDeleteFile(projectId, fileId);

      // Update project stats
      await dynamoDBService.updateProjectStats(
        userId,
        projectId,
        -1,
        -fileMetadata.fileSize
      ).catch(() => {
        // Ignore if project doesn't exist
      });

      return sendSuccess(res, { message: 'File permanently deleted' });
    } else {
      // Soft delete: mark as deleted in DynamoDB
      await dynamoDBService.deleteFile(projectId, fileId);

      // Update project stats
      await dynamoDBService.updateProjectStats(
        userId,
        projectId,
        -1,
        -fileMetadata.fileSize
      ).catch(() => {
        // Ignore if project doesn't exist
      });

      return sendSuccess(res, { message: 'File deleted' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to delete file', 500);
  }
}
