const { app, BrowserWindow, Menu, Tray, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const updater = require('./updater.cjs');

// Tekil Örnek Kilidi (Aynı anda birden fazla ServisPro açılmasını ve port çakışmalarını önler)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('⚠️ ServisPro zaten açık, mevcut pencere öne getiriliyor...');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let splashWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;

// 1. Arka planda senkronizasyon sunucusunu güvenli başlat
function startSyncServer() {
  try {
    const serverPath = updater.getActiveServerPath();
    if (serverPath && fs.existsSync(serverPath)) {
      const dataDir = path.join(app.getPath('userData'), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      serverProcess = fork(serverPath, [], {
        stdio: 'inherit',
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          SERVISPRO_DATA_DIR: dataDir,
        },
      });
      console.log('⚡ ServisPro Arka Plan Canlı Senkronizasyon Sunucusu Başlatıldı:', serverPath);
      console.log('📂 Veri Depolama Konumu (UserData):', dataDir);

      serverProcess.on('error', (err) => {
        console.error('Sunucu proses hatası:', err);
      });
    } else {
      console.warn('Sunucu dosyası (server.js) bulunamadı.');
    }
  } catch (err) {
    console.error('Sunucu başlatma hatası:', err);
  }
}

// 2. Pencere Konumu ve Boyutunu Hatırla / Kaydet
function getSavedWindowState() {
  const statePath = path.join(app.getPath('userData'), 'window-state.json');
  try {
    if (fs.existsSync(statePath)) {
      const data = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      return data;
    }
  } catch (e) {}
  return { width: 1360, height: 900, isMaximized: false };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const statePath = path.join(app.getPath('userData'), 'window-state.json');
    const isMax = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    fs.writeFileSync(statePath, JSON.stringify({ ...bounds, isMaximized: isMax }), 'utf-8');
  } catch (e) {}
}

// 3. Açılış Splash Ekranı
function createSplashWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.svg');

  splashWindow = new BrowserWindow({
    width: 480,
    height: 330,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    show: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'splash-preload.cjs'),
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
}

// 4. Ana Uygulama Penceresini Oluştur
function createMainWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  const savedState = getSavedWindowState();

  mainWindow = new BrowserWindow({
    x: savedState.x,
    y: savedState.y,
    width: savedState.width || 1360,
    height: savedState.height || 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'ServisPro - Beyaz Eşya Teknik Servis Yönetimi',
    backgroundColor: '#090d16',
    show: false, // Splash tamamlanınca yumuşak gösterim
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  // URL / Dosya Yükleme Mantığı (Aktif güncel paket veya dev)
  const isForceDev = process.env.ELECTRON_DEV === '1';
  const activeHtmlPath = updater.getActiveHtmlPath();

  if (isForceDev) {
    console.log('🔧 ServisPro Geliştirici Modunda Açılıyor: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
  } else if (activeHtmlPath) {
    console.log('📦 ServisPro Yerel Diskten Açılıyor (Çevrimdışı Hazır):', activeHtmlPath);
    mainWindow.loadFile(activeHtmlPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Pencere Hazır Olduğunda Splash'i Kapat ve Ana Pencereyi Göster
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  // Dış Bağlantı Yöneticisi: WhatsApp, Google Maps veya Harici URL'ler sistem tarayıcısında açılsın
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.includes('localhost:5173')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Pencere boyutu değiştiğinde durumunu kaydet
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  // Kısayollar ve Menü Çubuğu
  setupApplicationMenu();

  // F12 ve F5 Kısayol Dinleyicisi
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      event.preventDefault();
      mainWindow.webContents.executeJavaScript('if (window.__TRIGGER_SYNC__) { window.__TRIGGER_SYNC__(); true; } else { false; }')
        .then((handled) => {
          if (!handled) mainWindow.reload();
        })
        .catch(() => mainWindow.reload());
    }
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.executeJavaScript('if (window.__TRIGGER_SYNC__) { window.__TRIGGER_SYNC__(); } else if (window.__REFRESH_DATA__) { window.__REFRESH_DATA__(); }').catch(() => {});
  });

  mainWindow.on('close', (event) => {
    saveWindowState();
    if (!isQuitting) {
      // Arka planda çalışmaya devam etmesi için opsiyonel simge durumuna küçültme
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 5. Menü Çubuğu
function setupApplicationMenu() {
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
          },
        },
        {
          label: 'MySQL İle Eşitle (Ctrl+R)',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript('if (window.__TRIGGER_SYNC__) window.__TRIGGER_SYNC__();');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Güncellemeleri Şimdi Denetle',
          click: async () => {
            handleManualUpdateCheck();
          },
        },
        { type: 'separator' },
        {
          label: 'Uygulamayı Baştan Yükle (Ctrl+Shift+R)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'resetZoom', label: 'Varsayılan Boyut' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
        { role: 'toggleDevTools', label: 'Geliştirici Araçları (F12)' },
      ],
    },
    {
      label: 'ServisPro',
      submenu: [
        {
          label: 'Hakkında & Sürüm',
          click: () => {
            const info = updater.getLocalVersionInfo();
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`alert('ServisPro Masaüstü\\nSürüm: v${info.version}\\nDerleme Tarihi: ${info.buildDate || "-"}\\nDurum: Güncel & Çevrimdışı Hazır');`);
            }
          },
        },
        { type: 'separator' },
        { role: 'minimize', label: 'Simge Durumuna Küçült' },
        { role: 'close', label: 'Pencereyi Kapat' },
        { type: 'separator' },
        {
          label: 'Tamamen Çıkış Yap',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// 6. Sistem Tepsisi (System Tray)
function setupSystemTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  if (!fs.existsSync(iconPath)) return;

  try {
    tray = new Tray(iconPath);
    tray.setToolTip('ServisPro - Teknik Servis Yönetimi');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'ServisPro\'yu Aç',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'MySQL İle Eşitle (F5)',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript('if (window.__TRIGGER_SYNC__) window.__TRIGGER_SYNC__();');
          }
        },
      },
      {
        label: 'Güncellemeleri Denetle',
        click: () => handleManualUpdateCheck(),
      },
      { type: 'separator' },
      {
        label: 'Çıkış Yap',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch (e) {
    console.warn('Tray başlatılamadı:', e);
  }
}

// 7. Manuel Güncelleme Denetimi
async function handleManualUpdateCheck() {
  try {
    if (!mainWindow) return;
    mainWindow.webContents.send('update-status', { status: 'checking', message: 'Güncellemeler kontrol ediliyor...' });
    const result = await updater.checkForUpdates(5000);

    if (result.hasUpdate) {
      mainWindow.webContents.send('update-available', result);
    } else {
      mainWindow.webContents.send('update-status', {
        status: 'up-to-date',
        message: result.offline ? 'İnternet bağlantısı yok, çevrimdışı modda çalışılıyor.' : 'Kullanılan sürüm güncel (v' + result.currentVersion + ')',
      });
    }
  } catch (err) {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status: 'error', message: err.message });
    }
  }
}

// 8. IPC Olay Yöneticileri (Renderer <=> Main)
function setupIpcHandlers() {
  ipcMain.handle('get-version-info', () => {
    return updater.getLocalVersionInfo();
  });

  ipcMain.handle('check-for-updates', async () => {
    return await updater.checkForUpdates(5000);
  });

  ipcMain.handle('download-and-install-update', async (event, updateInfo) => {
    return await updater.downloadAndInstallUpdate(updateInfo, (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('update-progress', progress);
      }
    });
  });

  ipcMain.handle('restart-app', () => {
    const activeHtml = updater.getActiveHtmlPath();
    if (activeHtml && mainWindow) {
      console.log('🔄 Uygulama güncel sürümle tazeleniyor...');
      mainWindow.loadFile(activeHtml);
    } else {
      app.relaunch();
      app.exit(0);
    }
  });

  ipcMain.on('open-external', (_, url) => {
    if (url) shell.openExternal(url);
  });

  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  ipcMain.on('show-desktop-notification', (_, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: path.join(__dirname, '..', 'public', 'favicon.svg') }).show();
    }
  });
}

// 9. Açılış Süreci (Splash -> Güncelleme Kontrolü -> Ana Pencere)
async function startAppLifecycle() {
  // IPC ve Arka Plan Sunucusu
  setupIpcHandlers();
  startSyncServer();

  // Geliştirici modu kontrolü
  const isForceDev = process.env.ELECTRON_DEV === '1';
  if (isForceDev) {
    createMainWindow();
    setupSystemTray();
    return;
  }

  // Açılış Splash Penceresi
  createSplashWindow();

  const localInfo = updater.getLocalVersionInfo();

  // Splash ekranının yüklenmesini bekle
  await new Promise((r) => setTimeout(r, 200));
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-status', {
      version: localInfo.version,
      message: 'Güncellemeler kontrol ediliyor...',
      progress: 15,
    });
  }

  try {
    // 3.5 saniye zaman aşımlı hızlı güncelleme kontrolü
    const updateCheck = await updater.checkForUpdates(3500);

    if (updateCheck.hasUpdate) {
      console.log(`🚀 [Startup] Yeni güncelleme bulundu: v${updateCheck.newVersion}`);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash-status', {
          message: `🚀 Yeni sürüm bulundu: v${updateCheck.newVersion} indiriliyor...`,
          type: 'highlight',
          progress: 25,
        });
      }

      // Paketi anında indir ve kur
      await updater.downloadAndInstallUpdate(updateCheck, (p) => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.webContents.send('splash-progress', p);
        }
      });

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash-status', {
          message: `✅ Güncelleme tamamlandı! Uygulama başlatılıyor...`,
          type: 'success',
          progress: 100,
        });
      }

      await new Promise((r) => setTimeout(r, 400));
    } else {
      if (splashWindow && !splashWindow.isDestroyed()) {
        const msg = updateCheck.offline
          ? 'Çevrimdışı modda başlatılıyor...'
          : 'Sistem güncel. Başlatılıyor...';
        splashWindow.webContents.send('splash-status', {
          message: msg,
          type: updateCheck.offline ? 'normal' : 'success',
          progress: 100,
        });
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch (err) {
    console.warn('[Startup] Güncelleme denetimi atlandı:', err.message);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('splash-status', {
        message: 'Başlatılıyor...',
        progress: 100,
      });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // Ana Pencereyi Oluştur
  createMainWindow();
  setupSystemTray();

  // Uygulama açık kaldığı sürece her 30 dakikada bir sessiz arka plan kontrolü
  setInterval(async () => {
    try {
      const bgCheck = await updater.checkForUpdates(4000);
      if (bgCheck.hasUpdate && mainWindow) {
        console.log('📢 [Background] Arka planda yeni sürüm tespit edildi:', bgCheck.newVersion);
        mainWindow.webContents.send('update-available', bgCheck);
      }
    } catch (e) {}
  }, 30 * 60 * 1000);
}

// 10. Electron Uygulama Yaşam Döngüsü
app.whenReady().then(() => {
  startAppLifecycle();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (serverProcess) {
    try {
      serverProcess.kill();
      serverProcess = null;
    } catch (e) {}
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
      serverProcess = null;
    } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
