import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class BinaryResolver {
  private static cachedYtDlp: string | null = null;
  private static cachedFfmpeg: string | null = null;
  private static cachedFfprobe: string | null = null;

  /**
   * Determine the root directory whether running in development,
   * standalone node, or packaged Electron.
   */
  public static getAppRoot(): string {
    return process.cwd();
  }

  /**
   * Resolve yt-dlp binary path
   */
  public static resolveYtDlp(): string {
    if (this.cachedYtDlp && fs.existsSync(this.cachedYtDlp)) {
      return this.cachedYtDlp;
    }

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    const appRoot = this.getAppRoot();

    // Potential locations in order of priority:
    const candidates: string[] = [
      // 1. Electron resourcesPath (packaged app)
      ...(process.env.RESOURCES_PATH
        ? [
            path.join(process.env.RESOURCES_PATH, 'binaries', binaryName),
            path.join(process.env.RESOURCES_PATH, 'binaries', 'yt-dlp', binaryName),
          ]
        : []),
      // 2. Project local binaries folder
      path.join(appRoot, 'binaries', binaryName),
      path.join(appRoot, 'binaries', 'yt-dlp', binaryName),
      path.join(appRoot, 'binaries', 'yt-dlp'),
      // 3. Fallbacks
      path.join('/usr/local/bin', binaryName),
      path.join('/usr/bin', binaryName),
      path.join('/tmp', binaryName),
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          // ensure executable permission on unix
          if (!isWindows) {
            try {
              fs.chmodSync(candidate, 0o755);
            } catch {
              // ignore
            }
          }
          this.cachedYtDlp = candidate;
          return candidate;
        }
      } catch {
        // continue
      }
    }

    // 4. Check system PATH
    try {
      const checkCmd = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
      const pathOutput = execSync(checkCmd, { encoding: 'utf-8', timeout: 3000 }).trim().split('\n')[0].trim();
      if (pathOutput && fs.existsSync(pathOutput)) {
        this.cachedYtDlp = pathOutput;
        return pathOutput;
      }
    } catch {
      // not in PATH
    }

    // Default fallback to bare binary name
    return binaryName;
  }

  /**
   * Resolve FFmpeg binary path
   */
  public static resolveFfmpeg(): string {
    if (this.cachedFfmpeg && fs.existsSync(this.cachedFfmpeg)) {
      return this.cachedFfmpeg;
    }

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
    const appRoot = this.getAppRoot();

    const candidates: string[] = [
      ...(process.env.RESOURCES_PATH
        ? [
            path.join(process.env.RESOURCES_PATH, 'binaries', binaryName),
            path.join(process.env.RESOURCES_PATH, 'binaries', 'ffmpeg', binaryName),
          ]
        : []),
      path.join(appRoot, 'binaries', binaryName),
      path.join(appRoot, 'binaries', 'ffmpeg', binaryName),
      path.join('/usr/bin', binaryName),
      path.join('/usr/local/bin', binaryName),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        this.cachedFfmpeg = candidate;
        return candidate;
      }
    }

    try {
      const checkCmd = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
      const pathOutput = execSync(checkCmd, { encoding: 'utf-8', timeout: 3000 }).trim().split('\n')[0].trim();
      if (pathOutput && fs.existsSync(pathOutput)) {
        this.cachedFfmpeg = pathOutput;
        return pathOutput;
      }
    } catch {
      // ignore
    }

    return binaryName;
  }

  /**
   * Resolve FFprobe binary path
   */
  public static resolveFfprobe(): string {
    if (this.cachedFfprobe && fs.existsSync(this.cachedFfprobe)) {
      return this.cachedFfprobe;
    }

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'ffprobe.exe' : 'ffprobe';
    const appRoot = this.getAppRoot();

    const candidates: string[] = [
      ...(process.env.RESOURCES_PATH
        ? [
            path.join(process.env.RESOURCES_PATH, 'binaries', binaryName),
            path.join(process.env.RESOURCES_PATH, 'binaries', 'ffmpeg', binaryName),
          ]
        : []),
      path.join(appRoot, 'binaries', binaryName),
      path.join(appRoot, 'binaries', 'ffmpeg', binaryName),
      path.join('/usr/bin', binaryName),
      path.join('/usr/local/bin', binaryName),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        this.cachedFfprobe = candidate;
        return candidate;
      }
    }

    try {
      const checkCmd = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
      const pathOutput = execSync(checkCmd, { encoding: 'utf-8', timeout: 3000 }).trim().split('\n')[0].trim();
      if (pathOutput && fs.existsSync(pathOutput)) {
        this.cachedFfprobe = pathOutput;
        return pathOutput;
      }
    } catch {
      // ignore
    }

    return binaryName;
  }

  /**
   * Clear cache (useful after updater runs)
   */
  public static clearCache(): void {
    this.cachedYtDlp = null;
    this.cachedFfmpeg = null;
    this.cachedFfprobe = null;
  }
}
