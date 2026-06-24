import React, { useState } from "react";
import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  DollarSign, 
  Sparkles, 
  FileText, 
  Lock, 
  User, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown,
  Activity
} from "lucide-react";
import { Product, Sale, Expense } from "../types";
import { formatCurrency, convertEnglishToBengaliNumber, formatDateBengali } from "../utils";

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  role: "অ্যাডমিন" | "সেলসম্যান";
  onTabChange: (tab: string) => void;
}

export default function Dashboard({ products, sales, expenses, role, onTabChange }: DashboardProps) {
  const [aiReport, setAiReport] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [errorAi, setErrorAi] = useState<string>("");

  // Helper translations for dashboard UI
  const englishToBnNum = (val: number | string) => convertEnglishToBengaliNumber(val);

  // 1. Math formulas for dashboard calculation
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  
  // Calculate COGS and Profit (only viewable by Admin)
  let totalProfit = 0;
  sales.forEach((sale) => {
    let saleCost = 0;
    sale.items.forEach((item) => {
      // purchase cost * scale sold qty
      saleCost += (item.buyPrice || 0) * item.qty;
    });
    totalProfit += (sale.total - (sale.subTotal - sale.total)) - saleCost; 
    // Profit = sales revenue (total after discount) - purchase price
  });

  const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalProfit - totalExpenseAmount;

  // Stocks alerts
  const lowStockItems = products.filter(p => p.stock <= p.alertLimit);
  const totalStockQuantity = products.reduce((sum, p) => sum + p.stock, 0);

  // Recent 5 sales
  const recentSales = [...sales].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Chart data extraction - past 7 days of sales
  const getPast7Days = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split("T")[0];
      list.push(str);
    }
    return list;
  };

  const chartDates = getPast7Days();
  const salesByDate = chartDates.map(date => {
    const total = sales.filter(s => s.date === date).reduce((sum, s) => sum + s.total, 0);
    // return date label and value
    const dObj = new Date(date);
    const dayLabel = dObj.toLocaleDateString("bn-BD", { weekday: "short" });
    return { date, dayLabel, total };
  });

  const maxSaleInChart = Math.max(...salesByDate.map(s => s.total), 5000);

  // Call server-side Gemini API AI Advisor
  const generateStoreReport = async () => {
    setLoadingAi(true);
    setErrorAi("");
    setAiReport("");
    setAiModalOpen(true);
    try {
      const topProducts = products.slice(0, 5).map(p => ({
        name: p.name,
        stock: p.stock,
        sellPrice: p.sellPrice
      }));

      let res;
      try {
        res = await fetch("/api/advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalSales,
            totalProfit: role === "অ্যাডমিন" ? totalProfit : "সীমাবদ্ধ",
            totalExpenses: totalExpenseAmount,
            lowStockProducts: lowStockItems.map(p => ({ name: p.name, stock: p.stock })),
            productMetrics: topProducts
          })
        });
      } catch (fetchErr) {
        throw new Error("সার্ভারের সাথে যোগাযোগ করা সম্ভব হচ্ছে না। আপনি যদি গিটহাব পেজেস (GitHub Pages) এ থাকেন, তবে মনে রাখবেন এটি একটি স্ট্যাটিক হোস্টিং এবং এতে এআই ব্যাকএন্ড সার্ভার সক্রিয় থাকে না। জেমিনী এআই উপদেষ্টা ব্যবহার করতে দয়া করে এআই স্টুডিও এর মূল রানিং লিংকটি ব্যবহার করুন।");
      }

      if (res.status === 404) {
        throw new Error("জেমিনী এআই উপদেষ্টা রিপোর্ট ব্যবহারের জন্য একটি সক্রিয় ব্যাকএন্ড সার্ভার প্রয়োজন। আপনি যেহেতু গিটহাব পেজেস (GitHub Pages) এর মতো একটি স্ট্যাটিক হোস্টিং-এ আছেন, তাই এআই সার্ভারটি সক্রিয় নয়। এআই রিপোর্ট ব্যবহার করতে দয়া করে এই ডেভেলপমেন্ট/শেয়ার্ড অ্যাপলিকেশন লিংকটি ব্যবহার করুন।");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "এআই মডিউল লোড করতে ব্যর্থ হয়েছে।");
      }
      setAiReport(data.advice);
    } catch (err: any) {
      setErrorAi(err.message || "সার্ভার রেসপন্স করছে না।");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6" id="dashboard_panel">
      {/* Upper Pitch Grid Card */}
      <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী</h1>
            <p className="text-sm text-blue-100 font-light flex items-center gap-1.5">
              <Activity className="w-4 h-4 animate-pulse text-teal-300" />
              বাংলা বিজনেস ইনভেন্টরি, হিসাবপত্র ও রিয়েল-টাইম POS ম্যানেজার
            </p>
          </div>
          <button 
            onClick={generateStoreReport}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-bold px-5 py-3 rounded-lg shadow-lg active:scale-95 transition-all text-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span>জেমিনী এআই উপদেষ্টা রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 Sales */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-sm font-medium">আজকের / মোট বিক্রি</span>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-800">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-mono text-slate-800">{formatCurrency(totalSales)}</h3>
          <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{englishToBnNum(sales.length)} টি মেমো রেকর্ড করা হয়েছে</span>
          </p>
        </div>

        {/* KPI 2 Profit (Admin Only Mask) */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-sm font-medium">আনুমানিক লাভ (Profit)</span>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          {role === "অ্যাডমিন" ? (
            <>
              <h3 className="text-2xl font-bold font-mono text-emerald-600">{formatCurrency(totalProfit)}</h3>
              <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>ব্যয় বাদে নেট লাভ: {formatCurrency(netProfit)}</span>
              </p>
            </>
          ) : (
            <div className="py-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-100">
                <Lock className="w-3.5 h-3.5" />
                <span>শুধুমাত্র অ্যাডমিন দেখতে পারবেন</span>
              </div>
            </div>
          )}
        </div>

        {/* KPI 3 Expenses */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-sm font-medium">সাধারণ খরচাবলি</span>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-50 text-rose-800">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          {role === "অ্যাডমিন" ? (
            <>
              <h3 className="text-2xl font-bold font-mono text-rose-600">{formatCurrency(totalExpenseAmount)}</h3>
              <p className="text-xs text-slate-500 mt-2">দোকան ভাড়া, বিদ্যুৎ ও বিবিধ খরচ</p>
            </>
          ) : (
            <div className="py-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-100">
                <Lock className="w-3.5 h-3.5" />
                <span>শুধুমাত্র অ্যাডমিন দেখতে পারবেন</span>
              </div>
            </div>
          )}
        </div>

        {/* KPI 4 Low Stock Warning */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-sm font-medium">নিরাপত্তা স্টক অ্যালার্ট</span>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-50 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold font-mono ${lowStockItems.length > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-800'}`}>
            {englishToBnNum(lowStockItems.length)} টি পণ্য
          </h3>
          <p className="text-xs text-slate-500 mt-2">
            সর্বমোট {englishToBnNum(totalStockQuantity)} টি আইটেম স্টক আছে
          </p>
        </div>
      </div>

      {/* Charts & Warning Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart (2 columns) */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-slate-700 font-bold text-base">গত ৭ দিনের বিক্রয় রেখাচিত্র</h4>
              <p className="text-xs text-slate-400">প্রতিদিনের মেমো হিসাবের তুলনামূলক চিত্র</p>
            </div>
            <span className="text-xs text-blue-600 px-2 py-1 rounded bg-blue-50 font-medium">ক্যাশ ফ্লো চার্ট</span>
          </div>

          {/* Fully custom, highly robust, responsive SVG Chart */}
          <div className="relative w-full h-64 mt-6">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {/* grid lines */}
              {[4, 3, 2, 1, 0].map((i) => (
                <div key={i} className="w-full flex items-center gap-2 border-t border-slate-100 pt-1">
                  <span className="text-[10px] font-mono text-slate-400 w-12 text-right">
                    {formatCurrency((maxSaleInChart / 4) * i)}
                  </span>
                  <div className="flex-1"></div>
                </div>
              ))}
            </div>

            {/* Bars & Lines container */}
            <div className="absolute bottom-6 left-14 right-4 top-2 flex justify-between items-end h-[180px]">
              {salesByDate.map((day, idx) => {
                const percentage = Math.min(100, (day.total / maxSaleInChart) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded px-1.5 py-1 z-30 pointer-events-none whitespace-nowrap shadow font-mono">
                      {formatCurrency(day.total)}
                    </div>
                    {/* Bar */}
                    <div 
                      style={{ height: `${percentage}%` }}
                      className="w-8 sm:w-12 bg-gradient-to-t from-blue-700 to-teal-500 rounded-t-md hover:from-blue-600 hover:to-teal-400 transition-all cursor-pointer shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/10 pattern-lines"></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X Axis Labels */}
            <div className="absolute bottom-0 left-14 right-4 flex justify-between">
              {salesByDate.map((day) => (
                <div key={day.date} className="flex-1 text-center">
                  <span className="text-[11px] font-medium text-slate-500">{day.dayLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Low Stock Watch Section (1 column) */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h4 className="text-slate-700 font-bold text-base flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>রি-অর্ডার সতর্কতা</span>
              </h4>
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                {englishToBnNum(lowStockItems.length)} টি পণ্য কম
              </span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">✓</div>
                <p className="text-xs font-semibold text-slate-600">সব পণ্যের স্টক পর্যাপ্ত রয়েছে!</p>
                <p className="text-[11px] text-slate-400">মেয়াদের বাইরে কোনো রি-অর্ডার এলার্ট নেই</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-56 pr-1">
                {lowStockItems.map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 border border-orange-100/60 hover:bg-orange-100/40 transition-colors">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 leading-tight">{prod.name}</h5>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">মডেল: {prod.sku} | ক্যাবিনেট: {prod.shelf}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-rose-600 block">{englishToBnNum(prod.stock)} টি অবশিষ্ট</span>
                      <span className="text-[10px] text-slate-500 block">সীমা: {englishToBnNum(prod.alertLimit)} টি</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => onTabChange("inventory")}
            className="w-full mt-4 text-center text-xs text-teal-600 bg-teal-50 hover:bg-teal-100 hover:text-teal-700 font-semibold py-2 rounded-lg transition-colors border border-teal-100 cursor-pointer"
          >
            স্টক বা ইনভেন্টরি ম্যানেজ করুন →
          </button>
        </div>
      </div>

      {/* Recent Transcations Table */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h4 className="text-slate-700 font-bold text-base">সাম্প্রতিক বেচাকেনা ও ইনভয়েস</h4>
            <p className="text-xs text-slate-400">এইমাত্র সম্পন্ন হওয়া শেষ ৫টি মেমো</p>
          </div>
          <button 
            onClick={() => onTabChange("sales_history")}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>সব মেমো দেখুন</span>
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            কোনো বেচাকেনার রেকর্ড পাওয়া যায়নি। পস (POS) স্ক্রিন থেকে বিক্রি শুরু করুন!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-3">ক্রেতার নাম & মোবাইল</th>
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3 text-right">বিক্রি পরিমাণ</th>
                  <th className="py-2.5 px-3 text-right">ডিসকাউন্ট</th>
                  <th className="py-2.5 px-3 text-right">মোট পরিশোধ</th>
                  <th className="py-2.5 px-3 text-right">বাকী/বকেয়া</th>
                  <th className="py-2.5 px-3 text-center">বিক্রেতা</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{sale.customerName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{sale.customerMobile}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {formatDateBengali(sale.date)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                      {formatCurrency(sale.subTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-500">
                      -{formatCurrency(sale.discount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {sale.due > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold">
                          {formatCurrency(sale.due)}
                        </span>
                      ) : (
                        <span className="text-slate-400">পরিশোধিত</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {sale.salesperson}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gemini AI Advisor Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-teal-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white p-5 rounded-t-2xl flex items-center justify-between shadow">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-300 animate-spin-slow" />
                <h3 className="text-lg font-bold">জেমিনী এআই বিজনেস উপদেষ্টা রিপোর্ট</h3>
              </div>
              <button 
                onClick={() => setAiModalOpen(false)}
                className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingAi ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700 animate-pulse">জেমিনী এআই স্টোর অডিট এবং ডাটা বিশ্লেষণ করছে...</p>
                    <p className="text-xs text-slate-400 mt-1">দয়া করে কয়েক মুহূর্ত অপেক্ষা করুন</p>
                  </div>
                </div>
              ) : errorAi ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-slate-700 text-xs text-center space-y-3">
                  <span className="text-rose-600 text-lg block">⚠ ত্রুটি ঘটেছে</span>
                  <p className="font-medium text-slate-600">{errorAi}</p>
                  <p className="text-[10px] text-slate-400">SETTINGS থেকে GEMINI_API_KEY সঠিকভাবে কনফিগার করা আছে কিনা পরীক্ষা করুন</p>
                  <button 
                    onClick={generateStoreReport}
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-xs font-bold transition-all inline-block mt-2 cursor-pointer"
                  >
                    পুনরায় চেষ্টা করুন
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {aiReport}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => setAiModalOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                বন্ধ করুন
              </button>
              {!loadingAi && !errorAi && (
                <button 
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>রিপোর্ট প্রিন্ট করুন</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
