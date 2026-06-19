import React, { useState } from "react";
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  UserPlus, 
  Percent, 
  Coins, 
  RefreshCw, 
  User, 
  Phone,
  Tag,
  Clock,
  Printer,
  CheckCircle2,
  BookmarkPlus,
  Lock
} from "lucide-react";
import { Product, Customer, Sale, SaleItem } from "../types";
import { formatCurrency, convertEnglishToBengaliNumber, parseInputNumber } from "../utils";

interface PosPaneProps {
  products: Product[];
  customers: Customer[];
  role: "অ্যাডমিন" | "সেলসম্যান";
  currentUserName: string;
  onAddSale: (sale: Omit<Sale, "id">) => Promise<string>; // Returns newly created sale doc ID
  onAddCustomer: (cust: Omit<Customer, "id">) => Promise<void>;
  onEditProductStock: (id: string, newStock: number) => Promise<void>;
  onUpdateCustomerDue: (id: string, dueToAdd: number) => Promise<void>;
}

interface CartItem {
  product: Product;
  qty: number;
}

export default function PosPane({ 
  products, 
  customers, 
  role, 
  currentUserName,
  onAddSale, 
  onAddCustomer,
  onEditProductStock,
  onUpdateCustomerDue
}: PosPaneProps) {
  // POS Catalogs searching & filtering
  const [catSearch, setCatSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  // Selection states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(
    customers.find(c => c.mobile === "01700000000") || customers[0] || { name: "সাধারণ কাস্টমার", mobile: "01700000000", address: "খুচরা বাজার", totalDue: 0 }
  );

  // Cart operations
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountVal, setDiscountVal] = useState<string>("0");
  const [paidVal, setPaidVal] = useState<string>("");

  // Customer registration state
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustMobile, setNewCustMobile] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  // Print Invoice Modal State
  const [completedInvoice, setCompletedInvoice] = useState<Sale | null>(null);
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Numbers localization
  const toBnNum = (val: number | string) => convertEnglishToBengaliNumber(val);

  // Catalog item click selector
  const handleAddToCart = (prod: Product) => {
    if (prod.stock <= 0) {
      alert("দুঃখিত! এই পণ্যের পর্যাপ্ত স্টক অবশিষ্ট নেই।");
      return;
    }

    const existingIdx = cart.findIndex(item => item.product.id === prod.id);
    if (existingIdx > -1) {
      const currentQtyInCart = cart[existingIdx].qty;
      if (currentQtyInCart >= prod.stock) {
        alert(`দুঃখিত! স্টকে মাত্র ${toBnNum(prod.stock)} টি আইটেম উপলব্ধ রয়েছে।`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIdx].qty += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product: prod, qty: 1 }]);
    }
  };

  // Cart qty manipulation
  const handleAdjustCartQty = (prodId: string, delta: number) => {
    const idx = cart.findIndex(item => item.product.id === prodId);
    if (idx === -1) return;

    const targetItem = cart[idx];
    const newQty = targetItem.qty + delta;

    if (newQty <= 0) {
      // Remove item
      const updated = cart.filter(item => item.product.id !== prodId);
      setCart(updated);
    } else {
      // Check maximum stock limits
      if (newQty > targetItem.product.stock) {
        alert(`স্টকে শুধুমাত্র ${toBnNum(targetItem.product.stock)} টি আইটেম মজুদ আছে।`);
        return;
      }
      const updated = [...cart];
      updated[idx].qty = newQty;
      setCart(updated);
    }
  };

  // Remove single line from cart
  const handleRemoveFromCart = (prodId: string) => {
    setCart(cart.filter(item => item.product.id !== prodId));
  };

  // Calculations
  const subTotal = cart.reduce((sum, item) => sum + (item.product.sellPrice * item.qty), 0);
  const discountAmount = parseInputNumber(discountVal);
  const total = Math.max(0, subTotal - discountAmount);
  
  // Computed default paid amount equals total (making checkouts fast)
  const actualPaidAmount = paidVal === "" ? total : parseInputNumber(paidVal);
  const computedDue = Math.max(0, total - actualPaidAmount);
  const computedChangeRefund = Math.max(0, actualPaidAmount - total);

  // Registering a new customer from POS screen
  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustMobile.trim()) {
      alert("কাস্টমারের নাম এবং মোবাইল নম্বর আবশ্যক!");
      return;
    }

    try {
      const payload = {
        name: newCustName.trim(),
        mobile: newCustMobile.trim(),
        address: newCustAddress.trim(),
        totalDue: 0
      };

      await onAddCustomer(payload);
      // Automatically select newly registered customer
      setSelectedCustomer({ ...payload, id: newCustMobile });
      
      // Clear forms
      setNewCustName("");
      setNewCustMobile("");
      setNewCustAddress("");
      setNewCustOpen(false);
    } catch (err: any) {
      alert("কাস্টমার রেজিস্ট্রেশন ব্যর্থ হয়েছে: " + err.message);
    }
  };

  // Checkout sale completion handler
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setValidationError("কার্ট বা মেমো খালি! মেমোতে অন্তত একটি পণ্য যোগ করুন।");
      return;
    }

    setCheckoutLoading(true);
    setValidationError("");
    try {
      const invoiceDate = new Date().toISOString().split("T")[0];
      
      // 1. Prepare items payload for the sale record
      const saleItems: SaleItem[] = cart.map(item => ({
        productId: item.product.id!,
        productName: item.product.name,
        qty: item.qty,
        sellPrice: item.product.sellPrice,
        buyPrice: item.product.buyPrice // Storing buyPrice to track actual profit margin
      }));

      // 2. Map sale structure
      const salePayload: Omit<Sale, "id"> = {
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        items: saleItems,
        subTotal,
        discount: discountAmount,
        total,
        paid: actualPaidAmount,
        due: computedDue,
        date: invoiceDate,
        salesperson: role === "অ্যাডমিন" ? "অ্যাডমিন" : "সেলসম্যান"
      };

      // 3. Save Sale onto Firestore database
      const generatedId = await onAddSale(salePayload);

      // 4. Update product stocks and customer dues on Firestore
      for (const item of cart) {
        const productCurrentStock = item.product.stock;
        const finalStock = Math.max(0, productCurrentStock - item.qty);
        await onEditProductStock(item.product.id!, finalStock);
      }

      // If customer is registered (not standard general), and payment has leftover due, increment outstanding customer due ledger
      if (selectedCustomer.id && selectedCustomer.id !== "cust_general" && computedDue > 0) {
        await onUpdateCustomerDue(selectedCustomer.id, computedDue);
      }

      // Set Completed sale representation for instant invoice modal popup
      setCompletedInvoice({
        ...salePayload,
        id: generatedId
      });
      setInvoiceId(generatedId);

      // Clear Cart state for next purchase operation
      setCart([]);
      setDiscountVal("0");
      setPaidVal("");
    } catch (err: any) {
      setValidationError("ইনভয়েস সফল করা যায়নি: " + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Filter products for the catalog drawer
  const catalogProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(catSearch.toLowerCase()) || 
                          p.sku.toLowerCase().includes(catSearch.toLowerCase());
    const matchesCat = selectedCat === "all" || p.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="pos_panel">
      {/* Left Column: POS Catalog Picker (8 columns out of 12) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Search & register headers */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 leading-none">
              <ShoppingCart className="w-5 h-5 text-teal-600" />
              <span>খুচরা বিক্রয় ও ক্যাশ কাউন্টার (POS)</span>
            </h3>

            {/* Quick customer selection dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56 text-xs">
                <span className="absolute left-2.5 top-2.5 text-slate-400">👤</span>
                <select 
                  value={selectedCustomer.mobile}
                  onChange={(e) => {
                    const found = customers.find(c => c.mobile === e.target.value);
                    if (found) setSelectedCustomer(found);
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-2 py-2 bg-white text-slate-700"
                >
                  {customers.map((c) => (
                    <option key={c.id || c.mobile} value={c.mobile}>
                      {c.name} ({c.mobile})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer quick registry button */}
              <button 
                type="button"
                onClick={() => setNewCustOpen(true)}
                title="নতুন কাস্টমার রেজিস্ট্রার করুন"
                className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search catalog bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="নাম বা কোড দিয়ে পণ্য খুঁজুন..." 
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full text-xs border border-slate-200 pl-9 pr-3 py-2.5 rounded-lg focus:outline-hidden focus:border-teal-500 font-sans"
              />
            </div>

            {/* Quick Categories filter buttons */}
            <div className="relative">
              <select 
                value={selectedCat} 
                onChange={(e) => setSelectedCat(e.target.value)}
                className="w-full text-xs border border-slate-200 py-2.5 px-3 rounded-lg bg-white select-none text-slate-700 focus:outline-hidden focus:border-teal-500"
              >
                <option value="all">সব ক্যাটাগরি</option>
                <option value="computer_parts">কম্পিউটার পার্টস</option>
                <option value="accessories">এক্সেসরিজ</option>
                <option value="stationery">স্টেশনারি</option>
                <option value="printing_paper">কাগজ ও প্রিন্টিং</option>
                <option value="services">সার্ভিসিং ও ফটোস্ট্যাট</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid Picker */}
        <div className="overflow-y-auto max-h-[58vh] pr-1 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {catalogProducts.map((p) => {
              const outOfStock = p.stock <= 0;
              const isLow = p.stock <= p.alertLimit;
              return (
                <div 
                  key={p.id}
                  onClick={() => !outOfStock && handleAddToCart(p)}
                  className={`bg-white border rounded-xl p-3 flex flex-col justify-between shadow-fold transition-all cursor-pointer text-left select-none group relative bg-white border-slate-100 ${outOfStock ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-teal-500 hover:shadow-sm active:scale-97'}`}
                >
                  <div>
                    {/* Shelf Location tags */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded-md font-sans">
                        {p.shelf || "স্টোররুম"}
                      </span>
                      <span className={`text-[9px] px-1 py-0.5 rounded-md font-bold font-mono ${outOfStock ? 'bg-rose-50 text-rose-600' : isLow ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {outOfStock ? "শেষ" : `স্টক: ${toBnNum(p.stock)}`}
                      </span>
                    </div>

                    {/* Smooth Product Photo Container */}
                    <div className="w-full h-20 sm:h-24 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden mb-2 flex items-center justify-center relative select-none">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <span className="text-2xl">📦</span>
                        </div>
                      )}
                    </div>

                    <h4 className="text-[11px] sm:text-xs font-bold text-slate-700 group-hover:text-teal-700 min-h-[32px] leading-tight line-clamp-2">
                      {p.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-2">
                    <span className="text-[9px] font-mono text-slate-400">{p.sku}</span>
                    <span className="text-xs font-extrabold font-mono text-teal-600">
                      {formatCurrency(p.sellPrice)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Shopping Cart / Billing Form (5 columns out of 12) */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
          {/* Cart Header */}
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-slate-600" />
              <h4 className="text-xs font-bold text-slate-700">চলতি বিক্রয় রশিদ (মেমো)</h4>
            </div>
            <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-mono">
              {toBnNum(cart.length)} টি পণ্য
            </span>
          </div>

          {/* Customer highlight bar */}
          <div className="px-4 py-2 border-b border-blue-50 bg-blue-50/20 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-0.5 font-bold"><User className="w-3.5 h-3.5 text-blue-700" /> {selectedCustomer.name}</span>
            <span className="font-mono text-slate-500">{selectedCustomer.mobile}</span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto max-h-[30vh] p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-center text-slate-400 space-y-2">
                <span className="text-3xl">🛒</span>
                <p className="text-xs leading-normal">কার্ট সম্পূর্ণ খালি আছে!<br />বাম পাশের তালিকা থেকে আইটেম যোগ করুন</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/30 text-xs gap-2">
                  {/* Miniature Image inside cart list */}
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                    {item.product.imageUrl ? (
                      <img 
                        src={item.product.imageUrl} 
                        alt="thumb" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">📦</span>
                    )}
                  </div>
                  <div className="flex-1 pr-2">
                    <h5 className="font-bold text-slate-800 leading-tight">{item.product.name}</h5>
                    <span className="text-[10px] font-mono text-slate-400">দর (Unit): {formatCurrency(item.product.sellPrice)}</span>
                  </div>

                  {/* Quantity Actions */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleAdjustCartQty(item.product.id!, -1)}
                      className="bg-white hover:bg-slate-100 text-slate-600 w-5 h-5 rounded border border-slate-200 font-bold font-mono text-center flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold font-sans">{toBnNum(item.qty)}</span>
                    <button 
                      onClick={() => handleAdjustCartQty(item.product.id!, 1)}
                      className="bg-white hover:bg-slate-100 text-slate-600 w-5 h-5 rounded border border-slate-200 font-bold font-mono text-center flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Pricing line */}
                  <div className="w-20 text-right pr-2">
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(item.product.sellPrice * item.qty)}
                    </span>
                  </div>

                  {/* Trash */}
                  <button 
                    onClick={() => handleRemoveFromCart(item.product.id!)}
                    className="text-rose-500 hover:bg-rose-50 p-1 rounded cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Billing Calculation Panel */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3 font-sans">
            {/* 1. Subtotal line */}
            <div className="flex justify-between text-xs text-slate-600">
              <span>মোট বেচা (Subtotal)</span>
              <span className="font-mono font-bold">{formatCurrency(subTotal)}</span>
            </div>

            {/* 2. Discount Input */}
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-600">বিশেষ ডিসকাউন্ট (৳)</span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1.5 text-rose-500 text-[10px]">-%</span>
                <input 
                  type="number"
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  placeholder="0"
                  className="w-full text-right text-xs border border-slate-250 py-1 px-2.5 pl-6 rounded-md focus:outline-hidden focus:border-teal-500 font-mono font-bold text-rose-600"
                />
              </div>
            </div>

            {/* 3. Payable Total */}
            <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-200 font-bold text-slate-800">
              <span className="text-teal-700">সর্বমোট প্রদেয় বিল (Total)</span>
              <span className="font-mono font-extrabold text-teal-700 text-base">{formatCurrency(total)}</span>
            </div>

            {/* 4. Money Paid Input */}
            <div className="flex items-center justify-between gap-4 text-xs pt-1">
              <span className="text-slate-600 font-semibold flex items-center gap-1">💵 কাস্টমার পেমেন্ট (৳)</span>
              <div className="relative w-36">
                <input 
                  type="number"
                  value={paidVal}
                  onChange={(e) => setPaidVal(e.target.value)}
                  placeholder={`পূর্ণ পরিশোধ (${total})`}
                  className="w-full text-right text-xs font-bold border border-slate-250 py-1.5 px-2.5 rounded-lg focus:outline-hidden focus:border-teal-500 font-mono text-slate-800"
                />
              </div>
            </div>

            {/* 5. Change Refund / Due representation */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-white border rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 block font-normal">বাকী পড়বে (Due)</span>
                <span className={`text-xs font-mono font-bold block ${computedDue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {formatCurrency(computedDue)}
                </span>
              </div>
              <div className="bg-white border rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 block font-normal">ফেরত পাবে (Change)</span>
                <span className="text-xs font-mono font-bold text-blue-600 block">
                  {formatCurrency(computedChangeRefund)}
                </span>
              </div>
            </div>

            {/* Output Error messages */}
            {validationError && (
              <div className="p-2 border border-rose-100 bg-rose-50 rounded-lg text-[11px] text-rose-600">
                ⚠ {validationError}
              </div>
            )}

            {/* Checkout CTA block */}
            <button 
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading || cart.length === 0}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm shadow-md transition-all scale-100 hover:shadow-lg disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
            >
              {checkoutLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>বিলিং প্রসেস হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Coins className="w-4.5 h-4.5" />
                  <span>আইটেম চেকআউট করে মেমো প্রিন্ট করুন →</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Register Customer Quick Modal Popup */}
      {newCustOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-teal-50 transform scale-100 transition-all font-sans">
            <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-sm font-bold">নতুন কাস্টমার নিবন্ধন ফরম</h3>
              <button 
                onClick={() => setNewCustOpen(false)}
                className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-full text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRegisterCustomer} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">কাস্টমারের নাম *</label>
                <input 
                  type="text" 
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="যেমন: সোহেল রানা"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">মোবাইল নম্বর *</label>
                <input 
                  type="text" 
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  placeholder="যেমন: 017xxxxxxxx"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">ঠিকানা / রিমার্কেট</label>
                <input 
                  type="text" 
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="যেমন: চকবাজার মহাল্লা, চট্টগ্রাম"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setNewCustOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  কাস্টমার যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Success Invoice Thermal/Standard Printable Receipt Modal popup */}
      {completedInvoice && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in print:bg-white print:p-0 print:m-0">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh] print:max-h-full print:w-full print:border-none print:shadow-none print:rounded-none">
            {/* Modal action headers */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print shadow-md">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>মেমো এবং সেল সম্পন্ন হয়েছে!</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => window.print()}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold py-1.5 px-3.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট মেমো</span>
                </button>
                <button 
                  onClick={() => setCompletedInvoice(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-3.5 font-bold rounded-lg text-[11px] cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>

            {/* Printable Area Card */}
            <div className="p-6 bg-white overflow-y-auto flex-1 font-sans text-slate-800 print:p-0" id="printable_invoice">
              {/* Receipt Header details */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300 space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী</h2>
                <p className="text-[11px] text-slate-600 font-light">কম্পিউটার খুচরা যন্ত্রাংশ ও স্টেশনারি বিপণনকারী প্রতিষ্ঠান।<br />মেসার্স যাকওয়ান ভিলা, কলেজ রোড, চট্টগ্রাম</p>
                <p className="text-[11px] font-bold font-mono text-slate-700">ফোন: ০১৮৭৬৫৪৩২১০, ০১৮৫০০০০০০০</p>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-2 gap-4 py-3 text-[11px] text-slate-600 border-b border-slate-100 font-sans">
                <div className="space-y-0.5">
                  <p><span className="font-semibold text-slate-800">কাস্টমার নাম:</span> {completedInvoice.customerName}</p>
                  <p><span className="font-semibold text-slate-800">মোবাইল:</span> {completedInvoice.customerMobile}</p>
                </div>
                <div className="space-y-0.5 text-right font-sans">
                  <p><span className="font-semibold text-slate-800">তারিখ:</span> {completedInvoice.date}</p>
                  <p><span className="font-semibold text-slate-800">রশিদ নং / ID:</span> <span className="font-mono font-bold text-slate-700">{invoiceId.substring(0, 8).toUpperCase()}</span></p>
                </div>
              </div>

              {/* Items Table */}
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
                  {completedInvoice.items.map((item, id) => (
                    <tr key={id} className="border-b border-slate-150 py-2">
                      <td className="py-2 px-1 text-[11px] font-semibold text-slate-800 font-sans">
                        {item.productName}
                      </td>
                      <td className="py-2 px-1 text-center font-mono font-medium">
                        {toBnNum(item.qty)}
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-[11px]">
                        {formatCurrency(item.sellPrice)}
                      </td>
                      <td className="py-2 px-1 text-right font-mono font-bold">
                        {formatCurrency(item.sellPrice * item.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Math Computations List */}
              <div className="mt-4 pt-3 border-t border-dashed border-slate-300 ml-auto w-4/6 space-y-1.5 text-xs font-sans">
                <div className="flex justify-between text-slate-600">
                  <span>মোট বিল (Subtotal):</span>
                  <span className="font-mono font-semibold">{formatCurrency(completedInvoice.subTotal)}</span>
                </div>
                <div className="flex justify-between text-rose-500 font-medium">
                  <span>ডিসকাউন্ট (Discount):</span>
                  <span className="font-mono font-bold">-{formatCurrency(completedInvoice.discount)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold border-t border-slate-100 pt-1 text-[13px]">
                  <span>পরিশোধ করতে হবে:</span>
                  <span className="font-mono font-extrabold">{formatCurrency(completedInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>কাস্টমার দিয়েছে (Paid):</span>
                  <span className="font-mono font-bold">{formatCurrency(completedInvoice.paid || completedInvoice.total)}</span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-1">
                  {completedInvoice.due > 0 ? (
                    <>
                      <span className="text-rose-600 font-bold">বকেয়া রহিল (Due):</span>
                      <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 rounded">{formatCurrency(completedInvoice.due)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 font-semibold">সম্পূর্ণ পরিশোধিত (Paid)</span>
                      <span className="font-mono text-emerald-600 font-bold">৳0.00</span>
                    </>
                  )}
                </div>
              </div>

              {/* Thank you statement footer */}
              <div className="text-center pt-8 pb-2 border-t border-dashed border-slate-300 mt-8 space-y-1">
                <p className="text-[11px] font-bold text-slate-800">মেমো তৈরি করেছেন: {completedInvoice.salesperson || currentUserName}</p>
                <p className="text-[10px] text-slate-400">মেমো জেনারেশনের সময়: {new Date().toLocaleTimeString("bn-BD")}</p>
                <div className="h-2"></div>
                <p className="text-xs font-semibold text-teal-700 bg-teal-50/50 py-1 rounded-sm border border-teal-100">"যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী আসার জন্য ধন্যবাদ। আবার আসবেন!"</p>
              </div>
            </div>

            {/* Modal Bottom button bar */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center no-print">
              <button 
                onClick={() => setCompletedInvoice(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-colors"
              >
                মেমো বন্ধ করে নতুন ক্যাশ কার্ট তৈরি করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
