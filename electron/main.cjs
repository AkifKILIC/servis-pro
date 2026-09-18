const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;

// Arka planda senkronizasyon sunucusunu otomatik başlat
function startSyncServer() {
  try {
    const serverPath = path.join(__dirname, '..', 'server.js');
    serverProcess = fork(serverPath, [], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
    });
    console.log('⚡ ServisPro Arka Plan Canlı Senkronizasyon Sunucusu Başlatıldı');
  } catch (err) {
    console.error('Sunucu başlatma hatası:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'ServisPro - Beyaz Eşya Teknik Servis Yönetimi',
    backgroundColor: '#090d16',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Yerel file:// protokolünden http://localhost:3001 API'sine erişim izni
    },
  });

  // Geliştirme URL'si veya build edilmiş dosya
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('Index HTML yükleniyor:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Standart menü çubuğunu temizle
  Menu.setApplicationMenu(null);

  // Sayfa yükleme hatası olursa konsola yazdır
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Electron sayfa yükleme hatası:', errorCode, errorDescription, validatedURL);
  });

  // F12 veya Ctrl+Shift+I ile Geliştirici Araçlarını açma/kapama
  // F5 veya Ctrl+R ile Anında Yenileme
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      mainWindow.reload();
    }
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.executeJavaScript('if (window.__REFRESH_DATA__) window.__REFRESH_DATA__();').catch(() => {});
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startSyncServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
