/**
 * S3 Service - Handles all S3 operations including presigned URL generation
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG } from '../config/aws.config';

/**
 * S3 Service class for file storage operations
 */
export class S3Service {
  private bucketName: string;
  private presignedUrlExpiry: number;

  constructor() {
    this.bucketName = S3_CONFIG.bucketName;
    this.presignedUrlExpiry = S3_CONFIG.presignedUrlExpiry;
  }

  /**
   * Generate S3 key for a file
   * Format: {projectId}/{fileId}/{fileName}
   */
  generateS3Key(projectId: string, fileId: string, fileName: string): string {
    // Sanitize filename to remove special characters
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${projectId}/${fileId}/${sanitizedFileName}`;
  }

  /**
   * Generate a presigned URL for uploading a file
   */
  async generateUploadUrl(
    projectId: string,
    fileId: string,
    fileName: string,
    contentType: string,
    fileSize?: number
  ): Promise<{ uploadUrl: string; s3Key: string; expiresIn: number }> {
    const s3Key = this.generateS3Key(projectId, fileId, fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: contentType,
      ...(fileSize && { ContentLength: fileSize }),
      Metadata: {
        projectId,
        fileId,
        originalFileName: fileName,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: this.presignedUrlExpiry,
    });

    return {
      uploadUrl,
      s3Key,
      expiresIn: this.presignedUrlExpiry,
    };
  }

  /**
   * Generate a presigned URL for downloading a file
   */
  async generateDownloadUrl(
    s3Key: string,
    originalFileName?: string
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ...(originalFileName && {
        ResponseContentDisposition: `attachment; filename="${originalFileName}"`,
      }),
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: this.presignedUrlExpiry,
    });

    return {
      downloadUrl,
      expiresIn: this.presignedUrlExpiry,
    };
  }

  /**
   * Delete an object from S3
   */
  async deleteObject(s3Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    await s3Client.send(command);
  }

  /**
   * Check if an object exists in S3
   */
  async objectExists(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await s3Client.send(command);
      return true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get object metadata from S3
   */
  async getObjectMetadata(s3Key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
  } | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const s3Service = new S3Service();
