import fs from 'fs';
import path from 'path';

const TARGET_DIRS = ['dist', 'dist-electron', '.vite'];
const TARGET_FILES = ['server.js', 'server.cjs', 'server.cjs.map'];

console.log('Limpiando artefactos de compilación...');

for (const dir of TARGET_DIRS) {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✓ Eliminado: ${dir}/`);
    } catch (err) {
      console.warn(`No se pudo eliminar ${dir}:`, err.message);
    }
  }
}

for (const file of TARGET_FILES) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`✓ Eliminado: ${file}`);
    } catch (err) {
      console.warn(`No se pudo eliminar ${file}:`, err.message);
    }
  }
}

console.log('Limpieza completada.');
