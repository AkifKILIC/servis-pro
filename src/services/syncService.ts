import { ServiceTicket, Customer, SparePart, CashTransaction, ShopSettings, CurrentAccount, CurrentAccountTransaction } from '../types';
import { storage } from './storage';

type SyncCallback = (event: { type: string; data: any }) => void;

// Vercel üzerinde bağımsız çalışan global yüksek hızlı bulut kanalı
const CLOUD_SYNC_TOPIC = 'servispro_akifkilic_sync';
const VERCEL_SYNC_ENDPOINT = 'https://servis-pro-seven.vercel.app/api/sync';

// Merkezi cPanel MySQL REST API Adresi
export const getMySqlApiUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('izmirimteknik.com')) {
      const pathname = window.location.pathname;
      if (pathname.includes('/servispro')) {
        return `${window.location.origin}/servispro/api.php`;
      }
      return `${window.location.origin}/api.php`;
    }
    // Vercel, localhost veya telefon PWA üzerinden doğrudan MySQL API
    return 'https://izmirimteknik.com/servispro/api.php';
  }
  return 'https://izmirimteknik.com/servispro/api.php';
};

export interface OfflineMutation {
  id: string;
  action: 'ticket_save' | 'ticket_delete' | 'customer_save' | 'customer_delete' | 'part_save' | 'part_delete' | 'cash_save' | 'cash_delete' | 'current_account_save' | 'current_account_delete' | 'current_tx_save' | 'current_tx_delete' | 'settings_save';
  data: any;
  timestamp: number;
}


export type ConnectionState = 'online' | 'offline' | 'syncing';

class SyncService {
  private localEventSource: EventSource | null = null;
  private cloudEventSource: EventSource | null = null;
  private listeners: SyncCallback[] = [];
  private isConnected: boolean = true;
  private connectionState: ConnectionState = 'online';
  private offlineQueue: OfflineMutation[] = [];
  private isDrainingQueue: boolean = false;
  private serverUrl: string = '';
  private clientId: string = 'cli_' + Math.random().toString(36).substring(2, 9);
  private lastPollTimestamp: number = Math.floor(Date.now() / 1000); // Şu andan itibaren dinle
  private knownTicketMap: Map<string, string> = new Map(); // id -> updatedAt/status
  private seenMessageIds: Set<string> = new Set();
  private isFirstCloudPoll: boolean = true;


  constructor() {
    // Vite proxy üzerinden /api çağrılarını doğrudan arka plana iletir
    // Electron masaüstü uygulamasında (file:// protokolü) port 3001'e doğrudan bağlanır
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      this.serverUrl = 'http://localhost:3001';
    } else {
      this.serverUrl = '';
    }

    this.offlineQueue = this.loadOfflineQueue();
    if (typeof navigator !== 'undefined') {
      this.connectionState = navigator.onLine ? 'online' : 'offline';
    }
  }

  private loadOfflineQueue(): OfflineMutation[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('servispro_offline_queue');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  private saveOfflineQueue() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('servispro_offline_queue', JSON.stringify(this.offlineQueue));
    } catch {}
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getOfflineQueueCount(): number {
    return this.offlineQueue.length;
  }

  private setConnectionState(newState: ConnectionState) {
    if (this.connectionState !== newState) {
      this.connectionState = newState;
      this.isConnected = newState === 'online';
      this.notifyConnectionChange();
    }
  }

  private notifyConnectionChange() {
    this.notifyListeners({
      type: 'CONNECTION_STATE_CHANGED',
      data: { state: this.connectionState, pendingCount: this.offlineQueue.length }
    });
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

    // Online / Offline tarayıcı & sistem olaylarını dinle
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 İnternet bağlantısı geri geldi! Çevrimdışı kuyruk MySQL ile senkronize ediliyor...');
        this.setConnectionState('online');
        this.drainOfflineQueue();
      });

      window.addEventListener('offline', () => {
        console.warn('⚠️ İnternet bağlantısı koptu! Çevrimdışı (Offline-First) moduna geçildi.');
        this.setConnectionState('offline');
      });
    }

    // İlk açılışta bekleyen çevrimdışı işlem varsa 1.5 sn sonra hemen göndermeyi dene
    if (this.offlineQueue.length > 0) {
      setTimeout(() => {
        this.drainOfflineQueue();
      }, 1500);
    }

    // iOS Safari / Masaüstü ekran kilidi açıldığında veya kullanıcı uygulamaya döndüğünde
    if (!this.hasSetupVisibilityListener && typeof document !== 'undefined') {
      this.hasSetupVisibilityListener = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('📱 Uygulama ön plana geldi. Bekleyen işler taranıyor...');
          this.checkMissedCloudMessages();
          this.reconnectCloudSSE();
          if (this.offlineQueue.length > 0) {
            this.drainOfflineQueue();
          }
        }
      });
      window.addEventListener('focus', () => {
        this.checkMissedCloudMessages();
        if (this.offlineQueue.length > 0) {
          this.drainOfflineQueue();
        }
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
          const url = new URL(clickUrl, 'https://servis-pro-seven.vercel.app');
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
          const url = new URL(clickUrl, 'https://servis-pro-seven.vercel.app');
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
    // SSE bağlantısı yerine Vercel üzerinden yüksek hızlı akıllı yoklama (polling) kullanıyoruz
    // Bu sayede Türkiye'deki hiçbir internet servis sağlayıcısında kesilme veya engelleme yaşanmaz.
    this.isConnected = true;
  }

  public reconnectCloudSSE() {
    this.checkMissedCloudMessages();
  }

  // Yerel Sunucu SSE Bağlantısı (Masaüstü PC & Yerel Ağ)
  private connectLocalSSE() {
    if (this.serverUrl || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
      const url = `${this.serverUrl}/api/events`;
      try {
        this.localEventSource = new EventSource(url);

        this.localEventSource.onopen = () => {
          this.isConnected = true;
        };

        this.localEventSource.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed && parsed.type) {
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
      const pollRes = await fetch(`${VERCEL_SYNC_ENDPOINT}?since=${this.lastPollTimestamp}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (pollRes.ok) {
        const text = await pollRes.text();
        const lines = text.split('\n').filter(Boolean);

        // İlk açılışta geçmiş mesajları sadece hafızaya al, eski bildirimleri öttürme
        if (this.isFirstCloudPoll) {
          this.isFirstCloudPoll = false;
          for (const line of lines) {
            try {
              const item = JSON.parse(line);
              if (item.id) this.seenMessageIds.add(item.id);
            } catch {}
          }
          return;
        }

        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            if (item.id) {
              if (this.seenMessageIds.has(item.id)) {
                continue; // Zaten işlendi, kesinlikle tekrar çalma!
              }
              this.seenMessageIds.add(item.id);
            }

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
                const ticketId = inner.data?.id;
                const sig = `${inner.data?.status}_${inner.data?.paidAmount}_${inner.data?.updatedAt}`;
                const prevSig = this.knownTicketMap.get(ticketId);
                if (!prevSig || prevSig !== sig) {
                  this.knownTicketMap.set(ticketId, sig);
                  this.notifyListeners(inner);
                }
              }
            }
          } catch {}
        }
      }
    } catch (e) {}
  }

  // iPhone ve Ofis PC için Yüksek Hızlı Akıllı Senkronizasyon (3.5 saniyede bir taranır)
  private startSmartPolling() {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      // A) BULUT MESAJ HAVUZUNU KONTROL ET (Vercel Proxy)
      await this.checkMissedCloudMessages();

      // B) MERKEZİ MYSQL / YEREL SUNUCU KONTROLÜ
      try {
        const data = await this.pullData();
        if (data && data.tickets && Array.isArray(data.tickets)) {
          const currentIds = new Set(data.tickets.map((t: ServiceTicket) => t.id));

          // İlk yükleme
          if (this.knownTicketIds.size === 0) {
            data.tickets.forEach((t: ServiceTicket) => {
              this.knownTicketIds.add(t.id);
              this.knownTicketMap.set(t.id, `${t.status}_${t.updatedAt || ''}_${t.paidAmount}`);
            });
            return;
          }

          // Silinen Fiş Kontrolü: Eğer önceden bildiğimiz fiş artık MySQL'de yoksa, diğer cihaz silmiştir!
          let hasDeleted = false;
          for (const knownId of Array.from(this.knownTicketIds)) {
            if (!currentIds.has(knownId)) {
              this.knownTicketIds.delete(knownId);
              this.knownTicketMap.delete(knownId);
              hasDeleted = true;
            }
          }

          // Yeni Fiş Kontrolü
          for (const ticket of data.tickets) {
            if (!this.knownTicketIds.has(ticket.id)) {
              this.knownTicketIds.add(ticket.id);
              this.knownTicketMap.set(ticket.id, `${ticket.status}_${ticket.updatedAt || ''}_${ticket.paidAmount}`);
              this.notifyListeners({
                type: 'NEW_TICKET_ALERT',
                data: { ticket, message: 'Yeni servis kaydı açıldı!' }
              });
            } else {
              // Güncelleme Kontrolü (Durum, ödeme veya tarih değişti mi?)
              const sig = `${ticket.status}_${ticket.updatedAt || ''}_${ticket.paidAmount}`;
              const prevSig = this.knownTicketMap.get(ticket.id);
              if (prevSig && prevSig !== sig) {
                this.knownTicketMap.set(ticket.id, sig);
                this.notifyListeners({
                  type: 'TICKET_UPDATED',
                  data: ticket
                });
              }
            }
          }

          // Dükkan / Şirket Ayarları Kontrolü (MySQL'deki yeni firma adını usta telefonuna anında yansıt)
          if (data.settings && typeof data.settings === 'object') {
            const currentStored = storage.getSettings();
            if (currentStored.shopName !== data.settings.shopName || JSON.stringify(currentStored) !== JSON.stringify(data.settings)) {
              storage.saveSettings(data.settings);
              this.notifyListeners({
                type: 'SETTINGS_UPDATED',
                data: data.settings
              });
            }
          }

          // Eğer bir fiş silindiyse veya genel liste değiştiyse tüm cihazın state'ini güncelle
          if (hasDeleted) {
            this.notifyListeners({
              type: 'FULL_SYNC',
              data
            });
          }
        }
      } catch (err) {
        // Sessizce devam et
      }
    }, 3500);
  }

  // Dinleyici Ekle (App.tsx veya bileşenler dinler)
  subscribe(callback: SyncCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(event: { type: string; data: any; senderId?: string }) {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('Listener hatası:', e);
      }
    });
  }

  // Sunucuya tam veritabanı yolla (MySQL'e aktarır)
  async pushFullSync(data: any): Promise<boolean> {
    let ok = false;
    // 1. Doğrudan cPanel MySQL REST API'ye yolla
    try {
      const mysqlUrl = `${getMySqlApiUrl()}?action=sync`;
      const res = await fetch(mysqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) ok = true;
    } catch (e) {
      console.warn('MySQL pushFullSync hatası:', e);
    }

    // 2. Varsa yerel Express sunucusuna yolla
    try {
      if (this.serverUrl || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
        await fetch(`${this.serverUrl}/api/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch {}

    return ok;
  }

  // Sunucudan (MySQL veya yerel) son veriyi çek
  async pullData(): Promise<any | null> {
    // 1. Önce MySQL REST API'yi dene
    try {
      const mysqlUrl = `${getMySqlApiUrl()}?action=data`;
      const res = await fetch(mysqlUrl, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          return json;
        }
      }
    } catch (e) {
      // MySQL geçici olarak erişilemezse yerel sunucuya bak
    }

    // 2. Yerel sunucu
    try {
      if (this.serverUrl || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
        const res = await fetch(`${this.serverUrl}/api/data`);
        if (res.ok) {
          return await res.json();
        }
      }
    } catch {}

    return null;
  }

  // --- OFFLINE-FIRST MUTATION KUYRUĞU & SENKRONİZASYON ---

  private enqueueMutation(action: OfflineMutation['action'], data: any, entityId?: string) {
    // Varsa aynı entity için bekleyen önceki işlemi güncelle (mükerrerliği önler)
    if (entityId) {
      this.offlineQueue = this.offlineQueue.filter(m => !(m.action === action && (m.data?.id === entityId || m.data === entityId)));
    }

    const mut: OfflineMutation = {
      id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      action,
      data,
      timestamp: Date.now()
    };

    this.offlineQueue.push(mut);
    this.saveOfflineQueue();
    this.setConnectionState('offline');
    this.notifyConnectionChange();
    console.log(`📦 [ÇEVRİMDIŞI KUYRUK] İşlem yerel kuyruğa alındı (${action}). Bekleyen: ${this.offlineQueue.length}`);
  }

  // Çevrimdışı kuyruktaki tüm işlemleri sırayla MySQL'e aktarır
  public async drainOfflineQueue(): Promise<boolean> {
    if (this.isDrainingQueue || this.offlineQueue.length === 0) return true;
    this.isDrainingQueue = true;
    this.setConnectionState('syncing');

    console.log(`🔄 [SENKRONİZASYON] ${this.offlineQueue.length} bekleyen çevrimdışı işlem MySQL'e aktarılıyor...`);

    let allSuccess = true;
    while (this.offlineQueue.length > 0) {
      const mut = this.offlineQueue[0];
      try {
        const res = await fetch(`${getMySqlApiUrl()}?action=${mut.action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mut.data),
          signal: AbortSignal.timeout(6000)
        });

        if (res.ok) {
          // Başarıyla gönderildi, kuyruktan çıkar
          this.offlineQueue.shift();
          this.saveOfflineQueue();
          this.notifyConnectionChange();
        } else {
          allSuccess = false;
          break;
        }
      } catch (err) {
        allSuccess = false;
        break;
      }
    }

    this.isDrainingQueue = false;

    if (this.offlineQueue.length === 0) {
      this.setConnectionState('online');
      console.log('✅ [SENKRONİZASYON] Tüm bekleyen çevrimdışı işlemler MySQL ile eşitlendi!');
      const fresh = await this.pullData();
      if (fresh) {
        this.notifyListeners({
          type: 'FULL_SYNC',
          data: fresh
        });
      }
    } else {
      this.setConnectionState('offline');
      console.warn(`⚠️ [SENKRONİZASYON] Kalan ${this.offlineQueue.length} işlem internet bağlantısı sağlandığında tekrar denenecek.`);
    }

    return allSuccess;
  }

  // Tekil işlem yürütme (İnternet varsa doğrudan yollar, yoksa kuyruğa alır)
  private async executeMutation(action: OfflineMutation['action'], data: any, entityId?: string): Promise<boolean> {
    // 1. Tarayıcı veya sistem offline ise doğrudan yerel kuyruğa al
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueueMutation(action, data, entityId);
      return true;
    }

    // 2. Online ise doğrudan MySQL'e yolla
    try {
      const res = await fetch(`${getMySqlApiUrl()}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        this.setConnectionState('online');
        if (this.offlineQueue.length > 0) {
          this.drainOfflineQueue();
        }
        return true;
      } else {
        this.enqueueMutation(action, data, entityId);
        return true;
      }
    } catch (e) {
      this.enqueueMutation(action, data, entityId);
      return true;
    }
  }

  // Kullanıcının elle basabileceği senkronizasyon tetikleyicisi
  public async triggerManualSync(): Promise<{ success: boolean; message: string }> {
    try {
      this.setConnectionState('syncing');
      await this.drainOfflineQueue();
      const fresh = await this.pullData();
      if (fresh) {
        this.setConnectionState('online');
        if (fresh.tickets && Array.isArray(fresh.tickets)) {
          storage.saveTickets(fresh.tickets);
        }
        if (fresh.customers && Array.isArray(fresh.customers)) {
          storage.saveCustomers(fresh.customers);
        }
        if (fresh.parts && Array.isArray(fresh.parts)) {
          storage.saveParts(fresh.parts);
        }
        if (fresh.cash && Array.isArray(fresh.cash)) {
          storage.saveCashTransactions(fresh.cash);
        }
        if (fresh.currentAccounts && Array.isArray(fresh.currentAccounts)) {
          storage.saveCurrentAccounts(fresh.currentAccounts);
        }
        if (fresh.currentTransactions && Array.isArray(fresh.currentTransactions)) {
          storage.saveCurrentTransactions(fresh.currentTransactions);
        }
        if (fresh.settings && typeof fresh.settings === 'object') {
          storage.saveSettings(fresh.settings);
        }
        this.notifyListeners({
          type: 'FULL_SYNC',
          data: fresh
        });
        await this.checkMissedCloudMessages();
        return { success: true, message: `MySQL veritabanı ile eşitlendi (${fresh.tickets?.length || 0} fiş güncel)` };
      }
      await this.checkMissedCloudMessages();
      return { success: false, message: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol ediniz.' };
    } catch (e: any) {
      this.setConnectionState('offline');
      return { success: false, message: 'Senkronizasyon hatası: ' + (e?.message || 'Bağlantı yok') };
    }
  }

  // --- Granüler MySQL İşlemleri (Offline-First Destekli) ---

  async saveTicketToSql(ticket: ServiceTicket): Promise<boolean> {
    return this.executeMutation('ticket_save', ticket, ticket.id);
  }

  async deleteTicketFromSql(id: string): Promise<boolean> {
    return this.executeMutation('ticket_delete', { id }, id);
  }

  async saveCustomerToSql(customer: Customer): Promise<boolean> {
    return this.executeMutation('customer_save', customer, customer.id);
  }

  async deleteCustomerFromSql(id: string): Promise<boolean> {
    return this.executeMutation('customer_delete', { id }, id);
  }

  async savePartToSql(part: SparePart): Promise<boolean> {
    return this.executeMutation('part_save', part, part.id);
  }

  async deletePartFromSql(id: string): Promise<boolean> {
    return this.executeMutation('part_delete', { id }, id);
  }

  async saveCashToSql(cash: CashTransaction): Promise<boolean> {
    return this.executeMutation('cash_save', cash, cash.id);
  }

  async deleteCashFromSql(id: string): Promise<boolean> {
    return this.executeMutation('cash_delete', { id }, id);
  }

  async saveCurrentAccountToSql(ca: CurrentAccount): Promise<boolean> {
    return this.executeMutation('current_account_save', ca, ca.id);
  }

  async deleteCurrentAccountFromSql(id: string): Promise<boolean> {
    return this.executeMutation('current_account_delete', { id }, id);
  }

  async saveCurrentTxToSql(ctx: CurrentAccountTransaction): Promise<boolean> {
    return this.executeMutation('current_tx_save', ctx, ctx.id);
  }

  async deleteCurrentTxFromSql(id: string): Promise<boolean> {
    return this.executeMutation('current_tx_delete', { id }, id);
  }

  async saveSettingsToSql(settings: ShopSettings): Promise<boolean> {
    return this.executeMutation('settings_save', settings, 'settings_1');
  }



  // Saha ustasının iPhone'dan hızlı tekil güncellemesi (Vercel Üzerinden Anında Ofise Ulaşır)
  async updateTicketField(ticketId: string, updates: Partial<ServiceTicket>): Promise<boolean> {
    try {
      let statusDesc = 'İş Durumu Güncellendi';
      if (updates.status === 'delivered') statusDesc = 'Servis Ücreti Tahsil Edildi / Fiş Kapatıldı';
      else if (updates.status === 'in_repair') statusDesc = 'İş Alındı / Onarıma Başlandı';
      else if (updates.status === 'ready') statusDesc = 'Onarım Tamamlandı / Fiş Hazır';

      const updateData = { id: ticketId, ...updates };
      const encodedUpdate = encodeURIComponent(JSON.stringify(updateData));
      const targetUrl = `https://servis-pro-seven.vercel.app/?mode=technician&ticket=${ticketId}&sid=${this.clientId}&ujson=${encodedUpdate}`;

      const custName = updates.customerName || '';
      const tNum = updates.ticketNumber || ticketId;
      const cleanMsg = [
        custName ? `👤 Müşteri: ${custName}` : '',
        `📋 Fiş No: ${tNum}`,
        updates.totalAmount ? `💰 Tahsilat: ${updates.totalAmount} TL` : '',
        `⏰ Saat: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
      ].filter(Boolean).join('\n');

      // 1. Vercel Bulut Kanalına Anında Yayınla (Ofis PC'ye doğrudan düşer)
      fetch(VERCEL_SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: CLOUD_SYNC_TOPIC,
          title: `✅ ${statusDesc}`,
          message: cleanMsg,
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

      // 1. İnsan Gözünün Okuyacağı Pırıl Pırıl Türkçe Bildirim Metni
      const readableLines = [
        `👤 Müşteri: ${ticket.customerName}`,
        `🔧 Cihaz: ${devDetail}`,
        `⚠️ Arıza: ${ticket.reportedFault}`,
        `📍 Adres: ${ticket.customerAddress}`,
        ticket.customerPhone ? `📞 Tel: ${ticket.customerPhone}` : ''
      ];
      const humanReadableText = readableLines.filter(Boolean).join('\n');

      // Fiş verisini URL parametresine gömüyoruz
      const encodedTicket = encodeURIComponent(JSON.stringify(ticket));
      const targetUrl = `https://servis-pro-seven.vercel.app/?mode=technician&ticket=${ticket.id}&sid=${this.clientId}&tjson=${encodedTicket}`;

      // Yüksek Öncelikli Global Bulut Bildirimi (Vercel Proxy Üzerinden Kesintisiz)
      fetch(VERCEL_SYNC_ENDPOINT, {
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
