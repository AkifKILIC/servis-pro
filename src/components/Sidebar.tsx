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
  Smartphone
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
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              {theme === 'dark' ? 'Karanlık Mod' : 'Aydınlık Mod'}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Değiştir</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-dim)', padding: '4px 0' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span>{settings.shopOwner}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
