# ServisPro (izmirimteknik.com/servispro) & Electron OTA Dağıtım Kuralları

- **Aksini belirtmedikçe**, ServisPro projesinde bir değişiklik yapıldığında kullanıcının bunu doğrudan `https://izmirimteknik.com/servispro` adresinde görmesi zorunludur. Burası her zaman güncel tutulmalıdır.
- **Electron Uygulaması Güncelliği**: Yapılan değişiklikler masaüstü Electron uygulamasını kullananların uygulama içinden otomatik olarak güncelleyebilmesi için OTA güncelleme paketiyle birlikte hazır tutulmalıdır.
- **Her Değişiklik Sonrası Standart Dağıtım Prosedürü**:
  1. `npm run build:update` çalıştırılır (projeyi derler, versiyonu artırır, `app-bundle.zip` ve `version.json` oluşturur).
  2. `powershell -ExecutionPolicy Bypass -File deploy_ftp.ps1` çalıştırılarak `dist` dosyaları FTP ile `izmirimteknik.com` canlı sunucusuna yüklenir.
  3. `package.json` ve `version.json` dahil tüm değişiklikler açıklayıcı bir commit mesajıyla GitHub'a (`git push origin main`) pushlanır.
