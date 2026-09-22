import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Edit3,
  CreditCard,
  Banknote,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
  Wrench,
  Send,
  Users,
  Copy,
  Check,
  BellRing
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { syncService } from '../services/syncService';
import { ServiceTicket, SparePart, TicketStatus, PaymentStatus, PaymentMethod } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  ticketStatusConfig, 
  priorityConfig, 
  deviceTypeConfig, 
  paymentStatusConfig,
  generateWhatsAppLink,
  generateMapsLink,
  generateTechnicianDispatchWhatsAppLink,
  generateGroupWhatsAppLink,
  generateJobCardText
} from '../utils/helpers';

interface TicketDetailModalProps {
  ticket: ServiceTicket | null;
  parts: SparePart[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateTicket: (id: string, updates: Partial<ServiceTicket>) => void;
  onDeleteTicket: (id: string) => void;
  onPrintTicket: (ticket: ServiceTicket) => void;
  onEditTicket: (ticket: ServiceTicket) => void;
  onApprovePayment?: (ticketId: string) => void;
  shopName: string;
  shopPhone: string;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  parts,
  isOpen,
  onClose,
  onUpdateTicket,
  onDeleteTicket,
  onPrintTicket,
  onEditTicket,
  onApprovePayment,
  shopName,
  shopPhone,
}) => {
  if (!isOpen || !ticket) return null;

  const [isAddingPart, setIsAddingPart] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(parts[0]?.id || '');
  const [customPartName, setCustomPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  // Düzenlenebilir maliyetler
  const [laborCost, setLaborCost] = useState(ticket.laborCost);
  const [transportCost, setTransportCost] = useState(ticket.transportCost);
  const [discount, setDiscount] = useState(ticket.discount);
  const [techDiagnosis, setTechDiagnosis] = useState(ticket.technicianDiagnosis || '');

  // Ödeme
  const [payMethod, setPayMethod] = useState<PaymentMethod>(ticket.paymentMethod || 'cash');

  // Parça seçildiğinde varsayılan satış fiyatını getir
  const handlePartSelectChange = (partId: string) => {
    setSelectedPartId(partId);
    const p = parts.find(x => x.id === partId);
    if (p) {
      setPartPrice(p.salePrice);
    }
  };

  // Yeni parça fişe ekle
  const handleAddPartToTicket = () => {
    let newPartItem;
    if (selectedPartId === 'custom') {
      if (!customPartName.trim()) {
        alert('Lütfen parça adını giriniz');
        return;
      }
      newPartItem = {
        id: 'p-item-' + Date.now(),
        partName: customPartName.trim(),
        quantity: partQty,
        unitPrice: partPrice,
        totalPrice: partQty * partPrice,
      };
    } else {
      const p = parts.find(x => x.id === selectedPartId);
      if (!p) return;
      newPartItem = {
        id: 'p-item-' + Date.now(),
        partId: p.id,
        partName: p.name,
        partCode: p.code,
        quantity: partQty,
        unitPrice: partPrice || p.salePrice,
        totalPrice: partQty * (partPrice || p.salePrice),
      };
    }

    const updatedParts = [...ticket.partsUsed, newPartItem];
    const partsTotal = updatedParts.reduce((sum, item) => sum + item.totalPrice, 0);
    const newTotal = (ticket.laborCost || 0) + (ticket.transportCost || 0) + partsTotal - (ticket.discount || 0);

    onUpdateTicket(ticket.id, {
      partsUsed: updatedParts,
      totalAmount: Math.max(0, newTotal),
    });

    setIsAddingPart(false);
    setCustomPartName('');
    setPartQty(1);
  };

  // Fişten parça kaldır
  const handleRemovePart = (partItemId: string) => {
    const updatedParts = ticket.partsUsed.filter(p => p.id !== partItemId);
    const partsTotal = updatedParts.reduce((sum, item) => sum + item.totalPrice, 0);
    const newTotal = (ticket.laborCost || 0) + (ticket.transportCost || 0) + partsTotal - (ticket.discount || 0);

    onUpdateTicket(ticket.id, {
      partsUsed: updatedParts,
      totalAmount: Math.max(0, newTotal),
    });
  };

  // Maliyetleri Kaydet
  const handleSaveCosts = () => {
    const partsTotal = ticket.partsUsed.reduce((sum, item) => sum + item.totalPrice, 0);
    const newTotal = Number(laborCost) + Number(transportCost) + partsTotal - Number(discount);

    onUpdateTicket(ticket.id, {
      laborCost: Number(laborCost),
      transportCost: Number(transportCost),
      discount: Number(discount),
      technicianDiagnosis: techDiagnosis,
      totalAmount: Math.max(0, newTotal),
    });
    alert('Maliyetler ve usta teşhisi başarıyla güncellendi.');
  };

  // Durum Değiştir
  const handleStatusChange = (newStatus: TicketStatus) => {
    onUpdateTicket(ticket.id, { status: newStatus });
    if (newStatus === 'ready' || newStatus === 'delivered') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Hızlı Tahsilat Alındı
  const handleMarkAsPaid = () => {
    onUpdateTicket(ticket.id, {
      paymentStatus: 'paid',
      paymentMethod: payMethod,
      paidAmount: ticket.totalAmount,
    });
    try {
      confetti({ particleCount: 60, spread: 60 });
    } catch {}
  };

  const statusConfig = ticketStatusConfig[ticket.status];
  const priorityInfo = priorityConfig[ticket.priority];
  const paymentInfo = paymentStatusConfig[ticket.paymentStatus];
  const device = deviceTypeConfig[ticket.deviceType];

  const allStatuses: TicketStatus[] = [
    'pending',
    'scheduled',
    'in_repair',
    'waiting_parts',
    'testing',
    'ready',
    'delivered',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '840px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ticket-number" style={{ fontSize: '1.2rem' }}>{ticket.ticketNumber}</span>
                <span className="badge" style={{ background: priorityInfo.bg, color: priorityInfo.color }}>
                  {priorityInfo.label}
                </span>
                <span className="badge" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                  <span className="badge-dot" />
                  {statusConfig.label}
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Açılış: {formatDate(ticket.createdAt)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onPrintTicket(ticket)}
            >
              <Printer size={16} />
              <span>Fiş Yazdır</span>
            </button>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Durum İlerletme Çubuğu (Status Pipeline) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
              İŞ EMRİ AŞAMALARI (Durumu Değiştirmek İçin Tıklayınız):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {allStatuses.map(st => {
                const isCurrent = ticket.status === st;
                const cfg = ticketStatusConfig[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: 'pointer',
                      border: isCurrent ? `2px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                      background: isCurrent ? cfg.bg : 'rgba(255,255,255,0.03)',
                      color: isCurrent ? cfg.color : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {isCurrent && <CheckCircle2 size={13} />}
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Cihaz & Müşteri Kartı */}
          <div className="grid-2">
            {/* Cihaz Bilgileri */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: device.bg, color: device.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{ticket.brand} {ticket.model}</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{device.label}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
                <div><strong>Seri No:</strong> {ticket.serialNumber || 'Belirtilmedi'}</div>
                <div><strong>Garanti:</strong> {ticket.warrantyStatus === 'warranty' ? 'Garanti Kapsamında' : 'Garanti Dışı / Ücretli'}</div>
                {ticket.scheduledDate && (
                  <div style={{ color: 'var(--amber)' }}>
                    <strong>Randevu:</strong> {ticket.scheduledDate} {ticket.scheduledTimeSlot || ''}
                  </div>
                )}
                <div style={{ marginTop: '6px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                  <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>Müşteri Şikayeti:</strong>
                  {ticket.reportedFault}
                </div>
              </div>
            </div>

            {/* Müşteri İletişim Kartı */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>{ticket.customerName}</h4>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <div>Telefon: <strong>{ticket.customerPhone}</strong></div>
                <div style={{ marginTop: '4px' }}>Adres: {ticket.customerAddress}</div>
              </div>

              {/* Müşteri İletişim Aksiyonları */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <a 
                  href={`tel:${ticket.customerPhone}`} 
                  className="btn btn-secondary btn-sm"
                >
                  <Phone size={14} />
                  <span>Hemen Ara</span>
                </a>
                <a 
                  href={generateMapsLink(ticket.customerAddress, '', '')} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <MapPin size={14} />
                  <span>Haritada Aç</span>
                </a>
              </div>

              {/* WhatsApp Hazır Şablonları */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  WHATSAPP BİLDİRİM ŞABLONLARI:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
                    style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                  >
                    <MessageSquare size={13} />
                    <span>Kayıt Alındı</span>
                  </a>

                  <a
                    href={generateWhatsAppLink(ticket.customerPhone, 'estimate', {
                      customerName: ticket.customerName,
                      ticketNumber: ticket.ticketNumber,
                      deviceInfo: `${ticket.brand} ${ticket.model}`,
                      totalAmount: ticket.totalAmount,
                      faultInfo: ticket.technicianDiagnosis || ticket.reportedFault,
                      shopName,
                      shopPhone
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                  >
                    <MessageSquare size={13} />
                    <span>Fiyat Onayı İste</span>
                  </a>

                  <a
                    href={generateWhatsAppLink(ticket.customerPhone, 'ready', {
                      customerName: ticket.customerName,
                      ticketNumber: ticket.ticketNumber,
                      deviceInfo: `${ticket.brand} ${ticket.model}`,
                      totalAmount: ticket.totalAmount,
                      shopName,
                      shopPhone
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                  >
                    <MessageSquare size={13} />
                    <span>Cihaz Hazır Mesajı</span>
                  </a>
                </div>
              </div>

              {/* Ustaya Gönderim ve Anlık Bildirim Alanı (Tek Usta Sistemi) */}
              <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wrench size={16} color="var(--primary)" />
                    <strong style={{ color: 'var(--primary)', fontSize: '0.86rem' }}>USTAYA İŞİ GÖNDER & BİLDİRİM FIRLAT</strong>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Saha Ustası iPhone</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {/* Buton 1: Doğrudan Telefona Bildirim Fırlat (Zil Çal) */}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)', fontWeight: 700, padding: '7px 12px' }}
                    onClick={async () => {
                      await syncService.sendTechnicianAlert(ticket);
                      alert(`🔔 "${ticket.ticketNumber}" iş emri ustanın iPhone telefonuna bildirim ve zil sesi olarak fırlatıldı!`);
                    }}
                    title="Ustanın telefonuna anlık sesli bildirim yollar ve uygulamayı açtırır"
                  >
                    <BellRing size={14} />
                    <span>🔔 Ustanın Telefonuna Gönder (Zil Çal)</span>
                  </button>

                  {/* Buton 2: WhatsApp ile Ustaya Paylaş */}
                  <a
                    href={generateTechnicianDispatchWhatsAppLink(shopPhone, ticket, shopName)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp btn-sm"
                    style={{ fontWeight: 700, padding: '7px 12px' }}
                    title="WhatsApp üzerinden ustanın telefonuna tüm fiş detaylarını iletir"
                  >
                    <Send size={14} />
                    <span>💬 Ustaya WhatsApp ile Gönder</span>
                  </a>

                  {/* Buton 3: İş Metnini Kopyala */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '7px 12px' }}
                    onClick={() => {
                      const text = generateJobCardText(ticket, shopName);
                      navigator.clipboard.writeText(text);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2500);
                    }}
                  >
                    {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{isCopied ? 'İş Metni Kopyalandı!' : '📋 İş Metnini Kopyala'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Usta Teşhisi ve Notlar */}
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Usta / Atölye Teşhis ve İşlem Notu</h4>
            <textarea 
              className="form-control" 
              rows={2}
              placeholder="Yapılan testler, tespit edilen sorunlar ve uygulanan işlemler..."
              value={techDiagnosis}
              onChange={e => setTechDiagnosis(e.target.value)}
            />
          </div>

          {/* 4. Değişen Yedek Parçalar Listesi */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Kullanılan / Değişen Yedek Parçalar</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Fişe eklenen orijinal parçalar otomatik stoktan düşer.
                </p>
              </div>
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsAddingPart(!isAddingPart);
                  if (parts.length > 0) {
                    setPartPrice(parts[0].salePrice);
                  }
                }}
              >
                <Plus size={14} />
                <span>{isAddingPart ? 'Kapat' : 'Parça Ekle'}</span>
              </button>
            </div>

            {/* Parça Ekleme Alanı */}
            {isAddingPart && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px', marginBottom: '14px' }}>
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Stoktaki Yedek Parça</label>
                    <select 
                      className="form-control"
                      value={selectedPartId}
                      onChange={e => handlePartSelectChange(e.target.value)}
                    >
                      <option value="custom">+ Serbest / Özel Parça Gir</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatCurrency(p.salePrice)} - Stok: {p.quantity} adet)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPartId === 'custom' && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Özel Parça Adı</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Örn: Özel Kart Tamir Kiti"
                        value={customPartName}
                        onChange={e => setCustomPartName(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Adet</label>
                    <input 
                      type="number" 
                      min={1} 
                      className="form-control" 
                      value={partQty}
                      onChange={e => setPartQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Birim Satış Fiyatı (TL)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={partPrice}
                      onChange={e => setPartPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddPartToTicket}>
                    Fişe Ekle ve Stoğu Güncelle
                  </button>
                </div>
              </div>
            )}

            {/* Parça Tablosu */}
            {ticket.partsUsed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                Bu fişe henüz yedek parça eklenmedi (Sadece servis/işçilik).
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Parça Adı</th>
                      <th>Adet</th>
                      <th>Birim Fiyat</th>
                      <th>Toplam</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticket.partsUsed.map(item => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.partName}</strong>
                          {item.partCode && <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>{item.partCode}</span>}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td><strong>{formatCurrency(item.totalPrice)}</strong></td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => handleRemovePart(item.id)}
                            title="Parçayı Fişten Çıkar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. Maliyetler, İndirim ve Ödeme Alanı */}
          <div className="card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>Maliyet ve Hesap Dökümü</h4>
            
            <div className="cost-inputs-grid" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">İşçilik Bedeli (TL)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={laborCost}
                  onChange={e => setLaborCost(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Servis / Yol (TL)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={transportCost}
                  onChange={e => setTransportCost(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">İndirim (TL)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={handleSaveCosts}>
                  Maliyetleri Güncelle
                </button>
              </div>
            </div>

            {/* Toplam ve Ödeme Durumu Çubuğu */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>GENEL TOPLAM TUTAR:</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {formatCurrency(ticket.totalAmount)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {ticket.paymentStatus === 'pending_approval' ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    gap: '12px',
                    background: 'rgba(245, 158, 11, 0.14)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '12px',
                    padding: '8px 14px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b' }}>
                          ⏳ Saha Tahsilatı: {formatCurrency(ticket.paidAmount || ticket.totalAmount)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Yöntem: {ticket.paymentMethod === 'cash' ? 'Nakit' : ticket.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Havale'} • Ofis Onayı Bekliyor
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      style={{ 
                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                        border: 'none', 
                        fontWeight: 800,
                        padding: '9px 14px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                      }}
                      onClick={() => {
                        if (onApprovePayment) {
                          onApprovePayment(ticket.id);
                        } else {
                          handleMarkAsPaid();
                        }
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Tahsilatı Onayla & Kasaya İşle</span>
                    </button>
                  </div>
                ) : ticket.paymentStatus === 'paid' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald)' }}>
                    <CheckCircle2 size={24} />
                    <div>
                      <strong>Tahsil Edildi ({formatCurrency(ticket.paidAmount || ticket.totalAmount)})</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Yöntem: {ticket.paymentMethod === 'cash' ? 'Nakit' : ticket.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Havale/EFT'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select 
                      className="form-control"
                      style={{ width: 'auto' }}
                      value={payMethod}
                      onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                    >
                      <option value="cash">Nakit</option>
                      <option value="credit_card">Kredi Kartı / POS</option>
                      <option value="bank_transfer">Havale / EFT</option>
                    </select>

                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => {
                        if (onApprovePayment) {
                          onApprovePayment(ticket.id);
                        } else {
                          handleMarkAsPaid();
                        }
                      }}
                    >
                      <Banknote size={16} />
                      <span>Tahsilatı Tamamla</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={() => {
              if (confirm('Bu servis fişini silmek istediğinize emin misiniz?')) {
                onDeleteTicket(ticket.id);
                onClose();
              }
            }}
          >
            <Trash2 size={16} />
            <span>Fişi Sil</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                onClose();
                onEditTicket(ticket);
              }}
            >
              <Edit3 size={16} />
              <span>Fiş Bilgilerini Düzenle</span>
            </button>

            <button type="button" className="btn btn-primary" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
