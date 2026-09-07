import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { YtDlpService } from '../services/YtDlpService.ts';
import { FfmpegService } from '../services/FfmpegService.ts';
import { BinaryResolver } from '../services/BinaryResolver.ts';
import { queueManager } from '../services/QueueManager.ts';
import { appDb } from '../database/db.ts';
import { DownloadTask, DiagnosticResult } from '../../src/types/index.ts';

export const apiRouter = express.Router();

// 1. ANALYZE URL
apiRouter.post('/analyze', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Debes proporcionar una URL válida.' });
  }

  try {
    const mediaInfo = await YtDlpService.analyzeUrl(url);
    return res.json(mediaInfo);
  } catch (err: any) {
    return res.status(422).json({ error: err.message || 'Error al analizar la URL' });
  }
});

// 2. DOWNLOAD DISPATCH
apiRouter.post('/download', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No se enviaron elementos para descargar.' });
  }

  const settings = appDb.getSettings();
  const createdTasks: DownloadTask[] = [];

  for (const item of items) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const downloadDir = item.downloadDir || settings.downloadDir || path.join(os.homedir(), 'Downloads');

    const task: DownloadTask = {
      id: taskId,
      url: item.url,
      title: item.title || 'Descarga Multimedia',
      uploader: item.uploader,
      thumbnail: item.thumbnail,
      mode: item.mode || 'video',
      format: item.format || (item.mode === 'audio' ? 'mp3' : 'mp4'),
      quality: item.quality || (item.mode === 'audio' ? '320 kbps' : '1080p'),
      downloadDir,
      status: 'QUEUED',
      progress: 0,
      speed: 'En cola...',
      eta: '--:--',
      downloadedBytes: 0,
      totalBytes: 0,
      downloadedFormatted: '0 MB',
      totalFormatted: item.totalFormatted || 'Calculando...',
      createdAt: Date.now(),
    };

    createdTasks.push(task);
  }

  queueManager.addMultipleTasks(createdTasks);
  return res.json({ success: true, count: createdTasks.length, tasks: createdTasks });
});

// 3. QUEUE LIST
apiRouter.get('/downloads', (_req: Request, res: Response) => {
  res.json(queueManager.getAllTasks());
});

// 4. SSE REAL-TIME PROGRESS
apiRouter.get('/downloads/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  queueManager.registerSseClient(res);
});

// 5. QUEUE ACTIONS
apiRouter.post('/downloads/:id/pause', (req: Request, res: Response) => {
  const success = queueManager.pauseTask(req.params.id);
  res.json({ success });
});

apiRouter.post('/downloads/:id/resume', (req: Request, res: Response) => {
  const success = queueManager.resumeTask(req.params.id);
  res.json({ success });
});

apiRouter.post('/downloads/:id/cancel', (req: Request, res: Response) => {
  const success = queueManager.cancelTask(req.params.id);
  res.json({ success });
});

apiRouter.post('/downloads/:id/retry', (req: Request, res: Response) => {
  const success = queueManager.retryTask(req.params.id);
  res.json({ success });
});

apiRouter.delete('/downloads/:id', (req: Request, res: Response) => {
  const success = queueManager.removeTask(req.params.id);
  res.json({ success });
});

apiRouter.post('/downloads/clear-completed', (_req: Request, res: Response) => {
  queueManager.clearCompleted();
  res.json({ success: true });
});

// 6. HISTORY
apiRouter.get('/history', (_req: Request, res: Response) => {
  res.json(appDb.getHistory());
});

apiRouter.delete('/history/:id', (req: Request, res: Response) => {
  appDb.deleteHistoryItem(req.params.id);
  res.json({ success: true });
});

apiRouter.delete('/history', (_req: Request, res: Response) => {
  appDb.clearHistory();
  res.json({ success: true });
});

// 7. SETTINGS
apiRouter.get('/settings', (_req: Request, res: Response) => {
  res.json(appDb.getSettings());
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const updated = appDb.saveSettings(req.body);
  res.json(updated);
});

// 8. DIAGNOSTICS
apiRouter.get('/diagnostics', async (_req: Request, res: Response) => {
  const settings = appDb.getSettings();
  const ytdlpVersion = await YtDlpService.getVersion();
  const ffmpegInfo = await FfmpegService.getFfmpegInfo();
  const ffprobeInfo = await FfmpegService.getFfprobeInfo();

  // Test download dir writability
  let dirOk = false;
  let dirError: string | undefined;
  try {
    if (!fs.existsSync(settings.downloadDir)) {
      fs.mkdirSync(settings.downloadDir, { recursive: true });
    }
    const testFile = path.join(settings.downloadDir, `.perm_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    dirOk = true;
  } catch (err: any) {
    dirOk = false;
    dirError = err.message;
  }

  const result: DiagnosticResult = {
    app: {
      ok: true,
      message: 'Universal Media Downloader Online',
      version: '1.0.0 (Production Core)',
    },
    database: {
      ok: true,
      message: 'SQLite WAL Operativo',
      path: appDb.getDbPath(),
    },
    ytdlp: {
      ok: ytdlpVersion.ok,
      path: ytdlpVersion.path,
      version: ytdlpVersion.version,
      error: ytdlpVersion.error,
    },
    ffmpeg: {
      ok: ffmpegInfo.installed,
      path: ffmpegInfo.path,
      version: ffmpegInfo.version,
      error: ffmpegInfo.error,
    },
    ffprobe: {
      ok: ffprobeInfo.installed,
      path: ffprobeInfo.path,
      version: ffprobeInfo.version,
      error: ffprobeInfo.error,
    },
    downloadDir: {
      ok: dirOk,
      path: settings.downloadDir,
      writable: dirOk,
      error: dirError,
    },
    environment: {
      isElectron: Boolean(process.versions.electron),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
  };

  res.json(result);
});

// 9. YT-DLP UPDATER
apiRouter.post('/ytdlp/update', async (_req: Request, res: Response) => {
  const result = await YtDlpService.update();
  res.json(result);
});

// 10. SYSTEM OPEN FILE / FOLDER
apiRouter.post('/open-file', (req: Request, res: Response) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'El archivo especificado no existe.' });
  }

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const cmd = isWindows
    ? `explorer /select,"${filePath}"`
    : isMac
    ? `open -R "${filePath}"`
    : `xdg-open "${path.dirname(filePath)}"`;

  exec(cmd, (err) => {
    if (err) {
      return res.status(500).json({ error: 'No se pudo abrir el archivo.' });
    }
    res.json({ success: true });
  });
});

apiRouter.post('/open-folder', (req: Request, res: Response) => {
  const { folderPath } = req.body;
  const target = folderPath || appDb.getSettings().downloadDir;

  if (!target || !fs.existsSync(target)) {
    return res.status(404).json({ error: 'La carpeta no existe.' });
  }

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const cmd = isWindows
    ? `explorer "${target}"`
    : isMac
    ? `open "${target}"`
    : `xdg-open "${target}"`;

  exec(cmd, (err) => {
    if (err) {
      return res.status(500).json({ error: 'No se pudo abrir la carpeta.' });
    }
    res.json({ success: true });
  });
});
