import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  CreditCard,
  Banknote,
  Building2,
  X,
  Check
} from 'lucide-react';
import { CashTransaction, PaymentMethod } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';

interface AccountingViewProps {
  transactions: CashTransaction[];
  onAddTransaction: (tx: Omit<CashTransaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('Servis Tahsilatı');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Hesaplamalar
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Lütfen geçerli bir tutar giriniz.');
      return;
    }
    if (!description.trim()) {
      alert('Lütfen açıklama giriniz.');
      return;
    }

    onAddTransaction({
      type,
      category,
      amount: numAmount,
      date: new Date().toISOString(),
      description: description.trim(),
      paymentMethod,
    });

    setIsModalOpen(false);
    setAmount('');
    setDescription('');
  };

  return (
    <div>
      {/* Top Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>Kasa & Muhasebe Takibi</h2>
          <p>Dükkan nakit akışı, servis tahsilatları, parça alım giderleri ve net kâr durumu</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Yeni Gelir / Gider Ekle</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #10b981, #34d399)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <ArrowUpRight size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: '#10b981' }}>{formatCurrency(totalIncome)}</h3>
            <p>Toplam Gelir / Tahsilat</p>
          </div>
        </div>

        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #ef4444, #f87171)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <ArrowDownRight size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: '#ef4444' }}>{formatCurrency(totalExpense)}</h3>
            <p>Toplam Gider / Harcama</p>
          </div>
        </div>

        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #3b82f6, #60a5fa)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Wallet size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: netBalance >= 0 ? '#3b82f6' : '#ef4444' }}>
              {formatCurrency(netBalance)}
            </h3>
            <p>Net Kasa Durumu</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          className={`btn btn-secondary btn-sm ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
          style={{ background: filterType === 'all' ? 'var(--primary-light)' : undefined, color: filterType === 'all' ? 'var(--primary)' : undefined }}
        >
          Tüm Hareketler ({transactions.length})
        </button>
        <button 
          className={`btn btn-secondary btn-sm ${filterType === 'income' ? 'active' : ''}`}
          onClick={() => setFilterType('income')}
          style={{ background: filterType === 'income' ? 'rgba(16, 185, 129, 0.15)' : undefined, color: filterType === 'income' ? '#10b981' : undefined }}
        >
          Sadece Gelirler
        </button>
        <button 
          className={`btn btn-secondary btn-sm ${filterType === 'expense' ? 'active' : ''}`}
          onClick={() => setFilterType('expense')}
          style={{ background: filterType === 'expense' ? 'rgba(239, 68, 68, 0.15)' : undefined, color: filterType === 'expense' ? '#ef4444' : undefined }}
        >
          Sadece Giderler
        </button>
      </div>

      {/* Transactions Table */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Tür</th>
              <th>Kategori</th>
              <th>Açıklama</th>
              <th>Tarih</th>
              <th>Ödeme Şekli</th>
              <th>Tutar</th>
              <th style={{ textAlign: 'right' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Henüz kasa hareketi kaydedilmemiş.
                </td>
              </tr>
            ) : (
              filteredTransactions.map(tx => {
                const isIncome = tx.type === 'income';

                return (
                  <tr key={tx.id}>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          background: isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                          color: isIncome ? '#10b981' : '#ef4444' 
                        }}
                      >
                        {isIncome ? '+ Gelir' : '- Gider'}
                      </span>
                    </td>
                    <td>
                      <strong>{tx.category}</strong>
                    </td>
                    <td style={{ maxWidth: '300px' }}>{tx.description}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      {formatDate(tx.date)}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {tx.paymentMethod === 'cash' ? 'Nakit' : tx.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Havale/EFT'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '1rem', color: isIncome ? '#10b981' : '#ef4444' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => {
                          if (confirm('Bu kasa hareketini silmek istediğinize emin misiniz?')) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        title="Hareketi Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Transaction Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Yeni Kasa Hareketi Ekle</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Gelir / Gider Switcher */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: type === 'income' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                      background: type === 'income' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: type === 'income' ? '#10b981' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setType('income');
                      setCategory('Servis Tahsilatı');
                    }}
                  >
                    + Gelir Girişi
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: type === 'expense' ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
                      background: type === 'expense' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                      color: type === 'expense' ? '#ef4444' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setType('expense');
                      setCategory('Yedek Parça Alımı');
                    }}
                  >
                    - Gider Çıkışı
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kategori</label>
                  <select 
                    className="form-control"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {type === 'income' ? (
                      <>
                        <option value="Servis Tahsilatı">Servis Tahsilatı</option>
                        <option value="Yedek Parça Satışı">Yedek Parça Satışı</option>
                        <option value="Montaj & Kurulum">Montaj & Kurulum</option>
                        <option value="Diğer Gelir">Diğer Gelir</option>
                      </>
                    ) : (
                      <>
                        <option value="Yedek Parça Alımı">Yedek Parça Alımı (Toptancı)</option>
                        <option value="Servis Aracı Yakıt">Servis Aracı Yakıt / Benzin</option>
                        <option value="Dükkan Kirası">Dükkan Kirası</option>
                        <option value="Faturalar (Elektrik/Su/İnternet)">Faturalar (Elektrik/Su/İnternet)</option>
                        <option value="Personel & Yemek">Personel & Yemek</option>
                        <option value="Alet & Ekipman">Takım / Ekipman Alımı</option>
                        <option value="Diğer Gider">Diğer Gider</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tutar (TL) *</label>
                  <input 
                    type="number" 
                    required 
                    min={1} 
                    className="form-control" 
                    placeholder="Örn: 850"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Açıklama *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="Örn: Arçelik pompa motoru toptancı alımı"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ödeme Yöntemi</label>
                  <select 
                    className="form-control"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="cash">Nakit Kasa</option>
                    <option value="credit_card">Kredi Kartı / POS</option>
                    <option value="bank_transfer">Banka Havale / EFT</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} />
                  <span>Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
