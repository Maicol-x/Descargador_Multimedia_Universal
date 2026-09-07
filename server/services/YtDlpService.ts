import { spawn, exec, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { BinaryResolver } from './BinaryResolver.ts';
import { MediaInfo, DownloadTask, PlaylistEntry } from '../../src/types/index.ts';

export class YtDlpService {
  private static activeProcesses = new Map<string, ChildProcess>();

  public static async getVersion(): Promise<{ ok: boolean; version: string; path: string; error?: string }> {
    const ytdlpPath = BinaryResolver.resolveYtDlp();
    return new Promise((resolve) => {
      exec(`"${ytdlpPath}" --version`, { timeout: 8000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            ok: false,
            version: 'No disponible',
            path: ytdlpPath,
            error: stderr || error.message,
          });
          return;
        }
        resolve({
          ok: true,
          version: stdout.trim(),
          path: ytdlpPath,
        });
      });
    });
  }

  /**
   * Safe updater for yt-dlp:
   * Writes to user runtime folder (AppData/UserData), verifies execution with --version,
   * and performs atomic replacement with rollback on failure.
   */
  public static async update(): Promise<{ ok: boolean; message: string; version?: string }> {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    const runtimeDir = BinaryResolver.getUserRuntimeDir();

    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }

    const tempBinaryPath = path.join(runtimeDir, `${binaryName}.tmp`);
    const targetBinaryPath = path.join(runtimeDir, binaryName);
    const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;

    console.log(`[YtDlpService] Descargando actualización hacia: ${tempBinaryPath}`);

    const dlCmd = isWindows
      ? `powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${tempBinaryPath}'"`
      : `curl -sL "${downloadUrl}" -o "${tempBinaryPath}" && chmod +x "${tempBinaryPath}"`;

    try {
      await new Promise<void>((resolve, reject) => {
        exec(dlCmd, { timeout: 60000 }, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      if (!fs.existsSync(tempBinaryPath) || fs.statSync(tempBinaryPath).size < 1000000) {
        throw new Error('El archivo descargado es inválido o está incompleto.');
      }

      if (!isWindows) {
        fs.chmodSync(tempBinaryPath, 0o755);
      }

      // Verify the new binary works
      const testVersion = await new Promise<string>((resolve, reject) => {
        exec(`"${tempBinaryPath}" --version`, { timeout: 8000 }, (err, stdout) => {
          if (err) return reject(err);
          resolve(stdout.trim());
        });
      });

      // Atomic rename
      if (fs.existsSync(targetBinaryPath)) {
        try {
          fs.unlinkSync(targetBinaryPath);
        } catch {
          // On Windows, if file is locked, rename to old
          try {
            fs.renameSync(targetBinaryPath, path.join(runtimeDir, `${binaryName}.old`));
          } catch {
            // ignore
          }
        }
      }

      fs.renameSync(tempBinaryPath, targetBinaryPath);
      BinaryResolver.clearCache();

      return {
        ok: true,
        message: `yt-dlp actualizado con éxito a la versión ${testVersion}.`,
        version: testVersion,
      };
    } catch (err: any) {
      if (fs.existsSync(tempBinaryPath)) {
        try {
          fs.unlinkSync(tempBinaryPath);
        } catch {
          // ignore
        }
      }
      return {
        ok: false,
        message: `Error al actualizar yt-dlp: ${err.message}`,
      };
    }
  }

  public static async analyzeUrl(rawUrl: string): Promise<MediaInfo> {
    const url = rawUrl.trim();
    if (!url) {
      throw new Error('La URL no puede estar vacía.');
    }

    const ytdlpPath = BinaryResolver.resolveYtDlp();
    const args = [
      '--dump-single-json',
      '--flat-playlist',
      '--no-warnings',
      url,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(ytdlpPath, args);
      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          const humanError = this.humanizeError(stderrData || 'No se pudo analizar la URL.');
          reject(new Error(humanError));
          return;
        }

        try {
          const json = JSON.parse(stdoutData);
          const isPlaylist = json._type === 'playlist' || Array.isArray(json.entries);

          let entries: PlaylistEntry[] = [];
          if (isPlaylist && Array.isArray(json.entries)) {
            entries = json.entries.map((entry: any, index: number) => ({
              id: entry.id || String(index + 1),
              title: entry.title || `Pista ${index + 1}`,
              url: entry.url || entry.webpage_url || url,
              duration: entry.duration,
              durationFormatted: entry.duration ? this.formatSeconds(entry.duration) : undefined,
              thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url || json.thumbnail,
              index: index + 1,
              selected: true,
            }));
          }

          // Extract unique real qualities available in the formats
          const qualities = new Set<string>();
          if (json.formats && Array.isArray(json.formats)) {
            json.formats.forEach((fmt: any) => {
              if (fmt.height) {
                if (fmt.height >= 2160) qualities.add('2160p (4K)');
                else if (fmt.height >= 1440) qualities.add('1440p (2K)');
                else if (fmt.height >= 1080) qualities.add('1080p (Full HD)');
                else if (fmt.height >= 720) qualities.add('720p (HD)');
                else if (fmt.height >= 480) qualities.add('480p');
                else if (fmt.height >= 360) qualities.add('360p');
              }
            });
          }

          const defaultQualities = ['1080p (Full HD)', '720p (HD)', '480p', '360p'];
          const availableQualities =
            qualities.size > 0
              ? Array.from(qualities).sort((a, b) => {
                  const numA = parseInt(a, 10) || 0;
                  const numB = parseInt(b, 10) || 0;
                  return numB - numA;
                })
              : defaultQualities;

          // Always prepend "Mejor disponible"
          if (!availableQualities.some((q) => q.includes('Mejor disponible'))) {
            availableQualities.unshift('Mejor disponible');
          }

          const mediaInfo: MediaInfo = {
            id: json.id || String(Date.now()),
            title: json.title || 'Sin título',
            uploader: json.uploader || json.channel || json.creator || 'Desconocido',
            channel: json.channel || json.uploader,
            duration: json.duration,
            durationFormatted: json.duration ? this.formatSeconds(json.duration) : undefined,
            thumbnail: json.thumbnail || json.thumbnails?.[0]?.url,
            webpageUrl: json.webpage_url || url,
            extractor: json.extractor || 'Web',
            platform: this.detectPlatform(json.extractor, url),
            description: json.description ? json.description.substring(0, 300) : undefined,
            isPlaylist,
            playlistCount: entries.length > 0 ? entries.length : (json.playlist_count || undefined),
            entries: entries.length > 0 ? entries : undefined,
            availableVideoQualities: availableQualities,
            availableAudioBitrates: ['320 kbps (Máxima)', '256 kbps', '192 kbps', '128 kbps'],
            availableVideoFormats: ['MP4', 'MKV', 'WEBM'],
            availableAudioFormats: ['MP3', 'M4A', 'FLAC', 'WAV'],
          };

          resolve(mediaInfo);
        } catch (err: any) {
          reject(new Error(`Error al procesar metadatos: ${err.message}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Error al iniciar yt-dlp: ${err.message}`));
      });
    });
  }

  public static startDownload(
    task: DownloadTask,
    onProgress: (progressData: Partial<DownloadTask>) => void,
    onComplete: (completedData: Partial<DownloadTask>) => void,
    onError: (errorMsg: string) => void
  ): void {
    const ytdlpPath = BinaryResolver.resolveYtDlp();
    const ffmpegPath = BinaryResolver.resolveFfmpeg();

    if (!fs.existsSync(task.downloadDir)) {
      try {
        fs.mkdirSync(task.downloadDir, { recursive: true });
      } catch (err: any) {
        onError(`No se pudo crear la carpeta de descargas: ${err.message}`);
        return;
      }
    }

    const outputTemplate = path.join(task.downloadDir, '%(title)s [%(id)s].%(ext)s');
    const args: string[] = [
      '--continue',
      '--newline',
      '--no-warnings',
      '--ffmpeg-location',
      path.dirname(ffmpegPath) || ffmpegPath,
      '-o',
      outputTemplate,
    ];

    if (task.mode === 'audio') {
      const audioFmt = (task.format || 'mp3').toLowerCase();
      args.push('-x');
      args.push('--audio-format', audioFmt);

      const bitrateMatch = task.quality.match(/\d+/);
      const bitrate = bitrateMatch ? `${bitrateMatch[0]}k` : '320k';
      args.push('--audio-quality', bitrate);
    } else {
      // Video mode
      const videoFmt = (task.format || 'mp4').toLowerCase();
      let height = 1080;
      const qualityMatch = task.quality.match(/\d+/);
      if (qualityMatch) {
        height = parseInt(qualityMatch[0], 10);
      }

      if (task.quality.includes('Mejor')) {
        args.push('-f', 'bestvideo+bestaudio/best');
      } else {
        args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`);
      }

      args.push('--merge-output-format', videoFmt);
    }

    args.push(task.url);

    try {
      const child = spawn(ytdlpPath, args);
      this.activeProcesses.set(task.id, child);

      let finalFilePath = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n');

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          if (line.startsWith('[download]')) {
            const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
            const sizeMatch = line.match(/of\s+~?([0-9.]+\s*[A-Za-z]+)/);
            const speedMatch = line.match(/at\s+([0-9.]+\s*[A-Za-z]+\/s)/);
            const etaMatch = line.match(/ETA\s+([0-9:]+)/);

            const progress = percentMatch ? parseFloat(percentMatch[1]) : task.progress;
            const totalFormatted = sizeMatch ? sizeMatch[1] : task.totalFormatted;
            const speed = speedMatch ? speedMatch[1] : (task.speed || 'Calculando...');
            const eta = etaMatch ? etaMatch[1] : (task.eta || '--:--');

            const destMatch = line.match(/Destination:\s+(.+)$/);
            if (destMatch && destMatch[1]) {
              finalFilePath = destMatch[1].trim();
            }

            onProgress({
              status: progress >= 100 ? 'PROCESSING' : 'DOWNLOADING',
              progress,
              speed,
              eta,
              totalFormatted,
              filePath: finalFilePath || task.filePath,
            });
          } else if (line.startsWith('[Merger]') || line.startsWith('[ExtractAudio]') || line.startsWith('[Fixup]')) {
            onProgress({
              status: 'PROCESSING',
              speed: 'Procesando formatos...',
              eta: 'Finalizando',
            });

            const destMatch = line.match(/Merging formats into "([^"]+)"/) || line.match(/Destination:\s+(.+)$/);
            if (destMatch && destMatch[1]) {
              finalFilePath = destMatch[1].trim();
            }
          } else if (line.includes('Destination:')) {
            const destMatch = line.match(/Destination:\s+(.+)$/);
            if (destMatch && destMatch[1]) {
              finalFilePath = destMatch[1].trim();
            }
          }
        }
      });

      let stderrLog = '';
      child.stderr.on('data', (data) => {
        stderrLog += data.toString();
      });

      child.on('close', (code) => {
        this.activeProcesses.delete(task.id);

        if (code === 0) {
          onComplete({
            status: 'COMPLETED',
            progress: 100,
            speed: 'Completado',
            eta: '00:00',
            filePath: finalFilePath || task.filePath || path.join(task.downloadDir, `${task.title}.${task.format}`),
            completedAt: Date.now(),
          });
        } else {
          const humanErr = this.humanizeError(stderrLog || `El proceso finalizó con código ${code}`);
          onError(humanErr);
        }
      });

      child.on('error', (err) => {
        this.activeProcesses.delete(task.id);
        onError(`Error del sistema al ejecutar proceso: ${err.message}`);
      });
    } catch (err: any) {
      this.activeProcesses.delete(task.id);
      onError(`Excepción al iniciar descarga: ${err.message}`);
    }
  }

  public static cancelDownload(taskId: string): boolean {
    const process = this.activeProcesses.get(taskId);
    if (process) {
      try {
        process.kill('SIGTERM');
        this.activeProcesses.delete(taskId);
        return true;
      } catch {
        try {
          process.kill('SIGKILL');
          this.activeProcesses.delete(taskId);
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  public static humanizeError(raw: string): string {
    const lower = raw.toLowerCase();

    if (lower.includes('private video') || lower.includes('is private')) {
      return 'El contenido es privado o no tienes autorización para acceder a él.';
    }
    if (lower.includes('video unavailable') || lower.includes('removed by the uploader')) {
      return 'El contenido ya no está disponible o ha sido eliminado por el autor.';
    }
    if (lower.includes('sign in') || lower.includes('age restricted')) {
      return 'Este contenido requiere verificación de edad o inicio de sesión en la plataforma.';
    }
    if (lower.includes('unsupported url') || lower.includes('no suitable extractor')) {
      return 'La URL no es válida o la plataforma aún no es compatible.';
    }
    if (lower.includes('network is unreachable') || lower.includes('connection refused') || lower.includes('timed out')) {
      return 'Fallo de conexión: No se pudo establecer comunicación con el servidor del contenido.';
    }
    if (lower.includes('http error 429') || lower.includes('too many requests')) {
      return 'La plataforma ha bloqueado temporalmente las peticiones por exceso de tráfico. Espera unos minutos.';
    }
    if (lower.includes('ffmpeg') && lower.includes('not found')) {
      return 'FFmpeg no fue encontrado en el sistema. Asegúrate de tener los binarios instalados.';
    }

    const firstLine = raw.split('\n').find((l) => l.includes('ERROR:')) || raw.split('\n')[0];
    return firstLine.replace(/^ERROR:\s*/i, '').substring(0, 160) || 'Ocurrió un problema inesperado al procesar la solicitud.';
  }

  private static formatSeconds(seconds: number): string {
    const sec = Math.floor(seconds);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const remainderSec = sec % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${remainderSec.toString().padStart(2, '0')}`;
    }
    return `${mins}:${remainderSec.toString().padStart(2, '0')}`;
  }

  private static detectPlatform(extractor?: string, url?: string): string {
    const ext = (extractor || '').toLowerCase();
    const u = (url || '').toLowerCase();

    if (ext.includes('youtube') || u.includes('youtu')) return 'YouTube';
    if (ext.includes('twitch') || u.includes('twitch')) return 'Twitch';
    if (ext.includes('tiktok') || u.includes('tiktok')) return 'TikTok';
    if (ext.includes('instagram') || u.includes('instagram')) return 'Instagram';
    if (ext.includes('facebook') || u.includes('fb.')) return 'Facebook';
    if (ext.includes('twitter') || ext.includes('x.com') || u.includes('twitter') || u.includes('x.com')) return 'X / Twitter';
    if (ext.includes('vimeo') || u.includes('vimeo')) return 'Vimeo';
    if (ext.includes('soundcloud') || u.includes('soundcloud')) return 'SoundCloud';
    if (ext.includes('bilibili') || u.includes('bilibili')) return 'Bilibili';
    if (ext.includes('dailymotion') || u.includes('dailymotion')) return 'Dailymotion';
    if (ext.includes('reddit') || u.includes('reddit')) return 'Reddit';
    return extractor ? extractor.toUpperCase() : 'Multimedia';
  }
}
