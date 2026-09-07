import { expressApp } from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

expressApp.listen(PORT, HOST, () => {
  console.log(`[Universal Media Downloader] Servidor ejecutándose en http://${HOST}:${PORT}`);
});
