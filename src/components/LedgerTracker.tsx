import React, { useState } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Lock, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Calendar, 
  FileSpreadsheet,
  Check,
  AlertCircle
} from "lucide-react";
import { Expense, Purchase, Product, Supplier, Sale } from "../types";
import { formatCurrency, convertEnglishToBengaliNumber, parseInputNumber } from "../utils";

interface LedgerTrackerProps {
  expenses: Expense[];
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  sales: Sale[];
  role: "অ্যাডমিন" | "সেলসম্যান";
  onAddExpense: (exp: Omit<Expense, "id">) => Promise<void>;
  onAddPurchase: (purchase: Omit<Purchase, "id">) => Promise<void>;
  onEditSupplierDue: (supplierId: string, dueToAdd: number) => Promise<void>;
  onEditProductStock: (productId: string, qtyToAdd: number) => Promise<void>;
}

export default function LedgerTracker({
  expenses,
  purchases,
  products,
  suppliers,
  sales,
  role,
  onAddExpense,
  onAddPurchase,
  onEditSupplierDue,
  onEditProductStock
}: LedgerTrackerProps) {
  // Tabs: "expenses" or "purchases" or "profit_loss"
  const [activeSubTab, setActiveSubTab] = useState<"expenses" | "purchases" | "profit_loss">("expenses");

  // Expense manual state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expCategory, setExpCategory] = useState("বিদ্যুৎ বিল");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseLoading, setExpenseLoading] = useState(false);

  // Purchase manual state (Acquiring dynamic stock from supplier)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [pSupplierId, setPSupplierId] = useState("");
  const [pProductId, setPProductId] = useState("");
  const [pProductQty, setPProductQty] = useState("");
  const [pUnitPrice, setPUnitPrice] = useState("");
  const [pAmountPaid, setPAmountPaid] = useState("");
  const [pDate, setPDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Error validation
  const [errorText, setErrorText] = useState("");

  const toBnNum = (val: number | string) => convertEnglishToBengaliNumber(val);

  // Calculations for Admin Profit & Loss
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  // Cost Of Goods Sold (COGS)
  let costOfGoodsSold = 0;
  sales.forEach(sale => {
    sale.items.forEach(item => {
      costOfGoodsSold += (item.buyPrice || 0) * item.qty;
    });
  });

  const grossProfit = totalSalesRevenue - costOfGoodsSold;
  const totalOperatingExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = grossProfit - totalOperatingExpense;

  // Save Expense Handler
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseInputNumber(expAmount);
    if (!expTitle.trim() || amountVal <= 0) {
      alert("খরচের বিবরণ এবং খাতের সঠিক পরিমাণ দিন!");
      return;
    }

    setExpenseLoading(true);
    try {
      await onAddExpense({
        title: expTitle,
        category: expCategory,
        amount: amountVal,
        date: expDate
      });
      setExpTitle("");
      setExpAmount("");
      setExpenseModalOpen(false);
    } catch (err: any) {
      alert("খরচ এন্ট্রি করা যায়নি: " + err.message);
    } finally {
      setExpenseLoading(false);
    }
  };

  // Save Stock Purchase from Supplier
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    const costPrice = parseInputNumber(pUnitPrice);
    const qty = parseInputNumber(pProductQty);
    const paidVal = parseInputNumber(pAmountPaid);

    if (!pSupplierId) {
      setErrorText("দয়া করে সরবরাহকারী (Supplier) সিলেক্ট করুন!");
      return;
    }
    if (!pProductId) {
      setErrorText("দয়া করে ক্রয়ের প্রোডাক্টটি সিলেক্ট করুন!");
      return;
    }
    if (costPrice <= 0 || qty <= 0) {
      setErrorText("ক্রয় মূল্য এবং পরিমাণ অবশ্যই শূন্যের চেয়ে বড় হতে হবে!");
      return;
    }

    setPurchaseLoading(true);
    try {
      const selectedSupplier = suppliers.find(s => s.id === pSupplierId);
      const selectedProduct = products.find(p => p.id === pProductId);

      if (!selectedSupplier || !selectedProduct) {
        throw new Error("মেমোর ডাটা অমিল পাওয়া গেছে।");
      }

      const totalCost = costPrice * qty;
      const remainsDue = Math.max(0, totalCost - paidVal);

      // 1. Log Purchase to database list
      const purchasePayload = {
        supplierId: pSupplierId,
        supplierName: selectedSupplier.name,
        productsBought: [
          {
            productId: pProductId,
            productName: selectedProduct.name,
            qty: qty,
            buyUnitPrice: costPrice
          }
        ],
        totalCost,
        amountPaid: paidVal,
        dueAmount: remainsDue,
        date: pDate
      };

      await onAddPurchase(purchasePayload);

      // 2. Increase stock quantity of selected product on database
      await onEditProductStock(pProductId, selectedProduct.stock + qty);

      // 3. Increment outstanding due of Supplier ledger if we bought on credit
      if (remainsDue > 0) {
        await onEditSupplierDue(pSupplierId, remainsDue);
      }

      // Restores state
      setPSupplierId("");
      setPProductId("");
      setPProductQty("");
      setPUnitPrice("");
      setPAmountPaid("");
      setPurchaseModalOpen(false);
      alert("সাফল্যের সাথে প্রোডাক্ট ক্রয় এবং স্টক বৃদ্ধি সম্পন্ন হয়েছে!");
    } catch (err: any) {
      setErrorText("ক্রয় সম্পন্ন করতে সমস্যা: " + err.message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Safe blocker if salesperson tries to access accounts
  if (role !== "অ্যাডমিন") {
    return (
      <div className="bg-white border rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 rounded-full text-amber-600 flex items-center justify-center shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-slate-800">অ্যাক্সেস সীমিত (Admin Lock)</h3>
          <p className="text-xs text-slate-400 mt-1 leading-normal">
            দোকানের ক্রয় বুক, দৈনিক খরচের তালিকা এবং লাভ-ক্ষতি বিবরণী শুধুমাত্র স্বত্বাধিকারী অ্যাডমিন (Admin) দেখতে পারবেন।
          </p>
          <div className="bg-slate-50 border p-3 rounded-lg text-xs font-mono text-slate-500 mt-4 leading-normal">
            ড্যাশবোর্ড ডানে গিয়ে অ্যাডমিন হিসেবে লগইন করতে PIN: "১২৩৪" ব্যবহার করুন।
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="ledger_panel">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3 bg-white p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setActiveSubTab("expenses")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === "expenses" ? 'bg-blue-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            দৈনিক দোকান খরচ (Expenses)
          </button>
          <button 
            onClick={() => setActiveSubTab("purchases")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === "purchases" ? 'bg-blue-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            ক্রয় খতিয়ান (Stock Purchases)
          </button>
          <button 
            onClick={() => setActiveSubTab("profit_loss")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all/70 cursor-pointer ${activeSubTab === "profit_loss" ? 'bg-emerald-700 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            লাভ-ক্ষতি বিবরণী (P & L Sheet)
          </button>
        </div>

        {activeSubTab === "expenses" && (
          <button 
            onClick={() => setExpenseModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন খরচ লিখুন</span>
          </button>
        )}

        {activeSubTab === "purchases" && (
          <button 
            onClick={() => setPurchaseModalOpen(true)}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>সাপ্লায়ার স্টক ক্রয়</span>
          </button>
        )}
      </div>

      {/* SUBVIEW 1: Shop Expenses */}
      {activeSubTab === "expenses" && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4 text-xs">
            <div>
              <h4 className="text-slate-700 font-bold text-base">দোকানের দৈনিক টুকিটাকি খরচাবলি</h4>
              <p className="text-slate-400 mt-0.5">রেন্ট, বিল বা নাস্তার খরচ তালিকা</p>
            </div>
            <span className="font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
              মোট ব্যয়: {formatCurrency(totalOperatingExpense)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3">খরচের বিবরণ (শেড/টাইটেল)</th>
                  <th className="py-2.5 px-3">খাত / ক্যাটাগরি</th>
                  <th className="py-2.5 px-3 text-right">পরিমাণ (Amount)</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      আপাতত কোনো সাধারণ খরচের এন্ট্রি পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3 text-slate-500 font-sans">{exp.date}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 font-sans">{exp.title}</td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium font-sans">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                        {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: Wholesale purchases log */}
      {activeSubTab === "purchases" && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4 text-xs">
            <div>
              <h4 className="text-slate-700 font-bold text-base">পাইকারি স্টক ক্রয় বুক ও চালান</h4>
              <p className="text-slate-400 mt-0.5">সরবরাহকারীদের থেকে ক্রয়কৃত পণ্য ও বকেয়া তালিকা</p>
            </div>
            <span className="font-bold text-slate-700 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
              মোট ক্রয় খরচ: {formatCurrency(purchases.reduce((sum, p) => sum + p.totalCost, 0))}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <th className="py-2.5 px-3">ক্রয় তারিখ</th>
                  <th className="py-2.5 px-3">সরবরাহকারী (Supplier)</th>
                  <th className="py-2.5 px-3">ক্রয়কৃত পণ্য</th>
                  <th className="py-2.5 px-3 text-right">ক্রয় মূল্য</th>
                  <th className="py-2.5 px-3 text-right">পরিশোধ</th>
                  <th className="py-2.5 px-3 text-right">বাকী/বকেয়া</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      কোনো ক্রয়ের হিস্ট্রি নেই। উপরের বাটনে ক্লিক করে সাপ্লায়ার চালান এন্ট্রি করুন।
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3 text-slate-500 font-sans">{p.date}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 font-sans">{p.supplierName}</td>
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 text-[11px] font-sans">
                          {p.productsBought.map((item, idx) => (
                            <div key={idx} className="text-slate-700 font-medium">
                              - {item.productName} ({toBnNum(item.qty)} টি × {formatCurrency(item.buyUnitPrice)})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 font-bold">{formatCurrency(p.totalCost)}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold">{formatCurrency(p.amountPaid)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                        {p.dueAmount > 0 ? formatCurrency(p.dueAmount) : <span className="text-slate-400 text-[10px]">পরিশোধিত</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: Admin P&L Statement spreadsheet */}
      {activeSubTab === "profit_loss" && (
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-6">
          <div className="pb-3 border-b border-slate-100 text-xs">
            <h4 className="text-slate-700 font-bold text-base flex items-center gap-1.5 font-sans">
              <FileSpreadsheet className="w-5 h-5 text-teal-600" />
              <span>লাভ-ক্ষতি বিবরণী হিসাবপত্র (Profit & Loss Ledger)</span>
            </h4>
            <p className="text-slate-400 mt-1 leading-normal">
              পণ্যের ক্রয় মূল্য (C.O.G.S) ও মোট বিক্রয়ের ব্যবধান থেকে স্টোর খরচ বাদ দিয়ে রিয়েল-টাইম হিসাব
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-sans">
            {/* Sheet rows */}
            <div className="border rounded-xl p-4 space-y-3.5 bg-slate-50/50">
              <h5 className="font-bold text-slate-700 text-sm pb-2 border-b">আয়-ব্যয় বিবরণী</h5>
              
              <div className="flex justify-between text-xs pb-1 border-b">
                <span className="text-slate-600">মোট বিক্রয় রাজস্ব (Sales Revenue)</span>
                <span className="font-mono font-bold text-slate-800 text-right">{formatCurrency(totalSalesRevenue)}</span>
              </div>

              <div className="flex justify-between text-xs pb-1 border-b">
                <span className="text-slate-600">বিক্রিত মালের ক্রয় মূল্য (Cost of Goods Sold/COGS)</span>
                <span className="font-mono font-bold text-rose-500 text-right">-{formatCurrency(costOfGoodsSold)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold pt-1 border-b pb-2">
                <span className="text-slate-700">১. মোট লাভ (Gross Profit)</span>
                <span className="font-mono text-emerald-600 text-right">{formatCurrency(grossProfit)}</span>
              </div>

              <div className="flex justify-between text-xs pb-1 border-b">
                <span className="text-slate-600">দোকান পরিচালনা ব্যয় (Electricity, rent, bills etc)</span>
                <span className="font-mono font-bold text-rose-600 text-right">-{formatCurrency(totalOperatingExpense)}</span>
              </div>

              <div className="flex justify-between text-sm font-extrabold pt-2 rounded-lg bg-teal-50 px-3 py-2 text-teal-900">
                <span>২. প্রকৃত লাভ/ক্ষতি (Net Operating Profit)</span>
                <span className="font-mono text-base">{formatCurrency(netProfit)}</span>
              </div>
            </div>

            {/* Insight visualizer widget */}
            <div className="flex flex-col justify-between border rounded-xl p-4 bg-white">
              <div className="space-y-4 text-xs">
                <h5 className="font-bold text-slate-700 text-sm">আর্থিক স্থিতি বিশ্লেষণ</h5>
                {netProfit > 0 ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 text-emerald-800 flex gap-2">
                    <div className="text-lg">💰</div>
                    <div className="font-sans leading-relaxed">
                      দোকান বর্তমানে <strong>মুনাফায় ({formatCurrency(netProfit)})</strong> আছে। কাস্টমারদের ক্যাশ বা পেমেন্ট আদায় ঠিক রাখলে ব্যবসা আরও এগিয়ে যাবে। জেমিনী উপদেষ্টা রিপোর্টে আরও নতুন পরিকল্পনা পেতে পারেন।
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3.5 text-amber-800 flex gap-2">
                    <div className="text-lg">💡</div>
                    <div className="font-sans leading-relaxed">
                      আপনার দোকান বর্তমানে <strong>ব্রেক-ইভেন বা সাময়িক ক্ষতিতে ({formatCurrency(netProfit)})</strong> আছে। সাধারণ পরিচালনা খরচ কমান কিংবা বিক্রয় রাজস্ব বাড়াতে অফার বা স্টেশনারি আইটেমের প্রচার বাড়ান।
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t font-sans">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>নেট প্রফিট মার্জিন (%)</span>
                    <span className="font-mono font-bold text-slate-700">
                      {totalSalesRevenue > 0 ? ((netProfit / totalSalesRevenue) * 100).toFixed(1) : "0.0"} %
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${totalSalesRevenue > 0 ? Math.max(0, Math.min(100, (netProfit / totalSalesRevenue) * 100)) : 0}%` }}
                      className="bg-emerald-600 h-full rounded-full"
                    ></div>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-light pt-2 leading-relaxed font-sans">
                * জেমিনী এআই উপদেষ্টা অডিট আপনার ক্রয় তালিকা ও বেচাকেনা আরও বিশদভাবে মূল্যায়ন করে দোকান অপ্টিমাইজ করতে পারে।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SECTION 1: ADD EXPENSE */}
      {expenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print font-sans">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-teal-50 transform scale-100 transition-all">
            <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-sm font-bold">দৈনিক সাধারণ খরচ লিখুন</h3>
              <button onClick={() => setExpenseModalOpen(false)} className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-full text-xs cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">খরচের বিবরণ (Title)*</label>
                <input 
                  type="text" 
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="যেমন: ইন্টারনেট বিল জুন ২০২৬"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">ক্যাটাগরি / খাত</label>
                  <select 
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 bg-white"
                  >
                    <option value="বিদ্যুৎ বিল">বিদ্যুৎ বিল</option>
                    <option value="দোকান ভাড়া">দোকান ভাড়া</option>
                    <option value="স্টাফ বেতন">স্টাফ বেতন</option>
                    <option value="আপ্যায়ন ও নাস্তা">আপ্যায়ন ও নাস্তা</option>
                    <option value="পরিবহন খরচ">পরিবহন খরচ</option>
                    <option value="বিবিধ">বিবিধ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">খরচের পরিমাণ (৳) *</label>
                  <input 
                    type="number" 
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="৫০০"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">তারিখ</label>
                <input 
                  type="date" 
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setExpenseModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">বাতিল</button>
                <button type="submit" disabled={expenseLoading} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
                  {expenseLoading ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SECTION 2: SUPPLIER STOCK PURCHASE */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print font-sans">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-teal-50 transform scale-100 transition-all">
            <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-sm font-bold">সরবরাহকারীর থেকে পাইকারি স্টক ক্রয়</h3>
              <button onClick={() => setPurchaseModalOpen(false)} className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-full text-xs cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSavePurchase} className="p-6 space-y-4">
              {errorText && (
                <div className="text-[11px] bg-rose-50 border border-rose-100 text-rose-600 p-2 rounded-lg flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              {/* Supplier Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">১. সরবরাহকারী (Supplier) নির্বাচন *</label>
                <select 
                  value={pSupplierId}
                  onChange={(e) => setPSupplierId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 bg-white"
                >
                  <option value="">-- সিলেক্ট সরবরাহকারী --</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>{sup.name} ({sup.contactPerson})</option>
                  ))}
                </select>
              </div>

              {/* Product Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">২. ইনভেন্টরি প্রোডাক্ট নির্বাচন *</label>
                <select 
                  value={pProductId}
                  onChange={(e) => setPProductId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 bg-white text-slate-700"
                >
                  <option value="">-- কোন প্রডাক্ট ক্রয় করছেন? --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (মজুদ: {toBnNum(p.stock)} টি)</option>
                  ))}
                </select>
              </div>

              {/* Cost Price and Qty */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">৩. ক্রয় মূল্য (৳ Unit Rate) *</label>
                  <input 
                    type="number" 
                    value={pUnitPrice}
                    onChange={(e) => setPUnitPrice(e.target.value)}
                    placeholder="যেমন: ৩৫০"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">৪. ক্রয়ের পরিমাণ (Qty) *</label>
                  <input 
                    type="number" 
                    value={pProductQty}
                    onChange={(e) => setPProductQty(e.target.value)}
                    placeholder="যেমন: ৫০"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Amount Paid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">৫. নগদ পরিশোধ (৳) *</label>
                  <input 
                    type="number" 
                    value={pAmountPaid}
                    onChange={(e) => setPAmountPaid(e.target.value)}
                    placeholder="যেমন: ১৫০০০0"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">তারিখ</label>
                  <input 
                    type="date" 
                    value={pDate}
                    onChange={(e) => setPDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setPurchaseModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">বাতিল</button>
                <button type="submit" disabled={purchaseLoading} className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
                  {purchaseLoading ? "স্টক প্রিপেয়ার হচ্ছে..." : "ক্রয় সম্পন্ন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
