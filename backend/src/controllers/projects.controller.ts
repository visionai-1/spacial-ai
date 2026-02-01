/**
 * Projects Controller - Handles project CRUD operations
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBService } from '../services/dynamodb.service';
import { sendSuccess, sendError, ErrorCodes } from '../utils';
import {
  CreateProjectRequest,
  CreateProjectResponse,
  UpdateProjectRequest,
  ListProjectsResponse,
  ProjectStatus,
} from '../types';

/**
 * Create a new project
 * POST /projects
 */
export async function createProject(req: Request, res: Response): Promise<Response> {
  try {
    const { name, description } = req.body as CreateProjectRequest;
    const userId = (req as Request & { userId?: string }).userId || 'demo-user';

    // Validate request
    if (!name || name.trim().length === 0) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Project name is required',
        400
      );
    }

    if (name.length > 100) {
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Project name must be 100 characters or less',
        400
      );
    }

    // Generate project ID
    const projectId = uuidv4();

    // Create project in DynamoDB
    const project = await dynamoDBService.createProject(userId, projectId, {
      name: name.trim(),
      description: description?.trim(),
    });

    const response: CreateProjectResponse = {
      projectId: project.projectId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
    };

    return sendSuccess(res, response, 201);
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    
    // Check for conditional check failed (duplicate)
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ConditionalCheckFailedException') {
      return sendError(
        res,
        ErrorCodes.PROJECT_ALREADY_EXISTS,
        'Project already exists',
        409
      );
    }

    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to create project', 500);
  }
}

/**
 * Get project by ID
 * GET /projects/:projectId
 */
export async function getProject(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId } = req.params;
    const userId = (req as Request & { userId?: string }).userId || 'demo-user';

    const project = await dynamoDBService.getProjectById(userId, projectId);
    if (!project) {
      return sendError(res, ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404);
    }

    if (project.status === 'deleted') {
      return sendError(res, ErrorCodes.PROJECT_NOT_FOUND, 'Project has been deleted', 404);
    }

    return sendSuccess(res, project);
  } catch (error) {
    console.error('Error getting project:', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to get project', 500);
  }
}

/**
 * List all projects for the current user
 * GET /projects
 */
export async function listProjects(req: Request, res: Response): Promise<Response> {
  try {
    const userId = (req as Request & { userId?: string }).userId || 'demo-user';
    const { status, limit, lastKey } = req.query;

    const options: {
      status?: ProjectStatus;
      limit?: number;
      lastKey?: Record<string, unknown>;
    } = {};

    if (status && typeof status === 'string') {
      options.status = status as ProjectStatus;
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

    const result = await dynamoDBService.getProjectsByUser(userId, options);

    const response: ListProjectsResponse = {
      projects: result.projects,
      nextKey: result.lastKey
        ? Buffer.from(JSON.stringify(result.lastKey)).toString('base64')
        : undefined,
    };

    return sendSuccess(res, response);
  } catch (error) {
    console.error('Error listing projects:', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to list projects', 500);
  }
}

/**
 * Update a project
 * PATCH /projects/:projectId
 */
export async function updateProject(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId } = req.params;
    const userId = (req as Request & { userId?: string }).userId || 'demo-user';
    const { name, description, status } = req.body as UpdateProjectRequest;

    // Check if project exists
    const existingProject = await dynamoDBService.getProjectById(userId, projectId);
    if (!existingProject) {
      return sendError(res, ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404);
    }

    if (existingProject.status === 'deleted') {
      return sendError(
        res,
        ErrorCodes.PROJECT_NOT_FOUND,
        'Cannot update deleted project',
        404
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          'Project name cannot be empty',
          400
        );
      }
      if (name.length > 100) {
        return sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          'Project name must be 100 characters or less',
          400
        );
      }
    }

    // Build updates object
    const updates: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
    } = {};

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (status !== undefined) updates.status = status;

    // Update project
    const updatedProject = await dynamoDBService.updateProject(
      userId,
      projectId,
      updates
    );

    return sendSuccess(res, updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to update project', 500);
  }
}

/**
 * Delete a project (soft delete)
 * DELETE /projects/:projectId
 */
export async function deleteProject(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId } = req.params;
    const userId = (req as Request & { userId?: string }).userId || 'demo-user';

    // Check if project exists
    const existingProject = await dynamoDBService.getProjectById(userId, projectId);
    if (!existingProject) {
      return sendError(res, ErrorCodes.PROJECT_NOT_FOUND, 'Project not found', 404);
    }

    if (existingProject.status === 'deleted') {
      return sendError(
        res,
        ErrorCodes.PROJECT_NOT_FOUND,
        'Project already deleted',
        404
      );
    }

    // Soft delete project
    await dynamoDBService.deleteProject(userId, projectId);

    return sendSuccess(res, { message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to delete project', 500);
  }
}
