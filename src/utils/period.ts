// ============================================================================
// Dönem / Tarih Aralığı Seçim Yardımcıları
// Kâr-Zarar raporu ve Excel dışa aktarma ekranlarında ortak kullanılır.
// ============================================================================
import { getLocalDateString } from './helpers';

export type PeriodMode =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'all'
  | 'day'    // Belirli bir gün
  | 'month'  // Belirli bir ay
  | 'range'; // Özel tarih aralığı

export interface PeriodSelection {
  mode: PeriodMode;
  day: string;   // YYYY-MM-DD
  month: string; // YYYY-MM
  from: string;  // YYYY-MM-DD
  to: string;    // YYYY-MM-DD
}

export interface PeriodRange {
  /** Dahil başlangıç (ms). null = sınırsız */
  start: number | null;
  /** Hariç bitiş (ms). null = sınırsız */
  end: number | null;
  /** Ekranda gösterilecek okunabilir açıklama */
  label: string;
  /** Dosya adında kullanılacak kısa etiket */
  fileTag: string;
}

export const createDefaultPeriod = (mode: PeriodMode = 'this_month'): PeriodSelection => {
  const today = getLocalDateString();
  return {
    mode,
    day: today,
    month: today.slice(0, 7),
    from: `${today.slice(0, 8)}01`,
    to: today,
  };
};

const parseLocalDate = (ymd: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};

const parseLocalMonth = (ym: string): Date | null => {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDay = (d: Date) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

const fmtDayShort = (d: Date) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(d);

const fmtMonth = (d: Date) =>
  new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(d);

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const resolvePeriod = (p: PeriodSelection, now: Date = new Date()): PeriodRange => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (p.mode) {
    case 'today':
      return {
        start: today.getTime(),
        end: addDays(today, 1).getTime(),
        label: `Bugün (${fmtDay(today)})`,
        fileTag: getLocalDateString(today),
      };
    case 'this_week': {
      const dow = today.getDay() || 7; // Pazartesi = 1
      const start = addDays(today, -dow + 1);
      const end = addDays(start, 7);
      return {
        start: start.getTime(),
        end: end.getTime(),
        label: `Bu Hafta (${fmtDayShort(start)} – ${fmtDay(addDays(end, -1))})`,
        fileTag: `${getLocalDateString(start)}_${getLocalDateString(addDays(end, -1))}`,
      };
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return {
        start: start.getTime(),
        end: end.getTime(),
        label: `Bu Ay (${fmtMonth(start)})`,
        fileTag: getLocalDateString(start).slice(0, 7),
      };
    }
    case 'day': {
      const d = parseLocalDate(p.day) || today;
      return {
        start: d.getTime(),
        end: addDays(d, 1).getTime(),
        label: fmtDay(d),
        fileTag: getLocalDateString(d),
      };
    }
    case 'month': {
      const d = parseLocalMonth(p.month) || new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        start: d.getTime(),
        end: end.getTime(),
        label: fmtMonth(d),
        fileTag: getLocalDateString(d).slice(0, 7),
      };
    }
    case 'range': {
      let a = parseLocalDate(p.from) || today;
      let b = parseLocalDate(p.to) || today;
      if (a.getTime() > b.getTime()) [a, b] = [b, a];
      return {
        start: a.getTime(),
        end: addDays(b, 1).getTime(),
        label: a.getTime() === b.getTime() ? fmtDay(a) : `${fmtDay(a)} – ${fmtDay(b)}`,
        fileTag: a.getTime() === b.getTime()
          ? getLocalDateString(a)
          : `${getLocalDateString(a)}_${getLocalDateString(b)}`,
      };
    }
    case 'all':
    default:
      return { start: null, end: null, label: 'Tüm Zamanlar', fileTag: 'tum_zamanlar' };
  }
};

/** Verilen ISO tarihin seçili dönem içinde olup olmadığını kontrol eder */
export const isInPeriod = (dateStr: string | undefined | null, range: PeriodRange): boolean => {
  if (range.start === null && range.end === null) return true;
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  if (range.start !== null && t < range.start) return false;
  if (range.end !== null && t >= range.end) return false;
  return true;
};

/** Gün veya ay modunda önceki / sonraki döneme geçiş */
export const shiftPeriod = (p: PeriodSelection, direction: 1 | -1): PeriodSelection => {
  if (p.mode === 'day') {
    const d = parseLocalDate(p.day) || new Date();
    return { ...p, day: getLocalDateString(addDays(d, direction)) };
  }
  if (p.mode === 'month') {
    const d = parseLocalMonth(p.month) || new Date();
    const next = new Date(d.getFullYear(), d.getMonth() + direction, 1);
    return { ...p, month: getLocalDateString(next).slice(0, 7) };
  }
  return p;
};
