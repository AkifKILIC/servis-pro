import React from 'react';
import { Menu, PlusCircle, Wrench, Smartphone, Monitor, LogOut } from 'lucide-react';
import { ShopSettings } from '../types';
import { AuthUser } from '../utils/auth';

interface NavbarProps {
  onToggleMenu: () => void;
  onOpenNewTicket: () => void;
  settings: ShopSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLiveConnected: boolean;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
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
}) => {
  const isTechMode = activeTab === 'technician';

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

        {/* Canlı Bağlantı Rozeti */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.72rem', 
            padding: '2px 8px', 
            borderRadius: 'var(--radius-pill)', 
            background: isLiveConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
            color: isLiveConnected ? '#10b981' : 'var(--text-dim)',
            fontWeight: 600
          }}
          title={isLiveConnected ? 'PC ve iPhone arasında canlı eşitleme aktif' : 'Yerel mod / Çevrimdışı'}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isLiveConnected ? '#10b981' : '#64748b' }} />
          <span>{isLiveConnected ? 'Canlı Eşitleniyor' : 'Yerel Mod'}</span>
        </div>
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
    </header>
  );
};
