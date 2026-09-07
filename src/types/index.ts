export type MediaType = 'video' | 'audio';

export type DownloadStatus =
  | 'QUEUED'
  | 'ANALYZING'
  | 'DOWNLOADING'
  | 'PROCESSING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface FormatOption {
  formatId: string;
  ext: string;
  resolution?: string;
  note?: string;
  filesize?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  tbr?: number;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  duration?: number;
  durationFormatted?: string;
  thumbnail?: string;
  index: number;
  selected?: boolean;
}

export interface MediaInfo {
  id: string;
  title: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  durationFormatted?: string;
  thumbnail?: string;
  webpageUrl: string;
  extractor?: string;
  platform?: string;
  description?: string;
  isPlaylist: boolean;
  playlistCount?: number;
  entries?: PlaylistEntry[];
  availableVideoQualities: string[];
  availableAudioBitrates: string[];
  availableVideoFormats: string[];
  availableAudioFormats: string[];
}

export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  uploader?: string;
  thumbnail?: string;
  mode: MediaType;
  format: string;
  quality: string;
  downloadDir: string;
  status: DownloadStatus;
  progress: number; // 0 to 100
  speed: string; // e.g. "4.2 MB/s"
  eta: string; // e.g. "00:45"
  downloadedBytes: number;
  totalBytes: number;
  downloadedFormatted: string;
  totalFormatted: string;
  error?: string;
  filePath?: string;
  fileName?: string;
  createdAt: number;
  completedAt?: number;
}

export interface DownloadHistoryItem {
  id: string;
  url: string;
  title: string;
  uploader?: string;
  thumbnail?: string;
  mode: MediaType;
  format: string;
  quality: string;
  fileSize?: string;
  filePath?: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface AppSettings {
  downloadDir: string;
  maxConcurrency: number;
  defaultVideoQuality: string;
  defaultVideoFormat: string;
  defaultAudioFormat: string;
  defaultAudioBitrate: string;
  createPlaylistFolder: boolean;
  filenameTemplate: string;
  autoStart: boolean;
}

export interface DiagnosticResult {
  app: { ok: boolean; message: string; version: string };
  database: { ok: boolean; message: string; path: string };
  ytdlp: { ok: boolean; path: string; version: string; error?: string };
  ffmpeg: { ok: boolean; path: string; version: string; error?: string };
  ffprobe: { ok: boolean; path: string; version: string; error?: string };
  downloadDir: { ok: boolean; path: string; writable: boolean; error?: string };
  environment: {
    isElectron: boolean;
    platform: string;
    arch: string;
    nodeVersion: string;
  };
}

// Runtime symbols to satisfy Node.js native ESM type-stripping
export const FormatOption = {};
export const PlaylistEntry = {};
export const MediaInfo = {};
export const DownloadTask = {};
export const DownloadHistoryItem = {};
export const AppSettings = {};
export const DiagnosticResult = {};

