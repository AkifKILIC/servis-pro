// ============================================================================
// Şirket İçi Para Dağıtımı – Sabitler & Yardımcılar
// ============================================================================
import { CashTransaction, StaffMember, StaffPayment, StaffPaymentType, StaffRole } from '../types';
import { PeriodRange, isInPeriod } from './period';

export const STAFF_ROLE_CONFIG: Record<StaffRole, { label: string; color: string; bg: string }> = {
  partner: { label: 'Ortak', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  employee: { label: 'Personel', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  technician: { label: 'Usta / Teknisyen', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  other: { label: 'Diğer', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
};

export const STAFF_PAYMENT_TYPE_CONFIG: Record<
  StaffPaymentType,
  { label: string; cashCategory: string; color: string; isDistribution: boolean }
> = {
  salary: { label: 'Maaş', cashCategory: 'Personel Maaş Ödemesi', color: '#3b82f6', isDistribution: false },
  advance: { label: 'Avans', cashCategory: 'Personel Avans', color: '#06b6d4', isDistribution: false },
  bonus: { label: 'Prim / İkramiye', cashCategory: 'Personel Prim / İkramiye', color: '#8b5cf6', isDistribution: false },
  commission: { label: 'Komisyon / Hakediş', cashCategory: 'Usta Hakediş / Komisyon', color: '#10b981', isDistribution: false },
  allowance: { label: 'Harçlık / Yemek / Yol', cashCategory: 'Personel Harçlık / Yemek', color: '#64748b', isDistribution: false },
  profit_share: { label: 'Kâr Payı', cashCategory: 'Ortak Kâr Payı Dağıtımı', color: '#f59e0b', isDistribution: true },
  withdrawal: { label: 'Ortak Para Çekimi', cashCategory: 'Ortak Şahsi Para Çekimi', color: '#f97316', isDistribution: true },
  other: { label: 'Diğer Ödeme', cashCategory: 'Personel Diğer Ödeme', color: '#94a3b8', isDistribution: false },
};

/** Kâr dağıtımı niteliğindeki (gider sayılmayan) kasa kategorileri */
export const DISTRIBUTION_CASH_CATEGORIES: string[] = (Object.values(STAFF_PAYMENT_TYPE_CONFIG))
  .filter(c => c.isDistribution)
  .map(c => c.cashCategory);

export const isDistributionCategory = (category: string): boolean =>
  DISTRIBUTION_CASH_CATEGORIES.includes(category);

/** Maaş hesabına sayılan ödeme türleri (maaş + avans) */
export const SALARY_COUNTED_TYPES: StaffPaymentType[] = ['salary', 'advance'];

/** Bir kişinin bu takvim ayı içindeki maaş + avans ödemelerini hesaplar */
export const getMonthSalaryStatus = (member: StaffMember, payments: StaffPayment[], ref: Date = new Date()) => {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getTime();
  const paid = payments
    .filter(p => p.staffId === member.id && SALARY_COUNTED_TYPES.includes(p.type))
    .filter(p => {
      const t = new Date(p.date).getTime();
      return t >= start && t < end;
    })
    .reduce((s, p) => s + p.amount, 0);
  const salary = Number(member.monthlySalary) || 0;
  return { salary, paid, remaining: Math.max(0, salary - paid) };
};

/** Ortaklar için kâr paylarını hesaplar; yüzde girilmemişse eşit böler */
export const computeProfitShares = (partners: StaffMember[], amount: number): { member: StaffMember; percent: number; amount: number }[] => {
  if (partners.length === 0) return [];
  const totalDefined = partners.reduce((s, p) => s + (Number(p.sharePercent) || 0), 0);
  return partners.map(p => {
    const percent = totalDefined > 0 ? ((Number(p.sharePercent) || 0) / totalDefined) * 100 : 100 / partners.length;
    return { member: p, percent, amount: Math.round((amount * percent) / 100 * 100) / 100 };
  });
};

/**
 * Dönem kâr hesabı: Kâr dağıtımı niteliğindeki kasa çıkışları (ortak kâr payı / şahsi çekim)
 * gider sayılmaz; ayrıca "dağıtılan" olarak raporlanır.
 */
export const computePeriodProfit = (transactions: CashTransaction[], range: PeriodRange) => {
  let income = 0;
  let expense = 0;
  let distributed = 0;
  transactions.forEach(t => {
    if (!isInPeriod(t.date, range)) return;
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') {
      if (isDistributionCategory(t.category)) distributed += t.amount;
      else expense += t.amount;
    }
  });
  return { income, expense, netProfit: income - expense, distributed };
};

/** YYYY-MM-DD tarih seçimini ISO tarihe çevirir (bugünse şu anki saat, değilse öğlen 12:00) */
export const dateInputToIso = (value: string): string => {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  const now = new Date();
  const isToday = now.getFullYear() === y && now.getMonth() === m - 1 && now.getDate() === d;
  return isToday ? now.toISOString() : new Date(y, m - 1, d, 12, 0, 0).toISOString();
};
