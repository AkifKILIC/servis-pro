import React, { useState, useEffect } from 'react';
import { X, MapPin, Building, Home, Check } from 'lucide-react';
import { Customer } from '../types';
import { IZMIR_DISTRICTS, BUCA_NEIGHBORHOODS } from '../utils/helpers';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customer: Omit<Customer, 'id' | 'createdAt'>, id?: string) => void;
  initialCustomer?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialCustomer,
}) => {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState(initialCustomer?.fullName || '');
  const [phone, setPhone] = useState(initialCustomer?.phone || '');
  const [city, setCity] = useState(initialCustomer?.city || 'İzmir');
  const [district, setDistrict] = useState(initialCustomer?.district || 'Buca');
  const [neighborhood, setNeighborhood] = useState(initialCustomer?.neighborhood || '');
  const [address, setAddress] = useState(initialCustomer?.address || '');
  const [notes, setNotes] = useState(initialCustomer?.notes || '');

  useEffect(() => {
    if (initialCustomer) {
      setFullName(initialCustomer.fullName);
      setPhone(initialCustomer.phone);
      setCity(initialCustomer.city || 'İzmir');
      setDistrict(initialCustomer.district || 'Buca');
      setNeighborhood(initialCustomer.neighborhood || '');
      setAddress(initialCustomer.address || '');
      setNotes(initialCustomer.notes || '');
    }
  }, [initialCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Lütfen isim ve telefon giriniz.');
      return;
    }

    onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim(),
      city: city.trim() || 'İzmir',
      district: district.trim() || 'Buca',
      neighborhood: neighborhood.trim(),
      address: address.trim(),
      notes: notes.trim(),
    }, initialCustomer?.id);

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div>
            <h3>{initialCustomer ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Kaydı'}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              İletişim ve ayrıntılı adres bilgilerini eksiksiz giriniz.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Adı Soyadı *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  placeholder="Örn: Ahmet Yılmaz"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Telefon Numarası *</label>
                <input 
                  type="tel" 
                  required 
                  className="form-control" 
                  placeholder="Örn: 0532 111 22 33"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Ayrıntılı Adres Bölümü */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                <MapPin size={15} />
                <span>Adres & Konum Bilgileri</span>
              </div>

              <div className="grid-2" style={{ marginBottom: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">İl</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="İl (Örn: İzmir)"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">İlçe</label>
                  <input 
                    type="text" 
                    list="district-list"
                    className="form-control" 
                    placeholder="İlçe (Örn: Buca)"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                  />
                  <datalist id="district-list">
                    {IZMIR_DISTRICTS.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
              </div>

              {/* Mahalle Alanı */}
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Mahalle / Semt</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Buca Mahalleleri hazır listelenir</span>
                </div>
                <input 
                  type="text" 
                  list="neighborhood-list"
                  className="form-control" 
                  placeholder="Örn: Akıncılar, Şirinyer, Efeler, Yaylacık..."
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                />
                <datalist id="neighborhood-list">
                  {BUCA_NEIGHBORHOODS.map(n => <option key={n} value={n} />)}
                </datalist>

                {/* Hızlı Mahalle Seçim Butonları */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {['Şirinyer', 'Akıncılar', 'Yaylacık', 'Efeler', 'Göksu', 'Güven', 'Çamlıkule', 'Buca Koop'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNeighborhood(m)}
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        border: neighborhood === m ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: neighborhood === m ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: neighborhood === m ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cadde / Sokak / Bina No / Kat / Daire</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  placeholder="Örn: 549 Sokak No:22 Kat:2 Daire:4"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Özel Müşteri Notu (Gelmeden önce ara, zil bozuk vb.)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Örn: Giriş zili arızalı, gelmeden önce arayınız."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={18} />
              <span>{initialCustomer ? 'Güncelle' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
