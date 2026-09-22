import React, { useState } from 'react';
import { 
  Phone, 
  MessageSquare, 
  MapPin, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Camera, 
  Send, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  X, 
  Check, 
  Plus, 
  BellRing, 
  RefreshCw,
  Trash2,
  ExternalLink,
  FileText,
  Navigation,
  CreditCard,
  Receipt,
  Share2,
  ShieldCheck,
  Package,
  Monitor,
  LogOut
} from 'lucide-react';
import { syncService } from '../services/syncService';
import { ServiceTicket, SparePart, TicketPartItem, TicketStatus, PaymentStatus, PaymentMethod, Priority } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  deviceTypeConfig, 
  ticketStatusConfig,
  generateMapsLink,
  cleanPhoneForWhatsApp,
  generateWhatsAppLink,
  getLocalDateString,
  isTicketCompleted,
  isUpcomingTicket,
  isTodayTicket
} from '../utils/helpers';
import { 
  requestNotificationPermission, 
  playNotificationSound, 
  checkNotificationSupport,
  initAudioContext 
} from '../utils/notifications';

import { AuthUser } from '../utils/auth';

interface TechnicianMobileViewProps {
  tickets: ServiceTicket[];
  parts: SparePart[];
  onUpdateTicket: (id: string, updates: Partial<ServiceTicket>) => void;
  shopName: string;
  shopPhone: string;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  connectionState?: 'online' | 'offline' | 'syncing';
  pendingQueueCount?: number;
  onTriggerSync?: () => void;
  onSwitchToOffice?: () => void;
}

export const TechnicianMobileView: React.FC<TechnicianMobileViewProps> = ({
  tickets,
  parts,
  onUpdateTicket,
  shopName,
  shopPhone,
  currentUser,
  onLogout,
  connectionState = 'online',
  pendingQueueCount = 0,
  onTriggerSync,
  onSwitchToOffice,
}) => {
  // Filtreler: 'today' (varsayılan: Günün Servisleri), 'upcoming' (İleri tarihliler), 'completed' (Tamamlananlar), 'urgent' (Acil)
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'completed' | 'urgent'>('today');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [deviceStatus, setDeviceStatus] = useState(() => checkNotificationSupport());
  const [soundTested, setSoundTested] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Saha Elemanı Detaylı İnceleme & İşlem Modalı State'leri
  const [inspectingTicket, setInspectingTicket] = useState<ServiceTicket | null>(null);
  const [inspectDiagnosis, setInspectDiagnosis] = useState('');
  const [inspectStatus, setInspectStatus] = useState<TicketStatus>('in_repair');
  const [inspectLaborCost, setInspectLaborCost] = useState(0);
  const [inspectTransportCost, setInspectTransportCost] = useState(0);
  const [inspectDiscount, setInspectDiscount] = useState(0);
  const [inspectPaymentStatus, setInspectPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [inspectPaymentMethod, setInspectPaymentMethod] = useState<PaymentMethod>('cash');
  const [inspectParts, setInspectParts] = useState<TicketPartItem[]>([]);
  
  // Parça Ekleme
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [stockPartId, setStockPartId] = useState('');
  const [customPartName, setCustomPartName] = useState('');
  const [partPrice, setPartPrice] = useState(0);
  const [partQty, setPartQty] = useState(1);

  // Pull-to-Refresh State'leri (iPhone / Mobil Aşağı Kaydırarak Yenileme)
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = React.useRef<number | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncService.triggerManualSync();
      if (typeof window !== 'undefined' && (window as any).__REFRESH_DATA__) {
        (window as any).__REFRESH_DATA__();
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([30, 40]); } catch {}
      }
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 700);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 2) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    } else {
      touchStartY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || isRefreshing) return;
    if (window.scrollY > 2) {
      touchStartY.current = null;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    if (deltaY > 0) {
      // Çekme hissi için yumuşak direnç formülü
      const distance = Math.min(Math.pow(deltaY, 0.85) * 1.5, 95);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    touchStartY.current = null;
    setIsPulling(false);

    if (pullDistance >= 50 && !isRefreshing) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Hızlı Aksiyon Modalları (Tek Tık Servis Ücreti / İş Alındı)
  const [isServiceFeeModalOpen, setIsServiceFeeModalOpen] = useState(false);
  const [serviceFeeAmount, setServiceFeeAmount] = useState('400');
  const [serviceFeeMethod, setServiceFeeMethod] = useState<'cash' | 'credit_card' | 'bank_transfer'>('cash');
  const [serviceFeeNote, setServiceFeeNote] = useState('Müşteri onarımı kabul etmedi / Arıza tespit bedeli tahsil edildi.');

  const [isJobAcceptedModalOpen, setIsJobAcceptedModalOpen] = useState(false);
  const [repairDiagnosis, setRepairDiagnosis] = useState('');
  const [repairPartName, setRepairPartName] = useState('');
  const [repairPartPrice, setRepairPartPrice] = useState('0');
  const [repairLaborPrice, setRepairLaborPrice] = useState('600');
  const [repairStatus, setRepairStatus] = useState<'in_repair' | 'waiting_parts' | 'ready'>('in_repair');

  // Yerel Saat Dilimine Göre Bugünün Tarihi (YYYY-MM-DD)
  const todayStr = getLocalDateString();

  // Saha Ustası Özel Sıralama Fonksiyonu:
  // "onarımda" (in_repair) veya "parça bekleyen" (waiting_parts) kayıtlar HER ZAMAN yeni açılan kayıtların ALTINDA yer alır
  const sortTicketsForTechnician = (list: ServiceTicket[]): ServiceTicket[] => {
    return [...list].sort((a, b) => {
      const getStatusRank = (status: TicketStatus) => {
        if (status === 'waiting_parts') return 2; // En altta
        if (status === 'in_repair') return 1;     // Onarımda olan parça bekleyenin hemen üstünde, yeni işlerin altında
        return 0;                                 // Yeni açılan işler her zaman en üstte
      };

      const rankA = getStatusRank(a.status);
      const rankB = getStatusRank(b.status);
      if (rankA !== rankB) {
        return rankA - rankB; // Küçük rank (yeni işler) önce gelir
      }

      // Aynı grup içindeyse: Acil olanlar öncelikli
      const priorityScore = (p: Priority) => (p === 'urgent' ? 2 : p === 'normal' ? 1 : 0);
      const prioDiff = priorityScore(b.priority) - priorityScore(a.priority);
      if (prioDiff !== 0) return prioDiff;

      // Son olarak en yeni açılan kayıt en üstte
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  };

  // 1. Bugünün ve Dünden Devreden Açık Servisleri (Yeni açılanlar üstte, onarımda/parça bekleyenler altta)
  const todayTickets = sortTicketsForTechnician(tickets.filter(t => isTodayTicket(t, todayStr)));

  // 2. İleri Tarihli Randevular
  const upcomingTickets = sortTicketsForTechnician(tickets.filter(t => isUpcomingTicket(t, todayStr)));

  // 3. Tamamlanan & Tahsil Edilenler: Hem teslim edilmiş hem de tahsilatı tamamlanmış arşiv kayıtları
  const completedTickets = tickets.filter(t => isTicketCompleted(t));


  // 4. Acil Servisler (Bugünün acilleri)
  const urgentTickets = todayTickets.filter(t => t.priority === 'urgent');

  // Aktif Sekmeye Göre Gösterilecek Liste
  const displayedTickets = 
    filter === 'today' ? todayTickets :
    filter === 'upcoming' ? upcomingTickets :
    filter === 'completed' ? completedTickets :
    urgentTickets;

  // Detaylı İnceleme Modalını Aç
  const openInspectionModal = (ticket: ServiceTicket) => {
    setInspectingTicket(ticket);
    setInspectDiagnosis(ticket.technicianDiagnosis || '');
    setInspectStatus(ticket.status);
    setInspectLaborCost(ticket.laborCost || 0);
    setInspectTransportCost(ticket.transportCost || 0);
    setInspectDiscount(ticket.discount || 0);
    setInspectPaymentStatus(ticket.paymentStatus || 'unpaid');
    setInspectPaymentMethod(ticket.paymentMethod || 'cash');
    setInspectParts(ticket.partsUsed ? [...ticket.partsUsed] : []);
    setIsAddingPart(false);
    setStockPartId('');
    setCustomPartName('');
    setPartPrice(0);
    setPartQty(1);
  };

  // İnceleme Modalından Parça Ekle
  const handleAddPartToInspect = () => {
    let newItem: TicketPartItem;
    if (stockPartId) {
      const sp = parts.find(p => p.id === stockPartId);
      if (!sp) return;
      newItem = {
        id: 'p-item-' + Date.now(),
        partId: sp.id,
        partName: sp.name,
        partCode: sp.code,
        quantity: partQty,
        unitPrice: sp.salePrice,
        totalPrice: sp.salePrice * partQty,
      };
    } else {
      if (!customPartName.trim()) return;
      newItem = {
        id: 'p-item-' + Date.now(),
        partName: customPartName.trim(),
        quantity: partQty,
        unitPrice: partPrice,
        totalPrice: partPrice * partQty,
      };
    }

    setInspectParts(prev => [...prev, newItem]);
    setIsAddingPart(false);
    setStockPartId('');
    setCustomPartName('');
    setPartPrice(0);
    setPartQty(1);
  };

  // İnceleme Modalından Parça Sil
  const handleRemovePartFromInspect = (partItemId: string) => {
    setInspectParts(prev => prev.filter(p => p.id !== partItemId));
  };

  // İnceleme Modalını Kaydet (Teknisyenin Tüm Değişikliklerini Veritabanına Yazar)
  const handleSaveInspection = (markDeliveredAndPaid: boolean = false) => {
    if (!inspectingTicket) return;

    const partsTotal = inspectParts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const finalTotal = Math.max(0, partsTotal + inspectLaborCost + inspectTransportCost - inspectDiscount);
    const finalStatus: TicketStatus = markDeliveredAndPaid ? 'delivered' : inspectStatus;
    // Saha ustası tahsilat aldığında ofis onayına gönderilir
    const finalPayStatus: PaymentStatus = markDeliveredAndPaid 
      ? 'pending_approval' 
      : (inspectPaymentStatus === 'paid' ? 'pending_approval' : inspectPaymentStatus);
    const paidAmount = (finalPayStatus === 'pending_approval' || finalPayStatus === 'partial') ? finalTotal : inspectingTicket.paidAmount;

    onUpdateTicket(inspectingTicket.id, {
      ticketNumber: inspectingTicket.ticketNumber,
      customerName: inspectingTicket.customerName,
      technicianDiagnosis: inspectDiagnosis.trim(),
      status: finalStatus,
      partsUsed: inspectParts,
      laborCost: inspectLaborCost,
      transportCost: inspectTransportCost,
      discount: inspectDiscount,
      totalAmount: finalTotal,
      paymentStatus: finalPayStatus,
      paymentMethod: inspectPaymentMethod,
      paidAmount: paidAmount,
      completedAt: (finalStatus === 'delivered' || finalStatus === 'ready') 
        ? (inspectingTicket.completedAt || new Date().toISOString()) 
        : undefined,
      updatedAt: new Date().toISOString()
    });

    setInspectingTicket(null);
  };

  // Müşteriye "Yola Çıktım" WhatsApp Mesajı
  const generateEnRouteWhatsApp = (ticket: ServiceTicket) => {
    const cleanPhone = cleanPhoneForWhatsApp(ticket.customerPhone);
    const dev = `${ticket.brand} ${ticket.model}`;
    const msg = `Merhaba Sayın *${ticket.customerName}*,\n\n*${shopName}* teknik servis ekibimiz *${dev}* cihazınızın arıza onarımı için adresinize doğru yola çıkmıştır.\n\nTahmini 15-20 dakika içerisinde adresinizde olacağız. Lütfen adreste hazır bulununuz.\n\n📞 İletişim: ${shopPhone}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Müşteriye Dijital Garanti Belgesi & Servis Fişi Gönderme
  const generateReceiptWhatsApp = (ticket: ServiceTicket) => {
    const cleanPhone = cleanPhoneForWhatsApp(ticket.customerPhone);
    const partsList = (ticket.partsUsed || []).map(p => `• ${p.partName} (${p.quantity} adet)`).join('\n');
    const msg = `Sayın *${ticket.customerName}*,\n\n*${shopName}* teknik servis hizmetiniz tamamlanmıştır.\n\n📋 *Fiş No:* ${ticket.ticketNumber}\n🔧 *Cihaz:* ${ticket.brand} ${ticket.model}\n🛠️ *Yapılan İşlem:* ${ticket.technicianDiagnosis || 'Arıza onarımı tamamlandı.'}\n${partsList ? `📦 *Değişen Parçalar:*\n${partsList}\n` : ''}💰 *Toplam Tutar:* ${formatCurrency(ticket.totalAmount)}\n✅ *Ödeme:* ${ticket.paymentStatus === 'paid' ? 'Tahsil Edildi (Ödendi)' : 'Bekliyor'}\n\n🛡️ *Garanti:* Değişen orijinal parçalarımız ve işçiliğimiz firmamız garantisi altındadır.\n\nBizi tercih ettiğiniz için teşekkür ederiz.\n📞 ${shopPhone}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Ses ve bildirim testi
  const handleTestSound = async () => {
    initAudioContext();
    playNotificationSound();
    setSoundTested(true);

    if ('serviceWorker' in navigator && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification('🚨 SERVİS İŞİ TESTİ: Ses & Bildirim Aktif!', {
            body: 'Yeni arıza kaydı açıldığında telefonunuz bu şekilde çalacak ve kilit ekranında belirecektir.',
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200, 100, 400],
          } as any);
        }
      } catch (err) {
        console.warn('Test bildirimi hatası:', err);
      }
    }

    setTimeout(() => setSoundTested(false), 3000);
  };

  // Bildirim izni isteme
  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    const updated = checkNotificationSupport();
    setDeviceStatus(updated);
    alert(res.message);
  };

  // 1. Sadece Servis Ücretine Döndü İşlemi
  const handleConfirmServiceFee = () => {
    if (!selectedTicket) return;
    const fee = parseFloat(serviceFeeAmount) || 0;

    onUpdateTicket(selectedTicket.id, {
      ticketNumber: selectedTicket.ticketNumber,
      customerName: selectedTicket.customerName,
      status: 'delivered',
      technicianDiagnosis: serviceFeeNote.trim(),
      transportCost: fee,
      laborCost: 0,
      partsUsed: [],
      discount: 0,
      totalAmount: fee,
      paymentStatus: 'pending_approval',
      paymentMethod: serviceFeeMethod,
      paidAmount: fee,
      completedAt: new Date().toISOString(),
    });

    setIsServiceFeeModalOpen(false);
    setSelectedTicket(null);
  };

  // 2. İş Alındı / Onarım Başladı İşlemi
  const handleConfirmJobAccepted = () => {
    if (!selectedTicket) return;
    const partCost = parseFloat(repairPartPrice) || 0;
    const laborCost = parseFloat(repairLaborPrice) || 0;
    const total = partCost + laborCost;

    let updatedParts = selectedTicket.partsUsed || [];
    if (repairPartName.trim()) {
      updatedParts = [
        ...updatedParts,
        {
          id: 'p-item-' + Date.now(),
          partName: repairPartName.trim(),
          quantity: 1,
          unitPrice: partCost,
          totalPrice: partCost,
        }
      ];
    }

    onUpdateTicket(selectedTicket.id, {
      ticketNumber: selectedTicket.ticketNumber,
      customerName: selectedTicket.customerName,
      status: repairStatus,
      technicianDiagnosis: repairDiagnosis.trim() || 'Arıza tespit edildi, onarıma başlandı.',
      partsUsed: updatedParts,
      laborCost: laborCost,
      totalAmount: total,
      updatedAt: new Date().toISOString(),
    });

    setIsJobAcceptedModalOpen(false);
    setSelectedTicket(null);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        maxWidth: '640px', 
        margin: '0 auto', 
        paddingBottom: '90px',
        position: 'relative',
        minHeight: '100vh'
      }}
    >
      {/* 📲 PULL TO REFRESH GÖSTERGESİ (AŞAĞI KAYDIRINCA YENİLEME) */}
      <div 
        style={{
          height: pullDistance > 0 || isRefreshing ? `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px` : '0px',
          maxHeight: '90px',
          overflow: 'hidden',
          transition: isPulling ? 'none' : 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '4px',
          background: pullDistance >= 50 || isRefreshing ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          border: '1px solid ' + (pullDistance >= 50 || isRefreshing ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-subtle)'),
          borderRadius: '16px',
          marginBottom: pullDistance > 0 || isRefreshing ? '14px' : '0px',
          boxShadow: pullDistance > 0 || isRefreshing ? '0 4px 15px rgba(0,0,0,0.2)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: pullDistance >= 50 || isRefreshing ? 'var(--primary)' : 'var(--text-muted)' }}>
          <RefreshCw 
            size={20} 
            style={{ 
              transform: `rotate(${pullDistance * 4.5}deg)`,
              transition: isPulling ? 'none' : 'transform 0.3s ease'
            }}
            className={isRefreshing ? 'spin-animation' : ''} 
          />
          <strong style={{ fontSize: '0.88rem' }}>
            {isRefreshing 
              ? '🔄 MySQL & Bulut Verileri Eşitleniyor...' 
              : pullDistance >= 50 
              ? '👇 Bırakın ve Yenilensin' 
              : '⬇️ Yenilemek İçin Aşağıya Kaydırın'}
          </strong>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          {isRefreshing ? 'Yeni fişler ve güncel işler çekiliyor...' : 'Parmağınızı aşağı çekip bırakın'}
        </span>
      </div>

      {/* 📱 SAHA USTA MODU - TEK, TEMİZ & DERLİ TOPLU MOBİL BAŞLIK */}
      <header 
        style={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
          borderRadius: '16px', 
          padding: '12px 14px', 
          marginBottom: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {/* Üst Satır: Logo + Başlık + Hızlı Aksiyonlar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '10px', 
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Wrench size={17} color="#ffffff" />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <h2 style={{ 
                fontSize: '0.92rem', 
                fontWeight: 800, 
                color: '#ffffff', 
                margin: 0, 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }}>
                {shopName || 'İzmirim Teknik'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                <span>📱 Saha Ekranı</span>
                <span style={{ opacity: 0.5 }}>•</span>
                <span style={{ color: '#94a3b8' }}>{todayTickets.length} Bekleyen İş</span>
              </div>
            </div>
          </div>

          {/* Hızlı Aksiyon Butonları (Yenile, Ofis, Çıkış) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={onTriggerSync || handleRefresh}
              style={{ 
                padding: '6px 10px', 
                fontSize: '0.75rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px',
                borderRadius: 'var(--radius-pill)',
                background: isRefreshing ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                color: isRefreshing ? 'var(--primary)' : '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
              title="Verileri MySQL ile senkronize et"
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin-animation' : ''} />
              <span>{isRefreshing ? 'Eşitleniyor' : 'Yenile'}</span>
            </button>

            {onSwitchToOffice && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onSwitchToOffice}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
                title="Ofis Yönetim Paneline Geç"
              >
                <Monitor size={13} />
                <span>Ofis</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onLogout}
                style={{
                  padding: '6px 8px',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: '#fb7185',
                  border: '1px solid rgba(244, 63, 94, 0.25)'
                }}
                title="Oturumu Kapat"
              >
                <LogOut size={13} />
                <span>Çıkış</span>
              </button>
            )}
          </div>
        </div>

        {/* Alt Satır: Durum Rozeti (MySQL Canlı / Çevrimdışı) + Kullanıcı */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingTop: '8px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.72rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span 
              style={{ 
                width: '7px', 
                height: '7px', 
                borderRadius: '50%', 
                background: connectionState === 'online' ? '#10b981' : connectionState === 'syncing' ? '#3b82f6' : '#f59e0b',
                boxShadow: connectionState === 'online' ? '0 0 6px #10b981' : 'none'
              }} 
            />
            <span style={{ color: connectionState === 'online' ? '#10b981' : connectionState === 'syncing' ? '#3b82f6' : '#f59e0b', fontWeight: 600 }}>
              {connectionState === 'online' ? '🟢 MySQL Canlı' : connectionState === 'syncing' ? '🔄 Eşitleniyor...' : `🟠 Çevrimdışı (${pendingQueueCount || 0})`}
            </span>
          </div>

          {currentUser && (
            <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>👤 {currentUser.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* iPhone Bildirim & Ses Durum Paneli */}
      <div 
        className="card"
        style={{ 
          marginBottom: '16px', 
          background: deviceStatus.permission === 'granted' 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)' 
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(225, 29, 72, 0.08) 100%)',
          borderColor: deviceStatus.permission === 'granted' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BellRing size={20} color={deviceStatus.permission === 'granted' ? '#10b981' : '#f59e0b'} />
            <strong style={{ fontSize: '0.92rem', color: deviceStatus.permission === 'granted' ? '#10b981' : '#f59e0b' }}>
              {deviceStatus.permission === 'granted' ? 'Bildirimler ve Sesli Zil Aktif' : 'iPhone Bildirim & Ses Kurulumu'}
            </strong>
          </div>

          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleTestSound}
            style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <span>{soundTested ? '🔔 Çalıyor...' : '🔊 Zili Test Et'}</span>
          </button>
        </div>

        {/* Cihaz Durum Rozetleri */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.72rem' }}>
          <span style={{ 
            padding: '3px 8px', 
            borderRadius: '12px', 
            background: deviceStatus.isSecure ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: deviceStatus.isSecure ? '#10b981' : '#ef4444',
            fontWeight: 600 
          }}>
            {deviceStatus.isSecure ? '🔒 HTTPS Güvenli' : '⚠️ Güvensiz (HTTP)'}
          </span>

          <span style={{ 
            padding: '3px 8px', 
            borderRadius: '12px', 
            background: deviceStatus.isStandalonePWA ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: deviceStatus.isStandalonePWA ? '#10b981' : '#f59e0b',
            fontWeight: 600 
          }}>
            {deviceStatus.isStandalonePWA ? '📱 Ana Ekran (PWA)' : '🌐 Safari Sekmesi'}
          </span>

          <span style={{ 
            padding: '3px 8px', 
            borderRadius: '12px', 
            background: deviceStatus.permission === 'granted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: deviceStatus.permission === 'granted' ? '#10b981' : '#f59e0b',
            fontWeight: 600 
          }}>
            {deviceStatus.permission === 'granted' ? '✅ İzin Verildi' : '⏳ İzin Bekleniyor'}
          </span>
        </div>

        {/* Duruma Göre Yardım & Aksiyon */}
        {deviceStatus.permission === 'granted' ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Ofis yeni bir servis işi yönlendirdiğinde veya zil çaldığında telefonunuz ses çıkaracak ve ekranda bildirim belirecektir.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!deviceStatus.isSecure ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.78rem', color: '#fca5a5' }}>
                <strong>⚠️ Güvenli Bağlantı (HTTPS):</strong> iPhone kilit ekranı bildirimleri için lütfen Vercel adresini kullanın: <strong>https://servis-pro-seven.vercel.app</strong>
              </div>
            ) : !deviceStatus.isStandalonePWA ? (
              <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.78rem', color: '#fcd34d' }}>
                <strong>📱 Safari Sekmesindesiniz (Apple iOS Kuralı):</strong> Apple, Safari tarayıcı sekmesi içindeyken bildirim izni vermez. 
                <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  <li>Safari altındaki <strong>Paylaş (kare ve yukarı ok ⎋)</strong> butonuna dokunun.</li>
                  <li><strong>"Ana Ekrana Ekle"</strong> seçeneğine dokunun.</li>
                  <li>Telefonunuzun ana ekranına gelen <strong>ServisPro</strong> simgesinden açın ve <strong>"Bildirimleri ve Zili Aç"</strong> butonuna dokunun.</li>
                </ol>
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                style={{ width: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontWeight: 700, padding: '10px' }}
                onClick={handleRequestPermission}
              >
                <BellRing size={16} />
                <span>🔔 Bildirimleri & Zili Etkinleştir</span>
              </button>

              <a 
                href="https://ntfy.sh/servispro_akifkilic_sync"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', padding: '8px', textDecoration: 'none' }}
              >
                📲 Kilit Ekranı & Yedek Zil Kanalı (ntfy)
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs: Bugün, İleri Tarihliler, Tamamlananlar, Acil */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '18px' }}>
        <button 
          className={`btn btn-secondary btn-sm ${filter === 'today' ? 'active' : ''}`}
          onClick={() => setFilter('today')}
          style={{ 
            padding: '12px 6px', 
            background: filter === 'today' ? 'var(--primary-light)' : undefined, 
            color: filter === 'today' ? 'var(--primary)' : undefined, 
            fontWeight: 800,
            border: filter === 'today' ? '1px solid var(--primary)' : undefined
          }}
        >
          <Calendar size={16} />
          <span>📅 Bugünün İşleri ({todayTickets.length})</span>
        </button>

        <button 
          className={`btn btn-secondary btn-sm ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilter('upcoming')}
          style={{ 
            padding: '12px 6px', 
            background: filter === 'upcoming' ? 'rgba(59, 130, 246, 0.2)' : undefined, 
            color: filter === 'upcoming' ? 'var(--primary)' : undefined, 
            fontWeight: 800,
            border: filter === 'upcoming' ? '1px solid var(--primary)' : undefined
          }}
        >
          <Clock size={16} />
          <span>🗓️ İleri Tarihliler ({upcomingTickets.length})</span>
        </button>

        <button 
          className={`btn btn-secondary btn-sm ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
          style={{ 
            padding: '12px 6px', 
            background: filter === 'completed' ? 'rgba(16, 185, 129, 0.2)' : undefined, 
            color: filter === 'completed' ? '#10b981' : undefined, 
            fontWeight: 800,
            border: filter === 'completed' ? '1px solid #10b981' : undefined
          }}
        >
          <CheckCircle2 size={16} />
          <span>💰 Tamamlananlar ({completedTickets.length})</span>
        </button>

        <button 
          className={`btn btn-secondary btn-sm ${filter === 'urgent' ? 'active' : ''}`}
          onClick={() => setFilter('urgent')}
          style={{ 
            padding: '12px 6px', 
            background: filter === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : undefined, 
            color: filter === 'urgent' ? '#ef4444' : undefined, 
            fontWeight: 800,
            border: filter === 'urgent' ? '1px solid #ef4444' : undefined
          }}
        >
          <AlertTriangle size={16} />
          <span>🚨 Acil Çağrılar ({urgentTickets.length})</span>
        </button>
      </div>

      {/* Tickets List for Technician */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {displayedTickets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={44} color="var(--emerald)" style={{ marginBottom: '8px' }} />
            <h4>
              {filter === 'today' ? 'Bugüne Ait Bekleyen Saha İşi Yok' :
               filter === 'upcoming' ? 'İleri Tarihe Alınmış Randevu Yok' :
               filter === 'completed' ? 'Henüz Tamamlanan Fiş Bulunmuyor' :
               'Acil Çağrı Yok'}
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              {filter === 'today' ? 'Tüm bugünkü servisler tamamlandı veya yeni iş bekleniyor.' :
               filter === 'upcoming' ? 'İleri tarihe randevu verildiğinde burada listelenir ve o gün geldiğinde otomatik bugünün işlerine düşer.' :
               'Yeni kayıtlar otomatik olarak ekranda belirecektir.'}
            </p>
          </div>
        ) : (
          displayedTickets.map(ticket => {
            const statusCfg = ticketStatusConfig[ticket.status];
            const device = deviceTypeConfig[ticket.deviceType];
            const isUrgent = ticket.priority === 'urgent';
            const isFuture = ticket.scheduledDate && ticket.scheduledDate > todayStr;

            return (
              <div 
                key={ticket.id}
                className="card"
                style={{ 
                  padding: '18px', 
                  borderLeft: `5px solid ${isUrgent ? '#ef4444' : isFuture ? '#3b82f6' : statusCfg.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: 'var(--bg-elevated)',
                  boxShadow: 'var(--shadow-md)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                {/* Header: Ticket No, Priority, Date & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ticket-number" style={{ fontSize: '1.05rem', fontWeight: 800 }}>{ticket.ticketNumber}</span>
                    {isUrgent && (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 800 }}>
                        🚨 ACİL
                      </span>
                    )}
                    {isFuture && (
                      <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontWeight: 700 }}>
                        🗓️ {ticket.scheduledDate} {ticket.scheduledTimeSlot || ''}
                      </span>
                    )}
                    {ticket.scheduledDate && ticket.scheduledDate < todayStr && (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 700 }}>
                        ⏳ Devreden İş ({ticket.scheduledDate})
                      </span>
                    )}
                    {ticket.paymentStatus !== 'paid' && ticket.paymentStatus !== 'pending_approval' && (ticket.status === 'ready' || ticket.status === 'delivered') && (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 700 }}>
                        💰 Tahsilat Bekliyor
                      </span>
                    )}
                    {ticket.paymentStatus === 'pending_approval' && (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 700 }}>
                        ⏳ Ofis Tahsilat Onayı Bekliyor
                      </span>
                    )}
                  </div>
                  <span className="badge" style={{ background: statusCfg.bg, color: statusCfg.color, fontWeight: 700 }}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Device & Brand */}
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{ticket.brand}</span>
                    <span>{ticket.model}</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {device.label} {ticket.serialNumber ? `• Seri No: ${ticket.serialNumber}` : ''}
                  </div>
                </div>

                {/* Customer Fault / Complaint */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--amber)', fontWeight: 700, marginBottom: '2px' }}>
                    ⚠️ BİLDİRİLEN ARIZA:
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    {ticket.reportedFault}
                  </div>
                  {ticket.technicianDiagnosis && (
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)', fontSize: '0.82rem', color: 'var(--primary)' }}>
                      <strong>Usta Teşhisi:</strong> {ticket.technicianDiagnosis}
                    </div>
                  )}
                </div>

                {/* Customer Information & Quick Action Touch Targets */}
                <div style={{ background: 'rgba(59, 130, 246, 0.04)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                        👤 {ticket.customerName}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        📞 {ticket.customerPhone}
                      </div>
                    </div>
                    {ticket.notes && (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.72rem' }}>
                        📝 Özel Not Var
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{ticket.customerAddress}</span>
                  </div>

                  {/* 3 Action Touch Targets: Ara, Yoldayım, Harita */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <a 
                      href={`tel:${ticket.customerPhone}`}
                      className="btn btn-secondary"
                      style={{ padding: '10px 4px', fontSize: '0.82rem', justifyContent: 'center', gap: '4px', borderRadius: '10px' }}
                    >
                      <Phone size={15} color="var(--primary)" />
                      <span>Ara</span>
                    </a>

                    <a 
                      href={generateEnRouteWhatsApp(ticket)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-whatsapp"
                      style={{ padding: '10px 4px', fontSize: '0.82rem', justifyContent: 'center', gap: '4px', borderRadius: '10px' }}
                    >
                      <Send size={15} />
                      <span>Yoldayım</span>
                    </a>

                    <a 
                      href={generateMapsLink(ticket.customerAddress, '', '')}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '10px 4px', fontSize: '0.82rem', justifyContent: 'center', gap: '4px', borderRadius: '10px' }}
                    >
                      <Navigation size={15} color="#ef4444" />
                      <span>Harita</span>
                    </a>
                  </div>
                </div>

                {/* YENİ: Ayrıntıları İncele & Tüm Saha İşlemleri Butonu */}
                <button 
                  type="button"
                  className="btn btn-primary"
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    fontSize: '0.92rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                  }}
                  onClick={() => openInspectionModal(ticket)}
                >
                  <FileText size={18} />
                  <span>Ayrıntıları İncele & İşlem Yap</span>
                  <ChevronRight size={18} />
                </button>

                {/* Technician Quick Result Actions (Hızlı 1-Tık Butonları) */}
                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button 
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '10px 6px', fontSize: '0.8rem', justifyContent: 'center' }}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsServiceFeeModalOpen(true);
                      }}
                    >
                      <DollarSign size={15} />
                      <span>Servis Ücretine Döndü</span>
                    </button>

                    <button 
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '10px 6px', fontSize: '0.8rem', justifyContent: 'center' }}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setRepairDiagnosis(ticket.technicianDiagnosis || '');
                        setIsJobAcceptedModalOpen(true);
                      }}
                    >
                      <Wrench size={15} color="var(--primary)" />
                      <span>Hızlı İş Al / Parça Gir</span>
                    </button>
                  </div>
                </div>

                {/* Existing Cost Preview if already diagnosed */}
                {ticket.totalAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Belirlenen Toplam:</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--emerald)' }}>{formatCurrency(ticket.totalAmount)}</strong>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 3: SAHA ELEMANI DETAYLI İNCELEME & İŞLEM MODALI (TEK SIRA) */}
      {/* ============================================================== */}
      {inspectingTicket && (
        <div 
          className="modal-overlay" 
          onClick={() => setInspectingTicket(null)}
          style={{ padding: '10px' }}
        >
          <div 
            className="modal-box" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '520px', 
              width: '100%', 
              maxHeight: '94vh', 
              overflowY: 'auto', 
              padding: '16px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'var(--bg-elevated, #131926)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
            }}
          >
            {/* Header: Fiş No, Durum ve Kapat Butonu */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start', 
              paddingBottom: '14px', 
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span className="ticket-number" style={{ fontSize: '1.2rem', fontWeight: 900 }}>
                    {inspectingTicket.ticketNumber}
                  </span>
                  <span className="badge" style={{ ...ticketStatusConfig[inspectingTicket.status], fontSize: '0.8rem', padding: '4px 10px', borderRadius: '8px' }}>
                    {ticketStatusConfig[inspectingTicket.status].label}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 2px 0', fontWeight: 800, color: 'var(--text-main)' }}>
                  {inspectingTicket.brand} {inspectingTicket.model}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {deviceTypeConfig[inspectingTicket.deviceType]?.label || 'Beyaz Eşya'}
                </span>
              </div>

              <button 
                type="button"
                onClick={() => setInspectingTicket(null)}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'rgba(255, 255, 255, 0.08)', 
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--text-main)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* 1. MÜŞTERİ BİLGİLERİ & HIZLI ARAMA */}
              <div className="card" style={{ padding: '14px', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.25)', borderRadius: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  MÜŞTERİ & ADRES
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                  {inspectingTicket.customerName}
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  📞 {inspectingTicket.customerPhone}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.4 }}>
                  <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{inspectingTicket.customerAddress}</span>
                </div>

                {inspectingTicket.notes && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '10px', fontSize: '0.84rem', color: '#f59e0b', marginBottom: '12px' }}>
                    <strong>Müşteri Notu:</strong> {inspectingTicket.notes}
                  </div>
                )}

                {/* 3 Hızlı Buton */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <a href={`tel:${inspectingTicket.customerPhone}`} className="btn btn-secondary" style={{ padding: '10px 4px', fontSize: '0.82rem', justifyContent: 'center', gap: '4px', borderRadius: '10px' }}>
                    <Phone size={15} color="var(--primary)" />
                    <span>Ara</span>
                  </a>
                  <a href={generateEnRouteWhatsApp(inspectingTicket)} target="_blank" rel="noreferrer" className="btn btn-whatsapp" style={{ padding: '10px 4px', fontSize: '0.82rem', justifyContent: 'center', gap: '4px', borderRadius: '10px' }}>
                    <Send size={15} />
                    <span>Yoldayım</span>
                  </a>
                  <a href={generateMapsLink(inspectingTicket.customerAddress, '', '')} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '10px 4px', fontSize: '0.82rem', justifyContent: 'center', gap: '4px', borderRadius: '10px' }}>
                    <Navigation size={15} color="#ef4444" />
                    <span>Harita</span>
                  </a>
                </div>
              </div>

              {/* 2. BİLDİRİLEN ARIZA / MÜŞTERİ ŞİKAYETİ */}
              <div className="card" style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} />
                  <span>BİLDİRİLEN ARIZA / ŞİKAYET</span>
                </div>
                <p style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                  {inspectingTicket.reportedFault}
                </p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                  <span>Garanti Durumu: <strong style={{ color: inspectingTicket.warrantyStatus === 'warranty' ? '#10b981' : 'var(--text-main)' }}>{inspectingTicket.warrantyStatus === 'warranty' ? 'Garantili' : 'Garanti Dışı'}</strong></span>
                </div>
              </div>

              {/* 3. İŞ EMRİ DURUMU (TEK SIRA SEÇİM) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                  📋 İş Emri Durumu
                </label>
                <select 
                  className="form-control"
                  style={{ height: '48px', fontSize: '0.95rem', fontWeight: 600, borderRadius: '10px' }}
                  value={inspectStatus}
                  onChange={e => setInspectStatus(e.target.value as any)}
                >
                  <option value="scheduled">⏳ Ziyaret Planlandı / Yolda</option>
                  <option value="in_repair">🔧 İş Alındı / Onarımda</option>
                  <option value="waiting_parts">📦 Parça Bekleniyor (Tedarikte)</option>
                  <option value="ready">✅ Onarım Tamamlandı / Teslime Hazır</option>
                  <option value="delivered">🏁 Teslim & Tahsil Edildi (İşi Kapat)</option>
                  <option value="cancelled">❌ İptal / İade</option>
                </select>
              </div>

              {/* 4. USTA TEŞHİSİ VE YAPILAN İŞLEM NOTU */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={16} color="var(--primary)" />
                  <span>Usta Teşhisi & Yapılan İşlem Notu</span>
                </label>
                <textarea 
                  className="form-control"
                  rows={3}
                  style={{ fontSize: '0.92rem', lineHeight: 1.45, borderRadius: '10px' }}
                  placeholder="Yapılan onarım, tespit edilen arıza ve teknik açıklamayı buraya yazınız..."
                  value={inspectDiagnosis}
                  onChange={e => setInspectDiagnosis(e.target.value)}
                />
              </div>

              {/* 5. KULLANILAN YEDEK PARÇALAR */}
              <div className="card" style={{ padding: '14px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={15} />
                    <span>YEDEK PARÇALAR ({inspectParts.length})</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: '8px' }}
                    onClick={() => setIsAddingPart(!isAddingPart)}
                  >
                    <Plus size={14} />
                    <span>{isAddingPart ? 'Kapat' : 'Parça Ekle'}</span>
                  </button>
                </div>

                {inspectParts.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Henüz fişe yedek parça eklenmedi.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {inspectParts.map(p => (
                      <div 
                        key={p.id}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: '10px',
                          fontSize: '0.88rem'
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--text-main)' }}>{p.partName}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {p.quantity} Adet × {formatCurrency(p.unitPrice)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <strong style={{ color: 'var(--emerald)', fontSize: '0.95rem' }}>{formatCurrency(p.totalPrice)}</strong>
                          <button 
                            type="button" 
                            onClick={() => handleRemovePartFromInspect(p.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Parça Ekleme Alanı (Tek Sıra Akış) */}
                {isAddingPart && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(59, 130, 246, 0.06)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Stok Kataloğundan Seç:</label>
                      <select 
                        className="form-control"
                        style={{ height: '42px', fontSize: '0.88rem' }}
                        value={stockPartId}
                        onChange={e => {
                          const pid = e.target.value;
                          setStockPartId(pid);
                          if (pid) {
                            const p = parts.find(x => x.id === pid);
                            if (p) {
                              setPartPrice(p.salePrice);
                              setCustomPartName('');
                            }
                          }
                        }}
                      >
                        <option value="">-- Stoktan Parça Seçiniz --</option>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) - {p.salePrice} TL [Stok: {p.quantity}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {!stockPartId && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Veya Özel Parça Adı:</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ height: '42px', fontSize: '0.88rem' }}
                          placeholder="Örn: Kazan Körük Lastiği"
                          value={customPartName}
                          onChange={e => setCustomPartName(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Birim Satış Fiyatı (TL):</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ height: '42px', fontSize: '0.95rem' }}
                        value={partPrice}
                        onChange={e => setPartPrice(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Adet:</label>
                      <input 
                        type="number" 
                        min={1}
                        className="form-control" 
                        style={{ height: '42px', fontSize: '0.95rem' }}
                        value={partQty}
                        onChange={e => setPartQty(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-primary"
                      style={{ width: '100%', height: '42px', justifyContent: 'center', fontWeight: 700 }}
                      onClick={handleAddPartToInspect}
                    >
                      <Plus size={16} />
                      <span>Fişe Parçayı Ekle</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 6. HESAP DÖKÜMÜ & MALİYETLER (TEK SIRA DÜZEN) */}
              <div className="card" style={{ padding: '14px', borderRadius: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={15} />
                  <span>MALİYET & HESAP DÖKÜMÜ</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600 }}>İşçilik Bedeli (TL):</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      style={{ height: '44px', fontSize: '1rem', fontWeight: 700 }}
                      value={inspectLaborCost}
                      onChange={e => setInspectLaborCost(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600 }}>Servis / Yol Bedeli (TL):</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      style={{ height: '44px', fontSize: '1rem', fontWeight: 700 }}
                      value={inspectTransportCost}
                      onChange={e => setInspectTransportCost(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600 }}>İndirim Tutarı (TL):</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      style={{ height: '44px', fontSize: '1rem', fontWeight: 700 }}
                      value={inspectDiscount}
                      onChange={e => setInspectDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600 }}>Ödeme Şekli:</label>
                    <select 
                      className="form-control"
                      style={{ height: '44px', fontSize: '0.92rem', fontWeight: 600 }}
                      value={inspectPaymentMethod}
                      onChange={e => setInspectPaymentMethod(e.target.value as any)}
                    >
                      <option value="cash">💵 Nakit</option>
                      <option value="credit_card">💳 Kredi Kartı / POS</option>
                      <option value="bank_transfer">🏦 IBAN / Havale</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 600 }}>Ödeme Durumu:</label>
                    <select 
                      className="form-control"
                      style={{ height: '44px', fontSize: '0.92rem', fontWeight: 600 }}
                      value={inspectPaymentStatus}
                      onChange={e => setInspectPaymentStatus(e.target.value as any)}
                    >
                      <option value="unpaid">⏳ Ödeme Bekliyor (Tahsil Edilmedi)</option>
                      <option value="pending_approval">💰 Tahsil Edildi (Ofis Onayına Gönder)</option>
                      <option value="paid">✅ Tahsil Edildi (Onaylandı)</option>
                    </select>
                  </div>
                </div>

                {/* BÜYÜK TOPLAM TUTAR KUTUSU */}
                <div style={{ 
                  marginTop: '16px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.12) 100%)', 
                  border: '1px solid rgba(16, 185, 129, 0.45)', 
                  borderRadius: '14px', 
                  padding: '16px', 
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    MÜŞTERİYE ÇIKAN GENEL TOPLAM
                  </span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.5px' }}>
                    {formatCurrency(Math.max(0, inspectParts.reduce((s, p) => s + p.totalPrice, 0) + inspectLaborCost + inspectTransportCost - inspectDiscount))}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: inspectPaymentStatus === 'paid' ? '#34d399' : inspectPaymentStatus === 'pending_approval' ? '#fbbf24' : '#ef4444', fontWeight: 700, display: 'block', marginTop: '4px' }}>
                    {inspectPaymentStatus === 'paid' ? '● Tahsil Edildi (Onaylandı)' : inspectPaymentStatus === 'pending_approval' ? '⏳ Tahsilat Alındı (Ofis Onayı Bekliyor)' : '○ Ödeme Bekliyor'} ({inspectPaymentMethod === 'cash' ? 'Nakit' : inspectPaymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Havale'})
                  </span>
                </div>

                {/* WhatsApp Servis Fişi Paylaşımı */}
                <a 
                  href={generateReceiptWhatsApp(inspectingTicket)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-whatsapp"
                  style={{ width: '100%', marginTop: '14px', padding: '13px', fontSize: '0.9rem', fontWeight: 700, justifyContent: 'center', borderRadius: '12px' }}
                >
                  <Share2 size={16} />
                  <span>Müşteriye WhatsApp Fişi Gönder</span>
                </a>
              </div>

              {/* 7. ALT AKSİYON BUTONLARI (TEK SIRA / DİKEY) */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                marginTop: '10px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  style={{ 
                    width: '100%', 
                    background: 'linear-gradient(135deg, #10b981, #059669)', 
                    fontWeight: 900, 
                    padding: '14px',
                    fontSize: '0.98rem',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                  onClick={() => handleSaveInspection(true)}
                >
                  <CheckCircle2 size={18} />
                  <span>Tahsil Edildi & İşi Tamamla (Kapat)</span>
                </button>

                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    fontWeight: 800, 
                    padding: '13px',
                    fontSize: '0.95rem',
                    justifyContent: 'center',
                    borderRadius: '12px'
                  }}
                  onClick={() => handleSaveInspection(false)}
                >
                  <Check size={17} />
                  <span>Değişiklikleri Kaydet</span>
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ 
                    width: '100%', 
                    padding: '11px',
                    fontSize: '0.9rem',
                    justifyContent: 'center',
                    borderRadius: '12px'
                  }}
                  onClick={() => setInspectingTicket(null)}
                >
                  Kapat
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SADECE SERVİS ÜCRETİNE DÖNDÜ (TEK SIRA) */}
      {isServiceFeeModalOpen && selectedTicket && (
        <div className="modal-overlay" onClick={() => setIsServiceFeeModalOpen(false)} style={{ padding: '10px' }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', width: '100%', borderRadius: '18px', padding: '16px' }}>
            <div className="modal-header" style={{ padding: '0 0 12px 0', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ color: '#ef4444', fontSize: '1.15rem', margin: 0 }}>Servis Ücreti Tahsilatı</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {selectedTicket.ticketNumber} - {selectedTicket.customerName}
                </p>
              </div>
              <button className="close-btn" onClick={() => setIsServiceFeeModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.85rem', color: '#f87171' }}>
                Müşteri cihaz onarımını kabul etmediğinde sadece arıza tespit / yol servis bedeli giriniz.
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Alınan Servis Bedeli (TL) *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ fontSize: '1.25rem', fontWeight: 800, height: '46px', borderRadius: '10px' }}
                  value={serviceFeeAmount}
                  onChange={e => setServiceFeeAmount(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Ödeme Şekli</label>
                <select 
                  className="form-control"
                  style={{ height: '44px', fontSize: '0.92rem', borderRadius: '10px' }}
                  value={serviceFeeMethod}
                  onChange={e => setServiceFeeMethod(e.target.value as any)}
                >
                  <option value="cash">💵 Nakit Aldım</option>
                  <option value="credit_card">💳 Kredi Kartı / POS Çekildi</option>
                  <option value="bank_transfer">🏦 IBAN / Havale Gönderildi</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Usta Notu</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ height: '44px', fontSize: '0.9rem', borderRadius: '10px' }}
                  value={serviceFeeNote}
                  onChange={e => setServiceFeeNote(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '46px', fontSize: '0.95rem', fontWeight: 800, justifyContent: 'center', borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                onClick={handleConfirmServiceFee}
              >
                <Check size={18} />
                <span>Tahsil Edildi & Fişi Kapat</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', height: '42px', fontSize: '0.88rem', justifyContent: 'center', borderRadius: '10px' }}
                onClick={() => setIsServiceFeeModalOpen(false)}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: İŞ ALINDI / PARÇA VE TUTAR GİRİŞİ (TEK SIRA) */}
      {isJobAcceptedModalOpen && selectedTicket && (
        <div className="modal-overlay" onClick={() => setIsJobAcceptedModalOpen(false)} style={{ padding: '10px' }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%', borderRadius: '18px', padding: '16px' }}>
            <div className="modal-header" style={{ padding: '0 0 12px 0', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ color: 'var(--primary)', fontSize: '1.15rem', margin: 0 }}>İş Alındı & Onarım Girişi</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {selectedTicket.ticketNumber} - {selectedTicket.brand} {selectedTicket.model}
                </p>
              </div>
              <button className="close-btn" onClick={() => setIsJobAcceptedModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Arıza Tespiti & Açıklama *</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  style={{ fontSize: '0.92rem', borderRadius: '10px' }}
                  placeholder="Örn: Tahliye pompası sargısı yanmış, kazan amortisörleri patlak."
                  value={repairDiagnosis}
                  onChange={e => setRepairDiagnosis(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Değişecek Parça Adı</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ height: '44px', fontSize: '0.9rem', borderRadius: '10px' }}
                  placeholder="Örn: Arçelik Tahliye Pompası"
                  value={repairPartName}
                  onChange={e => setRepairPartName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Parça Satış Fiyatı (TL)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ height: '44px', fontSize: '0.95rem', borderRadius: '10px' }}
                  value={repairPartPrice}
                  onChange={e => setRepairPartPrice(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>İşçilik Tutarı (TL)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ height: '44px', fontSize: '0.95rem', borderRadius: '10px' }}
                  value={repairLaborPrice}
                  onChange={e => setRepairLaborPrice(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Yeni İş Durumu</label>
                <select 
                  className="form-control"
                  style={{ height: '44px', fontSize: '0.92rem', borderRadius: '10px' }}
                  value={repairStatus}
                  onChange={e => setRepairStatus(e.target.value as any)}
                >
                  <option value="in_repair">🔧 Onarımda / İnceleniyor</option>
                  <option value="waiting_parts">📦 Parça Bekleniyor (Toptancıdan)</option>
                  <option value="ready">✅ Onarım Bitti / Testte Hazır</option>
                </select>
              </div>

              {/* Tutar Özeti */}
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 600 }}>Toplam Tutar:</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
                  {formatCurrency((parseFloat(repairPartPrice) || 0) + (parseFloat(repairLaborPrice) || 0))}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '46px', fontSize: '0.95rem', fontWeight: 800, justifyContent: 'center', borderRadius: '10px' }}
                onClick={handleConfirmJobAccepted}
              >
                <Check size={18} />
                <span>Kaydet & Ofise İlet</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', height: '42px', fontSize: '0.88rem', justifyContent: 'center', borderRadius: '10px' }}
                onClick={() => setIsJobAcceptedModalOpen(false)}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
