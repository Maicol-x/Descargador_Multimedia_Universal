import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AppSettings, DownloadHistoryItem, DownloadTask } from '../../src/types/index.ts';

class AppDatabase {
  private db: Database.Database;

  constructor() {
    const dbDir = this.resolveDbDirectory();
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'universal_downloader.db');
    try {
      this.db = new Database(dbPath);
      this.initSchema();
    } catch (err: any) {
      console.error('[AppDatabase] Error inicializando SQLite, activando recuperación automática:', err);
      if (fs.existsSync(dbPath)) {
        const corruptPath = path.join(dbDir, `universal_downloader.corrupt_${Date.now()}.db`);
        try {
          fs.renameSync(dbPath, corruptPath);
          console.warn(`[AppDatabase] Archivo corrupto respaldado en: ${corruptPath}`);
        } catch {
          // ignore
        }
      }
      this.db = new Database(dbPath);
      this.initSchema();
    }
  }


  private resolveDbDirectory(): string {
    if (process.env.APPDATA) {
      return path.join(process.env.APPDATA, 'UniversalMediaDownloader');
    }
    if (process.env.HOME) {
      return path.join(process.env.HOME, '.universal_media_downloader');
    }
    return path.join(process.cwd(), 'database');
  }

  public getDbPath(): string {
    return this.db.name;
  }

  private initSchema(): void {
    // Enable WAL mode for high performance & durability
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        uploader TEXT,
        thumbnail TEXT,
        mode TEXT NOT NULL,
        format TEXT NOT NULL,
        quality TEXT NOT NULL,
        fileSize TEXT,
        filePath TEXT,
        status TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        completedAt INTEGER,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        status TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);
  }

  // --- SETTINGS ---
  public getSettings(): AppSettings {
    const defaultDownloads = path.join(os.homedir(), 'Downloads');
    const defaults: AppSettings = {
      downloadDir: defaultDownloads,
      maxConcurrency: 3,
      defaultVideoQuality: '1080p',
      defaultVideoFormat: 'mp4',
      defaultAudioFormat: 'mp3',
      defaultAudioBitrate: '320k',
      createPlaylistFolder: true,
      filenameTemplate: '%(title)s.%(ext)s',
      autoStart: true,
    };

    try {
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      const row = stmt.get('app_settings') as { value: string } | undefined;
      if (row && row.value) {
        return { ...defaults, ...JSON.parse(row.value) };
      }
    } catch {
      // return defaults
    }

    return defaults;
  }

  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated: AppSettings = { ...current, ...settings };
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('app_settings', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(JSON.stringify(updated));
    return updated;
  }

  // --- ACTIVE TASKS (QUEUE PERSISTENCE) ---
  public saveTask(task: DownloadTask): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO downloads (id, data, status, updatedAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          data = excluded.data,
          status = excluded.status,
          updatedAt = excluded.updatedAt
      `);
      stmt.run(task.id, JSON.stringify(task), task.status, Date.now());
    } catch (err) {
      console.error('Failed to persist task in DB:', err);
    }
  }

  public getSavedTasks(): DownloadTask[] {
    try {
      const stmt = this.db.prepare('SELECT data FROM downloads ORDER BY updatedAt ASC');
      const rows = stmt.all() as { data: string }[];
      return rows
        .map((r) => {
          try {
            return JSON.parse(r.data) as DownloadTask;
          } catch {
            return null;
          }
        })
        .filter((t): t is DownloadTask => t !== null);
    } catch (err) {
      console.error('Failed to load saved tasks from DB:', err);
      return [];
    }
  }

  public deleteTask(id: string): void {
    try {
      const stmt = this.db.prepare('DELETE FROM downloads WHERE id = ?');
      stmt.run(id);
    } catch (err) {
      console.error('Failed to delete task from DB:', err);
    }
  }

  public clearCompletedTasks(): void {
    try {
      const stmt = this.db.prepare(
        "DELETE FROM downloads WHERE status IN ('COMPLETED', 'FAILED', 'CANCELLED')"
      );
      stmt.run();
    } catch (err) {
      console.error('Failed to clear completed tasks from DB:', err);
    }
  }

  // --- HISTORY ---
  public getHistory(): DownloadHistoryItem[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM history ORDER BY createdAt DESC LIMIT 200');
      return stmt.all() as DownloadHistoryItem[];
    } catch {
      return [];
    }
  }

  public addHistory(item: DownloadHistoryItem): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO history (id, url, title, uploader, thumbnail, mode, format, quality, fileSize, filePath, status, createdAt, completedAt, error)
        VALUES (@id, @url, @title, @uploader, @thumbnail, @mode, @format, @quality, @fileSize, @filePath, @status, @createdAt, @completedAt, @error)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          fileSize = excluded.fileSize,
          filePath = excluded.filePath,
          completedAt = excluded.completedAt,
          error = excluded.error
      `);
      stmt.run(item);
    } catch (err) {
      console.error('Failed to add to history DB:', err);
    }
  }

  public deleteHistoryItem(id: string): void {
    const stmt = this.db.prepare('DELETE FROM history WHERE id = ?');
    stmt.run(id);
  }

  public clearHistory(): void {
    this.db.exec('DELETE FROM history');
  }
}

export const appDb = new AppDatabase();
