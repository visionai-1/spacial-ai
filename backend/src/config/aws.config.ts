/**
 * AWS SDK Configuration
 */

import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * AWS Region configuration
 */
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

/**
 * S3 Configuration
 */
export const S3_CONFIG = {
  bucketName: process.env.S3_BUCKET_NAME || 'file-management-bucket',
  presignedUrlExpiry: parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10), // 1 hour default
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB default
};

/**
 * DynamoDB Configuration
 */
export const DYNAMODB_CONFIG = {
  tableName: process.env.DYNAMODB_TABLE_NAME || 'FileMetadata',
  gsiFileType: 'FileTypeIndex',
};

/**
 * S3 Client instance
 */
export const s3Client = new S3Client({
  region: AWS_REGION,
  // For local development with LocalStack or MinIO
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: true,
  }),
});

/**
 * DynamoDB Client instance
 */
const dynamoDbClient = new DynamoDBClient({
  region: AWS_REGION,
  // For local development with LocalStack or DynamoDB Local
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
  }),
});

/**
 * DynamoDB Document Client (simplified API)
 */
export const docClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Allowed MIME types for upload
 */
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/gzip',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
];
