import React, { useState, useEffect } from 'react';
import { Download, Sparkles, RefreshCw, X, CheckCircle, AlertCircle, Laptop } from 'lucide-react';
import { ElectronUpdateInfo, ElectronUpdateProgress } from '../types/electron';

interface UpdateNotificationModalProps {
  updateInfo: ElectronUpdateInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  updateInfo,
  isOpen,
  onClose,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<ElectronUpdateProgress>({ percent: 0 });
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubs = window.electronAPI.onUpdateProgress((p) => {
      setProgress(p);
    });

    return () => {
      unsubs();
    };
  }, []);

  if (!isOpen || !updateInfo) return null;

  const handleStartUpdate = async () => {
    if (!window.electronAPI) return;

    setIsUpdating(true);
    setErrorMsg(null);
    setProgress({ percent: 10, message: 'İndirme işlemi başlatılıyor...' });

    try {
      const res = await window.electronAPI.downloadAndInstallUpdate(updateInfo);
      if (res.success) {
        setIsCompleted(true);
        setProgress({ percent: 100, message: 'Güncelleme başarıyla kuruldu!' });
      } else {
        throw new Error('Güncelleme uygulanamadı.');
      }
    } catch (err: any) {
      console.error('Güncelleme hatası:', err);
      setErrorMsg(err.message || 'Güncelleme indirilirken bir hata oluştu.');
      setIsUpdating(false);
    }
  };

  const handleRestart = async () => {
    if (window.electronAPI) {
      await window.electronAPI.restartAndApplyUpdate();
    } else {
      window.location.reload();
    }
  };

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div 
        className="modal-content animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(145deg, #0e1526, #090d16)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(59, 130, 246, 0.2)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Üst Başlık Şeridi */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(30, 41, 59, 0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(6, 182, 212, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                border: '1px solid rgba(59, 130, 246, 0.4)'
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                ServisPro Güncellemesi
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Masaüstü Uygulama Merkezi
              </span>
            </div>
          </div>

          {!isUpdating && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Gövde */}
        <div style={{ padding: '20px' }}>
          {/* Sürüm Karşılaştırma Rozetleri */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Mevcut Sürüm
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#cbd5e1' }}>
                v{updateInfo.currentVersion}
              </div>
            </div>

            <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '1.1rem' }}>
              ➔
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>
                Yeni Sürüm
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                v{updateInfo.newVersion || '1.0.1'}
              </div>
            </div>
          </div>

          {/* Sürüm Notları */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Yenilikler & Değişiklikler:
            </div>
            <div 
              style={{
                fontSize: '0.82rem',
                color: '#e2e8f0',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '10px 12px',
                lineHeight: '1.45',
                maxHeight: '100px',
                overflowY: 'auto'
              }}
            >
              {updateInfo.releaseNotes || 'Saha ve ofis ergonomi geliştirmeleri, otomatik güncelleme altyapısı ve hata düzeltmeleri.'}
            </div>
          </div>

          {/* İlerleme Çubuğu */}
          {isUpdating && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px', color: '#94a3b8' }}>
                <span>{progress.message || 'İndiriliyor...'}</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>%{progress.percent}</span>
              </div>
              <div 
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  padding: '1px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div 
                  style={{
                    height: '100%',
                    width: `${progress.percent}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #10b981)',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Hata Mesajı */}
          {errorMsg && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.8rem',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Başarılı Kurulum Mesajı */}
          {isCompleted && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '16px'
              }}
            >
              <CheckCircle size={18} />
              <span>Güncelleme hazır! Uygulamayı yenileyerek yeni sürüme geçebilirsiniz.</span>
            </div>
          )}

          {/* Aksiyon Butonları */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            {!isCompleted ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onClose}
                  disabled={isUpdating}
                  style={{ opacity: isUpdating ? 0.5 : 1 }}
                >
                  Daha Sonra
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleStartUpdate}
                  disabled={isUpdating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #2563eb, #0891b2)',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw size={15} className="spin-animation" />
                      <span>Güncelleniyor (%{progress.percent})</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>Şimdi Güncelle</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRestart}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                  justifyContent: 'center',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}
              >
                <RefreshCw size={16} />
                <span>Uygulamayı Yenile ve Başlat</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
