const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  openFile: (filePath) => ipcRenderer.invoke('shell:open-file', filePath),
  showItem: (filePath) => ipcRenderer.invoke('shell:show-item', filePath),
  notify: (data) => ipcRenderer.invoke('app:notify', data),
});
