# 🚀 ServisPro - Beyaz Eşya Teknik Servis & Saha Yönetim Sistemi

ServisPro; beyaz eşya teknik servis işletmeleri, ofis yöneticileri ve sahadaki ustalar için tasarlanmış **çevrimdışı öncelikli (Offline-First)**, **anlık senkronizasyonlu** ve **otomatik güncellenebilir (Auto-Updating)** hibrit bir masaüstü ve mobil yönetim platformudur.

---

## ⚡ Canlı Mimari ve Teknolojiler

- **Masaüstü (Desktop)**: Electron (v41+), Chromium, Node.js.
- **Kullanıcı Arayüzü**: React 19, TypeScript, Vite, Modern CSS (Glassmorphism & Neon Dark Theme).
- **Arka Plan Yerel Senkronizasyon**: Express.js (Port 3001), Server-Sent Events (SSE).
- **Merkezi Veritabanı**: cPanel MySQL REST API (`https://izmirimteknik.com/servispro/api.php`).
- **Dağıtım & Canlı Sunucu**: cPanel Hosting & FTP (`https://izmirimteknik.com/servispro/`).
- **Otomatik Güncelleme (OTA Engine)**: Sıfır kesintiyle çalışan atomik paket güncelleyici (`updater.cjs`).

---

## 🔄 Otomatik Güncelleme Sistemi (Nasıl Çalışır?)

Uygulama iki taraflı çalışan akıllı bir güncelleme altyapısına sahiptir:

### 1. Geliştirici Tarafı ("Buradan Değişiklik Yaptığınızda")

Geliştirici bilgisayarında kodlarda (React bileşenleri, tasarımlar, arayüz, yerel sunucu mantığı vb.) değişiklik yaptığınızda:

```bash
# 1. Tek komutla sürüm artırır, derler, güncelleme paketini hazırlar ve sunucuya FTP ile yükler:
npm run publish:update

# (Eğer sürüm numarasını sabit tutarak sadece ara yama / hotfix göndermek isterseniz):
npm run deploy:keep
```

Bu komut sırasıyla:
1. `tsc -b && vite build` ile projeyi derler.
2. `scripts/prepare-update.cjs` çalışarak:
   - Sürüm numarasını otomatik artırır (örn: `v1.0.1` -> `v1.0.2`).
   - Yalnızca gerekli istemci dosyalarını ve `server.js`'i `dist/app-bundle.zip` olarak sıkıştırır (~250 KB).
   - SHA-256 bütünlük özetini ve dosya boyutunu hesaplar.
   - `dist/version.json` ve projenin kökündeki `version.json` dosyasını oluşturur.
3. `deploy_ftp.ps1` ile yeni paketleri (`app-bundle.zip` ve `version.json`) anında `https://izmirimteknik.com/servispro/` adresine yükler.

---

### 2. İstemci Tarafı ("Başka Bilgisayarda Uygulama Açılırken")

Uygulamayı başka bir bilgisayarda kullanan kişi `ServisPro.exe`'yi açtığında:

1. **Açılış Splash Ekranı**:
   - Modern, koyu temalı, animasyonlu bir açılış penceresi ekrana gelir.
   - "Sistem ve güncellemeler denetleniyor..." mesajı gösterilir.
2. **Uzak Sürüm Kontrolü**:
   - `https://izmirimteknik.com/servispro/version.json` adresinden en son sürüm bilgisi ve SHA-256 hash'i sorgulanır (zaman aşımı 3.5 sn).
   - Eğer GitHub bağlantısı gerekirse yedek olarak GitHub raw kontrol edilir.
3. **Güncelleme Varsa (`hasUpdate: true`)**:
   - Splash ekranında *"🚀 Yeni sürüm bulundu: v1.0.X indiriliyor..."* bildirimi çıkar.
   - Yaklaşık 250 KB'lık paket ~0.3 saniyede iner ve yüzde ilerleme çubuğu anlık dolar.
   - Paket SHA-256 ile doğrulanır ve kullanıcının `AppData/Roaming/servispro/app_dist` klasörüne atomik olarak çıkartılır.
   - *"✅ Güncelleme tamamlandı! Uygulama açılıyor..."* denir ve doğrudan **en son sürüm** ekrana gelir!
4. **Güncelleme Yoksa veya Çevrimdışıysa**:
   - İnternet yoksa bile uygulama hiç beklemeden yerel önbellekteki sürümüyle anında açılır.
5. **Uygulama Açıkken Arka Planda Güncelleme**:
   - Uygulama açık bırakıldığında her 30 dakikada bir sessizce güncelleme denetlenir.
   - Yeni güncelleme çıkarsa sağ altta *"Yeni Güncelleme Mevcut - Yükle"* bildirimi ve üst menü çubuğunda *"Yeni Sürüm (v1.0.X)"* parlayan butonu belirir.
   - Tıklandığında kullanıcıyı rahatsız etmeden güncellemeyi uygular ve tek tıkla yeniler.

---

## 🛠️ Masaüstü (.EXE) Paketini Sıfırdan Üretme

Başka bir bilgisayara ilk defa kurmak için tam `.exe` paketi oluşturmak isterseniz:

```bash
npm run electron:build
```

Bu komut `dist-desktop/ServisPro-win32-x64` klasörünü ve `ServisPro.exe` uygulamasını üretir. Bu klasörü zipleyip istediğiniz bilgisayara kopyalayabilirsiniz. Bir kez kopyalandıktan sonra, sonraki tüm değişikliklerinizi otomatik güncelleme sistemi üzerinden alacaktır!

---

## 📋 Sık Kullanılan Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Web geliştirici sunucusunu başlatır (`localhost:5173`). |
| `npm run server` | Yerel arka plan MySQL senkronizasyon sunucusunu başlatır (`localhost:3001`). |
| `npm run electron` | Masaüstü uygulamasını geliştirici modunda açar. |
| `npm run build` | React ve Vite üretim derlemesini yapar. |
| `npm run build:update` | Derleme yapar ve güncelleme paketini (`app-bundle.zip`) üretir. |
| `npm run publish:update` | **(Önerilen)** Derler, paketi hazırlar ve sunucuya FTP ile canlıya alır. |
| `npm run electron:build` | Standalone taşınabilir Windows masaüstü uygulamasını (`dist-desktop/`) derler. |

---

## 🔒 Veri Güvenliği ve Çevrimdışı Çalışma

- **UserData İzolasyonu**: Veritabanı ve güncelleme paketleri Windows'ta her kullanıcının `AppData\Roaming\servispro` güvenli alanında saklanır. `C:\Program Files` yazma yetkisi sorunları yaşanmaz.
- **Tekil Örnek Kilidi (Single Instance)**: Aynı anda birden fazla ServisPro açılması ve port çakışmaları engellenir; ikinci tıklamada açık olan pencere öne getirilir.
- **Harici Bağlantı Güvenliği**: WhatsApp, Google Haritalar gibi dış bağlantılar Electron penceresi içinde kaybolmaz, kullanıcının varsayılan web tarayıcısında açılır.
