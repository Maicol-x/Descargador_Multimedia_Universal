import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

const BIN_DIR = path.join(process.cwd(), 'binaries');

if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Descargando: ${url} -> ${dest}`);
    const file = fs.createWriteStream(dest);
    
    const request = (currentUrl) => {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return request(response.headers.location);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`Fallo HTTP ${response.statusCode}`));
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

async function main() {
  console.log('========================================================');
  console.log(' Universal Media Downloader - Preparador de Binarios Windows');
  console.log('========================================================');

  // 1. Download yt-dlp.exe
  const ytdlpExePath = path.join(BIN_DIR, 'yt-dlp.exe');
  if (!fs.existsSync(ytdlpExePath)) {
    try {
      console.log('[1/3] Obteniendo yt-dlp.exe para Windows...');
      await downloadFile(
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
        ytdlpExePath
      );
      console.log('✓ yt-dlp.exe listo.');
    } catch (err) {
      console.warn('Advertencia al descargar yt-dlp.exe:', err.message);
    }
  } else {
    console.log('✓ yt-dlp.exe ya existe en /binaries');
  }

  // 2. Also ensure linux yt-dlp binary exists for local dev
  const ytdlpLinuxPath = path.join(BIN_DIR, 'yt-dlp');
  if (!fs.existsSync(ytdlpLinuxPath)) {
    try {
      console.log('Obteniendo yt-dlp Linux...');
      await downloadFile(
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
        ytdlpLinuxPath
      );
      fs.chmodSync(ytdlpLinuxPath, 0o755);
      console.log('✓ yt-dlp Linux listo.');
    } catch (err) {
      console.warn('Advertencia al descargar yt-dlp Linux:', err.message);
    }
  }

  console.log('========================================================');
  console.log(' Binarios preparados con éxito en: ' + BIN_DIR);
  console.log('========================================================');
}

main().catch(console.error);
