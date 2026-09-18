import React, { useState } from 'react';
import { X, Plus, UserPlus, Check, Sparkles } from 'lucide-react';
import { Customer, ServiceTicket, DeviceType, Priority } from '../types';
import { COMMON_BRANDS, deviceTypeConfig } from '../utils/helpers';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: any, newCustomerData?: any, autoWhatsApp?: boolean) => void;
  customers: Customer[];
  initialTicket?: ServiceTicket | null;
}

const COMMON_FAULTS = [
  'Su boşaltmıyor (Pompa/Tıkanıklık)',
  'Soğutmuyor / Buzdolabı karlanma yapıyor',
  'Sıkmada aşırı ses ve sarsıntı (Kazan/Amortisör)',
  'Suyu ısıtmıyor (Rezistans/Sensör)',
  'Sigorta attırıyor / Elektrik gelmiyor',
  'Altına su akıtıyor (Körük/Hortum)',
  'Klima soğuk üflemiyor (Gaz/Kompresör)',
  'Program takılıyor / Kart hatası veriyor'
];

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customers,
  initialTicket,
}) => {
  if (!isOpen) return null;

  // Form State
  const [isNewCustomer, setIsNewCustomer] = useState(customers.length === 0);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialTicket?.customerId || (customers[0]?.id || ''));

  // Yeni Müşteri Alanları
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCity, setNewCustCity] = useState('İstanbul');
  const [newCustDistrict, setNewCustDistrict] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Fiş Alanları
  const [deviceType, setDeviceType] = useState<DeviceType>(initialTicket?.deviceType || 'washing_machine');
  const [brand, setBrand] = useState(initialTicket?.brand || 'Arçelik');
  const [model, setModel] = useState(initialTicket?.model || '');
  const [serialNumber, setSerialNumber] = useState(initialTicket?.serialNumber || '');
  const [warrantyStatus, setWarrantyStatus] = useState(initialTicket?.warrantyStatus || 'out_of_warranty');
  const [reportedFault, setReportedFault] = useState(initialTicket?.reportedFault || '');
  const [technicianDiagnosis, setTechnicianDiagnosis] = useState(initialTicket?.technicianDiagnosis || '');
  const [priority, setPriority] = useState<Priority>(initialTicket?.priority || 'normal');
  const [scheduledDate, setScheduledDate] = useState(initialTicket?.scheduledDate || '');
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState(initialTicket?.scheduledTimeSlot || '');
  const [laborCost, setLaborCost] = useState(initialTicket?.laborCost?.toString() || '0');
  const [transportCost, setTransportCost] = useState(initialTicket?.transportCost?.toString() || '200');
  const [technicianName] = useState('Saha Ustası');
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
        city: newCustCity.trim(),
        district: newCustDistrict.trim(),
        address: newCustAddress.trim(),
      };
      customerInfo = {
        customerId: '',
        customerName: newCustName.trim(),
        customerPhone: newCustPhone.trim(),
        customerAddress: `${newCustAddress.trim()} ${newCustDistrict.trim()} / ${newCustCity.trim()}`,
      };
    } else {
      const existing = customers.find(c => c.id === selectedCustomerId);
      if (existing) {
        customerInfo = {
          customerId: existing.id,
          customerName: existing.fullName,
          customerPhone: existing.phone,
          customerAddress: `${existing.address} ${existing.district} / ${existing.city}`,
        };
      }
    }

    if (!reportedFault.trim()) {
      alert('Lütfen arıza şikayetini belirtiniz.');
      return;
    }

    const numLabor = parseFloat(laborCost) || 0;
    const numTransport = parseFloat(transportCost) || 0;
    const partsSum = initialTicket?.partsUsed?.reduce((sum, p) => sum + p.totalPrice, 0) || 0;
    const totalAmount = numLabor + numTransport + partsSum;

    const ticketData = {
      ...customerInfo,
      deviceType,
      brand,
      model: model.trim() || 'Model Belirtilmedi',
      serialNumber: serialNumber.trim(),
      warrantyStatus,
      reportedFault: reportedFault.trim(),
      technicianDiagnosis: technicianDiagnosis.trim(),
      priority,
      technicianName: technicianName.trim(),
      status: initialTicket?.status || 'pending',
      scheduledDate,
      scheduledTimeSlot,
      partsUsed: initialTicket?.partsUsed || [],
      laborCost: numLabor,
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
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>{initialTicket ? 'Servis Fişini Düzenle' : 'Yeni Servis Fişi Oluştur'}</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Müşteri ve arızalı beyaz eşya bilgilerini eksiksiz doldurunuz.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Müşteri Seçimi / Oluşturma */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Müşteri Bilgileri</span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsNewCustomer(!isNewCustomer)}
                >
                  <UserPlus size={14} />
                  <span>{isNewCustomer ? 'Kayıtlı Müşterilerden Seç' : '+ Yeni Müşteri Tanımla'}</span>
                </button>
              </div>

              {!isNewCustomer ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kayıtlı Müşteri Seçiniz</label>
                  <select 
                    className="form-control"
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} - {c.phone} ({c.district} / {c.city})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Müşteri Adı Soyadı *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="Örn: Mustafa Aydın" 
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
                      <label className="form-label">İlçe</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Örn: Kadıköy" 
                        value={newCustDistrict}
                        onChange={e => setNewCustDistrict(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Şehir</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Örn: İstanbul" 
                        value={newCustCity}
                        onChange={e => setNewCustCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Açık Adres (Mahalle, Sokak, Apt, Daire)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Örn: Moda Cad. Güneş Apt. No:14 D:3" 
                      value={newCustAddress}
                      onChange={e => setNewCustAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Cihaz Türü Seçici */}
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Cihaz Türü *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {Object.entries(deviceTypeConfig).map(([key, cfg]) => {
                  const isSelected = deviceType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDeviceType(key as DeviceType)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                        background: isSelected ? cfg.bg : 'rgba(255,255,255,0.02)',
                        color: isSelected ? cfg.color : 'var(--text-muted)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Marka ve Model */}
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Marka *</label>
                <input 
                  type="text" 
                  required
                  list="brand-list"
                  className="form-control" 
                  placeholder="Seçiniz veya yazınız"
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
                <label className="form-label">Model / Seri Adı</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Örn: 9123 N Inverter / Serie 6" 
                  value={model}
                  onChange={e => setModel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Seri Numarası (Varsa)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Örn: ARC-984421" 
                  value={serialNumber}
                  onChange={e => setSerialNumber(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Garanti Durumu</label>
                <select 
                  className="form-control"
                  value={warrantyStatus}
                  onChange={e => setWarrantyStatus(e.target.value as any)}
                >
                  <option value="out_of_warranty">Garanti Dışı / Ücretli Servis</option>
                  <option value="special_warranty">Dükkan Özel Garantisi</option>
                  <option value="warranty">Resmi Garanti Kapsamında</option>
                </select>
              </div>
            </div>

            {/* 4. Arıza ve Şikayet */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label">Müşteri Şikayeti / Bildirilen Arıza *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Hızlı arıza etiketleri:</span>
              </div>
              
              {/* Quick tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {COMMON_FAULTS.slice(0, 4).map(fault => (
                  <button
                    key={fault}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                    onClick={() => setReportedFault(prev => prev ? `${prev}, ${fault}` : fault)}
                  >
                    + {fault.split('(')[0].trim()}
                  </button>
                ))}
              </div>

              <textarea 
                required
                className="form-control" 
                placeholder="Örn: Cihaz çalışıyor fakat su tahliyesine geçmiyor, pompa motorundan inilti sesi geliyor."
                rows={3}
                value={reportedFault}
                onChange={e => setReportedFault(e.target.value)}
              />
            </div>

            {/* 5. Usta Teşhisi ve Notu */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Usta Ön Teşhisi & Atölye Notu (Opsiyonel)</label>
              <textarea 
                className="form-control" 
                placeholder="Örn: Tahliye pompası tıkalı ya da yanık olabilir. Körük lastiği kontrol edilecek."
                rows={2}
                value={technicianDiagnosis}
                onChange={e => setTechnicianDiagnosis(e.target.value)}
              />
            </div>

            {/* 6. Görevli Usta (Tek Usta Sistemi) */}
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Görevli Usta</label>
                <div style={{ 
                  padding: '9px 12px', 
                  background: 'rgba(99, 102, 241, 0.1)', 
                  border: '1px solid rgba(99, 102, 241, 0.25)', 
                  borderRadius: 'var(--radius-sm)', 
                  fontSize: '0.85rem', 
                  color: 'var(--primary)', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px' 
                }}>
                  <span>🔧 Saha Ustası (Otomatik Atanır)</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Öncelik Seviyesi</label>
                <select 
                  className="form-control"
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Acil (Aynı Gün Ziyaret)</option>
                  <option value="low">Düşük / Rutin</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Randevu Tarihi</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Saat Aralığı</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Örn: 14:00 - 16:00"
                  value={scheduledTimeSlot}
                  onChange={e => setScheduledTimeSlot(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Servis & Yol Bedeli (TL)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={transportCost}
                  onChange={e => setTransportCost(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Otomatik Ustaya Bildirim & Fırlatma Kutusu */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.08) 100%)', 
            borderTop: '1px solid var(--border-subtle)', 
            padding: '12px 24px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', color: '#10b981', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={autoNotifyPhone} 
                onChange={e => setAutoNotifyPhone(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: '#10b981' }} 
              />
              <span>🚨 Kaydedildiği anda ustanın telefonuna canlı sesli bildirim & zil fırlat</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', color: '#25d366', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={autoOpenWhatsApp} 
                onChange={e => setAutoOpenWhatsApp(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: '#25d366' }} 
              />
              <span>💬 Kaydedildiği anda ustanın WhatsApp'ına iş detayını da otomatik fırlat</span>
            </label>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={18} />
              <span>{initialTicket ? 'Değişiklikleri Kaydet' : 'Servis Fişini Aç ve Ustaya Gönder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
