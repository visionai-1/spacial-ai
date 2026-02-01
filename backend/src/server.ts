/**
 * Local Development Server
 * 
 * This is the entry point for running the server locally during development.
 * For Lambda deployment, use lambda.ts instead.
 */

import dotenv from 'dotenv';

// Load environment variables before importing app
dotenv.config();

import { app } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Start server for local development
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       File Management Service - Local Development          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on port ${PORT}                               ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                                ║');
  console.log(`║  - Health:    GET  http://localhost:${PORT}/health             ║`);
  console.log(`║  - API Info:  GET  http://localhost:${PORT}/api                ║`);
  console.log(`║  - Projects:  GET  http://localhost:${PORT}/api/projects       ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});

// Export app for testing
export { app };
