// ============================================================================
// Servis Kayıtlarını Excel'e Aktarma
// Seçilen tarih aralığı / gün / ay için servis fişlerini çok sayfalı .xlsx olarak üretir.
// ============================================================================
import { ServiceTicket, TicketStatus } from '../types';
import { deviceTypeConfig, paymentStatusConfig, priorityConfig, ticketStatusConfig, formatDate } from './helpers';
import { CellValue, SheetSpec, downloadXlsx } from './excelExport';
import { PeriodRange, isInPeriod } from './period';

export type TicketDateBasis = 'createdAt' | 'completedAt' | 'scheduledDate';
export type TicketStatusFilter = 'all' | 'completed' | 'open' | 'cancelled';

export const TICKET_DATE_BASIS_LABELS: Record<TicketDateBasis, string> = {
  createdAt: 'Kayıt (Açılış) Tarihi',
  completedAt: 'Tamamlanma / Teslim Tarihi',
  scheduledDate: 'Randevu Tarihi',
};

export const TICKET_STATUS_FILTER_LABELS: Record<TicketStatusFilter, string> = {
  all: 'Tüm Kayıtlar',
  completed: 'Tamamlanan / Teslim Edilen',
  open: 'Açık / Devam Eden İşler',
  cancelled: 'İptal / İade',
};

const COMPLETED_STATUSES: TicketStatus[] = ['ready', 'delivered'];

const WARRANTY_LABELS: Record<ServiceTicket['warrantyStatus'], string> = {
  warranty: 'Garantili',
  out_of_warranty: 'Garanti Dışı',
  special_warranty: 'Özel Garanti',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit',
  credit_card: 'Kredi Kartı / POS',
  bank_transfer: 'Banka Havale / EFT',
  other: 'Diğer',
};

// Etiket başındaki emoji / sembolleri temizler (Excel'de sade görünüm için)
const cleanLabel = (s: string): string => s.replace(/^[^\p{L}\p{N}]+/u, '').trim();

// YYYY-MM-DD biçimini yerel gün olarak, diğerlerini ISO olarak yorumlar
const parseAnyDate = (v?: string): Date | null => {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const ticketDateValue = (t: ServiceTicket, basis: TicketDateBasis): string | undefined => {
  if (basis === 'completedAt') {
    // Eski kayıtlarda completedAt yoksa, tamamlanmış işlerde son güncelleme tarihi kullanılır
    return t.completedAt || (COMPLETED_STATUSES.includes(t.status) ? t.updatedAt : undefined);
  }
  if (basis === 'scheduledDate') {
    const d = parseAnyDate(t.scheduledDate);
    return d ? d.toISOString() : undefined;
  }
  return t.createdAt;
};

const matchesStatus = (t: ServiceTicket, filter: TicketStatusFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'cancelled') return t.status === 'cancelled';
  if (filter === 'completed') return COMPLETED_STATUSES.includes(t.status);
  return t.status !== 'cancelled' && !COMPLETED_STATUSES.includes(t.status);
};

const cleanText = (s?: string): string => {
  if (!s) return '';
  const trimmed = s.trim();
  return trimmed === '0' ? '' : trimmed;
};

export const filterTicketsForExport = (
  tickets: ServiceTicket[],
  range: PeriodRange,
  basis: TicketDateBasis,
  statusFilter: TicketStatusFilter
): ServiceTicket[] =>
  tickets
    .filter(t => matchesStatus(t, statusFilter) && isInPeriod(ticketDateValue(t, basis), range))
    .sort((a, b) => {
      const da = new Date(ticketDateValue(a, basis) || a.createdAt).getTime();
      const db = new Date(ticketDateValue(b, basis) || b.createdAt).getTime();
      return da - db;
    });

const partsTotalOf = (t: ServiceTicket): number =>
  (t.partsUsed || []).reduce((s, p) => s + (Number(p.totalPrice) || 0), 0);

export interface TicketExportOptions {
  tickets: ServiceTicket[];
  range: PeriodRange;
  basis: TicketDateBasis;
  statusFilter: TicketStatusFilter;
  shopName?: string;
}

export const buildTicketWorkbook = (opts: TicketExportOptions): SheetSpec[] => {
  const { tickets, range, basis, statusFilter, shopName } = opts;
  const h = (label: string): CellValue => ({ value: label, style: 'header' });

  // ---------------- 1) Servis Kayıtları ----------------
  const header: CellValue[] = [
    'Fiş No', 'Kayıt Tarihi', 'Randevu Tarihi', 'Randevu Saati', 'Tamamlanma Tarihi',
    'Müşteri', 'Telefon', 'Adres', 'Cihaz Türü', 'Marka', 'Model', 'Seri No', 'Garanti',
    'Arıza / Şikayet', 'Teşhis / Usta Notu', 'Teknisyen', 'Durum', 'Öncelik',
    'Kullanılan Parçalar', 'Parça Tutarı (₺)', 'İşçilik (₺)', 'Yol / Servis (₺)', 'İndirim (₺)',
    'Toplam Tutar (₺)', 'Ödenen (₺)', 'Kalan (₺)', 'Ödeme Durumu', 'Ödeme Yöntemi', 'Notlar',
  ].map(h);

  let sumParts = 0, sumLabor = 0, sumTransport = 0, sumDiscount = 0, sumTotal = 0, sumPaid = 0;

  const ticketRows: CellValue[][] = tickets.map(t => {
    const partsTotal = partsTotalOf(t);
    const total = Number(t.totalAmount) || 0;
    const paid = Number(t.paidAmount) || 0;
    const remaining = t.status === 'cancelled' ? 0 : Math.max(0, total - paid);
    sumParts += partsTotal;
    sumLabor += Number(t.laborCost) || 0;
    sumTransport += Number(t.transportCost) || 0;
    sumDiscount += Number(t.discount) || 0;
    sumTotal += total;
    sumPaid += paid;

    const partsText = (t.partsUsed || [])
      .map(p => `${p.partName}${p.partCode ? ` (${p.partCode})` : ''} x${p.quantity}`)
      .join('; ');

    return [
      t.ticketNumber,
      parseAnyDate(t.createdAt),
      { value: parseAnyDate(t.scheduledDate), style: 'date' },
      t.scheduledTimeSlot || '',
      parseAnyDate(t.completedAt),
      t.customerName,
      t.customerPhone,
      t.customerAddress,
      deviceTypeConfig[t.deviceType]?.label || t.deviceType,
      t.brand,
      t.model,
      t.serialNumber || '',
      WARRANTY_LABELS[t.warrantyStatus] || '',
      cleanText(t.reportedFault),
      cleanText(t.technicianDiagnosis),
      t.technicianName || '',
      cleanLabel(ticketStatusConfig[t.status]?.label || t.status),
      priorityConfig[t.priority]?.label || t.priority,
      partsText,
      { value: partsTotal, style: 'currency' },
      { value: Number(t.laborCost) || 0, style: 'currency' },
      { value: Number(t.transportCost) || 0, style: 'currency' },
      { value: Number(t.discount) || 0, style: 'currency' },
      { value: total, style: 'currency' },
      { value: paid, style: 'currency' },
      { value: remaining, style: 'currency' },
      paymentStatusConfig[t.paymentStatus]?.label || t.paymentStatus,
      t.paymentMethod ? PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod : '',
      cleanText(t.notes),
    ];
  });

  ticketRows.push([]);
  ticketRows.push([
    { value: 'TOPLAM', style: 'bold' }, `${tickets.length} kayıt`,
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    { value: sumParts, style: 'boldCurrency' },
    { value: sumLabor, style: 'boldCurrency' },
    { value: sumTransport, style: 'boldCurrency' },
    { value: sumDiscount, style: 'boldCurrency' },
    { value: sumTotal, style: 'boldCurrency' },
    { value: sumPaid, style: 'boldCurrency' },
    { value: tickets.reduce((s, t) => s + (t.status === 'cancelled' ? 0 : Math.max(0, (Number(t.totalAmount) || 0) - (Number(t.paidAmount) || 0))), 0), style: 'boldCurrency' },
  ]);

  const ticketsSheet: SheetSpec = {
    name: 'Servis Kayıtları',
    rows: [header, ...ticketRows],
    headerRowIndex: 0,
    columnWidths: [16, 17, 13, 13, 17, 24, 15, 40, 18, 13, 16, 16, 13, 36, 36, 16, 22, 10, 40, 14, 13, 13, 12, 15, 14, 13, 24, 18, 30],
  };

  // ---------------- 2) Kullanılan Parçalar ----------------
  const partRows: CellValue[][] = [];
  let partsQty = 0;
  tickets.forEach(t => {
    (t.partsUsed || []).forEach(p => {
      partsQty += Number(p.quantity) || 0;
      partRows.push([
        t.ticketNumber,
        parseAnyDate(ticketDateValue(t, basis) || t.createdAt),
        t.customerName,
        `${t.brand} ${t.model}`.trim(),
        p.partName,
        p.partCode || '',
        Number(p.quantity) || 0,
        { value: Number(p.unitPrice) || 0, style: 'currency' },
        { value: Number(p.totalPrice) || 0, style: 'currency' },
      ]);
    });
  });
  if (partRows.length > 0) {
    partRows.push([]);
    partRows.push([
      { value: 'TOPLAM', style: 'bold' }, '', '', '', '', '',
      { value: partsQty, style: 'bold' }, '',
      { value: sumParts, style: 'boldCurrency' },
    ]);
  }
  const partsSheet: SheetSpec = {
    name: 'Kullanılan Parçalar',
    rows: [
      ['Fiş No', 'Tarih', 'Müşteri', 'Cihaz', 'Parça Adı', 'Parça Kodu', 'Adet', 'Birim Fiyat (₺)', 'Toplam (₺)'].map(h),
      ...(partRows.length > 0 ? partRows : [['Seçilen kayıtlarda parça kullanımı yok']]),
    ],
    headerRowIndex: 0,
    columnWidths: [16, 17, 24, 22, 30, 16, 8, 15, 15],
  };

  // ---------------- 3) Özet ----------------
  const byStatus: Record<string, { count: number; total: number }> = {};
  const byTech: Record<string, { count: number; total: number; paid: number }> = {};
  const byDevice: Record<string, { count: number; total: number }> = {};
  tickets.forEach(t => {
    const total = Number(t.totalAmount) || 0;
    const sKey = cleanLabel(ticketStatusConfig[t.status]?.label || t.status);
    byStatus[sKey] = byStatus[sKey] || { count: 0, total: 0 };
    byStatus[sKey].count++;
    byStatus[sKey].total += total;

    const tKey = t.technicianName?.trim() || 'Atanmamış';
    byTech[tKey] = byTech[tKey] || { count: 0, total: 0, paid: 0 };
    byTech[tKey].count++;
    byTech[tKey].total += total;
    byTech[tKey].paid += Number(t.paidAmount) || 0;

    const dKey = deviceTypeConfig[t.deviceType]?.label || t.deviceType;
    byDevice[dKey] = byDevice[dKey] || { count: 0, total: 0 };
    byDevice[dKey].count++;
    byDevice[dKey].total += total;
  });

  const summaryRows: CellValue[][] = [
    [{ value: `${shopName || 'ServisPro'} – Servis Kayıtları Raporu`, style: 'title' }],
    [{ value: `Dönem: ${range.label}`, style: 'subtitle' }],
    [{ value: `Tarih bazı: ${TICKET_DATE_BASIS_LABELS[basis]}  •  Filtre: ${TICKET_STATUS_FILTER_LABELS[statusFilter]}`, style: 'subtitle' }],
    [{ value: `Oluşturulma: ${formatDate(new Date().toISOString())}`, style: 'subtitle' }],
    [],
    [h('Genel Toplamlar'), h('Değer'), h('')],
    ['Toplam Kayıt', tickets.length],
    ['Toplam Ciro (Fiş Tutarları)', { value: sumTotal, style: 'currency' }],
    ['Tahsil Edilen', { value: sumPaid, style: 'currency' }],
    ['Kalan / Açık Alacak', { value: tickets.reduce((s, t) => s + (t.status === 'cancelled' ? 0 : Math.max(0, (Number(t.totalAmount) || 0) - (Number(t.paidAmount) || 0))), 0), style: 'currency' }],
    ['Parça Tutarı', { value: sumParts, style: 'currency' }],
    ['İşçilik', { value: sumLabor, style: 'currency' }],
    ['Yol / Servis Bedeli', { value: sumTransport, style: 'currency' }],
    ['İndirim', { value: sumDiscount, style: 'currency' }],
    [],
    [h('Duruma Göre'), h('Adet'), h('Tutar (₺)')],
    ...Object.entries(byStatus).sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]): CellValue[] => [k, v.count, { value: v.total, style: 'currency' }]),
    [],
    [h('Teknisyene Göre'), h('Adet'), h('Tutar (₺)'), h('Tahsilat (₺)')],
    ...Object.entries(byTech).sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]): CellValue[] => [k, v.count, { value: v.total, style: 'currency' }, { value: v.paid, style: 'currency' }]),
    [],
    [h('Cihaz Türüne Göre'), h('Adet'), h('Tutar (₺)')],
    ...Object.entries(byDevice).sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]): CellValue[] => [k, v.count, { value: v.total, style: 'currency' }]),
  ];

  const summarySheet: SheetSpec = {
    name: 'Özet',
    rows: summaryRows,
    columnWidths: [36, 18, 18, 18],
  };

  return [ticketsSheet, partsSheet, summarySheet];
};

export const exportTicketsToExcel = (opts: TicketExportOptions): void => {
  const sheets = buildTicketWorkbook(opts);
  downloadXlsx(`servis_kayitlari_${opts.range.fileTag}`, sheets);
};
