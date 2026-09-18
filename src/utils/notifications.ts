import { ServiceTicket } from '../types';

let cachedAudioElement: HTMLAudioElement | null = null;
let globalAudioCtx: AudioContext | null = null;

// Audio element ve context'i kullanıcı ilk dokunduğunda uyandır (iOS Safari kuralı)
export const initAudioContext = () => {
  try {
    // 1. HTML5 Audio ön yükleme (iPhone ve Masaüstünde kusursuz çalışan yöntem)
    if (typeof Audio !== 'undefined') {
      if (!cachedAudioElement) {
        cachedAudioElement = new Audio('./bell.wav');
        cachedAudioElement.preload = 'auto';
        cachedAudioElement.volume = 1.0;
      }
      // Sessiz kısa oynatma ile iOS ses motorunu uyandır
      cachedAudioElement.play().then(() => {
        if (cachedAudioElement) {
          cachedAudioElement.pause();
          cachedAudioElement.currentTime = 0;
        }
      }).catch(() => {});
    }

    // 2. Web Audio Context (Yedek)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !globalAudioCtx) {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
  } catch (e) {
    console.warn('Ses motoru başlatılamadı:', e);
  }
};

// Hem HTML5 Audio hem Web Audio API ile zili çal (iPhone, Android ve PC'de garantili çalar)
export const playNotificationSound = () => {
  // 1. Yöntem: HTML5 Audio ile gerçek melodik zil dosyasını çal (./bell.wav)
  try {
    const audio = cachedAudioElement || new Audio('./bell.wav');
    audio.currentTime = 0;
    audio.volume = 1.0;
    const p = audio.play();
    if (p !== undefined) {
      p.catch((err) => {
        console.warn('HTML5 ses çalma engeli (sessiz mod olabilir):', err);
      });
    }
  } catch (e) {
    console.warn('HTML5 Audio oynatılamadı:', e);
  }

  // 2. Yöntem: Web Audio Sentezleyici ile çift tonlu Ding-Dong çal
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = globalAudioCtx || new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (ctx.state === 'running' || ctx.state === 'suspended') {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        gain1.gain.setValueAtTime(0.4, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.4);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1174, ctx.currentTime + 0.2);
        osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.4);
        gain2.gain.setValueAtTime(0.45, ctx.currentTime + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.2);
        osc2.stop(ctx.currentTime + 0.9);
      }
    }
  } catch (e) {
    // Web audio fail safe
  }

  // 3. Titreşim fırlat
  triggerVibration();
};

// Cihaz Titreşimi (Destekleyen telefonlarda)
export const triggerVibration = () => {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {}
  }
};

export interface NotificationStatus {
  hasNotificationApi: boolean;
  isSecure: boolean;
  isStandalonePWA: boolean;
  permission: NotificationPermission | 'unsupported';
}

// Cihaz ve Tarayıcı Bildirim Durumunu Kontrol Et
export const checkNotificationSupport = (): NotificationStatus => {
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;
  const isStandalone = typeof window !== 'undefined' && (
    (window.navigator as any).standalone === true || 
    window.matchMedia('(display-mode: standalone)').matches
  );
  const hasApi = typeof window !== 'undefined' && 'Notification' in window;

  return {
    hasNotificationApi: hasApi,
    isSecure: Boolean(isSecure),
    isStandalonePWA: isStandalone,
    permission: hasApi ? Notification.permission : 'unsupported',
  };
};

// Bildirim İzni İsteme (iPhone iOS 16.4+ ve Masaüstü için)
export const requestNotificationPermission = async (): Promise<{ success: boolean; message: string }> => {
  initAudioContext();
  playNotificationSound(); // Sesi test etmek ve iOS AudioContext kilidini açmak için çal

  const status = checkNotificationSupport();

  // Apple iOS Safari Kuralı Kontrolü
  if (!status.isSecure) {
    return {
      success: false,
      message: 'Apple kuralı gereği iPhone kilit ekranı bildirimleri için HTTPS (güvenli bağlantı) şarttır. Lütfen adresin başına https:// yazarak girin ve Ana Ekrana Ekle yapın. (Sesli zil başarıyla aktif edildi!)',
    };
  }

  if (!status.hasNotificationApi) {
    if (!status.isStandalonePWA) {
      return {
        success: false,
        message: 'Apple iOS Safari tarayıcı sekmesi içindeyken bildirim izni vermez. Safari alttaki Paylaş butonuna basıp "Ana Ekrana Ekle" diyerek tam ekran uygulama olarak açmalısınız.',
      };
    }
    return {
      success: false,
      message: 'Bu cihazda Notification API tespit edilemedi. Lütfen iOS sürümünüzün 16.4 veya üzeri olduğundan emin olun.',
    };
  }

  if (Notification.permission === 'granted') {
    return { success: true, message: 'Bildirimler zaten aktif!' };
  }

  try {
    let permissionResult: NotificationPermission;
    // Safari hem Promise hem callback destekler
    const promise = Notification.requestPermission((p) => {
      permissionResult = p;
    });

    if (promise && typeof (promise as any).then === 'function') {
      permissionResult = await promise;
    }

    const currentPerm = Notification.permission as string;
    if (permissionResult! === 'granted' || currentPerm === 'granted') {
      return { success: true, message: 'Bildirimler ve zil sesi başarıyla açıldı!' };
    } else {
      return { 
        success: false, 
        message: 'Bildirim izni verilmedi. iPhone Ayarları > Safari / ServisPro > Bildirimler kısmından izin verebilirsiniz.' 
      };
    }
  } catch (e: any) {
    console.error('Bildirim izin hatası:', e);
    return { success: false, message: 'Bildirim izni alınırken hata oluştu: ' + (e?.message || 'Bilinmeyen hata') };
  }
};

// Service Worker Kaydı
export const registerServiceWorker = async () => {
  if (typeof window !== 'undefined' && window.location.protocol !== 'file:' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      return reg;
    } catch (e) {
      console.warn('Service Worker kaydedilemedi:', e);
    }
  }
  return null;
};

// Ustanın Telefonunda Bildirim Göster ve Uygulamayı Açtır
export const showTechnicianJobNotification = async (ticket: ServiceTicket) => {
  // 1. Zili çal (Her durumda hem HTML5 Audio hem Web Audio çalar)
  playNotificationSound();

  // 2. Telefonu titret
  triggerVibration();

  // 3. Sistem bildirimi göster
  const title = `🚨 YENİ SERVİS İŞİ: ${ticket.ticketNumber}`;
  const body = `${ticket.customerName} - ${ticket.brand} ${ticket.model}\nArıza: ${ticket.reportedFault}\nAdres: ${ticket.customerAddress}`;
  const targetUrl = `/?mode=technician&ticket=${ticket.id}`;

  const options = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 400],
    data: { url: targetUrl, ticketId: ticket.id },
    actions: [
      { action: 'open', title: 'İşi Aç' }
    ]
  };

  // iOS Safari ve Android PWA: Sadece registration.showNotification desteklenir!
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options as any);
        return;
      }
    } catch (e) {
      console.warn('SW showNotification hatası:', e);
    }
  }

  // Masaüstü PC Chrome/Edge Fallback (iOS Safari'de new Notification yasaktır)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        window.location.href = targetUrl;
      };
    }
  } catch (e) {
    console.warn('Notification constructor hatası:', e);
  }
};
