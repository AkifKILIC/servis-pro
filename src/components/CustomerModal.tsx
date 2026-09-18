import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Customer } from '../types';

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
  const [city, setCity] = useState(initialCustomer?.city || 'İstanbul');
  const [district, setDistrict] = useState(initialCustomer?.district || '');
  const [neighborhood, setNeighborhood] = useState(initialCustomer?.neighborhood || '');
  const [address, setAddress] = useState(initialCustomer?.address || '');
  const [notes, setNotes] = useState(initialCustomer?.notes || '');

  useEffect(() => {
    if (initialCustomer) {
      setFullName(initialCustomer.fullName);
      setPhone(initialCustomer.phone);
      setCity(initialCustomer.city);
      setDistrict(initialCustomer.district);
      setNeighborhood(initialCustomer.neighborhood || '');
      setAddress(initialCustomer.address);
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
      city: city.trim(),
      district: district.trim(),
      neighborhood: neighborhood.trim(),
      address: address.trim(),
      notes: notes.trim(),
    }, initialCustomer?.id);

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>{initialCustomer ? 'Müşteriyi Düzenle' : 'Yeni Müşteri Kaydı'}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">İlçe</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Örn: Kadıköy"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Şehir</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Örn: İstanbul"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mahalle / Semt</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Örn: Moda"
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Açık Adres (Sokak, Bina, Kat, Daire)</label>
              <textarea 
                className="form-control" 
                rows={2}
                placeholder="Örn: Şair Nefi Sok. Menekşe Apt. No:12 D:4"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
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
