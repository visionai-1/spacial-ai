/**
 * Express Application Configuration
 * 
 * This module creates and configures the Express app separately from the server,
 * allowing it to be used both for local development and Lambda deployment.
 */

import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import routes from './routes';
import { authMiddleware, errorHandler, notFoundHandler } from './middleware';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Trust proxy for Lambda behind API Gateway
  app.set('trust proxy', 1);

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Email'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging (development only)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: Request, _res: Response, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  // Health check endpoint (before auth)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: 'File Management Service is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Authentication middleware
  app.use(authMiddleware);

  // API routes
  app.use('/api', routes);

  // Also mount routes at root for backward compatibility
  app.use('/', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

// Export configured app instance
export const app = createApp();
