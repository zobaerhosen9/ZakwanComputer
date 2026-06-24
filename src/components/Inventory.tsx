import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Layers, 
  MapPin, 
  Tag, 
  Lock, 
  AlertCircle,
  FileCheck2,
  PackagePlus,
  RefreshCw
} from "lucide-react";
import { Product, Category } from "../types";
import { CATEGORIES_BN, formatCurrency, convertEnglishToBengaliNumber, parseInputNumber } from "../utils";

interface InventoryProps {
  products: Product[];
  categories: Category[];
  role: "অ্যাডমিন" | "সেলসম্যান";
  onAddProduct: (prod: Omit<Product, "id">) => Promise<void>;
  onEditProduct: (id: string, prod: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddCategory: (cat: Category) => Promise<void>;
}

export default function Inventory({ 
  products, 
  categories, 
  role, 
  onAddProduct, 
  onEditProduct, 
  onDeleteProduct,
  onAddCategory
}: InventoryProps) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Add/Edit Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "stationery",
    buyPrice: "",
    sellPrice: "",
    stock: "",
    alertLimit: "5",
    sku: "",
    shelf: "",
    imageUrl: ""
  });

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Action feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Helper translations for numbers
  const toBnNum = (val: number | string) => convertEnglishToBengaliNumber(val);

  // Filter products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || p.stock <= p.alertLimit;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Open Add modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: categories[0]?.id || "stationery",
      buyPrice: "",
      sellPrice: "",
      stock: "",
      alertLimit: "5",
      sku: "JK-" + Math.floor(1000 + Math.random() * 9000),
      shelf: "",
      imageUrl: ""
    });
    setErrorMsg("");
    setProductModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      buyPrice: String(p.buyPrice),
      sellPrice: String(p.sellPrice),
      stock: String(p.stock),
      alertLimit: String(p.alertLimit),
      sku: p.sku,
      shelf: p.shelf,
      imageUrl: p.imageUrl || ""
    });
    setErrorMsg("");
    setProductModalOpen(true);
  };

  // Save product details
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("পণ্য বা আইটেমের নাম আবশ্যক!");
      return;
    }

    const buyPriceNum = parseInputNumber(formData.buyPrice);
    const sellPriceNum = parseInputNumber(formData.sellPrice);
    const stockNum = parseInputNumber(formData.stock);
    const alertNum = parseInputNumber(formData.alertLimit);

    if (sellPriceNum <= 0) {
      setErrorMsg("বিক্রয় মূল্য অবশ্যই শূন্যের চেয়ে বড় হতে হবে!");
      return;
    }

    if (role === "অ্যাডমিন" && buyPriceNum > sellPriceNum) {
      if (!confirm("সতর্কতা: ক্রয়ের চেয়ে বিক্রয় মূল্য কম দেওয়া হয়েছে! আপনি কি এগিয়ে যেতে চান?")) {
        return;
      }
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const payload: Omit<Product, "id"> = {
        name: formData.name,
        category: formData.category,
        buyPrice: role === "অ্যাডমিন" ? buyPriceNum : (editingProduct ? editingProduct.buyPrice : 0),
        sellPrice: sellPriceNum,
        stock: stockNum,
        alertLimit: alertNum,
        sku: formData.sku,
        shelf: formData.shelf,
        imageUrl: formData.imageUrl || ""
      };

      if (editingProduct?.id) {
        // Edit flow
        await onEditProduct(editingProduct.id, payload);
      } else {
        // Create flow
        await onAddProduct(payload);
      }
      setProductModalOpen(false);
    } catch (err: any) {
      setErrorMsg("তথ্য সেভ করতে ব্যর্থ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fast manual stock adjust button
  const handleFastStockAdjust = async (p: Product, change: number) => {
    const finalStock = p.stock + change;
    if (finalStock < 0) return;
    try {
      await onEditProduct(p.id!, { stock: finalStock });
    } catch (err) {
      alert("স্টক সমন্বয় ব্যর্থ হয়েছে।");
    }
  };

  // Save category details
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setLoading(true);
    try {
      const cId = newCatName.toLowerCase().replace(/\s+/g, "_");
      await onAddCategory({
        id: cId,
        name: newCatName,
        description: newCatDesc
      });
      setNewCatName("");
      setNewCatDesc("");
      setCategoryModalOpen(false);
    } catch (err) {
      console.error("Category save error:", err);
      alert("ক্যাটাগরি সেভ করতে ব্যর্থ: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Delete product action (only admin allowed)
  const handleDeleteProduct = async (p: Product) => {
    if (role !== "অ্যাডমিন") {
      alert("শুধুমাত্র অ্যাডমিন অ্যাকাউন্ট পণ্য মুছে ফেলতে পারবে!");
      return;
    }
    if (confirm(`আপনি কি সত্যিই "${p.name}" প্রোডাক্টটি তালিকা থেকে ডিলিট করতে চান?`)) {
      try {
        await onDeleteProduct(p.id!);
      } catch (err) {
        alert("প্রোডাক্ট মুছে ফেলা যায়নি।");
      }
    }
  };

  return (
    <div className="space-y-6" id="inventory_panel">
      {/* Upper Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">পণ্য তালিকা ও ইনভেন্টরি ড্যাশবোর্ড</h2>
          <p className="text-xs text-slate-400">স্টোন আইটেম ও ক্যাটাগরি কনফিগারেশন</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-200 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>নতুন ক্যাটাগরি তৈরি</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন প্রোডাক্ট অ্যাড করুন</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input 
            type="text" 
            placeholder="নাম অথবা SKU দিয়ে খুঁজুন..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-3 focus:outline-hidden focus:border-teal-500 font-sans"
          />
        </div>

        {/* Category selector */}
        <div className="relative">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-3 focus:outline-hidden focus:border-teal-500 bg-white"
          >
            <option value="all">সব ক্যাটাগরি</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Low Stock checkbox */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 pl-2 cursor-pointer user-select-none">
            <input 
              type="checkbox" 
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-slate-300 rounded-sm focus:ring-teal-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              কম স্টক প্রোডাক্টগুলো দেখান
            </span>
          </label>
        </div>

        {/* Metrics Counter */}
        <div className="flex items-center justify-end pr-2 text-right">
          <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            মোট দেখানো হচ্ছে: <span className="font-mono text-slate-800">{toBnNum(filteredProducts.length)}</span> টি পণ্য
          </span>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <th className="py-3.5 px-4">বারকোড / SKU</th>
                <th className="py-3.5 px-4">পণ্যের নাম</th>
                <th className="py-3.5 px-3">ক্যাটাগরি</th>
                <th className="py-3.5 px-3 text-right">ক্রয় মূল্য</th>
                <th className="py-3.5 px-3 text-right">বিক্রয় মূল্য</th>
                <th className="py-3.5 px-3 text-center">অবশিষ্ট স্টক</th>
                <th className="py-3.5 px-3">র্যাক/অবস্থান</th>
                <th className="py-3.5 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    কোনো প্রোডাক্ট মেলাতে পারেনি। নতুন প্রোডাক্ট যোগ করুন অথবা সার্চ কী পরিবর্তন করুন।
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isLow = prod.stock <= prod.alertLimit;
                  const catLabel = categories.find(c => c.id === prod.category)?.name || prod.category;
                  return (
                    <tr 
                      key={prod.id} 
                      className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${isLow ? 'bg-amber-50/20' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-500">
                        {prod.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative group select-none shadow-xs">
                            {prod.imageUrl ? (
                              <img 
                                src={prod.imageUrl} 
                                alt={prod.name} 
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-125" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-base text-slate-400">📦</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 leading-tight">{prod.name}</div>
                            {isLow && (
                              <span className="text-[9px] bg-rose-100 text-rose-800 px-1 rounded font-bold animate-pulse inline-block mt-0.5">
                                রিঅর্ডার করতে হবে
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-sans">
                        {catLabel}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {role === "অ্যাডমিন" ? (
                          <span className="text-slate-600">{formatCurrency(prod.buyPrice)}</span>
                        ) : (
                          <span className="text-slate-400 flex items-center justify-end gap-1 text-[10px]">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>লকড</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-teal-700">
                        {formatCurrency(prod.sellPrice)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Stock decrease button */}
                          <button 
                            onClick={() => handleFastStockAdjust(prod, -1)}
                            disabled={prod.stock <= 0}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 w-5 h-5 rounded flex items-center justify-center font-bold font-mono transition-colors border border-amber-200 text-xs cursor-pointer disabled:opacity-40"
                          >
                            -
                          </button>
                          
                          {/* Stock Display Counter */}
                          <span className={`w-8 text-center font-mono font-bold text-sm ${isLow ? 'text-rose-600 font-extrabold' : 'text-slate-700'}`}>
                            {toBnNum(prod.stock)}
                          </span>

                          {/* Stock increase button */}
                          <button 
                            onClick={() => handleFastStockAdjust(prod, 1)}
                            className="bg-teal-50 hover:bg-teal-100 text-teal-700 w-5 h-5 rounded flex items-center justify-center font-bold font-mono transition-colors border border-teal-200 text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 flex items-center gap-1 mt-1 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-slate-300" />
                        <span>{prod.shelf || "নির্ধারিত নয়"}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenEditModal(prod)}
                            title="পণ্যের তথ্য পরিবর্তন"
                            className="p-1 px-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer border border-blue-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {role === "অ্যাডমিন" && (
                            <button 
                              onClick={() => handleDeleteProduct(prod)}
                              title="তালিকা থেকে ডিলিট"
                              className="p-1 px-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors cursor-pointer border border-rose-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add & Edit Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-teal-50 transform scale-100 transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingProduct ? `আইটেম পরিবর্তন করুন: ${editingProduct.name}` : "নতুন প্রোডাক্ট যুক্ত করুন (Add Product)"}
              </h3>
              <button 
                onClick={() => setProductModalOpen(false)}
                className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 font-sans">
              {errorMsg && (
                <div className="text-xs bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-lg flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Name field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">প্রোডাক্টের পুরো নাম *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="যেমন: A4tech FG10 Wireless Mouse"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  required
                />
              </div>

              {/* Product Image Selection & Upload Block */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-3">
                <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                  <span className="flex items-center gap-1">📸 প্রোডাক্টের ছবি (Product Image)</span>
                  <span className="text-[10px] text-slate-400 font-normal">ফাইলের আকার অনধিক ৫০০KB</span>
                </label>
                
                <div className="flex gap-3 items-start">
                  {/* Image Preview Window */}
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-250 overflow-hidden flex-shrink-0 flex items-center justify-center relative group shadow-inner">
                    {formData.imageUrl ? (
                      <>
                        <img 
                          src={formData.imageUrl} 
                          alt="preview" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: "" })}
                          className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity cursor-pointer"
                        >
                          মুছে ফেলুন
                        </button>
                      </>
                    ) : (
                      <span className="text-xl text-slate-300">📁</span>
                    )}
                  </div>

                  {/* Upload Controls & Presets */}
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const fileInput = document.getElementById("product_file_uploader");
                          if (fileInput) fileInput.click();
                        }}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] sm:text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        📤 ফাইল আপলোড
                      </button>
                      <input 
                        type="file"
                        id="product_file_uploader"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 500 * 1024) {
                              alert("দুঃখিত! ফাইলের আকার ৫০০KB এর নিচে হতে হবে।");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === "string") {
                                setFormData({ ...formData, imageUrl: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      
                      <div className="text-slate-300 text-[10px] self-center">অথবা</div>

                      <input 
                        type="text"
                        value={formData.imageUrl.startsWith("data:") ? "" : formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="ছবির সরাসরি ওয়েব লিংক..."
                        className="flex-1 text-[11px] border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-teal-500 font-sans"
                      />
                    </div>

                    {/* Fast presets selection row */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">রেডিমেড প্রফেশনাল ছবি:</span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300" })}
                          className="bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5 text-[9px] text-slate-600 transition-colors cursor-pointer"
                        >
                          💻 কম্পিউটার
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=300" })}
                          className="bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5 text-[9px] text-slate-600 transition-colors cursor-pointer"
                        >
                          🖱️ মাউস / কিবোর্ড
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=300" })}
                          className="bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5 text-[9px] text-slate-600 transition-colors cursor-pointer"
                        >
                          📑 খাতা / ডায়েরি
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=300" })}
                          className="bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5 text-[9px] text-slate-600 transition-colors cursor-pointer"
                        >
                          🖊️ কলম / মার্কার
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300" })}
                          className="bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5 text-[9px] text-slate-600 transition-colors cursor-pointer"
                        >
                          🎮 গেমিং ডিভাইস
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 1: Category & SKU */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">ক্যাটাগরি</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">মডেল / SKU কোড</label>
                  <input 
                    type="text" 
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="বারকোড বা কাস্টম SKU"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Grid 2: Prices, with role security restriction block */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>ক্রয় মূল্য (৳)</span>
                    {role !== "অ্যাডমিন" && <span className="text-[10px] text-amber-600 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> locked</span>}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    disabled={role !== "অ্যাডমিন"}
                    value={role === "অ্যাডমিন" ? formData.buyPrice : (editingProduct ? editingProduct.buyPrice : "০")}
                    onChange={(e) => setFormData({...formData, buyPrice: e.target.value})}
                    placeholder={role === "অ্যাডমিন" ? "৩২০" : "শুধুমাত্র এডমিন অনুমোদিত"}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block font-sans">সর্বনিম্ন বিক্রয় মূল্য (৳) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({...formData, sellPrice: e.target.value})}
                    placeholder="৪২০"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Grid 3: Stocks */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">বর্তমান স্টক (Qty)</label>
                  <input 
                    type="number" 
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="১৫"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">অ্যালার্ট লিমিট</label>
                  <input 
                    type="number" 
                    value={formData.alertLimit}
                    onChange={(e) => setFormData({...formData, alertLimit: e.target.value})}
                    placeholder="৩"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">অবস্থান / র্যাক</label>
                  <input 
                    type="text" 
                    value={formData.shelf}
                    onChange={(e) => setFormData({...formData, shelf: e.target.value})}
                    placeholder="যেমন: র্যাক A-২"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  />
                </div>
              </div>

              {/* Modal buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  বাতিল করুন
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProduct ? "সংরক্ষণ করুন" : "যুক্ত করুন"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Creation Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-teal-50 transform scale-100 transition-all">
            <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-base font-bold">নতুন পন্যের ক্যাটাগরি তৈরি</h3>
              <button 
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">ক্যাটাগরির নাম (বাংলা)*</label>
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="যেমন: সার্ভিস আইটেমস"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)</label>
                <textarea 
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="এই ক্যাটাগরিতে কী ধরণের পণ্য থাকবে..."
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={loading || !newCatName.trim()}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  {loading ? "লোডিং..." : "তৈরি করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
