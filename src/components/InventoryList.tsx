import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  PlusCircle, 
  MinusCircle, 
  Edit3, 
  Trash2,
  DollarSign
} from 'lucide-react';
import { SparePart } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';

interface InventoryListProps {
  parts: SparePart[];
  onOpenNewPart: () => void;
  onEditPart: (part: SparePart) => void;
  onDeletePart: (id: string) => void;
  onAdjustStock: (partId: string, amount: number) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  parts,
  onOpenNewPart,
  onEditPart,
  onDeletePart,
  onAdjustStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  // Kategorileri topla
  const categories = Array.from(new Set(parts.map(p => p.category))).filter(Boolean);

  // Filtreleme
  const filteredParts = parts.filter(part => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      part.name.toLowerCase().includes(term) ||
      part.code.toLowerCase().includes(term) ||
      part.compatibleBrands.some(b => b.toLowerCase().includes(term)) ||
      (part.location && part.location.toLowerCase().includes(term));

    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;
    const matchesLowStock = !onlyLowStock || part.quantity <= part.minStockLevel;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Metrikler
  const totalItemsCount = parts.reduce((sum, p) => sum + p.quantity, 0);
  const totalCostValue = parts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
  const totalSaleValue = parts.reduce((sum, p) => sum + (p.salePrice * p.quantity), 0);
  const lowStockCount = parts.filter(p => p.quantity <= p.minStockLevel).length;

  return (
    <div>
      {/* Top Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>Yedek Parça & Stok Yönetimi</h2>
          <p>Atölye ve dükkandaki yedek parça stokları, kritik seviyeler ve parça maliyetleri</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={onOpenNewPart}>
            <Plus size={18} />
            <span>Yeni Yedek Parça Ekle</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #3b82f6, #60a5fa)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Package size={24} />
          </div>
          <div className="metric-data">
            <h3>{parts.length} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-dim)' }}>çeşit ({totalItemsCount} adet)</span></h3>
            <p>Toplam Parça Stoğu</p>
          </div>
        </div>

        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #ef4444, #f87171)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: lowStockCount > 0 ? '#ef4444' : 'inherit' }}>{lowStockCount}</h3>
            <p>Kritik Seviyedeki Parçalar</p>
          </div>
        </div>

        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #10b981, #34d399)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ fontSize: '1.45rem', color: '#10b981' }}>{formatCurrency(totalCostValue)}</h3>
            <p>Toplam Stok Maliyeti (Alış)</p>
          </div>
        </div>

        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #a855f7, #c084fc)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <DollarSign size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ fontSize: '1.45rem', color: '#a855f7' }}>{formatCurrency(totalSaleValue)}</h3>
            <p>Potansiyel Satış Değeri</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input-wrapper">
            <Search size={18} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Parça adı, kodu veya uyumlu marka ara..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="form-control"
            style={{ width: 'auto', minWidth: '180px' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button 
            type="button"
            className={`btn btn-secondary ${onlyLowStock ? 'active' : ''}`}
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            style={{ 
              background: onlyLowStock ? 'rgba(239, 68, 68, 0.2)' : undefined, 
              color: onlyLowStock ? '#ef4444' : undefined,
              borderColor: onlyLowStock ? '#ef4444' : undefined 
            }}
          >
            <AlertTriangle size={16} />
            <span>Sadece Kritik Stokları Göster ({lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* Parts Table */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Parça Adı & Kodu</th>
              <th>Kategori</th>
              <th>Uyumlu Markalar</th>
              <th>Raf / Konum</th>
              <th style={{ textAlign: 'center' }}>Mevcut Stok</th>
              <th>Alış Fiyatı</th>
              <th>Satış Fiyatı</th>
              <th style={{ textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Arama kriterlerine uyan parça bulunamadı.
                </td>
              </tr>
            ) : (
              filteredParts.map(part => {
                const isLow = part.quantity <= part.minStockLevel;

                return (
                  <tr key={part.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{part.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                        {part.code}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                        {part.category}
                      </span>
                    </td>
                    <td style={{ maxWidth: '180px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {part.compatibleBrands.join(', ')}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      {part.location || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '2px 6px' }}
                          onClick={() => onAdjustStock(part.id, -1)}
                          title="1 Adet Azalt"
                        >
                          <MinusCircle size={14} />
                        </button>
                        
                        <span 
                          style={{ 
                            fontWeight: 800, 
                            fontSize: '1rem', 
                            color: isLow ? '#ef4444' : 'var(--text-main)',
                            minWidth: '28px'
                          }}
                        >
                          {part.quantity}
                        </span>

                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '2px 6px' }}
                          onClick={() => onAdjustStock(part.id, 1)}
                          title="1 Adet Ekle"
                        >
                          <PlusCircle size={14} />
                        </button>
                      </div>

                      {isLow && (
                        <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>
                          Kritik Sınır ({part.minStockLevel})
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-dim)' }}>{formatCurrency(part.purchasePrice)}</td>
                    <td><strong style={{ color: 'var(--emerald)' }}>{formatCurrency(part.salePrice)}</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditPart(part)}
                          title="Parçayı Düzenle"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (confirm(`${part.name} parçasını silmek istediğinize emin misiniz?`)) {
                              onDeletePart(part.id);
                            }
                          }}
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
