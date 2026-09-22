import React, { useState } from 'react';
import { X, UserPlus, Check, Sparkles, Calendar, Clock, MapPin, Phone, User, Wrench } from 'lucide-react';
import { Customer, ServiceTicket, DeviceType, Priority } from '../types';
import { COMMON_BRANDS, deviceTypeConfig, getLocalDateString } from '../utils/helpers';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: any, newCustomerData?: any, autoWhatsApp?: boolean) => void;
  customers: Customer[];
  initialTicket?: ServiceTicket | null;
}

const COMMON_FAULTS = [
  'Su boşaltmıyor / Pompa tıkalı',
  'Soğutmuyor / Karlanma yapıyor',
  'Sıkmada aşırı ses ve sarsıntı',
  'Suyu ısıtmıyor / Rezistans',
  'Sigorta attırıyor',
  'Altına su akıtıyor',
  'Klima soğuk üflemiyor',
  'Program kartı takılıyor'
];

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customers,
  initialTicket,
}) => {
  if (!isOpen) return null;

  const todayStr = getLocalDateString();

  // Form State
  const [isNewCustomer, setIsNewCustomer] = useState(customers.length === 0);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialTicket?.customerId || (customers[0]?.id || ''));

  // Yeni Müşteri Alanları
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustDistrict, setNewCustDistrict] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Fiş Alanları
  const [deviceType, setDeviceType] = useState<DeviceType>(initialTicket?.deviceType || 'washing_machine');
  const [brand, setBrand] = useState(initialTicket?.brand || 'Arçelik');
  const [model, setModel] = useState(initialTicket?.model || '');
  const [reportedFault, setReportedFault] = useState(initialTicket?.reportedFault || '');
  const [priority, setPriority] = useState<Priority>(initialTicket?.priority || 'normal');
  const [scheduledDate, setScheduledDate] = useState(initialTicket?.scheduledDate || todayStr);
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState(initialTicket?.scheduledTimeSlot || '10:00 - 13:00');
  const [transportCost, setTransportCost] = useState(initialTicket?.transportCost?.toString() || '0');
  const [autoNotifyPhone, setAutoNotifyPhone] = useState(true);
  const [autoOpenWhatsApp, setAutoOpenWhatsApp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let customerInfo = {
      customerId: selectedCustomerId,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
    };

    let newCustPayload = undefined;

    if (isNewCustomer) {
      if (!newCustName.trim() || !newCustPhone.trim()) {
        alert('Lütfen müşteri adı ve telefon numarasını giriniz.');
        return;
      }
      newCustPayload = {
        fullName: newCustName.trim(),
        phone: newCustPhone.trim(),
        city: 'İstanbul',
        district: newCustDistrict.trim(),
        address: newCustAddress.trim(),
      };
      customerInfo = {
        customerId: '',
        customerName: newCustName.trim(),
        customerPhone: newCustPhone.trim(),
        customerAddress: newCustDistrict.trim() 
          ? `${newCustAddress.trim()} (${newCustDistrict.trim()})`
          : newCustAddress.trim(),
      };
    } else {
      const existing = customers.find(c => c.id === selectedCustomerId);
      if (existing) {
        customerInfo = {
          customerId: existing.id,
          customerName: existing.fullName,
          customerPhone: existing.phone,
          customerAddress: existing.district ? `${existing.address} (${existing.district})` : existing.address,
        };
      }
    }

    if (!reportedFault.trim()) {
      alert('Lütfen arıza şikayetini belirtiniz.');
      return;
    }

    const numTransport = parseFloat(transportCost) || 0;
    const partsSum = initialTicket?.partsUsed?.reduce((sum, p) => sum + p.totalPrice, 0) || 0;
    const labor = initialTicket?.laborCost || 0;
    const totalAmount = labor + numTransport + partsSum;

    const ticketData = {
      ...customerInfo,
      deviceType,
      brand,
      model: model.trim() || 'Model Belirtilmedi',
      serialNumber: initialTicket?.serialNumber || '',
      warrantyStatus: initialTicket?.warrantyStatus || 'out_of_warranty',
      reportedFault: reportedFault.trim(),
      technicianDiagnosis: initialTicket?.technicianDiagnosis || '',
      priority,
      technicianName: 'Saha Ustası',
      status: initialTicket?.status || 'pending',
      scheduledDate,
      scheduledTimeSlot,
      partsUsed: initialTicket?.partsUsed || [],
      laborCost: labor,
      transportCost: numTransport,
      discount: initialTicket?.discount || 0,
      totalAmount,
      paymentStatus: initialTicket?.paymentStatus || 'unpaid',
      paidAmount: initialTicket?.paidAmount || 0,
    };

    onSubmit(ticketData, newCustPayload, autoOpenWhatsApp);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>{initialTicket ? 'Servis Fişini Düzenle' : 'Hızlı Servis Kaydı'}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Müşteri, cihaz ve arıza bilgilerini girip doğrudan sahaya yönlendirin.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '74vh', overflowY: 'auto' }}>
            
            {/* 1. Müşteri Bilgileri */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} color="var(--primary)" /> Müşteri Bilgileri
                </span>
                {customers.length > 0 && (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                    onClick={() => setIsNewCustomer(!isNewCustomer)}
                  >
                    <UserPlus size={13} />
                    <span>{isNewCustomer ? 'Kayıtlı Müşteri Seç' : '+ Yeni Müşteri'}</span>
                  </button>
                )}
              </div>

              {!isNewCustomer && customers.length > 0 ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select 
                    className="form-control"
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} - {c.phone} {c.district ? `(${c.district})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Adı Soyadı *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="Örn: Ahmet Yılmaz" 
                        value={newCustName}
                        onChange={e => setNewCustName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Telefon Numarası *</label>
                      <input 
                        type="tel" 
                        required 
                        className="form-control" 
                        placeholder="Örn: 0532 123 45 67" 
                        value={newCustPhone}
                        onChange={e => setNewCustPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">İlçe / Bölge</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Örn: Kadıköy / Bostancı" 
                        value={newCustDistrict}
                        onChange={e => setNewCustDistrict(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Açık Adres (Cadde, Sokak, No)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Örn: Bağdat Cad. No: 42 D: 5" 
                        value={newCustAddress}
                        onChange={e => setNewCustAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Cihaz Türü ve Marka */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={16} color="var(--primary)" /> Cihaz Türü *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {Object.entries(deviceTypeConfig).map(([key, cfg]) => {
                  const isSelected = deviceType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDeviceType(key as DeviceType)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                        background: isSelected ? cfg.bg : 'rgba(255,255,255,0.02)',
                        color: isSelected ? cfg.color : 'var(--text-muted)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Marka *</label>
                  <input 
                    type="text" 
                    required
                    list="brand-list"
                    className="form-control" 
                    placeholder="Arçelik, Bosch, Beko..."
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                  />
                  <datalist id="brand-list">
                    {COMMON_BRANDS.map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Model (Opsiyonel)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Örn: 9103 N Inverter" 
                    value={model}
                    onChange={e => setModel(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 3. Arıza Şikayeti */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Arıza / Müşteri Şikayeti *</label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Hızlı Ekle:</span>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {COMMON_FAULTS.slice(0, 4).map(fault => (
                  <button
                    key={fault}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '3px 7px' }}
                    onClick={() => setReportedFault(prev => prev ? `${prev}, ${fault}` : fault)}
                  >
                    + {fault.split('/')[0].trim()}
                  </button>
                ))}
              </div>

              <textarea 
                required
                className="form-control" 
                placeholder="Örn: Cihaz sıkmaya geçmiyor, altından su akıtıyor..."
                rows={2}
                value={reportedFault}
                onChange={e => setReportedFault(e.target.value)}
              />
            </div>

            {/* 4. Randevu Tarihi (Varsayılan Bugün) ve Saat */}
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} color="var(--primary)" /> Randevu Tarihi (Varsayılan: Bugün)
                </label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} color="var(--primary)" /> Ziyaret Saati
                </label>
                <select 
                  className="form-control"
                  value={scheduledTimeSlot}
                  onChange={e => setScheduledTimeSlot(e.target.value)}
                >
                  <option value="10:00 - 13:00">10:00 - 13:00 (Öğleden Önce)</option>
                  <option value="13:00 - 16:00">13:00 - 16:00 (Öğleden Sonra)</option>
                  <option value="16:00 - 19:00">16:00 - 19:00 (Akşam Üstü)</option>
                  <option value="Gün İçi / Esnek">Gün İçi / Esnek Ziyaret</option>
                </select>
              </div>
            </div>

            {/* 5. Bildirim Seçenekleri */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '10px 14px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px' 
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={autoNotifyPhone} 
                  onChange={e => setAutoNotifyPhone(e.target.checked)} 
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }} 
                />
                <span>🚨 Kaydedildiği anda ustanın telefonuna canlı sesli bildirim & zil gönder</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#25d366', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={autoOpenWhatsApp} 
                  onChange={e => setAutoOpenWhatsApp(e.target.checked)} 
                  style={{ width: '16px', height: '16px', accentColor: '#25d366' }} 
                />
                <span>💬 WhatsApp ile Usta Grubuna Fiş Bilgisini Fırlat</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={18} />
              <span>{initialTicket ? 'Değişiklikleri Kaydet' : 'Kaydet ve Ustaya Bildir'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
