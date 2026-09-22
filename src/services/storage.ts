import { 
  Customer, 
  ServiceTicket, 
  SparePart, 
  CashTransaction, 
  ShopSettings, 
  DeviceType, 
  TicketStatus,
  CurrentAccount,
  CurrentAccountTransaction
} from '../types';

const STORAGE_KEYS = {
  CUSTOMERS: 'servispro_customers',
  TICKETS: 'servispro_tickets',
  PARTS: 'servispro_parts',
  CASH: 'servispro_cash',
  CURRENT_ACCOUNTS: 'servispro_current_accounts',
  CURRENT_TRANSACTIONS: 'servispro_current_transactions',
  SETTINGS: 'servispro_settings',
  THEME: 'servispro_theme',
};


// Varsayılan dükkan ayarları
export const defaultSettings: ShopSettings = {
  "shopName": "İZMİRİMTEKNİK SERVİSPRO",
  "shopOwner": "Akif Usta",
  "phone": "0555 123 45 67",
  "whatsapp": "905551234567",
  "address": "Atatürk Cad. No: 48/A",
  "city": "İzmir",
  "district": "Buca",
  "taxNumber": "1234567890",
  "technicianGroupName": "Teknik Servis Saha Ekibi",
  "warrantyTerms": "Değişen orijinal yedek parçalarımız ve yapılan işçilik 1 (bir) yıl firmamız garantisi kapsamındadır. Kullanıcı kaynaklı arızalar garanti haricidir.",
  "receiptFooterNote": "Bizi tercih ettiğiniz için teşekkür ederiz. 7/24 Arıza Bildirim Hattı: 0555 123 45 67"
};

const initialCustomers: Customer[] = [
  {
    "id": "cust-1",
    "fullName": "Ahmet Yılmaz",
    "phone": "0532 111 22 33",
    "city": "İstanbul",
    "district": "Kadıköy",
    "neighborhood": "Moda",
    "address": "Şair Nefi Sok. Menekşe Apt. No:12 D:4",
    "notes": "Kedi besliyor, sabah 10:00 dan sonra evde.",
    "createdAt": "2026-09-13T23:15:38.245Z"
  },
  {
    "id": "cust-2",
    "fullName": "Fatma Demir",
    "phone": "0543 222 33 44",
    "city": "İstanbul",
    "district": "Üsküdar",
    "neighborhood": "Acıbadem",
    "address": "Sarayardı Cad. Nilüfer Sit. B Blok D:8",
    "notes": "Giriş zili çalışmıyor, gelmeden önce arayınız.",
    "createdAt": "2026-09-15T23:15:38.246Z"
  },
  {
    "id": "cust-3",
    "fullName": "Mehmet Kaya",
    "phone": "0505 333 44 55",
    "city": "İstanbul",
    "district": "Ataşehir",
    "neighborhood": "Barbaros",
    "address": "Mor Leylak Sok. Güneş Rezidans Kat:5 D:22",
    "notes": "Site güvenliğine plaka bildirilmesi gerekiyor.",
    "createdAt": "2026-09-16T23:15:38.246Z"
  },
  {
    "id": "cust-4",
    "fullName": "Ayşe Öztürk",
    "phone": "0533 444 55 66",
    "city": "İstanbul",
    "district": "Maltepe",
    "neighborhood": "Küçükyalı",
    "address": "Bağdat Cad. Çınar Apt. No:74 D:2",
    "createdAt": "2026-09-17T23:15:38.246Z"
  },
  {
    "id": "cust-1789977615205",
    "fullName": "AZİNE KAZAN",
    "phone": "05374876926",
    "city": "İzmir",
    "district": "Karabağlar",
    "neighborhood": "Seyhan Mah.",
    "address": "SEYHAN MAH 680 SOK NO:48 (KARABAĞLAR)",
    "notes": "Ön lastik demiri ve körük onarımı",
    "createdAt": "2026-09-21T08:00:15.205Z"
  },
  {
    "id": "cust-1789990375664",
    "fullName": "HÜDAVERDİ KIRAÇ",
    "phone": "05547475664",
    "city": "İzmir",
    "district": "Buca",
    "neighborhood": "Akıncılar Mah.",
    "address": "549/2 SOK NO:6-8 KAT 2 D:6 AKINCILAR MAHALLESİ (BUCA)",
    "notes": "Altından su kaçırıyor - Ventil değişim & kart tamiri",
    "createdAt": "2026-09-21T11:32:55.664Z"
  },
  {
    "id": "cust-1789990570046",
    "fullName": "CANSU HANIM",
    "phone": "05062145193",
    "city": "İzmir",
    "district": "Buca",
    "neighborhood": "Akıncılar Mah.",
    "address": "AKINCILAR MAH 564 SOK NO:28 D:8 K:3 (BUCA)",
    "notes": "Lastik sürtüyor duman çıkıyor, kazan durumu incelenecek",
    "createdAt": "2026-09-21T11:36:10.046Z"
  },
  {
    "id": "cust-1790002033509",
    "fullName": "EMRULLAH HARMANKAYA",
    "phone": "05078521365",
    "city": "İzmir",
    "district": "Karabağlar",
    "neighborhood": "Yunusemre Mah.",
    "address": "4249 SOK NO:6 D:2 YUNUSEMRE MAH (KARABAĞLAR)",
    "notes": "Kazan arızalı, cihaz atölyeye alınacak",
    "createdAt": "2026-09-21T14:47:13.509Z"
  }
];

const initialParts: SparePart[] = [
  {
    "id": "part-1",
    "name": "Çamaşır Makinesi Tahliye Pompası (Mıknatıslı)",
    "code": "PMP-ARC-01",
    "category": "Tahliye Pompaları",
    "compatibleBrands": [
      "Arçelik",
      "Beko",
      "Altus",
      "Grundig"
    ],
    "quantity": 14,
    "minStockLevel": 5,
    "purchasePrice": 280,
    "salePrice": 750,
    "location": "Raf A-2",
    "updatedAt": "2026-09-18T23:15:38.246Z"
  },
  {
    "id": "part-2",
    "name": "Bosch / Siemens Kazan Amortisörü (120N)",
    "code": "AMR-BSH-12",
    "category": "Mekanik Parçalar",
    "compatibleBrands": [
      "Bosch",
      "Siemens",
      "Profilo"
    ],
    "quantity": 3,
    "minStockLevel": 4,
    "purchasePrice": 190,
    "salePrice": 480,
    "location": "Raf B-1",
    "updatedAt": "2026-09-18T23:15:38.246Z"
  },
  {
    "id": "part-3",
    "name": "Bulaşık Makinesi Isıtıcı Rezistans (Girdap Tipi)",
    "code": "RZS-BLK-88",
    "category": "Rezistanslar",
    "compatibleBrands": [
      "Arçelik",
      "Beko",
      "Vestel"
    ],
    "quantity": 6,
    "minStockLevel": 3,
    "purchasePrice": 420,
    "salePrice": 1100,
    "location": "Raf C-4",
    "updatedAt": "2026-09-18T23:15:38.246Z"
  },
  {
    "id": "part-4",
    "name": "No-Frost Buzdolabı NTC Defrost Sensörü",
    "code": "SNS-NTC-05",
    "category": "Elektronik & Sensörler",
    "compatibleBrands": [
      "Samsung",
      "LG",
      "Bosch",
      "Arçelik"
    ],
    "quantity": 18,
    "minStockLevel": 6,
    "purchasePrice": 110,
    "salePrice": 350,
    "location": "Kutu E-1",
    "updatedAt": "2026-09-18T23:15:38.246Z"
  },
  {
    "id": "part-5",
    "name": "Buzdolabı R600a Gaz Tüpü (420g)",
    "code": "GAZ-R600-42",
    "category": "Soğutma Gazları",
    "compatibleBrands": [
      "Tüm Markalar"
    ],
    "quantity": 2,
    "minStockLevel": 5,
    "purchasePrice": 350,
    "salePrice": 900,
    "location": "Gaz Dolabı Alt",
    "updatedAt": "2026-09-18T23:15:38.246Z"
  },
  {
    "id": "part-6",
    "name": "Evrensel Çamaşır Makinesi Giriş Ventili (Çiftli)",
    "code": "VNT-UNV-02",
    "category": "Ventiller",
    "compatibleBrands": [
      "Arçelik",
      "Beko",
      "Vestel",
      "Regal"
    ],
    "quantity": 9,
    "minStockLevel": 4,
    "purchasePrice": 160,
    "salePrice": 450,
    "location": "Raf A-5",
    "updatedAt": "2026-09-18T23:15:38.246Z"
  }
];

const initialTickets: ServiceTicket[] = [
  {
    "customerId": "cust-2",
    "customerName": "Fatma Demir",
    "customerPhone": "0543 222 33 44",
    "customerAddress": "Sarayardı Cad. Nilüfer Sit. B Blok D:8 (Üsküdar)",
    "deviceType": "washing_machine",
    "brand": "Arçelik",
    "model": "Model Belirtilmedi",
    "serialNumber": "",
    "warrantyStatus": "out_of_warranty",
    "reportedFault": "Sıkmada aşırı ses ve sarsıntı",
    "technicianDiagnosis": "",
    "priority": "normal",
    "technicianName": "Saha Ustası",
    "status": "pending",
    "scheduledDate": "2026-09-21",
    "scheduledTimeSlot": "10:00 - 13:00",
    "partsUsed": [],
    "laborCost": 0,
    "transportCost": 0,
    "discount": 0,
    "totalAmount": 0,
    "paymentStatus": "unpaid",
    "paidAmount": 0,
    "id": "srv-1790021340062",
    "ticketNumber": "SRV-2026-0006",
    "createdAt": "2026-09-21T20:09:00.062Z",
    "updatedAt": "2026-09-21T20:09:00.062Z"
  },
  {
    "customerId": "cust-1790002033509",
    "customerName": "EMRULLAH HARMANKAYA",
    "customerPhone": "05078521365",
    "customerAddress": "4249 SOK NO:6 D:2 YUNUSEMRE MAH (KARABAĞLAR)",
    "deviceType": "washing_machine",
    "brand": "BEKO",
    "model": "Model Belirtilmedi",
    "serialNumber": "",
    "warrantyStatus": "out_of_warranty",
    "reportedFault": "KAZAN ARIZALI  CİHAZ ALINACAK ARADA BİR SUYUDA BOŞALTMIYOR",
    "technicianDiagnosis": "",
    "priority": "normal",
    "technicianName": "Saha Ustası",
    "status": "pending",
    "scheduledDate": "2026-09-22",
    "scheduledTimeSlot": "13:00 - 16:00",
    "partsUsed": [],
    "laborCost": 0,
    "transportCost": 0,
    "discount": 0,
    "totalAmount": 0,
    "paymentStatus": "unpaid",
    "paidAmount": 0,
    "id": "srv-1790002033510",
    "ticketNumber": "SRV-2026-0004",
    "createdAt": "2026-09-21T14:47:13.510Z",
    "updatedAt": "2026-09-21T14:47:13.510Z"
  },
  {
    "customerId": "cust-1789990570046",
    "customerName": "CANSU HANIM",
    "customerPhone": "05062145193",
    "customerAddress": "AKINCILAR MAH 564 SOK NO:28 D:8 K:3 (BUCA)",
    "deviceType": "washing_machine",
    "brand": "Bosch",
    "model": "Model Belirtilmedi",
    "serialNumber": "",
    "warrantyStatus": "out_of_warranty",
    "reportedFault": "LASTİK SÜRTÜYOR DUMANLAR ÇIKIYOR  KAZAN DEĞİŞMEZ İSE 6000 İLA 8000 ARASI DEDİM KAZAN DEĞİŞİRSE TEKRAR GÖRÜŞÜLECEK",
    "technicianDiagnosis": "",
    "priority": "normal",
    "technicianName": "Saha Ustası",
    "status": "pending",
    "scheduledDate": "2026-09-22",
    "scheduledTimeSlot": "10:00 - 13:00",
    "partsUsed": [],
    "laborCost": 0,
    "transportCost": 0,
    "discount": 0,
    "totalAmount": 0,
    "paymentStatus": "unpaid",
    "paidAmount": 0,
    "id": "srv-1789990570046",
    "ticketNumber": "SRV-2026-0003",
    "createdAt": "2026-09-21T11:36:10.046Z",
    "updatedAt": "2026-09-21T11:36:10.046Z"
  },
  {
    "customerId": "cust-1789990375664",
    "customerName": "HÜDAVERDİ KIRAÇ",
    "customerPhone": "05547475664",
    "customerAddress": "549/2 SOK NO:6-8 KAT 2 D:6 AKINCILAR MAHALLESİ (BUCA)",
    "deviceType": "dishwasher",
    "brand": "Arçelik",
    "model": "Model Belirtilmedi",
    "serialNumber": "",
    "warrantyStatus": "out_of_warranty",
    "reportedFault": "ALTINDAN SU KAÇIRIYOR",
    "technicianDiagnosis": "Ventil değişim ve kart tamiri",
    "priority": "normal",
    "technicianName": "Saha Ustası",
    "status": "waiting_parts",
    "scheduledDate": "2026-09-21",
    "scheduledTimeSlot": "13:00 - 16:00",
    "partsUsed": [
      {
        "id": "p-item-1789997393155",
        "partName": "ventil",
        "quantity": 1,
        "unitPrice": 250,
        "totalPrice": 250
      }
    ],
    "laborCost": 3250,
    "transportCost": 0,
    "discount": 0,
    "totalAmount": 3500,
    "paymentStatus": "unpaid",
    "paidAmount": 0,
    "id": "srv-1789990375665",
    "ticketNumber": "SRV-2026-0002",
    "createdAt": "2026-09-21T11:32:55.665Z",
    "updatedAt": "2026-09-21T13:29:53.162Z"
  },
  {
    "customerId": "cust-1789977615205",
    "customerName": "AZİNE KAZAN",
    "customerPhone": "05374876926",
    "customerAddress": "SEYHAN MAH 680 SOK NO:48 (KARABAĞLAR)",
    "deviceType": "washing_machine",
    "brand": "HOTPOİNT ARİSTON",
    "model": "Model Belirtilmedi",
    "serialNumber": "",
    "warrantyStatus": "out_of_warranty",
    "reportedFault": "ÖN LASTİK DEMİRİ ÇIKMIŞ YERİNE TAKILACAK 2000-2500  TL FİYAT VERİLDİ",
    "technicianDiagnosis": "Körük çıkmış amortisörler patlak",
    "priority": "normal",
    "technicianName": "Saha Ustası",
    "status": "ready",
    "scheduledDate": "2026-09-21",
    "scheduledTimeSlot": "10:00 - 13:00",
    "partsUsed": [
      {
        "id": "p-item-1789987961630",
        "partName": "amortisör değişecek körük takılacak",
        "quantity": 1,
        "unitPrice": 300,
        "totalPrice": 300
      }
    ],
    "laborCost": 3100,
    "transportCost": 0,
    "discount": 0,
    "totalAmount": 3500,
    "paymentStatus": "paid",
    "paidAmount": 3500,
    "id": "srv-1789977615206",
    "ticketNumber": "SRV-2026-0001",
    "createdAt": "2026-09-21T08:00:15.206Z",
    "updatedAt": "2026-09-21T12:30:36.718Z",
    "completedAt": "2026-09-21T12:30:36.718Z",
    "paymentMethod": "cash"
  }
];

const initialCash: CashTransaction[] = [
  {
    "id": "tx-1789977615206",
    "type": "income",
    "category": "Servis Tahsilatı",
    "amount": 3500,
    "date": "2026-09-21T12:30:36.718Z",
    "description": "AZİNE KAZAN - SRV-2026-0001 Servis Tahsilatı",
    "relatedTicketId": "srv-1789977615206",
    "paymentMethod": "cash"
  },
  {
    "type": "income",
    "category": "Servis Tahsilatı",
    "amount": 400,
    "date": "2026-09-18T23:34:14.443Z",
    "description": "Akif - SRV-2026-0012 Servis Tahsilatı",
    "relatedTicketId": "srv-1789773714427",
    "paymentMethod": "cash",
    "id": "tx-1789774454443"
  },
  {
    "id": "tx-1",
    "type": "income",
    "category": "Servis Tahsilatı",
    "amount": 1700,
    "date": "2026-09-18T19:15:38.246Z",
    "description": "Ahmet Yılmaz - SRV-2026-0001 Tahsilatı",
    "relatedTicketId": "srv-1",
    "paymentMethod": "cash"
  },
  {
    "id": "tx-2",
    "type": "expense",
    "category": "Yedek Parça Alımı",
    "amount": 1500,
    "date": "2026-09-16T23:15:38.246Z",
    "description": "Toptancıdan pompa ve rezistans alımı (Fatura No: 4421)",
    "paymentMethod": "bank_transfer"
  },
  {
    "id": "tx-3",
    "type": "expense",
    "category": "Servis Aracı Yakıt",
    "amount": 650,
    "date": "2026-09-17T23:15:38.246Z",
    "description": "Servis aracı dizel yakıt alımı",
    "paymentMethod": "credit_card"
  }
];

export const initialCurrentAccounts: CurrentAccount[] = [
  {
    "id": "cari-top-1",
    "name": "Ege Yedek Parça Toptan Ltd. Şti.",
    "type": "supplier",
    "phone": "0232 444 12 34",
    "phone2": "0532 555 11 22",
    "taxOrIdNumber": "3210987654",
    "authorizedPerson": "Mustafa Bey (Toptan Satış)",
    "city": "İzmir",
    "district": "Konak",
    "address": "Gıda Çarşısı 1204 Sok. No:18 Konak/İzmir",
    "balance": -4850,
    "creditLimit": 40000,
    "notes": "Arçelik, Beko, Bosch orijinal ve yan sanayi pompa, rezistans, amortisör tedarikçimiz. Her ayın 15 inde hesap kesilir.",
    "createdAt": "2026-09-01T09:00:00.000Z",
    "updatedAt": "2026-09-20T14:30:00.000Z"
  },
  {
    "id": "cari-top-2",
    "name": "Buzpar Soğutma & Motor Sanayi",
    "type": "supplier",
    "phone": "0232 469 88 99",
    "taxOrIdNumber": "1122334455",
    "authorizedPerson": "Kadir Usta",
    "city": "İzmir",
    "district": "Bornova",
    "address": "3. Sanayi Sitesi 402 Sok. No:5 Bornova/İzmir",
    "balance": -1750,
    "creditLimit": 25000,
    "notes": "R600a/R134a soğutucu gaz tüpleri, Ebm fan motorları, defrost sensörleri",
    "createdAt": "2026-09-05T10:00:00.000Z",
    "updatedAt": "2026-09-18T16:00:00.000Z"
  },
  {
    "id": "cari-top-3",
    "name": "Merkez Elektronik Kart Tamir Atölyesi",
    "type": "supplier",
    "phone": "0535 999 88 77",
    "authorizedPerson": "Serkan Usta",
    "city": "İzmir",
    "district": "Karabağlar",
    "address": "İnönü Cad. No:114/B Karabağlar/İzmir",
    "balance": 0,
    "creditLimit": 15000,
    "notes": "İnverter kart tamiri, eprom programlama ve çamaşır makinesi anakart onarımı",
    "createdAt": "2026-09-10T11:00:00.000Z",
    "updatedAt": "2026-09-21T18:00:00.000Z"
  }
];

export const initialCurrentTransactions: CurrentAccountTransaction[] = [
  {
    "id": "ctx-1",
    "accountId": "cari-top-1",
    "accountName": "Ege Yedek Parça Toptan Ltd. Şti.",
    "type": "debit",
    "amount": 6350,
    "date": "2026-09-15T10:00:00.000Z",
    "description": "10 Adet Arçelik Pompa, 5 Adet Rezistans toptan parça alımı",
    "documentNo": "FAT-2026-8841",
    "createdAt": "2026-09-15T10:00:00.000Z"
  },
  {
    "id": "ctx-2",
    "accountId": "cari-top-1",
    "accountName": "Ege Yedek Parça Toptan Ltd. Şti.",
    "type": "credit",
    "amount": 1500,
    "date": "2026-09-16T15:30:00.000Z",
    "description": "Banka havalesi ile ara cari ödeme yapıldı",
    "documentNo": "DEK-99214",
    "paymentMethod": "bank_transfer",
    "createdAt": "2026-09-16T15:30:00.000Z"
  },
  {
    "id": "ctx-3",
    "accountId": "cari-top-2",
    "accountName": "Buzpar Soğutma & Motor Sanayi",
    "type": "debit",
    "amount": 1750,
    "date": "2026-09-18T11:20:00.000Z",
    "description": "2 Adet R600a Gaz Tüpü ve Fan Motoru Alımı",
    "documentNo": "IRS-2026-4401",
    "createdAt": "2026-09-18T11:20:00.000Z"
  }
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
    if (tx.relatedTicketId) {
      const existing = txs.find(t => t.relatedTicketId === tx.relatedTicketId && t.type === tx.type);
      if (existing) {
        return existing;
      }
    }
    const newTx: CashTransaction = {
      ...tx,
      id: 'tx-' + Date.now() + (tx.type === 'expense' ? '-exp' : ''),
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

  // Cari Hesaplar (Müşteriler & Tedarikçi/Toptancılar)
  getCurrentAccounts(): CurrentAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_ACCOUNTS);
    if (!raw) {
      this.saveCurrentAccounts(initialCurrentAccounts);
      return initialCurrentAccounts;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialCurrentAccounts;
    }
  }

  saveCurrentAccounts(accounts: CurrentAccount[]): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ACCOUNTS, JSON.stringify(accounts));
  }

  addCurrentAccount(data: Omit<CurrentAccount, 'id' | 'createdAt' | 'updatedAt' | 'balance'> & { initialBalance?: number }): CurrentAccount {
    const accounts = this.getCurrentAccounts();
    const initBal = Number(data.initialBalance) || 0;
    const newAccount: CurrentAccount = {
      ...data,
      id: 'cari-' + (data.type === 'supplier' ? 'top-' : 'mus-') + Date.now(),
      balance: initBal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    delete (newAccount as any).initialBalance;
    accounts.unshift(newAccount);
    this.saveCurrentAccounts(accounts);

    // Açılış bakiyesi varsa ilk hareket olarak kaydet
    if (initBal !== 0) {
      this.addCurrentTransaction({
        accountId: newAccount.id,
        accountName: newAccount.name,
        type: initBal < 0 ? 'debit' : 'credit',
        amount: Math.abs(initBal),
        date: new Date().toISOString(),
        description: 'Açılış Devir Bakiyesi',
        documentNo: 'DEVİR',
      });
    }

    return newAccount;
  }

  updateCurrentAccount(id: string, updates: Partial<CurrentAccount>): CurrentAccount | null {
    const accounts = this.getCurrentAccounts();
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return null;
    accounts[idx] = { ...accounts[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveCurrentAccounts(accounts);
    return accounts[idx];
  }

  deleteCurrentAccount(id: string): boolean {
    const accounts = this.getCurrentAccounts();
    const filtered = accounts.filter(a => a.id !== id);
    this.saveCurrentAccounts(filtered);
    // İlişkili hareketleri de temizle
    const txs = this.getCurrentTransactions().filter(t => t.accountId !== id);
    this.saveCurrentTransactions(txs);
    return true;
  }

  // Cari Hareketler
  getCurrentTransactions(): CurrentAccountTransaction[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_TRANSACTIONS);
    if (!raw) {
      this.saveCurrentTransactions(initialCurrentTransactions);
      return initialCurrentTransactions;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialCurrentTransactions;
    }
  }

  saveCurrentTransactions(txs: CurrentAccountTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_TRANSACTIONS, JSON.stringify(txs));
  }

  addCurrentTransaction(tx: Omit<CurrentAccountTransaction, 'id' | 'createdAt'>): CurrentAccountTransaction {
    const txs = this.getCurrentTransactions();
    const newTx: CurrentAccountTransaction = {
      ...tx,
      id: 'ctx-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    txs.unshift(newTx);
    this.saveCurrentTransactions(txs);

    // Cari bakiyesini otomatik güncelle
    this.recalculateAccountBalance(tx.accountId);
    return newTx;
  }

  deleteCurrentTransaction(id: string): boolean {
    const txs = this.getCurrentTransactions();
    const targetTx = txs.find(t => t.id === id);
    const filtered = txs.filter(t => t.id !== id);
    this.saveCurrentTransactions(filtered);
    if (targetTx) {
      this.recalculateAccountBalance(targetTx.accountId);
    }
    return true;
  }

  recalculateAccountBalance(accountId: string): number {
    const accounts = this.getCurrentAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    const accountTxs = this.getCurrentTransactions().filter(t => t.accountId === accountId);
    // Mantık:
    // Eğer Tedarikçi ise (supplier): debit = mal aldık borcumuz arttı (-), credit = ödeme yaptık borcumuz azaldı (+)
    // Eğer Müşteri ise (customer): debit = hizmet/parça verdik alacağımız arttı (+), credit = tahsilat aldık alacağımız azaldı (-)
    let calculatedBalance = 0;
    if (account.type === 'supplier') {
      accountTxs.forEach(t => {
        if (t.type === 'debit') calculatedBalance -= t.amount;
        else if (t.type === 'credit') calculatedBalance += t.amount;
      });
    } else {
      accountTxs.forEach(t => {
        if (t.type === 'debit') calculatedBalance += t.amount;
        else if (t.type === 'credit') calculatedBalance -= t.amount;
      });
    }

    this.updateCurrentAccount(accountId, { balance: calculatedBalance });
    return calculatedBalance;
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
      version: '1.1',
      exportedAt: new Date().toISOString(),
      customers: this.getCustomers(),
      tickets: this.getTickets(),
      parts: this.getParts(),
      cash: this.getCashTransactions(),
      currentAccounts: this.getCurrentAccounts(),
      currentTransactions: this.getCurrentTransactions(),
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
      if (data.currentAccounts) this.saveCurrentAccounts(data.currentAccounts);
      if (data.currentTransactions) this.saveCurrentTransactions(data.currentTransactions);
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
    this.saveCurrentAccounts(initialCurrentAccounts);
    this.saveCurrentTransactions(initialCurrentTransactions);
    this.saveSettings(defaultSettings);
  }
}


export const storage = new StorageService();
