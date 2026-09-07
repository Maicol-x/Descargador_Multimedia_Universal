const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let serverInstance = null;
let serverPort = 3000;

// Propagate Electron resources path to Node environment
process.env.IS_ELECTRON = 'true';
if (process.resourcesPath) {
  process.env.RESOURCES_PATH = process.resourcesPath;
}

async function startInternalServer() {
  try {
    let expressApp = null;

    // Check for compiled server first (production packaged)
    const compiledServerPaths = [
      path.join(__dirname, '..', 'dist', 'server', 'app.cjs'),
      path.join(__dirname, '..', 'dist', 'server.cjs'),
      path.join(process.resourcesPath || '', 'dist', 'server', 'app.cjs'),
    ];

    for (const p of compiledServerPaths) {
      if (fs.existsSync(p)) {
        console.log(`[Electron Core] Cargando backend compilado desde: ${p}`);
        const mod = require(p);
        expressApp = mod.expressApp || mod.default || mod;
        break;
      }
    }

    // Development fallback
    if (!expressApp) {
      console.log('[Electron Core] Cargando backend en modo desarrollo...');
      const mod = await import('../server/app.ts');
      expressApp = mod.expressApp;
    }

    if (!expressApp) {
      throw new Error('No se pudo resolver la aplicación Express.');
    }

    return new Promise((resolve, reject) => {
      serverInstance = http.createServer(expressApp);
      serverInstance.listen(0, '127.0.0.1', () => {
        serverPort = serverInstance.address().port;
        console.log(`[Electron Core] Servidor Express interno en http://127.0.0.1:${serverPort}`);
        resolve(serverPort);
      });

      serverInstance.on('error', (err) => {
        reject(err);
      });
    });
  } catch (err) {
    console.error('[Electron Core] Error fatal al iniciar servidor interno:', err);
    dialog.showErrorBox(
      'Error Crítico de Inicio',
      `No se pudo iniciar el servicio interno de Universal Media Downloader:\n\n${err.message || err}\n\nLa aplicación se cerrará.`
    );
    app.quit();
    throw err;
  }
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#0A0E17',
    title: 'Universal Media Downloader',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production' && Boolean(process.env.VITE_DEV_SERVER_URL);

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${port}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('dialog:select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Seleccionar Carpeta de Descargas',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('shell:open-file', async (_event, filePath) => {
  if (filePath && typeof filePath === 'string') {
    return await shell.openPath(filePath);
  }
  return false;
});

ipcMain.handle('shell:show-item', async (_event, filePath) => {
  if (filePath && typeof filePath === 'string') {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('app:notify', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Universal Media Downloader',
      body: body || '',
    }).show();
    return true;
  }
  return false;
});

app.whenReady().then(async () => {
  try {
    const port = await startInternalServer();
    createWindow(port);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(port);
      }
    });
  } catch {
    // Error already shown in dialog and app.quit() called
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance) {
      serverInstance.close();
    }
    app.quit();
  }
});
