import React from 'react';
import { X, Printer, Wrench } from 'lucide-react';
import { ServiceTicket, ShopSettings } from '../types';
import { formatCurrency, formatDate, formatDateOnly, deviceTypeConfig } from '../utils/helpers';

interface PrintReceiptProps {
  ticket: ServiceTicket | null;
  settings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({
  ticket,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const device = deviceTypeConfig[ticket.deviceType];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '800px', background: '#ffffff', color: '#0f172a' }}
      >
        {/* Action Bar (Hides in Print) */}
        <div 
          className="no-print" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 20px', 
            background: '#f8fafc', 
            borderBottom: '1px solid #e2e8f0' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} color="#2563eb" />
            <strong style={{ fontSize: '0.95rem' }}>Servis Fişi / Makbuz Önizleme</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={16} />
              <span>Yazdır (A4 / Termal)</span>
            </button>
            <button className="close-btn" onClick={onClose} style={{ color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div 
          className="printable-receipt" 
          style={{ 
            padding: '36px 40px', 
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#1e293b',
            lineHeight: 1.5,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                {settings.shopName}
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                {settings.address} - {settings.district} / {settings.city}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                Tel: <strong>{settings.phone}</strong> | WhatsApp: <strong>{settings.whatsapp}</strong>
              </div>
              {settings.taxNumber && (
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Vergi / Sicil No: {settings.taxNumber}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ background: '#0f172a', color: '#ffffff', padding: '6px 14px', borderRadius: '4px', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                SERVİS FİŞİ
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.9rem', fontWeight: 700, color: '#2563eb' }}>
                {ticket.ticketNumber}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Tarih: {formatDate(ticket.createdAt)}
              </div>
            </div>
          </div>

          {/* Customer & Device Information Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Customer Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                MÜŞTERİ BİLGİLERİ
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{ticket.customerName}</div>
              <div style={{ fontSize: '0.86rem', color: '#334155', marginTop: '2px' }}>Tel: <strong>{ticket.customerPhone}</strong></div>
              <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '4px' }}>Adres: {ticket.customerAddress}</div>
            </div>

            {/* Device Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                CİHAZ BİLGİLERİ
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                {ticket.brand} {ticket.model}
              </div>
              <div style={{ fontSize: '0.86rem', color: '#334155', marginTop: '2px' }}>
                Cihaz Türü: <strong>{device.label}</strong>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '2px' }}>
                Seri No: {ticket.serialNumber || 'Belirtilmedi'} | Garanti: {ticket.warrantyStatus === 'warranty' ? 'Garantili' : 'Özel Servis'}
              </div>
            </div>
          </div>

          {/* Fault & Diagnosis */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Müşteri Şikayeti / Bildirilen Arıza: </strong>
              <span style={{ fontSize: '0.88rem', color: '#334155' }}>{ticket.reportedFault}</span>
            </div>
            {ticket.technicianDiagnosis && (
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#2563eb' }}>Usta Teşhisi & Yapılan İşlem: </strong>
                <span style={{ fontSize: '0.88rem', color: '#334155' }}>{ticket.technicianDiagnosis}</span>
              </div>
            )}
          </div>

          {/* Parts & Services Table */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '8px' }}>
              İŞLEM VE YEDEK PARÇA DÖKÜMÜ
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Açıklama / Yedek Parça</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', width: '80px' }}>Adet</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', width: '120px' }}>Birim Fiyat</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', width: '130px' }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {/* Parçalar */}
                {ticket.partsUsed.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong>{p.partName}</strong>
                      {p.partCode && <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>Kod: {p.partCode}</span>}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>{p.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>{formatCurrency(p.unitPrice)}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}><strong>{formatCurrency(p.totalPrice)}</strong></td>
                  </tr>
                ))}

                {/* İşçilik Bedeli */}
                {ticket.laborCost > 0 && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>Uzman Teknik İşçilik ve Bakım Hizmeti</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>1</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>{formatCurrency(ticket.laborCost)}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}><strong>{formatCurrency(ticket.laborCost)}</strong></td>
                  </tr>
                )}

                {/* Yol / Servis Bedeli */}
                {ticket.transportCost > 0 && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>Adrese Servis ve Yol Hizmet Bedeli</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>1</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>{formatCurrency(ticket.transportCost)}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}><strong>{formatCurrency(ticket.transportCost)}</strong></td>
                  </tr>
                )}

                {/* İndirim Varsa */}
                {ticket.discount > 0 && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#16a34a' }}>
                    <td style={{ padding: '10px 12px' }}>Uygulanan Özel İndirim</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>-</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>-</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}><strong>-{formatCurrency(ticket.discount)}</strong></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Box */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
            <div style={{ width: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                <span>Toplam Tutar:</span>
                <strong>{formatCurrency(ticket.totalAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                <span>Ödeme Durumu:</span>
                <strong style={{ color: ticket.paymentStatus === 'paid' ? '#16a34a' : '#ea580c' }}>
                  {ticket.paymentStatus === 'paid' ? `Tahsil Edildi (${ticket.paymentMethod || 'Nakit'})` : 'Ödeme Bekliyor'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                <span>ÖDENECEK:</span>
                <span>{ticket.paymentStatus === 'paid' ? '0,00 ₺' : formatCurrency(ticket.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Warranty Terms Box */}
          <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '12px 16px', fontSize: '0.78rem', color: '#475569', marginBottom: '32px' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>GARANTİ VE HİZMET ŞARTLARI:</div>
            <div>{settings.warrantyTerms}</div>
            <div style={{ marginTop: '4px', fontStyle: 'italic' }}>{settings.receiptFooterNote}</div>
          </div>

          {/* Signature Lines */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', paddingTop: '10px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '50px' }}>
                HİZMETİ TESLİM ALAN MÜŞTERİ
              </div>
              <div style={{ borderTop: '1px solid #94a3b8', width: '80%', margin: '0 auto', paddingTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                İmza / Tarih
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '50px' }}>
                TEKNİK SERVİS YETKİLİSİ
              </div>
              <div style={{ borderTop: '1px solid #94a3b8', width: '80%', margin: '0 auto', paddingTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                {settings.shopOwner} / Kaşe - İmza
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
