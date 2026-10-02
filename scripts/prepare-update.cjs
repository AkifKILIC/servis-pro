const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist/ klasörü bulunamadı. Lütfen önce "npm run build" çalıştırın.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
let currentVersion = packageJson.version || '1.0.0';

// Argüman kontrolü: eğer yeni versiyon belirtilmişse veya patch artırma
const args = process.argv.slice(2);
let newVersion = currentVersion;

if (args[0] && args[0] !== 'keep') {
  if (args[0] === 'patch') {
    const parts = currentVersion.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    newVersion = parts.join('.');
  } else if (/^\d+\.\d+\.\d+/.test(args[0])) {
    newVersion = args[0];
  }
}

// package.json güncelle
if (newVersion !== currentVersion) {
  packageJson.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
  console.log(`📦 Versiyon güncellendi: ${currentVersion} -> ${newVersion}`);
} else {
  console.log(`📦 Mevcut versiyon korunuyor: ${newVersion}`);
}

// 1. adm-zip ile app-bundle.zip oluştur
const zip = new AdmZip();
const bundleZipPath = path.join(DIST_DIR, 'app-bundle.zip');

// dist içindeki istemci dosyalarını ekle (sunucu php/sql/zip hariç)
const ignoredFiles = new Set([
  'app-bundle.zip',
  'version.json',
  '.htaccess',
  'api.php',
  'servispro_db.sql',
  'test_db.php',
  'deploy_ftp.ps1',
]);

function addDirectoryToZip(dirPath, zipPath = '') {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (ignoredFiles.has(item)) continue;
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addDirectoryToZip(fullPath, zipPath ? `${zipPath}/${item}` : item);
    } else {
      const fileData = fs.readFileSync(fullPath);
      const targetZipDir = zipPath || '';
      zip.addFile(targetZipDir ? `${targetZipDir}/${item}` : item, fileData);
    }
  }
}

addDirectoryToZip(DIST_DIR);

// Arka plan server.js dosyasını da ekle (böylece yerel senkronizasyon mantığı da güncellenebilir)
const serverJsPath = path.join(ROOT_DIR, 'server.js');
if (fs.existsSync(serverJsPath)) {
  zip.addLocalFile(serverJsPath, '');
}

zip.writeZip(bundleZipPath);
console.log(`✅ Güncelleme paketi oluşturuldu: dist/app-bundle.zip`);

// 2. SHA-256 ve dosya boyutu hesapla
const zipBuffer = fs.readFileSync(bundleZipPath);
const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');
const bundleSize = zipBuffer.length;

// Version Code hesapla (1.0.2 -> 10002)
const vParts = newVersion.split('.').map(n => parseInt(n, 10) || 0);
const versionCode = (vParts[0] * 10000) + (vParts[1] * 100) + (vParts[2] || 0);

// 3. version.json metadata hazırla
const versionData = {
  version: newVersion,
  versionCode: versionCode,
  buildDate: new Date().toISOString(),
  releaseNotes: 'ServisPro Masaüstü otomatik güncelleme desteği, saha ve ofis ergonomisi, anlık MySQL senkronizasyonu.',
  bundleUrl: 'https://izmirimteknik.com/servispro/app-bundle.zip',
  bundleHash: sha256,
  bundleSize: bundleSize,
  minAppVersion: '1.0.0',
  downloadUrl: 'https://izmirimteknik.com/servispro/',
};

// dist/version.json ve kök version.json yaz
const versionJsonStr = JSON.stringify(versionData, null, 2) + '\n';
fs.writeFileSync(path.join(DIST_DIR, 'version.json'), versionJsonStr, 'utf-8');
fs.writeFileSync(path.join(ROOT_DIR, 'version.json'), versionJsonStr, 'utf-8');

console.log(`\n======================================================`);
console.log(`  🚀 GÜNCELLEME METADATA BİLGİSİ HAZIRLANDI`);
console.log(`  ----------------------------------------------------`);
console.log(`  📌 Versiyon:       v${newVersion} (Kod: ${versionCode})`);
console.log(`  📁 Paket Boyutu:   ${(bundleSize / (1024 * 1024)).toFixed(2)} MB (${bundleSize} bytes)`);
console.log(`  🔒 SHA-256 Hash:   ${sha256.substring(0, 16)}...`);
console.log(`  🌐 İndirme Adresi: ${versionData.bundleUrl}`);
console.log(`======================================================\n`);
