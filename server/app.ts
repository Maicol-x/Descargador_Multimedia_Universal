import express from 'express';
import type { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './routes/api.ts';
import { YtDlpService } from './services/YtDlpService.ts';

export function cleanupAllProcesses(): void {
  YtDlpService.cleanupAllProcesses();
}

export function createExpressApp(): Express {
  const app = express();

  // CORS configured to permit local Electron and web browser origins
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, electron file://)
        if (!origin) return callback(null, true);
        if (
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          origin.startsWith('file://') ||
          origin.includes('.run.app') ||
          origin.includes('googleusercontent.com')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Resolve frontend distribution path across packaging scenarios
  const candidatesDist = [
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'dist'),
    ...(process.env.RESOURCES_PATH ? [path.join(process.env.RESOURCES_PATH, 'dist')] : []),
  ];

  let resolvedDist: string | null = null;
  for (const candidate of candidatesDist) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      resolvedDist = candidate;
      break;
    }
  }

  if (resolvedDist) {
    app.use(express.static(resolvedDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(resolvedDist!, 'index.html'));
    });
  }

  return app;
}

export const expressApp = createExpressApp();
