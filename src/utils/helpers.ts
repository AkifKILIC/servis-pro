import { DeviceType, TicketStatus, Priority, PaymentStatus, ServiceTicket } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const formatDateOnly = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

// Yerel saat dilimine göre (Türkiye / istemci saati) YYYY-MM-DD formatında tarih döndürür
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 1 YILLIK SERVİS & PARÇA GARANTİSİ HESAPLAMA
// Her cihaza teslim tarihinden itibaren 1 yıl (365 gün) garanti verilir.
export interface ServiceWarrantyInfo {
  hasStarted: boolean;
  startDate?: string;
  endDate?: string;
  startDateFormatted: string;
  endDateFormatted: string;
  remainingDays: number;
  totalDays: number;
  percentRemaining: number;
  isExpired: boolean;
  statusBadge: {
    text: string;
    color: string;
    bg: string;
    border: string;
  };
}

export const calculateServiceWarranty = (ticket: ServiceTicket): ServiceWarrantyInfo => {
  const isDelivered = ticket.status === 'delivered' || ticket.status === 'ready' || ticket.paymentStatus === 'paid' || ticket.paymentStatus === 'pending_approval';
  const deliveryDateStr = ticket.completedAt || (isDelivered ? ticket.updatedAt : undefined);

  if (!deliveryDateStr || !isDelivered) {
    return {
      hasStarted: false,
      startDateFormatted: 'Teslim Edilmedi',
      endDateFormatted: 'Teslim Edilince Başlar',
      remainingDays: 365,
      totalDays: 365,
      percentRemaining: 100,
      isExpired: false,
      statusBadge: {
        text: '⏳ Teslimat Bekleniyor (Teslim edilince 1 Yıl Garanti Başlar)',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
      },
    };
  }

  const startDate = new Date(deliveryDateStr);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = remainingDays <= 0;
  const percentRemaining = isExpired ? 0 : Math.max(0, Math.min(100, Math.round((remainingDays / 365) * 100)));

  return {
    hasStarted: true,
    startDate: deliveryDateStr,
    endDate: endDate.toISOString(),
    startDateFormatted: formatDateOnly(deliveryDateStr),
    endDateFormatted: formatDateOnly(endDate.toISOString()),
    remainingDays: Math.max(0, remainingDays),
    totalDays: 365,
    percentRemaining,
    isExpired,
    statusBadge: {
      text: isExpired 
        ? '⚠️ 1 Yıllık Garanti Süresi Doldu' 
        : `🛡️ 1 Yıl Garanti Kapsamında (${remainingDays} Gün Kaldı)`,
      color: isExpired ? '#ef4444' : '#10b981',
      bg: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
      border: isExpired ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)',
    },
  };
};

// Müşteriye WhatsApp 1 Yıl Garanti Belgesi Bildirim Linki
export const generateWarrantyWhatsAppLink = (
  phone: string,
  ticket: ServiceTicket,
  shopName: string,
  shopPhone: string
): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.startsWith('90') ? cleanPhone : cleanPhone.startsWith('0') ? '9' + cleanPhone : '90' + cleanPhone;
  const warranty = calculateServiceWarranty(ticket);
  const partsList = (ticket.partsUsed || []).map(p => `• ${p.partName} (${p.quantity} ad.)`).join('\n');

  const text = `Sayın *${ticket.customerName}*,\n\n*${shopName}* teknik servisimiz tarafından cihazınızın onarımı tamamlanmış ve teslim edilmiştir.\n\n` +
    `📋 *Fiş No:* ${ticket.ticketNumber}\n` +
    `🔧 *Cihaz:* ${ticket.brand} ${ticket.model}\n` +
    `🛠️ *Yapılan İşlem:* ${ticket.technicianDiagnosis || 'Arıza onarımı ve testleri yapıldı.'}\n` +
    (partsList ? `📦 *Değişen Orijinal Parçalar:*\n${partsList}\n` : '') +
    `💰 *Toplam Tutar:* ${formatCurrency(ticket.totalAmount)}\n\n` +
    `🛡️ *1 YIL RESMİ SERVİS GARANTİSİ:*\n` +
    `• *Garanti Başlangıç (Teslim):* ${warranty.startDateFormatted}\n` +
    `• *Garanti Bitiş:* ${warranty.endDateFormatted}\n` +
    `• *Durum:* ${warranty.statusBadge.text}\n\n` +
    `Cihazınızda yapılan tüm işçilik ve değişen yedek parçalar teslim tarihinden itibaren 1 yıl boyunca firmamızın garantisi altındadır.\n\n` +
    `📞 *Destek & İletişim:* ${shopPhone}\n` +
    `Bizi tercih ettiğiniz için teşekkür ederiz.`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
};

export const isTicketCompleted = (t: ServiceTicket): boolean => {
  if (t.status === 'cancelled') return false;
  // Teslim edilmiş veya hazır olup, ödemesi ofis tarafından onaylanmış (paid) olanlar tamamen tamamlanmış sayılır
  const isFinished = t.status === 'delivered' || t.status === 'ready';
  const isPaid = t.paymentStatus === 'paid' || (t.totalAmount === 0 && t.paidAmount === 0);
  return isFinished && isPaid;
};

// İleri tarihli randevular (Henüz günü gelmemiş gelecek açık randevular)
export const isUpcomingTicket = (t: ServiceTicket, todayStr: string = getLocalDateString()): boolean => {
  if (t.status === 'cancelled' || isTicketCompleted(t)) return false;
  return Boolean(t.scheduledDate && t.scheduledDate > todayStr);
};

// Bugünün ve dünden devreden aktif servisleri
// 1. Randevusu bugün olanlar
// 2. Randevusu geçmişte kalan ama bitmeyen, parça bekleyen veya ödemesi bekleyen tüm devreden işler
// 3. Randevu tarihi belirtilmemiş tüm açık işler
export const isTodayTicket = (t: ServiceTicket, todayStr: string = getLocalDateString()): boolean => {
  if (t.status === 'cancelled' || isTicketCompleted(t)) return false;
  // İleri tarihli bir güne ait değilse, tamamlanana kadar bugünün aktif ekranında kalır
  return !t.scheduledDate || t.scheduledDate <= todayStr;
};

export const deviceTypeConfig: Record<DeviceType, { label: string; icon: string; bg: string; color: string }> = {
  washing_machine: {
    label: 'Çamaşır Makinesi',
    icon: 'washing-machine',
    bg: 'rgba(59, 130, 246, 0.12)',
    color: '#3b82f6',
  },
  dishwasher: {
    label: 'Bulaşık Makinesi',
    icon: 'utensils',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#10b981',
  },
  refrigerator: {
    label: 'Buzdolabı',
    icon: 'refrigerator',
    bg: 'rgba(6, 182, 212, 0.12)',
    color: '#06b6d4',
  },
  oven: {
    label: 'Fırın & Ocak',
    icon: 'flame',
    bg: 'rgba(249, 115, 22, 0.12)',
    color: '#f97316',
  },
  dryer: {
    label: 'Kurutma Makinesi',
    icon: 'wind',
    bg: 'rgba(168, 85, 247, 0.12)',
    color: '#a855f7',
  },
  boiler: {
    label: 'Kombi & Şofben',
    icon: 'zap',
    bg: 'rgba(234, 179, 8, 0.12)',
    color: '#eab308',
  },
  air_conditioner: {
    label: 'Klima',
    icon: 'snowflake',
    bg: 'rgba(14, 165, 233, 0.12)',
    color: '#0ea5e9',
  },
  other: {
    label: 'Diğer Cihaz',
    icon: 'wrench',
    bg: 'rgba(107, 114, 128, 0.12)',
    color: '#6b7280',
  },
};

export const ticketStatusConfig: Record<TicketStatus, { label: string; bg: string; color: string; step: number }> = {
  pending: {
    label: 'Yeni Kayıt / Beklemede',
    bg: 'rgba(107, 114, 128, 0.15)',
    color: '#9ca3af',
    step: 1,
  },
  scheduled: {
    label: 'Ziyaret Planlandı',
    bg: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    step: 2,
  },
  in_repair: {
    label: 'Onarımda / İnceleniyor',
    bg: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    step: 3,
  },
  waiting_parts: {
    label: 'Parça Bekleniyor',
    bg: 'rgba(236, 72, 153, 0.15)',
    color: '#f472b6',
    step: 3,
  },
  testing: {
    label: 'Test Aşamasında',
    bg: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
    step: 4,
  },
  ready: {
    label: 'Tamamlandı / Hazır',
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    step: 5,
  },
  delivered: {
    label: 'Teslim Edildi & Kapandı',
    bg: 'rgba(5, 150, 105, 0.2)',
    color: '#10b981',
    step: 6,
  },
  cancelled: {
    label: 'İptal / İade',
    bg: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    step: 0,
  },
};

export const priorityConfig: Record<Priority, { label: string; bg: string; color: string }> = {
  low: {
    label: 'Düşük',
    bg: 'rgba(107, 114, 128, 0.15)',
    color: '#9ca3af',
  },
  normal: {
    label: 'Normal',
    bg: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
  },
  urgent: {
    label: 'Acil',
    bg: 'rgba(239, 68, 68, 0.18)',
    color: '#ef4444',
  },
};

export const paymentStatusConfig: Record<PaymentStatus, { label: string; bg: string; color: string }> = {
  paid: {
    label: 'Tahsil Edildi (Onaylandı)',
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
  },
  pending_approval: {
    label: 'Tahsilat Onayı Bekliyor',
    bg: 'rgba(245, 158, 11, 0.18)',
    color: '#f59e0b',
  },
  partial: {
    label: 'Kısmi Ödendi',
    bg: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
  },
  unpaid: {
    label: 'Ödeme Bekliyor',
    bg: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
  },
};

// Popüler Türk beyaz eşya markaları
export const COMMON_BRANDS = [
  'Arçelik',
  'Beko',
  'Bosch',
  'Siemens',
  'Profilo',
  'Vestel',
  'Samsung',
  'LG',
  'Altus',
  'Regal',
  'Ariston / Hotpoint',
  'Whirlpool',
  'Electrolux',
  'Daikin',
  'DemirDöküm',
  'Baymak',
  'Vaillant',
  'E.C.A.',
  'Diğer',
];

// Telefon numarasını temizleyip standartlaştırma (05XX... -> 905XX...)
export const cleanPhoneForWhatsApp = (phone: string): string => {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '9' + cleaned;
  } else if (!cleaned.startsWith('90') && cleaned.length === 10) {
    cleaned = '90' + cleaned;
  }
  return cleaned;
};

// WhatsApp mesaj linkleri oluşturma
export const generateWhatsAppLink = (
  phone: string, 
  type: 'received' | 'estimate' | 'ready' | 'custom', 
  data: {
    customerName: string;
    ticketNumber: string;
    deviceInfo: string;
    totalAmount?: number;
    faultInfo?: string;
    shopName: string;
    shopPhone: string;
  }
): string => {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  let message = '';

  switch (type) {
    case 'received':
      message = `Sayın *${data.customerName}*,\n\n*${data.ticketNumber}* numaralı servis kaydınız açılmıştır.\nCihazınız: *${data.deviceInfo}*\nŞikayet: *${data.faultInfo || 'Genel bakım / onarım'}*\n\nTeknik ekibimiz en kısa sürede inceleme yapıp size bilgi verecektir.\n\nSağlıklı günler dileriz.\n*${data.shopName}*\nİletişim: ${data.shopPhone}`;
      break;

    case 'estimate':
      message = `Sayın *${data.customerName}*,\n\n*${data.ticketNumber}* numaralı *${data.deviceInfo}* cihazınızın arıza tespiti tamamlanmıştır.\nTespit edilen arıza: ${data.faultInfo || 'Parça arızası'}\nTahmini Onarım & Parça Tutarı: *${formatCurrency(data.totalAmount || 0)}*\n\nOnayınız doğrultusunda orijinal parçalarla onarım işlemine başlanacaktır. Onaylıyor musunuz?\n\n*${data.shopName}*`;
      break;

    case 'ready':
      message = `Sayın *${data.customerName}*,\n\n*${data.ticketNumber}* numaralı *${data.deviceInfo}* cihazınızın bakım ve onarım işlemleri başarıyla tamamlanmış ve tüm testlerden geçmiştir.\nToplam Tutar: *${formatCurrency(data.totalAmount || 0)}*\n\nCihazınızı teslim alabilir veya adresinize teslimat saatini kararlaştırabiliriz.\n\n*${data.shopName}*\nİletişim: ${data.shopPhone}`;
      break;

    default:
      message = `Sayın *${data.customerName}*, *${data.ticketNumber}* no'lu servis kaydınız hakkında bilgi vermek için ulaşıyoruz. *${data.shopName}*`;
      break;
  }

  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
};

export const generateMapsLink = (address: string, city: string, district: string): string => {
  const query = encodeURIComponent(`${address}, ${district || ''}, ${city || ''}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export const generateTechnicianDispatchWhatsAppLink = (
  techPhone: string,
  ticket: ServiceTicket,
  shopName: string
): string => {
  const cleanPhone = cleanPhoneForWhatsApp(techPhone);
  const device = deviceTypeConfig[ticket.deviceType as DeviceType]?.label || ticket.deviceType;
  const mapsLink = generateMapsLink(ticket.customerAddress, '', '');
  
  const msg = `🚨 *YENİ SERVİS İŞ EMRİ* 🚨\n\n*Fiş No:* ${ticket.ticketNumber}\n*Cihaz:* ${ticket.brand} ${ticket.model} (${device})\n*Müşteri:* ${ticket.customerName}\n*Telefon:* ${ticket.customerPhone}\n*Adres:* ${ticket.customerAddress}\n*Şikayet:* ${ticket.reportedFault}\n*Randevu:* ${ticket.scheduledDate || 'Bugün'} ${ticket.scheduledTimeSlot || ''}\n\n📍 *Harita Yol Tarifi:* ${mapsLink}\n\n*${shopName}*`;
  
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
};

export const generateJobCardText = (
  ticket: ServiceTicket,
  shopName: string,
  groupName?: string
): string => {
  const device = deviceTypeConfig[ticket.deviceType as DeviceType]?.label || ticket.deviceType;
  const mapsLink = generateMapsLink(ticket.customerAddress, '', '');
  
  return `📢 *YENİ SERVİS İŞİ (${groupName || 'SAHA GRUBU'})* 📢\n\n` +
    `📋 *Fiş No:* ${ticket.ticketNumber}\n` +
    `🔧 *Cihaz:* ${ticket.brand} ${ticket.model} (${device})\n` +
    `👤 *Müşteri:* ${ticket.customerName}\n` +
    `📞 *Telefon:* ${ticket.customerPhone}\n` +
    `📍 *Adres:* ${ticket.customerAddress}\n` +
    `⚠️ *Şikayet:* ${ticket.reportedFault}\n` +
    `⏰ *Randevu:* ${ticket.scheduledDate || 'Bugün'} ${ticket.scheduledTimeSlot || ''}\n\n` +
    `🗺️ *Harita Konumu:* ${mapsLink}`;
};

// WhatsApp Grup Paylaşımı (Telefon numarası olmadan çağrıldığında doğrudan grup seçme diyaloğu açılır)
export const generateGroupWhatsAppLink = (
  ticket: ServiceTicket,
  shopName: string,
  groupName?: string
): string => {
  const msg = generateJobCardText(ticket, shopName, groupName);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
};


