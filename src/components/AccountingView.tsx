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
  PieChart,
  FileSpreadsheet,
  HandCoins
} from 'lucide-react';
import { CashTransaction, PaymentMethod, CurrentAccount, CurrentAccountTransaction, CurrentAccountType, StaffMember, StaffPayment } from '../types';
import { formatCurrency, formatDate, formatDateOnly, generateCurrentAccountWhatsAppLink, getLocalDateString } from '../utils/helpers';
import { PeriodSelection, createDefaultPeriod, resolvePeriod, isInPeriod } from '../utils/period';
import { downloadXlsx, CellValue, SheetSpec } from '../utils/excelExport';
import { isDistributionCategory } from '../utils/staff';
import { PeriodSelector } from './PeriodSelector';
import { StaffDistributionTab, StaffFormData, StaffPaymentInput } from './StaffDistributionTab';
import { CariPicker, balanceLabel } from './CariPicker';

// Kasa ↔ Cari bağlantılı kategoriler (bu kategorilerde cari seçimi zorunludur)
const CARI_CASH_CATEGORIES = ['Müşteri Cari Tahsilat', 'Toptancı Cari Ödeme'];

// Bir cari hareketin bakiyeye etkisi (+ alacağımız artar, - borcumuz artar).
// storage.getTransactionEffect ile aynı kural.
const cariTxEffect = (accType: CurrentAccountType, txType: 'debit' | 'credit', amount: number): number => {
  const amt = Math.abs(Number(amount) || 0);
  if (accType === 'supplier') return txType === 'debit' ? -amt : amt;
  return txType === 'debit' ? amt : -amt;
};

// Kasa hareketinin yönüne göre cari hareket türü
// Toptancı: gider = ödeme (credit), gelir = iade/para geldi (debit)
// Müşteri : gelir = tahsilat (credit), gider = müşteriye para verildi (debit)
const cashToCariTxType = (accType: CurrentAccountType, cashType: 'income' | 'expense'): 'debit' | 'credit' => {
  if (accType === 'supplier') return cashType === 'expense' ? 'credit' : 'debit';
  return cashType === 'income' ? 'credit' : 'debit';
};

// Bu hareket türü bakiyeyi kapatıyorsa, kapatmak için gereken tutar
const closingAmountFor = (acc: CurrentAccount, txType: 'debit' | 'credit'): number => {
  const bal = Number(acc.balance) || 0;
  if (bal === 0) return 0;
  const dir = cariTxEffect(acc.type, txType, 1);
  return Math.sign(dir) !== Math.sign(bal) ? Math.abs(bal) : 0;
};

// <input type="date"> değerini ISO tarihe çevirir (bugün ise şu anki saat kullanılır)
const dateInputToIso = (val: string): string => {
  if (!val || val === getLocalDateString()) return new Date().toISOString();
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).toISOString();
};

// Kasa hesabı etiketleri (Excel çıktısı için)
const paymentMethodLabel = (m?: string): string => {
  if (m === 'cash') return 'Nakit Kasa';
  if (m === 'credit_card') return 'POS / Kart';
  if (m === 'bank_transfer') return 'Banka Havale';
  if (m === 'other') return 'Diğer';
  return '-';
};

const txTypeLabel = (t: CashTransaction['type']): string =>
  t === 'income' ? 'Gelir' : t === 'expense' ? 'Gider' : 'Virman';

// Kasa hareketlerini Excel sayfasına dönüştürür (en altta toplam satırı ile)
const buildCashTransactionsSheet = (list: CashTransaction[], name = 'Kasa Hareketleri'): SheetSpec => {
  const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const header: CellValue[] = ['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Kasa / Hesap', 'Hedef Hesap', 'Gelir (₺)', 'Gider (₺)', 'Virman (₺)'].map(h => ({ value: h, style: 'header' as const }));
  let inc = 0, exp = 0, trf = 0;
  const rows: CellValue[][] = sorted.map(t => {
    if (t.type === 'income') inc += t.amount;
    else if (t.type === 'expense') exp += t.amount;
    else trf += t.amount;
    return [
      new Date(t.date),
      txTypeLabel(t.type),
      t.category,
      t.description,
      paymentMethodLabel(t.paymentMethod),
      t.type === 'transfer' ? paymentMethodLabel(t.targetAccountId) : '',
      t.type === 'income' ? { value: t.amount, style: 'currency' } : null,
      t.type === 'expense' ? { value: t.amount, style: 'currency' } : null,
      t.type === 'transfer' ? { value: t.amount, style: 'currency' } : null,
    ];
  });
  rows.push([]);
  rows.push([
    { value: 'TOPLAM', style: 'bold' }, `${sorted.length} işlem`, '', '', '', '',
    { value: inc, style: 'boldCurrency' },
    { value: exp, style: 'boldCurrency' },
    { value: trf, style: 'boldCurrency' },
  ]);
  rows.push([
    { value: 'NET (Gelir - Gider)', style: 'bold' }, '', '', '', '', '',
    { value: inc - exp, style: 'boldCurrency' },
  ]);
  return {
    name,
    rows: [header, ...rows],
    headerRowIndex: 0,
    columnWidths: [18, 10, 24, 48, 16, 16, 15, 15, 15],
  };
};

interface AccountingViewProps {
  transactions: CashTransaction[];
  onAddTransaction: (tx: Omit<CashTransaction, 'id'>) => void;
  onDeleteTransaction: (id: string, alsoDeleteLinkedCurrentTx?: boolean) => void;
  currentAccounts: CurrentAccount[];
  onAddCurrentAccount: (ca: Omit<CurrentAccount, 'id' | 'createdAt' | 'updatedAt' | 'balance'> & { initialBalance?: number }) => void;
  onUpdateCurrentAccount: (id: string, updates: Partial<CurrentAccount>) => void;
  onDeleteCurrentAccount: (id: string) => void;
  currentTransactions: CurrentAccountTransaction[];
  onAddCurrentTransaction: (
    ctx: Omit<CurrentAccountTransaction, 'id' | 'createdAt'>,
    alsoCreateCashTx?: boolean,
    cashOptions?: { category?: string; description?: string }
  ) => void;
  onDeleteCurrentTransaction: (id: string, alsoDeleteLinkedCash?: boolean) => void;
  staff: StaffMember[];
  staffPayments: StaffPayment[];
  onSaveStaff: (data: StaffFormData, id?: string) => void;
  onDeleteStaff: (id: string) => 'deleted' | 'deactivated';
  onAddStaffPayments: (entries: StaffPaymentInput[], alsoCreateCashTx?: boolean) => void;
  onDeleteStaffPayment: (id: string) => void;
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
  staff,
  staffPayments,
  onSaveStaff,
  onDeleteStaff,
  onAddStaffPayments,
  onDeleteStaffPayment,
  shopName,
  shopPhone,
}) => {
  // Aktif Ana Sekme
  const [activeTab, setActiveTab] = useState<'cash' | 'current' | 'receivables' | 'profit_loss' | 'distribution'>('cash');

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
  const [cashCariId, setCashCariId] = useState('');               // Kasa hareketine bağlı cari
  const [cashDate, setCashDate] = useState(getLocalDateString());

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
  const [movementDate, setMovementDate] = useState(getLocalDateString());

  // Ekstre modalında her zaman GÜNCEL cari verisi kullanılır (eski kopya bakiyeyi göstermesin)
  const activeCari = useMemo(() => {
    if (!selectedCariForStatement) return null;
    return currentAccounts.find(a => a.id === selectedCariForStatement.id) || selectedCariForStatement;
  }, [selectedCariForStatement, currentAccounts]);

  // --- KÂR / ZARAR DÖNEM SEÇİMİ ---
  // Bugün / Bu Hafta / Bu Ay / Tüm Zamanlar + Belirli Gün / Belirli Ay / Özel Tarih Aralığı
  const [plPeriod, setPlPeriod] = useState<PeriodSelection>(() => createDefaultPeriod('this_month'));
  const plRange = useMemo(() => resolvePeriod(plPeriod), [plPeriod]);

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

  // Kasa hareketi → bağlı cari eşleşmesi (yalnızca görüntüleme amaçlı, veriye dokunmaz)
  // 1) relatedCashTxId ile kesin bağlantı  2) Eski kayıtlar için "Cari Adı - açıklama" deseni
  const cashCariLinks = useMemo(() => {
    const map = new Map<string, { accountId: string; name: string; strict: boolean }>();
    currentTransactions.forEach(ct => {
      if (ct.relatedCashTxId) {
        const acc = currentAccounts.find(a => a.id === ct.accountId);
        map.set(ct.relatedCashTxId, { accountId: ct.accountId, name: acc?.name || ct.accountName, strict: true });
      }
    });
    const byLongestName = [...currentAccounts].sort((a, b) => b.name.length - a.name.length);
    transactions.forEach(t => {
      if (map.has(t.id) || !CARI_CASH_CATEGORIES.includes(t.category)) return;
      const acc = byLongestName.find(a => a.name && t.description.startsWith(a.name + ' - '));
      if (acc) map.set(t.id, { accountId: acc.id, name: acc.name, strict: false });
    });
    return map;
  }, [transactions, currentTransactions, currentAccounts]);

  // Filtrelenmiş Kasa Hareketleri
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (cashFilterType !== 'all' && t.type !== cashFilterType) return false;
      if (cashSearchQuery.trim()) {
        const q = cashSearchQuery.toLocaleLowerCase('tr-TR');
        const cariName = cashCariLinks.get(t.id)?.name || '';
        return (
          t.description.toLocaleLowerCase('tr-TR').includes(q) ||
          t.category.toLocaleLowerCase('tr-TR').includes(q) ||
          cariName.toLocaleLowerCase('tr-TR').includes(q)
        );
      }
      return true;
    });
  }, [transactions, cashFilterType, cashSearchQuery, cashCariLinks]);

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
    const periodTransactions = transactions
      .filter(t => isInPeriod(t.date, plRange))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // Ortaklara kâr payı / şahsi çekim gider değil, kâr dağıtımıdır → ayrı izlenir
    const distributed = periodTransactions
      .filter(t => t.type === 'expense' && isDistributionCategory(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = periodTransactions
      .filter(t => t.type === 'expense' && !isDistributionCategory(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    const partsCost = periodTransactions
      .filter(t => t.type === 'expense' && (t.category.includes('Parça') || t.category.includes('Yedek')))
      .reduce((sum, t) => sum + t.amount, 0);

    const operationalExpense = expense - partsCost;
    const grossProfit = income - partsCost;
    const netProfit = income - expense;
    const retainedProfit = netProfit - distributed;
    const profitMargin = income > 0 ? ((netProfit / income) * 100).toFixed(1) : '0';

    // Kategoriye Göre Gider Dağılımı (kâr dağıtımları hariç)
    const expenseCategories: Record<string, number> = {};
    periodTransactions
      .filter(t => t.type === 'expense' && !isDistributionCategory(t.category))
      .forEach(t => {
        expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
      });

    // Kategoriye Göre Gelir Dağılımı
    const incomeCategories: Record<string, number> = {};
    periodTransactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        incomeCategories[t.category] = (incomeCategories[t.category] || 0) + t.amount;
      });

    return {
      income,
      expense,
      partsCost,
      operationalExpense,
      grossProfit,
      netProfit,
      distributed,
      retainedProfit,
      profitMargin,
      expenseCategories,
      incomeCategories,
      transactions: periodTransactions,
      count: periodTransactions.length
    };
  }, [transactions, plRange]);

  // Seçili dönemin Kâr / Zarar raporunu Excel olarak indir
  const handleExportProfitLoss = () => {
    const nowStr = formatDate(new Date().toISOString());
    const margin = plData.income > 0 ? plData.netProfit / plData.income : 0;

    // 1) Özet sayfası
    const summaryRows: CellValue[][] = [
      [{ value: `${shopName || 'ServisPro'} – Kâr / Zarar Raporu`, style: 'title' }],
      [{ value: `Dönem: ${plRange.label}`, style: 'subtitle' }],
      [{ value: `Oluşturulma: ${nowStr}`, style: 'subtitle' }],
      [],
      [{ value: 'Kalem', style: 'header' }, { value: 'Tutar', style: 'header' }, { value: 'Oran', style: 'header' }],
      ['Toplam Servis & Ciro Geliri', { value: plData.income, style: 'currency' }, null],
      ['Yedek Parça Maliyeti', { value: plData.partsCost, style: 'currency' }, plData.income > 0 ? { value: plData.partsCost / plData.income, style: 'percent' } : null],
      [{ value: 'Brüt Hizmet Kârı', style: 'bold' }, { value: plData.grossProfit, style: 'boldCurrency' }, null],
      ['İşletme & Genel Giderler', { value: plData.operationalExpense, style: 'currency' }, plData.income > 0 ? { value: plData.operationalExpense / plData.income, style: 'percent' } : null],
      ['Toplam Gider', { value: plData.expense, style: 'currency' }, null],
      [{ value: 'DÖNEM NET KÂRI', style: 'bold' }, { value: plData.netProfit, style: 'boldCurrency' }, { value: margin, style: 'percent' }],
      ['Ortaklara Dağıtılan Kâr (Kâr Payı + Çekim)', { value: plData.distributed, style: 'currency' }, null],
      [{ value: 'Dağıtım Sonrası Şirkette Kalan', style: 'bold' }, { value: plData.retainedProfit, style: 'boldCurrency' }, null],
      ['İşlem Sayısı', plData.count, null],
      [],
      [{ value: 'Gider Kategorisi', style: 'header' }, { value: 'Tutar', style: 'header' }, { value: 'Pay', style: 'header' }],
      ...(Object.keys(plData.expenseCategories).length === 0
        ? [['Bu dönemde gider yok']] as CellValue[][]
        : Object.entries(plData.expenseCategories)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amt]): CellValue[] => [cat, { value: amt, style: 'currency' }, { value: plData.expense > 0 ? amt / plData.expense : 0, style: 'percent' }])),
      [],
      [{ value: 'Gelir Kategorisi', style: 'header' }, { value: 'Tutar', style: 'header' }, { value: 'Pay', style: 'header' }],
      ...(Object.keys(plData.incomeCategories).length === 0
        ? [['Bu dönemde gelir yok']] as CellValue[][]
        : Object.entries(plData.incomeCategories)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amt]): CellValue[] => [cat, { value: amt, style: 'currency' }, { value: plData.income > 0 ? amt / plData.income : 0, style: 'percent' }])),
    ];

    // 2) Günlük kırılım sayfası
    const daily: Record<string, { income: number; expense: number; count: number }> = {};
    plData.transactions.forEach(t => {
      const key = getLocalDateString(new Date(t.date));
      if (!daily[key]) daily[key] = { income: 0, expense: 0, count: 0 };
      daily[key].count += 1;
      if (t.type === 'income') daily[key].income += t.amount;
      else if (t.type === 'expense') daily[key].expense += t.amount;
    });
    const dailyKeys = Object.keys(daily).sort();
    const dailyRows: CellValue[][] = [
      ['Tarih', 'Gelir (₺)', 'Gider (₺)', 'Net (₺)', 'İşlem Sayısı'].map(h => ({ value: h, style: 'header' as const })),
      ...dailyKeys.map((k): CellValue[] => {
        const [y, m, d] = k.split('-').map(Number);
        const row = daily[k];
        return [
          { value: new Date(y, m - 1, d), style: 'date' },
          { value: row.income, style: 'currency' },
          { value: row.expense, style: 'currency' },
          { value: row.income - row.expense, style: 'currency' },
          row.count,
        ];
      }),
      [],
      [
        { value: 'TOPLAM', style: 'bold' },
        { value: plData.income, style: 'boldCurrency' },
        { value: plData.expense, style: 'boldCurrency' },
        { value: plData.netProfit, style: 'boldCurrency' },
        { value: plData.count, style: 'bold' },
      ],
    ];

    downloadXlsx(`kar_zarar_raporu_${plRange.fileTag}`, [
      { name: 'Özet', rows: summaryRows, columnWidths: [38, 20, 12] },
      buildCashTransactionsSheet(plData.transactions),
      { name: 'Günlük Özet', rows: dailyRows, headerRowIndex: 0, columnWidths: [14, 16, 16, 16, 13] },
    ]);
  };

  // Kasa & Banka sekmesinde filtrelenmiş listeyi Excel olarak indir
  const handleExportCashList = () => {
    downloadXlsx(`kasa_hareketleri_${getLocalDateString()}`, [buildCashTransactionsSheet(filteredTransactions)]);
  };

  // ==========================================
  // HANDLERS
  // ==========================================

  // Kasa modalını temiz bir formla aç
  const openCashModal = () => {
    setCashAmount('');
    setCashDescription('');
    setCashCariId('');
    setCashDate(getLocalDateString());
    setIsCashModalOpen(true);
  };

  // Kasa Hareketi Ekleme Formu
  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Math.round((parseFloat(cashAmount) || 0) * 100) / 100;
    if (!numAmount || numAmount <= 0) {
      alert('Lütfen geçerli bir tutar giriniz.');
      return;
    }

    const txDate = dateInputToIso(cashDate);
    const linkedCari = cashType !== 'transfer' ? currentAccounts.find(a => a.id === cashCariId) : undefined;

    if (cashType !== 'transfer' && CARI_CASH_CATEGORIES.includes(cashCategory) && !linkedCari) {
      alert('Bu kategori bir cari hesaba işlenir. Lütfen listeden cari hesabı seçiniz.');
      return;
    }
    if (!cashDescription.trim() && !linkedCari) {
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
        date: txDate,
        description: cashDescription.trim(),
        paymentMethod: cashPaymentMethod,
        targetAccountId: cashTargetMethod,
      });
    } else if (linkedCari) {
      // Cariye bağlı kasa hareketi: hem kasaya hem cari ekstresine işlenir,
      // cari bakiyesi MEVCUT bakiyenin üzerine güncellenir.
      const ctxType = cashToCariTxType(linkedCari.type, cashType);
      const desc = cashDescription.trim() || (cashType === 'income' ? 'Tahsilat' : 'Ödeme');
      onAddCurrentTransaction(
        {
          accountId: linkedCari.id,
          accountName: linkedCari.name,
          type: ctxType,
          amount: numAmount,
          date: txDate,
          description: desc,
          paymentMethod: cashPaymentMethod,
        },
        true,
        { category: cashCategory, description: `${linkedCari.name} - ${desc}` }
      );
    } else {
      onAddTransaction({
        type: cashType,
        category: cashCategory,
        amount: numAmount,
        date: txDate,
        description: cashDescription.trim(),
        paymentMethod: cashPaymentMethod,
      });
    }

    setIsCashModalOpen(false);
    setCashAmount('');
    setCashDescription('');
    setCashCariId('');
  };

  // Kasa hareketini sil (bağlı cari hareketi varsa kullanıcıya sorulur)
  const handleDeleteCashTx = (tx: CashTransaction) => {
    if (!confirm('Bu kasa hareketini silmek istediğinize emin misiniz?')) return;
    const link = cashCariLinks.get(tx.id);
    let alsoCari = false;
    if (link?.strict) {
      alsoCari = confirm(
        `Bu kasa hareketi "${link.name}" carisine de işlenmişti.\n\n` +
        `Tamam: Cari hareketi de sil (cari bakiyesi geri alınır)\nİptal: Sadece kasa kaydını sil, cari ekstresi kalsın`
      );
    }
    onDeleteTransaction(tx.id, alsoCari);
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

  // Cari Hareket Ekleme (Ekstre Modalı İçinden) – mevcut bakiyenin üzerine işlenir
  const handleAddMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCari) return;

    const amt = Math.round((parseFloat(movementAmount) || 0) * 100) / 100;
    if (!amt || amt <= 0) {
      alert('Lütfen geçerli bir tutar giriniz.');
      return;
    }
    const isSupplier = activeCari.type === 'supplier';
    const defaultDesc = movementType === 'credit'
      ? (isSupplier ? 'Toptancıya ödeme' : 'Tahsilat')
      : (isSupplier ? 'Mal / parça alımı' : 'Servis / satış bedeli');

    onAddCurrentTransaction({
      accountId: activeCari.id,
      accountName: activeCari.name,
      type: movementType,
      amount: amt,
      date: dateInputToIso(movementDate),
      description: movementDescription.trim() || defaultDesc,
      documentNo: movementDocNo.trim() || undefined,
      paymentMethod: movementMethod,
    }, movementAlsoCash);

    setIsAddMovementOpen(false);
    setMovementAmount('');
    setMovementDescription('');
    setMovementDocNo('');
  };

  // Ekstrede yeni hareket formunu belirli bir türle aç
  const openMovementForm = (type: 'debit' | 'credit') => {
    setMovementType(type);
    // Veresiye (borç) hareketleri kasaya para girişi/çıkışı değildir
    setMovementAlsoCash(type === 'credit');
    setMovementAmount('');
    setMovementDescription('');
    setMovementDocNo('');
    setMovementDate(getLocalDateString());
    setIsAddMovementOpen(true);
  };

  const openStatement = (ca: CurrentAccount, quickType?: 'debit' | 'credit') => {
    setSelectedCariForStatement(ca);
    if (quickType) openMovementForm(quickType);
    else setIsAddMovementOpen(false);
  };

  const closeStatement = () => {
    setSelectedCariForStatement(null);
    setIsAddMovementOpen(false);
  };

  // Cari hareketi sil (kasaya da işlenmişse kullanıcıya sorulur)
  const handleDeleteMovement = (m: CurrentAccountTransaction) => {
    if (!confirm(`"${m.description}" hareketini silmek istediğinize emin misiniz?\nCari bakiyesi yalnızca bu hareketin tutarı kadar geri alınır.`)) return;
    let alsoCash = false;
    if (m.relatedCashTxId && transactions.some(t => t.id === m.relatedCashTxId)) {
      alsoCash = confirm(
        'Bu hareket kasaya da işlenmişti.\n\n' +
        'Tamam: Bağlı kasa kaydını da sil\nİptal: Kasa kaydı kalsın'
      );
    }
    onDeleteCurrentTransaction(m.id, alsoCash);
  };

  // Cari Ekstre Yazdırma
  const handlePrintLedger = () => {
    window.print();
  };

  // Seçili carinin hareketleri + yürüyen bakiye.
  // Kayıtlı hareketlerin toplamı cari bakiyesini açıklamıyorsa aradaki fark
  // "önceki devir" olarak gösterilir (veritabanına hiçbir şey yazılmaz).
  const ledger = useMemo(() => {
    const empty = { rows: [] as { m: CurrentAccountTransaction; running: number }[], movements: [] as CurrentAccountTransaction[], openingOffset: 0, debitTotal: 0, creditTotal: 0 };
    if (!activeCari) return empty;
    const movements = currentTransactions
      .filter(t => t.accountId === activeCari.id)
      .sort((a, b) =>
        (new Date(a.date).getTime() - new Date(b.date).getTime()) ||
        String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      );
    const sumEffects = movements.reduce((s, t) => s + cariTxEffect(activeCari.type, t.type, Number(t.amount) || 0), 0);
    const rawOffset = Math.round(((Number(activeCari.balance) || 0) - sumEffects) * 100) / 100;
    const openingOffset = Math.abs(rawOffset) < 0.01 ? 0 : rawOffset;
    let running = openingOffset;
    let debitTotal = 0;
    let creditTotal = 0;
    const rows = movements.map(m => {
      const amt = Number(m.amount) || 0;
      running = Math.round((running + cariTxEffect(activeCari.type, m.type, amt)) * 100) / 100;
      if (m.type === 'debit') debitTotal += amt; else creditTotal += amt;
      return { m, running };
    });
    return { rows, movements, openingOffset, debitTotal, creditTotal };
  }, [currentTransactions, activeCari]);

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
            <>
              <button
                id="cash-export-excel-btn"
                className="btn btn-excel"
                onClick={handleExportCashList}
                disabled={filteredTransactions.length === 0}
                title="Listelenen kasa hareketlerini Excel'e aktar"
              >
                <FileSpreadsheet size={18} />
                <span>Excel'e Aktar</span>
              </button>
              <button id="cash-add-btn" className="btn btn-primary" onClick={openCashModal}>
                <Plus size={18} />
                <span>Yeni Kasa Hareketi Ekle</span>
              </button>
            </>
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

        <button
          id="accounting-tab-distribution"
          className={`btn ${activeTab === 'distribution' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('distribution')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}
        >
          <HandCoins size={18} />
          <span>Para Dağıtımı & Personel ({staff.filter(s => s.active).length})</span>
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
                        <td style={{ maxWidth: '320px' }}>
                          {tx.description}
                          {(() => {
                            const link = cashCariLinks.get(tx.id);
                            if (!link) return null;
                            const acc = currentAccounts.find(a => a.id === link.accountId);
                            return (
                              <div>
                                <button
                                  type="button"
                                  className="cari-link-chip"
                                  onClick={() => acc && openStatement(acc)}
                                  disabled={!acc}
                                  title={acc ? 'Cari ekstresini aç' : 'Cari kartı bulunamadı'}
                                >
                                  <Users size={11} />
                                  <span>{link.name}</span>
                                  {acc && <ExternalLink size={10} />}
                                </button>
                              </div>
                            );
                          })()}
                        </td>
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
                            onClick={() => handleDeleteCashTx(tx)}
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
                              onClick={() => openStatement(ca)}
                              title="Cari Ekstre ve Hareketleri İncele"
                            >
                              <FileText size={14} />
                              <span>Ekstre</span>
                            </button>

                            <button
                              id={`cari-quick-pay-${ca.id}`}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => openStatement(ca, 'credit')}
                              title={isSupplier ? 'Mevcut borcun üzerine ödeme işle' : 'Mevcut alacağın üzerine tahsilat işle'}
                            >
                              <HandCoins size={14} />
                              <span>{isSupplier ? 'Ödeme' : 'Tahsilat'}</span>
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
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px', padding: '18px 20px' }}>
            <div style={{ minWidth: '220px' }}>
              <h3 style={{ margin: 0 }}>Dönemsel Kâr & Zarar Raporu</h3>
              <p style={{ margin: '2px 0 12px 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Hizmet cirosu, parça maliyetleri ve net kârlılık tablosu</p>
              <button
                id="pl-export-excel-btn"
                type="button"
                className="btn btn-excel btn-sm"
                onClick={handleExportProfitLoss}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FileSpreadsheet size={15} />
                <span>Bu Dönemi Excel'e Aktar ({plData.count} işlem)</span>
              </button>
            </div>

            <PeriodSelector value={plPeriod} onChange={setPlPeriod} idPrefix="pl-period" />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>- Ortaklara Dağıtılan Kâr:</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>-{formatCurrency(plData.distributed)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <span style={{ fontWeight: 600 }}>Dağıtım Sonrası Şirkette Kalan:</span>
                  <strong style={{ color: plData.retainedProfit >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(plData.retainedProfit)}</strong>
                </div>
                <button
                  id="pl-goto-distribution-btn"
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('distribution')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
                >
                  <HandCoins size={14} />
                  <span>Para Dağıtımı & Personel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Seçili Dönemin Kasa Hareketleri */}
          <div className="card" style={{ padding: '20px', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="var(--primary)" />
                Dönem Hareketleri – {plRange.label} ({plData.count})
              </h4>
            </div>
            {plData.transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Seçilen dönemde kayıtlı kasa hareketi bulunmuyor.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Tür</th>
                      <th>Kategori</th>
                      <th>Açıklama</th>
                      <th>Hesap</th>
                      <th style={{ textAlign: 'right' }}>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plData.transactions.map(tx => {
                      const isIncome = tx.type === 'income';
                      const isTransfer = tx.type === 'transfer';
                      const color = isTransfer ? '#3b82f6' : isIncome ? '#10b981' : '#ef4444';
                      return (
                        <tr key={tx.id}>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</td>
                          <td>
                            <span className="badge" style={{ background: isTransfer ? 'rgba(59, 130, 246, 0.15)' : isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color }}>
                              {isTransfer ? 'Virman' : isIncome ? '+ Gelir' : '- Gider'}
                            </span>
                          </td>
                          <td><strong>{tx.category}</strong></td>
                          <td style={{ maxWidth: '320px' }}>{tx.description}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{paymentMethodLabel(tx.paymentMethod)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <strong style={{ color }}>{isTransfer ? '' : isIncome ? '+' : '-'}{formatCurrency(tx.amount)}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SEKME: ŞİRKET İÇİ PARA DAĞITIMI (ORTAK / PERSONEL)    */}
      {/* ======================================================== */}
      {activeTab === 'distribution' && (
        <StaffDistributionTab
          transactions={transactions}
          staff={staff}
          staffPayments={staffPayments}
          onSaveStaff={onSaveStaff}
          onDeleteStaff={onDeleteStaff}
          onAddStaffPayments={onAddStaffPayments}
          onDeleteStaffPayment={onDeleteStaffPayment}
          shopName={shopName}
        />
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
                      setCashCategory(cashCariId ? 'Müşteri Cari Tahsilat' : 'Servis Tahsilatı');
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
                      setCashCategory(cashCariId ? 'Toptancı Cari Ödeme' : 'Yedek Parça Alımı');
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

                {cashType !== 'transfer' && (() => {
                  const isCariCategory = CARI_CASH_CATEGORIES.includes(cashCategory);
                  const selCari = currentAccounts.find(a => a.id === cashCariId);
                  return (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="cash-cari-picker">
                        Cari Hesap {isCariCategory
                          ? <span style={{ color: '#ef4444' }}>* (zorunlu)</span>
                          : <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(isteğe bağlı – seçilirse cari bakiyesine de işlenir)</span>}
                      </label>
                      <CariPicker
                        id="cash-cari-picker"
                        accounts={currentAccounts}
                        value={cashCariId}
                        preferType={cashType === 'income' ? 'customer' : 'supplier'}
                        required={isCariCategory}
                        onChange={id => {
                          setCashCariId(id);
                          // Cari seçilince kategoriyi otomatik cari kategorisine al
                          if (id && !CARI_CASH_CATEGORIES.includes(cashCategory)) {
                            setCashCategory(cashType === 'income' ? 'Müşteri Cari Tahsilat' : 'Toptancı Cari Ödeme');
                          }
                        }}
                      />
                      {selCari && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                          {cashType === 'income'
                            ? (selCari.type === 'supplier' ? 'Toptancıdan para geldi (iade): borcumuz artar / alacağımız azalır.' : 'Müşteriden tahsilat: alacağımız azalır.')
                            : (selCari.type === 'supplier' ? 'Toptancıya ödeme: borcumuz azalır.' : 'Müşteriye para verildi (iade): alacağımız artar / borcumuz azalır.')}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tutar (TL) *</label>
                  <input 
                    id="cash-amount"
                    type="number" 
                    required 
                    min={0.01}
                    step="0.01"
                    className="form-control" 
                    placeholder="Örn: 1500"
                    value={cashAmount}
                    onChange={e => setCashAmount(e.target.value)}
                  />
                  {(() => {
                    const selCari = cashType !== 'transfer' ? currentAccounts.find(a => a.id === cashCariId) : undefined;
                    if (!selCari) return null;
                    const closing = closingAmountFor(selCari, cashToCariTxType(selCari.type, cashType as 'income' | 'expense'));
                    return closing > 0 ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '6px', fontSize: '0.75rem', padding: '3px 8px' }}
                        onClick={() => setCashAmount(String(closing))}
                      >
                        Bakiyenin tamamı: {formatCurrency(closing)}
                      </button>
                    ) : null;
                  })()}
                </div>

                {/* Cari seçiliyse: mevcut bakiye → işlem sonrası bakiye */}
                {(() => {
                  const selCari = cashType !== 'transfer' ? currentAccounts.find(a => a.id === cashCariId) : undefined;
                  if (!selCari) return null;
                  const amt = parseFloat(cashAmount) || 0;
                  const delta = cariTxEffect(selCari.type, cashToCariTxType(selCari.type, cashType as 'income' | 'expense'), amt);
                  const next = Math.round((selCari.balance + delta) * 100) / 100;
                  const cur = balanceLabel(selCari.balance);
                  const nxt = balanceLabel(next);
                  return (
                    <div className="balance-preview">
                      <div className="balance-preview-cell">
                        <span>Mevcut Cari Bakiye</span>
                        <strong style={{ color: cur.color }}>{formatCurrency(Math.abs(selCari.balance))}</strong>
                        <small style={{ color: cur.color }}>{selCari.balance > 0 ? 'Alacağımız' : selCari.balance < 0 ? 'Borcumuz' : 'Kapalı'}</small>
                      </div>
                      <div className="balance-preview-delta">
                        <ChevronRight size={18} />
                        <span style={{ color: delta >= 0 ? '#10b981' : '#ef4444' }}>
                          {amt > 0 ? `${delta >= 0 ? '+' : '-'}${formatCurrency(Math.abs(delta))}` : '—'}
                        </span>
                      </div>
                      <div className="balance-preview-cell is-next">
                        <span>İşlem Sonrası</span>
                        <strong style={{ color: nxt.color }}>{formatCurrency(Math.abs(next))}</strong>
                        <small style={{ color: nxt.color }}>{next > 0 ? 'Alacağımız' : next < 0 ? 'Borcumuz' : 'Hesap kapanır'}</small>
                      </div>
                    </div>
                  );
                })()}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Açıklama {cashType !== 'transfer' && cashCariId ? <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(boş bırakılırsa "{cashType === 'income' ? 'Tahsilat' : 'Ödeme'}")</span> : '*'}</label>
                  <input 
                    id="cash-description"
                    type="text" 
                    required={!(cashType !== 'transfer' && cashCariId)}
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">İşlem Tarihi</label>
                  <input
                    id="cash-date"
                    type="date"
                    className="form-control"
                    value={cashDate}
                    max={getLocalDateString()}
                    onChange={e => setCashDate(e.target.value)}
                  />
                </div>
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

                {cariToEdit && (() => {
                  const live = currentAccounts.find(a => a.id === cariToEdit.id) || cariToEdit;
                  const bl = balanceLabel(live.balance);
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: 'var(--surface-color)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-hover)' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Güncel Bakiye (korunur)</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: bl.color }}>{bl.text}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Kart bilgilerini düzenlemek bakiyeyi değiştirmez.</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setIsCariModalOpen(false); openStatement(live, 'debit'); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Plus size={14} />
                        <span>Bakiyeye Hareket Ekle</span>
                      </button>
                    </div>
                  );
                })()}

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
      {activeCari && (
        <div className="modal-overlay" onClick={closeStatement}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '920px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <div className="modal-header no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building size={22} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ margin: 0 }}>{activeCari.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    Cari Hesap Ekstresi & Hareket Dökümü
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={generateCurrentAccountWhatsAppLink(
                    activeCari,
                    ledger.movements,
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

                <button className="close-btn" onClick={closeStatement}>
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
                    {activeCari.type === 'supplier' ? '🏢 Toptancı / Yedek Parçacı' : activeCari.type === 'other' ? '📌 Diğer / Kurumsal' : '👤 Açık Hesap Müşteri'}
                  </div>
                  {activeCari.authorizedPerson && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      Yetkili: {activeCari.authorizedPerson}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>İLETİŞİM</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{activeCari.phone}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {activeCari.district ? `${activeCari.district} / ${activeCari.city}` : activeCari.city}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GÜNCEL HESAP BAKİYESİ</div>
                  <div 
                    style={{ 
                      fontSize: '1.35rem', 
                      fontWeight: 800, 
                      color: activeCari.balance > 0 ? '#10b981' : activeCari.balance < 0 ? '#ef4444' : 'var(--text-main)' 
                    }}
                  >
                    {formatCurrency(Math.abs(activeCari.balance))}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: activeCari.balance > 0 ? '#10b981' : activeCari.balance < 0 ? '#ef4444' : 'var(--text-dim)' }}>
                    {activeCari.balance > 0 ? '🟢 Firmamız Alacaklı' : activeCari.balance < 0 ? '🔴 Firmamız Borçlu' : '⚪ Hesap Kapalı (0 TL)'}
                  </div>
                </div>
              </div>

              {/* Hızlı İşlem Ekleme Çubuğu */}
              <div className="no-print" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Hesap Hareketleri & Ekstre</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    id="cari-add-debit-btn"
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => openMovementForm('debit')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}
                  >
                    <Plus size={15} />
                    <span>{activeCari.type === 'supplier' ? 'Mal / Parça Alımı (Borç)' : 'Servis / Satış (Borçlandır)'}</span>
                  </button>
                  <button
                    id="cari-add-credit-btn"
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openMovementForm('credit')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <HandCoins size={15} />
                    <span>{activeCari.type === 'supplier' ? 'Ödeme Yap' : 'Tahsilat Al'}</span>
                  </button>
                  {isAddMovementOpen && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddMovementOpen(false)} title="Formu Kapat">
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Yeni Hareket Ekleme Formu */}
              {isAddMovementOpen && (
                <form 
                  onSubmit={handleAddMovementSubmit} 
                  className="no-print"
                  style={{ background: 'var(--surface-color)', border: '1px solid var(--primary-light)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <h5 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary)' }}>
                    Yeni Cari Hareket – mevcut bakiyenin üzerine işlenir
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">İşlem Türü</label>
                      <select 
                        id="cari-movement-type"
                        className="form-control"
                        value={movementType}
                        onChange={e => {
                          const t = e.target.value as 'debit' | 'credit';
                          setMovementType(t);
                          // Veresiye (borç) hareketleri kasaya para girişi/çıkışı değildir
                          setMovementAlsoCash(t === 'credit');
                        }}
                      >
                        <option value="debit">
                          {activeCari.type === 'supplier' ? '📦 Mal / Parça Alındı (Borcumuz Artar)' : '🔧 Servis Bedeli / Mal Verildi (Alacağımız Artar)'}
                        </option>
                        <option value="credit">
                          {activeCari.type === 'supplier' ? '💰 Toptancıya Ödeme Yapıldı (Borcumuz Azalır)' : '💵 Müşteriden Tahsilat Alındı (Alacağımız Azalır)'}
                        </option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tutar (TL) *</label>
                      <input 
                        id="cari-movement-amount"
                        type="number" 
                        required 
                        min={0.01}
                        step="0.01"
                        className="form-control" 
                        placeholder="Örn: 1250"
                        value={movementAmount}
                        onChange={e => setMovementAmount(e.target.value)}
                        autoFocus
                      />
                      {(() => {
                        const closing = closingAmountFor(activeCari, movementType);
                        return closing > 0 ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: '6px', fontSize: '0.75rem', padding: '3px 8px' }}
                            onClick={() => setMovementAmount(String(closing))}
                          >
                            Bakiyenin tamamı: {formatCurrency(closing)}
                          </button>
                        ) : null;
                      })()}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">İşlem Tarihi</label>
                      <input
                        id="cari-movement-date"
                        type="date"
                        className="form-control"
                        value={movementDate}
                        max={getLocalDateString()}
                        onChange={e => setMovementDate(e.target.value)}
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

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Açıklama</label>
                    <input 
                      id="cari-movement-description"
                      type="text" 
                      className="form-control" 
                      placeholder={movementType === 'debit'
                        ? (activeCari.type === 'supplier' ? 'Örn: 2 adet buzdolabı motoru alımı' : 'Örn: Çamaşır makinesi pompa değişimi')
                        : (activeCari.type === 'supplier' ? 'Örn: Ara ödeme' : 'Örn: Elden tahsilat')}
                      value={movementDescription}
                      onChange={e => setMovementDescription(e.target.value)}
                    />
                  </div>

                  {/* Eski bakiye → Yeni bakiye önizlemesi */}
                  {(() => {
                    const amt = parseFloat(movementAmount) || 0;
                    const delta = cariTxEffect(activeCari.type, movementType, amt);
                    const next = Math.round((activeCari.balance + delta) * 100) / 100;
                    const cur = balanceLabel(activeCari.balance);
                    const nxt = balanceLabel(next);
                    return (
                      <div className="balance-preview">
                        <div className="balance-preview-cell">
                          <span>Mevcut Bakiye</span>
                          <strong style={{ color: cur.color }}>{formatCurrency(Math.abs(activeCari.balance))}</strong>
                          <small style={{ color: cur.color }}>{activeCari.balance > 0 ? 'Alacağımız' : activeCari.balance < 0 ? 'Borcumuz' : 'Kapalı'}</small>
                        </div>
                        <div className="balance-preview-delta">
                          <ChevronRight size={18} />
                          <span style={{ color: delta >= 0 ? '#10b981' : '#ef4444' }}>
                            {amt > 0 ? `${delta >= 0 ? '+' : '-'}${formatCurrency(Math.abs(delta))}` : '—'}
                          </span>
                        </div>
                        <div className="balance-preview-cell is-next">
                          <span>İşlem Sonrası</span>
                          <strong style={{ color: nxt.color }}>{formatCurrency(Math.abs(next))}</strong>
                          <small style={{ color: nxt.color }}>{next > 0 ? 'Alacağımız' : next < 0 ? 'Borcumuz' : 'Hesap kapanır'}</small>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        id="cari-movement-also-cash"
                        type="checkbox" 
                        checked={movementAlsoCash} 
                        onChange={e => setMovementAlsoCash(e.target.checked)} 
                      />
                      <span>
                        {movementType === 'credit'
                          ? `Kasaya da ${activeCari.type === 'supplier' ? 'gider (ödeme)' : 'gelir (tahsilat)'} olarak işle`
                          : 'Kasaya da işle (veresiye işlemlerde genelde işaretlenmez)'}
                      </span>
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
                      <th style={{ textAlign: 'right' }}>Bakiye</th>
                      <th style={{ textAlign: 'right' }} className="no-print">Sil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.openingOffset !== 0 && (
                      <tr className="ledger-devir-row">
                        <td style={{ whiteSpace: 'nowrap' }}>—</td>
                        <td>DEVİR</td>
                        <td colSpan={4} style={{ color: 'var(--text-muted)' }}>
                          Önceki devir bakiyesi (hareket kaydı bulunmayan eski bakiye – korunmaktadır)
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: ledger.openingOffset > 0 ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
                          {formatCurrency(Math.abs(ledger.openingOffset))} {ledger.openingOffset > 0 ? '(A)' : '(B)'}
                        </td>
                        <td className="no-print"></td>
                      </tr>
                    )}
                    {ledger.rows.length === 0 && ledger.openingOffset === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          Bu cari hesaba ait henüz işlem hareketi kaydedilmemiş.
                        </td>
                      </tr>
                    ) : (
                      ledger.rows.map(({ m, running }) => {
                        const isDebit = m.type === 'debit';
                        const linkedCash = m.relatedCashTxId ? transactions.some(t => t.id === m.relatedCashTxId) : false;
                        return (
                          <tr key={m.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(m.date)}</td>
                            <td>{m.documentNo || '-'}</td>
                            <td style={{ maxWidth: '240px' }}>
                              {m.description}
                              {linkedCash && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Wallet size={10} /> Kasaya işlendi ({paymentMethodLabel(m.paymentMethod)})
                                </div>
                              )}
                            </td>
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
                            <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: running > 0 ? '#10b981' : running < 0 ? '#ef4444' : 'var(--text-dim)' }}>
                              {formatCurrency(Math.abs(running))} {running > 0 ? '(A)' : running < 0 ? '(B)' : ''}
                            </td>
                            <td style={{ textAlign: 'right' }} className="no-print">
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: '3px 6px' }}
                                onClick={() => handleDeleteMovement(m)}
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
                  {(ledger.rows.length > 0 || ledger.openingOffset !== 0) && (
                    <tfoot>
                      <tr style={{ fontWeight: 800 }}>
                        <td colSpan={4} style={{ textAlign: 'right' }}>TOPLAM</td>
                        <td style={{ textAlign: 'right', color: '#ef4444' }}>{formatCurrency(ledger.debitTotal)}</td>
                        <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(ledger.creditTotal)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: activeCari.balance > 0 ? '#10b981' : activeCari.balance < 0 ? '#ef4444' : 'var(--text-dim)' }}>
                          {formatCurrency(Math.abs(activeCari.balance))} {activeCari.balance > 0 ? '(A)' : activeCari.balance < 0 ? '(B)' : ''}
                        </td>
                        <td className="no-print"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                  (A) = Firmamız alacaklı &nbsp;•&nbsp; (B) = Firmamız borçlu
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer no-print">
              <button className="btn btn-secondary" onClick={closeStatement}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
