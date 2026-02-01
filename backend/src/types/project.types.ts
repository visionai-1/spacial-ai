/**
 * Project-related TypeScript interfaces for the File Management Service
 */

/**
 * Project metadata stored in DynamoDB
 */
export interface Project {
  PK: string; // USER#{userId}
  SK: string; // PROJECT#{projectId}
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  status: ProjectStatus;
  fileCount: number;
  totalSize: number; // Total size of all files in bytes
}

/**
 * Project status enum
 */
export type ProjectStatus = 'active' | 'archived' | 'deleted';

/**
 * Request body for creating a project
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

/**
 * Response for creating a project
 */
export interface CreateProjectResponse {
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
}

/**
 * Request body for updating a project
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

/**
 * Query parameters for listing projects
 */
export interface ListProjectsQuery {
  status?: ProjectStatus;
  limit?: number;
  lastKey?: string;
}

/**
 * Response for listing projects
 */
export interface ListProjectsResponse {
  projects: Project[];
  nextKey?: string;
  totalCount?: number;
}

/**
 * Project summary for list views
 */
export interface ProjectSummary {
  projectId: string;
  name: string;
  description?: string;
  fileCount: number;
  totalSize: number;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
}
