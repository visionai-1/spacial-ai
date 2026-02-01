/**
 * DynamoDB Service - Handles all DynamoDB operations for file and project metadata
 */

import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, DYNAMODB_CONFIG } from '../config/aws.config';
import {
  FileMetadata,
  FileStatus,
  CreateFileMetadata,
  Project,
  ProjectStatus,
  CreateProjectRequest,
} from '../types';

/**
 * DynamoDB Service class for metadata operations
 */
export class DynamoDBService {
  private tableName: string;

  constructor() {
    this.tableName = DYNAMODB_CONFIG.tableName;
  }

  // ==================== FILE OPERATIONS ====================

  /**
   * Create file metadata record
   */
  async createFileMetadata(metadata: CreateFileMetadata): Promise<FileMetadata> {
    const now = new Date().toISOString();

    const item: FileMetadata = {
      PK: `PROJECT#${metadata.projectId}`,
      SK: `FILE#${metadata.fileId}`,
      fileId: metadata.fileId,
      projectId: metadata.projectId,
      fileName: metadata.fileName,
      fileType: metadata.fileType,
      fileExtension: metadata.fileExtension,
      fileSize: metadata.fileSize,
      s3Key: metadata.s3Key,
      uploadedBy: metadata.uploadedBy,
      uploadedAt: now,
      status: 'pending',
    };

    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      })
    );

    return item;
  }

  /**
   * Get file metadata by project and file ID
   */
  async getFileById(projectId: string, fileId: string): Promise<FileMetadata | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `FILE#${fileId}`,
        },
      })
    );

    return (result.Item as FileMetadata) || null;
  }

  /**
   * Get all files for a project with optional filtering
   */
  async getFilesByProject(
    projectId: string,
    options?: {
      fileType?: string;
      status?: FileStatus;
      limit?: number;
      lastKey?: Record<string, unknown>;
    }
  ): Promise<{ files: FileMetadata[]; lastKey?: Record<string, unknown> }> {
    let filterExpression: string | undefined;
    const expressionAttributeValues: Record<string, unknown> = {
      ':pk': `PROJECT#${projectId}`,
      ':skPrefix': 'FILE#',
    };
    const expressionAttributeNames: Record<string, string> = {};

    const filters: string[] = [];

    if (options?.fileType) {
      filters.push('fileType = :fileType');
      expressionAttributeValues[':fileType'] = options.fileType;
    }

    if (options?.status) {
      filters.push('#status = :status');
      expressionAttributeValues[':status'] = options.status;
      expressionAttributeNames['#status'] = 'status';
    } else {
      // Default: exclude deleted files
      filters.push('#status <> :deletedStatus');
      expressionAttributeValues[':deletedStatus'] = 'deleted';
      expressionAttributeNames['#status'] = 'status';
    }

    if (filters.length > 0) {
      filterExpression = filters.join(' AND ');
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 
          ? expressionAttributeNames 
          : undefined,
        Limit: options?.limit,
        ExclusiveStartKey: options?.lastKey,
      })
    );

    return {
      files: (result.Items as FileMetadata[]) || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Update file status (e.g., from pending to uploaded)
   */
  async updateFileStatus(
    projectId: string,
    fileId: string,
    status: FileStatus
  ): Promise<FileMetadata | null> {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `FILE#${fileId}`,
        },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return (result.Attributes as FileMetadata) || null;
  }

  /**
   * Mark file as deleted (soft delete)
   */
  async deleteFile(projectId: string, fileId: string): Promise<FileMetadata | null> {
    return this.updateFileStatus(projectId, fileId, 'deleted');
  }

  /**
   * Hard delete file metadata (use with caution)
   */
  async hardDeleteFile(projectId: string, fileId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `FILE#${fileId}`,
        },
      })
    );
  }

  // ==================== PROJECT OPERATIONS ====================

  /**
   * Create project metadata
   */
  async createProject(
    userId: string,
    projectId: string,
    data: CreateProjectRequest
  ): Promise<Project> {
    const now = new Date().toISOString();

    const item: Project = {
      PK: `USER#${userId}`,
      SK: `PROJECT#${projectId}`,
      projectId,
      name: data.name,
      description: data.description,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      fileCount: 0,
      totalSize: 0,
    };

    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      })
    );

    return item;
  }

  /**
   * Get project by ID
   */
  async getProjectById(userId: string, projectId: string): Promise<Project | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `PROJECT#${projectId}`,
        },
      })
    );

    return (result.Item as Project) || null;
  }

  /**
   * Get all projects for a user
   */
  async getProjectsByUser(
    userId: string,
    options?: {
      status?: ProjectStatus;
      limit?: number;
      lastKey?: Record<string, unknown>;
    }
  ): Promise<{ projects: Project[]; lastKey?: Record<string, unknown> }> {
    let filterExpression: string | undefined;
    const expressionAttributeValues: Record<string, unknown> = {
      ':pk': `USER#${userId}`,
      ':skPrefix': 'PROJECT#',
    };
    const expressionAttributeNames: Record<string, string> = {};

    if (options?.status) {
      filterExpression = '#status = :status';
      expressionAttributeValues[':status'] = options.status;
      expressionAttributeNames['#status'] = 'status';
    } else {
      // Default: exclude deleted projects
      filterExpression = '#status <> :deletedStatus';
      expressionAttributeValues[':deletedStatus'] = 'deleted';
      expressionAttributeNames['#status'] = 'status';
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        Limit: options?.limit,
        ExclusiveStartKey: options?.lastKey,
      })
    );

    return {
      projects: (result.Items as Project[]) || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Update project metadata
   */
  async updateProject(
    userId: string,
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
    }
  ): Promise<Project | null> {
    const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeValues: Record<string, unknown> = {
      ':updatedAt': new Date().toISOString(),
    };
    const expressionAttributeNames: Record<string, string> = {
      '#updatedAt': 'updatedAt',
    };

    if (updates.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeValues[':name'] = updates.name;
      expressionAttributeNames['#name'] = 'name';
    }

    if (updates.description !== undefined) {
      updateExpressions.push('#description = :description');
      expressionAttributeValues[':description'] = updates.description;
      expressionAttributeNames['#description'] = 'description';
    }

    if (updates.status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = updates.status;
      expressionAttributeNames['#status'] = 'status';
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `PROJECT#${projectId}`,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW',
      })
    );

    return (result.Attributes as Project) || null;
  }

  /**
   * Update project file statistics
   */
  async updateProjectStats(
    userId: string,
    projectId: string,
    fileCountDelta: number,
    sizeDelta: number
  ): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `PROJECT#${projectId}`,
        },
        UpdateExpression:
          'SET fileCount = fileCount + :fileCountDelta, totalSize = totalSize + :sizeDelta, #updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':fileCountDelta': fileCountDelta,
          ':sizeDelta': sizeDelta,
          ':updatedAt': new Date().toISOString(),
        },
        ExpressionAttributeNames: {
          '#updatedAt': 'updatedAt',
        },
      })
    );
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(userId: string, projectId: string): Promise<Project | null> {
    return this.updateProject(userId, projectId, { status: 'deleted' });
  }
}

// Export singleton instance
export const dynamoDBService = new DynamoDBService();
