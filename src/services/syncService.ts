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

  // Canlı Bulut ve Yerel Bağlantıları Başlat
  connect() {
    this.startSmartPolling();

    // 1. GLOBAL BULUT SSE BAĞLANTISI (Vercel & iPhone için 7/24 Kesintisiz)
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
            if (raw && raw.message) {
              let inner: any = null;
              try {
                inner = JSON.parse(raw.message);
              } catch {
                inner = raw.message;
              }
              if (inner && inner.type) {
                if (inner.type === 'NEW_TICKET_ALERT') {
                  const ticketId = inner.data?.ticket?.id || inner.data?.id;
                  if (ticketId) this.knownTicketIds.add(ticketId);
                }
                this.notifyListeners(inner);
              }
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

    // 2. YEREL SUNUCU SSE BAĞLANTISI (Masaüstü PC & Yerel Ağ)
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

  // iPhone için Akıllı Arka Plan Sorgulama (SSE kesilirse veya uyursa bile yeni işi kaçırmaz)
  private startSmartPolling() {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
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
              console.log('🚨 Yeni iş emri tespit edildi:', ticket.ticketNumber);
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
    }, 4000);
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

  // Sunucuya ve Buluta tam veritabanı yolla (PC veya iPhone'dan)
  async pushFullSync(data: any): Promise<boolean> {
    try {
      // 1. Buluta yayınla
      fetch('https://ntfy.sh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: CLOUD_SYNC_TOPIC,
          title: '🔄 VERİTABANI SENKRONİZASYONU',
          message: JSON.stringify({ type: 'FULL_SYNC', data }),
          priority: 2
        })
      }).catch(() => {});

      // 2. Yerel sunucuya kaydet
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
      // 1. Buluta Anında Yayınla (Ofisteki PC saniyeler içinde görür)
      fetch('https://ntfy.sh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: CLOUD_SYNC_TOPIC,
          title: `✅ FİŞ GÜNCELLENDİ`,
          message: JSON.stringify({
            type: 'TICKET_UPDATED',
            data: { id: ticketId, ...updates }
          }),
          priority: 4,
          tags: ['clipboard', 'white_check_mark']
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
      // 1. Yüksek Öncelikli Global Bulut Bildirimi (Apple APNs ve ntfy destekli)
      fetch('https://ntfy.sh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: CLOUD_SYNC_TOPIC,
          title: `🚨 YENİ İŞ: ${ticket.customerName} (${ticket.brand} ${ticket.model})`,
          message: JSON.stringify({
            type: 'NEW_TICKET_ALERT',
            data: { ticket, message: message || 'Yeni servis fişi oluşturuldu!' }
          }),
          priority: 5,
          tags: ['wrench', 'bell', 'warning'],
          click: `https://servis-pro-seven.vercel.app/?mode=technician&ticket=${ticket.id}`
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
