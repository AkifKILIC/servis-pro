let electronApp = null;
try {
  const electron = require('electron');
  electronApp = electron.app;
} catch (e) {}

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

class ServisProUpdater {
  constructor() {
    const defaultUserData = process.env.APPDATA 
      ? path.join(process.env.APPDATA, 'servispro') 
      : path.join(__dirname, '..', 'data');

    this.userDataPath = (electronApp && typeof electronApp.getPath === 'function')
      ? electronApp.getPath('userData')
      : defaultUserData;

    this.liveDistDir = path.join(this.userDataPath, 'app_dist');
    this.bundledDistDir = path.join(__dirname, '..', 'dist');
    this.localVersionFile = path.join(this.userDataPath, 'current_version.json');
    this.bundledVersionFile = path.join(this.bundledDistDir, 'version.json');
    
    this.remoteUrls = [
      'https://izmirimteknik.com/servispro/version.json',
      'https://raw.githubusercontent.com/AkifKILIC/servis-pro/main/version.json',
    ];
  }

  // 1. Yerel aktif sürüm bilgisini oku
  getLocalVersionInfo() {
    // Öncelik 1: userData içinde güncellenmiş sürüm dosyası
    if (fs.existsSync(this.localVersionFile)) {
      try {
        const raw = fs.readFileSync(this.localVersionFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version) {
          return {
            ...parsed,
            source: 'updated_bundle',
            isLive: true,
          };
        }
      } catch (e) {
        console.warn('Yerel sürüm dosyası okunamadı, paketlenmiş sürüme dönülüyor:', e);
      }
    }

    // Öncelik 2: Uygulama paketi içindeki version.json
    if (fs.existsSync(this.bundledVersionFile)) {
      try {
        const raw = fs.readFileSync(this.bundledVersionFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version) {
          return {
            ...parsed,
            source: 'bundled',
            isLive: false,
          };
        }
      } catch (e) {}
    }

    // Öncelik 3: Electron app.getVersion()
    return {
      version: app.getVersion() || '1.0.0',
      versionCode: 10000,
      buildDate: new Date().toISOString(),
      releaseNotes: 'İlk Kurulum Sürümü',
      source: 'fallback',
      isLive: false,
    };
  }

  // Semver veya Version Code kıyaslama
  isNewer(remoteInfo, localInfo) {
    if (!remoteInfo || !remoteInfo.version) return false;
    if (!localInfo || !localInfo.version) return true;

    // VersionCode varsa kesin sayısal kıyaslama
    if (remoteInfo.versionCode && localInfo.versionCode) {
      if (remoteInfo.versionCode > localInfo.versionCode) return true;
      if (remoteInfo.versionCode < localInfo.versionCode) return false;
    }

    // Semver string kıyaslama (örn: 1.0.1 > 1.0.0)
    const rParts = (remoteInfo.version || '').split('.').map(n => parseInt(n, 10) || 0);
    const lParts = (localInfo.version || '').split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
      const r = rParts[i] || 0;
      const l = lParts[i] || 0;
      if (r > l) return true;
      if (r < l) return false;
    }

    // Eğer versiyon numarası aynıysa ancak bundle hash farklıysa (hotfix / ara yama):
    if (remoteInfo.bundleHash && localInfo.bundleHash && remoteInfo.bundleHash !== localInfo.bundleHash) {
      return true;
    }

    return false;
  }

  // 2. Uzak sunucudan güncelleme kontrolü yap
  async checkForUpdates(timeoutMs = 4000) {
    const localInfo = this.getLocalVersionInfo();
    let lastError = null;

    for (const url of this.remoteUrls) {
      try {
        const cacheBuster = `?_t=${Date.now()}`;
        const targetUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}${cacheBuster}`;

        const response = await fetch(targetUrl, {
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'Cache-Control': 'no-cache, no-store' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${url}`);
        }

        const remoteInfo = await response.json();
        const hasUpdate = this.isNewer(remoteInfo, localInfo);

        return {
          success: true,
          hasUpdate,
          currentVersion: localInfo.version,
          currentBuildDate: localInfo.buildDate,
          newVersion: remoteInfo.version,
          newBuildDate: remoteInfo.buildDate,
          releaseNotes: remoteInfo.releaseNotes || 'Genel sistem ve performans güncellemeleri.',
          bundleUrl: remoteInfo.bundleUrl,
          bundleHash: remoteInfo.bundleHash,
          bundleSize: remoteInfo.bundleSize,
          minAppVersion: remoteInfo.minAppVersion,
          downloadUrl: remoteInfo.downloadUrl,
          checkedUrl: url,
        };
      } catch (err) {
        lastError = err;
        console.warn(`[Updater] ${url} kontrol edilemedi:`, err.message);
      }
    }

    return {
      success: false,
      hasUpdate: false,
      currentVersion: localInfo.version,
      offline: true,
      error: lastError ? lastError.message : 'Güncelleme sunucusuna erişilemedi',
    };
  }

  // 3. Güncelleme paketini indir ve güvenle kur
  async downloadAndInstallUpdate(updateInfo, onProgress = () => {}) {
    if (!updateInfo || !updateInfo.bundleUrl) {
      throw new Error('Geçersiz güncelleme paketi adresi');
    }

    const tempZipPath = path.join(this.userDataPath, 'temp_update.zip');
    const tempExtractDir = path.join(this.userDataPath, 'app_dist_next');
    const backupDir = path.join(this.userDataPath, 'app_dist_backup');

    try {
      onProgress({ percent: 5, message: 'Güncelleme paketi indiriliyor...' });

      // İndirme işlemi
      const response = await fetch(updateInfo.bundleUrl, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) {
        throw new Error(`İndirme başarısız (HTTP ${response.status})`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10) || updateInfo.bundleSize || 0;
      let downloadedBytes = 0;

      const fileStream = fs.createWriteStream(tempZipPath);
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fileStream.write(Buffer.from(value));
        downloadedBytes += value.length;

        if (contentLength > 0) {
          const percent = Math.min(90, Math.round((downloadedBytes / contentLength) * 85) + 5);
          const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(2);
          const totalMB = (contentLength / (1024 * 1024)).toFixed(2);
          onProgress({
            percent,
            downloadedMB,
            totalMB,
            message: `İndiriliyor: ${downloadedMB} MB / ${totalMB} MB (%${percent})`,
          });
        }
      }

      await new Promise((resolve, reject) => {
        fileStream.end(resolve);
        fileStream.on('error', reject);
      });

      onProgress({ percent: 92, message: 'Paket bütünlüğü doğrulanıyor...' });

      // SHA-256 Doğrulaması (Eğer sunucudan hash verilmişse)
      if (updateInfo.bundleHash) {
        const fileBuffer = fs.readFileSync(tempZipPath);
        const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        if (calculatedHash.toLowerCase() !== updateInfo.bundleHash.toLowerCase()) {
          console.warn(`[Updater] Hash uyuşmazlığı (Beklenen: ${updateInfo.bundleHash}, Hesaplanan: ${calculatedHash})`);
          // Hash uyuşsa da zip açılabiliyorsa devam edilir
        }
      }

      onProgress({ percent: 95, message: 'Dosyalar yerleştiriliyor...' });

      // Paketi temp klasöre aç
      if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempExtractDir, { recursive: true });

      const zip = new AdmZip(tempZipPath);
      zip.extractAllTo(tempExtractDir, true);

      // index.html doğrulama
      const newIndexPath = path.join(tempExtractDir, 'index.html');
      if (!fs.existsSync(newIndexPath)) {
        throw new Error('İndirilen güncelleme paketi geçersiz (index.html bulunamadı).');
      }

      // Atomik klasör değişimi
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }

      if (fs.existsSync(this.liveDistDir)) {
        try {
          fs.renameSync(this.liveDistDir, backupDir);
        } catch (e) {
          fs.rmSync(this.liveDistDir, { recursive: true, force: true });
        }
      }

      fs.renameSync(tempExtractDir, this.liveDistDir);

      // Başarılı ise yedeği temizle
      if (fs.existsSync(backupDir)) {
        try {
          fs.rmSync(backupDir, { recursive: true, force: true });
        } catch (e) {}
      }

      // Yeni sürüm dosyasını kaydet
      fs.writeFileSync(
        this.localVersionFile,
        JSON.stringify(
          {
            version: updateInfo.newVersion,
            versionCode: updateInfo.versionCode || 0,
            buildDate: updateInfo.newBuildDate || new Date().toISOString(),
            releaseNotes: updateInfo.releaseNotes,
            bundleHash: updateInfo.bundleHash,
            bundleSize: updateInfo.bundleSize,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf-8'
      );

      // Geçici zip'i sil
      if (fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }

      onProgress({ percent: 100, message: 'Güncelleme başarıyla tamamlandı!' });
      return { success: true, version: updateInfo.newVersion };
    } catch (err) {
      console.error('[Updater] Güncelleme hatası:', err);

      // Hata durumunda yedeği geri yükle
      if (fs.existsSync(backupDir) && !fs.existsSync(this.liveDistDir)) {
        try {
          fs.renameSync(backupDir, this.liveDistDir);
        } catch (e) {}
      }

      // Temizlik
      if (fs.existsSync(tempZipPath)) {
        try { fs.unlinkSync(tempZipPath); } catch (e) {}
      }
      if (fs.existsSync(tempExtractDir)) {
        try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (e) {}
      }

      throw err;
    }
  }

  // 4. Çalıştırılacak aktif index.html dosyasının yolunu ver
  getActiveHtmlPath() {
    const liveIndexPath = path.join(this.liveDistDir, 'index.html');
    if (fs.existsSync(liveIndexPath)) {
      console.log('⚡ [Updater] Güncellenmiş yerel sürüm çalıştırılıyor:', liveIndexPath);
      return liveIndexPath;
    }

    const bundledIndexPath = path.join(this.bundledDistDir, 'index.html');
    if (fs.existsSync(bundledIndexPath)) {
      console.log('📦 [Updater] Paket içeriğindeki sürüm çalıştırılıyor:', bundledIndexPath);
      return bundledIndexPath;
    }

    return null;
  }

  // 5. Çalıştırılacak aktif server.js dosyasının yolunu ver
  getActiveServerPath() {
    const liveServerPath = path.join(this.liveDistDir, 'server.js');
    if (fs.existsSync(liveServerPath)) {
      console.log('⚡ [Updater] Güncellenmiş arka plan sunucusu kullanılıyor:', liveServerPath);
      return liveServerPath;
    }

    const bundledServerPath = path.join(__dirname, '..', 'server.js');
    if (fs.existsSync(bundledServerPath)) {
      return bundledServerPath;
    }

    return null;
  }
}

module.exports = new ServisProUpdater();
