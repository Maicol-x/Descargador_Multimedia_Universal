import type { Response } from 'express';
import { DownloadTask, DownloadHistoryItem } from '../../src/types/index.ts';
import { YtDlpService } from './YtDlpService.ts';
import { appDb } from '../database/db.ts';

export class QueueManager {
  private static instance: QueueManager;
  private tasks: Map<string, DownloadTask> = new Map();
  private sseClients: Set<Response> = new Set();
  private activeWorkers = 0;

  private constructor() {}

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  public registerSseClient(res: Response): void {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });

    // Send initial snapshot of all tasks
    const initialPayload = JSON.stringify({
      type: 'INIT',
      tasks: this.getAllTasks(),
    });
    res.write(`data: ${initialPayload}\n\n`);
  }

  private broadcastTaskUpdate(task: DownloadTask): void {
    const payload = JSON.stringify({
      type: 'TASK_UPDATED',
      task,
    });
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private broadcastTaskRemoved(taskId: string): void {
    const payload = JSON.stringify({
      type: 'TASK_REMOVED',
      taskId,
    });
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  public getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getTask(id: string): DownloadTask | undefined {
    return this.tasks.get(id);
  }

  public addTask(task: DownloadTask): DownloadTask {
    this.tasks.set(task.id, task);
    this.broadcastTaskUpdate(task);
    this.processNextInQueue();
    return task;
  }

  public addMultipleTasks(tasks: DownloadTask[]): DownloadTask[] {
    for (const t of tasks) {
      this.tasks.set(t.id, t);
      this.broadcastTaskUpdate(t);
    }
    this.processNextInQueue();
    return tasks;
  }

  public pauseTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.status === 'DOWNLOADING' || task.status === 'PROCESSING') {
      YtDlpService.cancelDownload(id);
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      task.status = 'PAUSED';
      task.speed = 'Pausado';
      this.broadcastTaskUpdate(task);
      this.processNextInQueue();
      return true;
    }
    return false;
  }

  public resumeTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'PAUSED') return false;

    task.status = 'QUEUED';
    task.speed = 'En cola...';
    this.broadcastTaskUpdate(task);
    this.processNextInQueue();
    return true;
  }

  public cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.status === 'DOWNLOADING' || task.status === 'PROCESSING') {
      YtDlpService.cancelDownload(id);
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
    }

    task.status = 'CANCELLED';
    task.speed = 'Cancelado';
    task.eta = '--:--';
    this.broadcastTaskUpdate(task);

    // Save to history
    this.saveToHistory(task);
    this.processNextInQueue();
    return true;
  }

  public retryTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.status = 'QUEUED';
    task.progress = 0;
    task.speed = 'Reintentando...';
    task.eta = '--:--';
    task.error = undefined;
    this.broadcastTaskUpdate(task);
    this.processNextInQueue();
    return true;
  }

  public removeTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.status === 'DOWNLOADING' || task.status === 'PROCESSING') {
      YtDlpService.cancelDownload(id);
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
    }

    this.tasks.delete(id);
    this.broadcastTaskRemoved(id);
    this.processNextInQueue();
    return true;
  }

  public clearCompleted(): void {
    for (const [id, task] of this.tasks.entries()) {
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)) {
        this.tasks.delete(id);
        this.broadcastTaskRemoved(id);
      }
    }
  }

  private processNextInQueue(): void {
    const settings = appDb.getSettings();
    const maxConcurrency = Math.max(1, Math.min(5, settings.maxConcurrency || 3));

    if (this.activeWorkers >= maxConcurrency) {
      return;
    }

    // Find next QUEUED task
    const nextTask = Array.from(this.tasks.values())
      .filter((t) => t.status === 'QUEUED')
      .sort((a, b) => a.createdAt - b.createdAt)[0];

    if (!nextTask) return;

    this.activeWorkers++;
    nextTask.status = 'DOWNLOADING';
    nextTask.speed = 'Iniciando descarga...';
    this.broadcastTaskUpdate(nextTask);

    YtDlpService.startDownload(
      nextTask,
      (progressUpdates) => {
        Object.assign(nextTask, progressUpdates);
        this.broadcastTaskUpdate(nextTask);
      },
      (completionUpdates) => {
        Object.assign(nextTask, completionUpdates);
        this.activeWorkers = Math.max(0, this.activeWorkers - 1);
        this.broadcastTaskUpdate(nextTask);
        this.saveToHistory(nextTask);
        this.processNextInQueue();
      },
      (errorMessage) => {
        nextTask.status = 'FAILED';
        nextTask.error = errorMessage;
        nextTask.speed = 'Error';
        nextTask.eta = '--:--';
        this.activeWorkers = Math.max(0, this.activeWorkers - 1);
        this.broadcastTaskUpdate(nextTask);
        this.saveToHistory(nextTask);
        this.processNextInQueue();
      }
    );
  }

  private saveToHistory(task: DownloadTask): void {
    const historyItem: DownloadHistoryItem = {
      id: task.id,
      url: task.url,
      title: task.title,
      uploader: task.uploader,
      thumbnail: task.thumbnail,
      mode: task.mode,
      format: task.format,
      quality: task.quality,
      fileSize: task.totalFormatted || `${Math.round(task.totalBytes / (1024 * 1024))} MB`,
      filePath: task.filePath,
      status: task.status as 'COMPLETED' | 'FAILED' | 'CANCELLED',
      createdAt: task.createdAt,
      completedAt: task.completedAt || Date.now(),
      error: task.error,
    };
    appDb.addHistory(historyItem);
  }
}

export const queueManager = QueueManager.getInstance();
