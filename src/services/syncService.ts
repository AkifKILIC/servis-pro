// Canlı Cihazlar Arası Senkronizasyon Servisi (Vercel Cloud & Masaüstü & iPhone)
import { ServiceTicket } from '../types';

type SyncCallback = (event: { type: string; data: any }) => void;

// Vercel üzerinde bağımsız çalışan global yüksek hızlı bulut kanalı
const CLOUD_SYNC_TOPIC = 'servispro_akifkilic_sync';
const CLOUD_NTFY_URL = `https://ntfy.sh/${CLOUD_SYNC_TOPIC}`;

class SyncService {
  private localEventSource: EventSource | null = null;
  private cloudEventSource: EventSource | null = null;
  private listeners: SyncCallback[] = [];
  private isConnected: boolean = false;
  private serverUrl: string = '';
  private clientId: string = 'cli_' + Math.random().toString(36).substring(2, 9);
  private lastPollTimestamp: number = Math.floor(Date.now() / 1000) - 30; // son 30 saniye

  constructor() {
    // Vite proxy üzerinden /api çağrılarını doğrudan arka plana iletir
    // Electron masaüstü uygulamasında (file:// protokolü) port 3001'e doğrudan bağlanır
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      this.serverUrl = 'http://localhost:3001';
    } else {
      this.serverUrl = '';
    }
  }

  private pollingInterval: any = null;
  private knownTicketIds: Set<string> = new Set();
  private hasSetupVisibilityListener: boolean = false;

  // Canlı Bulut ve Yerel Bağlantıları Başlat
  connect() {
    this.startSmartPolling();
    this.connectCloudSSE();
    this.connectLocalSSE();
    this.checkMissedCloudMessages();

    // iOS Safari ekran kilidi açıldığında veya kullanıcı uygulamaya döndüğünde
    // SAYFAYI YENİLEMEDEN ANINDA TÜM BEKLEYEN İŞLERİ YAKALA!
    if (!this.hasSetupVisibilityListener && typeof document !== 'undefined') {
      this.hasSetupVisibilityListener = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('📱 Telefon ekranı açıldı / uygulama ön plana geldi. Bekleyen işler anında taranıyor...');
          this.checkMissedCloudMessages();
          this.reconnectCloudSSE();
        }
      });
      window.addEventListener('focus', () => {
        this.checkMissedCloudMessages();
      });
    }
  }

  // Gelen ham ntfy mesajından fiş veya güncelleme verisini ayıkla
  private extractEventFromRaw(raw: any): { type: string; data: any; senderId?: string } | null {
    if (!raw) return null;

    // 1. Click URL veya action içindeki tjson (Bilet) parametresini çöz
    const clickUrl = raw.click || (raw.actions && raw.actions[0]?.url);
    if (clickUrl) {
      if (clickUrl.includes('tjson=')) {
        try {
          const url = new URL(clickUrl);
          const encoded = url.searchParams.get('tjson');
          if (encoded) {
            const ticket = JSON.parse(decodeURIComponent(encoded));
            const senderId = url.searchParams.get('sid') || raw.senderId;
            return {
              type: 'NEW_TICKET_ALERT',
              senderId,
              data: { ticket, message: raw.title || 'Yeni servis fişi oluşturuldu!' }
            };
          }
        } catch {}
      } else if (clickUrl.includes('ujson=')) {
        try {
          const url = new URL(clickUrl);
          const encoded = url.searchParams.get('ujson');
          if (encoded) {
            const updateData = JSON.parse(decodeURIComponent(encoded));
            const senderId = url.searchParams.get('sid') || raw.senderId;
            return {
              type: 'TICKET_UPDATED',
              senderId,
              data: updateData
            };
          }
        } catch {}
      }
    }

    // 2. raw.message bir JSON objesi ise (Eski bildirimler için geriye uyumluluk)
    if (raw.message) {
      try {
        const parsed = JSON.parse(raw.message);
        if (parsed && parsed.type) {
          return parsed;
        }
      } catch {}
    }

    return null;
  }

  // Bulut SSE Bağlantısı
  private connectCloudSSE() {
    if (!this.cloudEventSource && typeof EventSource !== 'undefined') {
      try {
        this.cloudEventSource = new EventSource(`${CLOUD_NTFY_URL}/sse`);

        this.cloudEventSource.onopen = () => {
          this.isConnected = true;
          console.log('⚡ ServisPro Global Bulut Senkronizasyon Bağlantısı Kuruldu');
        };

        this.cloudEventSource.onmessage = (e) => {
          try {
            const raw = JSON.parse(e.data);
            const inner = this.extractEventFromRaw(raw);
            if (inner && inner.type) {
              // Kendi gönderdiğimiz mesajın kendi bilgisayarımızda usta alarmı çalmasını önle (Echo koruması)
              if (inner.senderId && inner.senderId === this.clientId) {
                return;
              }
              if (inner.type === 'NEW_TICKET_ALERT') {
                const ticketId = inner.data?.ticket?.id || inner.data?.id;
                if (ticketId) {
                  if (this.knownTicketIds.has(ticketId)) return;
                  this.knownTicketIds.add(ticketId);
                }
              }
              this.notifyListeners(inner);
            }
          } catch (err) {
            // Sessiz geç
          }
        };

        this.cloudEventSource.onerror = () => {
          // EventSource tarayıcı tarafından otomatik olarak yeniden denenir
        };
      } catch (err) {
        console.warn('Bulut senkronizasyon başlatılamadı:', err);
      }
    }
  }

  public reconnectCloudSSE() {
    if (this.cloudEventSource) {
      try {
        this.cloudEventSource.close();
      } catch {}
      this.cloudEventSource = null;
    }
    this.connectCloudSSE();
  }

  // Yerel Sunucu SSE Bağlantısı (Masaüstü PC & Yerel Ağ)
  private connectLocalSSE() {
    if (!this.localEventSource && typeof EventSource !== 'undefined' && (this.serverUrl || window.location.hostname === 'localhost')) {
      try {
        const localUrl = this.serverUrl || '';
        this.localEventSource = new EventSource(`${localUrl}/api/events`);

        this.localEventSource.onopen = () => {
          this.isConnected = true;
          console.log('⚡ ServisPro Yerel Sunucu Bağlantısı Kuruldu');
        };

        this.localEventSource.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed && parsed.type) {
              if (parsed.type === 'NEW_TICKET_ALERT' && parsed.data?.ticket?.id) {
                this.knownTicketIds.add(parsed.data.ticket.id);
              }
              this.notifyListeners(parsed);
            }
          } catch (err) {
            console.error('Yerel SSE mesaj ayrıştırma hatası:', err);
          }
        };

        this.localEventSource.onerror = () => {
          // Yerel sunucu yoksa bulut üzerinden devam eder
        };
      } catch (e) {
        // Çevrimdışı sessiz geç
      }
    }
  }

  // Buluttaki bekleyen tüm yeni mesajları ve işleri sorgula (Ekran açıldığında ve periyodik)
  public async checkMissedCloudMessages() {
    try {
      const pollRes = await fetch(`${CLOUD_NTFY_URL}/json?poll=1&since=${this.lastPollTimestamp}`);
      if (pollRes.ok) {
        const text = await pollRes.text();
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            if (item.time && item.time > this.lastPollTimestamp) {
              this.lastPollTimestamp = item.time;
            }
            const inner = this.extractEventFromRaw(item);
            if (inner && inner.type) {
              // Kendi gönderdiğimiz bildirimi kendimizde çalmayalım
              if (inner.senderId && inner.senderId === this.clientId) {
                continue;
              }
              if (inner.type === 'NEW_TICKET_ALERT') {
                const ticketId = inner.data?.ticket?.id || inner.data?.id;
                if (ticketId && !this.knownTicketIds.has(ticketId)) {
                  this.knownTicketIds.add(ticketId);
                  console.log('🚨 Buluttan yeni iş emri alındı:', ticketId);
                  this.notifyListeners(inner);
                }
              } else if (inner.type === 'TICKET_UPDATED') {
                this.notifyListeners(inner);
              }
            }
          } catch {}
        }
      }
    } catch (e) {}
  }

  // iPhone için Akıllı Arka Plan Sorgulama (SSE kesilirse veya uyursa bile yeni işi kaçırmaz)
  private startSmartPolling() {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      // A) BULUT MESAJ HAVUZUNU KONTROL ET
      await this.checkMissedCloudMessages();

      // B) YEREL SUNUCU KONTROLÜ
      try {
        const data = await this.pullData();
        if (data && data.tickets && Array.isArray(data.tickets)) {
          if (this.knownTicketIds.size === 0) {
            data.tickets.forEach((t: ServiceTicket) => this.knownTicketIds.add(t.id));
            return;
          }

          for (const ticket of data.tickets) {
            if (!this.knownTicketIds.has(ticket.id)) {
              this.knownTicketIds.add(ticket.id);
              this.notifyListeners({
                type: 'NEW_TICKET_ALERT',
                data: { ticket, message: 'Yeni servis fişi oluşturuldu!' }
              });
            }
          }
        }
      } catch (e) {
        // Çevrimdışı sessiz geç
      }
    }, 30000);
  }

  // Dinleyici Ekle (App.tsx veya bileşenler dinler)
  subscribe(callback: SyncCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(event: { type: string; data: any }) {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('Listener hatası:', e);
      }
    });
  }

  // Sunucuya tam veritabanı yolla (PC veya iPhone'dan)
  async pushFullSync(data: any): Promise<boolean> {
    try {
      // Yerel sunucuya kaydet (Bulut bildirim servisine tüm veritabanı basılmaz, sadece gerçek bildirimler gider)
      if (this.serverUrl || window.location.hostname === 'localhost') {
        const res = await fetch(`${this.serverUrl}/api/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        return res.ok;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Sunucudan son veriyi çek
  async pullData(): Promise<any | null> {
    try {
      if (this.serverUrl || window.location.hostname === 'localhost') {
        const res = await fetch(`${this.serverUrl}/api/data`);
        if (res.ok) {
          return await res.json();
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  // Saha ustasının iPhone'dan hızlı tekil güncellemesi (Hem Buluta Hem Ofis PC'ye Anında Gider)
  async updateTicketField(ticketId: string, updates: Partial<ServiceTicket>): Promise<boolean> {
    try {
      let statusDesc = 'İş Durumu Güncellendi';
      if (updates.status === 'delivered') statusDesc = 'Servis Ücreti Tahsil Edildi / İş Kapatıldı';
      else if (updates.status === 'in_repair') statusDesc = 'İş Alındı / Onarıma Başlandı';
      else if (updates.status === 'ready') statusDesc = 'Onarım Tamamlandı / Fiş Hazır';

      const updateData = { id: ticketId, ...updates };
      const encodedUpdate = encodeURIComponent(JSON.stringify(updateData));
      const targetUrl = `https://servis-pro-seven.vercel.app/?mode=technician&ticket=${ticketId}&sid=${this.clientId}&ujson=${encodedUpdate}`;

      // 1. Buluta Anında Yayınla
      fetch('https://ntfy.sh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: CLOUD_SYNC_TOPIC,
          title: `✅ ${statusDesc}`,
          message: `Fiş No: ${updates.ticketNumber || ticketId}\nSaat: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
          priority: 4,
          tags: ['clipboard', 'white_check_mark'],
          click: targetUrl
        })
      }).catch(() => {});

      // 2. Varsa yerel sunucuya yaz
      if (this.serverUrl || window.location.hostname === 'localhost') {
        const res = await fetch(`${this.serverUrl}/api/tickets/${ticketId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        return res.ok;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Ustalara Canlı Bildirim, Ses ve Kilit Ekranı Uyarısı Fırlatma
  async sendTechnicianAlert(ticket: ServiceTicket, message?: string): Promise<boolean> {
    try {
      const deviceLabels: Record<string, string> = {
        washing_machine: 'Çamaşır Makinesi',
        dishwasher: 'Bulaşık Makinesi',
        refrigerator: 'Buzdolabı',
        oven: 'Fırın / Ocak',
        dryer: 'Kurutma Makinesi',
        boiler: 'Kombi',
        air_conditioner: 'Klima',
        other: 'Cihaz'
      };
      const devName = deviceLabels[ticket.deviceType] || ticket.deviceType || 'Cihaz';
      const devDetail = [devName, ticket.brand, (ticket.model && ticket.model !== 'Model Belirtilmedi') ? ticket.model : ''].filter(Boolean).join(' ');

      // 1. İnsan Gözünün Okuyacağı Pırıl Pırıl Türkçe Bildirim Metni (Garip JSON kodları tamamen temizlendi!)
      const readableLines = [
        `👤 Müşteri: ${ticket.customerName}`,
        `🔧 Cihaz: ${devDetail}`,
        `⚠️ Arıza: ${ticket.reportedFault}`,
        `📍 Adres: ${ticket.customerAddress}`,
        ticket.customerPhone ? `📞 Tel: ${ticket.customerPhone}` : ''
      ];
      const humanReadableText = readableLines.filter(Boolean).join('\n');

      // Fiş verisini URL parametresine gömüyoruz (Böylece bildirim metninde garip kodlar görünmez!)
      const encodedTicket = encodeURIComponent(JSON.stringify(ticket));
      const targetUrl = `https://servis-pro-seven.vercel.app/?mode=technician&ticket=${ticket.id}&sid=${this.clientId}&tjson=${encodedTicket}`;

      // Yüksek Öncelikli Global Bulut Bildirimi (Apple APNs ve ntfy destekli)
      fetch('https://ntfy.sh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: CLOUD_SYNC_TOPIC,
          title: `🚨 YENİ SERVİS İŞİ: ${ticket.ticketNumber}`,
          message: humanReadableText,
          priority: 5,
          tags: ['wrench', 'bell', 'warning'],
          click: targetUrl,
          actions: [
            { action: 'view', label: 'İşi Aç', url: targetUrl, clear: true }
          ]
        })
      }).catch((e) => console.warn('Bulut bildirim hatası:', e));

      // 2. Varsa yerel sunucuya ilet
      if (this.serverUrl || window.location.hostname === 'localhost') {
        await fetch(`${this.serverUrl}/api/notify-technicians`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket, message }),
        }).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  getIsConnected() {
    return this.isConnected;
  }

  getServerUrl() {
    return this.serverUrl;
  }
}

export const syncService = new SyncService();
