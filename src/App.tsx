import React, { useState, useEffect } from "react";
import { 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileSpreadsheet, 
  Users2, 
  Settings as SettingsIcon, 
  FolderLock, 
  Printer, 
  RotateCcw, 
  Plus, 
  Calendar, 
  UserCircle,
  FileCheck2,
  Lock,
  RefreshCw
} from "lucide-react";

import { db, productsRef, categoriesRef, salesRef, expensesRef, customersRef, suppliersRef, settingsRef, purchasesRef, seedInitialDataIfEmpty } from "./firebase";
import { Product, Category, Sale, Expense, Customer, Supplier, ShopSettings, Purchase } from "./types";
import { formatCurrency, convertEnglishToBengaliNumber, formatDateBengali } from "./utils";

// Sub-components
import Dashboard from "./components/Dashboard";
import Inventory from "./components/Inventory";
import PosPane from "./components/PosPane";
import LedgerTracker from "./components/LedgerTracker";
import Parties from "./components/Parties";
import SettingsPane from "./components/SettingsPane";

export default function App() {
  // Global Database state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    shopName: "যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী",
    address: "মেসার্স যাকওয়ান ভিলা, কলেজ রোড, চট্টগ্রাম",
    phone: "01876543210",
    email: "jakwancomputer@gmail.com",
    currency: "৳",
    vatRate: 0
  });

  // UI state managers
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [role, setRole] = useState<"অ্যাডমিন" | "সেলসম্যান">("অ্যাডমিন"); // Default is admin for immediate visual discovery, easily toggled in settings
  const [dbLoading, setDbLoading] = useState<boolean>(true);

  // Sales History filter states
  const [salesSearchTerm, setSalesSearchTerm] = useState("");
  const [salesDateFilter, setSalesDateFilter] = useState("");
  const [selectedHistoricalInvoice, setSelectedHistoricalInvoice] = useState<Sale | null>(null);

  // Convert numbers to Bengali
  const toBnNum = (val: number | string) => convertEnglishToBengaliNumber(val);

  // 1. Mount & Seed Data
  useEffect(() => {
    async function initDb() {
      // Seeds default computer stationery data if Firestore is absolutely empty
      await seedInitialDataIfEmpty();

      // Set up real-time snapshot listeners for bulletproof coordination
      const unsubProducts = onSnapshot(query(productsRef, orderBy("name")), (snap) => {
        const list: Product[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Product));
        setProducts(list);
      });

      const unsubCategories = onSnapshot(query(categoriesRef, orderBy("name")), (snap) => {
        const list: Category[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Category));
        setCategories(list);
      });

      const unsubSales = onSnapshot(query(salesRef, orderBy("date", "desc")), (snap) => {
        const list: Sale[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Sale));
        setSales(list);
      });

      const unsubExpenses = onSnapshot(query(expensesRef, orderBy("date", "desc")), (snap) => {
        const list: Expense[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Expense));
        setExpenses(list);
      });

      const unsubCustomers = onSnapshot(query(customersRef, orderBy("name")), (snap) => {
        const list: Customer[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(list);
      });

      const unsubSuppliers = onSnapshot(query(suppliersRef, orderBy("name")), (snap) => {
        const list: Supplier[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Supplier));
        setSuppliers(list);
      });

      const unsubPurchases = onSnapshot(query(purchasesRef, orderBy("date", "desc")), (snap) => {
        const list: Purchase[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Purchase));
        setPurchases(list);
      });

      const unsubSettings = onSnapshot(doc(db, "settings", "shop_info"), (docSnap) => {
        if (docSnap.exists()) {
          setShopSettings(docSnap.data() as ShopSettings);
        }
      });

      setDbLoading(false);

      return () => {
        unsubProducts();
        unsubCategories();
        unsubSales();
        unsubExpenses();
        unsubCustomers();
        unsubSuppliers();
        unsubPurchases();
        unsubSettings();
      };
    }

    initDb().catch(err => {
      console.error("Firestore Init Err:", err);
      setDbLoading(false);
    });
  }, []);

  // 2. Global Actions passed to components

  // Add Product
  const handleAddProduct = async (prod: Omit<Product, "id">) => {
    await addDoc(productsRef, {
      ...prod,
      createdAt: serverTimestamp()
    });
  };

  // Edit Product
  const handleEditProduct = async (id: string, prod: Partial<Product>) => {
    await updateDoc(doc(db, "products", id), prod);
  };

  // Fast stock adjustments
  const handleEditProductStock = async (id: string, newStock: number) => {
    await updateDoc(doc(db, "products", id), { stock: newStock });
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    await deleteDoc(doc(db, "products", id));
  };

  // Add Category
  const handleAddCategory = async (cat: Category) => {
    await setDoc(doc(db, "categories", cat.id!), {
      name: cat.name,
      description: cat.description,
      createdAt: serverTimestamp()
    });
  };

  // Add Customer
  const handleAddCustomer = async (cust: Omit<Customer, "id">) => {
    const customId = "cust_" + cust.mobile;
    await setDoc(doc(db, "customers", customId), {
      ...cust,
      createdAt: serverTimestamp()
    });
  };

  // Add Supplier
  const handleAddSupplier = async (sup: Omit<Supplier, "id">) => {
    const customId = "sup_" + sup.phone;
    await setDoc(doc(db, "suppliers", customId), {
      ...sup,
      createdAt: serverTimestamp()
    });
  };

  // Update outstanding customer due credit limit
  const handleUpdateCustomerDue = async (id: string, dueToAdd: number) => {
    const custDoc = doc(db, "customers", id);
    const target = customers.find(c => c.id === id);
    if (target) {
      const current = target.totalDue || 0;
      await updateDoc(custDoc, { totalDue: Math.max(0, current + dueToAdd) });
    }
  };

  // Update outstanding supplier debt limit
  const handleUpdateSupplierDue = async (id: string, dueToAdd: number) => {
    const supDoc = doc(db, "suppliers", id);
    const target = suppliers.find(s => s.id === id);
    if (target) {
      const current = target.totalDueToSupplier || 0;
      await updateDoc(supDoc, { totalDueToSupplier: Math.max(0, current + dueToAdd) });
    }
  };

  // Add general expense entry and deduct
  const handleAddExpense = async (exp: Omit<Expense, "id">) => {
    await addDoc(expensesRef, {
      ...exp,
      createdAt: serverTimestamp()
    });
  };

  // Add purchase stock log
  const handleAddPurchase = async (purchase: Omit<Purchase, "id">) => {
    await addDoc(purchasesRef, {
      ...purchase,
      createdAt: serverTimestamp()
    });
  };

  // Add POS sales entry
  const handleAddSale = async (sale: Omit<Sale, "id">): Promise<string> => {
    const docRef = await addDoc(salesRef, {
      ...sale,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  };

  // Shop Settings Profile Edit
  const handleUpdateShopSettings = async (settings: Partial<ShopSettings>) => {
    await setDoc(doc(db, "settings", "shop_info"), settings, { merge: true });
  };

  // Wipe database and reseed default computer stationery
  const handleWipeAndSeed = async () => {
    const listP = await getDocs(productsRef);
    const listC = await getDocs(categoriesRef);
    const listS = await getDocs(salesRef);
    const listE = await getDocs(expensesRef);
    const listCust = await getDocs(customersRef);
    const listSup = await getDocs(suppliersRef);
    const listPur = await getDocs(purchasesRef);

    const batch = writeBatch(db);

    listP.forEach(d => batch.delete(d.ref));
    listC.forEach(d => batch.delete(d.ref));
    listS.forEach(d => batch.delete(d.ref));
    listE.forEach(d => batch.delete(d.ref));
    listCust.forEach(d => batch.delete(d.ref));
    listSup.forEach(d => batch.delete(d.ref));
    listPur.forEach(d => batch.delete(d.ref));

    await batch.commit();

    // Re-seeds right away
    await seedInitialDataIfEmpty();
  };

  // Filtering for Historical Sales Invoices Tab
  const filteredHistoricalSales = sales.filter(s => {
    const matchesSearch = s.customerName.toLowerCase().includes(salesSearchTerm.toLowerCase()) || 
                          s.customerMobile.includes(salesSearchTerm);
    const matchesDate = !salesDateFilter || s.date === salesDateFilter;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans relative antialiased md:flex-row">
      {/* 1. Left Navigation Sidebar block */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col justify-between p-5 md:min-h-screen border-r border-slate-850/50 no-print flex-shrink-0">
        <div className="space-y-6">
          {/* Shop logo and title bar */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-teal-500/20">
              যও
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight text-white font-sans tracking-wide">যাকওয়ান কম্পিউটার</h2>
              <p className="text-[10px] text-teal-400 font-light font-sans mt-0.5">ইনভেন্টরি ও হিসাব খাতার ওএস</p>
            </div>
          </div>

          {/* Sidebar Menu items */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${activeTab === "dashboard" ? 'bg-teal-600 text-white shadow shadow-teal-600/35' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ড্যাশবোর্ড (Home)</span>
            </button>

            <button 
              onClick={() => setActiveTab("pos")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${activeTab === "pos" ? 'bg-teal-600 text-white shadow shadow-teal-600/35' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>পস কাউন্টার (POS Pane)</span>
            </button>

            <button 
              onClick={() => setActiveTab("inventory")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${activeTab === "inventory" ? 'bg-teal-600 text-white shadow shadow-teal-600/35' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
            >
              <Package className="w-4 h-4" />
              <span>স্টক ইনভেন্টরি (Inventory)</span>
            </button>

            <button 
              onClick={() => setActiveTab("sales_history")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${activeTab === "sales_history" ? 'bg-teal-600 text-white shadow shadow-teal-600/35' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>বিক্রয় রশিদ হিস্ট্রি</span>
            </button>

            <button 
              onClick={() => setActiveTab("expenses_ledger")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${activeTab === "expenses_ledger" ? 'bg-teal-600 text-white shadow shadow-teal-600/35' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ব্যয় ও খতিয়ান (Accounts)</span>
            </button>

            <button 
              onClick={() => setActiveTab("parties")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${activeTab === "parties" ? 'bg-teal-600 text-white shadow shadow-teal-600/35' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
            >
              <Users2 className="w-4 h-4" />
              <span>গ্রাহক ও সাপ্লায়ার (Parties)</span>
            </button>

            <button 
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${activeTab === "settings" ? 'bg-teal-600 text-white shadow shadow-teal-600/35' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>সফটওয়্যার সেটিংস্ (Admin)</span>
            </button>
          </nav>
        </div>

        {/* Current user footer badge inside index panel */}
        <div className="pt-4 border-t border-slate-800 mt-6 md:mt-0 font-sans text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <UserCircle className="w-4 h-4 text-teal-400" />
            <span>লগইন এক্সেস:</span>
          </div>
          <p className="font-bold text-white pl-6 mt-1 text-[11px] flex items-center gap-1">
            <span>{role === "অ্যাডমিন" ? "মালিক (অ্যাডমিন)" : "বিক্রেতা (সেলসম্যান)"}</span>
          </p>
        </div>
      </aside>

      {/* 2. Main Content Canvas Block (Flex stretch) */}
      <main className="flex-1 flex flex-col overflow-x-hidden print:bg-white print:p-0">
        {/* Upper Top Navbar containing active tab highlight and dynamic user quick toggler */}
        <header className="bg-white border-b border-slate-100 py-3.5 px-6 flex items-center justify-between no-print shadow-xs flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-800 font-sans tracking-tight">
              {activeTab === "dashboard" && "ড্যাশবোর্ড সারসংক্ষেপ (Overview)"}
              {activeTab === "pos" && "রিয়েল-টাইম কাউন্টার পস (POS)"}
              {activeTab === "inventory" && "ইনভেন্টরি আইটেমস"}
              {activeTab === "sales_history" && "পুরাতন মেমো ও ইনভয়েস হিস্ট্রি"}
              {activeTab === "expenses_ledger" && "হিসাব খাতা ও সাধারণ খরচ"}
              {activeTab === "parties" && "গ্রাহক (Customers) ও লেজার সরবরাহকারী"}
              {activeTab === "settings" && "সিস্টেম সেটিংস"}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Quick role change warning tag */}
            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${role === 'অ্যাডমিন' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className="font-semibold text-slate-500">চলতি ইউজার: </span>
              <strong className="text-slate-800 font-bold">{role}</strong>
            </div>

            {/* Print trigger fallback on desktop layouts */}
            <button 
              onClick={() => window.print()}
              className="p-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">রিপোর্ট প্রিন্ট</span>
            </button>
          </div>
        </header>

        {/* 3. Loaded Module body container */}
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full print:p-0 print:bg-white">
          {dbLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw className="w-12 h-12 text-teal-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">যাকওয়ান কম্পিউটার ক্লাউড লেজার লোড হচ্ছে...</p>
                <p className="text-xs text-slate-400 font-light mt-0.5">রিয়েল-টাইম তথ্য ও সিকিউরিটির সাথে সিনক্রোনাইজ করা হচ্ছে</p>
              </div>
            </div>
          ) : (
            <>
              {/* Target Tab View loaders */}
              {activeTab === "dashboard" && (
                <Dashboard 
                  products={products}
                  sales={sales}
                  expenses={expenses}
                  role={role}
                  onTabChange={setActiveTab}
                />
              )}

              {activeTab === "pos" && (
                <PosPane 
                  products={products}
                  customers={customers}
                  role={role}
                  currentUserName={role === "অ্যাডমিন" ? "অ্যাডমিন" : "সেলসম্যান"}
                  onAddSale={handleAddSale}
                  onAddCustomer={handleAddCustomer}
                  onEditProductStock={handleEditProductStock}
                  onUpdateCustomerDue={handleUpdateCustomerDue}
                />
              )}

              {activeTab === "inventory" && (
                <Inventory 
                  products={products}
                  categories={categories}
                  role={role}
                  onAddProduct={handleAddProduct}
                  onEditProduct={handleEditProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onAddCategory={handleAddCategory}
                />
              )}

              {activeTab === "expenses_ledger" && (
                <LedgerTracker 
                  expenses={expenses}
                  purchases={purchases}
                  products={products}
                  suppliers={suppliers}
                  sales={sales}
                  role={role}
                  onAddExpense={handleAddExpense}
                  onAddPurchase={handleAddPurchase}
                  onEditSupplierDue={handleUpdateSupplierDue}
                  onEditProductStock={handleEditProductStock}
                />
              )}

              {activeTab === "parties" && (
                <Parties 
                  customers={customers}
                  suppliers={suppliers}
                  role={role}
                  onAddCustomer={handleAddCustomer}
                  onAddSupplier={handleAddSupplier}
                  onUpdateCustomerDue={handleUpdateCustomerDue}
                  onUpdateSupplierDue={handleUpdateSupplierDue}
                />
              )}

              {activeTab === "settings" && (
                <SettingsPane 
                  role={role}
                  currentUserName={role === "অ্যাডমিন" ? "অ্যাডমিন" : "সেলসম্যান"}
                  onRoleChange={setRole}
                  shopSettings={shopSettings}
                  onUpdateShopSettings={handleUpdateShopSettings}
                  onTriggerDatabaseWipeAndSeed={handleWipeAndSeed}
                />
              )}

              {/* SALES HISTORY TAB: (Embedded listing detail inside App for comprehensive look) */}
              {activeTab === "sales_history" && (
                <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in no-print">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                    <div>
                      <h3 className="text-slate-700 font-bold text-base font-sans">ঐতিহাসিক বিক্রয় মেমোর আর্কাইভ</h3>
                      <p className="text-xs text-slate-400">দোকানের পূর্বের সকল বেচাকেনা ট্র্যাক করুন</p>
                    </div>
                  </div>

                  {/* Simple filters bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input 
                      type="text" 
                      placeholder="কাস্টমার নাম বা মোবাইল..." 
                      value={salesSearchTerm}
                      onChange={(e) => setSalesSearchTerm(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                    />
                    <input 
                      type="date" 
                      value={salesDateFilter}
                      onChange={(e) => setSalesDateFilter(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                    />
                    <button 
                      onClick={() => {
                        setSalesSearchTerm("");
                        setSalesDateFilter("");
                      }}
                      className="text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold py-2.5 transition-all cursor-pointer"
                    >
                      ফিল্টার রিসেট
                    </button>
                  </div>

                  {/* Results grid */}
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3">রশিদ নং / ID</th>
                          <th className="py-2.5 px-3">ক্রেতার নাম & মোবাইল</th>
                          <th className="py-2.5 px-3">তারিখ</th>
                          <th className="py-2.5 px-3 text-right">বিক্রয় বিল (৳)</th>
                          <th className="py-2.5 px-3 text-right">পরিশোধ</th>
                          <th className="py-2.5 px-3 text-right">বকেয়া</th>
                          <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistoricalSales.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400">
                              ফিল্টার অনুযায়ী কোনো চালান বা বিক্রয় রেকর্ড পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          filteredHistoricalSales.map((sale) => (
                            <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-500 uppercase">
                                {sale.id?.substring(0, 8) || "N/A"}
                              </td>
                              <td className="py-3 px-3 font-sans">
                                <div className="font-bold text-slate-800">{sale.customerName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{sale.customerMobile}</div>
                              </td>
                              <td className="py-3 px-3 text-slate-500 font-sans">
                                {formatDateBengali(sale.date)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                                {formatCurrency(sale.total)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                                {formatCurrency(sale.paid)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono">
                                {sale.due > 0 ? (
                                  <span className="text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded">
                                    {formatCurrency(sale.due)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">পরিশোধিত</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button 
                                  onClick={() => setSelectedHistoricalInvoice(sale)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                                >
                                  মেমো দেখুন
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Historical Sales Detailed Cash Memo Modal popup */}
      {selectedHistoricalInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in print:bg-white print:p-0 print:m-0 no-print">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
              <span className="text-xs font-bold text-slate-200 font-sans">চলতি ক্যাশ মেমো চালান ভিউ</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট মেমো</span>
                </button>
                <button 
                  onClick={() => setSelectedHistoricalInvoice(null)}
                  className="bg-slate-800 text-slate-300 py-1 px-3 font-semibold rounded-lg text-[11px] cursor-pointer"
                >
                  ✕ বন্ধ করুন
                </button>
              </div>
            </div>

            {/* Printable Frame inside index */}
            <div className="p-6 bg-white overflow-y-auto flex-1 font-sans text-slate-800">
              <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী</h2>
                <p className="text-[11px] text-slate-600 font-light">মেসার্স যাকওয়ান ভিলা, কলেজ রোড, চট্টগ্রাম</p>
                <p className="text-[11px] font-bold font-mono text-slate-700">০১৮৭৬৫৪৩২১০</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 text-[11px] text-slate-600 border-b border-slate-100 font-sans">
                <div>
                  <p><span className="font-semibold text-slate-800">কাস্টমার নাম:</span> {selectedHistoricalInvoice.customerName}</p>
                  <p><span className="font-semibold text-slate-800">মোবাইল:</span> {selectedHistoricalInvoice.customerMobile}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-semibold text-slate-800">তারিখ:</span> {selectedHistoricalInvoice.date}</p>
                  <p><span className="font-semibold text-slate-800">মেমো নং / ID:</span> <span className="font-mono font-bold text-slate-700">{selectedHistoricalInvoice.id?.substring(0, 8).toUpperCase()}</span></p>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse mt-4 font-sans">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                    <th className="py-2 px-1">আইটেমের বিবরণ</th>
                    <th className="py-2 px-1 text-center">পরিমাণ</th>
                    <th className="py-2 px-1 text-right">দর (Unit)</th>
                    <th className="py-2 px-1 text-right">মোট টাকা</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedHistoricalInvoice.items.map((item, id) => (
                    <tr key={id} className="border-b border-slate-150 py-2">
                      <td className="py-2 px-1 text-[11px] font-semibold text-slate-800">
                        {item.productName}
                      </td>
                      <td className="py-2 px-1 text-center font-mono font-medium">
                        {toBnNum(item.qty)}
                      </td>
                      <td className="py-2 px-1 text-right font-mono">
                        {formatCurrency(item.sellPrice)}
                      </td>
                      <td className="py-2 px-1 text-right font-mono font-bold">
                        {formatCurrency(item.sellPrice * item.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-3 border-t border-dashed border-slate-300 ml-auto w-4/6 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-slate-600">
                  <span>মোট বিল:</span>
                  <span className="font-mono font-semibold">{formatCurrency(selectedHistoricalInvoice.subTotal)}</span>
                </div>
                {selectedHistoricalInvoice.discount > 0 && (
                  <div className="flex justify-between text-rose-500 font-medium">
                    <span>বিশেষ ডিসকাউন্ট:</span>
                    <span className="font-mono font-bold">-{formatCurrency(selectedHistoricalInvoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-teal-800 font-bold border-t border-slate-100 pt-1 text-[13px]">
                  <span>সর্বমোট প্রদেয় বিল:</span>
                  <span className="font-mono font-extrabold">{formatCurrency(selectedHistoricalInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>পরিশোধিত ক্যাশ:</span>
                  <span className="font-mono font-bold">{formatCurrency(selectedHistoricalInvoice.paid)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  {selectedHistoricalInvoice.due > 0 ? (
                    <>
                      <span className="text-rose-600 font-bold">বকেয়া রইলো (Due):</span>
                      <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 rounded">{formatCurrency(selectedHistoricalInvoice.due)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 font-semibold">আদায়ের অবস্থা:</span>
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded text-[10px]">পরিশোধিত (Paid)</span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-center pt-6 pb-2 border-t border-dashed border-slate-300 mt-6 space-y-1">
                <p className="text-[11px] font-bold text-slate-800">ধন্যবাদ, যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী আসার জন্য। আবার আসবেন!</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 mt-auto">
              <button 
                onClick={() => setSelectedHistoricalInvoice(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
