import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class BinaryResolver {
  private static cachedYtDlp: string | null = null;
  private static cachedFfmpeg: string | null = null;
  private static cachedFfprobe: string | null = null;

  /**
   * Get user runtime directory for updated binaries
   */
  public static getUserRuntimeDir(): string {
    if (process.env.APPDATA) {
      return path.join(process.env.APPDATA, 'UniversalMediaDownloader', 'runtime');
    }
    if (process.env.HOME) {
      return path.join(process.env.HOME, '.universal_media_downloader', 'runtime');
    }
    return path.join(process.cwd(), 'runtime');
  }

  /**
   * Resolve yt-dlp binary path with robust multi-tier fallback
   */
  public static resolveYtDlp(): string {
    if (this.cachedYtDlp && fs.existsSync(this.cachedYtDlp)) {
      return this.cachedYtDlp;
    }

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';

    // 1. Updated runtime binary in UserData (highest priority if valid)
    const userRuntimePath = path.join(this.getUserRuntimeDir(), binaryName);
    if (fs.existsSync(userRuntimePath)) {
      try {
        const stat = fs.statSync(userRuntimePath);
        if (stat.size > 500000) {
          if (!isWindows) {
            try {
              fs.chmodSync(userRuntimePath, 0o755);
            } catch {
              // ignore
            }
          }
          this.cachedYtDlp = userRuntimePath;
          return userRuntimePath;
        }
      } catch {
        // continue to next tier
      }
    }

    // 2. Electron resourcesPath (packaged app)
    const resourcesPath =
      process.env.RESOURCES_PATH ||
      (typeof process !== 'undefined' && (process as any).resourcesPath);

    if (resourcesPath) {
      const candidatesInResources = [
        path.join(resourcesPath, 'binaries', binaryName),
        path.join(resourcesPath, 'binaries', 'yt-dlp', binaryName),
      ];
      for (const candidate of candidatesInResources) {
        if (fs.existsSync(candidate)) {
          this.cachedYtDlp = candidate;
          return candidate;
        }
      }
    }

    // 3. Project local binaries folder (relative to module or cwd)
    const projectCandidates = [
      path.join(process.cwd(), 'binaries', binaryName),
      path.join(__dirname, '..', '..', 'binaries', binaryName),
      path.join(__dirname, '..', '..', '..', 'binaries', binaryName),
      path.join(process.cwd(), 'binaries', 'yt-dlp'),
    ];

    for (const candidate of projectCandidates) {
      if (fs.existsSync(candidate)) {
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
    }

    // 4. System PATH fallback
    try {
      const checkCmd = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
      const pathOutput = execSync(checkCmd, { encoding: 'utf-8', timeout: 3000 })
        .trim()
        .split(/\r?\n/)[0]
        .trim();
      if (pathOutput && fs.existsSync(pathOutput)) {
        this.cachedYtDlp = pathOutput;
        return pathOutput;
      }
    } catch {
      // not in PATH
    }

    // 5. Unix standard system locations
    if (!isWindows) {
      const unixPaths = [
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        path.join(process.env.HOME || '', '.local', 'bin', 'yt-dlp'),
      ];
      for (const up of unixPaths) {
        if (fs.existsSync(up)) {
          this.cachedYtDlp = up;
          return up;
        }
      }
    }

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

    // 1. Packaged Electron resources
    const resourcesPath =
      process.env.RESOURCES_PATH ||
      (typeof process !== 'undefined' && (process as any).resourcesPath);

    if (resourcesPath) {
      const candidate = path.join(resourcesPath, 'binaries', binaryName);
      if (fs.existsSync(candidate)) {
        this.cachedFfmpeg = candidate;
        return candidate;
      }
    }

    // 2. Development & local binaries
    const candidates = [
      path.join(process.cwd(), 'binaries', binaryName),
      path.join(__dirname, '..', '..', 'binaries', binaryName),
      path.join(__dirname, '..', '..', '..', 'binaries', binaryName),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        this.cachedFfmpeg = candidate;
        return candidate;
      }
    }

    // 3. System PATH
    try {
      const checkCmd = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
      const pathOutput = execSync(checkCmd, { encoding: 'utf-8', timeout: 3000 })
        .trim()
        .split(/\r?\n/)[0]
        .trim();
      if (pathOutput && fs.existsSync(pathOutput)) {
        this.cachedFfmpeg = pathOutput;
        return pathOutput;
      }
    } catch {
      // not in PATH
    }

    // 4. Standard system locations
    if (!isWindows) {
      for (const p of ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']) {
        if (fs.existsSync(p)) {
          this.cachedFfmpeg = p;
          return p;
        }
      }
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

    // 1. Packaged Electron resources
    const resourcesPath =
      process.env.RESOURCES_PATH ||
      (typeof process !== 'undefined' && (process as any).resourcesPath);

    if (resourcesPath) {
      const candidate = path.join(resourcesPath, 'binaries', binaryName);
      if (fs.existsSync(candidate)) {
        this.cachedFfprobe = candidate;
        return candidate;
      }
    }

    // 2. Development & local binaries
    const candidates = [
      path.join(process.cwd(), 'binaries', binaryName),
      path.join(__dirname, '..', '..', 'binaries', binaryName),
      path.join(__dirname, '..', '..', '..', 'binaries', binaryName),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        this.cachedFfprobe = candidate;
        return candidate;
      }
    }

    // 3. System PATH
    try {
      const checkCmd = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
      const pathOutput = execSync(checkCmd, { encoding: 'utf-8', timeout: 3000 })
        .trim()
        .split(/\r?\n/)[0]
        .trim();
      if (pathOutput && fs.existsSync(pathOutput)) {
        this.cachedFfprobe = pathOutput;
        return pathOutput;
      }
    } catch {
      // not in PATH
    }

    // 4. Standard system locations
    if (!isWindows) {
      for (const p of ['/usr/bin/ffprobe', '/usr/local/bin/ffprobe']) {
        if (fs.existsSync(p)) {
          this.cachedFfprobe = p;
          return p;
        }
      }
    }

    return binaryName;
  }

  public static clearCache(): void {
    this.cachedYtDlp = null;
    this.cachedFfmpeg = null;
    this.cachedFfprobe = null;
  }
}
