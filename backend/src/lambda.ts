/**
 * AWS Lambda Handler
 * 
 * This module wraps the Express application for AWS Lambda deployment
 * using serverless-http. It handles the conversion between Lambda events
 * and Express request/response objects.
 */

import serverless from 'serverless-http';
import { app } from './app';

/**
 * Lambda handler for API Gateway events
 * 
 * Supports both REST API and HTTP API (v1 and v2 payloads)
 */
export const handler = serverless(app, {
  // Handle binary responses (for file downloads)
  binary: [
    'application/octet-stream',
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/zip',
  ],
  
  // Request transformation
  request: (request, event, _context) => {
    // Add Lambda context to request for logging/tracing
    (request as typeof request & { lambdaContext?: unknown }).lambdaContext = _context;
    
    // Extract user info from API Gateway authorizer if available
    if (event.requestContext?.authorizer) {
      const claims = event.requestContext.authorizer.claims || event.requestContext.authorizer;
      if (claims.sub) {
        request.headers['x-user-id'] = claims.sub;
      }
      if (claims.email) {
        request.headers['x-user-email'] = claims.email;
      }
    }
  },
  
  // Response transformation
  response: (response, _event, _context) => {
    // Add CORS headers for Lambda responses
    response.headers = response.headers || {};
    response.headers['Access-Control-Allow-Origin'] = '*';
    response.headers['Access-Control-Allow-Credentials'] = 'true';
  },
});

/**
 * Warmup handler to keep Lambda warm
 * Use with CloudWatch Events for scheduled warming
 */
export const warmup = async (event: { source?: string }): Promise<{ statusCode: number; body: string }> => {
  if (event.source === 'serverless-plugin-warmup') {
    console.log('Lambda warmup');
    return { statusCode: 200, body: 'Warmed up' };
  }
  
  // Forward to main handler if not a warmup event
  return { statusCode: 200, body: 'OK' };
};
