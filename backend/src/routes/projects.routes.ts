/**
 * Project Routes - API endpoints for project operations
 */

import { Router } from 'express';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
} from '../controllers/projects.controller';
import filesRouter from './files.routes';

const router = Router();

/**
 * @route   GET /projects
 * @desc    List all projects for the current user
 * @query   status - Filter by status (optional)
 * @query   limit - Number of results (optional, max 100)
 * @query   lastKey - Pagination cursor (optional)
 */
router.get('/', listProjects);

/**
 * @route   POST /projects
 * @desc    Create a new project
 * @body    { name: string, description?: string }
 */
router.post('/', createProject);

/**
 * @route   GET /projects/:projectId
 * @desc    Get a project by ID
 */
router.get('/:projectId', getProject);

/**
 * @route   PATCH /projects/:projectId
 * @desc    Update a project
 * @body    { name?: string, description?: string, status?: string }
 */
router.patch('/:projectId', updateProject);

/**
 * @route   DELETE /projects/:projectId
 * @desc    Delete a project (soft delete)
 */
router.delete('/:projectId', deleteProject);

/**
 * Nested file routes: /projects/:projectId/files/*
 */
router.use('/:projectId/files', filesRouter);

export default router;
