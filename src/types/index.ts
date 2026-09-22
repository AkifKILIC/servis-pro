export type DeviceType = 
  | 'washing_machine' 
  | 'dishwasher' 
  | 'refrigerator' 
  | 'oven' 
  | 'dryer' 
  | 'boiler' 
  | 'air_conditioner' 
  | 'other';

export type TicketStatus = 
  | 'pending'           // Yeni Kayıt / Beklemede
  | 'scheduled'         // Saha Ziyareti Planlandı
  | 'in_repair'         // Atölyede / Onarımda
  | 'waiting_parts'     // Parça Bekleniyor
  | 'testing'           // Test Aşamasında
  | 'ready'             // Tamamlandı / Teslime Hazır
  | 'delivered'         // Teslim & Tahsil Edildi
  | 'cancelled';        // İptal / İade

export type Priority = 'low' | 'normal' | 'urgent';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'pending_approval';
export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'other';

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  phone2?: string;
  email?: string;
  city: string;
  district: string;
  neighborhood?: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface TicketPartItem {
  id: string;
  partId?: string;
  partName: string;
  partCode?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ServiceTicket {
  id: string;
  ticketNumber: string; // Örn: SRV-2026-0042
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber?: string;
  warrantyStatus: 'warranty' | 'out_of_warranty' | 'special_warranty';
  
  reportedFault: string;        // Müşteri Şikayeti
  technicianDiagnosis?: string; // Usta / Teşhis Notu
  technicianName?: string;
  
  status: TicketStatus;
  priority: Priority;
  
  scheduledDate?: string;       // Randevu Tarihi
  scheduledTimeSlot?: string;   // Örn: 10:00 - 12:00
  
  partsUsed: TicketPartItem[];
  laborCost: number;            // İşçilik Bedeli
  transportCost: number;        // Servis / Yol Bedeli
  discount: number;             // İndirim
  totalAmount: number;          // Toplam Tutar
  
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAmount: number;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SparePart {
  id: string;
  name: string;
  code: string;
  category: string;             // Motor, Pompa, Elektronik Kart, Rezistans, Conta vb.
  compatibleBrands: string[];   // Bosch, Arçelik, Beko, Samsung vb.
  quantity: number;             // Stok adedi
  minStockLevel: number;        // Kritik stok uyarı sınırı
  purchasePrice: number;        // Alış fiyatı
  salePrice: number;            // Müşteri satış fiyatı
  location?: string;            // Raf / Kutu no: Raf B-3
  updatedAt: string;
}

export type CurrentAccountType = 'customer' | 'supplier' | 'other';

export interface CurrentAccount {
  id: string;
  name: string;                   // Müşteri Adı veya Tedarikçi / Toptancı Şirket Ünvanı
  type: CurrentAccountType;       // customer: Müşteri, supplier: Toptancı/Yedek Parçacı, other: Diğer
  phone: string;
  phone2?: string;
  email?: string;
  taxOrIdNumber?: string;         // Vergi No veya TC Kimlik
  authorizedPerson?: string;      // Firma Yetkilisi / Muhatap
  city: string;
  district: string;
  address?: string;
  balance: number;                // Pozitif (+) = Alacaklıyız (Para alacağız), Negatif (-) = Borçluyuz (Para ödeyeceğiz)
  creditLimit?: number;           // Kredi / Açık Hesap Limiti
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentAccountTransaction {
  id: string;
  accountId: string;              // Bağlı olduğu Cari Hesap ID
  accountName: string;            // Cari Ünvanı
  type: 'debit' | 'credit';       // debit: Borç (Alacaklandığımız durum - Mal/Hizmet verdik), credit: Alacak (Tahsilat yaptık veya Borç ödedik)
  amount: number;
  date: string;
  description: string;
  documentNo?: string;            // Fatura No / Makbuz No / İrsaliye No
  paymentMethod?: PaymentMethod;
  relatedTicketId?: string;       // İlgili Servis Fişi ID
  relatedCashTxId?: string;       // İlgili Kasa Hareketi ID
  createdAt: string;
}

export interface CashAccount {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'pos' | 'technician';
  balance: number;
  accountNumber?: string;         // IBAN veya Kasa Kodu
}

export interface CashTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;             // Servis Tahsilatı, Yedek Parça Alımı, Dükkan Kirası, Benzin, Faturalar, Hesaplar Arası Virman vb.
  amount: number;
  date: string;
  description: string;
  relatedTicketId?: string;
  paymentMethod: PaymentMethod;
  accountId?: string;           // Kaynak Kasa/Hesap
  targetAccountId?: string;     // Hedef Kasa/Hesap (Virman / Transfer durumunda)
}

export interface ShopSettings {
  shopName: string;
  shopOwner: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  district: string;
  taxNumber?: string;
  technicianGroupName?: string;
  warrantyTerms: string;
  receiptFooterNote: string;
}

