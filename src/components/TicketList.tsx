import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  MessageSquare, 
  Printer, 
  Calendar, 
  MapPin, 
  Wrench, 
  LayoutGrid, 
  List,
  CheckCircle2,
  Clock,
  Sparkles,
  Users
} from 'lucide-react';
import { ServiceTicket, TicketStatus, DeviceType, Priority } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  ticketStatusConfig, 
  priorityConfig, 
  deviceTypeConfig,
  paymentStatusConfig,
  generateWhatsAppLink,
  generateMapsLink,
  generateGroupWhatsAppLink
} from '../utils/helpers';

interface TicketListProps {
  tickets: ServiceTicket[];
  onSelectTicket: (ticket: ServiceTicket) => void;
  onOpenNewTicket: () => void;
  onPrintTicket: (ticket: ServiceTicket) => void;
  shopName: string;
  shopPhone: string;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onSelectTicket,
  onOpenNewTicket,
  onPrintTicket,
  shopName,
  shopPhone,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filtreleme
  const filteredTickets = tickets.filter(ticket => {
    // Metin araması
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      ticket.ticketNumber.toLowerCase().includes(searchLower) ||
      ticket.customerName.toLowerCase().includes(searchLower) ||
      ticket.customerPhone.includes(searchTerm) ||
      ticket.brand.toLowerCase().includes(searchLower) ||
      ticket.model.toLowerCase().includes(searchLower) ||
      ticket.reportedFault.toLowerCase().includes(searchLower);

    // Durum filtresi
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

    // Cihaz türü filtresi
    const matchesDevice = deviceFilter === 'all' || ticket.deviceType === deviceFilter;

    // Öncelik filtresi
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesDevice && matchesPriority;
  });

  return (
    <div>
      {/* Top Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>Servis Fişleri & İş Emirleri</h2>
          <p>Tüm arıza kayıtları, onarım süreçleri ve müşteri servis fişleri ({tickets.length} kayıt)</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={onOpenNewTicket}>
            <Plus size={18} />
            <span>Yeni Servis Fişi Aç</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={18} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Fiş no, müşteri adı, telefon, marka veya arıza ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select 
            className="form-control" 
            style={{ width: 'auto', minWidth: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Yeni / Beklemede</option>
            <option value="scheduled">Ziyaret Planlandı</option>
            <option value="in_repair">Onarımda</option>
            <option value="waiting_parts">Parça Bekleniyor</option>
            <option value="testing">Test Aşamasında</option>
            <option value="ready">Hazır / Tamamlandı</option>
            <option value="delivered">Teslim Edildi</option>
            <option value="cancelled">İptal</option>
          </select>

          {/* Device Type Filter */}
          <select 
            className="form-control" 
            style={{ width: 'auto', minWidth: '160px' }}
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
          >
            <option value="all">Tüm Cihaz Türleri</option>
            {Object.entries(deviceTypeConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select 
            className="form-control" 
            style={{ width: 'auto', minWidth: '130px' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Tüm Öncelikler</option>
            <option value="urgent">Acil</option>
            <option value="normal">Normal</option>
            <option value="low">Düşük</option>
          </select>

          {/* View Mode Switcher */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            <button 
              className={`btn btn-secondary btn-sm ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              style={{ background: viewMode === 'grid' ? 'var(--primary-light)' : undefined, color: viewMode === 'grid' ? 'var(--primary)' : undefined }}
              title="Kart Görünümü"
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              className={`btn btn-secondary btn-sm ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              style={{ background: viewMode === 'table' ? 'var(--primary-light)' : undefined, color: viewMode === 'table' ? 'var(--primary)' : undefined }}
              title="Tablo Görünümü"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count & Active Filter Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
        <span>Listelenen Fiş Sayısı: <strong>{filteredTickets.length}</strong></span>
        {(searchTerm || statusFilter !== 'all' || deviceFilter !== 'all' || priorityFilter !== 'all') && (
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDeviceFilter('all');
              setPriorityFilter('all');
            }}
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Wrench size={48} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Servis Fişi Bulunamadı</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
            Arama kriterlerinize uyan bir servis kaydı bulunamadı veya henüz fiş oluşturulmadı.
          </p>
          <button className="btn btn-primary" onClick={onOpenNewTicket}>
            <Plus size={16} />
            <span>Yeni Fiş Oluştur</span>
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredTickets.length > 0 && (
        <div className="ticket-grid">
          {filteredTickets.map(ticket => {
            const statusInfo = ticketStatusConfig[ticket.status];
            const priorityInfo = priorityConfig[ticket.priority];
            const paymentInfo = paymentStatusConfig[ticket.paymentStatus];
            const device = deviceTypeConfig[ticket.deviceType];

            return (
              <div 
                key={ticket.id}
                className="card ticket-card"
                style={{ '--ticket-status-color': statusInfo.color } as React.CSSProperties}
                onClick={() => onSelectTicket(ticket)}
              >
                {/* Header */}
                <div className="ticket-header">
                  <div>
                    <span className="ticket-number">{ticket.ticketNumber}</span>
                    <div className="ticket-device" style={{ marginTop: '2px' }}>
                      {ticket.brand} {ticket.model}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className="badge" style={{ background: priorityInfo.bg, color: priorityInfo.color }}>
                      {priorityInfo.label}
                    </span>
                    <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                      <span className="badge-dot" />
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Device Type Pill & Warranty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <span className="badge" style={{ background: device.bg, color: device.color }}>
                    {device.label}
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>
                    {ticket.warrantyStatus === 'warranty' ? 'Garanti Dahili' : 'Ücretli / Özel Servis'}
                  </span>
                </div>

                {/* Reported Fault */}
                <div className="ticket-fault">
                  <strong style={{ color: 'var(--text-main)' }}>Şikayet: </strong>
                  {ticket.reportedFault}
                </div>

                {/* Diagnosis / Notes Preview if available */}
                {ticket.technicianDiagnosis && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Teşhis:</strong> {ticket.technicianDiagnosis}
                  </div>
                )}

                {/* Schedule info if any */}
                {ticket.scheduledDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--amber)' }}>
                    <Calendar size={14} />
                    <span>Randevu: {ticket.scheduledDate} ({ticket.scheduledTimeSlot || 'Saat Belirtilmedi'})</span>
                  </div>
                )}

                {/* Customer Info & Amount */}
                <div className="ticket-customer-info">
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ticket.customerName}</div>
                    <div style={{ fontSize: '0.78rem' }}>{ticket.customerPhone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="ticket-amount">{formatCurrency(ticket.totalAmount)}</div>
                    <span className="badge" style={{ background: paymentInfo.bg, color: paymentInfo.color, padding: '2px 8px', fontSize: '0.72rem' }}>
                      {paymentInfo.label}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a 
                      href={`tel:${ticket.customerPhone}`}
                      className="btn btn-secondary btn-sm"
                      title="Müşteriyi Doğrudan Ara"
                    >
                      <Phone size={14} />
                      <span>Ara</span>
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
                      title="WhatsApp Durum Mesajı Gönder"
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </a>

                    <a 
                      href={generateGroupWhatsAppLink(ticket, shopName)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Ustalar WhatsApp Grubuna Paylaş"
                      style={{ color: '#25d366' }}
                    >
                      <Users size={14} />
                      <span>Gruba At</span>
                    </a>
                  </div>

                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onPrintTicket(ticket)}
                    title="Servis Fişi / Makbuz Yazdır"
                  >
                    <Printer size={14} />
                    <span>Yazdır</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && filteredTickets.length > 0 && (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fiş No</th>
                <th>Müşteri</th>
                <th>Cihaz</th>
                <th>Şikayet</th>
                <th>Durum</th>
                <th>Tarih</th>
                <th>Tutar</th>
                <th>Ödeme</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(ticket => {
                const statusInfo = ticketStatusConfig[ticket.status];
                const paymentInfo = paymentStatusConfig[ticket.paymentStatus];

                return (
                  <tr key={ticket.id} style={{ cursor: 'pointer' }} onClick={() => onSelectTicket(ticket)}>
                    <td>
                      <span className="ticket-number">{ticket.ticketNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ticket.customerName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{ticket.customerPhone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ticket.brand} {ticket.model}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {deviceTypeConfig[ticket.deviceType].label}
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ticket.reportedFault}
                    </td>
                    <td>
                      <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                        <span className="badge-dot" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {formatDate(ticket.createdAt)}
                      </span>
                    </td>
                    <td>
                      <strong>{formatCurrency(ticket.totalAmount)}</strong>
                    </td>
                    <td>
                      <span className="badge" style={{ background: paymentInfo.bg, color: paymentInfo.color }}>
                        {paymentInfo.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <a 
                          href={`tel:${ticket.customerPhone}`}
                          className="btn btn-secondary btn-sm"
                          title="Ara"
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
                          title="WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </a>
                        <a 
                          href={generateGroupWhatsAppLink(ticket, shopName)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          title="Ustalar WhatsApp Grubuna Paylaş"
                          style={{ color: '#25d366' }}
                        >
                          <Users size={14} />
                        </a>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => onPrintTicket(ticket)}
                          title="Yazdır"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
