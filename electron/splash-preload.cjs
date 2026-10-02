const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
  onStatus: (callback) => {
    ipcRenderer.on('splash-status', (_, data) => callback(data));
  },
  onProgress: (callback) => {
    ipcRenderer.on('splash-progress', (_, data) => callback(data));
  },
});
