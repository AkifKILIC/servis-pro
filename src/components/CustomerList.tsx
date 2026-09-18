import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Phone, 
  MessageSquare, 
  MapPin, 
  User, 
  Wrench, 
  Calendar,
  Trash2,
  Edit3
} from 'lucide-react';
import { Customer, ServiceTicket } from '../types';
import { formatDate, formatCurrency, generateWhatsAppLink, generateMapsLink } from '../utils/helpers';

interface CustomerListProps {
  customers: Customer[];
  tickets: ServiceTicket[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onSelectTicket: (ticket: ServiceTicket) => void;
  shopName: string;
  shopPhone: string;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  tickets,
  onOpenNewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onSelectTicket,
  shopName,
  shopPhone,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.district.toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term) ||
      c.address.toLowerCase().includes(term)
    );
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustId);
  const customerTickets = tickets.filter(t => t.customerId === selectedCustId || t.customerPhone === selectedCustomer?.phone);

  return (
    <div>
      {/* Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>Müşteri Rehberi & Kayıtları</h2>
          <p>Kayıtlı tüm müşteriler, telefonları, adresleri ve geçmiş servis işlemleri ({customers.length} müşteri)</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={onOpenNewCustomer}>
            <Plus size={18} />
            <span>Yeni Müşteri Ekle</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div className="search-input-wrapper" style={{ width: '100%' }}>
          <Search size={18} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Müşteri adı, telefon numarası veya adres ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Customer List */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Müşteri Listesi</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{filteredCustomers.length} Müşteri</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCustomers.map(customer => {
              const custTickets = tickets.filter(t => t.customerId === customer.id || t.customerPhone === customer.phone);
              const totalSpent = custTickets.filter(t => t.paymentStatus === 'paid').reduce((sum, t) => sum + (t.paidAmount || t.totalAmount), 0);
              const isSelected = selectedCustId === customer.id;

              return (
                <div 
                  key={customer.id}
                  className="card"
                  style={{
                    padding: '14px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                  onClick={() => setSelectedCustId(customer.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {customer.fullName.charAt(0)}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.96rem' }}>{customer.fullName}</strong>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                          {customer.district} / {customer.city}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                        {custTickets.length} Servis Kaydı
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    <strong>Tel: </strong> {customer.phone}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong>Adres: </strong> {customer.address}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <a href={`tel:${customer.phone}`} className="btn btn-secondary btn-sm" title="Ara">
                        <Phone size={13} />
                      </a>
                      <a 
                        href={`https://api.whatsapp.com/send?phone=${customer.phone.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn btn-whatsapp btn-sm"
                        title="WhatsApp"
                      >
                        <MessageSquare size={13} />
                      </a>
                      <a 
                        href={generateMapsLink(customer.address, customer.city, customer.district)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn btn-secondary btn-sm"
                        title="Harita"
                      >
                        <MapPin size={13} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEditCustomer(customer)}
                        title="Düzenle"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (confirm(`${customer.fullName} isimli müşteriyi silmek istediğinize emin misiniz?`)) {
                            onDeleteCustomer(customer.id);
                            if (selectedCustId === customer.id) setSelectedCustId(null);
                          }
                        }}
                        title="Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Customer Detail Pane */}
        {selectedCustomer && (
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedCustomer.fullName}</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Müşteri Geçmişi ve Kayıtları</p>
              </div>
              <button className="close-btn" onClick={() => setSelectedCustId(null)}>
                ×
              </button>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Telefon:</strong> {selectedCustomer.phone}</div>
                <div><strong>Açık Adres:</strong> {selectedCustomer.address} {selectedCustomer.district} / {selectedCustomer.city}</div>
                {selectedCustomer.notes && (
                  <div style={{ color: 'var(--amber)' }}>
                    <strong>Müşteri Notu:</strong> {selectedCustomer.notes}
                  </div>
                )}
                <div><strong>Kayıt Tarihi:</strong> {formatDate(selectedCustomer.createdAt)}</div>
              </div>
            </div>

            {/* Past Tickets */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={16} color="var(--primary)" />
              Geçmiş Servis Fişleri ({customerTickets.length})
            </h4>

            {customerTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                Bu müşteriye ait servis fişi bulunamadı.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {customerTickets.map(t => (
                  <div 
                    key={t.id}
                    className="card"
                    style={{ padding: '12px 14px', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.03)' }}
                    onClick={() => onSelectTicket(t)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span className="ticket-number">{t.ticketNumber}</span>
                      <strong>{formatCurrency(t.totalAmount)}</strong>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.brand} {t.model}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t.reportedFault}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Tarih: {formatDate(t.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
