// ============================================================================
// ServisPro - Bağımlılıksız Excel (.xlsx) Oluşturucu
// ----------------------------------------------------------------------------
// Harici bir kütüphane kullanmadan gerçek Office Open XML (.xlsx) dosyası üretir.
// Dosya; ZIP (STORE yöntemi) içinde workbook, stil ve sayfa XML'lerinden oluşur.
// Excel, LibreOffice, Google Sheets ve Numbers tarafından uyarı vermeden açılır.
// ============================================================================

export type CellStyle =
  | 'default'
  | 'header'
  | 'currency'
  | 'datetime'
  | 'date'
  | 'title'
  | 'bold'
  | 'boldCurrency'
  | 'percent'
  | 'subtitle';

type RawValue = string | number | boolean | Date | null | undefined;

export type CellValue = RawValue | { value: RawValue; style?: CellStyle };

export interface SheetSpec {
  /** Sayfa adı (en fazla 31 karakter, Excel'in yasakladığı karakterler otomatik temizlenir) */
  name: string;
  rows: CellValue[][];
  /** Karakter cinsinden sütun genişlikleri */
  columnWidths?: number[];
  /** Başlık satırının (0 tabanlı) indeksi. Verilirse otomatik filtre + bölme dondurma uygulanır. */
  headerRowIndex?: number;
}

// Stil indeksleri styles.xml içindeki cellXfs sırası ile birebir aynıdır
const STYLE_INDEX: Record<CellStyle, number> = {
  default: 0,
  header: 1,
  currency: 2,
  datetime: 3,
  date: 4,
  title: 5,
  bold: 6,
  boldCurrency: 7,
  percent: 8,
  subtitle: 9,
};

// ---------------------------------------------------------------------------
// XML yardımcıları
// ---------------------------------------------------------------------------

// XML 1.0'da geçersiz kontrol karakterlerini temizler ve özel karakterleri kaçırır
const escapeXml = (input: string): string =>
  input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const columnLetter = (index: number): string => {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// Yerel saat bileşenlerini kullanarak Excel seri tarih numarasına çevirir
const toExcelSerial = (d: Date): number => {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  return (utc - Date.UTC(1899, 11, 30)) / 86400000;
};

const sanitizeSheetName = (name: string, used: Set<string>): string => {
  let base = (name || 'Sayfa').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sayfa';
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

const renderCell = (ref: string, cell: CellValue): string => {
  let value: RawValue;
  let style: CellStyle | undefined;

  if (cell !== null && typeof cell === 'object' && !(cell instanceof Date)) {
    value = cell.value;
    style = cell.style;
  } else {
    value = cell as RawValue;
  }

  if (value === null || value === undefined || value === '') {
    return style ? `<c r="${ref}" s="${STYLE_INDEX[style]}"/>` : '';
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const s = STYLE_INDEX[style || 'datetime'];
    return `<c r="${ref}" s="${s}"><v>${toExcelSerial(value)}</v></c>`;
  }

  if (typeof value === 'number') {
    if (!isFinite(value)) return '';
    const s = style ? ` s="${STYLE_INDEX[style]}"` : '';
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }

  if (typeof value === 'boolean') {
    const s = style ? ` s="${STYLE_INDEX[style]}"` : '';
    return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  const s = style ? ` s="${STYLE_INDEX[style]}"` : '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
};

const buildSheetXml = (sheet: SheetSpec): string => {
  const maxCols = sheet.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  parts.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">');

  const hasHeader = typeof sheet.headerRowIndex === 'number' && sheet.headerRowIndex >= 0 && sheet.rows.length > sheet.headerRowIndex;
  if (hasHeader) {
    const topRow = (sheet.headerRowIndex as number) + 2;
    parts.push(
      `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${topRow - 1}" topLeftCell="A${topRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    );
  }

  if (sheet.columnWidths && sheet.columnWidths.length > 0) {
    parts.push('<cols>');
    sheet.columnWidths.forEach((w, i) => {
      parts.push(`<col min="${i + 1}" max="${i + 1}" width="${Math.max(4, w)}" customWidth="1"/>`);
    });
    parts.push('</cols>');
  }

  parts.push('<sheetData>');
  sheet.rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 1;
    const cells = row.map((cell, cIdx) => renderCell(`${columnLetter(cIdx)}${rowNum}`, cell)).join('');
    const isHeader = hasHeader && rIdx === sheet.headerRowIndex;
    parts.push(`<row r="${rowNum}"${isHeader ? ' ht="22" customHeight="1"' : ''}>${cells}</row>`);
  });
  parts.push('</sheetData>');

  if (hasHeader && maxCols > 0) {
    const headerRow = (sheet.headerRowIndex as number) + 1;
    const lastRow = Math.max(headerRow, sheet.rows.length);
    parts.push(`<autoFilter ref="A${headerRow}:${columnLetter(maxCols - 1)}${lastRow}"/>`);
  }

  parts.push('<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>');
  parts.push('<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
  parts.push('</worksheet>');
  return parts.join('');
};

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="4">' +
  '<numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;₺&quot;"/>' +
  '<numFmt numFmtId="165" formatCode="dd/mm/yyyy\\ hh:mm"/>' +
  '<numFmt numFmtId="166" formatCode="dd/mm/yyyy"/>' +
  '<numFmt numFmtId="167" formatCode="0.0%"/>' +
  '</numFmts>' +
  '<fonts count="5">' +
  '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="15"/><color rgb="FF1E3A8A"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/><family val="2"/></font>' +
  '</fonts>' +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1E40AF"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="2">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="10">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>' +
  '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="3" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
  '<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

// ---------------------------------------------------------------------------
// Minimal ZIP (STORE) yazıcı
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const createZip = (files: { name: string; data: Uint8Array }[]): Uint8Array => {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | (Math.floor(now.getSeconds() / 2) & 0x1f);
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  files.forEach(file => {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 dosya adları
    lv.setUint16(8, 0, true); // STORE
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    localChunks.push(local, file.data);
    centralChunks.push(central);
    offset += local.length + size;
  });

  const centralSize = centralChunks.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let pos = 0;
  [...localChunks, ...centralChunks, end].forEach(chunk => {
    out.set(chunk, pos);
    pos += chunk.length;
  });
  return out;
};

// ---------------------------------------------------------------------------
// Genel API
// ---------------------------------------------------------------------------

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const buildXlsx = (sheets: SheetSpec[]): Uint8Array => {
  const encoder = new TextEncoder();
  const used = new Set<string>();
  const safeSheets = (sheets.length > 0 ? sheets : [{ name: 'Sayfa1', rows: [] }]).map(s => ({
    ...s,
    name: sanitizeSheetName(s.name, used),
  }));

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    safeSheets
      .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join('') +
    '</Types>';

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    '</Relationships>';

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<bookViews><workbookView/></bookViews><sheets>' +
    safeSheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    '</sheets>' +
    (() => {
      const names = safeSheets
        .map((s, i) => {
          if (typeof s.headerRowIndex !== 'number' || s.rows.length <= s.headerRowIndex) return '';
          const maxCols = s.rows.reduce((m, r) => Math.max(m, r.length), 0);
          if (maxCols === 0) return '';
          const headerRow = s.headerRowIndex + 1;
          const lastRow = Math.max(headerRow, s.rows.length);
          const sheetRef = `'${s.name.replace(/'/g, "''")}'`;
          return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${escapeXml(sheetRef)}!$A$${headerRow}:$${columnLetter(maxCols - 1)}$${lastRow}</definedName>`;
        })
        .join('');
      return names ? `<definedNames>${names}</definedNames>` : '';
    })() +
    '</workbook>';

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    safeSheets
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join('') +
    `<Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>';

  const isoNow = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const core =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:creator>ServisPro</dc:creator>' +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${isoNow}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${isoNow}</dcterms:modified>` +
    '</cp:coreProperties>';

  const app =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ServisPro</Application></Properties>';

  const files = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
    { name: '_rels/.rels', data: encoder.encode(rootRels) },
    { name: 'docProps/core.xml', data: encoder.encode(core) },
    { name: 'docProps/app.xml', data: encoder.encode(app) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRels) },
    { name: 'xl/styles.xml', data: encoder.encode(STYLES_XML) },
    ...safeSheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: encoder.encode(buildSheetXml(s)) })),
  ];

  return createZip(files);
};

/** Dosya adındaki Türkçe karakterleri ve geçersiz karakterleri güvenli hale getirir */
export const safeFileName = (name: string): string =>
  name
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

/** Excel dosyasını oluşturur ve tarayıcı / Electron üzerinden indirir */
export const downloadXlsx = (fileName: string, sheets: SheetSpec[]): void => {
  const bytes = buildXlsx(sheets);
  const blob = new Blob([bytes as BlobPart], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const base = safeFileName(fileName.replace(/\.xlsx$/i, '')) || 'servispro_rapor';
  a.href = url;
  a.download = `${base}.xlsx`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
};
