const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Versiyon ve Güncelleme Bilgisi
  getVersionInfo: () => ipcRenderer.invoke('get-version-info'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadAndInstallUpdate: (updateInfo) => ipcRenderer.invoke('download-and-install-update', updateInfo),
  restartAndApplyUpdate: () => ipcRenderer.invoke('restart-app'),

  // Olay Dinleyicileri (Arka plan güncellemeleri)
  onUpdateAvailable: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
  onUpdateReady: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('update-ready', handler);
    return () => ipcRenderer.removeListener('update-ready', handler);
  },

  // Dış Bağlantılar (WhatsApp, Google Maps vb. varsayılan tarayıcıda açılır)
  openExternal: (url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:'))) {
      ipcRenderer.send('open-external', url);
    }
  },

  // Pencere Kontrolleri
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Yerel Masaüstü Bildirimi Gönder
  showDesktopNotification: (title, body) => {
    ipcRenderer.send('show-desktop-notification', { title, body });
  },
});
