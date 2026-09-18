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
  BellRing
} from 'lucide-react';
import { ServiceTicket, SparePart } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  deviceTypeConfig, 
  ticketStatusConfig,
  generateMapsLink,
  cleanPhoneForWhatsApp
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
}

export const TechnicianMobileView: React.FC<TechnicianMobileViewProps> = ({
  tickets,
  parts,
  onUpdateTicket,
  shopName,
  shopPhone,
  currentUser,
  onLogout,
}) => {
  const [filter, setFilter] = useState<'open' | 'urgent' | 'all'>('open');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [deviceStatus, setDeviceStatus] = useState(() => checkNotificationSupport());
  const [soundTested, setSoundTested] = useState(false);

  // Hızlı Aksiyon Modalları
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

  // Filtreleme
  const openTickets = tickets.filter(t => t.status !== 'delivered' && t.status !== 'cancelled');
  const urgentTickets = openTickets.filter(t => t.priority === 'urgent');

  const displayedTickets = filter === 'urgent' 
    ? urgentTickets 
    : filter === 'open' 
    ? openTickets 
    : tickets;

  // Ses ve bildirim testi
  const handleTestSound = async () => {
    initAudioContext();
    playNotificationSound();
    setSoundTested(true);

    // Kilit ekranı bildirimini test et (İzin verilmişse anında iPhone ekranında göster)
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
      status: 'delivered',
      technicianDiagnosis: serviceFeeNote,
      transportCost: fee,
      laborCost: 0,
      partsUsed: [],
      discount: 0,
      totalAmount: fee,
      paymentStatus: 'paid',
      paymentMethod: serviceFeeMethod,
      paidAmount: fee,
      completedAt: new Date().toISOString(),
    });

    setIsServiceFeeModalOpen(false);
    setSelectedTicket(null);
    alert('İş "Servis Ücreti Alındı" olarak kapatıldı ve ofise bildirildi!');
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
      status: repairStatus,
      technicianDiagnosis: repairDiagnosis.trim() || 'Arıza tespit edildi, onarım onaylandı.',
      partsUsed: updatedParts,
      laborCost: laborCost,
      totalAmount: total,
      updatedAt: new Date().toISOString(),
    });

    setIsJobAcceptedModalOpen(false);
    setSelectedTicket(null);
    alert('İş detayları ve tutar başarıyla kaydedildi, ofis ekranında güncellendi!');
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '90px' }}>
      {/* Top Mobile Bar */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '16px 20px', 
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Saha Teknisyen Ekranı</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {openTickets.length} Bekleyen Saha İşi | Canlı Senkronizasyon Aktif
          </p>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
            📱 iPhone Modu
          </span>
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '6px' }}>
                👤 {currentUser.name}
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', padding: '0' }}
                >
                  Çıkış
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        <button 
          className={`btn btn-secondary btn-sm ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
          style={{ flex: 1, padding: '10px 4px', background: filter === 'open' ? 'var(--primary-light)' : undefined, color: filter === 'open' ? 'var(--primary)' : undefined }}
        >
          Bekleyen İşler ({openTickets.length})
        </button>
        <button 
          className={`btn btn-secondary btn-sm ${filter === 'urgent' ? 'active' : ''}`}
          onClick={() => setFilter('urgent')}
          style={{ flex: 1, padding: '10px 4px', background: filter === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : undefined, color: filter === 'urgent' ? '#ef4444' : undefined }}
        >
          Acil Çağrılar ({urgentTickets.length})
        </button>
        <button 
          className={`btn btn-secondary btn-sm ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          style={{ flex: 1, padding: '10px 4px', background: filter === 'all' ? 'rgba(255, 255, 255, 0.1)' : undefined }}
        >
          Tümü ({tickets.length})
        </button>
      </div>

      {/* Tickets List for Technician */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {displayedTickets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={44} color="var(--emerald)" style={{ marginBottom: '8px' }} />
            <h4>Şu Anda Bekleyen Saha İşi Yok</h4>
            <p style={{ fontSize: '0.85rem' }}>Ofis yeni bir arıza kaydı açtığında bu ekranda otomatik belirecektir.</p>
          </div>
        ) : (
          displayedTickets.map(ticket => {
            const statusCfg = ticketStatusConfig[ticket.status];
            const device = deviceTypeConfig[ticket.deviceType];
            const isUrgent = ticket.priority === 'urgent';

            return (
              <div 
                key={ticket.id}
                className="card"
                style={{ 
                  padding: '18px', 
                  borderLeft: `5px solid ${isUrgent ? '#ef4444' : statusCfg.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: 'var(--bg-elevated)'
                }}
              >
                {/* Header: Ticket No & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ticket-number" style={{ fontSize: '1rem' }}>{ticket.ticketNumber}</span>
                    {isUrgent && (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 800 }}>
                        ACİL
                      </span>
                    )}
                  </div>
                  <span className="badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Device & Brand */}
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {ticket.brand} {ticket.model}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-dim)' }}>
                    {device.label} {ticket.serialNumber ? `• Seri No: ${ticket.serialNumber}` : ''}
                  </div>
                </div>

                {/* Customer Fault / Complaint */}
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    MÜŞTERİ ARIZA ŞİKAYETİ:
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', marginTop: '3px', fontWeight: 500 }}>
                    {ticket.reportedFault}
                  </div>
                </div>

                {/* Customer Contact & Address (BIG BUTTONS FOR PHONE & MAP) */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: '4px' }}>
                    {ticket.customerName}
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    📍 {ticket.customerAddress}
                  </div>

                  {/* 3 Large Action Touch Targets */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '8px' }}>
                    <a 
                      href={`tel:${ticket.customerPhone}`}
                      className="btn btn-secondary"
                      style={{ padding: '12px 6px', fontSize: '0.85rem' }}
                    >
                      <Phone size={16} color="var(--primary)" />
                      <span>Ara</span>
                    </a>

                    <a 
                      href={`https://api.whatsapp.com/send?phone=${cleanPhoneForWhatsApp(ticket.customerPhone)}&text=Merhaba%20${encodeURIComponent(ticket.customerName)},%20${encodeURIComponent(shopName)}%20servisinden%20arıza%20için%20yoldayız.`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-whatsapp"
                      style={{ padding: '12px 6px', fontSize: '0.85rem' }}
                    >
                      <MessageSquare size={16} />
                      <span>WhatsApp</span>
                    </a>

                    <a 
                      href={generateMapsLink(ticket.customerAddress, '', '')}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '12px 6px', fontSize: '0.85rem' }}
                    >
                      <MapPin size={16} color="#ef4444" />
                      <span>Yol Tarifi</span>
                    </a>
                  </div>
                </div>

                {/* Technician Quick Result Actions (ADRESE GİDİLDİĞİNDE) */}
                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    ADRESE VARILDIĞINDA SONUÇ GİRİŞİ:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {/* Buton 1: Sadece Servis Ücretine Döndü */}
                    <button 
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '12px 8px', fontSize: '0.82rem', textAlign: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsServiceFeeModalOpen(true);
                      }}
                    >
                      <DollarSign size={16} />
                      <span>Servis Ücretine Döndü</span>
                    </button>

                    {/* Buton 2: İş Alındı / Parça Değişecek */}
                    <button 
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '12px 8px', fontSize: '0.82rem', textAlign: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setRepairDiagnosis(ticket.technicianDiagnosis || '');
                        setIsJobAcceptedModalOpen(true);
                      }}
                    >
                      <Wrench size={16} />
                      <span>İş Alındı / Parça Gir</span>
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

      {/* MODAL 1: SADECE SERVİS ÜCRETİNE DÖNDÜ */}
      {isServiceFeeModalOpen && selectedTicket && (
        <div className="modal-overlay" onClick={() => setIsServiceFeeModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ color: '#ef4444' }}>Servis Ücreti Tahsilatı</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {selectedTicket.ticketNumber} - {selectedTicket.customerName}
                </p>
              </div>
              <button className="close-btn" onClick={() => setIsServiceFeeModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '0.85rem', color: '#f87171' }}>
                Müşteri cihaz onarımını kabul etmediğinde veya arıza bulunmadığında sadece yol / servis arıza tespit bedeli giriniz.
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Alınan Servis Bedeli (TL) *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ fontSize: '1.2rem', fontWeight: 800 }}
                  value={serviceFeeAmount}
                  onChange={e => setServiceFeeAmount(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ödeme Şekli</label>
                <select 
                  className="form-control"
                  value={serviceFeeMethod}
                  onChange={e => setServiceFeeMethod(e.target.value as any)}
                >
                  <option value="cash">Nakit Aldım</option>
                  <option value="credit_card">Kredi Kartı / POS Çekildi</option>
                  <option value="bank_transfer">IBAN / Havale Gönderildi</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Usta Notu</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={serviceFeeNote}
                  onChange={e => setServiceFeeNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsServiceFeeModalOpen(false)}>
                Vazgeç
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmServiceFee}>
                <Check size={18} />
                <span>Tahsil Edildi & Fişi Kapat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: İŞ ALINDI / PARÇA VE TUTAR GİRİŞİ */}
      {isJobAcceptedModalOpen && selectedTicket && (
        <div className="modal-overlay" onClick={() => setIsJobAcceptedModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ color: 'var(--primary)' }}>İş Alındı & Onarım Girişi</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {selectedTicket.ticketNumber} - {selectedTicket.brand} {selectedTicket.model}
                </p>
              </div>
              <button className="close-btn" onClick={() => setIsJobAcceptedModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Arıza Tespiti & Değişecek Parça Açıklaması *</label>
                <textarea 
                  className="form-control"
                  rows={2}
                  placeholder="Örn: Tahliye pompası sargısı yanmış, kazan amortisörleri patlak."
                  value={repairDiagnosis}
                  onChange={e => setRepairDiagnosis(e.target.value)}
                />
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Değişecek Parça Adı</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Örn: Arçelik Tahliye Pompası"
                    value={repairPartName}
                    onChange={e => setRepairPartName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Parça Fiyatı (TL)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={repairPartPrice}
                    onChange={e => setRepairPartPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">İşçilik Tutarı (TL)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={repairLaborPrice}
                    onChange={e => setRepairLaborPrice(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Yeni İş Durumu</label>
                  <select 
                    className="form-control"
                    value={repairStatus}
                    onChange={e => setRepairStatus(e.target.value as any)}
                  >
                    <option value="in_repair">Onarımda / İnceleniyor</option>
                    <option value="waiting_parts">Parça Bekleniyor (Toptancıdan)</option>
                    <option value="ready">Onarım Bitti / Testte Hazır</option>
                  </select>
                </div>
              </div>

              {/* Tutar Özeti */}
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600 }}>Müşteriye Verilen Toplam Tutar:</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
                  {formatCurrency((parseFloat(repairPartPrice) || 0) + (parseFloat(repairLaborPrice) || 0))}
                </strong>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsJobAcceptedModalOpen(false)}>
                Vazgeç
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmJobAccepted}>
                <Check size={18} />
                <span>Kaydet & Ofise İlet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
