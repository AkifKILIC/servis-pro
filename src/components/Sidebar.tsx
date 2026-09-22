import React from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Package, 
  Wallet, 
  Settings, 
  PlusCircle, 
  Sun, 
  Moon,
  Sparkles,
  Smartphone,
  LogOut
} from 'lucide-react';
import { ShopSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openNewTicketModal: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  settings: ShopSettings;
  pendingCount: number;
  urgentCount: number;
  lowStockCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  connectionState?: 'online' | 'offline' | 'syncing';
  pendingQueueCount?: number;
  onTriggerSync?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openNewTicketModal,
  theme,
  toggleTheme,
  settings,
  pendingCount,
  urgentCount,
  lowStockCount,
  isOpen,
  setIsOpen,
  connectionState = 'online',
  pendingQueueCount = 0,
  onTriggerSync,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
    { 
      id: 'technician', 
      label: 'Saha Usta Modu', 
      icon: Smartphone, 
      badge: 'iPhone',
      badgeDanger: false
    },
    { 
      id: 'tickets', 
      label: 'Servis Fişleri', 
      icon: Wrench, 
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeDanger: urgentCount > 0
    },
    { id: 'customers', label: 'Müşteriler', icon: Users },
    { 
      id: 'inventory', 
      label: 'Yedek Parça & Stok', 
      icon: Package,
      badge: lowStockCount > 0 ? `! ${lowStockCount}` : undefined,
      badgeDanger: true
    },
    { id: 'accounting', label: 'Kasa & Muhasebe', icon: Wallet },
    { id: 'settings', label: 'Ayarlar & Profil', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth <= 900) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 35, background: 'rgba(0,0,0,0.5)' }} 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-icon-box">
            <Wrench size={24} />
          </div>
          <div className="brand-text">
            <h1>ServisPro</h1>
            <span>{settings.shopName.slice(0, 20)}</span>
          </div>
        </div>

        {/* Quick Action Button */}
        <div style={{ padding: '16px 16px 4px 16px' }}>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            onClick={() => {
              openNewTicketModal();
              if (window.innerWidth <= 900) setIsOpen(false);
            }}
          >
            <PlusCircle size={18} />
            <span>Yeni Servis Fişi</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`nav-badge ${item.badgeDanger ? 'danger' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Area */}
        <div className="sidebar-footer">
          {/* Bağlantı & Senkronizasyon Durumu */}
          <button
            type="button"
            onClick={onTriggerSync}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: connectionState === 'online' 
                ? 'rgba(16, 185, 129, 0.1)' 
                : connectionState === 'syncing'
                ? 'rgba(59, 130, 246, 0.12)'
                : 'rgba(245, 158, 11, 0.12)',
              border: '1px solid ' + (connectionState === 'online' ? 'rgba(16, 185, 129, 0.25)' : connectionState === 'syncing' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.25)'),
              color: connectionState === 'online' ? '#10b981' : connectionState === 'syncing' ? '#3b82f6' : '#f59e0b',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '8px',
              transition: 'all 0.2s ease'
            }}
            title="Senkronizasyon durumunu yenilemek için tıklayın"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span 
                style={{ 
                  width: '8px', 
                  height: '8px', 
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
                  : 'Çevrimdışı Mod'}
              </span>
            </span>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
              {connectionState === 'online' ? 'Bağlı' : connectionState === 'syncing' ? 'Aktarılıyor' : `${pendingQueueCount} Bekliyor`}
            </span>
          </button>

          <button className="theme-toggle-btn" onClick={toggleTheme}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              {theme === 'dark' ? 'Karanlık Mod' : 'Aydınlık Mod'}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Değiştir</span>
          </button>

          {onLogout && (
            <button 
              type="button" 
              className="theme-toggle-btn" 
              onClick={onLogout}
              style={{
                marginTop: '6px',
                color: '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.08)'
              }}
              title="Oturumu Kapat"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogOut size={16} color="#ef4444" />
                <span>Çıkış Yap</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: '#ef4444', opacity: 0.85 }}>Kapat</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-dim)', padding: '4px 0' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span>{settings.shopOwner}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
