import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
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
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Debes proporcionar una URL válida.' });
  }

  const cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'La URL debe comenzar con http:// o https://' });
  }

  try {
    const mediaInfo = await YtDlpService.analyzeUrl(cleanUrl);
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
    if (!item.url || typeof item.url !== 'string') continue;
    const cleanUrl = item.url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) continue;

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const downloadDir =
      (typeof item.downloadDir === 'string' && item.downloadDir.trim()) ||
      settings.downloadDir ||
      path.join(os.homedir(), 'Downloads');

    const task: DownloadTask = {
      id: taskId,
      url: cleanUrl,
      title: (item.title || 'Descarga Multimedia').trim().substring(0, 300),

      uploader: item.uploader,
      thumbnail: item.thumbnail,
      mode: item.mode === 'audio' ? 'audio' : 'video',
      format: (item.format || (item.mode === 'audio' ? 'mp3' : 'mp4')).toLowerCase(),
      quality: item.quality || (item.mode === 'audio' ? '320 kbps (Máxima)' : '1080p (Full HD)'),
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

  if (createdTasks.length === 0) {
    return res.status(400).json({ error: 'Ningún elemento válido para procesar.' });
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
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
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
  if (req.body && typeof req.body === 'object') {
    const updated = appDb.saveSettings(req.body);
    return res.json(updated);
  }
  res.status(400).json({ error: 'Configuración inválida' });
});

// 8. DIAGNOSTICS
apiRouter.get('/diagnostics', async (_req: Request, res: Response) => {
  const settings = appDb.getSettings();
  const ytdlpVersion = await YtDlpService.getVersion();
  const ffmpegInfo = await FfmpegService.getFfmpegInfo();
  const ffprobeInfo = await FfmpegService.getFfprobeInfo();

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
      message: 'Universal Media Downloader Operativo',
      version: '1.0.0 (Production Core)',
    },
    database: {
      ok: true,
      message: 'SQLite WAL Operativo (Persistencia Activa)',
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
      isElectron: Boolean(process.env.IS_ELECTRON || (process.versions as any)?.electron),
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

const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.webm', '.avi', '.mov', '.wmv', '.flv', '.m4v',
  '.mp3', '.m4a', '.aac', '.flac', '.wav', '.opus', '.ogg',
  '.part', '.ytdl', '.jpg', '.jpeg', '.png', '.webp', '.srt', '.vtt'
]);

// 10. SAFE OPEN FILE / FOLDER (Without command injection or arbitrary execution)
apiRouter.post('/open-file', (req: Request, res: Response) => {
  const { filePath } = req.body;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'Ruta no válida.' });
  }

  const safePath = path.normalize(filePath);
  if (!fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'El archivo especificado no existe.' });
  }

  try {
    const stat = fs.statSync(safePath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'La ruta especificada no es un archivo regular.' });
    }
  } catch {
    return res.status(500).json({ error: 'Error al inspeccionar el archivo.' });
  }

  const ext = path.extname(safePath).toLowerCase();
  if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
    return res.status(403).json({ error: 'Tipo de archivo restringido por seguridad.' });
  }

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  try {
    if (isWindows) {
      spawn('explorer.exe', ['/select,', safePath], { detached: true });
    } else if (isMac) {
      spawn('open', ['-R', safePath], { detached: true });
    } else {
      spawn('xdg-open', [path.dirname(safePath)], { detached: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: `No se pudo abrir el archivo: ${err.message}` });
  }

  return res.json({ success: true });
});

apiRouter.post('/open-folder', (req: Request, res: Response) => {
  const { folderPath } = req.body;
  const target = (typeof folderPath === 'string' && folderPath.trim()) || appDb.getSettings().downloadDir;

  if (!target) {
    return res.status(400).json({ error: 'Carpeta no especificada.' });
  }

  const safePath = path.normalize(target);
  if (!fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'La carpeta no existe.' });
  }

  try {
    const stat = fs.statSync(safePath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'La ruta especificada no es un directorio.' });
    }
  } catch {
    return res.status(500).json({ error: 'Error al inspeccionar la carpeta.' });
  }

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  try {
    if (isWindows) {
      spawn('explorer.exe', [safePath], { detached: true });
    } else if (isMac) {
      spawn('open', [safePath], { detached: true });
    } else {
      spawn('xdg-open', [safePath], { detached: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: `No se pudo abrir la carpeta: ${err.message}` });
  }

  return res.json({ success: true });
});

// 11. WEB DOWNLOAD STREAM (For browser environment)
apiRouter.get('/files/download', (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'Ruta no válida.' });
  }

  const safePath = path.normalize(filePath);
  if (!fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado.' });
  }

  try {
    const stat = fs.statSync(safePath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'No es un archivo descargable.' });
    }
  } catch {
    return res.status(500).json({ error: 'Error al acceder al archivo.' });
  }

  const ext = path.extname(safePath).toLowerCase();
  if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
    return res.status(403).json({ error: 'Tipo de archivo no permitido para descarga web.' });
  }

  return res.download(safePath);
});

