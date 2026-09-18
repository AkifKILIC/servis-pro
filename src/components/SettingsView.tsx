import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  Building, 
  Phone, 
  MessageSquare, 
  FileText, 
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { ShopSettings } from '../types';
import { storage } from '../services/storage';

interface SettingsViewProps {
  settings: ShopSettings;
  onSaveSettings: (newSettings: ShopSettings) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetData,
}) => {
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // JSON Yedek İndir
  const handleExport = () => {
    const jsonStr = storage.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `servispro_yedek_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON Yedekten Yükle
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (confirm('Yedekten yükleme yapılacak. Mevcut kayıtlarınız güncellenecektir. Devam etmek istiyor musunuz?')) {
          const ok = storage.importFullBackup(content);
          if (ok) {
            alert('Yedek başarıyla geri yüklendi! Sayfa yenilenecektir.');
            window.location.reload();
          } else {
            alert('Yedek dosyası okunamadı veya biçimi hatalı.');
          }
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>Dükkan Ayarları & Veri Yedekleme</h2>
          <p>Dükkan profili, fiş metinleri, garanti koşulları ve veri güvenliği</p>
        </div>
      </div>

      {savedSuccess && (
        <div 
          className="card" 
          style={{ 
            marginBottom: '20px', 
            background: 'rgba(16, 185, 129, 0.1)', 
            borderColor: 'rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <CheckCircle2 size={20} />
          <span>Ayarlar başarıyla kaydedildi!</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
        {/* Settings Form */}
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={20} color="var(--primary)" />
              Teknik Servis Dükkan Bilgileri
            </h3>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Dükkan / İşletme Adı *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  value={formData.shopName}
                  onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Usta / Yetkili Adı *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  value={formData.shopOwner}
                  onChange={e => setFormData({ ...formData, shopOwner: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Telefon Numarası *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">WhatsApp Bildirim Numarası *</label>
                <input 
                  type="text" 
                  required 
                  className="form-control" 
                  placeholder="905XXXXXXXXX"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">İlçe</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.district}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Şehir</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Dükkan Açık Adresi</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Vergi / Sicil Numarası (Varsa)</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.taxNumber || ''}
                onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>

            <hr style={{ borderColor: 'var(--border-subtle)' }} />

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--emerald)" />
              Servis Fişi & Garanti Koşulları Metni
            </h3>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Resmi Garanti Şartları (Fişin altında yazar)</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={formData.warrantyTerms}
                onChange={e => setFormData({ ...formData, warrantyTerms: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fiş Altı İletişim / Teşekkür Notu</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.receiptFooterNote}
                onChange={e => setFormData({ ...formData, receiptFooterNote: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={18} />
                <span>Ayarları Kaydet</span>
              </button>
            </div>
          </div>
        </form>

        {/* Right Pane: Backup & Factory Reset */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Data Backup Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} color="var(--primary)" />
              Tam Veri Yedekleme
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Tüm servis fişlerini, müşterileri, yedek parçaları ve kasa kayıtlarınızı tek tıkla bilgisayarınıza güvenle kaydedin.
            </p>

            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ width: '100%', marginBottom: '14px' }}
              onClick={handleExport}
            >
              <Download size={16} />
              <span>Yedek Dosyasını İndir (.JSON)</span>
            </button>

            <label className="btn btn-secondary" style={{ width: '100%', cursor: 'pointer' }}>
              <Upload size={16} />
              <span>Yedekten Geri Yükle</span>
              <input 
                type="file" 
                accept=".json" 
                style={{ display: 'none' }} 
                onChange={handleImport} 
              />
            </label>
          </div>

          {/* Reset Card */}
          <div className="card" style={{ padding: '20px', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} />
              Örnek Verilere Dön
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Test etmek veya sistemi ilk haline getirmek isterseniz hazır örnek beyaz eşya servis kayıtlarını tekrar yükleyebilirsiniz.
            </p>

            <button 
              type="button" 
              className="btn btn-danger" 
              style={{ width: '100%' }}
              onClick={() => {
                if (confirm('Tüm mevcut veriler sıfırlanacak ve başlangıç örnek beyaz eşya verileri yüklenecektir. Onaylıyor musunuz?')) {
                  onResetData();
                  alert('Örnek veriler başarıyla yüklendi.');
                }
              }}
            >
              <RotateCcw size={16} />
              <span>Örnek Verileri Sıfırla & Yükle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
