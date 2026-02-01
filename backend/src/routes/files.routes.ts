/**
 * File Routes - API endpoints for file operations
 */

import { Router } from 'express';
import {
  requestUpload,
  confirmUpload,
  getDownloadUrl,
  getFileMetadata,
  listFiles,
  deleteFile,
} from '../controllers/files.controller';

const router = Router({ mergeParams: true });

/**
 * @route   GET /projects/:projectId/files
 * @desc    List all files in a project
 * @query   fileType - Filter by MIME type (optional)
 * @query   status - Filter by status (optional)
 * @query   limit - Number of results (optional, max 100)
 * @query   lastKey - Pagination cursor (optional)
 */
router.get('/', listFiles);

/**
 * @route   POST /projects/:projectId/files
 * @desc    Request a presigned URL for file upload
 * @body    { fileName: string, fileType: string, fileSize: number }
 */
router.post('/', requestUpload);

/**
 * @route   GET /projects/:projectId/files/:fileId
 * @desc    Get presigned download URL for a file
 */
router.get('/:fileId', getDownloadUrl);

/**
 * @route   GET /projects/:projectId/files/:fileId/metadata
 * @desc    Get file metadata without download URL
 */
router.get('/:fileId/metadata', getFileMetadata);

/**
 * @route   POST /projects/:projectId/files/:fileId/confirm
 * @desc    Confirm that file upload is complete
 */
router.post('/:fileId/confirm', confirmUpload);

/**
 * @route   DELETE /projects/:projectId/files/:fileId
 * @desc    Delete a file (soft delete by default)
 * @query   hard - If 'true', permanently delete the file
 */
router.delete('/:fileId', deleteFile);

export default router;
