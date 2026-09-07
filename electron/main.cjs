const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverInstance = null;
let serverPort = 3000;

async function startInternalServer() {
  try {
    // Dynamically require the express app
    const { expressApp } = await import('../server/app.ts');
    return new Promise((resolve) => {
      serverInstance = http.createServer(expressApp);
      serverInstance.listen(0, '127.0.0.1', () => {
        serverPort = serverInstance.address().port;
        console.log(`[Electron Core] Internal Express server running on port ${serverPort}`);
        resolve(serverPort);
      });
    });
  } catch (err) {
    console.error('[Electron Core] Failed to start internal server:', err);
    return 3000;
  }
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 950,
    minHeight: 650,
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

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
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
  if (filePath) {
    return await shell.openPath(filePath);
  }
  return false;
});

ipcMain.handle('shell:show-item', async (_event, filePath) => {
  if (filePath) {
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
  const port = await startInternalServer();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance) {
      serverInstance.close();
    }
    app.quit();
  }
});
