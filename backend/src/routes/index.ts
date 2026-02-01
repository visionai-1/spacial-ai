/**
 * Central route aggregator
 */

import { Router } from 'express';
import projectsRouter from './projects.routes';

const router = Router();

/**
 * API Routes
 */
router.use('/projects', projectsRouter);

/**
 * API Info endpoint
 */
router.get('/', (req, res) => {
  res.json({
    name: 'File Management Service API',
    version: '1.0.0',
    endpoints: {
      projects: {
        list: 'GET /projects',
        create: 'POST /projects',
        get: 'GET /projects/:projectId',
        update: 'PATCH /projects/:projectId',
        delete: 'DELETE /projects/:projectId',
      },
      files: {
        list: 'GET /projects/:projectId/files',
        upload: 'POST /projects/:projectId/files',
        download: 'GET /projects/:projectId/files/:fileId',
        metadata: 'GET /projects/:projectId/files/:fileId/metadata',
        confirm: 'POST /projects/:projectId/files/:fileId/confirm',
        delete: 'DELETE /projects/:projectId/files/:fileId',
      },
    },
  });
});

export default router;
