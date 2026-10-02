import React, { useState, useEffect } from 'react';
import { Menu, PlusCircle, Wrench, Smartphone, Monitor, LogOut, RefreshCw, Sparkles, Laptop } from 'lucide-react';
import { ShopSettings } from '../types';
import { AuthUser } from '../utils/auth';
import { UpdateNotificationModal } from './UpdateNotificationModal';
import { ElectronUpdateInfo } from '../types/electron';

interface NavbarProps {
  onToggleMenu: () => void;
  onOpenNewTicket: () => void;
  settings: ShopSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLiveConnected: boolean;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  connectionState?: 'online' | 'offline' | 'syncing';
  pendingQueueCount?: number;
  onTriggerSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMenu,
  onOpenNewTicket,
  settings,
  activeTab,
  setActiveTab,
  isLiveConnected,
  currentUser,
  onLogout,
  connectionState = 'online',
  pendingQueueCount = 0,
  onTriggerSync,
}) => {
  const isTechMode = activeTab === 'technician';
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<ElectronUpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.getVersionInfo().then((info) => {
        if (info?.version) setDesktopVersion(info.version);
      }).catch(() => {});

      const unsub = window.electronAPI.onUpdateAvailable((info) => {
        setAvailableUpdate(info);
      });

      return () => {
        unsub();
      };
    }
  }, []);

  const handleManualCheck = async () => {
    if (!window.electronAPI) return;
    setIsCheckingUpdate(true);
    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res.hasUpdate) {
        setAvailableUpdate(res);
        setShowUpdateModal(true);
      } else {
        alert(res.offline ? 'İnternet bağlantısı yok, çevrimdışı moddasınız.' : `Uygulamanız en güncel sürümde (v${res.currentVersion}).`);
      }
    } catch (e: any) {
      alert('Güncelleme kontrolü başarısız: ' + (e?.message || 'Bilinmeyen hata'));
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <header 
      className="mobile-header no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        borderRadius: 'var(--radius-md)',
        flexWrap: 'wrap',
        gap: '10px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!isTechMode && currentUser?.role !== 'technician' && (
          <button 
            onClick={onToggleMenu} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Menüyü Aç"
          >
            <Menu size={24} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={20} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{settings.shopName}</span>
          {isTechMode && (
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '2px 8px', 
              borderRadius: 'var(--radius-pill)', 
              background: 'rgba(59, 130, 246, 0.15)', 
              color: 'var(--primary)',
              fontWeight: 700
            }}>
              Saha Ekibi
            </span>
          )}
        </div>

        {/* Canlı Bağlantı Rozeti & Manuel Senkronizasyon Butonu */}
        <button 
          type="button"
          onClick={onTriggerSync}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.72rem', 
            padding: '3px 10px', 
            borderRadius: 'var(--radius-pill)', 
            background: connectionState === 'online' 
              ? 'rgba(16, 185, 129, 0.15)' 
              : connectionState === 'syncing'
              ? 'rgba(59, 130, 246, 0.18)'
              : 'rgba(245, 158, 11, 0.18)',
            color: connectionState === 'online' 
              ? '#10b981' 
              : connectionState === 'syncing'
              ? '#3b82f6'
              : '#f59e0b',
            fontWeight: 600,
            border: '1px solid ' + (connectionState === 'online' ? 'rgba(16, 185, 129, 0.3)' : connectionState === 'syncing' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'),
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title={
            connectionState === 'online' 
              ? '🟢 Çevrimiçi: MySQL ile anlık eşitleniyor. Tıklayarak verileri tazeleyebilirsiniz.' 
              : connectionState === 'syncing'
              ? '🔄 Eşitleniyor: Çevrimdışı yapılan işlemler MySQL veritabanına aktarılıyor...'
              : `🟠 Çevrimdışı (Yerel Mod): İnternet bağlantısı yok. ${pendingQueueCount} bekleyen işlem var. İnternet gelince otomatik aktarılacak.`
          }
        >
          <span 
            style={{ 
              width: '7px', 
              height: '7px', 
              borderRadius: '50%', 
              background: connectionState === 'online' ? '#10b981' : connectionState === 'syncing' ? '#3b82f6' : '#f59e0b',
              boxShadow: connectionState === 'online' ? '0 0 6px #10b981' : 'none'
            }} 
          />
          <span>
            {connectionState === 'online' 
              ? 'MySQL Canlı' 
              : connectionState === 'syncing'
              ? 'Eşitleniyor...'
              : `Çevrimdışı (${pendingQueueCount})`}
          </span>
        </button>

        {/* Canlı Yenileme Butonu (Masaüstü & Electron) */}
        <button
          type="button"
          onClick={onTriggerSync}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '0.74rem',
            fontWeight: 700,
            borderRadius: 'var(--radius-pill)',
            background: connectionState === 'syncing' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            color: connectionState === 'syncing' ? 'var(--primary)' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Tüm verileri MySQL ile tazelemek için tıklayın (Kısayol: F5 veya Ctrl+R)"
        >
          <RefreshCw size={13} className={connectionState === 'syncing' ? 'spin-animation' : ''} />
          <span>{connectionState === 'syncing' ? 'Eşitleniyor...' : 'Yenile'}</span>
          <span style={{ fontSize: '0.62rem', opacity: 0.6, background: 'rgba(255, 255, 255, 0.12)', padding: '1px 4px', borderRadius: '4px' }}>F5</span>
        </button>

        {/* Masaüstü Sürüm & Otomatik Güncelleme Rozeti */}
        {desktopVersion && (
          <button
            type="button"
            onClick={availableUpdate ? () => setShowUpdateModal(true) : handleManualCheck}
            disabled={isCheckingUpdate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-pill)',
              background: availableUpdate 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25))' 
                : 'rgba(255, 255, 255, 0.05)',
              color: availableUpdate ? '#34d399' : '#94a3b8',
              border: availableUpdate ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: availableUpdate ? '0 0 12px rgba(16, 185, 129, 0.35)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={availableUpdate ? `🚀 Yeni sürüm hazır (v${availableUpdate.newVersion}). Yüklemek için tıklayın.` : `Masaüstü Uygulaması (v${desktopVersion}). Güncellemeleri denetlemek için tıklayın.`}
          >
            {availableUpdate ? <Sparkles size={13} color="#34d399" /> : <Laptop size={13} />}
            <span>
              {isCheckingUpdate 
                ? 'Denetleniyor...' 
                : availableUpdate 
                ? `Yeni Sürüm (v${availableUpdate.newVersion})` 
                : `Masaüstü v${desktopVersion}`}
            </span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Sadece Ofis Yöneticisi Saha Önizlemesine Geçebilir - Usta Ofise Geçemez */}
        {!isTechMode && currentUser?.role !== 'technician' && (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-main)'
              }}
              onClick={() => setActiveTab('technician')}
            >
              <Smartphone size={15} />
              <span>Saha Usta Ekranı</span>
            </button>

            <button 
              className="btn btn-primary btn-sm"
              onClick={onOpenNewTicket}
              style={{ padding: '6px 12px' }}
            >
              <PlusCircle size={16} />
              <span>Yeni Fiş</span>
            </button>
          </>
        )}

        {currentUser && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: '#f43f5e',
              background: 'rgba(244, 63, 94, 0.08)',
              borderColor: 'rgba(244, 63, 94, 0.2)'
            }}
          >
            <LogOut size={15} />
            <span style={{ display: isTechMode ? 'none' : 'inline' }}>Çıkış</span>
          </button>
        )}
      </div>

      {/* Otomatik Güncelleme Bildirim ve Yükleme Modalı */}
      {showUpdateModal && availableUpdate && (
        <UpdateNotificationModal
          isOpen={showUpdateModal}
          updateInfo={availableUpdate}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </header>
  );
};
