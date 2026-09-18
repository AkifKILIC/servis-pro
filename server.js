import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'servispro_db.json');

// Klasör ve dosya kontrolü
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// SSE (Server-Sent Events) istemcileri (PC'ler ve iPhone'lar)
let clients = [];

// Canlı veri yayını (Tüm bağlı PC ve iPhone'lara aynı anda iletir)
function broadcastUpdate(type, data) {
  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  console.log(`📢 [BROADCAST] ${type} -> ${clients.length} bağlı cihaza gönderiliyor`);
  clients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // client disconnected
    }
  });
}

// Veritabanını oku
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('DB okuma hatası:', err);
    return null;
  }
}

// Veritabanını kaydet
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 1. Tüm veriyi çek (İlk açılışta PC veya iPhone senkronizasyonu)
app.get('/api/data', (req, res) => {
  const db = readDB();
  res.json(db || {});
});

// 2. Tam senkronizasyon (Toplu kayıt / güncelleme)
app.post('/api/sync', (req, res) => {
  const incoming = req.body;
  if (!incoming) {
    return res.status(400).json({ error: 'Geçersiz veri' });
  }

  writeDB(incoming);
  broadcastUpdate('FULL_SYNC', incoming);
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// 3. Saha Ustasının iPhone'dan Hızlı Fiş Güncellemesi (Tek Tık: Servis Ücretine Döndü / İş Alındı vb.)
app.post('/api/tickets/:id/update', (req, res) => {
  const ticketId = req.params.id;
  const updates = req.body;
  let db = readDB();

  if (!db || !db.tickets) {
    return res.status(404).json({ error: 'Veritabanı henüz başlatılmadı' });
  }

  const idx = db.tickets.findIndex(t => t.id === ticketId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Fiş bulunamadı' });
  }

  const oldTicket = db.tickets[idx];
  const updatedTicket = {
    ...oldTicket,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Eğer servis ücreti tahsil edildiyse veya iş tamamlandıysa kasaya otomatik ekleyelim
  if (updates.paymentStatus === 'paid' && oldTicket.paymentStatus !== 'paid' && updates.paidAmount > 0) {
    if (!db.cash) db.cash = [];
    db.cash.unshift({
      id: 'tx-' + Date.now(),
      type: 'income',
      category: 'Servis Tahsilatı (Saha)',
      amount: updates.paidAmount,
      date: new Date().toISOString(),
      description: `${updatedTicket.customerName} - ${updatedTicket.ticketNumber} Saha Tahsilatı`,
      relatedTicketId: updatedTicket.id,
      paymentMethod: updates.paymentMethod || 'cash',
    });
  }

  db.tickets[idx] = updatedTicket;
  writeDB(db);

  // Anında tüm istemcilere (ofisteki PC'ye) fırlat!
  broadcastUpdate('TICKET_UPDATED', updatedTicket);

  res.json({ success: true, ticket: updatedTicket });
});

// 4. Ustalara Canlı Bildirim / Zil Fırlatma (Ofisten Tek Tıkla)
app.post('/api/notify-technicians', (req, res) => {
  const { ticket, message } = req.body;
  if (!ticket) {
    return res.status(400).json({ error: 'Fiş bilgisi eksik' });
  }

  broadcastUpdate('NEW_TICKET_ALERT', { ticket, message });
  res.json({ success: true, alertedClientsCount: clients.length });
});

// 4. SSE Canlı Akış (Gerçek Zamanlı Push Bildirim Bağlantısı)
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  console.log(`📱 Yeni İstemci Bağlandı: ${clientId}. Toplam Aktif İstemci: ${clients.length}`);

  // Proxy tamponunu (buffer) aşmak için 2KB boş yorum satırı yolla (Anında bağlantı garantisi)
  res.write(':' + ' '.repeat(2048) + '\n\n');

  // Bağlantı hoşgeldin mesajı
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
    console.log(`❌ İstemci Ayrıldı: ${clientId}. Kalan: ${clients.length}`);
  });
});

// Canlı Durum ve İstemci Sayısı Kontrolü
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    clientsCount: clients.length,
    clients: clients.map(c => c.id),
    uptime: Math.floor(process.uptime())
  });
});

// Mobil ağlarda bağlantının uyumasını önlemek için 15 saniyede bir sessiz ping yolla
setInterval(() => {
  clients.forEach(client => {
    try {
      client.res.write(`: ping\n\n`);
    } catch (e) {}
  });
}, 15000);

// Yerel Ağ IP Adresini Bul (iPhone'dan bağlanmak için)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 SERVISPRO CANLI SENKRONİZASYON SUNUCUSU ÇALIŞIYOR`);
  console.log(`  ----------------------------------------------------`);
  console.log(`  💻 PC / Ofis Yerel Adresi:  http://localhost:${PORT}`);
  console.log(`  📱 iPhone Saha Bağlantısı:  http://${localIP}:${PORT}`);
  console.log(`======================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`ℹ️ Port ${PORT} zaten aktif, mevcut canlı senkronizasyon üzerinden devam ediliyor.`);
  } else {
    console.error('Sunucu hatası:', err);
  }
});

export default app;
