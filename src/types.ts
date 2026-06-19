export interface Product {
  id?: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  alertLimit: number;
  sku: string;
  shelf: string;
  imageUrl?: string;
  createdAt?: any;
}

export interface Category {
  id?: string;
  name: string;
  description: string;
  createdAt?: any;
}

export interface SaleItem {
  productId: string;
  productName: string;
  qty: number;
  sellPrice: number;
  buyPrice: number; // Stored at purchase time to calculate exact profit even if prices change
}

export interface Sale {
  id?: string;
  customerName: string;
  customerMobile: string;
  items: SaleItem[];
  subTotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  date: string; // YYYY-MM-DD
  salesperson: string; // 'অ্যাডমিন' | 'সেলসম্যান'
  createdAt?: any;
}

export interface Expense {
  id?: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  createdAt?: any;
}

export interface Purchase {
  id?: string;
  purchaseNo?: string;
  supplierId: string;
  supplierName: string;
  productsBought: {
    productId: string;
    productName: string;
    qty: number;
    buyUnitPrice: number;
  }[];
  totalCost: number;
  amountPaid: number;
  dueAmount: number;
  date: string;
  createdAt?: any;
}

export interface Customer {
  id?: string;
  name: string;
  mobile: string;
  address: string;
  totalDue: number;
  createdAt?: any;
}

export interface Supplier {
  id?: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  totalDueToSupplier: number;
  createdAt?: any;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  vatRate: number;
}
