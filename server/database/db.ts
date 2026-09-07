import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { AppSettings, DownloadHistoryItem } from '../../src/types/index.ts';

class AppDatabase {
  private db: Database.Database;

  constructor() {
    const dbDir = this.resolveDbDirectory();
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'universal_downloader.db');
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private resolveDbDirectory(): string {
    // If running in packaged electron or user profile is specified
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
        updatedAt INTEGER NOT NULL
      );
    `);
  }

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
