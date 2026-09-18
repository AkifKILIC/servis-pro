import React from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  PackageX, 
  Plus, 
  Phone, 
  MessageSquare, 
  ArrowRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import { ServiceTicket, SparePart, Customer } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  ticketStatusConfig, 
  priorityConfig, 
  deviceTypeConfig,
  generateWhatsAppLink,
  cleanPhoneForWhatsApp
} from '../utils/helpers';

interface DashboardProps {
  tickets: ServiceTicket[];
  parts: SparePart[];
  customers: Customer[];
  onSelectTicket: (ticket: ServiceTicket) => void;
  onOpenNewTicket: () => void;
  onOpenNewCustomer: () => void;
  onOpenNewPart: () => void;
  onNavigateToTab: (tab: string) => void;
  shopName: string;
  shopPhone: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tickets,
  parts,
  customers,
  onSelectTicket,
  onOpenNewTicket,
  onOpenNewCustomer,
  onOpenNewPart,
  onNavigateToTab,
  shopName,
  shopPhone,
}) => {
  // Hesaplamalar
  const openTickets = tickets.filter(t => t.status !== 'delivered' && t.status !== 'cancelled');
  const urgentTickets = openTickets.filter(t => t.priority === 'urgent');
  const waitingPartsTickets = openTickets.filter(t => t.status === 'waiting_parts');
  const readyTickets = tickets.filter(t => t.status === 'ready');
  const lowStockParts = parts.filter(p => p.quantity <= p.minStockLevel);

  const totalEarnings = tickets
    .filter(t => t.paymentStatus === 'paid')
    .reduce((sum, t) => sum + (t.paidAmount || t.totalAmount || 0), 0);

  // Cihaz türü dağılımı
  const deviceCounts: Record<string, number> = {};
  tickets.forEach(t => {
    deviceCounts[t.deviceType] = (deviceCounts[t.deviceType] || 0) + 1;
  });

  return (
    <div>
      {/* Top Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>Teknik Servis Yönetim Paneli</h2>
          <p>Hoş geldiniz! Güncel servis talepleri, parça durumları ve dükkan performansı.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={onOpenNewTicket}>
            <Plus size={18} />
            <span>Hızlı Servis Fişi Aç</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #3b82f6, #60a5fa)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Wrench size={26} />
          </div>
          <div className="metric-data">
            <h3>{openTickets.length}</h3>
            <p>Aktif / Açık Fişler</p>
          </div>
        </div>

        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #ef4444, #f87171)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <AlertTriangle size={26} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: urgentTickets.length > 0 ? '#ef4444' : 'inherit' }}>{urgentTickets.length}</h3>
            <p>Acil Servis Çağrısı</p>
          </div>
        </div>

        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #ec4899, #f472b6)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
            <Clock size={26} />
          </div>
          <div className="metric-data">
            <h3>{waitingPartsTickets.length}</h3>
            <p>Parça Bekleyen</p>
          </div>
        </div>

        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #10b981, #34d399)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <TrendingUp size={26} />
          </div>
          <div className="metric-data">
            <h3 style={{ fontSize: '1.45rem', color: '#10b981' }}>{formatCurrency(totalEarnings)}</h3>
            <p>Toplam Tahsilat</p>
          </div>
        </div>
      </div>

      {/* Quick Alert Banner for Low Stock */}
      {lowStockParts.length > 0 && (
        <div 
          className="card" 
          style={{ 
            marginBottom: '24px', 
            background: 'rgba(239, 68, 68, 0.08)', 
            borderColor: 'rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PackageX size={24} color="#ef4444" />
            <div>
              <strong style={{ color: '#ef4444' }}>{lowStockParts.length} adet yedek parça kritik stok sınırında!</strong>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                {lowStockParts.map(p => `${p.name} (Kalan: ${p.quantity} adet)`).join(', ')}
              </div>
            </div>
          </div>
          <button 
            className="btn btn-danger btn-sm"
            onClick={() => onNavigateToTab('inventory')}
          >
            Stokları İncele
          </button>
        </div>
      )}

      {/* Main Grid: Urgent & Pending Jobs vs Quick Actions & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
        {/* Left Column: Urgent & Open Tickets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>İşlemdeki & Öncelikli Servis Fişleri</h3>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => onNavigateToTab('tickets')}
              >
                Tümünü Gör ({tickets.length}) <ArrowRight size={14} />
              </button>
            </div>

            {openTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={42} color="var(--emerald)" style={{ marginBottom: '8px' }} />
                <p>Harika! Şu anda bekleyen açık servis fişi yok.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {openTickets.slice(0, 5).map(ticket => {
                  const statusInfo = ticketStatusConfig[ticket.status];
                  const priorityInfo = priorityConfig[ticket.priority];
                  const device = deviceTypeConfig[ticket.deviceType];

                  return (
                    <div 
                      key={ticket.id}
                      className="card"
                      style={{ 
                        padding: '14px 18px', 
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderLeft: `4px solid ${statusInfo.color}`
                      }}
                      onClick={() => onSelectTicket(ticket)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="ticket-number">{ticket.ticketNumber}</span>
                          <span className="badge" style={{ background: priorityInfo.bg, color: priorityInfo.color }}>
                            {priorityInfo.label}
                          </span>
                          <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                            <span className="badge-dot" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          {formatCurrency(ticket.totalAmount)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{ticket.brand}</span>
                            <span>{ticket.model}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                              ({device.label})
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <strong>Şikayet:</strong> {ticket.reportedFault}
                          </div>
                        </div>

                        {/* Direct Action Icons */}
                        <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                          <a 
                            href={`tel:${ticket.customerPhone}`}
                            className="btn btn-secondary btn-sm"
                            title="Müşteriyi Ara"
                            style={{ padding: '6px 8px' }}
                          >
                            <Phone size={14} />
                          </a>
                          <a 
                            href={generateWhatsAppLink(ticket.customerPhone, 'received', {
                              customerName: ticket.customerName,
                              ticketNumber: ticket.ticketNumber,
                              deviceInfo: `${ticket.brand} ${ticket.model}`,
                              faultInfo: ticket.reportedFault,
                              shopName,
                              shopPhone
                            })}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-whatsapp btn-sm"
                            title="WhatsApp Mesajı Gönder"
                            style={{ padding: '6px 8px' }}
                          >
                            <MessageSquare size={14} />
                          </a>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
                        <span>Müşteri: <strong>{ticket.customerName}</strong> ({ticket.customerPhone})</span>
                        {ticket.scheduledDate ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}>
                            <Calendar size={13} />
                            {ticket.scheduledDate} {ticket.scheduledTimeSlot || ''}
                          </span>
                        ) : (
                          <span>Kayıt: {formatDate(ticket.createdAt)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Shortcuts & Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Actions Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--amber)" />
              Hızlı İşlemler
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', width: '100%', padding: '12px 14px' }}
                onClick={onOpenNewTicket}
              >
                <Plus size={18} color="var(--primary)" />
                <span>Yeni Servis Fişi Oluştur</span>
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', width: '100%', padding: '12px 14px' }}
                onClick={onOpenNewCustomer}
              >
                <Plus size={18} color="var(--emerald)" />
                <span>Yeni Müşteri Kaydı</span>
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', width: '100%', padding: '12px 14px' }}
                onClick={onOpenNewPart}
              >
                <Plus size={18} color="var(--purple)" />
                <span>Yedek Parça / Stok Girişi</span>
              </button>
            </div>
          </div>

          {/* Device Type Distribution */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
              Cihaz Arıza Dağılımı
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(deviceTypeConfig).map(([typeKey, config]) => {
                const count = deviceCounts[typeKey] || 0;
                if (count === 0 && tickets.length > 5) return null;
                const percentage = tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;

                return (
                  <div key={typeKey}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color }} />
                        {config.label}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {count} adet ({percentage}%)
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${percentage}%`, 
                          background: config.color,
                          borderRadius: '3px',
                          transition: 'width 0.4s ease'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shop Contact Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.05) 100%)' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--primary)' }}>{shopName}</h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Saha ve atölye teknik servis işlerinizi tek bir merkezden yönetin.
            </p>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>Dükkan Tel: <strong>{shopPhone}</strong></span>
              <span>Kayıtlı Müşteri Sayısı: <strong>{customers.length}</strong></span>
              <span>Kayıtlı Parça Çeşidi: <strong>{parts.length}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
