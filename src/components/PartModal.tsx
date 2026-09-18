import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { SparePart } from '../types';
import { COMMON_BRANDS } from '../utils/helpers';

interface PartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (partData: Omit<SparePart, 'id' | 'updatedAt'>, id?: string) => void;
  initialPart?: SparePart | null;
}

const COMMON_CATEGORIES = [
  'Tahliye Pompaları',
  'Rezistanslar & Isıtıcılar',
  'Mekanik & Amortisörler',
  'Elektronik Kartlar & Sensörler',
  'Körük & Conta Lastikleri',
  'Ventiller & Su Giriş',
  'Soğutma Gazları',
  'Termostatlar',
  'Motor & Kömürler',
  'Diğer Parçalar'
];

export const PartModal: React.FC<PartModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialPart,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(initialPart?.name || '');
  const [code, setCode] = useState(initialPart?.code || '');
  const [category, setCategory] = useState(initialPart?.category || COMMON_CATEGORIES[0]);
  const [compatibleBrandsStr, setCompatibleBrandsStr] = useState(initialPart?.compatibleBrands.join(', ') || 'Arçelik, Beko');
  const [quantity, setQuantity] = useState(initialPart?.quantity?.toString() || '5');
  const [minStockLevel, setMinStockLevel] = useState(initialPart?.minStockLevel?.toString() || '3');
  const [purchasePrice, setPurchasePrice] = useState(initialPart?.purchasePrice?.toString() || '150');
  const [salePrice, setSalePrice] = useState(initialPart?.salePrice?.toString() || '400');
  const [location, setLocation] = useState(initialPart?.location || 'Raf A-1');

  useEffect(() => {
    if (initialPart) {
      setName(initialPart.name);
      setCode(initialPart.code);
      setCategory(initialPart.category);
      setCompatibleBrandsStr(initialPart.compatibleBrands.join(', '));
      setQuantity(initialPart.quantity.toString());
      setMinStockLevel(initialPart.minStockLevel.toString());
      setPurchasePrice(initialPart.purchasePrice.toString());
      setSalePrice(initialPart.salePrice.toString());
      setLocation(initialPart.location || '');
    }
  }, [initialPart]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Lütfen parça adını giriniz.');
      return;
    }

    const brands = compatibleBrandsStr
      .split(',')
      .map(b => b.trim())
      .filter(Boolean);

    onSubmit({
      name: name.trim(),
      code: code.trim() || 'PRT-' + Math.floor(1000 + Math.random() * 9000),
      category,
      compatibleBrands: brands.length > 0 ? brands : ['Tüm Markalar'],
      quantity: parseInt(quantity) || 0,
      minStockLevel: parseInt(minStockLevel) || 1,
      purchasePrice: parseFloat(purchasePrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      location: location.trim(),
    }, initialPart?.id);

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3>{initialPart ? 'Yedek Parçayı Düzenle' : 'Yeni Yedek Parça Tanımla'}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Parça Adı *</label>
              <input 
                type="text" 
                required 
                className="form-control" 
                placeholder="Örn: Beko Bulaşık Makinesi Sirkülasyon Motoru"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Parça Kodu / Barkod</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Örn: MTR-BEK-04"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kategori</label>
                <select 
                  className="form-control"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {COMMON_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Uyumlu Markalar (Virgülle ayırarak yazınız)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Örn: Arçelik, Beko, Altus"
                value={compatibleBrandsStr}
                onChange={e => setCompatibleBrandsStr(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mevcut Stok Adedi *</label>
                <input 
                  type="number" 
                  required
                  min={0}
                  className="form-control" 
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kritik Stok Uyarı Sınırı</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  className="form-control" 
                  value={minStockLevel}
                  onChange={e => setMinStockLevel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Alış Fiyatı (TL)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Müşteri Satış Fiyatı (TL) *</label>
                <input 
                  type="number" 
                  required
                  className="form-control" 
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Dükkandaki Raf / Kutu Konumu</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Örn: Raf C-3 veya Kutu No: 12"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={18} />
              <span>{initialPart ? 'Güncelle' : 'Parçayı Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
