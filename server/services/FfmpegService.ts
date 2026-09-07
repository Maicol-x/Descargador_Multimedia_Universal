import { exec } from 'child_process';
import { BinaryResolver } from './BinaryResolver.ts';

export interface FfmpegInfo {
  installed: boolean;
  version: string;
  path: string;
  error?: string;
}

export class FfmpegService {
  public static async getFfmpegInfo(): Promise<FfmpegInfo> {
    const ffmpegPath = BinaryResolver.resolveFfmpeg();
    return new Promise((resolve) => {
      exec(`"${ffmpegPath}" -version`, { timeout: 4000 }, (error, stdout) => {
        if (error) {
          resolve({
            installed: false,
            version: 'No detectado',
            path: ffmpegPath,
            error: error.message,
          });
          return;
        }

        const firstLine = stdout.split('\n')[0] || '';
        const match = firstLine.match(/ffmpeg version ([^\s]+)/i);
        const version = match ? match[1] : firstLine.substring(0, 30);

        resolve({
          installed: true,
          version,
          path: ffmpegPath,
        });
      });
    });
  }

  public static async getFfprobeInfo(): Promise<FfmpegInfo> {
    const ffprobePath = BinaryResolver.resolveFfprobe();
    return new Promise((resolve) => {
      exec(`"${ffprobePath}" -version`, { timeout: 4000 }, (error, stdout) => {
        if (error) {
          resolve({
            installed: false,
            version: 'No detectado',
            path: ffprobePath,
            error: error.message,
          });
          return;
        }

        const firstLine = stdout.split('\n')[0] || '';
        const match = firstLine.match(/ffprobe version ([^\s]+)/i);
        const version = match ? match[1] : firstLine.substring(0, 30);

        resolve({
          installed: true,
          version,
          path: ffprobePath,
        });
      });
    });
  }
}
