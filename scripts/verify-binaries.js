import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BIN_DIR = path.join(process.cwd(), 'binaries');

const REQUIRED_BINARIES = [
  { name: 'yt-dlp.exe', minSizeMb: 5 },
  { name: 'ffmpeg.exe', minSizeMb: 10 },
  { name: 'ffprobe.exe', minSizeMb: 10 },
];

function checkBinaries() {
  const missingOrInvalid = [];

  for (const bin of REQUIRED_BINARIES) {
    const fullPath = path.join(BIN_DIR, bin.name);
    if (!fs.existsSync(fullPath)) {
      missingOrInvalid.push({ name: bin.name, reason: 'Archivo no encontrado' });
      continue;
    }

    const stat = fs.statSync(fullPath);
    const sizeMb = stat.size / (1024 * 1024);
    if (sizeMb < bin.minSizeMb) {
      missingOrInvalid.push({
        name: bin.name,
        reason: `Tamaño inválido (${sizeMb.toFixed(2)} MB, esperado >= ${bin.minSizeMb} MB)`,
      });
    }
  }

  return missingOrInvalid;
}

async function verify() {
  console.log('========================================================');
  console.log(' [VERIFY] Gatekeeper de Binarios de Producción');
  console.log('========================================================');

  let failed = checkBinaries();

  if (failed.length > 0) {
    console.warn('\n⚠️ Faltan binarios requeridos para distribución autónoma Windows:');
    for (const item of failed) {
      console.warn(`  - ${item.name}: ${item.reason}`);
    }

    console.log('\n[GATEKEEPER] Intentando descargar automáticamente...');
    try {
      execSync('node scripts/download-binaries.js', { stdio: 'inherit' });
    } catch (err) {
      console.error('Fallo al ejecutar el script de descarga:', err.message);
    }

    // Re-verify after download attempt
    failed = checkBinaries();
  }

  if (failed.length > 0) {
    console.error('\n' + '='.repeat(60));
    console.error(' ❌ BUILD FAILED: ERROR CRÍTICO DE EMPAQUETADO');
    console.error('='.repeat(60));
    console.error(' No es posible generar un instalador EXE autónomo porque faltan');
    console.error(' los siguientes ejecutables en la carpeta binaries/:');
    for (const item of failed) {
      console.error(`  - ${item.name} (${item.reason})`);
    }
    console.error('\n Solución:');
    console.error('  1. Ejecuta manualmente: npm run package:binaries');
    console.error('  2. O coloca manualmente yt-dlp.exe, ffmpeg.exe y ffprobe.exe');
    console.error('     dentro de la carpeta binaries/');
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }

  console.log('\n✓ Todos los binarios de Windows están presentes y verificados:');
  for (const bin of REQUIRED_BINARIES) {
    const fullPath = path.join(BIN_DIR, bin.name);
    const stat = fs.statSync(fullPath);
    console.log(`  ✓ ${bin.name} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
  }
  console.log('\n========================================================');
  console.log(' Gatekeeper Aprobado: El EXE será 100% autónomo.');
  console.log('========================================================\n');
}

verify().catch((err) => {
  console.error('Error fatal en verify-binaries:', err);
  process.exit(1);
});
