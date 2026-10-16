import React, { useMemo, useState } from 'react';
import {
  HandCoins,
  UserPlus,
  Users,
  Wallet,
  PieChart,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  FileSpreadsheet,
  Crown,
  Phone,
  RotateCcw,
  TrendingUp,
  Briefcase,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { CashTransaction, PaymentMethod, StaffMember, StaffPayment, StaffPaymentType, StaffRole } from '../types';
import { formatCurrency, formatDate, formatDateOnly, getLocalDateString } from '../utils/helpers';
import { PeriodSelection, createDefaultPeriod, resolvePeriod, isInPeriod } from '../utils/period';
import { downloadXlsx, CellValue } from '../utils/excelExport';
import {
  STAFF_ROLE_CONFIG,
  STAFF_PAYMENT_TYPE_CONFIG,
  getMonthSalaryStatus,
  computeProfitShares,
  computePeriodProfit,
  dateInputToIso,
} from '../utils/staff';
import { PeriodSelector } from './PeriodSelector';

export type StaffFormData = Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt'>;
export type StaffPaymentInput = Omit<StaffPayment, 'id' | 'createdAt' | 'relatedCashTxId'>;

interface StaffDistributionTabProps {
  transactions: CashTransaction[];
  staff: StaffMember[];
  staffPayments: StaffPayment[];
  onSaveStaff: (data: StaffFormData, id?: string) => void;
  onDeleteStaff: (id: string) => 'deleted' | 'deactivated';
  onAddStaffPayments: (entries: StaffPaymentInput[], alsoCreateCashTx?: boolean) => void;
  onDeleteStaffPayment: (id: string) => void;
  shopName: string;
}

const PAYMENT_TYPES = Object.keys(STAFF_PAYMENT_TYPE_CONFIG) as StaffPaymentType[];
const ROLES = Object.keys(STAFF_ROLE_CONFIG) as StaffRole[];

const methodLabel = (m?: string): string => {
  if (m === 'cash') return 'Nakit Kasa';
  if (m === 'credit_card') return 'POS / Kart';
  if (m === 'bank_transfer') return 'Banka Havale';
  return 'Diğer';
};

const defaultTypeForRole = (role: StaffRole): StaffPaymentType => {
  if (role === 'partner') return 'profit_share';
  if (role === 'technician') return 'commission';
  return 'salary';
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toLocaleUpperCase('tr-TR')).join('') || '?';

const round2 = (n: number) => Math.round(n * 100) / 100;

interface DistributionRow {
  staffId: string;
  include: boolean;
  percent: string;
  amount: string;
}

export const StaffDistributionTab: React.FC<StaffDistributionTabProps> = ({
  transactions,
  staff,
  staffPayments,
  onSaveStaff,
  onDeleteStaff,
  onAddStaffPayments,
  onDeleteStaffPayment,
  shopName,
}) => {
  // --- Dönem ---
  const [period, setPeriod] = useState<PeriodSelection>(() => createDefaultPeriod('this_month'));
  const range = useMemo(() => resolvePeriod(period), [period]);

  // --- Liste filtreleri ---
  const [showInactive, setShowInactive] = useState(false);
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | StaffPaymentType>('all');

  // --- Kişi modalı ---
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [fName, setFName] = useState('');
  const [fRole, setFRole] = useState<StaffRole>('employee');
  const [fPhone, setFPhone] = useState('');
  const [fShare, setFShare] = useState('');
  const [fSalary, setFSalary] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fActive, setFActive] = useState(true);

  // --- Ödeme modalı ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pStaffId, setPStaffId] = useState('');
  const [pType, setPType] = useState<StaffPaymentType>('salary');
  const [pAmount, setPAmount] = useState('');
  const [pDate, setPDate] = useState(getLocalDateString());
  const [pMethod, setPMethod] = useState<PaymentMethod>('cash');
  const [pDesc, setPDesc] = useState('');
  const [pAlsoCash, setPAlsoCash] = useState(true);

  // --- Kâr dağıtım modalı ---
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);
  const [dBase, setDBase] = useState('');
  const [dRows, setDRows] = useState<DistributionRow[]>([]);
  const [dDate, setDDate] = useState(getLocalDateString());
  const [dMethod, setDMethod] = useState<PaymentMethod>('cash');
  const [dDesc, setDDesc] = useState('');
  const [dAlsoCash, setDAlsoCash] = useState(true);

  // ==========================================
  // HESAPLAMALAR
  // ==========================================
  const staffById = useMemo(() => {
    const map = new Map<string, StaffMember>();
    staff.forEach(s => map.set(s.id, s));
    return map;
  }, [staff]);

  const activeStaff = useMemo(() => staff.filter(s => s.active), [staff]);
  const activePartners = useMemo(() => activeStaff.filter(s => s.role === 'partner'), [activeStaff]);

  const periodPayments = useMemo(
    () =>
      staffPayments
        .filter(p => isInPeriod(p.date, range))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [staffPayments, range]
  );

  const profit = useMemo(() => computePeriodProfit(transactions, range), [transactions, range]);

  const totals = useMemo(() => {
    let total = 0;
    let personnel = 0;
    let distribution = 0;
    const byType: Partial<Record<StaffPaymentType, number>> = {};
    periodPayments.forEach(p => {
      total += p.amount;
      byType[p.type] = (byType[p.type] || 0) + p.amount;
      if (STAFF_PAYMENT_TYPE_CONFIG[p.type]?.isDistribution) distribution += p.amount;
      else personnel += p.amount;
    });
    return { total, personnel, distribution, byType };
  }, [periodPayments]);

  const distributableRemaining = round2(profit.netProfit - totals.distribution);

  const personStats = useMemo(() => {
    const map = new Map<string, { period: number; allTime: number; byType: Partial<Record<StaffPaymentType, number>>; last?: StaffPayment; count: number }>();
    staffPayments.forEach(p => {
      if (!map.has(p.staffId)) map.set(p.staffId, { period: 0, allTime: 0, byType: {}, count: 0 });
      const st = map.get(p.staffId)!;
      st.allTime += p.amount;
      if (!st.last || new Date(p.date).getTime() > new Date(st.last.date).getTime()) st.last = p;
      if (isInPeriod(p.date, range)) {
        st.period += p.amount;
        st.count += 1;
        st.byType[p.type] = (st.byType[p.type] || 0) + p.amount;
      }
    });
    return map;
  }, [staffPayments, range]);

  const visibleStaff = useMemo(() => {
    const roleOrder: Record<StaffRole, number> = { partner: 0, technician: 1, employee: 2, other: 3 };
    return staff
      .filter(s => s.active || showInactive || (personStats.get(s.id)?.period || 0) > 0)
      .sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1) || roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name, 'tr'));
  }, [staff, showInactive, personStats]);

  const shareBreakdown = useMemo(() => {
    const rows: { id: string; name: string; role?: StaffRole; amount: number }[] = [];
    const agg = new Map<string, { name: string; amount: number }>();
    periodPayments.forEach(p => {
      const cur = agg.get(p.staffId) || { name: staffById.get(p.staffId)?.name || p.staffName, amount: 0 };
      cur.amount += p.amount;
      agg.set(p.staffId, cur);
    });
    agg.forEach((v, id) => rows.push({ id, name: v.name, role: staffById.get(id)?.role, amount: v.amount }));
    return rows.sort((a, b) => b.amount - a.amount);
  }, [periodPayments, staffById]);

  const filteredPayments = useMemo(
    () =>
      periodPayments.filter(
        p => (personFilter === 'all' || p.staffId === personFilter) && (typeFilter === 'all' || p.type === typeFilter)
      ),
    [periodPayments, personFilter, typeFilter]
  );
  const filteredPaymentsTotal = filteredPayments.reduce((s, p) => s + p.amount, 0);

  // ==========================================
  // KİŞİ İŞLEMLERİ
  // ==========================================
  const openNewStaff = () => {
    setStaffToEdit(null);
    setFName('');
    setFRole(staff.length === 0 ? 'partner' : 'employee');
    setFPhone('');
    setFShare('');
    setFSalary('');
    setFNotes('');
    setFActive(true);
    setIsStaffModalOpen(true);
  };

  const openEditStaff = (m: StaffMember) => {
    setStaffToEdit(m);
    setFName(m.name);
    setFRole(m.role);
    setFPhone(m.phone || '');
    setFShare(m.sharePercent !== undefined && m.sharePercent !== null ? String(m.sharePercent) : '');
    setFSalary(m.monthlySalary !== undefined && m.monthlySalary !== null ? String(m.monthlySalary) : '');
    setFNotes(m.notes || '');
    setFActive(m.active);
    setIsStaffModalOpen(true);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim()) {
      alert('Lütfen ad soyad giriniz.');
      return;
    }
    const share = fShare.trim() === '' ? undefined : parseFloat(fShare.replace(',', '.'));
    const salary = fSalary.trim() === '' ? undefined : parseFloat(fSalary.replace(',', '.'));
    if (share !== undefined && (isNaN(share) || share < 0 || share > 100)) {
      alert('Ortaklık / kâr payı yüzdesi 0 ile 100 arasında olmalıdır.');
      return;
    }
    if (salary !== undefined && (isNaN(salary) || salary < 0)) {
      alert('Lütfen geçerli bir maaş tutarı giriniz.');
      return;
    }
    onSaveStaff(
      {
        name: fName.trim(),
        role: fRole,
        phone: fPhone.trim() || undefined,
        sharePercent: share,
        monthlySalary: salary,
        active: fActive,
        notes: fNotes.trim() || undefined,
      },
      staffToEdit?.id
    );
    setIsStaffModalOpen(false);
  };

  const handleDeleteStaff = (m: StaffMember) => {
    const hasPayments = staffPayments.some(p => p.staffId === m.id);
    const msg = hasPayments
      ? `"${m.name}" adına kayıtlı ödemeler var. Geçmiş kayıtlar korunacak ve kişi PASİF duruma alınacak. Devam edilsin mi?`
      : `"${m.name}" kişisini silmek istediğinize emin misiniz?`;
    if (!confirm(msg)) return;
    onDeleteStaff(m.id);
  };

  const handleReactivate = (m: StaffMember) => {
    onSaveStaff(
      { name: m.name, role: m.role, phone: m.phone, sharePercent: m.sharePercent, monthlySalary: m.monthlySalary, notes: m.notes, active: true },
      m.id
    );
  };

  // ==========================================
  // ÖDEME İŞLEMLERİ
  // ==========================================
  const suggestAmount = (memberId: string, type: StaffPaymentType): string => {
    const m = staffById.get(memberId);
    if (!m) return '';
    if (type === 'salary' && m.monthlySalary) {
      const st = getMonthSalaryStatus(m, staffPayments);
      return st.remaining > 0 ? String(round2(st.remaining)) : '';
    }
    return '';
  };

  const openPayment = (member?: StaffMember) => {
    const target = member || activeStaff[0];
    if (!target) {
      alert('Önce bir ortak / personel kaydı ekleyiniz.');
      return;
    }
    const type = defaultTypeForRole(target.role);
    setPStaffId(target.id);
    setPType(type);
    setPAmount(suggestAmount(target.id, type));
    setPDate(getLocalDateString());
    setPMethod('cash');
    setPDesc('');
    setPAlsoCash(true);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentPersonChange = (id: string) => {
    setPStaffId(id);
    const m = staffById.get(id);
    if (m) {
      const type = defaultTypeForRole(m.role);
      setPType(type);
      setPAmount(suggestAmount(id, type));
    }
  };

  const handlePaymentTypeChange = (type: StaffPaymentType) => {
    setPType(type);
    const suggestion = suggestAmount(pStaffId, type);
    if (suggestion) setPAmount(suggestion);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = staffById.get(pStaffId);
    const amount = parseFloat(pAmount.replace(',', '.'));
    if (!m) {
      alert('Lütfen ödeme yapılacak kişiyi seçiniz.');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Lütfen geçerli bir tutar giriniz.');
      return;
    }
    onAddStaffPayments(
      [
        {
          staffId: m.id,
          staffName: m.name,
          type: pType,
          amount: round2(amount),
          date: dateInputToIso(pDate),
          paymentMethod: pMethod,
          description: pDesc.trim() || undefined,
        },
      ],
      pAlsoCash
    );
    setIsPaymentModalOpen(false);
  };

  const handleDeletePayment = (p: StaffPayment) => {
    const extra = p.relatedCashTxId ? '\nBağlı kasa gider kaydı da silinecek.' : '';
    if (confirm(`${p.staffName} - ${STAFF_PAYMENT_TYPE_CONFIG[p.type]?.label} (${formatCurrency(p.amount)}) ödemesini silmek istiyor musunuz?${extra}`)) {
      onDeleteStaffPayment(p.id);
    }
  };

  // ==========================================
  // KÂR DAĞITIMI
  // ==========================================
  const buildRows = (base: number, partners: StaffMember[]): DistributionRow[] =>
    computeProfitShares(partners, base).map(s => ({
      staffId: s.member.id,
      include: true,
      percent: String(round2(s.percent)),
      amount: String(s.amount),
    }));

  const openDistribution = () => {
    if (activePartners.length === 0) {
      alert('Kâr dağıtımı için önce "Ortak" rolünde en az bir kişi ekleyiniz.');
      return;
    }
    const base = Math.max(0, distributableRemaining);
    setDBase(base > 0 ? String(base) : '');
    setDRows(buildRows(base, activePartners));
    setDDate(getLocalDateString());
    setDMethod('cash');
    setDDesc(`${range.label} kâr payı`);
    setDAlsoCash(true);
    setIsDistModalOpen(true);
  };

  const recomputeAmounts = (rows: DistributionRow[], base: number): DistributionRow[] =>
    rows.map(r => ({ ...r, amount: r.include ? String(round2((base * (parseFloat(r.percent) || 0)) / 100)) : '0' }));

  const handleBaseChange = (value: string) => {
    setDBase(value);
    const base = parseFloat(value.replace(',', '.')) || 0;
    setDRows(prev => recomputeAmounts(prev, base));
  };

  const updateRow = (staffId: string, patch: Partial<DistributionRow>, recalc: boolean) => {
    setDRows(prev => {
      const next = prev.map(r => (r.staffId === staffId ? { ...r, ...patch } : r));
      if (!recalc) return next;
      const base = parseFloat(dBase.replace(',', '.')) || 0;
      return recomputeAmounts(next, base);
    });
  };

  const toggleRow = (staffId: string, include: boolean) => {
    setDRows(prev => {
      const toggled = prev.map(r => (r.staffId === staffId ? { ...r, include } : r));
      // Dahil edilen ortaklar arasında yüzdeleri yeniden normalize et
      const included = toggled.filter(r => r.include).map(r => staffById.get(r.staffId)!).filter(Boolean);
      const base = parseFloat(dBase.replace(',', '.')) || 0;
      const shares = computeProfitShares(included, base);
      return toggled.map(r => {
        const s = shares.find(x => x.member.id === r.staffId);
        return s ? { ...r, percent: String(round2(s.percent)), amount: String(s.amount) } : { ...r, percent: '0', amount: '0' };
      });
    });
  };

  const distTotal = dRows.filter(r => r.include).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const distPercentTotal = dRows.filter(r => r.include).reduce((s, r) => s + (parseFloat(r.percent) || 0), 0);

  const handleDistributionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entries: StaffPaymentInput[] = dRows
      .filter(r => r.include && (parseFloat(r.amount) || 0) > 0)
      .map(r => {
        const m = staffById.get(r.staffId)!;
        return {
          staffId: m.id,
          staffName: m.name,
          type: 'profit_share' as const,
          amount: round2(parseFloat(r.amount)),
          date: dateInputToIso(dDate),
          paymentMethod: dMethod,
          description: [dDesc.trim(), `%${round2(parseFloat(r.percent) || 0)}`].filter(Boolean).join(' • '),
        };
      });
    if (entries.length === 0) {
      alert('Dağıtılacak tutar bulunamadı. Lütfen tutarları kontrol ediniz.');
      return;
    }
    const total = entries.reduce((s, x) => s + x.amount, 0);
    if (total > Math.max(0, distributableRemaining) + 0.01) {
      if (!confirm(`Dağıtılacak toplam (${formatCurrency(total)}) dönemin dağıtılabilir kârını (${formatCurrency(Math.max(0, distributableRemaining))}) aşıyor. Yine de devam edilsin mi?`)) return;
    }
    onAddStaffPayments(entries, dAlsoCash);
    setIsDistModalOpen(false);
  };

  // ==========================================
  // EXCEL
  // ==========================================
  const handleExport = () => {
    const nowStr = formatDate(new Date().toISOString());
    const typeHeaders = PAYMENT_TYPES.map(t => STAFF_PAYMENT_TYPE_CONFIG[t].label);

    const summaryRows: CellValue[][] = [
      [{ value: `${shopName || 'ServisPro'} – Şirket İçi Para Dağıtımı Raporu`, style: 'title' }],
      [{ value: `Dönem: ${range.label}`, style: 'subtitle' }],
      [{ value: `Oluşturulma: ${nowStr}`, style: 'subtitle' }],
      [],
      [{ value: 'Kalem', style: 'header' }, { value: 'Tutar', style: 'header' }],
      ['Dönem Geliri (Kasa)', { value: profit.income, style: 'currency' }],
      ['Dönem Giderleri (dağıtımlar hariç)', { value: profit.expense, style: 'currency' }],
      [{ value: 'Dönem Net Kârı', style: 'bold' }, { value: profit.netProfit, style: 'boldCurrency' }],
      ['Ortaklara Dağıtılan (Kâr Payı + Çekim)', { value: totals.distribution, style: 'currency' }],
      [{ value: 'Dağıtılabilir Kalan Kâr', style: 'bold' }, { value: distributableRemaining, style: 'boldCurrency' }],
      [],
      ['Personel Ödemeleri (Maaş, Avans, Prim vb.)', { value: totals.personnel, style: 'currency' }],
      [{ value: 'Toplam Dağıtılan Para', style: 'bold' }, { value: totals.total, style: 'boldCurrency' }],
      ['Ödeme Sayısı', periodPayments.length],
      [],
      [{ value: 'Ödeme Türü', style: 'header' }, { value: 'Tutar', style: 'header' }],
      ...PAYMENT_TYPES.filter(t => (totals.byType[t] || 0) > 0).map((t): CellValue[] => [
        STAFF_PAYMENT_TYPE_CONFIG[t].label,
        { value: totals.byType[t] || 0, style: 'currency' },
      ]),
    ];

    const peopleHeader: CellValue[] = ['Ad Soyad', 'Rol', 'Durum', 'Ortaklık %', 'Aylık Maaş', ...typeHeaders, 'Dönem Toplamı', 'Toplam İçindeki Pay', 'Tüm Zamanlar Toplamı'].map(h => ({ value: h, style: 'header' as const }));
    const peopleList = staff.filter(s => s.active || (personStats.get(s.id)?.allTime || 0) > 0);
    const peopleRows: CellValue[][] = peopleList.map(m => {
      const st = personStats.get(m.id);
      return [
        m.name,
        STAFF_ROLE_CONFIG[m.role]?.label || m.role,
        m.active ? 'Aktif' : 'Pasif',
        m.sharePercent ? { value: m.sharePercent / 100, style: 'percent' } : null,
        m.monthlySalary ? { value: m.monthlySalary, style: 'currency' } : null,
        ...PAYMENT_TYPES.map((t): CellValue => (st?.byType[t] ? { value: st.byType[t]!, style: 'currency' } : null)),
        { value: st?.period || 0, style: 'boldCurrency' },
        totals.total > 0 ? { value: (st?.period || 0) / totals.total, style: 'percent' } : null,
        { value: st?.allTime || 0, style: 'currency' },
      ];
    });
    peopleRows.push([]);
    peopleRows.push([
      { value: 'TOPLAM', style: 'bold' }, '', '', null, null,
      ...PAYMENT_TYPES.map((t): CellValue => ({ value: totals.byType[t] || 0, style: 'boldCurrency' })),
      { value: totals.total, style: 'boldCurrency' },
    ]);

    const payHeader: CellValue[] = ['Tarih', 'Kişi', 'Rol', 'Ödeme Türü', 'Açıklama', 'Kasa / Hesap', 'Kasadan Düşüldü', 'Tutar (₺)'].map(h => ({ value: h, style: 'header' as const }));
    const payRows: CellValue[][] = [...periodPayments]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(p => [
        new Date(p.date),
        staffById.get(p.staffId)?.name || p.staffName,
        STAFF_ROLE_CONFIG[staffById.get(p.staffId)?.role || 'other']?.label || '',
        STAFF_PAYMENT_TYPE_CONFIG[p.type]?.label || p.type,
        p.description || '',
        methodLabel(p.paymentMethod),
        p.relatedCashTxId ? 'Evet' : 'Hayır',
        { value: p.amount, style: 'currency' },
      ]);
    payRows.push([]);
    payRows.push([{ value: 'TOPLAM', style: 'bold' }, `${periodPayments.length} ödeme`, '', '', '', '', '', { value: totals.total, style: 'boldCurrency' }]);

    downloadXlsx(`para_dagitimi_${range.fileTag}`, [
      { name: 'Özet', rows: summaryRows, columnWidths: [42, 20] },
      { name: 'Kişi Özeti', rows: [peopleHeader, ...peopleRows], headerRowIndex: 0, columnWidths: [24, 16, 9, 11, 14, ...PAYMENT_TYPES.map(() => 14), 16, 12, 18] },
      { name: 'Ödemeler', rows: [payHeader, ...payRows], headerRowIndex: 0, columnWidths: [18, 24, 16, 20, 40, 15, 10, 15] },
    ]);
  };

  // ==========================================
  // RENDER
  // ==========================================
  const selectedPaymentMember = staffById.get(pStaffId);
  const selectedSalaryStatus = selectedPaymentMember?.monthlySalary ? getMonthSalaryStatus(selectedPaymentMember, staffPayments) : null;

  return (
    <div className="staff-dist">
      {/* Başlık + Dönem */}
      <div className="card staff-dist-head">
        <div className="staff-dist-head-info">
          <h3>
            <HandCoins size={20} />
            Şirket İçi Para Dağıtımı
          </h3>
          <p>Ortaklar, personel ve ustalar: kim ne kadar aldı, maaş / avans / prim / kâr payı takibi</p>
          <div className="staff-dist-actions">
            <button id="staff-add-person-btn" type="button" className="btn btn-secondary btn-sm" onClick={openNewStaff}>
              <UserPlus size={15} />
              <span>Kişi Ekle</span>
            </button>
            <button id="staff-add-payment-btn" type="button" className="btn btn-primary btn-sm" onClick={() => openPayment()} disabled={activeStaff.length === 0}>
              <Plus size={15} />
              <span>Ödeme Yap</span>
            </button>
            <button id="staff-distribute-profit-btn" type="button" className="btn btn-sm staff-btn-gold" onClick={openDistribution} disabled={activePartners.length === 0}>
              <Crown size={15} />
              <span>Kârı Ortaklara Dağıt</span>
            </button>
            <button id="staff-export-excel-btn" type="button" className="btn btn-excel btn-sm" onClick={handleExport} disabled={staff.length === 0}>
              <FileSpreadsheet size={15} />
              <span>Excel'e Aktar</span>
            </button>
          </div>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} idPrefix="staff-period" />
      </div>

      {/* Metrikler */}
      <div className="metrics-grid">
        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #8b5cf6, #a78bfa)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <HandCoins size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: '#a78bfa' }}>{formatCurrency(totals.total)}</h3>
            <p>Toplam Dağıtılan ({periodPayments.length} ödeme)</p>
          </div>
        </div>
        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #3b82f6, #60a5fa)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Briefcase size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: '#60a5fa' }}>{formatCurrency(totals.personnel)}</h3>
            <p>Personel Ödemeleri (Maaş, Avans, Prim…)</p>
          </div>
        </div>
        <div className="card metric-card" style={{ '--accent-gradient': 'linear-gradient(90deg, #f59e0b, #fbbf24)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Crown size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: '#fbbf24' }}>{formatCurrency(totals.distribution)}</h3>
            <p>Ortaklara Dağıtılan Kâr</p>
          </div>
        </div>
        <div className="card metric-card" style={{ '--accent-gradient': distributableRemaining >= 0 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)' } as React.CSSProperties}>
          <div className="metric-icon" style={{ background: distributableRemaining >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: distributableRemaining >= 0 ? '#10b981' : '#ef4444' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-data">
            <h3 style={{ color: distributableRemaining >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(distributableRemaining)}</h3>
            <p>Dağıtılabilir Kalan Kâr (Net: {formatCurrency(profit.netProfit)})</p>
          </div>
        </div>
      </div>

      {/* Kişiler */}
      <div className="staff-section-title">
        <h4>
          <Users size={17} />
          Ortaklar & Personel ({activeStaff.length} aktif)
        </h4>
        {staff.some(s => !s.active) && (
          <label className="staff-toggle" htmlFor="staff-show-inactive">
            <input id="staff-show-inactive" type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            <span>Pasifleri göster</span>
          </label>
        )}
      </div>

      {staff.length === 0 ? (
        <div className="card staff-empty">
          <div className="staff-empty-icon">
            <Sparkles size={30} />
          </div>
          <h4>Henüz kimse eklenmedi</h4>
          <p>
            Şirket ortaklarını (kâr payı yüzdesiyle), personeli (aylık maaşıyla) ve ustaları ekleyin. Ardından her ödemeyi
            kaydedin; kimin ne kadar aldığı burada ve Excel raporunda görünsün.
          </p>
          <button id="staff-empty-add-btn" type="button" className="btn btn-primary" onClick={openNewStaff}>
            <UserPlus size={17} />
            <span>İlk Kişiyi Ekle</span>
          </button>
        </div>
      ) : (
        <div className="staff-grid">
          {visibleStaff.map(m => {
            const role = STAFF_ROLE_CONFIG[m.role] || STAFF_ROLE_CONFIG.other;
            const st = personStats.get(m.id);
            const salary = m.monthlySalary ? getMonthSalaryStatus(m, staffPayments) : null;
            const salaryPct = salary && salary.salary > 0 ? Math.min(100, (salary.paid / salary.salary) * 100) : 0;
            const typeEntries = PAYMENT_TYPES.filter(t => (st?.byType[t] || 0) > 0);
            return (
              <div key={m.id} className={`card staff-card ${m.active ? '' : 'is-inactive'}`} style={{ '--staff-accent': role.color } as React.CSSProperties}>
                <div className="staff-card-top">
                  <div className="staff-avatar" style={{ background: role.bg, color: role.color }}>
                    {m.role === 'partner' ? <Crown size={18} /> : initials(m.name)}
                  </div>
                  <div className="staff-card-id">
                    <div className="staff-card-name">{m.name}</div>
                    <div className="staff-card-badges">
                      <span className="badge" style={{ background: role.bg, color: role.color }}>{role.label}</span>
                      {m.sharePercent ? <span className="badge staff-badge-share">%{round2(m.sharePercent)} pay</span> : null}
                      {!m.active && <span className="badge staff-badge-inactive">Pasif</span>}
                    </div>
                  </div>
                </div>

                <div className="staff-card-amounts">
                  <div>
                    <span>Bu dönem aldığı</span>
                    <strong>{formatCurrency(st?.period || 0)}</strong>
                  </div>
                  <div>
                    <span>Tüm zamanlar</span>
                    <strong className="muted">{formatCurrency(st?.allTime || 0)}</strong>
                  </div>
                </div>

                {salary && (
                  <div className="staff-salary">
                    <div className="staff-salary-row">
                      <span>Bu ay maaş: {formatCurrency(salary.salary)}</span>
                      <span className={salary.remaining > 0 ? 'warn' : 'ok'}>
                        {salary.remaining > 0 ? `Kalan ${formatCurrency(salary.remaining)}` : 'Tamamı ödendi'}
                      </span>
                    </div>
                    <div className="staff-progress">
                      <div style={{ width: `${salaryPct}%` }} />
                    </div>
                  </div>
                )}

                {typeEntries.length > 0 && (
                  <div className="staff-type-chips">
                    {typeEntries.map(t => (
                      <span key={t} className="staff-type-chip" style={{ color: STAFF_PAYMENT_TYPE_CONFIG[t].color, borderColor: `${STAFF_PAYMENT_TYPE_CONFIG[t].color}55` }}>
                        {STAFF_PAYMENT_TYPE_CONFIG[t].label}: {formatCurrency(st!.byType[t]!)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="staff-card-meta">
                  {m.phone && (
                    <a href={`tel:${m.phone}`}>
                      <Phone size={12} /> {m.phone}
                    </a>
                  )}
                  <span>
                    <Calendar size={12} /> Son ödeme: {st?.last ? `${formatDateOnly(st.last.date)} • ${formatCurrency(st.last.amount)}` : '—'}
                  </span>
                </div>

                <div className="staff-card-buttons">
                  {m.active ? (
                    <button id={`staff-pay-${m.id}`} type="button" className="btn btn-primary btn-sm" onClick={() => openPayment(m)}>
                      <Wallet size={14} />
                      <span>Ödeme Yap</span>
                    </button>
                  ) : (
                    <button id={`staff-reactivate-${m.id}`} type="button" className="btn btn-secondary btn-sm" onClick={() => handleReactivate(m)}>
                      <RotateCcw size={14} />
                      <span>Aktifleştir</span>
                    </button>
                  )}
                  <button id={`staff-filter-${m.id}`} type="button" className="btn btn-secondary btn-sm" onClick={() => setPersonFilter(personFilter === m.id ? 'all' : m.id)} title="Bu kişinin ödemelerini listele">
                    <PieChart size={14} />
                  </button>
                  <button id={`staff-edit-${m.id}`} type="button" className="btn btn-secondary btn-sm" onClick={() => openEditStaff(m)} title="Düzenle">
                    <Edit2 size={14} />
                  </button>
                  {m.active && (
                    <button id={`staff-delete-${m.id}`} type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteStaff(m)} title="Sil / Pasife Al">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dağılım + Ödemeler */}
      {staff.length > 0 && (
        <div className="staff-bottom-grid">
          <div className="card staff-share-card">
            <h4>
              <PieChart size={16} />
              Kim Ne Kadar Aldı? – {range.label}
            </h4>
            {shareBreakdown.length === 0 ? (
              <div className="staff-muted-center">Bu dönemde ödeme kaydı yok.</div>
            ) : (
              <div className="staff-share-list">
                {shareBreakdown.map(r => {
                  const pct = totals.total > 0 ? (r.amount / totals.total) * 100 : 0;
                  const color = STAFF_ROLE_CONFIG[r.role || 'other'].color;
                  return (
                    <div key={r.id} className="staff-share-row">
                      <div className="staff-share-row-head">
                        <span>{r.name}</span>
                        <strong style={{ color }}>
                          {formatCurrency(r.amount)} <em>%{pct.toFixed(1)}</em>
                        </strong>
                      </div>
                      <div className="staff-progress">
                        <div style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="staff-profit-box">
              <div><span>Dönem net kârı</span><strong>{formatCurrency(profit.netProfit)}</strong></div>
              <div><span>Ortaklara dağıtılan</span><strong className="gold">-{formatCurrency(totals.distribution)}</strong></div>
              <div className="total"><span>Dağıtılabilir kalan</span><strong className={distributableRemaining >= 0 ? 'ok' : 'bad'}>{formatCurrency(distributableRemaining)}</strong></div>
              <p>Not: Kâr payı ve ortak şahsi çekimleri gider sayılmaz; maaş, avans, prim ve hakedişler gider olarak kârdan düşer.</p>
            </div>
          </div>

          <div className="card staff-payments-card">
            <div className="staff-payments-head">
              <h4>
                <Calendar size={16} />
                Ödeme Hareketleri ({filteredPayments.length})
              </h4>
              <div className="staff-payments-filters">
                <select id="staff-filter-person" className="form-control" value={personFilter} onChange={e => setPersonFilter(e.target.value)}>
                  <option value="all">Tüm kişiler</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (pasif)'}</option>
                  ))}
                </select>
                <select id="staff-filter-type" className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | StaffPaymentType)}>
                  <option value="all">Tüm türler</option>
                  {PAYMENT_TYPES.map(t => (
                    <option key={t} value={t}>{STAFF_PAYMENT_TYPE_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="staff-muted-center">Seçilen dönem ve filtrelerde ödeme bulunmuyor.</div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '440px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Kişi</th>
                      <th>Tür</th>
                      <th>Açıklama</th>
                      <th>Hesap</th>
                      <th style={{ textAlign: 'right' }}>Tutar</th>
                      <th style={{ textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(p => {
                      const cfg = STAFF_PAYMENT_TYPE_CONFIG[p.type] || STAFF_PAYMENT_TYPE_CONFIG.other;
                      return (
                        <tr key={p.id}>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{formatDateOnly(p.date)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}><strong>{staffById.get(p.staffId)?.name || p.staffName}</strong></td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span className="badge" style={{ background: `${cfg.color}22`, color: cfg.color }}>{cfg.label}</span>
                          </td>
                          <td style={{ maxWidth: '240px', fontSize: '0.85rem' }}>{p.description || '-'}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {methodLabel(p.paymentMethod)}
                            {!p.relatedCashTxId && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>kasaya işlenmedi</div>}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <strong style={{ color: cfg.color }}>{formatCurrency(p.amount)}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button id={`staff-payment-delete-${p.id}`} type="button" className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleDeletePayment(p)} title="Ödemeyi Sil">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ fontWeight: 700 }}>TOPLAM</td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCurrency(filteredPaymentsTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODAL: KİŞİ EKLE / DÜZENLE ===================== */}
      {isStaffModalOpen && (
        <div className="modal-overlay" onClick={() => setIsStaffModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>{staffToEdit ? 'Kişiyi Düzenle' : 'Yeni Ortak / Personel Ekle'}</h3>
              <button className="close-btn" onClick={() => setIsStaffModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStaffSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="staff-form-name">Ad Soyad *</label>
                  <input id="staff-form-name" type="text" required className="form-control" placeholder="Örn: Ahmet Yılmaz" value={fName} onChange={e => setFName(e.target.value)} autoFocus />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rol</label>
                  <div className="staff-role-picker">
                    {ROLES.map(r => {
                      const cfg = STAFF_ROLE_CONFIG[r];
                      const active = fRole === r;
                      return (
                        <button
                          key={r}
                          id={`staff-form-role-${r}`}
                          type="button"
                          className={`staff-role-option ${active ? 'active' : ''}`}
                          style={active ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : undefined}
                          onClick={() => setFRole(r)}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="excel-option-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="staff-form-share">Ortaklık / Kâr Payı (%)</label>
                    <input id="staff-form-share" type="number" min={0} max={100} step="0.01" className="form-control" placeholder={fRole === 'partner' ? 'Örn: 50' : 'Opsiyonel'} value={fShare} onChange={e => setFShare(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="staff-form-salary">Aylık Sabit Maaş (TL)</label>
                    <input id="staff-form-salary" type="number" min={0} step="0.01" className="form-control" placeholder="Opsiyonel" value={fSalary} onChange={e => setFSalary(e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="staff-form-phone">Telefon</label>
                  <input id="staff-form-phone" type="tel" className="form-control" placeholder="05xx xxx xx xx" value={fPhone} onChange={e => setFPhone(e.target.value)} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="staff-form-notes">Not</label>
                  <input id="staff-form-notes" type="text" className="form-control" placeholder="Örn: IBAN, anlaşma detayı, prim oranı…" value={fNotes} onChange={e => setFNotes(e.target.value)} />
                </div>

                {staffToEdit && (
                  <label className="staff-toggle" htmlFor="staff-form-active">
                    <input id="staff-form-active" type="checkbox" checked={fActive} onChange={e => setFActive(e.target.checked)} />
                    <span>Aktif (pasif kişiler ödeme listesinde görünmez)</span>
                  </label>
                )}

                {fRole === 'partner' && (
                  <div className="staff-hint">
                    Ortakların yüzdeleri "Kârı Ortaklara Dağıt" ekranında otomatik bölüşüm için kullanılır. Yüzde girilmezse kâr eşit bölünür.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsStaffModalOpen(false)}>Vazgeç</button>
                <button id="staff-form-submit" type="submit" className="btn btn-primary">
                  <Check size={18} />
                  <span>{staffToEdit ? 'Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ÖDEME YAP ===================== */}
      {isPaymentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>Ödeme / Para Verme Kaydı</h3>
              <button className="close-btn" onClick={() => setIsPaymentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="staff-pay-person">Kime? *</label>
                  <select id="staff-pay-person" className="form-control" value={pStaffId} onChange={e => handlePaymentPersonChange(e.target.value)}>
                    {activeStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} – {STAFF_ROLE_CONFIG[s.role]?.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ödeme Türü</label>
                  <div className="staff-type-picker">
                    {PAYMENT_TYPES.map(t => {
                      const cfg = STAFF_PAYMENT_TYPE_CONFIG[t];
                      const active = pType === t;
                      return (
                        <button
                          key={t}
                          id={`staff-pay-type-${t}`}
                          type="button"
                          className={`staff-role-option ${active ? 'active' : ''}`}
                          style={active ? { borderColor: cfg.color, background: `${cfg.color}22`, color: cfg.color } : undefined}
                          onClick={() => handlePaymentTypeChange(t)}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                  {STAFF_PAYMENT_TYPE_CONFIG[pType].isDistribution && (
                    <div className="staff-hint" style={{ marginTop: '8px' }}>Bu tür kâr dağıtımıdır; Kâr/Zarar raporunda gider sayılmaz.</div>
                  )}
                </div>

                {selectedSalaryStatus && (pType === 'salary' || pType === 'advance') && (
                  <div className="staff-salary staff-salary-inline">
                    <div className="staff-salary-row">
                      <span>Bu ay: {formatCurrency(selectedSalaryStatus.paid)} / {formatCurrency(selectedSalaryStatus.salary)} ödendi</span>
                      <span className={selectedSalaryStatus.remaining > 0 ? 'warn' : 'ok'}>
                        {selectedSalaryStatus.remaining > 0 ? `Kalan ${formatCurrency(selectedSalaryStatus.remaining)}` : 'Tamamlandı'}
                      </span>
                    </div>
                    <div className="staff-progress">
                      <div style={{ width: `${selectedSalaryStatus.salary > 0 ? Math.min(100, (selectedSalaryStatus.paid / selectedSalaryStatus.salary) * 100) : 0}%` }} />
                    </div>
                  </div>
                )}

                <div className="excel-option-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="staff-pay-amount">Tutar (TL) *</label>
                    <input id="staff-pay-amount" type="number" required min={0.01} step="0.01" className="form-control" placeholder="Örn: 15000" value={pAmount} onChange={e => setPAmount(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="staff-pay-date">Tarih</label>
                    <input id="staff-pay-date" type="date" className="form-control" value={pDate} onChange={e => setPDate(e.target.value)} />
                  </div>
                </div>

                <div className="excel-option-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="staff-pay-method">Kasa / Hesap</label>
                    <select id="staff-pay-method" className="form-control" value={pMethod} onChange={e => setPMethod(e.target.value as PaymentMethod)}>
                      <option value="cash">Nakit Dükkan Kasası</option>
                      <option value="bank_transfer">Banka Havale / EFT</option>
                      <option value="credit_card">Kredi Kartı / POS</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="staff-pay-desc">Açıklama</label>
                    <input id="staff-pay-desc" type="text" className="form-control" placeholder="Örn: Ekim maaşı" value={pDesc} onChange={e => setPDesc(e.target.value)} />
                  </div>
                </div>

                <label className="staff-toggle" htmlFor="staff-pay-also-cash">
                  <input id="staff-pay-also-cash" type="checkbox" checked={pAlsoCash} onChange={e => setPAlsoCash(e.target.checked)} />
                  <span>Kasadan düş (Kasa & Banka hareketlerine gider olarak işlensin)</span>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Vazgeç</button>
                <button id="staff-pay-submit" type="submit" className="btn btn-primary">
                  <Check size={18} />
                  <span>Ödemeyi Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: KÂRI ORTAKLARA DAĞIT ===================== */}
      {isDistModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDistModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3>Kârı Ortaklara Dağıt</h3>
              <button className="close-btn" onClick={() => setIsDistModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDistributionSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="staff-profit-box compact">
                  <div><span>{range.label} net kârı</span><strong>{formatCurrency(profit.netProfit)}</strong></div>
                  <div><span>Bu dönem dağıtılan</span><strong className="gold">-{formatCurrency(totals.distribution)}</strong></div>
                  <div className="total"><span>Dağıtılabilir kalan</span><strong className={distributableRemaining >= 0 ? 'ok' : 'bad'}>{formatCurrency(distributableRemaining)}</strong></div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="staff-dist-base">Dağıtılacak Toplam Tutar (TL) *</label>
                  <input id="staff-dist-base" type="number" min={0} step="0.01" className="form-control" value={dBase} onChange={e => handleBaseChange(e.target.value)} placeholder="Örn: 40000" />
                </div>

                <div className="staff-dist-rows">
                  {dRows.map(r => {
                    const m = staffById.get(r.staffId);
                    if (!m) return null;
                    return (
                      <div key={r.staffId} className={`staff-dist-row ${r.include ? '' : 'excluded'}`}>
                        <label className="staff-toggle" htmlFor={`staff-dist-include-${r.staffId}`}>
                          <input id={`staff-dist-include-${r.staffId}`} type="checkbox" checked={r.include} onChange={e => toggleRow(r.staffId, e.target.checked)} />
                          <span className="staff-dist-name">{m.name}</span>
                        </label>
                        <div className="staff-dist-inputs">
                          <div className="staff-input-suffix">
                            <input id={`staff-dist-percent-${r.staffId}`} type="number" min={0} max={100} step="0.01" className="form-control" disabled={!r.include} value={r.percent} onChange={e => updateRow(r.staffId, { percent: e.target.value }, true)} />
                            <span>%</span>
                          </div>
                          <div className="staff-input-suffix wide">
                            <input id={`staff-dist-amount-${r.staffId}`} type="number" min={0} step="0.01" className="form-control" disabled={!r.include} value={r.amount} onChange={e => updateRow(r.staffId, { amount: e.target.value }, false)} />
                            <span>₺</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="staff-dist-total">
                    <span>Toplam {Math.abs(distPercentTotal - 100) > 0.05 && dRows.some(r => r.include) ? <em className="bad">(%{round2(distPercentTotal)} – yüzdeler 100 değil)</em> : <em>(%{round2(distPercentTotal)})</em>}</span>
                    <strong>{formatCurrency(distTotal)}</strong>
                  </div>
                </div>

                <div className="excel-option-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="staff-dist-date">Tarih</label>
                    <input id="staff-dist-date" type="date" className="form-control" value={dDate} onChange={e => setDDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="staff-dist-method">Kasa / Hesap</label>
                    <select id="staff-dist-method" className="form-control" value={dMethod} onChange={e => setDMethod(e.target.value as PaymentMethod)}>
                      <option value="cash">Nakit Dükkan Kasası</option>
                      <option value="bank_transfer">Banka Havale / EFT</option>
                      <option value="credit_card">Kredi Kartı / POS</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="staff-dist-desc">Açıklama</label>
                  <input id="staff-dist-desc" type="text" className="form-control" value={dDesc} onChange={e => setDDesc(e.target.value)} />
                </div>

                <label className="staff-toggle" htmlFor="staff-dist-also-cash">
                  <input id="staff-dist-also-cash" type="checkbox" checked={dAlsoCash} onChange={e => setDAlsoCash(e.target.checked)} />
                  <span>Kasadan düş (her ortak için ayrı kasa çıkışı oluşturulsun)</span>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDistModalOpen(false)}>Vazgeç</button>
                <button id="staff-dist-submit" type="submit" className="btn staff-btn-gold" disabled={distTotal <= 0}>
                  <Crown size={18} />
                  <span>{formatCurrency(distTotal)} Dağıt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
