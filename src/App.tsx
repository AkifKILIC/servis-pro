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
import { ServiceTicket, Customer, SparePart, CashTransaction, ShopSettings, CurrentAccount, CurrentAccountTransaction } from './types';
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
import { registerServiceWorker, showTechnicianJobNotification, playNotificationSound } from './utils/notifications';
import { AuthUser, getAuthSession, clearAuthSession } from './utils/auth';
import { generateTechnicianDispatchWhatsAppLink, formatCurrency } from './utils/helpers';

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
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [connectionState, setConnectionState] = useState<'online' | 'offline' | 'syncing'>(syncService.getConnectionState());
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(syncService.getOfflineQueueCount());
  const [liveNotification, setLiveNotification] = useState<string | null>(null);

  // Veriler
  const [tickets, setTickets] = useState<ServiceTicket[]>(storage.getTickets());
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [parts, setParts] = useState<SparePart[]>(storage.getParts());
  const [transactions, setTransactions] = useState<CashTransaction[]>(storage.getCashTransactions());
  const [currentAccounts, setCurrentAccounts] = useState<CurrentAccount[]>(storage.getCurrentAccounts());
  const [currentTransactions, setCurrentTransactions] = useState<CurrentAccountTransaction[]>(storage.getCurrentTransactions());
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

  // Canlı Senkronizasyon Başlatma ve Bildirimden Gelen Fişi Açma
  useEffect(() => {
    syncService.connect();
    setIsLiveConnected(true);

    // Bildirime tıklandığında URL'e gömülü gelen tjson (fiş) verisini anında yakala ve aç
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const tjson = searchParams.get('tjson');
        if (tjson) {
          const directTicket: ServiceTicket = JSON.parse(decodeURIComponent(tjson));
          if (directTicket && directTicket.id) {
            setTickets((prev) => {
              const exists = prev.some(t => t.id === directTicket.id);
              if (exists) return prev;
              const next = [directTicket, ...prev];
              storage.saveTickets(next);
              return next;
            });
            setSelectedTicketForDetail(directTicket);
          }
        }
      } catch (err) {
        console.warn('URL fiş yükleme hatası:', err);
      }
    }

    // Sunucudan mevcut son verileri çek ve birleştir (MySQL ve Bulut)
    syncService.pullData().then((serverData) => {
      if (serverData) {
        if (serverData.settings && typeof serverData.settings === 'object') {
          setSettings(serverData.settings);
          storage.saveSettings(serverData.settings);
        }
        if (serverData.tickets && Array.isArray(serverData.tickets) && serverData.tickets.length > 0) {
          setTickets(serverData.tickets);
          storage.saveTickets(serverData.tickets);
        }
        if (serverData.customers && Array.isArray(serverData.customers) && serverData.customers.length > 0) {
          setCustomers(serverData.customers);
          storage.saveCustomers(serverData.customers);
        }
        if (serverData.parts && Array.isArray(serverData.parts) && serverData.parts.length > 0) {
          setParts(serverData.parts);
          storage.saveParts(serverData.parts);
        }
        if (serverData.cash) {
          setTransactions(serverData.cash);
          storage.saveCashTransactions(serverData.cash);
        }
        if (serverData.currentAccounts && Array.isArray(serverData.currentAccounts)) {
          setCurrentAccounts(serverData.currentAccounts);
          storage.saveCurrentAccounts(serverData.currentAccounts);
        }
        if (serverData.currentTransactions && Array.isArray(serverData.currentTransactions)) {
          setCurrentTransactions(serverData.currentTransactions);
          storage.saveCurrentTransactions(serverData.currentTransactions);
        }
      } else {
        // Sunucu henüz boşsa yerel veriyi sunucuya gönder
        syncService.pushFullSync({
          tickets: storage.getTickets(),
          customers: storage.getCustomers(),
          parts: storage.getParts(),
          cash: storage.getCashTransactions(),
          currentAccounts: storage.getCurrentAccounts(),
          currentTransactions: storage.getCurrentTransactions(),
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

          // Açık olan detay modalı varsa onu da anında canlı güncelle
          setSelectedTicketForDetail((prev) => {
            if (prev && prev.id === updateData.id) {
              return { ...prev, ...updateData };
            }
            return prev;
          });

          // Ofisteki bilgisayarda sesli zil çal
          playNotificationSound();

          let statusDesc = 'İş Durumu Güncellendi';
          if (updateData.status === 'delivered') statusDesc = 'Servis Ücreti Tahsil Edildi / Fiş Kapatıldı';
          else if (updateData.status === 'in_repair') statusDesc = 'İş Alındı / Onarıma Başlandı';
          else if (updateData.status === 'ready') statusDesc = 'Onarım Tamamlandı / Fiş Hazır';

          const who = updateData.customerName ? `${updateData.customerName} - ` : '';
          const tNum = updateData.ticketNumber || updateData.id;
          setLiveNotification(`🔔 SAHA USTASI: ${who}${statusDesc} (${tNum})`);
          setTimeout(() => setLiveNotification(null), 8000);
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
      } else if (event.type === 'CONNECTION_STATE_CHANGED') {
        if (event.data) {
          setConnectionState(event.data.state);
          setPendingQueueCount(event.data.pendingCount || 0);
          setIsLiveConnected(event.data.state === 'online');
        }
      } else if (event.type === 'SETTINGS_UPDATED') {
        if (event.data && typeof event.data === 'object') {
          setSettings(event.data);
          storage.saveSettings(event.data);
        }
      } else if (event.type === 'FULL_SYNC') {
        if (event.data?.settings && typeof event.data.settings === 'object') {
          setSettings(event.data.settings);
          storage.saveSettings(event.data.settings);
        }
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

    (window as any).__REFRESH_DATA__ = () => {
      setTickets(storage.getTickets());
      setCustomers(storage.getCustomers());
      setParts(storage.getParts());
      setTransactions(storage.getCashTransactions());
      syncService.checkMissedCloudMessages();
    };

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

  const handleManualSync = async () => {
    setLiveNotification('🔄 MySQL veritabanı ile eşitleniyor...');
    const res = await syncService.triggerManualSync();
    setTickets(storage.getTickets());
    setCustomers(storage.getCustomers());
    setParts(storage.getParts());
    setTransactions(storage.getCashTransactions());
    setSettings(storage.getSettings());
    setLiveNotification(res.success ? '✅ ' + res.message : '⚠️ ' + res.message);
    setTimeout(() => setLiveNotification(null), 4000);
    return res;
  };

  useEffect(() => {
    (window as any).__TRIGGER_SYNC__ = handleManualSync;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 veya Ctrl+R basıldığında sayfayı beyazlatmadan canlı verileri arka planda tazele
      if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r') || (e.metaKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        handleManualSync();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Her 30 saniyede bir sessiz arka plan kontrolü (Electron & Web açıkken yeni kayıtları otomatik çeker)
    const autoSyncInterval = setInterval(() => {
      syncService.pullData().then((fresh) => {
        if (fresh && fresh.tickets) {
          setTickets(fresh.tickets);
          storage.saveTickets(fresh.tickets);
        }
      }).catch(() => {});
    }, 30000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(autoSyncInterval);
    };
  }, []);

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

    // Canlı sunucuya (MySQL) aktar
    syncService.pushFullSync({
      tickets: updatedTickets,
      customers: storage.getCustomers(),
      parts: storage.getParts(),
      cash: storage.getCashTransactions(),
      settings: storage.getSettings(),
    });

    if (savedTicket) {
      syncService.saveTicketToSql(savedTicket);
    }

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

  const handleApprovePayment = async (ticketId: string) => {
    const currentTickets = storage.getTickets();
    const t = currentTickets.find(item => item.id === ticketId);
    if (!t) return;

    const paymentAmount = (t.paidAmount && t.paidAmount > 0) ? t.paidAmount : (t.totalAmount || 0);
    const payMethod = t.paymentMethod || 'cash';
    const partsTotal = (t.partsUsed || []).reduce((sum, p) => sum + (p.totalPrice || (p.unitPrice * p.quantity) || 0), 0);

    // 1. Fiş durumunu 'paid' olarak güncelle
    const updated = storage.updateTicket(ticketId, {
      paymentStatus: 'paid',
      paidAmount: paymentAmount,
      updatedAt: new Date().toISOString(),
    });

    // 2. Kasaya Gelir Ekle (Servis Tahsilatı) ve MySQL'e yaz
    if (paymentAmount > 0) {
      const incomeTx = storage.addCashTransaction({
        type: 'income',
        category: 'Servis Tahsilatı',
        amount: paymentAmount,
        date: new Date().toISOString(),
        description: `${t.customerName} - ${t.ticketNumber} Servis Tahsilatı`,
        relatedTicketId: t.id,
        paymentMethod: payMethod,
      });
      syncService.saveCashToSql(incomeTx);
    }

    // 3. Fişte kullanılan parçalar varsa Kasaya Gider Ekle (Kullanılan Parça Maliyeti) ve MySQL'e yaz
    if (partsTotal > 0) {
      const partsSummary = (t.partsUsed || []).map(p => `${p.partName} (${p.quantity} ad.)`).join(', ');
      const expenseTx = storage.addCashTransaction({
        type: 'expense',
        category: 'Yedek Parça Gideri',
        amount: partsTotal,
        date: new Date().toISOString(),
        description: `${t.ticketNumber} Kullanılan Parça Bedeli - ${partsSummary}`,
        relatedTicketId: t.id,
        paymentMethod: payMethod,
      });
      syncService.saveCashToSql(expenseTx);
    }

    // 4. Güncellenen fişi MySQL'e kaydet ve diğer cihazlara yayınla
    if (updated) {
      syncService.saveTicketToSql(updated);
      syncService.updateTicketField(ticketId, { paymentStatus: 'paid', paidAmount: paymentAmount });
    }

    // 5. Ekran state'lerini anında yenile
    const freshTickets = storage.getTickets();
    const freshCash = storage.getCashTransactions();
    setTickets(freshTickets);
    setTransactions(freshCash);

    if (selectedTicketForDetail?.id === ticketId && updated) {
      setSelectedTicketForDetail(updated);
    }

    setLiveNotification(`✅ ${t.ticketNumber} tahsilatı (${formatCurrency(paymentAmount)}) onaylandı ve kasaya işlendi!${partsTotal > 0 ? ` (${formatCurrency(partsTotal)} parça gideri düşüldü)` : ''}`);
    setTimeout(() => setLiveNotification(null), 7000);
  };

  const handleUpdateTicket = (id: string, updates: Partial<ServiceTicket>) => {
    const oldTicket = tickets.find(t => t.id === id);
    const updated = storage.updateTicket(id, updates);
    const newTickets = storage.getTickets();
    setTickets(newTickets);
    setParts(storage.getParts());

    // Eğer doğrudan ofis modalından 'paid' yapıldıysa ve eskiden 'paid' değilse kasaya gelir ve parça gideri oluşturup MySQL'e yaz
    if (oldTicket && oldTicket.paymentStatus !== 'paid' && updates.paymentStatus === 'paid') {
      const paymentAmount = updates.paidAmount || (updated ? updated.paidAmount : 0) || (oldTicket.totalAmount || 0);
      const payMethod = updates.paymentMethod || oldTicket.paymentMethod || 'cash';
      const partsTotal = ((updates.partsUsed || oldTicket.partsUsed) || []).reduce((sum, p) => sum + (p.totalPrice || (p.unitPrice * p.quantity) || 0), 0);

      if (paymentAmount > 0) {
        const incomeTx = storage.addCashTransaction({
          type: 'income',
          category: 'Servis Tahsilatı',
          amount: paymentAmount,
          date: new Date().toISOString(),
          description: `${oldTicket.customerName} - ${oldTicket.ticketNumber} Servis Tahsilatı`,
          relatedTicketId: oldTicket.id,
          paymentMethod: payMethod,
        });
        syncService.saveCashToSql(incomeTx);
      }

      if (partsTotal > 0) {
        const partsList = updates.partsUsed || oldTicket.partsUsed || [];
        const partsSummary = partsList.map(p => `${p.partName} (${p.quantity} ad.)`).join(', ');
        const expenseTx = storage.addCashTransaction({
          type: 'expense',
          category: 'Yedek Parça Gideri',
          amount: partsTotal,
          date: new Date().toISOString(),
          description: `${oldTicket.ticketNumber} Kullanılan Parça Bedeli - ${partsSummary}`,
          relatedTicketId: oldTicket.id,
          paymentMethod: payMethod,
        });
        syncService.saveCashToSql(expenseTx);
      }
    }

    setTransactions(storage.getCashTransactions());

    if (selectedTicketForDetail && selectedTicketForDetail.id === id && updated) {
      setSelectedTicketForDetail(updated);
    }

    // MySQL'e anında kaydet
    if (updated) {
      syncService.saveTicketToSql(updated);
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

    // MySQL veritabanından kalıcı olarak sil (Tüm cihazlardan anında silinir)
    syncService.deleteTicketFromSql(id);

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
    let savedCust: Customer | null = null;
    if (id) {
      savedCust = storage.updateCustomer(id, custData);
    } else {
      savedCust = storage.addCustomer(custData);
    }
    const newCusts = storage.getCustomers();
    setCustomers(newCusts);
    setCustomerToEdit(null);

    if (savedCust) {
      syncService.saveCustomerToSql(savedCust);
    }

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
    syncService.deleteCustomerFromSql(id);
    setCustomers(storage.getCustomers());
  };

  // Parça İşlemleri
  const handleSavePart = (partData: Omit<SparePart, 'id' | 'updatedAt'>, id?: string) => {
    let savedPart: SparePart | null = null;
    if (id) {
      savedPart = storage.updatePart(id, partData);
    } else {
      savedPart = storage.addPart(partData);
    }
    const newParts = storage.getParts();
    setParts(newParts);
    setPartToEdit(null);

    if (savedPart) {
      syncService.savePartToSql(savedPart);
    }
  };

  const handleDeletePart = (id: string) => {
    storage.deletePart(id);
    syncService.deletePartFromSql(id);
    setParts(storage.getParts());
  };

  const handleAdjustStock = (partId: string, amount: number) => {
    storage.adjustPartStock(partId, amount);
    const updatedParts = storage.getParts();
    setParts(updatedParts);
    const p = updatedParts.find(item => item.id === partId);
    if (p) {
      syncService.savePartToSql(p);
    }
  };

  // Kasa İşlemleri
  const handleAddTransaction = (tx: Omit<CashTransaction, 'id'>) => {
    const newTx = storage.addCashTransaction(tx);
    setTransactions(storage.getCashTransactions());
    syncService.saveCashToSql(newTx);
  };

  const handleDeleteTransaction = (id: string) => {
    storage.deleteCashTransaction(id);
    syncService.deleteCashFromSql(id);
    setTransactions(storage.getCashTransactions());
  };

  // Cari Hesap İşlemleri
  const handleAddCurrentAccount = (caData: Omit<CurrentAccount, 'id' | 'createdAt' | 'updatedAt' | 'balance'> & { initialBalance?: number }) => {
    const newAccount = storage.addCurrentAccount(caData);
    syncService.saveCurrentAccountToSql(newAccount);
    setCurrentAccounts(storage.getCurrentAccounts());
    setCurrentTransactions(storage.getCurrentTransactions());
  };

  const handleUpdateCurrentAccount = (id: string, updates: Partial<CurrentAccount>) => {
    const updated = storage.updateCurrentAccount(id, updates);
    if (updated) {
      syncService.saveCurrentAccountToSql(updated);
      setCurrentAccounts(storage.getCurrentAccounts());
    }
  };

  const handleDeleteCurrentAccount = (id: string) => {
    storage.deleteCurrentAccount(id);
    syncService.deleteCurrentAccountFromSql(id);
    setCurrentAccounts(storage.getCurrentAccounts());
    setCurrentTransactions(storage.getCurrentTransactions());
  };

  const handleAddCurrentTransaction = (
    ctxData: Omit<CurrentAccountTransaction, 'id' | 'createdAt'>, 
    alsoCreateCashTx: boolean = true
  ) => {
    const newTx = storage.addCurrentTransaction(ctxData);
    syncService.saveCurrentTxToSql(newTx);

    // İsteğe bağlı olarak Kasa Tablosuna da Gelir/Gider ekle
    if (alsoCreateCashTx) {
      const account = storage.getCurrentAccounts().find(a => a.id === ctxData.accountId);
      const isSupplier = account?.type === 'supplier';
      // Tedarikçiye ödeme yaptıysak (credit) -> Gider
      // Müşteriden tahsilat aldıysak (credit) -> Gelir
      const cashType: 'income' | 'expense' = isSupplier
        ? (ctxData.type === 'credit' ? 'expense' : 'income')
        : (ctxData.type === 'credit' ? 'income' : 'expense');

      const cashTx = storage.addCashTransaction({
        type: cashType,
        category: isSupplier ? 'Toptancı Cari Ödeme' : 'Müşteri Cari Tahsilat',
        amount: ctxData.amount,
        date: ctxData.date || new Date().toISOString(),
        description: `${ctxData.accountName} - ${ctxData.description}`,
        paymentMethod: ctxData.paymentMethod || 'cash',
      });
      syncService.saveCashToSql(cashTx);
      setTransactions(storage.getCashTransactions());
    }

    const updatedAccount = storage.getCurrentAccounts().find(a => a.id === ctxData.accountId);
    if (updatedAccount) {
      syncService.saveCurrentAccountToSql(updatedAccount);
    }
    setCurrentAccounts(storage.getCurrentAccounts());
    setCurrentTransactions(storage.getCurrentTransactions());
  };

  const handleDeleteCurrentTransaction = (id: string) => {
    const target = storage.getCurrentTransactions().find(t => t.id === id);
    storage.deleteCurrentTransaction(id);
    syncService.deleteCurrentTxFromSql(id);
    if (target) {
      const updatedAccount = storage.getCurrentAccounts().find(a => a.id === target.accountId);
      if (updatedAccount) {
        syncService.saveCurrentAccountToSql(updatedAccount);
      }
    }
    setCurrentAccounts(storage.getCurrentAccounts());
    setCurrentTransactions(storage.getCurrentTransactions());
  };

  // Ayarlar
  const handleSaveSettings = (newSettings: ShopSettings) => {
    storage.saveSettings(newSettings);
    syncService.saveSettingsToSql(newSettings);
    setSettings(newSettings);
  };

  const handleResetData = () => {
    storage.resetToSampleData();
    setTickets(storage.getTickets());
    setCustomers(storage.getCustomers());
    setParts(storage.getParts());
    setTransactions(storage.getCashTransactions());
    setCurrentAccounts(storage.getCurrentAccounts());
    setCurrentTransactions(storage.getCurrentTransactions());
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

      {/* Sidebar for Desktop: Sadece ofis modunda gösterilir, usta saha ile ofis arasında geçiş yapamaz */}
      {activeTab !== 'technician' && currentUser?.role !== 'technician' && (
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
          connectionState={connectionState}
          pendingQueueCount={pendingQueueCount}
          onTriggerSync={handleManualSync}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Area */}
      <main 
        className="main-content"
        style={activeTab === 'technician' ? {
          marginLeft: 0,
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
          padding: '16px 12px 60px 12px'
        } : undefined}
      >
        {/* Mobile / Top Header: Sadece ofis sekmelerinde gösterilir, saha modunun kendi özel başlığı vardır */}
        {activeTab !== 'technician' && (
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
            connectionState={connectionState}
            pendingQueueCount={pendingQueueCount}
            onTriggerSync={handleManualSync}
          />
        )}

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
            connectionState={connectionState}
            pendingQueueCount={pendingQueueCount}
            onTriggerSync={handleManualSync}
            onSwitchToOffice={currentUser?.role !== 'technician' ? () => setActiveTab('dashboard') : undefined}
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
            onApprovePayment={handleApprovePayment}
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
            onApprovePayment={handleApprovePayment}
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
            currentAccounts={currentAccounts}
            onAddCurrentAccount={handleAddCurrentAccount}
            onUpdateCurrentAccount={handleUpdateCurrentAccount}
            onDeleteCurrentAccount={handleDeleteCurrentAccount}
            currentTransactions={currentTransactions}
            onAddCurrentTransaction={handleAddCurrentTransaction}
            onDeleteCurrentTransaction={handleDeleteCurrentTransaction}
            shopName={settings.shopName}
            shopPhone={settings.phone}
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

      {/* Mobile Bottom Navigation Bar: Sadece ofis modunda gezinmeye izin verilir, usta saha ile ofis arasında geçiş yapamaz */}
      {activeTab !== 'technician' && currentUser?.role !== 'technician' && (
        <nav className="mobile-bottom-nav no-print">
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
      )}

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
        onApprovePayment={handleApprovePayment}
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
