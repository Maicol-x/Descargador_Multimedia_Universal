import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

const BIN_DIR = path.join(process.cwd(), 'binaries');

if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Descargando: ${url} -> ${path.basename(dest)}`);
    const file = fs.createWriteStream(dest);

    const request = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 10) {
        return reject(new Error('Demasiadas redirecciones HTTP'));
      }

      https
        .get(currentUrl, (response) => {
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            return request(response.headers.location, redirectCount + 1);
          }
          if (response.statusCode !== 200) {
            return reject(new Error(`Fallo HTTP ${response.statusCode}`));
          }

          let downloadedBytes = 0;
          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let lastLoggedPercent = 0;

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const percent = Math.floor((downloadedBytes / totalBytes) * 100);
              if (percent >= lastLoggedPercent + 20) {
                console.log(`   Progreso: ${percent}% (${Math.round(downloadedBytes / (1024 * 1024))} MB)`);
                lastLoggedPercent = percent;
              }
            }
          });

          response.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        })
        .on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    };

    request(url);
  });
}

async function extractFfmpegZip(zipPath) {
  console.log('Extrayendo ffmpeg.exe y ffprobe.exe desde el archivo ZIP...');
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();

  let ffmpegExtracted = false;
  let ffprobeExtracted = false;

  for (const entry of zipEntries) {
    const entryName = entry.entryName.toLowerCase();
    if (entryName.endsWith('/ffmpeg.exe') || entryName.endsWith('\\ffmpeg.exe') || entryName === 'ffmpeg.exe') {
      const dest = path.join(BIN_DIR, 'ffmpeg.exe');
      fs.writeFileSync(dest, entry.getData());
      ffmpegExtracted = true;
      console.log('✓ ffmpeg.exe extraído con éxito.');
    } else if (entryName.endsWith('/ffprobe.exe') || entryName.endsWith('\\ffprobe.exe') || entryName === 'ffprobe.exe') {
      const dest = path.join(BIN_DIR, 'ffprobe.exe');
      fs.writeFileSync(dest, entry.getData());
      ffprobeExtracted = true;
      console.log('✓ ffprobe.exe extraído con éxito.');
    }
  }

  // Cleanup zip
  try {
    fs.unlinkSync(zipPath);
  } catch {
    // ignore
  }

  if (!ffmpegExtracted || !ffprobeExtracted) {
    throw new Error('No se encontraron ffmpeg.exe o ffprobe.exe dentro del ZIP descargado.');
  }
}

async function main() {
  console.log('========================================================');
  console.log(' Universal Media Downloader - Gestor de Binarios Autónomos');
  console.log('========================================================');

  // 1. yt-dlp.exe (Windows)
  const ytdlpExePath = path.join(BIN_DIR, 'yt-dlp.exe');
  if (!fs.existsSync(ytdlpExePath) || fs.statSync(ytdlpExePath).size < 1000000) {
    try {
      console.log('\n[1/4] Descargando yt-dlp.exe para Windows...');
      await downloadFile(
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
        ytdlpExePath
      );
      console.log('✓ yt-dlp.exe listo (' + Math.round(fs.statSync(ytdlpExePath).size / (1024 * 1024)) + ' MB).');
    } catch (err) {
      console.error('Error al descargar yt-dlp.exe:', err.message);
    }
  } else {
    console.log('[1/4] ✓ yt-dlp.exe ya existe en binaries/');
  }

  // 2. FFmpeg & FFprobe (Windows)
  const ffmpegExePath = path.join(BIN_DIR, 'ffmpeg.exe');
  const ffprobeExePath = path.join(BIN_DIR, 'ffprobe.exe');
  const needsFfmpeg = !fs.existsSync(ffmpegExePath) || fs.statSync(ffmpegExePath).size < 1000000;
  const needsFfprobe = !fs.existsSync(ffprobeExePath) || fs.statSync(ffprobeExePath).size < 1000000;

  if (needsFfmpeg || needsFfprobe) {
    const tempZip = path.join(BIN_DIR, 'ffmpeg-win64.zip');
    try {
      console.log('\n[2/4] Descargando FFmpeg + FFprobe para Windows (GPL master win64)...');
      await downloadFile(
        'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
        tempZip
      );
      console.log('[3/4] Extrayendo ejecutables...');
      await extractFfmpegZip(tempZip);
      console.log('✓ ffmpeg.exe y ffprobe.exe listos en binaries/');
    } catch (err) {
      console.error('Error al obtener FFmpeg/FFprobe:', err.message);
      if (fs.existsSync(tempZip)) {
        fs.unlinkSync(tempZip);
      }
    }
  } else {
    console.log('[2/4 & 3/4] ✓ ffmpeg.exe y ffprobe.exe ya existen en binaries/');
  }

  // 4. Linux yt-dlp (for local dev / cloud preview environment)
  const ytdlpLinuxPath = path.join(BIN_DIR, 'yt-dlp');
  if (!fs.existsSync(ytdlpLinuxPath) || fs.statSync(ytdlpLinuxPath).size < 100000) {
    try {
      console.log('\n[4/4] Descargando yt-dlp para Linux...');
      await downloadFile(
        'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
        ytdlpLinuxPath
      );
      fs.chmodSync(ytdlpLinuxPath, 0o755);
      console.log('✓ yt-dlp Linux listo.');
    } catch (err) {
      console.warn('Advertencia al descargar yt-dlp Linux:', err.message);
    }
  } else {
    console.log('[4/4] ✓ yt-dlp Linux ya existe.');
  }

  console.log('\n========================================================');
  console.log(' Estado del directorio binaries/:');
  const files = fs.readdirSync(BIN_DIR);
  for (const f of files) {
    const st = fs.statSync(path.join(BIN_DIR, f));
    console.log(`  - ${f} (${(st.size / (1024 * 1024)).toFixed(2)} MB)`);
  }
  console.log('========================================================\n');
}

main().catch((err) => {
  console.error('Error fatal en download-binaries:', err);
  process.exit(1);
});
