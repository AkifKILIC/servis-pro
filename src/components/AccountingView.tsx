import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  CreditCard,
  Banknote,
  Building2,
  X,
  Check,
  Users,
  Building,
  FileText,
  Printer,
  Share2,
  MessageCircle,
  Search,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Clock,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Edit2,
  PieChart
} from 'lucide-react';
import { CashTransaction, PaymentMethod, CurrentAccount, CurrentAccountTransaction, CurrentAccountType } from '../types';
import { formatCurrency, formatDate, formatDateOnly, generateCurrentAccountWhatsAppLink } from '../utils/helpers';

interface AccountingViewProps {
  transactions: CashTransaction[];
  onAddTransaction: (tx: Omit<CashTransaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  currentAccounts: CurrentAccount[];
  onAddCurrentAccount: (ca: Omit<CurrentAccount, 'id' | 'createdAt' | 'updatedAt' | 'balance'> & { initialBalance?: number }) => void;
  onUpdateCurrentAccount: (id: string, updates: Partial<CurrentAccount>) => void;
  onDeleteCurrentAccount: (id: string) => void;
  currentTransactions: CurrentAccountTransaction[];
  onAddCurrentTransaction: (ctx: Omit<CurrentAccountTransaction, 'id' | 'createdAt'>, alsoCreateCashTx?: boolean) => void;
  onDeleteCurrentTransaction: (id: string) => void;
  shopName: string;
  shopPhone: string;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  currentAccounts,
  onAddCurrentAccount,
  onUpdateCurrentAccount,
  onDeleteCurrentAccount,
  currentTransactions,
  onAddCurrentTransaction,
  onDeleteCurrentTransaction,
  shopName,
  shopPhone,
}) => {
  // Aktif Ana Sekme
  const [activeTab, setActiveTab] = useState<'cash' | 'current' | 'receivables' | 'profit_loss'>('cash');

  // --- KASA & BANKA SEKME DURUMLARI ---
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState<'income' | 'expense' | 'transfer'>('income');
  const [cashCategory, setCashCategory] = useState('Servis Tahsilatı');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [cashPaymentMethod, setCashPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTargetMethod, setCashTargetMethod] = useState<PaymentMethod>('bank_transfer');
  const [cashFilterType, setCashFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [cashSearchQuery, setCashSearchQuery] = useState('');

  // --- CARİ HESAPLAR SEKME DURUMLARI ---
  const [isCariModalOpen, setIsCariModalOpen] = useState(false);
  const [cariToEdit, setCariToEdit] = useState<CurrentAccount | null>(null);
  const [cariName, setCariName] = useState('');
  const [cariType, setCariType] = useState<CurrentAccountType>('supplier');
  const [cariPhone, setCariPhone] = useState('');
  const [cariPhone2, setCariPhone2] = useState('');
  const [cariAuthorizedPerson, setCariAuthorizedPerson] = useState('');
  const [cariTaxOrId, setCariTaxOrId] = useState('');
  const [cariCity, setCariCity] = useState('İzmir');
  const [cariDistrict, setCariDistrict] = useState('');
  const [cariAddress, setCariAddress] = useState('');
  const [cariInitialBalance, setCariInitialBalance] = useState('0');
  const [cariBalanceType, setCariBalanceType] = useState<'debt' | 'credit'>('debt'); // borçlu mu alacaklı mı
  const [cariCreditLimit, setCariCreditLimit] = useState('');
  const [cariNotes, setCariNotes] = useState('');

  const [cariFilterType, setCariFilterType] = useState<'all' | 'supplier' | 'customer'>('all');
  const [cariSearchQuery, setCariSearchQuery] = useState('');

  // --- CARİ EKSTRE / HAREKET MODALI DURUMU ---
  const [selectedCariForStatement, setSelectedCariForStatement] = useState<CurrentAccount | null>(null);
  const [isAddMovementOpen, setIsAddMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'debit' | 'credit'>('debit');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDescription, setMovementDescription] = useState('');
  const [movementDocNo, setMovementDocNo] = useState('');
  const [movementMethod, setMovementMethod] = useState<PaymentMethod>('cash');
  const [movementAlsoCash, setMovementAlsoCash] = useState(true);

  // --- KÂR / ZARAR DÖNEM SEÇİMİ ---
  const [plPeriod, setPlPeriod] = useState<'all' | 'this_month' | 'this_week' | 'today'>('this_month');

  // ==========================================
  // HESAPLAMALAR & FİNANSAL VERİLER
  // ==========================================

  // Kasa Toplamları
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Hesap Bakiyeleri (Nakit Kasa, Banka, POS)
  const cashAccountsBalances = useMemo(() => {
    let nakit = 0;
    let banka = 0;
    let pos = 0;

    transactions.forEach(t => {
      const amt = t.amount;
      if (t.type === 'income') {
        if (t.paymentMethod === 'cash') nakit += amt;
        else if (t.paymentMethod === 'bank_transfer') banka += amt;
        else if (t.paymentMethod === 'credit_card') pos += amt;
      } else if (t.type === 'expense') {
        if (t.paymentMethod === 'cash') nakit -= amt;
        else if (t.paymentMethod === 'bank_transfer') banka -= amt;
        else if (t.paymentMethod === 'credit_card') pos -= amt;
      } else if (t.type === 'transfer') {
        // Transfer: Kaynaktan düş, hedefe ekle
        if (t.paymentMethod === 'cash') nakit -= amt;
        else if (t.paymentMethod === 'bank_transfer') banka -= amt;
        else if (t.paymentMethod === 'credit_card') pos -= amt;

        if (t.targetAccountId === 'bank_transfer') banka += amt;
        else if (t.targetAccountId === 'cash') nakit += amt;
        else if (t.targetAccountId === 'credit_card') pos += amt;
      }
    });

    return { nakit, banka, pos };
  }, [transactions]);

  // Cari Borç & Alacak Toplamları
  // balance > 0: Biz Alacaklıyız (Müşteri veya toptancıdan para alacağız)
  // balance < 0: Biz Borçluyuz (Toptancıya ödeyeceğimiz borç)
  const cariTotals = useMemo(() => {
    let totalReceivables = 0; // Alacaklarımız (Piyasadan toplanacak para)
    let totalPayables = 0;    // Borçlarımız (Toptancılara ödenecek para)

    currentAccounts.forEach(ca => {
      if (ca.balance > 0) {
        totalReceivables += ca.balance;
      } else if (ca.balance < 0) {
        totalPayables += Math.abs(ca.balance);
      }
    });

    const netPosition = totalReceivables - totalPayables;
    return { totalReceivables, totalPayables, netPosition };
  }, [currentAccounts]);

  // Şirket Net Finansal Değeri (Likidite = Kasa + Alacaklar - Borçlar)
  const totalCompanyWorth = netBalance + cariTotals.totalReceivables - cariTotals.totalPayables;

  // Filtrelenmiş Kasa Hareketleri
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (cashFilterType !== 'all' && t.type !== cashFilterType) return false;
      if (cashSearchQuery.trim()) {
        const q = cashSearchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, cashFilterType, cashSearchQuery]);

  // Filtrelenmiş Cari Hesaplar
  const filteredCariList = useMemo(() => {
    return currentAccounts.filter(ca => {
      if (cariFilterType !== 'all' && ca.type !== cariFilterType) return false;
      if (cariSearchQuery.trim()) {
        const q = cariSearchQuery.toLowerCase();
        return (
          ca.name.toLowerCase().includes(q) ||
          ca.phone.includes(q) ||
          (ca.authorizedPerson && ca.authorizedPerson.toLowerCase().includes(q)) ||
          ca.district.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [currentAccounts, cariFilterType, cariSearchQuery]);

  // Kâr / Zarar Dönem Filtrelemesi
  const plData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const periodTransactions = transactions.filter(t => {
      if (plPeriod === 'all') return true;
      const tTime = new Date(t.date).getTime();
      if (plPeriod === 'today') return tTime >= startOfToday;
      if (plPeriod === 'this_week') return tTime >= startOfWeek;
      if (plPeriod === 'this_month') return tTime >= startOfMonth;
      return true;
    });

    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const partsCost = periodTransactions
      .filter(t => t.type === 'expense' && (t.category.includes('Parça') || t.category.includes('Yedek')))
      .reduce((sum, t) => sum + t.amount, 0);

    const operationalExpense = expense - partsCost;
    const grossProfit = income - partsCost;
    const netProfit = income - expense;
    const profitMargin = income > 0 ? ((netProfit / income) * 100).toFixed(1) : '0';

    // Kategoriye Göre Gider Dağılımı
    const expenseCategories: Record<string, number> = {};
    periodTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
      });

    return {
      income,
      expense,
      partsCost,
      operationalExpense,
      grossProfit,
      netProfit,
      profitMargin,
      expenseCategories,
      count: periodTransactions.length
    };
  }, [transactions, plPeriod]);

  // ==========================================
  // HANDLERS
  // ==========================================

  // Kasa Hareketi Ekleme Formu
  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(cashAmount);
    if (!numAmount || numAmount <= 0) {
      alert('Lütfen geçerli bir tutar giriniz.');
      return;
    }
    if (!cashDescription.trim()) {
      alert('Lütfen açıklama giriniz.');
      return;
    }

    if (cashType === 'transfer') {
      if (cashPaymentMethod === cashTargetMethod) {
        alert('Kaynak ve hedef hesap aynı olamaz.');
        return;
      }
      onAddTransaction({
        type: 'transfer',
        category: 'Hesaplar Arası Virman',
        amount: numAmount,
        date: new Date().toISOString(),
        description: cashDescription.trim(),
        paymentMethod: cashPaymentMethod,
        targetAccountId: cashTargetMethod,
      });
    } else {
      onAddTransaction({
        type: cashType,
        category: cashCategory,
        amount: numAmount,
        date: new Date().toISOString(),
        description: cashDescription.trim(),
        paymentMethod: cashPaymentMethod,
      });
    }

    setIsCashModalOpen(false);
    setCashAmount('');
    setCashDescription('');
  };

  // Cari Kart Kaydetme / Güncelleme
  const handleCariSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cariName.trim()) {
      alert('Lütfen Cari Ünvanını giriniz.');
      return;
    }
    if (!cariPhone.trim()) {
      alert('Lütfen telefon numarası giriniz.');
      return;
    }

    const initNum = parseFloat(cariInitialBalance) || 0;
    const finalInitBalance = cariBalanceType === 'debt' ? -Math.abs(initNum) : Math.abs(initNum);

    if (cariToEdit) {
      onUpdateCurrentAccount(cariToEdit.id, {
        name: cariName.trim(),
        type: cariType,
        phone: cariPhone.trim(),
        phone2: cariPhone2.trim() || undefined,
        authorizedPerson: cariAuthorizedPerson.trim() || undefined,
        taxOrIdNumber: cariTaxOrId.trim() || undefined,
        city: cariCity.trim() || 'İzmir',
        district: cariDistrict.trim() || '',
        address: cariAddress.trim() || undefined,
        creditLimit: parseFloat(cariCreditLimit) || 0,
        notes: cariNotes.trim() || undefined,
      });
    } else {
      onAddCurrentAccount({
        name: cariName.trim(),
        type: cariType,
        phone: cariPhone.trim(),
        phone2: cariPhone2.trim() || undefined,
        authorizedPerson: cariAuthorizedPerson.trim() || undefined,
        taxOrIdNumber: cariTaxOrId.trim() || undefined,
        city: cariCity.trim() || 'İzmir',
        district: cariDistrict.trim() || '',
        address: cariAddress.trim() || undefined,
        creditLimit: parseFloat(cariCreditLimit) || 0,
        notes: cariNotes.trim() || undefined,
        initialBalance: finalInitBalance,
      });
    }

    setIsCariModalOpen(false);
    setCariToEdit(null);
    resetCariForm();
  };

  const resetCariForm = () => {
    setCariName('');
    setCariType('supplier');
    setCariPhone('');
    setCariPhone2('');
    setCariAuthorizedPerson('');
    setCariTaxOrId('');
    setCariCity('İzmir');
    setCariDistrict('');
    setCariAddress('');
    setCariInitialBalance('0');
    setCariBalanceType('debt');
    setCariCreditLimit('');
    setCariNotes('');
  };

  const openEditCariModal = (ca: CurrentAccount) => {
    setCariToEdit(ca);
    setCariName(ca.name);
    setCariType(ca.type);
    setCariPhone(ca.phone);
    setCariPhone2(ca.phone2 || '');
    setCariAuthorizedPerson(ca.authorizedPerson || '');
    setCariTaxOrId(ca.taxOrIdNumber || '');
    setCariCity(ca.city || 'İzmir');
    setCariDistrict(ca.district || '');
    setCariAddress(ca.address || '');
    setCariCreditLimit(ca.creditLimit ? String(ca.creditLimit) : '');
    setCariNotes(ca.notes || '');
    setIsCariModalOpen(true);
  };

  // Cari Hareket Ekleme (Ekstre Modalı İçinden)
  const handleAddMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCariForStatement) return;

    const amt = parseFloat(movementAmount);
    if (!amt || amt <= 0) {
      alert('Lütfen geçerli bir tutar giriniz.');
      return;
    }
    if (!movementDescription.trim()) {
      alert('Lütfen açıklama giriniz.');
      return;
    }

    onAddCurrentTransaction({
      accountId: selectedCariForStatement.id,
      accountName: selectedCariForStatement.name,
      type: movementType,
      amount: amt,
      date: new Date().toISOString(),
      description: movementDescription.trim(),
      documentNo: movementDocNo.trim() || undefined,
      paymentMethod: movementMethod,
    }, movementAlsoCash);

    // Güncel cari verisini tazele
    const refreshed = currentAccounts.find(a => a.id === selectedCariForStatement.id);
    if (refreshed) {
      setSelectedCariForStatement(refreshed);
    }

    setIsAddMovementOpen(false);
    setMovementAmount('');
    setMovementDescription('');
    setMovementDocNo('');
  };

  // Cari Ekstre Yazdırma
  const handlePrintLedger = () => {
    window.print();
  };

  // Seçili Carinin Hareketleri
  const currentAccountMovements = useMemo(() => {
    if (!selectedCariForStatement) return [];
    return currentTransactions
      .filter(t => t.accountId === selectedCariForStatement.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [currentTransactions, selectedCariForStatement]);

  return (
    <div>
      {/* Top Header */}
      <div className="top-header no-print">
        <div className="page-title">
          <h2>Kasa & Muhasebe Merkezi</h2>
          <p>Çoklu kasa/banka akışı, toptancı & müşteri carileri, borç/alacak mutabakatı ve kâr analizi</p>
        </div>
        <div className="header-actions">
          {activeTab === 'cash' && (
            <button className="btn btn-primary" onClick={() => setIsCashModalOpen(true)}>
              <Plus size={18} />
              <span>Yeni Kasa Hareketi Ekle</span>
            </button>
          )}
          {activeTab === 'current' && (
            <button className="btn btn-primary" onClick={() => { setCariToEdit(null); resetCariForm(); setIsCariModalOpen(true); }}>
              <Plus size={18} />
              <span>Yeni Cari Kartı Aç</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('cash')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}
        >
          <Wallet size={18} />
          <span>Kasa & Banka ({transactions.length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'current' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('current')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}
        >
          <Users size={18} />
          <span>Cari Hesaplar ({currentAccounts.length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'receivables' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('receivables')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}
        >
          <Briefcase size={18} />
          <span>Borç & Alacak Takibi</span>
        </button>

        <button
          className={`btn ${activeTab === 'profit_loss' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('profit_loss')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}
        >
          <PieChart size={18} />
          <span>Kâr / Zarar & Finansal Rapor</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. SEKME: KASA & BANKA HAREKETLERİ                      */}
      {/* ======================================================== */}
      {activeTab === 'cash' && (
        <div>
          {/* Summary Cards */}
          <div className="metrics-grid">
            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #10b981, #34d399)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <ArrowUpRight size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: '#10b981' }}>{formatCurrency(totalIncome)}</h3>
                <p>Toplam Gelir / Tahsilat</p>
              </div>
            </div>

            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #ef4444, #f87171)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <ArrowDownRight size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: '#ef4444' }}>{formatCurrency(totalExpense)}</h3>
                <p>Toplam Gider / Harcama</p>
              </div>
            </div>

            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #3b82f6, #60a5fa)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Wallet size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: netBalance >= 0 ? '#3b82f6' : '#ef4444' }}>
                  {formatCurrency(netBalance)}
                </h3>
                <p>Net Toplam Kasa</p>
              </div>
            </div>
          </div>

          {/* Hesap Dağılımı Çubuk Kartları (Nakit, Banka, POS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #10b981' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '10px', color: '#10b981' }}>
                <Banknote size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nakit Elden Kasa</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: cashAccountsBalances.nakit >= 0 ? 'var(--text-main)' : '#ef4444' }}>
                  {formatCurrency(cashAccountsBalances.nakit)}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '10px', color: '#3b82f6' }}>
                <Building2 size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Banka (Havale / EFT)</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: cashAccountsBalances.banka >= 0 ? 'var(--text-main)' : '#ef4444' }}>
                  {formatCurrency(cashAccountsBalances.banka)}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '10px', borderRadius: '10px', color: '#8b5cf6' }}>
                <CreditCard size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kredi Kartı / POS Hesabı</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: cashAccountsBalances.pos >= 0 ? 'var(--text-main)' : '#ef4444' }}>
                  {formatCurrency(cashAccountsBalances.pos)}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className={`btn btn-secondary btn-sm ${cashFilterType === 'all' ? 'active' : ''}`}
                onClick={() => setCashFilterType('all')}
                style={{ background: cashFilterType === 'all' ? 'var(--primary-light)' : undefined, color: cashFilterType === 'all' ? 'var(--primary)' : undefined }}
              >
                Tümü ({transactions.length})
              </button>
              <button 
                className={`btn btn-secondary btn-sm ${cashFilterType === 'income' ? 'active' : ''}`}
                onClick={() => setCashFilterType('income')}
                style={{ background: cashFilterType === 'income' ? 'rgba(16, 185, 129, 0.15)' : undefined, color: cashFilterType === 'income' ? '#10b981' : undefined }}
              >
                + Gelirler
              </button>
              <button 
                className={`btn btn-secondary btn-sm ${cashFilterType === 'expense' ? 'active' : ''}`}
                onClick={() => setCashFilterType('expense')}
                style={{ background: cashFilterType === 'expense' ? 'rgba(239, 68, 68, 0.15)' : undefined, color: cashFilterType === 'expense' ? '#ef4444' : undefined }}
              >
                - Giderler
              </button>
              <button 
                className={`btn btn-secondary btn-sm ${cashFilterType === 'transfer' ? 'active' : ''}`}
                onClick={() => setCashFilterType('transfer')}
                style={{ background: cashFilterType === 'transfer' ? 'rgba(59, 130, 246, 0.15)' : undefined, color: cashFilterType === 'transfer' ? '#3b82f6' : undefined }}
              >
                Virman / Transfer
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-color)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', minWidth: '240px' }}>
              <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
              <input 
                type="text"
                placeholder="Açıklama veya kategori ara..."
                value={cashSearchQuery}
                onChange={e => setCashSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Transactions Table */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Tür</th>
                  <th>Kategori</th>
                  <th>Açıklama</th>
                  <th>Tarih</th>
                  <th>Kasa / Hesap</th>
                  <th>Tutar</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Kayıtlı kasa hareketi bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => {
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';

                    return (
                      <tr key={tx.id}>
                        <td>
                          <span 
                            className="badge" 
                            style={{ 
                              background: isTransfer ? 'rgba(59, 130, 246, 0.15)' : isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                              color: isTransfer ? '#3b82f6' : isIncome ? '#10b981' : '#ef4444' 
                            }}
                          >
                            {isTransfer ? 'Virman' : isIncome ? '+ Gelir' : '- Gider'}
                          </span>
                        </td>
                        <td>
                          <strong>{tx.category}</strong>
                        </td>
                        <td style={{ maxWidth: '320px' }}>{tx.description}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                          {formatDate(tx.date)}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {tx.paymentMethod === 'cash' ? 'Nakit Kasa' : tx.paymentMethod === 'credit_card' ? 'POS / Kart' : 'Banka Havale'}
                            {isTransfer && tx.targetAccountId && (
                              <>
                                <ArrowRightLeft size={12} style={{ color: '#3b82f6' }} />
                                {tx.targetAccountId === 'cash' ? 'Nakit' : tx.targetAccountId === 'credit_card' ? 'POS' : 'Banka'}
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '1rem', color: isTransfer ? '#3b82f6' : isIncome ? '#10b981' : '#ef4444' }}>
                            {isTransfer ? '' : isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => {
                              if (confirm('Bu kasa hareketini silmek istediğinize emin misiniz?')) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            title="Hareketi Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SEKME: CARİ HESAPLAR (TOPTANCI & MÜŞTERİ)            */}
      {/* ======================================================== */}
      {activeTab === 'current' && (
        <div>
          {/* Cari Üst Metrikler */}
          <div className="metrics-grid">
            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #ef4444, #f87171)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <TrendingDown size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: '#ef4444' }}>{formatCurrency(cariTotals.totalPayables)}</h3>
                <p>Toptancılara Toplam Borcumuz</p>
              </div>
            </div>

            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #10b981, #34d399)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <TrendingUp size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: '#10b981' }}>{formatCurrency(cariTotals.totalReceivables)}</h3>
                <p>Piyasadan Alacaklarımız (Müşteriler)</p>
              </div>
            </div>

            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #8b5cf6, #a78bfa)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <Users size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: '#8b5cf6' }}>{currentAccounts.length} Cari</h3>
                <p>Aktif Tedarikçi & Müşteri Hesabı</p>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className={`btn btn-secondary btn-sm ${cariFilterType === 'all' ? 'active' : ''}`}
                onClick={() => setCariFilterType('all')}
                style={{ background: cariFilterType === 'all' ? 'var(--primary-light)' : undefined, color: cariFilterType === 'all' ? 'var(--primary)' : undefined }}
              >
                Tümü ({currentAccounts.length})
              </button>
              <button 
                className={`btn btn-secondary btn-sm ${cariFilterType === 'supplier' ? 'active' : ''}`}
                onClick={() => setCariFilterType('supplier')}
                style={{ background: cariFilterType === 'supplier' ? 'rgba(239, 68, 68, 0.15)' : undefined, color: cariFilterType === 'supplier' ? '#ef4444' : undefined }}
              >
                🏢 Toptancı & Parçacılar ({currentAccounts.filter(c => c.type === 'supplier').length})
              </button>
              <button 
                className={`btn btn-secondary btn-sm ${cariFilterType === 'customer' ? 'active' : ''}`}
                onClick={() => setCariFilterType('customer')}
                style={{ background: cariFilterType === 'customer' ? 'rgba(16, 185, 129, 0.15)' : undefined, color: cariFilterType === 'customer' ? '#10b981' : undefined }}
              >
                👤 Açık Hesap Müşteriler ({currentAccounts.filter(c => c.type === 'customer').length})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-color)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', minWidth: '260px' }}>
              <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
              <input 
                type="text"
                placeholder="Cari unvan, yetkili veya telefon ara..."
                value={cariSearchQuery}
                onChange={e => setCariSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Cari Kartları Tablosu */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Cari Türü</th>
                  <th>Cari Ünvanı / Firma</th>
                  <th>Yetkili & İletişim</th>
                  <th>Şehir / İlçe</th>
                  <th>Açık Bakiye Durumu</th>
                  <th>Kredi Limiti</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredCariList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Kayıtlı cari hesap bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredCariList.map(ca => {
                    const isSupplier = ca.type === 'supplier';
                    const hasDebt = ca.balance < 0; // Biz borçluyuz
                    const hasCredit = ca.balance > 0; // Biz alacaklıyız

                    return (
                      <tr key={ca.id}>
                        <td>
                          <span 
                            className="badge" 
                            style={{ 
                              background: isSupplier ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                              color: isSupplier ? '#ef4444' : '#10b981' 
                            }}
                          >
                            {isSupplier ? 'Toptancı / Parçacı' : 'Müşteri'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ca.name}</div>
                          {ca.taxOrIdNumber && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              VN/TC: {ca.taxOrIdNumber}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.88rem' }}>{ca.authorizedPerson || '-'}</div>
                          <a href={`tel:${ca.phone}`} style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>
                            {ca.phone}
                          </a>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {ca.district ? `${ca.district} / ${ca.city}` : ca.city}
                        </td>
                        <td>
                          <div>
                            <strong 
                              style={{ 
                                fontSize: '1.05rem', 
                                color: hasCredit ? '#10b981' : hasDebt ? '#ef4444' : 'var(--text-muted)' 
                              }}
                            >
                              {formatCurrency(Math.abs(ca.balance))}
                            </strong>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: hasCredit ? '#10b981' : hasDebt ? '#ef4444' : 'var(--text-dim)' }}>
                              {hasCredit ? 'Alacağımız Var' : hasDebt ? 'Borcumuz Var' : 'Hesap Kapalı (0 TL)'}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                          {ca.creditLimit ? formatCurrency(ca.creditLimit) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setSelectedCariForStatement(ca)}
                              title="Cari Ekstre ve Hareketleri İncele"
                            >
                              <FileText size={14} />
                              <span>Ekstre</span>
                            </button>

                            <a
                              href={generateCurrentAccountWhatsAppLink(
                                ca, 
                                currentTransactions.filter(t => t.accountId === ca.id),
                                shopName, 
                                shopPhone
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm"
                              style={{ background: '#25D366', color: '#fff', padding: '6px 10px', display: 'inline-flex', alignItems: 'center' }}
                              title="WhatsApp ile Cari Ekstre Gönder"
                            >
                              <MessageCircle size={14} />
                            </a>

                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 8px' }}
                              onClick={() => openEditCariModal(ca)}
                              title="Cari Kartını Düzenle"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              className="btn btn-danger btn-sm"
                              style={{ padding: '6px 8px' }}
                              onClick={() => {
                                if (confirm(`"${ca.name}" cari hesabını ve tüm hareketlerini silmek istediğinize emin misiniz?`)) {
                                  onDeleteCurrentAccount(ca.id);
                                }
                              }}
                              title="Cariyi Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SEKME: BORÇ & ALACAK MUTABAKAT VE AÇIK HESAP TAKİBİ  */}
      {/* ======================================================== */}
      {activeTab === 'receivables' && (
        <div>
          {/* Üst Varlık & Net Pozisyon Özeti */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  İşletme Net Likidite & Finansal Güç
                </span>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '4px 0', color: totalCompanyWorth >= 0 ? '#10b981' : '#ef4444' }}>
                  {formatCurrency(totalCompanyWorth)}
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  Kasadaki Para ({formatCurrency(netBalance)}) + Müşteri Alacakları ({formatCurrency(cariTotals.totalReceivables)}) - Toptancı Borçları ({formatCurrency(cariTotals.totalPayables)})
                </p>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Toplanacak Alacak</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                    {formatCurrency(cariTotals.totalReceivables)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ödenecek Borç</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
                    {formatCurrency(cariTotals.totalPayables)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2 Sütun: Sol Müşteri Alacakları, Sağ Toptancı Borçları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {/* SOL: Müşterilerden Alacaklarımız */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '8px', borderRadius: '8px' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Müşteri Alacakları</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Piyasadan tahsil edilecek tutarlar</span>
                  </div>
                </div>
                <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>
                  {formatCurrency(cariTotals.totalReceivables)}
                </strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentAccounts.filter(c => c.balance > 0).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Tebrikler! Açıkta bekleyen müşteri alacağı bulunmamaktadır.
                  </div>
                ) : (
                  currentAccounts.filter(c => c.balance > 0).map(ca => (
                    <div 
                      key={ca.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px', 
                        background: 'var(--surface-color)', 
                        border: '1px solid var(--border-subtle)', 
                        borderRadius: 'var(--radius-sm)' 
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ca.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          📞 {ca.phone} {ca.district && `• ${ca.district}`}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <strong style={{ color: '#10b981', fontSize: '1rem' }}>
                            {formatCurrency(ca.balance)}
                          </strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Alacak</div>
                        </div>

                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedCariForStatement(ca)}
                          style={{ padding: '6px' }}
                          title="Ekstreyi Gör"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SAĞ: Toptancı & Parçacı Borçlarımız */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '8px', borderRadius: '8px' }}>
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Tedarikçi & Toptancı Borçları</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Parçacılara ödenecek vadeli tutarlar</span>
                  </div>
                </div>
                <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>
                  {formatCurrency(cariTotals.totalPayables)}
                </strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentAccounts.filter(c => c.balance < 0).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Harika! Toptancılara ödenmemiş borcunuz bulunmamaktadır.
                  </div>
                ) : (
                  currentAccounts.filter(c => c.balance < 0).map(ca => (
                    <div 
                      key={ca.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px', 
                        background: 'var(--surface-color)', 
                        border: '1px solid var(--border-subtle)', 
                        borderRadius: 'var(--radius-sm)' 
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ca.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          👤 {ca.authorizedPerson || 'Yetkili'} • 📞 {ca.phone}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <strong style={{ color: '#ef4444', fontSize: '1rem' }}>
                            {formatCurrency(Math.abs(ca.balance))}
                          </strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ödenecek</div>
                        </div>

                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedCariForStatement(ca)}
                          style={{ padding: '6px' }}
                          title="Ekstreyi Gör"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SEKME: KÂR / ZARAR & FİNANSAL GELİR-GİDER RAPORU     */}
      {/* ======================================================== */}
      {activeTab === 'profit_loss' && (
        <div>
          {/* Dönem Filtresi */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Dönemsel Kâr & Zarar Raporu</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>Hizmet cirosu, parça maliyetleri ve net kârlılık tablosu</p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`btn btn-sm ${plPeriod === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPlPeriod('today')}
              >
                Bugün
              </button>
              <button 
                className={`btn btn-sm ${plPeriod === 'this_week' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPlPeriod('this_week')}
              >
                Bu Hafta
              </button>
              <button 
                className={`btn btn-sm ${plPeriod === 'this_month' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPlPeriod('this_month')}
              >
                Bu Ay
              </button>
              <button 
                className={`btn btn-sm ${plPeriod === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPlPeriod('all')}
              >
                Tüm Zamanlar
              </button>
            </div>
          </div>

          {/* Rapor Kartları */}
          <div className="metrics-grid">
            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #10b981, #34d399)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <TrendingUp size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: '#10b981' }}>{formatCurrency(plData.income)}</h3>
                <p>Toplam Servis & Ciro Geliri</p>
              </div>
            </div>

            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #f59e0b, #fbbf24)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Briefcase size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: '#f59e0b' }}>{formatCurrency(plData.partsCost)}</h3>
                <p>Yedek Parça Maliyeti</p>
              </div>
            </div>

            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #ef4444, #f87171)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <ArrowDownRight size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: '#ef4444' }}>{formatCurrency(plData.operationalExpense)}</h3>
                <p>İşletme & Genel Giderler</p>
              </div>
            </div>

            <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #3b82f6, #60a5fa)' } as React.CSSProperties}>
              <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Wallet size={24} />
              </div>
              <div className="metric-data">
                <h3 style={{ color: plData.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                  {formatCurrency(plData.netProfit)}
                </h3>
                <p>NET KÂR (%{plData.profitMargin} Marj)</p>
              </div>
            </div>
          </div>

          {/* Gider Dağılımı ve Detay Listesi */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                Harcama & Gider Dağılımı
              </h4>
              {Object.keys(plData.expenseCategories).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Seçilen dönemde kaydedilmiş gider bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {Object.entries(plData.expenseCategories).map(([cat, amt]) => {
                    const percent = plData.expense > 0 ? ((amt / plData.expense) * 100).toFixed(0) : '0';
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{cat}</span>
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>{formatCurrency(amt)} (%{percent})</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: '#ef4444', borderRadius: '4px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                Finansal Kârlılık Özeti
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Toplam Ciro (Brüt Gelir):</span>
                  <strong>{formatCurrency(plData.income)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>- Parça Maliyeti (COGS):</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>-{formatCurrency(plData.partsCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                  <span style={{ fontWeight: 600 }}>Brüt Hizmet Kârı:</span>
                  <strong style={{ color: '#10b981' }}>{formatCurrency(plData.grossProfit)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>- Genel İşletme Giderleri:</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>-{formatCurrency(plData.operationalExpense)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', background: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', paddingLeft: '12px', paddingRight: '12px' }}>
                  <strong style={{ fontSize: '1.05rem' }}>DÖNEM NET KÂRI:</strong>
                  <strong style={{ fontSize: '1.15rem', color: plData.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(plData.netProfit)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: YENİ KASA / VİRMAN HAREKETİ MODALI              */}
      {/* ======================================================== */}
      {isCashModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCashModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Yeni Kasa Hareketi Ekle</h3>
              <button className="close-btn" onClick={() => setIsCashModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCashSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Gelir / Gider / Virman Switcher */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: cashType === 'income' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                      background: cashType === 'income' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: cashType === 'income' ? '#10b981' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => {
                      setCashType('income');
                      setCashCategory('Servis Tahsilatı');
                    }}
                  >
                    + Gelir
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: cashType === 'expense' ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
                      background: cashType === 'expense' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                      color: cashType === 'expense' ? '#ef4444' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => {
                      setCashType('expense');
                      setCashCategory('Yedek Parça Alımı');
                    }}
                  >
                    - Gider
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: cashType === 'transfer' ? '2px solid #3b82f6' : '1px solid var(--border-subtle)',
                      background: cashType === 'transfer' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: cashType === 'transfer' ? '#3b82f6' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => {
                      setCashType('transfer');
                      setCashCategory('Hesaplar Arası Virman');
                    }}
                  >
                    🔄 Virman
                  </button>
                </div>

                {cashType !== 'transfer' ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kategori</label>
                    <select 
                      className="form-control"
                      value={cashCategory}
                      onChange={e => setCashCategory(e.target.value)}
                    >
                      {cashType === 'income' ? (
                        <>
                          <option value="Servis Tahsilatı">Servis Tahsilatı</option>
                          <option value="Müşteri Cari Tahsilat">Müşteri Cari Tahsilat</option>
                          <option value="Yedek Parça Satışı">Yedek Parça Satışı</option>
                          <option value="Montaj & Kurulum">Montaj & Kurulum</option>
                          <option value="2. El Cihaz Satışı">2. El Cihaz Satışı</option>
                          <option value="Diğer Gelir">Diğer Gelir</option>
                        </>
                      ) : (
                        <>
                          <option value="Yedek Parça Alımı">Yedek Parça Alımı (Toptancı)</option>
                          <option value="Toptancı Cari Ödeme">Toptancı Cari Ödeme</option>
                          <option value="Servis Aracı Yakıt">Servis Aracı Yakıt / Benzin</option>
                          <option value="Dükkan Kirası">Dükkan Kirası</option>
                          <option value="Faturalar (Elektrik/Su/İnternet)">Faturalar (Elektrik/Su/İnternet)</option>
                          <option value="Personel & Yemek">Personel & Yemek</option>
                          <option value="Takım / Alet Ekipman">Takım / Alet Ekipman Alımı</option>
                          <option value="Muhasebeci & Resmi Harçlar">Muhasebeci & Resmi Harçlar</option>
                          <option value="Diğer Gider">Diğer Gider</option>
                        </>
                      )}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Çıkan Hesap (Kaynak)</label>
                      <select 
                        className="form-control"
                        value={cashPaymentMethod}
                        onChange={e => setCashPaymentMethod(e.target.value as PaymentMethod)}
                      >
                        <option value="cash">Nakit Dükkan Kasası</option>
                        <option value="bank_transfer">Banka Hesabı</option>
                        <option value="credit_card">POS / Kredi Kartı</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Giren Hesap (Hedef)</label>
                      <select 
                        className="form-control"
                        value={cashTargetMethod}
                        onChange={e => setCashTargetMethod(e.target.value as PaymentMethod)}
                      >
                        <option value="bank_transfer">Banka Hesabı</option>
                        <option value="cash">Nakit Dükkan Kasası</option>
                        <option value="credit_card">POS / Kredi Kartı</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tutar (TL) *</label>
                  <input 
                    type="number" 
                    required 
                    min={1} 
                    className="form-control" 
                    placeholder="Örn: 1500"
                    value={cashAmount}
                    onChange={e => setCashAmount(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Açıklama *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder={cashType === 'transfer' ? 'Örn: Dükkan nakit kasasından Ziraat Bankası hesabına yatırıldı' : 'Örn: Ege toptancıdan 5 adet pompa alımı'}
                    value={cashDescription}
                    onChange={e => setCashDescription(e.target.value)}
                  />
                </div>

                {cashType !== 'transfer' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kasa / Hesap</label>
                    <select 
                      className="form-control"
                      value={cashPaymentMethod}
                      onChange={e => setCashPaymentMethod(e.target.value as PaymentMethod)}
                    >
                      <option value="cash">Nakit Dükkan Kasası</option>
                      <option value="bank_transfer">Banka Havale / EFT</option>
                      <option value="credit_card">Kredi Kartı / POS</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCashModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} />
                  <span>Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CARİ KART AÇMA / DÜZENLEME MODALI               */}
      {/* ======================================================== */}
      {isCariModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCariModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{cariToEdit ? 'Cari Kartını Düzenle' : 'Yeni Cari Hesap Kartı Aç'}</h3>
              <button className="close-btn" onClick={() => setIsCariModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCariSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Cari Türü *</label>
                    <select 
                      className="form-control"
                      value={cariType}
                      onChange={e => setCariType(e.target.value as CurrentAccountType)}
                    >
                      <option value="supplier">🏢 Toptancı / Yedek Parçacı</option>
                      <option value="customer">👤 Açık Hesap Müşteri</option>
                      <option value="other">📌 Diğer / Kurumsal</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Yetkili / Muhatap Kişi</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Örn: Mustafa Bey (Satış Müdürü)"
                      value={cariAuthorizedPerson}
                      onChange={e => setCariAuthorizedPerson(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cari Ünvanı / Firma Adı *</label>
                  <input 
                    type="text" 
                    required
                    className="form-control" 
                    placeholder="Örn: Ege Soğutma & Yedek Parça Ltd. Şti."
                    value={cariName}
                    onChange={e => setCariName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Telefon Numarası *</label>
                    <input 
                      type="tel" 
                      required
                      className="form-control" 
                      placeholder="Örn: 0532 111 22 33"
                      value={cariPhone}
                      onChange={e => setCariPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Vergi Dairesi / No veya TC</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Örn: 1234567890"
                      value={cariTaxOrId}
                      onChange={e => setCariTaxOrId(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">İl</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={cariCity}
                      onChange={e => setCariCity(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">İlçe</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Örn: Konak, Bornova, Buca..."
                      value={cariDistrict}
                      onChange={e => setCariDistrict(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Açık Adres</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Örn: Gıda Çarşısı 1204 Sok. No:18 Konak/İzmir"
                    value={cariAddress}
                    onChange={e => setCariAddress(e.target.value)}
                  />
                </div>

                {!cariToEdit && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', background: 'var(--surface-color)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Açılış Devir Tutarı (TL)</label>
                      <input 
                        type="number" 
                        min={0}
                        className="form-control" 
                        placeholder="0"
                        value={cariInitialBalance}
                        onChange={e => setCariInitialBalance(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Bakiye Yönü</label>
                      <select 
                        className="form-control"
                        value={cariBalanceType}
                        onChange={e => setCariBalanceType(e.target.value as 'debt' | 'credit')}
                      >
                        <option value="debt">🔴 Borçluyuz (Biz Ödeyeceğiz)</option>
                        <option value="credit">🟢 Alacaklıyız (Para Gelecek)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kredi Limiti (TL)</label>
                    <input 
                      type="number" 
                      min={0}
                      className="form-control" 
                      placeholder="Örn: 25000"
                      value={cariCreditLimit}
                      onChange={e => setCariCreditLimit(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Özel Notlar</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Örn: Her ayın 15'inde hesap kesilir"
                      value={cariNotes}
                      onChange={e => setCariNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCariModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={18} />
                  <span>{cariToEdit ? 'Değişiklikleri Kaydet' : 'Cari Kartı Oluştur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CARİ EKSTRE & HESAP DÖKÜMÜ MODALI (DETAY)       */}
      {/* ======================================================== */}
      {selectedCariForStatement && (
        <div className="modal-overlay" onClick={() => setSelectedCariForStatement(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <div className="modal-header no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building size={22} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ margin: 0 }}>{selectedCariForStatement.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    Cari Hesap Ekstresi & Hareket Dökümü
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={generateCurrentAccountWhatsAppLink(
                    selectedCariForStatement,
                    currentAccountMovements,
                    shopName,
                    shopPhone
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp ile Gönder</span>
                </a>

                <button className="btn btn-secondary btn-sm" onClick={handlePrintLedger}>
                  <Printer size={16} />
                  <span>Yazdır</span>
                </button>

                <button className="close-btn" onClick={() => setSelectedCariForStatement(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body / Printable Content */}
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {/* Cari Bilgi Kartı */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', background: 'var(--surface-color)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CARİ TÜRÜ</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {selectedCariForStatement.type === 'supplier' ? '🏢 Toptancı / Yedek Parçacı' : '👤 Açık Hesap Müşteri'}
                  </div>
                  {selectedCariForStatement.authorizedPerson && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      Yetkili: {selectedCariForStatement.authorizedPerson}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>İLETİŞİM</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedCariForStatement.phone}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {selectedCariForStatement.district ? `${selectedCariForStatement.district} / ${selectedCariForStatement.city}` : selectedCariForStatement.city}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GÜNCEL HESAP BAKİYESİ</div>
                  <div 
                    style={{ 
                      fontSize: '1.35rem', 
                      fontWeight: 800, 
                      color: selectedCariForStatement.balance > 0 ? '#10b981' : selectedCariForStatement.balance < 0 ? '#ef4444' : 'var(--text-main)' 
                    }}
                  >
                    {formatCurrency(Math.abs(selectedCariForStatement.balance))}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: selectedCariForStatement.balance > 0 ? '#10b981' : selectedCariForStatement.balance < 0 ? '#ef4444' : 'var(--text-dim)' }}>
                    {selectedCariForStatement.balance > 0 ? '🟢 Firmamız Alacaklı' : selectedCariForStatement.balance < 0 ? '🔴 Firmamız Borçlu' : '⚪ Hesap Kapalı (0 TL)'}
                  </div>
                </div>
              </div>

              {/* Hızlı İşlem Ekleme Çubuğu */}
              <div className="no-print" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Hesap Hareketleri & Ekstre</h4>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsAddMovementOpen(!isAddMovementOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>{isAddMovementOpen ? 'Formu Kapat' : 'Yeni Hareket / Ödeme Ekle'}</span>
                </button>
              </div>

              {/* Yeni Hareket Ekleme Formu */}
              {isAddMovementOpen && (
                <form 
                  onSubmit={handleAddMovementSubmit} 
                  className="no-print"
                  style={{ background: 'var(--surface-color)', border: '1px solid var(--primary-light)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}
                >
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--primary)' }}>Yeni Cari Hareket / Ödeme Girişi</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">İşlem Türü</label>
                      <select 
                        className="form-control"
                        value={movementType}
                        onChange={e => setMovementType(e.target.value as 'debit' | 'credit')}
                      >
                        <option value="debit">
                          {selectedCariForStatement.type === 'supplier' ? '📦 Mal / Parça Alındı (Borcumuz Arttı)' : '🔧 Servis Bedeli / Mal Verildi'}
                        </option>
                        <option value="credit">
                          {selectedCariForStatement.type === 'supplier' ? '💰 Toptancıya Ödeme Yapıldı' : '💵 Müşteriden Tahsilat Alındı'}
                        </option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tutar (TL) *</label>
                      <input 
                        type="number" 
                        required 
                        min={1} 
                        className="form-control" 
                        placeholder="Örn: 1250"
                        value={movementAmount}
                        onChange={e => setMovementAmount(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Belge / Fatura No</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Örn: FAT-2026-99"
                        value={movementDocNo}
                        onChange={e => setMovementDocNo(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Ödeme Yöntemi</label>
                      <select 
                        className="form-control"
                        value={movementMethod}
                        onChange={e => setMovementMethod(e.target.value as PaymentMethod)}
                      >
                        <option value="cash">Nakit Kasa</option>
                        <option value="bank_transfer">Banka Havale / EFT</option>
                        <option value="credit_card">Kredi Kartı / POS</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Açıklama *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-control" 
                      placeholder="Örn: 2 adet buzdolabı motoru alımı veya banka ara ödemesi"
                      value={movementDescription}
                      onChange={e => setMovementDescription(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={movementAlsoCash} 
                        onChange={e => setMovementAlsoCash(e.target.checked)} 
                      />
                      <span>Bu hareketi Kasa/Muhasebe tablosuna da otomatik gelir/gider olarak işle</span>
                    </label>

                    <button type="submit" className="btn btn-primary btn-sm">
                      <Check size={16} />
                      <span>Hareketi Kaydet</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Hareket Tablosu */}
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Belge No</th>
                      <th>Açıklama</th>
                      <th>İşlem Türü</th>
                      <th style={{ textAlign: 'right' }}>Borç (TL)</th>
                      <th style={{ textAlign: 'right' }}>Alacak (TL)</th>
                      <th style={{ textAlign: 'right' }} className="no-print">Sil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAccountMovements.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          Bu cari hesaba ait henüz işlem hareketi kaydedilmemiş.
                        </td>
                      </tr>
                    ) : (
                      currentAccountMovements.map(m => {
                        const isDebit = m.type === 'debit';
                        return (
                          <tr key={m.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(m.date)}</td>
                            <td>{m.documentNo || '-'}</td>
                            <td style={{ maxWidth: '240px' }}>{m.description}</td>
                            <td>
                              <span 
                                className="badge"
                                style={{
                                  background: isDebit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                  color: isDebit ? '#ef4444' : '#10b981',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {isDebit ? 'Borç' : 'Alacak / Tahsilat'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: isDebit ? '#ef4444' : 'inherit' }}>
                              {isDebit ? formatCurrency(m.amount) : '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: !isDebit ? '#10b981' : 'inherit' }}>
                              {!isDebit ? formatCurrency(m.amount) : '-'}
                            </td>
                            <td style={{ textAlign: 'right' }} className="no-print">
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: '3px 6px' }}
                                onClick={() => {
                                  if (confirm('Bu cari hareketi silmek istediğinize emin misiniz?')) {
                                    onDeleteCurrentTransaction(m.id);
                                    // Güncel veriyi yenile
                                    setTimeout(() => {
                                      const refreshed = currentAccounts.find(a => a.id === selectedCariForStatement.id);
                                      if (refreshed) setSelectedCariForStatement(refreshed);
                                    }, 100);
                                  }
                                }}
                                title="Hareketi Sil"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer no-print">
              <button className="btn btn-secondary" onClick={() => setSelectedCariForStatement(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
