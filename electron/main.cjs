const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;

// Arka planda senkronizasyon sunucusunu otomatik başlat
function startSyncServer() {
  try {
    const serverPath = path.join(__dirname, '..', 'server.js');
    if (fs.existsSync(serverPath)) {
      serverProcess = fork(serverPath, [], {
        stdio: 'inherit',
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
        },
      });
      console.log('⚡ ServisPro Arka Plan Canlı Senkronizasyon Sunucusu Başlatıldı');
    }
  } catch (err) {
    console.error('Sunucu başlatma hatası:', err);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.svg');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'ServisPro - Beyaz Eşya Teknik Servis Yönetimi',
    backgroundColor: '#090d16',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Yerel file:// protokolünden http API'lerine erişim izni
    },
  });

  // Offline-First: Eğer yerel dist derlemesi varsa doğrudan yerel diskten aç (İnternetsiz tam çalışır)
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  const isForceDev = process.env.ELECTRON_DEV === '1';

  if (isForceDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else if (fs.existsSync(indexPath)) {
    console.log('📦 ServisPro yerel diskten açılıyor (İnternetsiz & Çevrimdışı Hazır):', indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Electron Menü Çubuğu (Yenile, Görünüm ve Çıkış Kısayolları)
  const template = [
    {
      label: 'Yenile & Eşitle',
      submenu: [
        {
          label: 'Canlı Verileri Yenile (F5)',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript('if (window.__TRIGGER_SYNC__) window.__TRIGGER_SYNC__();');
            }
          }
        },
        {
          label: 'MySQL İle Eşitle (Ctrl+R)',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript('if (window.__TRIGGER_SYNC__) window.__TRIGGER_SYNC__();');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Uygulamayı Baştan Yükle (Ctrl+Shift+R)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'resetZoom', label: 'Varsayılan Boyut' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
        { role: 'toggleDevTools', label: 'Geliştirici Araçları (F12)' }
      ]
    },
    {
      label: 'ServisPro',
      submenu: [
        { role: 'minimize', label: 'Simge Durumuna Küçült' },
        { role: 'close', label: 'Pencereyi Kapat' },
        { type: 'separator' },
        { role: 'quit', label: 'Tamamen Çıkış Yap' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Sayfa yükleme hatası olursa konsola yazdır
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Electron sayfa yükleme hatası:', errorCode, errorDescription, validatedURL);
  });

  // F12 ile Geliştirici Araçları
  // F5 veya Ctrl+R ile Anında Yumuşak Veri Yenileme (Sayfayı baştan yüklemeden veriyi tazeler)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      event.preventDefault();
      mainWindow.webContents.executeJavaScript('if (window.__TRIGGER_SYNC__) { window.__TRIGGER_SYNC__(); true; } else { false; }')
        .then((handled) => {
          if (!handled) {
            mainWindow.reload();
          }
        })
        .catch(() => {
          mainWindow.reload();
        });
    }
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.executeJavaScript('if (window.__TRIGGER_SYNC__) { window.__TRIGGER_SYNC__(); } else if (window.__REFRESH_DATA__) { window.__REFRESH_DATA__(); }').catch(() => {});
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
