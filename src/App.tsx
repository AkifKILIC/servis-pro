import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Package, 
  Wallet, 
  Settings, 
  Smartphone,
  BellRing
} from 'lucide-react';
import { storage } from './services/storage';
import { syncService } from './services/syncService';
import { ServiceTicket, Customer, SparePart, CashTransaction, ShopSettings } from './types';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TicketList } from './components/TicketList';
import { TicketModal } from './components/TicketModal';
import { TicketDetailModal } from './components/TicketDetailModal';
import { PrintReceipt } from './components/PrintReceipt';
import { CustomerList } from './components/CustomerList';
import { CustomerModal } from './components/CustomerModal';
import { InventoryList } from './components/InventoryList';
import { PartModal } from './components/PartModal';
import { AccountingView } from './components/AccountingView';
import { SettingsView } from './components/SettingsView';
import { TechnicianMobileView } from './components/TechnicianMobileView';
import { LoginView } from './components/LoginView';
import { registerServiceWorker, showTechnicianJobNotification } from './utils/notifications';
import { AuthUser, getAuthSession, clearAuthSession } from './utils/auth';
import { generateTechnicianDispatchWhatsAppLink } from './utils/helpers';

export const App: React.FC = () => {
  // Aktif Oturum (1 yıl kalıcı çerez)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getAuthSession());

  // URL parametresi kontrolü (?mode=technician veya mobilde açılış)
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode') === 'technician' || window.innerWidth <= 600 ? 'technician' : 'dashboard';

  // State
  const [activeTab, setActiveTab] = useState<string>(
    currentUser?.role === 'technician' ? 'technician' : initialMode
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(storage.getTheme());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [liveNotification, setLiveNotification] = useState<string | null>(null);

  // Veriler
  const [tickets, setTickets] = useState<ServiceTicket[]>(storage.getTickets());
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [parts, setParts] = useState<SparePart[]>(storage.getParts());
  const [transactions, setTransactions] = useState<CashTransaction[]>(storage.getCashTransactions());
  const [settings, setSettings] = useState<ShopSettings>(storage.getSettings());

  // Modallar
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<ServiceTicket | null>(null);

  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<ServiceTicket | null>(null);
  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState<ServiceTicket | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<SparePart | null>(null);

  // Tema Senkronizasyonu
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    storage.saveTheme(theme);
  }, [theme]);

  // Canlı Senkronizasyon Başlatma
  useEffect(() => {
    syncService.connect();
    setIsLiveConnected(true);

    // Sunucudan mevcut son verileri çek ve birleştir
    syncService.pullData().then((serverData) => {
      if (serverData && serverData.tickets && serverData.tickets.length > 0) {
        setTickets(serverData.tickets);
        storage.saveTickets(serverData.tickets);
        if (serverData.customers) {
          setCustomers(serverData.customers);
          storage.saveCustomers(serverData.customers);
        }
        if (serverData.parts) {
          setParts(serverData.parts);
          storage.saveParts(serverData.parts);
        }
        if (serverData.cash) {
          setTransactions(serverData.cash);
          storage.saveCashTransactions(serverData.cash);
        }
      } else {
        // Sunucu henüz boşsa yerel veriyi sunucuya gönder
        syncService.pushFullSync({
          tickets: storage.getTickets(),
          customers: storage.getCustomers(),
          parts: storage.getParts(),
          cash: storage.getCashTransactions(),
          settings: storage.getSettings(),
        });
      }
    });

    // Canlı Olayları Dinle
    const unsubscribe = syncService.subscribe((event) => {
      if (event.type === 'TICKET_UPDATED') {
        const updateData = event.data;
        if (updateData && updateData.id) {
          setTickets((prev) => {
            const idx = prev.findIndex((t) => t.id === updateData.id);
            let newTickets;
            if (idx !== -1) {
              newTickets = [...prev];
              newTickets[idx] = { ...newTickets[idx], ...updateData };
            } else {
              newTickets = [updateData as ServiceTicket, ...prev];
            }
            storage.saveTickets(newTickets);
            return newTickets;
          });

          setLiveNotification(`🔔 ${updateData.ticketNumber || 'Servis Fişi'}: Saha ustası durumu güncelledi!`);
          setTimeout(() => setLiveNotification(null), 5000);
        }
      } else if (event.type === 'NEW_TICKET_ALERT') {
        const alertTicket: ServiceTicket = event.data?.ticket || event.data;
        if (alertTicket && alertTicket.id) {
          setTickets((prev) => {
            const exists = prev.some((t) => t.id === alertTicket.id);
            if (exists) return prev;
            const newTickets = [alertTicket, ...prev];
            storage.saveTickets(newTickets);
            return newTickets;
          });

          // Zili ve kilit ekranı uyarısını SADECE usta cihazında / mobil ekranda çal!
          // Ofisteki bilgisayarda kendi açtığı iş için usta alarmı çalmaz
          const isTechnicianDevice = 
            (typeof window !== 'undefined' && window.innerWidth < 768) ||
            window.location.search.includes('technician') ||
            (currentUser?.role === 'technician');

          if (isTechnicianDevice) {
            showTechnicianJobNotification(alertTicket);
            setLiveNotification(`🚨 YENİ İŞ EMRİ: ${alertTicket.ticketNumber} - ${alertTicket.customerName}`);
          } else {
            setLiveNotification(`✅ Ustayla Paylaşıldı: ${alertTicket.ticketNumber} - ${alertTicket.customerName}`);
          }
          setTimeout(() => setLiveNotification(null), 8000);
        }
      } else if (event.type === 'FULL_SYNC') {
        if (event.data?.tickets && Array.isArray(event.data.tickets)) {
          setTickets(event.data.tickets);
          storage.saveTickets(event.data.tickets);
        }
        if (event.data?.customers && Array.isArray(event.data.customers)) {
          setCustomers(event.data.customers);
          storage.saveCustomers(event.data.customers);
        }
        if (event.data?.parts && Array.isArray(event.data.parts)) {
          setParts(event.data.parts);
          storage.saveParts(event.data.parts);
        }
      }
    });

    registerServiceWorker();

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Oturum İşlemleri
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'technician') {
      setActiveTab('technician');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Oturumu kapatmak istediğinize emin misiniz?')) {
      clearAuthSession();
      setCurrentUser(null);
    }
  };

  // Fiş İşlemleri - "Kayıt oluşturulduğu gibi ustaya atsın"
  const handleSaveTicket = (ticketData: any, newCustPayload?: any, autoWhatsApp?: boolean) => {
    if (newCustPayload) {
      const createdCust = storage.addCustomer(newCustPayload);
      const newCusts = storage.getCustomers();
      setCustomers(newCusts);
      ticketData.customerId = createdCust.id;
    }

    let savedTicket;
    if (ticketToEdit) {
      savedTicket = storage.updateTicket(ticketToEdit.id, ticketData);
    } else {
      savedTicket = storage.addTicket(ticketData);
    }

    const updatedTickets = storage.getTickets();
    setTickets(updatedTickets);
    setParts(storage.getParts());
    setTransactions(storage.getCashTransactions());
    setIsTicketModalOpen(false);
    setTicketToEdit(null);

    // Canlı sunucuya aktar
    syncService.pushFullSync({
      tickets: updatedTickets,
      customers: storage.getCustomers(),
      parts: storage.getParts(),
      cash: storage.getCashTransactions(),
      settings: storage.getSettings(),
    });

    // USTANIN TELEFONUNA ANINDA SESLİ BİLDİRİM & ZİL FIRLAT ("Kayıt oluşturulduğu gibi ustaya atsın")
    if (savedTicket) {
      syncService.sendTechnicianAlert(savedTicket);
      setLiveNotification(`🚨 "${savedTicket.ticketNumber}" iş emri oluşturuldu ve anında ustanın telefonuna iletildi!`);
      setTimeout(() => setLiveNotification(null), 6000);

      // Eğer WhatsApp fırlatma da seçildiyse ustanın WhatsApp'ına otomatik aç
      if (autoWhatsApp) {
        try {
          const waLink = generateTechnicianDispatchWhatsAppLink(settings.phone, savedTicket, settings.shopName);
          window.open(waLink, '_blank');
        } catch (err) {
          console.warn('WhatsApp açılamadı:', err);
        }
      }
    }
  };

  const handleUpdateTicket = (id: string, updates: Partial<ServiceTicket>) => {
    const updated = storage.updateTicket(id, updates);
    const newTickets = storage.getTickets();
    setTickets(newTickets);
    setParts(storage.getParts());
    setTransactions(storage.getCashTransactions());

    if (selectedTicketForDetail && selectedTicketForDetail.id === id && updated) {
      setSelectedTicketForDetail(updated);
    }

    // Saha veya ofis güncellemesini canlı sunucuya bildir (anında diğer tüm cihazlarda güncellensin)
    syncService.updateTicketField(id, updates);
  };

  const handleDeleteTicket = (id: string) => {
    storage.deleteTicket(id);
    const newTickets = storage.getTickets();
    setTickets(newTickets);
    if (selectedTicketForDetail?.id === id) {
      setSelectedTicketForDetail(null);
    }

    syncService.pushFullSync({
      tickets: newTickets,
      customers: storage.getCustomers(),
      parts: storage.getParts(),
      cash: storage.getCashTransactions(),
      settings: storage.getSettings(),
    });
  };

  // Müşteri İşlemleri
  const handleSaveCustomer = (custData: Omit<Customer, 'id' | 'createdAt'>, id?: string) => {
    if (id) {
      storage.updateCustomer(id, custData);
    } else {
      storage.addCustomer(custData);
    }
    const newCusts = storage.getCustomers();
    setCustomers(newCusts);
    setCustomerToEdit(null);

    syncService.pushFullSync({
      tickets: storage.getTickets(),
      customers: newCusts,
      parts: storage.getParts(),
      cash: storage.getCashTransactions(),
      settings: storage.getSettings(),
    });
  };

  const handleDeleteCustomer = (id: string) => {
    storage.deleteCustomer(id);
    setCustomers(storage.getCustomers());
  };

  // Parça İşlemleri
  const handleSavePart = (partData: Omit<SparePart, 'id' | 'updatedAt'>, id?: string) => {
    if (id) {
      storage.updatePart(id, partData);
    } else {
      storage.addPart(partData);
    }
    setParts(storage.getParts());
    setPartToEdit(null);
  };

  const handleDeletePart = (id: string) => {
    storage.deletePart(id);
    setParts(storage.getParts());
  };

  const handleAdjustStock = (partId: string, amount: number) => {
    storage.adjustPartStock(partId, amount);
    setParts(storage.getParts());
  };

  // Kasa İşlemleri
  const handleAddTransaction = (tx: Omit<CashTransaction, 'id'>) => {
    storage.addCashTransaction(tx);
    setTransactions(storage.getCashTransactions());
  };

  const handleDeleteTransaction = (id: string) => {
    storage.deleteCashTransaction(id);
    setTransactions(storage.getCashTransactions());
  };

  // Ayarlar
  const handleSaveSettings = (newSettings: ShopSettings) => {
    storage.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleResetData = () => {
    storage.resetToSampleData();
    setTickets(storage.getTickets());
    setCustomers(storage.getCustomers());
    setParts(storage.getParts());
    setTransactions(storage.getCashTransactions());
    setSettings(storage.getSettings());
  };

  // Sayaçlar
  const pendingCount = tickets.filter(t => t.status !== 'delivered' && t.status !== 'cancelled').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' && t.status !== 'delivered').length;
  const lowStockCount = parts.filter(p => p.quantity <= p.minStockLevel).length;

  // Giriş Yapılmamışsa Login Sayfasını Göster (Telefonda 1 kez girince 1 yıl cookies hatırlar)
  if (!currentUser) {
    return (
      <LoginView 
        shopName={settings.shopName} 
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  return (
    <div className="app-container">
      {/* Canlı Bildirim Toast Mesajı */}
      {liveNotification && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 999,
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid #3b82f6',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'scaleUp 0.2s ease-out'
          }}
        >
          <BellRing size={20} color="#3b82f6" />
          <span>{liveNotification}</span>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openNewTicketModal={() => {
          setTicketToEdit(null);
          setIsTicketModalOpen(true);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        settings={settings}
        pendingCount={pendingCount}
        urgentCount={urgentCount}
        lowStockCount={lowStockCount}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Mobile / Top Header */}
        <Navbar 
          onToggleMenu={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenNewTicket={() => {
            setTicketToEdit(null);
            setIsTicketModalOpen(true);
          }}
          settings={settings}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isLiveConnected={isLiveConnected}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* 1. SAHA TEKNİSYEN MODU (iPHONE İÇİN ÖZEL SADELEŞTİRİLMİŞ EKRAN) */}
        {activeTab === 'technician' && (
          <TechnicianMobileView 
            tickets={tickets}
            parts={parts}
            onUpdateTicket={handleUpdateTicket}
            shopName={settings.shopName}
            shopPhone={settings.phone}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}

        {/* 2. OFİS MASAÜSTÜ SEKMELERİ */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            tickets={tickets}
            parts={parts}
            customers={customers}
            onSelectTicket={(ticket) => setSelectedTicketForDetail(ticket)}
            onOpenNewTicket={() => {
              setTicketToEdit(null);
              setIsTicketModalOpen(true);
            }}
            onOpenNewCustomer={() => {
              setCustomerToEdit(null);
              setIsCustomerModalOpen(true);
            }}
            onOpenNewPart={() => {
              setPartToEdit(null);
              setIsPartModalOpen(true);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            shopName={settings.shopName}
            shopPhone={settings.phone}
          />
        )}

        {activeTab === 'tickets' && (
          <TicketList 
            tickets={tickets}
            onSelectTicket={(ticket) => setSelectedTicketForDetail(ticket)}
            onOpenNewTicket={() => {
              setTicketToEdit(null);
              setIsTicketModalOpen(true);
            }}
            onPrintTicket={(ticket) => setSelectedTicketForPrint(ticket)}
            shopName={settings.shopName}
            shopPhone={settings.phone}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerList 
            customers={customers}
            tickets={tickets}
            onSelectCustomer={() => {}}
            onOpenNewCustomer={() => {
              setCustomerToEdit(null);
              setIsCustomerModalOpen(true);
            }}
            onEditCustomer={(c) => {
              setCustomerToEdit(c);
              setIsCustomerModalOpen(true);
            }}
            onDeleteCustomer={handleDeleteCustomer}
            onSelectTicket={(ticket) => setSelectedTicketForDetail(ticket)}
            shopName={settings.shopName}
            shopPhone={settings.phone}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryList 
            parts={parts}
            onOpenNewPart={() => {
              setPartToEdit(null);
              setIsPartModalOpen(true);
            }}
            onEditPart={(p) => {
              setPartToEdit(p);
              setIsPartModalOpen(true);
            }}
            onDeletePart={handleDeletePart}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {activeTab === 'accounting' && (
          <AccountingView 
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav no-print">
        <button 
          className={`mobile-nav-item ${activeTab === 'technician' ? 'active' : ''}`}
          onClick={() => setActiveTab('technician')}
        >
          <Smartphone size={20} />
          <span>Saha</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Özet</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <Wrench size={20} />
          <span>Fişler</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Users size={20} />
          <span>Müşteri</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={20} />
          <span>Stok</span>
        </button>
      </nav>

      {/* Modallar */}
      <TicketModal 
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setTicketToEdit(null);
        }}
        onSubmit={handleSaveTicket}
        customers={customers}
        initialTicket={ticketToEdit}
      />

      <TicketDetailModal 
        ticket={selectedTicketForDetail}
        parts={parts}
        isOpen={Boolean(selectedTicketForDetail)}
        onClose={() => setSelectedTicketForDetail(null)}
        onUpdateTicket={handleUpdateTicket}
        onDeleteTicket={handleDeleteTicket}
        onPrintTicket={(t) => setSelectedTicketForPrint(t)}
        onEditTicket={(t) => {
          setTicketToEdit(t);
          setIsTicketModalOpen(true);
        }}
        shopName={settings.shopName}
        shopPhone={settings.phone}
      />

      <PrintReceipt 
        ticket={selectedTicketForPrint}
        settings={settings}
        isOpen={Boolean(selectedTicketForPrint)}
        onClose={() => setSelectedTicketForPrint(null)}
      />

      <CustomerModal 
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setCustomerToEdit(null);
        }}
        onSubmit={handleSaveCustomer}
        initialCustomer={customerToEdit}
      />

      <PartModal 
        isOpen={isPartModalOpen}
        onClose={() => {
          setIsPartModalOpen(false);
          setPartToEdit(null);
        }}
        onSubmit={handleSavePart}
        initialPart={partToEdit}
      />
    </div>
  );
};

export default App;
