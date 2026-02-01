---
name: AWS Serverless File Service
overview: Design and implement an AWS serverless file management system using API Gateway, Lambda, S3, and DynamoDB, with a TypeScript/Express backend that can be deployed as Lambda functions.

# AWS Serverless File Management Service

## Architecture Overview

This architecture uses AWS serverless technologies to build a scalable file management system supporting multiple projects, various file types, and filtered downloads.

### Architecture Diagram

```mermaid
flowchart TB
    subgraph client [Client Layer]
        WebApp[Web Application]
        MobileApp[Mobile App]
    end

    subgraph api [API Layer]
        APIGW[API Gateway]
    end

    subgraph auth [Authentication]
        Cognito[AWS Cognito]
    end

    subgraph compute [Compute Layer]
        LambdaUpload[Lambda: Upload Handler]
        LambdaDownload[Lambda: Download Handler]
        LambdaList[Lambda: List Files Handler]
        LambdaDelete[Lambda: Delete Handler]
    end

    subgraph storage [Storage Layer]
        S3[S3 Bucket - File Storage]
        DynamoDB[DynamoDB - File Metadata]
    end

    subgraph events [Event Processing]
        S3Events[S3 Event Notifications]
        LambdaProcessor[Lambda: File Processor]
    end

    WebApp --> APIGW
    MobileApp --> APIGW
    APIGW --> Cognito
    APIGW --> LambdaUpload
    APIGW --> LambdaDownload
    APIGW --> LambdaList
    APIGW --> LambdaDelete
    
    LambdaUpload --> S3
    LambdaUpload --> DynamoDB
    LambdaDownload --> S3
    LambdaDownload --> DynamoDB
    LambdaList --> DynamoDB
    LambdaDelete --> S3
    LambdaDelete --> DynamoDB
    
    S3 --> S3Events
    S3Events --> LambdaProcessor
    LambdaProcessor --> DynamoDB
```



### Data Flow Diagrams

#### File Upload Flow

```mermaid
sequenceDiagram
    participant User
    participant APIGateway as API Gateway
    participant Lambda as Upload Lambda
    participant S3
    participant DynamoDB

    User->>APIGateway: POST /projects/{projectId}/files
    APIGateway->>Lambda: Invoke with file data
    Lambda->>S3: Generate presigned URL
    S3-->>Lambda: Return presigned URL
    Lambda->>DynamoDB: Create file metadata record
    DynamoDB-->>Lambda: Confirm write
    Lambda-->>APIGateway: Return presigned URL + fileId
    APIGateway-->>User: Response with upload URL
    User->>S3: PUT file to presigned URL
    S3-->>User: Upload complete
```



#### File Download Flow

```mermaid
sequenceDiagram
    participant User
    participant APIGateway as API Gateway
    participant Lambda as Download Lambda
    participant DynamoDB
    participant S3

    User->>APIGateway: GET /projects/{projectId}/files/{fileId}
    APIGateway->>Lambda: Invoke
    Lambda->>DynamoDB: Get file metadata
    DynamoDB-->>Lambda: Return metadata
    Lambda->>S3: Generate presigned download URL
    S3-->>Lambda: Return URL
    Lambda-->>APIGateway: Return download URL
    APIGateway-->>User: Redirect or return URL
    User->>S3: GET file from presigned URL
    S3-->>User: File content
```



---

## AWS Services Used


| Service         | Purpose                                       |
| --------------- | --------------------------------------------- |
| **API Gateway** | RESTful API endpoints with request validation |
| **Lambda**      | Serverless compute for business logic         |
| **S3**          | Scalable file storage with versioning         |
| **DynamoDB**    | NoSQL database for file metadata              |
| **Cognito**     | User authentication and authorization         |
| **CloudWatch**  | Logging and monitoring                        |
| **IAM**         | Fine-grained access control                   |


---

## DynamoDB Data Model

### Table: `FileMetadata`


| Attribute       | Type   | Description                      |
| --------------- | ------ | -------------------------------- |
| `PK`            | String | `PROJECT#{projectId}`            |
| `SK`            | String | `FILE#{fileId}`                  |
| `fileId`        | String | UUID for the file                |
| `projectId`     | String | Project identifier               |
| `fileName`      | String | Original file name               |
| `fileType`      | String | MIME type (e.g., `image/png`)    |
| `fileExtension` | String | File extension (e.g., `.png`)    |
| `fileSize`      | Number | Size in bytes                    |
| `s3Key`         | String | S3 object key                    |
| `uploadedBy`    | String | User ID                          |
| `uploadedAt`    | String | ISO timestamp                    |
| `status`        | String | `pending`, `uploaded`, `deleted` |


### Global Secondary Index: `FileTypeIndex`

- **PK**: `projectId`
- **SK**: `fileType`
- Enables efficient queries for files by type within a project

---

## API Endpoints


| Method   | Endpoint                               | Description                   |
| -------- | -------------------------------------- | ----------------------------- |
| `POST`   | `/projects/{projectId}/files`          | Request upload URL            |
| `GET`    | `/projects/{projectId}/files`          | List files (with type filter) |
| `GET`    | `/projects/{projectId}/files/{fileId}` | Get download URL              |
| `DELETE` | `/projects/{projectId}/files/{fileId}` | Delete a file                 |
| `GET`    | `/projects`                            | List user's projects          |
| `POST`   | `/projects`                            | Create a new project          |


---

## Backend Code Structure

The Express.js backend will be structured for Lambda deployment using `serverless-http`:

```
backend/src/
├── server.ts                    # Express app (local dev)
├── lambda.ts                    # Lambda handler wrapper
├── routes/
│   ├── index.ts                 # Route aggregator
│   ├── projects.routes.ts       # Project endpoints
│   └── files.routes.ts          # File endpoints
├── controllers/
│   ├── projects.controller.ts   # Project logic
│   └── files.controller.ts      # File upload/download logic
├── services/
│   ├── s3.service.ts            # S3 operations (presigned URLs)
│   ├── dynamodb.service.ts      # DynamoDB operations
│   └── file-metadata.service.ts # File metadata business logic
├── middleware/
│   ├── auth.middleware.ts       # JWT/Cognito validation
│   ├── validation.middleware.ts # Request validation
│   └── error.middleware.ts      # Error handling
├── types/
│   ├── file.types.ts            # File-related interfaces
│   └── project.types.ts         # Project-related interfaces
├── config/
│   └── aws.config.ts            # AWS SDK configuration
└── utils/
    ├── response.utils.ts        # Standard API responses
    └── file.utils.ts            # File type detection
```

---

## Key Implementation Files

### 1. Lambda Handler ([backend/src/lambda.ts](backend/src/lambda.ts))

Wraps Express app for Lambda using `serverless-http`

### 2. S3 Service ([backend/src/services/s3.service.ts](backend/src/services/s3.service.ts))

- `generateUploadUrl(projectId, fileId, contentType)` - Creates presigned PUT URL
- `generateDownloadUrl(s3Key)` - Creates presigned GET URL
- `deleteObject(s3Key)` - Removes file from S3

### 3. DynamoDB Service ([backend/src/services/dynamodb.service.ts](backend/src/services/dynamodb.service.ts))

- `createFileMetadata(metadata)` - Stores file record
- `getFilesByProject(projectId, fileType?)` - Lists files with optional type filter
- `getFileById(projectId, fileId)` - Gets single file metadata
- `deleteFile(projectId, fileId)` - Marks file as deleted

### 4. Files Controller ([backend/src/controllers/files.controller.ts](backend/src/controllers/files.controller.ts))

- Handles upload request, generates presigned URL, creates metadata
- Handles download request with presigned URL generation
- Handles listing with file type filtering
- Handles deletion

---

## New Dependencies

```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/client-dynamodb": "^3.x",
  "@aws-sdk/lib-dynamodb": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x",
  "serverless-http": "^3.x",
  "uuid": "^9.x",
  "zod": "^3.x"
}
```

---

## Deployment Options

### Option A: Serverless Framework

Use `serverless.yml` to deploy Lambda functions and configure API Gateway, S3, and DynamoDB.

### Option B: AWS SAM

Use `template.yaml` for AWS SAM deployment with local testing support.

### Option C: CDK (TypeScript)

Use AWS CDK for infrastructure as code in TypeScript.

---

## S3 Bucket Configuration

- **Bucket Structure**: `{bucket}/{projectId}/{fileId}/{originalFileName}`
- **Versioning**: Enabled for file history
- **Lifecycle Rules**: Move to Glacier after 90 days (optional)
- **CORS**: Configured for frontend upload
- **Encryption**: Server-side encryption (SSE-S3)





# AWS Serverless File Management Service

A scalable file management backend built with Node.js/Express and TypeScript, designed for AWS Lambda deployment with S3 storage and DynamoDB metadata.

## Features

- **Multi-project file management** - Organize files by projects
- **Presigned URL uploads/downloads** - Secure direct S3 transfers
- **File type filtering** - Query files by MIME type
- **Soft delete support** - Recoverable file deletion
- **Pagination** - Efficient listing for large datasets
- **AWS Lambda ready** - Deploy with Serverless Framework

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│  Lambda (Node)  │────▶│    DynamoDB     │
└─────────────────┘     └────────┬────────┘     │   (Metadata)    │
                                 │              └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    S3 Bucket    │
                        │  (File Storage) │
                        └─────────────────┘
```

## Project Structure

```
backend/
├── src/
│   ├── app.ts                    # Express app configuration
│   ├── server.ts                 # Local development server
│   ├── lambda.ts                 # AWS Lambda handler
│   ├── config/
│   │   └── aws.config.ts         # AWS SDK configuration
│   ├── controllers/
│   │   ├── files.controller.ts   # File operations
│   │   └── projects.controller.ts # Project management
│   ├── middleware/
│   │   ├── auth.middleware.ts    # Authentication
│   │   ├── error.middleware.ts   # Error handling
│   │   └── validation.middleware.ts # Request validation
│   ├── routes/
│   │   ├── files.routes.ts       # File API routes
│   │   ├── projects.routes.ts    # Project API routes
│   │   └── index.ts              # Route aggregator
│   ├── services/
│   │   ├── s3.service.ts         # S3 operations
│   │   └── dynamodb.service.ts   # DynamoDB operations
│   ├── types/
│   │   ├── file.types.ts         # File interfaces
│   │   └── project.types.ts      # Project interfaces
│   └── utils/
│       ├── file.utils.ts         # File helpers
│       └── response.utils.ts     # API response helpers
├── serverless.yml                # Serverless Framework config
├── package.json
└── tsconfig.json
```

## API Endpoints

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:projectId` | Get project details |
| `PATCH` | `/api/projects/:projectId` | Update a project |
| `DELETE` | `/api/projects/:projectId` | Delete a project |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects/:projectId/files` | List files |
| `POST` | `/api/projects/:projectId/files` | Request upload URL |
| `GET` | `/api/projects/:projectId/files/:fileId` | Get download URL |
| `GET` | `/api/projects/:projectId/files/:fileId/metadata` | Get file metadata |
| `POST` | `/api/projects/:projectId/files/:fileId/confirm` | Confirm upload |
| `DELETE` | `/api/projects/:projectId/files/:fileId` | Delete file |

## Getting Started

### Prerequisites

- Node.js 18+
- AWS Account (for deployment)
- AWS CLI configured (for deployment)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

The server runs on `http://localhost:3001`

### AWS Deployment

1. Install Serverless Framework:
```bash
npm install -g serverless
```

2. Install esbuild plugin:
```bash
npm install --save-dev serverless-esbuild
```

3. Deploy to AWS:
```bash
serverless deploy --stage dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Local server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket name | `file-management-bucket` |
| `DYNAMODB_TABLE_NAME` | DynamoDB table | `FileMetadata` |
| `PRESIGNED_URL_EXPIRY` | URL expiry (seconds) | `3600` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `104857600` |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:5173` |

## Usage Examples

### Upload a File

1. Request upload URL:
```bash
curl -X POST http://localhost:3001/api/projects/my-project/files \
  -H "Content-Type: application/json" \
  -d '{"fileName": "document.pdf", "fileType": "application/pdf", "fileSize": 1024000}'
```

Response:
```json
{
  "success": true,
  "data": {
    "fileId": "uuid-here",
    "uploadUrl": "https://s3.amazonaws.com/...",
    "expiresIn": 3600
  }
}
```

2. Upload file to presigned URL:
```bash
curl -X PUT "presigned-url-here" \
  -H "Content-Type: application/pdf" \
  --data-binary @document.pdf
```

3. Confirm upload:
```bash
curl -X POST http://localhost:3001/api/projects/my-project/files/uuid-here/confirm
```

### Download a File

```bash
curl http://localhost:3001/api/projects/my-project/files/uuid-here
```

### List Files by Type

```bash
curl "http://localhost:3001/api/projects/my-project/files?fileType=application/pdf"
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled server |
| `npm test` | Run tests |

## License

ISC
