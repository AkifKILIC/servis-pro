import { 
  Customer, 
  ServiceTicket, 
  SparePart, 
  CashTransaction, 
  ShopSettings, 
  DeviceType, 
  TicketStatus 
} from '../types';

const STORAGE_KEYS = {
  CUSTOMERS: 'servispro_customers',
  TICKETS: 'servispro_tickets',
  PARTS: 'servispro_parts',
  CASH: 'servispro_cash',
  SETTINGS: 'servispro_settings',
  THEME: 'servispro_theme',
};

// Varsayılan dükkan ayarları
export const defaultSettings: ShopSettings = {
  shopName: 'UZMAN BEYAZ EŞYA TEKNİK SERVİS',
  shopOwner: 'Akif Usta',
  phone: '0555 123 45 67',
  whatsapp: '905551234567',
  address: 'Atatürk Cad. No: 48/A',
  city: 'İstanbul',
  district: 'Kadıköy',
  taxNumber: '1234567890',
  technicianGroupName: 'Teknik Servis Saha Ekibi',
  warrantyTerms: 'Değişen orijinal yedek parçalarımız ve yapılan işçilik 1 (bir) yıl firmamız garantisi kapsamındadır. Kullanıcı kaynaklı arızalar garanti haricidir.',
  receiptFooterNote: 'Bizi tercih ettiğiniz için teşekkür ederiz. 7/24 Arıza Bildirim Hattı: 0555 123 45 67',
};

// Başlangıç için örnek gerçekçi müşteriler
const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    fullName: 'Ahmet Yılmaz',
    phone: '0532 111 22 33',
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: 'Moda',
    address: 'Şair Nefi Sok. Menekşe Apt. No:12 D:4',
    notes: 'Kedi besliyor, sabah 10:00 dan sonra evde.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'cust-2',
    fullName: 'Fatma Demir',
    phone: '0543 222 33 44',
    city: 'İstanbul',
    district: 'Üsküdar',
    neighborhood: 'Acıbadem',
    address: 'Sarayardı Cad. Nilüfer Sit. B Blok D:8',
    notes: 'Giriş zili çalışmıyor, gelmeden önce arayınız.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'cust-3',
    fullName: 'Mehmet Kaya',
    phone: '0505 333 44 55',
    city: 'İstanbul',
    district: 'Ataşehir',
    neighborhood: 'Barbaros',
    address: 'Mor Leylak Sok. Güneş Rezidans Kat:5 D:22',
    notes: 'Site güvenliğine plaka bildirilmesi gerekiyor.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'cust-4',
    fullName: 'Ayşe Öztürk',
    phone: '0533 444 55 66',
    city: 'İstanbul',
    district: 'Maltepe',
    neighborhood: 'Küçükyalı',
    address: 'Bağdat Cad. Çınar Apt. No:74 D:2',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

// Başlangıç için örnek gerçekçi yedek parçalar
const initialParts: SparePart[] = [
  {
    id: 'part-1',
    name: 'Çamaşır Makinesi Tahliye Pompası (Mıknatıslı)',
    code: 'PMP-ARC-01',
    category: 'Tahliye Pompaları',
    compatibleBrands: ['Arçelik', 'Beko', 'Altus', 'Grundig'],
    quantity: 14,
    minStockLevel: 5,
    purchasePrice: 280,
    salePrice: 750,
    location: 'Raf A-2',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'part-2',
    name: 'Bosch / Siemens Kazan Amortisörü (120N)',
    code: 'AMR-BSH-12',
    category: 'Mekanik Parçalar',
    compatibleBrands: ['Bosch', 'Siemens', 'Profilo'],
    quantity: 3,
    minStockLevel: 4, // Kritik seviye uyarısı verecek
    purchasePrice: 190,
    salePrice: 480,
    location: 'Raf B-1',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'part-3',
    name: 'Bulaşık Makinesi Isıtıcı Rezistans (Girdap Tipi)',
    code: 'RZS-BLK-88',
    category: 'Rezistanslar',
    compatibleBrands: ['Arçelik', 'Beko', 'Vestel'],
    quantity: 6,
    minStockLevel: 3,
    purchasePrice: 420,
    salePrice: 1100,
    location: 'Raf C-4',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'part-4',
    name: 'No-Frost Buzdolabı NTC Defrost Sensörü',
    code: 'SNS-NTC-05',
    category: 'Elektronik & Sensörler',
    compatibleBrands: ['Samsung', 'LG', 'Bosch', 'Arçelik'],
    quantity: 18,
    minStockLevel: 6,
    purchasePrice: 110,
    salePrice: 350,
    location: 'Kutu E-1',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'part-5',
    name: 'Buzdolabı R600a Gaz Tüpü (420g)',
    code: 'GAZ-R600-42',
    category: 'Soğutma Gazları',
    compatibleBrands: ['Tüm Markalar'],
    quantity: 2,
    minStockLevel: 5, // Kritik seviye
    purchasePrice: 350,
    salePrice: 900,
    location: 'Gaz Dolabı Alt',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'part-6',
    name: 'Evrensel Çamaşır Makinesi Giriş Ventili (Çiftli)',
    code: 'VNT-UNV-02',
    category: 'Ventiller',
    compatibleBrands: ['Arçelik', 'Beko', 'Vestel', 'Regal'],
    quantity: 9,
    minStockLevel: 4,
    purchasePrice: 160,
    salePrice: 450,
    location: 'Raf A-5',
    updatedAt: new Date().toISOString(),
  },
];

// Başlangıç için örnek servis fişleri
const initialTickets: ServiceTicket[] = [
  {
    id: 'srv-1',
    ticketNumber: 'SRV-2026-0001',
    customerId: 'cust-1',
    customerName: 'Ahmet Yılmaz',
    customerPhone: '0532 111 22 33',
    customerAddress: 'Şair Nefi Sok. Menekşe Apt. No:12 D:4 Moda / Kadıköy',
    deviceType: 'washing_machine',
    brand: 'Arçelik',
    model: '9123 N Çamaşır Makinesi',
    serialNumber: 'ARC-9123-98442',
    warrantyStatus: 'out_of_warranty',
    reportedFault: 'Sıkmaya geçerken aşırı ses ve vuruntu yapıyor, kazan zıplıyor.',
    technicianDiagnosis: 'Kazan amortisörleri patlamış ve körük lastiğinde sürtünme tespit edildi. Amortisör değişimi yapıldı.',
    technicianName: 'Akif Usta',
    status: 'ready',
    priority: 'normal',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTimeSlot: '14:00 - 16:00',
    partsUsed: [
      {
        id: 'p-used-1',
        partId: 'part-2',
        partName: 'Bosch / Siemens Kazan Amortisörü (120N)',
        partCode: 'AMR-BSH-12',
        quantity: 2,
        unitPrice: 480,
        totalPrice: 960,
      }
    ],
    laborCost: 600,
    transportCost: 200,
    discount: 60,
    totalAmount: 1700,
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    paidAmount: 1700,
    notes: 'Test çalışmasında 1200 devirde sessiz çalıştı. Müşteriye bilgi verildi.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'srv-2',
    ticketNumber: 'SRV-2026-0002',
    customerId: 'cust-2',
    customerName: 'Fatma Demir',
    customerPhone: '0543 222 33 44',
    customerAddress: 'Sarayardı Cad. Nilüfer Sit. B Blok D:8 Acıbadem / Üsküdar',
    deviceType: 'refrigerator',
    brand: 'Bosch',
    model: 'KGN56VWF0N NoFrost',
    serialNumber: 'BSH-KGN-00213',
    warrantyStatus: 'special_warranty',
    reportedFault: 'Alt soğutucu bölüm soğutmuyor, üst dondurucu normal ama arka ızgara karlanma yapmış.',
    technicianDiagnosis: 'Defrost sensörü açık devre kalmış, evaporatör buz bloklaması yapmış. Sensör değişimi ve defrost kanalı temizliği planlandı.',
    technicianName: 'Akif Usta',
    status: 'in_repair',
    priority: 'urgent',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTimeSlot: '11:00 - 13:00',
    partsUsed: [
      {
        id: 'p-used-2',
        partId: 'part-4',
        partName: 'No-Frost Buzdolabı NTC Defrost Sensörü',
        partCode: 'SNS-NTC-05',
        quantity: 1,
        unitPrice: 350,
        totalPrice: 350,
      }
    ],
    laborCost: 750,
    transportCost: 200,
    discount: 0,
    totalAmount: 1300,
    paymentStatus: 'unpaid',
    paidAmount: 0,
    notes: 'Dolap eritilmeye alındı, usta parçayı takıp 24 saat test edecek.',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'srv-3',
    ticketNumber: 'SRV-2026-0003',
    customerId: 'cust-3',
    customerName: 'Mehmet Kaya',
    customerPhone: '0505 333 44 55',
    customerAddress: 'Mor Leylak Sok. Güneş Rezidans Kat:5 D:22 Barbaros / Ataşehir',
    deviceType: 'dishwasher',
    brand: 'Beko',
    model: 'BM 6046 SC Bulaşık Makinesi',
    warrantyStatus: 'out_of_warranty',
    reportedFault: 'Yıkama bitince suyu boşaltmıyor, ekranda E01 su tahliye hatası veriyor.',
    technicianDiagnosis: 'Pompa pervanesine kürdan ve cam kırığı sıkışmış, tahliye motor sargısı aşırı ısınmış. Pompa motoru değişecek.',
    status: 'waiting_parts',
    priority: 'normal',
    partsUsed: [
      {
        id: 'p-used-3',
        partId: 'part-1',
        partName: 'Çamaşır Makinesi Tahliye Pompası (Mıknatıslı)',
        partCode: 'PMP-ARC-01',
        quantity: 1,
        unitPrice: 750,
        totalPrice: 750,
      }
    ],
    laborCost: 500,
    transportCost: 150,
    discount: 0,
    totalAmount: 1400,
    paymentStatus: 'unpaid',
    paidAmount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv-4',
    ticketNumber: 'SRV-2026-0004',
    customerId: 'cust-4',
    customerName: 'Ayşe Öztürk',
    customerPhone: '0533 444 55 66',
    customerAddress: 'Bağdat Cad. Çınar Apt. No:74 D:2 Küçükyalı / Maltepe',
    deviceType: 'air_conditioner',
    brand: 'Daikin',
    model: 'FTXF35A Inverter 12.000 BTU',
    warrantyStatus: 'out_of_warranty',
    reportedFault: 'Klima üflüyor fakat soğuk hava vermiyor, boru bağlantı yerlerinde yağlanma var.',
    technicianDiagnosis: 'Bakır boru rakorunda mikro kaçak oluşmuş, gaz boşalmış. Kaçak onarımı, vakumlama ve R32 gaz şarjı yapılacak.',
    status: 'scheduled',
    priority: 'urgent',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    scheduledTimeSlot: '16:00 - 18:00',
    partsUsed: [],
    laborCost: 800,
    transportCost: 200,
    discount: 0,
    totalAmount: 1900,
    paymentStatus: 'unpaid',
    paidAmount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Başlangıç için kasa hareketleri
const initialCash: CashTransaction[] = [
  {
    id: 'tx-1',
    type: 'income',
    category: 'Servis Tahsilatı',
    amount: 1700,
    date: new Date(Date.now() - 3600000 * 4).toISOString(),
    description: 'Ahmet Yılmaz - SRV-2026-0001 Tahsilatı',
    relatedTicketId: 'srv-1',
    paymentMethod: 'cash',
  },
  {
    id: 'tx-2',
    type: 'expense',
    category: 'Yedek Parça Alımı',
    amount: 1500,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    description: 'Toptancıdan pompa ve rezistans alımı (Fatura No: 4421)',
    paymentMethod: 'bank_transfer',
  },
  {
    id: 'tx-3',
    type: 'expense',
    category: 'Servis Aracı Yakıt',
    amount: 650,
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    description: 'Servis aracı dizel yakıt alımı',
    paymentMethod: 'credit_card',
  },
];

class StorageService {
  // Müşteriler
  getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) {
      this.saveCustomers(initialCustomers);
      return initialCustomers;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialCustomers;
    }
  }

  saveCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const customers = this.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: 'cust-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    customers.unshift(newCustomer);
    this.saveCustomers(customers);
    return newCustomer;
  }

  updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    customers[idx] = { ...customers[idx], ...updates };
    this.saveCustomers(customers);
    return customers[idx];
  }

  deleteCustomer(id: string): boolean {
    const customers = this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    this.saveCustomers(filtered);
    return true;
  }

  // Servis Fişleri
  getTickets(): ServiceTicket[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
    if (!raw) {
      this.saveTickets(initialTickets);
      return initialTickets;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialTickets;
    }
  }

  saveTickets(tickets: ServiceTicket[]): void {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  }

  generateTicketNumber(): string {
    const tickets = this.getTickets();
    const currentYear = new Date().getFullYear();
    const yearPrefix = `SRV-${currentYear}-`;
    const sameYearTickets = tickets.filter(t => t.ticketNumber.startsWith(yearPrefix));
    const nextSeq = sameYearTickets.length + 1;
    return `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  addTicket(ticketData: Omit<ServiceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>): ServiceTicket {
    const tickets = this.getTickets();
    const newTicket: ServiceTicket = {
      ...ticketData,
      id: 'srv-' + Date.now(),
      ticketNumber: this.generateTicketNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tickets.unshift(newTicket);
    this.saveTickets(tickets);

    // Eğer fişte kullanılan parçalar varsa stoktan düşelim
    if (newTicket.partsUsed && newTicket.partsUsed.length > 0) {
      newTicket.partsUsed.forEach(partItem => {
        if (partItem.partId) {
          this.adjustPartStock(partItem.partId, -partItem.quantity);
        }
      });
    }

    // Eğer anında ödeme alındıysa kasaya gelir kaydedelim
    if (newTicket.paymentStatus === 'paid' && newTicket.paidAmount > 0) {
      this.addCashTransaction({
        type: 'income',
        category: 'Servis Tahsilatı',
        amount: newTicket.paidAmount,
        date: new Date().toISOString(),
        description: `${newTicket.customerName} - ${newTicket.ticketNumber} Servis Tahsilatı`,
        relatedTicketId: newTicket.id,
        paymentMethod: newTicket.paymentMethod || 'cash',
      });
    }

    return newTicket;
  }

  updateTicket(id: string, updates: Partial<ServiceTicket>): ServiceTicket | null {
    const tickets = this.getTickets();
    const idx = tickets.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const oldTicket = tickets[idx];
    const updatedTicket: ServiceTicket = {
      ...oldTicket,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Eğer tamamlandı veya teslim edildi olduysa completedAt set edelim
    if ((updates.status === 'ready' || updates.status === 'delivered') && !updatedTicket.completedAt) {
      updatedTicket.completedAt = new Date().toISOString();
    }

    // Eski ödeme 'unpaid' iken şimdi 'paid' olduysa kasaya ekleyelim
    if (oldTicket.paymentStatus !== 'paid' && updates.paymentStatus === 'paid' && (updates.paidAmount || updatedTicket.paidAmount) > 0) {
      this.addCashTransaction({
        type: 'income',
        category: 'Servis Tahsilatı',
        amount: updates.paidAmount || updatedTicket.paidAmount,
        date: new Date().toISOString(),
        description: `${updatedTicket.customerName} - ${updatedTicket.ticketNumber} Servis Tahsilatı`,
        relatedTicketId: updatedTicket.id,
        paymentMethod: updatedTicket.paymentMethod || 'cash',
      });
    }

    tickets[idx] = updatedTicket;
    this.saveTickets(tickets);
    return updatedTicket;
  }

  deleteTicket(id: string): boolean {
    const tickets = this.getTickets();
    const filtered = tickets.filter(t => t.id !== id);
    this.saveTickets(filtered);
    return true;
  }

  // Yedek Parçalar
  getParts(): SparePart[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PARTS);
    if (!raw) {
      this.saveParts(initialParts);
      return initialParts;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialParts;
    }
  }

  saveParts(parts: SparePart[]): void {
    localStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(parts));
  }

  addPart(part: Omit<SparePart, 'id' | 'updatedAt'>): SparePart {
    const parts = this.getParts();
    const newPart: SparePart = {
      ...part,
      id: 'part-' + Date.now(),
      updatedAt: new Date().toISOString(),
    };
    parts.unshift(newPart);
    this.saveParts(parts);
    return newPart;
  }

  updatePart(id: string, updates: Partial<SparePart>): SparePart | null {
    const parts = this.getParts();
    const idx = parts.findIndex(p => p.id === id);
    if (idx === -1) return null;
    parts[idx] = { ...parts[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveParts(parts);
    return parts[idx];
  }

  adjustPartStock(partId: string, amount: number): boolean {
    const parts = this.getParts();
    const idx = parts.findIndex(p => p.id === partId);
    if (idx === -1) return false;
    parts[idx].quantity = Math.max(0, parts[idx].quantity + amount);
    parts[idx].updatedAt = new Date().toISOString();
    this.saveParts(parts);
    return true;
  }

  deletePart(id: string): boolean {
    const parts = this.getParts();
    const filtered = parts.filter(p => p.id !== id);
    this.saveParts(filtered);
    return true;
  }

  // Kasa / Muhasebe
  getCashTransactions(): CashTransaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CASH);
    if (!raw) {
      this.saveCashTransactions(initialCash);
      return initialCash;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialCash;
    }
  }

  saveCashTransactions(txs: CashTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.CASH, JSON.stringify(txs));
  }

  addCashTransaction(tx: Omit<CashTransaction, 'id'>): CashTransaction {
    const txs = this.getCashTransactions();
    const newTx: CashTransaction = {
      ...tx,
      id: 'tx-' + Date.now(),
    };
    txs.unshift(newTx);
    this.saveCashTransactions(txs);
    return newTx;
  }

  deleteCashTransaction(id: string): boolean {
    const txs = this.getCashTransactions();
    const filtered = txs.filter(t => t.id !== id);
    this.saveCashTransactions(filtered);
    return true;
  }

  // Ayarlar
  getSettings(): ShopSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      this.saveSettings(defaultSettings);
      return defaultSettings;
    }
    try {
      return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {
      return defaultSettings;
    }
  }

  saveSettings(settings: ShopSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Tema
  getTheme(): 'dark' | 'light' {
    const t = localStorage.getItem(STORAGE_KEYS.THEME);
    return (t === 'light' || t === 'dark') ? t : 'dark';
  }

  saveTheme(theme: 'dark' | 'light'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  // Tam Yedekleme (Dışa Aktarma & İçe Aktarma)
  exportFullBackup(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      customers: this.getCustomers(),
      tickets: this.getTickets(),
      parts: this.getParts(),
      cash: this.getCashTransactions(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.customers) this.saveCustomers(data.customers);
      if (data.tickets) this.saveTickets(data.tickets);
      if (data.parts) this.saveParts(data.parts);
      if (data.cash) this.saveCashTransactions(data.cash);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (e) {
      console.error('Yedek yükleme hatası:', e);
      return false;
    }
  }

  // Fabrika Ayarlarına / Örnek Veriye Dön
  resetToSampleData(): void {
    this.saveCustomers(initialCustomers);
    this.saveTickets(initialTickets);
    this.saveParts(initialParts);
    this.saveCashTransactions(initialCash);
    this.saveSettings(defaultSettings);
  }
}

export const storage = new StorageService();
